// ---------------------------------------------------------------------------
// Wix Headless connection — shared by shop.html and index.html
// Her Wix dashboard stays the backend: catalog, inventory, orders, payments,
// shipping labels and checkout all remain in Wix. This only READS the catalog
// and hands the cart off to Wix-hosted checkout.
// ---------------------------------------------------------------------------
import { createClient, OAuthStrategy } from 'https://esm.sh/@wix/sdk';
import { products, collections } from 'https://esm.sh/@wix/stores';
import { currentCart, checkout } from 'https://esm.sh/@wix/ecom';
import { redirects } from 'https://esm.sh/@wix/redirects';

export const CLIENT_ID = '8ed1ceec-ce7c-4dd1-b6c5-bd7c44d7128e';
export const STORES_APP_ID = '1380b703-ce81-ff05-f115-39571d94dfcd';

export const client = createClient({
  modules: { products, collections, currentCart, checkout, redirects },
  auth: OAuthStrategy({ clientId: CLIENT_ID })
});

// Wix product -> our card shape. Keeps scraped category tags by slug so the
// existing filters keep working until we point them at live Wix collections.
export function mapProduct(p, colById = {}) {
  const price   = p.price?.price ?? p.priceData?.price ?? null;
  const inStock = p.stock ? (p.stock.inStock !== false) : true;
  return {
    id: p._id,
    name: p.name,
    slug: p.slug,
    url: p.slug ? 'https://damnpigeonny.wixsite.com/dpny/product-page/' + p.slug : '#',
    price: inStock ? price : null,
    price_display: inStock ? (p.priceData?.formatted?.price || ('$' + price)) : 'Out of stock',
    in_stock: inStock,
    categories: (p.collectionIds || []).map(id => colById[id]).filter(Boolean),
    image: p.media?.mainMedia?.image?.url || null,
    gallery: (p.media?.items || []).map(m => m.image?.url).filter(Boolean),
    options: p.productOptions || [],          // size / colour runs
    variants: p.variants || [],
    manageVariants: !!p.manageVariants,
    created: p._createdDate || p.lastUpdated || null,
    description: (p.description || '').replace(/<[^>]*>/g, '').trim() || null
  };
}

// Live collections: id -> display name. Drives the shop's filter tabs, so a new
// collection she creates in Wix shows up on the site with no code change.
export async function loadCollections() {
  const out = {};
  try {
    let res = await client.collections.queryCollections().limit(100).find();
    let items = res.items || [];
    while (res.hasNext && res.hasNext() && items.length < 200) {
      res = await res.next();
      items = items.concat(res.items || []);
    }
    items.forEach(c => {
      const name = (c.name || '').trim();
      // Wix auto-creates an "All Products" collection; the All tab covers it
      if (name && !/^all products$/i.test(name)) out[c._id] = name;
    });
  } catch (err) {
    console.warn('Could not load collections:', err);
  }
  return out;
}

// Pull the whole catalog (paged), tagged with live collection names.
export async function loadLiveProducts(colById = {}, cap = 300) {
  let res = await client.products.queryProducts().limit(100).find();
  let items = res.items || [];
  while (res.hasNext && res.hasNext() && items.length < cap) {
    res = await res.next();
    items = items.concat(res.items || []);
  }
  return items.map(p => mapProduct(p, colById));
}

// Create a NEW checkout directly from line items and redirect to Wix-hosted checkout.
// We deliberately do NOT use the persistent visitor cart: adding to it on every click
// is what caused quantities to multiply on retries.
// lines: [{ id, quantity, variantId?, options? }]
export async function goToWixCheckout(lines, thankYouUrl) {
  const lineItems = lines.map(l => {
    const ref = { appId: STORES_APP_ID, catalogItemId: l.id };
    const o = {};
    if (l.variantId) o.variantId = l.variantId;
    else if (l.options && Object.keys(l.options).length) o.options = l.options;
    if (l.customText && Object.keys(l.customText).length) o.customTextFields = l.customText;
    if (Object.keys(o).length) ref.options = o;
    return { catalogReference: ref, quantity: l.quantity };
  });
  console.log('[DVMN checkout] creating checkout with', lineItems);
  const co = await client.checkout.createCheckout({ lineItems, channelType: 'WEB' });
  const checkoutId = co._id || co.checkout?._id;
  if (!checkoutId) throw new Error('Wix did not return a checkout id');
  // remember it so the thank-you landing can report the purchase to analytics
  try { localStorage.setItem('dp_pending_checkout', JSON.stringify({ id: checkoutId, lines, at: Date.now() })); } catch (e) {}
  const { redirectSession } = await client.redirects.createRedirectSession({
    ecomCheckout: { checkoutId },
    callbacks: { postFlowUrl: window.location.origin + '/shop.html', thankYouPageUrl: thankYouUrl || window.location.origin + '/shop.html?thanks=1' }
  });
  window.location.href = redirectSession.fullUrl;
}

// Ask Wix for the variant that matches what the shopper picked.
// picked is what the bag stored, e.g. {sizee:'sm'} or {Size:'M', Color:'#000000'}.
// Option names on her store aren't always tidy ("sizee", "COLORWAY"), and colours may be
// stored as a hex value or a name, so we map loosely to the product's real option names
// and choice values, then let Wix do the matching.
export async function findVariantId(product, picked) {
  const norm = v => String(v ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  const opts = product.options || [];
  if (!opts.length) return { variantId: null };
  const pickedEntries = Object.entries(picked || {}).map(([k, v]) => [norm(k), v]);

  const choices = {};
  for (const o of opts) {
    const on = norm(o.name);
    let hit = pickedEntries.find(([k]) => k === on)
           || pickedEntries.find(([k]) => k && (on.includes(k) || k.includes(on)));
    if (!hit) return { error: `pick ${o.name}` };
    const want = norm(hit[1]);
    const c = (o.choices || []).find(c => norm(c.description) === want || norm(c.value) === want);
    if (!c) return { error: `${o.name} "${hit[1]}" isn't available` };
    choices[o.name] = c.description || c.value;
  }

  // Two kinds of product on Wix:
  //  - options NOT managed as variants (e.g. a size list with one price/stock for all):
  //    send the chosen options as-is. Asking Wix for a variant here is an error.
  //  - options managed as variants (each size has its own price/stock/SKU):
  //    look the variant up and send its id.
  if (!product.manageVariants) return { options: choices };

  const tryQuery = async ch => {
    const res = await client.products.queryProductVariants(product.id, { choices: ch });
    return (res.variants || res.items || [])[0];
  };
  let v = await tryQuery(choices);
  if (!v) {
    const alt = {};
    for (const o of opts) { const c = (o.choices||[]).find(c => (c.description||c.value) === choices[o.name]); alt[o.name] = c ? c.value : choices[o.name]; }
    v = await tryQuery(alt);
  }
  if (!v) return { error: 'that combination is sold out or unavailable' };
  if (v.stock && v.stock.inStock === false) return { error: 'that size is sold out' };
  const pd = v.variant?.priceData || v.priceData || v.variant?.price || null;
  const price = pd && typeof pd === 'object' ? (pd.discountedPrice ?? pd.price ?? null) : (typeof pd === 'number' ? pd : null);
  return { variantId: v._id, price };
}


// Called on the thank-you landing (shop.html?thanks=1). Reads the checkout the buyer just
// paid for and sends a GA4 `purchase` with real totals. Wix's own purchase event never fires
// because we send buyers back to our site instead of Wix's thank-you page.
export async function reportPurchaseIfReturning() {
  let pending = null;
  try { pending = JSON.parse(localStorage.getItem('dp_pending_checkout') || 'null'); } catch (e) {}
  if (!pending || !pending.id) return false;
  const doneKey = 'dp_reported_' + pending.id;
  if (localStorage.getItem(doneKey)) return false;
  const qs = new URLSearchParams(location.search);
  const orderId = qs.get('orderId') || qs.get('order_id') || null;

  let payload = null;
  try {
    const co = await client.checkout.getCheckout(pending.id);
    const c = co.checkout || co;
    const total = Number(c.priceSummary?.total?.amount || 0);
    if (total > 0) {
      payload = {
        transaction_id: orderId || pending.id,
        currency: c.currency || 'USD',
        value: total,
        tax: Number(c.priceSummary?.tax?.amount || 0),
        shipping: Number(c.priceSummary?.shipping?.amount || 0),
        items: (c.lineItems || []).map(li => ({
          item_id: li.catalogReference?.catalogItemId || li._id,
          item_name: li.productName?.original || li.productName?.translated || 'item',
          price: Number(li.price?.amount || 0),
          quantity: li.quantity || 1
        }))
      };
    }
  } catch (e) {
    console.warn('[DVMN] could not read checkout for purchase event, using bag snapshot', e);
  }
  if (!payload) {
    // fallback: what we sent to checkout (no tax/shipping)
    const items = (pending.lines || []).map(l => ({ item_id: l.id, quantity: l.quantity }));
    payload = { transaction_id: orderId || pending.id, currency: 'USD', value: 0, items };
  }
  if (window.dpTrack) window.dpTrack('purchase', payload);
  console.log('[DVMN] purchase reported', payload);
  try { localStorage.setItem(doneKey, '1'); localStorage.removeItem('dp_pending_checkout'); } catch (e) {}
  return true;
}

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
    if (l.variantId) ref.options = { variantId: l.variantId };
    else if (l.options && Object.keys(l.options).length) ref.options = { options: l.options };
    return { catalogReference: ref, quantity: l.quantity };
  });
  console.log('[DVMN checkout] creating checkout with', lineItems);
  const co = await client.checkout.createCheckout({ lineItems, channelType: 'WEB' });
  const checkoutId = co._id || co.checkout?._id;
  if (!checkoutId) throw new Error('Wix did not return a checkout id');
  const { redirectSession } = await client.redirects.createRedirectSession({
    ecomCheckout: { checkoutId },
    callbacks: { postFlowUrl: window.location.origin + '/shop.html', thankYouPageUrl: thankYouUrl || window.location.origin + '/shop.html?thanks=1' }
  });
  window.location.href = redirectSession.fullUrl;
}

// Given a live product and the options a shopper picked ({Size:'M', Color:'Black'}),
// return the matching variant id, or null. Matches on choice name OR value so hex
// colours and display names both work.
export function resolveVariant(product, picked) {
  if (!product || !product.variants || !product.variants.length) return null;
  const norm = v => String(v ?? '').trim().toLowerCase();
  const want = Object.fromEntries(Object.entries(picked || {}).map(([k, v]) => [norm(k), norm(v)]));
  const optionMeta = (product.options || []).map(o => ({
    name: norm(o.name),
    choices: (o.choices || []).map(c => ({ v: norm(c.value), d: norm(c.description) }))
  }));
  for (const variant of product.variants) {
    const choices = variant.choices || {};
    let ok = true;
    for (const [oname, oval] of Object.entries(choices)) {
      const k = norm(oname), val = norm(oval), w = want[k];
      if (w === undefined) { ok = false; break; }
      if (w === val) continue;
      // picked value might be the hex/value while the variant uses the description, or vice versa
      const meta = optionMeta.find(m => m.name === k);
      const alias = meta && meta.choices.find(c => c.v === w || c.d === w);
      if (!(alias && (alias.v === val || alias.d === val))) { ok = false; break; }
    }
    if (ok && Object.keys(choices).length) return variant._id;
  }
  return null;
}

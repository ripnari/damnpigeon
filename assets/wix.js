// ---------------------------------------------------------------------------
// Wix Headless connection — shared by shop.html and index.html
// Her Wix dashboard stays the backend: catalog, inventory, orders, payments,
// shipping labels and checkout all remain in Wix. This only READS the catalog
// and hands the cart off to Wix-hosted checkout.
// ---------------------------------------------------------------------------
import { createClient, OAuthStrategy } from 'https://esm.sh/@wix/sdk';
import { products, collections } from 'https://esm.sh/@wix/stores';
import { currentCart } from 'https://esm.sh/@wix/ecom';
import { redirects } from 'https://esm.sh/@wix/redirects';

export const CLIENT_ID = '8ed1ceec-ce7c-4dd1-b6c5-bd7c44d7128e';
export const STORES_APP_ID = '1380b703-ce81-ff05-f115-39571d94dfcd';

export const client = createClient({
  modules: { products, collections, currentCart, redirects },
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
    url: p.slug ? 'https://www.damnpigeon.nyc/product-page/' + p.slug : '#',
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

// Build a Wix cart from our bag and redirect to Wix-hosted checkout.
// lines: [{ id, quantity, options }]  options = { Size: 'M', Color: 'Black' }
export async function goToWixCheckout(lines) {
  const lineItems = lines.map(l => ({
    catalogReference: {
      appId: STORES_APP_ID,
      catalogItemId: l.id,
      ...(l.options && Object.keys(l.options).length
        ? { options: { options: l.options } }
        : {})
    },
    quantity: l.quantity
  }));

  await client.currentCart.addToCurrentCart({ lineItems });
  const { checkoutId } = await client.currentCart.createCheckoutFromCurrentCart({ channelType: 'WEB' });
  const { redirectSession } = await client.redirects.createRedirectSession({
    ecomCheckout: { checkoutId },
    callbacks: { postFlowUrl: window.location.href }
  });
  window.location.href = redirectSession.fullUrl;
}

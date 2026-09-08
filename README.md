# DAMNPIGEON — site

Static front-end (no build step) on top of her **live Wix backend**.
She keeps managing catalog, inventory, orders, payments and shipping labels in
the Wix dashboard exactly as she does today. This is only the storefront people see.

```
damnpigeon-site/
├── index.html      Home — her photos, four doors, studio/about, start your brand, TYPE SHIT, press
├── shop.html       Shop — live Wix catalog in her collections, quick-view + size picker, bag
├── build.html      Custom — six-panel made-to-order hoodie builder, her pricing
├── classes.html    Classes — hoodie construction ($499), virtual course ($120), coming soon
├── learn.html      (redirects to classes.html)
├── assets/
│   ├── wix.js          shared Wix Headless connection (catalog + checkout)
│   ├── site.js         shared nav, mobile menu, persistent bag
│   ├── photos/         her 29 photos, web-sized (hero-machine.jpg is the homepage hero)
│   ├── swatches/       (drop fabric swatch photos here — see build.html FABRICS)
│   ├── hero-poster.jpg / og-image.jpg / logo-graffiti.png
├── vercel.json
└── README.md
```

## How it fits together
- One shared nav (Shop / Custom / Learn / Studio + bag) and footer on all four pages.
- The **bag persists across pages** — add on shop, it's still there on build.
- Shop and homepage both read the **same live Wix catalog** via `assets/wix.js`.
- Checkout builds a Wix cart and redirects to **Wix-hosted checkout**, so orders,
  payment and labels land in her existing dashboard.
- If Wix is unreachable, the shop falls back to a seeded copy of the catalog so the
  page never looks broken.

## Deploy
**Drag & drop:** vercel.com → Add New… → Project → drag the `damnpigeon-site` folder → Deploy.

**Via git:**
```bash
cd damnpigeon-site
git init && git add . && git commit -m "Damn Pigeon site"
git remote add origin https://github.com/YOU/damnpigeon-site.git
git push -u origin main
```
Then import the repo in Vercel.

> Must be served over http(s), not opened as a local file — the shared
> `assets/*.js` modules won't load from `file://`.

## Hero
The homepage hero is now a photo (assets/photos/hero-machine.jpg). When she sends the
10-second clip of her cutting fabric, swap the <img> in the .hero-media block for a
<video autoplay muted loop playsinline> pointing at assets/hero.mp4 and keep the photo
as its poster.

## Hero video (old)
`index.html` loads `assets/file.mp4` first and falls back to her Wix CDN copy if
that file isn't there, so the page works with or without it. Drop the downloaded
video in as `assets/file.mp4` (exact lowercase name). Check the browser console
for "Hero video source in use: …" to confirm which one loaded.

## After deploying — 3 things
1. **Approve the URL in Wix.** Wix dashboard → Settings → Headless Settings → your
   client → **URLs** → add the `…vercel.app` address (and later `damnpigeon.nyc`).
   Browsing works without this; the *return from checkout* needs it.
2. **Email capture.** Replace `YOUR_FORM_ID` in the `<form id="signup">` on
   `index.html` and `learn.html` with a real Formspree ID (formspree.io).
3. **Social image.** Replace `YOUR-DOMAIN.vercel.app` in the `og:image` /
   `twitter:image` tags on each page with the real domain.

## Going live
Point `damnpigeon.nyc` at Vercel when you're ready. Her Wix site keeps running the
whole time, so if anything looks wrong you can repoint the domain back to Wix in
minutes — instant rollback.

## What updates automatically once live

She manages everything in her normal Wix dashboard. On each page load the site
re-reads her store, so these need **no code change**:

- New products, and products she unhides or archives
- Price changes, sale ribbons, names, descriptions
- New photos and galleries
- Size / colour runs, and per-variant stock (sold-out sizes grey out)
- **New collections** — the shop's filter tabs are generated from her live Wix
  collections, so a new one appears as a new tab by itself
- Orders, payments, and shipping labels (all still handled inside Wix)

Needs a code change (hand-written pages, not driven by Wix):

- The Learn / curriculum page
- The custom panel builder (fabrics, pricing, panels)
- Homepage copy and the studio section

If a product she adds has no collection, it shows under **All** and in search,
but gets no filter tab. That's a Wix-side tagging thing, not a site bug.

## Known gaps (Phase 2)
- **Test a real order end-to-end** before launch. The Wix wiring follows current
  docs but has not been run against her live store yet.
- **Custom builder** uses placeholder fabrics/prices and a generic hoodie
  illustration — needs her real material list, real upcharges, and ideally an
  illustration traced from her actual pattern.
- Custom builds add to the bag but need a made-to-order checkout path
  (deposit / custom line item) rather than a normal catalog product.
- Shop category filters use the scraped tags, matched by product slug. Can be
  repointed at live Wix collections.
- Sampling "Book a call" is a mailto — swap for her real booking link.

## Decisions from the Sept 8 call
- She liked the original site (black/cobalt, "I SET SHIT OFF", the boxes). Kept.
- Hero: her cutting-fabric clip replaces the sitting-there video. Photo in place until it lands.
- Copy: her voice. Short, direct, New York.
- Shop collections: NEW, TEES, HOODIES + SWEATERS, BOTTOMS, OUTERWEAR, HATS + ACCESSORIES, ALL.
  BLANKS kept. TYPE SHIT = the easy stuff (tees/hats/small goods under $80), used as a strip + tab.
- Hidden from shop: the two $1 listings, Cedarwood Flannel (retired). NY or NOWHERE Crown stays sold out.
- DVMN50 never shown on the site.
- Custom: hoodie only. 6 zones (hood, front, back, both sleeves, pocket). Cuffs + waistband fixed.
  $350 base; 1–2 cloths included, 3–4 +$50, 5–6 +$100; premium cloth on top. XS–XXL. 4–6 weeks. Paid in full. Final sale.
  Fabric photos: add img:'assets/swatches/x.jpg' to a FABRICS entry and it renders on the panel.
- Classes: Hoodie construction $499 / 3 hrs / 2–3 people / 112 W 9th LA / beginner ok. Virtual $120.
  T-shirt development, first collection (full day), manufacturing = coming soon. Booking = her Wix booking page.
- Still to come from her: cutting clip, hoodie pattern, fabric swatch photos, size chart, vector logo, booking link if it changes.

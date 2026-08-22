# DAMNPIGEON — site

Static front-end (no build step) on top of her **live Wix backend**.
She keeps managing catalog, inventory, orders, payments and shipping labels in
the Wix dashboard exactly as she does today. This is only the storefront people see.

```
damnpigeon-site/
├── index.html      Home — hero, three doors, live drop strip, custom band, sampling, studio
├── shop.html       Shop — live Wix catalog, filters/search/sort, quick-view + size picker, bag
├── build.html      Custom — panel-by-panel made-to-order hoodie builder
├── learn.html      The School of DVMN — curriculum, FAQ, waitlist
├── assets/
│   ├── wix.js          shared Wix Headless connection (catalog + checkout)
│   ├── site.js         shared nav, mobile menu, persistent bag
│   ├── file.mp4        hero video (drop it here — see assets/README-VIDEO.txt)
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

## Hero video
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

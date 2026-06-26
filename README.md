# DAMNPIGEON — homepage

A single-page static site. No build step, no framework. Just `index.html` and the `assets/` folder.

```
damnpigeon-site/
├── index.html          ← homepage
├── learn.html          ← education / curriculum page (The School of DVMN)
├── assets/
│   ├── hero-poster.jpg ← hero background / studio image / social-share image
│   ├── og-image.jpg    ← social-share preview
│   └── logo-graffiti.png
├── vercel.json         ← optional config (clean URLs)
└── README.md
```

Pages link to each other already: the homepage's "Learn the craft" door and nav open `learn.html`; the school links back home and out to the live shop. The homepage's "Shop the drop" and nav Shop point to `damnpigeon.nyc/subway-series`.

---

## Deploy to Vercel

**Option A — drag & drop (fastest, no git):**
1. Go to https://vercel.com → **Add New… → Project**.
2. Drag the `damnpigeon-site` folder onto the page.
3. Click **Deploy**. You'll get a live `…vercel.app` URL in ~30 seconds.

**Option B — via GitHub (better for ongoing edits):**
```bash
cd damnpigeon-site
git init
git add .
git commit -m "Damn Pigeon homepage"
# create an empty repo on github.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/damnpigeon-site.git
git branch -M main
git push -u origin main
```
Then in Vercel: **Add New… → Project → Import** that repo → **Deploy**.
Every future `git push` redeploys automatically.

---

## Before / after you go live — 3 quick swaps

1. **Email signup** (in **both** `index.html` and `learn.html`, in the `<form id="signup">`):
   Replace `YOUR_FORM_ID` in the `action=` URL with a real
   [Formspree](https://formspree.io) form ID (free tier is fine). The two forms can
   share one ID or use separate ones — the school form tags submissions as
   "school-waitlist" so you can tell them apart.
   Until you do, the form shows "form not connected yet" instead of silently failing.

2. **Social-share image** (in `<head>` of both pages):
   Replace `https://YOUR-DOMAIN.vercel.app` in the two `og:image` / `twitter:image`
   tags with your real deployed domain. (Relative paths don't work for link previews
   on most platforms — they need the full URL.)

3. **The hero video** is still loaded from her live Wix CDN:
   `video.wixstatic.com/video/5b3366_e06137b8b07c41b9833a7fec4b74da86/1080p/mp4/file.mp4`
   It works as-is. If you'd rather host it yourself (more reliable long-term),
   download that file, drop it in `assets/hero.mp4`, and change the `<source src=…>`
   in `index.html` to `assets/hero.mp4`. The local `hero-poster.jpg` already shows
   while the video loads and if it ever fails.

---

## Custom domain
In Vercel → your project → **Settings → Domains** → add the domain and follow the DNS steps.

## Notes
- Placeholder links (nav items, the three doors, footer links) point to `#`.
  Wire them up as those pages get built.
- Footer carries the real `DAMNPIGEON LLC` / `damnpcs@gmail.com` — confirm that's
  intended before publishing.

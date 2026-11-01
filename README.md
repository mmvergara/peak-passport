<h1 align="center">PEAK Passport Maker</h1>

<p align="center">make your own little scout passport 🏔️🎒</p>

<p align="center"><a href="https://peak-passport.pages.dev"><b>peak-passport.pages.dev</b></a></p>

<p align="center"><a href="https://github.com/mmvergara/peak-passport/actions/workflows/deploy.yml"><img src="https://github.com/mmvergara/peak-passport/actions/workflows/deploy.yml/badge.svg" alt="Deploy to Cloudflare Pages"></a></p>

---

Upload your scout pic, write your name, pick your ascent sash, stamp the biomes you've climbed, and download a cozy PNG passport to show off.

## ✨ What you can do

- 📸 **Upload a photo**: drag, drop, or paste. Drag to move it and scroll to zoom.
- 🪪 **Fill in your ID**: name, passport no., nationality (CRABLAND, obviously), and date of issue.
- 🎀 **Pick your ascent**: the badge takes your sash color, from Tadpole all the way to Scoutmaster.
- 🗺️ **Collect stamps**: Shore, Tropics, Roots, Alpine, Mesa, Caldera, Gloom, The Kiln, The Citadel, Peak, plus the secret Tomb and Nadir 👀
- 💾 **Download or copy** your finished passport as a PNG.
- 📱 **Share to your story**: pick a 9:16 layout (Paper, Summit, Ascent) and post it straight to Instagram.

## 🧗 Run it

No build step. The site is three plain files in `public/`. Just open `public/index.html` in your browser.

```sh
git clone https://github.com/mmvergara/peak-passport.git
cd peak-passport
open public/index.html   # or xdg-open on linux
```

## 🚀 Deploy

Hosted on [Cloudflare Pages](https://pages.cloudflare.com). Every push to `main` deploys automatically through GitHub Actions (`.github/workflows/deploy.yml`), uploading only the `public/` folder.

To deploy by hand instead:

```sh
npm install
npx wrangler login   # once
npm run deploy
```

## 🍃 Notes

Your photo never leaves your browser. Nothing gets uploaded anywhere. The site uses cookie-free Cloudflare Web Analytics to count visits.

Unofficial fan project, made with love. Not affiliated with Aggro Crab or Landfall. PEAK and its art belong to them.

<p align="center">see you at the summit 🏁</p>

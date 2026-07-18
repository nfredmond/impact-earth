# Impact Earth 🌍☄️

**A 3D simulator of asteroid impacts and supervolcano eruptions — and what they would do to us.**

Fly to Chicxulub (the dinosaur killer), Tunguska, Crater Lake, Yellowstone, Toba, or Krakatoa
on a cinematic 3D Earth. Change history's parameters ("what if it were made of iron?"),
drop your own catastrophe anywhere on the planet, and use the **time machine** to see how the
same disaster plays out in 2500 BC, 1908, 1999, today, or 2500 AD — deaths, cities lost, and
economic damage, all recomputed for the era. Export any scenario as a polished report you can
share or print.

---

## 📥 Download & install (no coding required)

**[➡ Go to the Downloads page](https://github.com/nfredmond/impact-earth/releases/latest)** and
pick the file for your computer:

### Windows
1. Download the file ending in **`.exe`** (named `Impact-Earth-Setup-…exe`).
2. Double-click it. If Windows shows a blue **"Windows protected your PC"** screen, click
   **More info → Run anyway**. (That warning appears because this free app isn't signed with a
   paid certificate — it's expected.)
3. The app installs and opens itself. Done.

### Mac
1. Download the file ending in **`.dmg`**.
2. Open it and drag **Impact Earth** into your **Applications** folder.
3. **First launch:** *right-click* (or Control-click) the app in Applications and choose
   **Open**, then click **Open** again in the dialog. macOS asks this once because the app
   isn't from the App Store; afterwards it opens normally.
   - If your Mac says the app "is damaged," open the **Terminal** app, paste this line, and
     press Return, then try again:
     `xattr -cr "/Applications/Impact Earth.app"`

### Linux
- **Ubuntu / Debian / Mint:** download the **`.deb`** file and double-click it (or run
  `sudo apt install ./Impact-Earth-*.deb` in a terminal).
- **Any other Linux:** download the **`.AppImage`** file, right-click it → Properties → mark it
  **executable** (or `chmod +x Impact-Earth-*.AppImage`), then double-click to run. No install needed.

> 💡 The app is completely self-contained and works offline. It never sends your data anywhere —
> there is no server.

---

## 🕹 How to use it

- **Pick a disaster** from the left panel — real impacts and eruptions, each with a
  "what actually happened" story, or a **What if…** scenario like *Tunguska, 4h 47m later*
  (the same 1908 blast, but over St. Petersburg).
- **Turn the dials** on the right: size, speed, angle, composition, land or ocean.
- **Move it**: click "Move it," then click anywhere on the globe.
- **Travel in time**: drag the timeline at the bottom from 10,000 BC to 2500 AD and watch the
  human cost change. Click **Pin year** to compare eras side by side.
- **Export Report** (top right) saves a beautiful standalone web page of your scenario.

## 🔬 Is it accurate?

The physics uses the peer-reviewed *Earth Impact Effects Program* equations
(Collins, Melosh & Marcus 2005) and volcanic scaling calibrated to real eruptions
(Pinatubo, Tambora, Toba), validated by automated tests against published values —
Tunguska really does come out at ~10 megatons, Barringer really digs a 1.2 km crater.
Casualty and money figures are honest **order-of-magnitude estimates** built on a real
population map of Earth, scaled to each era's demographics. Every report includes the
methodology and sources.

## 🧑‍💻 For developers

```bash
npm install
npm run dev        # web app at http://localhost:5173
npm test           # physics validation suite
npm run app:dev    # desktop app (Electron)
npm run app:build  # build installers for your OS
```

Stack: Vite + React + TypeScript + Three.js + Zustand, wrapped in Electron for desktop.
Releases are built by GitHub Actions on native Windows/macOS/Linux runners
(`.github/workflows/release.yml`). Architecture notes live in [CLAUDE.md](CLAUDE.md).

## 🙏 Attribution

- City data: [SimpleMaps World Cities](https://simplemaps.com/data/world-cities) (CC BY 4.0)
- Earth textures: three-globe example assets (NASA Blue Marble / Black Marble imagery)
- Impact equations: Collins, Melosh & Marcus (2005), *Meteoritics & Planetary Science* 40:817–840

*The numbers describe what physics permits — the thought they provoke is the point.*

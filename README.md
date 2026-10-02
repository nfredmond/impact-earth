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

## Globe controls

- Search the catalog by event or place, or filter impacts, eruptions, and hypothetical scenarios.
- Select **Focus** to give the globe the full workspace. Select **Exit focus** or press Escape to restore the panels.
- Pause, resume, restart, or play the animation at 0.5×, 1×, or 2× speed. The eight-second sequence illustrates the event; it does not represent elapsed physical time.
- Toggle damage zones, clouds, and dust haze independently. **Auto orbit** rotates the view; **Recenter** returns to the selected location.
- On phones, switch between **Explore events**, **Explore scenario**, and **Consequences** below the globe.
- Reduced-motion preferences skip automatic event animation. Replay remains available on request.

## Experience Tunguska

Select **Experience Tunguska** above the event catalog. Five chapters connect the historical account, an atmospheric cutaway, an observer experiment, a material comparison, and a saved field note. Chapters advance on request. Source links distinguish historical accounts from the app's modeled results.

The material experiment holds diameter, speed, entry angle, location, and year fixed. Compare stone, iron, carbon-rich, and comet-like objects. **Pause story and explore** opens the simulator; **Resume story** restores the chapter's choices. **Exit story** restores the scenario you had before starting. At the end, you can keep the experiment as your active scenario instead.

Save up to 12 notes locally through **Save field note**, then reopen them from **Field notes**. **Download note** generates a standalone, printable HTML file containing the saved results, inputs, limitations, and source links. Reopening a note recalculates using the installed model. Notes stay in this browser or desktop profile; clearing its data removes them. See [story methods and verification](docs/tunguska-experience.md).

## Observer mode and scale lab

Select **Watch from your city** on the globe, or open the **Observer** tab. Search the offline catalog of 3,000 cities, enter latitude and longitude, or pick a point on Earth. The observer view shows great-circle distance, the initial compass bearing toward ground zero, and all modeled effect zones containing the selected point. **Go to observer** and **See the route** move the camera. Reports include the selected observation point.

The **Scale lab** compares asteroid diameter or the side of an equivalent cube of erupted material against a 1 km ruler or the [330 m Eiffel Tower](https://www.toureiffel.paris/en/news/history-and-culture/300-330-meters-story-towers-height). Both objects share one linear scale. Open **Scale studio** for a larger diagram, live size controls, and a button that restores the dimensions from when the studio opened.

For surface impacts and eruptions, place a hypothetical crater or caldera outline at the observer location. The dashed cyan outline compares dimensions; it does not move ground zero or change calculated effects. Airbursts have no surface crater overlay.

Observer calculations use the existing circular effect model. They do not resolve arrival times, line of sight, terrain shielding, directional ashfall, or coastal tsunami exposure. Present-day city names remain location references in historical scenarios. See [observer verification notes](docs/observer-mode.md).

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

Release publication waits for lint, tests, builds, and a native desktop journey on all three platforms. Linux checks the installed `.deb`; Windows and macOS check the packaged executable. To run the desktop journey locally after packaging, use `node scripts/smoke-desktop.mjs` (Linux expects the package to be installed). It uses a temporary profile and writes `release/desktop-smoke.png`. Release tags require matching notes in `docs/releases/<tag>.md`.

## 🙏 Attribution

- City data: [SimpleMaps World Cities](https://simplemaps.com/data/world-cities) (CC BY 4.0)
- Earth textures: three-globe example assets (NASA Blue Marble / Black Marble imagery)
- Impact equations: Collins, Melosh & Marcus (2005), *Meteoritics & Planetary Science* 40:817–840

*The numbers describe what physics permits — the thought they provoke is the point.*

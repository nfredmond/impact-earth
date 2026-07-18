# Impact Earth

A 3D, browser-based simulator of asteroid impacts, atmospheric airbursts, and caldera
super-eruptions — historical and hypothetical — with human consequences computed across
12,500 years of demography.

Pick Chicxulub, Tunguska, Crater Lake, Yellowstone, Toba, Krakatoa (and a dozen more),
tweak the physics ("what if it were iron?", "what if it hit 5 hours later?"), drop your own
catastrophe anywhere on Earth, and scrub the **time machine** from 10,000 BC to 2500 AD to
see how deaths, cities lost, and economic damage change with the century. Export any
scenario as a self-contained HTML report.

Everything runs client-side — a static site with no backend and no API keys.

## Quickstart

```bash
npm install
npm run dev        # → http://localhost:5173
npm test           # physics + data validation suite (vitest)
npm run build      # static production build in dist/
```

## How it works

| Layer | Where | What |
|---|---|---|
| Impact physics | `src/physics/impact.ts` | Collins–Melosh–Marcus (2005) *Earth Impact Effects Program* scaling: pancake-model atmospheric entry, crater dimensions, fireball/thermal rings, Glasstone & Dolan airblast, seismic magnitude, ejecta. |
| Eruptions | `src/physics/caldera.ts` | VEI (Newhall & Self 1982) from bulk volume; caldera collapse, pyroclastic-flow reach, exponential ashfall isopachs. |
| Global climate | `src/physics/globalEffects.ts` | Impact-winter / volcanic-winter cooling and famine mortality, calibrated to Pinatubo, Tambora, Toba, Chicxulub. |
| Population | `src/data/` + `src/casualties/` | SimpleMaps World Cities (CC BY 4.0) smoothed to a 0.5° grid (8.1 B total), scaled to any year via McEvedy & Jones / HYDE-style regional shares; Maddison-style GDP per capita for losses. |
| Scene | `src/scene/` | Three.js: day/night shader globe with city lights, clouds, atmosphere, damage rings, bolide/eruption cinematics, impact-winter dust veil. |
| Reports | `src/report/exportHtml.ts` | One-click standalone HTML report (inline CSS + SVG map). |

The physics is validated against published values in `src/physics/physics.test.ts`
(Chelyabinsk ≈ 0.5 Mt at ~30 km, Tunguska ≈ 10 Mt below 15 km, Barringer ≈ 1.2 km crater,
Chicxulub ≈ 170 km crater, Tambora ≈ 1 °C cooling).

Rebuild the population grid from source data with `node scripts/build-popgrid.mjs`.

## Honesty box

All casualty and economic figures are **order-of-magnitude estimates**. Blast and thermal
rings are capped at 6,000 km where point-source scaling loses meaning; tsunami coastal
losses are described but not totaled; years beyond 2100 are speculative. The numbers
describe what physics permits — the thought they provoke is the point.

## Attribution

- City data: [SimpleMaps World Cities](https://simplemaps.com/data/world-cities) (CC BY 4.0)
- Earth textures: three-globe example assets (NASA Blue Marble / Black Marble imagery)
- Impact equations: Collins, Melosh & Marcus (2005), *Meteoritics & Planetary Science* 40:817–840

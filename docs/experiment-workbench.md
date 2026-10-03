# Local maps and experiments

The 1.2 release connects the observer view, comparison baseline, general notebook, and sensitivity cases. It also keeps the app usable when a WebGL renderer cannot start or loses its context.

## Design

Keep the existing Chakra Petch headings and system body type. Use space blue `#060a12`, map water `#102632`, paper `#e8ecf4`, coast gray-green `#a1b7aa`, amber `#ffba79`, and cyan `#9ed9df`. Amber identifies the current experiment; cyan identifies the baseline and observer. Use a regional map as the main visual, with controls and numerical comparisons beside it. Keep map labels readable at a 390 px viewport. The comparison table and sensitivity cases use aligned numbers rather than decorative cards.

## Methods and boundaries

- Local maps use an azimuthal equidistant projection on a sphere of radius 6,371 km. Distance and bearing from the center are preserved. Other distances distort away from the center. Effect boundaries use sampled great-circle circles. A route samples the great circle between ground zero and the observer.
- Geography contains present-day Natural Earth 1:50 million coastline and river linework. It supplies generalized regional context, not street-level detail, terrain, or historical geography. Sparse inland areas can have no visible features. City coordinates use the existing SimpleMaps catalog. Labels prioritize larger cities and suppress overlaps.
- `scripts/build-regional-geography.py` pins the Natural Earth revision and checks source hashes. It rounds coordinates to four decimals and removes attributes. The offline file is approximately 1.6 MB and loads only when the local map opens. [Natural Earth terms](https://www.naturalearthdata.com/about/terms-of-use/) place this data in the public domain.
- A baseline copies the full scenario. Changing the current scenario cannot mutate it. Numerical differences use unrounded model values, then format the results. Rounded displayed columns may not subtract exactly. The map shows all current effect boundaries and the baseline's outermost boundary, labeled separately.
- Notebook files use `impact-earth-scenario`, schema 1. Files contain inputs, an optional observer, and an optional comparison baseline. They do not promise identical outputs across future model versions. Import validates types, ranges, version, and file size before adding an entry. Import does not change the active scenario until the user opens it. Files are limited to 100 KB; the notebook holds 24 scenarios. Existing Tunguska notes remain under their original storage key.
- Sensitivity cases vary one continuous input by a selected percentage, with values clamped to the supported input range. Lower, current, and higher input cases preserve every other input. These are not probability distributions, confidence intervals, or physical validation. The app explains omitted vulnerability, terrain, demographic, and response assumptions beside these cases.
- A failed or lost 3D renderer switches to the SVG map. Retry creates a new renderer. Low detail disables antialiasing and limits the pixel ratio to one. The map, controls, and results do not require WebGL. Numerical readouts update directly with the scenario rather than waiting for animation frames.

## Verification record

- The 56-test suite covers previous behavior plus scenario-file round trips, both event types, catalog compatibility, invalid input, storage failure, capacity, deletion, isolated baselines, sensitivity bounds, and projection geometry near poles and the date line.
- A separate mutation run accepts a comment-only change and catches 23 deliberate faults. Examples include lost observers, incorrect eruption volume, bypassed format and numerical limits, discarded saves, wrong deletion, suppressed write errors, shared baseline references, ignored sensitivity changes, reversed map directions, and an incorrect map scale.
- Browser exercises cover a stone/iron comparison, sensitivity-to-comparison navigation, save/export/import/reopen, persisted entries after reload, invalid-file rejection, observer export, graphics startup failure, actual WebGL context loss, and low-detail recovery. Automated workflows do not count as tests with new users.
- The desktop journey also exercises offline geography, both comparison footprints, sensitivity cases, general notebook export/import, and reopening a saved baseline. It runs on native release runners before publication.
- Native journey fault probes accept a no-op and reject missing geography, a missing baseline, missing sensitivity results, and a Save button with pointer events disabled. Pointer-based browser testing found the notebook inherited a noninteractive header style; the dialog now explicitly accepts pointer input. The desktop journey checks that its control is reachable before clicking.
- A separate Chromium check used the production build at desktop and 390 px phone widths. Screenshots were inspected. It saved the actual JSON download to disk, read it, imported it, reloaded the page, reopened the saved comparison, rejected an invalid file, and reopened an eruption. No page errors occurred. The installed Linux Debian package also passed with sandboxing enabled. Phone viewport checks do not establish physical-device performance.

The 1.2.0 Linux release screenshot exposed stale animated totals despite passing interaction checks. Version 1.2.1 removes numerical interpolation. A browser check stops animation-frame callbacks, changes the event and material, and confirms the displayed population, exposure, and direct deaths update. The desktop journey checks those values after reopening the saved experiment. Its no-op probe passes and a mutation forcing zero totals fails with the expected stale-scenario message. These are display regressions, not independent casualty-model validation. Short desktop maps now scroll at a readable height; the heading, scale, and controls were inspected at 1008 by 666 pixels.

## Test with new users

Status: **not yet conducted**. Use three to five people who have not used the app. Do not coach them during the tasks. Record completion, time, wrong turns, and their explanation of each result. Obtain permission before recording their screen or voice.

1. Choose an event and find an observer city. Explain whether its point lies inside a modeled zone.
2. Pin a stone asteroid, change it to iron, and explain the difference between the two footprints.
3. Run a diameter sensitivity experiment. Explain what the lower and higher cases mean, including whether they are probabilities.
4. Save the experiment, close and reopen the app, and restore it.
5. Export the scenario file, import it into a fresh profile, and identify its baseline and observer.
6. With 3D deliberately unavailable, find the local map and continue the comparison.

Record participant results in a separate dated note. Leave outcomes unfilled until observed. Prioritize any failure to distinguish baseline/current or sensitivity/probability before adding another guided story.

# TERRA TWIN X
**Planetary Analog Intelligence & Discovery Platform** — find, characterize and validate Earth analogs for Moon and Mars sites using open NASA data.

Built for the 2026 NASA Space Apps Challenge.

## What it does
1. **Mission setup**: pick Mars or the Moon, one of six target sites (Jezero, Gale, Arcadia Planitia, Shackleton Rim, Mare Tranquillitatis Skylight, Aristarchus Plateau) and an experiment type (Rover Mobility, ISRU, EVA & Habitats, Astrobiology, Drilling).
2. **Twin globes**: interactive Earth and Moon/Mars globes. Earth pins are coloured by match score; ringed pins are discovery candidates.
3. **Ranked analogs**: 26 Earth sites (12 established analogs + 14 candidates, including Lonar Crater, Rann of Kutch, Spiti and Thar in India) ranked by the **PAM score**.
4. **Site detail**: PAM vector breakdown, **data coverage**, a plain-language "why it matches", the **Environmental Delta Matrix** (where Earth diverges from the target) and a **compensated field protocol** for the chosen experiment.
5. **Discovery mode**: click *anywhere* on Earth → the app fetches that point's NASA POWER climatology, scores it, and lets you scan a 5×5 region around it for new candidates. You can characterize the point's ground type to complete the score.
6. **Validation mode**: checks that established analogs outscore obvious non-analog control sites (AUC), for every target × experiment.
7. **Exports**: per-site JSON reports and a data snapshot.

## Run it
No build step, no installs.
- **Locally**: open `index.html` in Chrome, Edge or Firefox (internet needed for NASA POWER).
- **Publish on GitHub Pages**: push this folder to a public repo → *Settings → Pages → Deploy from branch → main / root*. Your link will be `https://<user>.github.io/<repo>/`. Use that as the **Link to Final Project**.

### Before judging (recommended)
NASA POWER can be slow under load. Open the app once, wait until the status shows `32/32 sites loaded`, click **Export data snapshot**, and replace `data/power_cache.js` with the downloaded file. Commit it. The app will then load instantly from real NASA data even if the API is busy.

## The PAM algorithm
Six vectors, each 0–1, combined with experiment-specific weights (editable with sliders):

| Vector | Input | Scoring |
|---|---|---|
| Geology | Lithology class (catalogue) | Best affinity between site and target rock classes |
| Topography | Terrain class (catalogue) | Affinity between landform classes |
| Thermal | NASA POWER `T2M`, `T2M_RANGE` | 50 % coldness + 50 % day–night swing |
| Aridity | NASA POWER `PRECTOTCORR`, `RH2M` | 60 % low precipitation (log) + 40 % low humidity |
| Radiation | NASA POWER grid elevation, `ALLSKY_SFC_SW_DWN` | 60 % altitude + 40 % sunlight (a proxy, not a dose) |
| Regolith | Regolith class + ground ice (catalogue) | 75 % material affinity + 25 % ice match |

`PAM = Σ wᵢ·sᵢ / Σ wᵢ` over vectors with data. **Coverage** = share of the six vectors with data.

Because no place on Earth is as cold, dry or exposed as the Moon or Mars, climate inputs use an **Earth-attainable envelope**: each is scored by how far it sits toward the planetary extreme of Earth's own range. Gravity, pressure and radiation dose can never match, so they are not scored. They always appear in the Delta Matrix with a compensation step.

## Data
- **NASA POWER** climatology API (2001–2020 means, ~0.5° grid): `https://power.larc.nasa.gov/api/temporal/climatology/point`. Parameters: `T2M, T2M_MAX, T2M_MIN, T2M_RANGE, PRECTOTCORR, RH2M, ALLSKY_SFC_SW_DWN, PS`.
- Planetary reference values (approximate, used only in the Delta Matrix): Mars and Moon gravity and pressure; surface dose from Curiosity RAD (Mars) and Chang'e-4 LND (Moon).
- Site catalogue (`js/data.js`): descriptive geology, terrain and regolith classes for each site, compiled by the team. **Please review these entries.**

## Limitations / roadmap
- 0.5° climate cells smooth out mountains and small craters (e.g. Mauna Kea's summit plain is colder than its grid cell).
- Geology/terrain/regolith for discovery points are entered by the user.
- Next steps: per-pixel terrain from SRTM / Copernicus DEM, mineralogy from EMIT, thermal inertia from ECOSTRESS vs THEMIS / Diviner, target climate from the Mars Climate Database, and a 3D rover terrain lab.

## Tests
`node test/pam.test.js` checks the scoring engine with hand-made inputs (no network).

## SI disclosure
The code in this prototype was written with assistance from Claude (Anthropic), a large language model, under the team's direction. The project concept and design decisions are the team's.

## Files
```
index.html            UI and styles
js/data.js            targets, Earth sites, affinity tables, weights
js/pam.js             PAM engine, Delta Matrix, protocols, validation
js/power.js           NASA POWER client + cache
js/globe.js           canvas globe (no libraries)
js/app.js             UI controller
data/power_cache.js   optional NASA POWER snapshot
test/pam.test.js      unit tests
```

/* TERRA TWIN X — Planetary Analog Matching (PAM) engine.
 * Pure functions, no DOM: usable in the browser and in Node tests.
 *
 * Six vectors, each scored 0–1:
 *   Geology     best affinity between the site's and target's lithology classes
 *   Topography  best affinity between terrain classes
 *   Thermal     0.5·coldness(mean T) + 0.5·diurnal swing        (NASA POWER T2M, T2M_RANGE)
 *   Aridity     0.6·dryness(precipitation) + 0.4·dryness(humidity) (NASA POWER PRECTOTCORR, RH2M)
 *   Radiation   0.6·elevation + 0.4·surface solar irradiance    (NASA POWER grid elevation, ALLSKY_SFC_SW_DWN)
 *   Regolith    0.75·regolith-class affinity + 0.25·ground-ice match
 * Climate vectors use the "Earth-attainable envelope": no place on Earth is as cold, dry or exposed as the
 * Moon or Mars, so each climate input is scored by how far it sits toward the planetary extreme of Earth's range.
 * PAM = Σ wᵢ·sᵢ / Σ wᵢ over the vectors that have data (→ 0–100 %). Coverage = share of the 6 vectors with data.
 */
(function (root) {
  const TTX = root.TTX = root.TTX || {};
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

  function affinity(kind, a, b) {
    if (!a || !b || !a.length || !b.length) return null;
    let best = 0;
    for (const x of a) for (const y of b) best = Math.max(best, x === y ? 1 : (TTX.AFF[kind][x + '|' + y] ?? 0.2));
    return best;
  }
  function toward(key, value) {
    const e = TTX.ENVELOPE[key]; if (value == null || isNaN(value)) return null;
    const n = clamp((value - e.min) / (e.max - e.min));
    return e.toward === 'high' ? n : 1 - n;
  }
  function blend(parts) { // [[score|null, weight], ...] → weighted mean of available parts
    let s = 0, w = 0; for (const [v, k] of parts) if (v != null) { s += v * k; w += k; }
    return w ? s / w : null;
  }

  /** site: catalogue entry (may have lith/terrain/regolith null for unknown); climate: from power.js or null */
  TTX.vectors = function (site, target, climate) {
    const c = climate || {};
    const ice = site.ice == null ? null : (site.ice === target.ice ? 1 : (target.ice ? 0.2 : 0.7));
    const reg = affinity('regolith', site.regolith, target.regolith);
    return [
      affinity('lith', site.lith, target.lith),
      affinity('terrain', site.terrain, target.terrain),
      blend([[toward('tmean', c.tmean), .5], [toward('trange', c.trange), .5]]),
      blend([[toward('precip', c.precipMmYr == null ? null : Math.log10(1 + c.precipMmYr)), .6], [toward('rh', c.rh), .4]]),
      blend([[toward('elev', c.elev), .6], [toward('solar', c.solar), .4]]),
      reg == null ? null : blend([[reg, .75], [ice, .25]]),
    ];
  };

  TTX.score = function (site, target, climate, weights) {
    const v = TTX.vectors(site, target, climate);
    let s = 0, w = 0, have = 0;
    v.forEach((x, i) => { if (x != null) { s += x * weights[i]; w += weights[i]; have++; } });
    const contrib = v.map((x, i) => (x == null || !w) ? null : x * weights[i] / w);
    return { pam: w ? Math.round(100 * s / w) : null, vectors: v, contrib, coverage: have / 6 };
  };

  /** One-sentence explanation from the strongest and weakest weighted vectors */
  TTX.why = function (res) {
    const idx = res.vectors.map((v, i) => [v, i]).filter(([v]) => v != null);
    if (!idx.length) return 'No data yet for this site.';
    const strong = idx.filter(([v]) => v >= 0.7).sort((a, b) => res.contrib[b[1]] - res.contrib[a[1]]).slice(0, 2).map(([, i]) => TTX.VECTORS[i].toLowerCase());
    const weak = idx.filter(([v]) => v < 0.45).map(([, i]) => TTX.VECTORS[i].toLowerCase());
    const missing = res.vectors.map((v, i) => v == null ? TTX.VECTORS[i].toLowerCase() : null).filter(Boolean);
    let s = strong.length ? `Strong ${strong.join(' and ')} match` : 'No single dominant match';
    if (weak.length) s += `; weaker on ${weak.join(', ')}`;
    if (missing.length) s += `; no data for ${missing.join(', ')}`;
    return s + '.';
  };

  const fmt = (x, d = 1, u = '') => x == null || isNaN(x) ? '—' : `${(+x).toFixed(d)}${u}`;

  /** Environmental Delta Matrix rows: where Earth diverges from the target */
  TTX.delta = function (site, target, climate, experiment) {
    const c = climate || {}, mars = target.body === 'mars';
    const lvl = s => s == null ? 'No data' : s >= 0.75 ? 'Close' : s >= 0.45 ? 'Partial' : 'Large gap';
    const v = TTX.vectors(site, target, c);
    const rows = [
      { p: 'Gravity', earth: '1.00 g', target: target.gravityTxt, gap: 'Large gap', fix: TTX.fix('gravity', target, experiment) },
      { p: 'Surface pressure', earth: fmt(c.ps, 1, ' kPa'), target: target.pressureTxt, gap: 'Large gap', fix: TTX.fix('pressure', target, experiment) },
      { p: 'Mean air temperature', earth: fmt(c.tmean, 1, ' °C'), target: target.tempTxt, gap: lvl(toward('tmean', c.tmean)), fix: TTX.fix('thermal', target, experiment) },
      { p: 'Day–night swing', earth: fmt(c.trange, 1, ' °C'), target: target.swingTxt, gap: lvl(toward('trange', c.trange)), fix: TTX.fix('swing', target, experiment) },
      { p: 'Precipitation', earth: c.precipMmYr == null ? '—' : `${Math.round(c.precipMmYr)} mm/yr`, target: target.precipTxt, gap: lvl(v[3]), fix: TTX.fix('water', target, experiment) },
      { p: 'Relative humidity', earth: fmt(c.rh, 0, ' %'), target: target.rhTxt, gap: lvl(toward('rh', c.rh)), fix: TTX.fix('humidity', target, experiment) },
      { p: 'Radiation', earth: c.elev == null ? '—' : `≪0.01 mSv/day · ${Math.round(c.elev)} m grid elev.`, target: `${target.doseTxt} (${target.doseRef})`, gap: 'Large gap', fix: TTX.fix('radiation', target, experiment) },
      { p: 'Regolith', earth: (site.regolith || []).map(r => TTX.REGOLITH[r]).join(', ') || 'Unknown', target: target.regolith.map(r => TTX.REGOLITH[r]).join(', '), gap: lvl(v[5]), fix: TTX.fix('regolith', target, experiment) },
    ];
    return rows;
  };

  /** Rule-based compensated protocol: what to add to an Earth field test to cover each gap */
  TTX.fix = function (kind, target, exp) {
    const mars = target.body === 'mars', g = target.gravity, off = Math.round((1 - g) * 100);
    const e = exp || 'rover';
    const R = {
      gravity: { rover: `Offload ${off}% of rover mass (gantry or reduced-mass twin) so wheel loads match ${target.gravityTxt}.`,
        eva: `Use ${off}% body-weight offload or parabolic-flight slots for suit mobility trials.`,
        drill: `Re-run drilling with ${off}% reduced weight-on-bit to match ${target.gravityTxt}.`,
        isru: `Validate regolith feed and flow with ${off}% reduced-gravity flow tests.`, astro: 'Gravity has minor effect on sampling — note it, no fix needed.' },
      pressure: { rover: `Thermal-vacuum chamber tests at ${mars ? '~0.7 kPa CO₂' : 'high vacuum'} for motors, lubricants and dust behaviour.`,
        eva: `Suit and seal tests in a chamber at ${mars ? '~0.7 kPa' : 'vacuum'}.`, isru: `Run extraction at ${mars ? 'Mars pressure (~0.7 kPa CO₂)' : 'vacuum'} — boiling and sublimation change completely.`,
        drill: `Chamber-test cuttings removal at ${mars ? '~0.7 kPa' : 'vacuum'}; ice sublimates instead of melting.`, astro: `Expose samples at ${mars ? 'Mars' : 'lunar'} pressure in the lab before trusting field biosignature results.` },
      thermal: { def: `Add cold-soak chamber cycles to ${mars ? '−80 °C' : '−170 °C'} for electronics, batteries and seals.` },
      swing: { def: `Thermal cycling: repeat ${mars ? '~80 °C' : '~250 °C'} day–night cycles to test fatigue and condensation.` },
      water: { astro: 'Earth sites still see rain or fog: run sterile controls and sample the driest microsites.',
        isru: 'Dry samples to target water content before extraction tests; Earth soils hold far more water.', def: 'Log ambient moisture; run a dried-sample control.' },
      humidity: { astro: 'Humidity supports microbes the target cannot — pair field data with desiccation chamber tests.', def: 'Run electronics and optics under dry gas to avoid false passes.' },
      radiation: { def: `Supplement with lab irradiation (proton / gamma) to ${target.doseTxt} over mission duration; Earth's atmosphere and field block almost all of it.` },
      regolith: { def: `Add a simulant test bed (${mars ? 'e.g. MGS-1 Mars global simulant' : 'e.g. LHS-1 / LMS-1 lunar simulants'}) alongside the field site.` },
    };
    const r = R[kind]; return r[e] || r.def || '';
  };

  /** Validation: can PAM tell established analogs apart from control sites? (AUC, 0.5 = chance, 1 = perfect) */
  TTX.validate = function (sites, target, climateById, weights) {
    const sc = s => TTX.score(s, target, climateById[s.id], weights).pam;
    const pos = sites.filter(s => s.status === 'established').map(sc).filter(x => x != null);
    const neg = sites.filter(s => s.status === 'control').map(sc).filter(x => x != null);
    if (!pos.length || !neg.length) return null;
    let wins = 0; for (const p of pos) for (const n of neg) wins += p > n ? 1 : p === n ? 0.5 : 0;
    const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
    return { auc: wins / (pos.length * neg.length), meanPos: mean(pos), meanNeg: mean(neg), nPos: pos.length, nNeg: neg.length };
  };

  if (typeof module !== 'undefined') module.exports = TTX;
})(typeof window !== 'undefined' ? window : globalThis);

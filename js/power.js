/* TERRA TWIN X — NASA POWER client (Prediction Of Worldwide Energy Resources).
 * Climatology endpoint: 20-year monthly/annual means at ~0.5° resolution. No API key needed.
 * Results are cached in localStorage; a committed snapshot (data/power_cache.js) is used first if present. */
(function (root) {
  const TTX = root.TTX = root.TTX || {};
  const BASE = 'https://power.larc.nasa.gov/api/temporal/climatology/point';
  const PARAMS = ['T2M', 'T2M_MAX', 'T2M_MIN', 'T2M_RANGE', 'PRECTOTCORR', 'RH2M', 'ALLSKY_SFC_SW_DWN', 'PS'];
  const KEY = 'ttx_power_v1';
  const mem = Object.assign({}, root.TTX_POWER_CACHE || {});
  try { Object.assign(mem, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* storage unavailable */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { } };
  const k = (lat, lon) => `${(+lat).toFixed(2)},${(+lon).toFixed(2)}`;

  TTX.powerUrl = (lat, lon) => `${BASE}?parameters=${PARAMS.join(',')}&community=RE&longitude=${(+lon).toFixed(3)}&latitude=${(+lat).toFixed(3)}&format=JSON`;

  TTX.parsePower = function (json) {
    const p = (json && json.properties && json.properties.parameter) || {};
    const ann = n => { const v = p[n] && p[n].ANN; return v == null || v <= -998 ? null : v; };
    const coords = (json && json.geometry && json.geometry.coordinates) || [];
    const precip = ann('PRECTOTCORR');
    return {
      tmean: ann('T2M'), tmax: ann('T2M_MAX'), tmin: ann('T2M_MIN'), trange: ann('T2M_RANGE'),
      precipMmYr: precip == null ? null : precip * 365.25, rh: ann('RH2M'), solar: ann('ALLSKY_SFC_SW_DWN'), ps: ann('PS'),
      elev: coords.length > 2 ? coords[2] : null, src: 'NASA POWER climatology', fetched: new Date().toISOString(),
    };
  };

  TTX.cachedClimate = (lat, lon) => mem[k(lat, lon)] || null;

  const inflight = {};
  TTX.fetchClimate = async function (lat, lon) {
    const key = k(lat, lon);
    if (mem[key]) return mem[key];
    if (inflight[key]) return inflight[key];
    inflight[key] = (async () => {
      let lastErr;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const r = await fetch(TTX.powerUrl(lat, lon));
          if (!r.ok) throw new Error('NASA POWER HTTP ' + r.status);
          const c = TTX.parsePower(await r.json());
          mem[key] = c; save(); return c;
        } catch (e) { lastErr = e; await new Promise(res => setTimeout(res, 800 * (attempt + 1))); }
      }
      throw lastErr;
    })();
    try { return await inflight[key]; } finally { delete inflight[key]; }
  };

  /** Run tasks with limited concurrency, reporting progress */
  TTX.pool = async function (items, limit, fn, onEach) {
    let i = 0, done = 0; const out = new Array(items.length);
    async function worker() { while (i < items.length) { const j = i++; try { out[j] = await fn(items[j]); } catch (e) { out[j] = null; } done++; onEach && onEach(done, items.length, j); } }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return out;
  };

  /** Export everything fetched so far as a JS snapshot the team can commit to data/power_cache.js */
  TTX.snapshot = () => 'window.TTX_POWER_CACHE = ' + JSON.stringify(mem, null, 1) + ';\n';
  TTX.cacheSize = () => Object.keys(mem).length;
  TTX.clearCache = () => { for (const key of Object.keys(mem)) delete mem[key]; save(); };
})(typeof window !== 'undefined' ? window : globalThis);

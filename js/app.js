/* TERRA TWIN X — UI controller */
(function () {
  const T = window.TTX, $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const scoreCol = p => p == null ? '#6F6862' : p >= 70 ? '#FF551A' : p >= 55 ? '#FFB08F' : p >= 40 ? '#38BDF8' : '#1E5671';
  const SRC = ['Site catalogue · lithology', 'Site catalogue · terrain class', 'NASA POWER · T2M, T2M_RANGE', 'NASA POWER · PRECTOTCORR, RH2M',
    'NASA POWER · elevation, ALLSKY_SFC_SW_DWN', 'Site catalogue · regolith, ground ice'];
  const TOP = 8;

  const S = { dest: 'mars', target: T.TARGETS[0], exp: T.EXPERIMENTS[0], w: [...T.EXPERIMENTS[0].w], sel: null, custom: [], cells: [], scanning: false, showAll: false, photos: {}, dateIdx: 0 };
  const allSites = () => [...T.SITES, ...S.custom];
  const climate = s => T.cachedClimate(s.lat, s.lon);
  const res = s => T.score(s, S.target, climate(s), S.w);

  // ---------- globes ----------
  const earth = new T.Globe($('#earth'), { col: '#38BDF8', dots: T.dots('earth'), rot: 70, tilt: 15, auto: 3,
    onPin: p => select(p.id), onPick: ll => addCustom(ll.lat, ll.lon) });
  const planet = new T.Globe($('#planet'), { col: '#FF551A', c0: '#C7471A', c1: '#1E0A04', dots: T.dots('mars'), rot: -77, tilt: -18, auto: 2,
    onPin: p => setTarget(T.TARGETS.find(t => t.id === p.id)) });
  let last = performance.now();
  (function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; earth.draw(dt); planet.draw(dt); requestAnimationFrame(loop); })(last);

  function refreshPins() {
    earth.pins = allSites().filter(s => s.status !== 'control').map(s => { const r = res(s);
      return { id: s.id, name: `${s.name} · ${r.pam ?? '—'}%`, lat: s.lat, lon: s.lon, color: s.status === 'custom' ? '#F2EDE8' : scoreCol(r.pam), size: 5, ring: s.status === 'candidate' }; });
    earth.selected = S.sel; earth.cells = S.cells;
    planet.pins = T.TARGETS.filter(t => t.body === S.dest).map(t => ({ id: t.id, name: t.name, lat: t.lat, lon: t.lon, color: '#F2EDE8', size: 5 }));
    planet.selected = S.target.id;
  }

  // ---------- mission bar ----------
  function renderControls() {
    document.querySelectorAll('#dest button').forEach(b => b.classList.toggle('on', b.dataset.v === S.dest));
    $('#target').innerHTML = T.TARGETS.filter(t => t.body === S.dest).map(t => `<option value="${t.id}" ${t.id === S.target.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
    $('#exp').innerHTML = T.EXPERIMENTS.map(e => `<option value="${e.id}" ${e.id === S.exp.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('');
    $('#weights').innerHTML = `<div class="mono" style="margin-bottom:8px">PAM weights · ${esc(S.exp.name)}</div>` +
      T.VECTORS.map((v, i) => `<label class="w"><span>${v}</span><input type="range" min="0" max="50" value="${S.w[i]}" data-i="${i}"><span>${S.w[i]}</span></label>`).join('') +
      `<button class="btn" id="resetW" style="margin-top:8px;font-size:12px;padding:6px 12px">Reset</button>`;
    $('#resetW').onclick = () => { S.w = [...S.exp.w]; rescoreCells(); update(); };
    $('#planetLabel').textContent = S.dest === 'mars' ? 'Mars' : 'Moon';
    $('#planetTitle').textContent = S.target.name;
  }
  $('#dest').addEventListener('click', e => { const v = e.target.closest('button')?.dataset.v; if (!v || v === S.dest) return;
    S.dest = v; Object.assign(planet, v === 'mars' ? { col: '#FF551A', c0: '#C7471A', c1: '#1E0A04', dots: T.dots('mars') } : { col: '#CFC8C1', c0: '#8E8781', c1: '#141211', dots: T.dots('moon') });
    setTarget(T.TARGETS.find(t => t.body === v)); });
  $('#target').onchange = e => setTarget(T.TARGETS.find(t => t.id === e.target.value));
  $('#exp').onchange = e => { S.exp = T.EXPERIMENTS.find(x => x.id === e.target.value); S.w = [...S.exp.w]; rescoreCells(); update(); };
  $('#btnWeights').onclick = e => { e.stopPropagation(); $('#weights').classList.toggle('open'); };
  $('#weights').addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', () => $('#weights').classList.remove('open'));
  $('#weights').addEventListener('input', e => { const i = +e.target.dataset.i; if (isNaN(i)) return; S.w[i] = +e.target.value; e.target.nextElementSibling.textContent = S.w[i]; rescoreCells(); renderRight(); refreshPins(); });
  function setTarget(t) { if (!t) return; S.target = t; planet.focus(t.lat, t.lon); rescoreCells(); update(); }

  // ---------- side panel ----------
  function renderRight() {
    const el = $('#right'), site = allSites().find(s => s.id === S.sel);
    if (site) { el.innerHTML = detail(site); bindDetail(site); return; }
    const ranked = allSites().filter(s => s.status !== 'control').map(s => ({ s, r: res(s) })).sort((a, b) => (b.r.pam ?? -1) - (a.r.pam ?? -1));
    const shown = S.showAll ? ranked : ranked.slice(0, TOP);
    el.innerHTML = `<h2>Best Earth analogs</h2><div class="sub">for ${esc(S.target.name)} · ${esc(S.exp.name)}</div>` +
      shown.map(({ s, r }, i) => `<div class="row" data-id="${s.id}"><span class="n">${String(i + 1).padStart(2, '0')}</span>
        <div><div class="nm">${esc(s.name)}${s.status === 'candidate' ? '<span class="cand" title="New candidate"></span>' : ''}</div><div class="rg">${esc(s.region)}</div></div>
        <span class="score" style="color:${scoreCol(r.pam)}">${r.pam ?? '—'}</span></div>`).join('') +
      (ranked.length > TOP ? `<button class="more" id="more">${S.showAll ? 'Show top ' + TOP : 'Show all ' + ranked.length + ' sites'}</button>` : '');
    el.querySelectorAll('.row').forEach(r => r.onclick = () => select(r.dataset.id));
    const m = $('#more'); if (m) m.onclick = () => { S.showAll = !S.showAll; renderRight(); };
  }

  function detail(s) {
    const c = climate(s), r = res(s), rows = T.delta(s, S.target, c, S.exp.id);
    const proto = [...new Set(rows.filter(x => x.gap !== 'Close' && x.fix).map(x => x.fix))];
    const custom = s.status === 'custom';
    const selBox = (k, dict, label) => `<label class="sel"><span>${label}</span><select data-k="${k}"><option value="">Unknown</option>${Object.entries(dict).map(([v, n]) =>
      `<option value="${v}" ${(s[k] || [])[0] === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
    const status = { established: 'Established analog', candidate: 'New candidate', custom: 'Your discovery point', control: 'Control site' }[s.status];
    const scan = S.cells.length && S.scanFor === s.id ? [...S.cells].filter(x => x.score != null).sort((a, b) => b.score - a.score).slice(0, 5) : [];
    return `<button class="back" id="back">← All analogs</button>
    <div class="mono">${esc(status)} · ${esc(s.region)}</div>
    <h2 style="font-size:24px;margin-top:6px">${esc(s.name)}</h2>
    <div class="hero"><span class="big" style="color:${scoreCol(r.pam)}">${r.pam ?? '—'}<span style="font-size:24px">%</span></span>
      <span class="note">match to ${esc(S.target.name)}<br>${Math.round(r.coverage * 100)}% data coverage</span></div>
    <p class="why">${esc(T.why(r))}${c ? '' : ` <a href="#" id="fetchOne">Load NASA climate</a>`}</p>
    <button class="btn primary explainbtn" id="explain">▶ Why this score? <span style="font-weight:400;opacity:.75">· narrated video</span></button>
    <div class="pics" id="pics"></div><div class="picnote"><span id="picsrc">Loading pictures…</span><button id="otherDate">Clouds? Try another date</button></div>
    ${custom ? `<details open><summary>Describe the ground here</summary><p class="note" style="margin:8px 0 4px">Climate comes from NASA POWER. Add what you know to complete the score.</p>
      ${selBox('lith', T.LITH, 'Rock')}${selBox('terrain', T.TERRAIN, 'Landform')}${selBox('regolith', T.REGOLITH, 'Surface')}
      <label class="sel"><span>Ground ice</span><select data-k="ice"><option value="">Unknown</option><option value="1" ${s.ice === true ? 'selected' : ''}>Yes</option><option value="0" ${s.ice === false ? 'selected' : ''}>No</option></select></label></details>` : ''}
    <details open><summary>Match breakdown</summary><div>
      ${r.vectors.map((v, i) => `<div class="vec" title="${SRC[i]}"><span>${T.VECTORS[i]}</span><div class="bar"><div style="width:${v == null ? 0 : v * 100}%;background:${i % 2 ? '#FF551A' : '#38BDF8'}"></div></div><span>${v == null ? '—' : Math.round(v * 100)}</span></div>`).join('')}</div></details>
    <details><summary>Where Earth differs</summary>
      <table><tr><th></th><th>Here</th><th>${esc(S.target.name.split(' (')[0])}</th></tr>
      ${rows.map(x => `<tr><td><span class="g g-${x.gap.split(' ')[0]}" title="${x.gap}"></span> ${x.p}</td><td class="e">${esc(x.earth)}</td><td class="t">${esc(x.target)}</td></tr>`).join('')}</table>
      <p class="note">Earth: NASA POWER 2001–2020 climatology. Target: approximate literature values. Dot: <span class="g g-Close"></span> close <span class="g g-Partial"></span> partial <span class="g g-Large"></span> large gap.</p></details>
    <details><summary>Field test plan</summary><ol>${proto.map(p => `<li>${esc(p)}</li>`).join('')}</ol></details>
    ${scan.length ? `<details open><summary>Best cells nearby</summary>${scan.map(x => `<div class="row" data-lat="${x.lat}" data-lon="${x.lon}" style="grid-template-columns:1fr auto"><span>${x.lat.toFixed(1)}°, ${x.lon.toFixed(1)}°</span><span class="score" style="color:${scoreCol(x.score)}">${x.score}</span></div>`).join('')}<p class="note">Climate vectors only — click a cell to analyse it.</p></details>` : ''}
    <div class="links"><button id="dl">Download report</button><a href="${T.powerUrl(s.lat, s.lon)}" target="_blank" rel="noopener">Raw NASA data</a></div>`;
  }
  function renderPics(s) {
    const box = $('#pics'); if (!box) return;
    const sats = T.satViews(s.lat, s.lon, S.dateIdx || 0), ph = S.photos[s.id] || [];
    const fig = (g, cls) => `<figure class="${cls || ''}"><a href="${esc(g.page || g.url)}" target="_blank" rel="noopener"><img src="${esc(g.url)}" alt="${esc(g.title || g.label)}" loading="lazy" onerror="this.closest('figure').style.display='none'"></a><figcaption>${esc(g.kind === 'sat' ? g.label : g.credit)}</figcaption></figure>`;
    box.innerHTML = fig(sats[0], 'wide') + ph.slice(0, 4).map(g => fig(g)).join('');
    $('#picsrc').textContent = S.photos[s.id] ? (ph.length ? `Satellite: NASA GIBS · Photos: Wikimedia Commons (${ph.length})` : 'Satellite: NASA GIBS · no geotagged photos within 10 km') : 'Satellite: NASA GIBS · loading photos…';
  }
  function bindDetail(s) {
    renderPics(s);
    if (!S.photos[s.id]) T.photos(s.lat, s.lon).then(ph => { S.photos[s.id] = ph; if (S.sel === s.id) renderPics(s); });
    $('#otherDate').onclick = () => { S.dateIdx = (S.dateIdx || 0) + 1; renderPics(s); };
    $('#explain').onclick = async () => {
      const ph = S.photos[s.id] || await Promise.race([T.photos(s.lat, s.lon), new Promise(r => setTimeout(() => r([]), 2500))]);
      const r = res(s), rows = T.delta(s, S.target, climate(s), S.exp.id);
      T.explain(s, { target: S.target, exp: S.exp, w: S.w, r, rows, proto: [...new Set(rows.filter(x => x.gap !== 'Close' && x.fix).map(x => x.fix))],
        climate: climate(s), photos: ph, sats: T.satViews(s.lat, s.lon, S.dateIdx || 0) });
    };
    $('#back').onclick = () => { S.sel = null; earth.selected = null; $('#scan').disabled = true; $('#earthTitle').textContent = 'Click a pin, or anywhere, to analyse'; renderRight(); };
    const f = $('#fetchOne'); if (f) f.onclick = e => { e.preventDefault(); loadSites([s]); };
    document.querySelectorAll('#right select').forEach(sel => sel.onchange = () => {
      const k = sel.dataset.k, v = sel.value; s[k] = k === 'ice' ? (v === '' ? null : v === '1') : (v ? [v] : null); refreshPins(); renderRight(); });
    document.querySelectorAll('#right .row[data-lat]').forEach(r => r.onclick = () => addCustom(+r.dataset.lat, +r.dataset.lon));
    $('#dl').onclick = () => { const r = res(s);
      download(`${s.id}_vs_${S.target.id}.json`, JSON.stringify({ site: s, target: S.target.name, experiment: S.exp.name, weights: S.w, pam: r.pam, coverage: r.coverage,
        vectors: Object.fromEntries(T.VECTORS.map((v, i) => [v, r.vectors[i]])), climate: climate(s), delta: T.delta(s, S.target, climate(s), S.exp.id) }, null, 2), 'application/json'); };
  }
  function select(id) {
    S.sel = id; const s = allSites().find(x => x.id === id); if (!s) return;
    earth.focus(s.lat, s.lon); earth.selected = id; $('#earthTitle').textContent = s.name; $('#scan').disabled = S.scanning;
    if (!climate(s)) loadSites([s]);
    renderRight();
  }

  // ---------- discovery ----------
  let nCustom = 0;
  function addCustom(lat, lon) {
    const id = 'pt' + (++nCustom);
    S.custom.push({ id, name: `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`, region: 'Discovery point', lat, lon, status: 'custom', lith: null, terrain: null, regolith: null, ice: null });
    refreshPins(); select(id);
  }
  function rescoreCells() { for (const c of S.cells) { const cl = T.cachedClimate(c.lat, c.lon); c.score = cl ? T.score({ lith: null, terrain: null, regolith: null, ice: null }, S.target, cl, S.w).pam : null; } earth.cells = S.cells; }
  $('#scan').onclick = async () => {
    const s = allSites().find(x => x.id === S.sel); if (!s || S.scanning) return;
    S.scanning = true; $('#scan').disabled = true; S.scanFor = s.id;
    const pts = []; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) pts.push({ lat: Math.max(-85, Math.min(85, s.lat + i * 2.5)), lon: s.lon + j * 2.5, size: 2.5, score: null });
    S.cells = pts; earth.cells = pts;
    await T.pool(pts, 4, p => T.fetchClimate(p.lat, p.lon), (d, n) => { $('#prog').style.width = (100 * d / n) + '%'; rescoreCells(); setStatus(`Scanning ${d}/${n}`, true); });
    rescoreCells(); S.scanning = false; $('#scan').disabled = false; $('#prog').style.width = '0'; setStatus(); renderRight();
  };

  // ---------- data ----------
  function setStatus(msg, busy) {
    const n = T.SITES.filter(s => climate(s)).length, all = n === T.SITES.length;
    $('#dot').className = 'dot ' + (busy ? 'busy' : all ? 'ok' : '');
    $('#statusText').textContent = msg || (all ? 'NASA data live' : `NASA data ${n}/${T.SITES.length}`);
    $('#status').title = 'NASA POWER climatology, cached in this browser';
  }
  async function loadSites(list) {
    const todo = list.filter(s => !climate(s)); if (!todo.length) { setStatus(); return; }
    await T.pool(todo, 4, s => T.fetchClimate(s.lat, s.lon), (d, n) => { $('#prog').style.width = (100 * d / n) + '%'; setStatus(`Loading NASA data ${d}/${n}`, true); refreshPins(); if (d % 6 === 0 || d === n) renderRight(); });
    $('#prog').style.width = '0'; setStatus(); refreshPins(); renderRight();
  }
  function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }

  // ---------- validation ----------
  function climById() { const m = {}; for (const s of T.SITES) m[s.id] = climate(s); return m; }
  $('#btnValidate').onclick = () => {
    const v = T.validate(T.SITES, S.target, climById(), S.w);
    const matrix = T.TARGETS.map(t => `<div style="text-align:left;color:var(--muted)">${esc(t.name)}</div>` + T.EXPERIMENTS.map(e => {
      const x = T.validate(T.SITES, t, climById(), e.w), a = x ? x.auc : null;
      return `<div style="background:${a == null ? '#1C1917' : a >= .9 ? 'rgba(123,216,143,.22)' : a >= .75 ? 'rgba(255,176,143,.22)' : 'rgba(255,85,26,.22)'}">${a == null ? '—' : a.toFixed(2)}</div>`; }).join('')).join('');
    const all = T.SITES.map(s => ({ s, r: res(s) })).sort((a, b) => (b.r.pam ?? -1) - (a.r.pam ?? -1));
    $('#validateBody').innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:24px">Does PAM work?</h2><button class="btn" data-close>Close</button></div>
      <p class="note" style="max-width:640px">If PAM is sensible, sites mission teams already use should score higher than places nobody would use (London, Manaus, Kolkata, Singapore, Iowa farmland, Kisangani). AUC is the chance that a real analog outscores a control: 0.5 = guessing, 1.0 = perfect.</p>
      ${v ? `<div style="display:flex;gap:40px;margin:22px 0"><div><div class="big">${v.auc.toFixed(2)}</div><span class="mono">AUC · current settings</span></div>
      <div><div class="big" style="font-size:36px;color:var(--ice)">${v.meanPos.toFixed(0)}%</div><span class="mono">avg · ${v.nPos} established</span></div>
      <div><div class="big" style="font-size:36px;color:var(--dim)">${v.meanNeg.toFixed(0)}%</div><span class="mono">avg · ${v.nNeg} controls</span></div></div>` : '<p class="note">Load NASA data first.</p>'}
      <h3>Every target × experiment</h3>
      <div class="grid"><div></div>${T.EXPERIMENTS.map(e => `<div style="color:var(--muted)">${esc(e.name)}</div>`).join('')}${matrix}</div>
      <details style="margin-top:18px"><summary>All sites at current settings</summary>
      <table><tr><th>#</th><th>Site</th><th>Type</th><th>PAM</th></tr>${all.map(({ s, r }, i) =>
        `<tr><td>${i + 1}</td><td>${esc(s.name)}</td><td style="color:var(--muted)">${s.status}</td><td style="color:${scoreCol(r.pam)}">${r.pam ?? '—'}%</td></tr>`).join('')}</table></details>
      <p class="note">Limitation: the controls are deliberately obvious, so this checks that PAM is sensible, not that it is optimal.</p>`;
    $('#mValidate').classList.add('open');
  };
  $('#btnMethod').onclick = () => {
    $('#methodBody').innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:24px">About TERRA TWIN X</h2><button class="btn" data-close>Close</button></div>
    <p class="note" style="max-width:640px">Find, characterize and validate places on Earth that behave like Moon and Mars landing sites — using open NASA data.</p>
    <h3>How the match score works</h3>
    <p class="note">Each Earth site gets a 0–1 score on six vectors, combined with weights that depend on the experiment: <b>PAM = Σ wᵢ·sᵢ / Σ wᵢ</b> over vectors with data. <b>Data coverage</b> is how many of the six have data — low coverage marks a site worth characterizing in the field.</p>
    <table><tr><th>Vector</th><th>Data</th><th>Scoring</th></tr>
    <tr><td>Geology</td><td>Rock type (catalogue)</td><td>Affinity between rock classes</td></tr>
    <tr><td>Topography</td><td>Landform (catalogue)</td><td>Affinity between landform classes</td></tr>
    <tr><td>Thermal</td><td>NASA POWER T2M, T2M_RANGE</td><td>Coldness + day–night swing</td></tr>
    <tr><td>Aridity</td><td>NASA POWER PRECTOTCORR, RH2M</td><td>Low rain + low humidity</td></tr>
    <tr><td>Radiation</td><td>NASA POWER elevation, ALLSKY_SFC_SW_DWN</td><td>Altitude + sunlight (proxy)</td></tr>
    <tr><td>Regolith</td><td>Surface type, ground ice (catalogue)</td><td>Material affinity + ice match</td></tr></table>
    <p class="note">Nothing on Earth is as cold, dry or exposed as the Moon or Mars, so climate inputs are scored by how far they sit toward the planetary extreme of Earth's own range. Gravity, pressure and radiation dose never match — they appear under “Where Earth differs” with a fix in the field test plan.</p>
    <h3>Data</h3>
    <p class="note"><b>NASA POWER</b> climatology API (2001–2020, ~0.5° grid), fetched live: <a href="https://power.larc.nasa.gov" target="_blank" rel="noopener">power.larc.nasa.gov</a>. Planetary reference values are approximate (Mars and Moon gravity and pressure; dose from Curiosity RAD and Chang’e-4 LND). Site geology is a team-compiled catalogue.</p>
    <div style="display:flex;gap:8px;margin-top:10px"><button class="btn" id="reload">Refresh NASA data</button><button class="btn" id="export">Export data snapshot</button></div>
    <h3>Narration voice</h3>
    <p class="note">“Why this score?” videos are narrated by an <b>ElevenLabs</b> AI voice. Paste an ElevenLabs API key to generate narration live in this browser — the key stays in this browser only. Then use <i>Download narration pack</i> and commit it as <code>narration/pack.js</code> so every visitor hears the ElevenLabs voice without a key. Without either, the browser's own voice is used.</p>
    <label class="sel"><span>API key</span><input id="elKey" type="password" placeholder="xi-…" style="background:#0b0909;border:1px solid var(--hair2);border-radius:10px;padding:7px 10px" value="${esc(T.voice.settings().key)}"></label>
    <label class="sel"><span>Voice ID</span><input id="elVoice" style="background:#0b0909;border:1px solid var(--hair2);border-radius:10px;padding:7px 10px" value="${esc(T.voice.settings().voice)}"></label>
    <div style="display:flex;gap:8px;align-items:center"><button class="btn" id="elSave">Save</button><button class="btn" id="elPack">Download narration pack (<span id="elN">${T.voice.clipCount()}</span> clips)</button><span class="note" id="elMsg">Now using: ${esc(T.voice.label())}</span></div>
    <h3>Limitations</h3>
    <p class="note">0.5° climate cells smooth out mountains and small craters. Ground type for discovery points is user-entered. Next: SRTM terrain, EMIT mineralogy, ECOSTRESS vs THEMIS/Diviner thermal inertia, Mars Climate Database targets.</p>
    <h3>SI disclosure</h3>
    <p class="note">Code written with assistance from Claude (Anthropic) under the team’s direction. The concept and design decisions are the team’s.</p>`;
    $('#elSave').onclick = () => { T.voice.save($('#elKey').value, $('#elVoice').value); $('#elMsg').textContent = 'Saved. Now using: ' + T.voice.label(); };
    $('#elPack').onclick = () => download('pack.js', T.voice.exportPack(), 'text/javascript');
    $('#reload').onclick = () => { T.clearCache(); loadSites(T.SITES); };
    $('#export').onclick = () => download('power_cache.js', T.snapshot(), 'text/javascript');
    $('#mMethod').classList.add('open');
  };
  document.addEventListener('click', e => { if (e.target.matches('[data-close]') || e.target.classList.contains('modal')) document.querySelectorAll('.modal').forEach(m => m.classList.remove('open')); });

  function update() { renderControls(); refreshPins(); renderRight(); }
  update(); setStatus(); loadSites(T.SITES);
})();

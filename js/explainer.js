/* TERRA TWIN X — "Why this score?" narrated explainer.
 * Builds a short animated video for any site from its own data (scores, NASA POWER climate, Delta Matrix,
 * photos), narrated by an ElevenLabs AI voice (see voice.js), falling back to the browser's speech synthesis. */
(function (root) {
  const TTX = root.TTX = root.TTX || {};
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const col = p => p == null ? '#6F6862' : p >= 70 ? '#FF551A' : p >= 55 ? '#FFB08F' : p >= 40 ? '#38BDF8' : '#1E5671';
  const num = (x, d = 0) => (+x).toFixed(d).replace('-', 'minus ');
  function scenes(site, c) {
    const { target, exp, r, rows, proto, climate: cl, photos, sats } = c;
    const body = target.body === 'mars' ? 'Mars' : 'the Moon';
    const named = site.status === 'custom' ? `This spot, at ${site.name},` : `${site.name}, in ${site.region},`;
    const vs = r.vectors.map((v, i) => ({ v, i })).filter(x => x.v != null).sort((a, b) => b.v - a.v);
    const best = vs[0], worst = vs[vs.length - 1];
    const L = [];
    L.push({ id: 'intro', say: `${named} scores ${r.pam ?? 'no'} percent as an Earth analog for ${target.name}, for ${exp.name.toLowerCase()} tests.`,
      html: `<img class="kb" src="${esc(sats[1].url)}" alt=""><div class="shade"></div><div class="pin"></div>
        <div class="tl"><div class="eyebrow">Why this score?</div><h1>${esc(site.name)}</h1><p>${esc(site.region)} → ${esc(target.name)}</p></div>
        <div class="bigscore" style="color:${col(r.pam)}">${r.pam ?? '—'}<small>%</small></div>` });
    const gallery = (photos.length ? photos.slice(0, 3) : []).concat([sats[0]]);
    L.push({ id: 'look', say: site.note ? site.note + ' Here it is from orbit and on the ground.' : 'Here is what this place looks like from orbit and on the ground.', min: 2.6 * gallery.length,
      html: gallery.map((g, i) => `<figure class="slide" style="animation-delay:${i * 2.6}s;--n:${gallery.length}"><img src="${esc(g.url)}" alt=""><figcaption>${esc(g.kind === 'sat' ? g.label : (g.title + ' — ' + g.credit))}</figcaption></figure>`).join('') });
    L.push({ id: 'vectors', say: best ? `Its strongest match is ${TTX.VECTORS[best.i].toLowerCase()}, at ${Math.round(best.v * 100)} percent. ${worst && worst !== best ? `The weakest is ${TTX.VECTORS[worst.i].toLowerCase()}, at ${Math.round(worst.v * 100)} percent.` : ''} Weights are tuned for ${exp.name.toLowerCase()}.` : 'There is not enough data to score this place yet.',
      html: `<div class="pane"><div class="eyebrow">Six physical vectors · weight</div>${r.vectors.map((v, i) => `<div class="xb ${best && i === best.i ? 'hi' : ''}"><span>${TTX.VECTORS[i]}</span><div><i style="--w:${v == null ? 0 : v * 100}%;background:${i % 2 ? '#FF551A' : '#38BDF8'};animation-delay:${0.3 + i * 0.15}s"></i></div><b>${v == null ? '—' : Math.round(v * 100)}</b><em>×${c.w[i]}</em></div>`).join('')}</div>` });
    if (cl && cl.tmean != null) L.push({ id: 'climate', say: `NASA POWER data shows a mean temperature of ${num(cl.tmean)} degrees, a ${num(cl.trange)} degree swing between day and night, and about ${Math.round(cl.precipMmYr)} millimetres of rain a year.`,
      html: `<div class="pane"><div class="eyebrow">NASA POWER · 20-year climatology</div><div class="stats">
        <div><b>${num(cl.tmean, 1).replace('minus ', '−')}°C</b><span>mean temperature</span></div><div><b>${num(cl.trange, 1)}°C</b><span>day–night swing</span></div>
        <div><b>${Math.round(cl.precipMmYr)} mm</b><span>rain per year</span></div><div><b>${Math.round(cl.rh)}%</b><span>humidity</span></div></div></div>` });
    const g = rows.find(x => x.p === 'Gravity'), p = rows.find(x => x.p === 'Surface pressure');
    L.push({ id: 'gaps', say: `But Earth can't match everything. Gravity on ${body} is ${target.gravity} g, and the air is ${target.body === 'mars' ? 'less than one percent as thick' : 'essentially a vacuum'}. ${proto[0] ? 'So the field plan says: ' + proto[0] : ''}`,
      html: `<div class="pane"><div class="eyebrow">Where Earth differs</div>
        <div class="gap"><span>Gravity</span><b class="e">${esc(g.earth)}</b><i>→</i><b class="t">${esc(g.target)}</b></div>
        <div class="gap"><span>Pressure</span><b class="e">${esc(p.earth)}</b><i>→</i><b class="t">${esc(p.target)}</b></div>
        ${proto[0] ? `<p class="fix"><span>Field plan</span>${esc(proto[0])}</p>` : ''}</div>` });
    L.push({ id: 'end', say: `Data coverage is ${Math.round(r.coverage * 100)} percent. ${r.coverage < 1 ? 'The missing vectors make this a priority for field characterization.' : 'That makes it a well-characterized test site.'}`,
      html: `<div class="endc"><div class="bigscore" style="color:${col(r.pam)};position:static">${r.pam ?? '—'}<small>%</small></div>
        <p>${esc(site.name)} → ${esc(target.name)}<br><span>${Math.round(r.coverage * 100)}% data coverage · ${esc(exp.name)}</span></p><div class="brand">TERRA TWIN <b>X</b></div></div>` });
    return L;
  }

  let state = null;
  TTX.explain = function (site, ctx) {
    let m = document.getElementById('mExplain');
    if (!m) { m = document.createElement('div'); m.id = 'mExplain'; m.className = 'modal'; document.body.appendChild(m); }
    const L = scenes(site, ctx);
    m.innerHTML = `<div class="xp"><div class="xstage">${L.map((s, i) => `<section class="xs" data-i="${i}">${s.html}</section>`).join('')}
      <div class="xcap" id="xcap"></div><div class="xprog">${L.map(() => '<span><i></i></span>').join('')}</div></div>
      <div class="xctl"><button class="btn" id="xPlay">Pause</button><button class="btn" id="xReplay">Replay</button><button class="btn" id="xMute">${TTX.voice.mode() === 'none' ? 'No voice available' : 'Mute voice'}</button>
      <span class="note" style="margin-left:auto">Narration: ${esc(TTX.voice.label())}</span><button class="btn" id="xClose">Close</button></div></div>`;
    m.classList.add('open');
    stop(); state = { L, i: -1, muted: TTX.voice.mode() === 'none', paused: false, timer: null, t0: 0, m };
    TTX.voice.prefetch(L.map(s => s.say));
    m.querySelector('#xClose').onclick = () => { stop(); m.classList.remove('open'); };
    m.onclick = e => { if (e.target === m) { stop(); m.classList.remove('open'); } };
    m.querySelector('#xReplay').onclick = () => { go(0); };
    m.querySelector('#xPlay').onclick = e => { if (state.paused) { state.paused = false; e.target.textContent = 'Pause'; go(state.i); } else { state.paused = true; e.target.textContent = 'Play'; halt(); } };
    m.querySelector('#xMute').onclick = e => { if (TTX.voice.mode() === 'none') return; state.muted = !state.muted; e.target.textContent = state.muted ? 'Unmute voice' : 'Mute voice'; if (state.muted) TTX.voice.stop(); };
    go(0);
  };
  function halt() { if (!state) return; clearTimeout(state.timer); TTX.voice.stop(); state.m.querySelectorAll('.xs').forEach(s => s.classList.add('frozen')); }
  function stop() { if (state) halt(); state = null; }
  function go(i) {
    const st = state; if (!st) return; clearTimeout(st.timer); TTX.voice.stop();
    if (i >= st.L.length) { st.m.querySelector('#xPlay').textContent = 'Play'; st.paused = true; return; }
    st.i = i; const s = st.L[i];
    st.m.querySelectorAll('.xs').forEach((el, k) => { el.classList.toggle('on', k === i); el.classList.remove('frozen');
      if (k === i) { const c = el.cloneNode(true); el.replaceWith(c); } });   // restart CSS animations
    st.m.querySelectorAll('.xprog span').forEach((el, k) => { el.className = k < i ? 'done' : k === i ? 'now' : ''; });
    st.m.querySelector('#xcap').textContent = s.say;
    const words = s.say.split(/\s+/).length, est = Math.max(s.min || 0, words / 2.5 + 0.8);
    const bar = st.m.querySelectorAll('.xprog span')[i].querySelector('i'); bar.style.animationDuration = est + 's';
    let spoken = st.muted, timed = false;
    const next = () => { if (spoken && timed && state === st && !st.paused && st.i === i) go(i + 1); };
    st.timer = setTimeout(() => { timed = true; next(); }, Math.max(s.min || 0, 2.2) * 1000);
    if (!st.muted) {
      const done = () => { if (spoken) return; spoken = true; setTimeout(next, 450); };
      TTX.voice.speak(s.say).then(done, done);
      setTimeout(done, (est + 12) * 1000);   // safety net
    } else { setTimeout(() => { spoken = true; next(); }, est * 1000); }
  }
})(window);

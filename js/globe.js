/* TERRA TWIN X — lightweight interactive canvas globe (orthographic). No libraries. */
(function (root) {
  const TTX = root.TTX = root.TTX || {};
  const D = Math.PI / 180;
  const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  TTX.hexA = hexA;

  class Globe {
    constructor(canvas, opts) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      Object.assign(this, { col: '#38BDF8', c0: '#16465C', c1: '#060C10', dots: [], rot: 0, tilt: -15, pins: [], cells: [],
        auto: 4, onPick: null, onPin: null, selected: null, label: '' }, opts);
      this.target = null; this.drag = null; this.hover = null; this.t = 0;
      this.resize(); new ResizeObserver(() => this.resize()).observe(canvas);
      canvas.addEventListener('pointerdown', e => { this.drag = { x: e.clientX, y: e.clientY, rot: this.rot, tilt: this.tilt, moved: false }; canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener('pointermove', e => {
        if (this.drag) { const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) this.drag.moved = true;
          this.rot = this.drag.rot + dx * 0.35; this.tilt = Math.max(-80, Math.min(80, this.drag.tilt + dy * 0.35)); this.target = null; }
        else { const p = this.pinAt(e); this.hover = p; canvas.style.cursor = p ? 'pointer' : 'crosshair'; }
      });
      canvas.addEventListener('pointerup', e => {
        const d = this.drag; this.drag = null; if (!d || d.moved) return;
        const p = this.pinAt(e); if (p) { this.onPin && this.onPin(p); return; }
        const ll = this.unproject(e); if (ll && this.onPick) this.onPick(ll);
      });
      canvas.addEventListener('pointerleave', () => { this.hover = null; });
    }
    resize() { const r = this.cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = r.width; this.h = r.height; this.cv.width = r.width * dpr; this.cv.height = r.height * dpr; this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    get R() { return Math.min(this.w, this.h) * 0.4; }
    get C() { return [this.w / 2, this.h / 2 + 8]; }
    proj(lat, lon) {
      const la = lat * D, lo = (lon + this.rot) * D, t = this.tilt * D;
      const X = Math.cos(la) * Math.sin(lo), Y = Math.sin(la), Z = Math.cos(la) * Math.cos(lo);
      const Y2 = Y * Math.cos(t) - Z * Math.sin(t), Z2 = Y * Math.sin(t) + Z * Math.cos(t);
      const [cx, cy] = this.C, r = this.R; return [cx + r * X, cy - r * Y2, Z2];
    }
    unproject(e) {
      const b = this.cv.getBoundingClientRect(), [cx, cy] = this.C, r = this.R;
      const X = (e.clientX - b.left - cx) / r, Y2 = -(e.clientY - b.top - cy) / r, q = 1 - X * X - Y2 * Y2;
      if (q < 0) return null; const Z2 = Math.sqrt(q), t = this.tilt * D;
      const Y = Y2 * Math.cos(t) + Z2 * Math.sin(t), Z = -Y2 * Math.sin(t) + Z2 * Math.cos(t);
      let lon = Math.atan2(X, Z) / D - this.rot; lon = ((lon + 540) % 360) - 180;
      return { lat: Math.asin(Math.max(-1, Math.min(1, Y))) / D, lon };
    }
    pinAt(e) {
      const b = this.cv.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top; let best = null, bd = 14;
      for (const p of this.pins) { const [px, py, z] = this.proj(p.lat, p.lon); if (z <= 0.05) continue; const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = p; } }
      return best;
    }
    focus(lat, lon) { this.target = { rot: -lon, tilt: Math.max(-70, Math.min(70, lat)) }; }
    draw(dt) {
      this.t += dt; const ctx = this.ctx, [cx, cy] = this.C, r = this.R;
      if (this.target) { const k = 1 - Math.pow(0.002, dt); let dr = ((this.target.rot - this.rot + 540) % 360) - 180;
        this.rot += dr * k; this.tilt += (this.target.tilt - this.tilt) * k; if (Math.abs(dr) < 0.1 && Math.abs(this.target.tilt - this.tilt) < 0.1) this.target = null; }
      else if (!this.drag && !this.hover) this.rot += this.auto * dt;
      ctx.clearRect(0, 0, this.w, this.h);
      let g = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.35); g.addColorStop(0, hexA(this.col, 0.18)); g.addColorStop(1, hexA(this.col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 1.35, 0, 7); ctx.fill();
      g = ctx.createRadialGradient(cx - r * .35, cy - r * .4, r * .05, cx, cy, r); g.addColorStop(0, this.c0); g.addColorStop(1, this.c1);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
      ctx.lineWidth = 1;
      const line = pts => { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if (a[2] > 0 && b[2] > 0) {
        ctx.strokeStyle = hexA(this.col, 0.04 + 0.18 * b[2]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } } };
      for (let lon = 0; lon < 360; lon += 30) { const p = []; for (let lat = -90; lat <= 90; lat += 6) p.push(this.proj(lat, lon)); line(p); }
      for (let lat = -60; lat <= 60; lat += 30) { const p = []; for (let lon = 0; lon <= 360; lon += 6) p.push(this.proj(lat, lon)); line(p); }
      const ds = Math.max(0.6, r / 300);
      for (const d of this.dots) { const [x, y, z] = this.proj(d[0], d[1]); if (z > 0) { ctx.fillStyle = hexA(d[2] || this.col, 0.15 + 0.65 * z);
        ctx.beginPath(); ctx.arc(x, y, (1.1 + 1.3 * z) * ds, 0, 7); ctx.fill(); } }
      // discovery heat cells
      for (const c of this.cells) { const [x, y, z] = this.proj(c.lat, c.lon); if (z <= 0) continue;
        const col = c.score == null ? '#6F6862' : c.score >= 70 ? '#FF551A' : c.score >= 55 ? '#FFB08F' : c.score >= 40 ? '#38BDF8' : '#1E5671';
        const s = (c.size || 1.5) * r / 57 * Math.max(0.3, z) * 0.92;
        ctx.fillStyle = hexA(col, 0.45 + 0.5 * z); ctx.fillRect(x - s / 2, y - s / 2, s, s);
        ctx.strokeStyle = 'rgba(242,237,232,0.55)'; ctx.lineWidth = 1; ctx.strokeRect(x - s / 2, y - s / 2, s, s); }
      g = ctx.createRadialGradient(cx - r * .3, cy - r * .35, r * .3, cx, cy, r * 1.02);
      g.addColorStop(0, 'rgba(7,6,6,0)'); g.addColorStop(.7, 'rgba(7,6,6,.12)'); g.addColorStop(1, 'rgba(7,6,6,.65)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
      ctx.strokeStyle = hexA(this.col, 0.8); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
      // pins
      const ph = (this.t % 1.8) / 1.8;
      for (const p of this.pins) { const [x, y, z] = this.proj(p.lat, p.lon); if (z <= 0.03) continue;
        const sel = this.selected && this.selected === p.id, hov = this.hover === p, a = Math.min(1, z * 4), col = p.color || this.col;
        ctx.globalAlpha = a;
        if (sel) { ctx.strokeStyle = hexA(col, 1 - ph); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 9 + ph * 22, 0, 7); ctx.stroke(); }
        ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = sel || hov ? 16 : 6;
        ctx.beginPath(); ctx.arc(x, y, sel ? 7 : hov ? 6.5 : (p.size || 5), 0, 7); ctx.fill(); ctx.shadowBlur = 0;
        if (p.ring) { ctx.strokeStyle = hexA('#F2EDE8', .8); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, (p.size || 5) + 2.5, 0, 7); ctx.stroke(); }
        if (sel || hov) { ctx.font = '600 12px Inter, system-ui, sans-serif'; ctx.fillStyle = '#F2EDE8'; ctx.fillText(p.name, x + 12, y - 8); }
        ctx.globalAlpha = 1; }
      if (this.label) { ctx.font = '600 11px "JetBrains Mono", ui-monospace, monospace'; ctx.fillStyle = hexA(this.col, .9); ctx.textAlign = 'center';
        ctx.fillText(this.label, cx, cy + r + 26); ctx.textAlign = 'left'; }
    }
  }
  TTX.Globe = Globe;
})(window);

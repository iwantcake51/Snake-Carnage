/* WATER: flat-style animated shader (depth gradient, drifting caustics, glints, foam, drop rings) for round ponds,
   fountains and rectangular pools. Blood that lands in it diffuses as clouds and slowly tints the whole body. */
const wHash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
function wShape(o) {
  if (o.t === 'c') { const rim = o.fountain ? Math.max(5, o.r * .18) : Math.max(3, o.r * .07); return { cx: o.x, cy: o.y, hw: o.r - rim, hh: o.r - rim, rim, round: true }; }
  const rim = 8; return { cx: o.x + o.w / 2, cy: o.y + o.h / 2, hw: o.w / 2 - rim, hh: o.h / 2 - rim, rim, round: false };
}
function wPath(x, S, inset = 0) {
  if (S.round) { x.beginPath(); x.arc(S.cx, S.cy, S.hw - inset, 0, TAU); }
  else rrect(x, S.cx - S.hw + inset, S.cy - S.hh + inset, (S.hw - inset) * 2, (S.hh - inset) * 2, Math.max(1, 7 - inset));
}
function inWater(o, px, py) { const S = wShape(o); return S.round ? dist2(px, py, S.cx, S.cy) < S.hw * S.hw : Math.abs(px - S.cx) < S.hw && Math.abs(py - S.cy) < S.hh; }
function waterBlood(o, px, py, q) { // q ~ drop size; clouds are visual, tint is the long-term stain
  const b = o.wb || (o.wb = { tint: 0, shown: 0, clouds: [] });
  b.tint += q;
  const near = b.clouds.find(c => dist2(c.x, c.y, px, py) < (c.r * .6) ** 2);
  if (near) near.a = Math.min(.7, near.a + q * 3);
  else { if (b.clouds.length > 50) b.clouds.shift(); b.clouds.push({ x: px, y: py, r: 3, a: Math.min(.75, .3 + q * 3), g: rand(8, 16) }); }
}
function updateWaters(dt) {
  if (!obstacles) return;
  for (const o of obstacles) {
    const b = o.kind === 'water' && o.wb; if (!b) continue;
    b.tint *= Math.exp(-dt / 900);                       // the filter very slowly cleans it
    b.shown += (b.tint - b.shown) * Math.min(1, dt * .5); // diffusion lag: the color creeps in
    for (let i = b.clouds.length - 1; i >= 0; i--) {
      const c = b.clouds[i]; c.r += dt * c.g / (1 + c.r / 22); c.a -= dt * c.a * .09;
      c.x += Math.sin(T * .4 + i) * dt * 2; c.y += Math.cos(T * .3 + i * 1.7) * dt * 2;
      if (c.a < .02) b.clouds.splice(i, 1);
    }
  }
}
function bloodTint(o, S) { // 0..1 strength and color, diluted by the size of the water
  const b = o.wb; if (!b || b.shown < .01) return null;
  const area = S.round ? Math.PI * S.hw * S.hw : 4 * S.hw * S.hh, k = b.shown / Math.max(.3, area / 9000);
  const s = 1 - Math.exp(-k / 1.6), m = clamp(k / 2.2, 0, 1);
  return { a: .88 * s, rgb: [Math.round(232 - 92 * m), Math.round(118 - 110 * m), Math.round(140 - 120 * m)] };
}
function drawWater(x, o, t) {
  const S = wShape(o), { cx, cy, hw, hh, rim } = S, base = o.color, M = Math.max(hw, hh) * 1.25, tint = bloodTint(o, S);
  // basin / shore / pool coping
  if (o.fountain) {
    const R = o.r;
    x.fillStyle = '#b9b2a4'; circ(x, cx, cy, R);
    x.strokeStyle = '#8f887b'; x.lineWidth = 1.5; x.beginPath(); x.arc(cx, cy, R - .75, 0, TAU); x.stroke();
    x.strokeStyle = '#d6d0c3'; x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, R - rim * .5, 0, TAU); x.stroke();
    x.strokeStyle = '#9d9689'; for (let k = 0; k < 12; k++) { const a = k * TAU / 12; x.beginPath(); x.moveTo(cx + Math.cos(a) * (hw + 1), cy + Math.sin(a) * (hw + 1)); x.lineTo(cx + Math.cos(a) * (R - 1), cy + Math.sin(a) * (R - 1)); x.stroke(); }
  } else if (S.round) { x.fillStyle = '#5d7f3a'; circ(x, cx, cy, o.r); x.fillStyle = '#c9b68a'; circ(x, cx, cy, o.r - rim * .45); }
  else {
    x.fillStyle = '#efeadf'; x.fillRect(o.x, o.y, o.w, o.h);
    x.strokeStyle = '#c9c1b0'; x.lineWidth = 1; x.strokeRect(o.x + .5, o.y + .5, o.w - 1, o.h - 1);
    x.strokeStyle = '#ddd5c5'; for (let p = o.x + 16; p < o.x + o.w; p += 16) { x.beginPath(); x.moveTo(p, o.y); x.lineTo(p, o.y + rim); x.moveTo(p, o.y + o.h - rim); x.lineTo(p, o.y + o.h); x.stroke(); }
  }
  x.save(); wPath(x, S); x.clip();
  const g = x.createRadialGradient(cx, cy, Math.min(hw, hh) * .1, cx, cy, M);
  g.addColorStop(0, shade(base, S.round ? -.38 : -.2)); g.addColorStop(.7, shade(base, -.1)); g.addColorStop(1, shade(base, .1));
  x.fillStyle = g; x.fillRect(cx - hw, cy - hh, hw * 2, hh * 2);
  if (!S.round) { // lane lines on the pool floor, wobbling with the surface
    x.strokeStyle = shade(base, -.35); x.lineWidth = 4;
    for (let ly = cy - hh + hh / 3; ly < cy + hh - 4; ly += hh * 2 / 3) { x.beginPath(); for (let lx = cx - hw + 20; lx <= cx + hw - 20; lx += 10) { const yy = ly + Math.sin(lx * .06 + t * 1.6) * 1.2; lx === cx - hw + 20 ? x.moveTo(lx, yy) : x.lineTo(lx, yy); } x.stroke(); }
  }
  if (tint) { // diffused blood: faint pink first, deep red once there's a lot
    x.fillStyle = `rgba(${tint.rgb},${tint.a.toFixed(3)})`; x.fillRect(cx - hw, cy - hh, hw * 2, hh * 2);
  }
  if (o.wb) for (const c of o.wb.clouds) { // fresh blood still spreading
    const cg = x.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    cg.addColorStop(0, `rgba(150,8,16,${c.a.toFixed(3)})`); cg.addColorStop(.6, `rgba(170,15,25,${(c.a * .5).toFixed(3)})`); cg.addColorStop(1, 'rgba(180,20,30,0)');
    x.fillStyle = cg; x.fillRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);
  }
  // caustics: two crossing sets of wobbling lines drifting slowly
  x.lineWidth = 1.4; x.lineCap = 'round';
  const step = Math.max(4, M / 11), gap = Math.max(9, Math.min(M / 5, 30));
  for (let set = 0; set < 2; set++) {
    x.strokeStyle = set ? 'rgba(255,255,255,.10)' : 'rgba(190,240,255,.14)';
    const dir = set ? -1 : 1, sp = t * (set ? .55 : .4);
    x.beginPath();
    for (let ly = -M + ((t * 6 * dir) % gap + gap) % gap - gap; ly < M + gap; ly += gap) {
      for (let lx = -M; lx <= M; lx += step) {
        const yy = ly + Math.sin(lx * .09 + sp * 2 + ly * .3) * 3 + Math.sin(lx * .045 - sp * 3 + set) * 2.2;
        const px = set ? cx + yy * .35 + lx * .94 : cx + lx, py = set ? cy + yy * .94 - lx * .35 : cy + yy;
        lx === -M ? x.moveTo(px, py) : x.lineTo(px, py);
      }
    }
    x.stroke();
  }
  const pt = (seed, spread) => S.round ? (() => { const a = wHash(seed) * TAU, d = Math.sqrt(wHash(seed + 1)) * hw * spread; return [cx + Math.cos(a) * d, cy + Math.sin(a) * d]; })()
                                       : [cx + (wHash(seed) * 2 - 1) * hw * spread, cy + (wHash(seed + 1) * 2 - 1) * hh * spread];
  const nG = Math.round(Math.sqrt(hw * hh) / 7);
  for (let i = 0; i < nG; i++) { // glints
    const al = Math.max(0, Math.sin(t * (1.3 + wHash(i * 7) * 1.5) + i * 2.3)) ** 3 * .55;
    if (al < .02) continue;
    const [gx, gy] = pt(i * 3.1 + o.x, .85);
    x.fillStyle = `rgba(255,255,255,${al.toFixed(3)})`; x.beginPath(); x.ellipse(gx, gy, 3.2, 1.1, 0, 0, TAU); x.fill();
  }
  const nR = o.fountain ? 3 : Math.max(2, Math.round(Math.sqrt(hw * hh) / 30));
  for (let i = 0; i < nR; i++) { // drop rings
    const tt = t * .32 + i / nR, cyc = Math.floor(tt), ph = tt - cyc;
    let [rx, ry] = pt(cyc * 13 + i * 71 + o.x, .75);
    if (o.fountain) { const a = wHash(cyc * 5 + i) * TAU, d = hw * (.62 + wHash(cyc + i) * .25); rx = cx + Math.cos(a) * d; ry = cy + Math.sin(a) * d; }
    x.strokeStyle = `rgba(230,250,255,${((1 - ph) * .35).toFixed(3)})`; x.lineWidth = 1.2;
    x.beginPath(); x.arc(rx, ry, 2 + ph * Math.min(18, Math.min(hw, hh) * .35), 0, TAU); x.stroke();
  }
  // inner edge shading + moving foam
  wPath(x, S); x.lineWidth = 3; x.strokeStyle = 'rgba(0,20,40,.22)'; x.stroke();
  x.lineWidth = 1.5; x.strokeStyle = tint ? `rgba(255,${235 - tint.a * 120 | 0},${235 - tint.a * 120 | 0},.35)` : 'rgba(255,255,255,.35)';
  x.setLineDash([6, 9]); x.lineDashOffset = -t * 8; wPath(x, S, 2.5); x.stroke(); x.setLineDash([]);
  if (o.fountain) drawFountainTier(x, o, S, t, tint);
  x.restore();
}
function drawFountainTier(x, o, S, t, tint) { // raised center bowl, falling water sheet, pedestal and jets
  const { cx, cy, hw } = S, br = hw * .48, wcol = tint ? `rgba(${tint.rgb.map(v => Math.round(v + (255 - v) * .55))},.9)` : 'rgba(235,250,255,.9)';
  for (let k = 0; k < 4; k++) { // splash rings where the sheet hits the lower water
    const ph = (t * .8 + k / 4) % 1; x.strokeStyle = `rgba(255,255,255,${((1 - ph) * .4).toFixed(3)})`; x.lineWidth = 1.2;
    x.beginPath(); x.arc(cx, cy, br + 2 + ph * hw * .35, 0, TAU); x.stroke();
  }
  x.fillStyle = 'rgba(0,0,0,.18)'; circ(x, cx + 2, cy + 3, br + 2);           // bowl shadow
  x.fillStyle = '#c3bcae'; circ(x, cx, cy, br);
  x.strokeStyle = '#8f887b'; x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, br - .5, 0, TAU); x.stroke();
  const ir = br * .78;
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, ir); g.addColorStop(0, shade(o.color, -.15)); g.addColorStop(1, shade(o.color, .12));
  x.fillStyle = g; circ(x, cx, cy, ir);
  if (tint) { x.fillStyle = `rgba(${tint.rgb},${(tint.a * .9).toFixed(3)})`; circ(x, cx, cy, ir); }
  x.strokeStyle = wcol; x.lineWidth = 1.6; x.setLineDash([3, 4]); x.lineDashOffset = -t * 14;   // water spilling over the lip
  x.beginPath(); x.arc(cx, cy, br + 1, 0, TAU); x.stroke(); x.setLineDash([]);
  x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, ir * (.55 + .35 * ((t * .9) % 1)), 0, TAU); x.stroke();
  const pr = br * .32;
  x.fillStyle = '#a7a092'; circ(x, cx, cy, pr); x.fillStyle = '#d2cbbd'; circ(x, cx - pr * .25, cy - pr * .25, pr * .55);
  for (let k = 0; k < 16; k++) { // droplets arcing out of the jet and falling back into the bowl/basin
    const ph = (t * .85 + wHash(k)) % 1, a = k * TAU / 16 + wHash(k + 5) * .3, d = pr * .5 + ph * hw * (k % 2 ? .55 : .38), h = Math.sin(ph * Math.PI) * (k % 2 ? 9 : 6);
    x.globalAlpha = .9 - ph * .5; x.fillStyle = wcol; circ(x, cx + Math.cos(a) * d, cy + Math.sin(a) * d - h, 1.3);
  }
  x.globalAlpha = 1;
  x.fillStyle = wcol; circ(x, cx, cy - 2 - Math.abs(Math.sin(t * 6)) * 1.5, 1.8);
}
function drawWaters(x) {
  if (!obstacles) return;
  const t = performance.now() / 1000;
  for (const o of obstacles) if (o.kind === 'water') drawWater(x, o, t);
}

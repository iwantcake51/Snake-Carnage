/* WATER: animated water (depth gradient, glints, drop rings) for ponds, fountains and rectangular pools. Fountains, tanks and pools
   are built water: a coping, a clear blue, drifting caustics and a moving foam line. A pond is natural water (natPond): an uneven
   shoreline (pondShore), murky green that's shallow and brown at the edges and deep in the middle, a sheen of sky, a muddy waterline,
   lily pads; the wet earth, stones and reeds round it are painted into the ground (pondBanks, from loadMap and the map pictures),
   so they lie under the snake. Blood that lands in water diffuses as clouds and slowly tints the whole body.
   In winter (and late autumn) still water freezes hard enough to cross (frozenOver: ponds, the pool, custom water; never a
   fountain or a tank): it isn't solid (buildSolid puts it in iceGrid instead), it's left out of the obstacle layer and its
   outline, and drawIceFloor lays it on the ground under everyone, so blood, trails and the snake all go over it. */
const wHash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const natPond = o => o.kind === 'water' && !o.fountain && !o.tank && (o.t === 'c' || !!o.poly); // a pond, not built water
function pondShore(o, hw) { // the water's uneven edge round a round pond: a radius that wanders a little with the angle, the same every time for this pond
  const key = o.x + ',' + o.y + ',' + hw; if (o._shore && o._shore.k === key) return o._shore.f;
  const r = seeded(Math.abs(Math.round(o.x * 7 + o.y * 13)) + 3), p = [r() * TAU, r() * TAU, r() * TAU], f = [];
  for (let k = 0; k < 64; k++) { const a = k / 64 * TAU; f.push(1 + .045 * Math.sin(3 * a + p[0]) + .03 * Math.sin(5 * a + p[1]) + .018 * Math.sin(9 * a + p[2])); }
  Object.defineProperty(o, '_shore', { value: { k: key, f }, enumerable: false, configurable: true, writable: true }); return f;
}
function wShape(o) {
  if (o.poly) return { cx: o.x + o.w / 2, cy: o.y + o.h / 2, hw: o.w / 2 - 6, hh: o.h / 2 - 6, rim: 5, round: true, poly: o, nat: true };
  if (o.t === 'c') { const nat = natPond(o), rim = o.fountain ? Math.max(5, o.r * .18) : nat ? Math.max(4, o.r * .1) : Math.max(3, o.r * .07); return { cx: o.x, cy: o.y, hw: o.r - rim, hh: o.r - rim, rim, round: true, nat, shore: nat ? pondShore(o, o.r - rim) : null }; }
  const rim = 8; return { cx: o.x + o.w / 2, cy: o.y + o.h / 2, hw: o.w / 2 - rim, hh: o.h / 2 - rim, rim, round: false };
}
function wPath(x, S, inset = 0) {
  if (S.poly) return polyPath(x, S.poly);
  if (S.shore) { x.beginPath(); const f = S.shore, n = f.length; for (let k = 0; k <= n; k++) { const a = k / n * TAU, rr = S.hw * f[k % n] - inset; k ? x.lineTo(S.cx + Math.cos(a) * rr, S.cy + Math.sin(a) * rr) : x.moveTo(S.cx + Math.cos(a) * rr, S.cy + Math.sin(a) * rr); } x.closePath(); return; }
  if (S.round) { x.beginPath(); x.arc(S.cx, S.cy, S.hw - inset, 0, TAU); }
  else rrect(x, S.cx - S.hw + inset, S.cy - S.hh + inset, (S.hw - inset) * 2, (S.hh - inset) * 2, Math.max(1, 7 - inset));
}
function inWater(o, px, py) { if (o.poly) return pointInPoly(polyShape(o), px, py); const S = wShape(o); return S.round ? dist2(px, py, S.cx, S.cy) < S.hw * S.hw : Math.abs(px - S.cx) < S.hw && Math.abs(py - S.cy) < S.hh; }
function waterBlood(o, px, py, q, vx = 0, vy = 0, col = BLOOD) { // q ~ drop size; clouds are what you see spread, tint is the long-term stain
  const b = o.wb || (o.wb = { tint: 0, shown: 0, gold: 0, clouds: [], rings: [] });
  const c = rgbOf2(col), w = q / (b.tint + q + .001); b.mix = b.mix ? b.mix.map((v, n) => v + (c[n] - v) * w) : c; // the water takes on the mix of what bled into it
  b.tint += q; if (c[0] > 150 && c[1] > 110 && c[2] < 110) b.gold = (b.gold || 0) + q; // gold blood: it shimmers through whatever else is in there
  const near = b.clouds.find(c => dist2(c.x, c.y, px, py) < Math.max(16, c.r * .7) ** 2); // nearby drops feed one cloud
  if (near) { near.a = Math.min(.32, near.a + q * .8); return; }
  if (b.clouds.length > 30) b.clouds.shift();
  const sp = Math.hypot(vx, vy), ux = sp ? vx / sp : 0, uy = sp ? vy / sp : 0, push = Math.min(14, sp * .04);
  const puffs = Array.from({ length: randi(3, 5) }, () => { const a = rand(0, TAU), k = rand(4, 12); // a few wisps that drift apart
    return { dx: rand(-2, 2), dy: rand(-2, 2), vx: Math.cos(a) * k + ux * push * rand(.5, 1), vy: Math.sin(a) * k + uy * push * rand(.5, 1), s: rand(.55, 1.1) }; });
  b.clouds.push({ c, x: px, y: py, r: 5, a: Math.min(.3, .12 + q * 1.2), g: rand(12, 20), puffs, seed: rand(0, 100) });
  if (b.rings.length < 12 && Math.random() < .5) b.rings.push({ x: px, y: py, t: 0 }); // a little plip where it went in
}
function updateWaters(dt) {
  if (!obstacles) return;
  for (const o of obstacles) {
    const b = o.kind === 'water' && o.wb; if (!b) continue;
    // (it never clears: once the water's red, it stays red for the rest of the run)
    b.shown += (b.tint - b.shown) * Math.min(1, dt * .5); // diffusion lag: the color creeps in
    const S = wShape(o);
    for (let i = b.clouds.length - 1; i >= 0; i--) {
      const c = b.clouds[i]; c.r += dt * c.g / (1 + c.r / 18); c.a -= dt * c.a * .07;
      const dx = c.x - S.cx, dy = c.y - S.cy, d = Math.hypot(dx, dy) || 1, sw = S.round ? 5 : 2; // the current slowly swirls it around
      c.x += (-dy / d * sw + Math.sin(T * .5 + c.seed) * 1.5) * dt; c.y += (dx / d * sw + Math.cos(T * .4 + c.seed) * 1.5) * dt;
      for (const p of c.puffs) { p.dx += p.vx * dt; p.dy += p.vy * dt; const f = Math.exp(-dt * .6); p.vx *= f; p.vy *= f; }
      if (c.a < .02) b.clouds.splice(i, 1);
    }
    for (let i = b.rings.length - 1; i >= 0; i--) if ((b.rings[i].t += dt) > .7) b.rings.splice(i, 1);
  }
}
function bloodTint(o, S) { // 0..1 strength and color, diluted by the size of the water
  const b = o.wb; if (!b || b.shown < .01) return null;
  const area = S.round ? Math.PI * S.hw * S.hw : 4 * S.hw * S.hh, k = b.shown / Math.max(.3, area / 6000);
  const s = 1 - Math.exp(-k / 1.6), m = clamp(k / 2.2, 0, 1);
  const red = [Math.round(232 - 92 * m), Math.round(118 - 110 * m), Math.round(140 - 120 * m)], mx = b.mix || [140, 10, 10], dev = Math.abs(mx[0] - 140) + Math.abs(mx[1] - 10) + Math.abs(mx[2] - 10);
  return { a: .88 * s, rgb: dev < 40 ? red : mx.map(v => Math.round(v + (255 - v) * .25 * (1 - m))), g: clamp((b.gold || 0) / (b.tint + .001), 0, 1) }; // gold or green blood tints the water its own colour; g: how much of it is gold
}
function drawWater(x, o, t, still) { // still: no glints or drop rings (the water under ice)
  const S = wShape(o), { cx, cy, hw, hh, rim } = S, base = o.color, M = Math.max(hw, hh) * 1.25, tint = bloodTint(o, S);
  // basin / shore / pool coping
  if (o.fountain) {
    const R = o.r;
    x.fillStyle = '#b9b2a4'; circ(x, cx, cy, R);
    x.strokeStyle = '#8f887b'; x.lineWidth = 1.5; x.beginPath(); x.arc(cx, cy, R - .75, 0, TAU); x.stroke();
    x.strokeStyle = '#d6d0c3'; x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, R - rim * .5, 0, TAU); x.stroke();
    x.strokeStyle = '#9d9689'; for (let k = 0; k < 12; k++) { const a = k * TAU / 12; x.beginPath(); x.moveTo(cx + Math.cos(a) * (hw + 1), cy + Math.sin(a) * (hw + 1)); x.lineTo(cx + Math.cos(a) * (R - 1), cy + Math.sin(a) * (R - 1)); x.stroke(); }
  } else if (o.tank) { // specimen tank: steel ring, bolts
    x.fillStyle = '#5b6b72'; circ(x, cx, cy, o.r); x.strokeStyle = '#8fa1a8'; x.lineWidth = 1.5; x.beginPath(); x.arc(cx, cy, o.r - 1, 0, TAU); x.stroke();
    x.fillStyle = '#2c363a'; for (let k = 0; k < 8; k++) { const a = k * TAU / 8; circ(x, cx + Math.cos(a) * (o.r - rim * .5), cy + Math.sin(a) * (o.r - rim * .5), 1.2); }
  } else if (S.nat) { // (a pond: nothing outside its shore here, the bank and its mud are painted into the ground, pondBanks)
  } else {
    x.fillStyle = '#efeadf'; x.fillRect(o.x, o.y, o.w, o.h);
    x.strokeStyle = '#c9c1b0'; x.lineWidth = 1; x.strokeRect(o.x + .5, o.y + .5, o.w - 1, o.h - 1);
    x.strokeStyle = '#ddd5c5'; for (let p = o.x + 16; p < o.x + o.w; p += 16) { x.beginPath(); x.moveTo(p, o.y); x.lineTo(p, o.y + rim); x.moveTo(p, o.y + o.h - rim); x.lineTo(p, o.y + o.h); x.stroke(); }
  }
  x.save(); wPath(x, S); x.clip();
  if (S.nat) { // a pond: deep and dark in the middle, shallow and murky toward the edge where the bottom shows through, a sheen of sky on the far side
    if (S.poly) x.drawImage(...polyDepth(o, base)); // any shape: deep in the middle by its distance from the shore, baked once
    else { const g = x.createRadialGradient(cx, cy, Math.min(hw, hh) * .05, cx, cy, Math.max(hw, hh) * 1.02);
    g.addColorStop(0, mixColor(base, '#10262c', .62)); g.addColorStop(.55, mixColor(base, '#29514a', .6)); g.addColorStop(.85, mixColor(base, '#4d6a4a', .55)); g.addColorStop(1, mixColor(base, '#7a7550', .6));
    x.fillStyle = g; x.fillRect(cx - hw - 4, cy - hh - 4, hw * 2 + 8, hh * 2 + 8); }
    const sk = x.createLinearGradient(cx - hw, cy - hh, cx + hw, cy + hh); sk.addColorStop(0, 'rgba(255,255,255,0)'); sk.addColorStop(.6, 'rgba(210,235,240,.05)'); sk.addColorStop(1, 'rgba(210,235,240,.16)'); x.fillStyle = sk; x.fillRect(cx - hw - 4, cy - hh - 4, hw * 2 + 8, hh * 2 + 8);
  } else {
  const g = x.createRadialGradient(cx, cy, Math.min(hw, hh) * .1, cx, cy, M);
  g.addColorStop(0, shade(base, S.round ? -.38 : -.2)); g.addColorStop(.7, shade(base, -.1)); g.addColorStop(1, shade(base, .1));
  x.fillStyle = g; x.fillRect(cx - hw, cy - hh, hw * 2, hh * 2);
  }
  if (!S.round) { // lane lines on the pool floor, wobbling with the surface
    x.strokeStyle = shade(base, -.35); x.lineWidth = 4;
    for (let ly = cy - hh + hh / 3; ly < cy + hh - 4; ly += hh * 2 / 3) { x.beginPath(); for (let lx = cx - hw + 20; lx <= cx + hw - 20; lx += 10) { const yy = ly + Math.sin(lx * .06 + t * 1.6) * 1.2; lx === cx - hw + 20 ? x.moveTo(lx, yy) : x.lineTo(lx, yy); } x.stroke(); }
  }
  if (tint) { // diffused blood: faint pink first, deep red once there's a lot
    x.fillStyle = `rgba(${tint.rgb},${tint.a.toFixed(3)})`; x.fillRect(cx - hw, cy - hh, hw * 2, hh * 2);
    if (tint.g > .03) { // gold swirling through it: slow metallic bands and glints catching the light
      const ga = Math.min(.75, tint.a * (.35 + tint.g)), sw = Math.max(hw, hh);
      for (let k = 0; k < 3; k++) { const a = t * (.12 + k * .05) + k * 2.1, px = cx + Math.cos(a) * hw * .45, py = cy + Math.sin(a * 1.3) * hh * .45, r = sw * (.55 + .15 * k);
        const gg = x.createRadialGradient(px, py, 0, px, py, r); gg.addColorStop(0, `rgba(236,201,92,${(ga * .7).toFixed(3)})`); gg.addColorStop(.6, `rgba(201,162,39,${(ga * .35).toFixed(3)})`); gg.addColorStop(1, 'rgba(201,162,39,0)');
        x.fillStyle = gg; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); }
      x.fillStyle = `rgba(255,240,180,${(ga * .9).toFixed(3)})`;
      for (let k = 0; k < Math.round(6 + 14 * tint.g); k++) { const fx = cx + Math.sin(k * 12.9898 + t * .2) * hw * .9, fy = cy + Math.sin(k * 78.233 - t * .17) * hh * .9, tw = Math.max(0, Math.sin(t * 2.3 + k * 1.7)); if (tw > .15) { x.globalAlpha = tw; x.beginPath(); x.arc(fx, fy, .7 + tw * .9, 0, TAU); x.fill(); } }
      x.globalAlpha = 1;
    }
  }
  if (o.wb) for (const c of o.wb.clouds) { // fresh blood still spreading: soft wisps with a darker heart, thinning out as they grow
    for (const p of c.puffs) {
      const px = c.x + p.dx, py = c.y + p.dy, r = c.r * p.s, a = c.a * (.55 + .45 * p.s);
      const cg = x.createRadialGradient(px, py, 0, px, py, r);
      const cc = c.c || [130, 6, 16]; cg.addColorStop(0, `rgba(${cc},${(a * .7).toFixed(3)})`); cg.addColorStop(.5, `rgba(${cc.map(v => Math.min(255, v + 30))},${(a * .4).toFixed(3)})`); cg.addColorStop(1, `rgba(${cc},0)`);
      x.fillStyle = cg; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); // a round wisp, no square edge
    }
  }
  if (o.wb) for (const g of o.wb.rings) { x.strokeStyle = `rgba(255,220,220,${(.5 * (1 - g.t / .7)).toFixed(3)})`; x.lineWidth = 1; x.beginPath(); x.arc(g.x, g.y, 1.5 + g.t * 14, 0, TAU); x.stroke(); }
  // caustics: two crossing sets of wobbling lines drifting slowly (Kenney's caustic textures, drifting against each other, once they're in)
  const cp = KSPR.ok && kPattern(x, 'caustics_1', '#bef0ff');
  if (S.nat) {} // (a pond's murk shows no caustics: they read as a pool's tiled floor)
  else if (cp) {
    const bk = tint ? 1 - .85 * Math.min(1, tint.a / .6) : 1, k = 96 / KSPR_CELL;
    for (let set = 0; set < 2; set++) { const p = set ? kPattern(x, 'caustics_2', '#ffffff') : cp, dir = set ? -1 : 1, sc = k * (set ? 1.35 : 1);
      p.setTransform(new DOMMatrix().translate(cx + t * 5 * dir + Math.sin(t * .4 + set) * 6, cy + t * 3.5 + Math.cos(t * .33) * 5 * dir).rotate(set ? 25 : 0).scale(sc, sc));
      x.globalAlpha = (set ? .1 : .16) * bk; x.fillStyle = p; x.fillRect(cx - hw, cy - hh, hw * 2, hh * 2); }
    x.globalAlpha = 1;
  } else {
  x.lineWidth = 1.4; x.lineCap = 'round';
  const step = Math.max(4, M / 11), gap = Math.max(9, Math.min(M / 5, 30));
  for (let set = 0; set < 2; set++) {
    const bk = tint ? 1 - .85 * Math.min(1, tint.a / .6) : 1; // in bloody water the light lines fade (bright on dark red they read as a grid)
    x.strokeStyle = set ? `rgba(255,255,255,${(.10 * bk).toFixed(3)})` : `rgba(190,240,255,${(.14 * bk).toFixed(3)})`;
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
  }
  const pt = (seed, spread) => S.round ? (() => { const a = wHash(seed) * TAU, d = Math.sqrt(wHash(seed + 1)) * hw * spread; return [cx + Math.cos(a) * d, cy + Math.sin(a) * d]; })()
                                       : [cx + (wHash(seed) * 2 - 1) * hw * spread, cy + (wHash(seed + 1) * 2 - 1) * hh * spread];
  const nG = still ? 0 : Math.round(Math.sqrt(hw * hh) / 7);
  for (let i = 0; i < nG; i++) { // glints
    const al = Math.max(0, Math.sin(t * (1.3 + wHash(i * 7) * 1.5) + i * 2.3)) ** 3 * .55;
    if (al < .02) continue;
    const [gx, gy] = pt(i * 3.1 + o.x, .85);
    x.fillStyle = `rgba(255,255,255,${al.toFixed(3)})`; x.beginPath(); x.ellipse(gx, gy, 3.2, 1.1, 0, 0, TAU); x.fill();
  }
  const nR = still ? 0 : o.fountain ? 3 : Math.max(2, Math.round(Math.sqrt(hw * hh) / 30));
  for (let i = 0; i < nR; i++) { // drop rings
    const tt = t * .32 + i / nR, cyc = Math.floor(tt), ph = tt - cyc;
    let [rx, ry] = pt(cyc * 13 + i * 71 + o.x, .75);
    if (o.fountain) { const a = wHash(cyc * 5 + i) * TAU, d = hw * (.62 + wHash(cyc + i) * .25); rx = cx + Math.cos(a) * d; ry = cy + Math.sin(a) * d; }
    x.strokeStyle = `rgba(230,250,255,${((1 - ph) * .35).toFixed(3)})`; x.lineWidth = 1.2;
    x.beginPath(); x.arc(rx, ry, 2 + ph * Math.min(18, Math.min(hw, hh) * .35), 0, TAU); x.stroke();
  }
  // inner edge shading + moving foam
  if (S.nat) { // a pond's edge: the shallows over a muddy bottom, a faint bright waterline that breathes with the surface, lily pads
    wPath(x, S); x.lineWidth = 7; x.strokeStyle = 'rgba(92,78,48,.3)'; x.stroke(); x.lineWidth = 2.6; x.strokeStyle = 'rgba(44,36,24,.4)'; x.stroke();
    x.lineWidth = 1; x.strokeStyle = `rgba(235,245,235,${(.16 + .06 * Math.sin(t * .9)).toFixed(3)})`; wPath(x, S, 1.6 + Math.sin(t * .7) * .4); x.stroke();
    if (!iceOn()) lilyPads(x, o, S, t); // (none under the ice)
  } else {
  wPath(x, S); x.lineWidth = 3; x.strokeStyle = 'rgba(0,20,40,.22)'; x.stroke();
  x.lineWidth = 1.5; x.strokeStyle = tint ? `rgba(255,${235 - tint.a * 120 | 0},${235 - tint.a * 120 | 0},.35)` : 'rgba(255,255,255,.35)';
  x.setLineDash([6, 9]); x.lineDashOffset = -t * 8; wPath(x, S, 2.5); x.stroke(); x.setLineDash([]);
  }
  if (o.fountain) drawFountainTier(x, o, S, t, tint);
  x.restore();
}
const hide = (o, k, v) => (Object.defineProperty(o, k, { value: v, enumerable: false, configurable: true, writable: true }), v); // a cache on the object that never travels with it
function shoreLine(o) { // points round a pond's water edge, every few px, each with the way out (nx, ny) and the distance along the shore (s); cached
  const S = wShape(o), key = o.x + ',' + o.y + ',' + (o.r || o.w) + ',' + (o.poly ? o.poly.length + ':' + o.poly[0] : '');
  if (o._sl && o._sl.k === key) return o._sl.p;
  const p = []; let s = 0;
  if (o.poly) { const P = polyShape(o), n = P.length;
    for (let i = 0; i < n; i++) { const [ax, ay] = P[i], [bx, by] = P[(i + 1) % n], L = Math.hypot(bx - ax, by - ay); if (L < .01) continue;
      let nx = (by - ay) / L, ny = -(bx - ax) / L; const mx = (ax + bx) / 2, my = (ay + by) / 2; if (pointInPoly(P, mx + nx * 1.5, my + ny * 1.5)) { nx = -nx; ny = -ny; } // facing out of the water
      for (let d = 0; d < L; d += 5) p.push({ x: ax + (bx - ax) * d / L, y: ay + (by - ay) * d / L, nx, ny, s: s + d }); s += L; } }
  else { const f = S.shore || null, n = 160; for (let q = 0; q < n; q++) { const a = q / n * TAU, rr = S.hw * (f ? f[Math.round(q / n * f.length) % f.length] : 1), x = S.cx + Math.cos(a) * rr, y = S.cy + Math.sin(a) * rr; if (p.length) s += Math.hypot(x - p[p.length - 1].x, y - p[p.length - 1].y); p.push({ x, y, nx: Math.cos(a), ny: Math.sin(a), s }); } }
  hide(o, '_sl', { k: key, p }); return p;
}
function pondPoly(o) { // where a pond is solid: its water's outline (round ponds: the shore, 2 px out for the mud at the waterline)
  if (o.poly) return polyShape(o);
  const S = wShape(o), key = o.x + ',' + o.y + ',' + o.r; if (o._pp && o._pp.k === key) return o._pp.p;
  const f = S.shore, n = f.length, p = []; for (let q = 0; q < n; q++) { const a = q / n * TAU, rr = S.hw * f[q] + 2; p.push([S.cx + Math.cos(a) * rr, S.cy + Math.sin(a) * rr]); }
  return hide(o, '_pp', { k: key, p }).p;
}
function polyDepth(o, base) { // custom-shaped water's depth, baked once: the deep colour, then shallower bands following the shore in toward the middle, softened together
  polyShape(o); const k = Math.min(DPR, 2), key = base + k + o._pk;
  if (!o._pd || o._pd.k !== key) { const pad = 2, w = Math.ceil(o.w + pad * 2), h = Math.ceil(o.h + pad * 2), c = document.createElement('canvas'); c.width = w * k; c.height = h * k; const g = c.getContext('2d'); g.scale(k, k); g.translate(pad - o.x, pad - o.y);
    g.fillStyle = mixColor(base, '#10262c', .62); g.fillRect(o.x - pad, o.y - pad, w, h);
    const P = polyShape(o); let D = 0; for (let y = o.y; y < o.y + o.h; y += 6) for (let x = o.x; x < o.x + o.w; x += 6) if (pointInPoly(P, x, y)) { let m = 1e9; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, ay] = P[j], [bx, by] = P[i], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1, t = clamp(((x - ax) * dx + (y - ay) * dy) / L, 0, 1); m = Math.min(m, Math.hypot(x - ax - dx * t, y - ay - dy * t)); } D = Math.max(D, m); } // how far the middle is from any shore
    D = Math.max(8, D); g.lineJoin = 'round';
    const band = [['#10262c', .62], ['#1c3c3c', .6], ['#29514a', .6], ['#3a5e4a', .58], ['#4d6a4a', .55], ['#64704c', .58], ['#7a7550', .6]], n = 14;
    for (let q = 1; q <= n; q++) { const f = 1 - q / (n + 1), u = q / n * (band.length - 1), i0 = Math.floor(u), c0 = mixColor(base, band[i0][0], band[i0][1]), c1 = mixColor(base, band[Math.min(band.length - 1, i0 + 1)][0], band[Math.min(band.length - 1, i0 + 1)][1]); // ever shallower toward the shore
      g.strokeStyle = mixColor(c0, c1, u - i0); g.lineWidth = Math.max(1, D * f * f * 2.2); polyPath(g, o); g.stroke(); }
    g.fillStyle = mixColor(base, '#7a7550', .6); g.beginPath(); g.rect(o.x - pad, o.y - pad, w, h); polyShape(o).forEach(([a, b], k) => k ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fill('evenodd'); // outside the water: the shallows' colour, so the blur keeps the edge shallow
    const sm = shrink(c, 8); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingQuality = 'high'; g.drawImage(sm, 0, 0, c.width, c.height); // the bands melt into one slope
    hide(o, '_pd', { k: key, c, x: o.x - pad, y: o.y - pad, w, h }); }
  const d = o._pd; return [d.c, d.x, d.y, d.w, d.h];
}
function padSpots(o, S) { // where a pond's lily pads float: in the shallows, a little way in from the shore; the same every time
  if (o.poly) polyShape(o); const key = o.x + ',' + o.y + ',' + S.hw + (o._pk || ''); if (o._pads && o._pads.k === key) return o._pads.p;
  const r = seeded(Math.abs(Math.round(o.x * 11 + o.y * 5)) + 7), sl = shoreLine(o), L = sl.length ? sl[sl.length - 1].s : 0, p = [];
  const n = o.poly ? clamp(Math.round(L / 70), 2, 14) : Math.max(3, Math.round(S.hw / 16));
  for (let k = 0, tries = 0; k < n && tries < n * 8; tries++) { const pr = 3.6 + r() * 3.2, nt = r() * TAU, fl = r() < .35, col = r() < .5 ? '#4f8a3a' : '#5d9a42';
    let px, py; if (o.poly) { const e = sl[r() * sl.length | 0], d = pr + 4 + r() * 14; px = e.x - e.nx * d; py = e.y - e.ny * d; if (!pointInPoly(polyShape(o), px, py) || sl.some(q => (q.x - px) ** 2 + (q.y - py) ** 2 < (pr + 2) ** 2)) continue; }
    else { const a = r() * TAU, d = S.hw * (.62 + r() * .26); px = S.cx + Math.cos(a) * d; py = S.cy + Math.sin(a) * d; }
    if (p.some(q => (q.x - px) ** 2 + (q.y - py) ** 2 < (q.pr + pr + 1) ** 2)) continue;
    p.push({ x: px, y: py, pr, nt, fl, col }); k++; }
  hide(o, '_pads', { k: key, p }); return p;
}
function lilyPads(x, o, S, t) { // a few pads in the shallows, each a notched disc lit from the top-left with its veins, now and then a flower; they drift a hair
  const K = propKit(x);
  padSpots(o, S).forEach((q, k) => { const { pr, nt, fl, col } = q, px = q.x + Math.sin(t * .3 + k) * .6, py = q.y + Math.cos(t * .27 + k) * .6;
    x.beginPath(); x.moveTo(px, py); x.arc(px, py, pr, nt + .35, nt + TAU - .35); x.closePath(); x.fillStyle = 'rgba(10,24,20,.3)'; x.save(); x.translate(.8, 1); x.fill(); x.restore(); // its shadow on the water
    x.fillStyle = K.rad(px, py, pr, col, .25, -.3); x.fill(); x.strokeStyle = shade(col, -.45); x.lineWidth = .4; x.stroke();
    x.strokeStyle = 'rgba(200,235,170,.35)'; x.lineWidth = .3; x.beginPath(); for (let v = 0; v < 5; v++) { const va = nt + .7 + v * (TAU - 1.4) / 4; x.moveTo(px, py); x.lineTo(px + Math.cos(va) * pr * .85, py + Math.sin(va) * pr * .85); } x.stroke();
    if (fl) { for (let q2 = 0; q2 < 6; q2++) { const qa = q2 * TAU / 6 + nt; x.fillStyle = q2 % 2 ? '#f6d2e2' : '#f0a6c8'; K.oval(px + Math.cos(qa) * 1.3, py + Math.sin(qa) * 1.3, 1.4, .7, qa); x.fill(); } x.fillStyle = '#ffd23f'; circ(x, px, py, .7); } });
}
function pondBanks(x, list) { // the ground round a pond, painted in under everyone: a wide, faint darkening of the grass, the wet earth of the bank and the mud at the waterline, each grown out from the shore by a width that wanders round it and blurred, so it melts into whatever ground is there; then stones and clumps of reeds
  const sid = season && season.id, reed = sid === 'winter' || (season && season.late) ? '#a08a5c' : sid === 'autumn' ? '#8a8a3e' : '#4c7a2a'; // reeds go to straw in winter
  const ponds = (list || []).filter(natPond); if (!ponds.length) return;
  const sc = Math.max(.5, Math.hypot(x.getTransform().a, x.getTransform().b)), mk = () => { const c = document.createElement('canvas'); c.width = Math.ceil(W * sc); c.height = Math.ceil(H * sc); const g = c.getContext('2d'); g.scale(sc, sc); return [c, g]; };
  const size = o => o.poly ? clamp(Math.sqrt(o.w * o.h) / 2, 20, 140) : o.r, rim = () => 2; // (the bank starts right at the water: that's where you hit it)
  const grow = (g, o, d, seed) => { // the water's shape grown by about d: the shape itself, then overlapping discs along the shore, their size wandering smoothly with the distance round it
    const S = wShape(o); wPath(g, S); g.fill(); const r = seeded(Math.abs(Math.round(o.x * 13 + o.y * 7)) + seed), p0 = r() * TAU, p1 = r() * TAU, f0 = .03 + r() * .02, f1 = .08 + r() * .05;
    g.beginPath(); for (const e of shoreLine(o)) { const w = d * (1 + .38 * Math.sin(e.s * f0 + p0) + .22 * Math.sin(e.s * f1 + p1)); if (w > .5) { g.moveTo(e.x + w, e.y); g.arc(e.x, e.y, w, 0, TAU); } } g.fill(); };
  const layer = (col, dOf, blur, a, op) => { const [c, g] = mk(); g.fillStyle = col; for (const o of ponds) grow(g, o, dOf(o), Math.round(blur)); const sm = shrink(c, blur); x.save(); x.imageSmoothingQuality = 'high'; x.globalAlpha = a; if (op) x.globalCompositeOperation = op; x.drawImage(sm, 0, 0, W, H); x.restore(); freeCanvas(c, sm); };
  layer('#8f8a6c', o => rim(o) + clamp(size(o) * .34, 14, 40), 16, .32, 'multiply'); // trampled, damp grass a way out
  layer('#5c4d33', o => rim(o) + clamp(size(o) * .12, 6, 14), 8, .55); // the wet earth of the bank
  layer('#3d3222', o => 3, 4, .6); // dark mud right at the waterline
  const K = propKit(x);
  for (const o of ponds) { const r = seeded(Math.abs(Math.round(o.x * 3 + o.y * 17)) + 11), sl = shoreLine(o), L = sl.length ? sl[sl.length - 1].s : 0, rm = rim(o); if (!sl.length) continue;
    for (let k = 0; k < Math.round(L / 45); k++) { const e = sl[r() * sl.length | 0], d = rm + 2 + r() * 8, sr = .9 + r() * 1.8; K.disc(e.x + e.nx * d, e.y + e.ny * d, sr, shade('#8a8578', (r() - .5) * .3), { hi: .35, lo: -.35, ec: 'rgba(30,26,20,.6)', ew: .4 }); } // stones on the bank
    for (let c = 0; c < 1 + Math.round(L / 180); c++) { const e = sl[r() * sl.length | 0], d = rm + 1 + r() * 4, bx = e.x + e.nx * d, by = e.y + e.ny * d; // a clump of reeds: blades leaning every way, a few cattail heads
      x.lineCap = 'round'; for (let q = 0; q < 14; q++) { const ba = r() * TAU, bl = 3 + r() * 5, sx = bx + (r() - .5) * 6, sy = by + (r() - .5) * 6; x.strokeStyle = shade(reed, (r() - .5) * .35); x.lineWidth = .7 + r() * .4; x.beginPath(); x.moveTo(sx, sy); x.quadraticCurveTo(sx + Math.cos(ba) * bl * .5 + .8, sy + Math.sin(ba) * bl * .5, sx + Math.cos(ba) * bl, sy + Math.sin(ba) * bl); x.stroke(); }
      for (let q = 0; q < 3; q++) { const hx = bx + (r() - .5) * 7, hy = by + (r() - .5) * 7, ha = r() * TAU; K.oval(hx, hy, 1.9, .85, ha); x.fillStyle = K.rad(hx, hy, 1.9, '#6b4524', .3, -.3); x.fill(); } }
  }
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
  const t = performance.now() / 1000 * AN.water.sp, ice = iceOn(); // (Animation editor: water speed)
  for (const o of obstacles) if (o.kind === 'water') { if (!ice) drawWater(x, o, t); else if (!frozenOver(o)) drawIce(x, o); } // (ice you can cross was drawn under everyone: drawIceFloor)
}
/* winter (and late autumn snow): ponds, pools and fountains freeze over */
const iceOn = () => !!season && (season.id === 'winter' || season.late);
const frozenOver = o => o.kind === 'water' && !o.fountain && !o.tank && iceOn(); // ice you can cross
const onIce = (x, y) => !!iceGrid && x >= 0 && y >= 0 && x < W && y < H && !!iceGrid[(y / SG | 0) * GW + (x / SG | 0)];
function drawIceFloor(x) { if (!obstacles || !iceOn()) return; for (const o of obstacles) if (frozenOver(o)) drawIce(x, o); } // frozen ponds lie on the ground: under the blood, the creatures and the snake
function icePath(o, S) { // the frozen surface's outline as a Path2D (a fountain's raised bowl is a hole in it)
  const P = new Path2D();
  if (o.poly) { polyShape(o).forEach(([a, b], k) => k ? P.lineTo(a, b) : P.moveTo(a, b)); P.closePath(); }
  else if (S.shore) { const f = S.shore, n = f.length; for (let q = 0; q < n; q++) { const a = q / n * TAU, rr = S.hw * f[q]; q ? P.lineTo(S.cx + Math.cos(a) * rr, S.cy + Math.sin(a) * rr) : P.moveTo(S.cx + Math.cos(a) * rr, S.cy + Math.sin(a) * rr); } P.closePath(); }
  else if (S.round) { P.arc(S.cx, S.cy, S.hw, 0, TAU); if (o.fountain) { P.moveTo(S.cx + S.hw * .48 + 1.5, S.cy); P.arc(S.cx, S.cy, S.hw * .48 + 1.5, 0, TAU); } }
  else P.rect(S.cx - S.hw, S.cy - S.hh, S.hw * 2, S.hh * 2);
  return P;
}
function iceOutline(o) { // frozen water's edge as a polygon [[x, y], ...]
  if (o.poly) return polyShape(o);
  const S = wShape(o); if (!S.round) return [[S.cx - S.hw, S.cy - S.hh], [S.cx + S.hw, S.cy - S.hh], [S.cx + S.hw, S.cy + S.hh], [S.cx - S.hw, S.cy + S.hh]];
  const f = S.shore, n = f ? f.length : 48, p = []; for (let q = 0; q < n; q++) { const a = q / n * TAU, rr = S.hw * (f ? f[q] : 1); p.push([S.cx + Math.cos(a) * rr, S.cy + Math.sin(a) * rr]); } return p;
}
function iceField(o, S, ox, oy, w, h) { // how far into the ice each spot is from its shore (px), on a 2 px grid: a two-pass chamfer distance
  const cs = 2, gw = Math.ceil(w / cs) + 2, gh = Math.ceil(h / cs) + 2, D = new Float32Array(gw * gh), s2 = cs * Math.SQRT2;
  const tc = document.createElement('canvas').getContext('2d'), P = icePath(o, S), inn = (x, y) => tc.isPointInPath(P, x, y, 'evenodd');
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) D[j * gw + i] = inn(ox + i * cs, oy + j * cs) ? 1e6 : 0;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const k = j * gw + i; let v = D[k]; if (!v) continue; if (i) v = Math.min(v, D[k - 1] + cs); if (j) { v = Math.min(v, D[k - gw] + cs); if (i) v = Math.min(v, D[k - gw - 1] + s2); if (i < gw - 1) v = Math.min(v, D[k - gw + 1] + s2); } D[k] = v; }
  for (let j = gh - 1; j >= 0; j--) for (let i = gw - 1; i >= 0; i--) { const k = j * gw + i; let v = D[k]; if (!v) continue; if (i < gw - 1) v = Math.min(v, D[k + 1] + cs); if (j < gh - 1) { v = Math.min(v, D[k + gw] + cs); if (i < gw - 1) v = Math.min(v, D[k + gw + 1] + s2); if (i) v = Math.min(v, D[k + gw - 1] + s2); } D[k] = v; }
  let mx = 1; for (const v of D) if (v > mx && v < 1e5) mx = v;
  const at = (x, y) => { const fx = (x - ox) / cs, fy = (y - oy) / cs, i = clamp(fx | 0, 0, gw - 2), j = clamp(fy | 0, 0, gh - 2), tx = clamp(fx - i, 0, 1), ty = clamp(fy - j, 0, 1), q = j * gw + i; return Math.max(0, (D[q] * (1 - tx) + D[q + 1] * tx) * (1 - ty) + (D[q + gw] * (1 - tx) + D[q + gw + 1] * tx) * ty - cs * .5); };
  return { at, max: mx, inn, P };
}
const ICE_RAMP = { // [depth 0 (the shore) .. 1 (well out), r, g, b, a]: thick white ice at the edge, clearing to deep blue over the dark water
  hard: [[0, 228, 239, 246, .97], [.08, 208, 228, 240, .94], [.25, 164, 200, 220, .86], [.5, 114, 162, 190, .78], [.8, 80, 132, 166, .72], [1, 66, 116, 154, .7]],
  thin: [[0, 204, 222, 232, .82], [.15, 152, 184, 200, .62], [.5, 92, 128, 150, .48], [1, 62, 98, 122, .42]] };
function drawIce(x, o) { // ice, baked once per season: the water under it, the sheet itself (thick and white at the shore, clear and deep blue out in the middle, clouds of frost, wind-polished streaks), the bank's shadow across it and its lit far edge, trapped bubbles, cracks with their branches and the odd impact star, skate scratches; a few glints twinkle on it every frame
  const S = wShape(o), key = season.id + (season.late ? 'L' : '') + (o._pk || '');
  if (!o._ice || o._ice.k !== key) {
    const pad = 4, bw = o.t === 'c' ? o.r * 2 : o.w, bh = o.t === 'c' ? o.r * 2 : o.h, ox = (o.t === 'c' ? o.x - o.r : o.x) - pad, oy = (o.t === 'c' ? o.y - o.r : o.y) - pad, w = Math.ceil(bw + pad * 2), h = Math.ceil(bh + pad * 2);
    const c = document.createElement('canvas'), k = Math.min(DPR, 2); c.width = w * k; c.height = h * k; const g = c.getContext('2d'); g.scale(k, k); g.translate(-ox, -oy);
    drawWater(g, o, 0, true); // (a pool's lanes and a pond's murk show faintly through the clear ice)
    const thin = season.id !== 'winter', r = seeded(Math.abs(Math.round(o.x * 3 + o.y * 7)) + 5), F = iceField(o, S, ox, oy, w, h), P = F.P, size = Math.sqrt(bw * bh) / 2, sd = (o.x * .37 + o.y * .71) % 97;
    const nat = natPond(o), ramp = thin ? ICE_RAMP.thin : ICE_RAMP.hard, span = Math.max(12, Math.min(F.max, 58)), wa = .55 + r() * .5, ca = Math.cos(wa), sa = Math.sin(wa);
    // the sheet, a pixel at a time at world size, then laid in smoothly
    const iw = w, ih = h, pc = document.createElement('canvas'); pc.width = iw; pc.height = ih; const pg = pc.getContext('2d'), im = pg.createImageData(iw, ih), A = im.data;
    for (let py = 0; py < ih; py++) for (let px = 0; px < iw; px++) {
      const wx = ox + px + .5, wy = oy + py + .5, dd = F.at(wx, wy); if (dd <= 0 && !F.inn(wx, wy)) continue;
      const dn = clamp(dd / span, 0, 1); let q = 1; while (q < ramp.length - 1 && ramp[q][0] < dn) q++;
      const a0 = ramp[q - 1], a1 = ramp[q], t = clamp((dn - a0[0]) / (a1[0] - a0[0]), 0, 1);
      let R = a0[1] + (a1[1] - a0[1]) * t, G = a0[2] + (a1[2] - a0[2]) * t, B = a0[3] + (a1[3] - a0[3]) * t, al = a0[4] + (a1[4] - a0[4]) * t;
      const frost = fbm(wx / 52 + sd, wy / 52 - sd, 3), clear = fbm(wx / 28 - sd, wy / 28 + sd, 2), streak = perlin((wx * ca + wy * sa) / 90 + sd, (-wx * sa + wy * ca) / 11) * clamp(.5 + fbm(wx / 70 - sd, wy / 70, 2) * 1.6, 0, 1);
      const fr = clamp(.1 + frost * 1.25 + (1 - dn) * .3 - Math.max(0, clear) * .9, 0, 1) * (thin ? .4 : .8); // milky frost in clouds, thinning where the ice is clear
      const win = Math.max(0, clear - .08) * (1 - fr) * dn * (thin ? .5 : .55); R *= 1 - win; G *= 1 - win * .85; B *= 1 - win * .6; // windows of clear black ice
      R += (240 - R) * fr; G += (247 - G) * fr; B += (251 - B) * fr; al += (1 - al) * fr * .5;
      const st = Math.max(0, streak - .18) * (thin ? .2 : .32); R += (250 - R) * st; G += (253 - G) * st; B += (255 - B) * st; // polished by the wind, all one way
      const gn = (wHash(px * 7.13 + py * 91.7 + sd) - .5) * 7; // a fine grain, so it never reads as a flat fill
      const n = (py * iw + px) * 4; A[n] = clamp(R + gn, 0, 255); A[n + 1] = clamp(G + gn, 0, 255); A[n + 2] = clamp(B + gn, 0, 255); A[n + 3] = al * 255;
    }
    pg.putImageData(im, 0, 0);
    g.save(); g.clip(P, 'evenodd'); g.imageSmoothingQuality = 'high'; g.drawImage(pc, ox, oy, iw, ih); freeCanvas(pc);
    const sh = (dx, dy, col, blur) => { g.save(); g.shadowColor = col; g.shadowBlur = blur * k; g.shadowOffsetX = (1e4 + dx) * k; g.shadowOffsetY = dy * k; g.translate(-1e4, 0); const Q = new Path2D(); Q.rect(ox - 80, oy - 80, w + 160, h + 160); Q.addPath(P); g.fillStyle = '#000'; g.fill(Q, 'evenodd'); g.restore(); };
    sh(3, 3.5, thin ? 'rgba(10,30,45,.4)' : 'rgba(30,60,85,.42)', 5); // the bank's shadow falls across the ice on the side away from the light
    sh(-1.6, -1.6, 'rgba(255,255,255,.55)', 2.5); // and the far edge catches it
    const sk = g.createLinearGradient(ox, oy, ox + w, oy + h); sk.addColorStop(0, 'rgba(255,255,255,.16)'); sk.addColorStop(.32, 'rgba(255,255,255,.02)'); sk.addColorStop(.58, 'rgba(255,255,255,.1)'); sk.addColorStop(.7, 'rgba(255,255,255,0)'); g.fillStyle = sk; g.fillRect(ox, oy, w, h); // a sheen of sky from the top-left
    const inside = (px, py, m = 0) => F.inn(px, py) && F.at(px, py) > m;
    const spot = (m, tries = 40) => { for (let q = 0; q < tries; q++) { const px = ox + r() * w, py = oy + r() * h; if (inside(px, py, m)) return [px, py]; } return null; };
    // trapped air: clusters and rising chains of little bubbles, frozen in the clear middle
    g.lineWidth = .3;
    for (let cl = 0; cl < clamp(Math.round(size / 18), 2, 12) * (thin ? .5 : 1); cl++) { const p0 = spot(span * .3); if (!p0) continue; const cr = 3 + r() * 9, chain = r() < .35, ang = r() * TAU;
      for (let b = 0, nb = 8 + (r() * 18 | 0); b < nb; b++) { const t2 = b / nb, bx = chain ? p0[0] + Math.cos(ang) * t2 * cr * 2.4 + (r() - .5) * 1.2 : p0[0] + (r() + r() - 1) * cr, by = chain ? p0[1] + Math.sin(ang) * t2 * cr * 2.4 + (r() - .5) * 1.2 : p0[1] + (r() + r() - 1) * cr, br = (chain ? 1.6 * (1 - t2 * .7) : .35 + r() * r() * 1.6) * (.8 + r() * .4);
        if (!inside(bx, by, 2)) continue; g.fillStyle = `rgba(232,244,250,${(.22 + r() * .3).toFixed(2)})`; g.beginPath(); g.ellipse(bx, by, br, br * (.75 + r() * .25), r() * TAU, 0, TAU); g.fill();
        if (br > .9) { g.strokeStyle = 'rgba(40,80,110,.3)'; g.stroke(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(bx - br * .35, by - br * .35, br * .28, 0, TAU); g.fill(); } } }
    // cracks: long, nearly straight runs in from the shore that kink and branch, white where the ice has split, a dark hairline on the shaded side
    const lines = [], crack = (x0, y0, a, len, lw, dep, al = .45 + r() * .5) => { const pts = [[x0, y0]]; let cx = x0, cy = y0, L = 0;
      while (L < len) { const st = 7 + r() * 12; a += (r() - .5) * (r() < .15 ? 1 : .28); const nx = cx + Math.cos(a) * st, ny = cy + Math.sin(a) * st; if (!F.inn(nx, ny)) break; cx = nx; cy = ny; L += st; pts.push([cx, cy]); if (dep < 2 && r() < .13) crack(cx, cy, a + (r() < .5 ? -1 : 1) * (.45 + r() * .6), len * (.2 + r() * .3), lw * .7, dep + 1, al * .8); }
      if (pts.length > 1) lines.push({ pts, lw, al }); };
    const sl = nat ? shoreLine(o) : null;
    for (let q = 0, nq = clamp(Math.round(size / 28), 2, 8), o0 = r(); q < nq; q++) { let x0, y0, a;
      if (sl && sl.length && r() < .8) { const e = sl[Math.floor(((q + o0 + (r() - .5) * .5) / nq % 1 + 1) % 1 * sl.length)]; /* (spread round the shore) */ x0 = e.x - e.nx * 2; y0 = e.y - e.ny * 2; a = Math.atan2(-e.ny, -e.nx) + (r() - .5) * .9; } else { const p0 = spot(4); if (!p0) continue; [x0, y0] = p0; a = r() * TAU; }
      crack(x0, y0, a, size * (.5 + r() * .9), .8, 0); }
    if (!thin && size > 30 && r() < .7) { const p0 = spot(span * .35); if (p0) { const [sx, sy] = p0; for (let q = 0, nq = 5 + (r() * 4 | 0); q < nq; q++) crack(sx, sy, q / nq * TAU + r() * .5, 6 + r() * 14, .5, 2, .5 + r() * .3); // an impact star: a stone thrown on the ice
      { const rr = 3 + r() * 3, a0 = r() * TAU, pts = []; for (let q = 0; q <= 9; q++) { const aa = a0 + q / 14 * TAU, jr = rr * (.85 + r() * .3); pts.push([sx + Math.cos(aa) * jr, sy + Math.sin(aa) * jr]); } lines.push({ pts, lw: .35, al: .5 }); } } } // (part of a ring round it)
    const strokeAll = (lwK, col, aK, dx = 0, dy = 0) => { g.strokeStyle = col; g.lineJoin = g.lineCap = 'round'; for (const L of lines) { g.globalAlpha = Math.min(1, L.al * aK); g.lineWidth = L.lw * lwK; g.beginPath(); L.pts.forEach(([a, b], q) => q ? g.lineTo(a + dx, b + dy) : g.moveTo(a + dx, b + dy)); g.stroke(); } g.globalAlpha = 1; };
    strokeAll(5, '#ffffff', .07); strokeAll(2.2, '#ffffff', .14); // the split plane catching the light
    strokeAll(1.1, thin ? '#0f2837' : '#1e3e54', .38, .5, .55); // its shaded side
    strokeAll(.9, '#f8fcff', 1); // the crack itself
    if (!thin && size > 40) { g.lineWidth = .45; g.lineCap = 'round'; // skate scratches: long, gentle curves crossing each other
      for (let q = 0, nq = 2 + (r() * 4 | 0); q < nq; q++) { const p0 = spot(6); if (!p0) continue; const a = r() * TAU, L = 40 + r() * 80, bend = (r() - .5) * L * .6, ex = p0[0] + Math.cos(a) * L, ey = p0[1] + Math.sin(a) * L, mx = (p0[0] + ex) / 2 - Math.sin(a) * bend, my = (p0[1] + ey) / 2 + Math.cos(a) * bend;
        g.strokeStyle = `rgba(255,255,255,${(.14 + r() * .12).toFixed(2)})`; g.beginPath(); g.moveTo(p0[0], p0[1]); g.quadraticCurveTo(mx, my, ex, ey); g.stroke(); if (r() < .5) { g.beginPath(); g.moveTo(p0[0] + 1.3, p0[1] + 1.3); g.quadraticCurveTo(mx + 1.3, my + 1.3, ex + 1.3, ey + 1.3); g.stroke(); } } }
    if (!thin) sh(0, 0, 'rgba(246,250,253,.95)', 7); // the thick white ice along the shore, fading out onto the clear
    if (sl) { const off = r() * 99; g.lineWidth = .6; g.strokeStyle = `rgba(255,255,255,${thin ? .18 : .32})`; g.beginPath(); sl.forEach((e, q) => { const d = (thin ? 4 : 7) + 3 * perlin(e.s / 26 + off, sd); q ? g.lineTo(e.x - e.nx * d, e.y - e.ny * d) : g.moveTo(e.x - e.nx * d, e.y - e.ny * d); }); g.closePath(); g.stroke(); // where the shore's shelf ice meets the clear
      if (!thin) for (const e of sl) if (r() < .35) { const d = .5 + r() * 3.5, cx2 = e.x - e.nx * d, cy2 = e.y - e.ny * d, rr = .7 + r() * 1.8, a0 = r() * TAU; g.fillStyle = `rgba(250,252,255,${(.3 + r() * .4).toFixed(2)})`; g.beginPath(); for (let v = 0; v < 4; v++) { const aa = a0 + v * TAU / 4 + (r() - .5) * .8, vr = rr * (.6 + r() * .6); v ? g.lineTo(cx2 + Math.cos(aa) * vr, cy2 + Math.sin(aa) * vr) : g.moveTo(cx2 + Math.cos(aa) * vr, cy2 + Math.sin(aa) * vr); } g.closePath(); g.fill(); } } // chips of ice pushed up against the bank
    g.restore();
    const spk = []; for (let q = 0; q < clamp(Math.round(size / 10), 3, 14); q++) { const p0 = spot(3); if (p0) spk.push({ x: p0[0], y: p0[1], ph: r() * TAU, sp: .8 + r() * 1.4, s: 1.6 + r() * 1.8 }); }
    hide(o, '_ice', { k: key, c, x: ox, y: oy, w, h, spk });
  }
  const I = o._ice; x.drawImage(I.c, I.x, I.y, I.w, I.h);
  const t = performance.now() / 1000; x.save(); x.lineCap = 'round'; // glints: now and then one spot catches the sun
  for (const p of I.spk) { const a = Math.max(0, Math.sin(t * p.sp + p.ph)) ** 14; if (a < .04) continue; const L = p.s * (.5 + a);
    x.strokeStyle = `rgba(255,255,255,${(a * .9).toFixed(3)})`; x.lineWidth = .6; x.beginPath(); x.moveTo(p.x - L, p.y); x.lineTo(p.x + L, p.y); x.moveTo(p.x, p.y - L); x.lineTo(p.x, p.y + L); x.stroke();
    x.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`; x.beginPath(); x.arc(p.x, p.y, .7, 0, TAU); x.fill(); }
  x.restore();
}

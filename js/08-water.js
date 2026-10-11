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
function drawWater(x, o, t) {
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
  } else if (S.poly) { x.lineJoin = 'round'; polyPath(x, o); x.lineWidth = 10; x.strokeStyle = 'rgba(62,50,34,.55)'; x.stroke(); x.lineWidth = 4; x.strokeStyle = '#3f3324'; x.stroke(); // wet mud all the way round
  } else if (S.round) { const g = x.createRadialGradient(cx, cy, hw * .9, cx, cy, o.r); g.addColorStop(0, '#463a2a'); g.addColorStop(.5, 'rgba(78,66,46,.7)'); g.addColorStop(1, 'rgba(80,68,48,0)'); x.fillStyle = g; circ(x, cx, cy, o.r); } // the wet mud at the waterline, fading out into the bank painted on the ground
  else {
    x.fillStyle = '#efeadf'; x.fillRect(o.x, o.y, o.w, o.h);
    x.strokeStyle = '#c9c1b0'; x.lineWidth = 1; x.strokeRect(o.x + .5, o.y + .5, o.w - 1, o.h - 1);
    x.strokeStyle = '#ddd5c5'; for (let p = o.x + 16; p < o.x + o.w; p += 16) { x.beginPath(); x.moveTo(p, o.y); x.lineTo(p, o.y + rim); x.moveTo(p, o.y + o.h - rim); x.lineTo(p, o.y + o.h); x.stroke(); }
  }
  x.save(); wPath(x, S); x.clip();
  if (S.nat) { // a pond: deep and dark in the middle, shallow and murky toward the edge where the bottom shows through, a sheen of sky on the far side
    const g = x.createRadialGradient(cx, cy, Math.min(hw, hh) * .05, cx, cy, Math.max(hw, hh) * 1.02);
    g.addColorStop(0, mixColor(base, '#10262c', .62)); g.addColorStop(.55, mixColor(base, '#29514a', .6)); g.addColorStop(.85, mixColor(base, '#4d6a4a', .55)); g.addColorStop(1, mixColor(base, '#7a7550', .6));
    x.fillStyle = g; x.fillRect(cx - hw - 4, cy - hh - 4, hw * 2 + 8, hh * 2 + 8);
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
  if (S.nat) { // a pond's edge: the shallows over a muddy bottom, a faint bright waterline that breathes with the surface, lily pads
    wPath(x, S); x.lineWidth = 7; x.strokeStyle = 'rgba(92,78,48,.3)'; x.stroke(); x.lineWidth = 2.6; x.strokeStyle = 'rgba(44,36,24,.4)'; x.stroke();
    x.lineWidth = 1; x.strokeStyle = `rgba(235,245,235,${(.16 + .06 * Math.sin(t * .9)).toFixed(3)})`; wPath(x, S, 1.6 + Math.sin(t * .7) * .4); x.stroke();
    if (!o.poly && !iceOn()) lilyPads(x, o, S, t); // (none under the ice)
  } else {
  wPath(x, S); x.lineWidth = 3; x.strokeStyle = 'rgba(0,20,40,.22)'; x.stroke();
  x.lineWidth = 1.5; x.strokeStyle = tint ? `rgba(255,${235 - tint.a * 120 | 0},${235 - tint.a * 120 | 0},.35)` : 'rgba(255,255,255,.35)';
  x.setLineDash([6, 9]); x.lineDashOffset = -t * 8; wPath(x, S, 2.5); x.stroke(); x.setLineDash([]);
  }
  if (o.fountain) drawFountainTier(x, o, S, t, tint);
  x.restore();
}
function lilyPads(x, o, S, t) { // a few pads in the shallows, each a notched disc lit from the top-left with its veins, now and then a flower; they drift a hair
  const r = seeded(Math.abs(Math.round(o.x * 11 + o.y * 5)) + 7), n = Math.max(3, Math.round(S.hw / 16)), K = propKit(x);
  for (let k = 0; k < n; k++) { const a = r() * TAU, d = S.hw * (.62 + r() * .26), pr = 3.6 + r() * 3.2, nt = r() * TAU, fl = r() < .35, px = S.cx + Math.cos(a) * d + Math.sin(t * .3 + k) * .6, py = S.cy + Math.sin(a) * d + Math.cos(t * .27 + k) * .6, col = r() < .5 ? '#4f8a3a' : '#5d9a42';
    x.beginPath(); x.moveTo(px, py); x.arc(px, py, pr, nt + .35, nt + TAU - .35); x.closePath(); x.fillStyle = 'rgba(10,24,20,.3)'; x.save(); x.translate(.8, 1); x.fill(); x.restore(); // its shadow on the water
    x.fillStyle = K.rad(px, py, pr, col, .25, -.3); x.fill(); x.strokeStyle = shade(col, -.45); x.lineWidth = .4; x.stroke();
    x.strokeStyle = 'rgba(200,235,170,.35)'; x.lineWidth = .3; x.beginPath(); for (let v = 0; v < 5; v++) { const va = nt + .7 + v * (TAU - 1.4) / 4; x.moveTo(px, py); x.lineTo(px + Math.cos(va) * pr * .85, py + Math.sin(va) * pr * .85); } x.stroke();
    if (fl) { for (let q = 0; q < 6; q++) { const qa = q * TAU / 6 + nt; x.fillStyle = q % 2 ? '#f6d2e2' : '#f0a6c8'; K.oval(px + Math.cos(qa) * 1.3, py + Math.sin(qa) * 1.3, 1.4, .7, qa); x.fill(); } x.fillStyle = '#ffd23f'; circ(x, px, py, .7); } }
}
function pondBanks(x, list) { // the ground round a pond: wet, dark earth that fades out into the grass (no grass grows on it), the odd stone, clumps of reeds
  const sid = season && season.id, reed = sid === 'winter' || (season && season.late) ? '#a08a5c' : sid === 'autumn' ? '#8a8a3e' : '#4c7a2a'; // reeds go to straw in winter
  const ponds = (list || []).filter(o => natPond(o) && !o.poly); if (!ponds.length) return;
  const sc = Math.max(.5, Math.hypot(x.getTransform().a, x.getTransform().b)), mk = () => { const c = document.createElement('canvas'); c.width = Math.ceil(W * sc); c.height = Math.ceil(H * sc); const g = c.getContext('2d'); g.scale(sc, sc); return [c, g]; };
  const ring = (g, o, k) => { const S = wShape(o), f = S.shore, n = f.length; g.beginPath(); for (let q = 0; q <= n; q++) { const a = q / n * TAU, rr = o.r * k * (.5 + .5 * f[q % n]); q ? g.lineTo(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr) : g.moveTo(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
  const [wc, wg] = mk(), [bc, bg] = mk(); wg.fillStyle = '#5c4f32'; bg.fillStyle = '#4b3f2b';
  for (const o of ponds) { ring(wg, o, 1.26); ring(bg, o, 1.05); }
  const ws = shrink(wc, 16), bs = shrink(bc, 8); x.save(); x.imageSmoothingQuality = 'high'; x.globalAlpha = .2; x.drawImage(ws, 0, 0, W, H); x.globalAlpha = .6; x.drawImage(bs, 0, 0, W, H); x.restore(); freeCanvas(wc, bc, ws, bs); // trampled, thinning grass further out; the wet bank close in
  const K = propKit(x);
  for (const o of ponds) { const r = seeded(Math.abs(Math.round(o.x * 3 + o.y * 17)) + 11);
    for (let k = 0; k < Math.round(o.r / 9); k++) { const a = r() * TAU, d = o.r * (1 + r() * .1), sr = .9 + r() * 1.8; K.disc(o.x + Math.cos(a) * d, o.y + Math.sin(a) * d, sr, shade('#8a8578', (r() - .5) * .3), { hi: .35, lo: -.35, ec: 'rgba(30,26,20,.6)', ew: .4 }); } // stones on the bank
    for (let c = 0; c < 2 + Math.round(o.r / 60); c++) { const a = r() * TAU, d = o.r * (.99 + r() * .06), bx = o.x + Math.cos(a) * d, by = o.y + Math.sin(a) * d; // a clump of reeds: blades leaning every way, a few cattail heads
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
function drawIce(x, o) {
  const S = wShape(o), key = season.id + (season.late ? 'L' : '');
  if (!o.iceC || o.iceK !== key) { // baked once per season: the water under it, then ice with cracks, frost and snow at the edges
    const pad = 4, w = Math.ceil((o.t === 'c' ? o.r * 2 : o.w) + pad * 2), h = Math.ceil((o.t === 'c' ? o.r * 2 : o.h) + pad * 2), ox = (o.t === 'c' ? o.x - o.r : o.x) - pad, oy = (o.t === 'c' ? o.y - o.r : o.y) - pad;
    const c = document.createElement('canvas'), k = Math.min(DPR, 2); c.width = w * k; c.height = h * k; const g = c.getContext('2d'); g.scale(k, k); g.translate(-ox, -oy);
    drawWater(g, o, 0);
    const thin = season.id !== 'winter', r = seeded(Math.round(o.x * 3 + o.y * 7));
    g.save(); wPath(g, S); g.clip();
    g.fillStyle = thin ? 'rgba(200,220,235,.55)' : 'rgba(214,230,242,.86)'; g.fillRect(ox, oy, w, h); // the ice sheet
    for (let k2 = 0; k2 < 26; k2++) { const px = S.cx + (r() - .5) * S.hw * 2, py = S.cy + (r() - .5) * S.hh * 2; g.fillStyle = `rgba(255,255,255,${(.15 + r() * .25).toFixed(2)})`; ell(g, px, py, 4 + r() * 14, 2 + r() * 8); } // frosty patches
    g.strokeStyle = 'rgba(120,150,175,.55)'; g.lineWidth = .8; // cracks branching out from a few points
    for (let k2 = 0; k2 < 5; k2++) { let px = S.cx + (r() - .5) * S.hw, py = S.cy + (r() - .5) * S.hh, a = r() * TAU; g.beginPath(); g.moveTo(px, py);
      for (let j = 0; j < 7; j++) { a += (r() - .5) * 1.1; px += Math.cos(a) * (6 + r() * 10); py += Math.sin(a) * (6 + r() * 10); g.lineTo(px, py); if (r() < .3) { g.moveTo(px, py); g.lineTo(px + Math.cos(a + 1.2) * 7, py + Math.sin(a + 1.2) * 7); g.moveTo(px, py); } } g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = .6; g.beginPath(); for (let k2 = 0; k2 < 6; k2++) { const px = S.cx + (r() - .5) * S.hw * 1.6, py = S.cy + (r() - .5) * S.hh * 1.6; g.moveTo(px, py); g.lineTo(px + 10 + r() * 14, py - 3 - r() * 6); } g.stroke(); // glints
    if (!thin) { g.strokeStyle = 'rgba(245,248,253,.9)'; g.lineWidth = 5; wPath(g, S, 1); g.stroke(); } // snow drifted against the edge
    g.restore();
    o.iceC = c; o.iceK = key; o.iceX = ox; o.iceY = oy; o.iceW = w; o.iceH = h;
  }
  x.drawImage(o.iceC, o.iceX, o.iceY, o.iceW, o.iceH);
}

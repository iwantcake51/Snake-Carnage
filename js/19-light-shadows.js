/* ---- point-light shadows: shapes are filled at low res (cheap + naturally soft), faded with distance ---- */
function lightSprite(rgb, mid) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(.55, `rgba(${rgb},${mid})`); g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return c;
}
const MASK_SPR = lightSprite('0,0,0', .55), glowSprites = {};
const mkC = s => { const c = document.createElement('canvas'); c.width = c.height = s; return [c, c.getContext('2d')]; };
const LS = 1; // light canvases work at half res: they're soft, and lightC/addC are half res too
const mkL = s => { const [c, x] = mkC(Math.ceil(s * LS)); x.setTransform(LS, 0, 0, LS, 0, 0); return [c, x]; };
const SC = .6, [S1, s1] = mkL(1000), [S2, s2] = mkL(1000), [QC, qx] = mkC(Math.ceil(1000 * SC) + 2);
const addC = document.createElement('canvas'); addC.width = W / 2; addC.height = H / 2; const adx = addC.getContext('2d'); adx.setTransform(.5, 0, 0, .5, 0, 0); // colored light (half res, it's soft anyway)
const BEAM = (() => { // one smooth cone: bright core, soft edges, distance falloff, blurred (pointing +x, half-angle .42)
  const L = 256, hh = Math.ceil(L * Math.tan(.42)), raw = document.createElement('canvas'), c = document.createElement('canvas');
  raw.width = c.width = L; raw.height = c.height = hh * 2;
  const rx = raw.getContext('2d'), img = rx.createImageData(L, hh * 2), sm = (e0, e1, v) => { const t = clamp((v - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  for (let y = 0; y < hh * 2; y++) for (let x = 0; x < L; x++) {
    const dy = y + .5 - hh, d = Math.hypot(x + .5, dy) / L, u = Math.abs(Math.atan2(dy, x + .5)) / .42;
    if (d >= 1 || u >= 1) continue;
    const rad = d < .2 ? 1 - .25 * d : d < .65 ? .95 - (d - .2) * 1.111 : .45 * (1 - (d - .65) / .35);
    const ang = (1 - .78 * sm(.15, .95, u)) * (1 - sm(.8, 1, u));
    img.data[(y * L + x) * 4 + 3] = Math.round(255 * clamp(rad * ang, 0, 1));
  }
  rx.putImageData(img, 0, 0);
  const g2 = c.getContext('2d'); g2.filter = 'blur(4px)'; g2.drawImage(raw, 0, 0); g2.filter = 'none';
  return c;
})();
let WIN_SPR = MASK_SPR; // a lit window's pool (its panes once the Kenney atlas is in)
kReady(() => { // Kenney light masks: blotchy texture through every flashlight beam, a reflector's rings in each lamp's pool, window panes in the light falling out of windows
  WIN_SPR = document.createElement('canvas'); WIN_SPR.width = WIN_SPR.height = MASK_SPR.width; WIN_SPR.getContext('2d').drawImage(MASK_SPR, 0, 0); kModulate(WIN_SPR, 'window_e_noise', .2);
  kModulate(BEAM, 'cone_e_noise', .4, 1); kModulate(MASK_SPR, 'circle_a_noise', .42);
  if (typeof shadowsChanged === 'function') shadowsChanged(); // re-bake what was baked with the plain ones
});
function shadowShape(q, L, o, ox, oy) {
  const R = L.r * 1.6, z = o.z;
  const reach = (px, py) => { const dx = px - L.x, dy = py - L.y, d = Math.hypot(dx, dy) || 1, s = z >= L.h ? R : Math.min(R, d * z / (L.h - z)); return [px - ox, py - oy, px + dx / d * s - ox, py + dy / d * s - oy]; };
  if (o.t === 'r') {
    if (L.x > o.x && L.x < o.x + o.w && L.y > o.y && L.y < o.y + o.h) return false;
    if (dist2(L.x, L.y, clamp(L.x, o.x, o.x + o.w), clamp(L.y, o.y, o.y + o.h)) > L.r * L.r) return false;
    const C = isRot(o) ? obsCorners(o) : [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]], P = C.map(([a, b]) => reach(a, b));
    for (let i = 0; i < 4; i++) { const a = P[i], b = P[(i + 1) & 3]; q.beginPath(); q.moveTo(a[0], a[1]); q.lineTo(b[0], b[1]); q.lineTo(b[2], b[3]); q.lineTo(a[2], a[3]); q.fill(); }
    return true;
  }
  const dx = o.x - L.x, dy = o.y - L.y, d = Math.hypot(dx, dy);
  if (d <= o.r + 1 || d - o.r > L.r) return false;
  const ux = dx / d, uy = dy / d, px = -uy * o.r, py = ux * o.r, s = z >= L.h ? R : Math.min(R, d * z / (L.h - z)) + o.r, k = 1 + s / d * .6, bx = o.x - ox, by = o.y - oy;
  q.moveTo(bx + px, by + py); q.lineTo(bx + ux * s + px * k, by + uy * s + py * k); q.lineTo(bx + ux * s - px * k, by + uy * s - py * k); q.lineTo(bx - px, by - py); q.closePath(); // round shapes share one path, filled by the caller
  return true;
}
function shadeInto(dst, L, list, ox, oy, size, str, skip, soft) { // removes light where `list` blocks it, inside a light canvas (soft: lower res, the upscale blurs the edges)
  const sc = soft ? SC * .5 : SC, qs = Math.ceil(size * sc) + 1;
  qx.setTransform(1, 0, 0, 1, 0, 0); qx.clearRect(0, 0, qs, qs); qx.setTransform(sc, 0, 0, sc, 0, 0); qx.fillStyle = '#000';
  let any = false;
  for (const o of list) if (o.t === 'r' && (!skip || o.src !== skip)) any = shadowShape(qx, L, o, ox, oy) || any;
  qx.beginPath(); let round = false; // all round shadows in one fill: same winding, so they merge into one shape
  for (const o of list) if (o.t !== 'r' && (!skip || o.src !== skip)) round = shadowShape(qx, L, o, ox, oy) || round;
  if (round) { qx.fill(); any = true; }
  if (any && snake && list.some(o => o.snk)) { // the body never shades itself: a light overhead lights the top of every segment, shadows only fall on the ground around it
    qx.globalCompositeOperation = 'destination-out'; qx.beginPath(); const n = snake.segs.length;
    for (let i = 0; i < n; i++) { const g = snake.segs[i], r = segR(i, n) * 1.12, px = g.x - ox, py = g.y - oy; if (px < -r || py < -r || px > size + r || py > size + r) continue; qx.moveTo(px + r, py); qx.arc(px, py, r, 0, TAU); }
    qx.fill(); qx.globalCompositeOperation = 'source-over';
  }
  if (any) {
    qx.globalCompositeOperation = 'source-in';
    const g = qx.createRadialGradient(L.x - ox, L.y - oy, 0, L.x - ox, L.y - oy, L.r);
    g.addColorStop(0, `rgba(0,0,0,${str})`); g.addColorStop(1, `rgba(0,0,0,${str * .3})`); // shadows fade with distance
    qx.fillStyle = g; qx.fillRect(0, 0, size, size); qx.globalCompositeOperation = 'source-over';
    dst.globalCompositeOperation = 'destination-out'; dst.drawImage(QC, 0, 0, size * sc, size * sc, 0, 0, size, size); dst.globalCompositeOperation = 'source-over';
  }
  qx.setTransform(1, 0, 0, 1, 0, 0);
}
function bakeLightMasks(near) { // static shadows per light, baked once; after a lamp breaks or furniture is smashed only the lights that reach it
  lightVer++;
  scast = obstacles.filter(o => o.kind !== 'lamp' && !o.poly && !obsFlag(o, 'noShadow') && (HEIGHTS[o.kind] ?? 10) > 0).map(o => ({ ...o, z: HEIGHTS[o.kind] ?? 10,
    cx: o.t === 'r' ? o.x + o.w / 2 : o.x, cy: o.t === 'r' ? o.y + o.h / 2 : o.y, br: o.t === 'r' ? Math.hypot(o.w, o.h) / 2 : o.r })); // bounding circle, for culling
  for (const l of lights) {
    if (l.kind === 'window') continue;
    if (near && l.mask && dist2(l.x, l.y, near.x, near.y) > (l.r + near.r) ** 2) continue;
    const s = Math.ceil(l.r * 2);
    if (!l.mask) { [l.mask, l.mx] = mkL(s); [l.tint, l.tx] = mkL(s); l.size = s; }
    l.mx.clearRect(0, 0, s, s); l.mx.drawImage(MASK_SPR, 0, 0, s, s);
    if (l.h > 0 && shadowsOn()) shadeInto(l.mx, l, scast, l.x - l.r, l.y - l.r, s, .9); // Off: the lamp lights its whole circle, nothing works out what blocks it
    tintFrom(l.tx, l.mask, s, l.c);
  }
}
function shadowsChanged() { // the Shadows setting changed: redo whatever was baked with the old one
  shadowKey = ''; if (light && obstacles) { bakeShadows(); bakeLightMasks(); statKey = veilKey = ''; }
} // (the soft contact shading at the foot of walls is painted into the ground, so it follows on the next map load)
function tintFrom(tx, src, s, rgb) { const b = Math.ceil(s * LS); tx.globalCompositeOperation = 'source-over'; tx.clearRect(0, 0, s, s); tx.drawImage(src, 0, 0, b, b, 0, 0, s, s); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = `rgb(${rgb})`; tx.fillRect(0, 0, s, s); tx.globalCompositeOperation = 'source-over'; }
const dyn = [], NEAR = [];
function gatherDyn() { // things that move and cast shadows: people, animals, the snake
  dyn.length = 0;
  for (const c of creatures) if (c.alive) dyn.push({ t: 'c', x: c.x, y: c.y, r: c.def.r * .85, z: c.def.human ? 16 : c.def.r * 1.2, src: c });
  if (snake) { const n = snake.segs.length; for (let i = 0; i < n; i++) { const g = snake.segs[i]; dyn.push({ t: 'c', x: g.x, y: g.y, r: segR(i, n) * 1.08, z: 6, snk: 1 }); } }
}
function nearDyn(x, y, r, skip) { NEAR.length = 0; for (const d of dyn) if (d.src !== skip || !skip) if (dist2(d.x, d.y, x, y) < (r + d.r) ** 2) NEAR.push(d); return NEAR; }
const CONE = [];
function inCone(f, list) { // only what can actually be inside the beam casts a shadow from it
  for (const o of list) {
    const cx = o.cx ?? o.x, cy = o.cy ?? o.y, br = o.br ?? o.r, dx = cx - f.x, dy = cy - f.y, d = Math.hypot(dx, dy);
    if (d - br > f.range) continue;
    if (d > br && Math.abs(angDiff(f.da, Math.atan2(dy, dx))) > f.half + Math.asin(Math.min(1, br / d)) + .15) continue;
    CONE.push(o);
  }
}
function composeBeam(f, withShadows) {
  const R = f.range, s = Math.ceil(R * 2), hh = R * Math.tan(f.half);
  s1.setTransform(LS, 0, 0, LS, 0, 0); s1.clearRect(0, 0, s, s);
  s1.save(); s1.translate(R, R); s1.rotate(f.da); s1.drawImage(BEAM, 0, -hh, R, hh * 2); s1.restore();
  s1.globalAlpha = .5; s1.drawImage(MASK_SPR, R - 22, R - 22, 44, 44); s1.globalAlpha = 1; // spill around the hand
  { // walls stop it: rays fanned across the cone end at the first wall, and the beam is cut to that shape (every beam, shadowed or not)
    const N = 24, sp = f.half * 1.2, P = []; let cut = false;
    for (let k = 0; k <= N; k++) { const a = f.da - sp + 2 * sp * k / N, ca = Math.cos(a), sa = Math.sin(a); let d = 6; while (d < R && !opaque(f.x + ca * d, f.y + sa * d)) d += 5; if (d < R) cut = true; P.push(R + ca * (d + 4), R + sa * (d + 4)); }
    if (cut) { s1.save(); s1.globalCompositeOperation = 'destination-in'; s1.beginPath(); s1.moveTo(R, R); for (let k = 0; k < P.length; k += 2) s1.lineTo(P[k], P[k + 1]); s1.closePath(); s1.moveTo(R + 16, R); s1.arc(R, R, 16, 0, TAU); s1.fill(); s1.restore(); }
  }
  if (withShadows) {
    const L = { x: f.x, y: f.y, r: R, h: 11 };
    CONE.length = 0; inCone(f, scast); inCone(f, nearDyn(f.x, f.y, R, f.holder)); // walls + bodies in one pass, softened so the beam stays one smooth shape
    if (CONE.length) shadeInto(s1, L, CONE, f.x - R, f.y - R, s, .88, null, true);
  }
  return s;
}
function beamAdd(f, s, a, rich) {
  const ox = f.x - f.range, oy = f.y - f.range;
  const bs = Math.ceil(s * LS); // S2 already holds the colored beam
  adx.globalAlpha = a * f.k; adx.drawImage(S2, 0, 0, bs, bs, ox, oy, s, s);
  if (rich) { // only bother if there's blood somewhere in the cone
    rich = false;
    for (let d = 20; d < f.range && !rich; d += 22) for (const o of [-.6, 0, .6]) { const px = f.x + Math.cos(f.da + o * f.half) * d, py = f.y + Math.sin(f.da + o * f.half) * d, i = px / WS | 0, j = py / WS | 0; if (i >= 0 && j >= 0 && i < WW && j < WH && wet[j * WW + i] > .05) { rich = true; break; } }
  }
  if (rich) {
  s2.clearRect(0, 0, s, s); let any = false; // blood glistens when the beam hits it
  const x0 = Math.max(0, ox), y0 = Math.max(0, oy), x1 = Math.min(W, ox + s), y1 = Math.min(H, oy + s), sw = x1 - x0, sh = y1 - y0; // only read the part under the beam
  if (sw > 1 && sh > 1) for (const b of bucketList.slice(-2)) { const ba = bucketAlpha(b); if (ba < .02) continue; any = true; s2.globalAlpha = ba; const k = b.f.width / W;
    s2.drawImage(b.f, x0 * k, y0 * k, sw * k, sh * k, x0 - ox, y0 - oy, sw, sh); s2.drawImage(b.w, x0 * k, y0 * k, sw * k, sh * k, x0 - ox, y0 - oy, sw, sh); }
  s2.globalAlpha = 1;
  if (any) { s2.globalCompositeOperation = 'destination-in'; s2.drawImage(S1, 0, 0, bs, bs, 0, 0, s, s); s2.globalCompositeOperation = 'source-over'; adx.globalAlpha = .6 * f.k; adx.drawImage(S2, 0, 0, bs, bs, ox, oy, s, s); }
  }
  const ca = Math.cos(f.da), sa = Math.sin(f.da); let hit = 0; // bloom where the beam is pressed up against a wall
  for (let d = 10; d < Math.min(90, f.range); d += 5) if (solid(f.x + ca * d, f.y + sa * d)) { hit = d; break; }
  if (hit) { const spr = glowSprites[f.c] || (glowSprites[f.c] = lightSprite(f.c, .3)), rr = 14 + hit * .25; adx.globalAlpha = .55 * (1 - hit / 90) * f.k; adx.drawImage(spr, f.x + ca * hit - rr, f.y + sa * hit - rr, rr * 2, rr * 2); }
}
const desC = document.createElement('canvas'); desC.width = lightC.width / 2; desC.height = lightC.height / 2; const dsx = desC.getContext('2d'); // where it's dark, colors fade (night vision of the eye)
const VEIL = { street: .2, pool: .26, emerg: .3, fluor: .07, fire: .16, fixed: .12, alien: .1, red: .42, reactor: .3, bar: .25, booth: .35, dj: .4, disco: .55, flood: .05 };
/* LIGHTING QUALITY: how many lights get live shadows from moving things, how many flashlight beams, and which extra passes run.
   Lights that aren't changing are merged into one cached "holes" layer (and one cached color layer), so a map full of
   lamps and windows costs two drawImage calls per frame instead of one per light. */
/* Lighting quality. The color drain in the dark (desat) uses a 'saturation' blend, which browsers can't do on the GPU:
   it's the single most expensive thing on screen, so only High has it. Low also rebuilds the light layer every other
   frame (at half resolution); Off skips the light layer entirely and just tints the screen for the time of day.
   None of this changes the game: who can see whom is worked out from the lights themselves (lightAt), not the picture. */
const LQ_CFG = { High: { dyn: 4, beams: 6, beamSh: 6, shine: 3, desat: true, veil: true }, Medium: { dyn: 2, beams: 4, beamSh: 2, shine: 1, desat: false, veil: true }, Low: { dyn: 0, beams: 2, beamSh: 0, shine: 0, desat: false, veil: false, skip: true } };
function lq() { let q = SETTINGS.lightQ || 'High'; if (q === 'Off') q = 'Low'; if (lowFx) q = q === 'High' ? 'Medium' : 'Low'; const c = LQ_CFG[q] || LQ_CFG.High; return movingShadows() ? c : { ...c, dyn: 0, beamSh: 0 }; } // Static/Off: no live shadows from lamps or flashlights
const mkLight = () => { const c = document.createElement('canvas'); c.width = lightC.width; c.height = lightC.height; const x = c.getContext('2d'); x.setTransform(LDPR, 0, 0, LDPR, 0, 0); return [c, x]; };
const [statC, stx] = mkLight(), [veilC, vtx] = mkLight();
function resizeLights() { // lighting quality changed: rebuild the light buffers at the new resolution
  LDPR = lightRes();
  for (const [c, x] of [[lightC, lgx], [statC, stx], [veilC, vtx]]) { c.width = W * LDPR; c.height = H * LDPR; x.setTransform(LDPR, 0, 0, LDPR, 0, 0); }
  desC.width = lightC.width / 2; desC.height = lightC.height / 2; statKey = ''; veilKey = '';
}
let statKey = '', veilKey = '', lightVer = 0;
const isStaticTint = l => !l.enc && !(l.ign > 0) && !(l.fT > 0) && l.kind !== 'emerg' && l.kind !== 'disco'; // live shadows don't change a light's color veil, so it stays cached
const isStaticLight = l => !l.enc && !l.dynNow && !(l.ign > 0) && !(l.fT > 0) && l.kind !== 'emerg' && l.kind !== 'disco';
let lightSkip = 0, lightUsedAdd = false;
function drawLighting(x) {
  const L = light, nv = nightVision, Q = lq();
  if (SETTINGS.lightQ === 'Off' || lowFx > 1) { // no light layer: a flat tint for dusk and night, lamp bulbs still glow
    const dk = L.dark * (nv ? .15 : 1) * .6 * (1 - Math.min(.85, AIR.sky * .8)); if (dk > .01) { x.fillStyle = `rgba(${L.dc},${dk.toFixed(3)})`; x.fillRect(-20, -20, W + 40, H + 40); }
    if (!nv && L.tA > .005) { x.fillStyle = `rgba(${L.tBot},${(L.tA * .6).toFixed(3)})`; x.fillRect(-20, -20, W + 40, H + 40); }
    return;
  }
  if (Q.skip && (lightSkip ^= 1) && L.dark >= .02 && !nv) { if (L.tA > .005) { const g = x.createLinearGradient(0, 0, W * .35, H); g.addColorStop(0, `rgba(${L.tTop},${L.tA.toFixed(3)})`); g.addColorStop(1, `rgba(${L.tBot},${L.tA.toFixed(3)})`); x.fillStyle = g; x.fillRect(-20, -20, W + 40, H + 40); } x.drawImage(lightC, 0, 0, W, H); fillOutside(x, `rgba(${L.dc},${L.dark})`); if (lightUsedAdd) { x.globalCompositeOperation = 'lighter'; x.drawImage(addC, 0, 0, W, H); x.globalCompositeOperation = 'source-over'; } return; } // Low: every other frame reuses the last light layer
  if (!nv && L.tA > .005) { // dawn / dusk grade: sky-side to horizon-side colors
    const g = x.createLinearGradient(0, 0, W * .35, H);
    g.addColorStop(0, `rgba(${L.tTop},${L.tA.toFixed(3)})`); g.addColorStop(1, `rgba(${L.tBot},${L.tA.toFixed(3)})`);
    x.fillStyle = g; x.fillRect(-20, -20, W + 40, H + 40);
  }
  const dark = L.dark * (nv ? .15 : 1);
  let used = false; const useAdd = () => { if (!used) { used = true; adx.globalAlpha = 1; adx.globalCompositeOperation = 'source-over'; adx.clearRect(0, 0, W, H); adx.globalCompositeOperation = 'lighter'; } };
  if (dark >= .02) {
    if (movingShadows()) gatherDyn(); else dyn.length = 0; // only Full needs the moving casters at all
    // 1. which lights get live shadows this frame: the nearest few that actually have someone under them
    for (const l of lights) l.dynNow = false;
    if (Q.dyn > 0) {
      const sx = snake ? snake.x : W / 2, sy = snake ? snake.y : H / 2, cand = [];
      for (const l of lights) if (l.h > 0 && l.kind !== 'window' && lightK(l) > .01 && dist2(l.x, l.y, sx, sy) < (l.r + 380) ** 2 && nearDyn(l.x, l.y, l.r).length) cand.push(l);
      cand.sort((p, q) => dist2(p.x, p.y, sx, sy) - dist2(q.x, q.y, sx, sy));
      for (let i = 0; i < Math.min(Q.dyn, cand.length); i++) cand[i].dynNow = true;
    }
    // 2. the cached layer of every light that isn't changing right now
    let key = lightVer + '|' + nv;
    for (const l of lights) if (isStaticLight(l)) key += ',' + Math.round(lightK(l) * 40);
    if (key !== statKey) {
      statKey = key;
      stx.setTransform(1, 0, 0, 1, 0, 0); stx.clearRect(0, 0, statC.width, statC.height); stx.setTransform(LDPR, 0, 0, LDPR, 0, 0);
      for (const l of lights) {
        if (!isStaticLight(l)) continue; const k = lightK(l); if (k < .01) continue;
        stx.globalAlpha = k; // source-over of alpha masks = their union, exactly what punching them out one by one gives
        if (l.kind === 'window') { stx.drawImage(WIN_SPR, l.x - l.r, l.y - l.r, l.r * 2, l.r * 2); continue; }
        const s = l.size, bs = Math.ceil(s * LS); stx.drawImage(l.mask, 0, 0, bs, bs, l.x - l.r, l.y - l.r, s, s);
      }
      stx.globalAlpha = 1;
    }
    let vkey = lightVer + '|' + nv;
    for (const l of lights) if (l.kind !== 'window' && isStaticTint(l)) vkey += ',' + Math.round(lightK(l) * 40);
    if (vkey !== veilKey) {
      veilKey = vkey;
      vtx.setTransform(1, 0, 0, 1, 0, 0); vtx.clearRect(0, 0, veilC.width, veilC.height); vtx.setTransform(LDPR, 0, 0, LDPR, 0, 0);
      for (const l of lights) {
        if (l.kind === 'window' || !isStaticTint(l)) continue; const k = lightK(l); if (k < .01) continue;
        const s = l.size, bs = Math.ceil(s * LS); vtx.globalAlpha = k * (VEIL[l.kind] ?? .12); vtx.drawImage(l.tint, 0, 0, bs, bs, l.x - l.r, l.y - l.r, s, s);
      }
      vtx.globalAlpha = 1;
    }
    lgx.globalCompositeOperation = 'source-over'; lgx.globalAlpha = 1; lgx.clearRect(0, 0, W, H);
    lgx.fillStyle = `rgba(${L.dc},${dark})`; lgx.fillRect(0, 0, W, H);
    lgx.globalCompositeOperation = 'destination-out'; // punch light holes in the darkness
    lgx.drawImage(statC, 0, 0, W, H);
    for (const l of lights) {
      const k = lightK(l); if (k < .01) continue;
      if (l.kind === 'street' && !nv) { useAdd(); const spr = glowSprites[l.c] || (glowSprites[l.c] = lightSprite(l.c, .3)); adx.globalAlpha = k * .9; adx.drawImage(spr, l.x - 13, l.y - 13, 26, 26); } // the bulb
      if (isStaticLight(l)) continue;
      if (l.kind === 'window') { lgx.globalAlpha = k; lgx.drawImage(WIN_SPR, l.x - l.r, l.y - l.r, l.r * 2, l.r * 2); continue; }
      const s = l.size, bs = Math.ceil(s * LS); let src = l.mask;
      if (l.dynNow) { // someone is under this light: add their shadows this frame
        s1.clearRect(0, 0, s, s); s1.drawImage(l.mask, 0, 0, s, s); shadeInto(s1, l, nearDyn(l.x, l.y, l.r), l.x - l.r, l.y - l.r, s, .75); src = S1;
      }
      lgx.globalAlpha = k; if (l.enc) encClip(lgx, l); lgx.drawImage(src, 0, 0, bs, bs, l.x - l.r, l.y - l.r, s, s); if (l.enc) lgx.restore();
    }
    airLightHoles(lgx, dark); // explosions light up the night (38c-airstrikes)
    const desat = Q.desat && !nv && dark > .05;
    if (desat) { dsx.globalCompositeOperation = 'copy'; dsx.globalAlpha = 1; dsx.drawImage(lightC, 0, 0, desC.width, desC.height); } // snapshot (half res: it's a soft mask) before colored veils go in
    if (!nv && Q.veil) { // colored veil inside each light pool: sodium orange, fluorescent white, pool cyan, emergency red
      lgx.globalCompositeOperation = 'source-over'; lgx.globalAlpha = 1; lgx.drawImage(veilC, 0, 0, W, H);
      for (const l of lights) { if (l.kind === 'window' || isStaticTint(l)) continue; const k = lightK(l); if (k < .01) continue; const s = l.size, bs = Math.ceil(s * LS); lgx.globalAlpha = k * (VEIL[l.kind] ?? .12); if (l.enc) encClip(lgx, l); lgx.drawImage(l.tint, 0, 0, bs, bs, l.x - l.r, l.y - l.r, s, s); if (l.enc) lgx.restore(); }
    }
    beams.forEach((f, i) => {
      const s = composeBeam(f, i < Q.beamSh), bs = Math.ceil(s * LS);
      lgx.globalCompositeOperation = 'destination-out'; lgx.globalAlpha = f.k * .95; lgx.drawImage(S1, 0, 0, bs, bs, f.x - f.range, f.y - f.range, s, s);
      if (desat) { dsx.setTransform(LDPR / 2, 0, 0, LDPR / 2, 0, 0); dsx.globalCompositeOperation = 'destination-out'; dsx.globalAlpha = f.k * .95; dsx.drawImage(S1, 0, 0, bs, bs, f.x - f.range, f.y - f.range, s, s); dsx.setTransform(1, 0, 0, 1, 0, 0); }
      tintFrom(s2, S1, s, f.c);
      if (!nv) { lgx.globalCompositeOperation = 'source-over'; lgx.globalAlpha = f.k * .1; lgx.drawImage(S2, 0, 0, bs, bs, f.x - f.range, f.y - f.range, s, s); }
      useAdd(); beamAdd(f, s, (nv ? .15 : .12) * clamp(dark / .4, .3, 1), !nv && i < Q.shine); // blood shine on the nearest few
    });
    lgx.globalAlpha = 1; lgx.globalCompositeOperation = 'source-over';
    if (desat) { // unlit areas lose their color; lamp pools and beams keep it
      dsx.globalCompositeOperation = 'source-in'; dsx.globalAlpha = 1; dsx.fillStyle = '#808080'; dsx.fillRect(0, 0, desC.width, desC.height);
      dsx.globalCompositeOperation = 'source-over'; dsx.drawImage(desC, 0, 0); // doubled up: deep dark ends almost grey
      x.globalCompositeOperation = 'saturation'; x.drawImage(desC, 0, 0, W, H); x.globalCompositeOperation = 'source-over';
    }
    x.drawImage(lightC, 0, 0, W, H);
    fillOutside(x, `rgba(${L.dc},${dark})`); // darkness past the map edge too
  } else for (const f of beams) { const s = composeBeam(f, false); tintFrom(s2, S1, s, f.c); useAdd(); beamAdd(f, s, .07, false); } // daylight: barely visible
  if (L.lampsOn > .01 && !nv && windows.length) { useAdd(); adx.globalAlpha = .85 * L.lampsOn; adx.fillStyle = `rgb(${LCOL.window})`; for (const w of windows) adx.fillRect(w.x, w.y, w.w, w.h); }
  lightUsedAdd = used;
  if (used) { adx.globalAlpha = 1; adx.globalCompositeOperation = 'source-over'; x.globalCompositeOperation = 'lighter'; x.drawImage(addC, 0, 0, W, H); x.globalCompositeOperation = 'source-over'; }
}

/* ---- snake coiled all the way around a light: the light stays inside the coil ---- */
const ENC_N = 48;
function enclosure(l) { // every ray out of the light hits the snake => returns the distance to the coil per direction
  const s = snake; if (!s || !s.segs.length || l.kind === 'window') return null;
  const sg = s.segs, n = sg.length, d = l.encD || (l.encD = new Float32Array(ENC_N)); d.fill(Infinity);
  let near = 0;
  for (let i = 0; i < n; i++) {
    const g = sg[i], r = segR(i, n), dx = g.x - l.x, dy = g.y - l.y, dd = Math.hypot(dx, dy);
    if (dd > l.r + r || dd < r) continue; near++;
    const a = Math.atan2(dy, dx), h = Math.asin(Math.min(1, r / dd)), b0 = Math.floor((a - h) / TAU * ENC_N), b1 = Math.floor((a + h) / TAU * ENC_N);
    for (let b = b0; b <= b1; b++) { const k = ((b % ENC_N) + ENC_N) % ENC_N, v = dd + r * .4; if (v < d[k]) d[k] = v; } // inner half of the body stays lit
  }
  if (near < 6) return null;
  for (let k = 0; k < ENC_N; k++) if (d[k] === Infinity) return null;
  return d;
}
function updateEnclosures() {
  let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
  if (snake) for (const g of snake.segs) { bx0 = Math.min(bx0, g.x); by0 = Math.min(by0, g.y); bx1 = Math.max(bx1, g.x); by1 = Math.max(by1, g.y); }
  for (const l of lights) { // cheap reject: the light has to sit inside the snake's bounding box
    l.enc = snake && l.x > bx0 && l.x < bx1 && l.y > by0 && l.y < by1 ? enclosure(l) : null;
  }
}
function encClip(x, l) {
  const d = l.enc; x.save(); x.beginPath();
  for (let k = 0; k < ENC_N; k++) { const a = (k + .5) / ENC_N * TAU, px = l.x + Math.cos(a) * d[k], py = l.y + Math.sin(a) * d[k]; k ? x.lineTo(px, py) : x.moveTo(px, py); }
  x.closePath(); x.clip();
}
const encBlocks = (l, x, y) => { // is this point outside the coil around light l?
  const a = Math.atan2(y - l.y, x - l.x), k = ((Math.floor(a / TAU * ENC_N) % ENC_N) + ENC_N) % ENC_N;
  return dist2(x, y, l.x, l.y) > l.enc[k] * l.enc[k];
};

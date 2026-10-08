/* =========================================================
   SNOW (winter and late autumn, outdoor maps)
   A depth field on a 2px grid, made from Perlin noise and fitted around paths, walls, trees and water.
   It's shaded from its own slopes plus fake ambient occlusion, so it has depth. The snake carves a groove
   along its whole body, packs the middle, pushes snow out to the sides and smears some behind. Blood soaks
   into the snow in its own color, and moves with the snow when it's pushed around.
   ========================================================= */
const SN = 1, SNW = W / SN, SNH = H / SN; // one cell per world pixel: smooth edges, no stair steps
let snowOn = false, snowD = null, snowS = null, snowC3 = null, snowAO = null, snowW = null; // snowW: how worn down each spot is by repeated passes
const snowCv = document.createElement('canvas'); snowCv.width = SNW; snowCv.height = SNH;
const snowX = snowCv.getContext('2d'); let snowImg = null;
let snowDirty = null, snowFx = [], soaks = [], snowSoakT = 0, snowRedrawT = 0;
const snowAt = (x, y) => { if (!snowOn) return 0; const i = x / SN | 0, j = y / SN | 0; return i >= 0 && j >= 0 && i < SNW && j < SNH ? snowD[j * SNW + i] : 0; };
function buildSnow() {
  snowOn = snowy(); snowFx = []; soaks = []; snowDirty = null;
  if (!snowOn) return;
  const N = SNW * SNH, late = season.id !== 'winter', sd = season.seed;
  snowD = new Float32Array(N); snowS = new Float32Array(N); snowC3 = new Float32Array(N * 3); snowAO = new Float32Array(N); snowW = new Float32Array(N);
  // distance to the nearest solid thing (px, capped). Trees and bushes don't count past their trunk: snow lies under bare branches
  const blk = new Uint8Array(GW * GH), dist = new Float32Array(GW * GH).fill(99), q = [];
  const fill = (o, rr) => { if (o.t === 'r') { for (let j = Math.floor(o.y / SG); j < Math.ceil((o.y + o.h) / SG); j++) for (let i = Math.floor(o.x / SG); i < Math.ceil((o.x + o.w) / SG); i++) if (i >= 0 && j >= 0 && i < GW && j < GH) blk[j * GW + i] = 1; }
    else for (let j = Math.floor((o.y - rr) / SG); j <= (o.y + rr) / SG; j++) for (let i = Math.floor((o.x - rr) / SG); i <= (o.x + rr) / SG; i++) if (i >= 0 && j >= 0 && i < GW && j < GH && dist2(i * SG + 2, j * SG + 2, o.x, o.y) <= rr * rr) blk[j * GW + i] = 1; };
  for (const o of obstacles) { if (o.kind === 'detail') continue; if (o.kind === 'lamp') { fill(o, 3); continue; } fill(o, o.kind === 'tree' ? o.r * .2 : o.kind === 'bush' ? 0 : o.r); }
  const src = new Int32Array(GW * GH).fill(-1); // each cell remembers its nearest solid cell, so distance is a true circle (a 4-way spread made diamonds round lamp posts)
  for (let k = 0; k < GW * GH; k++) if (blk[k]) { dist[k] = 0; src[k] = k; q.push(k); }
  for (let h = 0; h < q.length; h++) { const k = q[h], i = k % GW, j = k / GW | 0, sk = src[k], si = sk % GW, sj = sk / GW | 0; if (dist[k] > 40) continue;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= GW || jj >= GH) continue; const kk = jj * GW + ii, d = Math.hypot(ii - si, jj - sj) * SG; if (dist[kk] > d + .01) { dist[kk] = d; src[kk] = sk; q.push(kk); } } }
  const pines = obstacles.filter(o => o.kind === 'tree' && o.tinfo && o.tinfo.pine);
  const NC = 6, nw = Math.ceil(SNW / NC) + 2, nh = Math.ceil(SNH / NC) + 2, NZ = new Float32Array(nw * nh), LZ = new Float32Array(nw * nh); // noise on a coarser grid, smoothly upsampled
  for (let j = 0; j < nh; j++) for (let i = 0; i < nw; i++) { const x = i * NC * SN, y = j * NC * SN; NZ[j * nw + i] = fbm(x / 190 + sd, y / 190 - sd, 4) + perlin(x / 47 + sd * 2, y / 47) * .22; LZ[j * nw + i] = .5 + .45 * sstep(-.3, .6, fbm(x / 70 - sd, y / 70 + sd, 2)) + perlin(x / 22 + sd, y / 22 - sd) * .14; }
  const up = (A, i, j) => { const fx = i / NC, fy = j / NC, i0 = fx | 0, j0 = fy | 0, tx = fx - i0, ty = fy - j0, q = j0 * nw + i0; return (A[q] * (1 - tx) + A[q + 1] * tx) * (1 - ty) + (A[q + nw] * (1 - tx) + A[q + nw + 1] * tx) * ty; };
  // the per-cell work runs on the worker pool (03b-workers), split by rows: every core builds a band at once. The snow
  // fades in when it's ready (well inside the map card); until then there is simply none, so nothing waits on it.
  let green = greenField; if (!green) { green = new Float32Array((W >> 1) * (H >> 1)); for (let j = 0; j < H >> 1; j++) for (let i = 0; i < W >> 1; i++) green[j * (W >> 1) + i] = grassAt(i * 2, j * 2) ? 1 : 0; }
  const pin = new Float32Array(pines.length * 3); pines.forEach((t, i) => { pin[i * 3] = t.x; pin[i * 3 + 1] = t.y; pin[i * 3 + 2] = t.r; });
  const gen = ++snowGen, base = { SNW, SN, SG, GW, GH, dist, NZ, LZ, nw, NC, green, gw: W >> 1, late, pines: pin };
  snowImg = snowX.createImageData(SNW, SNH); snowX.clearRect(0, 0, SNW, SNH);
  const nb = Math.max(1, PX.size), rows = Math.ceil(SNH / nb), D0 = snowD, A0 = snowAO;
  Promise.all(Array.from({ length: nb }, (_, b) => PX.run('snowField', { ...base, j0: b * rows, j1: Math.min(SNH, (b + 1) * rows) })))
    .then(parts => {
      if (gen !== snowGen || snowD !== D0) return; // the map changed meanwhile
      for (const r of parts) { D0.set(r.D, r.j0 * SNW); A0.set(r.AO, r.j0 * SNW); }
      return Promise.all(Array.from({ length: nb }, (_, b) => snowShadeJob(0, b * rows, SNW, Math.min(SNH, (b + 1) * rows))));
    }).catch(e => console.warn('[snow]', e));
}
let snowGen = 0, snowJobs = 0;
function snowShadeJob(x0, y0, x1, y1) { // re-shade a rectangle off the main thread, then put it on the snow layer
  const ox = Math.max(0, x0 - 8), oy = Math.max(0, y0 - 8), ex = Math.min(SNW, x1 + 8), ey = Math.min(SNH, y1 + 8), w = ex - ox, h = ey - oy;
  const D = new Float32Array(w * h), AO = new Float32Array(w * h), S = new Float32Array(w * h), C3 = new Float32Array(w * h * 3);
  for (let j = 0; j < h; j++) { const k = (oy + j) * SNW + ox; D.set(snowD.subarray(k, k + w), j * w); AO.set(snowAO.subarray(k, k + w), j * w); S.set(snowS.subarray(k, k + w), j * w); C3.set(snowC3.subarray(k * 3, (k + w) * 3), j * w * 3); }
  const gen = snowGen; snowJobs++;
  return PX.run('snowShade', { D, AO, S, C3, w, h, ox, oy, SNW, SNH, x0, y0, x1, y1 }, [D.buffer, AO.buffer, S.buffer, C3.buffer]).then(r => {
    snowJobs--; if (gen !== snowGen || !snowOn) return;
    const rw = r.x1 - r.x0, rh = r.y1 - r.y0; if (rw <= 0 || rh <= 0) return;
    snowX.putImageData(new ImageData(r.P, rw, rh), r.x0, r.y0);
    const P = snowImg.data; for (let j = 0; j < rh; j++) P.set(r.P.subarray(j * rw * 4, (j + 1) * rw * 4), ((r.y0 + j) * SNW + r.x0) * 4);
  }, e => { snowJobs--; console.warn('[snow]', e); });
}
function shadeSnow(x0, y0, x1, y1) { // light from the upper left, AO in hollows and against things, blood mixed in
  const D = snowD, P = snowImg.data;
  for (let j = Math.max(0, y0); j < Math.min(SNH, y1); j++) for (let i = Math.max(0, x0); i < Math.min(SNW, x1); i++) {
    const k = j * SNW + i, d = D[k], o = k * 4;
    if (d < .025) { P[o + 3] = 0; continue; }
    const l = i > 3 ? D[k - 4] : d, r = i < SNW - 4 ? D[k + 4] : d, u = j > 3 ? D[k - 4 * SNW] : d, b = j < SNH - 4 ? D[k + 4 * SNW] : d;
    const lit = clamp(1 + (r - l + b - u) * 1.5, .5, 1.3); // slopes facing the light (upper left) are brighter, the far sides fall into blue shade
    const far = ((i > 7 ? D[k - 8] : d) + (i < SNW - 8 ? D[k + 8] : d) + (j > 7 ? D[k - 8 * SNW] : d) + (j < SNH - 8 ? D[k + 8 * SNW] : d)) * .25;
    const cav = clamp((far - d) * 2.2, 0, .5), rim = 1 - sstep(.03, .3, d); // hollows and grooves are darker; thin edges show depth
    const L = clamp(lit * snowAO[k] * (1 - cav * (1 - rim * .7)) * (1 - .1 * rim) + rim * .08, .38, 1.25); // thin dustings stay light, not grey
    const pk = .86 + .14 * sstep(.22, .42, d); // packed snow in a groove is greyer than fresh powder
    let R = (148 + 95 * Math.min(1, L)) * pk, G = (166 + 81 * Math.min(1, L)) * pk, B = (204 + 49 * Math.min(1, L)) * (pk * .5 + .5);
    if (L > 1) { const e = (L - 1) * 40; R += e; G += e; B += e * .5; }
    const s = snowS[k];
    if (s > .01) { // blood soaked in: its own color, darker where it's thick, still lit like the snow
      const t = Math.min(.96, s * .85), dk = (1 - .42 * sstep(.9, 3.2, s)) * clamp(L, .7, 1.05);
      R += (snowC3[k * 3] * dk - R) * t; G += (snowC3[k * 3 + 1] * dk - G) * t; B += (snowC3[k * 3 + 2] * dk - B) * t;
    }
    P[o] = R; P[o + 1] = G; P[o + 2] = B; P[o + 3] = 255 * sstep(.025, .26, d) * .97;
  }
}
const STL = 32, STW = Math.ceil(SNW / STL), STH = Math.ceil(SNH / STL); // changed snow is redrawn per 32px tile, never the whole map
const markSnow = (i, j) => { if (!snowDirty) snowDirty = new Set(); snowDirty.add((j / STL | 0) * STW + (i / STL | 0)); };
function addSnow(i, j, v, si, sr, sg, sb) { // deposit snow (and whatever blood it carries) into a cell
  if (i < 0 || j < 0 || i >= SNW || j >= SNH || v <= 0) return;
  const k = j * SNW + i; if (solidGrid[((j * SN) / SG | 0) * GW + ((i * SN) / SG | 0)]) return;
  const d0 = snowD[k]; snowD[k] = Math.min(1.6, d0 + v);
  if (si > 0) { const w = si / (snowS[k] + si); snowC3[k * 3] += (sr - snowC3[k * 3]) * w; snowC3[k * 3 + 1] += (sg - snowC3[k * 3 + 1]) * w; snowC3[k * 3 + 2] += (sb - snowC3[k * 3 + 2]) * w; snowS[k] += si; }
  markSnow(i, j);
}
function softAdd(x, y, v, s, r, g, b) { // spread a deposit over a small round footprint so piles stay smooth
  const ci = x / SN, cj = y / SN; let tot = 0; const w = [];
  for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) { const q = Math.max(0, 1 - Math.hypot(di + .5 - (ci % 1), dj + .5 - (cj % 1)) / 4.6); w.push(q); tot += q; }
  if (!tot) return; let n = 0;
  for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) { const q = w[n++] / tot; if (q > 0) addSnow((ci | 0) + di, (cj | 0) + dj, v * q, s * q, r, g, b); }
}
function carveSnow(px, py, rr, ang, keep, push, wear = 0) { // press a soft round foot into the snow; returns how much moved
  const ci = px / SN, cj = py / SN, R = rr * 1.05 / SN, nx = -Math.sin(ang), ny = Math.cos(ang), dx = Math.cos(ang), dy = Math.sin(ang);
  let moved = 0;
  for (let j = Math.max(0, Math.floor(cj - R)); j <= Math.min(SNH - 1, Math.ceil(cj + R)); j++) for (let i = Math.max(0, Math.floor(ci - R)); i <= Math.min(SNW - 1, Math.ceil(ci + R)); i++) {
    const k = j * SNW + i, d = snowD[k]; if (d < .03) continue;
    const ox = (i + .5 - ci) * SN, oy = (j + .5 - cj) * SN, dd = Math.hypot(ox, oy); if (dd > rr * 1.05) continue;
    if (wear && dd < rr * .7) snowW[k] = Math.min(1, snowW[k] + wear * (1 - dd / (rr * .7))); // the head wears the groove down a bit more on every pass
    const t = keep * (1 - snowW[k]) + sstep(rr * .45, rr * 1.05, dd) * 1.7; // worn right through: bare ground shows // packed flat in the middle, a smooth wall up to the untouched edge (same every pass, so it never keeps eating in)
    if (d <= t + .004) continue;
    const rem = d - t, frac = rem / d; snowD[k] = t; moved += rem; markSnow(i, j);
    if (!push) continue;
    const side = (ox * nx + oy * ny) >= 0 ? 1 : -1, s = snowS[k] * frac * .8, cr = snowC3[k * 3], cg = snowC3[k * 3 + 1], cb = snowC3[k * 3 + 2];
    snowS[k] -= s;
    const along = ox * dx + oy * dy, off = rr * 1.25 + (rr - Math.abs(ox * nx + oy * ny)) * .35; // shoved out to the side: a soft berm, not spikes
    softAdd(px + nx * side * off + dx * along - dx * rr * .25, py + ny * side * off + dy * along - dy * rr * .25, rem * .45, s * .6, cr, cg, cb);
    const bx = px - dx * rr * (.9 + Math.random() * .8) + nx * (Math.random() - .5) * rr, by = py - dy * rr * (.9 + Math.random() * .8) + ny * (Math.random() - .5) * rr; // smeared along the floor behind
    softAdd(bx, by, rem * .1, s * .3, cr, cg, cb);
  }
  return moved;
}
function blastSnow(x, y, r, rim = true) { // a blast: every bit of snow in the impact zone is blown off to bare ground (blood in it too); some lands in a thin ring just outside
  if (!snowOn || !snowD) return 0;
  const ci = x / SN, cj = y / SN, R = r / SN, RO = R * (rim ? 1.5 : 1.3); let moved = 0; // bare in the middle, then thinning out gradually to untouched snow (no hard edge)
  for (let j = Math.max(0, Math.floor(cj - RO)); j <= Math.min(SNH - 1, Math.ceil(cj + RO)); j++) for (let i = Math.max(0, Math.floor(ci - RO)); i <= Math.min(SNW - 1, Math.ceil(ci + RO)); i++) {
    const k = j * SNW + i; if (snowD[k] <= 0 && snowS[k] <= 0) continue; const d = Math.hypot(i + .5 - ci, j + .5 - cj); if (d > RO) continue;
    const h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453, nz = (h - Math.floor(h) - .5) * .3, u = clamp((d / R - .55) / (RO / R - .55) + nz, 0, 1), keep = u * u * (3 - 2 * u); // smoothstep, with a ragged edge
    if (keep < .04) { moved += snowD[k]; snowD[k] = 0; snowS[k] = 0; snowW[k] = 1; }
    else { moved += snowD[k] * (1 - keep); snowD[k] *= keep; snowS[k] *= keep; }
    markSnow(i, j);
  }
  if (rim && moved > 0) { const n = 36, v = Math.min(.5, moved / (n * 60)); for (let q = 0; q < n; q++) { const a = q / n * TAU + rand(-.08, .08), d = r * rand(1.3, 1.7); softAdd(x + Math.cos(a) * d, y + Math.sin(a) * d, v * rand(.6, 1.4), 0, 0, 0, 0); } }
  return moved;
}
function snowStain(x, y, amt, col) { // blood landing on snow soaks in instead of sitting on top
  if (!snowOn || snowAt(x, y) < .12) return false;
  const c = rgbOf2(col || BLOOD); soaks.push({ x, y, a: amt, c, r: 1 + Math.sqrt(amt) * 2.2, t: 0, life: rand(.8, 1.6) });
  stainDisk(x, y, 1 + Math.sqrt(amt) * 2.2, amt * .9, c);
  return true;
}
function stainDisk(x, y, r, amt, c) {
  const ci = x / SN, cj = y / SN, R = r / SN + 1, tot = Math.max(1, R * R * 2);
  for (let j = Math.max(0, Math.floor(cj - R)); j <= Math.min(SNH - 1, Math.ceil(cj + R)); j++) for (let i = Math.max(0, Math.floor(ci - R)); i <= Math.min(SNW - 1, Math.ceil(ci + R)); i++) {
    const k = j * SNW + i; if (snowD[k] < .05) continue;
    const h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453, dd = Math.hypot(i + .5 - ci, j + .5 - cj) / R, n = (h - Math.floor(h) - .5) * .35; // feathered, uneven edge (cheap hash, not Perlin)
    const w = sstep(1, .35, dd + n); if (w <= 0) continue;
    const v = amt * w * 6 / tot, s0 = snowS[k], f = v / (s0 + v);
    snowC3[k * 3] += (c[0] - snowC3[k * 3]) * f; snowC3[k * 3 + 1] += (c[1] - snowC3[k * 3 + 1]) * f; snowC3[k * 3 + 2] += (c[2] - snowC3[k * 3 + 2]) * f;
    snowS[k] = Math.min(4, s0 + v); markSnow(i, j);
  }
}
function updateSnow(dt) {
  if (!snowOn) return;
  snowSoakT = (snowSoakT || 0) + dt; const soakStep = snowSoakT >= .1; if (soakStep) snowSoakT = 0; // soaking only needs updating ten times a second
  if (soaks.length > 40) soaks.splice(0, soaks.length - 40);
  for (let i = soaks.length - 1; i >= 0; i--) { // fresh blood keeps creeping outward through the snow for a moment
    const s = soaks[i]; s.t += dt; const k = s.t / s.life;
    if (soakStep) stainDisk(s.x, s.y, s.r * (1 + k * 1.3), s.a * .1 * 1.1, s.c);
    if (k >= 1) soaks.splice(i, 1);
  }
  if (SETTINGS.snowQ === 'Simple' || lowFx > 1) { snowFx.length = 0; return; } // Simple: the snow just lies there, nothing is carved or redrawn
  const sn = snake;
  if (sn && state === 'play' && sn.started) {
    const n = sn.segs.length, fast = sn.dashT > 0 ? sn.dashK || 1.8 : 1, lunge = sn.dashT > 0;
    let headMoved = 0;
    for (let i = 0; i < n; i += 1) { // the whole body, not just the head
      const g = sn.segs[i], a = i ? Math.atan2(sn.segs[i - 1].y - g.y, sn.segs[i - 1].x - g.x) : sn.angle;
      const m = carveSnow(g.x, g.y, segR(i, n) * 1.08, a, .24, true, i < 2 ? dt * 1.6 : 0);
      if (i < 3) headMoved += m;
    }
    if (headMoved > .02) { // powder kicked up off the head; the faster, the more (and the odd clump)
      const k = Math.min(3, headMoved * 1.5) * (lunge ? 2 : 1), nx = -Math.sin(sn.angle), ny = Math.cos(sn.angle), st = stainedNear(sn.x, sn.y);
      for (let p = 0; p < k * FX_K() && snowFx.length < 160 * FX_K(); p++) {
        const side = Math.random() < .5 ? -1 : 1, sp = rand(20, 60) * (lunge ? 1.8 : 1);
        snowFx.push({ x: sn.x + nx * side * 9, y: sn.y + ny * side * 9, z: rand(1, 4), vx: nx * side * sp + Math.cos(sn.angle) * rand(-10, 30), vy: ny * side * sp + Math.sin(sn.angle) * rand(-10, 30), vz: rand(30, 80), r: rand(2, 4.5), t: 0, life: rand(.4, .8), puff: true, c: st });
      }
      if ((fast > 1.25 || lunge) && Math.random() < .12 * (lunge ? 3 : 1)) { // a clump thrown out, which lands and splats
        const side = Math.random() < .5 ? -1 : 1, sp = rand(70, 140);
        snowFx.push({ x: sn.x + nx * side * 8, y: sn.y + ny * side * 8, z: 3, vx: nx * side * sp + Math.cos(sn.angle) * 40, vy: ny * side * sp + Math.sin(sn.angle) * 40, vz: rand(70, 120), r: rand(1.6, 2.8), t: 0, life: 3, clump: true, c: st });
      }
    }
  }
  for (const c of creatures) { // every foot leaves a print: alternating left and right, a stride apart
    if (!c.alive || c.def.fly || (c.hz || 0) > .5) continue;
    const mv = Math.hypot(c.x - (c.fpX ?? c.x), c.y - (c.fpY ?? c.y)); c.fpX = c.x; c.fpY = c.y;
    c.snowStep = (c.snowStep || 0) + mv; const stride = c.def.human ? 8 : Math.max(4, c.def.r * .8);
    if (c.snowStep < stride) continue; c.snowStep = 0; c.snowSide = -(c.snowSide || 1);
    const a = c.a || 0, off = c.snowSide * (c.def.human ? 3 : c.def.r * .35), fx = c.x - Math.sin(a) * off, fy = c.y + Math.cos(a) * off;
    carveSnow(fx, fy, c.def.human ? 2.6 : Math.max(1.4, c.def.r * .22), a, .4, false);
    if (!c.def.human && c.def.r > 6) carveSnow(fx + Math.cos(a) * c.def.r * .7, fy + Math.sin(a) * c.def.r * .7, Math.max(1.4, c.def.r * .2), a, .4, false); // front and back feet on bigger animals
  }
  for (let i = snowFx.length - 1; i >= 0; i--) {
    const p = snowFx[i]; p.t += dt;
    p.vz -= (p.puff ? 160 : 420) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z = Math.max(0, p.z + p.vz * dt);
    const dr = 1 - (p.puff ? 3.2 : .8) * dt; p.vx *= dr; p.vy *= dr;
    if (p.clump && p.z <= 0) { // splat: a small flat pile plus a little ring of powder
      const ci = p.x / SN | 0, cj = p.y / SN | 0, s = p.c ? .5 : 0, cc = p.c || [0, 0, 0];
      for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const w = Math.max(0, 1 - Math.hypot(di, dj) / 2.6); if (w) addSnow(ci + di, cj + dj, .14 * w, s * w, cc[0], cc[1], cc[2]); }
      for (let k = 0; k < 3; k++) snowFx.push({ x: p.x, y: p.y, z: 1, vx: rand(-30, 30), vy: rand(-30, 30), vz: rand(10, 30), r: rand(1.5, 2.5), t: 0, life: .4, puff: true, c: p.c });
      snowFx[i] = snowFx[snowFx.length - 1]; snowFx.pop(); continue;
    }
    if (p.t > p.life) { snowFx[i] = snowFx[snowFx.length - 1]; snowFx.pop(); }
  }
  if (snowDirty && (snowRedrawT = (snowRedrawT || 0) - dt) <= 0) { snowRedrawT = .05; // re-shaded and re-uploaded 20 times a second at most: each upload stalls the graphics chip
    // shading looks a few cells around, so each tile is redrawn with a small margin
    if (PX.size && snowJobs < 12) { // on the worker pool; anything over the limit waits for the next round
      for (const t of snowDirty) { const a = (t % STW) * STL - 9, b = (t / STW | 0) * STL - 9; snowShadeJob(Math.max(0, a), Math.max(0, b), Math.min(SNW, a + STL + 18), Math.min(SNH, b + STL + 18)); }
      snowDirty = null;
    } else if (!PX.size) {
      for (const t of snowDirty) { const a = (t % STW) * STL - 9, b = (t / STW | 0) * STL - 9, a1 = a + STL + 18, b1 = b + STL + 18;
        shadeSnow(a, b, a1, b1); const x0 = Math.max(0, a), y0 = Math.max(0, b); snowX.putImageData(snowImg, 0, 0, x0, y0, Math.min(SNW, a1) - x0, Math.min(SNH, b1) - y0); }
      snowDirty = null;
    }
  }
}
function stainedNear(x, y) { const k = (y / SN | 0) * SNW + (x / SN | 0); return snowS && snowS[k] > .3 ? [snowC3[k * 3], snowC3[k * 3 + 1], snowC3[k * 3 + 2]] : null; }
function drawSnow(x) {
  if (!snowOn) return;
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'low'; // 'medium' made this full-screen draw one of the most expensive things in a frame; the snow is soft anyway
  x.drawImage(snowCv, 0, 0, W, H);
}
function drawSnowFx(x) {
  if (!snowOn || !snowFx.length) return;
  for (const p of snowFx) {
    const a = p.puff ? (1 - p.t / p.life) * .55 : 1, col = p.c ? `rgba(${(p.c[0] + 240) / 2 | 0},${(p.c[1] + 240) / 2 | 0},${(p.c[2] + 245) / 2 | 0},` : 'rgba(244,247,253,';
    if (p.clump) { x.fillStyle = 'rgba(60,80,110,.18)'; circ(x, p.x + 1, p.y + 1.5, p.r); }
    x.fillStyle = col + a.toFixed(3) + ')'; circ(x, p.x, p.y - p.z * .5, p.r * (p.puff ? 1 + p.t / p.life * .8 : 1));
  }
}

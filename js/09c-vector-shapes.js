/* =========================================================
   VECTOR SHAPES: drawn shapes kept as editable data, never baked away. The editor makes them; maps carry them.
     { kind: 'rect' | 'ellipse' | 'poly' | 'path',
       x, y, w, h, rot            (rect / ellipse)
       nodes: [[x, y, ix, iy, ox, oy], ...]   (poly / path: a point and its Bezier handles, in/out, relative; 0,0 = a sharp corner)
       curve: 'line' | 'smooth' | 'bezier'     smooth = a curve through the points, bezier = use the handles
       closed, w (stroke width for paths), use, fill, stroke (material ids or inline materials), soft (feathered edge) }
   use: what the shape IS in the map:
     floor  ground paint (roads, sidewalks, floor regions, paths: a stroked path with a width)
     decor  painted on top of objects, no collision (signs, markings, details)
     mask   a decoration mask: clears the ground's painted details and lays the material in their place
     wall   solid: blocks the snake and people (an open path becomes a wall with its stroke width)
     water  a pool or pond (closed) or a river (an open path with a width)
   Static shapes are painted once into the map's layers; shapes whose material moves are kept in a short list drawn
   every frame (customFx), so a still map pays nothing.
   ========================================================= */
function vecFlat(s, step = 5) { // the shape as a polyline (closed shapes: the outline)
  if (s.kind === 'rect' || s.kind === 'ellipse') {
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2, a = (s.rot || 0) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), out = [];
    const P = (u, v) => [cx + u * c - v * sn, cy + u * sn + v * c];
    if (s.kind === 'rect') return [P(-s.w / 2, -s.h / 2), P(s.w / 2, -s.h / 2), P(s.w / 2, s.h / 2), P(-s.w / 2, s.h / 2)];
    const n = Math.max(16, Math.round((s.w + s.h) / 6)); for (let k = 0; k < n; k++) { const t = k / n * TAU; out.push(P(Math.cos(t) * s.w / 2, Math.sin(t) * s.h / 2)); } return out;
  }
  const N = s.nodes || []; if (N.length < 2) return N.map(n => [n[0], n[1]]);
  if (s.curve === 'smooth') return s.closed ? smoothClosed(N.map(n => [n[0], n[1]])) : trailPoints(N.map(n => [n[0], n[1]]));
  if (s.curve !== 'bezier') return N.map(n => [n[0], n[1]]);
  const out = [], seg = (a, b) => { const p0 = [a[0], a[1]], p1 = [a[0] + (a[4] || 0), a[1] + (a[5] || 0)], p2 = [b[0] + (b[2] || 0), b[1] + (b[3] || 0)], p3 = [b[0], b[1]];
    const L = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]), n = Math.max(2, Math.ceil(L / step));
    for (let k = 0; k < n; k++) { const t = k / n, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } };
  for (let i = 0; i < N.length - 1; i++) seg(N[i], N[i + 1]);
  if (s.closed) seg(N[N.length - 1], N[0]); else out.push([N[N.length - 1][0], N[N.length - 1][1]]);
  return out;
}
const vecOpen = s => (s.kind === 'path' || (s.kind === 'poly' && s.closed === false)) && !(s.kind === 'rect' || s.kind === 'ellipse');
function vecStrokePoly(P, w) { // an open polyline widened into a closed outline (for wall paths and rivers)
  if (P.length < 2) return P; const L = [], R = [], h = w / 2;
  for (let i = 0; i < P.length; i++) { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d * h, ny = dx / d * h;
    L.push([P[i][0] + nx, P[i][1] + ny]); R.push([P[i][0] - nx, P[i][1] - ny]); }
  return [...L, ...R.reverse()];
}
function vecOutline(s) { const P = vecFlat(s); return vecOpen(s) ? vecStrokePoly(P, s.w || 12) : P; } // the area it covers
function vecBox(s) { const P = vecOutline(s); if (!P.length) return [0, 0, 0, 0]; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [a, b] of P) { if (a < x0) x0 = a; if (b < y0) y0 = b; if (a > x1) x1 = a; if (b > y1) y1 = b; } return [x0, y0, x1, y1]; }
function vecTrace(x, P, closed) { x.beginPath(); P.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); if (closed) x.closePath(); }
function drawVecShape(x, s, t = T) { // fill and/or stroke with its materials
  const box = vecBox(s), fill = getMaterial(s.fill), stroke = getMaterial(s.stroke);
  if (vecOpen(s)) { // a path: its body is the widened stroke
    if (fill || stroke) { vecTrace(x, vecStrokePoly(vecFlat(s), s.w || 12), true); paintMaterial(x, fill || stroke, box, t); }
    return;
  }
  const P = vecFlat(s);
  if (s.soft && fill) { x.save(); x.filter = `blur(${s.soft}px)`; vecTrace(x, P, true); paintMaterial(x, fill, box, t); x.restore(); }
  else if (fill) { vecTrace(x, P, true); paintMaterial(x, fill, box, t); }
  if (stroke) { x.save(); vecTrace(x, P, true); x.lineJoin = 'round'; x.lineWidth = s.sw || 2; x.strokeStyle = matStroke(x, stroke); x.stroke(); x.restore(); }
}
/* ---- turning a map's shapes into what the game needs ---- */
let customFx = { floor: [], top: [] }; // shapes whose materials move: drawn every frame
function compileVecShapes(shapes) {
  const out = { floor: [], top: [], obs: [], anim: { floor: [], top: [] } };
  for (const s of shapes || []) {
    if (s._hide) continue;
    const use = s.use || 'floor', anim = matAnimated(getMaterial(s.fill)) || matAnimated(getMaterial(s.stroke));
    if (use === 'wall') { const P = vecOutline(s); if (P.length < 3) continue; out.obs.push(polyBounds({ t: 'r', kind: 'shape', shp: s, poly: P, sharp: true, color: '#6d6875', fromShape: true })); continue; }
    if (use === 'water') { const P = vecOutline(s); if (P.length < 3) continue; const o = makeWater(P); o.sharp = true; o.fromShape = true; polyBounds(o); if (s.color) o.color = s.color; out.obs.push(o); continue; }
    const layer = use === 'decor' ? 'top' : 'floor';
    (anim ? out.anim[layer] : out[layer]).push(s);
  }
  return out;
}
function paintVecFloor(x, list) { for (const s of list) { try { drawVecShape(x, s.use === 'mask' && !s.fill ? { ...s, fill: MASK_FILL } : s, 0); } catch (e) { console.warn('[shape]', e); } } } // a mask with no material of its own covers the ground's details with plain ground
const MASK_FILL = { v: 1, layers: [{ t: 'noise', c: '#7f9e4a', c2: '#8fb055', nscale: 6, oct: 3 }] };
function drawCustomFx(x, layer) { const L = customFx[layer]; if (!L || !L.length) return; for (const s of L) drawVecShape(x, s, T); }

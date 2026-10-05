/* =========================================================
   MAP EDITS
   Maps changed in the map editor (40b-editor). Each entry replaces that map's objects and lights at one world width
   (the width depends on the screen's shape, see W in 01-config). Edits saved in this browser win over the ones below.
   To ship edits with the game: Map editor -> Export, then replace this file with the downloaded one.
   ========================================================= */
const MAP_OVERRIDES = {};
const PROP_OVERRIDES = {}; // per kind: { color, breakable, hideBase, shapes } (see the prop editor in 40b)
const mapEditKey = name => name + '@' + W;
function localMapEdits() { try { return JSON.parse(localStorage.getItem('snakeCarnageMapEdits')) || {}; } catch (e) { return {}; } }
function edDrafts() { try { return JSON.parse(localStorage.getItem('snakeCarnageEdDrafts')) || {}; } catch (e) { return {}; } }
let edTestData = null; // a play test from the editor runs on exactly what's in the editor, saved or not
function mapOverride(name) { // editor drafts stay in the editor; the game uses only what you applied to it (or what shipped)
  const k = mapEditKey(name);
  if (edTestData && edTestData.k === k) return edTestData.d;
  if (typeof state !== 'undefined' && state === 'editor') { const d = edDrafts()[k]; if (d) return d; }
  return localMapEdits()[k] || MAP_OVERRIDES[k] || null;
}
let propCache = {}; // the prop editor's per-kind settings, kept current by propApply (40b)
const obsFlag = (o, k) => !!(o[k] || (propCache[o.kind] && propCache[o.kind][k])); // per object, or for the whole kind
function obsCorners(o) { // a rotated rectangle's corners (o.rot in degrees, about its centre)
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2, a = (o.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [cx + u * o.w / 2 * c - v * o.h / 2 * s, cy + u * o.w / 2 * s + v * o.h / 2 * c]);
}
const isRot = o => o.t === 'r' && !o.poly && (o.rot || 0) % 360 !== 0;
function fillObs(x, o, dx = 0, dy = 0, grow = 0) { // the footprint, for masks and shadows
  if (o.poly) { const P = polyShape(o); x.beginPath(); P.forEach(([a, b], k) => k ? x.lineTo(a + dx, b + dy) : x.moveTo(a + dx, b + dy)); x.closePath(); x.fill(); }
  else if (isRot(o)) { const P = obsCorners({ ...o, x: o.x - grow, y: o.y - grow, w: o.w + grow * 2, h: o.h + grow * 2 }); x.beginPath(); P.forEach(([a, b], k) => k ? x.lineTo(a + dx, b + dy) : x.moveTo(a + dx, b + dy)); x.closePath(); x.fill(); }
  else if (o.t === 'r') x.fillRect(o.x - grow + dx, o.y - grow + dy, o.w + grow * 2, o.h + grow * 2);
  else circ(x, o.x + dx, o.y + dy, o.r + grow);
}
function propDefs() { let loc = {}; try { loc = JSON.parse(localStorage.getItem('snakeCarnagePropDefs')) || {}; } catch (e) {} return { ...PROP_OVERRIDES, ...loc }; }
function polyHit(P, x, y, r) { // a circle touching a polygon: inside it, or within r of an edge
  if (pointInPoly(P, x, y)) return true;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, ay] = P[j], [bx, by] = P[i], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)), qx = ax + t * dx - x, qy = ay + t * dy - y; if (qx * qx + qy * qy < r * r) return true; }
  return false;
}
const shapeOf = o => o.poly ? polyShape(o) : isRot(o) ? obsCorners(o) : null; // the true outline of a non-box shape
let edTestSkills = null, edTesting = null; // play tests from the editor can borrow any upgrade levels (see 40b)

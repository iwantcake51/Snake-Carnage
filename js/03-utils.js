/* =========================================================
   UTILS
   ========================================================= */
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
function shade(hex, p) {
  const n = parseInt(hex.slice(1), 16), f = v => clamp(Math.round(v * (1 + p)), 0, 255);
  return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`;
}
function circ(x, cx, cy, r) { x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); }
function ell(x, cx, cy, rx, ry) { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, TAU); x.fill(); }
let IS_TOUCH = (() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })(); // phones/tablets: touch steering + touch-sized UI
const attr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); // safe inside a quoted HTML attribute

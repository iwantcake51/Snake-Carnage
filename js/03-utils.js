/* =========================================================
   UTILS
   ========================================================= */
const rand = (a, b) => a + Math.random() * (b - a);
const rgbOf2 = s => s[0] === '#' ? [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)] : s.match(/\d+/g).slice(0, 3).map(Number);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
function shade(hex, p) {
  const n = parseInt(hex.slice(1), 16), f = v => clamp(Math.round(v * (1 + p)), 0, 255);
  return '#' + ((1 << 24) | (f(n >> 16) << 16) | (f(n >> 8 & 255) << 8) | f(n & 255)).toString(16).slice(1); // hex, so a shaded color can be mixed or shaded again
}
function circ(x, cx, cy, r) { x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); }
function ell(x, cx, cy, rx, ry) { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, TAU); x.fill(); }
let IS_TOUCH = (() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })(); // phones/tablets: touch steering + touch-sized UI
const attr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); // safe inside a quoted HTML attribute
/* small line icons for tabs and buttons, drawn to match the game instead of borrowing emoji */
const ICONS = {
  gameplay: '<path d="M6 9h4M8 7v4M15 8.5h.01M17 10.5h.01"/><path d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6a5 5 0 0 1-9 3H11a5 5 0 0 1-7-3z"/>',
  graphics: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M7 12l3-3 3 3 2-2 2 2"/>',
  effects: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/><circle cx="12" cy="12" r="2"/>',
  audio: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  controls: '<rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 11h.01M10 11h.01M14 11h.01M18 11h.01M7 14h10"/>',
  display: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M3 8h18M9 21h6M12 17v4M7 12h5M7 14.5h8"/>',
  access: '<circle cx="12" cy="5" r="2"/><path d="M5 9l7 1 7-1M12 10v5l-3 6M12 15l3 6"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>',
  brush: '<path d="M14 4l6 6-8 8H6v-6z"/><path d="M4 20l2-2"/>',
  rainbow: '<path d="M3 17a9 9 0 0 1 18 0M6.5 17a5.5 5.5 0 0 1 11 0M10 17a2 2 0 0 1 4 0"/>',
  skin: '<path d="M4 16c2-6 6 2 8-4s6-2 8-6"/><circle cx="19" cy="6" r="1.5"/>',
  hat: '<path d="M7 15V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8"/><path d="M3 15h18v2H3zM7 12h10"/>',
  eyes: '<circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="17" cy="12" r="1.2" fill="currentColor"/>',
  trail: '<path d="M4 18c3 0 4-3 6-6s4-6 8-6"/><path d="M15 15h.01M18 12h.01M12 19h.01"/>',
  theme: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 8h18M7 12h6M7 15h10"/>',
  card: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8v6H8zM8 16h5"/>',
  effect: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  title: '<path d="M4 7h11l5 5-5 5H4z"/><circle cx="8" cy="12" r="1"/>',
};
const ico = k => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[k] || ''}</svg>`;

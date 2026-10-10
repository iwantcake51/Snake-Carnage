/* CAMERA FOLLOW: a small look-ahead in the direction of travel plus a springy push when eating */
const camF = { x: 0, y: 0, k: { x: 0, y: 0 }, kv: { x: 0, y: 0 } };
function updateCamFollow(dt) {
  const go = state === 'play' && snake.alive && snake.started, lead = 9;
  const tx = go ? Math.cos(snake.angle) * lead : 0, ty = go ? Math.sin(snake.angle) * lead : 0, f = Math.min(1, dt * 2.6);
  camF.x += (tx - camF.x) * f; camF.y += (ty - camF.y) * f;
  for (const a of ['x', 'y']) { camF.kv[a] += (-130 * camF.k[a] - 16 * camF.kv[a]) * dt; camF.k[a] += camF.kv[a] * dt; } // damped spring
}

/* =========================================================
   VIEW TRANSFORM: one camera for drawing and for every pointer conversion.
   world -> canvas: shake (sx, sy), then zoom z around the focus (fx, fy) into the middle of the board, then the small
   look-ahead lean (ox, oy). applyView draws with it; worldToCanvas / canvasToWorld / boardPoint convert with the same numbers.
   ========================================================= */
const V = { sx: 0, sy: 0, z: 0, fx: 0, fy: 0, ox: 0, oy: 0 };
function worldToCanvas(x, y) { let qx = x - V.ox, qy = y - V.oy; if (V.z) { qx = W / 2 + V.z * (qx - V.fx); qy = H / 2 + V.z * (qy - V.fy); } return { x: qx + V.sx, y: qy + V.sy }; }
function canvasToWorld(x, y) { let qx = x - V.sx, qy = y - V.sy; if (V.z) { qx = (qx - W / 2) / V.z + V.fx; qy = (qy - H / 2) / V.z + V.fy; } return { x: qx + V.ox, y: qy + V.oy }; }
const clientToCanvas = (cx, cy) => { const r = cv.getBoundingClientRect(); return { x: (cx - r.left) / (r.width || 1) * W, y: (cy - r.top) / (r.height || 1) * H }; };
/* ---- the player's own zoom and pan (wheel / drag on desktop, pinch / two fingers on touch) ----
   Smoothly eased toward its targets. While playing the camera stays on the snake (pan is a limited offset that can never
   lose it off screen); before the run and while paused or dead you can look anywhere on the map. The view never shows
   past the map edge (zoom >= 1), and a small snake is framed a little closer by default. */
const UCAM = { z: 1, tz: 1, px: 0, py: 0, tpx: 0, tpy: 0, dx: 0, dy: 0, fx: W / 2, fy: H / 2, ax: W / 2, ay: H / 2, lt: 0, mode: 'free' };
const UCAM_MAX = 2.6;
const ucamFree = () => !snake || (state !== 'play' && state !== 'held'); // not steering right now: free look
const baseZoom = () => { const s = snake && snake.scale || 1; return s < .95 ? 1 + (1 - s) * .45 : 1; };
const ucamBase = () => UCAM.mode === 'follow' ? [snake.x, snake.y] : [UCAM.ax, UCAM.ay]; // what the pan offset is relative to
function resetUserCam(instant) { UCAM.tz = 1; UCAM.keep = 1; UCAM.tpx = UCAM.tpy = 0; UCAM.panned = false; UCAM.anc = null; if (instant) { UCAM.z = 1; UCAM.px = UCAM.py = 0; UCAM.ax = UCAM.fx = W / 2; UCAM.ay = UCAM.fy = H / 2; } }
function userCam() { // -> { z, fx, fy } to draw with, or null when the camera is at its plain full-map view
  const now = performance.now() / 1000, dt = Math.min(.05, Math.max(0, now - (UCAM.lt || now))); UCAM.lt = now;
  const mode = ucamFree() ? 'free' : 'follow';
  if (mode !== UCAM.mode) { // switching between free look and following: re-anchor so nothing jumps
    if (mode === 'free') { UCAM.ax = UCAM.fx - UCAM.px; UCAM.ay = UCAM.fy - UCAM.py; } else { UCAM.tpx = UCAM.px = UCAM.fx - snake.x; UCAM.tpy = UCAM.py = UCAM.fy - snake.y;
      if (Math.abs(UCAM.px) + Math.abs(UCAM.py) > 1) { UCAM.tpx = UCAM.tpy = 0; UCAM.back = true; } UCAM.panned = false; } // looked away before moving (or while paused): the view glides back onto the snake
    UCAM.mode = mode; UCAM.anc = null;
  }
  const k = 1 - Math.exp(-dt * (UCAM.rate || 12)), z0 = baseZoom(); // rate: a slow, deliberate zoom (co-op death and respawn) or the usual quick one
  if (UCAM.rate && Math.abs(UCAM.z - UCAM.tz) < .005) UCAM.rate = 0;
  const pk = UCAM.back ? 1 - Math.exp(-dt * 6) : k; // the glide back is smooth but quick (about a third of a second to most of the way)
  UCAM.z += (UCAM.tz - UCAM.z) * k; UCAM.px += (UCAM.tpx - UCAM.px) * pk; UCAM.py += (UCAM.tpy - UCAM.py) * pk;
  if (UCAM.back && Math.abs(UCAM.px - UCAM.tpx) + Math.abs(UCAM.py - UCAM.tpy) < .5) UCAM.back = false;
  const z = clamp(UCAM.z * z0, 1, UCAM_MAX * z0);
  if (z < 1.003) { UCAM.fx = W / 2; UCAM.fy = H / 2; UCAM.dx = UCAM.dy = 0; return null; }
  const dr = ucamDrift(z), dk = UCAM.anc ? 0 : 1 - Math.exp(-dt * 3); UCAM.dx += (dr[0] - UCAM.dx) * dk; UCAM.dy += (dr[1] - UCAM.dy) * dk; // before the run, zoomed in or not, the view leans toward the cursor (held still while a zoom eases, so the spot under the pointer stays put)
  const hw = W / 2 / z, hh = H / 2 / z, zt = clamp(UCAM.tz * z0, 1, UCAM_MAX * z0), thw = W / 2 / zt, thh = H / 2 / zt; // the pan target is held to the zoom it's heading for, so easing in never trims it
  if (mode === 'follow') { const mx = Math.max(0, thw - 70), my = Math.max(0, thh - 70); UCAM.tpx = clamp(UCAM.tpx, -mx, mx); UCAM.tpy = clamp(UCAM.tpy, -my, my); } // the snake always stays in frame
  const [bx, by] = ucamBase();
  if (mode === 'free' && UCAM.anc) { // zooming toward the pointer: the spot under it stays put the whole way, not just at the end
    const A = UCAM.anc, fx = clamp(A.wx - (A.cx - W / 2) / z, hw, W - hw), fy = clamp(A.wy - (A.cy - H / 2) / z, hh, H - hh);
    UCAM.fx = fx - UCAM.dx; UCAM.fy = fy - UCAM.dy; UCAM.px = UCAM.fx - bx; UCAM.py = UCAM.fy - by; if (Math.abs(UCAM.z - UCAM.tz) < .002) UCAM.anc = null;
    return { z, fx, fy };
  }
  const tx = clamp(bx + UCAM.px, hw, W - hw), ty = clamp(by + UCAM.py, hh, H - hh);
  if (mode === 'free') { UCAM.tpx = clamp(UCAM.tpx, thw - bx, W - thw - bx); UCAM.tpy = clamp(UCAM.tpy, thh - by, H - thh - by); } // free look: no panning off the map
  const fk = UCAM.back ? 1 : 1 - Math.exp(-dt * 16); UCAM.fx += (tx - UCAM.fx) * fk; UCAM.fy += (ty - UCAM.fy) * fk;
  return { z, fx: clamp(UCAM.fx + UCAM.dx, hw, W - hw), fy: clamp(UCAM.fy + UCAM.dy, hh, H - hh) }; // (dx, dy: the lean toward the cursor, on top)
}
function ucamDrift(z) { // the lean toward the cursor before the run (world units): like the drift at full view (lookAround), less the further in you are
  if (state !== 'ready' || !snake || snake.started || typeof look === 'undefined') return [0, 0];
  return [(look.mx - W / 2) * .5 / z, (look.my - H / 2) * .5 / z];
}
function ucamTakeLook() { // your own zoom or drag takes the camera from the pre-round drift (lookAround in 34-render) exactly where it is (and hands it back the same way when you zoom out: render)
  if (typeof look === 'undefined' || !snake) return;
  if (!(look.z > 1.002) || UCAM.z * baseZoom() > 1.003) return; // it wasn't showing anything of its own (or your zoom already had the camera)
  const z0 = baseZoom(), [dx, dy] = ucamDrift(look.z); UCAM.mode = 'free'; UCAM.z = UCAM.tz = look.z / z0; UCAM.dx = dx; UCAM.dy = dy; // the lean carries straight on
  UCAM.ax = UCAM.fx = look.fx - dx; UCAM.ay = UCAM.fy = look.fy - dy; UCAM.px = UCAM.py = UCAM.tpx = UCAM.tpy = 0; look.z = 1;
}
function zoomAt(cx, cy, factor) { // while you steer: zoom in on your snake, always the centre of the view. Before the run, paused or dead (free look): toward the pointer, like a map
  const before = canvasToWorld(cx, cy); if (ucamFree()) ucamTakeLook(); const z0 = baseZoom();
  UCAM.tz = clamp(UCAM.tz * factor, 1 / z0, UCAM_MAX); UCAM.rate = 0; if (snake && snake.alive && !snake.netHidden) UCAM.keep = UCAM.tz; // the zoom you chose: a co-op respawn brings it back
  const z = clamp(UCAM.tz * z0, 1, UCAM_MAX * z0);
  const free = ucamFree() || state === 'menu' || state === 'editor';
  if (z < 1.003) { if (!free) UCAM.tpx = UCAM.tpy = 0; return; } // (free look keeps its spot: zooming back out just widens the view round it, no slide)
  if (!free) { const [bx, by] = ucamBase(); UCAM.tpx = snake.x - bx; UCAM.tpy = snake.y - by; return; }
  const [bx, by] = ucamBase();
  UCAM.tpx = before.x - V.ox - (cx - V.sx - W / 2) / z - bx; UCAM.tpy = before.y - V.oy - (cy - V.sy - H / 2) / z - by;
  UCAM.anc = { wx: before.x - V.ox, wy: before.y - V.oy, cx: cx - V.sx, cy: cy - V.sy }; // (held under the pointer while the zoom eases: userCam)
}
function panBy(dcx, dcy) { if (ucamFree()) ucamTakeLook(); if (UCAM.anc) { UCAM.tpx = UCAM.px; UCAM.tpy = UCAM.py; UCAM.anc = null; } const z = Math.max(1, UCAM.z * baseZoom()); UCAM.tpx -= dcx / z; UCAM.tpy -= dcy / z; if (ucamFree() && z > 1.003) { UCAM.panned = true; UCAM.back = false; } } // a drag in canvas units -> world offset (panned: looking somewhere else before moving)
/* COMBO STREAK */
let combo = null;
const COMBO_STYLES = { // how each bought combo style behaves (the look itself is in the CSS: body.cb-<name>)
  Default: { shake: 1, shatter: true }, Minimal: { shake: 0, shatter: false }, Typewriter: { shake: 0, shatter: false }, Arcade: { shake: 1.2, shatter: true, step: true },
  Brutal: { shake: 1.8, shatter: true }, Neon: { shake: .6, shatter: false }, Gilded: { shake: .8, shatter: true }, Manhunt: { shake: 1.4, shatter: true }, Overdrive: { shake: 1.6, shatter: true, step: true },
  Hollow: { shake: .4, shatter: false }, Splatter: { shake: 1.3, shatter: true }, Marquee: { shake: .5, shatter: false } };
const comboStyle = () => COMBO_STYLES[SETTINGS.snake && SETTINGS.snake.combo] || COMBO_STYLES.Default;
const comboDur = () => 6.5 * (MOD.comboFocus ? .5 : 1) * /* Short fuse */ (MOD.comboCushion ? 1.5 : 1) * comboGutMult();
const COMBO_CAP = 1.8; // the timer can bank up to 1.8x its normal length
const comboGain = c => comboDur() * (c.golden ? .9 : c.def.human ? .55 : c.def.score >= 2 ? .45 : .32); // bigger, juicier targets buy more time
const typeLabel = c => (c.golden ? 'Golden ' : '') + (c.def.alien ? 'alien' : c.type === 'astronaut' ? 'astronaut' : c.def.human ? 'human' : c.type).replace(/^./, m => m.toUpperCase());
function addCombo(c) {
  const el = document.getElementById('combo');
  if (!combo) {
    combo = { n: 0, counts: {}, t: 0 };
    el.innerHTML = '<ul id="cbList"></ul><div class="cbox"><div class="cbn"><b id="cbN">1</b><i>x</i></div><div class="cbar"><span id="cbBar"></span></div></div>';
  }
  if (!combo.start) { combo.start = T; combo.allHuman = true; }
  combo.allHuman = combo.allHuman && c.def.human;
  combo.n++; const name = typeLabel(c); combo.counts[name] = (combo.counts[name] || 0) + 1;
  combo.t = combo.n === 1 ? comboDur() : Math.min(comboDur() * COMBO_CAP, Math.max(0, combo.t) + comboGain(c));
  el.className = 'show'; el.style.setProperty('--heat', Math.min(1, (combo.n - 1) / 24).toFixed(2));
  const nEl = document.getElementById('cbN'); nEl.textContent = combo.n; nEl.classList.remove('punch'); void nEl.offsetWidth; nEl.classList.add('punch');
  const list = document.getElementById('cbList'); let li = [...list.children].find(l => l.dataset.k === name);
  if (li) { li.querySelector('b').textContent = combo.counts[name] + 'x'; li.classList.remove('bump'); void li.offsetWidth; li.classList.add('bump'); list.prepend(li); }
  else { li = document.createElement('li'); li.dataset.k = name; li.innerHTML = `${name}<b>1x</b>`; list.prepend(li); }
  while (list.children.length > 5) list.lastElementChild.remove(); // newest types on top, the list stays short
  run.maxCombo = Math.max(run.maxCombo, combo.n); cr.maxCombo = Math.max(cr.maxCombo, combo.n); if (!cr.usedNV) cr.maxNoNV = Math.max(cr.maxNoNV, combo.n);
  cr.maxComboTypes = Math.max(cr.maxComboTypes, Object.keys(combo.counts).length);
  if (combo.allHuman) cr.maxHumanCombo = Math.max(cr.maxHumanCombo, combo.n);
  if (light.dark > .45) cr.maxDark = Math.max(cr.maxDark, combo.n);
  run.maxComboTypes = Math.max(run.maxComboTypes, Object.keys(combo.counts).length);
  if (light.dark > .45) run.maxDarkCombo = Math.max(run.maxDarkCombo, combo.n);
  const m = MAPS[mapIdx].name; if (combo.n > (PROG.bestCombo[m] || 0)) PROG.bestCombo[m] = combo.n;
  if (combo.n > 1) Sfx.combo(combo.n);
}
const comboDrain = () => combo ? 1 + Math.min(.75, Math.max(0, combo.n - 3) * .035) : 1; // bigger combos burn faster, capped at 1.75x so huge ones stay reachable
function updateCombo(dt) {
  if (!combo) return;
  combo.t -= dt * comboDrain() * (snake && snake.camoT > 0 ? SKV.phantomDrain() : 1); // Phantom: the combo drains far slower while you're hidden (it still drains)
  const k = Math.max(0, combo.t / comboDur()), el = document.getElementById('combo'), bar = document.getElementById('cbBar');
  if (bar) bar.style.width = (Math.min(1, k / COMBO_CAP) * 100).toFixed(1) + '%';
  el.classList.toggle('banked', k > 1); // more time banked than a fresh combo gets
  el.classList.toggle('warn', k < .35); el.classList.toggle('crit', k < .15);
  const st = comboStyle(), box = el.querySelector('.cbox'), amp = SETTINGS.reduceMotion ? 0 : Math.min(3.2, Math.max(0, combo.n - 4) * .16) * (k < .15 ? 1.5 : 1) * st.shake; // shakes harder as it grows (how hard depends on the combo style)
  if (box) { const q = v => st.step ? Math.round(v / 2) * 2 : v; box.style.translate = amp ? `${q(rand(-amp, amp)).toFixed(1)}px ${q(rand(-amp, amp)).toFixed(1)}px` : ''; }
  if (combo.t <= 0) endCombo();
}
function endCombo(instant) {
  const el = document.getElementById('combo');
  const lost = combo && combo.n >= 2 && !instant;
  if (combo && combo.n >= 3 && !instant) gainXP(Math.round(combo.n * 1.5 * rewardMult), 0); // small streak bonus
  combo = null;
  if (instant) { el.className = ''; el.innerHTML = ''; return; }
  if (lost && !SETTINGS.reduceMotion && comboStyle().shatter) shatterCombo(el);
  el.classList.add('out'); setTimeout(() => { if (!combo) { el.className = ''; el.innerHTML = ''; } }, lost ? 1000 : 460);
}
function shatterCombo(el) { // the number box cracks into pieces that drop away
  const box = el.querySelector('.cbox'); if (!box) return;
  box.style.translate = '';
  const cuts = [0, rand(28, 40), rand(58, 72), 100], jag = () => rand(-8, 8);
  for (let i = 0; i < 3; i++) {
    const a = cuts[i], b = cuts[i + 1], j1 = jag(), j2 = jag(), sh = box.cloneNode(true);
    sh.classList.add('shard'); sh.removeAttribute('id'); sh.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    sh.style.clipPath = `polygon(${a + (i ? j1 : 0)}% 0, ${b + (i < 2 ? j2 : 0)}% 0, ${b - (i < 2 ? j2 : 0)}% 100%, ${a - (i ? j1 : 0)}% 100%)`;
    sh.style.setProperty('--dx', ((i - 1) * rand(12, 26)).toFixed(0) + 'px'); sh.style.setProperty('--rot', ((i - 1) * rand(14, 30) + rand(-8, 8)).toFixed(0) + 'deg');
    sh.style.animationDelay = (i * 40) + 'ms';
    el.appendChild(sh);
  }
  box.style.visibility = 'hidden';
  Sfx.comboBreak && Sfx.comboBreak();
}

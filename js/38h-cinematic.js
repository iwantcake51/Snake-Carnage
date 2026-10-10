/* =========================================================
   CINEMATIC: when it gets dangerous, the picture says so. A bomb coming down near you darkens and closes the edges of
   the screen, tighter the closer and sooner it lands; a blast next to you punches the edges dark red; gas breathes a sick
   green round the edges; burning flickers them orange. No letterbox bars during any of it (those are the intro's alone).
   Cheap by design: four fixed gradient layers, only ever changed through opacity, so the browser composites them without
   repainting anything. Reduced flashing tones it down; Reduced motion stills the pulsing.
   ========================================================= */
const CINE = (() => {
  const stage = document.getElementById('stage'), root = document.createElement('div'); root.id = 'cinefx'; root.setAttribute('aria-hidden', 'true');
  root.innerHTML = '<i class="cv dark"></i><i class="cv blast"></i><i class="cv gas"></i><i class="cv fire"></i>';
  stage.insertBefore(root, stage.querySelector('.cine.top'));
  const L = Object.fromEntries([...root.children].map(e => [e.classList[1], e]));
  return { root, L, v: { dark: 0, blast: 0, gas: 0, fire: 0 }, set: {} };
})();
function cineIncoming() { // the nearest bomb (or strafing lane) about to come down on or right by you: 0..1
  const s = snake; if (!s || !s.alive || !s.segs || !s.segs.length) return 0; let k = 0;
  const near = (x, y) => { let d = Math.hypot(x - s.x, y - s.y); for (let i = 4; i < s.segs.length; i += 6) d = Math.min(d, Math.hypot(x - s.segs[i].x, y - s.segs[i].y)); return d; };
  for (const st of strikes) { if (!(st.t > 0) || st.t > 1.6) continue; const el = st.dur - st.t; if (st.ew && el < st.ew && !(!NETM.run || st.ep === NETM.me)) continue; // (someone else's early warning: not yours to see yet)
    const d = near(st.x, st.y) - st.r; k = Math.max(k, clamp(1 - st.t / 1.6, 0, 1) ** 1.4 * clamp(1 - d / 170, 0, 1)); }
  for (const l of strafes) { if (!(l.t < 0)) continue; const u = clamp(1 + l.t / Math.max(.3, l.warn), 0, 1), dx = s.x - l.x0, dy = s.y - l.y0, al = dx * l.ca + dy * l.sa, off = Math.abs(dy * l.ca - dx * l.sa);
    if (al > -60 && al < l.len + 60) k = Math.max(k, u ** 1.6 * clamp(1 - (off - l.hw) / 150, 0, 1) * .85); }
  return k;
}
function cineTick(dt) {
  const C = CINE, live = (state === 'play' || state === 'dead' || (NETM.run && state !== 'menu')) && !!snake, calm = !!SETTINGS.reduceMotion, soft = SETTINGS.reduceFlash ? .55 : 1;
  const want = live ? { dark: cineIncoming(), blast: Math.max(typeof boomDaze === 'function' ? boomDaze() : 0, AIR.rumble * .8), gas: typeof gasScreen === 'function' ? gasScreen() : 0, fire: snake.alive ? snake.burnK || 0 : 0 } : { dark: 0, blast: 0, gas: 0, fire: 0 };
  const V = C.v, ease = (a, b, up, down) => a + (b - a) * (1 - Math.exp(-dt * (b > a ? up : down)));
  V.dark = ease(V.dark, want.dark, 9, 3); V.blast = ease(V.blast, want.blast, 30, 2.2); V.gas = ease(V.gas, want.gas, 2.5, 1.5); V.fire = ease(V.fire, want.fire, 6, 2.5);
  const t = performance.now() / 1000;
  const op = { dark: Math.min(.85, V.dark * .8 + V.blast * .25) * soft, blast: Math.min(.9, V.blast * .95) * soft, gas: V.gas * (calm ? .5 : .42 + .12 * Math.sin(t * 1.7)), fire: V.fire * (calm ? .5 : .45 + .1 * Math.sin(t * 13) * Math.sin(t * 7.3)) * soft };
  for (const k in op) { const v = Math.round(clamp(op[k], 0, 1) * 100) / 100; if (C.set[k] !== v) { C.set[k] = v; C.L[k].style.opacity = v; } }
}
(function cineLoop() { let last = performance.now(); const f = now => { const dt = Math.min(.1, (now - last) / 1000); last = now; try { cineTick(dt); } catch (e) {} requestAnimationFrame(f); }; requestAnimationFrame(f); })();

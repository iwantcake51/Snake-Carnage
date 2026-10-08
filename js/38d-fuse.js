/* =========================================================
   DEAD MAN'S SWITCH (modifier, id 'fuse'): your first kill straps a bomb to you, wired to the combo.
   Keep killing and the fuse keeps getting topped up. As the combo drains the bomb ticks, faster and faster,
   a fuse sizzles louder, sparks spit off your neck and a red light blinks; in the last moment it locks into one
   long tone. Let the combo run out and it goes off right at your head.
   It wraps the combo (11-camera-combo) and die (22-snake); the blast itself is detonate() from 38c-airstrikes.
   ========================================================= */
const FUSE = { u: 0, blink: 0, last: 0 }; // u: how close it is (0 calm .. 1 about to go), blink: the red light
const fuseOn = () => !!(MOD.fuse && combo && snake && snake.alive && !snake.netHidden);
function fuseTick(dt) {
  const f = combo.fuse || (combo.fuse = { tick: .35, flat: false, armed: false });
  if (!f.armed) { f.armed = true; Sfx.fuseArm(); FUSE.blink = 1; fuseHud(true); }
  const k = Math.max(0, combo.t / comboDur());
  if (combo.t > FUSE.last + .25 && f.armed && FUSE.last > 0) { Sfx.fuseReset(); f.flat = false; f.tick = Math.min(f.tick, .12); } // a kill topped it up: a quick relieved chirp
  FUSE.last = combo.t;
  FUSE.u = clamp(1 - k / .95, 0, 1);
  if (combo.t > .5) { if ((f.tick -= dt) <= 0) { f.tick = .075 + .85 * Math.pow(1 - FUSE.u, 1.7); Sfx.fuseTick(FUSE.u); FUSE.blink = 1; fuseHud(); } }
  else if (!f.flat) { f.flat = true; Sfx.fuseFlat(combo.t); FUSE.blink = 1; } // the last half second: one long tone, no more ticks
  if (f.flat) FUSE.blink = 1;
  Sfx.fuseSizzle(.2 + .8 * FUSE.u);
  FUSE.blink *= Math.exp(-dt * 10);
  const g = snake.segs[Math.min(2, snake.segs.length - 1)]; // sparks spitting off the fuse on your neck
  if (g && Math.random() < dt * (8 + 50 * FUSE.u)) { const a = rand(0, TAU), v = rand(60, 200 + 200 * FUSE.u); boomBits.push({ spark: true, x: g.x, y: g.y, z: rand(6, 12), vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(60, 200), t: 0, life: rand(.15, .4) }); }
  if (FUSE.u > .7) shake = Math.max(shake, (FUSE.u - .7) * 5); // the last stretch: everything trembles
}
function fuseHud(arm) {
  const el = document.getElementById('combo'); if (!el) return;
  el.classList.add('fuse'); const box = el.querySelector('.cbox');
  if (box && !box.querySelector('.fz')) box.insertAdjacentHTML('afterbegin', '<em class="fz">FUSE</em>');
  el.classList.remove('tk'); void el.offsetWidth; el.classList.add('tk'); // a red throb with each tick
  if (arm) { el.classList.remove('armed'); void el.offsetWidth; el.classList.add('armed'); }
}
function fuseBlow() { // the combo ran out: it goes off at your head
  const s = snake, x = s.x, y = s.y, r = Math.round(AIR_R * 1.4);
  Sfx.fuseSizzle(0);
  detonate({ x, y, r, by: 'fuse' }); // it kills you: your head is in the middle of it
  for (let k = 0; k < 40; k++) { const a = rand(0, TAU), v = rand(200, 700); boomBits.push({ spark: true, x, y, z: rand(6, 18), vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(80, 320), t: 0, life: rand(.3, .9) }); } // a bigger shower of sparks than a bomb
  shake = Math.max(shake, 30); AIR.flash = Math.max(AIR.flash, SETTINGS.reduceFlash ? .3 : 1);
  if (NETM.run) { const m = { t: 'fboom', x: Math.round(x), y: Math.round(y), r, by: NETM.me }; if (NETM.host) netEmit(m); else netSend(m); } // everyone sees (and feels) it; the host's crowd takes the hit
}
function drawFuseBomb(x) { // the bomb strapped to your neck: a dark charge, a stub of burning fuse, a red light blinking with the ticks
  if (!fuseOn() || !combo.fuse) return;
  const s = snake, pts = s._pts || s.segs, g = pts[Math.min(2, pts.length - 1)]; if (!g) return;
  const R = snakeRadius() * .75, ca = Math.cos(g.a), sa = Math.sin(g.a);
  x.save(); x.translate(g.x, g.y); x.rotate(g.a);
  x.fillStyle = '#26221f'; x.strokeStyle = '#0d0b0a'; x.lineWidth = 1; x.beginPath(); x.ellipse(0, 0, R * .9, R * .62, 0, 0, TAU); x.fill(); x.stroke(); // the charge
  x.strokeStyle = '#8a7a52'; x.lineWidth = 1.2; for (const o of [-R * .45, R * .45]) { x.beginPath(); x.moveTo(o, -R * .62); x.lineTo(o, R * .62); x.stroke(); } // strapped on
  x.strokeStyle = '#3a2a1a'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(-R * .2, -R * .5); x.quadraticCurveTo(-R * .6, -R * 1.1, -R * .2, -R * 1.35); x.stroke(); // the fuse
  const b = FUSE.blink, glow = x.createRadialGradient(R * .35, 0, 0, R * .35, 0, R * 1.6);
  glow.addColorStop(0, `rgba(255,40,30,${(.75 * b).toFixed(3)})`); glow.addColorStop(1, 'rgba(255,40,30,0)'); x.fillStyle = glow; x.beginPath(); x.arc(R * .35, 0, R * 1.6, 0, TAU); x.fill();
  x.fillStyle = b > .3 ? '#ff3b30' : '#5a0d0a'; x.beginPath(); x.arc(R * .35, 0, R * .2, 0, TAU); x.fill(); // the light
  x.fillStyle = `rgba(255,${200 + 55 * Math.random() | 0},120,.95)`; x.beginPath(); x.arc(-R * .2, -R * 1.35, 1.2 + Math.random() * 1.4, 0, TAU); x.fill(); // the burning tip
  x.restore();
}
/* ---- hooks ---- */
const _fuseUpdCombo = updateCombo;
updateCombo = function (dt) { if (fuseOn()) fuseTick(dt); return _fuseUpdCombo(dt); };
const _fuseEndCombo = endCombo;
endCombo = function (instant) {
  const blow = !instant && MOD.fuse && combo && combo.t <= 0 && snake && snake.alive && !snake.netHidden && (state === 'play' || NETM.run);
  Sfx.fuseSizzle(0); FUSE.last = 0; FUSE.u = 0;
  const el = document.getElementById('combo'); if (el) el.classList.remove('fuse', 'tk', 'armed');
  const r = _fuseEndCombo(instant);
  if (blow) fuseBlow();
  return r;
};
const _fuseDie = die;
die = function () { Sfx.fuseSizzle(0); return _fuseDie.apply(this, arguments); };
const _fuseDrawCorpses = drawCorpses;
drawCorpses = function (x) { _fuseDrawCorpses(x); drawFuseBomb(x); };
/* ---- the sounds: a hard mechanical tick, a beep that climbs as it gets close, a fuse hissing louder and brighter, the arming clack, the flatline ---- */
Object.assign(Sfx, {
  fuseArm() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(undefined, .8);
    this.burst(o, t, .03, 2400, 3, .5); this.burst(o, t + .07, .035, 1800, 3, .5); this.tone(o, t + .02, 120, 90, .12, 'square', .12); // clack-clack: strapped on
    for (let i = 0; i < 3; i++) this.tone(o, t + .16 + i * .07, 1400 + i * 500, 1400 + i * 500, .05, 'square', .06); }, // and armed: three rising beeps
  fuseTick(u) { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(undefined, .55 + .45 * u);
    this.burst(o, t, .014, 4200, 4, .5); this.tone(o, t, 900, 600, .03, 'square', .07); // the mechanism: a hard click
    this.tone(o, t + .005, 1700 + 1500 * u, 1700 + 1500 * u, .045, 'square', .04 + .05 * u); // the beep climbs as it gets close
    if (u > .7) this.tone(o, t, 60, 40, .12, 'sine', .25 * (u - .5)); }, // and a thump you feel in your chest
  fuseReset() { if (!this.ok() || !this.gate('fzr', .2)) return; const t = this.ctx.currentTime, o = this.out(undefined, .5); this.tone(o, t, 2400, 1500, .07, 'triangle', .07); this.tone(o, t + .07, 1500, 1000, .08, 'triangle', .05); },
  fuseFlat(d) { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(undefined, 1), L = Math.max(.15, d); // one long tone right up to the bang
    this.tone(o, t, 3100, 3100, L + .05, 'square', .06); this.tone(o, t, 3115, 3115, L + .05, 'sine', .07); const f = this.burst(o, t, L, 3000, 1, .25); f.frequency.setValueAtTime(2000, t); f.frequency.exponentialRampToValueAtTime(7000, t + L); },
  fuseSizzle(v) { // the fuse burning: a hissing crackle, louder and brighter as it gets close
    if (!this.ctx || (!this.fz && !(v > 0))) return;
    if (!this.fz) { const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), am = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      src.buffer = this.noise; src.loop = true; f.type = 'bandpass'; f.Q.value = .8; f.frequency.value = 3500; g.gain.value = 0; am.gain.value = .7; lfo.type = 'square'; lfo.frequency.value = 23; lg.gain.value = .3; lfo.connect(lg); lg.connect(am.gain); // a crackle on the hiss
      src.connect(f); f.connect(am); am.connect(g); g.connect(this.bus || c.destination); src.start(); lfo.start(); this.fz = { src, lfo, f, g, v: -1 }; }
    const t = this.ctx.currentTime, z = this.fz, vv = +(Math.max(0, v || 0) * .09 * SETTINGS.volume).toFixed(3);
    if (vv !== z.v) { z.g.gain.setTargetAtTime(vv, t, .06); z.f.frequency.setTargetAtTime(2500 + 4500 * (v || 0), t, .1); z.lfo.frequency.setTargetAtTime(14 + 30 * (v || 0), t, .1); z.v = vv; }
    if (!(v > 0)) { const old = this.fz; this.fz = null; setTimeout(() => { try { old.src.stop(); old.lfo.stop(); } catch (e) {} }, 400); }
  },
});

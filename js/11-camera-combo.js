/* CAMERA FOLLOW: a small look-ahead in the direction of travel plus a springy push when eating */
const camF = { x: 0, y: 0, k: { x: 0, y: 0 }, kv: { x: 0, y: 0 } };
function updateCamFollow(dt) {
  const go = state === 'play' && snake.alive && snake.started, lead = 9;
  const tx = go ? Math.cos(snake.angle) * lead : 0, ty = go ? Math.sin(snake.angle) * lead : 0, f = Math.min(1, dt * 2.6);
  camF.x += (tx - camF.x) * f; camF.y += (ty - camF.y) * f;
  for (const a of ['x', 'y']) { camF.kv[a] += (-130 * camF.k[a] - 16 * camF.kv[a]) * dt; camF.k[a] += camF.kv[a] * dt; } // damped spring
}

/* COMBO STREAK */
let combo = null;
const COMBO_STYLES = { // how each bought combo style behaves (the look itself is in the CSS: body.cb-<name>)
  Default: { shake: 1, shatter: true }, Minimal: { shake: 0, shatter: false }, Typewriter: { shake: 0, shatter: false }, Arcade: { shake: 1.2, shatter: true, step: true },
  Brutal: { shake: 1.8, shatter: true }, Neon: { shake: .6, shatter: false }, Gilded: { shake: .8, shatter: true }, Manhunt: { shake: 1.4, shatter: true }, Overdrive: { shake: 1.6, shatter: true, step: true },
  Hollow: { shake: .4, shatter: false }, Splatter: { shake: 1.3, shatter: true }, Marquee: { shake: .5, shatter: false } };
const comboStyle = () => COMBO_STYLES[SETTINGS.snake && SETTINGS.snake.combo] || COMBO_STYLES.Default;
const comboDur = () => 6.5 * (MOD.comboFocus ? .75 : 1) * (MOD.comboCushion ? 1.5 : 1) * comboGutMult();
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
  run.maxCombo = Math.max(run.maxCombo, combo.n); cr.maxCombo = Math.max(cr.maxCombo, combo.n);
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
  combo.t -= dt * comboDrain();
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

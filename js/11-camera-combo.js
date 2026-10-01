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
const comboDur = () => 6.5 * (MOD.comboFocus ? .75 : 1) * (MOD.comboCushion ? 1.5 : 1);
const typeLabel = c => (c.golden ? 'Golden ' : '') + (c.def.human ? 'human' : c.type).replace(/^./, m => m.toUpperCase());
function addCombo(c) {
  const el = document.getElementById('combo');
  if (!combo) { combo = { n: 0, counts: {}, t: 0 }; el.innerHTML = '<div class="cbn"><b id="cbN">1</b><i>x</i></div><ul id="cbList"></ul><div class="cbar"><span id="cbBar"></span></div>'; }
  if (!combo.start) { combo.start = T; combo.allHuman = true; }
  combo.allHuman = combo.allHuman && c.def.human;
  combo.n++; const name = typeLabel(c); combo.counts[name] = (combo.counts[name] || 0) + 1; combo.t = comboDur();
  el.className = 'show';
  const nEl = document.getElementById('cbN'); nEl.textContent = combo.n; nEl.classList.remove('punch'); void nEl.offsetWidth; nEl.classList.add('punch');
  const list = document.getElementById('cbList'); let li = [...list.children].find(l => l.dataset.k === name);
  if (li) { li.querySelector('b').textContent = combo.counts[name] + 'x'; li.classList.remove('bump'); void li.offsetWidth; li.classList.add('bump'); }
  else { li = document.createElement('li'); li.dataset.k = name; li.innerHTML = `<b>1x</b>${name}`; list.appendChild(li); }
  run.maxCombo = Math.max(run.maxCombo, combo.n); cr.maxCombo = Math.max(cr.maxCombo, combo.n);
  cr.maxComboTypes = Math.max(cr.maxComboTypes, Object.keys(combo.counts).length);
  if (combo.allHuman) cr.maxHumanCombo = Math.max(cr.maxHumanCombo, combo.n);
  if (light.dark > .45) cr.maxDark = Math.max(cr.maxDark, combo.n);
  run.maxComboTypes = Math.max(run.maxComboTypes, Object.keys(combo.counts).length);
  if (light.dark > .45) run.maxDarkCombo = Math.max(run.maxDarkCombo, combo.n);
  const m = MAPS[mapIdx].name; if (combo.n > (PROG.bestCombo[m] || 0)) PROG.bestCombo[m] = combo.n;
  if (combo.n > 1) Sfx.combo(combo.n);
}
function updateCombo(dt) {
  if (!combo) return;
  combo.t -= dt;
  const k = Math.max(0, combo.t / comboDur()), el = document.getElementById('combo'), bar = document.getElementById('cbBar');
  if (bar) bar.style.width = (k * 100).toFixed(1) + '%';
  el.classList.toggle('warn', k < .35); el.classList.toggle('crit', k < .15);
  if (combo.t <= 0) endCombo();
}
function endCombo(instant) {
  const el = document.getElementById('combo');
  if (combo && combo.n >= 3 && !instant) gainXP(Math.round(combo.n * 1.5 * rewardMult), 0); // small streak bonus
  combo = null;
  if (instant) { el.className = ''; el.innerHTML = ''; return; }
  el.classList.add('out'); setTimeout(() => { if (!combo) { el.className = ''; el.innerHTML = ''; } }, 460);
}

/* =========================================================
   PERFORMANCE STATS: Settings › Graphics › Performance stats (or F3 during a run).
   FPS: a small chip with the frame rate and a frame-time sparkline.
   Full: the frame-time graph, and how many milliseconds each part of the game takes per frame, from the most expensive
   down, so a slow map shows what is slowing it. Hitches (frames far slower than usual) are logged with what spiked.
   How: while it's on, the game's per-frame functions are wrapped with timers (self time: a function's own work, not the
   parts it calls that are measured separately). Off, nothing is wrapped and it costs nothing.
   ========================================================= */
const PERF_SECTIONS = [ // [function, label, group] (several functions can share a label: their times add up)
  ['update', 'Update: the rest', 'u'], ['netTick', 'Multiplayer sync', 'u'], ['updateCrowd', 'Crowd grid', 'u'], ['updateSnake', 'Snake', 'u'],
  ['snakeNoise', 'Hearing', 'u'], ['updateSounds', 'Hearing', 'u'], ['updateConvos', 'Conversations', 'u'],
  ['updateCreature', 'Crowd AI', 'u'], ['netUpdateCreatures', 'Crowd AI', 'u'], ['netClientCreatures', 'Crowd AI', 'u'], ['perceive', 'Crowd sight', 'u'], ['pickFleeGoal', 'Flee planning', 'u'],
  ['updateBlood', 'Blood drops', 'u'], ['fadeBlood', 'Blood fading', 'u'], ['updateGiblets', 'Gibs', 'u'], ['updateSplashes', 'Gibs', 'u'],
  ['updateMist', 'Mist and smoke', 'u'], ['updateSmoke', 'Mist and smoke', 'u'], ['updateFlies', 'Flies', 'u'], ['updateVomit', 'Vomit', 'u'],
  ['updateTrail', 'Trail', 'u'], ['updateHoovFx', 'Hoover Mouth', 'u'], ['updateScent', 'Scent', 'u'], ['updateGround', 'Grass and footprints', 'u'],
  ['updateSnow', 'Snow', 'u'], ['updateWeather', 'Weather', 'u'], ['updateTime', 'Time of day', 'u'], ['updateLights', 'Lamps', 'u'], ['updateLampBugs', 'Lamps', 'u'],
  ['updateWaters', 'Water', 'u'], ['updateBeams', 'Flashlights', 'u'], ['updateEnclosures', 'Doors and pens', 'u'],
  ['updateCombo', 'HUD', 'u'], ['abilityHud', 'HUD', 'u'], ['hudNear', 'HUD', 'u'], ['updateHud', 'HUD', 'u'], ['updateEvents', 'Events', 'u'], ['abilityTick', 'Abilities', 'u'], ['airTick', 'Air strikes', 'u'],
  ['checkChallenges', 'Challenges', 'u'], ['checkRotation', 'Challenges', 'u'], ['spawn', 'Spawning', 'u'], ['updateCamFollow', 'Camera', 'u'],
  ['render', 'Render: layers and compositing', 'r'], ['userCam', 'Camera', 'r'], ['lookAround', 'Camera', 'r'],
  ['drawDanceFloor', 'Club floor', 'r'], ['drawCustomFx', 'Custom materials', 'r'], ['drawGrass', 'Grass', 'r'], ['drawTrees', 'Trees', 'r'], ['drawWeather', 'Weather', 'r'],
  ['drawSnow', 'Snow', 'r'], ['drawSnowFx', 'Snow', 'r'], ['drawAO', 'Contact shadows', 'r'], ['drawLeashes', 'People and animals', 'r'], ['drawCreature', 'People and animals', 'r'],
  ['drawFlashBodies', 'Flashlights', 'r'], ['drawHitGhosts', 'Kill flashes', 'r'], ['drawGiblets', 'Gibs', 'r'], ['drawTrail', 'Trail', 'r'], ['drawGround', 'Grass and footprints', 'r'],
  ['drawHoovFx', 'Hoover Mouth', 'r'], ['netDrawSnakes', 'Other players', 'r'], ['netDrawTags', 'Other players', 'r'], ['drawSnake', 'Snake', 'r'], ['drawCorpses', 'Air strikes', 'r'], ['drawHats', 'Air strikes', 'r'], ['drawAirstrikes', 'Air strikes', 'r'], ['drawRamCharge', 'Snake', 'r'], ['drawStreaks', 'Snake', 'r'],
  ['drawWaters', 'Water', 'r'], ['drawGloss', 'Blood drops', 'r'], ['drawDrops', 'Blood drops', 'r'], ['drawDebris', 'Debris', 'r'], ['drawMist', 'Mist and smoke', 'r'], ['drawSmoke', 'Mist and smoke', 'r'], ['drawVomit', 'Vomit', 'r'],
  ['drawLighting', 'Lighting', 'r'], ['drawPropGlow', 'Bloom', 'r'], ['drawLampBugs', 'Lamps', 'r'], ['drawFireflyGlow', 'Lamps', 'r'], ['drawSparks', 'Debris', 'r'],
  ['drawVisionMask', 'Fog and vision', 'r'], ['drawGoldenFX', 'Outlines and golden', 'r'], ['drawTargetOutlines', 'Outlines and golden', 'r'], ['drawSnakeNightRim', 'Outlines and golden', 'r'],
  ['drawNVHighlights', 'Night vision', 'r'], ['drawNightVision', 'Night vision', 'r'], ['drawBubbles', 'Speech bubbles', 'r'], ['chromaSplit', 'Daze effects', 'r'], ['concussBloom', 'Daze effects', 'r'],
  ['drawObstacleLayer', 'Rebuild: map objects', 'b'], ['bakeOutline', 'Rebuild: map objects', 'b'], ['bakeShadows', 'Rebuild: shadows', 'b'], ['bakeContactShadows', 'Rebuild: shadows', 'b'],
  ['bakeLightMasks', 'Rebuild: lighting', 'b'], ['bakePropGlow', 'Rebuild: bloom', 'b'], ['buildSnow', 'Rebuild: snow', 'b'], ['updateBuckets', 'Rebuild: blood layers', 'b'],
];
const PERF = { mode: 'Off', wrapped: [], stats: new Map(), stack: [], ft: new Float32Array(240), js: new Float32Array(240), fi: 0, nF: 0, winT: 0, last: 0, hitches: [], el: null, gfx: null, t0: 0, frameJs: 0 };
function perfStat(label, group) { let s = PERF.stats.get(label); if (!s) PERF.stats.set(label, s = { label, group, cur: 0, acc: 0, peak: 0, n: 0, avg: 0, pk: 0, calls: 0, winPeak: 0 }); return s; }
function perfWrapAll() {
  if (PERF.wrapped.length) return;
  const wrap = (name, st, top) => {
    const f = globalThis[name], d = Object.getOwnPropertyDescriptor(globalThis, name);
    if (typeof f !== 'function' || f.__perf || !d || !d.writable) return; // only plain function declarations can be swapped
    const w = function () {
      const t0 = performance.now(); PERF.stack.push(0);
      try { return f.apply(this, arguments); }
      finally { const dt = performance.now() - t0, child = PERF.stack.pop(); st.cur += dt - child; st.n++; if (PERF.stack.length) PERF.stack[PERF.stack.length - 1] += dt; else if (top) PERF.frameJs += dt; }
    };
    Object.assign(w, f); w.__perf = f; globalThis[name] = w; PERF.wrapped.push([name, f, w]); // (some keep state on themselves, like render.olk: it moves across)
  };
  for (const [name, label, g] of PERF_SECTIONS) wrap(name, perfStat(label, g), name === 'update' || name === 'render');
}
function perfUnwrapAll() { for (const [name, f, w] of PERF.wrapped) if (globalThis[name] === w) { const { __perf, ...st } = w; Object.assign(f, st); globalThis[name] = f; } PERF.wrapped = []; PERF.stack.length = 0; }
function perfApply() { // the setting changed (or F3)
  const m = SETTINGS.perfHud || 'Off'; PERF.mode = m;
  if (m === 'Full') perfWrapAll(); else perfUnwrapAll();
  if (m === 'Off') { if (PERF.el) { PERF.el.remove(); PERF.el = null; } return; }
  perfBuild();
}
function perfCycle() { const o = ['Off', 'FPS', 'Full']; SETTINGS.perfHud = o[(o.indexOf(SETTINGS.perfHud || 'Off') + 1) % 3]; saveSettings(); perfApply(); notify && notify({ kind: 'info', title: 'Performance stats', right: SETTINGS.perfHud.toUpperCase(), dur: 1.2, key: 'perf' }); }
function perfShowIfPlaying() { // only during a run: never over the menus, the pause screen, the death screen or the editor
  const ov = overlay.style.display !== 'none' && !overlay.classList.contains('hide') && !!overlay.firstElementChild;
  const on = ['play', 'ready', 'held', 'intro'].includes(state) && !ov && !document.getElementById('mpPause');
  if (PERF.el.hidden === on) PERF.el.hidden = !on;
}
function perfBuild() {
  if (PERF.el) PERF.el.remove();
  const el = document.createElement('div'); el.id = 'perfHud'; el.className = PERF.mode === 'Full' ? 'full' : 'mini';
  el.innerHTML = PERF.mode === 'Full'
    ? `<div class="ph"><b class="pfps">--</b><small>fps</small><div class="pms"><span class="pa">-- ms</span><span class="pl">1% low --</span><span class="pw">worst --</span></div><button class="px" title="Close (F3)">×</button></div>
       <canvas class="pg" width="300" height="56"></canvas>
       <div class="pleg"><span><i class="u"></i>Update</span><span><i class="r"></i>Render</span><span><i class="b"></i>Rebuild</span><span><i class="o"></i>Browser and GPU</span></div>
       <div class="pt"></div><div class="pab"></div><div class="psc"></div><div class="phx"></div>
       <div class="pf"><button class="pfind" title="Switches each part off for a moment and measures what it really costs on this device, graphics chip included">Find what's slow</button><button class="pcopy">Copy report</button><button class="preset">Reset</button></div>`
    : `<b class="pfps">--</b><small>fps</small><span class="pa">-- ms</span><canvas class="pg" width="90" height="22"></canvas>`;
  el.hidden = true; stage.appendChild(el); PERF.el = el; PERF.gfx = el.querySelector('.pg').getContext('2d');
  const q = c => el.querySelector(c);
  if (q('.px')) q('.px').onclick = () => { SETTINGS.perfHud = 'Off'; saveSettings(); perfApply(); };
  if (q('.preset')) q('.preset').onclick = () => { PERF.hitches = []; for (const s of PERF.stats.values()) { s.avg = s.pk = s.acc = s.winPeak = 0; } PERF.ft.fill(0); PERF.js.fill(0); };
  if (q('.pfind')) q('.pfind').onclick = () => perfFindSlow();
  if (q('.pcopy')) q('.pcopy').onclick = () => { const t = perfReport(); try { navigator.clipboard.writeText(t); toast('Report copied'); } catch (e) { console.log(t); } };
}
function perfFrame(now) { // once per drawn frame, after update and render
  if (PERF.mode === 'Off') return;
  const dt = PERF.last ? now - PERF.last : 16.7; PERF.last = now; if (dt > 1000) return; // came back from a background tab
  const i = PERF.fi = (PERF.fi + 1) % PERF.ft.length; PERF.ft[i] = dt; PERF.js[i] = PERF.frameJs; PERF.nF++;
  if (PERF.mode === 'Full') {
    let avg = 0; for (let k = 0; k < 60; k++) avg += PERF.ft[(i - k + 240) % 240]; avg /= 60;
    if (dt > Math.max(45, avg * 2.4) && PERF.nF > 30) { // a hitch: what spiked in this very frame
      const top = [...PERF.stats.values()].filter(s => s.cur > .5).sort((a, b) => b.cur - a.cur).slice(0, 3).map(s => [s.label, s.cur]);
      PERF.hitches.unshift({ t: T, ms: dt, js: PERF.frameJs, top }); if (PERF.hitches.length > 5) PERF.hitches.pop();
    }
    for (const s of PERF.stats.values()) { s.acc += s.cur; if (s.cur > s.winPeak) s.winPeak = s.cur; s.calls += s.n; s.cur = 0; s.n = 0; }
  }
  PERF.frameJs = 0; PERF.winFrames = (PERF.winFrames || 0) + 1;
  if ((PERF.winT += dt) >= 500) perfShow();
  if (PERF.nF % 3 === 0) perfGraph();
}
function perfShow() {
  const frames = Math.max(1, PERF.winFrames || 1), el = PERF.el;
  const ft = [...PERF.ft].filter(v => v > 0), avg = ft.slice(-60).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(60, ft.length));
  const srt = ft.slice().sort((a, b) => b - a), low = srt[Math.floor(srt.length * .01)] || avg, worst = srt[0] || avg;
  if (PERF.mode === 'Full') for (const s of PERF.stats.values()) { s.avg = s.acc / frames; s.pk = s.winPeak; s.callsAvg = s.calls / frames; s.acc = 0; s.winPeak = 0; s.calls = 0; }
  PERF.winT = 0; PERF.winFrames = 0;
  if (!el) return;
  const q = c => el.querySelector(c), fps = Math.round(1000 / Math.max(1, avg));
  q('.pfps').textContent = fps; q('.pfps').className = 'pfps ' + (fps >= 55 ? 'ok' : fps >= 30 ? 'meh' : 'bad'); q('.pa').textContent = avg.toFixed(1) + ' ms';
  if (PERF.mode !== 'Full') return;
  q('.pl').textContent = `1% low ${Math.round(1000 / low)}`; q('.pw').textContent = `worst ${worst.toFixed(0)} ms`;
  const jsAvg = [...PERF.js].slice(-60).reduce((a, b) => a + b, 0) / 60, other = Math.max(0, avg - jsAvg);
  const rows = [...PERF.stats.values()].filter(s => s.avg > .005 || s.pk > .4).sort((a, b) => b.avg - a.avg).slice(0, 12);
  rows.push({ label: 'Browser and GPU', group: 'o', avg: other, pk: 0 });
  rows.sort((a, b) => b.avg - a.avg);
  const scale = Math.max(16.7, rows[0] ? rows[0].avg : 1);
  q('.pt').innerHTML = `<div class="prow phd"><span>Where each frame goes</span><span>avg</span><span>peak</span></div>` + rows.map(s =>
    `<div class="prow"><span class="pn"><i class="${s.group}"></i>${s.label}${s.callsAvg > 1.5 ? `<em>×${Math.round(s.callsAvg)}</em>` : ''}</span><span class="pv">${s.avg.toFixed(2)}</span><span class="pp">${s.pk ? s.pk.toFixed(1) : ''}</span><b class="pb ${s.group}" style="width:${Math.min(100, s.avg / scale * 100).toFixed(1)}%"></b></div>`).join('');
  const nP = typeof parts !== 'undefined' ? parts.length : 0, nC = typeof creatures !== 'undefined' ? creatures.filter(c => c.alive).length : 0;
  q('.psc').innerHTML = `<span>${esc(MAPS[mapIdx].name)}</span><span>${nC} alive</span><span>${nP} drops</span><span>${typeof gibs !== 'undefined' ? gibs.length : 0} gibs</span><span>${typeof lights !== 'undefined' && lights ? lights.length : 0} lights</span><span>${cv.width}×${cv.height}</span><span>light ${SETTINGS.lightQ}${lowFx ? ' (auto-lowered)' : ''}</span>`;
  q('.phx').innerHTML = PERF.hitches.length ? `<div class="phd">Hitches</div>` + PERF.hitches.map(h => `<div class="ph1"><b>${h.ms.toFixed(0)} ms</b><span>${h.top.length ? h.top.map(([l, v]) => `${l} ${v.toFixed(0)}`).join(' · ') : 'not in game code (browser, GPU or garbage collection)'}</span></div>`).join('') : '';
}
function perfGraph() {
  const g = PERF.gfx; if (!g) return; const c = g.canvas, w = c.width, h = c.height, full = PERF.mode === 'Full', n = full ? 150 : 45, bw = w / n, top = 50;
  g.clearRect(0, 0, w, h);
  if (full) { g.fillStyle = 'rgba(255,255,255,.07)'; for (const ms of [16.7, 33.3]) { const y = h - ms / top * h; g.fillRect(0, Math.round(y), w, 1); } }
  for (let k = 0; k < n; k++) {
    const i = (PERF.fi - (n - 1 - k) + 240) % 240, v = PERF.ft[i]; if (!v) continue;
    const js = Math.min(v, PERF.js[i]), bh = Math.min(h, v / top * h), jh = Math.min(bh, js / top * h);
    g.fillStyle = v > 33.4 ? '#ff4a3d' : v > 17.5 ? '#f2c14e' : '#4fd17a'; g.globalAlpha = full ? .35 : .9; g.fillRect(k * bw, h - bh, Math.max(1, bw - .5), bh);
    if (full && jh > 0) { g.globalAlpha = .95; g.fillRect(k * bw, h - jh, Math.max(1, bw - .5), jh); }
  }
  g.globalAlpha = 1;
}
function perfReport() {
  const L = [`Snake: Carnage ${GAME_VERSION} performance, ${MAPS[mapIdx].name}, ${cv.width}x${cv.height}, lighting ${SETTINGS.lightQ}, shadows ${SETTINGS.shadows}, blood ${SETTINGS.bloodQ}, snow ${SETTINGS.snowQ}, trees ${SETTINGS.treeQ}`];
  const ft = [...PERF.ft].filter(v => v > 0), avg = ft.reduce((a, b) => a + b, 0) / Math.max(1, ft.length); L.push(`frame ${avg.toFixed(1)} ms (${Math.round(1000 / avg)} fps)`);
  for (const s of [...PERF.stats.values()].sort((a, b) => b.avg - a.avg)) if (s.avg > .01) L.push(`${s.avg.toFixed(2).padStart(6)} ms  peak ${s.pk.toFixed(1).padStart(5)}  ${s.label}`);
  if (PERF.abRes) for (const r of PERF.abRes) L.push(`switching off ${r.label}: -${r.ms.toFixed(1)} ms`);
  for (const h of PERF.hitches) L.push(`hitch ${h.ms.toFixed(0)} ms: ${h.top.map(([l, v]) => `${l} ${v.toFixed(1)}`).join(', ')}`);
  return L.join('\n');
}
/* FIND WHAT'S SLOW: the timers above only see the game's own code. Much of a frame is the graphics chip drawing what the
   code asked for, later, where no timer can see it. So this switches each part off for a moment, on your own machine,
   and measures how much faster the frames get: that is what the part really costs, drawing included. */
const PERF_AB = [ // [label, functions to switch off | a setting change, where to change it]
  ['Lighting', ['drawLighting'], 'Graphics › Lighting'], ['Moving shadows', { shadows: s => s === 'Full' ? 'Static' : null }, 'Graphics › Shadows'],
  ['All shadows', { shadows: s => s !== 'Off' ? 'Off' : null }, 'Graphics › Shadows'], ['Bloom', ['drawPropGlow'], 'Graphics › Bloom'],
  ['Trees', ['drawTrees'], 'Graphics › Tree detail'], ['Grass', ['drawGrass'], ''], ['Snow', ['drawSnow', 'drawSnowFx'], 'Graphics › Snow'],
  ['Weather', ['drawWeather'], ''], ['People and animals', ['drawCreature'], ''], ['Outlines', ['drawTargetOutlines', 'drawSnakeNightRim'], 'Accessibility › Map outlines'],
  ['Blood drops', ['drawDrops', 'drawGloss'], 'Effects › Blood quality'], ['Gibs and debris', ['drawGiblets', 'drawDebris', 'drawSparks'], 'Effects › Particles'],
  ['Mist and smoke', ['drawMist', 'drawSmoke'], 'Effects › Particles'], ['Water', ['drawWaters'], ''], ['Speech bubbles', ['drawBubbles'], 'Accessibility › Speech bubble size'],
  ['Fog and vision', ['drawVisionMask'], 'Graphics › Fog detail'], ['Lamps and fireflies', ['drawLampBugs', 'drawFireflyGlow'], ''],
];
async function perfFindSlow() {
  const el = PERF.el; if (PERF.ab || !el || !['play', 'ready', 'held'].includes(state)) { if (el && !PERF.ab) toast('Start a run first'); return; }
  PERF.ab = true; const box = el.querySelector('.pab'), btn = el.querySelector('.pfind'); btn.disabled = true;
  const meas = ms => new Promise(res => { const v = []; let t0 = 0, lt = 0; const f = t => { if (!t0) t0 = t; else v.push(t - lt); lt = t; if (t - t0 < ms) requestAnimationFrame(f); else { v.sort((a, b) => a - b); res(v.length ? v[v.length >> 1] : 0); } }; requestAnimationFrame(f); }); // the median frame: one stray hitch doesn't skew it
  const out = [];
  try {
    await meas(300); let base = await meas(1200);
    for (let i = 0; i < PERF_AB.length; i++) {
      const [label, what, hint] = PERF_AB[i]; box.innerHTML = `<div class="phd">Testing ${i + 1} of ${PERF_AB.length}: ${label}</div>`;
      const undo = [];
      if (Array.isArray(what)) { for (const f of what) { const d = Object.getOwnPropertyDescriptor(globalThis, f); if (typeof globalThis[f] === 'function' && d && d.writable) { undo.push([f, globalThis[f]]); globalThis[f] = function () {}; } } }
      else for (const [k, fn] of Object.entries(what)) { const v = fn(SETTINGS[k]); if (v !== null) { undo.push(['S:' + k, SETTINGS[k]]); SETTINGS[k] = v; } }
      if (!undo.length) continue;
      await meas(250); const off = await meas(1000);
      for (const [f, v] of undo) if (f.startsWith('S:')) SETTINGS[f.slice(2)] = v; else globalThis[f] = v;
      await meas(200); const again = await meas(600); base = (base * 2 + again) / 3; // the scene drifts as you play: keep the baseline fresh
      out.push({ label, hint, ms: Math.max(0, base - off), base });
    }
  } finally { PERF.ab = false; btn.disabled = false; }
  out.sort((a, b) => b.ms - a.ms); PERF.abRes = out;
  const top = Math.max(1, out[0] ? out[0].ms : 1), base = out.length ? out.reduce((a, r) => a + r.base, 0) / out.length : 0;
  box.innerHTML = `<div class="prow phd"><span>What each part costs here</span><span>ms</span><span></span></div>` + out.filter(r => r.ms >= .3).slice(0, 8).map(r =>
    `<div class="prow"><span class="pn" title="${r.hint ? 'Change it in Settings › ' + r.hint : ''}"><i class="o"></i>${r.label}${r.hint ? `<em>${r.hint}</em>` : ''}</span><span class="pv">${r.ms.toFixed(1)}</span><span class="pp">${Math.round(r.ms / Math.max(1, base) * 100)}%</span><b class="pb ab" style="width:${(r.ms / top * 100).toFixed(1)}%"></b></div>`).join('')
    + (out.some(r => r.ms >= .3) ? '' : `<div class="ph1"><span>${base < 18 ? 'Running at your screen\'s refresh rate: nothing here is holding it back.' : 'Nothing stood out: every part costs under 0.3 ms on this device.'}</span></div>`);
}
/* ---- THIS RUN: always recorded (a few comparisons a frame), so the pause screen can say what made it lag even with the
   stats panel off. Frame times while you play, every hitch with what was happening at that moment (kills, smashing,
   how much blood and debris was in the air), and, if Performance stats were on Full, which parts spiked. ---- */
const PR = { run: null, n: 0, sum: 0, worst: 0, b: [0, 0, 0, 0, 0], slowT: 0, hitch: [], last: 0, skip: 0, kH: new Int32Array(40), sH: new Int32Array(40), ki: 0, avg: 16.7, lowFx: [], lastLow: 0 };
function perfRunTick(now) {
  if (PR.run !== run) { Object.assign(PR, { run, n: 0, sum: 0, worst: 0, b: [0, 0, 0, 0, 0], slowT: 0, hitch: [], skip: 40, lowFx: [], lastLow: 0, avg: 16.7 }); PR.last = now; return; } // a new run: start over
  const dt = now - PR.last; PR.last = now;
  const i = PR.ki = (PR.ki + 1) % 40; PR.kH[i] = run.killed || 0; PR.sH[i] = run.smashed || 0;
  if (state !== 'play' || dt > 1000) return; // only while you're actually playing (a paused or hidden tab doesn't count)
  if (PR.skip > 0) { PR.skip--; return; } // the first frames of a run are the map settling in
  PR.n++; PR.sum += dt; if (dt > PR.worst) PR.worst = dt; PR.b[dt <= 17.5 ? 0 : dt <= 25 ? 1 : dt <= 34 ? 2 : dt <= 50 ? 3 : 4]++; if (dt > 34) PR.slowT += dt;
  if (lowFx !== PR.lastLow) { if (lowFx > PR.lastLow) PR.lowFx.push({ t: run.time, lv: lowFx }); PR.lastLow = lowFx; }
  if (dt > Math.max(50, PR.avg * 2.6)) { // a hitch: note what was going on
    const o = (i + 1) % 40, alive = creatures.reduce((a, c) => a + (c.alive ? 1 : 0), 0);
    const h = { t: run.time, ms: dt, kills: PR.kH[i] - PR.kH[o], smash: PR.sH[i] - PR.sH[o], drops: typeof parts !== 'undefined' ? parts.length : 0, gibs: typeof gibs !== 'undefined' ? gibs.length : 0, debris: typeof debris !== 'undefined' ? debris.length : 0, alive,
      js: PERF.mode === 'Full' ? PERF.frameJs : null, top: PERF.mode === 'Full' ? [...PERF.stats.values()].filter(q => q.cur > .5).sort((a, b) => b.cur - a.cur).slice(0, 3).map(q => [q.label, q.cur]) : null };
    PR.hitch.push(h); if (PR.hitch.length > 40) { PR.hitch.sort((a, b) => b.ms - a.ms); PR.hitch.length = 25; } // keep the worst ones
  }
  PR.avg += (dt - PR.avg) * .05;
}
function perfRunCauses() { // a plain-language guess at what hurt, from the hitches and the overall frame rate
  const hs = PR.hitch, out = [], n = hs.length, avg = PR.n ? PR.sum / PR.n : 16.7;
  if (!PR.n) return out;
  const k = hs.filter(h => h.kills > 0).length, sm = hs.filter(h => h.smash > 0).length, busy = hs.filter(h => h.drops > 250 || h.gibs > 40 || h.debris > 120).length;
  if (n >= 2 && k / n >= .5) out.push(['Kills', `${k} of ${n} hitches came right after eating someone: the blood spray, gibs and pools. Effects › Blood quality (Medium or Low) and Particles cut that most.`]);
  if (n >= 2 && sm / n >= .4) out.push(['Breaking things', `${sm} of ${n} hitches came right after smashing something. Effects › Particles: Low makes the debris lighter.`]);
  if (n >= 3 && busy / n >= .5 && !(k / n >= .5)) out.push(['Busy screen', 'Most hitches had a lot of blood or debris in the air at once. Effects › Blood quality or Particles lower that.']);
  const tops = {}; for (const h of hs) for (const [l, v] of h.top || []) tops[l] = (tops[l] || 0) + v;
  const timed = hs.filter(h => h.js !== null && h.js !== undefined), outside = timed.filter(h => h.js < h.ms * .4).length;
  if (timed.length && outside / timed.length >= .5) out.push(['Outside the game code', `In ${outside} of ${timed.length} measured hitches the game's own code took only a small part of the frame: the rest was the graphics chip drawing, or the browser (garbage collection, another tab). Lower Render resolution and Lighting to ease the graphics side.`]);
  else { const best = Object.entries(tops).sort((a, b) => b[1] - a[1])[0]; if (best) out.push(['Measured', `When it hitched, ${best[0]} took the most time.`]); }
  if (avg > 24 && n < PR.n * .02) out.push(['Steady load', `It ran slowly all the time rather than in spikes (${Math.round(1000 / avg)} fps on average). The biggest levers: Graphics › Lighting (Low), Shadows (Static), Render resolution (75%). In a run, the F3 panel's "Find what's slow" measures each part on this device.`]);
  if (PR.lowFx.length) out.push(['Automatic quality', `It ran slowly enough that the game simplified the ${PR.lowFx.some(e => e.lv > 1) ? 'lighting and snow' : 'lighting'} by itself at ${fmtTime(PR.lowFx[0].t)}.`]);
  if (!out.length) out.push(n ? ['Nothing stands out', 'The hitches didn\'t line up with kills, smashing or a busy screen. They may come from the browser itself (garbage collection, another tab, the graphics driver).'] : ['Smooth', 'No hitches so far this run.']);
  return out;
}
function perfRunHtml() {
  if (!PR.n) return '<p class="pfempty">Nothing recorded yet. Play for a moment and pause again.</p>';
  const avg = PR.sum / PR.n, fps = Math.round(1000 / avg), worst = Math.round(PR.worst), tot = PR.b.reduce((a, b) => a + b, 0) || 1;
  const pct = PR.b.map(v => v / tot * 100), slow = PR.slowT / Math.max(1, PR.sum) * 100;
  const worstH = [...PR.hitch].sort((a, b) => b.ms - a.ms).slice(0, 5);
  const cause = h => { const w = []; if (h.kills) w.push(h.kills > 1 ? `${h.kills} kills` : 'a kill'); if (h.smash) w.push('smashing'); if (h.drops > 150) w.push(`${h.drops} blood drops`); if (h.gibs > 25) w.push(`${h.gibs} gibs`); if (h.debris > 80) w.push(`${h.debris} debris`); return w.length ? 'just after ' + w.join(', ') : `${h.alive} alive, quiet moment`; };
  const parts = PERF.mode === 'Full' ? [...PERF.stats.values()].filter(q => q.avg > .05).sort((a, b) => b.avg - a.avg).slice(0, 5) : [];
  return `<div class="pfsum"><div><b class="${fps >= 55 ? 'ok' : fps >= 30 ? 'meh' : 'bad'}">${fps}</b><small>avg fps</small></div><div><b>${worst}</b><small>worst ms</small></div><div><b>${PR.hitch.length}</b><small>hitches</small></div><div><b>${slow.toFixed(0)}%</b><small>time under 30 fps</small></div></div>
    <div class="pfbar" title="How long frames took this run">${pct.map((v, i) => v > .3 ? `<i class="f${i}" style="width:${v.toFixed(1)}%"></i>` : '').join('')}</div>
    <div class="pfleg"><span><i class="f0"></i>smooth</span><span><i class="f1"></i>ok</span><span><i class="f2"></i>slow</span><span><i class="f3"></i>very slow</span><span><i class="f4"></i>hitch</span></div>
    <h4>Likely causes</h4><div class="pfcause">${perfRunCauses().map(([t, d]) => `<p><b>${t}</b>${d}</p>`).join('')}</div>
    ${worstH.length ? `<h4>Worst moments</h4><div class="pfhit">${worstH.map(h => `<p><span>${fmtTime(h.t)}</span><b>${Math.round(h.ms)} ms</b><em>${cause(h)}${h.js !== null && h.js !== undefined ? (h.js < h.ms * .4 ? ` · ${Math.round(h.ms - h.js)} ms outside the game code` : h.top && h.top.length ? ` · ${h.top.map(([l, v]) => `${l} ${v.toFixed(0)} ms`).join(', ')}` : '') : ''}</em></p>`).join('')}</div>` : ''}
    ${parts.length ? `<h4>Each part, per frame</h4><div class="pfparts">${parts.map(q => `<p><span>${q.label}</span><b>${q.avg.toFixed(2)} ms</b></p>`).join('')}</div>`
      : `<p class="pfhint">${PERF.mode === 'Full' ? '' : 'For which part of the game costs what, turn on full stats; they measure from then on.'}</p>${PERF.mode === 'Full' ? '' : '<button class="btn alt pfon" id="pfOn">Turn on full stats</button>'}`}`;
}
addEventListener('keydown', e => { if (e.code === 'F3' && !e.repeat) { e.preventDefault(); perfCycle(); } });
addEventListener('load', () => { if ((SETTINGS.perfHud || 'Off') !== 'Off') perfApply(); }); // after every file: all the functions exist

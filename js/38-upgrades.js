/* =========================================================
   UPGRADES + ABILITIES
   Permanent upgrades bought with chips (level-gated). Abilities are plain data: an id, a key, a cooldown, a duration and
   what they do. Every activation also goes out on NET as a small event ({ type, id, t, x, y, a }), so a multiplayer layer
   can later replay the same ability on another player's screen or apply it to a rival snake (hiss stuns, scent reveals).
   ========================================================= */
const NET = { // multiplayer hook: nothing listens yet, but every ability use and break-through is reported here
  listeners: [], log: [],
  emit(e) { e.t = T; this.log.push(e); if (this.log.length > 60) this.log.shift(); for (const f of this.listeners) f(e); },
  on(f) { this.listeners.push(f); },
};
const UPGRADES = [
  { id: 'speed', name: 'Speed Demon', icon: 'speed', max: 5, cost: [150, 380, 750, 1300, 2100], lvl: [2, 5, 9, 14, 20],
    desc: 'Faster, and quicker to recover. You trail speed lines from level III.', tiers: ['+5% speed', '+10% speed, snappier turns', '+15% speed, shake off dazes a third faster, speed lines (until max level)', '+20% speed, even sharper turns', '+25% speed, sharper turns. Smashing through things keeps your momentum, and pressing the opposite way whips you round in a tight U-turn'] },
  { id: 'ram', name: 'Battering Ram', icon: 'ram', max: 4, cost: [300, 850, 1900, 3200], lvl: [4, 10, 16, 22],
    desc: 'Smash through furniture instead of crashing into it. You stagger for a moment after each hit.', tiers: ['Desks, tables, benches, chairs, couches, fences, hay, bushes, crates', 'Also cars, consoles, rocks, speakers and bars', 'Also the cracked wall sections on some maps: shortcuts, but the hit leaves you seeing stars', 'Thick skull: every concussion is 25% shorter and gentler'] },
  { id: 'gut', name: 'Iron Stomach', icon: 'gut', max: 3, cost: [350, 900, 1700], lvl: [7, 13, 19], desc: 'Combos last longer.', tiers: ['+10% combo time', '+20% combo time', '+30% combo time'] },
  { id: 'dash', name: 'Lunge', icon: 'dash', max: 3, cost: [250, 900, 1800], lvl: [3, 12, 18], ability: true, key: 'Shift',
    desc: 'A short burst of speed. Great for catching runners.', tiers: ['0.6 s at 1.8x speed, 7 s cooldown', '0.8 s at 1.9x speed, 5 s cooldown, a cleaner wake', 'Pounce: eat something mid-lunge and the cooldown almost resets, and you keep going'] },
  { id: 'scent', name: 'Scent', icon: 'scent', max: 3, cost: [400, 1100, 2000], lvl: [5, 15, 21], ability: true, key: 'E',
    desc: 'Always tasting the air (E switches it off and on). Wisps drift toward the best meal: big animals close by, golden animals, golden people, and crowds over lone targets. Easy, unaware prey smells strongest. Wisps bump off walls, so you still have to find the way.',
    tiers: ['One trail', 'Wisps are colored by what is at the end, and you see who can spot you', 'Bloodhound: three trails at once, and golden targets always get one'] },
  { id: 'camo', name: 'Camouflage', icon: 'camo', max: 3, cost: [600, 1400, 2400], lvl: [8, 17, 23], ability: true, key: 'Q',
    desc: 'Your scales take on the ground under you. People only notice you up close.', tiers: ['5 s, 20 s cooldown', '8 s, 16 s cooldown, better blending', 'Stillness: hold a straight line and you fade almost completely. Turning breaks it'] },
  { id: 'hiss', name: 'Hiss', icon: 'hiss', max: 3, cost: [700, 1600, 2600], lvl: [11, 18, 24], ability: true, key: 'R',
    desc: 'A blood-curdling hiss you can see rippling out: everything nearby panics and scatters.', tiers: ['190 px radius, 15 s cooldown', 'Wider, and it rattles them: slowed for 4 s, half-deaf and slurring for 10 s', 'Shockwave: the blast knocks people off their feet and blows groups apart'] },
];
PROG.upg = PROG.upg || {}; PROG.upgOff = PROG.upgOff || {};
const upg = id => PROG.upgOff[id] ? 0 : Math.min(PROG.upg[id] || 0, (UPGRADES.find(u => u.id === id) || { max: 9 }).max); // owned and switched on
const ABIL = { // cd/dur read the owned level each time
  dash: { get cd() { return upg('dash') > 1 ? 5 : 7; }, get dur() { return upg('dash') > 1 ? .8 : .6; }, go(s) { s.dashT = this.dur; s.dashK = upg('dash') > 1 ? 1.9 : 1.8; s.lk = Math.max(s.lk || 0, .25); Sfx.dash(); camF.kv.x += Math.cos(s.angle) * 160; camF.kv.y += Math.sin(s.angle) * 160; } },
  scent: { cd: 1, dur: 1, go(s) { s.scentOn = !s.scentOn; if (s.scentOn) Sfx.sniff(); else Sfx.ui && Sfx.ui('off'); } }, // always on; the key switches it off and on again
  camo: { get cd() { return upg('camo') > 1 ? 16 : 20; }, get dur() { return upg('camo') > 1 ? 8 : 5; }, go(s) { s.camoT = this.dur; Sfx.camo(); } },
  hiss: { cd: 15, dur: .8, go(s) {
    const lv = upg('hiss'), R = lv > 2 ? 270 : lv > 1 ? 240 : 190; s.hissLv = lv;
    Sfx.hiss(); shake = Math.max(shake, lv > 1 ? 8 : 5); s.hissT = this.dur; s.hissR = R;
    for (const c of creatures) if (c.alive && dist2(c.x, c.y, s.x, s.y) < R * R) {
      panic(c, s.x, s.y, rand(3, 5) * (lv > 1 ? 1.5 : 1), 'hissed'); c.alert = 1;
      if (lv > 1) { c.slowT = T + 4; c.deafT = T + 10; c.adren = 0; if (c.def.human && !c.def.alien) c.reply = { t: rand(.8, 1.6), ctx: 'deaf' }; }
      if (lv > 2) { const d = Math.hypot(c.x - s.x, c.y - s.y) || 1, f = (1 - d / R) * 260 + 60; c.kb = { vx: (c.x - s.x) / d * f, vy: (c.y - s.y) / d * f, t: .35 }; c.slowT = T + 5; if (typeof leaveGroup === 'function') leaveGroup(c); } // knocked flat, the group blown apart
    }
  } },
};
const abilCD = {};
function useAbility(id) {
  if (!upg(id) || state !== 'play' || !snake || !snake.alive || !snake.started) return;
  const a = ABIL[id]; if ((abilCD[id] || 0) > T) { if (Sfx.ok() && Sfx.gate('deny', .6)) Sfx.deny(); abilityHud(); const b = document.querySelector(`#abil [data-a="${id}"]`); if (b) { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); } return; }
  abilCD[id] = T + a.cd; a.go(snake); run.abil = (run.abil || 0) + 1;
  NET.emit({ type: 'ability', id, x: snake.x, y: snake.y, a: snake.angle });
  abilityHud(true);
}
function resetAbilities() { for (const k in abilCD) delete abilCD[k]; for (const u of UPGRADES) if (u.ability) abilCD[u.id] = T + ABIL[u.id].cd; abilCD.scent = T; if (snake) snake.scentOn = upg('scent') > 0; abilityHud(true); } // every skill starts the round recharging
const speedMult = () => 1 + .05 * upg('speed');
const comboGutMult = () => 1 + .1 * upg('gut');

/* ---- abilities HUD: bottom-center icons with a cooldown sweep ---- */
function abilityHud(rebuild) {
  const el = document.getElementById('abil'); if (!el) return;
  const list = UPGRADES.filter(u => u.ability && upg(u.id));
  if (rebuild || el.dataset.n !== String(list.length)) {
    el.dataset.n = list.length;
    el.innerHTML = list.map(u => `<div class="ab" data-a="${u.id}" data-tip="${u.name} (${u.key}): ${u.tiers[0]}">${upIcon(u.icon)}<i class="cd"></i><kbd>${u.key === 'Shift' ? '⇧' : u.key}</kbd></div>`).join('');
    refreshTouchAbilities();
  }
  for (const u of list) {
    const left = Math.max(0, (abilCD[u.id] || 0) - T), k = left / ABIL[u.id].cd;
    for (const host of [el, document.querySelector('#touch .tabil')]) {
      const b = host && host.querySelector(`[data-a="${u.id}"]`); if (!b) continue;
      b.classList.toggle('ready', k <= 0); b.style.setProperty('--cd', (k * 360).toFixed(0) + 'deg'); if (u.id === 'scent') b.classList.toggle('off', !(snake && snake.scentOn));
    }
  }
}
function refreshTouchAbilities() {
  const host = document.querySelector('#touch .tabil'); if (!host) return;
  host.innerHTML = UPGRADES.filter(u => u.ability && upg(u.id)).map(u => `<button class="tb ab" data-a="${u.id}" data-sfx="none" aria-label="${u.name}">${upIcon(u.icon)}<i class="cd"></i></button>`).join('');
  host.querySelectorAll('[data-a]').forEach(b => b.onpointerdown = e => { e.stopPropagation(); useAbility(b.dataset.a); });
}
function upIcon(k) { // small hand-drawn SVG glyphs, so the upgrades don't lean on emoji
  const P = {
    speed: '<path d="M3 13h7M5 9h8M3 5h6" stroke-width="2"/><path d="M12 4l6 6-6 6" stroke-width="2.4"/>',
    ram: '<path d="M3 10h9" stroke-width="3"/><path d="M12 4v12M15 6l3-2M15 14l3 2M15 10h4" stroke-width="2"/>',
    gut: '<path d="M6 3c-2 4 6 5 3 9s-5 5 1 6 8-3 6-7" stroke-width="2.2"/>',
    dash: '<path d="M2 10h5M4 6h4M4 14h4" stroke-width="1.8"/><path d="M9 4l9 6-9 6 3-6z" stroke-width="1.6" fill="currentColor"/>',
    scent: '<path d="M4 15c3-2 0-5 3-7s1-4 1-4M9 16c3-2 0-5 3-7s1-4 1-4M14 15c3-2 0-5 3-7" stroke-width="1.8"/>',
    camo: '<path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" stroke-width="1.8"/><path d="M4 16L16 4" stroke-width="2.2"/>',
    hiss: '<path d="M3 10c2-3 4-3 6 0s4 3 6 0" stroke-width="2.2"/><path d="M13 5l4-2M13 15l4 2M15 10h3" stroke-width="1.8"/>',
  };
  return `<svg class="upi" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${P[k] || ''}</svg>`;
}

/* ---- breaking through furniture (Battering Ram) ---- */
const RAM_KINDS = [null, new Set(['desk', 'table', 'bench', 'chair', 'couch', 'fence', 'hay', 'bush', 'crate', 'plant', 'shelf', 'bed', 'barrier']),
  new Set(['desk', 'table', 'bench', 'chair', 'couch', 'fence', 'hay', 'bush', 'crate', 'plant', 'shelf', 'bed', 'barrier', 'car', 'console', 'rock', 'speaker', 'bar', 'booth'])];
RAM_KINDS.push(new Set([...RAM_KINDS[2], 'bwall'])); // tier 3: the marked wall sections
RAM_KINDS.push(RAM_KINDS[3]); // tier 4: same targets, softer landings
function obstacleHitBy(x, y, r) {
  for (const o of obstacles) {
    if (o.t === 'r') { const nx = clamp(x, o.x, o.x + o.w), ny = clamp(y, o.y, o.y + o.h); if (dist2(x, y, nx, ny) < r * r) return o; }
    else if (dist2(x, y, o.x, o.y) < (r + o.r) ** 2) return o;
  }
  return null;
}
const canRam = o => { const lv = upg('ram'); return lv > 0 && o && o.kind !== 'border' && RAM_KINDS[lv].has(o.kind) && !(o.kind === 'rock' && o.r > 26); };
function smashObstacle(o, ang) {
  const i = obstacles.indexOf(o); if (i < 0) return;
  obstacles.splice(i, 1);
  const cx = o.t === 'r' ? o.x + o.w / 2 : o.x, cy = o.t === 'r' ? o.y + o.h / 2 : o.y, size = o.t === 'r' ? Math.sqrt(o.w * o.h) : o.r * 1.6;
  drawWreck(bctx, o, ang); // the broken piece stays on the floor as wreckage
  if (o.kind === 'speaker') { const sp = clubSpeakers.find(q => q.o === o); if (sp) { sp.alive = false; Sfx.speakerDie(sp); } }
  for (const q of obstacles) if (q.group && q.group === o.group) q.cracked = true; // the rest of a long object cracks but stands
  for (let k = 0; k < 18 + size / 3; k++) { const a = ang + rand(-1.2, 1.2), sp = rand(60, 230); debris.push({ x: cx + rand(-size / 3, size / 3), y: cy + rand(-size / 3, size / 3), z: rand(4, 16), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(60, 170), t: 0, s: rand(1.6, 3.6), c: pick([o.color, shade(o.color, -.2), shade(o.color, .15)]) }); }
  drawObstacleLayer();
  bakeOutline(); buildSolid(); shadowKey = ''; bakeShadows(); bakeLightMasks({ x: cx, y: cy, r: size });
  const wall = o.kind === 'bwall';
  Sfx.smash(cx, wall ? size * 2.5 : size); shake = Math.max(shake, wall ? 16 : 6);
  const lng = (snake.dashV || 1) > 1.25, dur = (wall ? 4 : 1.3) + (lng ? 1 : 0); // lunging in: it hits harder on screen and lasts longer, but you keep more of your speed
  const res = upg('ram') >= 4 ? .75 : 1; // thick skull
  const keepMo = upg('speed') >= 5 ? .5 : 1; // Speed Demon V: momentum survives the hit
  if (!wall && snake.wallStun > 0) snake.ramT = Math.max(snake.ramT, Math.min(snake.ramMax, dur * res)); // already seeing stars from a wall: furniture doesn't reset it
  else { snake.ramT = snake.ramMax = dur * res; snake.ramDeep = (wall ? .62 : .38) * (lng ? .6 : 1) * res * keepMo; snake.wallStun = snake.wallMax = wall ? dur * res : 0; snake.stunFx = (lng ? 1.5 : 1) * res; }
  if (wall) { snake.dashT = 0; snake.dashV = 1; snake.lk = 0; } // a wall stops a lunge dead // dazed: slower, colours drain, edges blur, all easing back as speed returns
  if (wall) { // a wall: bricks and plaster everywhere, a cloud of dust, and the snake sees stars
    for (let k = 0; k < 40; k++) { const a = ang + rand(-.9, .9), sp = rand(80, 300); debris.push({ x: cx + rand(-o.w / 2, o.w / 2), y: cy + rand(-o.h / 2, o.h / 2), z: rand(6, 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(80, 220), t: 0, s: rand(2.4, 5), c: pick([o.color, shade(o.color, -.25), shade(o.color, .2), '#8a7f74']) }); }
    for (let k = 0; k < 14; k++) mist.push({ x: cx + rand(-10, 10), y: cy + rand(-10, 10), vx: Math.cos(ang + rand(-1.4, 1.4)) * rand(20, 90), vy: Math.sin(ang + rand(-1.4, 1.4)) * rand(20, 90), r: rand(6, 14), g: rand(10, 24), t: 0, life: rand(1, 1.8), c: '#aaa096', a: rand(.25, .4) });
    wallSmoke(cx, cy, ang, o.w, o.h);
    for (const q of obstacles) if (q.bgroup === o.bgroup) q.cracked = true;
    run.walls = (run.walls || 0) + 1;
  }
  for (const c of creatures) if (c.alive && dist2(c.x, c.y, cx, cy) < 230 * 230) {
    if (wall && c.def.human) { panic(c, cx, cy, rand(3, 5), 'wallSmash'); if (Math.random() < .45) c.reply = { t: rand(1.4, 2.6), ctx: 'stunned' }; continue; } // through the WALL
    if (c.state === 'wander' || c.state === 'idle') { c.state = 'uneasy'; c.fx = cx; c.fy = cy; c.timer = rand(1, 2); if (Math.random() < .4) say(c, 'crash'); }
    else if (c.def.human && Math.random() < .35) c.reply = { t: rand(.3, .9), ctx: 'stunned' };
  }
  run.smashed = (run.smashed || 0) + 1; PROG.smashed = (PROG.smashed || 0) + 1;
  NET.emit({ type: 'smash', kind: o.kind, x: cx, y: cy });
}
function drawWreck(x, o, ang) { // a flattened, broken version of the object instead of it vanishing
  if (o.kind === 'speaker') return brokenSpeaker(x, o, ang);
  if (o.kind === 'bwall') return brokenWall(x, o, ang);
  x.save();
  if (o.t === 'r') { x.beginPath(); const r = seeded(Math.round(o.x * 3 + o.y)); x.moveTo(o.x, o.y); for (let k = 1; k <= 8; k++) x.lineTo(o.x + o.w * k / 8, o.y + r() * o.h * .35); x.lineTo(o.x + o.w, o.y + o.h); for (let k = 7; k >= 0; k--) x.lineTo(o.x + o.w * k / 8, o.y + o.h - r() * o.h * .35); x.closePath(); x.clip(); }
  x.globalAlpha = .7; drawObstacle(x, { ...o, cracked: true });
  x.globalAlpha = .45; x.fillStyle = '#1a1210'; if (o.t === 'r') x.fillRect(o.x, o.y, o.w, o.h); else circ(x, o.x, o.y, o.r);
  x.restore();
  const cx = o.t === 'r' ? o.x + o.w / 2 : o.x, cy = o.t === 'r' ? o.y + o.h / 2 : o.y, size = o.t === 'r' ? Math.sqrt(o.w * o.h) : o.r * 1.6;
  x.save(); x.globalAlpha = .6; x.fillStyle = shade(o.color, -.35);
  for (let k = 0; k < 6 + size / 6; k++) { const a = ang + rand(-1.4, 1.4), d = rand(0, size * .9); x.save(); x.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d); x.rotate(rand(0, TAU)); x.fillRect(-rand(2, 6), -1.2, rand(4, 12), rand(1.6, 3)); x.restore(); }
  x.restore();
}
function splitBreakables(list) { // long furniture breaks a section at a time, not all at once
  const out = [];
  let g = 0;
  for (const o of list) {
    const L = Math.max(o.w || 0, o.h || 0);
    if (o.t !== 'r' || !RAM_KINDS[2].has(o.kind) || L < 110 || o.kind === 'desk') { out.push(o); continue; }
    const hz = o.w >= o.h, n = Math.ceil(L / 64), step = L / n; g++;
    for (let k = 0; k < n; k++) out.push(hz ? { ...o, x: o.x + k * step, w: step, group: g } : { ...o, y: o.y + k * step, h: step, group: g });
  }
  return out;
}
function outlineBreakables(x) { // with the Battering Ram, everything you can smash wears an amber dashed edge
  if (!upg('ram')) return;
  x.save(); x.strokeStyle = 'rgba(255,186,70,.75)'; x.lineWidth = 1.4; x.setLineDash([4, 3]);
  for (const o of obstacles) if (canRam(o)) { x.beginPath(); if (o.t === 'r') x.rect(o.x - 1.5, o.y - 1.5, o.w + 3, o.h + 3); else x.arc(o.x, o.y, o.r + 1.5, 0, TAU); x.stroke(); }
  x.restore();
}

/* ---- upgrades screen ---- */
function showUpgrades() {
  overlay.className = 'menuMode';
  overlay.innerHTML = `<div class="panel upg"><div class="chhead"><h1>Upgrades</h1><span class="coinpill"><i class="pc"></i> ${PROG.coins}</span></div>
    <p class="lead">Permanent upgrades, bought with chips and unlocked by level. Owned upgrades can be switched off any time. You're level ${PROG.level}.</p>
    <div class="upgrid">${UPGRADES.map((u, i) => upCard(u, i)).join('')}</div>
    <div class="mbtns"><span class="upmsg" id="upmsg"></span><button class="btn" id="backBtn" data-sfx="close">Done</button></div></div>`;
  overlay.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buyUpgrade(b.dataset.buy));
  overlay.querySelectorAll('[data-off]').forEach(b => b.onclick = () => { const id = b.dataset.off; PROG.upgOff[id] = !PROG.upgOff[id]; Sfx.ui(PROG.upgOff[id] ? 'off' : 'on'); saveProg(); showUpgrades(); });
  document.getElementById('backBtn').onclick = () => transitionTo(showMenu);
}
function upCard(u, i) {
  const lv = PROG.upg[u.id] || 0, next = lv < u.max ? lv : -1, off = !!PROG.upgOff[u.id];
  const need = next >= 0 ? u.lvl[next] : 0, cost = next >= 0 ? u.cost[next] : 0, lockedLv = next >= 0 && PROG.level < need, poor = next >= 0 && PROG.coins < cost;
  const pips = Array.from({ length: u.max }, (_, k) => `<i class="${k < lv ? 'on' : ''}${k === lv - 1 ? ' last' : ''}"></i>`).join('');
  return `<div class="upc ${lv ? 'own' : ''} ${off ? 'off' : ''}" style="--i:${i}"><div class="uph"><span class="upicon">${upIcon(u.icon)}</span><div><b>${u.name}</b>${u.ability ? `<em class="ukey">${u.key}</em>` : ''}<small>${u.desc}</small></div></div>
    <ul class="uptiers">${u.tiers.map((t, k) => `<li class="${k < lv ? 'got' : k === next ? 'next' : ''}">${t}</li>`).join('')}</ul>
    <div class="upf"><span class="pips">${pips}</span>${lv ? `<button class="tgl sm ${off ? '' : 'on'}" data-off="${u.id}" data-sfx="none" role="switch" aria-checked="${!off}" data-tip="${off ? 'Switched off' : 'Switched on'}"></button>` : ''}
    ${next >= 0 ? `<button class="btn ${lockedLv || poor ? 'alt' : ''}" data-buy="${u.id}" data-sfx="none" ${lockedLv ? 'disabled' : ''}>${lockedLv ? `Level ${need}` : `<i class="pc"></i> ${cost}`}</button>` : '<span class="maxed">Maxed</span>'}</div></div>`;
}
function buyUpgrade(id) {
  const u = UPGRADES.find(q => q.id === id), lv = PROG.upg[id] || 0; if (lv >= u.max) return;
  const msg = document.getElementById('upmsg');
  if (PROG.level < u.lvl[lv]) { Sfx.deny(); msg.textContent = `Reach level ${u.lvl[lv]} first.`; return; }
  if (PROG.coins < u.cost[lv]) { Sfx.deny(); msg.textContent = `You need ${u.cost[lv] - PROG.coins} more chips.`; return; }
  PROG.coins -= u.cost[lv]; PROG.upg[id] = lv + 1; PROG.upgOff[id] = false; saveProg(); updateHud(); Sfx.buy(); setTimeout(() => Sfx.levelUp && Sfx.levelUp(), 120);
  overlay.querySelectorAll('.upgrid .upc').forEach((el, i) => { // redraw the cards in place: only the one you bought celebrates
    const q = UPGRADES[i], t = document.createElement('div'); t.innerHTML = upCard(q, i); const nc = t.firstElementChild;
    nc.classList.add(q.id === id ? 'leveled' : 'still'); el.replaceWith(nc);
  });
  overlay.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buyUpgrade(b.dataset.buy));
  overlay.querySelectorAll('[data-off]').forEach(b => b.onclick = () => { const q = b.dataset.off; PROG.upgOff[q] = !PROG.upgOff[q]; Sfx.ui(PROG.upgOff[q] ? 'off' : 'on'); saveProg(); showUpgrades(); });
  const cp = overlay.querySelector('.coinpill'); if (cp) { cp.innerHTML = `<i class="pc"></i> ${PROG.coins}`; cp.classList.remove('spent'); void cp.offsetWidth; cp.classList.add('spent'); }
  const m = document.getElementById('upmsg'); if (m) m.textContent = `${u.name} ${u.max > 1 ? ['I', 'II', 'III', 'IV', 'V'][lv] + ' ' : ''}unlocked: ${u.tiers[lv]}`;
}
const upgradeReady = () => UPGRADES.some(u => { const lv = PROG.upg[u.id] || 0; return lv < u.max && PROG.level >= u.lvl[lv] && PROG.coins >= u.cost[lv]; }); // something you can buy right now

function canSeeSnake(c) {
  const s = snake, d = Math.hypot(c.x - s.x, c.y - s.y), sight = c.def.sight * (MOD.skittish ? 1.5 : MOD.oblivious ? .6 : 1) * (s.camoT > 0 ? .25 - (upg('camo') > 2 ? .15 * (s.still || 0) : 0) : 1);
  return d < 40 || (d < sight && lightAt(s.x, s.y) > VISIBLE && los(c.x, c.y, s.x, s.y));
}
/* ---- Scent: wisps drift from your head toward the best meals; brighter and thicker the closer you get ---- */
let wisps = [];
function scentTargets(s, n) { // what's worth hunting: big and close first, gold animals, gold people, and a crowd beats a loner
  const out = [];
  for (const c of creatures) {
    if (!c.alive || c.def.fly || c.def.glow) continue;
    const d = Math.hypot(c.x - s.x, c.y - s.y);
    let val = c.def.human ? 2 : (c.def.score || 1) * (1 + c.def.r / 12); // bigger animals are a bigger meal
    if (c.golden) val *= c.def.human ? 5 : 4; // gold people above gold animals
    if (c.def.human) { let g = 0; for (const o of creatures) if (o !== c && o.alive && o.def.human && dist2(o.x, o.y, c.x, c.y) < 70 * 70) g++; val *= 1 + g * .45; } // a group means a combo
    if (c.state === 'wander' || c.state === 'idle') val *= 1.3; else if (c.state === 'panic') val *= .75; // unaware prey smells strongest; runners are harder
    if (c.fl && c.fl.on) val *= .85; // flashlights spot you first
    out.push({ c, d, sc: val / (d + 90) });
  }
  out.sort((a, b) => b.sc - a.sc); const top = out.slice(0, n);
  if (n > 1) for (const g of out) if (g.c.golden && !top.includes(g)) top.push(g); // bloodhound: gold always gets a trail
  return top;
}
const wispCol = c => c.golden ? '255,214,70' : c.def.alien ? '140,255,120' : c.def.human ? '255,120,110' : '150,235,255';
function updateScent(dt) {
  const s = snake;
  for (let i = wisps.length - 1; i >= 0; i--) { // they float toward the scent, but walls turn them aside
    const w = wisps[i]; w.t += dt; if (w.t > w.life || !w.c.alive) { wisps.splice(i, 1); continue; }
    const want = Math.atan2(w.c.y - w.y, w.c.x - w.x) + perlin(w.x * .02, w.y * .02 + T) * 1.1;
    w.a += angDiff(w.a, want) * Math.min(1, dt * 3);
    const nx = w.x + Math.cos(w.a) * w.sp * dt, ny = w.y + Math.sin(w.a) * w.sp * dt;
    if (solid(nx, ny)) w.a += (Math.random() < .5 ? -1 : 1) * 1.6; else { w.x = nx; w.y = ny; }
    w.pts.push(w.x, w.y); if (w.pts.length > 16) w.pts.splice(0, 2);
  }
  if (!s || !s.scentOn || !upg('scent') || state !== 'play') return;
  const lv = upg('scent');
  for (const g of scentTargets(s, lv > 2 ? 3 : 1)) {
    const close = clamp(1 - g.d / 650, .15, 1);
    if (Math.random() > dt * (5 + 14 * close) * Math.min(1, FX_K())) continue; // more of them, the closer you are
    const a = Math.atan2(g.c.y - s.y, g.c.x - s.x) + rand(-.6, .6);
    wisps.push({ c: g.c, x: s.x + Math.cos(a) * 10, y: s.y + Math.sin(a) * 10, a, sp: rand(55, 90), t: 0, life: rand(.9, 1.5) * (.6 + close * .6), k: close, col: lv > 1 ? wispCol(g.c) : '230,220,200', pts: [] });
  }
}
function drawScent(x) {
  const s = snake; if (!s) return;
  x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
  for (const w of wisps) { // soft curling threads
    const f = Math.min(1, w.t * 4) * (1 - w.t / w.life), P = w.pts; if (P.length < 4) continue;
    x.strokeStyle = `rgba(${w.col},${(.3 + .5 * w.k) * f})`; x.lineWidth = 1.4 + 2.6 * w.k * f;
    x.beginPath(); x.moveTo(P[0], P[1]); for (let i = 2; i < P.length; i += 2) x.lineTo(P[i], P[i + 1]); x.stroke();
  }
  if (s.scentOn && upg('scent') > 1) { // who can see you right now
    const k = .8; x.lineWidth = 1.4;
    for (const c of creatures) {
      if (!c.alive || !c.def.human) continue;
      const scared = c.state === 'panic' || c.state === 'flee', sees = !scared && canSeeSnake(c); if (!sees) continue;
      x.strokeStyle = `rgba(255,70,60,${.8 * k})`; x.beginPath(); x.arc(c.x, c.y, c.def.r + 6 + Math.sin(T * 6 + (c.seed ?? .5) * 20) * 1.2, 0, TAU); x.stroke();
      x.fillStyle = `rgba(255,70,60,${.1 * k})`; x.beginPath(); x.moveTo(c.x, c.y); x.arc(c.x, c.y, Math.min(90, c.def.sight * .6), c.a - .6, c.a + .6); x.closePath(); x.fill();
    }
  }
  x.restore();
}
/* ---- Hiss: a visible soundwave rolling out; Battering Ram: a pressure wedge at the head just before impact ---- */
function drawHissWave(x) {
  const s = snake; if (!s || !(s.hissT > 0)) return;
  const p = 1 - s.hissT / ABIL.hiss.dur, R = s.hissR || 190;
  for (let k = 0; k < 3; k++) { const q = p - k * .12; if (q <= 0 || q >= 1) continue;
    const r = R * (1 - Math.pow(1 - q, 2.2)), al = (1 - q) * (s.hissLv > 2 ? .5 : .35);
    x.strokeStyle = `rgba(230,255,220,${al})`; x.lineWidth = (s.hissLv > 2 ? 5 : 3) * (1 - q) + 1; x.beginPath();
    for (let a = 0; a <= TAU + .01; a += TAU / 48) { const wob = Math.sin(a * 9 + T * 30) * 2.2 * (1 - q); x.lineTo(s.x + Math.cos(a) * (r + wob), s.y + Math.sin(a) * (r + wob)); } x.stroke(); }
}
function drawRamCharge(x) {
  const s = snake; if (!s || !s.alive || !upg('ram') || state !== 'play') return;
  const ca = Math.cos(s.angle), sa = Math.sin(s.angle), o = obstacleHitBy(s.x + ca * 22, s.y + sa * 22, CONFIG.snakeR * .8);
  s.ramGlow = (s.ramGlow || 0) + (((o && canRam(o)) ? 1 : 0) - (s.ramGlow || 0)) * .3;
  if (s.ramGlow < .03) return;
  const g = s.ramGlow, hx = s.x + ca * 9, hy = s.y + sa * 9; // a bow wave of force bunching up ahead of the head
  x.save(); x.translate(hx, hy); x.rotate(s.angle);
  for (let k = 0; k < 3; k++) { x.strokeStyle = `rgba(255,${200 - k * 40},120,${(.55 - k * .15) * g})`; x.lineWidth = 2.4 - k * .6; x.beginPath(); x.arc(-4 - k * 3, 0, 9 + k * 3.5, -.9, .9); x.stroke(); }
  x.restore();
}
let clubSpeakers = []; // the club's music comes out of these; set up on map load
function setupSpeakers() { clubSpeakers = MAPS[mapIdx].club ? obstacles.filter(o => o.kind === 'speaker').map(o => ({ o, x: o.x + o.w / 2, y: o.y + o.h / 2, alive: true })) : []; if (Sfx.mus) { Sfx.mus.g.disconnect(); Sfx.mus = null; } }
function brokenSpeaker(x, o, ang) { // still standing, but gutted: cones blown out, box split, wires hanging
  const X = o.x, Y = o.y, w = o.w, h = o.h, r = seeded(Math.round(X * 7 + Y));
  x.save(); x.translate(X + w / 2, Y + h / 2); x.rotate((r() - .5) * .12); x.translate(-w / 2, -h / 2);
  x.fillStyle = '#0d0b10'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2a2630'; x.lineWidth = 2; x.strokeRect(1, 1, w - 2, h - 2);
  const big = Math.min(w, h) * .32, cones = h >= w ? [[w / 2, h * .3], [w / 2, h * .72]] : [[w * .3, h / 2], [w * .72, h / 2]];
  for (const [cx, cy] of cones) {
    x.fillStyle = '#050406'; circ(x, cx, cy, big); // the hole where the cone was
    x.fillStyle = '#3a3440'; for (let k = 0; k < 5; k++) { const a = r() * TAU; x.beginPath(); x.moveTo(cx + Math.cos(a) * big, cy + Math.sin(a) * big); x.lineTo(cx + Math.cos(a + .35) * big, cy + Math.sin(a + .35) * big); x.lineTo(cx + Math.cos(a + .17) * big * .35, cy + Math.sin(a + .17) * big * .35); x.fill(); } // torn flaps
    x.strokeStyle = '#6a5a3a'; x.lineWidth = .8; x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(cx + 6, cy + 4, cx + 3 + r() * 6, cy + big + 4); x.stroke(); // a dangling wire
  }
  x.strokeStyle = 'rgba(160,150,170,.35)'; x.lineWidth = 1; x.beginPath(); let px = r() * w, py = 0; x.moveTo(px, py); while (py < h) { px += (r() - .5) * 10; py += 6 + r() * 6; x.lineTo(px, py); } x.stroke(); // split down the cabinet
  x.restore();
  x.fillStyle = 'rgba(20,16,22,.6)'; for (let k = 0; k < 10; k++) { const a = ang + rand(-1.2, 1.2), d = rand(4, 26); circ(x, X + w / 2 + Math.cos(a) * d, Y + h / 2 + Math.sin(a) * d, rand(.8, 2)); }
}

/* ---- tier 3 ram: authored wall sections that can be smashed open (shortcuts and escape routes) ---- */
const BREAK_WALLS = {
  Office: [[560, 326, 60, 14], [706, 362, 14, 52], [690, 236, 52, 14]],
  'Alien Facility': [[316, 110, 14, 60], [520, 384, 60, 14], [470, 480, 14, 60]],
  'Space Station': [[250, 46, 14, 54], [840, 436, 60, 14], [80, 190, 56, 14]],
  Bunker: [[330, 120, 14, 60], [330, 370, 60, 14], [700, 470, 14, 60]],
};
function addBreakWalls(list, mapName) { // cut each marked section out of the wall it sits in, as its own breakable piece
  let secs = BREAK_WALLS[mapName] || [];
  if (mapName === 'Maze') { // three hedge sections, picked the same way every time
    const r = seeded(4242), cand = list.filter(o => o.t === 'r' && o.kind === 'hedge' && Math.max(o.w, o.h) >= 90 && o.x > 40 && o.y > 40 && o.x + o.w < W - 40 && o.y + o.h < H - 40);
    secs = []; for (let k = 0; k < 3 && cand.length; k++) { const o = cand.splice(Math.floor(r() * cand.length), 1)[0], hz = o.w >= o.h, L = hz ? o.w : o.h, a = Math.round((L - 44) / 2); secs.push(hz ? [o.x + a, o.y, 44, o.h] : [o.x, o.y + a, o.w, 44]); }
  }
  let g = 0;
  for (const [x, y, w, h] of secs) {
    const i = list.findIndex(o => o.t === 'r' && o.kind !== 'bwall' && x >= o.x - .5 && y >= o.y - .5 && x + w <= o.x + o.w + .5 && y + h <= o.y + o.h + .5); if (i < 0) continue;
    const o = list[i], id = 'bw' + g++; list.splice(i, 1);
    const parts = o.w >= o.h ? [[o.x, o.y, x - o.x, o.h], [x + w, o.y, o.x + o.w - x - w, o.h]] : [[o.x, o.y, o.w, y - o.y], [o.x, y + h, o.w, o.y + o.h - y - h]];
    for (const [px, py, pw, ph] of parts) if (pw > 1 && ph > 1) list.push({ ...o, x: px, y: py, w: pw, h: ph, bgroup: id });
    list.push({ ...o, x, y, w, h, kind: 'bwall', base: o.kind, bgroup: id });
  }
  return list;
}
function drawBreakWall(x, o) { // the same wall, but you can see it's weak: patched bricks and a long crack
  const X = o.x, Y = o.y, w = o.w, h = o.h, hz = w >= h, r = seeded(Math.round(X * 3 + Y * 7));
  if (o.base === 'hedge') { x.fillStyle = shade(o.color, -.28); x.fillRect(X, Y, w, h); x.fillStyle = shade(o.color, -.05); for (let k = 0; k < 6; k++) circ(x, X + r() * w, Y + r() * h, Math.min(w, h) * .35); x.fillStyle = 'rgba(70,45,25,.6)'; for (let k = 0; k < 4; k++) x.fillRect(X + r() * w, Y + r() * h, 2, 2); }
  else {
    x.fillStyle = shade(o.color, -.06); x.fillRect(X, Y, w, h);
    x.strokeStyle = shade(o.color, -.28); x.lineWidth = .8; x.beginPath(); // brick courses
    if (hz) { for (let yy = Y + 4.5; yy < Y + h; yy += 4.5) { x.moveTo(X, yy); x.lineTo(X + w, yy); } for (let xx = X + 7; xx < X + w; xx += 10) { x.moveTo(xx, Y); x.lineTo(xx, Y + h); } }
    else { for (let xx = X + 4.5; xx < X + w; xx += 4.5) { x.moveTo(xx, Y); x.lineTo(xx, Y + h); } for (let yy = Y + 7; yy < Y + h; yy += 10) { x.moveTo(X, yy); x.lineTo(X + w, yy); } }
    x.stroke();
  }
  x.strokeStyle = 'rgba(20,12,10,.75)'; x.lineWidth = 1.1; x.beginPath(); let px = X + (hz ? 3 : w / 2), py = Y + (hz ? h / 2 : 3); x.moveTo(px, py);
  while (hz ? px < X + w - 3 : py < Y + h - 3) { if (hz) { px += 5 + r() * 5; py = Y + h / 2 + (r() - .5) * h * .8; } else { py += 5 + r() * 5; px = X + w / 2 + (r() - .5) * w * .8; } x.lineTo(px, py); }
  x.stroke();
}
function brokenWall(x, o, ang) { // a gap with jagged ends and rubble spilling out the far side
  const X = o.x, Y = o.y, w = o.w, h = o.h, hz = w >= h, r = seeded(Math.round(X + Y * 5));
  x.save(); x.fillStyle = 'rgba(40,32,28,.35)'; x.fillRect(X, Y, w, h); // the scar where it stood
  x.fillStyle = shade(o.color, -.15);
  for (const end of [0, 1]) for (let k = 0; k < 4; k++) { const s = 2 + r() * 5; hz ? x.fillRect(X + (end ? w - s - 1 : 1), Y + r() * (h - 3), s, 3) : x.fillRect(X + r() * (w - 3), Y + (end ? h - s - 1 : 1), 3, s); } // broken stubs at each end
  for (let k = 0; k < 34; k++) { const a = ang + (r() - .5) * 2.2, d = r() * 34, cx = X + w / 2 + Math.cos(a) * d, cy = Y + h / 2 + Math.sin(a) * d; x.fillStyle = pick([o.color, shade(o.color, -.25), shade(o.color, .15), '#8a7f74']); x.save(); x.translate(cx, cy); x.rotate(r() * TAU); x.fillRect(-2, -1.5, 3 + r() * 4, 2 + r() * 2.5); x.restore(); }
  x.fillStyle = 'rgba(200,190,180,.18)'; for (let k = 0; k < 6; k++) circ(x, X + w / 2 + Math.cos(ang) * r() * 30 + (r() - .5) * 20, Y + h / 2 + Math.sin(ang) * r() * 30 + (r() - .5) * 20, 6 + r() * 8); // plaster dust
  x.restore();
}

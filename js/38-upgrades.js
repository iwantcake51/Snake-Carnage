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
  { id: 'speed', name: 'Muscle', icon: 'speed', max: 3, cost: [150, 420, 950], lvl: [2, 6, 12],
    desc: 'Move faster.', tiers: ['+6% speed', '+12% speed', '+18% speed'] },
  { id: 'ram', name: 'Battering Ram', icon: 'ram', max: 2, cost: [300, 850], lvl: [4, 10],
    desc: 'Smash through furniture instead of crashing into it.', tiers: ['Desks, tables, benches, chairs, couches, fences, hay, bushes, crates', 'Also cars, consoles, rocks, speakers and bars'] },
  { id: 'gut', name: 'Iron Stomach', icon: 'gut', max: 2, cost: [350, 900], lvl: [7, 14],
    desc: 'Combos last longer.', tiers: ['+10% combo time', '+20% combo time'] },
  { id: 'dash', name: 'Lunge', icon: 'dash', max: 1, cost: [250], lvl: [3], ability: true, key: 'Shift',
    desc: 'A short burst of speed. Great for catching runners.', tiers: ['0.6 s at 1.8x speed, 7 s cooldown'] },
  { id: 'scent', name: 'Scent', icon: 'scent', max: 1, cost: [400], lvl: [5], ability: true, key: 'E',
    desc: 'Smell every target on the map, even through fog and darkness.', tiers: ['Reveals everything for 6 s, 22 s cooldown'] },
  { id: 'camo', name: 'Camouflage', icon: 'camo', max: 1, cost: [600], lvl: [8], ability: true, key: 'Q',
    desc: 'Blend into the ground. People only notice you up close.', tiers: ['5 s, 20 s cooldown'] },
  { id: 'hiss', name: 'Hiss', icon: 'hiss', max: 1, cost: [700], lvl: [11], ability: true, key: 'R',
    desc: 'A blood-curdling hiss: everything nearby panics and scatters.', tiers: ['190 px radius, 15 s cooldown'] },
];
PROG.upg = PROG.upg || {}; PROG.upgOff = PROG.upgOff || {};
const upg = id => PROG.upgOff[id] ? 0 : (PROG.upg[id] || 0); // owned and switched on
const ABIL = {
  dash: { cd: 7, dur: .6, go(s) { s.dashT = this.dur; Sfx.dash(); camF.kv.x += Math.cos(s.angle) * 160; camF.kv.y += Math.sin(s.angle) * 160; } },
  scent: { cd: 22, dur: 6, go(s) { s.scentT = this.dur; Sfx.sniff(); } },
  camo: { cd: 20, dur: 5, go(s) { s.camoT = this.dur; Sfx.camo(); } },
  hiss: { cd: 15, dur: .8, go(s) {
    Sfx.hiss(); shake = Math.max(shake, 5); s.hissT = this.dur;
    for (const c of creatures) if (c.alive && dist2(c.x, c.y, s.x, s.y) < 190 * 190) { panic(c, s.x, s.y, rand(3, 5), 'hissed'); c.alert = 1; }
  } },
};
const abilCD = {};
function useAbility(id) {
  if (!upg(id) || state !== 'play' || !snake || !snake.alive || !snake.started) return;
  const a = ABIL[id]; if ((abilCD[id] || 0) > T) { Sfx.deny(); return; }
  abilCD[id] = T + a.cd; a.go(snake); run.abil = (run.abil || 0) + 1;
  NET.emit({ type: 'ability', id, x: snake.x, y: snake.y, a: snake.angle });
  abilityHud(true);
}
function resetAbilities() { for (const k in abilCD) delete abilCD[k]; abilityHud(true); }
const speedMult = () => 1 + .06 * upg('speed');
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
      b.classList.toggle('ready', k <= 0); b.style.setProperty('--cd', (k * 360).toFixed(0) + 'deg');
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
  bctx.save(); bctx.globalAlpha = .55; bctx.fillStyle = shade(o.color, -.35); // splintered remains stay on the floor
  for (let k = 0; k < 6 + size / 6; k++) { const a = ang + rand(-1.4, 1.4), d = rand(0, size * .9); bctx.save(); bctx.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d); bctx.rotate(rand(0, TAU)); bctx.fillRect(-rand(2, 6), -1.2, rand(4, 12), rand(1.6, 3)); bctx.restore(); }
  bctx.restore();
  for (let k = 0; k < 18 + size / 3; k++) { const a = ang + rand(-1.2, 1.2), sp = rand(60, 230); debris.push({ x: cx + rand(-size / 3, size / 3), y: cy + rand(-size / 3, size / 3), z: rand(4, 16), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(60, 170), t: 0, s: rand(1.6, 3.6), c: pick([o.color, shade(o.color, -.2), shade(o.color, .15)]) }); }
  drawObstacleLayer();
  bakeOutline(); buildSolid(); shadowKey = ''; bakeShadows(); bakeLightMasks();
  Sfx.smash(cx, size); shake = Math.max(shake, 6); snake.ramT = .25;
  for (const c of creatures) if (c.alive && dist2(c.x, c.y, cx, cy) < 230 * 230 && (c.state === 'wander' || c.state === 'idle')) { c.state = 'uneasy'; c.fx = cx; c.fy = cy; c.timer = rand(1, 2); if (Math.random() < .5) say(c, 'crash'); }
  run.smashed = (run.smashed || 0) + 1; PROG.smashed = (PROG.smashed || 0) + 1;
  NET.emit({ type: 'smash', kind: o.kind, x: cx, y: cy });
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
  const pips = Array.from({ length: u.max }, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('');
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
  PROG.coins -= u.cost[lv]; PROG.upg[id] = lv + 1; PROG.upgOff[id] = false; saveProg(); updateHud(); Sfx.buy();
  showUpgrades();
  const m = document.getElementById('upmsg'); if (m) m.textContent = `${u.name} ${u.max > 1 ? ['I', 'II', 'III'][lv] + ' ' : ''}unlocked.`;
}
const upgradeReady = () => UPGRADES.some(u => { const lv = PROG.upg[u.id] || 0; return lv < u.max && PROG.level >= u.lvl[lv] && PROG.coins >= u.cost[lv]; }); // something you can buy right now

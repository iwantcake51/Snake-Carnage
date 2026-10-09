/* =========================================================
   ADMIN PANEL: change things in the game while it runs. ` (backquote) or F10 opens and closes it.
   Player   god mode (nothing kills you), no cooldowns, speed, grow, size
   World    time of day (or let the clock run), spawn anything near you (or a golden one), panic everyone, kill
            everyone nearby, clear the crowd
   Air      a bomb ahead of you, a salvo, a strafing run, a bombing run, a cluster bomb, an incendiary, a barrage, air raid on/off
   Progress chips, a level, the whole skill tree maxed (these are saved)
   In multiplayer only the host can use it (the host's world is everyone's); guests see it greyed out.
   ========================================================= */
const ADMIN = { open: false, god: false, noCD: false, speedK: 1, sizeK: 1, tod: null };
const adminOK = () => !NETM.run || NETM.host; // single player, or the host
const adminSnake = () => snake && snake.alive && (state === 'play' || state === 'ready' || state === 'held') ? snake : null;

/* ---- hooks: god mode, no cooldowns, a fixed hour ---- */
const _admDie = die;
die = function () { // god mode: a wall or the map's edge bounces you back instead, and your own tail is nothing
  if (ADMIN.god && snake && adminOK()) { if (crashHit && crashHit.o) { const h = snake.hist[2] || snake.hist[1] || snake.hist[0]; if (h) { snake.x = h.x; snake.y = h.y; } snake.angle = snake.dir = snake.angle + Math.PI; shake = Math.max(shake, 6); } crashHit = null; return; }
  return _admDie.apply(this, arguments); };
const _admBomb = bombDeath;
bombDeath = function () { if (ADMIN.god && adminOK()) return; return _admBomb.apply(this, arguments); };
const _admTime = updateTime;
updateTime = function (dt) { if (ADMIN.tod === null || !adminOK()) return _admTime.apply(this, arguments); const mn = MOD.night, tm = SETTINGS.timeMode, ch = SETTINGS.customHour; MOD.night = false; SETTINGS.timeMode = 'Custom'; SETTINGS.customHour = ADMIN.tod; try { return _admTime.apply(this, arguments); } finally { MOD.night = mn; SETTINGS.timeMode = tm; SETTINGS.customHour = ch; } }; // the hour you set, with the light, shadows and lamps all following it
function adminTick() { // every frame (from the render loop): keep the overrides applied
  if (!adminOK()) return;
  if (ADMIN.noCD) for (const k in abilCD) abilCD[k] = 0;
  const s = adminSnake(); if (!s) return;
  if (s.__base === undefined) s.__base = s.speed;
  const want = s.__base * ADMIN.speedK; if (Math.abs(s.speed - want) > .01) s.speed = want;
}

/* ---- actions ---- */
const ADM_ACT = {
  grow(n) { const s = adminSnake(); if (!s) return; s.len = Math.max(3, s.len + n); while (s.stains && s.stains.length < s.len) s.stains.push([]); },
  spawn(type, n, golden) {
    const s = adminSnake(); if (!s || !TYPES[type]) return;
    for (let k = 0; k < n; k++) { const before = creatures.length; spawn(type, { x: clamp(s.x - 220, 30, W - 470), y: clamp(s.y - 220, 30, H - 470), w: 440, h: 440 });
      const c = creatures[creatures.length - 1]; if (golden && creatures.length > before && c) c.golden = true; }
  },
  panic() { const s = adminSnake() || snake; if (!s) return; for (const c of creatures) if (c.alive) panic(c, s.x, s.y, rand(4, 7), 'none'); },
  killNear() { const s = adminSnake(); if (!s) return; const hit = creatures.filter(c => c.alive && Math.hypot(c.x - s.x, c.y - s.y) < 320);
    for (const c of hit) { const a = Math.atan2(c.y - s.y, c.x - s.x), amt = c.def.blood; eatWorld(c, a, amt, null); if (NETM.run) netKillEvent(c, 'air', a, amt); }
    creatures = creatures.filter(c => c.alive); },
  clear() { for (const c of creatures) if (!(c.def && c.def.fly)) c.alive = false; creatures = creatures.filter(c => c.alive); }, // (co-op: the host's sync tells everyone they're gone)
  bomb() { const s = adminSnake(); if (!s) return; const sp = s.speed * (s.dashV || 1), x = clamp(s.x + Math.cos(s.angle) * sp * 1.6, 30, W - 30), y = clamp(s.y + Math.sin(s.angle) * sp * 1.6, 30, H - 30);
    const ja = +(s.angle + 1.4).toFixed(3); airStrike(Math.round(x), Math.round(y), 2, AIR_R, ja); netEmit({ t: 'air', x: Math.round(x), y: Math.round(y), w: 2, r: AIR_R, j: ja, h: Math.round(netNow()) }); },
  salvo() { const s = adminSnake(); if (!s) return; airSalvo(s, 1); },
  special(kd) { const s = adminSnake(); if (!s) return; const sp = s.speed * (s.dashV || 1), x = Math.round(clamp(s.x + Math.cos(s.angle) * sp * 1.6, 30, W - 30)), y = Math.round(clamp(s.y + Math.sin(s.angle) * sp * 1.6, 30, H - 30)), sd = randi(1, 2 ** 30), r = kd === 'i' ? Math.round(AIR_R * .8) : AIR_R, ja = +(s.angle + 1.4).toFixed(3);
    airStrike(x, y, 2, r, ja, .5, undefined, kd, sd); netEmit({ t: 'air', x, y, w: 2, r, j: ja, f: .5, kd, sd, h: Math.round(netNow()) }); },
  barrage() { const s = adminSnake(); if (s) barrage(s, .6); },
  cluster() { ADM_ACT.special('c'); }, incendiary() { ADM_ACT.special('i'); },
  strafe() { const s = adminSnake(); if (s) strafeRun(s, .5, 'guns'); },
  bombRun() { const s = adminSnake(); if (s) strafeRun(s, .6, 'bombs'); },
  airRaid(on) { MOD.airRaid = on; if (on && !AIR.warned) AIR.nextT = 0; },
  chips(n) { PROG.coins += n; PROG.earned = (PROG.earned || 0) + n; saveProg(); typeof updateHud === 'function' && updateHud(); },
  level() { gainXP(Math.max(1, Math.ceil((xpNeed(PROG.level) - PROG.xp) / XP_GAIN)), 0); saveProg(); },
  maxUpg() { for (const n of SKILL_TREE) { PROG.tree[n.id] = n.max; delete PROG.treeOff[n.id]; } saveProg(); if (state !== 'menu') { resetAbilities(); abilityHud(true); refreshTouchAbilities(); } },
};

/* ---- the panel ---- */
function adminToggle(on = !ADMIN.open) {
  ADMIN.open = on; let el = document.getElementById('admin');
  if (!on) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'admin'; document.body.appendChild(el);
    for (const ev of ['pointerdown', 'pointermove', 'wheel', 'keydown', 'keyup']) el.addEventListener(ev, e => { e.stopPropagation(); }, ev === 'wheel' ? { passive: true } : false); } // the game doesn't steer or zoom through it (added once, not on every redraw)
  adminRender();
}
function adminRender() {
  const el = document.getElementById('admin'); if (!el) return;
  const ok = adminOK(), types = Object.keys(TYPES).filter(t => !TYPES[t].fly), sel = ADMIN.spawnType || 'human';
  const tg = (k, label, tip) => `<label class="adm-tg" title="${tip}"><input type="checkbox" data-tg="${k}" ${ADMIN[k] ? 'checked' : ''}><span>${label}</span></label>`;
  el.innerHTML = `<div class="adm-h"><b>Admin</b><span>${ok ? (NETM.run ? 'host' : 'single player') : 'host only in multiplayer'}</span><button data-a="close" title="Close (\` or F10)">✕</button></div>
    <div class="adm-b ${ok ? '' : 'off'}">
      <h4>Player</h4>
      <div class="adm-row">${tg('god', 'God mode', 'Nothing kills you: walls, bombs, rounds')}${tg('noCD', 'No cooldowns', 'Skills are always ready')}</div>
      <label class="adm-sl">Speed <input type="range" min="0.3" max="3" step="0.05" value="${ADMIN.speedK}" data-sl="speedK"><em>${ADMIN.speedK.toFixed(2)}x</em></label>
      <div class="adm-row"><button data-a="grow" data-n="10">Grow +10</button><button data-a="grow" data-n="50">Grow +50</button><button data-a="grow" data-n="-10">Shrink −10</button></div>
      <h4>World</h4>
      <label class="adm-sl">Time <input type="range" min="0" max="23.9" step="0.1" value="${ADMIN.tod ?? (typeof tod === 'number' ? tod : 12)}" data-sl="tod"><em>${ADMIN.tod === null ? 'clock' : String(Math.floor(ADMIN.tod)).padStart(2, '0') + ':' + String(Math.floor(ADMIN.tod % 1 * 60)).padStart(2, '0')}</em></label>
      <div class="adm-row"><button data-a="clock" ${ADMIN.tod === null ? 'disabled' : ''}>Let the clock run</button><button data-a="noon">Noon</button><button data-a="midnight">Midnight</button></div>
      <div class="adm-row"><select data-sel="spawnType">${types.map(t => `<option value="${t}" ${t === sel ? 'selected' : ''}>${t}</option>`).join('')}</select><button data-a="spawn" data-n="1">Spawn 1</button><button data-a="spawn" data-n="10">Spawn 10</button><button data-a="golden">Golden</button></div>
      <div class="adm-row"><button data-a="panic">Panic everyone</button><button data-a="killNear">Kill everyone near</button><button data-a="clear">Clear the crowd</button></div>
      <h4>Air strikes</h4>
      <div class="adm-row"><button data-a="bomb">Bomb ahead</button><button data-a="salvo">Salvo</button><button data-a="strafe">Strafing run</button><button data-a="bombRun">Bombing run</button></div>
      <div class="adm-row"><button data-a="cluster">Cluster bomb</button><button data-a="incendiary">Incendiary</button><button data-a="barrage">Barrage</button></div>
      <div class="adm-row">${tg('airRaid', 'Air raid on', 'Strikes and runs keep coming (the Air raid modifier, this run only)')}</div>
      <h4>Progress <small>(saved)</small></h4>
      <div class="adm-row"><button data-a="chips" data-n="1000">+1000 chips</button><button data-a="chips" data-n="10000">+10000 chips</button><button data-a="level">+1 level</button><button data-a="maxUpg">Max the skill tree</button></div>
    </div>`;
  el.querySelectorAll('[data-tg]').forEach(i => { if (i.dataset.tg === 'airRaid') i.checked = !!MOD.airRaid; i.onchange = () => { const k = i.dataset.tg; if (k === 'airRaid') ADM_ACT.airRaid(i.checked); else ADMIN[k] = i.checked; }; });
  el.querySelectorAll('[data-sl]').forEach(i => i.oninput = () => { const k = i.dataset.sl, v = +i.value; ADMIN[k] = v; if (k === 'tod') tod = v; const em = i.nextElementSibling; em.textContent = k === 'tod' ? String(Math.floor(v)).padStart(2, '0') + ':' + String(Math.floor(v % 1 * 60)).padStart(2, '0') : v.toFixed(2) + 'x'; const b = el.querySelector('[data-a="clock"]'); if (b && k === 'tod') b.disabled = false; });
  el.querySelectorAll('[data-sel]').forEach(s => s.onchange = () => { ADMIN[s.dataset.sel] = s.value; });
  el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a, n = +b.dataset.n || 0;
    if (a === 'close') return adminToggle(false);
    if (!adminOK()) return;
    if (a === 'clock') { ADMIN.tod = null; return adminRender(); }
    if (a === 'noon' || a === 'midnight') { ADMIN.tod = a === 'noon' ? 12 : 0; tod = ADMIN.tod; return adminRender(); }
    if (a === 'spawn') return ADM_ACT.spawn(ADMIN.spawnType || 'human', n);
    if (a === 'golden') return ADM_ACT.spawn(ADMIN.spawnType || 'human', 1, true);
    if (ADM_ACT[a]) ADM_ACT[a](n);
  });
}
addEventListener('keydown', e => {
  if ((e.code === 'Backquote' || e.code === 'F10') && !e.repeat) { const t = (e.target.tagName || '').toLowerCase(); if (t === 'textarea' || (t === 'input' && /^(text|search|number|email|password)$/.test(e.target.type))) return; /* typing a name, not ticking a box */ e.preventDefault(); adminToggle(); }
}, true);

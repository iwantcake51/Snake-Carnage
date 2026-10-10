/* =========================================================
   INPUT
   Movement is like slither.io: the head swings round at a steady rate, so every turn is a smooth arc (CONFIG.turnRate, slower the bigger you are).
   Mouse steering (on by default, a Gameplay setting): the snake heads for the cursor at any angle; left click lunges.
   Keyboard: 8 directions, no key = keep going straight; a held key takes over until the mouse moves again. The touch stick steers at any angle.
   ========================================================= */
/* ---- key bindings: every action has a default key; Settings › Controls can rebind any of them (SETTINGS.keys keeps only the changed ones).
   The arrow keys always move too, unless you've bound one of them to something else. Esc, Space and Enter stay fixed. ---- */
const BIND_DEFAULT = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', lunge: 'ShiftLeft', camo: 'KeyQ', scent: 'KeyE', hiss: 'KeyR', hoover: 'KeyC', nv: 'KeyF' };
const BIND_LABEL = { up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right', lunge: 'Lunge', camo: 'Camouflage', scent: '3rd Eye: Focus', hiss: 'Hiss', hoover: 'Hoover Mouth', nv: 'Night vision' };
const BIND_GROUPS = [['Moving', ['up', 'down', 'left', 'right']], ['Skills', ['lunge', 'camo', 'scent', 'hiss', 'hoover']], ['Seeing', ['nv']]];
const BIND_FIXED = new Set(['Escape', 'Space', 'Enter', 'F3', 'F10', 'Backquote', 'F11']); // pause, start, the performance panel, the admin panel, fullscreen
const ABIL_BIND = { dash: 'lunge', camo: 'camo', scent: 'scent', hiss: 'hiss', hoover: 'hoover' }; // upgrade id -> action
const DIR_OF = { up: 'u', down: 'd', left: 'l', right: 'r' }, ARROWS = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r' };
const bindOf = a => (SETTINGS.keys && SETTINGS.keys[a]) || BIND_DEFAULT[a];
function actionOf(code) { // which action this key does now
  for (const a in BIND_DEFAULT) if (bindOf(a) === code) return a;
  if (code === 'ShiftRight' && bindOf('lunge') === 'ShiftLeft') return 'lunge'; // either Shift
  return null;
}
const dirOf = code => { const a = actionOf(code); return a ? DIR_OF[a] || null : ARROWS[code] || null; };
function keyName(code) { // a readable name for a key code
  if (!code) return '—';
  const m = code.match(/^(Key|Digit|Numpad)(.+)$/); if (m) return (m[1] === 'Numpad' ? 'Num ' : '') + m[2];
  return { ShiftLeft: 'Shift', ShiftRight: 'R Shift', ControlLeft: 'Ctrl', ControlRight: 'R Ctrl', AltLeft: 'Alt', AltRight: 'R Alt', MetaLeft: 'Meta', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space', Tab: 'Tab', CapsLock: 'Caps', Backspace: 'Bksp', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\' }[code] || code;
}
const abilKey = id => keyName(bindOf(ABIL_BIND[id] || id)); // the key shown on a skill's button
const held = new Set(); let relTimer = null;
const steer = { touch: null, cx: 0, cy: 0, over: false, moveT: 0, keyT: 0 }; // the stick's heading; the cursor (client coords), whether it's over the game, when it last moved, when a key last steered
function keyAngle() {
  const dx = (held.has('r') ? 1 : 0) - (held.has('l') ? 1 : 0), dy = (held.has('d') ? 1 : 0) - (held.has('u') ? 1 : 0);
  return dx || dy ? Math.atan2(dy, dx) : null;
}
function predictUTurn(side, final, boost) { // play the whole turn forward, plus the run back alongside the body: any wall or body contact?
  const s = snake, R = snakeRadius(), v = s.speed * (s.dashV || 1);
  let x = s.x, y = s.y, ang = s.angle, dir = side, bad = 0, after = -1; const path = [];
  for (let k = 0; k < 150; k++) { const dt = 1 / 60, mx = CONFIG.turnRate * dt * SKV.turn() * boost * turnSizeK(s), d = angDiff(ang, dir);
    ang += Math.abs(d) < .002 ? d : clamp(d * Math.min(1, dt * CONFIG.turnEase) + Math.sign(d) * mx * .18, -mx, mx);
    if (dir !== final && Math.abs(angDiff(ang, dir)) < .5) dir = final;
    x += Math.cos(ang) * v * dt; y += Math.sin(ang) * v * dt;
    if (hitObstacle(x, y, snakeHitRadius()) || x < B || y < B || x > W - B || y > H - B) bad += 10; // a wall
    { // your own body, where it will be by then: it follows the head round the turn, so walk back along the path the head will have drawn
      const sp = snakeSegmentSpacing(), minD = sp * 8, maxD = sp * s.len; let px = x, py = y, acc = 0, hitB = false;
      const step = (qx, qy) => { acc += Math.hypot(qx - px, qy - py); px = qx; py = qy; if (acc >= minD && acc <= maxD && dist2(x, y, qx, qy) < (R * 1.35) ** 2) hitB = true; return acc > maxD || hitB; };
      let done = false;
      for (let j = path.length - 1; j >= 0 && !done; j--) done = step(path[j][0], path[j][1]);
      if (!done) done = step(s.x, s.y);
      for (let j = 0; j < s.hist.length && !done; j++) done = step(s.hist[j].x, s.hist[j].y);
      if (hitB && !MOD.noSelf) bad += 5;
    }
    path.push([x, y]);
    if (after < 0 && Math.abs(angDiff(ang, final)) < .1) after = k;
    if (after >= 0 && k - after > 45) break; // and keep checking for a while after the turn, running back past the body
  }
  return bad;
}
function setHeading(a) { // one place where a new target heading is accepted (8-way rules)
  if (snake.started && Math.abs(angDiff(snake.dir, a)) > Math.PI * .9) { // no instant reversal... unless Momentum lets you whip round
    if (!sk('momentum') || T - (snake.uturnAt || -9) < .6 || snake.uturnT > 0) return;
    let pickd = null; // tightest safe turn first; if that would clip the body, try a wider one; either side
    for (const boost of [2.4, 1.7, 1.25]) { for (const sd of [snake.dir - Math.PI / 2, snake.dir + Math.PI / 2]) if (!predictUTurn(sd, a, boost)) { pickd = { sd, boost }; break; } if (pickd) break; }
    if (!pickd) return; // every way round would hit a wall or your own body: no U-turn
    snake.uturnAt = T; snake.uturnT = .8; snake.uturnK = pickd.boost; snake.uturnTo = a; snake.dir = pickd.sd; Sfx.turn(); return; // the clear side (and if the first choice isn't clear, the other one)
  }
  if (snake.started && Math.abs(angDiff(snake.dir, a)) > .1) Sfx.turn();
  if (snake.started && Math.abs(angDiff(snake.dir, a)) > 1.4) snake.hardTurnT = T; // 90 degrees or more
  snake.dir = a;
  if (!snake.started) snake.angle = a;
}
function applyDir() {
  const a = keyAngle(); if (a === null) return;
  steer.keyT = performance.now();
  setHeading(a);
}
const mouseSteerOn = () => !!SETTINGS.mouseSteer && !IS_TOUCH;
if (!SETTINGS.steerV) { SETTINGS.steerV = 1; SETTINGS.mouseSteer = true; saveSettings(); } // movement went slither.io-style: the cursor steers by default (it can still be switched off)
function mouseAim() { // the heading from the head to the cursor, worked out fresh each frame (the snake moves under a still cursor); null with the cursor off the game or on the head
  if (!steer.over || !snake) return null;
  const p = boardPoint(steer.cx, steer.cy), r = 22 * (snake.scale || 1);
  return dist2(p.x, p.y, snake.x, snake.y) < r * r ? null : Math.atan2(p.y - snake.y, p.x - snake.x);
}
function mouseSteer() { // every frame: aim at the cursor, at the same turn rate the keys get (unless a key was the last thing to steer)
  const s = snake; if (steer.keyT > steer.moveT) return; // a key steered last: it holds until the mouse moves again
  const a = mouseAim(); if (a === null) return;
  if (!steerSafe(s, a)) { const alt = [s.angle, s.angle - 1.2, s.angle + 1.2].find(q => steerSafe(s, q)); s.dir = alt ?? s.angle; return; } // swinging round now would run the head into the body: hold the line (or bear the other way) until it's clear
  if (Math.abs(angDiff(s.angle, a)) > 1.4 && Math.abs(angDiff(s.dir, a)) > .6) s.hardTurnT = T; // a sharp swing counts like a sharp key turn
  s.dir = a;
}
function steerSafe(s, a) { // mouse steering chases the cursor every frame, so a fast, tight swing (a lunge with every turning skill) can loop the head into its own body: look about half a second ahead
  const segs = s.segs; if (!segs || segs.length < 10 || MOD.noSelf) return true; // (No self collision: the body is no danger)
  const R = snakeRadius(), dv = s.dashV || 1, v = s.speed * dv, rate = CONFIG.turnRate * SKV.turn() * (dv > 1.2 ? SKV.lungeTurn() : 1) * (MOD.wideTurns ? .5 : MOD.quickTurn ? 1.6 : 1) * turnSizeK(s), dt = 1 / 30;
  let ang = s.angle, x = s.x, y = s.y;
  for (let k = 0; k < 14; k++) { const d = angDiff(ang, a); ang += Math.sign(d) * Math.min(Math.abs(d), rate * dt); x += Math.cos(ang) * v * dt; y += Math.sin(ang) * v * dt;
    for (let i = 8; i < segs.length; i += 2) if (dist2(x, y, segs[i].x, segs[i].y) < (R * 1.3) ** 2) return false; }
  return true;
}
function steerAnalog(a) { // the touch stick steers at any angle, like the cursor (and, like it, holds the line while swinging round would run into the body)
  const s = snake; if (!steerSafe(s, a)) { const alt = [s.angle, s.angle - 1.2, s.angle + 1.2].find(q => steerSafe(s, q)); s.dir = alt ?? s.angle; return; }
  if (Math.abs(angDiff(s.angle, a)) > 1.4 && Math.abs(angDiff(s.dir, a)) > .6) s.hardTurnT = T;
  s.dir = a;
}
function unhold() { state = 'play'; hideResume(); stage.classList.remove('paused'); }
function goInput() { // any steering input: starts the run, or continues after a pause
  if (state === 'held') unhold();
  if (state === 'ready') { snake.started = true; state = 'play'; }
}
addEventListener('keydown', e => {
  Sfx.init();
  if (e.target && e.target.tagName === 'INPUT' && (e.target.type === 'range' || e.target.type === 'checkbox') && e.code === 'Escape') e.target.blur(); // a slider still focused after a drag: Esc should close the menu, not stay stuck on the slider
  else if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  const k = dirOf(e.code), act = actionOf(e.code);
  if (k) {
    if (state === 'ready' || state === 'play' || state === 'held') e.preventDefault();
    held.add(k);
    if (state === 'held') unhold();
    if (state === 'ready' || state === 'play') applyDir();
    if (state === 'ready') { snake.started = true; state = 'play'; }
  } else if (e.code === 'Space' || e.code === 'Enter') {
    const t = e.target; if (state === 'menu' && t && t !== document.body && t.closest && t.closest('#overlay button, #overlay [role=button], #overlay a') && t.matches(':focus-visible')) return; // a control reached with the keyboard: Space and Enter press that control
    e.preventDefault();
    if (state === 'intro') return endIntro();
    if (overlay.querySelector('.casebox')) return;
    if (state === 'paused' && overlay.querySelector('.pause')) return resumeGame();
    if (state === 'dead' && document.getElementById('againBtn') && !runSummaryBusy()) return startGame();
    if (state === 'menu' && overlay.querySelector('.mm')) menuSpace();
  } else if (e.code === 'Escape') {
    if (['play', 'ready', 'intro', 'held'].includes(state)) pauseGame();
    else if (state === 'paused') overlay.querySelector('.pause') ? resumeGame() : transitionTo(showPause);
    else if (state === 'dead' && document.getElementById('againBtn')) returnToMenu();
    else if (state === 'menu' && !overlay.querySelector('.casebox')) menuEsc();
  }
  else if (act === 'nv' && !e.repeat) toggleNV();
  else if (e.repeat) return; // holding a skill key fires it once, not a stream of sounds
  else if (act === 'lunge') useAbility('dash');
  else if (act === 'camo' || act === 'scent' || act === 'hiss' || act === 'hoover') useAbility(act);
});
function toggleNV() { // night vision only while actually playing
  if (!['play', 'ready', 'held'].includes(state)) return;
  if (MOD.noNVG) { notify({ kind: 'bad', title: 'No night vision this run', dur: 1.6, key: 'nvg' }); return; }
  nightVision = !nightVision; if (nightVision) { run.usedNV = true; cr.usedNV = true; }
  Sfx.click(nightVision); notify({ kind: 'nvg', title: 'NVG', right: nightVision ? 'ON' : 'OFF', dur: 1.3, key: 'nvg' });
  const nn = document.querySelector('#notes .n-nvg'); if (nn) nn.classList.toggle('off', !nightVision);
  const tb = document.querySelector('#touch .tb-nv'); if (tb) tb.classList.toggle('on', nightVision);
}
addEventListener('keyup', e => {
  const k = dirOf(e.code); if (!k) return;
  held.delete(k);
  // short grace so releasing a diagonal pair doesn't snap to one axis
  clearTimeout(relTimer); relTimer = setTimeout(() => { if (held.size && state === 'play') applyDir(); }, 70);
});
addEventListener('blur', () => held.clear());

/* ---- mouse steering (the Mouse steering setting) ---- */
function boardPoint(cx, cy) { const c = clientToCanvas(cx, cy); return canvasToWorld(c.x, c.y); } // client px -> world coords, through the same camera the frame was drawn with
cv.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  if (Math.hypot(e.clientX - steer.cx, e.clientY - steer.cy) > 2) steer.moveT = performance.now(); // a real move hands steering back to the mouse
  steer.cx = e.clientX; steer.cy = e.clientY; steer.over = true;
});
cv.addEventListener('pointerleave', () => { steer.over = false; }); // off the game: keep going straight
cv.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse' || !mouseSteerOn() || !snake || e.button !== 0) return;
  steer.cx = e.clientX; steer.cy = e.clientY; steer.over = true; steer.moveT = performance.now();
  if (state === 'ready' || state === 'held') { const a = mouseAim(); if (a !== null) setHeading(a); goInput(); }
  else if (state === 'play') useAbility('dash'); // left click: lunge
});
cv.addEventListener('contextmenu', e => { if (mouseSteerOn() && camOK()) e.preventDefault(); }); // the right button looks around instead

/* ---- camera: mouse wheel zooms toward the cursor; drag pans (middle button any time; left button unless the left
   button lunges, i.e. with Mouse steering on, when the right button drags instead); double-click resets. Touch: two fingers pinch and pan. ---- */
const camOK = () => ['play', 'ready', 'held', 'paused', 'dead', 'intro'].includes(state) && !(state === 'paused' && overlay.style.display !== 'none') && !(state === 'dead' && overlay.style.display !== 'none' && overlay.innerHTML);
document.getElementById('stage').addEventListener('wheel', e => {
  if (!camOK() || (e.target.closest && e.target.closest('#overlay,#hudLo .chip,#abil,#notes'))) return;
  e.preventDefault();
  const c = clientToCanvas(e.clientX, e.clientY), dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
  zoomAt(c.x, c.y, Math.exp(-clamp(dy, -240, 240) * .0018)); // smooth, proportional to how far the wheel moved
}, { passive: false });
const panDrag = { id: null, x: 0, y: 0, moved: false };
cv.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse' || !camOK()) return;
  const ms = mouseSteerOn(); // with mouse steering the left button lunges, and the right one drags the view
  if (e.button === 1 || (e.button === 0 && !ms) || (e.button === 2 && ms)) { panDrag.id = e.pointerId; panDrag.x = e.clientX; panDrag.y = e.clientY; panDrag.moved = false; panDrag.mid = e.button === 1; if (e.button === 1) e.preventDefault(); }
});
addEventListener('pointermove', e => {
  if (e.pointerId !== panDrag.id) return;
  const r = cv.getBoundingClientRect(), dx = (e.clientX - panDrag.x) / r.width * W, dy = (e.clientY - panDrag.y) / r.height * H;
  if (!panDrag.moved && Math.hypot(e.clientX - panDrag.x, e.clientY - panDrag.y) < 5) return; // a click isn't a drag
  if (!panDrag.moved) { panDrag.moved = true; try { cv.setPointerCapture(e.pointerId); } catch (er) {} cv.style.cursor = 'grabbing'; }
  panDrag.x = e.clientX; panDrag.y = e.clientY; panBy(dx, dy);
});
const panEnd = e => { if (e.pointerId !== panDrag.id) return; panDrag.id = null; cv.style.cursor = ''; };
addEventListener('pointerup', panEnd); addEventListener('pointercancel', panEnd);
cv.addEventListener('dblclick', () => { if (camOK()) resetUserCam(); });
cv.addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); });
/* two-finger pinch on the touch layer: zoom around the middle of the fingers and pan with them. It takes over from the
   stick the moment a second finger lands, and the stick stays off until both are lifted, so it never steers by accident. */
const pinch = { pts: new Map(), on: false, d0: 0, z0: 1, mx: 0, my: 0 };
function pinchStart() {
  const [a, b] = [...pinch.pts.values()]; pinch.on = true; pinch.d0 = Math.hypot(a.x - b.x, a.y - b.y) || 1; pinch.z0 = UCAM.tz;
  const m = clientToCanvas((a.x + b.x) / 2, (a.y + b.y) / 2); pinch.mx = m.x; pinch.my = m.y;
  if (stick.id !== null) stickUp({ pointerId: stick.id }); // the stick lets go
}
function pinchMove() {
  const [a, b] = [...pinch.pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1, m = clientToCanvas((a.x + b.x) / 2, (a.y + b.y) / 2);
  panBy(m.x - pinch.mx, m.y - pinch.my); pinch.mx = m.x; pinch.my = m.y;
  const want = clamp(pinch.z0 * d / pinch.d0, 1 / baseZoom(), UCAM_MAX); zoomAt(m.x, m.y, want / UCAM.tz);
}
/* ---- touch: a floating stick anywhere on the board, plus a few buttons ---- */
const touchEl = document.getElementById('touch');
function buildTouch() {
  touchEl.innerHTML = `<div class="stick"><i class="knob"></i></div>
    <button class="tb tb-nv" data-sfx="none" aria-label="Night vision"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="13" r="4"/><circle cx="17" cy="13" r="4"/><path d="M11 13h2M3 9l2-3h14l2 3"/></svg></button>
    <div class="tabil"></div>`;
  touchEl.querySelector('.tb-nv').onclick = toggleNV;
  refreshTouchAbilities();
}
const stick = { id: null, x: 0, y: 0 };
function stickMove(cx, cy) {
  const dx = cx - stick.x, dy = cy - stick.y, d = Math.hypot(dx, dy), R = 46, el = touchEl.querySelector('.stick');
  const k = Math.min(1, d / R); el.querySelector('.knob').style.translate = `${(dx / (d || 1) * R * k).toFixed(1)}px ${(dy / (d || 1) * R * k).toFixed(1)}px`;
  if (d < 12) return; // dead zone
  const a = Math.atan2(dy, dx);
  steer.touch = a;
  if (state === 'ready' || state === 'held') { setHeading(a); goInput(); }
  else if (state === 'play') steerAnalog(a);
}
function enableTouch() { if (document.body.classList.contains('touch')) return; IS_TOUCH = true; document.body.classList.add('touch'); if (!touchEl.firstElementChild) buildTouch(); }
touchEl.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' || e.target.closest('button')) return;
  enableTouch();
  Sfx.init();
  pinch.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch.pts.size === 2 && camOK()) { try { touchEl.setPointerCapture(e.pointerId); } catch (er) {} pinchStart(); e.preventDefault(); return; }
  if (pinch.on || pinch.pts.size > 1) return; // still pinching: no stick until every finger is up
  if (state === 'intro') { endIntro(); return; }
  if (!['play', 'ready', 'held'].includes(state) || stick.id !== null) return;
  stick.id = e.pointerId; const r = touchEl.getBoundingClientRect(), u = 1;
  stick.x = e.clientX; stick.y = e.clientY;
  const el = touchEl.querySelector('.stick'); el.style.left = (e.clientX - r.left) / u + 'px'; el.style.top = (e.clientY - r.top) / u + 'px'; el.classList.add('on');
  touchEl.setPointerCapture(e.pointerId); e.preventDefault();
});
touchEl.addEventListener('pointermove', e => {
  const p = pinch.pts.get(e.pointerId); if (p) { p.x = e.clientX; p.y = e.clientY; }
  if (pinch.on && pinch.pts.size >= 2) { pinchMove(); e.preventDefault(); return; }
  if (e.pointerId === stick.id) { stickMove(e.clientX, e.clientY); e.preventDefault(); }
});
const pinchUp = e => { pinch.pts.delete(e.pointerId); if (!pinch.pts.size) pinch.on = false; };
touchEl.addEventListener('pointerup', pinchUp); touchEl.addEventListener('pointercancel', pinchUp);
const stickUp = e => {
  if (e.pointerId !== stick.id) return;
  stick.id = null; steer.touch = null;
  const el = touchEl.querySelector('.stick'); el.classList.remove('on'); el.querySelector('.knob').style.translate = '0px 0px';
};
touchEl.addEventListener('pointerup', stickUp); touchEl.addEventListener('pointercancel', stickUp);
addEventListener('touchmove', e => { if (e.target.closest && e.target.closest('#stage') && !e.target.closest('.sgrid,.modgrid,.sbody,.achg,.mm,.rs,.mmp,.panel,.sumbox')) e.preventDefault(); }, { passive: false }); // no page scroll / rubber-banding while steering
addEventListener('pointerdown', e => { if (e.pointerType === 'touch') enableTouch(); }, true);

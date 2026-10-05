/* =========================================================
   INPUT
   Keyboard: 8 directions, no key = keep going straight.
   Free movement (modifier): any angle; holding a direction turns you toward it, letting go keeps the heading.
   Mouse steering (free movement only) and a touch stick feed the same "steer" target.
   ========================================================= */
const KEYMAP = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
const held = new Set(); let relTimer = null;
const steer = { touch: null, mouse: null, mouseT: 0 }; // analog targets (radians) from the stick / cursor
const FREE_TURN = 4.2; // rad/s: how fast free movement swings toward the held direction
function keyAngle() {
  const dx = (held.has('r') ? 1 : 0) - (held.has('l') ? 1 : 0), dy = (held.has('d') ? 1 : 0) - (held.has('u') ? 1 : 0);
  return dx || dy ? Math.atan2(dy, dx) : null;
}
function predictUTurn(side, final, boost) { // play the whole turn forward, plus the run back alongside the body: any wall or body contact?
  const s = snake, R = snakeRadius(), sl = upg('speed'), v = s.speed * (s.dashV || 1);
  let x = s.x, y = s.y, ang = s.angle, dir = side, bad = 0, after = -1; const path = [];
  for (let k = 0; k < 150; k++) { const dt = 1 / 60, mx = CONFIG.turnRate * dt * (1 + (sl >= 2 ? .18 : 0) + (sl >= 4 ? .18 : 0) + (sl >= 5 ? .12 : 0)) * boost, d = angDiff(ang, dir);
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
      if (hitB) bad += 5;
    }
    path.push([x, y]);
    if (after < 0 && Math.abs(angDiff(ang, final)) < .1) after = k;
    if (after >= 0 && k - after > 45) break; // and keep checking for a while after the turn, running back past the body
  }
  return bad;
}
function setHeading(a) { // one place where a new target heading is accepted (8-way rules)
  if (snake.started && Math.abs(angDiff(snake.dir, a)) > Math.PI * .9) { // no instant reversal... unless Speed Demon V lets you whip round
    if (upg('speed') < 5 || T - (snake.uturnAt || -9) < .6 || snake.uturnT > 0) return;
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
  if (MOD.freeMove && snake.started) return; // free movement turns gradually in steerFree()
  setHeading(a);
}
function steerFree(dt) { // called every frame while playing with free movement on
  const s = snake, a = keyAngle() ?? steer.touch ?? (SETTINGS.mouseFollow && steer.mouse !== null && T - steer.mouseT < 3 ? steer.mouse : null);
  if (a === null) { s.dir = s.angle; return; }
  const d = angDiff(s.angle, a), was = s.freeTurn || 0;
  s.dir = s.angle + clamp(d, -FREE_TURN * dt * 3, FREE_TURN * dt * 3);
  s.freeTurn = Math.abs(d) > .05 ? was + Math.abs(clamp(d, -FREE_TURN * dt, FREE_TURN * dt)) : 0;
  if (s.freeTurn > 1.4 && was <= 1.4) s.hardTurnT = T; // a long sweep counts as a sharp turn too
}
function steerAnalog(a) { // stick / cursor input outside free movement snaps to the nearest of 8 directions
  if (MOD.freeMove && snake.started) return;
  setHeading(Math.round(a / (Math.PI / 4)) * (Math.PI / 4));
}
function unhold() { state = 'play'; hideResume(); stage.classList.remove('paused'); }
function goInput() { // any steering input: starts the run, or continues after a pause
  if (state === 'held') unhold();
  if (state === 'ready') { snake.started = true; state = 'play'; }
}
addEventListener('keydown', e => {
  Sfx.init();
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  const k = KEYMAP[e.code];
  if (k) {
    if (state === 'ready' || state === 'play' || state === 'held') e.preventDefault();
    held.add(k);
    if (state === 'held') unhold();
    if (state === 'ready' || state === 'play') applyDir();
    if (state === 'ready') { snake.started = true; state = 'play'; }
  } else if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    if (state === 'intro') return endIntro();
    if (overlay.querySelector('.casebox')) return;
    if (state === 'paused' && overlay.querySelector('.pause')) return resumeGame();
    if (state === 'dead' && document.getElementById('againBtn') && !runSummaryBusy()) return startGame();
    if (state === 'menu' && overlay.querySelector('.menu')) startGame();
  } else if (e.code === 'Escape') {
    if (['play', 'ready', 'intro', 'held'].includes(state)) pauseGame();
    else if (state === 'paused') overlay.querySelector('.pause') ? resumeGame() : transitionTo(showPause);
    else if (state === 'dead' && document.getElementById('againBtn')) returnToMenu();
    else if (state === 'menu' && !overlay.querySelector('.menu') && !overlay.querySelector('.casebox')) transitionTo(showMenu);
  }
  else if (e.code === 'KeyF' && !e.repeat) toggleNV();
  else if (e.repeat) return; // holding a skill key fires it once, not a stream of sounds
  else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') useAbility('dash');
  else if (e.code === 'KeyQ') useAbility('camo');
  else if (e.code === 'KeyE') useAbility('scent');
  else if (e.code === 'KeyR') useAbility('hiss');
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
  const k = KEYMAP[e.code]; if (!k) return;
  held.delete(k);
  // short grace so releasing a diagonal pair doesn't snap to one axis
  clearTimeout(relTimer); relTimer = setTimeout(() => { if (held.size && state === 'play') applyDir(); }, 70);
});
addEventListener('blur', () => held.clear());

/* ---- mouse steering (free movement) ---- */
function boardPoint(cx, cy) { // client px -> world coords (ignores the tiny camera lean)
  const r = cv.getBoundingClientRect();
  return { x: (cx - r.left) / r.width * W + V.ox, y: (cy - r.top) / r.height * H + V.oy };
}
cv.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || !snake) return;
  const p = boardPoint(e.clientX, e.clientY);
  if (dist2(p.x, p.y, snake.x, snake.y) < 18 * 18) return; // cursor on the head: keep going
  steer.mouse = Math.atan2(p.y - snake.y, p.x - snake.x); steer.mouseT = T;
});
cv.addEventListener('pointerleave', () => { steer.mouse = null; });
cv.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse' || !MOD.freeMove || !SETTINGS.mouseFollow || !snake) return;
  if (state === 'ready' || state === 'held') { if (steer.mouse !== null) setHeading(steer.mouse); goInput(); }
});

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
  if (state === 'ready' || state === 'held') { setHeading(MOD.freeMove ? a : Math.round(a / (Math.PI / 4)) * (Math.PI / 4)); goInput(); }
  else if (state === 'play') steerAnalog(a);
}
function enableTouch() { if (document.body.classList.contains('touch')) return; IS_TOUCH = true; document.body.classList.add('touch'); if (!touchEl.firstElementChild) buildTouch(); }
touchEl.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' || e.target.closest('button')) return;
  enableTouch();
  Sfx.init();
  if (state === 'intro') { endIntro(); return; }
  if (!['play', 'ready', 'held'].includes(state) || stick.id !== null) return;
  stick.id = e.pointerId; const r = touchEl.getBoundingClientRect(), u = 1;
  stick.x = e.clientX; stick.y = e.clientY;
  const el = touchEl.querySelector('.stick'); el.style.left = (e.clientX - r.left) / u + 'px'; el.style.top = (e.clientY - r.top) / u + 'px'; el.classList.add('on');
  touchEl.setPointerCapture(e.pointerId); e.preventDefault();
});
touchEl.addEventListener('pointermove', e => { if (e.pointerId === stick.id) { stickMove(e.clientX, e.clientY); e.preventDefault(); } });
const stickUp = e => {
  if (e.pointerId !== stick.id) return;
  stick.id = null; steer.touch = null;
  const el = touchEl.querySelector('.stick'); el.classList.remove('on'); el.querySelector('.knob').style.translate = '0px 0px';
};
touchEl.addEventListener('pointerup', stickUp); touchEl.addEventListener('pointercancel', stickUp);
addEventListener('touchmove', e => { if (e.target.closest && e.target.closest('#stage') && !e.target.closest('.sgrid,.modgrid,.sbody,.achg,.cards,.menu,.panel,.sumbox')) e.preventDefault(); }, { passive: false }); // no page scroll / rubber-banding while steering
addEventListener('pointerdown', e => { if (e.pointerType === 'touch') enableTouch(); }, true);

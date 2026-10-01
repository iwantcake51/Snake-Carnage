/* =========================================================
   INPUT  (8 directions + no key = keep going straight)
   ========================================================= */
const KEYMAP = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
const held = new Set(); let relTimer = null;
function applyDir() {
  const dx = (held.has('r') ? 1 : 0) - (held.has('l') ? 1 : 0), dy = (held.has('d') ? 1 : 0) - (held.has('u') ? 1 : 0);
  if (!dx && !dy) return;
  const a = Math.atan2(dy, dx);
  if (snake.started && Math.abs(angDiff(snake.dir, a)) > Math.PI * .9) return; // no instant reversal
  if (snake.started && Math.abs(angDiff(snake.dir, a)) > .1) Sfx.turn();
  if (snake.started && Math.abs(angDiff(snake.dir, a)) > 1.4) snake.hardTurnT = T; // 90 degrees or more
  snake.dir = a;
  if (!snake.started) snake.angle = a;
}
addEventListener('keydown', e => {
  Sfx.init();
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  const k = KEYMAP[e.code];
  if (k) {
    if (state === 'ready' || state === 'play') e.preventDefault();
    held.add(k);
    if (state === 'held') { state = 'play'; hideResume(); }
    if (state === 'ready' || state === 'play') applyDir();
    if (state === 'ready') { snake.started = true; state = 'play'; }
  } else if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    if (state === 'intro') return endIntro();
    if (overlay.querySelector('.casebox')) return;
    if (state === 'paused' && overlay.querySelector('.pause')) return resumeGame();
    if ((state === 'menu' && overlay.querySelector('.menu')) || (state === 'dead' && deadT <= 0)) startGame();
  } else if (e.code === 'Escape') {
    if (['play', 'ready', 'intro', 'held'].includes(state)) pauseGame();
    else if (state === 'paused') overlay.querySelector('.pause') ? resumeGame() : transitionTo(showPause);
    else if (state === 'dead' && deadT <= 0) returnToMenu();
    else if (state === 'menu' && !overlay.querySelector('.menu') && !overlay.querySelector('.casebox')) transitionTo(showMenu);
  }
  else if (e.code === 'KeyF') { // night vision only while actually playing
    if (!['play', 'ready', 'held'].includes(state)) return;
    if (MOD.noNVG) { notify({ kind: 'bad', title: 'No night vision this run', dur: 1.6, key: 'nvg' }); return; }
    nightVision = !nightVision; if (nightVision) { run.usedNV = true; cr.usedNV = true; }
    Sfx.click(nightVision); notify({ kind: 'nvg', title: 'NVG', right: nightVision ? 'ON' : 'OFF', dur: 1.3, key: 'nvg' });
    const nn = document.querySelector('#notes .n-nvg'); if (nn) nn.classList.toggle('off', !nightVision);
  }
});
addEventListener('keyup', e => {
  const k = KEYMAP[e.code]; if (!k) return;
  held.delete(k);
  // short grace so releasing a diagonal pair doesn't snap to one axis
  clearTimeout(relTimer); relTimer = setTimeout(() => { if (held.size && state === 'play') applyDir(); }, 70);
});

/* PROGRESSION (v2). Starting fresh: the old save key is dropped along with old best scores and unlocked cosmetics.
   Settings (volume, controls, graphics, accessibility) are kept. */
const PROG_KEY = 'snakeCarnageProgress2';
const PROG = Object.assign({ xp: 0, level: 1, coins: 0, owned: [], best: {}, bestCombo: {}, chDone: {}, chBest: {}, runs: 0, kills: 0 },
  (() => {
    try {
      const fresh = JSON.parse(localStorage.getItem(PROG_KEY));
      if (fresh) return fresh;
      if (localStorage.getItem('snakeCarnageProgress')) { // old progress found: wipe it and the cosmetics it unlocked
        localStorage.removeItem('snakeCarnageProgress');
        Object.keys(localStorage).filter(k => k.startsWith('snakeCarnageBest_')).forEach(k => localStorage.removeItem(k));
        SETTINGS.snake = { color: '#4e7cf6', color2: '#f2f2f2', pattern: 'Solid', hat: 'None', eyes: 'Normal', outline: 'None', trail: 'None' };
        localStorage.setItem('snakeCarnageSettings', JSON.stringify(SETTINGS));
      }
    } catch (e) {}
    return {};
  })());
for (const k of ['best', 'bestCombo', 'chDone', 'chBest']) PROG[k] = PROG[k] || {};
if (PROG.chRot !== Math.floor(Date.now() / (15 * 60 * 1000))) { PROG.chRot = Math.floor(Date.now() / (15 * 60 * 1000)); PROG.chDone = {}; PROG.chBest = {}; } // stale challenge progress
function saveProg() { try { localStorage.setItem(PROG_KEY, JSON.stringify(PROG)); } catch (e) {} }
const xpNeed = l => Math.round(1100 + 480 * Math.pow(l - 1, 1.2)); // slow from the start (a first game gets you to about level 5, not 11), and it keeps climbing without a wall: about 4-6x the old curve early on, 3x by level 20
let MOD = {}, rewardMult = 1;
let floaters = [];
let lvlAnim = false, lastLevelBonus = 0;
const XP_GAIN = 1.65; // every source of XP pays this much more (v1.56: half as much again; v1.81: a little more on top)
const SURV_BONUS = { xp: m => Math.min(200, 50 + 15 * (m - 1)), chips: m => Math.min(10, 2 + m) }; // what the m-th full minute alive adds to the end-of-run rewards: later minutes are worth more
function paySurvival() { // once, as the run ends: a bonus for every full minute you stayed alive (on top of the survival challenges)
  if (typeof run !== 'object' || run.survPaid) return run && run.surv; run.survPaid = true;
  const m = Math.floor((run.aliveT || 0) / 60); if (m >= 5) studyHit('alive'); if (m < 1) return null; // (Quick Study: five minutes alive)
  let xp = 0, ch = 0; for (let k = 1; k <= m; k++) { xp += SURV_BONUS.xp(k); ch += SURV_BONUS.chips(k); }
  const x0 = run.xpGained || 0, c0 = run.coinsGained || 0; gainXP(Math.round(xp * rewardMult), Math.round(ch * rewardMult)); // (gainXP adds Deep Pockets and the rest)
  return run.surv = { m, xp: (run.xpGained || 0) - x0, chips: (run.coinsGained || 0) - c0 };
}
function gainXP(xp, coins) {
  const sv = typeof SKV === 'object'; // (the skill tree loads later; rewards only start once everything has)
  xp = Math.round(xp * XP_GAIN); coins = Math.round(coins * (sv ? SKV.chipK() : 1)); // Deep Pockets
  PROG.xp += xp; PROG.coins += coins; PROG.earned = (PROG.earned || 0) + coins; rewardPopup(xp, coins);
  if (typeof run === 'object' && (state === 'play' || state === 'dead' || state === 'held')) { run.xpGained = (run.xpGained || 0) + xp; run.coinsGained = (run.coinsGained || 0) + coins; }
  const from = PROG.level;
  let bonus = 0;
  while (PROG.xp >= xpNeed(PROG.level)) { PROG.xp -= xpNeed(PROG.level); PROG.level++; const b = (15 + PROG.level * 3) * (sv ? SKV.windK() : 1); /* Windfall doubles it */ PROG.coins += b; bonus += b; }
  if (bonus) lastLevelBonus = bonus; // a later reward in the same moment must not wipe the banner's number
  saveProg();
  if (PROG.level > from) celebrateLevel(from, PROG.level); else updateHud();
}
let lastReward = null;
function rewardPopup(xp, coins) { // stacks in the top-right corner; rapid kills merge into one chip
  const box = document.getElementById('rewards'), now = performance.now(), text = r => `<span>+${r.xp} XP</span><span class="c">+${r.coins} <i class="pc"></i></span>`;
  const leave = r => { clearTimeout(r.timer); r.timer = setTimeout(() => { r.el.classList.add('out'); setTimeout(() => r.el.remove(), 400); }, 2100); };
  if (lastReward && lastReward.el.isConnected && !lastReward.el.classList.contains('out') && now - lastReward.t < 900) {
    lastReward.xp += xp; lastReward.coins += coins; lastReward.t = now; lastReward.el.innerHTML = text(lastReward);
    lastReward.el.classList.remove('bump'); void lastReward.el.offsetWidth; lastReward.el.classList.add('bump'); leave(lastReward); return;
  }
  const el = document.createElement('div'); el.className = 'rw';
  lastReward = { el, xp, coins, t: now }; el.innerHTML = text(lastReward);
  box.prepend(el); while (box.children.length > 4) box.lastElementChild.remove();
  leave(lastReward);
}
function celebrateLevel(from, to) { // bar fills, flashes, number racks up, banner drops in -- all on the sound's beat
  lvlAnim = true;
  const fill = document.getElementById('xpfill'), bar = document.getElementById('xpbar'), lv = document.querySelector('#hudbar .lvl'), num = document.getElementById('lvl');
  fill.classList.add('gold'); fill.style.width = '100%';
  setTimeout(() => {
    Sfx.levelUp();
    bar.classList.remove('flash'); void bar.offsetWidth; bar.classList.add('flash');
    const sh = document.createElement('span'); sh.className = 'shine'; bar.appendChild(sh); setTimeout(() => sh.remove(), 800);
    lv.classList.remove('hit'); void lv.offsetWidth; lv.classList.add('hit');
    let n = from;
    const step = () => { n++; num.textContent = n; num.classList.remove('flip'); void num.offsetWidth; num.classList.add('flip'); if (n < to) setTimeout(step, 110); };
    step();
    fill.classList.add('instant'); fill.style.width = '0%'; void fill.offsetWidth; fill.classList.remove('instant');
    const br = bar.getBoundingClientRect(), pr = document.getElementById('hudbar').getBoundingClientRect();
    for (let k = 0; k < 12; k++) {
      const sp = document.createElement('i'); sp.className = 'spark';
      sp.style.left = (br.left - pr.left + Math.random() * br.width) + 'px'; sp.style.top = (br.top - pr.top + br.height / 2) + 'px';
      sp.style.setProperty('--dx', rand(-30, 30).toFixed(0) + 'px'); sp.style.setProperty('--dy', rand(-26, 18).toFixed(0) + 'px');
      document.getElementById('hudbar').appendChild(sp); setTimeout(() => sp.remove(), 800);
    }
    levelBanner(to, lastLevelBonus);
  }, 380);
  setTimeout(() => { fill.classList.remove('gold'); lvlAnim = false; updateHud(); }, 700);
  setTimeout(() => lv.classList.remove('hit'), 1500);
}
let bannerTimer = null;
function levelBanner(level, coins) {
  const host = document.getElementById('lvlup');
  host.innerHTML = `<div class="lu"><small>Level up!</small><b>${level}</b><em>+${coins} <i class="pc"></i> bonus chips</em><em class="lutok"><i class="tok"></i> Skill token ready</em></div>`;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { const el = host.firstElementChild; if (el) { el.classList.add('out'); setTimeout(() => el.isConnected && el.remove(), 520); } }, 3200);
}
function saveSettings() { try { localStorage.setItem('snakeCarnageSettings', JSON.stringify(SETTINGS)); } catch (e) {} }

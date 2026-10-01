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
if (PROG.chRot !== Math.floor(Date.now() / (5 * 60 * 1000))) { PROG.chRot = Math.floor(Date.now() / (5 * 60 * 1000)); PROG.chDone = {}; PROG.chBest = {}; } // stale challenge progress
function saveProg() { try { localStorage.setItem(PROG_KEY, JSON.stringify(PROG)); } catch (e) {} }
const xpNeed = l => Math.round(120 + 80 * Math.pow(l - 1, 1.6)); // gentle early, steep later
let MOD = {}, rewardMult = 1;
let floaters = [];
let lvlAnim = false, lastLevelBonus = 0;
function gainXP(xp, coins) {
  PROG.xp += xp; PROG.coins += coins; rewardPopup(xp, coins);
  const from = PROG.level;
  let bonus = 0;
  while (PROG.xp >= xpNeed(PROG.level)) { PROG.xp -= xpNeed(PROG.level); PROG.level++; const b = 10 + PROG.level * 2; PROG.coins += b; bonus += b; }
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
  const fill = document.getElementById('xpfill'), bar = document.getElementById('xpbar'), lv = document.querySelector('#bar .lvl'), num = document.getElementById('lvl');
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
    const br = bar.getBoundingClientRect(), pr = document.getElementById('bar').getBoundingClientRect();
    for (let k = 0; k < 12; k++) {
      const sp = document.createElement('i'); sp.className = 'spark';
      sp.style.left = (br.left - pr.left + Math.random() * br.width) + 'px'; sp.style.top = (br.top - pr.top + br.height / 2) + 'px';
      sp.style.setProperty('--dx', rand(-30, 30).toFixed(0) + 'px'); sp.style.setProperty('--dy', rand(-26, 18).toFixed(0) + 'px');
      document.getElementById('bar').appendChild(sp); setTimeout(() => sp.remove(), 800);
    }
    levelBanner(to, lastLevelBonus);
  }, 380);
  setTimeout(() => { fill.classList.remove('gold'); lvlAnim = false; updateHud(); }, 700);
  setTimeout(() => lv.classList.remove('hit'), 1500);
}
let bannerTimer = null;
function levelBanner(level, coins) {
  const host = document.getElementById('lvlup');
  host.innerHTML = `<div class="lu"><small>Level up!</small><b>${level}</b><em>+${coins} <i class="pc"></i> bonus chips</em></div>`;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { const el = host.firstElementChild; if (el) { el.classList.add('out'); setTimeout(() => el.isConnected && el.remove(), 520); } }, 3200);
}
function saveSettings() { try { localStorage.setItem('snakeCarnageSettings', JSON.stringify(SETTINGS)); } catch (e) {} }

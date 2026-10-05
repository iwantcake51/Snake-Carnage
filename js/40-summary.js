/* =========================================================
   END OF RUN SUMMARY
   Score, then XP/level progress filling up, then everything eaten (each type with its own little portrait and a
   count that ticks up), the challenges finished this run and anything unlocked. Each part arrives on its own beat.
   ========================================================= */
let sumShownAt = 0;
const runSummaryBusy = () => performance.now() - sumShownAt < 700; // don't let a held Space skip straight past it
const iconCache = {};
function creatureIcon(type, golden) { // a portrait of a target, drawn with the real in-game art
  const key = type + (golden ? 'g' : '') + mapIdx;
  if (iconCache[key]) return iconCache[key];
  const c = document.createElement('canvas'), d = 3, S = 36; c.width = c.height = S * d;
  const x = c.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0);
  const cr2 = makeCreature(type, S / 2, S / 2 + 1, null); cr2.a = -Math.PI / 2; cr2.phase = 1.2; cr2.moveAmt = .6;
  if (golden) goldify(cr2);
  const sc = TYPES[type].r > 8 ? 1.25 : TYPES[type].r > 5 ? 1.7 : 2.3;
  x.translate(S / 2, S / 2); x.scale(sc, sc); x.translate(-S / 2, -S / 2);
  const keep = T; T = 0; drawCreature(x, cr2, true); T = keep;
  return (iconCache[key] = c.toDataURL());
}
const typeName = (t, n) => { const N = { human: ['person', 'people'], astronaut: ['astronaut', 'astronauts'], alien: ['alien', 'aliens'], sheep: ['sheep', 'sheep'], deer: ['deer', 'deer'], firefly: ['firefly', 'fireflies'], clubber: ['clubber', 'clubbers'] }[t];
  return N ? N[n === 1 ? 0 : 1] : t + (n === 1 ? '' : 's'); };
const escAttr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
function chTip(c) { // everything about a finished challenge: what it asked, what you did, what it paid
  const rw = [c.xp ? `+${c.xp} XP` : '', c.chips ? `+${c.chips} <i class="pc"></i>` : '', c.bonus ? `+${Math.round(c.bonus * 100)}% score this run` : ''].filter(Boolean).join(' · ');
  return `<b class="tth">${c.name}</b><span class="ttt"><em class="tier ${c.tier}">${TIERS[c.tier].label}</em>${c.perm ? ` Permanent${c.map ? ' · ' + c.map : ''}` : ''}</span>`
    + `<span class="ttr"><i>Needed</i>${c.t || '—'}</span>`
    + (c.got ? `<span class="ttr"><i>You got</i>${c.got}${c.at != null ? ` · done at ${fmtTime(c.at)}` : ''}</span>` : '')
    + (rw ? `<span class="ttr"><i>Reward</i>${rw}</span>` : '');
}
function showDead() {
  if (showDead.for === deadAt) return; showDead.for = deadAt; // one summary per crash, however many taps or frames land on it
  stage.classList.remove('bars', 'paused');
  sumShownAt = performance.now();
  const m = MAPS[mapIdx].name, best = PROG.best[m] || 0, pb = score >= best && score > 0;
  const types = Object.entries(run.byType).sort((a, b) => b[1] - a[1]);
  const gold = run.goldens || 0, unl = run.unlocks || [], chs = run.chList || [];
  const eatenN = run.killed || 0;
  const tierCls = t => 'tier ' + t;
  const unlockRow = u => {
    if (u.kind === 'ach') { const a = ACH.find(q => q.id === u.id); if (!a) return ''; const rw = achRewards(a.id).filter(([c]) => c !== 'color2');
      return `<li class="un"><i class="uic">${a.secret ? '🗝️' : '🏆'}</i><span><b>${a.name}</b><small>${rw.length ? rw.map(([cat, v]) => `${CAT_LABEL[cat]}${cat.startsWith('color') ? '' : ': ' + v}`).join(' · ') : a.what}${a.chips ? ` · +${a.chips} chips` : ''}</small></span></li>`; }
    if (u.kind === 'perm') return `<li class="un"><i class="uic">🏅</i><span><b>${u.name}</b><small>Permanent ${u.map} challenge · +${u.xp} XP, +${u.chips} chips</small></span></li>`;
    if (u.kind === 'level') return `<li class="un"><i class="uic">⬆</i><span><b>Level ${u.level}</b><small>+${u.coins} bonus chips${u.unlocks ? ' · ' + u.unlocks : ''}</small></span></li>`;
    return '';
  };
  for (let L = run.startLevel + 1; L <= PROG.level; L++) { const ups = UPGRADES.filter(u => u.lvl.includes(L)).map(u => u.name); unl.push({ kind: 'level', level: L, coins: 10 + L * 2, unlocks: ups.length ? 'Upgrades: ' + ups.join(', ') : '' }); }
  overlay.className = 'sumMode';
  overlay.innerHTML = `<div class="panel sum">
    <div class="sh"><h1>${snake && snake.alive ? 'Run over' : 'Crashed'}</h1><span class="smap">${m} · ${fmtTime(run.time)} survived</span></div>
    <div class="srow">
      <div class="sbig" style="--d:.15s"><b data-to="${score}">0</b><span>score${pb ? '<em class="pb">New best</em>' : `<em>Best ${best}</em>`}</span></div>
      <div class="sst" style="--d:.3s"><b data-to="${run.maxCombo}" data-suf="x">0</b><span>best combo</span></div>
      <div class="sst" style="--d:.4s"><b data-to="${eatenN}">0</b><span>eaten</span></div>
      <div class="sst" style="--d:.5s"><b data-to="${gold}">0</b><span>golden</span></div>
    </div>
    <div class="sxp" style="--d:.65s"><span class="slv">Lv <b id="sLv">${run.startLevel}</b></span><span class="sbar"><span class="sfill" id="sFill" style="width:${(run.startXP / xpNeed(run.startLevel) * 100).toFixed(1)}%"></span><span class="stxt" id="sTxt"></span></span>
      <span class="sgain"><b>+<span data-to="${run.xpGained || 0}">0</span> XP</b><b class="c">+<span data-to="${run.coinsGained || 0}">0</span> <i class="pc"></i></b></span></div>
    <div class="scols">
      <div class="seat"><h3>Eaten</h3>${types.length ? `<div class="egrid">${types.map(([t, n], i) => `<div class="et" style="--d:${(1 + i * .09).toFixed(2)}s"><img src="${creatureIcon(t)}" alt=""><span><b>${typeName(t, n)}</b></span><em>×<span data-to="${n}" data-delay="${1000 + i * 90}">0</span></em></div>`).join('')}</div>` : '<p class="none">Nothing. Not a single bite.</p>'}</div>
      <div class="sside">
        <h3>Challenges</h3>${chs.length ? `<ul class="slist">${chs.map((c, i) => `<li class="chi" data-tiph="${escAttr(chTip(c))}" style="--d:${(1.3 + i * .1).toFixed(2)}s"><em class="${tierCls(c.tier)}">${TIERS[c.tier].label}</em>${c.perm ? '<i class="perm">Permanent</i>' : ''}<b>${c.name}</b></li>`).join('')}</ul>` : '<p class="none">None this run.</p>'}
        <h3>Unlocked</h3>${unl.length ? `<ul class="slist">${unl.map((u, i) => unlockRow(u).replace('<li class="un">', `<li class="un" style="--d:${(1.5 + i * .12).toFixed(2)}s">`)).join('')}</ul>` : '<p class="none">Nothing new. Next time.</p>'}
      </div>
    </div>
    <div class="pbtns row"><button class="btn" id="againBtn" data-sfx="none">Retry</button><button class="btn alt" id="menuBtn2" data-sfx="close">Menu</button></div>
    <p class="small">${IS_TOUCH ? '' : 'Space to retry · Esc for the menu'}</p></div>`;
  overlay.style.display = 'flex';
  document.getElementById('againBtn').onclick = () => startGame();
  document.getElementById('menuBtn2').onclick = returnToMenu;
  overlay.querySelectorAll('[data-to]').forEach(el => countUp(el, +el.dataset.to, el.dataset.suf || '', +(el.dataset.delay || 250)));
  setTimeout(() => animateXP(), 750);
}
function countUp(el, to, suf, delay) {
  if (!to) { el.textContent = '0' + suf; return; }
  const dur = Math.min(1100, 300 + to * 18), t0 = performance.now() + delay;
  const step = now => {
    if (!el.isConnected) return;
    const p = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(to * e) + suf;
    if (p < 1) requestAnimationFrame(step); else { el.classList.add('done'); if (to >= 1 && el.closest('.et')) Sfx.tick && Sfx.ui('tick'); }
  };
  requestAnimationFrame(step);
}
function animateXP() { // fill from where the run started to where it ended, flashing at every level gained
  const fill = document.getElementById('sFill'), lv = document.getElementById('sLv'), txt = document.getElementById('sTxt'); if (!fill) return;
  const segs = []; let L = run.startLevel, from = run.startXP;
  while (L < PROG.level) { segs.push([L, from / xpNeed(L), 1]); L++; from = 0; }
  segs.push([PROG.level, from / xpNeed(PROG.level), PROG.xp / xpNeed(PROG.level)]);
  let i = 0;
  const run1 = () => {
    if (!fill.isConnected || i >= segs.length) { txt.textContent = `${PROG.xp} / ${xpNeed(PROG.level)} XP`; return; }
    const [lvl, a, b] = segs[i++], t0 = performance.now(), dur = Math.max(260, (b - a) * 900);
    lv.textContent = lvl; fill.classList.add('instant'); fill.style.width = (a * 100) + '%'; void fill.offsetWidth; fill.classList.remove('instant');
    const step = now => {
      if (!fill.isConnected) return;
      const p = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 2), v = a + (b - a) * e;
      fill.style.width = (v * 100).toFixed(1) + '%'; txt.textContent = `${Math.round(v * xpNeed(lvl))} / ${xpNeed(lvl)} XP`;
      if (p < 1) return requestAnimationFrame(step);
      if (i < segs.length) { lv.textContent = lvl + 1; lv.parentElement.classList.remove('hit'); void lv.offsetWidth; lv.parentElement.classList.add('hit'); Sfx.levelUp(); setTimeout(run1, 260); }
      else run1();
    };
    requestAnimationFrame(step);
  };
  run1();
}

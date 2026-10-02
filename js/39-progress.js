/* =========================================================
   PERMANENT MAP CHALLENGES
   Unlike the 15-minute rotation, these never reset. Every map has five harder goals, judged on a single run,
   tuned to how many people and animals live there. Each pays XP and chips once.
   ========================================================= */
PROG.pmc = PROG.pmc || {};
const PM_SPECIAL = { // one signature goal per map: name, text, run stat, goal, tier
  'Open Field': ['Firefly Season', 'Eat {n} fireflies in one run', r => r.byType.firefly || 0, 10, 'hard'],
  Meadow: ['Pond Life', 'Eat {n} frogs in one run', r => r.byType.frog || 0, 8, 'hard'],
  Town: ['Blackout', 'Break {n} streetlights in one run', r => r.lamps || 0, 6, 'hard'],
  Maze: ['Minotaur', 'Eat {n} people in the dark in one run', r => r.darkKills || 0, 12, 'hard'],
  Farm: ['Whole Farm', 'Eat every kind of farm animal in one combo', r => r.maxComboTypes || 0, 5, 'rare'],
  Park: ['Duck Season', 'Eat {n} ducks in one run', r => r.byType.duck || 0, 6, 'hard'],
  Pool: ['Pool Party Crasher', 'Eat {n} swimmers and sunbathers in one run', r => r.humans || 0, 30, 'rare'],
  Office: ['Mass Layoffs', 'Eat {n} office workers in 60 seconds', r => r.burst60 || 0, 12, 'rare'],
  Checkerboard: ['Checkmate', 'Reach a {n}x combo without touching the outer ring', r => r.maxEdgeCombo || 0, 12, 'rare'],
  Moon: ['One Small Step', 'Eat {n} astronauts in one run', r => r.byType.astronaut || 0, 18, 'hard'],
  Mars: ['Red Planet', 'Eat {n} astronauts in one run', r => r.byType.astronaut || 0, 16, 'hard'],
  'Alien Facility': ['First Contact', 'Eat {n} aliens in one run', r => r.byType.alien || 0, 22, 'hard'],
  'Space Station': ['Hull Breach', 'Eat {n} crew in one run with night vision off', r => r.usedNV ? 0 : r.humans, 18, 'rare'],
  'Red Room': ['Seeing Red', 'Eat {n} people in the dark in one run', r => r.darkKills || 0, 15, 'hard'],
  Club: ['Last Song', 'Reach a {n}x combo on the dance floor', r => r.maxCombo || 0, 22, 'rare'],
};
function permChallenges(map) {
  const m = MAPS.find(q => q.name === map); if (!m) return [];
  const pop = m.pop.reduce((a, q) => a + q[1], 0), f = clamp(pop / 18, .6, 1.4), r5 = v => Math.max(5, Math.round(v * f / 5) * 5);
  const list = [
    { id: 'surv', name: 'Long Haul', t: 'Survive {n} minutes in one run', stat: r => Math.floor(r.time / 60), n: 6, tier: 'medium', unit: ' min' },
    { id: 'eat', name: 'Feeding Frenzy', t: 'Eat {n} targets in one run', stat: r => r.killed, n: r5(45), tier: 'hard' },
    { id: 'combo', name: 'Unbroken', t: 'Reach a {n}x combo', stat: r => r.maxCombo, n: Math.round(16 * f), tier: 'hard' },
    { id: 'score', name: 'Local Legend', t: 'Score {n} in one run', stat: r => r.score, n: r5(400), tier: 'rare' },
  ];
  const sp = PM_SPECIAL[map]; if (sp) list.push({ id: 'special', name: sp[0], t: sp[1], stat: sp[2], n: sp[3], tier: sp[4] });
  const order = { easy: 0, medium: 1, hard: 2, rare: 3 };
  return list.map(c => ({ ...c, t: c.t.replace('{n}', c.n), map })).sort((a, b) => order[a.tier] - order[b.tier]);
}
const pmDone = (map, id) => !!(PROG.pmc[map] || {})[id];
const pmDoneCount = map => Object.keys(PROG.pmc[map] || {}).length;
function checkPermChallenges() {
  const map = MAPS[mapIdx].name, done = PROG.pmc[map] = PROG.pmc[map] || {};
  const best = (PROG.pmBest = PROG.pmBest || {})[map] = PROG.pmBest[map] || {};
  for (const c of permChallenges(map)) {
    const v = c.stat(run); best[c.id] = Math.max(best[c.id] || 0, Math.min(v, c.n));
    if (done[c.id] || v < c.n) continue;
    done[c.id] = Date.now();
    const rw = TIERS[c.tier], xp = Math.round(rw.xp * 1.5), chips = Math.round(rw.chips * 1.5);
    (run.unlocks = run.unlocks || []).push({ kind: 'perm', name: c.name, map, xp, chips });
    (run.chList = run.chList || []).push({ name: c.name, tier: c.tier, perm: true });
    notify({ kind: 'unlock', icon: '🏅', title: `Permanent: ${c.name}`, sub: `${c.t} · +${xp} XP, +${chips} <i class="pc"></i>`, dur: 5 });
    gainXP(xp, chips); saveProg();
  }
}

/* ---- run stats the permanent and secret challenges need ---- */
function progressTick(dt) { // while playing, a few times a second
  if (!run.killed) run.fastT = (run.fastT || 0) + dt; else if (run.lastKillT !== undefined) run.fastT = T - run.lastKillT;
  PROG.maxFastT = Math.max(PROG.maxFastT || 0, run.fastT || 0);
  if (!run.coiled && lights.some(l => l.enc)) { run.coiled = true; PROG.coiled = 1; }
  PROG.longestRun = Math.max(PROG.longestRun || 0, run.time);
}
function progressEat(c) {
  run.lastKillT = T; run.fastT = 0;
  (run.eatT = run.eatT || []).push(T); run.eatT = run.eatT.filter(t => T - t < 60); run.burst60 = Math.max(run.burst60 || 0, run.eatT.length);
  if (light.dark > .45) run.darkKills = (run.darkKills || 0) + 1;
  if (c.golden) { run.goldRun = (run.goldRun || 0) + 1; PROG.maxGoldRun = Math.max(PROG.maxGoldRun || 0, run.goldRun); if (tod > 5 && tod < 7.2 || tod > 17 && tod < 19) PROG.goldenHour = 1; }
  if (MAPS[mapIdx].name === 'Club') PROG.clubMax = Math.max(PROG.clubMax || 0, run.humans + (run.byType.alien || 0));
  if (MAPS[mapIdx].name === 'Checkerboard' && combo) { if (cr.edge >= combo.n) run.maxEdgeCombo = Math.max(run.maxEdgeCombo || 0, combo.n); }
}
NET.on(e => { if (e.type === 'ability') PROG.abilUses = (PROG.abilUses || 0) + 1; });

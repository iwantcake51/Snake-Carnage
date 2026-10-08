/* RUN STATE + BONUS EVENTS */
let run = { score: 0, humans: 0, animals: 0, byType: {}, maxCombo: 0, maxComboTypes: 0, maxDarkCombo: 0, maxPanic: 0, time: 0, usedNV: false, goldens: 0, startPop: 1, killed: 0 };
let evt = null, evtT = 60, chT = .5;
function newRun() {
  cr = newCR();
  run = { score: 0, humans: 0, animals: 0, byType: {}, maxCombo: 0, maxComboTypes: 0, maxDarkCombo: 0, maxPanic: 0, time: 0, usedNV: false, goldens: 0, startPop: 1, killed: 0,
    startLevel: PROG.level, startXP: PROG.xp, xpGained: 0, coinsGained: 0, unlocks: [], chList: [], lamps: 0, spits: 0 };
  evt = null; evtT = rand(45, 75); showEvent();
  airReset(); // (38c-airstrikes)
}
function updateEvents(dt) { // occasional feeding frenzy: double score for a few seconds (in co-op the host calls it for everyone)
  if (state !== 'play') return;
  if (!AUTH()) { if (evt) { evt.t -= dt; if (evt.t <= 0) evt = null; showEvent(); } return; }
  if (evt) { evt.t -= dt; if (evt.t <= 0) { evt = null; evtT = rand(50, 80); netEmit({ t: 'evt', v: null }); } showEvent(); return; }
  if ((evtT -= dt) <= 0) { evt = { type: 'frenzy', t: 10 }; Sfx.chime(); showEvent(); netEmit({ t: 'evt', v: { type: evt.type, t: evt.t } }); }
}
function showEvent() { // the frenzy note carries its own countdown bar
  if (evt && !evt.shown) { evt.shown = true; notify({ kind: 'frenzy', title: 'COMBO FRENZY', sub: 'Double score while it lasts', dur: evt.t, bar: true, key: 'frenzy' }); }
}

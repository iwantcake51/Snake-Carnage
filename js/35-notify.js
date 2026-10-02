/* =========================================================
   NOTIFICATIONS: one stack, top-center under the modifier strip, with a distinct look per kind.
   notify({ kind, icon, title, sub, dur, bar, key }) -- `key` replaces an existing note of the same key instead of stacking.
   ========================================================= */
const NOTE_KINDS = {
  info:   { icon: '•',  cls: 'n-info' },
  mod:    { icon: '🎲', cls: 'n-mod' },
  reset:  { icon: '🔄', cls: 'n-reset' },
  frenzy: { icon: '🔥', cls: 'n-frenzy' },
  goldH:  { icon: '👑', cls: 'n-gold' },
  goldA:  { icon: '✨', cls: 'n-gold n-small' },
  nvg:    { icon: '◉',  cls: 'n-nvg n-small' },
  bad:    { icon: '⚠️', cls: 'n-bad' },
  unlock: { icon: '🏆', cls: 'n-unlock' },
};
const notes = [];
function notify(o) {
  const host = document.getElementById('notes'); if (!host) return;
  const k = NOTE_KINDS[o.kind] || NOTE_KINDS.info, dur = o.dur ?? 2.2;
  if (o.key) { const old = notes.find(n => n.key === o.key); if (old) dropNote(old, true); }
  const el = document.createElement('div');
  el.className = 'note ' + k.cls;
  el.innerHTML = `<i class="ni">${o.icon || k.icon}</i><div class="nt"><b>${o.title}</b>${o.sub ? `<small>${o.sub}</small>` : ''}</div>${o.right ? `<em class="nr">${o.right}</em>` : ''}${o.bar ? '<span class="nbar"><span></span></span>' : ''}`;
  host.prepend(el);
  const n = { el, key: o.key, end: performance.now() + dur * 1000 };
  notes.push(n);
  if (o.bar) { const b = el.querySelector('.nbar span'); b.style.transition = `width ${dur}s linear`; requestAnimationFrame(() => requestAnimationFrame(() => { b.style.width = '0%'; })); }
  n.timer = setTimeout(() => dropNote(n), dur * 1000);
  while (notes.length > 4) dropNote(notes[0], true); // never a wall of notes
  return n;
}
function dropNote(n, fast) {
  const i = notes.indexOf(n); if (i < 0) return; notes.splice(i, 1);
  clearTimeout(n.timer); n.el.classList.add(fast ? 'gone' : 'out');
  setTimeout(() => n.el.remove(), fast ? 160 : 380);
}
function clearNotes() { while (notes.length) dropNote(notes[0], true); }
/* TOOLTIPS: one floating card on <body>, so hover text is never clipped by the game window or a scrolling panel.
   data-tip = plain text; data-tiph = trusted HTML built by the game itself. */
const tipEl = (() => { const t = document.createElement('div'); t.id = 'tip'; document.body.appendChild(t); return t; })();
let tipFor = null;
function placeTip(el) {
  const r = el.getBoundingClientRect(), tw = tipEl.offsetWidth, th = tipEl.offsetHeight, m = 8;
  let x = r.left + r.width / 2 - tw / 2, y = r.bottom + m;
  if (y + th > innerHeight - m) y = r.top - th - m; // no room below: show it above
  tipEl.style.left = clamp(x, m, innerWidth - tw - m) + 'px'; tipEl.style.top = clamp(y, m, innerHeight - th - m) + 'px';
}
function showTip(el) {
  tipFor = el;
  if (el.dataset.tiph !== undefined) tipEl.innerHTML = el.dataset.tiph; else tipEl.textContent = el.dataset.tip;
  tipEl.classList.add('on'); placeTip(el);
}
function hideTip() { tipFor = null; tipEl.classList.remove('on'); }
document.addEventListener('pointerover', e => {
  if (e.pointerType === 'touch') return;
  const el = e.target.closest && e.target.closest('[data-tip],[data-tiph]');
  if (el === tipFor) return;
  if (el) showTip(el); else hideTip();
});
document.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') { const el = e.target.closest && e.target.closest('[data-tip],[data-tiph]'); if (el && el !== tipFor && !el.closest('button')) { showTip(el); setTimeout(() => tipFor === el && hideTip(), 2600); } else hideTip(); } });
addEventListener('scroll', () => tipFor && placeTip(tipFor), true);
new MutationObserver(() => { if (tipFor && !tipFor.isConnected) hideTip(); }).observe(document.body, { childList: true, subtree: true });

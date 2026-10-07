/* =========================================================
   DROPDOWNS: every <select> in the game and the editor becomes a themed button with a list that drops down like a
   helicopter's rope ladder. The rails run out first, then each rung swings down into place one after another, and it
   all sways a moment before settling. Closing pulls the rungs back up from the bottom and the rails after them.
   The real <select> stays in the page (hidden) and keeps the value, so every existing onchange and .value works as before.
   Selects added later (menus re-render, the editor loads on demand) are picked up automatically. Opt out with class "nodd".
   ========================================================= */
const DD = { open: null, list: null, hi: -1, typed: '', typedT: 0 };
function ddLabel(sel) { const o = sel.options[sel.selectedIndex]; return o ? o.textContent : ''; }
function ddSync(sel) { const b = sel._dd; if (!b) return; const t = b.querySelector('.ddv'); const v = ddLabel(sel); if (t.textContent !== v) t.textContent = v; b.disabled = sel.disabled; b.title = sel.title || ''; }
function ddEnhance(sel) {
  if (sel._dd || sel.multiple || sel.classList.contains('nodd') || sel.size > 1) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'dd ' + sel.className; b.setAttribute('aria-haspopup', 'listbox'); b.setAttribute('aria-expanded', 'false');
  b.dataset.sfx = 'none'; if (sel.getAttribute('aria-label')) b.setAttribute('aria-label', sel.getAttribute('aria-label'));
  b.innerHTML = '<span class="ddv"></span><i class="ddc" aria-hidden="true"></i>';
  const cs = getComputedStyle(sel); // keep the select's own size and spacing, so layouts don't shift
  for (const p of ['fontSize', 'flex', 'maxWidth', 'alignSelf']) b.style[p] = cs[p]; // (not margins: an auto margin computes to pixels and would pin the button in place)
  if (sel.style.width) b.style.width = sel.style.width;
  sel._dd = b; b._sel = sel; sel.classList.add('ddsrc'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
  sel.after(b); ddSync(sel);
  b.addEventListener('pointerdown', e => e.stopPropagation()); // so the outside-click close doesn't fire first and reopen it
  b.addEventListener('click', e => { e.stopPropagation(); DD.open === sel ? ddClose() : ddOpen(sel); });
  b.addEventListener('keydown', e => { if (DD.open !== sel && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); e.stopPropagation(); ddOpen(sel); } });
  sel.addEventListener('change', () => ddSync(sel));
}
function ddOpen(sel) {
  if (DD.open) ddClose(true);
  const b = sel._dd; if (!b || sel.disabled) return;
  const r = b.getBoundingClientRect(), k = b.offsetHeight ? r.height / b.offsetHeight : 1; // the menus may be scaled: the list follows
  const L = document.createElement('div'); L.className = 'ddl'; L.setAttribute('role', 'listbox');
  if (b.closest('#editor, #propEd, #matEd, .pewnd')) L.classList.add('ed');
  let n = 0, html = '';
  for (const el of sel.children) {
    if (el.tagName === 'OPTGROUP') { html += `<div class="ddg" style="--i:${n++}">${ddEsc(el.label)}</div>`; for (const o of el.children) html += ddRung(o, n++); }
    else if (el.tagName === 'OPTION') html += ddRung(el, n++);
  }
  L.innerHTML = `<div class="ddin">${html}</div>`; L.style.setProperty('--n', n); L.style.fontSize = getComputedStyle(b).fontSize;
  document.body.appendChild(L);
  const minW = r.width / k, w = Math.max(minW, Math.min(420, L.offsetWidth)); L.style.width = w + 'px';
  const h = L.offsetHeight * k, below = innerHeight - r.bottom - 8, above = r.top - 8, up = h > below && above > below;
  const maxH = (up ? above : below) / k - 6; if (L.offsetHeight > maxH) L.querySelector('.ddin').style.maxHeight = Math.max(120, maxH - 16) + 'px';
  L.style.transform = `scale(${k})`; L.style.transformOrigin = up ? 'bottom left' : 'top left';
  L.style.left = Math.max(6, Math.min(innerWidth - w * k - 6, r.left)) + 'px';
  if (up) { L.classList.add('up'); L.style.bottom = (innerHeight - r.top + 4) + 'px'; } else L.style.top = (r.bottom + 4) + 'px';
  DD.open = sel; DD.list = L; DD.hi = sel.selectedIndex; ddHi(DD.hi, true);
  b.classList.add('on'); b.setAttribute('aria-expanded', 'true');
  L.addEventListener('pointerdown', e => e.stopPropagation());
  L.addEventListener('click', e => { const o = e.target.closest('.ddo'); if (o && !o.classList.contains('dis')) ddPick(+o.dataset.ix); });
  L.addEventListener('pointermove', e => { const o = e.target.closest('.ddo'); if (o) ddHi(+o.dataset.ix); });
  requestAnimationFrame(() => L.classList.add('open'));
  if (typeof Sfx !== 'undefined' && Sfx.ui && SETTINGS.uiSounds !== false) Sfx.ui('open');
}
const ddEsc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function ddRung(o, i) { return `<div class="ddo ${o.selected ? 'cur' : ''} ${o.disabled ? 'dis' : ''}" role="option" data-ix="${o.index}" style="--i:${i}" aria-selected="${o.selected}">${ddEsc(o.textContent)}</div>`; }
function ddHi(ix, scroll) {
  if (!DD.list) return; DD.hi = ix;
  DD.list.querySelectorAll('.ddo').forEach(o => o.classList.toggle('hi', +o.dataset.ix === ix));
  if (scroll) { const o = DD.list.querySelector(`.ddo[data-ix="${ix}"]`); if (o) o.scrollIntoView({ block: 'nearest' }); }
}
function ddPick(ix) {
  const sel = DD.open; if (!sel) return;
  const changed = sel.selectedIndex !== ix; sel.selectedIndex = ix; ddSync(sel); ddClose();
  if (changed) { sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); }
  if (typeof Sfx !== 'undefined' && Sfx.ui && SETTINGS.uiSounds !== false) Sfx.ui('tab');
  sel._dd && sel._dd.focus({ preventScroll: true });
}
function ddClose(now) {
  const L = DD.list, sel = DD.open; DD.open = null; DD.list = null; if (!L) return;
  if (sel && sel._dd) { sel._dd.classList.remove('on'); sel._dd.setAttribute('aria-expanded', 'false'); }
  if (now || document.body.classList.contains('calm')) return L.remove();
  L.classList.remove('open'); L.classList.add('closing'); L.style.pointerEvents = 'none';
  const n = +L.style.getPropertyValue('--n') || 1; setTimeout(() => L.remove(), Math.min(14, n) * 22 + 360); // the rungs go up one by one, then the rails
}
addEventListener('pointerdown', () => { if (DD.open) ddClose(); });
addEventListener('resize', () => { if (DD.open) ddClose(true); });
addEventListener('scroll', e => { if (DD.open && !(DD.list && DD.list.contains(e.target))) ddClose(true); }, true);
addEventListener('blur', () => { if (DD.open) ddClose(true); });
addEventListener('keydown', e => { // while a list is open it has the keyboard: nothing reaches the game
  if (!DD.open) return;
  const sel = DD.open, opts = [...sel.options], ok = i => opts[i] && !opts[i].disabled;
  const step = d => { let i = DD.hi; for (let n = 0; n < opts.length; n++) { i = (i + d + opts.length) % opts.length; if (ok(i)) return ddHi(i, true); } };
  if (e.key === 'ArrowDown') step(1); else if (e.key === 'ArrowUp') step(-1);
  else if (e.key === 'Home') { DD.hi = -1; step(1); } else if (e.key === 'End') { DD.hi = opts.length; step(-1); }
  else if (e.key === 'Enter' || e.key === ' ') { if (ok(DD.hi)) ddPick(DD.hi); else ddClose(); }
  else if (e.key === 'Escape' || e.key === 'Tab') { ddClose(); sel._dd && sel._dd.focus({ preventScroll: true }); if (e.key === 'Tab') return; }
  else if (e.key.length === 1) { const now = performance.now(); DD.typed = (now - DD.typedT < 700 ? DD.typed : '') + e.key.toLowerCase(); DD.typedT = now; // type to jump
    const i = opts.findIndex(o => !o.disabled && o.textContent.toLowerCase().startsWith(DD.typed)); if (i >= 0) ddHi(i, true); }
  else return;
  e.preventDefault(); e.stopImmediatePropagation();
}, true);
/* a value set from code shows on the button too */
for (const p of ['value', 'selectedIndex']) {
  const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, p);
  if (d && d.set) Object.defineProperty(HTMLSelectElement.prototype, p, { configurable: true, enumerable: d.enumerable, get: d.get, set(v) { d.set.call(this, v); if (this._dd) ddSync(this); } });
}
function ddScan(root) { if (root.tagName === 'SELECT') ddEnhance(root); else if (root.querySelectorAll) root.querySelectorAll('select').forEach(ddEnhance); }
new MutationObserver(ms => {
  for (const m of ms) {
    if (m.type === 'attributes') { if (m.target._dd) ddSync(m.target); continue; }
    for (const n of m.addedNodes) if (n.nodeType === 1) ddScan(n);
    for (const n of m.removedNodes) if (n.nodeType === 1) { const gone = n.tagName === 'SELECT' ? [n] : n.querySelectorAll ? n.querySelectorAll('select') : []; for (const s of gone) { if (s._dd && s._dd.isConnected && !s.isConnected) s._dd.remove(); if (DD.open === s) ddClose(true); } }
    if (m.type === 'childList' && m.target.tagName === 'SELECT' && m.target._dd) ddSync(m.target); // options changed
  }
}).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
ddScan(document.body);

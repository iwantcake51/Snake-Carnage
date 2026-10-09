/* =========================================================
   ANIMATION EDITOR: a floating panel over the game for every animation in ANIM_DEFS (03g-anim).
   Pick one on the left, drag its sliders on the right: the world behind changes as you drag, and creatures also play
   in a preview (walking, running, standing, panicking or dancing). Values save per browser; Reset puts one or all back,
   Copy and Paste move a whole setup between browsers as text. Opened from Settings › Display or the admin panel.
   ========================================================= */
const AE = { el: null, sel: 'walk', st: null, raf: 0, c: null, ct: 0, last: 0 };
const AE_STATES = { human: ['walk', 'run', 'idle', 'panic', 'dance'], dog: ['walk', 'run', 'idle'], cat: ['walk', 'run', 'idle'], rabbit: ['idle', 'walk'], deer: ['idle', 'walk', 'run'], chicken: ['idle', 'walk', 'run'], rat: ['walk', 'run', 'idle'], alien: ['idle', 'walk', 'run'], firefly: ['idle', 'walk'] };
const AE_STATE_NAME = { walk: 'Walk', run: 'Run', idle: 'Stand', panic: 'Panic', dance: 'Dance' };
const aeDef = id => ANIM_DEFS.find(d => d.id === id);
const aeChanged = d => d.p.some(k => AN[d.id][k] !== 1);
function openAnimEditor() {
  if (AE.el) { closeAnimEditor(); return; }
  const el = AE.el = document.createElement('div'); el.id = 'animEd'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Animation editor');
  const groups = [...new Set(ANIM_DEFS.map(d => d.g))];
  el.innerHTML = `<div class="ae-head"><b>Animation editor</b><small>Changes show live behind this panel</small><button class="ae-x" title="Close" aria-label="Close">×</button></div>
    <div class="ae-body"><nav class="ae-list">${groups.map(g => `<h5>${g}</h5>${ANIM_DEFS.filter(d => d.g === g).map(d => `<button data-id="${d.id}" class="${aeChanged(d) ? 'chg' : ''}">${d.name}</button>`).join('')}`).join('')}</nav>
      <section class="ae-detail"></section></div>
    <div class="ae-foot"><button class="ae-resetall">Reset all</button><span class="sp"></span><button class="ae-copy">Copy</button><button class="ae-paste">Paste</button></div>`;
  document.body.appendChild(el);
  el.querySelector('.ae-x').onclick = closeAnimEditor;
  el.querySelectorAll('.ae-list [data-id]').forEach(b => b.onclick = () => aeSelect(b.dataset.id));
  el.querySelector('.ae-resetall').onclick = () => { if (!confirm('Put every animation back to how it was designed?')) return; for (const d of ANIM_DEFS) for (const k of d.p) AN[d.id][k] = 1; animSave(); aeSelect(AE.sel); aeMarks(); };
  el.querySelector('.ae-copy').onclick = () => { const txt = localStorage.getItem(ANIM_KEY) || '{}'; (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => aeToast('Copied'), () => prompt('Copy this:', txt)); };
  el.querySelector('.ae-paste').onclick = () => { const txt = prompt('Paste an animation setup:'); if (!txt) return; try { const o = JSON.parse(txt); if (!o || typeof o !== 'object') throw 0; localStorage.setItem(ANIM_KEY, JSON.stringify(o)); animLoad(); animSave(); aeSelect(AE.sel); aeMarks(); aeToast('Pasted'); } catch (e) { aeToast("That isn't an animation setup"); } };
  aeDrag(el, el.querySelector('.ae-head'));
  aeSelect(AE.sel);
  AE.last = performance.now(); AE.raf = requestAnimationFrame(aeTick);
}
function closeAnimEditor() { if (!AE.el) return; cancelAnimationFrame(AE.raf); AE.el.remove(); AE.el = null; }
function aeToast(t) { const f = AE.el && AE.el.querySelector('.ae-foot .sp'); if (!f) return; f.textContent = t; clearTimeout(aeToast.t); aeToast.t = setTimeout(() => { f.textContent = ''; }, 1600); }
function aeMarks() { if (AE.el) AE.el.querySelectorAll('.ae-list [data-id]').forEach(b => b.classList.toggle('chg', aeChanged(aeDef(b.dataset.id)))); }
function aeSelect(id) {
  const d = aeDef(id) || ANIM_DEFS[0]; AE.sel = d.id;
  AE.el.querySelectorAll('.ae-list [data-id]').forEach(b => b.classList.toggle('on', b.dataset.id === d.id));
  const sts = d.prev ? AE_STATES[d.prev] || ['walk', 'idle'] : null;
  if (!sts || !sts.includes(AE.st)) AE.st = d.st || (sts ? sts[0] : null);
  if (d.prev && (!AE.c || AE.c.type !== d.prev)) AE.c = null;
  const box = AE.el.querySelector('.ae-detail');
  box.innerHTML = `<h4>${d.name}</h4><p>${d.desc}</p>
    ${d.p.map(k => { const [lab, mn, mx] = ANP[k], v = AN[d.id][k]; return `<label class="ae-sl"><span>${lab}</span><input type="range" min="${mn}" max="${mx}" step=".05" value="${v}" data-k="${k}"><output>${Math.round(v * 100)}%</output></label>`; }).join('')}
    <div class="ae-btns"><button class="ae-reset">Reset this one</button><button class="ae-still">${d.p.includes('sp') ? 'Freeze' : ''}</button></div>
    ${d.prev ? `<canvas class="ae-prev" width="440" height="220"></canvas><div class="ae-st">${sts.map(s => `<button data-st="${s}" class="${s === AE.st ? 'on' : ''}">${AE_STATE_NAME[s]}</button>`).join('')}</div>` : `<p class="ae-note">${d.g === 'Snake' ? 'Watch your snake in a run.' : 'Watch it in a run, behind this panel.'}</p>`}`;
  box.querySelectorAll('input[type=range]').forEach(r => r.oninput = () => { AN[d.id][r.dataset.k] = +r.value; r.nextElementSibling.textContent = Math.round(r.value * 100) + '%'; animSave(); aeMarks(); });
  box.querySelector('.ae-reset').onclick = () => { for (const k of d.p) AN[d.id][k] = 1; animSave(); aeSelect(d.id); aeMarks(); };
  const fz = box.querySelector('.ae-still'); if (!d.p.includes('sp')) fz.remove(); else fz.onclick = () => { const r = box.querySelector('input[data-k="sp"]'); r.value = AN[d.id].sp = AN[d.id].sp ? 0 : 1; r.oninput(); };
  box.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { AE.st = b.dataset.st; box.querySelectorAll('[data-st]').forEach(q => q.classList.toggle('on', q === b)); });
}
function aeTick(now) {
  if (!AE.el) return; AE.raf = requestAnimationFrame(aeTick);
  const dt = Math.min(.05, (now - AE.last) / 1000); AE.last = now; AE.ct += dt;
  const d = aeDef(AE.sel), cv = d && d.prev && AE.el.querySelector('.ae-prev'); if (!cv) return;
  if (!AE.c) { AE.c = makeCreature(d.prev, 0, 0, null); AE.c.a = 0; AE.c.flail = true; AE.c.seed = AE.c.seed ?? .5; AE.c.stains = []; }
  const c = AE.c, df = c.def, st = AE.st, mv = st === 'walk' || st === 'run' || st === 'panic';
  c.state = st === 'run' ? 'flee' : st === 'panic' ? 'panic' : st === 'walk' ? 'wander' : 'idle'; c.dance = st === 'dance'; c.hz = 0;
  const moved = mv ? (st === 'walk' ? df.walk : df.run) * dt : 0;
  c.moveAmt += ((mv ? 1 : 0) - c.moveAmt) * Math.min(1, dt * 8);
  c.phase = (c.phase || 0) + moved * (df.human ? .3 * AN.walk.sp : .5 * AN.gait.sp) / Math.max(.7, df.r / 7); // as the AI steps them (26-creature-ai)
  const x = cv.getContext('2d'), w = cv.width, h = cv.height, k = df.r > 8 ? 5 : df.r > 5 ? 7 : 10;
  x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#3d5a2c'; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 1; const off = (AE.ct * (mv ? (st === 'walk' ? df.walk : df.run) : 0) * k) % 40; // the ground slides by, so it reads as moving
  for (let gx = -off; gx < w; gx += 40) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, h); x.stroke(); }
  x.translate(w / 2, h / 2); x.scale(k, k);
  const keep = T; T = AE.ct; try { drawCreature(x, c, true); } catch (e) {} T = keep; // the preview runs on its own clock, even with the game paused or in the menu
}
function aeDrag(el, handle) {
  handle.onpointerdown = e => { if (e.target.closest('button')) return; const r = el.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top; handle.setPointerCapture(e.pointerId);
    handle.onpointermove = m => { el.style.left = clamp(m.clientX - ox, 0, innerWidth - 120) + 'px'; el.style.top = clamp(m.clientY - oy, 0, innerHeight - 40) + 'px'; el.style.right = 'auto'; };
    handle.onpointerup = () => { handle.onpointermove = null; }; };
}
document.addEventListener('click', e => { if (e.target.closest('[data-act="animEd"]')) openAnimEditor(); }); // (Settings › Display, the admin panel)
document.addEventListener('keydown', e => { if (e.key === 'Escape' && AE.el && AE.el.contains(document.activeElement)) { e.stopPropagation(); closeAnimEditor(); } }, true);

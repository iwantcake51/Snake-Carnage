/* =========================================================
   SKILL TREE SCREEN
   The tree from 38-upgrades drawn as three branches growing out of one coil: Survival (left), Predator (middle),
   Fortune (right). Majors are hexagonal scales, passives are round with a tick per rank. Links are S-curves.
   Ranks cost skill tokens (one per level gained); Reset tree hands every token back.
   Drag or pinch to pan, wheel or pinch to zoom, arrows to walk the nodes, Enter to buy. Selecting a node fills the
   details panel (always there, never moves). Buying updates everything in place: no rebuild, the camera stays put.
   ========================================================= */
const SK_W = 2200, SK_H = 960, SK_HUB = { x: 1100, y: 905 };
let skCam = null, skSel = 'speed'; // the camera and the selected node survive leaving and coming back (this session)
const skCalm = () => SETTINGS.reduceMotion || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
const skLv = () => PROG.level;
function skWhy(n) { // every reason the next rank can't be bought right now (tokens aside), in order; [] when it can
  const r = skOwn(n.id), out = [];
  if (r >= n.max) return [{ k: 'max' }];
  if (!r) for (const [id, need] of n.req) { const have = skOwn(id); if (have < need) out.push({ k: 'req', id, need, have }); }
  const nl = skNeedLv(n, r); if (nl && skLv() < nl) out.push({ k: 'lvl', need: nl, rank: r + 1 });
  return out;
}
const skState = n => { const r = skOwn(n.id); return r >= n.max ? 'max' : r ? 'own' : skWhy(n).length ? 'locked' : 'avail'; };
const skCost = n => n.cost[Math.min(skOwn(n.id), n.max - 1)]; // in skill tokens
const skLeft = () => Math.max(0, skTokens());
const tokN = n => `${n} token${n === 1 ? '' : 's'}`;
const skReqText = q => { const p = SKN[q.id]; return p.max > 1 ? `${p.name} at rank ${q.need}` : p.name; };
function skWhyText(n) {
  const w = skWhy(n), q = w[0];
  if (!q) return skLeft() < skCost(n) ? `You need ${tokN(skCost(n) - skLeft())} more. You get one every time you level up.` : '';
  if (q.k === 'max') return '';
  if (q.k === 'req') return `Locked: needs ${skReqText(q)}${SKN[q.id].max > 1 && q.have ? ` (you have rank ${q.have})` : ''} first.`;
  return `Locked: ${n.max > 1 && q.rank > 1 ? `rank ${q.rank}` : 'it'} opens at level ${q.need} (you're level ${skLv()}).`;
}
const skillReady = () => SKILL_TREE.some(n => skOwn(n.id) < n.max && !skWhy(n).length && skLeft() >= skCost(n)); // something you can buy right now (the main menu's note)
const skBranchRanks = br => SKILL_TREE.reduce((a, n) => a + (n.br === br ? skOwn(n.id) : 0), 0);

/* ---- drawing ---- */
const SK_HEX = (r) => Array.from({ length: 6 }, (_, k) => { const a = (-90 + 60 * k) * Math.PI / 180; return (Math.cos(a) * r).toFixed(1) + ',' + (Math.sin(a) * r).toFixed(1); }).join(' ');
function skArc(r, a0, a1) { const p = a => [(Math.cos(a) * r).toFixed(2), (Math.sin(a) * r).toFixed(2)]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}`; }
function skTicks(n, r) { // one arc per rank round the node; lit = bought
  const gap = .2, step = TAU / n.max, own = skOwn(n.id);
  return Array.from({ length: n.max }, (_, k) => { const a0 = -Math.PI / 2 + k * step + gap / 2, a1 = a0 + step - gap; return `<path class="tk${k < own ? ' on' : ''}" pathLength="1" d="${skArc(r, a0, a1)}"/>`; }).join('');
}
const SK_LOCK = '<g class="sklock"><circle r="8.5" class="lkbg"/><rect x="-4.5" y="-1" width="9" height="7" rx="1.5"/><path d="M-2.7 -1v-2.2a2.7 2.7 0 0 1 5.4 0V-1" fill="none"/></g>';
function skHexPt(r, t) { // a point a fraction t (0..1) of the way round a pointy-top hexagon, clockwise from the top
  const e = ((t % 1) + 1) % 1 * 6, k = Math.floor(e), f = e - k, a0 = (-90 + 60 * k) * Math.PI / 180, a1 = (-90 + 60 * (k + 1)) * Math.PI / 180;
  return [Math.cos(a0) * r * (1 - f) + Math.cos(a1) * r * f, Math.sin(a0) * r * (1 - f) + Math.sin(a1) * r * f];
}
function skHexTicks(n, r) { // a ranked major's ticks follow its own hexagon (one stretch of the outline per rank), so it reads as one shape, not a ring round a hexagon
  const own = skOwn(n.id), gap = .022;
  return Array.from({ length: n.max }, (_, k) => { const t0 = k / n.max + gap, t1 = (k + 1) / n.max - gap, pts = [skHexPt(r, t0)];
    for (let v = Math.ceil(t0 * 6); v / 6 < t1; v++) pts.push(skHexPt(r, v / 6)); pts.push(skHexPt(r, t1));
    return `<path class="tk${k < own ? ' on' : ''}" pathLength="1" d="M${pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L')}"/>`; }).join('');
}
function skNodeSvg(n) {
  if (n.major) return `<svg class="skshape" viewBox="-48 -48 96 96" aria-hidden="true"><polygon class="skbr" points="${SK_HEX(n.max > 1 ? 50 : 45)}"/><polygon class="sko" points="${SK_HEX(n.max > 1 ? 35 : 37)}"/><polygon class="ski" points="${SK_HEX(n.max > 1 ? 29 : 31)}"/>${n.max > 1 ? `<g class="tks">${skHexTicks(n, 42)}</g>` : ''}<polygon class="skburst" points="${SK_HEX(40)}"/><g transform="translate(${n.max > 1 ? '31 -33' : '27 -31'})">${SK_LOCK}</g></svg>`;
  return `<svg class="skshape" viewBox="-36 -36 72 72" aria-hidden="true"><circle class="skbr" r="34"/><circle class="sko" r="23"/><circle class="ski" r="19"/><g class="tks">${skTicks(n, 29)}</g><circle class="skburst" r="28"/><g transform="translate(21 -21)">${SK_LOCK}</g></svg>`;
}
function skSub(n) { // the small line under a node's name: its rank, and what the next one costs or waits on
  const st = skState(n), r = skOwn(n.id), off = PROG.treeOff[n.id] && r, why = skWhy(n), lv = why.find(q => q.k === 'lvl');
  const next = lv && !why.some(q => q.k === 'req') ? `Level ${lv.need}` : why.length ? 'Locked' : `<i class="tok"></i>${skCost(n)}`;
  if (n.max === 1) return off ? 'Off' : st === 'max' ? 'Unlocked' : next;
  return `<span class="skrk">${r}/${n.max}</span>${off ? ' · Off' : st === 'max' ? ' · Max' : r || st === 'avail' || lv ? ' · ' + next : ''}`;
}
const skAria = n => `${n.name}, ${SK_BRANCH[n.br].name}, ${n.major ? 'major skill' : 'passive'}, rank ${skOwn(n.id)} of ${n.max}, ${({ max: n.major ? 'unlocked' : 'maxed', own: 'purchased', avail: 'available', locked: 'locked' })[skState(n)]}`;
function skNodeHtml(n) {
  return `<button class="skn ${n.major ? 'maj' : 'pas'} br-${n.br}" data-n="${n.id}" data-sfx="none" style="left:${n.x}px;top:${n.y}px" aria-label="${attr(skAria(n))}">${skNodeSvg(n)}<span class="skico">${upIcon(n.icon)}</span><span class="skl"><b>${n.name}</b><em>${skSub(n)}</em></span></button>`;
}
const skLinks = () => { const L = []; for (const n of SKILL_TREE) { if (!n.req.length) L.push({ a: null, b: n, need: 1 }); for (const [id, need] of n.req) L.push({ a: SKN[id], b: n, need }); } return L; };
function skPath(a, b) { // an S-curve, like a snake's body: leaves the parent heading up, arrives at the child heading up
  const x1 = a ? a.x : SK_HUB.x, y1 = a ? a.y : SK_HUB.y, x2 = b.x, y2 = b.y, my = (y1 + y2) / 2;
  return `M${x1} ${y1}C${x1} ${my} ${x2} ${my} ${x2} ${y2}`;
}
function skLinkState(l) { const rb = skOwn(l.b.id); return rb ? 'on' : skWhy(l.b).some(q => q.k === 'req') ? 'off' : 'open'; }
function skLinksSvg() {
  return skLinks().map(l => `<path class="skln br-${l.b.br} ${l.a ? '' : 'trunk'} ${skLinkState(l)}" data-a="${l.a ? l.a.id : ''}" data-b="${l.b.id}" d="${skPath(l.a, l.b)}"/>`).join('');
}
function skHubHtml() { // where the three branches meet: how much of the tree you own
  const tot = SKILL_TREE.reduce((a, n) => a + n.max, 0), own = SKILL_TREE.reduce((a, n) => a + skOwn(n.id), 0);
  return `<div class="skhub" style="left:${SK_HUB.x}px;top:${SK_HUB.y}px"><i class="knot"></i><b id="skHubN">${own}</b><small>of ${tot} ranks</small></div>`;
}
const SK_LABEL = { surv: { x: 360, y: 870 }, pred: { x: 1100, y: 190 }, fort: { x: 1860, y: 870 } };
const skBranchLabel = br => `<div class="skbl br-${br}" style="left:${SK_LABEL[br].x}px;top:${SK_LABEL[br].y}px"><span>${SK_BRANCH[br].name}</span><b data-brn="${br}">${skBranchRanks(br)}</b></div>`;

/* ---- the screen ---- */
function showSkillTree() {
  overlay.className = 'menuMode';
  if (!SKN[skSel]) skSel = 'speed';
  overlay.innerHTML = `<div class="panel sktree" role="dialog" aria-label="Skill Tree">
    <header class="skh"><button class="mm-back" id="backBtn" data-sfx="close">${ICO.back}<span>Back</span></button><h1>Skill Tree</h1>
      <span class="sp"></span><button class="mm-q" id="skReset" data-sfx="none" data-tip="Take every skill back and get all your tokens back">Reset tree</button><span class="sklvl">Level <b>${PROG.level}</b></span><span class="coinpill tokpill" id="skTok" data-tip="Skill tokens: you get one every time you level up"><i class="tok"></i> <b>${skLeft()}</b><span class="tkw"> tokens</span></span></header>
    <div class="skbody">
      <div class="skview" id="skView">
        <div class="skworld" id="skWorld" style="width:${SK_W}px;height:${SK_H}px">
          <svg class="sklinks" id="skLinks" viewBox="0 0 ${SK_W} ${SK_H}" width="${SK_W}" height="${SK_H}" aria-hidden="true">${skLinksSvg()}</svg>
          ${skHubHtml()}${Object.keys(SK_BRANCH).map(skBranchLabel).join('')}
          <div class="sknodes" role="group" aria-label="Skills">${SKILL_TREE.map(skNodeHtml).join('')}</div>
        </div>
        <div class="skctl" role="toolbar" aria-label="View">
          <button id="skFit" data-sfx="tab" data-tip="Fit the whole tree (F)">${skCtlIcon('fit')}<span>Fit tree</span></button>
          ${Object.keys(SK_BRANCH).map(b => `<button class="br-${b}" data-focus="${b}" data-sfx="tab" data-tip="${SK_BRANCH[b].blurb} (${SK_BRANCH[b].key})"><i class="dot"></i><span>${SK_BRANCH[b].name}</span></button>`).join('')}
          <span class="sp"></span>
          <button id="skOut" data-sfx="tab" aria-label="Zoom out">${skCtlIcon('minus')}</button><button id="skIn" data-sfx="tab" aria-label="Zoom in">${skCtlIcon('plus')}</button>
        </div>
        <p class="skhint">${IS_TOUCH ? 'Drag to move, pinch to zoom, tap a skill' : 'Drag to move · wheel to zoom · arrows pick a skill · Enter upgrades'}</p>
      </div>
      <aside class="skinfo" id="skInfo" aria-live="polite"></aside>
    </div></div>`;
  document.getElementById('backBtn').onclick = () => transitionTo(showMenu);
  document.getElementById('skReset').onclick = skReset;
  skWire(); skRefresh(); skMarkSel(); skInfo(false); skBoot();
  requestAnimationFrame(() => { // on a touch screen, start where the names are big enough to read and tap (Fit tree still shows it all)
    if (!skCam) { skFit(false); if ((skPhone() || IS_TOUCH) && skCam.z < .62) skCenterOn({ x: SKN[skSel].x, y: SKN[skSel].y - 130 }, false); }
    else { skClamp(); skApply(); }
    skMarkSel(); });
}
function skCtlIcon(k) {
  const P = { fit: '<path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4"/>', plus: '<path d="M10 4v12M4 10h12"/>', minus: '<path d="M4 10h12"/>' };
  return `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">${P[k]}</svg>`;
}
const skEl = id => document.getElementById(id);
function skViewSize() { const v = skEl('skView'); return v ? { w: v.clientWidth, h: v.clientHeight } : { w: 800, h: 500 }; }
function skApply(glide) {
  const w = skEl('skWorld'); if (!w || !skCam) return;
  w.classList.toggle('glide', !!glide && !skCalm());
  w.style.transform = `translate(${skCam.x.toFixed(1)}px,${skCam.y.toFixed(1)}px) scale(${skCam.z.toFixed(4)})`;
  w.style.setProperty('--z', skCam.z.toFixed(3)); w.classList.toggle('far', skCam.z < .5); // right out: names only
}
function skBounds(nodes) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of nodes) { x0 = Math.min(x0, n.x - 80); x1 = Math.max(x1, n.x + 80); y0 = Math.min(y0, n.y - 56); y1 = Math.max(y1, n.y + 80); }
  return { x0, y0, x1, y1 };
}
const SK_ALL = () => [...SKILL_TREE, { x: SK_HUB.x, y: SK_HUB.y + 10 }, ...Object.values(SK_LABEL).map(p => ({ x: p.x, y: p.y }))];
function skFrame(b, glide, zmax = 1.15) {
  const { w, h } = skViewSize(), pad = 16, top = 54, bot = 26, z = clamp(Math.min((w - pad * 2) / (b.x1 - b.x0), (h - top - bot) / (b.y1 - b.y0), zmax), .32, 1.9); // room for the controls on top and the hint below
  skCam = { z, x: w / 2 - (b.x0 + b.x1) / 2 * z, y: top + (h - top - bot) / 2 - (b.y0 + b.y1) / 2 * z }; skClamp(); skApply(glide);
}
const skFit = glide => skFrame(skBounds(SK_ALL()), glide);
const skPhone = () => document.body.classList.contains('phone');
function skCenterOn(n, glide, z = .72) { // a phone's screen is too short to frame a whole branch readably: centre on a node at a size you can read and tap, and pan from there
  const { w, h } = skViewSize(); skCam = { z, x: w / 2 - n.x * z, y: 54 + (h - 80) / 2 - n.y * z }; skClamp(); skApply(glide); }
function skFocusBranch(br) { const ns = SKILL_TREE.filter(n => n.br === br), root = ns.find(n => !n.req.length);
  if (skPhone()) skCenterOn({ x: root.x, y: root.y - 200 }, true); else skFrame(skBounds([...ns, SK_LABEL[br]]), true, 1.35); if (root && !SKILL_TREE.some(n => n.id === skSel && n.br === br)) skSelect(root.id, false); }
function skClamp() { // never lose the tree: a good piece of it stays on screen
  const { w, h } = skViewSize(), b = skBounds(SK_ALL()), m = 140, z = skCam.z;
  skCam.x = clamp(skCam.x, Math.min(m - b.x1 * z, w - m - b.x0 * z), Math.max(m - b.x1 * z, w - m - b.x0 * z));
  skCam.y = clamp(skCam.y, Math.min(m - b.y1 * z, h - m - b.y0 * z), Math.max(m - b.y1 * z, h - m - b.y0 * z));
}
function skZoom(f, cx, cy, glide) { // zoom about a point in the view (its center by default)
  const { w, h } = skViewSize(); if (cx === undefined) { cx = w / 2; cy = h / 2; }
  const z = clamp(skCam.z * f, .32, 1.9), k = z / skCam.z; skCam.x = cx - (cx - skCam.x) * k; skCam.y = cy - (cy - skCam.y) * k; skCam.z = z; skClamp(); skApply(glide);
}
function skReveal(n) { // keep a node selected with the keyboard on screen
  const { w, h } = skViewSize(), sx = skCam.x + n.x * skCam.z, sy = skCam.y + n.y * skCam.z, mx = 90, my = 80;
  if (sx > mx && sx < w - mx && sy > my && sy < h - my - 40) return;
  if (sx < mx || sx > w - mx) skCam.x += w / 2 - sx; if (sy < my || sy > h - my - 40) skCam.y += h / 2 - sy; skClamp(); skApply(true);
}
function skWire() {
  const view = skEl('skView'), world = skEl('skWorld'), P = new Map(); let drag = null, moved = false;
  const local = e => { const r = view.getBoundingClientRect(), s = r.width / view.offsetWidth || 1; return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s }; };
  view.addEventListener('pointerdown', e => {
    if (e.target.closest('.skctl')) return;
    P.set(e.pointerId, local(e)); moved = false; world.classList.remove('glide'); skStopMotion();
    if (P.size === 1) drag = { p: local(e), cam: { ...skCam }, vx: 0, vy: 0, lt: performance.now(), lp: local(e) };
    else if (P.size === 2) { const [a, b] = [...P.values()]; drag = { pinch: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, cam: { ...skCam } }; moved = true; }
  });
  view.addEventListener('pointermove', e => {
    if (!P.has(e.pointerId) || !drag) return; P.set(e.pointerId, local(e));
    if (drag.pinch && P.size >= 2) { const [a, b] = [...P.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, z = clamp(drag.cam.z * d / drag.pinch, .32, 1.9), k = z / drag.cam.z;
      skCam = { z, x: mid.x - (drag.mid.x - drag.cam.x) * k, y: mid.y - (drag.mid.y - drag.cam.y) * k }; skClamp(); skApply(); return; }
    const p = local(e), dx = p.x - drag.p.x, dy = p.y - drag.p.y;
    if (!moved && Math.hypot(dx, dy) < 7) return;
    if (!moved) { moved = true; view.classList.add('dragging'); try { view.setPointerCapture(e.pointerId); } catch (err) {} }
    skCam = { ...drag.cam, x: drag.cam.x + dx, y: drag.cam.y + dy }; skClamp(); skApply();
    const now = performance.now(), ddt = Math.max(1, now - drag.lt); drag.vx = drag.vx * .5 + (p.x - drag.lp.x) / ddt * .5; drag.vy = drag.vy * .5 + (p.y - drag.lp.y) / ddt * .5; drag.lt = now; drag.lp = p; // how fast it's being flung
  });
  const up = e => { P.delete(e.pointerId); if (P.size === 1 && drag && drag.pinch) { const p = [...P.values()][0]; drag = { p, cam: { ...skCam } }; return; } if (!P.size) { if (drag && moved && !drag.pinch && performance.now() - drag.lt < 80) skFling(drag.vx, drag.vy); drag = null; view.classList.remove('dragging'); } };
  view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
  view.addEventListener('click', e => { // a tap on a node selects it (never after a drag)
    if (moved) { moved = false; return; }
    const b = e.target.closest('.skn'); if (b) skSelect(b.dataset.n, false);
  });
  view.addEventListener('wheel', e => { e.preventDefault(); const p = local(e); skZoomSmooth(Math.exp(-clamp(e.deltaY, -120, 120) * .0016), p.x, p.y); }, { passive: false });
  skEl('skFit').onclick = () => skFit(true);
  skEl('skIn').onclick = () => skZoom(1.25, undefined, undefined, true);
  skEl('skOut').onclick = () => skZoom(.8, undefined, undefined, true);
  view.querySelectorAll('[data-focus]').forEach(b => b.onclick = () => skFocusBranch(b.dataset.focus));
  overlay.querySelector('.sktree').addEventListener('keydown', skKeys);
  addEventListener('resize', skResize);
}
/* motion: the wheel eases the zoom in over a few frames, and a flung drag keeps drifting a moment and settles (both off with reduced motion) */
const SKM = { z: 0, cx: 0, cy: 0, zr: 0, fr: 0 };
function skStopMotion() { cancelAnimationFrame(SKM.zr); cancelAnimationFrame(SKM.fr); SKM.zr = SKM.fr = 0; }
function skZoomSmooth(f, cx, cy) {
  if (skCalm()) return skZoom(f, cx, cy);
  if (!SKM.zr) SKM.z = skCam.z; SKM.z = clamp(SKM.z * f, .32, 1.9); SKM.cx = cx; SKM.cy = cy;
  if (SKM.zr) return;
  const step = () => { const d = SKM.z / skCam.z; if (!skEl('skWorld') || Math.abs(d - 1) < .003) { SKM.zr = 0; return; } skZoom(1 + (d - 1) * .3, SKM.cx, SKM.cy); SKM.zr = requestAnimationFrame(step); };
  SKM.zr = requestAnimationFrame(step);
}
function skFling(vx, vy) {
  if (skCalm() || Math.hypot(vx, vy) < .25) return; let last = performance.now();
  const step = now => { const dt = Math.min(40, now - last); last = now; vx *= Math.exp(-dt / 160); vy *= Math.exp(-dt / 160);
    if (!skEl('skWorld') || Math.hypot(vx, vy) < .02) { SKM.fr = 0; return; } skCam.x += vx * dt; skCam.y += vy * dt; skClamp(); skApply(); SKM.fr = requestAnimationFrame(step); };
  SKM.fr = requestAnimationFrame(step);
}
function skResize() { if (!skEl('skView')) return removeEventListener('resize', skResize); skClamp(); skApply(); }
function skKeys(e) {
  const t = e.target, onNode = t && t.classList && t.classList.contains('skn');
  if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT')) return;
  const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  let done = true;
  if (dirs[e.code]) { const [dx, dy] = dirs[e.code], cur = SKN[skSel]; let best = null, bs = Infinity;
    for (const n of SKILL_TREE) { if (n === cur) continue; const vx = n.x - cur.x, vy = n.y - cur.y, along = vx * dx + vy * dy, side = Math.abs(vx * dy - vy * dx); if (along <= 10) continue; const sc = along + side * 2.2; if (sc < bs) { bs = sc; best = n; } }
    if (best) { skSelect(best.id, true); Sfx.ui('hover'); } }
  else if ((e.code === 'Enter' || e.code === 'Space') && onNode) { if (t.dataset.n === skSel) skBuy(skSel); else skSelect(t.dataset.n, true); }
  else if (e.code === 'KeyF') skFit(true);
  else if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') skFocusBranch(Object.keys(SK_BRANCH)[+e.code.slice(5) - 1]);
  else if (e.code === 'Equal' || e.code === 'NumpadAdd') skZoom(1.25, undefined, undefined, true);
  else if (e.code === 'Minus' || e.code === 'NumpadSubtract') skZoom(.8, undefined, undefined, true);
  else done = false;
  if (done) { e.preventDefault(); e.stopPropagation(); }
}
function skMarkSel() { overlay.querySelectorAll('.skn').forEach(b => { const on = b.dataset.n === skSel; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', String(on)); }); }
function skSelect(id, kbd) {
  if (!SKN[id]) return; const same = id === skSel; skSel = id; skMarkSel();
  const b = overlay.querySelector(`.skn[data-n="${id}"]`); if (kbd && b) { b.focus({ preventScroll: true }); skReveal(SKN[id]); }
  if (!same) { skInfo(false); if (!kbd) Sfx.ui('select'); }
}

/* ---- the details panel: built when the selection changes; a purchase only updates its numbers ---- */
function skFxVals(n, g) { return n.fx.map(([, f]) => +f(g)); }
function skInfo(animate, prevVals) {
  const el = skEl('skInfo'); if (!el) return;
  const keep = el.contains(document.activeElement) ? document.activeElement.id || 'skBuy' : null, top = el.scrollTop; // a purchase from the keyboard keeps focus where it was
  const n = SKN[skSel], r = skOwn(n.id), st = skState(n), max = r >= n.max, why = skWhy(n), cost = skCost(n);
  const gCur = id => skOwn(id), gNext = id => id === n.id ? Math.min(n.max, r + 1) : skOwn(id);
  const cur = skFxVals(n, gCur), nxt = skFxVals(n, gNext), none = n.abil && !r; // an ability you don't have yet: nothing to compare against
  const fxRows = n.fx.map(([label, , fmt], i) => `<div><dt>${label}</dt><dd><span class="cur" data-i="${i}">${none ? '—' : fmt(cur[i])}</span>${max ? '' : `<i class="ar">→</i><span class="nxt ${nxt[i] !== cur[i] || none ? 'up' : ''}">${fmt(nxt[i])}</span>`}</dd></div>`).join('');
  const reqRows = [...n.req.map(([id, need]) => { const have = skOwn(id), ok = have >= need || r > 0; return `<li class="${ok ? 'ok' : 'no'}">${ok ? SK_OK : SK_NO}<span>${skReqText({ id, need })}</span>${SKN[id].max > 1 ? `<em>${Math.min(have, SKN[id].max)}/${need}</em>` : ''}</li>`; }),
    ...(skNeedLv(n, r) && !max ? [`<li class="${skLv() >= skNeedLv(n, r) ? 'ok' : 'no'}">${skLv() >= skNeedLv(n, r) ? SK_OK : SK_NO}<span>Level ${skNeedLv(n, r)}${n.max > 1 && r ? ` for rank ${r + 1}` : ''}</span><em>you're ${skLv()}</em></li>`] : [])].join('');
  const stateWord = PROG.treeOff[n.id] && r ? 'Switched off' : ({ max: n.major ? 'Unlocked' : 'Maxed', own: 'Purchased', avail: 'Available', locked: 'Locked' })[st];
  const btnTxt = max ? (n.major ? 'Unlocked' : 'Maxed') : why.length ? (why[0].k === 'lvl' ? `Level ${why[0].need}` : 'Locked') : r ? `Upgrade to ${r + 1}/${n.max}` : n.major ? 'Unlock' : 'Buy rank 1';
  el.className = `skinfo br-${n.br} st-${st}${animate || el.dataset.n === n.id ? ' still' : ''}`; el.dataset.n = n.id; // a new node fades in; the same one just updates
  el.innerHTML = `<div class="sk-h"><span class="sk-ic ${n.major ? 'maj' : ''}">${upIcon(n.icon)}</span><div><small>${SK_BRANCH[n.br].name} · ${n.major ? (n.abil ? 'Ability' : 'Major skill') : `Passive · ${n.max} ranks`}</small><h2>${n.name}</h2></div>${n.abil ? `<kbd data-tip="Its key (Settings › Controls)">${abilKey(n.id)}</kbd>` : ''}</div>
    <div class="sk-rank"><span class="sk-bars">${Array.from({ length: n.max }, (_, k) => `<i class="${k < r ? 'on' : ''}"></i>`).join('')}</span><b>${r}/${n.max}</b><span class="sk-st">${stateWord}</span></div>
    <p class="sk-d">${n.desc}</p>
    ${n.ranks ? `<ol class="sk-ranks">${n.ranks.map((t, k) => `<li class="${k < r ? 'got' : k === r ? 'next' : ''}"><b>${k + 1}</b><span>${t}${skNeedLv(n, k) ? ` <em>Level ${skNeedLv(n, k)}</em>` : ''}</span></li>`).join('')}</ol>` : ''}
    <dl class="sk-fx">${fxRows}</dl>
    ${reqRows ? `<div class="sk-sec"><h4>Requires</h4><ul class="sk-req">${reqRows}</ul></div>` : ''}
    <div class="sk-buy">${max ? `<span class="sk-done">${SK_OK}${n.major ? 'Unlocked' : 'Maxed'}: nothing more to buy here</span>` : `<div class="sk-cost"><small>Cost</small><b class="${skLeft() < cost ? 'poor' : ''}"><i class="tok"></i> ${tokN(cost)}</b></div>
      <button class="btn ${why.length || skLeft() < cost ? 'alt' : ''}" id="skBuy" data-sfx="none">${btnTxt}</button>`}
      <p class="sk-why" id="skWhy">${skWhyText(n)}</p></div>
    ${r ? `<div class="sk-tg"><span>${n.abil ? 'Use this ability in runs' : 'Active in runs'}</span><button class="tgl sm ${PROG.treeOff[n.id] ? '' : 'on'}" id="skTgl" data-sfx="none" role="switch" aria-checked="${!PROG.treeOff[n.id]}" aria-label="${attr(n.name)} active in runs"></button></div>` : ''}`;
  const bb = skEl('skBuy'); if (bb) bb.onclick = () => skBuy(n.id);
  const tg = skEl('skTgl'); if (tg) tg.onclick = () => { PROG.treeOff[n.id] = !PROG.treeOff[n.id]; if (!PROG.treeOff[n.id]) delete PROG.treeOff[n.id]; saveProg(); Sfx.ui(PROG.treeOff[n.id] ? 'off' : 'on'); skRefresh(); skInfo(false); };
  el.scrollTop = top; if (keep) { const f = skEl(keep) || overlay.querySelector('.skn.sel'); if (f) f.focus({ preventScroll: true }); }
  if (animate && prevVals && !skCalm()) { // the numbers that changed count over from the old value
    el.querySelectorAll('.sk-fx .cur').forEach(s => { const i = +s.dataset.i, a = prevVals[i], b = cur[i], fmt = n.fx[i][2]; if (a === b || !isFinite(a) || !isFinite(b)) return;
      s.classList.add('chg'); skTween(320, k => { s.textContent = fmt(a + (b - a) * k); }, () => { s.textContent = fmt(b); }); });
    const bar = el.querySelectorAll('.sk-bars i')[r - 1]; if (bar) bar.classList.add('new');
  }
}
const SK_OK = '<svg class="rq" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SK_NO = '<svg class="rq" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function skTween(ms, f, end) { const t0 = performance.now(); const step = now => { const k = Math.min(1, (now - t0) / ms); f(1 - Math.pow(1 - k, 3)); if (k < 1) requestAnimationFrame(step); else end && end(); }; requestAnimationFrame(step); }

/* ---- in place: every node's look, label and links, the hub, the branch totals, the tokens ---- */
function skRefresh() {
  overlay.querySelectorAll('.skn').forEach(b => { const n = SKN[b.dataset.n], st = skState(n), r = skOwn(n.id);
    b.classList.remove('s-locked', 's-avail', 's-own', 's-max'); b.classList.add('s-' + st);
    b.classList.toggle('s-off', !!(PROG.treeOff[n.id] && r)); b.classList.toggle('poor', (st === 'avail' || st === 'own') && skLeft() < skCost(n));
    b.classList.toggle('lvlock', st === 'locked' && skWhy(n).some(q => q.k === 'lvl') && !skWhy(n).some(q => q.k === 'req'));
    const em = b.querySelector('.skl em'), sub = skSub(n); if (em.innerHTML !== sub) em.innerHTML = sub;
    b.querySelectorAll('.tk').forEach((t, k) => t.classList.toggle('on', k < r));
    b.setAttribute('aria-label', skAria(n)); });
  overlay.querySelectorAll('.skln').forEach(p => { const st = skLinkState({ b: SKN[p.dataset.b] }); p.classList.remove('on', 'open', 'off'); p.classList.add(st); });
  overlay.querySelectorAll('[data-brn]').forEach(b => { b.textContent = skBranchRanks(b.dataset.brn); });
  const hn = skEl('skHubN'); if (hn) hn.textContent = SKILL_TREE.reduce((a, n) => a + skOwn(n.id), 0);
}
function skTokAnim(from, to) { const b = overlay.querySelector('#skTok b'); if (!b) return; const pill = b.parentElement;
  if (skCalm() || from === to) { b.textContent = to; return; }
  pill.classList.remove('spent'); void pill.offsetWidth; pill.classList.add('spent');
  skTween(380, k => { b.textContent = Math.round(from + (to - from) * k); }, () => { b.textContent = to; }); }
let skResetArm = 0;
function skReset() { // two presses: the first asks, the second hands every token back
  const b = skEl('skReset'); if (!b) return;
  if (!skSpent()) { Sfx.deny(); b.textContent = 'Nothing to reset'; setTimeout(() => { if (b.isConnected) b.textContent = 'Reset tree'; }, 1400); return; }
  if (performance.now() > skResetArm) { skResetArm = performance.now() + 3000; b.textContent = `Reset? Click again`; b.classList.add('arm'); Sfx.ui('select');
    setTimeout(() => { if (b.isConnected && performance.now() > skResetArm) { b.textContent = 'Reset tree'; b.classList.remove('arm'); } }, 3100); return; }
  skResetArm = 0; const t0 = skLeft();
  PROG.tree = {}; PROG.treeOff = {}; saveProg(); Sfx.ui('close');
  b.textContent = 'Reset tree'; b.classList.remove('arm');
  skRefresh(); skInfo(false); skTokAnim(t0, skLeft());
  if (typeof netLobbySyncProfile === 'function' && NETM.on) netLobbySyncProfile();
}
function skTravel(p) { // a short bright stretch running down a link that just opened
  if (skCalm() || !p) return;
  const t = p.cloneNode(); t.setAttribute('class', `sktrav br-${SKN[p.dataset.b].br}`); t.setAttribute('pathLength', '1'); p.parentNode.appendChild(t);
  const a = t.animate([{ strokeDashoffset: .16 }, { strokeDashoffset: -1 }], { duration: 720, easing: 'cubic-bezier(.3,.1,.3,1)' }); a.onfinish = a.oncancel = () => t.remove();
}
/* ---- opening: a terminal boots up, types its way to ONLINE, then the screen splits from the middle and the two black halves slide away ---- */
const SK_BOOT = ['> skill_tree --connect', '> tokens: ' , '> branches: survival / predator / fortune', ''];
function skBoot() {
  const panel = overlay.querySelector('.panel.sktree'); if (!panel || skCalm()) return;
  const el = document.createElement('div'); el.className = 'skboot'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<i class="bt"></i><i class="bb"></i><i class="seam"></i><pre class="sktxt"></pre>'; panel.appendChild(el);
  const txt = el.querySelector('.sktxt'), lines = SK_BOOT.map(l => l === '> tokens: ' ? l + skLeft() + ' ready' : l), timers = [];
  let out = '', li = 0, ci = 0, done = false;
  const open = () => { if (done) return; done = true; timers.forEach(clearTimeout); txt.innerHTML = esc(out) + '<b class="on">ONLINE</b>'; el.classList.add('live'); Sfx.ui('open');
    timers.push(setTimeout(() => el.classList.add('open'), 380), setTimeout(() => el.remove(), 1300)); };
  const type = () => { // a few characters a frame, line by line, a blip per line
    if (done) return; if (li >= lines.length) return open();
    const L = lines[li]; ci = Math.min(L.length, ci + 3); txt.innerHTML = esc(out + L.slice(0, ci)) + '<i class="cur"></i>';
    if (ci >= L.length) { out += L + '\n'; li++; ci = 0; Sfx.ui('tick'); timers.push(setTimeout(type, 70)); } else timers.push(setTimeout(type, 16));
  };
  const skip = () => { if (!done) open(); else if (el.isConnected) { el.classList.add('open'); timers.push(setTimeout(() => el.remove(), 600)); } };
  el.addEventListener('pointerdown', skip); addEventListener('keydown', function k() { skip(); removeEventListener('keydown', k, true); }, { capture: true, once: true });
  timers.push(setTimeout(type, 120));
}
/* ---- buying a rank: the node's outline is copied and ripples outward, fading as it grows ---- */
function skEcho(b, big) {
  const sh = b.querySelector('.skshape'), o = sh && sh.querySelector('.sko'); if (!o) return;
  for (const [d, k] of big ? [[0, 3.4], [170, 2.6]] : [[0, 3]]) setTimeout(() => {
    const e = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); e.setAttribute('viewBox', sh.getAttribute('viewBox')); e.setAttribute('class', 'skecho'); e.setAttribute('aria-hidden', 'true');
    const c = o.cloneNode(); c.removeAttribute('class'); e.appendChild(c); e.style.setProperty('--k', k); b.appendChild(e);
    e.addEventListener('animationend', () => e.remove()); setTimeout(() => e.remove(), 1200); // (in case the animation never runs)
  }, d);
}
let skBusyUntil = 0;
function skBuy(id) {
  const n = SKN[id], now = performance.now(); if (!n || now < skBusyUntil) return; // rapid clicks: one purchase at a time
  const r = skOwn(id), why = skWhy(n), cost = skCost(n), msg = skEl('skWhy');
  if (r >= n.max) return;
  if (why.length || skLeft() < cost) {
    Sfx.deny(); if (msg) { msg.textContent = skWhyText(n); msg.classList.remove('nudge'); void msg.offsetWidth; msg.classList.add('nudge'); }
    const b = overlay.querySelector(`.skn[data-n="${id}"]`); if (b && !skCalm()) { b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); }
    return;
  }
  skBusyUntil = now + 380;
  const was = {}; for (const q of SKILL_TREE) was[q.id] = skState(q);
  const prevVals = skFxVals(n, id2 => skOwn(id2)), tok0 = skLeft();
  PROG.tree[id] = r + 1; delete PROG.treeOff[id]; saveProg(); // (the token count is worked out from the tree: nothing else to spend)
  const major = n.major; Sfx.skill(major && !r);
  skRefresh(); skInfo(true, prevVals); skTokAnim(tok0, skLeft());
  const b = overlay.querySelector(`.skn[data-n="${id}"]`);
  if (b && !skCalm()) {
    b.classList.remove('pulse', 'unlock'); void b.getBoundingClientRect(); b.classList.add(major && !r ? 'unlock' : 'pulse');
    const tk = b.querySelectorAll('.tk')[r]; if (tk) { tk.classList.remove('fill'); void tk.getBoundingClientRect(); tk.classList.add('fill'); }
    setTimeout(() => b.classList.remove('pulse', 'unlock'), 900); skEcho(b, major && !r);
  }
  if (!r) skTravel(overlay.querySelector(`.skln[data-b="${id}"]`)); // the link into it lights up
  for (const q of SKILL_TREE) if (was[q.id] === 'locked' && skState(q) !== 'locked') { const p = overlay.querySelector(`.skln[data-a="${id}"][data-b="${q.id}"]`); if (p) setTimeout(() => skTravel(p), 160); } // and the way on, if this opened it
  if (typeof netLobbySyncProfile === 'function' && NETM.on) netLobbySyncProfile(); // in a lobby: the others' copy of your tree updates too
}

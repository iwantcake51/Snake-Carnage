/* =========================================================
   SHOP: category tabs, card grid, live preview, hover reveals price/owned/equipped,
   achievement items shown as locked silhouettes, and a themed custom color picker (the luxury tier).
   ========================================================= */
const SHOP_TABS = [
  { id: 'color', label: 'Primary colors', icon: 'palette' }, { id: 'color2', label: 'Secondary colors', icon: 'brush' }, { id: 'custom', label: 'Custom color', icon: 'rainbow' },
  { id: 'pattern', label: 'Skins', icon: 'skin' }, { id: 'hat', label: 'Hats', icon: 'hat' }, { id: 'eyes', label: 'Eyes', icon: 'eyes' }, { id: 'trail', label: 'Trails', icon: 'trail' },
  { id: 'theme', label: 'UI themes', icon: 'theme' }, { id: 'combo', label: 'Combo styles', icon: 'card' }, { id: 'card', label: 'Card styles', icon: 'card' }, { id: 'effect', label: 'Effects', icon: 'effect' }, { id: 'title', label: 'Titles', icon: 'title' }];
let shopTab = 'color', shopMsg = '', shopPrev = null;
const TIERCOL = { easy: '#5fd07a', medium: '#ffcf33', hard: '#ff8a3d', rare: '#c77dff' };
function shopCard(cat, [v, p, achId], i) {
  p = shopPrice(p); // Haggler
  const cfg = SETTINGS.snake, own = owns(cat, v), on = cfg[cat] === v, ach = achId ? ACH.find(a => a.id === achId) : null, locked = ach && !own, hidden = locked && ach.secret; // secrets stay secret
  const sw = `<span class="pvw">${itemPreview(cat, v)}</span>`;
  const tip = cat === 'title' && !hidden ? titleTip(v) : '';
  const status = on ? '<span class="st eq">Equipped</span>' : own ? '<span class="st own">Owned · click to equip</span>' : locked ? '' : `<span class="st buy"><i class="pc"></i> ${p} · click to buy</span>`;
  return `<button class="sc c-${cat} ${on ? 'on' : ''} ${own ? 'own' : ''} ${locked ? 'locked' : ''} ${!own && !locked && PROG.coins < p ? 'poor' : ''}" data-cat="${cat}" data-v="${attr(v)}" ${hidden ? 'data-hid="1"' : ''} style="--i:${i}" ${tip ? `data-tiph="${attr(tip)}"` : ''}>
    ${hidden ? '<span class="pvw"><span class="pvTitle none">???</span></span>' : sw}<b>${hidden ? '???' : cat.startsWith('color') ? colorName(v) : v}</b>
    ${locked ? `<span class="lk">${kiSvg('locked')}</span><span class="req" style="--tc:${TIERCOL[ach.tier]}"><em>${hidden ? 'Secret challenge' : ach.name}</em>${hidden ? ach.clue : ach.what}<span class="pb"><span style="width:${(achProgress(ach) * 100).toFixed(0)}%"></span></span></span>`
      : `<span class="price">${own ? (on ? kiSvg('checkmark') : '') : `<i class="pc"></i>${p}`}</span>`}
    <span class="hov">${status}</span></button>`;
}
const slug = v => String(v).toLowerCase().replace(/[^a-z0-9]+/g, '-');
function itemPreview(cat, v) { // what the item actually looks like, not an emoji stand-in
  if (cat.startsWith('color')) return `<i class="swb" style="background:${v}"></i>`;
  if (cat === 'pattern' || cat === 'hat' || cat === 'eyes' || cat === 'trail') return `<canvas class="pv" data-cat="${cat}" data-v="${attr(v)}" width="176" height="84"></canvas>`;
  if (cat === 'theme') return `<span class="pvTheme th-${slug(v)}"><i class="tb"></i><i class="tp"></i><i class="tc"></i><i class="tc"></i></span>`;
  if (cat === 'combo') return `<span class="pvCombo cb-${slug(v)}"><span class="cbox"><span class="cbn"><b>12</b><i>x</i></span><span class="cbar"><span></span></span></span></span>`;
  if (cat === 'card') return `<span class="pvCard cs-${slug(v)}"><i class="ci"></i><i class="cl"></i></span>`;
  if (cat === 'effect') return v === 'None' ? '<span class="pvFx none"></span>' : `<span class="pvFx mfx ${slug(v)}">${Array.from({ length: 9 }, (_, k) => `<i class="l${k % 3}" style="--x:${(k * 11 + 5) % 100}%;--y:${(k * 37 + 13) % 86 + 7}%;--d:${(-k * 1.3).toFixed(1)}s;--s:${(4 + k % 3).toFixed(1)}s;--z:${(.6 + (k % 3) * .25).toFixed(2)}"></i>`).join('')}</span>`;
  if (cat === 'title') return v === 'None' ? '<span class="pvTitle none">No title</span>' : `<span class="pvTitle">${v}</span>`;
  return '';
}
const shopIcon = itemPreview; // older callers
function drawPreviews(root) { root.querySelectorAll('canvas.pv').forEach(c => drawItemPreview(c, c.dataset.cat, c.dataset.v)); }
function previewSnake(n, x0, y0, sp, wave) { // a short body heading right, head at x0
  const segs = [];
  for (let i = 0; i < n; i++) segs.push({ x: x0 - i * sp, y: y0 + Math.sin(i * .7 + 1) * wave, a: 0 });
  for (let i = 0; i < n; i++) { const p = segs[i - 1] || { x: segs[0].x + sp, y: segs[0].y }; segs[i].a = Math.atan2(p.y - segs[i].y, p.x - segs[i].x); }
  segs[0].a = 0;
  return { x: segs[0].x, y: segs[0].y, angle: 0, segs, stains: segs.map(() => []) };
}
function drawItemPreview(cv2, cat, v) {
  const x = cv2.getContext('2d'), w = cv2.width, h = cv2.height, base = { ...SETTINGS.snake, hat: 'None', trail: 'None' };
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w, h);
  const keepT = T; T = 1.3; // a fixed moment, so animated cosmetics still read clearly
  if (cat === 'pattern') { x.scale(1.55, 1.55); drawSnake(x, previewSnake(14, 101, 27, 6.6, 6), { ...base, pattern: v }); } // long enough to show a few repeats of the pattern
  else if (cat === 'hat' || cat === 'eyes') { // a close-up of the head, the way you see it in game
    x.translate(w * .6, h * .5); x.scale(3.3, 3.3); x.translate(-12, 0);
    drawSnake(x, previewSnake(5, 12, 0, 8, 0), { ...base, [cat]: v });
  } else if (cat === 'trail') {
    x.scale(2, 2);
    const s = previewSnake(7, 80, 21, 7, 3), keep = trail, tail = s.segs[s.segs.length - 1];
    if (v !== 'None') {
      const up = v === 'Embers' || v === 'Bubbles' || v === 'Hearts' ? -1 : v === 'Blood Drip' ? 1 : 0;
      trail = Array.from({ length: 14 }, (_, k) => ({ x: tail.x - 3 - k * 2.6 + Math.sin(k * 2.1) * 2, y: tail.y + Math.cos(k * 1.7) * 4 + up * k * .5, t: k * .06, life: 1.1, rot: k, type: v, c: ['#ff4f8b', '#ffd23f', '#3fd4ff', '#7dff6a', '#b07bff'][k % 5] }));
      drawTrail(x); trail = keep;
    }
    drawSnake(x, s, base);
  }
  T = keepT;
}
function titleTip(v) { // how a title was earned, and when
  if (v === 'None') return '<span class="thead">No title</span>Nothing shown under your level.';
  const a = achOf('title', v); if (!a) return `<span class="thead">${v}</span>`;
  const when = PROG.ach[a.id];
  return `<span class="thead">${v}</span>${when ? 'Earned' : 'Earn it'} by: <b>${a.secret && !when ? 'a secret challenge' : a.what}</b> (${a.secret && !when ? '???' : a.name})` +
    (when ? `<span class="tdim">Unlocked ${fmtDate(when)}</span>` : `<span class="tdim">${a.secret ? 'Clue: ' + a.clue : 'Progress: ' + Math.min(a.stat(), a.n) + '/' + a.n}</span>`);
}
const fmtDate = ts => { const d = new Date(ts); return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' at ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); };
function showCustomize() {
  const again = !!overlay.querySelector('.panel.shop2');
  overlay.className = 'menuMode';
  overlay.innerHTML = `<div class="panel shop2 ${again ? 'noanim' : ''}">
    <nav class="snav"><h1>Shop</h1>${SHOP_TABS.map(t => `<button class="tab ${t.id === shopTab ? 'on' : ''}" data-sfx="tab" data-tab="${t.id}"><i>${ico(t.icon)}</i>${t.label}</button>`).join('')}<button class="btn" id="backBtn" data-sfx="close">Done</button></nav>
    <div class="sright"><div class="shophead"><canvas id="prev"></canvas><div class="shinfo"><span class="coinpill"><i class="pc"></i> ${PROG.coins}</span><p class="shopmsg">${shopMsg || 'Hover an item to see its price. Locked items come from Challenges.'}</p></div></div>
    <div class="sgrid tabIn">${shopBody(shopTab)}</div></div></div>`;
  shopMsg = '';
  wireShop();
  const nav = overlay.querySelector('.snav'), bar = document.createElement('i'); bar.className = 'tabbar'; nav.prepend(bar); placeTabBar(true);
  overlay.querySelectorAll('.tab').forEach(b => b.onclick = () => setShopTab(b.dataset.tab));
  document.getElementById('backBtn').onclick = () => transitionTo(() => { applyCosmetics(); showMenu(); }); // the heavy restyle happens after the close animation, not before it
  startPreview();
}
function placeTabBar(instant) { // the highlight behind the selected tab slides to the new one instead of the whole shop redrawing
  const bar = overlay.querySelector('.snav .tabbar'), on = overlay.querySelector(`.snav .tab[data-tab="${shopTab}"]`); if (!bar || !on) return;
  if (instant) bar.style.transition = 'none';
  bar.style.transform = `translateY(${on.offsetTop}px)`; bar.style.height = on.offsetHeight + 'px';
  if (instant) { void bar.offsetWidth; bar.style.transition = ''; }
}
function setShopTab(t) { // swap only the item grid; the nav, preview and chip count stay put
  if (t === shopTab) return; shopTab = t;
  overlay.querySelectorAll('.snav .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); placeTabBar();
  const grid = overlay.querySelector('.sgrid'); if (!grid) return showCustomize();
  grid.innerHTML = shopBody(t); grid.scrollTop = 0; grid.classList.remove('tabIn'); void grid.offsetWidth; grid.classList.add('tabIn');
  wireShop();
}
function refreshShop(msg) { // after buying or equipping: update the cards, chips and message in place (previews are kept, nothing flickers)
  overlay.querySelectorAll('.sgrid .sc').forEach((b, i) => {
    const cat = b.dataset.cat, v = b.dataset.v, it = findItem(cat, v); if (!it) return;
    const t = document.createElement('div'); t.innerHTML = shopCard(cat, it, i); const nb = t.firstElementChild, keep = b.querySelector('.pvw'), slot = nb.querySelector('.pvw');
    if (keep && slot) slot.replaceWith(keep);
    nb.style.animation = 'none'; b.replaceWith(nb);
  });
  wireShop.noDraw = true; wireShop(); wireShop.noDraw = false;
  const cp = overlay.querySelector('.shophead .coinpill'); if (cp) cp.innerHTML = `<i class="pc"></i> ${PROG.coins}`;
  const m = overlay.querySelector('.shopmsg'); if (m && msg) m.textContent = msg;
}
function shopBody(tab) {
  if (tab === 'custom') return customBody();
  const cat = tab, list = itemsOf(cat);
  return `<h2>${CAT_LABEL[cat]}</h2><div class="cards2">${list.map((it, i) => shopCard(cat, it, i)).join('')}</div>`;
}
function wireShop() {
  overlay.querySelectorAll('.sc').forEach(b => {
    b.onclick = () => chooseItem(b.dataset.cat, b.dataset.v);
    b.onmouseenter = () => { shopPrev = b.dataset.hid ? null : { cat: b.dataset.cat, v: b.dataset.v }; }; // live preview on hover, even before buying (not a secret one: that stays hidden until it's earned)
    b.onmouseleave = () => { shopPrev = null; };
  });
  if (!wireShop.noDraw) drawPreviews(overlay);
  if (shopTab === 'custom' && !wireShop.noDraw) wirePicker();
}
function chooseItem(cat, v) {
  let bought = false;
  const cfg = SETTINGS.snake;
  if (!owns(cat, v)) {
    const ach = achOf(cat, v);
    if (ach) { shopMsg = ach.secret ? `A secret challenge unlocks this. Clue: ${ach.clue}` : `Earn “${ach.name}” in Challenges to unlock this: ${ach.what.toLowerCase()}.`; Sfx.deny(); refreshShop(shopMsg); shopMsg = ""; return; }
    const p = priceOf(cat, v);
    if (PROG.coins < p) { shopMsg = `You need ${p - PROG.coins} more chips for that.`; Sfx.deny(); refreshShop(shopMsg); shopMsg = ""; return; }
    PROG.coins -= p; PROG.owned.push(ownKey(cat, v)); saveProg(); updateHud(); Sfx.buy(); bought = true;
    shopMsg = `Bought for ${p} chips. Looking good.`;
  }
  cfg[cat] = v; saveSettings(); applyCosmetics();
  if (cat === 'custom' || !overlay.querySelector('.sgrid .sc')) return showCustomize();
  refreshShop(shopMsg || 'Equipped.'); shopMsg = '';
  const c = overlay.querySelector(`.sc[data-cat="${cat}"][data-v="${CSS.escape(v)}"]`); if (c && bought) { c.classList.add('bought'); }
}
function miniSnake(cv2, cfg) {
  const x = cv2.getContext('2d'), segs = [];
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cv2.width, cv2.height); x.scale(1.1, 1.1);
  for (let i = 0; i < 9; i++) segs.push({ x: 66 - i * 7, y: 18 + Math.sin(i * .7) * 4, a: 0 });
  for (let i = 0; i < segs.length; i++) { const p = segs[i - 1] || { x: segs[0].x + 8, y: segs[0].y }; segs[i].a = Math.atan2(p.y - segs[i].y, p.x - segs[i].x); }
  drawSnake(x, { x: segs[0].x, y: segs[0].y, angle: segs[0].a, segs, stains: segs.map(() => []) }, { ...cfg, hat: 'None' });
}
function startPreview() { // live wiggling preview: shows what you're hovering, so you can try before you buy
  const pc = document.getElementById('prev'), w = 300, h = 84, px = pc.getContext('2d'), d = Math.min(DPR, 2);
  pc.width = w * d; pc.height = h * d; pc.style.width = w + 'px'; pc.style.height = h + 'px'; pc.style.maxWidth = '100%';
  const draw = () => {
    if (!pc.isConnected) return;
    px.setTransform(d, 0, 0, d, 0, 0); px.clearRect(0, 0, w, h);
    const g = px.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2f4524'); g.addColorStop(1, '#1f2e18'); px.fillStyle = g; rrect(px, 0, 0, w, h, 12); px.fill();
    px.setTransform(d * 2, 0, 0, d * 2, 0, 0);
    const segs = [];
    for (let i = 0; i < 15; i++) segs.push({ x: 122 - i * 8, y: 21 + Math.sin(i * .55 - UT * 3) * 7, a: 0 });
    for (let i = 0; i < segs.length; i++) { const p = segs[i - 1] || { x: segs[0].x + 8, y: segs[0].y }; segs[i].a = Math.atan2(p.y - segs[i].y, p.x - segs[i].x); }
    const cfg = { ...SETTINGS.snake }; if (shopPrev && /^(color2?|pattern|hat|eyes)$/.test(shopPrev.cat)) cfg[shopPrev.cat] = shopPrev.v;
    if (shopTab === 'custom' && pickerState) cfg[pickerState.slot] = pickerState.hex;
    const keep = T; T = UT; // animate cosmetics even while the world is paused
    drawSnake(px, { x: segs[0].x, y: segs[0].y, angle: segs[0].a, segs, stains: segs.map(() => []) }, cfg);
    T = keep;
    setTimeout(() => requestAnimationFrame(draw), 28); // ~30fps is plenty for a preview wiggle
  };
  draw();
}

/* ---- custom color picker (not the browser one): saturation/value square, hue slider, hex, live preview ---- */
let pickerState = null;
const hsv2hex = (h, s, v) => { const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return '#' + [f(5), f(3), f(1)].map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join(''); };
function hex2hsv(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx };
}
function customBody() {
  const hasP = PROG.owned.includes('custom:primary'), hasF = PROG.owned.includes('custom:full');
  if (!pickerState) { const hx = SETTINGS.snake.color; pickerState = { slot: 'color', hex: hx, ...hex2hsv(hx) }; }
  const slotOk = pickerState.slot === 'color' ? hasP : hasF;
  return `<h2>Custom color</h2><p class="lead">Any color you can imagine. This is the luxury tier: Primary first, then full Primary + Secondary control.</p>
    <div class="cbuy"><div class="tier1 ${hasP ? 'own' : ''}"><b>Custom Primary</b><span>${hasP ? 'Owned' : `<i class="pc"></i> ${shopPrice(CUSTOM_PRICE.primary)}`}</span>${hasP ? '' : `<button class="btn" data-buy="primary" ${PROG.coins < shopPrice(CUSTOM_PRICE.primary) ? 'disabled' : ''}>Buy</button>`}</div>
      <div class="tier1 ${hasF ? 'own' : ''} ${hasP ? '' : 'dim'}"><b>Full Primary + Secondary</b><span>${hasF ? 'Owned' : `<i class="pc"></i> ${shopPrice(CUSTOM_PRICE.full)}`}</span>${hasF ? '' : `<button class="btn" data-buy="full" ${!hasP || PROG.coins < shopPrice(CUSTOM_PRICE.full) ? 'disabled' : ''}>Buy</button>`}</div></div>
    <div class="picker ${slotOk ? '' : 'preview'}">
      <div class="slots"><button class="${pickerState.slot === 'color' ? 'on' : ''}" data-slot="color">Primary</button><button class="${pickerState.slot === 'color2' ? 'on' : ''}" data-slot="color2">Secondary</button></div>
      <div class="sv" style="--hue:${pickerState.h}"><i class="knob" style="left:${pickerState.s * 100}%;top:${(1 - pickerState.v) * 100}%"></i></div>
      <div class="hue"><i class="knob" style="left:${pickerState.h / 360 * 100}%"></i></div>
      <div class="prow"><i class="swb big" style="background:${pickerState.hex}"></i><input class="hex" value="${pickerState.hex}" maxlength="7" spellcheck="false" aria-label="Hex color">
        <button class="btn alt" id="pkCancel">Cancel</button><button class="btn" id="pkOk" ${slotOk ? '' : 'disabled'}>${slotOk ? 'Apply' : 'Locked'}</button></div>
      ${slotOk ? '' : `<p class="small">Preview only. Buy ${pickerState.slot === 'color' ? 'Custom Primary' : 'Full Primary + Secondary'} to apply it.</p>`}</div>`;
}
function wirePicker() {
  const sv = overlay.querySelector('.sv'), hue = overlay.querySelector('.hue'), hexIn = overlay.querySelector('.hex'), P = pickerState;
  const refresh = () => { P.hex = hsv2hex(P.h, P.s, P.v); sv.style.setProperty('--hue', P.h); sv.querySelector('.knob').style.cssText = `left:${P.s * 100}%;top:${(1 - P.v) * 100}%`;
    hue.querySelector('.knob').style.left = P.h / 360 * 100 + '%'; overlay.querySelector('.swb.big').style.background = P.hex; if (document.activeElement !== hexIn) hexIn.value = P.hex; };
  const drag = (el, fn) => el.onpointerdown = e => { el.setPointerCapture(e.pointerId); const mv = ev => { const r = el.getBoundingClientRect(); fn(clamp((ev.clientX - r.left) / r.width, 0, 1), clamp((ev.clientY - r.top) / r.height, 0, 1)); refresh(); };
    mv(e); el.onpointermove = mv; el.onpointerup = () => { el.onpointermove = null; }; };
  drag(sv, (a, b) => { P.s = a; P.v = 1 - b; }); drag(hue, a => { P.h = a * 360; });
  hexIn.oninput = () => { if (/^#[0-9a-f]{6}$/i.test(hexIn.value)) { Object.assign(P, hex2hsv(hexIn.value)); refresh(); } };
  overlay.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => { const hx = SETTINGS.snake[b.dataset.slot]; pickerState = { slot: b.dataset.slot, hex: hx, ...hex2hsv(hx) }; showCustomize(); });
  overlay.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
    const k = b.dataset.buy, p = shopPrice(CUSTOM_PRICE[k]); if (PROG.coins < p) { Sfx.deny(); return; }
    PROG.coins -= p; PROG.owned.push('custom:' + k); saveProg(); updateHud(); Sfx.buy(); shopMsg = k === 'full' ? 'Full custom colors unlocked. Go wild.' : 'Custom Primary unlocked.'; showCustomize();
  });
  document.getElementById('pkCancel').onclick = () => { const p = overlay.querySelector('.picker'); p.classList.add('cancel'); setTimeout(() => { pickerState = null; showCustomize(); }, 180); };
  const ok = document.getElementById('pkOk');
  ok.onclick = () => { if (ok.disabled) return; SETTINGS.snake[P.slot] = P.hex; saveSettings(); Sfx.ui('confirm'); overlay.querySelector('.picker').classList.add('applied'); shopMsg = 'Custom color applied.'; setTimeout(showCustomize, 260); };
}

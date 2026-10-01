/* =========================================================
   SHOP: category tabs, card grid, live preview, hover reveals price/owned/equipped,
   achievement items shown as locked silhouettes, and a themed custom color picker (the luxury tier).
   ========================================================= */
const SHOP_TABS = [
  { id: 'color', label: 'Primary colors', icon: '🎨' }, { id: 'color2', label: 'Secondary colors', icon: '🖌️' }, { id: 'custom', label: 'Custom color', icon: '🌈' },
  { id: 'pattern', label: 'Skins', icon: '🐍' }, { id: 'hat', label: 'Hats', icon: '🎩' }, { id: 'eyes', label: 'Eyes', icon: '👀' }, { id: 'trail', label: 'Trails', icon: '✨' },
  { id: 'theme', label: 'UI themes', icon: '🖥️' }, { id: 'card', label: 'Card styles', icon: '🃏' }, { id: 'effect', label: 'Effects', icon: '🎆' }, { id: 'title', label: 'Titles', icon: '🏷️' }];
let shopTab = 'color', shopMsg = '', shopPrev = null;
const TIERCOL = { easy: '#5fd07a', medium: '#ffcf33', hard: '#ff8a3d', rare: '#c77dff' };
function shopCard(cat, [v, p, achId], i) {
  const cfg = SETTINGS.snake, own = owns(cat, v), on = cfg[cat] === v, ach = achId ? ACH.find(a => a.id === achId) : null, locked = ach && !own;
  const sw = cat.startsWith('color') ? `<i class="swb" style="background:${v}"></i>` : `<i class="ico">${shopIcon(cat, v)}</i>`;
  const status = on ? '<span class="st eq">Equipped</span>' : own ? '<span class="st own">Owned · click to equip</span>' : locked ? '' : `<span class="st buy"><i class="pc"></i> ${p} · click to buy</span>`;
  return `<button class="sc ${on ? 'on' : ''} ${own ? 'own' : ''} ${locked ? 'locked' : ''} ${!own && !locked && PROG.coins < p ? 'poor' : ''}" data-cat="${cat}" data-v="${v}" style="--i:${i}">
    ${sw}<b>${cat.startsWith('color') ? (ach ? ach.name.split(' ')[0] + ' ' + (cat === 'color' ? 'shade' : 'trim') : 'Preset') : v}</b>
    ${locked ? `<span class="lk">🔒</span><span class="req" style="--tc:${TIERCOL[ach.tier]}"><em>${ach.name}</em>${ach.what}<span class="pb"><span style="width:${(achProgress(ach) * 100).toFixed(0)}%"></span></span></span>`
      : `<span class="price">${own ? (on ? '✔' : '') : `<i class="pc"></i>${p}`}</span>`}
    <span class="hov">${status}</span></button>`;
}
function shopIcon(cat, v) {
  if (cat === 'theme') return { Default: '⚫', Midnight: '🌌', Toxic: '☢️', Panic: '🚨', Gold: '🪙', Blood: '🩸' }[v] || '🖥️';
  if (cat === 'card') return { Default: '🂠', Neon: '💠', 'Gold Frame': '🖼️', Bloody: '🩸', Hazard: '⚠️', 'Chip Stack': '🎰' }[v] || '🃏';
  if (cat === 'effect') return { None: '∅', Embers: '🔥', Snow: '❄️', 'Gold Dust': '✨', 'Blood Rain': '🩸', 'Alarm Lights': '🚨', Stars: '⭐' }[v] || '🎆';
  if (cat === 'title') return '🏷️';
  if (cat === 'trail') return { None: '∅', Smoke: '💨', Bubbles: '🫧', Sparkles: '✨', Hearts: '💗', Petals: '🌸', Confetti: '🎊', Embers: '🔥', 'Cheese Crumbs': '🧀', 'Gold Dust': '🪙', 'Blood Drip': '🩸', Alarm: '🚨', Stardust: '🌠' }[v] || '✨';
  if (cat === 'hat') return v === 'None' ? '∅' : '🎩';
  if (cat === 'eyes') return '👁️';
  return '<canvas class="mini" width="88" height="40"></canvas>'; // skins get a tiny live swatch
}
function showCustomize() {
  const again = !!overlay.querySelector('.panel.shop2');
  overlay.className = 'menuMode';
  overlay.innerHTML = `<div class="panel shop2 ${again ? 'noanim' : ''}">
    <nav class="snav"><h1>Shop</h1>${SHOP_TABS.map(t => `<button class="tab ${t.id === shopTab ? 'on' : ''}" data-sfx="tab" data-tab="${t.id}"><i>${t.icon}</i>${t.label}</button>`).join('')}<button class="btn" id="backBtn" data-sfx="close">Done</button></nav>
    <div class="sright"><div class="shophead"><canvas id="prev"></canvas><div class="shinfo"><span class="coinpill"><i class="pc"></i> ${PROG.coins}</span><p class="shopmsg">${shopMsg || 'Hover an item to see its price. Locked items come from Challenges.'}</p></div></div>
    <div class="sgrid tabIn">${shopBody(shopTab)}</div></div></div>`;
  shopMsg = '';
  wireShop();
  overlay.querySelectorAll('.tab').forEach(b => b.onclick = () => { shopTab = b.dataset.tab; showCustomize(); });
  document.getElementById('backBtn').onclick = () => { applyCosmetics(); transitionTo(showMenu); };
  startPreview();
}
function shopBody(tab) {
  if (tab === 'custom') return customBody();
  const cat = tab, list = itemsOf(cat);
  return `<h2>${CAT_LABEL[cat]}</h2><div class="cards2">${list.map((it, i) => shopCard(cat, it, i)).join('')}</div>`;
}
function wireShop() {
  overlay.querySelectorAll('.sc').forEach(b => {
    b.onclick = () => chooseItem(b.dataset.cat, b.dataset.v);
    b.onmouseenter = () => { shopPrev = { cat: b.dataset.cat, v: b.dataset.v }; }; // live preview on hover, even before buying
    b.onmouseleave = () => { shopPrev = null; };
  });
  overlay.querySelectorAll('canvas.mini').forEach(cv2 => { const sc = cv2.closest('.sc'); miniSnake(cv2, { ...SETTINGS.snake, pattern: sc.dataset.v }); });
  if (shopTab === 'custom') wirePicker();
}
function chooseItem(cat, v) {
  const cfg = SETTINGS.snake;
  if (!owns(cat, v)) {
    const ach = achOf(cat, v);
    if (ach) { shopMsg = `Earn “${ach.name}” in Challenges to unlock this: ${ach.what.toLowerCase()}.`; Sfx.deny(); return showCustomize(); }
    const p = priceOf(cat, v);
    if (PROG.coins < p) { shopMsg = `You need ${p - PROG.coins} more chips for that.`; Sfx.deny(); return showCustomize(); }
    PROG.coins -= p; PROG.owned.push(ownKey(cat, v)); saveProg(); updateHud(); Sfx.buy();
    shopMsg = `Bought for ${p} chips. Looking good.`;
    setTimeout(() => { const c = overlay.querySelector(`.sc[data-cat="${cat}"][data-v="${CSS.escape(v)}"]`); if (c) c.classList.add('bought'); }, 0);
  }
  cfg[cat] = v; saveSettings(); applyCosmetics(); showCustomize();
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
    requestAnimationFrame(draw);
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
    <div class="cbuy"><div class="tier1 ${hasP ? 'own' : ''}"><b>Custom Primary</b><span>${hasP ? 'Owned' : `<i class="pc"></i> ${CUSTOM_PRICE.primary}`}</span>${hasP ? '' : `<button class="btn" data-buy="primary" ${PROG.coins < CUSTOM_PRICE.primary ? 'disabled' : ''}>Buy</button>`}</div>
      <div class="tier1 ${hasF ? 'own' : ''} ${hasP ? '' : 'dim'}"><b>Full Primary + Secondary</b><span>${hasF ? 'Owned' : `<i class="pc"></i> ${CUSTOM_PRICE.full}`}</span>${hasF ? '' : `<button class="btn" data-buy="full" ${!hasP || PROG.coins < CUSTOM_PRICE.full ? 'disabled' : ''}>Buy</button>`}</div></div>
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
    const k = b.dataset.buy, p = CUSTOM_PRICE[k]; if (PROG.coins < p) { Sfx.deny(); return; }
    PROG.coins -= p; PROG.owned.push('custom:' + k); saveProg(); updateHud(); Sfx.buy(); shopMsg = k === 'full' ? 'Full custom colors unlocked. Go wild.' : 'Custom Primary unlocked.'; showCustomize();
  });
  document.getElementById('pkCancel').onclick = () => { const p = overlay.querySelector('.picker'); p.classList.add('cancel'); setTimeout(() => { pickerState = null; showCustomize(); }, 180); };
  const ok = document.getElementById('pkOk');
  ok.onclick = () => { if (ok.disabled) return; SETTINGS.snake[P.slot] = P.hex; saveSettings(); Sfx.ui('confirm'); overlay.querySelector('.picker').classList.add('applied'); shopMsg = 'Custom color applied.'; setTimeout(showCustomize, 260); };
}

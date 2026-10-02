/* =========================================================
   CREATURE DRAWING (top-down, local frame: +x = forward)
   ========================================================= */
function armPos(c) {
  const L = c.look, s = Math.sin(c.phase) * c.moveAmt, sw = L.w + .4;
  if (c.state === 'panic') { const f = Math.sin(T * 25 + c.side) * 2; return [5.5 + f, -sw + 1.5, 5.5 - f, sw - 1.5]; }
  if (c.dance) { const b = Math.sin(T * CLUB_BPM / 60 * Math.PI * 2 + c.pt * 30); return [3 + b * 2.5, -sw - 1.5, 3 - b * 2.5, sw + 1.5]; } // hands up
  if (c.fl && c.fl.on && !c.fl.helmet) return [-s * 4, -sw, 6 + s * .8, sw - 2]; // right hand held out in front with the flashlight
  return [-s * 4, -sw, s * 4, sw];
}
function shapePath(x, c) {
  const d = c.def; x.beginPath();
  if (d.human) {
    const L = c.look, [a1, b1, a2, b2] = armPos(c);
    x.ellipse(0, 0, L.d, L.w, 0, 0, TAU);
    if (L.outfit === 'alien') { x.moveTo(6.6, 0); x.ellipse(.6, 0, 6, 5.6, 0, 0, TAU); } else { x.moveTo(5.4, 0); x.arc(.6, 0, 4.8, 0, TAU); }
    x.moveTo(a1 + 2.5, b1); x.arc(a1, b1, 2.5, 0, TAU);
    x.moveTo(a2 + 2.5, b2); x.arc(a2, b2, 2.5, 0, TAU);
  } else {
    x.ellipse(0, 0, d.bl, d.bw, 0, 0, TAU);
    x.moveTo(d.bl * .85 + d.hr, 0); x.arc(d.bl * .85, 0, d.hr, 0, TAU);
  }
}
function drawHuman(x, c) { // top-down person, +x = facing direction
  const L = c.look, s = Math.sin(c.phase) * c.moveAmt, [a1, b1, a2, b2] = armPos(c), O = 'rgba(0,0,0,.3)', fy = L.w * .38;
  // legs and shoes stride out from under the body
  x.strokeStyle = L.pants; x.lineWidth = 3.6; x.lineCap = 'round';
  x.beginPath(); x.moveTo(0, -fy); x.lineTo(s * 5.5, -fy); x.moveTo(0, fy); x.lineTo(-s * 5.5, fy); x.stroke();
  x.fillStyle = L.shoes; ell(x, s * 5.5 + 1.1, -fy, 2.5, 1.7); ell(x, -s * 5.5 + 1.1, fy, 2.5, 1.7);
  if (L.acc === 'backpack') { x.fillStyle = L.top2; rrect(x, -L.d - 3.4, -L.w * .55, 4.6, L.w * 1.1, 1.8); x.fill(); x.fillStyle = O; x.fillRect(-L.d - 2.4, -L.w * .45, 1, L.w * .9); }
  // arms: sleeve at the shoulder, hand at the end
  const sleeve = L.outfit === 'jacket' || L.outfit === 'blazer' ? L.top2 : L.outfit === 'vest' ? L.top : L.top;
  for (const [ax, ay] of [[a1, b1], [a2, b2]]) {
    x.fillStyle = sleeve;
    if (L.sleeves === 'long') { x.strokeStyle = sleeve; x.lineWidth = 4.4; x.beginPath(); x.moveTo(0, ay * .86); x.lineTo(ax, ay); x.stroke(); }
    else ell(x, ax * .35, ay * .9, 2.7, 2.5);
    x.fillStyle = L.skin; circ(x, ax + (L.sleeves === 'long' ? .9 : 0), ay, 2);
  }
  // torso + outfit
  const torso = L.outfit === 'jacket' || L.outfit === 'blazer' ? L.top2 : L.outfit === 'vest' ? '#f4d03f' : L.top;
  x.fillStyle = torso; ell(x, 0, 0, L.d, L.w);
  x.save(); x.beginPath(); x.ellipse(0, 0, L.d, L.w, 0, 0, TAU); x.clip();
  switch (L.outfit) {
    case 'stripe': x.fillStyle = L.top2; for (const sx of [-3, 0, 3]) x.fillRect(sx - .7, -L.w, 1.4, L.w * 2); break;
    case 'jacket': case 'blazer': x.fillStyle = L.top; ell(x, L.d * .55, 0, L.d * .6, L.w * .3); break;
    case 'hoodie': x.fillStyle = mixColor(L.top, '#000000', .18); x.fillRect(-L.d, -.5, L.d * 2, 1); break;
    case 'overalls': x.fillStyle = L.top2; ell(x, .6, 0, L.d * .8, L.w * .48); x.fillRect(-L.d, -L.w * .42, L.d * 1.6, 1.4); x.fillRect(-L.d, L.w * .42 - 1.4, L.d * 1.6, 1.4); break;
    case 'plaid': x.globalAlpha = .45; x.fillStyle = L.top2; for (let k = -10; k <= 10; k += 3.5) { x.fillRect(k, -L.w, 1, L.w * 2); x.fillRect(-L.d, k, L.d * 2, 1); } x.globalAlpha = 1; break;
    case 'suit': x.fillStyle = L.top2; x.fillRect(-L.d * .2, -L.w, 1.2, L.w * 2); x.fillStyle = L.patch; x.fillRect(L.d * .25, -L.w * .55, 2.2, 2.2); break;
    case 'labcoat': x.fillStyle = L.top2; x.fillRect(L.d * .1, -.5, L.d, 1); x.fillStyle = '#7fa6c9'; x.fillRect(L.d * .2, L.w * .35, 1.6, 2.4); break; // pocket + pen
    case 'jumpsuit': x.fillStyle = L.top2; x.fillRect(-L.d, -.6, L.d * 2, 1.2); x.fillStyle = L.patch; circ(x, L.d * .3, -L.w * .5, 1.3); break;
    case 'vest': x.fillStyle = '#d9d9d9'; x.fillRect(-L.d, -L.w * .55, L.d * 2, 1.3); x.fillRect(-L.d, L.w * .55 - 1.3, L.d * 2, 1.3); break;
    case 'alien': x.fillStyle = L.top2; x.fillRect(L.d * .2, -L.w, 1.3, L.w * 2); x.fillStyle = 'rgba(255,255,255,.35)'; circ(x, L.d * .55, 0, 1.2); break; // tunic seam and a little badge
  }
  if (L.tie) { x.fillStyle = L.tie; x.fillRect(L.d * .45, -.9, L.d * .55, 1.8); }
  x.fillStyle = 'rgba(255,255,255,.1)'; ell(x, -L.d * .25, -L.w * .45, L.d * .6, L.w * .3); // soft top light
  x.restore();
  if (L.acc === 'bag') { x.strokeStyle = '#3a2a1e'; x.lineWidth = 1.1; x.beginPath(); x.moveTo(-L.d * .8, -L.w * .7); x.lineTo(L.d * .8, L.w * .7); x.stroke(); x.fillStyle = '#6b4a2e'; ell(x, -1, L.w + 2.2, 2.8, 2); }
  x.strokeStyle = O; x.lineWidth = .9; x.beginPath(); x.ellipse(0, 0, L.d, L.w, 0, 0, TAU); x.stroke();
  if (L.outfit === 'hoodie') { x.fillStyle = L.top; ell(x, -2.6, 0, 3.6, 5.4); x.strokeStyle = O; x.stroke(); }
  if (L.acc === 'glow') { x.strokeStyle = ['#7dff6a', '#ff3fa4', '#3fd4ff'][(c.pt * 100 | 0) % 3]; x.lineWidth = 1.6; x.beginPath(); x.moveTo(a1 - 1, b1 - 3); x.lineTo(a1 + 2, b1 + 2); x.stroke(); }
  if (L.outfit === 'alien') { // big smooth head, wide black eyes, a slit of a mouth
    x.fillStyle = 'rgba(0,0,0,.18)'; ell(x, -.1, 0, 6.2, 5.8);
    x.fillStyle = L.skin; ell(x, .6, 0, 6, 5.6); x.fillStyle = shade(L.skin, .14); ell(x, -.6, -1.2, 3.4, 2.6);
    x.fillStyle = '#0c0f0c'; x.beginPath(); x.ellipse(3.6, -2.4, 2.4, 1.3, -.55, 0, TAU); x.fill(); x.beginPath(); x.ellipse(3.6, 2.4, 2.4, 1.3, .55, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,255,255,.75)'; circ(x, 4.2, -2.7, .45); circ(x, 4.2, 2.1, .45);
    if (c.mouthBlood) { x.fillStyle = '#3f9a1c'; ell(x, 5.4, 0, 1, 1.6); }
    x.strokeStyle = 'rgba(0,0,0,.3)'; x.lineWidth = .8; x.beginPath(); x.ellipse(.6, 0, 6, 5.6, 0, 0, TAU); x.stroke();
    return;
  }
  // head
  x.fillStyle = 'rgba(0,0,0,.18)'; circ(x, -.3, 0, 5.2);
  x.fillStyle = L.skin; circ(x, .6, 0, 4.8);
  const hc = L.hair;
  if (!L.hat || L.hat === 'straw') switch (L.hairStyle) {
    case 'short': x.fillStyle = hc; circ(x, -.4, 0, 4.5); break;
    case 'buzz': x.globalAlpha = .6; x.fillStyle = hc; circ(x, -.1, 0, 4.6); x.globalAlpha = 1; break;
    case 'long': x.fillStyle = hc; ell(x, -2.4, 0, 4.3, 5.3); circ(x, -.3, 0, 4.6); break;
    case 'bun': x.fillStyle = hc; circ(x, -.4, 0, 4.5); circ(x, -4.6, 0, 2.3); break;
    case 'ponytail': x.fillStyle = hc; circ(x, -.4, 0, 4.5); ell(x, -6.2, 0, 2.7, 1.5); x.fillStyle = L.hatCol; circ(x, -4.4, 0, .9); break;
    case 'curly': x.fillStyle = hc; circ(x, -.6, 0, 3.8); for (let k = 0; k < 8; k++) { const a = Math.PI * .45 + k * Math.PI * 1.1 / 7; circ(x, -.6 + Math.cos(a) * 3.4, Math.sin(a) * 3.4, 1.9); } break;
    case 'bald': x.fillStyle = 'rgba(255,255,255,.28)'; ell(x, -.3, -1.6, 1.8, 1.1); break;
  }
  if (L.hat === 'cap') { x.fillStyle = L.hatCol; circ(x, -.2, 0, 4.9); x.fillStyle = mixColor(L.hatCol, '#000000', .25); ell(x, 4.6, 0, 2.4, 3.6); circ(x, -.2, 0, .8); }
  else if (L.hat === 'beanie') { x.fillStyle = L.hatCol; circ(x, -.3, 0, 5); x.strokeStyle = mixColor(L.hatCol, '#000000', .25); x.lineWidth = 1.2; x.beginPath(); x.arc(-.3, 0, 4.3, 0, TAU); x.stroke(); x.fillStyle = '#f2f2f2'; circ(x, -.3, 0, 1.5); }
  else if (L.hat === 'helmet') { // fishbowl helmet with a tinted visor facing forward
    x.fillStyle = 'rgba(235,240,246,.95)'; circ(x, .2, 0, 6.6); x.strokeStyle = 'rgba(0,0,0,.3)'; x.lineWidth = .8; x.beginPath(); x.arc(.2, 0, 6.6, 0, TAU); x.stroke();
    x.fillStyle = L.hatCol; x.beginPath(); x.ellipse(2.4, 0, 3.6, 4.8, 0, -Math.PI / 2, Math.PI / 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,.55)'; ell(x, 3.4, -2.2, 1, 1.6);
    x.fillStyle = '#3a3e44'; x.fillRect(4.6, -2.2, 2.4, 4.4); x.fillStyle = c.fl && c.fl.k > .01 ? `rgb(${c.fl.c})` : '#777'; x.fillRect(6.4, -1.6, 1, 3.2); // helmet lamp
  }
  else if (L.hat === 'straw') { x.fillStyle = '#e3c36a'; circ(x, -.2, 0, 7.4); x.fillStyle = '#d4ad4f'; circ(x, -.2, 0, 4.3); x.strokeStyle = '#8b3a2b'; x.lineWidth = 1; x.beginPath(); x.arc(-.2, 0, 4.5, 0, TAU); x.stroke(); }
  x.strokeStyle = O; x.lineWidth = .8; x.beginPath(); x.arc(.6, 0, 4.8, 0, TAU); x.stroke();
  if (c.mouthBlood && L.hat !== 'helmet') { x.fillStyle = BLOOD; ell(x, 4.6, 0, 1.1, 1.8); } // blood round the mouth
}
function drawAlien(x, c, d) { // little grey-green visitor: big head, huge black eyes, wobbling antennae
  const lp = Math.sin(c.phase) * c.moveAmt, w = Math.sin(T * 6 + c.pt * 40) * .6;
  x.fillStyle = shade(d.col, -.2); ell(x, -d.bl * .5 - lp * 2, -d.bw * .9, 2.6, 1.3); ell(x, -d.bl * .5 + lp * 2, d.bw * .9, 2.6, 1.3);
  x.fillStyle = d.col; ell(x, -1.5, 0, d.bl * .7, d.bw * .85);
  x.strokeStyle = shade(d.col, -.3); x.lineWidth = .9; x.beginPath(); x.moveTo(2, -2); x.lineTo(-1, -6 - w); x.moveTo(2, 2); x.lineTo(-1, 6 + w); x.stroke();
  x.fillStyle = '#d6ff6a'; circ(x, -1, -6 - w, 1.1); circ(x, -1, 6 + w, 1.1);
  x.fillStyle = shade(d.col, .12); ell(x, 3.2, 0, d.hr * .9, d.hr);
  x.fillStyle = '#0c0f0c'; x.beginPath(); x.ellipse(5.4, -2.2, 1.9, 1.1, -.5, 0, TAU); x.fill(); x.beginPath(); x.ellipse(5.4, 2.2, 1.9, 1.1, .5, 0, TAU); x.fill();
  x.fillStyle = 'rgba(255,255,255,.7)'; circ(x, 5.8, -2.5, .4); circ(x, 5.8, 1.9, .4);
}
function drawFirefly(x, c, d) { // a little beetle: dark wing cases, a flicker of wings, the lantern at the tail
  const fl = Math.sin(T * 60 + c.pt * 99);
  x.fillStyle = 'rgba(220,230,240,.35)'; ell(x, -.2, -1.6 - fl * .5, 2.2, 1.1); ell(x, -.2, 1.6 + fl * .5, 2.2, 1.1);
  x.fillStyle = '#2e2a1c'; ell(x, .4, 0, 2.2, 1.4); x.fillStyle = '#c8d86a'; ell(x, -1.8, 0, 1.2, 1); x.fillStyle = '#5a3a1a'; circ(x, 2.4, 0, .8);
}
function drawAnimal(x, c) {
  if (c.def.fly) return drawFirefly(x, c, c.def);
  const d = c.def, hc = d.hcol || d.col, lp = Math.sin(c.phase) * c.moveAmt, hx = d.bl * .85;
  if (d.tail === 'puff') { x.fillStyle = '#fff'; circ(x, -d.bl, 0, 2); }
  else if (d.tail) {
    x.strokeStyle = d.tcol || shade(d.col, -.25); x.lineWidth = d.tail === 'line' ? 2 : 1.4;
    x.beginPath(); x.moveTo(-d.bl * .8, 0);
    x.quadraticCurveTo(-d.bl * 1.4, lp * 4 + 2, -d.bl * (d.tail === 'long' ? 2 : 1.6), lp * 6); x.stroke();
  }
  if (d.legs) { const st = d.hop ? Math.min(1, (c.hz || 0) / 3) : 0; x.fillStyle = shade(d.col, -.15); // legs kick back mid-hop
    ell(x, -d.bl * .5 - lp * 2 - st * 3, -d.bw + st, 3 + st * 2, 1.5); ell(x, -d.bl * .5 + lp * 2 - st * 3, d.bw - st, 3 + st * 2, 1.5); }
  x.fillStyle = d.col; ell(x, 0, 0, d.bl, d.bw);
  if (d.fluff) for (let k = 0; k < 6; k++) circ(x, Math.cos(k) * d.bl * .7, Math.sin(k * 2) * d.bw * .7, 3.2);
  if (d.ears === 'long') { x.fillStyle = shade(d.col, -.12); ell(x, hx - 4, -2, 4, 1.4); ell(x, hx - 4, 2, 4, 1.4); }
  x.fillStyle = hc; circ(x, hx, 0, d.hr);
  if (d.ears === 'short') { x.fillStyle = shade(hc, -.15); circ(x, hx - 1, -d.hr * .8, 1.6); circ(x, hx - 1, d.hr * .8, 1.6); }
  if (d.ears === 'flop') { x.fillStyle = shade(hc, -.3); ell(x, hx - 1, -d.hr, 2.4, 1.6); ell(x, hx - 1, d.hr, 2.4, 1.6); }
  if (d.comb) { x.fillStyle = '#d62828'; circ(x, hx + .5, 0, 1.6); }
  if (d.beak) { x.fillStyle = '#f2a20c'; x.beginPath(); x.moveTo(hx + d.hr - 1, -1.4); x.lineTo(hx + d.hr + 3, 0); x.lineTo(hx + d.hr - 1, 1.4); x.fill(); }
  if (d.snout) { x.fillStyle = shade(d.col, -.15); circ(x, hx + d.hr, 0, 2.2); }
}
function drawCreature(x, c, portrait) {
  if (c.hz > .3) { x.fillStyle = 'rgba(0,0,0,.18)'; ell(x, c.x, c.y, c.def.r * .9, c.def.r * .7); } // ground shadow under a hopping frog
  x.save(); x.translate(c.x, c.y - (c.hz || 0) * .6); x.rotate(c.a); if (c.hz) x.scale(1 + c.hz * .035, 1 + c.hz * .035);
  if (c.dance) { const b = Math.abs(Math.sin(T * CLUB_BPM / 60 * Math.PI + c.pt * 30)); x.scale(1 + b * .05, 1 + b * .05); x.rotate(Math.sin(T * 2 + c.pt * 9) * .12); }
  c.def.human ? drawHuman(x, c) : drawAnimal(x, c);
  if (c.stains.length) {
    shapePath(x, c); x.clip();
    const n = c.stains.length;
    x.fillStyle = BLOOD;
    if (n > 12) { x.globalAlpha = Math.min(.4, n / 140); x.fillRect(-20, -20, 40, 40); x.globalAlpha = 1; } // soaked look
    for (const t of c.stains) { x.fillStyle = t.c || BLOOD; x.beginPath(); x.ellipse(t.x, t.y, t.r * (t.e || 1), t.r, t.a || 0, 0, TAU); x.fill(); }
  }
  x.restore();
  if (!portrait && c.def.human && c.state !== 'wander' && c.state !== 'idle' && !(c.bubbles && c.bubbles.some(b => b.delay <= 0))) {
    x.font = 'bold 13px sans-serif'; x.textAlign = 'center';
    x.fillStyle = c.state === 'panic' ? '#d00' : c.state === 'flee' ? '#e67e00' : '#555';
    x.fillText(c.state === 'uneasy' ? '?' : '!', c.x, c.y - 13);
  }
}

function mixColor(a, b, t) {
  const A = parseInt(a.slice(1), 16), Bc = parseInt(b.slice(1), 16), m = (s) => Math.round(((A >> s) & 255) * (1 - t) + ((Bc >> s) & 255) * t);
  return '#' + ((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1);
}
function hsl2hex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('');
}
function segColor(i, n, cfg) {
  switch (cfg.pattern) {
    case 'Stripes': return Math.floor(i / 2) % 2 ? cfg.color2 : cfg.color;
    case 'Zebra': return i % 2 ? cfg.color2 : cfg.color;
    case 'Gradient': return mixColor(cfg.color, cfg.color2, i / Math.max(1, n - 1));
    case 'Rainbow': return hsl2hex(((i * 22 - T * 90) % 360 + 360) % 360, 85, 56);
    case 'Neon': return mixColor(cfg.color, '#ffffff', (Math.sin(T * 6 - i * .5) + 1) * .22);
    case 'Lava': return mixColor('#ff3b00', '#ffc400', (Math.sin(T * 3 + i * .6) + 1) / 2);
    case 'Galaxy': return mixColor('#1a1033', cfg.color, (Math.sin(i * .7 + T) + 1) * .18);
    case 'Rat Fur': return i >= n - 3 ? '#d99a9a' : i % 2 ? '#7a7a82' : '#8a8a92';                       // grey fur, pink tail tip
    case 'Gold Plated': return mixColor('#a87a12', '#ffe680', (Math.sin(i * .5 - T * 2.5) + 1) * .5 * .8); // a highlight sweeping down the body
    case 'Blood Soaked': return mixColor(cfg.color, '#5a0606', .45 + .25 * ((i * 7919 % 13) / 13));
    case 'Hazard': return Math.floor(i / 2) % 2 ? '#1d1d1f' : '#f2c230';
    case 'Lunar': return mixColor('#b9c0c8', '#8a9099', (i * 37 % 10) / 22);
    case 'Martian': return mixColor('#c1440e', '#e2763a', (Math.sin(i * .8) + 1) * .4);
    default: return i % 2 ? mixColor(cfg.color, '#000000', .06) : cfg.color;
  }
}
function patternOverlay(x, g, r, i, cfg) {
  switch (cfg.pattern) {
    case 'Spots':
      if (i % 3 === 1) { const sa = g.a + (i % 2 ? 1.6 : -1.6); x.fillStyle = cfg.color2; circ(x, g.x + Math.cos(sa) * r * .4, g.y + Math.sin(sa) * r * .4, r * .35); }
      break;
    case 'Checker': { const a0 = g.a + (i % 2 ? 0 : Math.PI); x.fillStyle = cfg.color2; x.beginPath(); x.moveTo(g.x, g.y); x.arc(g.x, g.y, r, a0, a0 + Math.PI); x.fill(); break; }
    case 'Diamond':
      if (i % 2 === 0) { x.save(); x.translate(g.x, g.y); x.rotate(g.a + Math.PI / 4); x.fillStyle = cfg.color2; x.fillRect(-r * .35, -r * .35, r * .7, r * .7); x.restore(); }
      break;
    case 'Rat Fur':
      x.strokeStyle = 'rgba(40,40,46,.35)'; x.lineWidth = .7;
      for (let k = -1; k <= 1; k++) { const a = g.a + Math.PI + k * .5; x.beginPath(); x.moveTo(g.x + Math.cos(a) * r * .2, g.y + Math.sin(a) * r * .2); x.lineTo(g.x + Math.cos(a) * r * .8, g.y + Math.sin(a) * r * .8); x.stroke(); }
      break;
    case 'Gold Plated': x.fillStyle = 'rgba(255,250,220,.35)'; ell(x, g.x - r * .3, g.y - r * .35, r * .45, r * .22); break; // metal sheen
    case 'Blood Soaked': if (i % 3 === 0) { x.fillStyle = '#4a0505'; circ(x, g.x + Math.cos(i * 2.3) * r * .4, g.y + Math.sin(i * 2.3) * r * .4, r * .35); } break;
    case 'Lunar': if (i % 2 === 0) { x.fillStyle = 'rgba(70,76,86,.45)'; circ(x, g.x + Math.cos(i * 1.7) * r * .35, g.y + Math.sin(i * 1.7) * r * .35, r * .28); } break;
    case 'Martian': x.fillStyle = 'rgba(255,200,150,.5)'; for (let k = 0; k < 2; k++) circ(x, g.x + Math.cos(i * 3 + k * 2) * r * .5, g.y + Math.sin(i * 3 + k * 2) * r * .5, .7); break;
    case 'Galaxy':
      x.fillStyle = '#fff';
      for (let k = 0; k < 2; k++) {
        const h = ((i * 7919 + k * 104729) % 1000) / 1000, a = h * TAU + g.a, d = r * .65 * ((h * 13) % 1);
        x.globalAlpha = .35 + .65 * Math.abs(Math.sin(T * 3 + i + k)); circ(x, g.x + Math.cos(a) * d, g.y + Math.sin(a) * d, .8);
      }
      x.globalAlpha = 1; break;
  }
}
function drawEyes(x, cfg, base) {
  const eyes = [[4.4, -3.3], [4.4, 3.3]], e = cfg.eyes;
  if (e === 'Shades') {
    x.fillStyle = '#111';
    for (const [ex, ey] of eyes) { rrect(x, ex - 2.8, ey - 2.6, 5.6, 5.2, 1.6); x.fill(); }
    x.fillRect(3.6, -1, 1.6, 2);
    x.fillStyle = 'rgba(255,255,255,.35)'; for (const [ex, ey] of eyes) x.fillRect(ex - 1.8, ey - 1.8, 1.4, 1);
    return;
  }
  if (e === 'Visor') {
    x.fillStyle = 'rgba(41,227,255,.25)'; rrect(x, 1.5, -6.8, 6, 13.6, 2.5); x.fill();
    x.fillStyle = '#29e3ff'; rrect(x, 2.5, -5.8, 4, 11.6, 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(3.2, -4.6, 1, 4); return;
  }
  if (e === 'Cyclops') { x.fillStyle = '#fff'; circ(x, 4.8, 0, 4.6); x.fillStyle = '#2e7d32'; circ(x, 6, 0, 2.6); x.fillStyle = '#111'; circ(x, 6.3, 0, 1.4); return; }
  const big = e === 'Googly';
  for (const [ex, ey] of eyes) {
    if (e === 'Hearts') { x.fillStyle = '#ff2d55'; heart(x, ex + .5, ey, 2.8); continue; }
    if (e === 'Stars') { x.fillStyle = '#ffd23f'; star(x, ex + .5, ey, 3.6, T * 2); continue; }
    if (e === 'Dead') {
      x.strokeStyle = '#111'; x.lineWidth = 1.4; x.beginPath();
      x.moveTo(ex - 2.2, ey - 2.2); x.lineTo(ex + 2.2, ey + 2.2); x.moveTo(ex + 2.2, ey - 2.2); x.lineTo(ex - 2.2, ey + 2.2); x.stroke(); continue;
    }
    if (e === 'Laser') {
      x.fillStyle = 'rgba(255,30,30,.35)'; circ(x, ex, ey, 5); x.fillStyle = '#ff2020'; circ(x, ex, ey, 3.2); x.fillStyle = '#fff'; circ(x, ex + 1, ey, 1.1);
      x.strokeStyle = `rgba(255,40,40,${.18 + .1 * Math.sin(T * 20)})`; x.lineWidth = 1.6;
      x.beginPath(); x.moveTo(ex + 2, ey); x.lineTo(ex + 60, ey * 2.5); x.stroke(); continue;
    }
    x.fillStyle = '#fff'; circ(x, ex, ey, big ? 4 : 3.3);
    const px = big ? Math.cos(T * 7 + ey) * 1.6 : 1.2, py = big ? Math.sin(T * 9 + ey) * 1.6 : 0;
    x.fillStyle = '#111'; circ(x, ex + px, ey + py, big ? 2.1 : 1.8);
    if (e === 'Sleepy') { x.fillStyle = base; x.beginPath(); x.arc(ex, ey, 3.6, Math.PI / 2, Math.PI * 1.5); x.fill(); }
    if (e === 'Angry') { x.strokeStyle = '#111'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(ex + 3.2, ey * .25); x.lineTo(ex - 1.5, ey * 1.45); x.stroke(); }
  }
}
function drawHat(x, hat) { // head-local frame, +x = forward; hats sit behind the eyes
  const c = -5;
  switch (hat) {
    case 'Top hat':
      x.fillStyle = '#161616'; circ(x, c, 0, 8); x.fillStyle = '#a11d1d'; circ(x, c, 0, 5.6);
      x.fillStyle = '#262626'; circ(x, c, 0, 4.6); x.fillStyle = 'rgba(255,255,255,.12)'; circ(x, c - 1.2, -1.2, 2); break;
    case 'Party hat':
      x.fillStyle = '#f2c94c'; circ(x, c, 0, 7); x.strokeStyle = '#e04f8a'; x.lineWidth = 1.6;
      for (let k = 0; k < 5; k++) { const a = k * TAU / 5; x.beginPath(); x.moveTo(c, 0); x.lineTo(c + Math.cos(a) * 7, Math.sin(a) * 7); x.stroke(); }
      x.fillStyle = '#fff'; circ(x, c, 0, 2.2); break;
    case 'Crown':
      x.fillStyle = '#e8c33a'; x.beginPath();
      for (let k = 0; k < 10; k++) { const a = k * TAU / 10, r = k % 2 ? 4.8 : 7.6; x.lineTo(c + Math.cos(a) * r, Math.sin(a) * r); }
      x.closePath(); x.fill(); x.fillStyle = '#c99a1c'; circ(x, c, 0, 3.4);
      x.fillStyle = '#d62828'; for (let k = 0; k < 5; k++) { const a = k * TAU / 5; circ(x, c + Math.cos(a) * 6, Math.sin(a) * 6, 1.1); } break;
    case 'Cowboy':
      x.fillStyle = '#8b5a2b'; ell(x, c, 0, 8, 10.5); x.fillStyle = '#6b4220'; ell(x, c, 0, 5, 6);
      x.fillStyle = '#3a2410'; ell(x, c, 0, 5.2, 1.2); x.fillStyle = '#7a4c24'; ell(x, c - .5, 0, 2, 4); break;
    case 'Beanie':
      x.fillStyle = '#c0392b'; circ(x, c, 0, 7.5); x.strokeStyle = '#962d22'; x.lineWidth = 1.5;
      x.beginPath(); x.arc(c, 0, 6.4, 0, TAU); x.stroke(); x.fillStyle = '#f2f2f2'; circ(x, c, 0, 2.6); break;
    case 'Chef':
      x.fillStyle = '#ddd'; circ(x, c, 0, 8); x.fillStyle = '#fafafa';
      for (const [dx, dy] of [[-3, -3], [-3, 3], [2.5, -3], [2.5, 3]]) circ(x, c + dx, dy, 3.8);
      circ(x, c, 0, 4.2); break;
    case 'Halo':
      x.strokeStyle = 'rgba(255,230,120,.3)'; x.lineWidth = 5; x.beginPath(); x.ellipse(c, 0, 6, 7.5, 0, 0, TAU); x.stroke();
      x.strokeStyle = 'rgba(255,220,90,.95)'; x.lineWidth = 2; x.stroke(); break;
    case 'Horns':
      for (const sg of [-1, 1]) {
        x.fillStyle = '#e9e1cf'; x.beginPath(); x.moveTo(-1, sg * 4.5);
        x.quadraticCurveTo(-6, sg * 13, -13, sg * 11); x.lineTo(-5, sg * 2.5); x.closePath(); x.fill();
        x.fillStyle = '#8f8576'; circ(x, -12.4, sg * 11, 1.2);
      } break;
    case 'Flower':
      x.fillStyle = '#ff9ecb'; for (let k = 0; k < 5; k++) { const a = k * TAU / 5; circ(x, c + Math.cos(a) * 3.6, Math.sin(a) * 3.6, 2.7); }
      x.fillStyle = '#ffd23f'; circ(x, c, 0, 2.2); break;
    case 'Viking':
      for (const sg of [-1, 1]) { x.fillStyle = '#efe6d2'; x.beginPath(); x.moveTo(c + 1, sg * 5.5); x.quadraticCurveTo(c + 2, sg * 13, c - 5, sg * 13); x.lineTo(c - 2, sg * 5); x.closePath(); x.fill(); }
      x.fillStyle = '#8a8f99'; circ(x, c, 0, 7.5); x.strokeStyle = '#6b4a2b'; x.lineWidth = 2; x.beginPath(); x.arc(c, 0, 6.6, 0, TAU); x.stroke();
      x.fillStyle = '#b4b9c2'; circ(x, c - 1.5, -1.5, 2.2); break;
    case 'Pirate':
      x.fillStyle = '#1b1b1b'; x.beginPath(); x.moveTo(c + 7, 0); x.lineTo(c - 6, -9); x.lineTo(c - 4, 0); x.lineTo(c - 6, 9); x.closePath(); x.fill();
      circ(x, c - 1, 0, 5.5); x.fillStyle = '#f2f2f2'; circ(x, c + 1.5, 0, 1.8); x.fillStyle = '#d9b13b'; x.fillRect(c - 5, -6, 1, 12); break;
    case 'Wizard':
      x.fillStyle = '#4b2a8a'; circ(x, c, 0, 8.5); x.fillStyle = '#5f37a8'; circ(x, c - 1, 0, 5.5); x.fillStyle = '#7b52c7'; circ(x, c - 2.5, 1.5, 2.6);
      x.fillStyle = '#ffd23f'; star(x, c + 4, -4, 1.8); star(x, c - 4, 5, 1.4); break;
    case 'Santa':
      x.fillStyle = '#c62828'; circ(x, c, 0, 7); x.strokeStyle = '#f5f5f5'; x.lineWidth = 2.6; x.beginPath(); x.arc(c, 0, 7, 0, TAU); x.stroke();
      x.fillStyle = '#f5f5f5'; circ(x, c - 9, 4, 2.6); x.strokeStyle = '#c62828'; x.lineWidth = 2; x.beginPath(); x.moveTo(c - 3, 1); x.lineTo(c - 8, 4); x.stroke(); break;
    case 'Headphones':
      x.strokeStyle = '#222'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(c + 3, -9); x.quadraticCurveTo(c - 3, 0, c + 3, 9); x.stroke();
      for (const sg of [-1, 1]) { x.fillStyle = '#333'; ell(x, c + 3, sg * 9.5, 3.2, 2.2); x.fillStyle = '#ff3b3b'; ell(x, c + 3, sg * 9.5, 1.6, 1); } break;
    case 'Bow':
      x.fillStyle = '#ff5fa2';
      for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(c, 0); x.lineTo(c - 4, sg * 7); x.lineTo(c + 4, sg * 7); x.closePath(); x.fill(); }
      x.fillStyle = '#e0337f'; circ(x, c, 0, 2); break;
    case 'Propeller':
      ['#e53935', '#fdd835', '#1e88e5', '#43a047'].forEach((col, k) => { x.fillStyle = col; x.beginPath(); x.moveTo(c, 0); x.arc(c, 0, 7, k * Math.PI / 2, (k + 1) * Math.PI / 2); x.fill(); });
      x.save(); x.translate(c, 0); x.rotate(T * 25); x.fillStyle = '#444'; x.fillRect(-9, -1, 18, 2); x.restore(); x.fillStyle = '#222'; circ(x, c, 0, 1.6); break;
    case 'Mohawk':
      x.fillStyle = '#ff2d55'; for (let k = 0; k < 6; k++) ell(x, c + 5 - k * 3, 0, 2.2, 1.4 + (k % 2) * .4); break;
    case 'Cone':
      x.fillStyle = '#ff7a00'; x.fillRect(c - 7, -7, 14, 14); x.fillStyle = '#ff8f1f'; circ(x, c, 0, 5.2);
      x.strokeStyle = '#fff'; x.lineWidth = 1.4; x.beginPath(); x.arc(c, 0, 3.6, 0, TAU); x.stroke(); x.fillStyle = '#c45500'; circ(x, c, 0, 1.4); break;
    case 'Sombrero':
      x.fillStyle = '#d9a441'; circ(x, c, 0, 12); x.strokeStyle = '#c0392b'; x.lineWidth = 1.6; x.beginPath();
      for (let k = 0; k <= 24; k++) { const a = k * TAU / 24, rr = k % 2 ? 9 : 10.5; x.lineTo(c + Math.cos(a) * rr, Math.sin(a) * rr); } x.stroke();
      x.fillStyle = '#c8952f'; circ(x, c, 0, 5); break;
    case 'Graduation':
      x.save(); x.translate(c, 0); x.rotate(Math.PI / 4); x.fillStyle = '#1b1b1b'; x.fillRect(-7, -7, 14, 14); x.restore();
      x.strokeStyle = '#ffd23f'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(c, 0); x.lineTo(c - 6, 8 + Math.sin(T * 4)); x.stroke();
      x.fillStyle = '#ffd23f'; circ(x, c, 0, 1.4); break;
    case 'Antenna':
      for (const sg of [-1, 1]) {
        const bx = c - 8 + Math.sin(T * 6 + sg) * 1.5, by = sg * 8;
        x.strokeStyle = '#222'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(c + 2, sg * 3); x.lineTo(bx, by); x.stroke();
        x.fillStyle = '#ff3b3b'; circ(x, bx, by, 1.9);
      } break;
  }
}
function stainSprite(sts) { // re-rendered only when that segment gets new blood
  const R0 = CONFIG.snakeR, S = 4; // 4 px per unit for crisp scaling
  if (!sts.spr) { sts.spr = document.createElement('canvas'); sts.spr.width = sts.spr.height = R0 * 2 * S; sts.dirty = true; }
  if (sts.dirty) {
    const x = sts.spr.getContext('2d');
    x.setTransform(S, 0, 0, S, R0 * S, R0 * S); x.clearRect(-R0, -R0, R0 * 2, R0 * 2);
    x.save(); x.beginPath(); x.arc(0, 0, R0, 0, TAU); x.clip();
    for (const st of sts) { // flat streaks smeared backward along the body
      const e = st.e || 1.4, cx = Math.cos(st.a) * st.d - st.r * (e - 1) * .5, cy = Math.sin(st.a) * st.d;
      x.fillStyle = st.c || BLOOD;
      ell(x, cx, cy, st.r * e, st.r); if (st.r > 2.2) circ(x, cx - st.r * e * .8, cy + st.r * .3, st.r * .45);
    }
    x.restore(); sts.dirty = false;
  }
  return sts.spr;
}

/* =========================================================
   CREATURE DRAWING (top-down, local frame: +x = forward)
   ========================================================= */
function armPos(c) {
  const L = c.look, s = Math.sin(c.phase) * c.moveAmt, sw = L.w + .4;
  const run = c.state === 'panic' || c.state === 'flee' || (c.state === 'uneasy' && c.moveAmt > .5);
  if (c.state === 'panic' && c.flail) { const f = Math.sin(T * 25 + c.side) * 2; return [5.5 + f, -sw + 1.5, 5.5 - f, sw - 1.5]; } // the jumpy ones flap their arms
  if (run) { const p = s * (c.armK || 1) * 5.6; return [1.4 - p, -sw + .8, 1.4 + p, sw - .8]; } // running: elbows in, arms pumping against the legs
  if (c.dance) { const b = Math.sin(T * CLUB_BPM / 60 * Math.PI * 2 + (c.seed ?? .5) * 30); return [3 + b * 2.5, -sw - 1.5, 3 - b * 2.5, sw + 1.5]; } // hands up
  if (MOD.blind && c.def.human && !c.def.alien && !c.dance) return c.fl && c.fl.on && !c.fl.helmet ? [4.5 + s * 1.2, -sw + 1.2, 6 + s * .8, sw - 2] : [4.5 + s * 1.5, -sw + 1.2, 4.5 - s * 1.5, sw - 1.2]; // blind: hands out in front, feeling the way
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
  } else { // body ellipse + head circle, matching each animal's drawing
    const S = ANIMAL_SHAPE[c.type] || [d.bl, d.bw, 0, d.bl * .85, d.hr];
    x.ellipse(S[2], 0, S[0], S[1], 0, 0, TAU);
    x.moveTo(S[3] + S[4], 0); x.arc(S[3], 0, S[4], 0, TAU);
  }
}
const ANIMAL_SHAPE = { rabbit: [6.6, 4.8, -1, 5, 3.3], deer: [11.2, 6.2, -1, 12, 3.2], frog: [5.2, 4.6, -.6, 3.2, 2.4], dog: [9.6, 5.6, -.5, 9.6, 4.6], cat: [7.6, 4.4, -.5, 6.4, 3.8],
  chicken: [5.4, 4.4, -.6, 4.8, 3], duck: [6.2, 4.6, -.6, 6, 3], pig: [10.2, 7.6, -.5, 9.6, 5], sheep: [8.2, 7.6, 0, 8.8, 3.8], rat: [5.6, 3.3, -.4, 4.8, 2.3], firefly: [2.4, 1.8, 0, 2, 1] };
function drawHuman(x, c) { // a little bob with each step and a sway side to side, so walking doesn't look like sliding
  if (c.strideK === undefined) { c.strideK = rand(.85, 1.15); c.armK = rand(.75, 1.2); c.flail = hasTrait(c, 'jumpy') || hasTrait(c, 'nervous') || Math.random() < .15; }
  const m = c.moveAmt, run = c.state === 'panic' || c.state === 'flee', bob = 1 + (1 - Math.cos(c.phase * 2)) * .5 * .045 * m * (run ? 1.4 : 1);
  x.save(); x.translate(0, Math.sin(c.phase) * .55 * m * (run ? 1.3 : 1)); x.scale(bob, bob); drawHumanBody(x, c); x.restore();
}
function drawHumanBody(x, c) { // top-down person, +x = facing direction
  const L = c.look, s = Math.sin(c.phase) * c.moveAmt, [a1, b1, a2, b2] = armPos(c), O = 'rgba(0,0,0,.3)', fy = L.w * .38;
  // legs and shoes stride out from under the body
  x.strokeStyle = L.pants; x.lineWidth = 3.6; x.lineCap = 'round';
  const run = c.state === 'panic' || c.state === 'flee', stride = (run ? 7.8 : 5.2) * (c.strideK || 1);
  const cp = Math.cos(c.phase) * c.moveAmt, l1 = Math.max(0, cp), l2 = Math.max(0, -cp); // the foot swinging forward lifts a little (bigger from above), the planted one stays flat
  const f1 = s * stride, f2 = -s * stride, y1 = -fy - l1 * .5, y2 = fy + l2 * .5;
  x.beginPath(); x.moveTo(-.6, -fy * .8); x.quadraticCurveTo(f1 * .5, -fy - l1 * .4, f1, y1); x.moveTo(-.6, fy * .8); x.quadraticCurveTo(f2 * .5, fy + l2 * .4, f2, y2); x.stroke();
  x.fillStyle = L.shoes; ell(x, f1 + 1.1, y1, 2.5 * (1 + l1 * .14), 1.7 * (1 + l1 * .1)); ell(x, f2 + 1.1, y2, 2.5 * (1 + l2 * .14), 1.7 * (1 + l2 * .1));
  x.rotate(-s * .07); // shoulders twist against the hips
  if (run) x.translate(1.3 * c.moveAmt, 0); // leaning into the run: everything above the legs pitches forward
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
  if (L.acc === 'glow') { x.strokeStyle = ['#7dff6a', '#ff3fa4', '#3fd4ff'][((c.seed ?? .5) * 100 | 0) % 3]; x.lineWidth = 1.6; x.beginPath(); x.moveTo(a1 - 1, b1 - 3); x.lineTo(a1 + 2, b1 + 2); x.stroke(); }
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
  if (c.mouthBlood && L.hat !== 'helmet') { x.fillStyle = c.mouthCol || BLOOD; ell(x, 4.6, 0, 1.1, 1.8); } // blood round the mouth
}
function drawAlien(x, c, d) { // little grey-green visitor: big head, huge black eyes, wobbling antennae
  const lp = Math.sin(c.phase) * c.moveAmt, w = Math.sin(T * 6 + (c.seed ?? .5) * 40) * .6;
  x.fillStyle = shade(d.col, -.2); ell(x, -d.bl * .5 - lp * 2, -d.bw * .9, 2.6, 1.3); ell(x, -d.bl * .5 + lp * 2, d.bw * .9, 2.6, 1.3);
  x.fillStyle = d.col; ell(x, -1.5, 0, d.bl * .7, d.bw * .85);
  x.strokeStyle = shade(d.col, -.3); x.lineWidth = .9; x.beginPath(); x.moveTo(2, -2); x.lineTo(-1, -6 - w); x.moveTo(2, 2); x.lineTo(-1, 6 + w); x.stroke();
  x.fillStyle = '#d6ff6a'; circ(x, -1, -6 - w, 1.1); circ(x, -1, 6 + w, 1.1);
  x.fillStyle = shade(d.col, .12); ell(x, 3.2, 0, d.hr * .9, d.hr);
  x.fillStyle = '#0c0f0c'; x.beginPath(); x.ellipse(5.4, -2.2, 1.9, 1.1, -.5, 0, TAU); x.fill(); x.beginPath(); x.ellipse(5.4, 2.2, 1.9, 1.1, .5, 0, TAU); x.fill();
  x.fillStyle = 'rgba(255,255,255,.7)'; circ(x, 5.8, -2.5, .4); circ(x, 5.8, 1.9, .4);
}
function drawFirefly(x, c, d) { // a little beetle: dark wing cases, a flicker of wings, the lantern at the tail
  const fl = Math.sin(T * 60 + (c.seed ?? .5) * 99);
  x.fillStyle = 'rgba(220,230,240,.35)'; ell(x, -.2, -1.6 - fl * .5, 2.2, 1.1); ell(x, -.2, 1.6 + fl * .5, 2.2, 1.1);
  x.fillStyle = '#2e2a1c'; ell(x, .4, 0, 2.2, 1.4); x.fillStyle = '#c8d86a'; ell(x, -1.8, 0, 1.2, 1); x.fillStyle = '#5a3a1a'; circ(x, 2.4, 0, .8);
}
/* ---- animals: top-down, +x forward. Each one: feet that actually step, a shaded body, a head with real features ---- */
const EYE = (x, px, py, r = .8) => { x.fillStyle = '#121212'; circ(x, px, py, r); x.fillStyle = 'rgba(255,255,255,.7)'; circ(x, px + r * .3, py - r * .3, r * .35); };
function feet(x, c, d, fx, bx, wy, col, r = 1.5) { // four paws/hooves in a proper trot: diagonal pairs move together; a swinging foot lifts (bigger, lighter), a planted one pushes back flat
  const m = c.moveAmt, ph = c.phase, st = 2.4 * m, sw = Math.sin(ph), lift = Math.cos(ph);
  const foot = (bx0, y, dir) => { const s = sw * st * dir, up = Math.max(0, lift * dir) * m; // up > 0: this foot is in the air, travelling forward
    x.fillStyle = up > .05 ? shade(col, .12 * up) : col; circ(x, bx0 + s, y * (1 + up * .08), r * (1 + up * .22)); };
  foot(fx, -wy, 1); foot(bx, wy, 1); foot(fx, wy, -1); foot(bx, -wy, -1); // left-front with right-back, then the other pair
}
function body(x, len, wid, col, cx = 0) { // shaded oval: darker underside edge, lit back
  x.fillStyle = shade(col, -.18); ell(x, cx, 0, len, wid);
  x.fillStyle = col; ell(x, cx - .3, -.25, len - .7, wid - .8);
  x.fillStyle = 'rgba(255,255,255,.14)'; ell(x, cx - len * .15, -wid * .32, len * .55, wid * .32);
}
const ANIMALS = {
  rabbit(x, c, d) {
    const air = Math.min(1, (c.hz || 0) / 5), st = air * 3; // legs stretch out mid-bound
    x.fillStyle = shade(d.col, -.1); ell(x, -5 - st, -3.2, 3 + st * .6, 1.6); ell(x, -5 - st, 3.2, 3 + st * .6, 1.6); // big hind feet
    x.fillStyle = shade(d.col, -.2); circ(x, 3 + st * .8, -2, 1.2); circ(x, 3 + st * .8, 2, 1.2);
    body(x, 6.4, 4.6, d.col, -1); x.fillStyle = '#fff'; circ(x, -7.4, 0, 2.1); // cottontail
    x.fillStyle = shade(d.col, .05); ell(x, 4.6, 0, 3.4, 3); // head
    const flop = Math.sin(T * 3 + (c.seed ?? .5) * 20) * .15 + air * .3;
    for (const sg of [-1, 1]) { x.save(); x.translate(3.4, sg * 1.3); x.rotate(Math.PI + sg * (.28 + flop)); x.fillStyle = shade(d.col, -.08); ell(x, 3.2, 0, 3.4, 1.1); x.fillStyle = 'rgba(227,181,168,.8)'; ell(x, 3.4, 0, 2.3, .45); x.restore(); }
    EYE(x, 5.6, -1.9, .7); EYE(x, 5.6, 1.9, .7); x.fillStyle = '#d98a8a'; circ(x, 7.8, 0, .6);
  },
  deer(x, c, d) { // slender legs, a long neck, ears that only twitch now and then; bucks carry antlers, does don't
    const k = (c.sizeK || 1) * (c.male ? 1.04 : .94), tk = (c.toneK || 0) + (c.male ? -.04 : .04), col = tk < 0 ? mixColor(d.col, '#000000', -tk) : mixColor(d.col, '#ffffff', tk), run = c.state === 'panic' || c.state === 'flee';
    x.save(); x.scale(k, k);
    const st = Math.sin(c.phase) * c.moveAmt * (run ? 4.2 : 2.6); // longer strides at a run
    x.strokeStyle = shade(col, -.35); x.lineWidth = 1.4; x.lineCap = 'round'; x.beginPath(); // legs, out from under the body
    for (const [lx, sg, ph] of [[6, -1, st], [6, 1, -st], [-7, -1, -st], [-7, 1, st]]) { x.moveTo(lx, sg * 3.6); x.lineTo(lx + ph, sg * 4.6); }
    x.stroke(); x.fillStyle = '#2a1e14'; for (const [lx, sg, ph] of [[6, -1, st], [6, 1, -st], [-7, -1, -st], [-7, 1, st]]) circ(x, lx + ph, sg * 4.7, .8); // hooves
    x.fillStyle = shade(col, -.2); x.beginPath(); x.ellipse(-1, 0, 10.5, 5.4, 0, 0, TAU); x.fill(); // body: deeper at the haunch, narrower at the chest
    x.fillStyle = col; x.beginPath(); x.moveTo(8.6, 0); x.bezierCurveTo(7, -4.2, -6, -5.6, -9.6, -3); x.bezierCurveTo(-11.4, -1, -11.4, 1, -9.6, 3); x.bezierCurveTo(-6, 5.6, 7, 4.2, 8.6, 0); x.fill();
    x.fillStyle = shade(col, -.16); x.beginPath(); x.ellipse(-1.5, 0, 8, 1.3, 0, 0, TAU); x.fill(); // darker line down the spine
    x.fillStyle = 'rgba(255,255,255,.12)'; ell(x, -2, -2.4, 6, 1.4);
    const flag = run ? 1.5 : 1; x.fillStyle = '#f4ede0'; ell(x, -10.4, 0, 2.2 * flag, 2.4); x.fillStyle = shade(col, -.1); ell(x, -11.6 - (run ? 1.2 : 0), 0, 1.3, .9 * flag); // white rump; the tail goes up when it bolts
    const nod = run ? 1.5 : Math.sin(T * .7 + (c.seed ?? .5) * 9) * .6;
    x.fillStyle = shade(col, -.06); x.beginPath(); x.moveTo(6, -2.4); x.quadraticCurveTo(10 + nod, -1.6, 11 + nod, 0); x.quadraticCurveTo(10 + nod, 1.6, 6, 2.4); x.fill(); // neck
    const hx = 12.6 + nod;
    x.fillStyle = col; x.beginPath(); x.moveTo(hx - 2.2, -2); x.quadraticCurveTo(hx + 1.2, -1.8, hx + 3.4, -.6); x.quadraticCurveTo(hx + 4, 0, hx + 3.4, .6); x.quadraticCurveTo(hx + 1.2, 1.8, hx - 2.2, 2); x.closePath(); x.fill(); // long head
    x.fillStyle = '#2a1c12'; circ(x, hx + 3.5, 0, .7); // nose
    const tw = Math.max(0, Math.sin(T * 1.3 + (c.seed ?? .5) * 31)) > .97 ? .45 : 0; // an ear flick every few seconds, not with every step
    for (const sg of [-1, 1]) { x.save(); x.translate(hx - 1.4, sg * 1.6); x.rotate(sg * (2.2 - (run ? .5 : 0)) + (sg < 0 ? tw : 0)); x.fillStyle = shade(col, -.12); ell(x, 2.1, 0, 2.3, 1); x.fillStyle = 'rgba(240,215,200,.55)'; ell(x, 2.2, 0, 1.4, .45); x.restore(); }
    if (c.male) { // antlers: two main beams sweeping forward with a few tines, size varies from buck to buck
      const A = c.antK || 1; x.strokeStyle = '#7a6448'; x.lineWidth = 1; x.lineCap = 'round';
      for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(hx - .6, sg * 1.2); x.quadraticCurveTo(hx - 3 * A, sg * 5.6 * A, hx + 2.6 * A, sg * 6.6 * A); // main beam
        for (const t of [.3, .55, .8]) { const bx = hx - .6 + (hx + 2.6 * A - hx + .6) * t - 2 * A * Math.sin(t * Math.PI), by = sg * (1.2 + 5.4 * A * t); x.moveTo(bx, by); x.lineTo(bx + 1.6 * A, by + sg * (t < .5 ? -1.2 : .4) * A); }
        x.stroke(); }
      x.fillStyle = '#d9cbb0'; for (const sg of [-1, 1]) circ(x, hx + 2.6 * (c.antK || 1), sg * 6.6 * (c.antK || 1), .5);
    }
    EYE(x, hx + .8, -1.25, .55); EYE(x, hx + .8, 1.25, .55);
    x.restore();
  },
  frog(x, c, d) {
    const air = Math.min(1, (c.hz || 0) / 3), st = air * 3;
    x.fillStyle = shade(d.col, -.15); // folded back legs kick out when it jumps
    for (const sg of [-1, 1]) { ell(x, -2.6 - st, sg * (3.6 - air), 2.8 + st * .7, 1.3); circ(x, -4.6 - st * 1.6, sg * (4.4 - air), 1.1); ell(x, 2.6, sg * 3.6, 1.6, .9); }
    body(x, 4.6, 4, d.col);
    x.fillStyle = '#c9d77a'; ell(x, .6, 0, 2.6, 2.2); x.fillStyle = 'rgba(40,70,20,.5)'; circ(x, -1.6, -1.6, .8); circ(x, -.4, 1.8, .7); circ(x, -2.4, .6, .6);
    for (const sg of [-1, 1]) { x.fillStyle = shade(d.col, .1); circ(x, 3.2, sg * 2.1, 1.5); EYE(x, 3.5, sg * 2.2, .9); }
  },
  dog(x, c, d) {
    feet(x, c, d, 6, -6, 3, shade(d.col, -.3), 1.4);
    const wag = Math.sin(T * (c.state === 'wander' ? 12 : 22) + (c.seed ?? .5) * 30) * (c.state === 'panic' ? .3 : .6);
    x.strokeStyle = shade(d.col, -.12); x.lineWidth = 2; x.lineCap = 'round'; x.beginPath(); x.moveTo(-8, 0); x.quadraticCurveTo(-11, wag * 4, -13, wag * 6); x.stroke();
    body(x, 9.5, 5.4, d.col, -.5);
    x.fillStyle = shade(d.col, -.22); ell(x, -2, 0, 4, 3.4); // darker saddle
    x.fillStyle = d.col; circ(x, 8.4, 0, 4.2); x.fillStyle = shade(d.col, .12); ell(x, 11.6, 0, 2.6, 2.2); x.fillStyle = '#1a1210'; circ(x, 13.4, 0, 1.1); // head, muzzle, nose
    for (const sg of [-1, 1]) { x.fillStyle = shade(d.col, -.35); ell(x, 7, sg * 4.2, 2.6, 1.6); }
    EYE(x, 9.8, -1.8, .7); EYE(x, 9.8, 1.8, .7);
    x.fillStyle = '#c0392b'; x.fillRect(5.2, -3.6, 1.2, 7.2); // collar
  },
  cat(x, c, d) {
    feet(x, c, d, 4.6, -4.6, 2.6, shade(d.col, -.15), 1.2);
    const sw = Math.sin(T * 3 + (c.seed ?? .5) * 20) * .5;
    x.strokeStyle = d.col; x.lineWidth = 2.2; x.lineCap = 'round'; x.beginPath(); x.moveTo(-6, 0); x.bezierCurveTo(-10, sw * 4, -12, -sw * 5, -14, sw * 2); x.stroke();
    x.strokeStyle = shade(d.col, -.25); x.lineWidth = 2.2; x.beginPath(); x.moveTo(-13.2, sw * 2.6); x.lineTo(-14, sw * 2); x.stroke(); // dark tail tip
    body(x, 7.4, 4.2, d.col, -.5);
    x.strokeStyle = shade(d.col, -.22); x.lineWidth = 1; x.beginPath(); for (let k = -1; k <= 1; k++) { x.moveTo(-4 + k * 3, -3.4); x.quadraticCurveTo(-3.2 + k * 3, 0, -4 + k * 3, 3.4); } x.stroke(); // tabby stripes
    x.fillStyle = d.col; circ(x, 6.2, 0, 3.6);
    for (const sg of [-1, 1]) { x.fillStyle = shade(d.col, -.1); x.beginPath(); x.moveTo(4.6, sg * 1.6); x.lineTo(4, sg * 4.6); x.lineTo(6.6, sg * 3.2); x.fill(); x.fillStyle = '#f2b5b0'; circ(x, 4.9, sg * 3.3, .55); }
    x.fillStyle = '#7bd36a'; circ(x, 7.6, -1.4, .75); circ(x, 7.6, 1.4, .75); x.fillStyle = '#111'; x.fillRect(7.5, -1.8, .4, .8); x.fillRect(7.5, 1, .4, .8);
    x.fillStyle = '#e58a8a'; circ(x, 9.4, 0, .5);
  },
  chicken(x, c, d) {
    const s = Math.sin(c.phase * 1.4) * c.moveAmt * 1.6; x.fillStyle = '#e8a01c'; circ(x, 1 + s, -1.8, .9); circ(x, 1 - s, 1.8, .9); // feet
    x.fillStyle = shade(d.col, -.12); for (const sg of [-1, 1]) ell(x, -1, sg * 3.2, 3.6, 1.6); // folded wings
    body(x, 5.2, 4.2, d.col, -.4);
    x.fillStyle = shade(d.col, -.08); for (let k = 0; k < 3; k++) ell(x, -5 - k, (k - 1) * 1.2, 2, .9); // tail feathers
    const peck = c.state === 'idle' ? Math.max(0, Math.sin(T * 6 + (c.seed ?? .5) * 40)) * 1.2 : 0;
    x.fillStyle = d.col; circ(x, 4.4 + peck, 0, 2.8);
    x.fillStyle = '#d62828'; circ(x, 3.8 + peck, 0, 1.2); circ(x, 5 + peck, 0, 1); ell(x, 6.4 + peck, .9, .8, .6); // comb + wattle
    x.fillStyle = '#f2a20c'; x.beginPath(); x.moveTo(6.6 + peck, -.9); x.lineTo(8.6 + peck, 0); x.lineTo(6.6 + peck, .9); x.fill();
    EYE(x, 5.2 + peck, -1.6, .5); EYE(x, 5.2 + peck, 1.6, .5);
  },
  duck(x, c, d) {
    const s = Math.sin(c.phase * 1.2) * c.moveAmt * 1.4; x.fillStyle = '#f08a1c'; ell(x, 1 + s, -2, 1.3, .9); ell(x, 1 - s, 2, 1.3, .9);
    x.fillStyle = shade(d.col, -.15); for (const sg of [-1, 1]) ell(x, -1.4, sg * 3, 4.2, 1.6);
    body(x, 6, 4.4, d.col, -.6);
    x.fillStyle = '#4a4a4a'; ell(x, -6.4, 0, 1.6, 1.2); x.fillStyle = '#2f6fbf'; x.fillRect(-2.6, -4.2, 2.4, 1); x.fillRect(-2.6, 3.2, 2.4, 1); // tail + blue wing patch
    const hc = d.hcol || d.col; x.fillStyle = '#f2f2ea'; ell(x, 3, 0, 1.4, 2.4); // white neck ring
    x.fillStyle = hc; circ(x, 5, 0, 2.8);
    x.fillStyle = '#f2b01c'; x.beginPath(); x.ellipse(8.2, 0, 2.2, 1.2, 0, 0, TAU); x.fill(); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(7.2, -.15, 2.6, .3);
    EYE(x, 5.6, -1.6, .5); EYE(x, 5.6, 1.6, .5);
  },
  pig(x, c, d) {
    feet(x, c, d, 5.5, -5.5, 4.4, '#7a4a4a', 1.3);
    x.strokeStyle = shade(d.col, -.15); x.lineWidth = 1.2; x.beginPath(); x.arc(-11, 0, 1.6, 0, Math.PI * 1.6); x.stroke(); // curly tail
    body(x, 10, 7.4, d.col, -.5);
    x.fillStyle = 'rgba(120,70,40,.35)'; ell(x, -4, 2.6, 2.6, 1.8); ell(x, 2, -3.4, 1.8, 1.2); // mud
    x.fillStyle = shade(d.col, .05); circ(x, 8.6, 0, 4.8);
    for (const sg of [-1, 1]) { x.fillStyle = shade(d.col, -.12); x.beginPath(); x.moveTo(7, sg * 2.2); x.lineTo(6, sg * 6.2); x.lineTo(9.4, sg * 4.2); x.fill(); }
    x.fillStyle = shade(d.col, -.12); ell(x, 12.6, 0, 1.8, 2.4); x.fillStyle = '#7a3a4a'; circ(x, 13, -.9, .5); circ(x, 13, .9, .5);
    EYE(x, 10, -2, .65); EYE(x, 10, 2, .65);
  },
  sheep(x, c, d) {
    feet(x, c, d, 5.5, -5.5, 4.2, '#222', 1.2);
    x.fillStyle = shade(d.col, -.14); circ(x, 0, 0, 8);
    const r = seeded(Math.round((c.seed ?? .5) * 1e4)); // a fluffy fleece of overlapping curls
    for (let k = 0; k < 11; k++) { const a = k * TAU / 11, rr = 5.6 + r() * 1.2; x.fillStyle = shade(d.col, -.05 + r() * .08); circ(x, Math.cos(a) * rr * .95, Math.sin(a) * rr * .8, 3.2); }
    x.fillStyle = d.col; circ(x, -.4, -.4, 5.4); x.fillStyle = 'rgba(255,255,255,.45)'; circ(x, -2, -2, 2.4);
    const hc = d.hcol || '#333'; x.fillStyle = hc; ell(x, 8.6, 0, 3.6, 3); for (const sg of [-1, 1]) ell(x, 7.4, sg * 3.4, 2.2, 1);
    x.fillStyle = shade(d.col, .02); circ(x, 7, 0, 1.8); // woolly topknot
    EYE(x, 9.6, -1.4, .55); EYE(x, 9.6, 1.4, .55);
  },
  rat(x, c, d) { // low and pear-shaped: heavy haunches, a pointed snout, round ears, a long ringed tail
    const s = Math.sin(c.phase * 1.6) * c.moveAmt, col = d.col, dk = shade(col, -.22), lt = shade(col, .14);
    const tw = Math.sin(c.phase * .8) * (.6 + c.moveAmt); // tail: thick at the root, thin and whippy at the tip
    for (let k = 0; k < 9; k++) { const t0 = k / 9, t1 = (k + 1) / 9, px = q => -4.6 - q * 10, py = q => Math.sin(q * 2.6 + c.phase * 1.6) * tw * q * 3;
      x.strokeStyle = shade(d.tcol || '#d99a9a', -.08 * (k % 2)); x.lineWidth = 1.5 - t0 * 1.1; x.lineCap = 'round'; x.beginPath(); x.moveTo(px(t0), py(t0)); x.lineTo(px(t1), py(t1)); x.stroke(); }
    x.fillStyle = '#e3a3a0'; for (const [fx, fy, ph] of [[2.6, -2.3, s], [2.6, 2.3, -s], [-2.4, -2.8, -s], [-2.4, 2.8, s]]) ell(x, fx + ph * 1.2, fy, .9, .6); // paws, stepping in turn
    x.fillStyle = dk; x.beginPath(); x.moveTo(7.6, 0); x.bezierCurveTo(5.5, -2.2, 2, -2.6, -1, -3.2); x.bezierCurveTo(-4.4, -3.6, -5.6, -1.6, -5.6, 0); x.bezierCurveTo(-5.6, 1.6, -4.4, 3.6, -1, 3.2); x.bezierCurveTo(2, 2.6, 5.5, 2.2, 7.6, 0); x.fill(); // body outline
    x.fillStyle = col; x.beginPath(); x.moveTo(7, 0); x.bezierCurveTo(5.2, -1.8, 2, -2.2, -1, -2.7); x.bezierCurveTo(-4, -3, -5, -1.4, -5, 0); x.bezierCurveTo(-5, 1.4, -4, 3, -1, 2.7); x.bezierCurveTo(2, 2.2, 5.2, 1.8, 7, 0); x.fill();
    x.fillStyle = lt; ell(x, -1.4, -.6, 2.6, 1.3); // light catching the back
    x.strokeStyle = 'rgba(40,36,36,.25)'; x.lineWidth = .3; x.beginPath(); for (let k = 0; k < 7; k++) { const fx = -4 + k * 1.3; x.moveTo(fx, -1.6 + (k % 2) * .4); x.lineTo(fx - .9, -2.1); x.moveTo(fx, 1.6 - (k % 2) * .4); x.lineTo(fx - .9, 2.1); } x.stroke(); // fur
    for (const sg of [-1, 1]) { x.fillStyle = dk; circ(x, 3.2, sg * 2.2, 1.35); x.fillStyle = '#e8a5a5'; circ(x, 3.3, sg * 2.2, .8); } // ears
    x.fillStyle = '#e58a8a'; circ(x, 7.7, 0, .5); EYE(x, 5.3, -1.05, .42); EYE(x, 5.3, 1.05, .42);
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = .3; x.beginPath(); for (const sg of [-1, 1]) for (const a of [.35, .7]) { x.moveTo(7, sg * .5); x.lineTo(7 + Math.cos(a) * 3, sg * (.5 + Math.sin(a) * 2.6)); } x.stroke(); // whiskers
  },
};
function drawAnimal(x, c) {
  if (c.def.fly) return drawFirefly(x, c, c.def);
  const f = ANIMALS[c.type]; if (f) return f(x, c, c.def);
  body(x, c.def.bl || 6, c.def.bw || 4, c.def.col || '#888');
}
/* High lighting: fake ambient occlusion under everyone, and a volume pass so bodies read as round, lit from the top left */
const hiFx = () => SETTINGS.lightQ === 'High' && !lowFx;
const AO_SPR = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 6, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(.55, 'rgba(0,0,0,.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c; })();
const VOL_SPR = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(24, 22, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.2)'); gr.addColorStop(.45, 'rgba(255,255,255,0)'); gr.addColorStop(.8, 'rgba(0,0,0,.12)'); gr.addColorStop(1, 'rgba(0,0,0,.34)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c; })();
function drawAO(x) { // soft contact darkness where bodies meet the ground
  if (!hiFx()) return;
  x.globalAlpha = .5;
  for (const c of creatures) if (c.alive && !c.def.fly) { const R = c.def.r * 1.9; x.drawImage(AO_SPR, c.x - R, c.y - R, R * 2, R * 2); }
  if (snake && snake.alive) { const P = snake._pts || snake.segs; for (let i = 0; i < P.length; i += 3) { const R = snakeRadius() * 1.8; x.drawImage(AO_SPR, P[i].x - R, P[i].y - R, R * 2, R * 2); } }
  x.globalAlpha = 1;
}
function drawCreature(x, c, portrait) {
  if (c.hz > .3) { const k = clamp(1 - c.hz / 14, .45, 1); x.fillStyle = `rgba(0,0,0,${(.24 * k).toFixed(3)})`; ell(x, c.x, c.y, c.def.r * .95 * k, c.def.r * .75 * k); } // the shadow shrinks as it leaves the ground
  x.save(); x.translate(c.x, c.y - (c.hz || 0) * .7); x.rotate(c.a); if (c.hz) x.scale(1 + c.hz * .045, 1 + c.hz * .045); // ...and the body gets bigger, closer to you
  if (c.dance) { const b = Math.abs(Math.sin(T * CLUB_BPM / 60 * Math.PI + (c.seed ?? .5) * 30)); x.scale(1 + b * .05, 1 + b * .05); x.rotate(Math.sin(T * 2 + (c.seed ?? .5) * 9) * .12); }
  if (!c.def.human && c.moveAmt > .02 && !c.hz) { // animals: a little weight shift each step, side to side, the body yawing against the legs
    const m = c.moveAmt, ph = c.phase * (c.def.gaitK || 1); x.translate(0, Math.sin(ph) * .45 * m); x.rotate(Math.cos(ph) * .045 * m); }
  c.def.human ? drawHuman(x, c) : drawAnimal(x, c);
  if (!portrait && hiFx() && !c.def.fly) { x.save(); shapePath(x, c); x.clip(); x.rotate(-c.a); const R = c.def.r * 1.5; x.drawImage(VOL_SPR, -R, -R, R * 2, R * 2); x.restore(); } // rounded: light on top, darker toward the edges
  if (c.stains.length) {
    shapePath(x, c); x.clip();
    const n = c.stains.length;
    x.fillStyle = c.stains[n - 1].c || BLOOD;
    if (n > 12) { x.globalAlpha = Math.min(.4, n / 140); x.fillRect(-20, -20, 40, 40); x.globalAlpha = 1; } // soaked look
    for (const t of c.stains) { x.fillStyle = t.c || BLOOD; x.beginPath(); x.ellipse(t.x, t.y, t.r * (t.e || 1), t.r, t.a || 0, 0, TAU); x.fill(); }
  }
  x.restore();
  if (!portrait && c.def.human && c.state !== 'wander' && c.state !== 'idle' && !(c.bubbles && c.bubbles.some(b => b.delay <= 0))) {
    const mk = c.state === 'uneasy' ? '?' : '!';
    if (c.markK !== mk) { c.markK = mk; c.markT = T; }
    const p = clamp((T - c.markT) / .28, 0, 1), sc = p < .5 ? .3 + 2.6 * p : 1.6 - .6 * Math.min(1, (p - .5) * 2), my = c.y - 13 - (c.hz || 0) * .7; // springs in, settles small
    x.save(); x.translate(c.x, my); x.scale(sc, sc); x.font = '900 10px "Segoe UI",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 2.6; x.strokeStyle = 'rgba(0,0,0,.65)'; x.strokeText(mk, 0, 0);
    x.fillStyle = c.state === 'panic' ? '#ff3b30' : c.state === 'flee' ? '#ff9f1a' : '#f2f2f2'; x.fillText(mk, 0, 0);
    if (c.listenT > T) { const w = .5 + .5 * Math.sin(T * 9); x.strokeStyle = `rgba(242,242,242,${(.45 + .4 * w).toFixed(2)})`; x.lineWidth = 1.1; for (const sd of [-1, 1]) for (const r of [6, 9]) { x.beginPath(); x.arc(0, 0, r, sd > 0 ? -.6 : Math.PI - .6, sd > 0 ? .6 : Math.PI + .6); x.stroke(); } } // blind and listening: little sound rings either side of the "?"
    x.restore(); x.textBaseline = 'alphabetic';
  } else c.markK = null;
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
function segColor(i, n, cfg) { // every skin is built from your primary (P) and secondary (S) colors, plus shades of them
  const P = cfg.color, S = cfg.color2, D = shade(P, -.55);
  switch (cfg.pattern) {
    case 'Stripes': return Math.floor(i / 2) % 2 ? S : P;
    case 'Zebra': return i % 2 ? S : P;
    case 'Gradient': return mixColor(P, S, i / Math.max(1, n - 1));
    case 'Rainbow': return mixColor(P, S, (Math.sin(i * .35 - T * 4) + 1) / 2); // the two colors chase each other down the body
    case 'Neon': return mixColor(P, '#ffffff', (Math.sin(T * 6 - i * .5) + 1) * .22);
    case 'Lava': return mixColor(P, S, (Math.sin(T * 3 + i * .6) + 1) / 2);
    case 'Galaxy': return mixColor(shade(P, -.75), P, (Math.sin(i * .7 + T) + 1) * .18);
    case 'Rat Fur': return i >= n - 3 ? S : i % 2 ? shade(P, -.08) : P; // fur, with the tail tip in your second color
    case 'Gold Plated': return mixColor(shade(P, -.3), S, (Math.sin(i * .5 - T * 2.5) + 1) * .5 * .8); // a highlight sweeping down the body
    case 'Blood Soaked': return mixColor(P, shade(S, -.6), .45 + .25 * ((i * 7919 % 13) / 13));
    case 'Hazard': return Math.floor(i / 2) % 2 ? S : P;
    case 'Lunar': return mixColor(P, shade(P, -.25), (i * 37 % 10) / 22);
    case 'Martian': return mixColor(P, S, (Math.sin(i * .8) + 1) * .4);
    // real snakes, in your colors
    case 'Coral': return [P, P, S, D, D, S][i % 6];
    case 'Kingsnake': return i % 4 === 0 ? S : D;
    case 'Diamondback': return mixColor(P, shade(P, .12), (i % 2) * .5);
    case 'Python': return mixColor(P, shade(P, -.08), ((i * 31) % 7) / 7);
    case 'Garter': return mixColor(D, shade(D, .15), (i % 2) * .5);
    case 'Emerald': return mixColor(P, shade(P, .12), (Math.sin(i * .4) + 1) * .3);
    default: return i % 2 ? mixColor(P, '#000000', .06) : P;
  }
}
const NATURAL = new Set(['Coral', 'Kingsnake', 'Diamondback', 'Python', 'Garter', 'Emerald']);
function patternStripes(x, pts, n, cfg) { // patterns that run the length of the body
  if (cfg.pattern === 'Neon') { x.save(); x.strokeStyle = cfg.color2; x.globalAlpha = .55 + .25 * Math.sin(T * 4); x.lineWidth = 2.4; tubePath(x, pts, n, -1.2); x.stroke(); x.globalAlpha = .25; x.lineWidth = 5; x.stroke(); x.restore(); return; } // a glowing tube edge in your second color
  if (cfg.pattern !== 'Garter') return;
  const run = (off, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); for (let i = 0; i < n; i++) { const g = pts[i], r = segR(i, n), px = g.x - Math.sin(g.a) * r * off, py = g.y + Math.cos(g.a) * r * off; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); };
  x.lineCap = 'round'; x.lineJoin = 'round'; const R0 = snakeRadius(); run(0, R0 * .38, cfg.color2); run(-.72, R0 * .2, shade(cfg.color2, -.12)); run(.72, R0 * .2, shade(cfg.color2, -.12)); // the yellow dorsal stripe and two side stripes
}
function patternOverlay(x, g, r, i, cfg) {
  switch (cfg.pattern) {
    case 'Spots':
      if (i % 2 === 1) { const h = (i * 7919) % 101, sa = g.a + (h % 2 ? 1.57 : -1.57) * (.3 + (h % 7) / 10); x.save(); x.translate(g.x + Math.cos(sa) * r * .45, g.y + Math.sin(sa) * r * .45); x.rotate(g.a + h * .03); x.fillStyle = cfg.color2; ell(x, 0, 0, r * (.48 + (h % 5) * .05), r * .34); x.restore(); } // irregular oval spots, like a real spotted skin
      break;
    case 'Checker': { const nx = -Math.sin(g.a), ny = Math.cos(g.a), dx = Math.cos(g.a) * r * .62, dy = Math.sin(g.a) * r * .62, sd = i % 2 ? 1 : -1; x.fillStyle = cfg.color2; x.beginPath(); x.moveTo(g.x + dx, g.y + dy); x.lineTo(g.x - dx, g.y - dy); x.lineTo(g.x - dx + nx * r * 1.6 * sd, g.y - dy + ny * r * 1.6 * sd); x.lineTo(g.x + dx + nx * r * 1.6 * sd, g.y + dy + ny * r * 1.6 * sd); x.fill(); break; } // half the band, alternating sides of the spine
    case 'Diamond':
      if (i % 2 === 0) { x.save(); x.translate(g.x, g.y); x.rotate(g.a + Math.PI / 4); x.fillStyle = cfg.color2; x.fillRect(-r * .35, -r * .35, r * .7, r * .7); x.restore(); }
      break;
    case 'Rat Fur':
      x.strokeStyle = shade(cfg.color, -.5); x.globalAlpha *= .5; x.lineWidth = .7;
      for (let k = -1; k <= 1; k++) { const a = g.a + Math.PI + k * .5; x.beginPath(); x.moveTo(g.x + Math.cos(a) * r * .2, g.y + Math.sin(a) * r * .2); x.lineTo(g.x + Math.cos(a) * r * .8, g.y + Math.sin(a) * r * .8); x.stroke(); }
      break;
    case 'Diamondback': if (i % 2 === 0) { x.save(); x.translate(g.x, g.y); x.rotate(g.a + Math.PI / 4); const d = r * .74; x.fillStyle = cfg.color2; x.fillRect(-d - 1.1, -d - 1.1, d * 2 + 2.2, d * 2 + 2.2); x.fillStyle = shade(cfg.color, -.55); x.fillRect(-d, -d, d * 2, d * 2); x.fillStyle = shade(cfg.color, -.3); x.fillRect(-d * .5, -d * .5, d, d); x.restore(); } break; // dark diamonds with a pale border
    case 'Python': { const h = (i * 7919) % 97; if (i % 2 === 0) { x.save(); x.translate(g.x, g.y); x.rotate(g.a + (h % 9 - 4) * .08); x.fillStyle = shade(cfg.color, -.6); ell(x, 0, (h % 5 - 2) * r * .14, r * 1.05, r * .78); x.fillStyle = cfg.color2; ell(x, 0, (h % 5 - 2) * r * .14, r * .42, r * .26); x.restore(); } break; } // blotches with pale hearts
    case 'Emerald': if (i % 4 === 1) { x.fillStyle = cfg.color2; const c = Math.cos(g.a), sn = Math.sin(g.a); ell(x, g.x - sn * r * .05, g.y + c * r * .05, r * .26, r * .14); } break; // white flecks down the back
    case 'Kingsnake': if (i % 4 === 0) { x.fillStyle = 'rgba(0,0,0,.18)'; circ(x, g.x, g.y, r * .2); } break;
    case 'Gold Plated': x.fillStyle = 'rgba(255,250,220,.35)'; ell(x, g.x - r * .3, g.y - r * .35, r * .45, r * .22); break; // metal sheen
    case 'Blood Soaked': if (i % 3 === 0) { x.fillStyle = shade(cfg.color2, -.7); circ(x, g.x + Math.cos(i * 2.3) * r * .4, g.y + Math.sin(i * 2.3) * r * .4, r * .35); } break;
    case 'Lunar': if (i % 2 === 0) { x.fillStyle = shade(cfg.color, -.4); circ(x, g.x + Math.cos(i * 1.7) * r * .35, g.y + Math.sin(i * 1.7) * r * .35, r * .28); } break;
    case 'Martian': x.fillStyle = mixColor(cfg.color2, '#ffffff', .4); for (let k = 0; k < 2; k++) circ(x, g.x + Math.cos(i * 3 + k * 2) * r * .5, g.y + Math.sin(i * 3 + k * 2) * r * .5, .7); break;
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
    case 'Cracked Halo': // what goes around comes around: a dimmer halo with a chunk missing
      x.strokeStyle = 'rgba(220,200,140,.22)'; x.lineWidth = 5; x.beginPath(); x.ellipse(c, 0, 6, 7.5, 0, .5, TAU - .2); x.stroke();
      x.strokeStyle = 'rgba(210,190,110,.9)'; x.lineWidth = 2; x.beginPath(); x.ellipse(c, 0, 6, 7.5, 0, .55, TAU - .25); x.stroke();
      x.strokeStyle = 'rgba(90,70,40,.9)'; x.lineWidth = .8; x.beginPath(); x.moveTo(c + 5.2, -3.6); x.lineTo(c + 6.6, -2.4); x.lineTo(c + 5.6, -1.2); x.stroke();
      x.fillStyle = 'rgba(210,190,110,.9)'; circ(x, c + 7.6, 3.2, .9); break; // the bit that broke off
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
const soakCol = sts => { const c = sts[sts.length - 1].c; if (!c || c === BLOOD) return '#4a0606'; const v = rgbOf2(c); return '#' + v.map(n => Math.round(n * .55).toString(16).padStart(2, '0')).join(''); };
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

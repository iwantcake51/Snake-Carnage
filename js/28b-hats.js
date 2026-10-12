/* =========================================================
   HATS: every hat in the shop, seen from above on the snake's head (head-local frame: +x is forward, the head is about
   20 across, a hat sits centred 5 behind the eyes). Each is lit like the body, from the world's top-left whichever way the
   head points (hatKit reads the head's turn off the canvas): a soft shadow cast down-right onto the head, shaded volume,
   a darker rim and a highlight on the lit side. Hats that move (tassels, ears, bells, plumes) move on T.
   drawHat is called by drawSnake (29-snake-draw), the shop's previews (37-shop) and the hats blown off by a blast (38c).
   ========================================================= */
const HAT_C = -5;
function hatKit(x) { // the light in this frame, and the few shapes every hat is built from
  const m = x.getTransform(), a = Math.atan2(m.b, m.a), ca = Math.cos(a), sa = Math.sin(a), w = -Math.SQRT1_2;
  const lx = ca * w + sa * w, ly = -sa * w + ca * w; // toward the light (the world's top-left), turned into the head's frame
  const K = { x, lx, ly,
    path(f) { x.beginPath(); f(); },
    fill(f, st) { x.beginPath(); f(); x.fillStyle = st; x.fill(); },
    edge(col, wd = .55) { x.strokeStyle = col; x.lineWidth = wd; x.stroke(); },
    shadow(f, d = 1.8, al = .3) { x.save(); x.translate(-lx * d, -ly * d); x.beginPath(); f(); x.fillStyle = `rgba(0,0,0,${al})`; x.fill(); x.restore(); },
    rad(cx, cy, r, col, hi = .35, lo = -.42) { // lit toward the light, falling off into shade on the far side
      const g = x.createRadialGradient(cx + lx * r * .42, cy + ly * r * .42, r * .08, cx, cy, r * 1.08);
      g.addColorStop(0, shade(col, hi)); g.addColorStop(.55, col); g.addColorStop(1, shade(col, lo)); return g; },
    lin(x0, y0, x1, y1, c0, c1) { const g = x.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; },
    glint(cx, cy, r, al = .4) { x.save(); x.translate(cx + lx * r * .5, cy + ly * r * .5); x.rotate(Math.atan2(ly, lx) + Math.PI / 2); x.beginPath(); x.ellipse(0, 0, r * .36, r * .15, 0, 0, TAU); x.fillStyle = `rgba(255,255,255,${al})`; x.fill(); x.restore(); },
    disc(cx, cy, r, col, o = {}) { const f = () => x.arc(cx, cy, r, 0, TAU);
      if (o.sh !== 0) K.shadow(f, o.sh || 1.8, o.sa || .3); K.fill(f, K.rad(cx, cy, r, col, o.hi, o.lo)); K.path(f); K.edge(o.ec || shade(col, -.55), o.ew || .55); if (o.gl !== 0) K.glint(cx, cy, r, o.gl || .4); },
    oval(cx, cy, rx, ry, col, o = {}) { const f = () => x.ellipse(cx, cy, rx, ry, o.rot || 0, 0, TAU);
      if (o.sh !== 0) K.shadow(f, o.sh || 1.8, o.sa || .3); K.fill(f, K.rad(cx, cy, Math.max(rx, ry), col, o.hi, o.lo)); K.path(f); K.edge(o.ec || shade(col, -.55), o.ew || .55); if (o.gl) K.glint(cx, cy, Math.min(rx, ry), o.gl); },
    ring(cx, cy, r, wd, col, a0 = 0, a1 = TAU) { x.beginPath(); x.arc(cx, cy, r, a0, a1); x.strokeStyle = col; x.lineWidth = wd; x.stroke(); },
    gem(cx, cy, r, col) { const f = () => x.arc(cx, cy, r, 0, TAU); K.fill(f, K.rad(cx, cy, r, col, .7, -.45)); K.path(f); K.edge(shade(col, -.6), .3); x.fillStyle = 'rgba(255,255,255,.85)'; circ(x, cx + lx * r * .4, cy + ly * r * .4, r * .3); },
    fluff(cx, cy, r, col) { // a pompom or a tuft of fur: a ring of bumps round a ball
      const f = () => { for (let q = 0; q < 8; q++) { const a = q * TAU / 8, px = cx + Math.cos(a) * r * .5, py = cy + Math.sin(a) * r * .5; x.moveTo(px + r * .5, py); x.arc(px, py, r * .5, 0, TAU); } };
      K.shadow(f, 1.2, .25); K.fill(f, K.rad(cx, cy, r, col, .15, -.28)); K.disc(cx, cy, r * .55, col, { sh: 0, ec: shade(col, -.15), ew: .2, gl: .3 }); },
    poly(pts) { pts.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.closePath(); },
    sparkle(cx, cy, r, al) { x.save(); x.globalAlpha *= al; x.fillStyle = '#fff'; x.beginPath(); x.moveTo(cx - r, cy); x.lineTo(cx, cy - r * .22); x.lineTo(cx + r, cy); x.lineTo(cx, cy + r * .22); x.closePath(); x.moveTo(cx, cy - r); x.lineTo(cx + r * .22, cy); x.lineTo(cx, cy + r); x.lineTo(cx - r * .22, cy); x.closePath(); x.fill(); x.restore(); },
  };
  return K;
}
const C0 = HAT_C;
const HATS = {
  /* ---- everyday ---- */
  'Party hat': k => { const { x } = k, r = 7, f = () => x.arc(C0, 0, r, 0, TAU);
    k.shadow(f, 2.6, .3); k.fill(f, k.rad(C0, 0, r, '#f2c94c', .4, -.4));
    x.save(); k.path(f); x.clip(); x.strokeStyle = '#e04f8a'; x.lineWidth = 1.5; // stripes spiralling up to the point
    for (let q = 0; q < 6; q++) { const a = q * TAU / 6; x.beginPath(); x.moveTo(C0 + Math.cos(a) * r, Math.sin(a) * r); x.quadraticCurveTo(C0 + Math.cos(a + .9) * r * .55, Math.sin(a + .9) * r * .55, C0, 0); x.stroke(); }
    for (let q = 0; q < 7; q++) { const a = q * 2.4, d = 2.4 + (q % 3) * 1.4; x.fillStyle = ['#3fb8ff', '#7ee86a', '#ffffff'][q % 3]; circ(x, C0 + Math.cos(a) * d, Math.sin(a) * d, .55); } // confetti print
    x.restore(); k.path(f); k.edge('#9c7a1f', .5);
    k.fluff(C0, 0, 2.5, '#fbfbf6'); },
  'Flower': k => { const { x } = k;
    for (const sg of [-1, 1]) k.oval(C0 - 3.6, sg * 4.6, 3.2, 1.5, '#4f9a3a', { rot: sg * .7, sh: 1.2, sa: .25 }); // two leaves
    for (let q = 0; q < 5; q++) { const a = q * TAU / 5 + .3; k.oval(C0 + Math.cos(a) * 3.3, Math.sin(a) * 3.3, 3, 2.2, '#ff9ecb', { rot: a, sh: 1.4, sa: .22, hi: .3 }); }
    k.disc(C0, 0, 2.3, '#ffd23f', { sh: .8 }); x.fillStyle = '#c98f10'; for (let q = 0; q < 6; q++) { const a = q * TAU / 6; circ(x, C0 + Math.cos(a) * 1.2, Math.sin(a) * 1.2, .3); } },
  'Beanie': k => { const { x } = k, r = 7.6, col = '#c0392b', f = () => x.arc(C0, 0, r, 0, TAU);
    k.shadow(f, 1.9, .3); k.fill(f, k.rad(C0, 0, r, col, .3, -.42));
    x.strokeStyle = shade(col, -.32); x.lineWidth = .7; // knit ribs running up to the crown
    for (let q = 0; q < 14; q++) { const a = q * TAU / 14; x.beginPath(); x.moveTo(C0 + Math.cos(a) * 2.6, Math.sin(a) * 2.6); x.lineTo(C0 + Math.cos(a) * (r - 1.9), Math.sin(a) * (r - 1.9)); x.stroke(); }
    k.ring(C0, 0, r - .95, 1.9, shade(col, -.12)); k.ring(C0, 0, r - 1.9, .5, shade(col, -.45)); k.path(f); k.edge(shade(col, -.55), .5); // the folded cuff
    k.fluff(C0, 0, 2.8, '#f4f1ea'); },
  'Cap': k => { const { x } = k, col = '#24427e', brim = () => { x.moveTo(C0 + 4.2, -5.8); x.bezierCurveTo(C0 + 8, -5.6, C0 + 10.6, -2.6, C0 + 10.6, 0); x.bezierCurveTo(C0 + 10.6, 2.6, C0 + 8, 5.6, C0 + 4.2, 5.8); x.closePath(); }; // (the peak stops short of the eyes)
    k.shadow(brim, 2.6, .34); k.fill(brim, k.lin(C0 + 4, 0, C0 + 10.6, 0, shade(col, -.1), shade(col, -.38))); k.path(brim); k.edge(shade(col, -.6), .55);
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = .4; x.setLineDash([.8, .7]); x.beginPath(); x.moveTo(C0 + 5.4, -4.7); x.bezierCurveTo(C0 + 8, -4.4, C0 + 9.6, -2.1, C0 + 9.6, 0); x.bezierCurveTo(C0 + 9.6, 2.1, C0 + 8, 4.4, C0 + 5.4, 4.7); x.stroke(); x.setLineDash([]); // stitching
    k.disc(C0, 0, 6.8, col, { sh: 1.7 });
    x.strokeStyle = shade(col, -.45); x.lineWidth = .45; for (let q = 0; q < 6; q++) { const a = q * TAU / 6 + Math.PI / 6; x.beginPath(); x.moveTo(C0, 0); x.lineTo(C0 + Math.cos(a) * 6.6, Math.sin(a) * 6.6); x.stroke(); } // panel seams
    k.disc(C0, 0, 1.1, col, { sh: .5, hi: .5, gl: 0 }); },
  'Bow': k => { const { x } = k, col = '#ff5fa2';
    for (const sg of [-1, 1]) { const tail = () => { x.moveTo(C0 - 1, sg * .8); x.quadraticCurveTo(C0 - 5, sg * 2.5, C0 - 8.5, sg * 4.2 + Math.sin(T * 3 + sg) * .4); x.lineTo(C0 - 7, sg * 1.6); x.closePath(); }; k.shadow(tail, 1.4, .25); k.fill(tail, shade(col, -.18)); }
    for (const sg of [-1, 1]) { const loop = () => { x.moveTo(C0, 0); x.bezierCurveTo(C0 + 6, sg * 2, C0 + 6.4, sg * 8.2, C0 + .6, sg * 7.6); x.bezierCurveTo(C0 - 4.6, sg * 7, C0 - 4, sg * 2, C0, 0); };
      k.shadow(loop, 1.7, .28); k.fill(loop, k.rad(C0 + 1, sg * 4.4, 4.8, col, .35, -.35)); k.path(loop); k.edge(shade(col, -.45), .5);
      x.strokeStyle = shade(col, -.3); x.lineWidth = .5; x.beginPath(); x.moveTo(C0 + .4, sg * 1.5); x.quadraticCurveTo(C0 + 2.6, sg * 4.6, C0 + .8, sg * 6.4); x.stroke(); } // a fold in each loop
    k.oval(C0, 0, 1.9, 2.4, shade(col, -.15), { sh: .9, gl: .35 }); },
  'Bandana': k => { const { x } = k, col = '#c4302b', f = () => x.arc(C0 + .6, 0, 7.3, 0, TAU);
    for (const sg of [-1, 1]) { const tail = () => { const s = Math.sin(T * 5 + sg * 1.3) * 1.1; x.moveTo(C0 - 6.2, sg * .6); x.quadraticCurveTo(C0 - 10, sg * (2.6 + s), C0 - 13, sg * (2.2 + s * 1.4)); x.lineTo(C0 - 11.5, sg * (4.4 + s)); x.quadraticCurveTo(C0 - 9, sg * (4.2 + s * .5), C0 - 6, sg * 2.2); x.closePath(); };
      k.shadow(tail, 1.4, .25); k.fill(tail, shade(col, -.2)); k.path(tail); k.edge(shade(col, -.5), .4); }
    k.shadow(f, 1.6, .28); k.fill(f, k.rad(C0 + .6, 0, 7.3, col, .28, -.4)); k.path(f); k.edge(shade(col, -.55), .5);
    x.save(); k.path(f); x.clip(); x.fillStyle = 'rgba(255,255,255,.85)'; // the paisley print
    for (const [px, py, s] of [[2.6, -2.4, 1], [-1.4, 3.4, .9], [-3.6, -2.8, .8], [3, 3, .7], [-.4, -.2, 1.1], [-4.4, 1.2, .6]]) { x.save(); x.translate(C0 + px, py); x.rotate(px + py); x.beginPath(); x.ellipse(0, 0, 1.2 * s, .65 * s, 0, 0, TAU); x.fill(); x.fillStyle = col; circ(x, .35 * s, 0, .3 * s); x.fillStyle = 'rgba(255,255,255,.85)'; x.restore(); }
    x.restore(); k.oval(C0 - 6.4, 0, 1.6, 2.1, shade(col, -.1), { sh: .8 }); }, // the knot
  'Bucket hat': k => { const { x } = k, col = '#b7a47a';
    k.disc(C0, 0, 8.9, col, { sh: 2.1, hi: .25, lo: -.35, gl: 0 });
    x.strokeStyle = shade(col, -.4); x.lineWidth = .35; x.setLineDash([.7, .6]); for (const r of [8, 7.1]) { x.beginPath(); x.arc(C0, 0, r, 0, TAU); x.stroke(); } x.setLineDash([]); // stitched rows round the brim
    k.disc(C0, 0, 5.6, shade(col, .05), { sh: 1.3, sa: .35 }); k.ring(C0, 0, 5.75, .9, shade(col, -.35)); },
  'Cone': k => { const { x } = k, base = () => { if (x.roundRect) x.roundRect(C0 - 7.2, -7.2, 14.4, 14.4, 1.6); else x.rect(C0 - 7.2, -7.2, 14.4, 14.4); };
    k.shadow(base, 1.6, .32); k.fill(base, k.rad(C0, 0, 9, '#ff7a00', .2, -.4)); k.path(base); k.edge('#8f3c00', .55);
    k.disc(C0, 0, 5.6, '#ff8a1f', { sh: 1.4, hi: .3, gl: 0 });
    k.ring(C0, 0, 3.9, 1.5, '#f6f6f6'); k.ring(C0, 0, 3.15, .3, 'rgba(0,0,0,.2)');
    k.fill(() => x.arc(C0, 0, 1.4, 0, TAU), '#5a2600'); k.glint(C0, 0, 5.6, .35); },
  'Beret': k => { const { x } = k, col = '#b2242c';
    k.oval(C0 - .4, 1, 7.8, 7, col, { rot: .3, sh: 1.6, hi: .3, lo: -.45 });
    x.strokeStyle = shade(col, -.4); x.lineWidth = .55; x.beginPath(); x.ellipse(C0 - .8, 1.8, 5.2, 4.2, .3, .3, 2.6); x.stroke(); // the fold where it slumps to one side
    k.disc(C0 - .2, .6, .9, shade(col, -.2), { sh: .5, gl: 0 }); k.glint(C0 - .4, 1, 6.5, .25); },
  'Sailor cap': k => { const { x } = k;
    k.disc(C0, 0, 7.9, '#e9eef3', { sh: 2, hi: .1, lo: -.18, ec: '#8c9aa8', gl: 0 }); // the rolled brim
    k.ring(C0, 0, 6.9, .5, 'rgba(70,90,110,.35)');
    k.disc(C0, 0, 5.8, '#ffffff', { sh: 1.2, sa: .22, hi: 0, lo: -.15, ec: '#a9b5c1' });
    k.ring(C0, 0, 7.55, .7, '#2c4f86'); },
  'Chef': k => { const { x } = k, puffs = [[0, 0, 4.3], [-3.1, -3.2, 3.8], [-3.1, 3.2, 3.8], [2.7, -3.1, 3.8], [2.7, 3.1, 3.8], [-4.8, 0, 3.4], [4.1, 0, 3.4]];
    k.shadow(() => puffs.forEach(([px, py, r]) => { x.moveTo(C0 + px + r, py); x.arc(C0 + px, py, r, 0, TAU); }), 2.2, .28);
    for (const [px, py, r] of puffs) { const f = () => x.arc(C0 + px, py, r, 0, TAU); k.fill(f, k.rad(C0 + px, py, r, '#fafafa', 0, -.16)); k.path(f); k.edge('rgba(150,150,160,.55)', .4); }
    x.strokeStyle = 'rgba(160,160,170,.45)'; x.lineWidth = .4; for (let q = 0; q < 6; q++) { const a = q * TAU / 6; x.beginPath(); x.moveTo(C0 + Math.cos(a) * 1.4, Math.sin(a) * 1.4); x.lineTo(C0 + Math.cos(a) * 3.6, Math.sin(a) * 3.6); x.stroke(); } }, // pleats
  'Fez': k => { const { x } = k, col = '#b51f24', sw = Math.sin(T * 4) * .7;
    k.disc(C0, 0, 6, shade(col, -.25), { sh: 1.6, gl: 0, ec: '#4a0b0d' }); k.disc(C0, 0, 5, col, { sh: .9, sa: .35, hi: .3 });
    const cord = () => { x.moveTo(C0, 0); x.quadraticCurveTo(C0 - 3.5, 1.2 + sw, C0 - 7.4, 2.2 + sw * 2); };
    x.strokeStyle = '#151515'; x.lineWidth = .7; k.path(cord); x.stroke();
    x.fillStyle = '#151515'; for (let q = -2; q <= 2; q++) { x.beginPath(); x.moveTo(C0 - 7.4, 2.2 + sw * 2); x.lineTo(C0 - 9.8, 2.4 + sw * 2.4 + q * .9); x.lineTo(C0 - 9.5, 2.9 + sw * 2.4 + q * .9); x.closePath(); x.fill(); } // the tassel, swinging
    k.disc(C0, 0, .9, '#d9b13b', { sh: .4, gl: 0 }); },
  'Hard hat': k => { const { x } = k, col = '#f2c21b', lip = () => x.ellipse(C0 + .8, 0, 8.6, 7.8, 0, 0, TAU);
    k.shadow(lip, 2, .3); k.fill(lip, shade(col, -.2)); k.path(lip); k.edge('#7a5d00', .5);
    k.disc(C0, 0, 7, col, { sh: .9, sa: .3, hi: .35 });
    k.fill(() => { if (x.roundRect) x.roundRect(C0 - 6.6, -1.1, 13.2, 2.2, 1.1); else x.rect(C0 - 6.6, -1.1, 13.2, 2.2); }, k.lin(0, -1.1, 0, 1.1, shade(col, .3), shade(col, -.25))); // the ridge down the middle
    k.disc(C0 + 2.5, 3.4, 1.15, '#2e9d52', { sh: .3, gl: 0, ec: '#145f2e' }); x.fillStyle = '#fff'; x.fillRect(C0 + 2.25, 2.8, .5, 1.2); x.fillRect(C0 + 1.9, 3.15, 1.2, .5); }, // a first-aid sticker
  'Top hat': k => { const { x } = k;
    k.disc(C0, 0, 8.2, '#262626', { sh: 2.4, sa: .32, hi: .55, lo: -.55, ec: '#050505', gl: 0 });
    k.shadow(() => x.arc(C0, 0, 5.6, 0, TAU), 1.4, .45); k.fill(() => x.arc(C0, 0, 5.95, 0, TAU), '#8f1a1a');
    k.disc(C0, 0, 5.2, '#2b2b2b', { sh: 0, hi: .75, lo: -.4, ec: '#0a0a0a', gl: .3 }); },
  'Bowler': k => { const { x } = k;
    k.disc(C0, 0, 7.6, '#2a2523', { sh: 2.1, hi: .5, lo: -.5, ec: '#090807', gl: 0 }); k.ring(C0, 0, 7.15, .5, 'rgba(255,255,255,.12)'); // the curled brim
    k.shadow(() => x.arc(C0, 0, 5.8, 0, TAU), 1, .4); k.ring(C0, 0, 6, 1.1, '#4a4440');
    k.disc(C0, 0, 5.6, '#2f2a27', { sh: 0, hi: .8, lo: -.35, ec: '#0b0a09', gl: .35 }); },
  'Cowboy': k => { const { x } = k, col = '#9a6431', brim = () => x.ellipse(C0, 0, 8.6, 11, 0, 0, TAU);
    k.shadow(brim, 2.6, .3); k.fill(brim, k.rad(C0, 0, 10, col, .3, -.45)); k.path(brim); k.edge('#4e2f12', .7);
    x.strokeStyle = 'rgba(60,35,12,.5)'; x.lineWidth = 1.5; for (const sg of [-1, 1]) { x.beginPath(); x.ellipse(C0, 0, 7.9, 10.2, 0, sg * Math.PI / 2 - 1, sg * Math.PI / 2 + 1); x.stroke(); } // the brim rolled up at the sides
    k.shadow(() => x.ellipse(C0, 0, 4.9, 5.9, 0, 0, TAU), 1.4, .38); k.fill(() => x.ellipse(C0, 0, 5.3, 6.3, 0, 0, TAU), '#3a2410');
    k.fill(() => x.ellipse(C0, 0, 4.8, 5.7, 0, 0, TAU), k.rad(C0, 0, 5.7, '#8a5a2b', .4, -.4)); k.path(() => x.ellipse(C0, 0, 4.8, 5.7, 0, 0, TAU)); k.edge('#4e2f12', .5);
    x.strokeStyle = 'rgba(40,22,8,.65)'; x.lineWidth = 1.1; x.beginPath(); x.moveTo(C0 + 3.6, 0); x.quadraticCurveTo(C0, .4, C0 - 3.8, 0); x.stroke(); // the pinch down the crown
    x.fillStyle = '#d9b13b'; circ(x, C0 + 4.7, 1.9, .55); },
  'Fedora': k => { const { x } = k, col = '#6b6f75', crown = () => { x.moveTo(C0 + 5.6, 0); x.bezierCurveTo(C0 + 5.2, -4.4, C0 - 1.4, -5.6, C0 - 5, -3.8); x.bezierCurveTo(C0 - 6.6, -2.2, C0 - 6.6, 2.2, C0 - 5, 3.8); x.bezierCurveTo(C0 - 1.4, 5.6, C0 + 5.2, 4.4, C0 + 5.6, 0); x.closePath(); };
    k.disc(C0 + .4, 0, 9.3, col, { sh: 2.4, hi: .2, lo: -.4, gl: 0 });
    k.fill(() => x.arc(C0 + .4, 0, 9.3, -.9, .9), 'rgba(0,0,0,.12)'); // the snap brim dips at the front
    k.shadow(crown, 1.4, .38); k.fill(() => { x.save(); x.translate(C0, 0); x.scale(1.08, 1.12); x.translate(-C0, 0); crown(); x.restore(); }, '#1c1c1e'); // the band
    k.fill(crown, k.rad(C0, 0, 6, shade(col, .05), .35, -.4)); k.path(crown); k.edge(shade(col, -.6), .5);
    x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = .9; x.beginPath(); x.moveTo(C0 + 3.2, 0); x.lineTo(C0 - 4, 0); x.stroke(); // the crease, and a dent each side of the front
    for (const sg of [-1, 1]) { x.beginPath(); x.ellipse(C0 + 3, sg * 2.4, 1.2, .55, sg * .5, 0, TAU); x.fillStyle = 'rgba(0,0,0,.25)'; x.fill(); }
    x.strokeStyle = '#c8402e'; x.lineWidth = .6; x.beginPath(); x.moveTo(C0 - 4.2, 5); x.quadraticCurveTo(C0 - 6.4, 6.2, C0 - 8.4, 5.4); x.stroke(); x.strokeStyle = '#e9a23b'; x.lineWidth = .35; x.stroke(); }, // a little feather in the band
  'Graduation': k => { const { x } = k, sq = () => { x.save(); x.translate(C0, 0); x.rotate(Math.PI / 4); x.rect(-7.2, -7.2, 14.4, 14.4); x.restore(); };
    k.shadow(sq, 2.2, .32); k.fill(sq, k.rad(C0, 0, 10, '#222226', .5, -.45)); k.path(sq); k.edge('#000', .55);
    const sw = Math.sin(T * 4) * 1.1; x.strokeStyle = '#ffd23f'; x.lineWidth = 1; x.beginPath(); x.moveTo(C0, 0); x.quadraticCurveTo(C0 - 4, 4 + sw * .5, C0 - 7.6, 6.8 + sw); x.stroke(); // the tassel, swinging over the edge
    x.fillStyle = '#e6b820'; x.beginPath(); x.moveTo(C0 - 7.6, 6.8 + sw); x.lineTo(C0 - 10, 7.4 + sw * 1.3); x.lineTo(C0 - 9.4, 8.6 + sw * 1.3); x.closePath(); x.fill();
    k.disc(C0, 0, 1.3, '#ffd23f', { sh: .4, gl: 0, ec: '#9a7a10' }); },
  'Headphones': k => { const { x } = k, band = () => { x.moveTo(C0 + 2.6, -9.6); x.quadraticCurveTo(C0 - 3.6, 0, C0 + 2.6, 9.6); };
    x.save(); x.translate(-k.lx * 1.5, -k.ly * 1.5); x.strokeStyle = 'rgba(0,0,0,.3)'; x.lineWidth = 3; k.path(band); x.stroke(); x.restore();
    x.strokeStyle = '#2b2b2f'; x.lineWidth = 2.8; k.path(band); x.stroke(); x.strokeStyle = 'rgba(255,255,255,.22)'; x.lineWidth = .8; x.stroke(); // the band over the top, catching the light
    for (const sg of [-1, 1]) { k.oval(C0 + 2.8, sg * 9.8, 3.5, 2.4, '#323236', { sh: 1.6, hi: .5, gl: .4 }); k.ring(C0 + 2.8, sg * 9.8, 1.5, .7, '#ff3b3b'); x.fillStyle = '#ff3b3b'; circ(x, C0 + 2.8, sg * 9.8, .45); } },
  'Antenna': k => { const { x } = k;
    k.ring(C0 + 1, 0, 7.4, 1.4, '#2a2a2e', -1.9, 1.9); // a headband
    for (const sg of [-1, 1]) { const bx = C0 - 7.6 + Math.sin(T * 6 + sg) * 1.6, by = sg * 8.8, sx = C0 + 1, sy = sg * 4.2;
      x.strokeStyle = '#555'; x.lineWidth = .55; x.beginPath(); x.moveTo(sx, sy); for (let q = 1; q <= 10; q++) { const t = q / 10, zx = sx + (bx - sx) * t, zy = sy + (by - sy) * t, o = (q % 2 ? 1 : -1) * .7 * (1 - t * .5); x.lineTo(zx + o * .6, zy - o * .5); } x.stroke(); // a springy stalk
      const g = x.createRadialGradient(bx, by, 0, bx, by, 4.4); g.addColorStop(0, 'rgba(255,90,90,.5)'); g.addColorStop(1, 'rgba(255,90,90,0)'); x.fillStyle = g; circ(x, bx, by, 4.4); // its glow
      k.disc(bx, by, 1.9, '#ff3b3b', { sh: 1, hi: .6 }); } },
  'Santa': k => { const { x } = k, sw = Math.sin(T * 2.4) * .8, tip = () => { x.moveTo(C0 - 2, -4.6); x.quadraticCurveTo(C0 - 8, -3 + sw, C0 - 11.2, 3.6 + sw); x.quadraticCurveTo(C0 - 6.8, 2.4, C0 - 3.2, 4.4); x.closePath(); };
    k.shadow(tip, 1.6, .28); k.fill(tip, k.rad(C0 - 6, 0, 7, '#c62828', .25, -.45)); k.path(tip); k.edge('#6d1010', .45); // the floppy tip, hanging off the back
    k.disc(C0, 0, 6.8, '#cf2b2b', { sh: 1.4, hi: .3 });
    const trim = () => { for (let q = 0; q < 16; q++) { const a = q * TAU / 16, px = C0 + Math.cos(a) * 6.9, py = Math.sin(a) * 6.9; x.moveTo(px + 1.5, py); x.arc(px, py, 1.5, 0, TAU); } }; // the fur trim
    k.shadow(trim, 1.2, .2); k.fill(trim, k.rad(C0, 0, 8.4, '#f7f7f4', .1, -.22));
    k.fluff(C0 - 11.2, 3.6 + sw, 2.3, '#fbfbf8'); },
  'Sombrero': k => { const { x } = k, col = '#dcaa48';
    k.disc(C0, 0, 12.4, col, { sh: 2.8, sa: .3, hi: .3, lo: -.4, gl: 0, ec: '#7d5a17' });
    x.strokeStyle = '#c0392b'; x.lineWidth = 1.2; x.beginPath(); for (let q = 0; q <= 28; q++) { const a = q * TAU / 28, rr = q % 2 ? 9.6 : 11; x.lineTo(C0 + Math.cos(a) * rr, Math.sin(a) * rr); } x.stroke(); // embroidery round the brim
    x.fillStyle = '#2e8b57'; for (let q = 0; q < 14; q++) { const a = q * TAU / 14; circ(x, C0 + Math.cos(a) * 8.6, Math.sin(a) * 8.6, .55); }
    k.disc(C0, 0, 5.3, shade(col, -.06), { sh: 1.6, sa: .38, hi: .35 }); k.ring(C0, 0, 5.5, 1, '#c0392b'); },
  'Mohawk': k => { const { x } = k;
    for (let q = 0; q < 8; q++) { const px = C0 + 6 - q * 2.3, w = 2.1 + Math.sin(q * 1.7) * .35, l = 3 + (q % 2) * .6 + Math.sin(T * 3 + q) * .1, sp = () => x.ellipse(px, 0, l, w, 0, 0, TAU);
      k.shadow(sp, 1.5, .3); k.fill(sp, k.rad(px, 0, l, '#ff2d55', .45, -.45)); k.path(sp); k.edge('#8a0f28', .4); } }, // spikes down the middle, lit from one side
  'Cat ears': k => { const { x } = k;
    for (const sg of [-1, 1]) { const ear = () => { x.moveTo(C0 + 4, sg * 2.4); x.quadraticCurveTo(C0 + 3.6, sg * 8, C0 + 1.4, sg * 12.4); x.quadraticCurveTo(C0 - 3, sg * 8.6, C0 - 5, sg * 3.4); x.closePath(); }, inner = () => { x.moveTo(C0 + 2.4, sg * 3.8); x.quadraticCurveTo(C0 + 2.2, sg * 7.8, C0 + 1, sg * 10.4); x.quadraticCurveTo(C0 - 1.8, sg * 7.6, C0 - 3.2, sg * 4.2); x.closePath(); };
      k.shadow(ear, 1.8, .32); k.fill(ear, k.rad(C0, sg * 7, 7, '#4a4346', .7, -.35)); k.path(ear); k.edge('#141213', .55); k.fill(inner, k.rad(C0, sg * 7, 5, '#f29bb4', .25, -.3));
      x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = .35; for (let q = 0; q < 3; q++) { x.beginPath(); x.moveTo(C0 - 1.6 + q * 1.3, sg * 4.6); x.lineTo(C0 - .6 + q * 1.1, sg * (6.8 + q * .4)); x.stroke(); } }
    k.ring(C0 + .4, 0, 6.2, 1.3, '#4a4346', -1.9, 1.9); }, // a band holding them on
  'Bunny ears': k => { const { x } = k;
    for (const sg of [-1, 1]) { const fl = sg > 0 ? Math.sin(T * 2.2) * .9 + 1.6 : Math.sin(T * 2.6 + 1) * .5, ear = () => { x.moveTo(C0 + 1.6, sg * 1.4); x.bezierCurveTo(C0 - 3, sg * (1.2 + fl), C0 - 13, sg * (2.6 + fl), C0 - 15, sg * (5.6 + fl)); x.bezierCurveTo(C0 - 12.6, sg * (8.4 + fl), C0 - 3, sg * 6, C0 + 1.6, sg * 4.6); x.closePath(); }, inner = () => { x.moveTo(C0, sg * 2.6); x.bezierCurveTo(C0 - 4, sg * (2.6 + fl), C0 - 11.6, sg * (3.8 + fl), C0 - 13, sg * (5.6 + fl)); x.bezierCurveTo(C0 - 11, sg * (6.8 + fl), C0 - 4, sg * 5, C0, sg * 3.8); x.closePath(); };
      k.shadow(ear, 1.8, .3); k.fill(ear, k.rad(C0 - 6, sg * 4, 9, '#f6f3ee', .1, -.22)); k.path(ear); k.edge('#a59e94', .45); k.fill(inner, k.rad(C0 - 6, sg * 4, 7, '#f7a8c0', .2, -.25)); } },
  'Mushroom': k => { const { x } = k, col = '#d32b26';
    k.disc(C0, 0, 8.3, col, { sh: 2.2, hi: .35, lo: -.45, gl: .45 });
    for (const [px, py, r] of [[0, 0, 1.6], [3.6, -3, 1.2], [-3.2, -3.8, 1.35], [-4.4, 2.2, 1.1], [2.6, 4.2, 1.25], [5.4, 1, .8], [-1, 5.6, .8], [-6, -.8, .75], [1.4, -6, .7]])
      k.oval(C0 + px, py, r, r * .86, '#fbf6ea', { rot: px, sh: .5, sa: .2, hi: .05, lo: -.18, ec: 'rgba(120,100,80,.45)' }); },
  /* ---- characterful ---- */
  'Pirate': k => { const { x } = k, hat = () => { x.moveTo(C0 + 7.8, 0); x.quadraticCurveTo(C0 + 2, -3.4, C0 - 5.6, -9.4); x.quadraticCurveTo(C0 - 3.6, -3.6, C0 - 5.8, 0); x.quadraticCurveTo(C0 - 3.6, 3.6, C0 - 5.6, 9.4); x.quadraticCurveTo(C0 + 2, 3.4, C0 + 7.8, 0); x.closePath(); };
    k.shadow(hat, 2.2, .34); k.fill(hat, k.rad(C0, 0, 9, '#232021', .5, -.45)); k.path(hat); k.edge('#d9b13b', .8); // the tricorn, trimmed in gold
    k.disc(C0 - .4, 0, 5, '#2a2627', { sh: 1, sa: .4, hi: .55, ec: '#0d0c0c', gl: .25 });
    x.strokeStyle = '#f2ede2'; x.lineWidth = .7; x.beginPath(); x.moveTo(C0 - 2.4, -2.2); x.lineTo(C0 + 1.8, 2.2); x.moveTo(C0 - 2.4, 2.2); x.lineTo(C0 + 1.8, -2.2); x.stroke(); // skull and crossbones
    x.fillStyle = '#f2ede2'; circ(x, C0 + .2, 0, 1.6); x.fillRect(C0 - 1.9, -.85, 1.2, 1.7); x.fillStyle = '#111'; circ(x, C0 + .55, -.6, .42); circ(x, C0 + .55, .6, .42); },
  'Propeller': k => { const { x } = k, f = () => x.arc(C0, 0, 7, 0, TAU);
    k.shadow(f, 1.8, .3); ['#e53935', '#fdd835', '#1e88e5', '#43a047'].forEach((col, q) => k.fill(() => { x.moveTo(C0, 0); x.arc(C0, 0, 7, q * Math.PI / 2, (q + 1) * Math.PI / 2); x.closePath(); }, k.rad(C0, 0, 7, col, .3, -.38)));
    k.path(f); k.edge('rgba(0,0,0,.45)', .5); k.glint(C0, 0, 7, .3);
    x.fillStyle = 'rgba(200,200,210,.18)'; circ(x, C0, 0, 9.4); // the blur of the blades
    x.save(); x.translate(C0, 0); x.rotate(T * 25); for (const sg of [-1, 1]) { x.beginPath(); x.ellipse(sg * 4.6, 0, 4.4, 1.15, sg * .12, 0, TAU); x.fillStyle = '#6a6e75'; x.fill(); x.strokeStyle = '#2d3036'; x.lineWidth = .35; x.stroke(); } x.restore();
    k.disc(C0, 0, 1.4, '#2a2a2a', { sh: .5, hi: .6 }); },
  'Ushanka': k => { const { x } = k, fur = '#6d4a30';
    for (const sg of [-1, 1]) k.oval(C0 - .6, sg * 6.4, 4.4, 2.6, shade(fur, .1), { sh: 1.4, hi: .25, lo: -.35, ec: '#3a2414' }); // the ear flaps, tied up
    const rim = () => { for (let q = 0; q < 20; q++) { const a = q * TAU / 20, px = C0 + Math.cos(a) * 6.9, py = Math.sin(a) * 6.9; x.moveTo(px + 1.7, py); x.arc(px, py, 1.7, 0, TAU); } };
    k.shadow(rim, 1.6, .3); k.fill(rim, k.rad(C0, 0, 8.6, fur, .3, -.4));
    k.disc(C0, 0, 6, '#3a3d44', { sh: .8, sa: .35, hi: .35, gl: .25 }); // the crown
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = .4; x.beginPath(); x.moveTo(C0 + 5.6, 0); x.lineTo(C0 - 5.6, 0); x.stroke(); // its seam
    x.fillStyle = '#d4232b'; star(x, C0 + 6.6, 0, 1.6, Math.PI / 2); x.fillStyle = '#f2c21b'; circ(x, C0 + 6.6, 0, .4); },
  'Deerstalker': k => { const { x } = k, col = '#8a7354', brims = () => { x.ellipse(C0 + 6.4, 0, 3.6, 4.6, 0, 0, TAU); x.moveTo(C0 - 3.2, 0); x.ellipse(C0 - 6.4, 0, 3.6, 4.6, 0, 0, TAU); };
    k.shadow(brims, 2, .3); k.fill(brims, k.rad(C0, 0, 9, shade(col, -.08), .25, -.4)); k.path(brims); k.edge(shade(col, -.6), .5); // a peak front and back
    const f = () => x.arc(C0, 0, 6.4, 0, TAU); k.shadow(f, 1.2, .3); k.fill(f, k.rad(C0, 0, 6.4, col, .3, -.38));
    x.save(); k.path(f); x.clip(); x.strokeStyle = 'rgba(60,40,20,.45)'; x.lineWidth = .4; for (let q = -6; q <= 6; q += 1.6) { x.beginPath(); x.moveTo(C0 + q, -7); x.lineTo(C0 + q, 7); x.stroke(); x.beginPath(); x.moveTo(C0 - 7, q); x.lineTo(C0 + 7, q); x.stroke(); } x.restore(); // tweed checks
    k.path(f); k.edge(shade(col, -.6), .5);
    x.strokeStyle = '#4a3820'; x.lineWidth = .6; x.beginPath(); x.moveTo(C0, -1.6); x.quadraticCurveTo(C0 + 1.4, -3, C0 + .4, -.2); x.moveTo(C0, 1.6); x.quadraticCurveTo(C0 + 1.4, 3, C0 + .4, .2); x.stroke(); }, // the ear flaps tied in a bow on top
  'Flower crown': k => { const { x } = k, cols = ['#ff9ecb', '#ffd23f', '#9ad1ff', '#ffffff', '#ff8a5c'];
    k.ring(C0, 0, 6.6, 1.2, '#4f8a35');
    for (let q = 0; q < 10; q++) { const a = q * TAU / 10 + .3; k.oval(C0 + Math.cos(a) * 6.6, Math.sin(a) * 6.6, 1.6, .8, '#5ea23d', { rot: a + 1.2, sh: .6, sa: .2 }); } // leaves
    for (let q = 0; q < 9; q++) { const a = q * TAU / 9, fx = C0 + Math.cos(a) * 6.6, fy = Math.sin(a) * 6.6, col = cols[q % cols.length];
      for (let p = 0; p < 5; p++) { const b = p * TAU / 5 + a; k.oval(fx + Math.cos(b) * 1.1, fy + Math.sin(b) * 1.1, 1.05, .8, col, { rot: b, sh: .5, sa: .2, hi: .25, ec: shade(col, -.35) }); }
      x.fillStyle = '#e8a91e'; circ(x, fx, fy, .55); } },
  'Viking': k => { const { x } = k;
    for (const sg of [-1, 1]) { const horn = () => { x.moveTo(C0 + 1.6, sg * 5.4); x.quadraticCurveTo(C0 + 4.6, sg * 13.6, C0 - 4.6, sg * 13.8); x.quadraticCurveTo(C0 + .4, sg * 10.6, C0 - 1.6, sg * 5.6); x.closePath(); };
      k.shadow(horn, 1.8, .3); k.fill(horn, k.lin(C0, sg * 5, C0 - 4, sg * 13.6, '#efe6d2', '#9b8d74')); k.path(horn); k.edge('#5f5443', .5);
      x.strokeStyle = 'rgba(95,84,67,.6)'; x.lineWidth = .35; for (let q = 1; q < 4; q++) { const t = q / 4, hx = C0 + 1.6 + (-4.6 - 1.6) * t * t + 6 * t * (1 - t) * .5, hy = sg * (5.4 + 8.4 * t); x.beginPath(); x.arc(hx, hy, 1.6 - t * .6, 0, Math.PI); x.stroke(); } }
    k.disc(C0, 0, 7.6, '#8a909b', { sh: 1.6, hi: .5, lo: -.45, gl: .45 });
    k.ring(C0, 0, 6.7, 1.6, '#6b4a2b'); x.fillStyle = '#c8ccd3'; for (let q = 0; q < 10; q++) { const a = q * TAU / 10; circ(x, C0 + Math.cos(a) * 6.7, Math.sin(a) * 6.7, .45); } // the leather band and its rivets
    k.fill(() => { x.rect(C0 + 4, -.8, 5.6, 1.6); }, k.lin(0, -.8, 0, .8, '#c4c9d1', '#6f7580')); }, // the nose guard
  'Horns': k => { const { x } = k;
    for (const sg of [-1, 1]) { const horn = () => { x.moveTo(-1, sg * 4.6); x.quadraticCurveTo(-6, sg * 13.6, -13.6, sg * 11.6); x.quadraticCurveTo(-7.6, sg * 9.2, -5, sg * 2.6); x.closePath(); };
      k.shadow(horn, 1.8, .32); k.fill(horn, k.lin(-2, sg * 4, -13.6, sg * 11.6, '#efe6d3', '#5a4c3c')); k.path(horn); k.edge('#3e3428', .5);
      x.strokeStyle = 'rgba(60,50,38,.5)'; x.lineWidth = .4; for (let q = 1; q < 5; q++) { const t = q / 6, hx = -1 + (-13.6 + 1) * t, hy = sg * (4.6 + 7.4 * t + 2.6 * Math.sin(t * Math.PI)); x.beginPath(); x.arc(hx, hy, 1.9 - t, -.3, Math.PI + .3); x.stroke(); } } }, // ridged, darkening to the tips
  'Witch hat': k => { const { x } = k, col = '#2b2233', sw = Math.sin(T * 2) * .6;
    k.disc(C0, 0, 10.6, col, { sh: 2.6, hi: .4, lo: -.5, gl: 0, ec: '#0f0b12' });
    x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = .6; x.beginPath(); x.arc(C0, 0, 9.4, 0, TAU); x.stroke(); // a crease in the brim
    k.disc(C0, 0, 5.8, '#33293d', { sh: 1.6, sa: .4, hi: .45 }); k.ring(C0, 0, 5.9, 1.3, '#6b3fa0');
    x.strokeStyle = '#d9b13b'; x.lineWidth = .6; x.strokeRect(C0 + 4.9, -1.2, 1.7, 2.4); // the buckle
    const tip = () => { x.moveTo(C0 - 1.6, -2.2); x.quadraticCurveTo(C0 - 5, -1 + sw, C0 - 7.8, 2.4 + sw); x.quadraticCurveTo(C0 - 4.6, 1.2, C0 - 1.4, 2.2); x.closePath(); }; // the crumpled point, bent over backwards
    k.shadow(tip, 1.4, .35); k.fill(tip, k.rad(C0 - 4, 0, 5, '#3a2f45', .45, -.4)); k.path(tip); k.edge('#0f0b12', .45); },
  'Wizard': k => { const { x } = k, col = '#4b2a8a';
    k.disc(C0, 0, 9.2, col, { sh: 2.4, hi: .3, lo: -.5, gl: 0 });
    k.disc(C0, 0, 5.8, '#5c35a6', { sh: 1.6, sa: .4, hi: .55 });
    x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = .7; x.beginPath(); for (let q = 0; q < 40; q++) { const t = q / 40, a = t * TAU * 1.6, r = 5.6 * (1 - t); x.lineTo(C0 + Math.cos(a) * r, Math.sin(a) * r); } x.stroke(); // the cone's twist
    x.fillStyle = '#ffd23f'; star(x, C0 + 6.8, -4.4, 1.5, .3); star(x, C0 - 6.4, 5.2, 1.2, 1); star(x, C0 - 3.4, -7.4, 1, .6);
    x.beginPath(); x.arc(C0 + 2, 7.2, 1.5, 0, TAU); x.arc(C0 + 2.7, 6.7, 1.3, 0, TAU, true); x.fill(); // a moon on the brim
    k.sparkle(C0, 0, 1.6, .5 + .4 * Math.sin(T * 5)); },
  'Jester': k => { const { x } = k, cols = ['#c62a2a', '#2e8b3e', '#e2b41f'];
    for (let q = 0; q < 3; q++) { const a = Math.PI + (q - 1) * 1.05, j = Math.sin(T * 5 + q * 2) * .35, tx = C0 + Math.cos(a + j * .3) * 12.4, ty = Math.sin(a + j * .3) * 12.4, col = cols[q];
      const pt = () => { x.moveTo(C0 + Math.cos(a - .55) * 4.4, Math.sin(a - .55) * 4.4); x.quadraticCurveTo(C0 + Math.cos(a - .2) * 9, Math.sin(a - .2) * 9, tx, ty); x.quadraticCurveTo(C0 + Math.cos(a + .3) * 8, Math.sin(a + .3) * 8, C0 + Math.cos(a + .55) * 4.4, Math.sin(a + .55) * 4.4); x.closePath(); };
      k.shadow(pt, 1.8, .3); k.fill(pt, k.rad(C0 + Math.cos(a) * 7, Math.sin(a) * 7, 7, col, .3, -.4)); k.path(pt); k.edge(shade(col, -.55), .45);
      k.disc(tx, ty, 1.35, '#f1c232', { sh: .8, hi: .7, ec: '#7d5e00', gl: .5 }); } // a bell on each point, jingling
    k.disc(C0, 0, 5.4, '#7a3fa0', { sh: 1, sa: .35, hi: .35 });
    for (let q = 0; q < 8; q++) { const a = q * TAU / 8; x.fillStyle = q % 2 ? '#e2b41f' : '#c62a2a'; x.beginPath(); x.moveTo(C0 + Math.cos(a - .3) * 5.4, Math.sin(a - .3) * 5.4); x.lineTo(C0 + Math.cos(a) * 7, Math.sin(a) * 7); x.lineTo(C0 + Math.cos(a + .3) * 5.4, Math.sin(a + .3) * 5.4); x.closePath(); x.fill(); } }, // a zigzag collar of points
  /* ---- the best ones ---- */
  'Tiara': k => { const { x } = k, band = () => x.arc(C0, 0, 6.6, -1.9, 1.9);
    x.save(); x.translate(-k.lx * 1.2, -k.ly * 1.2); x.strokeStyle = 'rgba(0,0,0,.28)'; x.lineWidth = 1.8; k.path(band); x.stroke(); x.restore();
    x.strokeStyle = k.lin(C0, -7, C0 + 7, 7, '#f5f6fa', '#9aa1ad'); x.lineWidth = 1.4; k.path(band); x.stroke(); // a silver band round the front
    for (let q = -3; q <= 3; q++) { const a = q * .5, h = q ? 2.1 - Math.abs(q) * .35 : 3.4, bx = C0 + Math.cos(a) * 6.6, by = Math.sin(a) * 6.6, ex = C0 + Math.cos(a) * (6.6 + h), ey = Math.sin(a) * (6.6 + h);
      x.strokeStyle = '#d9dde4'; x.lineWidth = .7; x.beginPath(); x.moveTo(bx, by); x.lineTo(ex, ey); x.stroke(); // its points
      k.gem(ex, ey, q ? .75 : 1.4, q ? '#9ad1ff' : '#e0263a'); }
    for (let q = 0; q < 3; q++) { const a = T * 1.4 + q * 2.1; k.sparkle(C0 + Math.cos(a % 3.8 - 1.9) * 8.4, Math.sin(a % 3.8 - 1.9) * 8.4, 1.4, Math.max(0, Math.sin(T * 3 + q * 2))); } },
  'Halo': k => { const { x } = k, el = () => x.ellipse(C0, 0, 6.2, 7.6, 0, 0, TAU);
    x.save(); x.translate(-k.lx * 4, -k.ly * 4); x.strokeStyle = 'rgba(0,0,0,.14)'; x.lineWidth = 2.4; k.path(el); x.stroke(); x.restore(); // its shadow, far below it: it floats
    x.strokeStyle = 'rgba(255,230,120,.25)'; x.lineWidth = 5.4; k.path(el); x.stroke(); x.strokeStyle = 'rgba(255,236,150,.4)'; x.lineWidth = 3; x.stroke();
    x.strokeStyle = k.lin(C0 - 6, -7, C0 + 6, 7, '#fff4c2', '#e8b52a'); x.lineWidth = 1.8; x.stroke();
    for (let q = 0; q < 3; q++) { const a = T * 1.2 + q * TAU / 3; k.sparkle(C0 + Math.cos(a) * 6.2, Math.sin(a) * 7.6, 1.5, .55 + .45 * Math.sin(T * 4 + q)); } },
  'Knight': k => { const { x } = k, sw = Math.sin(T * 3) * .5;
    k.disc(C0, 0, 7.9, '#9aa1ab', { sh: 2, hi: .55, lo: -.5, gl: .45, ec: '#3c4048' });
    k.fill(() => x.rect(C0 - 7.4, -.7, 14.4, 1.4), k.lin(0, -.7, 0, .7, '#d6dae0', '#6b717b')); // the ridge
    x.fillStyle = '#16181c'; x.beginPath(); x.arc(C0, 0, 6.5, -.75, .75); x.arc(C0, 0, 5.3, .75, -.75, true); x.closePath(); x.fill(); // the eye slit
    x.fillStyle = 'rgba(20,22,26,.8)'; for (let q = -2; q <= 2; q++) { const a = .95 + q * .12; for (const sg of [-1, 1]) circ(x, C0 + Math.cos(sg * a) * 4.3, Math.sin(sg * a) * 4.3, .3); } // breathing holes
    for (let q = 0; q < 6; q++) { const t = q / 5, px = C0 - 1 - t * 9.6, py = Math.sin(t * 3 + T * 3) * .9 * t + sw * t, fe = () => x.ellipse(px, py, 2.6, 1.5 - t * .4, Math.sin(t * 4) * .3, 0, TAU); // the plume down the back
      k.shadow(fe, 1.4, .22); k.fill(fe, k.rad(px, py, 2.6, q % 2 ? '#c62a2a' : '#e04040', .35, -.35)); } },
  'Samurai': k => { const { x } = k;
    for (let q = 3; q >= 0; q--) { const r = 7.6 + q * .75, plate = () => { x.arc(C0 - .4, 0, r, Math.PI - 1.15 - q * .05, Math.PI + 1.15 + q * .05); x.arc(C0 - .4, 0, r - 1.4, Math.PI + 1.15, Math.PI - 1.15, true); x.closePath(); };
      k.shadow(plate, 1.2, .22); k.fill(plate, q % 2 ? '#7a1a1e' : '#8f2228'); k.path(plate); k.edge('#2a0709', .4); } // the neck guard, in layered plates
    k.disc(C0, 0, 7, '#1c1a1d', { sh: 1.6, hi: .9, lo: -.4, ec: '#000', gl: .4 });
    x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = .4; for (let q = 0; q < 12; q++) { const a = q * TAU / 12; x.beginPath(); x.moveTo(C0 + Math.cos(a) * 1.4, Math.sin(a) * 1.4); x.lineTo(C0 + Math.cos(a) * 6.8, Math.sin(a) * 6.8); x.stroke(); } // lacquered ribs
    const crest = () => { x.moveTo(C0 + 6, -1); x.quadraticCurveTo(C0 + 11.4, -6.4, C0 + 7.4, -11.4); x.quadraticCurveTo(C0 + 9.8, -5.4, C0 + 4.6, 0); x.quadraticCurveTo(C0 + 9.8, 5.4, C0 + 7.4, 11.4); x.quadraticCurveTo(C0 + 11.4, 6.4, C0 + 6, 1); x.closePath(); };
    k.shadow(crest, 1.8, .32); k.fill(crest, k.lin(C0 + 5, -10, C0 + 10, 10, '#ffe27a', '#b8860b')); k.path(crest); k.edge('#6b4a00', .45); // the golden crescent crest
    k.disc(C0 + 5.2, 0, 1.2, '#d9b13b', { sh: .5, hi: .6 }); },
  'Space helmet': k => { const { x } = k, r = 10.2, f = () => x.arc(C0 + 2, 0, r, 0, TAU);
    k.shadow(f, 1.6, .18);
    x.fillStyle = 'rgba(160,205,255,.13)'; k.path(f); x.fill(); // the glass bubble over the whole head
    k.ring(C0 + 2, 0, r - .4, 1.1, 'rgba(225,240,255,.55)'); k.ring(C0 + 2, 0, r + .5, 1.5, '#8d96a3'); k.ring(C0 + 2, 0, r + .5, .5, '#c9d0d9'); // the rim and its metal collar
    x.save(); k.path(f); x.clip(); const ga = Math.atan2(k.ly, k.lx);
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1.6; x.beginPath(); x.arc(C0 + 2, 0, r - 2.4, ga - .6, ga + .6); x.stroke(); // a reflection on the lit side
    x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = .8; x.beginPath(); x.arc(C0 + 2, 0, r - 4.2, ga - .35, ga + .35); x.stroke();
    const sw = (T * .5 % 3) - 1; x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.ellipse(C0 + 2 + sw * r * 1.4, 0, 1.6, r * 1.2, .5, 0, TAU); x.fill(); // a glint sweeping across now and then
    x.restore();
    for (const sg of [-1, 1]) k.disc(C0 - 7.6, sg * 3.6, .8, sg > 0 ? '#5ad25a' : '#ff4040', { sh: .3, hi: .8, gl: 0 }); }, // two status lights on the collar
  /* ---- earned, never bought ---- */
  'Crown': k => { const { x } = k, pts = () => { for (let q = 0; q < 10; q++) { const a = q * TAU / 10, r = q % 2 ? 5 : 8; q ? x.lineTo(C0 + Math.cos(a) * r, Math.sin(a) * r) : x.moveTo(C0 + Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); };
    k.shadow(pts, 2.2, .32); k.fill(pts, k.rad(C0, 0, 8, '#f0c63c', .5, -.45)); k.path(pts); k.edge('#8a6510', .6);
    k.disc(C0, 0, 4.3, '#8c1424', { sh: .8, sa: .35, hi: .35 }); // the velvet cap
    for (let q = 0; q < 5; q++) { const a = q * TAU / 5; k.gem(C0 + Math.cos(a) * 6.4, Math.sin(a) * 6.4, 1.15, q % 2 ? '#2e7cf6' : '#e0263a'); }
    k.sparkle(C0 + Math.cos(T * 1.3) * 7.8, Math.sin(T * 1.3) * 7.8, 1.5, Math.max(0, Math.sin(T * 3))); },
  'Cracked Halo': k => { const { x } = k; // what goes around comes around: a dimmer halo with a chunk missing
    x.save(); x.translate(-k.lx * 4, -k.ly * 4); x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 2.2; x.beginPath(); x.ellipse(C0, 0, 6.2, 7.6, 0, .55, TAU - .25); x.stroke(); x.restore();
    x.strokeStyle = 'rgba(220,200,140,.2)'; x.lineWidth = 5; x.beginPath(); x.ellipse(C0, 0, 6.2, 7.6, 0, .5, TAU - .2); x.stroke();
    x.strokeStyle = k.lin(C0 - 6, -7, C0 + 6, 7, '#e8dcb0', '#9c8442'); x.lineWidth = 1.8; x.beginPath(); x.ellipse(C0, 0, 6.2, 7.6, 0, .55, TAU - .25); x.stroke();
    x.strokeStyle = 'rgba(70,55,30,.9)'; x.lineWidth = .7; x.beginPath(); x.moveTo(C0 + 5.3, -3.7); x.lineTo(C0 + 6.7, -2.5); x.lineTo(C0 + 5.7, -1.3); x.stroke(); // the crack
    x.save(); x.translate(C0 + 8, 3.6); x.rotate(.9 + Math.sin(T * 1.5) * .2); x.fillStyle = '#c8b06a'; x.fillRect(-1.2, -.5, 2.4, 1); x.restore(); }, // the bit that broke off, drifting
};
function drawHat(x, hat) { const f = HATS[hat]; if (!f) return; const im = ARTO.map.size && artImg('hats/' + artName(hat)), s = ART_FRAME.hat; if (im) return x.drawImage(im, -s / 2, -s / 2, s, s); x.save(); f(hatKit(x)); x.restore(); } // (your own picture of it, if you've painted one: 03h-art)

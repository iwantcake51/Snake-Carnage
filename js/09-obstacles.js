/* =========================================================
   OBSTACLE DRAWING (top-down, flat shading, a darker rim on everything)
   ========================================================= */
function edge(x, o, a = .3) { x.strokeStyle = `rgba(0,0,0,${a})`; x.lineWidth = 1.2; if (o.t === 'r') x.strokeRect(o.x + .6, o.y + .6, o.w - 1.2, o.h - 1.2); else { x.beginPath(); x.arc(o.x, o.y, o.r - .6, 0, TAU); x.stroke(); } }
function roof(x, o) { // pitched roofs read as a ridge with two shaded slopes; flat roofs get vents and an AC unit
  const c = o.rc || o.color, hz = o.w >= o.h, type = o.roof || 'gable';
  if (type === 'flat') {
    x.fillStyle = shade(c, -.05); x.fillRect(o.x, o.y, o.w, o.h);
    x.strokeStyle = shade(c, .18); x.lineWidth = 3; x.strokeRect(o.x + 2.5, o.y + 2.5, o.w - 5, o.h - 5); // parapet
    const r = seeded(Math.round(o.x * 7 + o.y));
    for (let k = 0; k < 2 + (o.w * o.h > 20000 ? 2 : 0); k++) { const ax = o.x + 14 + r() * (o.w - 46), ay = o.y + 14 + r() * (o.h - 40); x.fillStyle = '#9aa0a6'; x.fillRect(ax, ay, 22, 16); x.strokeStyle = '#6e737a'; x.lineWidth = 1; x.strokeRect(ax + .5, ay + .5, 21, 15); x.beginPath(); x.arc(ax + 11, ay + 8, 5, 0, TAU); x.stroke(); }
    x.fillStyle = '#5f646b'; circ(x, o.x + o.w - 16, o.y + o.h - 14, 4);
    return;
  }
  const L = shade(c, .12), D = shade(c, -.18);
  if (type === 'hip') { // four slopes meeting at a short ridge
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2, rl = Math.abs(o.w - o.h) / 2;
    const r0 = hz ? [cx - rl, cy] : [cx, cy - rl], r1 = hz ? [cx + rl, cy] : [cx, cy + rl];
    const poly = (pts, col) => { x.fillStyle = col; x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(...p) : x.moveTo(...p)); x.closePath(); x.fill(); };
    const tl = [o.x, o.y], tr = [o.x + o.w, o.y], bl = [o.x, o.y + o.h], br = [o.x + o.w, o.y + o.h];
    if (hz) { poly([tl, tr, r1, r0], L); poly([bl, br, r1, r0], D); poly([tl, bl, r0], shade(c, .03)); poly([tr, br, r1], shade(c, -.09)); }
    else { poly([tl, bl, r1, r0], L); poly([tr, br, r1, r0], D); poly([tl, tr, r0], shade(c, .06)); poly([bl, br, r1], shade(c, -.12)); }
    x.strokeStyle = shade(c, .3); x.lineWidth = 1.5; x.beginPath(); x.moveTo(...tl); x.lineTo(...r0); x.lineTo(...r1); x.lineTo(...br); x.moveTo(...tr); x.lineTo(...(hz ? r1 : r0)); x.moveTo(...bl); x.lineTo(...(hz ? r0 : r1)); x.stroke();
  } else { // gable: ridge along the long side
    x.fillStyle = L; if (hz) x.fillRect(o.x, o.y, o.w, o.h / 2); else x.fillRect(o.x, o.y, o.w / 2, o.h);
    x.fillStyle = D; if (hz) x.fillRect(o.x, o.y + o.h / 2, o.w, o.h / 2); else x.fillRect(o.x + o.w / 2, o.y, o.w / 2, o.h);
    x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 1; // shingle rows
    if (hz) for (let y = o.y + 6; y < o.y + o.h; y += 7) { x.beginPath(); x.moveTo(o.x, y); x.lineTo(o.x + o.w, y); x.stroke(); }
    else for (let xx = o.x + 6; xx < o.x + o.w; xx += 7) { x.beginPath(); x.moveTo(xx, o.y); x.lineTo(xx, o.y + o.h); x.stroke(); }
    x.strokeStyle = shade(c, .3); x.lineWidth = 2.5; x.beginPath(); // ridge cap
    if (hz) { x.moveTo(o.x, o.y + o.h / 2); x.lineTo(o.x + o.w, o.y + o.h / 2); } else { x.moveTo(o.x + o.w / 2, o.y); x.lineTo(o.x + o.w / 2, o.y + o.h); } x.stroke();
    const chx = o.x + o.w * (hz ? .72 : .3), chy = o.y + o.h * (hz ? .28 : .7); x.fillStyle = '#6d4c3c'; x.fillRect(chx - 6, chy - 6, 12, 12); x.fillStyle = '#2a2220'; x.fillRect(chx - 3, chy - 3, 6, 6); // chimney
  }
}
function drawObstacle(x, o) {
  drawObstacleBase(x, o);
  if (o.cracked) { const r = seeded(Math.round(o.x * 5 + o.y * 3)), cx = o.t === 'r' ? o.x + o.w / 2 : o.x, cy = o.t === 'r' ? o.y + o.h / 2 : o.y, R = o.t === 'r' ? Math.min(o.w, o.h) * .5 + 6 : o.r; // cracks from a neighbour's hit
    x.save(); x.strokeStyle = 'rgba(20,12,10,.65)'; x.lineWidth = 1; for (let k = 0; k < 4; k++) { let px = cx, py = cy, a = r() * TAU; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 4; j++) { a += (r() - .5) * 1.2; px += Math.cos(a) * R * .3; py += Math.sin(a) * R * .3; x.lineTo(px, py); } x.stroke(); } x.restore(); }
}
function drawObstacleBase(x, o) {
  const c = o.color, k = o.kind;
  if (k === 'water') return drawWater(x, o, 0); // static version (thumbnails); the animated copy is drawn every frame
  if (o.t === 'c') {
    switch (k) {
      case 'tree': case 'bush': {
        const r = seeded(Math.round(o.x * 13 + o.y * 7)), lobes = k === 'tree' ? 7 : 5;
        x.fillStyle = shade(c, -.18); circ(x, o.x, o.y, o.r);
        for (let i = 0; i < lobes; i++) { const a = i * TAU / lobes + r(), d = o.r * .45; x.fillStyle = shade(c, -.05 + r() * .1); circ(x, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d, o.r * .6); }
        x.fillStyle = shade(c, .16); circ(x, o.x - o.r * .22, o.y - o.r * .25, o.r * .5);
        x.fillStyle = shade(c, .3); circ(x, o.x - o.r * .32, o.y - o.r * .36, o.r * .2);
        return;
      }
      case 'rock': x.fillStyle = c; circ(x, o.x, o.y, o.r); x.fillStyle = shade(c, .18); circ(x, o.x - o.r * .28, o.y - o.r * .3, o.r * .5); x.fillStyle = shade(c, -.15); circ(x, o.x + o.r * .35, o.y + o.r * .3, o.r * .35);
        if (o.antenna) { x.fillStyle = '#d8dde2'; circ(x, o.x, o.y, o.r * .9); x.strokeStyle = '#7d848c'; x.lineWidth = 1.5; x.beginPath(); x.arc(o.x, o.y, o.r * .9, 0, TAU); x.stroke(); x.fillStyle = '#6a7078'; circ(x, o.x, o.y, 2.2); }
        return edge(x, o, .25);
      case 'lamp':
        if (o.mast) { x.fillStyle = '#4a5058'; circ(x, o.x, o.y, o.r); x.fillStyle = '#d9dde2'; x.fillRect(o.x - 7, o.y - 3, 14, 6); x.fillStyle = '#fff6d8'; x.fillRect(o.x - 5, o.y - 1.5, 10, 3); return; }
        if (o.lantern) { x.fillStyle = '#6b6258'; circ(x, o.x, o.y, o.r + 1); x.fillStyle = '#2b2622'; x.fillRect(o.x - 3.5, o.y - 3.5, 7, 7); x.fillStyle = '#ffd98a'; x.fillRect(o.x - 2, o.y - 2, 4, 4); return; }
        x.fillStyle = c; circ(x, o.x, o.y, o.r); x.fillStyle = '#fff1bf'; circ(x, o.x, o.y, o.r * .5); return;
      case 'hay': x.fillStyle = c; circ(x, o.x, o.y, o.r); x.strokeStyle = shade(c, -.2); x.lineWidth = 1.5; for (let r2 = o.r * .3; r2 < o.r; r2 += o.r * .22) { x.beginPath(); x.arc(o.x, o.y, r2, 0, TAU); x.stroke(); } return edge(x, o, .25);
      case 'silo': x.fillStyle = c; circ(x, o.x, o.y, o.r); x.fillStyle = shade(c, -.12); for (let a = 0; a < 16; a++) { x.beginPath(); x.moveTo(o.x, o.y); x.arc(o.x, o.y, o.r, a * TAU / 16, (a + .5) * TAU / 16); x.fill(); } x.fillStyle = shade(c, .15); circ(x, o.x, o.y, o.r * .2); return edge(x, o);
      case 'table':
        if (o.umbrella) { const r = o.r + 9; for (let a = 0; a < 8; a++) { x.fillStyle = a % 2 ? c : '#f6f2ea'; x.beginPath(); x.moveTo(o.x, o.y); x.arc(o.x, o.y, r, a * TAU / 8, (a + 1) * TAU / 8); x.fill(); } x.fillStyle = '#ddd'; circ(x, o.x, o.y, 2); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1; x.beginPath(); x.arc(o.x, o.y, r, 0, TAU); x.stroke(); return; }
        x.fillStyle = shade(c, -.25); for (let a = 0; a < 4; a++) circ(x, o.x + Math.cos(a * TAU / 4 + .8) * (o.r + 5), o.y + Math.sin(a * TAU / 4 + .8) * (o.r + 5), 4); // chairs
        x.fillStyle = c; circ(x, o.x, o.y, o.r); x.fillStyle = shade(c, .12); circ(x, o.x - o.r * .2, o.y - o.r * .2, o.r * .55); return edge(x, o);
      case 'plant': x.fillStyle = '#7a5038'; circ(x, o.x, o.y, o.r); x.fillStyle = '#4a2e1e'; circ(x, o.x, o.y, o.r * .78); for (let a = 0; a < 6; a++) { x.fillStyle = a % 2 ? '#3d7a2a' : '#4f9436'; ell(x, o.x + Math.cos(a) * o.r * .5, o.y + Math.sin(a) * o.r * .5, o.r * .55, o.r * .3); } return;
      case 'pod': x.fillStyle = '#4b5a60'; circ(x, o.x, o.y, o.r); x.fillStyle = 'rgba(127,255,200,.55)'; circ(x, o.x, o.y, o.r - 4); x.fillStyle = 'rgba(30,60,40,.7)'; ell(x, o.x, o.y + 1, 5, 8); circ(x, o.x, o.y - 7, 4); x.fillStyle = 'rgba(255,255,255,.4)'; ell(x, o.x - o.r * .35, o.y - o.r * .35, 3, 6); return edge(x, o, .4);
      case 'holo': x.fillStyle = c; circ(x, o.x, o.y, o.r); x.strokeStyle = '#5fffd0'; x.lineWidth = 1; for (let r2 = 6; r2 < o.r; r2 += 6) { x.beginPath(); x.arc(o.x, o.y, r2, 0, TAU); x.stroke(); } x.fillStyle = 'rgba(95,255,208,.35)'; circ(x, o.x, o.y, o.r * .55); return edge(x, o, .4);
      case 'saucer': x.fillStyle = shade(c, -.2); circ(x, o.x, o.y, o.r); x.fillStyle = c; circ(x, o.x, o.y, o.r - 5); x.fillStyle = shade(c, .12); circ(x, o.x, o.y, o.r * .55);
        x.fillStyle = 'rgba(120,255,200,.6)'; circ(x, o.x, o.y, o.r * .32); x.fillStyle = '#ffe36a'; for (let a = 0; a < 12; a++) circ(x, o.x + Math.cos(a * TAU / 12) * (o.r - 9), o.y + Math.sin(a * TAU / 12) * (o.r - 9), 2.2);
        x.strokeStyle = 'rgba(0,0,0,.3)'; x.lineWidth = 1; for (let a = 0; a < 6; a++) { x.beginPath(); x.moveTo(o.x + Math.cos(a) * o.r * .55, o.y + Math.sin(a) * o.r * .55); x.lineTo(o.x + Math.cos(a) * (o.r - 3), o.y + Math.sin(a) * (o.r - 3)); x.stroke(); } return edge(x, o);
      case 'reactor': x.fillStyle = '#28343a'; circ(x, o.x, o.y, o.r); x.fillStyle = '#4a5a60'; circ(x, o.x, o.y, o.r - 6); x.fillStyle = '#9dffd8'; circ(x, o.x, o.y, o.r * .45); x.fillStyle = '#ffffff'; circ(x, o.x, o.y, o.r * .18);
        x.strokeStyle = '#1a2428'; x.lineWidth = 3; for (let a = 0; a < 3; a++) { x.beginPath(); x.moveTo(o.x + Math.cos(a * 2.1) * o.r * .5, o.y + Math.sin(a * 2.1) * o.r * .5); x.lineTo(o.x + Math.cos(a * 2.1) * (o.r - 4), o.y + Math.sin(a * 2.1) * (o.r - 4)); x.stroke(); } return edge(x, o, .5);
      case 'dome': { // pressurized dome: segmented panels, a hatch, greenhouse ones glow green inside
        x.fillStyle = shade(c, -.12); circ(x, o.x, o.y, o.r); x.fillStyle = o.green ? '#bfe0b0' : c; circ(x, o.x, o.y, o.r - 3);
        x.strokeStyle = o.green ? 'rgba(60,110,50,.6)' : 'rgba(0,0,0,.14)'; x.lineWidth = 1;
        for (let a = 0; a < 8; a++) { x.beginPath(); x.moveTo(o.x, o.y); x.lineTo(o.x + Math.cos(a * TAU / 8) * (o.r - 3), o.y + Math.sin(a * TAU / 8) * (o.r - 3)); x.stroke(); }
        for (const f of [.4, .7]) { x.beginPath(); x.arc(o.x, o.y, (o.r - 3) * f, 0, TAU); x.stroke(); }
        if (o.green) { x.fillStyle = 'rgba(70,140,60,.55)'; for (let a = 0; a < 10; a++) circ(x, o.x + Math.cos(a * 2.4) * o.r * .45, o.y + Math.sin(a * 2.4) * o.r * .45, 4); }
        x.fillStyle = 'rgba(255,255,255,.35)'; ell(x, o.x - o.r * .3, o.y - o.r * .35, o.r * .3, o.r * .15);
        return edge(x, o);
      }
      case 'lander': x.strokeStyle = '#8a9098'; x.lineWidth = 3; for (let a = 0; a < 4; a++) { const an = a * TAU / 4 + .78; x.beginPath(); x.moveTo(o.x, o.y); x.lineTo(o.x + Math.cos(an) * (o.r + 10), o.y + Math.sin(an) * (o.r + 10)); x.stroke(); x.fillStyle = '#6a7078'; circ(x, o.x + Math.cos(an) * (o.r + 10), o.y + Math.sin(an) * (o.r + 10), 3.5); }
        x.fillStyle = o.rocket ? '#e9e4dc' : '#d4af37'; circ(x, o.x, o.y, o.r); x.fillStyle = o.rocket ? '#c0392b' : '#c8ccd2'; circ(x, o.x, o.y, o.r * .62); x.fillStyle = '#2a2e34'; circ(x, o.x, o.y, o.r * .25); return edge(x, o);
      case 'gazebo': x.fillStyle = '#b8b0a0'; for (let a = 0; a < 8; a++) circ(x, o.x + Math.cos(a * TAU / 8) * o.r, o.y + Math.sin(a * TAU / 8) * o.r, 3); x.fillStyle = '#8c3a2e';
        x.beginPath(); for (let a = 0; a < 8; a++) x.lineTo(o.x + Math.cos(a * TAU / 8) * (o.r + 2), o.y + Math.sin(a * TAU / 8) * (o.r + 2)); x.closePath(); x.fill();
        x.strokeStyle = '#6e2c22'; x.lineWidth = 1; for (let a = 0; a < 8; a++) { x.beginPath(); x.moveTo(o.x, o.y); x.lineTo(o.x + Math.cos(a * TAU / 8) * (o.r + 2), o.y + Math.sin(a * TAU / 8) * (o.r + 2)); x.stroke(); } x.fillStyle = '#e9e2d0'; circ(x, o.x, o.y, 3); return;
      case 'pillar': x.fillStyle = c; circ(x, o.x, o.y, o.r); x.fillStyle = shade(c, .25); circ(x, o.x - 3, o.y - 3, o.r * .45); x.strokeStyle = 'rgba(255,60,200,.35)'; x.lineWidth = 1.5; x.beginPath(); x.arc(o.x, o.y, o.r - 2, 0, TAU); x.stroke(); return edge(x, o, .5);
      default: x.fillStyle = c; circ(x, o.x, o.y, o.r); x.fillStyle = shade(c, .12); circ(x, o.x, o.y, o.r * .6); return edge(x, o);
    }
  }
  // ---- rectangles ----
  const hz = o.w >= o.h, X = o.x, Y = o.y, w = o.w, h = o.h;
  switch (k) {
    case 'border': x.fillStyle = c; x.fillRect(X, Y, w, h); return;
    case 'building': roof(x, o); return edge(x, o, .35);
    case 'barn': {
      x.fillStyle = '#7a2a20'; x.fillRect(X, Y, w, h); roof(x, { ...o, rc: '#8c2f24', roof: 'gable' });
      x.strokeStyle = '#f2efe6'; x.lineWidth = 3; const dx = X + w / 2 - 22, dy = Y + h - 2; x.strokeRect(dx, dy - 4, 44, 6); // hay door trim on the eave
      return edge(x, o, .35);
    }
    case 'hedge': {
      x.fillStyle = shade(c, -.2); x.fillRect(X, Y, w, h);
      const r = seeded(Math.round(X * 3 + Y * 5)), n = Math.ceil((hz ? w : h) / 7);
      for (let i = 0; i < n; i++) { const t = (i + .5) / n, px = hz ? X + t * w : X + w / 2, py = hz ? Y + h / 2 : Y + t * h; x.fillStyle = shade(c, -.04 + r() * .12); circ(x, px + (r() - .5) * 2, py + (r() - .5) * 2, (hz ? h : w) * .55); }
      x.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < n; i += 2) { const t = (i + .5) / n; circ(x, hz ? X + t * w - 2 : X + w / 2 - 2, hz ? Y + h / 2 - 2 : Y + t * h - 2, 2); }
      return;
    }
    case 'glass': x.fillStyle = 'rgba(169,212,230,.55)'; x.fillRect(X, Y, w, h); x.strokeStyle = '#6c8a96'; x.lineWidth = 2; x.strokeRect(X + 1, Y + 1, w - 2, h - 2);
      x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 1; for (let p = hz ? X + 18 : Y + 18; p < (hz ? X + w : Y + h); p += 60) { x.beginPath(); hz ? (x.moveTo(p, Y + 2), x.lineTo(p + 8, Y + h - 2)) : (x.moveTo(X + 2, p), x.lineTo(X + w - 2, p + 8)); x.stroke(); } return;
    case 'desk': {
      if (o.reception) { x.fillStyle = c; x.fillRect(X, Y, w, h); x.fillStyle = shade(c, .2); x.fillRect(X, Y, w, 6); x.fillStyle = '#2a2a33'; x.fillRect(X + w / 2 - 10, Y + 10, 20, 10); return edge(x, o); }
      x.fillStyle = c; x.fillRect(X, Y, w, h); x.fillStyle = shade(c, .12); x.fillRect(X + 2, Y + 2, w - 4, h * .25);
      const my = o.flip ? Y + 6 : Y + h - 12, cy = o.flip ? Y + h + 5 : Y - 5;
      for (const f of [.27, .73]) { const mx = X + w * f; x.fillStyle = '#23232b'; x.fillRect(mx - 10, my, 20, 5); x.fillStyle = '#5a8ad0'; x.fillRect(mx - 8, my + 1, 16, 3); x.fillStyle = '#e6e6e6'; x.fillRect(mx - 7, o.flip ? my + 8 : my - 8, 14, 4); x.fillStyle = '#2d2d34'; circ(x, mx, cy, 5.5); } // monitors, keyboards, chairs
      return edge(x, o);
    }
    case 'couch': case 'booth': x.fillStyle = shade(c, -.2); x.fillRect(X, Y, w, h); x.fillStyle = c; if (hz) x.fillRect(X + 4, Y + h * .35, w - 8, h * .6); else x.fillRect(X + w * .35, Y + 4, w * .6, h - 8);
      x.strokeStyle = 'rgba(0,0,0,.2)'; x.lineWidth = 1; for (let p = 1; p < 3; p++) { x.beginPath(); if (hz) { x.moveTo(X + w * p / 3, Y + h * .35); x.lineTo(X + w * p / 3, Y + h); } else { x.moveTo(X + w * .35, Y + h * p / 3); x.lineTo(X + w, Y + h * p / 3); } x.stroke(); } return edge(x, o);
    case 'bench': x.fillStyle = shade(c, -.25); x.fillRect(X, Y, w, h); x.fillStyle = c; for (let p = 0; p < 3; p++) hz ? x.fillRect(X + 1, Y + 1 + p * h / 3, w - 2, h / 3 - 1.5) : x.fillRect(X + 1 + p * w / 3, Y + 1, w / 3 - 1.5, h - 2); return;
    case 'fence': x.fillStyle = c; x.fillRect(X, Y, w, h); x.fillStyle = shade(c, -.3);
      if (hz) for (let p = X; p < X + w; p += 16) x.fillRect(p, Y - 1, 5, h + 2); else for (let p = Y; p < Y + h; p += 16) x.fillRect(X - 1, p, w + 2, 5); return;
    case 'car': {
      if (o.tractor) { x.fillStyle = '#222'; x.fillRect(X - 2, Y - 3, 14, 6); x.fillRect(X - 2, Y + h - 3, 14, 6); x.fillRect(X + w - 14, Y - 1, 10, 4); x.fillRect(X + w - 14, Y + h - 3, 10, 4); x.fillStyle = c; x.fillRect(X, Y, w, h); x.fillStyle = shade(c, -.25); x.fillRect(X + 2, Y + 4, 18, h - 8); x.fillStyle = '#bfe3f5'; x.fillRect(X + 4, Y + 6, 14, h - 12); x.fillStyle = '#555'; circ(x, X + w - 8, Y + h / 2, 3); return edge(x, o); }
      if (o.rover) { x.fillStyle = '#3a3e44'; for (const fx of [.15, .5, .85]) { x.fillRect(X + w * fx - 4, Y - 3, 8, 5); x.fillRect(X + w * fx - 4, Y + h - 2, 8, 5); } x.fillStyle = c; x.fillRect(X, Y, w, h); x.fillStyle = '#2c3e66'; x.fillRect(X + 4, Y + 4, w * .45, h - 8); x.fillStyle = '#9aa1aa'; circ(x, X + w * .78, Y + h / 2, 4); return edge(x, o); }
      x.fillStyle = c; x.fillRect(X, Y, w, h); x.fillStyle = '#bfe3f5';
      if (hz) { x.fillRect(X + w * .62, Y + 3, w * .14, h - 6); x.fillRect(X + w * .18, Y + 3, w * .1, h - 6); } else { x.fillRect(X + 3, Y + h * .2, w - 6, h * .14); x.fillRect(X + 3, Y + h * .7, w - 6, h * .1); }
      return edge(x, o);
    }
    case 'crate':
      if (o.printer) { x.fillStyle = c; x.fillRect(X, Y, w, h); x.fillStyle = '#5a5a62'; x.fillRect(X + 6, Y + 6, w - 12, 8); x.fillStyle = '#fff'; x.fillRect(X + 14, Y + h - 10, w - 28, 6); return edge(x, o); }
      if (o.trough) { x.fillStyle = c; x.fillRect(X, Y, w, h); x.fillStyle = '#6fb0d0'; x.fillRect(X + 3, Y + 3, w - 6, h - 6); return edge(x, o); }
      x.fillStyle = c; x.fillRect(X, Y, w, h); x.strokeStyle = shade(c, -.3); x.lineWidth = 3; x.strokeRect(X + 2.5, Y + 2.5, w - 5, h - 5); x.lineWidth = 2.5; x.beginPath(); x.moveTo(X + 4, Y + 4); x.lineTo(X + w - 4, Y + h - 4); x.moveTo(X + w - 4, Y + 4); x.lineTo(X + 4, Y + h - 4); x.stroke(); return edge(x, o);
    case 'shelf':
      x.fillStyle = c; x.fillRect(X, Y, w, h);
      if (o.fridge) { x.fillStyle = '#f2f2f6'; x.fillRect(X + 2, Y + 2, w - 4, h - 4); x.fillStyle = '#b8b8c0'; x.fillRect(X + 4, Y + h / 2 - 1, w - 8, 2); return edge(x, o); }
      if (o.plants) { for (let p = Y + 8; p < Y + h - 4; p += 12) { x.fillStyle = '#2e4a2c'; x.fillRect(X + 2, p - 4, w - 4, 8); x.fillStyle = '#6fd05a'; for (let q = X + 6; q < X + w - 2; q += 7) circ(x, q, p, 3); } return edge(x, o); }
      if (o.suits) { for (let p = X + 16; p < X + w; p += 30) { x.fillStyle = '#eef1f4'; circ(x, p, Y + h / 2, 10); x.fillStyle = '#2a3c5a'; ell(x, p, Y + h / 2 - 3, 6, 4); } return edge(x, o); }
      x.fillStyle = shade(c, .15); const r = seeded(Math.round(X + Y)); for (let p = 3; p < (hz ? w : h) - 3; p += 6) { x.fillStyle = ['#c0392b', '#2c3e50', '#d4a017', '#27ae60', '#ecf0f1'][Math.floor(r() * 5)]; hz ? x.fillRect(X + p, Y + 3, 4, h - 6) : x.fillRect(X + 3, Y + p, w - 6, 4); } return edge(x, o);
    case 'bed': if (o.med) { x.fillStyle = '#7d8590'; x.fillRect(X, Y, w, h); x.fillStyle = c; x.fillRect(X + 2, Y + 2, w - 4, h - 4); x.fillStyle = '#7fb3d0'; x.fillRect(X + w * .3, Y + 2, w * .68, h - 4); x.fillStyle = '#fff'; x.fillRect(X + 4, Y + 4, w * .2, h - 8); return edge(x, o); }
      x.fillStyle = '#3a3a40'; x.fillRect(X, Y, w, h); x.fillStyle = c; x.fillRect(X + 2, Y + 2, w - 4, h - 4); x.fillStyle = '#e9e6dc'; hz ? x.fillRect(X + 4, Y + 4, 16, h - 8) : x.fillRect(X + 4, Y + 4, w - 8, 16); x.fillStyle = shade(c, -.15); hz ? x.fillRect(X + w * .45, Y + 2, w * .53, h - 4) : x.fillRect(X + 2, Y + h * .45, w - 4, h * .53); return edge(x, o);
    case 'console': x.fillStyle = c; x.fillRect(X, Y, w, h); for (let p = X + 6; p < X + w - 14; p += 22) { x.fillStyle = '#0f1a1e'; x.fillRect(p, Y + 4, 18, h - 8); x.fillStyle = ['#5fffd0', '#ffcf33', '#ff5a4a', '#7fb3ff'][Math.floor(p / 22) % 4]; x.fillRect(p + 2, Y + 6, 14, h - 14); } return edge(x, o, .5);
    case 'cryo': x.fillStyle = '#5b6b72'; x.fillRect(X, Y, w, h); x.fillStyle = 'rgba(170,230,255,.75)'; rrect(x, X + 4, Y + 4, w - 8, h - 8, 8); x.fill(); x.fillStyle = 'rgba(40,70,60,.55)'; circ(x, X + w / 2, Y + 14, 5); ell(x, X + w / 2, Y + h / 2 + 6, 6, 16); x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(X + 7, Y + 8, 3, h - 16); return edge(x, o, .45);
    case 'tube': x.fillStyle = c; x.fillRect(X, Y, w, h); x.fillStyle = shade(c, .15); hz ? x.fillRect(X, Y + 2, w, h * .35) : x.fillRect(X + 2, Y, w * .35, h); x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 1; for (let p = 8; p < (hz ? w : h); p += 14) { x.beginPath(); hz ? (x.moveTo(X + p, Y), x.lineTo(X + p, Y + h)) : (x.moveTo(X, Y + p), x.lineTo(X + w, Y + p)); x.stroke(); } return edge(x, o, .3);
    case 'module': x.fillStyle = shade(c, -.1); x.fillRect(X, Y, w, h); x.fillStyle = c; x.fillRect(X + 3, Y + 3, w - 6, h - 6); x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 1; for (let p = X + 20; p < X + w; p += 20) { x.beginPath(); x.moveTo(p, Y + 3); x.lineTo(p, Y + h - 3); x.stroke(); }
      if (o.command) { x.fillStyle = '#2b3240'; rrect(x, X + 40, Y + 40, w - 80, h - 80, 10); x.fill(); x.fillStyle = '#5fbfff'; for (let p = X + 50; p < X + w - 50; p += 18) x.fillRect(p, Y + 48, 12, 6); }
      x.fillStyle = '#4a6b8a'; for (const f of [.25, .5, .75]) x.fillRect(X + w * f - 6, Y + 1, 12, 3); return edge(x, o, .35); // windows
    case 'solar': x.fillStyle = '#9aa1aa'; x.fillRect(X, Y, w, h); x.fillStyle = c; x.fillRect(X + 2, Y + 2, w - 4, h - 4); x.strokeStyle = 'rgba(160,190,255,.35)'; x.lineWidth = 1; for (let p = X + 2; p < X + w; p += 10) { x.beginPath(); x.moveTo(p, Y + 2); x.lineTo(p, Y + h - 2); x.stroke(); } x.beginPath(); x.moveTo(X + 2, Y + h / 2); x.lineTo(X + w - 2, Y + h / 2); x.stroke(); return;
    case 'chess': { // a giant piece seen from above: base ring, body, a crown that tells you which piece it is
      const cx = X + w / 2, cy = Y + h / 2, dark = c === '#2c2c33', fg = dark ? '#4a4a55' : '#ffffff', ln = dark ? '#18181c' : '#b8b0a2';
      x.fillStyle = dark ? '#18181c' : '#cfc7b8'; circ(x, cx, cy, w / 2 - 1); x.fillStyle = c; circ(x, cx, cy, w / 2 - 6); x.fillStyle = fg;
      if (o.piece === 'rook') { for (let a = 0; a < 6; a++) { x.save(); x.translate(cx, cy); x.rotate(a * TAU / 6); x.fillRect(12, -5, 9, 10); x.restore(); } circ(x, cx, cy, 10); }
      else if (o.piece === 'knight') { x.beginPath(); x.ellipse(cx + 4, cy, 18, 9, -.4, 0, TAU); x.fill(); x.fillStyle = ln; circ(x, cx + 12, cy - 6, 2.5); x.fillStyle = fg; circ(x, cx - 10, cy + 5, 7); }
      else if (o.piece === 'bishop') { circ(x, cx, cy, 14); x.strokeStyle = ln; x.lineWidth = 3; x.beginPath(); x.moveTo(cx - 8, cy - 8); x.lineTo(cx + 8, cy + 8); x.stroke(); x.fillStyle = ln; circ(x, cx, cy, 3); }
      else { for (let a = 0; a < 8; a++) circ(x, cx + Math.cos(a * TAU / 8) * 16, cy + Math.sin(a * TAU / 8) * 16, 4); circ(x, cx, cy, 11); x.fillStyle = ln; circ(x, cx, cy, 4); }
      return;
    }
    case 'generator': x.fillStyle = c; x.fillRect(X, Y, w, h); x.fillStyle = shade(c, .15); x.fillRect(X + 4, Y + 4, w - 8, 10); x.fillStyle = '#1e2124'; for (let p = Y + 20; p < Y + h - 6; p += 7) x.fillRect(X + 8, p, w - 16, 3); x.fillStyle = '#e8b326'; x.fillRect(X + w - 14, Y + 4, 8, 8); return edge(x, o, .5);
    case 'dj': x.fillStyle = c; x.fillRect(X, Y, w, h); x.fillStyle = '#0c0a0e'; for (const fx of [.2, .8]) { circ(x, X + w * fx, Y + h / 2, 14); x.fillStyle = '#2a2830'; circ(x, X + w * fx, Y + h / 2, 11); x.fillStyle = '#c9a227'; circ(x, X + w * fx, Y + h / 2, 2); x.fillStyle = '#0c0a0e'; }
      x.fillStyle = '#2b2733'; x.fillRect(X + w * .38, Y + 8, w * .24, h - 16); x.fillStyle = '#ff3fa4'; for (let p = 0; p < 4; p++) x.fillRect(X + w * .41 + p * 7, Y + 12, 4, 3); x.fillStyle = '#3fd4ff'; x.fillRect(X + w * .41, Y + h - 16, 26, 2); return edge(x, o, .5);
    case 'speaker': x.fillStyle = c; x.fillRect(X, Y, w, h); x.fillStyle = '#26232c'; const big = Math.min(w, h) * .32; if (h >= w) { circ(x, X + w / 2, Y + h * .3, big); circ(x, X + w / 2, Y + h * .72, big); x.fillStyle = '#0a090c'; circ(x, X + w / 2, Y + h * .3, big * .4); circ(x, X + w / 2, Y + h * .72, big * .4); } else { circ(x, X + w * .3, Y + h / 2, big); circ(x, X + w * .72, Y + h / 2, big); x.fillStyle = '#0a090c'; circ(x, X + w * .3, Y + h / 2, big * .4); circ(x, X + w * .72, Y + h / 2, big * .4); } return edge(x, o, .5);
    case 'bar': x.fillStyle = shade(c, -.2); x.fillRect(X, Y, w, h); x.fillStyle = c; x.fillRect(X + 3, Y + 3, w - 6, h - 6); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(X + 3, Y + 3, w - 6, 3);
      const r2 = seeded(Math.round(X + Y * 3)); for (let p = 10; p < (hz ? w : h) - 6; p += 13) { x.fillStyle = ['#7fcf5a', '#c9a227', '#d94a4a', '#cfe8ff'][Math.floor(r2() * 4)]; hz ? circ(x, X + p, Y + h / 2, 2.4) : circ(x, X + w / 2, Y + p, 2.4); } return edge(x, o, .45);
    case 'barrier': x.fillStyle = c; circ(x, X + w / 2, Y + 4, 4); x.fillStyle = '#9a7a1a'; x.fillRect(X + 1, Y + 4, w - 2, h - 4); return;
    case 'slide': x.fillStyle = c; x.fillRect(X, Y, w, h); x.fillStyle = shade(c, .25); x.fillRect(X + 4, Y + 3, w - 8, h - 6); x.fillStyle = '#888'; x.fillRect(X - 6, Y + 1, 6, h - 2); return edge(x, o);
    case 'table': if (o.lab) { x.fillStyle = c; x.fillRect(X, Y, w, h); x.fillStyle = '#d8eef2'; for (let p = X + 12; p < X + w - 6; p += 26) { x.fillRect(p, Y + 6, 8, 12); x.fillStyle = '#7fffc8'; x.fillRect(p + 1, Y + 12, 6, 5); x.fillStyle = '#d8eef2'; } return edge(x, o); }
      x.fillStyle = c; x.fillRect(X, Y, w, h); x.fillStyle = shade(c, .12); x.fillRect(X + 3, Y + 3, w - 6, h - 6); x.fillStyle = shade(c, -.3); for (let p = X + 14; p < X + w - 8; p += 26) { circ(x, p, Y - 6, 5); circ(x, p, Y + h + 6, 5); } return edge(x, o); // chairs along both sides
    default: // plain walls: a lit top edge so they read as height
      x.fillStyle = c; x.fillRect(X, Y, w, h); x.fillStyle = shade(c, .16); x.fillRect(X, Y, w, Math.min(4, h * .3)); x.fillStyle = shade(c, -.2); x.fillRect(X, Y + h - Math.min(3, h * .2), w, Math.min(3, h * .2));
  }
}

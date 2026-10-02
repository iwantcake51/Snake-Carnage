/* =========================================================
   BLOOD SYSTEM
   ========================================================= */
function splat(x, px, py, vx, vy, r, c, onWall) { // flat single-color splats with organic, directional shapes
  const sp = Math.hypot(vx, vy), a = Math.atan2(vy, vx), st = 1 + Math.min(sp / 170, onWall ? 1.1 : 2.4);
  x.save(); x.translate(px, py); x.rotate(a); x.fillStyle = c || BLOOD; x.globalAlpha = 1;
  if (sp < 110 || r > 3.2) { // slow or heavy drop: lumpy round blob, big ones get a crown of spikes
    circ(x, 0, 0, r);
    for (let k = randi(3, 6); k > 0; k--) { const la = rand(0, TAU), ld = r * rand(.35, .75); circ(x, Math.cos(la) * ld, Math.sin(la) * ld, r * rand(.45, .75)); }
    if (r > 2.6) for (let k = randi(4, 8); k > 0; k--) {
      const la = rand(0, TAU), len = r * rand(1.3, 2.4), w = r * rand(.12, .25);
      x.beginPath(); x.moveTo(Math.cos(la + 1.57) * w, Math.sin(la + 1.57) * w); x.lineTo(Math.cos(la) * len, Math.sin(la) * len); x.lineTo(Math.cos(la - 1.57) * w, Math.sin(la - 1.57) * w); x.fill();
      if (Math.random() < .5) circ(x, Math.cos(la) * (len + r * .5), Math.sin(la) * (len + r * .5), r * rand(.12, .25));
    }
  } else { // fast drop: stretched body, tapered tail pointing the way it flew, droplets thrown ahead
    const L = r * st, ry = r * (onWall ? 1.15 : rand(.8, 1));
    ell(x, 0, 0, L, ry);
    circ(x, -L * .45, rand(-.25, .25) * ry, ry * rand(.75, 1));
    const tail = L + r * rand(1.2, 2.6) * st * .6;
    x.beginPath(); x.moveTo(L * .55, -ry * .45); x.quadraticCurveTo(tail * .8, rand(-.3, .3), tail, rand(-.4, .4)); x.quadraticCurveTo(tail * .8, rand(-.3, .3), L * .55, ry * .45); x.fill();
    for (let k = randi(1, 3); k > 0; k--) circ(x, tail + r * rand(.8, 3) * st * .5, rand(-r, r) * .5, r * rand(.15, .35));
    if (Math.random() < .4) circ(x, rand(-L, L * .5), (Math.random() < .5 ? -1 : 1) * ry * rand(1.4, 2.2), r * rand(.12, .25)); // side fleck
  }
  if (r > 2.2 && !onWall) for (let k = randi(2, 6); k > 0; k--) circ(x, rand(-r * 4, r * 5), rand(-r * 3, r * 3), rand(.3, .7)); // fine mist
  x.restore();
  if (!onWall && r > 1.5 && grassAt(px, py)) { // a few blades of grass poking through
    const g = grassColAt(px, py); x.strokeStyle = `rgb(${g[0] + 12},${g[1] + 14},${g[2]})`; x.lineWidth = .8; x.globalAlpha = .9;
    for (let k = randi(1, 3); k > 0; k--) { const bx = px + rand(-r * 1.6, r * 1.6), by = py + rand(-r, r); x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + rand(-1, 1), by - rand(1.5, 3.2)); x.stroke(); }
    x.globalAlpha = 1;
  }
}

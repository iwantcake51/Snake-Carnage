/* =========================================================
   OBSTACLE DRAWING
   ========================================================= */
function drawObstacle(x, o) {
  const c = o.color;
  if (o.t === 'c') {
    x.fillStyle = c; circ(x, o.x, o.y, o.r);
    if (o.kind === 'tree' || o.kind === 'bush') {
      x.fillStyle = shade(c, .15); circ(x, o.x - o.r * .25, o.y - o.r * .25, o.r * .6);
      x.fillStyle = shade(c, .3); circ(x, o.x - o.r * .35, o.y - o.r * .35, o.r * .25);
    } else if (o.kind === 'rock') { x.fillStyle = shade(c, .2); circ(x, o.x - o.r * .3, o.y - o.r * .3, o.r * .45); }
    else if (o.kind === 'water') drawWater(x, o, 0); // static version (thumbnails); animated copy is drawn every frame else if (o.kind === 'lamp') { x.fillStyle = '#fff1bf'; circ(x, o.x, o.y, o.r * .5); }
    else if (o.kind === 'hay') { x.strokeStyle = shade(c, -.2); x.lineWidth = 2; x.beginPath(); x.arc(o.x, o.y, o.r * .55, 0, TAU); x.stroke(); }
    else if (o.kind === 'silo') { x.fillStyle = shade(c, -.15); circ(x, o.x, o.y, o.r * .72); x.fillStyle = shade(c, .1); circ(x, o.x, o.y, o.r * .25); }
    else { x.fillStyle = shade(c, .12); circ(x, o.x, o.y, o.r * .6); }
    return;
  }
  if (o.kind === 'water') return drawWater(x, o, 0);
  x.fillStyle = c; x.fillRect(o.x, o.y, o.w, o.h);
  const k = o.kind, hz = o.w >= o.h;
  if (k === 'building' || k === 'barn') {
    x.fillStyle = shade(c, -.14);
    if (hz) x.fillRect(o.x, o.y + o.h / 2, o.w, o.h / 2); else x.fillRect(o.x + o.w / 2, o.y, o.w / 2, o.h);
    x.strokeStyle = shade(c, -.3); x.lineWidth = 2; x.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
    if (k === 'barn') {
      x.strokeStyle = '#f2efe6'; x.lineWidth = 4;
      x.beginPath(); x.moveTo(o.x + 8, o.y + 8); x.lineTo(o.x + o.w - 8, o.y + o.h - 8);
      x.moveTo(o.x + o.w - 8, o.y + 8); x.lineTo(o.x + 8, o.y + o.h - 8); x.stroke();
    }
  } else if (k === 'car') {
    x.fillStyle = '#bfe3f5';
    if (hz) { x.fillRect(o.x + o.w * .62, o.y + 3, o.w * .14, o.h - 6); x.fillRect(o.x + o.w * .18, o.y + 3, o.w * .1, o.h - 6); }
    else { x.fillRect(o.x + 3, o.y + o.h * .2, o.w - 6, o.h * .14); x.fillRect(o.x + 3, o.y + o.h * .7, o.w - 6, o.h * .1); }
  } else if (k === 'fence') {
    x.fillStyle = shade(c, -.3);
    if (hz) for (let p = o.x; p < o.x + o.w; p += 16) x.fillRect(p, o.y - 1, 5, o.h + 2);
    else for (let p = o.y; p < o.y + o.h; p += 16) x.fillRect(o.x - 1, p, o.w + 2, 5);
  } else if (k === 'desk') {
    x.fillStyle = '#2a2a33'; x.fillRect(o.x + o.w / 2 - 12, o.y + 4, 24, 6);
    x.fillStyle = '#ddd'; x.fillRect(o.x + o.w / 2 - 10, o.y + o.h - 12, 20, 5);
  } else if (k === 'couch' || k === 'bench') {
    x.fillStyle = shade(c, -.18);
    if (hz) x.fillRect(o.x, o.y, o.w, o.h * .35); else x.fillRect(o.x, o.y, o.w * .35, o.h);
  } else {
    x.fillStyle = shade(c, .14); x.fillRect(o.x, o.y, o.w, Math.min(4, o.h * .3));
  }
}

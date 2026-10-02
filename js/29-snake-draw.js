function drawSnake(x, s = snake, cfg = SETTINGS.snake) {
  const n = s.segs.length;
  // gentle side-to-side slither while moving (visual only; collisions use the real path)
  const moving = s === snake && s.started && s.alive && state === 'play';
  s.wv = (s.wv || 0) + ((moving ? 1 : 0) - (s.wv || 0)) * .08;
  const pts = s.segs.map((g, i) => {
    const amp = s.wv * 1.7 * Math.min(1, i / 4) * Math.max(0, 1 - i / (n + 6)), o = Math.sin(i * .55 - T * 9) * amp;
    return { x: g.x - Math.sin(g.a) * o, y: g.y + Math.cos(g.a) * o, a: g.a };
  });
  if (s === snake) s._pts = pts;
  const ol = SETTINGS.snakeOutline || 'Subtle';
  if (ol !== 'Off') { // visibility rim: faint light halo plus a dark edge, readable on any ground
    const strong = ol === 'Strong';
    for (const [grow, col] of [[strong ? 3.8 : 2.8, `rgba(255,255,255,${strong ? .24 : .11})`], [strong ? 1.9 : 1.3, `rgba(8,5,5,${strong ? .85 : .5})`]]) {
      x.fillStyle = col; x.beginPath();
      for (let i = 0; i < n; i++) { const g = pts[i], r = segR(i, n) + grow; x.moveTo(g.x + r, g.y); x.arc(g.x, g.y, r, 0, TAU); }
      x.fill();
    }
  }
  for (let i = n - 1; i >= 0; i--) {
    const g = pts[i], r = segR(i, n);
    const sts = s.stains[i] || [], soak = Math.min(.55, sts.length / 50);
    const base = segColor(i, n, cfg);
    x.fillStyle = soak ? mixColor(base, soakCol(sts), soak) : base;
    circ(x, g.x, g.y, r);
    patternOverlay(x, g, r, i, cfg);
    if (sts.length) { x.save(); x.translate(g.x, g.y); x.rotate(g.a); x.drawImage(stainSprite(sts), -r, -r, r * 2, r * 2); x.restore(); }
  }
  x.save(); x.translate(s.x, s.y); x.rotate(s.angle);
  drawEyes(x, cfg, segColor(0, n, cfg));
  drawHat(x, cfg.hat);
  x.restore();
}

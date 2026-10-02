function snakeShadowPath(x, ox, oy) { // circles joined by quads (all clockwise, so nonzero fill = one solid shape, no notches)
  const sg = snake.segs, n = sg.length;
  for (let i = 0; i < n; i++) {
    const g = sg[i], r = segR(i, n), sx = g.x + ox, sy = g.y + oy; x.moveTo(sx + r, sy); x.arc(sx, sy, r, 0, TAU);
    if (i === n - 1) continue;
    const h = sg[i + 1], r2 = segR(i + 1, n), dx = h.x - g.x, dy = h.y - g.y, d = Math.hypot(dx, dy); if (d < .01) continue;
    const nx = -dy / d, ny = dx / d; // with y down, this order winds clockwise like arc()
    x.moveTo(sx + nx * r, sy + ny * r); x.lineTo(sx - nx * r, sy - ny * r); x.lineTo(h.x + ox - nx * r2, h.y + oy - ny * r2); x.lineTo(h.x + ox + nx * r2, h.y + oy + ny * r2); x.closePath();
  }
}
function render() {
  const x = sctx, L = light, sh = shake && SETTINGS.shake ? shake : 0;
  V.sx = sh ? rand(-sh, sh) : 0; V.sy = sh ? rand(-sh, sh) : 0; V.z = 0;
  if (cam) { // spawn camera: starts tight on the snake, eases out to the full map
    const q = cam.hold ? 0 : Math.min(1, cam.t / cam.dur), p = q < .5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2, fp = Math.pow(p, 2.5);
    V.z = Math.pow(cam.z0, 1 - p); V.fx = snake.x + (W / 2 - snake.x) * fp; V.fy = snake.y + (H / 2 - snake.y) * fp;
  }
  V.ox = camF.x + camF.k.x; V.oy = camF.y + camF.k.y;
  x.setTransform(DPR, 0, 0, DPR, 0, 0);
  x.fillStyle = MAPS[mapIdx].border; x.fillRect(0, 0, W, H);
  applyView(x);
  x.drawImage(baseC, 0, 0, W, H);
  x.drawImage(groundC, 0, 0, W, H);
  for (const b of bucketList) { x.globalAlpha = bucketAlpha(b); x.drawImage(b.f, 0, 0, W, H); }
  x.globalAlpha = L.salpha; x.drawImage(shadowC, 0, 0, W, H); x.globalAlpha = 1;
  x.fillStyle = `rgba(0,0,0,${L.salpha})`; x.beginPath(); // creature + snake shadows as one shape
  for (const c of creatures) if (c.alive) { const r = c.def.r * .85, sx = c.x + L.sdx * 5, sy = c.y + L.sdy * 5; x.moveTo(sx + r, sy); x.arc(sx, sy, r, 0, TAU); }
  snakeShadowPath(x, L.sdx * 6, L.sdy * 6);
  x.fill();
  for (const c of creatures) if (c.alive) drawCreature(x, c);
  drawFlashBodies(x);
  drawTrail(x); drawGround(x); drawSnake(x);
  x.drawImage(obsC, 0, 0, W, H);
  drawWaters(x);
  for (const b of bucketList) { x.globalAlpha = bucketAlpha(b); x.drawImage(b.w, 0, 0, W, H); }
  x.globalAlpha = 1;
  x.drawImage(outlineC, 0, 0, W, H);
  x.lineCap = 'round'; x.strokeStyle = BLOOD;
  for (const p of parts) { // airborne drops drawn as motion streaks
    const py = p.y - p.z * .25; x.lineWidth = p.r * 2 * (1 + p.z / 80);
    x.beginPath(); x.moveTo(p.x - p.vx * .016, py - p.vy * .016); x.lineTo(p.x + .01, py); x.stroke();
  }
  drawDebris(x); drawGiblets(x);
  drawLighting(x);
  drawSparks(x);
  drawVisionMask(x);
  x.setTransform(DPR, 0, 0, DPR, 0, 0);

  // pixelation
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const px = Math.max(1, SETTINGS.pixel | 0);
  if (px > 1) {
    const lw = Math.ceil(W / px), lh = Math.ceil(H / px);
    if (lowC.width !== lw || lowC.height !== lh) { lowC.width = lw; lowC.height = lh; }
    lctx.drawImage(sceneC, 0, 0, lw, lh);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(lowC, 0, 0, cv.width, cv.height); ctx.imageSmoothingEnabled = true;
  } else ctx.drawImage(sceneC, 0, 0);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (nightVision) { // green phosphor look done in-canvas, so the overlays after it keep their real colors
    ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#86f59a'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(0,12,4,.16)'; ctx.fillRect(0, 0, W, H);
  }
  ctx.save(); applyView(ctx); // crisp overlays above blood and lighting
  drawGoldenFX(ctx);
  drawTargetOutlines(ctx);
  drawSnakeNightRim(ctx);
  if (nightVision) drawNVHighlights(ctx);
  if (!cam) drawBubbles(ctx);
  ctx.restore();
  if (nightVision) drawNightVision(ctx);
  if (toastT > 0) {
    toastT -= 1 / 60;
    ctx.globalAlpha = Math.min(1, toastT * 3); ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.font = 'bold 14px sans-serif';
    const tw = ctx.measureText(toastMsg).width + 24; rrect(ctx, W / 2 - tw / 2, H - 60, tw, 28, 8); ctx.fill();
    ctx.fillStyle = '#eee'; ctx.textAlign = 'center'; ctx.fillText(toastMsg, W / 2, H - 41); ctx.globalAlpha = 1;
  }
  const base = SETTINGS.darkness * .2, kv = SETTINGS.vignette ? killV : 0;
  if (base > 0 || kv > .01) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * (.56 - .05 * kv), W / 2, H / 2, H * .92);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(${Math.round(70 * kv)},0,0,${Math.min(.4, base + .15 * kv)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (state === 'ready' && !cam) {
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(W / 2 - 190, H - 70, 380, 40);
    ctx.fillStyle = '#ddd'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Press an arrow key or WASD to start', W / 2, H - 44);
  }
  const sat = SETTINGS.desaturate && !nightVision ? clamp(1 - killFlash * .5, .45, 1) : 1;
  const f = nightVision ? `contrast(1.15) brightness(${(.95 - SETTINGS.darkness * .2).toFixed(2)})` : `saturate(${sat.toFixed(2)}) brightness(${(1 - SETTINGS.darkness).toFixed(2)}) contrast(1.08)`;
  if (f !== lastFilter) { cv.style.filter = f; lastFilter = f; }
  const clock = (MAPS[mapIdx].indoor ? '🏢 ' : light.day > .5 ? '☀️ ' : light.day > .05 ? '🌇 ' : '🌙 ') +
    String(Math.floor(tod)).padStart(2, '0') + ':' + String(Math.floor(tod % 1 * 60)).padStart(2, '0');
  if (clockEl.textContent !== clock) clockEl.textContent = clock;
}
const clockEl = document.getElementById('clock');
let nightVision = false, toastMsg = '', toastT = 0;
function toast(m) { notify({ kind: 'info', title: m, dur: 1.8, key: 'toast:' + m }); }
const NOISE = Array.from({ length: 4 }, () => { // a few pre-made static frames
  const c = document.createElement('canvas'); c.width = 240; c.height = 160;
  const x = c.getContext('2d'), im = x.createImageData(240, 160);
  for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  x.putImageData(im, 0, 0); return c;
});
const SCANLINES = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 4; const x = c.getContext('2d'); x.fillStyle = 'rgba(0,0,0,.07)'; x.fillRect(0, 0, 4, 1); x.fillRect(0, 2, 4, 1); return c; })();
const nvMC = document.createElement('canvas'), nvmx = (() => { nvMC.width = W; nvMC.height = H; return nvMC.getContext('2d'); })();
function drawNVHighlights(x) { // drawn after the green tint, so the rings stay pure white and sit above blood
  x.save();
  let out = nvOutC;
  if (MOD.fog || MOD.fow) { // only outline what you can actually see: cut the hidden area out using the vision mask
    nvmx.globalCompositeOperation = 'copy'; nvmx.drawImage(nvOutC, 0, 0, nvMC.width, nvMC.height);
    nvmx.globalCompositeOperation = 'destination-out'; nvmx.drawImage(visC, 0, 0, nvMC.width, nvMC.height); nvmx.globalCompositeOperation = 'source-over';
    out = nvMC;
  }
  x.globalAlpha = .3; x.drawImage(out, 0, 0, W, H); x.globalAlpha = 1;
  for (const c of creatures) {
    const vis = playerSees(c.x, c.y);
    if (!c.alive || vis < .05) continue;
    x.globalAlpha = vis;
    const hum = c.def.human, pulse = c.state === 'panic' ? .5 + .5 * Math.sin(T * 12) : 0, r = c.def.r + 4 + pulse * 2;
    x.strokeStyle = `rgba(255,255,255,${hum ? .85 : .6})`; x.lineWidth = hum ? 1.4 : 1;
    if (!hum) x.setLineDash([3, 3]);
    x.beginPath(); x.arc(c.x, c.y, r, 0, TAU); x.stroke(); x.setLineDash([]);
  }
  x.globalAlpha = 1;
  if (snake) { x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 1.6; x.beginPath(); x.arc(snake.x, snake.y, CONFIG.snakeR + 4, 0, TAU); x.stroke(); }
  x.restore();
}
function drawNightVision(x) {
  x.save();
  x.globalAlpha = .035; x.imageSmoothingEnabled = false;
  x.drawImage(state === 'dead' ? NOISE[0] : pick(NOISE), rand(-20, 0), rand(-20, 0), W + 40, H + 40);
  x.imageSmoothingEnabled = true; x.globalAlpha = 1;
  x.fillStyle = x.createPattern(SCANLINES, 'repeat'); x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * .8);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(200,255,200,.8)'; x.font = 'bold 12px monospace'; x.textAlign = 'left';
  x.textAlign = 'right'; if (T % 1 < .6) x.fillText('● NV', W - 22, H - 22);
  x.restore();
}
let last = performance.now();
let frameMs = 16, lowFx = false, fastT = 0; // adaptive quality: if frames run slow, lighting gets cheaper (with hysteresis)
function frame(now) {
  const raw = now - last; if (raw < 200) frameMs += (raw - frameMs) * .03;
  if (!lowFx && frameMs > 24) { lowFx = true; fastT = 0; }
  else if (lowFx && frameMs < 15) { if ((fastT += raw) > 8000) lowFx = false; } else fastT = 0; // only back to full quality after 8s of clearly fast frames
  const dt = Math.min(.033, raw / 1000); last = now;
  update(dt); render(); requestAnimationFrame(frame);
}

overlay.addEventListener('pointermove', e => { // mouse parallax on the menu
  const r = overlay.getBoundingClientRect(), mx = (e.clientX - r.left) / r.width * 2 - 1, my = (e.clientY - r.top) / r.height * 2 - 1;
  overlay.style.setProperty('--mx', mx.toFixed(3)); overlay.style.setProperty('--my', my.toFixed(3));
  if (state === 'menu') cv.style.translate = `${(-mx * 2.5).toFixed(1)}px ${(-my * 1.6).toFixed(1)}px`; // deepest layer, moves least
});

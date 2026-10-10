function snakeShadowPath(x, ox, oy) { // round, soft-edged discs per segment, like everyone else's shadow
  const sg = snake.segs, n = sg.length;
  for (let i = 0; i < n; i++) { const g = sg[i], r = segR(i, n) * .95, sx = g.x + ox, sy = g.y + oy; x.moveTo(sx + r, sy); x.arc(sx, sy, r, 0, TAU); }
}
function render() {
  const bz = Math.max(boomDaze(), gasScreen() * .8), pxS = Math.max(1, SETTINGS.pixel | 0), wob = snake && ((snake.wallStun > 0 && !SETTINGS.simpleFx) || (snake.ramT > 0 && !SETTINGS.reduceFlash)); // (a blast's daze needs no copy of the frame: the camera sways the world itself, below, and its double vision reads the screen)
  render.n = (render.n || 0) + 1; // a frame number, so the edge blur shrinks each frame once
  const eb = (EDGE_K.lb > .03 || EDGE_K.fk > .03) && !SETTINGS.simpleFx, direct = pxS <= 1 && !wob; render.src = direct ? cv : sceneC; // (a lunge's edge blur reads the screen itself: it needs no copy of the frame) // no post effect this frame: draw straight to the screen and skip a full-frame copy
  const x = direct ? ctx : sctx, L = light, sh = shake && SETTINGS.shake && state !== 'paused' ? shake * (SETTINGS.shakeK ?? 1) : 0; // paused: the picture holds still, even mid-blast
  V.sx = sh ? rand(-sh, sh) : 0; V.sy = sh ? rand(-sh, sh) : 0; V.z = 0;
  if (cam) { // spawn camera: starts tight on the snake, eases out to the full map
    const q = cam.hold ? 0 : Math.min(1, cam.t / cam.dur), p = q < .5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2, fp = Math.pow(p, 2.5);
    V.z = Math.pow(cam.z0, 1 - p); V.fx = snake.x + (W / 2 - snake.x) * fp; V.fy = snake.y + (H / 2 - snake.y) * fp; if (cam.z0 <= 1) { V.fx = W / 2; V.fy = H / 2; }
  }
  V.ox = camF.x + camF.k.x; V.oy = camF.y + camF.k.y;
  const uc = !cam && userCam(); if (uc) { V.z = uc.z; V.fx = uc.fx; V.fy = uc.fy; } // the player's zoom/pan (the spawn zoom has priority)
  lookAround();
  const cw = snake && snake.wallStun > 0 ? Math.pow(snake.wallStun / (snake.wallMax || 3.4), .6) * (snake.stunFx || 1) : 0;
  if (bz > .02 && !SETTINGS.reduceMotion) { V.ox += (Math.sin(T * 1.6) * 4 + Math.sin(T * 3.7) * 1.5) * bz; V.oy += (Math.sin(T * 1.2 + 2) * 3 + Math.sin(T * 3.1) * 1.2) * bz; } // reeling from a blast: the world sways, gentler than after a wall
  if (cw > 0) { V.ox += (Math.sin(T * 1.25) * 7 + Math.sin(T * 2.9) * 2) * cw; V.oy += (Math.sin(T * .95 + 1.2) * 5 + Math.sin(T * 2.3) * 1.5) * cw; } // the room sways after a wall
  const st0 = snake && snake.ramT > 0 ? Math.min(1, Math.pow(snake.ramT / (snake.ramMax || 1), .6) * (snake.stunFx || 1)) : 0;
  const olOff = st0 > .3 || boomDaze() > .05; // (a light knock leaves them) // smashed through something, or shaken by a blast
  const olT = (olOff ? 0 : 1) * (typeof GAS_SEE === 'number' ? GAS_SEE : 1); // (in gas you can't make out anyone's outline either: 38g)
  render.olk = (render.olk ?? 1) + (olT - (render.olk ?? 1)) * (olT < (render.olk ?? 1) ? .25 : .03); // everything else's outlines drop out fast, stay gone while dizzy or in gas, then creep back (yours stays)
  render.dazed = st0 > .3;
  x.setTransform(DPR, 0, 0, DPR, 0, 0);
  x.fillStyle = MAPS[mapIdx].border; x.fillRect(0, 0, W, H);
  applyView(x);
  x.drawImage(baseC, 0, 0, W, H);
  x.drawImage(groundC, 0, 0, W, H);
  if (MAPS[mapIdx].club) drawDanceFloor(x);
  drawCustomFx(x, 'floor'); // moving materials on the ground (custom maps and edited shapes only; empty otherwise)
  drawPlants(x); drawGrass(x); drawGasStains(x); // (gas bomb stains: under the blood and everyone)
  for (const b of bucketList) { if (!b.fd) continue; x.globalAlpha = bucketAlpha(b); x.drawImage(b.f, 0, 0, W, H); }
  x.globalAlpha = 1; drawSnow(x); // (no fake pool reflections: the pools are just blood)
  if (shadowsOn()) { x.globalAlpha = L.salpha; x.drawImage(shadowC, 0, 0, W, H); x.globalAlpha = 1; } // baked sun shadows (Static and Full)
  if (movingShadows()) { x.fillStyle = `rgba(0,0,0,${L.salpha})`; x.beginPath(); // creature + snake shadows as one shape (Full only)
    for (const c of creatures) if (c.alive) { const r = c.def.r * .85, sx = c.x + L.sdx * 5, sy = c.y + L.sdy * 5; x.moveTo(sx + r, sy); x.arc(sx, sy, r, 0, TAU); }
    snakeShadowPath(x, L.sdx * 6, L.sdy * 6);
    x.fill(); }
  drawAO(x); drawLeashes(x);
  for (const c of creatures) if (c.alive) drawCreature(x, c);
  drawFlashBodies(x); drawHitGhosts(x);
  drawGiblets(x); // chunks on the ground sit under the snake
  drawTrail(x); drawGround(x); drawHoovFx(x); if (NETM.run) netDrawSnakes(x); if (!(snake && snake.netHidden)) drawSnake(x); drawCorpses(x); drawHats(x); drawClods(x, false); drawRamCharge(x); drawStreaks(x); drawSnowFx(x);
  if ((render.olk ?? 1) > .995 || SETTINGS.mapOutlines === 'Off') x.drawImage(obsC, 0, 0, W, H); else { x.drawImage(plainC, 0, 0, W, H); if (render.olk > .01) { x.globalAlpha = render.olk; x.drawImage(outlineC, 0, 0, W, H); x.globalAlpha = 1; } } drawFixtures(x); drawTrees(x); // outlines only cost extra while they're fading
  drawWaters(x); drawCustomFx(x, 'top');
  for (const b of bucketList) { if (!b.wd) continue; x.globalAlpha = bucketAlpha(b); x.drawImage(b.w, 0, 0, W, H); }
  x.globalAlpha = 1;
  drawDrops(x);
  drawDebris(x); drawMist(x); drawSmoke(x); drawVomit(x);
  drawLighting(x); drawPropGlow(x);
  drawLampBugs(x); drawFireflyGlow(x);
  drawSparks(x); drawImpacts(x);
  drawBurnHeat(x, render.src); // you're burning: the world round you shimmers (before the markers, so they stay sharp)
  drawAirstrikes(x); // under the fog: a marker you can't see stays hidden
  drawVisionMask(x);
  drawAirFog(x); // ...but a blast still lights the fog up
  const px = Math.max(1, SETTINGS.pixel | 0);
  if (px > 1 || render.dazed) { drawGoldenFX(x); x.globalAlpha = render.olk ?? 1; drawTargetOutlines(x); x.globalAlpha = 1; drawSnakeNightRim(x); } // pixelated look: outlines go through the same pixelation
  x.setTransform(DPR, 0, 0, DPR, 0, 0);

  // pixelation
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (px > 1) {
    const lw = Math.ceil(W / px), lh = Math.ceil(H / px);
    if (lowC.width !== lw || lowC.height !== lh) { lowC.width = lw; lowC.height = lh; }
    lctx.drawImage(sceneC, 0, 0, lw, lh);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(lowC, 0, 0, cv.width, cv.height); ctx.imageSmoothingEnabled = true;
  } else if (!direct) ctx.drawImage(sceneC, 0, 0);
  let ca = 0; // the double vision, wanted by a wall, a blast or dying: drawn once with the strongest
  const ws = snake && snake.wallStun > 0 ? Math.min(1.5, Math.pow(snake.wallStun / (snake.wallMax || 3.4), .6) * (snake.stunFx || 1)) : 0;
  if (ws > .02 && px <= 1 && !SETTINGS.simpleFx) { // seeing stars after a wall: the picture wobbles in slow waves, fading with the daze
    const bh = Math.ceil(cv.height / 28), amp = 7 * ws * DPR; // (fewer, taller bands: each is a draw of the whole width)
    for (let y = 0; y < cv.height; y += bh) { const o = Math.sin(y / cv.height * 9 + T * 3.1) * amp + Math.sin(T * 1.7 + y * .01) * amp * .4; ctx.drawImage(sceneC, 0, y, cv.width, bh, o, y, cv.width, bh); }
    if (!SETTINGS.reduceFlash && !SETTINGS.simpleFx) ca = Math.min(1, ws);
  } else if (bz > .2 && px <= 1 && !SETTINGS.simpleFx) { // close to a blast: double vision, by how close it was (the world reels through the camera, above: no copy of the frame needed)
    if (!SETTINGS.reduceFlash) ca = .5 * bz;
  }
  if (dfxSince && px <= 1 && !SETTINGS.reduceFlash && !SETTINGS.simpleFx) { const u = (performance.now() - dfxSince) / 700; if (u < 1) ca = Math.max(ca, .9 * (1 - u) ** 1.5); } // the moment you die: the picture shudders apart
  if (ca > .01) chromaSplit(ca); // once a frame, however many things want it
  if (snake && snake.ramT > 0 && px <= 1 && !SETTINGS.reduceFlash) { const bk = Math.pow(snake.ramT / (snake.ramMax || 1), .6) * (snake.stunFx || 1); concussBloom(bk * (snake.wallStun > 0 ? .26 : .1)); } // any daze blooms; walls much more
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (nightVision) { // green phosphor look done in-canvas, so the overlays after it keep their real colors
    ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#86f59a'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(0,12,4,.16)'; ctx.fillRect(0, 0, W, H);
  }
  ctx.save(); applyView(ctx); // crisp overlays above blood and lighting
  if (px <= 1 && !render.dazed) { drawGoldenFX(ctx); if ((render.olk ?? 1) > .02) { ctx.globalAlpha = render.olk ?? 1; drawTargetOutlines(ctx); ctx.globalAlpha = 1; } drawSnakeNightRim(ctx); } // (faded right out, as after a blast: not drawn at all; its last rims are cleared on its next draw)
  if (nightVision) drawNVHighlights(ctx);
  drawWinStars(ctx); drawScent(ctx); drawNearMiss(ctx); drawHissWave(ctx); drawCrashFlash(ctx);
  drawShockwaves(ctx, cv); // last: blasts bend the whole picture behind them, outlines and all
  ctx.restore();
  if (eb) lungeEdges();
  if (EDGE_K.lb > .03 || EDGE_K.fk > .03) lungeLines(); // the tint and speed lines (even with simplified effects: they're cheap)
  drawBurnHaze(ctx); drawBurnEdge(ctx); drawBurnFlames(ctx); // on fire: a restrained orange glow from the edges, and flames licking up the bottom of the screen
  drawGasEdge(ctx); // in gas: the edges go sickly green
  drawAirFlash(ctx);
  if (NETM.run && !cam) netDrawTags(ctx); // co-op: teammates' names and where they are off screen
  if (!cam) drawBubbles(ctx); // screen space (positions go through the camera), so text stays readable at any zoom
  if (nightVision) drawNightVision(ctx);
  const stunRaw = snake && snake.ramT > 0 ? Math.min(1, Math.pow(snake.ramT / (snake.ramMax || 1), .45) * (snake.stunFx || 1)) : 0; // dazed after smashing through something
  render.stunS = (render.stunS || 0) + (stunRaw - (render.stunS || 0)) * (stunRaw > (render.stunS || 0) ? 1 : .06); // the hit lands instantly, then drains slowly as speed returns
  const stun = render.stunS < .01 ? 0 : render.stunS, wallT = snake && snake.wallStun > 0 ? 1 : 0;
  render.wallS = (render.wallS || 0) + (wallT - (render.wallS || 0)) * (wallT ? .35 : .05); // a wall's heavier look eases back to the lighter one
  if (stun > 0) dazeEdges(stun, render.wallS);
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
  const pg = (state === 'ready' || state === 'intro' || state === 'loading') && !(snake && snake.started);
  stage.classList.toggle('started', !!(snake && snake.started && state !== 'menu')); // the modifier bar steps aside once you're moving
  if (pg !== !!render.pg) { render.pg = pg; stage.classList.toggle('pregame', pg); if (!pg) { stage.classList.add('hudin'); clearTimeout(render.hudT); render.hudT = setTimeout(() => stage.classList.remove('hudin'), 900); } }
  const wantStart = state === 'ready' && !cam;
  if (wantStart !== !!render.startShown) { render.startShown = wantStart; wantStart ? showResume('to begin') : hideResume(); }
  const sat = (SETTINGS.desaturate && !nightVision ? clamp(1 - killFlash * .5, .45, 1) : 1) * (1 - .93 * stun) * (1 - .92 * dfxK) * (1 - .78 * bz) * (1 - .85 * gasScreen()); // dying drains it to grey; so does a blast close by, and breathing gas
  const f = nightVision ? `contrast(1.15) brightness(${((.95 - SETTINGS.darkness * .2) * (1 - .2 * boomDaze())).toFixed(2)})${dfxK ? ` grayscale(${(.92 * dfxK).toFixed(2)})` : ''}` : `saturate(${sat.toFixed(2)}) brightness(${((1 - SETTINGS.darkness) * (1 - .36 * dfxK) * (1 - .2 * boomDaze())).toFixed(2)}) contrast(${(1.08 + .42 * dfxK).toFixed(2)})`; // dying: grey and hard, the blacks crushed under the red
  if (f !== lastFilter) { cv.style.filter = f; lastFilter = f; }
  const ic = MAPS[mapIdx].indoor ? 'tod_indoor' : light.day > .5 ? 'tod_day' : light.day > .05 ? 'tod_dusk' : 'tod_night', clock = String(Math.floor(tod)).padStart(2, '0') + ':' + String(Math.floor(tod % 1 * 60)).padStart(2, '0');
  if (clockEl.textContent !== clock) clockEl.textContent = clock;
  if (clockIc.dataset.k !== ic) { clockIc.dataset.k = ic; clockIc.className = 'bi ' + ic; clockIc.innerHTML = giSvg(ic); } // sun, sunset, moon (or a lamp indoors)
}
const clockEl = document.getElementById('clockT'), clockIc = document.getElementById('clockIc');
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
  if (snake && !snake.netHidden) { x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 1.6; x.beginPath(); x.arc(snake.x, snake.y, snakeRadius() + 4, 0, TAU); x.stroke(); }
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
let frameMs = 16, lowFx = 0, fastT = 0, slowT = 0, lowFxSaid = false; // adaptive quality: 1 = cheaper lighting while frames run slow (with hysteresis); 2 = lighting off and snow simplified for the rest of the run (Automatic quality)
const blurTmp = document.createElement('canvas');
function bakeBlurBg() { // blur the frozen frame into its own pixels once, so the menu on top can scroll without anything re-blurring
  try { blurTmp.width = cv.width; blurTmp.height = cv.height; const t = blurTmp.getContext('2d'); t.drawImage(cv, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = `blur(${Math.round(6 * DPR)}px) saturate(.35) brightness(.8)`; ctx.drawImage(blurTmp, 0, 0); ctx.restore(); ctx.filter = 'none'; } catch (e) {}
}
function frame(now) {
  const hbOff = !['play', 'ready', 'intro', 'held'].includes(state); if (bar.hidden !== hbOff) bar.hidden = hbOff; // the in-run stats are for the run itself (they sit above the menus' layer, so they step aside for pause, the summary and every menu)
  if (bdHud.on && hbOff !== !!bdHud.off) { bdHud.off = hbOff; const be = document.getElementById('bdebt'); if (be) be.hidden = hbOff; } // Blood Debt's pill goes with them
  const cap = +SETTINGS.fpsCap; // VSync -> NaN: draw every refresh
  if (cap && now - last < 1000 / cap - 2) { requestAnimationFrame(frame); return; }
  const raw = now - last; if (raw < 200) frameMs += (raw - frameMs) * .03;
  if (!lowFx && frameMs > 24) { lowFx = 1; fastT = 0; }
  else if (lowFx === 1 && frameMs < 15) { if ((fastT += raw) > 8000) lowFx = 0; } else fastT = 0; // only back to full quality after 8s of clearly fast frames
  if (lowFx === 1 && SETTINGS.autoQ !== false && state === 'play' && frameMs > 30) { if ((slowT += raw) > 4000) { lowFx = 2; slowT = 0; if (!lowFxSaid) { lowFxSaid = true; notify({ kind: 'info', title: 'Graphics simplified', sub: 'Lighting and snow, to keep this run smooth. Settings › Graphics.', dur: 3.5 }); } } } else slowT = 0; // still too slow: the expensive layers go, until the next run
  if (lowFx === 2 && (state === 'menu' || SETTINGS.autoQ === false)) lowFx = 0;
  const dt = Math.min(.033, raw / 1000); last = now;
  requestAnimationFrame(frame); // scheduled first: nothing below can ever stop the loop
  deathFxTick(dt);
  Sfx.hold(state === 'paused' || (state === 'dead' && !NETM.run && !(deadT > 0))); // paused, or the solo death screen up: the world's sound waits too (in the menu it's let go)
  if (PERF.el) perfShowIfPlaying();
  fireFrame(); edgeFxTick(); // the burning crackle (38g); lunge blur, Focus vignette (off everywhere but a live run)
  if (state === 'editor') return; // the map editor draws itself
  const menu = state === 'menu'; // menus show a CSS backdrop instead of the map: the game costs nothing there
  if (menu !== !!frame.cov) { frame.cov = menu; stage.classList.toggle('menuBg', menu); }
  if (menu) { UT += dt; if ((rotT -= dt) <= 0) { rotT = .5; checkRotation(); updateRotClocks(); } return; } // (in the menu a new set of challenges rolls in live)
  try { update(dt * timeScale()); } catch (e) { loopError(e, 'update'); } // (3rd Eye's Focus slows the world)
  try { render(); } catch (e) { loopError(e, 'render'); }
  drawSpawnGhost(); // waiting to respawn in multiplayer: where you'll come back, on its own layer over the death effects
  perfRunTick(now); if (PERF.mode !== 'Off') perfFrame(now);
}

let plxQ = null; // menus only: the map picture behind them drifts a few pixels against the mouse, at most once a frame. The menus themselves stay put
document.addEventListener('pointermove', e => {
  if (state !== 'menu' || SETTINGS.reduceMotion) return;
  const first = !plxQ; plxQ = [e.clientX, e.clientY]; if (!first) return;
  requestAnimationFrame(() => {
    const r = stage.getBoundingClientRect(), mx = (plxQ[0] - r.left) / r.width * 2 - 1, my = (plxQ[1] - r.top) / r.height * 2 - 1; plxQ = null;
    if (typeof menuArt !== 'undefined') { menuArt.style.setProperty('--px', (-mx * 14).toFixed(1) + 'px'); menuArt.style.setProperty('--py', (-my * 10).toFixed(1) + 'px'); } // only the picture moves (it overhangs every edge); the shade over it stays put
  });
});
/* ---- club: the dance floor lights up in time with the beat ---- */
const CLUB_BPM = 124;
function drawDanceFloor(x) {
  const beat = T * CLUB_BPM / 60, bar = Math.floor(beat / 4), cols = ['#ff2d95', '#2de2ff', '#b6ff2d', '#ffb02d', '#8a5cff', '#ff4b2d'];
  const pulse = 1 - (beat % 1); // bright on the beat, fading between
  for (let j = 0; j < 6; j++) for (let i = 0; i < 9; i++) {
    const h = (i * 7 + j * 13 + bar * 5) % 11, on = (h + Math.floor(beat)) % 3 === 0;
    x.fillStyle = cols[(i + j + bar) % cols.length]; x.globalAlpha = on ? .32 + .38 * pulse : .08;
    x.fillRect(XO + 302 + i * 40, 222 + j * 43.3, 36, 39);
  }
  x.globalAlpha = 1;
}

let loopErrs = 0;
function loopError(e, where) { // a bug in one frame must never freeze the run or leave a stale picture on screen
  if (loopErrs++ < 5) console.error(`[${where}]`, e);
  if (state === 'play' && snake && !isFinite(snake.x + snake.y)) { snake.x = W / 2; snake.y = H / 2; }
}

/* airborne blood: the faster a drop flies, the longer and softer it smears along its path; slow drops are round again.
   Always the drop's own color. Blood quality picks how much of this is drawn. */
const DROP_Q = { Low: 0, Medium: 1, Normal: 1, High: 2, Extreme: 3 };
function drawDrops(x) {
  const q = SETTINGS.bloodBlur === false ? 0 : DROP_Q[SETTINGS.bloodQ] ?? 2; x.lineCap = 'round';
  for (const p of parts) {
    const c = p.c || BLOOD, py = p.y - p.z * .25, R = p.r * (1 + p.z / 80), sp = Math.hypot(p.vx, p.vy);
    if (!q || sp < 60) { x.fillStyle = c; circ(x, p.x, py, R); continue; }
    const k = q === 1 ? .012 : q === 2 ? .02 : .026, len = Math.min(sp * k, 26), ux = p.vx / sp, uy = p.vy / sp;
    const thin = R * 2 / Math.sqrt(1 + len / (R * 3)); // stretched drops get thinner, so they keep their size
    x.strokeStyle = c;
    if (q >= 2) { // a soft, wider ghost of the smear behind it
      x.globalAlpha = q === 3 ? .16 : .22; x.lineWidth = thin * 1.9; x.beginPath(); x.moveTo(p.x - ux * len * 1.35, py - uy * len * 1.35); x.lineTo(p.x, py); x.stroke();
      if (q === 3) { x.globalAlpha = .3; x.lineWidth = thin * 1.4; x.beginPath(); x.moveTo(p.x - ux * len * 1.1, py - uy * len * 1.1); x.lineTo(p.x, py); x.stroke(); }
      x.globalAlpha = 1;
    }
    x.lineWidth = thin; x.beginPath(); x.moveTo(p.x - ux * len * .8, py - uy * len * .8); x.lineTo(p.x + ux * .01, py + uy * .01); x.stroke();
    if (q === 3) { x.fillStyle = c; circ(x, p.x, py, thin * .55); } // a rounded leading edge
  }
}

/* after a wall: grey ghost copies of the picture pulse left and right (double, then triple vision)
   Built at half size from the finished scene (not read back from the screen), layered together there, then laid over in one pass */
const caR = document.createElement('canvas'), caG = document.createElement('canvas');
function chromaSplit(k) {
  const w = Math.max(1, cv.width >> 2), h = Math.max(1, cv.height >> 2); // a quarter size: grey ghosts are soft anyway, and it's a sixteenth of the pixels to move
  if (caR.width !== w || caR.height !== h) { caR.width = caG.width = w; caR.height = caG.height = h; }
  const g = caR.getContext('2d'), q = caG.getContext('2d');
  g.globalCompositeOperation = 'copy'; g.drawImage(render.src || cv, 0, 0, w, h);
  g.globalCompositeOperation = 'saturation'; g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; // grey
  const d = (3 + 9 * k) * DPR * Math.sin(T * 5.5) / 4; // swinging side to side
  q.clearRect(0, 0, w, h);
  for (const [m, al] of [[1, .22], [-1, .22], [2.1, .1]]) { q.globalAlpha = al * k; q.drawImage(caR, d * m, 0); }
  q.globalAlpha = 1;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(caG, 0, 0, cv.width, cv.height); ctx.restore();
}
const bloomC = document.createElement('canvas'); bloomC.width = W / 4; bloomC.height = H / 4; const blx = bloomC.getContext('2d');
function concussBloom(k) { // bright parts spill light while dazed
  blx.globalCompositeOperation = 'copy'; blx.filter = "blur(3px) brightness(1.15) contrast(1.4)"; blx.drawImage(render.src || cv, 0, 0, W / 4, H / 4); blx.filter = 'none';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = Math.min(.85, k); ctx.imageSmoothingEnabled = true; ctx.drawImage(bloomC, 0, 0, cv.width, cv.height); ctx.restore();
}
/* soft edges: a small copy of the finished scene scaled back up (that's the blur), kept only outside an ellipse.
   The daze and the lunge use it. A CSS backdrop blur over the page did this before and cost the graphics chip far more */
const EDGE_C = {};
const edgeCanvas = (k, w, h) => { let e = EDGE_C[k]; if (!e) { const c = document.createElement('canvas'); e = EDGE_C[k] = [c, c.getContext('2d')]; } if (e[0].width !== w || e[0].height !== h) { e[0].width = w; e[0].height = h; } return e; };
function edgeShrink(div) { // the frame at 1/div size (div 2, 4 or 8), halved step by step: cheap bilinear passes, each made once a frame and shared, instead of a full-size mipmapped shrink per ring
  let prev = render.src;
  for (let d = 2; d <= div; d *= 2) {
    const e = edgeCanvas('s' + d, Math.ceil(W / d), Math.ceil(H / d)), [c, g] = e;
    if (e.n !== render.n) { e.n = render.n; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'copy'; g.imageSmoothingQuality = 'low'; g.drawImage(prev, 0, 0, c.width, c.height); }
    prev = c;
  }
  return prev;
}
function softEdges(a, div, rx, ry, s0, s1, grey = 0) { // rx, ry: the ellipse's radii (board units); s0..s1: where the blur fades in along them; div: 4 or 8 (blurrier)
  if (a < .01) return;
  const S = edgeShrink(div), w = S.width, h = S.height, [c, g] = edgeCanvas('m' + div, w, h);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'copy'; g.drawImage(S, 0, 0);
  if (grey > .01) { g.globalCompositeOperation = 'saturation'; g.globalAlpha = Math.min(1, grey); g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.globalAlpha = 1; }
  const k = rx / ry, m = g.createRadialGradient(0, 0, 0, 0, 0, ry); m.addColorStop(s0, 'rgba(0,0,0,0)'); m.addColorStop(s1, '#000');
  g.setTransform(w / W * k, 0, 0, h / H, w / 2, h / 2); g.globalCompositeOperation = 'destination-in'; g.fillStyle = m; g.fillRect(-W / k, -H, 2 * W / k, 2 * H); g.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalAlpha = Math.min(1, a); ctx.drawImage(c, 0, 0, W, H); ctx.restore();
}
function dazeEdges(k, wl) { // dazed: the edges darken, and after a wall they blur too. k: how dazed (0-1); wl: how much of the heavier after-a-wall look (0-1)
  const lerp = (a, b) => a + (b - a) * wl, ax = W / H, R = H / 2 * Math.SQRT2; // an ellipse the shape of the board, to its corners
  if (wl > .02) softEdges(k * wl, 8, W / Math.SQRT2, R, .22, .7);
  const c = `${Math.round(lerp(20, 10))},${Math.round(lerp(0, 4))},${Math.round(lerp(0, 4))}`, g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  for (const [o0, o1, a0, a1] of [[.5, .3, 0, 0], [.6, .4, .04, .03], [.7, .55, .12, .15], [.8, .7, .21, .34], [1, 1, .35, .6]]) g.addColorStop(lerp(o0, o1), `rgba(${c},${(lerp(a0, a1) * k).toFixed(3)})`);
  ctx.save(); ctx.setTransform(DPR * ax, 0, 0, DPR, DPR * W / 2, DPR * H / 2); ctx.fillStyle = g; ctx.fillRect(-H / 2, -H / 2, H, H); ctx.restore();
}
const LINE_A = Array.from({ length: 60 }, (_, k) => k / 60 * TAU + Math.sin(k * 12.9898) * .04); // the speed lines' angles, a touch uneven
function lungeLines() { // drawn in the canvas (a page layer over it cost far more): the edges darken mid-lunge and go blue in Focus, and white lines rush outward
  const { lb, fk } = EDGE_K, R = Math.hypot(W, H) / 2, ax = W / H;
  ctx.save(); ctx.setTransform(DPR * ax, 0, 0, DPR, DPR * W / 2, DPR * H / 2); // an ellipse the shape of the board
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, H / 2 * Math.SQRT2);
  g.addColorStop(.4, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(${Math.round(90 * fk / (fk + lb + .001))},${Math.round(190 * fk / (fk + lb + .001))},${Math.round(255 * fk / (fk + lb + .001))},${(fk * .28 + lb * .22).toFixed(3)})`);
  ctx.fillStyle = g; ctx.fillRect(-H, -H, H * 2, H * 2);
  if (lb > .03) {
    ctx.setTransform(DPR, 0, 0, DPR, DPR * W / 2, DPR * H / 2);
    const ph = (UT / .28) % 1, r0 = R * (.6 + .08 * ph), r1 = R * 1.05, lg = ctx.createRadialGradient(0, 0, R * .52, 0, 0, R);
    lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(1, `rgba(255,255,255,${(.16 * lb).toFixed(3)})`);
    ctx.strokeStyle = lg; ctx.lineWidth = 2; ctx.beginPath();
    for (let k = 0; k < LINE_A.length; k++) { const a = LINE_A[k], c = Math.cos(a), s = Math.sin(a), q = k % 3 ? 1 : 1.12; ctx.moveTo(c * r0 * q, s * r0 * q * (H / W) * 1.15); ctx.lineTo(c * r1, s * r1 * (H / W) * 1.15); }
    ctx.stroke();
  }
  ctx.restore();
}
function lungeEdges() { // mid-lunge the edges blur in two rings (light, then heavy at the rim); 3rd Eye's Focus drains them of colour
  const { lb, fk } = EDGE_K;
  softEdges(Math.max(lb, fk), 4, W * .78, H * .74, .34, .9, .35 * fk); // one ring, fading in from a third of the way out to the rim (it was two full-screen passes)
}

/* before the round: the mouse pans the view a little, and resting on a spot for a second eases in toward it (until you zoom or drag yourself: ucamTakeLook in 11 hands the camera over from right here) */
const look = { z: 1, fx: W / 2, fy: H / 2, mx: W / 2, my: H / 2, still: 0, lt: 0, on: false };
addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  const r = cv.getBoundingClientRect(); if (!r.width) return;
  const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
  if (Math.hypot(x - look.mx, y - look.my) > 14) look.still = 0;
  look.mx = clamp(x, 0, W); look.my = clamp(y, 0, H);
});
function lookAround() {
  const pre = state === 'ready' && !cam && snake && !snake.started && look.off !== snake, dt = Math.min(.05, Math.max(0, UT - look.lt)); look.lt = UT;
  look.still += dt;
  const tz = pre ? (look.still > 1 ? 1.16 : 1.04) : 1; // resting the cursor zooms in a touch
  const k = 1 - Math.exp(-dt * (pre ? 3 : 5));
  look.z += (tz - look.z) * k;
  const half = (W / 2) / look.z, halfH = (H / 2) / look.z;
  const px = pre ? W / 2 + (look.mx - W / 2) * .55 : W / 2, py = pre ? H / 2 + (look.my - H / 2) * .55 : H / 2; // drift toward the cursor, never off the map
  let gx = clamp(px, half, W - half), gy = clamp(py, halfH, H - halfH);
  if (pre) { gx = clamp(gx, snake.x - half + 50, snake.x + half - 50); gy = clamp(gy, snake.y - halfH + 50, snake.y + halfH - 50); gx = clamp(gx, half, W - half); gy = clamp(gy, halfH, H - halfH); } // your snake never leaves the frame
  look.fx += (gx - look.fx) * k; look.fy += (gy - look.fy) * k;
  if (V.z || look.z < 1.002) return; // the spawn zoom or the player's own zoom has the camera, or we're back to normal
  V.z = look.z; V.fx = look.fx; V.fy = look.fy;
}

function drawCrashFlash(x) { // whatever you hit pops out with a red and white flashing outline
  if (!crashHit || state !== 'dead') return;
  const t = T - crashHit.t; if (t > 1.6) return;
  const pop = 1 + .22 * Math.exp(-t * 7) * Math.sin(t * 22) + .06, col = Math.floor(t / .11) % 2 ? '#ffffff' : '#ff2a2a', a = t > 1.2 ? (1.6 - t) / .4 : 1;
  x.save(); x.globalAlpha = a; x.lineJoin = 'round';
  const o = crashHit.o, g = crashHit.seg != null && snake ? snake.segs[crashHit.seg] : null;
  const cx = o ? (o.t === 'r' ? o.x + o.w / 2 : o.x) : g ? g.x : 0, cy = o ? (o.t === 'r' ? o.y + o.h / 2 : o.y) : g ? g.y : 0;
  x.translate(cx, cy); x.scale(pop, pop);
  const path = () => { x.beginPath(); if (o && o.t === 'r') x.rect(-o.w / 2, -o.h / 2, o.w, o.h); else x.arc(0, 0, o ? o.r : snakeRadius() + 1, 0, TAU); };
  path(); x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 6 / pop; x.stroke();
  path(); x.strokeStyle = col; x.lineWidth = 3 / pop; x.stroke();
  x.restore();
}

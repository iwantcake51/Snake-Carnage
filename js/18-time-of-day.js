/* =========================================================
   TIME OF DAY, SHADOWS, LIGHTS
   ========================================================= */
const HEIGHTS = { block: 22, border: 14, wall: 18, building: 28, barn: 32, silo: 40, tree: 22, bush: 8, rock: 8, car: 9, fence: 6,
                  desk: 5, chair: 4, couch: 6, bench: 4, table: 5, hay: 9, lamp: 34, water: 0 };
const FIXED_TIMES = { Day: 12.5, Dawn: 6.05, Dusk: 17.95, Night: 23 };
const TIME_MODES = { Cycle: 'Dynamic', Day: 'Daytime', Dawn: 'Dawn', Dusk: 'Dusk', Night: 'Night' };
const VISIBLE = .35;
/* Light colors by source, and how high each source hangs (decides shadow length). */
const LCOL = { street: '255,156,58', fluor: '226,238,255', pool: '80,215,255', emerg: '255,40,36', fire: '255,150,60', window: '255,196,110', fixed: '255,214,150', alien: '110,255,160' };
const LIGHT_H = { street: 55, fluor: 70, fixed: 50, fire: 6, pool: 0, emerg: 45, window: 0, alien: 50 };
let tod = 16, light = null, shadowKey = '', lights = [], windows = [], beams = [], dropped = [], debris = [], scast = [];
let lightFrame = 0; const lightCache = { x: NaN, y: NaN, f: -1, v: 0 };

/* ---- time of day ---- */
const TIME_SLOTS = { dawn: [5.2, 6.6], morning: [7, 10], midday: [11, 13.5], afternoon: [13.5, 16.5], sunset: [17.2, 18.8], evening: [19, 21.2], night: [21.5, 27.5] };
function pickStartTime(m) { // maps can lean toward times that suit them (m.times = weights)
  const w = m.times || {}, keys = Object.keys(TIME_SLOTS), tot = keys.reduce((a, k) => a + (w[k] ?? 1), 0);
  let r = Math.random() * tot;
  for (const k of keys) { r -= w[k] ?? 1; if (r <= 0) return rand(...TIME_SLOTS[k]) % 24; }
  return 12;
}
const TINT_KEYS = [ // hour, sky-side color, horizon-side color, strength
  [0, [30, 40, 90], [20, 30, 70], 0], [4.6, [60, 50, 120], [40, 40, 100], .1], [5.5, [120, 70, 165], [255, 105, 90], .24],
  [6.3, [255, 140, 175], [255, 165, 90], .24], [7.3, [255, 215, 170], [255, 200, 150], .1], [8.6, [255, 255, 255], [255, 255, 255], 0],
  [16.2, [255, 255, 255], [255, 255, 255], 0], [17.2, [255, 205, 140], [255, 180, 120], .1], [18, [255, 135, 70], [255, 85, 85], .24],
  [18.7, [205, 90, 165], [255, 110, 80], .28], [19.5, [110, 70, 165], [80, 100, 185], .22], [20.6, [40, 50, 110], [30, 40, 90], .08],
  [22, [30, 40, 90], [20, 30, 70], 0], [24, [30, 40, 90], [20, 30, 70], 0]];
function todTint(h) {
  let i = 0; while (i < TINT_KEYS.length - 2 && TINT_KEYS[i + 1][0] <= h) i++;
  const a = TINT_KEYS[i], b = TINT_KEYS[i + 1], t = clamp((h - a[0]) / (b[0] - a[0]), 0, 1), s = t * t * (3 - 2 * t);
  const mx = (p, q) => p.map((v, k) => Math.round(v + (q[k] - v) * s)).join(',');
  return { top: mx(a[1], b[1]), bot: mx(a[2], b[2]), a: a[3] + (b[3] - a[3]) * s };
}
function computeLight() {
  const m = MAPS[mapIdx], sun = Math.sin((tod - 6) / 12 * Math.PI), day = clamp(sun * 1.6 + .1, 0, 1);
  if (m.indoor) return { day, dark: .12 + (1 - day) * .4, dusk: 0, sdx: .25, sdy: .35, salpha: .28, lampsOn: 1, dc: '12,12,22', tA: 0 };
  const p = clamp((tod - 6) / 12, 0, 1), len = clamp(.4 / Math.max(.18, sun), .4, 2.2);
  const dusk = clamp(1 - Math.abs(sun - .1) / .25, 0, 1), tt = todTint(tod), mo = 1 - dusk;
  return { day, dark: (1 - day) * .74, dusk, sdx: -Math.cos(p * Math.PI) * len, sdy: .45 * len, salpha: .07 + .25 * day, lampsOn: clamp((1 - day - .15) * 3, 0, 1),
           dc: `${Math.round(16 * mo + 46 * dusk)},${Math.round(24 * mo + 22 * dusk)},${Math.round(50 * mo + 64 * dusk)}`, // moonlight blue, purple near dusk
           tTop: tt.top, tBot: tt.bot, tA: tt.a };
}
function bakeShadows() {
  const L = light; shx.clearRect(0, 0, W, H); shx.fillStyle = '#000';
  for (const o of obstacles) {
    const h = HEIGHTS[o.kind] ?? 10; if (!h) continue;
    const ox = L.sdx * h, oy = L.sdy * h, n = Math.max(1, Math.ceil(Math.hypot(ox, oy) / 2.5));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      if (o.t === 'r') shx.fillRect(o.x + ox * t, o.y + oy * t, o.w, o.h);
      else circ(shx, o.x + ox * t, o.y + oy * t, o.kind === 'lamp' && k < n ? 2 : o.r);
    }
  }
}

/* ---- light sources ---- */
function buildLights(extra) {
  const m = MAPS[mapIdx];
  lights = extra.map(l => { const kind = l.kind || (m.indoor ? 'fluor' : 'fixed'); return { c: LCOL[kind], h: LIGHT_H[kind], ...l, kind }; });
  windows = [];
  const add = (x, y, wx, wy, ww, wh) => { if (Math.random() < .6) { lights.push({ x, y, r: 48, c: LCOL.window, kind: 'window', h: 0, flick: Math.random() < .1 }); windows.push({ x: wx, y: wy, w: ww, h: wh }); } };
  for (const o of obstacles) {
    if (o.kind === 'lamp') lights.push({ x: o.x, y: o.y, r: 130, c: LCOL.street, kind: 'street', h: LIGHT_H.street, flick: Math.random() < .15, thr: rand(.3, .62), o });
    if (o.kind !== 'building' && o.kind !== 'barn') continue; // light spilling out of windows
    for (let xx = o.x + 18; xx < o.x + o.w - 10; xx += 40) { add(xx, o.y - 8, xx - 5, o.y + 1, 10, 3); add(xx, o.y + o.h + 8, xx - 5, o.y + o.h - 4, 10, 3); }
    for (let yy = o.y + 18; yy < o.y + o.h - 10; yy += 40) { add(o.x - 8, yy, o.x + 1, yy - 5, 3, 10); add(o.x + o.w + 8, yy, o.x + o.w - 4, yy - 5, 3, 10); }
  }
  beams = []; dropped = []; debris = [];
  bakeLightMasks();
}
function lightTarget(l) {
  if (l.dead) return 0;
  if (l.kind === 'emerg') return 1;
  if (l.kind === 'street') return light && 1 - light.day > l.thr ? 1 : 0; // each streetlight has its own sensor
  return light ? light.lampsOn : 0;
}
const lightK = l => l.dead ? 0 : (l.cur ?? lightTarget(l)) * (l.fl ?? 1) * (l.kind === 'emerg' ? .45 + .55 * Math.abs(Math.sin(T * 2.4)) : 1);
function updateLights(dt) {
  for (const l of lights) {
    const tg = lightTarget(l);
    if (l.cur === undefined) { l.cur = tg; l.wasOn = tg > .5; }
    if (l.kind === 'street') {
      if (tg && !l.wasOn) l.ign = rand(.35, 1.1); // sodium lamps stutter as they warm up
      l.wasOn = !!tg; l.cur += (tg - l.cur) * Math.min(1, dt * (tg ? 1.8 : 1.2));
    } else l.cur = tg;
    let fl = 1;
    if (l.ign > 0) { l.ign -= dt; fl = Math.random() < .45 ? rand(.05, .35) : 1; }
    else if (l.fT > 0) { l.fT -= dt; if ((l.fN -= dt) <= 0) { l.fN = rand(.04, .09); l.fv = Math.random() < .5 ? rand(.45, .75) : 1; } fl = l.fv; } // a short, rare stutter
    else if (l.flick && Math.random() < dt * .05) { l.fT = rand(.15, .45); l.fN = 0; }
    l.fl = fl;
  }
}
function updateTime(dt) {
  if (MOD.night) tod = 23;
  else if (SETTINGS.timeMode === 'Cycle') { if (state === 'play' && snake && snake.started) tod = (tod + dt * 24 / (SETTINGS.dayMinutes * 60)) % 24; } // the clock waits until you actually move
  else tod = SETTINGS.timeMode === 'Custom' ? +SETTINGS.customHour : FIXED_TIMES[SETTINGS.timeMode] ?? 12;
  light = computeLight();
  const key = light.sdx.toFixed(2) + ',' + light.sdy.toFixed(2);
  if (key !== shadowKey) { shadowKey = key; bakeShadows(); }
  updateLights(dt); updateEnclosures(); updateWaters(dt); updateBeams(dt);
}
const clockText = () => String(Math.floor(tod)).padStart(2, '0') + ':' + String(Math.floor(tod % 1 * 60)).padStart(2, '0');
function lightAt(x, y) { // 0 = pitch black, 1 = fully lit (ambient + lamps/windows + flashlight beams)
  if (lightCache.f === lightFrame && lightCache.x === x && lightCache.y === y) return lightCache.v;
  let v = 1 - light.dark / .74;
  for (const l of lights) {
    if (v >= 1) break;
    const k = lightK(l); if (k < .01) continue;
    const d2 = dist2(x, y, l.x, l.y); if (d2 < l.r * l.r && !(l.enc && encBlocks(l, x, y))) v += k * (1 - Math.sqrt(d2) / l.r) * 1.2;
  }
  for (const f of beams) { // beams only light what's actually in the cone (and not behind walls)
    if (v >= 1) break;
    const d = Math.hypot(x - f.x, y - f.y); if (d > f.range) continue;
    const da = Math.abs(angDiff(f.da, Math.atan2(y - f.y, x - f.x))), close = d < 18;
    if (!close && da > f.half * 1.15) continue;
    const add = f.k * (1 - d / f.range) * 1.5 * (close ? 1 : 1 - da / (f.half * 1.3));
    if (add > .05 && los(f.x, f.y, x, y)) v += add;
  }
  v = clamp(v, 0, 1); lightCache.x = x; lightCache.y = y; lightCache.f = lightFrame; lightCache.v = v;
  return v;
}

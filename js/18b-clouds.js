/* ---- cloud shadows: clouds you never see, high over outdoor maps on Earth; only their soft shadows drift across the ground,
   in daylight, fading out as the sun goes down. The cover is one seamless 320 px mask (a worker builds it, PX 'cloudTile'): big clouds
   bunched into groups with clear sky between, laid over the world as a pattern a tile about 2700 px across, slid along with the wind: one fill a frame ---- */
const CLOUD = { tile: null, pat: null, gen: 0, ang: 0, sp: 0, ox: 0, oy: 0, sc: 8.5, m: null }; // (sc: a tile is about 2700 px across: big clouds)
function cloudsFor() { // each map load: a new sky (its own shapes, how much of it is cloud, which way the wind takes it)
  CLOUD.pat = null; CLOUD.tile = null; const m = MAPS[mapIdx], gen = ++CLOUD.gen; if (!m || m.indoor || m.space) return;
  const cov = .38 + Math.random() * .12, seed = 1 + (Math.random() * 1e9 | 0); CLOUD.ang = Math.random() * TAU; CLOUD.sp = 6 + Math.random() * 7; CLOUD.ox = Math.random() * 1400; CLOUD.oy = Math.random() * 1400;
  PX.run('cloudTile', { n: 320, seed, cov }).then(r => { if (gen !== CLOUD.gen) return; const c = document.createElement('canvas'); c.width = c.height = 320; c.getContext('2d').putImageData(new ImageData(r.px, 320, 320), 0, 0); CLOUD.tile = c; CLOUD.pat = null; }).catch(e => console.warn('[clouds]', e));
}
function cloudK() { // how dark they are now: full in daylight, fading through the evening, none at night
  if (!CLOUD.tile || SETTINGS.cloudShadows === false || !light) return 0;
  return clamp((light.day - .3) / .5, 0, 1) * (1 - (light.dusk || 0) * .5);
}
function drawCloudShadows(x) { // world space, over everything on the ground (props, trees and everyone), under the lights
  const k = cloudK(); if (k < .01) return;
  if (!CLOUD.pat) { CLOUD.pat = x.createPattern(CLOUD.tile, 'repeat'); CLOUD.m = new DOMMatrix(); }
  const d = CLOUD.sp * T, M = CLOUD.m; M.a = M.d = CLOUD.sc; M.b = M.c = 0; M.e = CLOUD.ox + Math.cos(CLOUD.ang) * d; M.f = CLOUD.oy + Math.sin(CLOUD.ang) * d; CLOUD.pat.setTransform(M);
  x.globalAlpha = .3 * k; x.fillStyle = CLOUD.pat; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
}

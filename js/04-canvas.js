/* =========================================================
   CANVASES / LAYERS
   floor layer: ground + permanent ground blood/footprints
   obstacle layer: walls/objects + permanent blood (source-atop)
   ========================================================= */
const PHONE = (() => { try { return matchMedia('(pointer: coarse)').matches && Math.min(screen.width || innerWidth, screen.height || innerHeight) < 600; } catch (e) { return false; } })(); // a phone: tiny, dense screen, a small graphics chip
/* Auto resolution learns: after two runs in a row that mostly ran under 40 fps, the next load draws a step lower (resLearn in 35b-perf;
   s: steps down, 0-2, n: slow runs in a row). Picking a Render resolution in Settings starts it over. */
const RES_LEARN = (() => { try { const v = JSON.parse(localStorage.getItem('snakeResStep')); return v && v.s >= 0 ? { s: Math.min(2, v.s | 0), n: v.n | 0 } : { s: 0, n: 0 }; } catch (e) { return { s: 0, n: 0 }; } })(), RES_STEPS = [1, .84, .67], RES_STEP0 = RES_LEARN.s; // (RES_STEP0: the step this load draws at)
const DPR = (() => { // render at the real on-screen size: device pixel ratio x how much the board is scaled to fit
  const iw = innerWidth, ih = innerHeight, big = !PHONE && iw >= (screen.width || 0) * .6 && ih >= (screen.height || 0) * .6; // a window that fills most of the screen: drawn for the window itself (the screen's size drew a maximized window about a fifth more pixels than it shows, on every layer, every frame)
  const sw = big ? iw : Math.max(iw, screen.width || 0), sh = big ? ih : Math.max(ih, screen.height || 0), dpr = window.devicePixelRatio || 1; // (a small window: the screen's size, so it's still sharp once it's made bigger)
  const shown = Math.min((sw - 24) / W, (sh - 70) / 640, 2.2); // CSS pixels per board unit as it's actually shown (under 1 on a phone)
  // A phone shows the board shrunk on a tiny, very dense screen: past ~1.5 the extra pixels can't be seen but every layer
  // still pays for them (and iOS Safari slows to a crawl when all the canvases together get too big)
  const auto0 = PHONE ? Math.min(1.5, Math.max(1, dpr * shown)) : Math.min(2, Math.max(1, dpr * Math.max(1, shown))); // past this the extra pixels cost far more than they show
  const auto = Math.min(auto0, Math.max(1, auto0 * (RES_STEPS[RES_LEARN.s] || 1))); // (never under one pixel a unit)
  const pct = parseInt(SETTINGS.renderRes); // 'Auto' -> NaN; a percentage is of the automatic resolution
  return pct ? Math.max(.5, Math.min(3, auto0 * pct / 100)) : auto;
})();
const freeCanvas = (...cs) => { for (const c of cs) if (c) c.width = c.height = 0; }; // a scratch canvas's memory goes back now instead of whenever it's collected (iOS counts every canvas against a hard limit)
function makeLayer(c) {
  c = c || document.createElement('canvas');
  c.width = W * DPR; c.height = H * DPR;
  const x = c.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0);
  return [c, x];
}
const [cv, ctx] = makeLayer(document.getElementById('c'));
const [baseC, bctx] = makeLayer();   // the map's ground (also keeps broken lamps and glass)
let fctx = null, wctx = null;          // current blood bucket: ground and wall blood (see BLOOD BUCKETS)
const [groundC, gctx] = makeLayer();   // dirt ruts and kicked-up crumbs (regrows)
const [obsC, octx] = makeLayer();
const [sceneC, sctx] = makeLayer(); sceneC.width = sceneC.height = 0; // full-res frame before post-processing: only pixelation and the wall wobble without GPU effects need it, so it's sized the first time they do (render)
const lowC = document.createElement('canvas'), lctx = lowC.getContext('2d'); // pixelation buffer
const [shadowC, shx] = makeLayer();
const [maskC, mkx] = makeLayer(), [outlineC, olx] = makeLayer(), [nvOutC, nvx] = makeLayer();  // outline around everything you can crash into                   // baked obstacle shadows (rebaked as the sun moves)
// the darkness mask is soft, so it doesn't need full resolution; its size follows the lighting quality setting
const lightRes = () => Math.min(DPR, ({ High: 1.5, Medium: 1, Low: .5, Off: .5 })[SETTINGS.lightQ] || 1.5); // the light layer is soft: Low draws it at half resolution
let LDPR = lightRes(); const lightC = document.createElement('canvas'); lightC.width = W * LDPR; lightC.height = H * LDPR;
const lgx = lightC.getContext('2d'); lgx.setTransform(LDPR, 0, 0, LDPR, 0, 0);

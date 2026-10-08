/* =========================================================
   CANVASES / LAYERS
   floor layer: ground + permanent ground blood/footprints
   obstacle layer: walls/objects + permanent blood (source-atop)
   ========================================================= */
const DPR = (() => { // render at the real on-screen size: device pixel ratio x how much the board is scaled to fit
  const sw = Math.max(innerWidth, screen.width || 0), sh = Math.max(innerHeight, screen.height || 0), dpr = window.devicePixelRatio || 1;
  const shown = Math.min((sw - 24) / W, (sh - 70) / 640, 2.2); // CSS pixels per board unit as it's actually shown (under 1 on a phone)
  const coarse = (() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
  const phone = coarse && Math.min(screen.width || innerWidth, screen.height || innerHeight) < 600;
  // A phone shows the board shrunk on a tiny, very dense screen: past ~1.5 the extra pixels can't be seen but every layer
  // still pays for them (and iOS Safari slows to a crawl when all the canvases together get too big)
  const auto = phone ? Math.min(1.5, Math.max(1, dpr * shown)) : Math.min(2, Math.max(1, dpr * Math.max(1, shown))); // past this the extra pixels cost far more than they show
  const pct = parseInt(SETTINGS.renderRes); // 'Auto' -> NaN; a percentage is of the automatic resolution
  return pct ? Math.max(.5, Math.min(3, auto * pct / 100)) : auto;
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
const [sceneC, sctx] = makeLayer();                   // full-res frame before post-processing
const lowC = document.createElement('canvas'), lctx = lowC.getContext('2d'); // pixelation buffer
const [shadowC, shx] = makeLayer();
const [maskC, mkx] = makeLayer(), [outlineC, olx] = makeLayer(), [nvOutC, nvx] = makeLayer();  // outline around everything you can crash into                   // baked obstacle shadows (rebaked as the sun moves)
// the darkness mask is soft, so it doesn't need full resolution; its size follows the lighting quality setting
const lightRes = () => Math.min(DPR, ({ High: 1.5, Medium: 1, Low: .5, Off: .5 })[SETTINGS.lightQ] || 1.5); // the light layer is soft: Low draws it at half resolution
let LDPR = lightRes(); const lightC = document.createElement('canvas'); lightC.width = W * LDPR; lightC.height = H * LDPR;
const lgx = lightC.getContext('2d'); lgx.setTransform(LDPR, 0, 0, LDPR, 0, 0);

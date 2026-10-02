/* =========================================================
   CANVASES / LAYERS
   floor layer: ground + permanent ground blood/footprints
   obstacle layer: walls/objects + permanent blood (source-atop)
   ========================================================= */
const DPR = (() => { // render at the real on-screen size: device pixel ratio x how much the board is scaled up to fit
  const sw = Math.max(innerWidth, screen.width || 0), sh = Math.max(innerHeight, screen.height || 0);
  const fitS = Math.max(1, Math.min((sw - 24) / 960, (sh - 70) / 640, 2.2)); // the board can grow big on large screens and stays crisp
  return Math.min(3, Math.max(1, (window.devicePixelRatio || 1) * fitS));
})();
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
const LDPR = Math.min(DPR, 2), lightC = document.createElement('canvas'); lightC.width = W * LDPR; lightC.height = H * LDPR; // darkness mask
const lgx = lightC.getContext('2d'); lgx.setTransform(LDPR, 0, 0, LDPR, 0, 0);

/* =========================================================
   KILL FX: vignette pulse, color drain, blood on the "lens"
   ========================================================= */
let killV = 0, killFlash = 0, desatHold = 0, lastFilter = '';
function killFx(x, y, amount) {
  killV = Math.min(1, killV + .35 + .5 * amount);
  killFlash = .8; desatHold = .1;
}

/* =========================================================
   BLOOM: a soft glow round the parts of props that give off their own light (console buttons, desk monitors, a
   generator's lamp, the reactor core, holograms, pods, cryo tanks). The glows are painted once, at half resolution,
   whenever the obstacle layer is redrawn (so a smashed console stops glowing), and laid over the lit scene each
   frame with one additive draw: strongest in the dark, faint in daylight. Settings › Graphics › Bloom turns it off.
   ========================================================= */
const GLOW_K = .5; // half resolution: it's all soft light
const glowC = document.createElement('canvas'); glowC.width = Math.ceil(W * GLOW_K); glowC.height = Math.ceil(H * GLOW_K);
const glx = glowC.getContext('2d'); let glowAny = false;
const CONSOLE_LIGHTS = ['#5fffd0', '#ffcf33', '#ff5a4a', '#7fb3ff'];
function glowEmitters(o) { // [cx, cy, w, h, color, strength] for each glowing part, in the object's own (unturned) frame
  const p = typeof propCache === 'object' && propCache[o.kind]; if (p && p.hideBase) return []; // its own look replaced: no buttons to glow
  const out = [], { x: X, y: Y, w, h } = o;
  switch (o.kind) {
    case 'console': for (let q = X + 6; q < X + w - 14; q += 22) out.push([q + 9, Y + h / 2 - 1, 14, h - 14, CONSOLE_LIGHTS[Math.floor(q / 22) % 4], .9]); break; // the same panels 09-obstacles draws
    case 'desk': if (!o.reception) { const my = o.flip ? Y + 6 : Y + h - 12; for (const f of [.27, .73]) out.push([X + w * f, my + 2.5, 16, 3, '#5a8ad0', .75]); } break; // monitors
    case 'generator': out.push([X + w - 10, Y + 8, 8, 8, '#e8b326', .8]); break;
    case 'reactor': out.push([o.x, o.y, o.r * .9, o.r * .9, '#9dffd8', 1]); break;
    case 'holo': out.push([o.x, o.y, o.r * 1.5, o.r * 1.5, '#5fffd0', .45]); break;
    case 'pod': out.push([o.x, o.y, o.r * 1.5, o.r * 1.5, '#7fffc8', .3]); break;
    case 'cryo': out.push([X + w / 2, Y + h / 2, w - 8, h - 8, '#aae6ff', .3]); break;
  }
  return out;
}
function bakePropGlow(list = obstacles) {
  glx.setTransform(1, 0, 0, 1, 0, 0); glx.clearRect(0, 0, glowC.width, glowC.height); glx.setTransform(GLOW_K, 0, 0, GLOW_K, 0, 0); glowAny = false;
  for (const o of list) {
    const em = glowEmitters(o); if (!em.length) continue; glowAny = true;
    const turned = o.rot && o.rot % 360 && typeof objPivot === 'function', [px, py] = turned ? objPivot(o) : [0, 0];
    glx.save(); if (turned) { glx.translate(px, py); glx.rotate(o.rot * Math.PI / 180); glx.translate(-px, -py); }
    for (const [cx, cy, ew, eh, c, a] of em) {
      const [r, g, b] = bfxRgb(c), rx = ew / 2 + 9, ry = eh / 2 + 9;
      glx.save(); glx.translate(cx, cy); glx.scale(rx, ry);
      const gr = glx.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, `rgba(${r},${g},${b},${(.55 * a).toFixed(3)})`); gr.addColorStop(.45, `rgba(${r},${g},${b},${(.22 * a).toFixed(3)})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      glx.fillStyle = gr; glx.fillRect(-1, -1, 2, 2); glx.restore();
    }
    glx.restore();
  }
}
function drawPropGlow(x) {
  if (!glowAny || SETTINGS.bloom === false || !light) return;
  const k = (.3 + .7 * clamp(light.dark || 0, 0, 1)) * (.94 + .06 * Math.sin(T * 2.1)); // a touch of life, like a screen's flicker
  x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = k; x.drawImage(glowC, 0, 0, W, H); x.restore();
}

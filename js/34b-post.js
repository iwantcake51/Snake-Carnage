/* =========================================================
   GPU POST-PROCESSING (Settings › Graphics › GPU effects)
   The 2D canvas (#c) still draws the whole frame as before. Once a frame that finished picture is handed to WebGL as a
   texture and drawn onto #glc, laid exactly over it (#c stays where it is for layout and input, but unseen), through one
   shader that does what used to need whole-screen canvas copies or a CSS filter:
   - the color grade (saturation, brightness, contrast, the death screen's grey: the CSS filter render used to set)
   - the darkness and kill vignette, the gas's green edge and static
   - the wall daze's wobble, the double vision after a wall, a blast or a death (chromaSplit)
   - a blast front's push and pull and the heat over craters (drawShockwaves' warps; the rings stay 2D)
   - the soft blurred edges of a lunge and a daze (softEdges), the concussion's glow (concussBloom), burning's heat haze
   - bloom: a soft glow off the brightest, most colorful light (lamps, fire, blasts), with the Bloom setting
   The blur and the bloom are worked at a quarter size in two cheap passes each, only on frames that need them.
   Off (or no WebGL, or a lost context) the old canvas versions run exactly as before. Anything that would draw one of
   these effects in 2D asks POST.on first and leaves its numbers in PF instead; POST.present() spends them and clears them.
   ========================================================= */
const PF = { grade: null, vig: null, wob: 0, ca: 0, cad: 0, cb: 0, edges: [], sw: [], hz: [], haze: 0, gas: null };
const POST = { on: false, gl: null, el: null, P: {}, T: {}, F: {}, w: 0, h: 0, lost: false, probe: null, verdict: '' };
function postClear() { PF.grade = PF.vig = PF.gas = null; PF.wob = PF.ca = PF.cad = PF.cb = PF.haze = 0; PF.edges.length = PF.sw.length = PF.hz.length = 0; }
const POST_HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
const POST_VS = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0., 1.); }';
const POST_DOWN = POST_HEAD + `uniform sampler2D t; uniform vec2 ts, res; uniform float th;
void main() { vec2 uv = gl_FragCoord.xy / res;
  vec3 c = (texture2D(t, uv + ts * vec2(-1., -1.)).rgb + texture2D(t, uv + ts * vec2(1., -1.)).rgb + texture2D(t, uv + ts * vec2(-1., 1.)).rgb + texture2D(t, uv + ts * vec2(1., 1.)).rgb) * .25;
  if (th >= 0.) { float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)), sat = mx > .001 ? (mx - mn) / mx : 0.; c *= smoothstep(th, th + .22, mx) * (.35 + .65 * sat); } // the bright pass: white (snow, a speech bubble) glows far less than colored light
  gl_FragColor = vec4(c, 1.); }`;
const POST_BLUR = POST_HEAD + `uniform sampler2D t; uniform vec2 dir, res;
void main() { vec2 uv = gl_FragCoord.xy / res;
  vec3 c = texture2D(t, uv).rgb * .2270270;
  c += (texture2D(t, uv + dir * 1.3846154).rgb + texture2D(t, uv - dir * 1.3846154).rgb) * .3162162;
  c += (texture2D(t, uv + dir * 3.2307692).rgb + texture2D(t, uv - dir * 3.2307692).rgb) * .0702703;
  gl_FragColor = vec4(c, 1.); }`;
const POST_FS = POST_HEAD + `uniform sampler2D uS, uB, uG; uniform vec2 uRes, uBoard; uniform float uDpr, uT, uFrame;
uniform vec4 uGrade; uniform float uNV; uniform vec4 uVigC; uniform vec2 uVigR;
uniform vec2 uCA; uniform float uWob, uCB, uHaze, uBloomK, uUseB;
uniform vec4 uE[2]; uniform vec2 uEs[2];
uniform vec4 uSW[3]; uniform vec2 uSWb[3]; uniform vec4 uHZ[3]; uniform float uHZs[3];
uniform vec3 uGas;
float lum(vec3 c) { return dot(c, vec3(.2126, .7152, .0722)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float bandA(float v) { return v < .45 ? mix(1., .75, v / .45) : mix(.75, 0., (v - .45) / .55); } // burn haze: strong at the screen's edge, gone by the band's inner side
void main() {
  vec2 fc = gl_FragCoord.xy, cp = vec2(fc.x, uRes.y - fc.y), bp = cp / uDpr, ctr = uBoard * .5, off = vec2(0.);
  if (uWob > 0.) off.x += sin(cp.y / uRes.y * 9. + uT * 3.1) * uWob + sin(uT * 1.7 + cp.y * .01) * uWob * .4; // after a wall: slow waves
  for (int i = 0; i < 3; i++) { vec4 s = uSW[i]; if (s.w <= 0.) continue; vec2 d = cp - s.xy; float r = length(d); vec2 b = uSWb[i]; // a blast front: pushed out just outside it, pulled in just inside
    if (r < b.y && r > b.x) { bool o = r >= s.z; float sc = o ? 1. + s.w * .7 : 1. - s.w * .5, e = o ? smoothstep(b.y, b.y - 6. * uDpr, r) : smoothstep(b.x, b.x + 6. * uDpr, r); off += (s.xy + d / sc - cp) * e; } }
  for (int i = 0; i < 3; i++) { vec4 h = uHZ[i]; if (h.w <= 0.) continue; float e = length(cp - h.xy) / h.z; // heat over a crater: thin strips sway
    if (e < 1.) off.x += sin(uT * 9. + (cp.y - h.y + h.z) / (h.z / 3.) * 2.1 + uHZs[i]) * 1.6 * h.w * uDpr * smoothstep(1., .82, e); }
  if (uHaze > 0.) { // burning: heat haze rippling in from every edge
    float H = uRes.y, Wd = uRes.x, sb = H * .24, st = H * .12, sw = Wd * .1, wave = sin(bp.y * .045 + uT * 7.5) + .5 * sin(bp.y * .11 + uT * 12.3), dx = 0.;
    if (cp.y > H - sb) { float u = (cp.y - (H - sb)) / sb; dx = wave * uHaze * u * u * bandA(1. - u); }
    else if (cp.y < st) { float u = 1. - cp.y / st; dx = wave * uHaze * .6 * u * u * bandA(1. - u); }
    else if (cp.x < sw) dx = wave * uHaze * .8 * bandA(cp.x / sw);
    else if (cp.x > Wd - sw) dx = wave * uHaze * .8 * bandA((Wd - cp.x) / sw);
    off.x += dx; }
  vec2 uv = (cp + off) / uRes;
  vec3 c = texture2D(uS, uv).rgb;
  if (uUseB > .5) {
    vec3 bl = texture2D(uB, uv).rgb;
    for (int i = 0; i < 2; i++) { vec4 e = uE[i]; if (e.x <= 0.) continue; vec2 q = bp - ctr; float t = length(vec2(q.x * e.z / e.y, q.y)) / e.z, m = clamp((t - uEs[i].x) / (uEs[i].y - uEs[i].x), 0., 1.) * e.x; // soft edges: blurred outside an ellipse
      c = mix(c, mix(bl, vec3(lum(bl)), e.w), m); }
    if (uCA.x > 0.) { float k = uCA.x, dd = uCA.y / uRes.x, a1 = .22 * k, a3 = .1 * k; // grey ghosts swinging side to side
      float g1 = lum(texture2D(uB, uv - vec2(dd, 0.)).rgb), g2 = lum(texture2D(uB, uv + vec2(dd, 0.)).rgb), g3 = lum(texture2D(uB, uv - vec2(2.1 * dd, 0.)).rgb);
      float qc = g1 * a1, qa = a1; qc = g2 * a1 + qc * (1. - a1); qa = a1 + qa * (1. - a1); qc = g3 * a3 + qc * (1. - a3); qa = a3 + qa * (1. - a3);
      c = vec3(qc) + c * (1. - qa); }
    if (uCB > 0.) { vec3 b = clamp((bl * 1.15 - .5) * 1.4 + .5, 0., 1.); c = mix(c, 1. - (1. - c) * (1. - b), uCB); } // dazed: bright parts spill light
  }
  if (uGas.x > 0.) { vec2 q = bp - ctr; q.x *= uBoard.y / uBoard.x; float t = length(q) / (uBoard.y * .5 * 1.41421 * (1. + uGas.y)); c = mix(c, vec3(.3725, .4706, .098), clamp((t - .45) / .55, 0., 1.) * .42 * uGas.x); // breathing gas: the edges go green
    if (uGas.z > 0.) c = mix(c, vec3(hash(floor(bp / 1.5) + vec2(uFrame * 37., uFrame * 17.))), uGas.z); } // and static creeps in
  if (uVigC.a > 0.) c = mix(c, uVigC.rgb, uVigC.a * clamp((length(bp - ctr) - uVigR.x) / (uVigR.y - uVigR.x), 0., 1.));
  if (uBloomK > 0.) c += texture2D(uG, uv).rgb * uBloomK;
  float L;
  if (uNV > .5) { c = (c - .5) * uGrade.z + .5; c *= uGrade.y; L = lum(c); c = mix(c, vec3(L), uGrade.w); } // night vision: contrast, brightness, grey
  else { L = lum(c); c = mix(vec3(L), c, uGrade.x); c *= uGrade.y; c = (c - .5) * uGrade.z + .5; } // saturate, brightness, contrast (as the CSS filter did)
  gl_FragColor = vec4(clamp(c, 0., 1.), 1.); }`;
function postProg(gl, fs) {
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('[post] shader: ' + gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, POST_VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('[post] link: ' + gl.getProgramInfoLog(p));
  const u = {}; for (const m of fs.matchAll(/uniform\s+\w+\s+([^;]+);/g)) for (const d of m[1].split(',')) { const name = d.trim().replace(/\[.*$/, ''); u[name] = gl.getUniformLocation(p, name); } // by name from the source: one the compiler dropped comes back null, which WebGL simply ignores
  return { p, u };
}
function postTex(gl, w, h) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); if (w) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); return t; }
function postFbo(gl, w, h) { const t = postTex(gl, w, h), f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null); return { t, f, w, h }; }
function postSize() { // the small buffers follow the frame's size
  const gl = POST.gl, w = cv.width, h = cv.height; if (POST.w === w && POST.h === h) return;
  POST.el.width = POST.w = w; POST.el.height = POST.h = h;
  for (const k in POST.F) { gl.deleteTexture(POST.F[k].t); gl.deleteFramebuffer(POST.F[k].f); }
  const qw = Math.max(1, Math.round(w / 4)), qh = Math.max(1, Math.round(h / 4));
  POST.F = { a: postFbo(gl, qw, qh), b: postFbo(gl, qw, qh), g: postFbo(gl, qw, qh), g2: postFbo(gl, qw, qh) };
}
function postInit() {
  if (POST.gl || POST.lost) return !!POST.gl;
  try {
    const el = POST.el || document.createElement('canvas'); el.id = 'glc';
    const opt = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: !/[?&]glforce/.test(location.search) }; // (no software WebGL: there the canvas path is far faster; ?glforce allows it, for testing)
    const gl = el.getContext('webgl2', opt) || el.getContext('webgl', opt); if (!gl) return false;
    const dri = gl.getExtension('WEBGL_debug_renderer_info'), who = String(dri ? gl.getParameter(dri.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(who) && opt.failIfMajorPerformanceCaveat) { POST.verdict = 'software gl'; POST.lost = true; return false; } // a software renderer: the canvas path is faster
    POST.el = el; POST.gl = gl;
    if (!el.parentNode) { cv.after(el); el.addEventListener('webglcontextlost', e => { e.preventDefault(); postOff(true); }); el.addEventListener('webglcontextrestored', () => { POST.lost = false; POST.gl = null; POST.w = 0; if (SETTINGS.postFx !== 'Off') postOn(); }); }
    POST.P = { down: postProg(gl, POST_DOWN), blur: postProg(gl, POST_BLUR), fin: postProg(gl, POST_FS) };
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    POST.T.scene = postTex(gl, 0, 0); POST.T.black = postTex(gl, 1, 1);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    POST.w = 0; postSize(); postMirror();
    return true;
  } catch (e) { console.warn(e); POST.gl = null; return false; }
}
function postMirror() { // the GL canvas sits exactly over #c, sized and moved with it (the menus slide and zoom #c)
  const el = POST.el; if (!el) return;
  el.style.width = cv.style.width; el.style.height = cv.style.height; el.style.left = cv.offsetLeft + 'px'; el.style.top = cv.offsetTop + 'px';
  el.style.translate = cv.style.translate; el.style.scale = cv.style.scale;
}
new MutationObserver(postMirror).observe(cv, { attributes: true, attributeFilter: ['style'] }); addEventListener('resize', () => requestAnimationFrame(postMirror));
function postOn() {
  if (!postInit()) { POST.on = false; return false; }
  POST.on = true; stage.classList.add('glpost'); cv.style.filter = 'none'; lastFilter = 'none'; postMirror(); return true;
}
function postOff(lost) { POST.on = false; if (lost) POST.lost = true; stage.classList.remove('glpost'); lastFilter = ''; postClear(); } // the old path redraws its CSS filter next frame
function postPresent() { // the finished 2D frame, through the shader, onto the screen
  const gl = POST.gl; if (!POST.on || !gl || gl.isContextLost()) { postClear(); return; }
  postSize();
  const { P, T: Tx, F } = POST, w = POST.w, h = POST.h;
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, Tx.scene);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
  const needB = PF.edges.length > 0 || PF.ca > .01 || PF.cb > .01, needG = SETTINGS.bloom && !SETTINGS.simpleFx && SETTINGS.fxLevel !== 'Low';
  const pass = (prog, fb, src, set) => { gl.bindFramebuffer(gl.FRAMEBUFFER, fb ? fb.f : null); gl.viewport(0, 0, fb ? fb.w : w, fb ? fb.h : h); gl.useProgram(prog.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src); gl.uniform1i(prog.u.t, 0); set(prog.u); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  const chain = (a, b, th, spread) => { // the frame at a quarter size (bright parts only, for bloom), then blurred across and down
    pass(P.down, a, Tx.scene, u => { gl.uniform2f(u.ts, 1 / w, 1 / h); gl.uniform2f(u.res, a.w, a.h); gl.uniform1f(u.th, th); });
    pass(P.blur, b, a.t, u => { gl.uniform2f(u.dir, spread / a.w, 0); gl.uniform2f(u.res, b.w, b.h); });
    pass(P.blur, a, b.t, u => { gl.uniform2f(u.dir, 0, spread / a.h); gl.uniform2f(u.res, a.w, a.h); });
  };
  if (needB) chain(F.a, F.b, -1, 1);
  const dark = light ? light.dark || 0 : 0, bk = needG ? .42 * (.3 + .7 * dark) * (nightVision ? .4 : 1) : 0;
  if (bk > .01) chain(F.g, F.g2, .8, 1.3);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h); const U = P.fin.u; gl.useProgram(P.fin.p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, Tx.scene); gl.uniform1i(U.uS, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, needB ? F.a.t : Tx.black); gl.uniform1i(U.uB, 1);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, bk > .01 ? F.g.t : Tx.black); gl.uniform1i(U.uG, 2);
  gl.uniform2f(U.uRes, w, h); gl.uniform2f(U.uBoard, W, H); gl.uniform1f(U.uDpr, DPR); gl.uniform1f(U.uT, UT); gl.uniform1f(U.uFrame, (UT * 24 | 0) % 97);
  const gr = PF.grade || [1, 1, 1, 0, 0]; gl.uniform4f(U.uGrade, gr[0], gr[1], gr[2], gr[3]); gl.uniform1f(U.uNV, gr[4]);
  const v = PF.vig; gl.uniform4f(U.uVigC, v ? v[0] : 0, v ? v[1] : 0, v ? v[2] : 0, v ? v[3] : 0); gl.uniform2f(U.uVigR, v ? v[4] : 0, v ? v[5] : 1);
  gl.uniform2f(U.uCA, PF.ca, PF.cad); gl.uniform1f(U.uWob, PF.wob); gl.uniform1f(U.uCB, PF.cb); gl.uniform1f(U.uHaze, PF.haze); gl.uniform1f(U.uBloomK, bk > .01 ? bk : 0); gl.uniform1f(U.uUseB, needB ? 1 : 0);
  const E = new Float32Array(8), Es = new Float32Array(4); PF.edges.slice(0, 2).forEach((e, i) => { E.set([e[0], e[1], e[2], e[3]], i * 4); Es.set([e[4], e[5]], i * 2); }); gl.uniform4fv(U.uE, E); gl.uniform2fv(U.uEs, Es);
  const S = new Float32Array(12), Sb = new Float32Array(6); PF.sw.slice(0, 3).forEach((s, i) => { S.set([s[0], s[1], s[2], s[3]], i * 4); Sb.set([s[4], s[5]], i * 2); }); gl.uniform4fv(U.uSW, S); gl.uniform2fv(U.uSWb, Sb);
  const Z = new Float32Array(12), Zs = new Float32Array(3); PF.hz.slice(0, 3).forEach((z, i) => { Z.set([z[0], z[1], z[2], z[3]], i * 4); Zs[i] = z[4]; }); gl.uniform4fv(U.uHZ, Z); gl.uniform1fv(U.uHZs, Zs);
  const g = PF.gas; gl.uniform3f(U.uGas, g ? g[0] : 0, g ? g[1] : 0, g ? g[2] : 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  postClear();
}
/* Is it really faster here? Uploading the canvas each frame is nearly free where the canvas lives on the graphics chip,
   but not everywhere. Once a session, a few seconds into a run whose frames aren't already fast, it times about a
   second with GPU effects on and a second with them off (the two look the same), and keeps the faster one. */
function postProbeTick(ms) {
  if (POST.verdict || state !== 'play' || SETTINGS.postFx === 'Off' || PERF.mode !== 'Off' || /[?&]glforce/.test(location.search)) return;
  const P = POST.probe || (POST.probe = { t: 0, a: [], b: [] }); P.t += ms;
  if (P.t < 4000) return; // let the run settle first
  if (!P.b.length && P.a.length < 60) { if (POST.on) P.a.push(ms); else POST.verdict = 'no gl'; if (P.a.length === 60 && P.a.reduce((s, v) => s + v, 0) / 60 < 12.5) POST.verdict = 'fast'; if (P.a.length === 60 && !POST.verdict) postOff(); return; } // already over 80 fps: nothing to win either way
  if (P.b.length < 60) { P.b.push(ms); if (P.b.length < 60) return;
    const med = a => a.slice().sort((x, y) => x - y)[30], A = med(P.a), B = med(P.b);
    if (A > B * 1.12 && A - B > 1.5) POST.verdict = `canvas faster (${A.toFixed(1)} vs ${B.toFixed(1)} ms)`; else { POST.verdict = `gpu ok (${A.toFixed(1)} vs ${B.toFixed(1)} ms)`; postOn(); } }
}
if (SETTINGS.postFx !== 'Off') postOn(); // (default on: falls back by itself where WebGL isn't there, or isn't faster: postProbeTick)

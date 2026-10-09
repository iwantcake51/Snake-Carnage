/* =========================================================
   AUDIO PASS: real recordings when we have them, better synthesis when we don't.
   - Samples: drop free (CC0) sound files into sounds/ and list them in sounds/manifest.json
     ({ "fuse": ["fuse.ogg"], "explosion": ["explosion1.ogg", "explosion2.ogg"], ... }). They load after the first click
     and take over from the synthesized versions (several files for one name: a random one each time). See sounds/README.md.
   - Without them: a recorded-sounding fuse made from real crackle (thousands of tiny random sparks and pops over a hiss,
     baked once into a looping buffer), and extra layers on the big sounds (a saturated crack on blasts, burning debris
     crackling after them, a wet crunch under gore). The master compressor that glues it all together is in 17-sound (chain).
   ========================================================= */
const SAMPLES = {}; // name -> [AudioBuffer]
function loadSamples() { // once, after the first click (the audio context needs it); only over http(s): a file:// page can't fetch
  if (loadSamples.done || !Sfx.ctx || location.protocol === 'file:') return; loadSamples.done = true;
  fetch('sounds/manifest.json').then(r => r.ok ? r.json() : {}).then(man => {
    for (const [name, files] of Object.entries(man || {})) for (const f of [].concat(files)) {
      fetch('sounds/' + f).then(r => r.ok ? r.arrayBuffer() : Promise.reject(f)).then(b => Sfx.ctx.decodeAudioData(b)).then(buf => { (SAMPLES[name] = SAMPLES[name] || []).push(buf); }).catch(() => {});
    }
  }).catch(() => {});
}
const _sfxInit = Sfx.init;
Sfx.init = function () { const r = _sfxInit.apply(this, arguments); loadSamples(); return r; };
Object.assign(Sfx, {
  has(name) { return !!(SAMPLES[name] && SAMPLES[name].length); },
  sample(name, x, vol = 1, rate = 1, loop = false) { // play a recording through the world's chain (panned, muffled with everything else); returns the source
    if (!this.ok() || !this.has(name)) return null;
    const c = this.ctx, src = c.createBufferSource(), o = this.out(x, vol); src.buffer = pick(SAMPLES[name]); src.loop = loop; src.playbackRate.value = rate * rand(.94, 1.06);
    src.connect(o); src.start(); return src;
  },
  crackleBuf() { // a looping 2.6 s of fuse: a bright hiss, a dense spray of tiny sparks, and the odd bigger pop
    if (this._crk && this._crk.sampleRate === this.ctx.sampleRate) return this._crk;
    const c = this.ctx, sr = c.sampleRate, n = Math.round(sr * 2.6), b = c.createBuffer(1, n, sr), d = b.getChannelData(0);
    let prev = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1, hp = w - prev; prev = w; d[i] = hp * .045 * (.75 + .25 * Math.sin(i / sr * TAU * 5.3) * Math.sin(i / sr * TAU * 1.7)); } // the hiss (high-passed noise), breathing a little
    const burstAt = (i0, A, L, tone) => { for (let k = 0; k < L; k++) { const i = (i0 + k) % n, e = Math.exp(-k / (L * .28)); d[i] += (tone ? Math.sin(k / sr * TAU * tone) * .6 + (Math.random() * 2 - 1) * .4 : Math.random() * 2 - 1) * A * e; } };
    for (let i = 0; i < n;) { i += Math.max(1, Math.floor(-Math.log(Math.random()) * sr / 420)); burstAt(i, Math.pow(Math.random(), 2.4) * .85, Math.floor(sr * (.0003 + Math.random() * .0016)), 0); } // sparks: ~420 a second
    for (let i = 0; i < n;) { i += Math.max(1, Math.floor(-Math.log(Math.random()) * sr / 6)); burstAt(i, rand(.45, .9), Math.floor(sr * rand(.006, .016)), rand(260, 900)); } // pops
    const m = Math.round(sr * .04); for (let j = 0; j < m; j++) { const f = j / m; d[j] *= f; d[n - 1 - j] *= f; } // soft ends so the loop doesn't click
    let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(d[i])); for (let i = 0; i < n; i++) d[i] /= pk || 1;
    return this._crk = b;
  },
  fuseSizzle(v) { // the fuse burning: a real-sounding crackle (or a recording), louder, brighter and faster the closer it gets
    if (!this.ctx || (!this.fz && !(v > 0))) return;
    if (!this.fz) { const c = this.ctx, src = c.createBufferSource(), hp = c.createBiquadFilter(), pk = c.createBiquadFilter(), g = c.createGain();
      src.buffer = this.has('fuse') ? pick(SAMPLES.fuse) : this.crackleBuf(); src.loop = true; hp.type = 'highpass'; hp.frequency.value = 700; hp.Q.value = .5; pk.type = 'peaking'; pk.frequency.value = 4200; pk.Q.value = .8; pk.gain.value = 3; g.gain.value = 0;
      src.connect(hp); hp.connect(pk); pk.connect(g); g.connect(this.bus || c.destination); src.start(0, Math.random() * 2); this.fz = { src, lfo: { stop() {} }, f: hp, g, v: -1 }; }
    const t = this.ctx.currentTime, z = this.fz, u = Math.max(0, v || 0), vv = +(u * (this.has('fuse') ? .55 : .2) * SETTINGS.volume).toFixed(3);
    if (vv !== z.v) { z.g.gain.setTargetAtTime(vv, t, .06); z.f.frequency.setTargetAtTime(500 + 1600 * u, t, .1); z.src.playbackRate.setTargetAtTime(.9 + .35 * u, t, .15); z.v = vv; }
    if (!(v > 0)) { const old = this.fz; this.fz = null; setTimeout(() => { try { old.src.stop(); } catch (e) {} }, 400); }
  },
  crackleTail(o, t, dur, gain, cutoff = 2400) { // burning bits after a blast: a slice of the crackle, fading out
    const c = this.ctx, src = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.crackleBuf(); src.playbackRate.value = rand(.55, .8); lp.type = 'lowpass'; lp.frequency.value = cutoff;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + .12); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    src.connect(lp); lp.connect(g); g.connect(o); src.start(t, Math.random() * 1.5); src.stop(t + dur + .05);
  },
  drive(o, k = 3) { // a soft clipper in front of o: grit and loudness without harsh digital clipping
    const ws = this.ctx.createWaveShaper(), N = 1024, cv = new Float32Array(N); for (let i = 0; i < N; i++) { const x = i / (N - 1) * 2 - 1; cv[i] = Math.tanh(k * x) / Math.tanh(k); }
    ws.curve = cv; ws.oversample = '2x'; ws.connect(o); return ws;
  },
});
// the big ones, layered: a recording if there is one, extra synthesized body if not
const _sfxBoom = Sfx.boom;
Sfx.boom = function (x, k = 1) {
  if (!this.ok()) return;
  if (this.has('explosion')) { this.sample('explosion', x, 1.25 * k, rand(.85, 1.05)); return _sfxBoom.call(this, x, k * .35); } // the recording carries it; the synth adds the sub and the sky echo underneath
  _sfxBoom.call(this, x, k);
  const t = this.ctx.currentTime, o = this.out(x, .9 * k), d = this.drive(o, 4);
  const src = this.ctx.createBufferSource(), lp = this.ctx.createBiquadFilter(), g = this.ctx.createGain(); src.buffer = this.noise; lp.type = 'lowpass'; lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(260, t + .45); // the crack: saturated noise snapping down
  g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(.001, t + .5); src.connect(lp); lp.connect(g); g.connect(d); src.start(t, Math.random() * .4); src.stop(t + .55);
  this.crackleTail(o, t + .25, 2.2 + Math.random(), .35 * k, 1800); // and the wreckage burning
};
const _sfxGore = Sfx.gore;
Sfx.gore = function (x, big) {
  if (this.has('gore') && this.ok()) { if (this.gate(big ? 'goreB' : 'gore', big ? .1 : .05)) this.sample('gore', x, big ? 1 : .55, big ? rand(.8, .95) : rand(1, 1.15)); return; }
  _sfxGore.call(this, x, big);
  if (!this.ok() || !big) return;
  const t = this.ctx.currentTime, o = this.out(x, .5); this.crackleTail(o, t, .25, .5, 900); // a wet crunch under it
};
const _sfxCrash = Sfx.crash;
Sfx.crash = function (x) { if (this.has('crash')) { this.sample('crash', x, 1); return; } _sfxCrash.call(this, x); if (this.ok()) { const t = this.ctx.currentTime, o = this.out(x, .6); this.crackleTail(o, t, .3, .45, 1400); } };
const _sfxEat = Sfx.eat;
Sfx.eat = function (x, human, amount, kind) { _sfxEat.call(this, x, human, amount, kind); if (this.has('bite')) this.sample('bite', x, .8 * clamp(amount || 1, .4, 1.3)); };

/* =========================================================
   SOUND (synthesized with Web Audio, no files)
   ========================================================= */
const Sfx = {
  ctx: null, noise: null, lastShout: 0,
  init() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const n = this.ctx.sampleRate, b = this.ctx.createBuffer(1, n, n), d = b.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        this.noise = b;
        // master bus: everything goes through one lowpass, so a map can muffle the whole soundscape (space: thin air, through a helmet)
        this.chain();
      } catch (e) { return; }
    }
    if (!this.uctx) try { this.uctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} // menu sounds while the world's sound is held (see hold)
    if (this.ctx.state === 'suspended' && !this.held) this.ctx.resume();
    if (this.uctx && this.uctx.state === 'suspended') this.uctx.resume();
  },
  chain() { // the world's output: bus -> lowpass -> speakers, plus head (inside your head: the ear ringing skips the muffle)
    const c = this.ctx;
    this.bus = c.createGain(); this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000; this.lp.Q.value = .5;
    this.master = c.createGain(); // (fades the whole world out on death)
    if (!this.comp) { const cp = this.comp = c.createDynamicsCompressor(); cp.threshold.value = -16; cp.knee.value = 14; cp.ratio.value = 3.5; cp.attack.value = .004; cp.release.value = .22; const mk = c.createGain(); mk.gain.value = 1.25; cp.connect(mk); mk.connect(c.destination); } // a master compressor: glues the mix, keeps big blasts from clipping, lifts the quiet stuff a little
    this.master.connect(this.comp);
    this.hs = c.createBiquadFilter(); this.hs.type = 'highshelf'; this.hs.frequency.value = 3200; this.setSoftHigh(); // Soften high sounds: a shelf off the top of the whole world
    this.bus.connect(this.lp); this.lp.connect(this.hs); this.hs.connect(this.master); this.head = c.createGain(); this.head.connect(this.hs);
    this.setMuffle(this.muffled);
  },
  setSoftHigh() { if (this.hs) this.hs.gain.value = SETTINGS.softHigh ? -16 : 0; },
  hold(on) { // the game paused (or the solo death screen up): the world's sound stops where it is and picks up again on resume
    if (!this.ctx || on === !!this.held) return;
    clearTimeout(this.fadeTO);
    if (on) { this.held = state === 'dead' ? 'dead' : 'pause';
      if (this.held === 'dead' && this.master) { this.master.gain.setTargetAtTime(0, this.ctx.currentTime, .4); this.fadeTO = setTimeout(() => { if (this.held) this.ctx.suspend(); }, 1800); } // dying: everything fades away over a second or so, then stops
      else this.ctx.suspend(); return; }
    if (this.master) { this.master.gain.cancelScheduledValues(this.ctx.currentTime); this.master.gain.setValueAtTime(1, this.ctx.currentTime); }
    const back = this.held === 'pause' && ['play', 'held', 'ready', 'intro'].includes(state); this.held = false;
    if (!back) this.flush(); // the run is over: whatever was still playing in it (a jet, a cannon run, an echo) is dropped, not resumed in the menu
    this.ctx.resume();
  },
  flush() { // cut off every world sound in flight: a fresh output chain; the old one, and everything still feeding it, is let go
    if (!this.bus) return;
    try { this.bus.disconnect(); this.lp.disconnect(); this.hs.disconnect(); this.head.disconnect(); this.master.disconnect(); } catch (e) {}
    if (this.sl) { try { this.sl.src.stop(); } catch (e) {} this.sl = null; }
    if (this.fz) { try { this.fz.src.stop(); this.fz.lfo.stop(); } catch (e) {} this.fz = null; } // the Short fuse's hiss
    this.verb = null; this.mus = null; this.flys = []; this.dzF = 0; this.ringUntil = 0; this.chain();
  },
  setMuffle(on) {
    this.muffled = !!on; this.dzF = 0; if (!this.lp) return;
    const t = this.ctx.currentTime; this.lp.frequency.setTargetAtTime(on ? 520 : 20000, t, .15); this.bus.gain.setTargetAtTime(on ? .9 : 1, t, .15);
  },
  daze(k, wall, deep) { // concussed: the world goes muffled, much more after a wall (or a blast right next to you: deep), and clears smoothly as it wears off
    if (!this.lp) return;
    const base = this.muffled ? 520 : 20000, f = k > 0 ? base * Math.pow((wall ? 260 : deep ? 340 : 1300) / base, Math.min(1, k)) : base;
    if (Math.abs(f - (this.dzF || base)) / base < .01) return; this.dzF = f;
    const t = this.ctx.currentTime; this.lp.frequency.setTargetAtTime(Math.min(base, f), t, .12); this.bus.gain.setTargetAtTime((this.muffled ? .9 : 1) * (1 - (wall ? .35 : deep ? .3 : .15) * Math.min(1, k)), t, .12);
  },
  ok() { return this.ctx && this.ctx.state === 'running' && SETTINGS.volume > 0; },
  out(x, vol = 1) {
    const c = this.ctx, g = c.createGain(); g.gain.value = SETTINGS.volume * vol;
    const dst = !this.bus || (x === undefined && (state === 'menu' || state === 'paused')) ? c.destination : this.bus; // menu sounds stay crisp; the world gets muffled
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = x === undefined ? 0 : clamp(x / W * 2 - 1, -1, 1) * .7; g.connect(p); p.connect(dst); }
    else g.connect(dst);
    return g;
  },
  burst(dest, t, dur, freq, q, gain, type = 'bandpass') {
    const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest); src.start(t, Math.random() * .5); src.stop(t + dur + .02);
    return f;
  },
  voice(dest, t, f0, f1, dur, type, formant, vib, gain) {
    const c = this.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    l.frequency.value = vib; lg.gain.value = f0 * .05; l.connect(lg); lg.connect(o.frequency);
    f.type = 'bandpass'; f.frequency.value = formant; f.Q.value = 1.4;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + .03); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(f); f.connect(g); g.connect(dest); o.start(t); l.start(t); o.stop(t + dur + .05); l.stop(t + dur + .05);
  },
  eat(x, human, amount, kind) { // snap of the jaws, bones giving way, a wet squelch, then the swallow
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime, o = this.out(x, 1.05), big = clamp(amount, .25, 1.4), pv = rand(.9, 1.12);
    this.burst(o, t, .03, 2800 * pv, 1, .75); this.tone(o, t, 240 * pv, 70, .08, 'square', .1); // the bite
    const th = c.createOscillator(), tg = c.createGain(); // body thump, deeper for bigger meals
    th.frequency.setValueAtTime(150 - 40 * big, t); th.frequency.exponentialRampToValueAtTime(34, t + .22);
    tg.gain.setValueAtTime(.55 + .45 * big, t); tg.gain.exponentialRampToValueAtTime(.001, t + .28);
    th.connect(tg); tg.connect(o); th.start(t); th.stop(t + .32);
    const cr = (human ? 6 : 3) + Math.round(big * 3); let ct = t + .02;
    for (let k = 0; k < cr; k++) { ct += rand(.018, .05); this.burst(o, ct, rand(.012, .035), rand(1300, 4200), 4, rand(.35, .85)); } // bones
    const sq = this.burst(o, t + .04, .55, 1500, 1.4, .3 + .45 * big, 'lowpass'); // wet squelch
    sq.frequency.setValueAtTime(1700, t + .04); sq.frequency.exponentialRampToValueAtTime(130, t + .55);
    const sl = this.burst(o, t + .16, .22, 700, 3, .18 * big, 'bandpass'); sl.frequency.setValueAtTime(500, t + .16); sl.frequency.exponentialRampToValueAtTime(1500, t + .36); // slurp
    this.tone(o, t + .34, 210 * pv, 80, .16, 'sine', .3 * big); this.tone(o, t + .37, 120, 60, .12, 'sine', .2 * big); // gulp
    if (kind === 'alien') this.voice(o, t, rand(1100, 1400), rand(2000, 2600), .32, 'sine', 2600, 28, .1); // a warbling squeal
    else if (human) this.voice(o, t, rand(480, 680), rand(160, 220), .45, 'sawtooth', 1100, 9, .2); // cut-off scream
    else this.voice(o, t, rand(1000, 1500), rand(400, 600), .2, 'square', 1800, 22, .09);
  },
  shout(x) {
    if (!this.ok() || this.ctx.currentTime - this.lastShout < .2) return;
    const t = this.ctx.currentTime; this.lastShout = t;
    this.voice(this.out(x, .35), t, rand(280, 420), rand(380, 520), rand(.25, .4), 'sawtooth', rand(750, 1000), 7, .2);
  },
  /* panic voices: the same synthesized vocal, shaped into a few reaction profiles. p = this person's pitch (about .8 .. 1.25).
     shout: the usual yell. yelp: a short, high, startled squeak (rare: see voiceProfile). scream: strained and raspy, it cracks.
     low: a deep, chesty bark. breath: winded gasps with a weak voice behind them. */
  vocal(x, prof = 'shout', p = 1) {
    if (!this.ok() || this.ctx.currentTime - this.lastShout < .18) return;
    const t = this.ctx.currentTime; this.lastShout = t; const o = this.out(x, .35);
    switch (prof) {
      case 'yelp': { const f = rand(820, 1150) * p; this.voice(o, t, f, f * rand(1.25, 1.45), rand(.08, .13), 'triangle', f * 1.6, 0, .17); this.voice(o, t + .1, f * 1.3, f * .75, .09, 'sine', f * 1.4, 18, .08); break; } // up, then it breaks off
      case 'scream': { const f = rand(560, 760) * p, d = rand(.45, .7); this.voice(o, t, f, f * rand(.75, .9), d, 'sawtooth', rand(1500, 2100), rand(9, 14), .2); this.burst(o, t + .03, d * .9, 2400, .9, .05); if (Math.random() < .5) this.voice(o, t + d * .55, f * 1.25, f * 1.1, d * .3, 'sawtooth', 2300, 16, .09); break; } // raspy, and the voice cracks up
      case 'low': { const f = rand(150, 210) * p; this.voice(o, t, f, f * rand(1.05, 1.2), rand(.22, .32), 'sawtooth', rand(480, 650), 5, .24); break; }
      case 'breath': { for (let k = 0; k < 3; k++) this.burst(o, t + k * rand(.14, .2), rand(.06, .09), rand(900, 1300), .8, .09, 'bandpass'); this.voice(o, t + .2, rand(300, 380) * p, rand(250, 300) * p, .22, 'sawtooth', 800, 4, .07); break; }
      default: this.voice(o, t, rand(280, 420) * p, rand(380, 520) * p, rand(.25, .4), 'sawtooth', rand(750, 1000), 7, .2);
    }
  },
  tone(o, t, f0, f1, dur, type, g) {
    const c = this.ctx, os = c.createOscillator(), gg = c.createGain();
    os.type = type; os.frequency.setValueAtTime(f0, t); os.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gg.gain.setValueAtTime(g, t); gg.gain.exponentialRampToValueAtTime(.001, t + dur);
    os.connect(gg); gg.connect(o); os.start(t); os.stop(t + dur + .02);
  },
  gate(key, gap) { const t = this.ctx.currentTime; if (t - (this['_' + key] || 0) < gap) return false; this['_' + key] = t; return true; },
  ui(kind) {
    if (!this.ok() || !SETTINGS.uiSounds) return;
    if (kind !== 'hover' && kind !== 'tick' && kind !== 'click') { // the richer menu set
      const t = this.ctx.currentTime, o = this.out(undefined, .9);
      switch (kind) {
        case 'open': { this.tone(o, t, 320, 760, .16, 'triangle', .09); const f = this.burst(o, t, .18, 600, .8, .05); f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(3000, t + .16); break; }
        case 'close': this.tone(o, t, 760, 320, .15, 'triangle', .08); break;
        case 'tab': this.tone(o, t, 980, 1250, .05, 'sine', .07); break;
        case 'select': this.tone(o, t, 660, 662, .07, 'triangle', .09); this.tone(o, t + .07, 990, 992, .11, 'triangle', .09); break;
        case 'on': this.tone(o, t, 620, 940, .07, 'square', .035); break;
        case 'off': this.tone(o, t, 940, 620, .07, 'square', .03); break;
        case 'confirm': this.tone(o, t, 784, 786, .09, 'triangle', .1); this.tone(o, t + .08, 1175, 1177, .16, 'triangle', .09); break;
        case 'stop': this.tone(o, t, 200, 90, .14, 'sine', .35); this.burst(o, t, .06, 1800, 1, .12); break;
      }
      return;
    }
    const t = this.ctx.currentTime, o = this.out();
    if (kind === 'hover') { if (this.gate('hover', .04)) this.tone(o, t, 1700, 1950, .035, 'sine', .03); }
    else if (kind === 'tick') { if (this.gate('tick', .03)) this.tone(o, t, 2600, 2400, .02, 'sine', .025); }
    else { this.tone(o, t, 520, 900, .07, 'triangle', .1); this.burst(o, t, .03, 4000, 1, .04); }
  },
  start() {
    if (!this.ok()) return;
    const t = this.ctx.currentTime, o = this.out();
    this.tone(o, t, 160, 640, .35, 'triangle', .14);
    const f = this.burst(o, t, .45, 400, .8, .2, 'lowpass'); f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3000, t + .4);
  },
  crash(x) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime, o = this.out(x);
    this.tone(o, t, 95, 28, .5, 'sine', 1);
    this.burst(o, t, .35, 700, .8, .6, 'lowpass'); this.burst(o, t, .08, 2500, 1.5, .3);
    this.tone(o, t + .1, 330, 70, 1, 'sawtooth', .05);
  },
  turn() { if (this.ok() && this.gate('turn', .07)) this.burst(this.out(snake && snake.x), this.ctx.currentTime, .045, 3200, 2, .05); },
  splat(x, wall) {
    if (!this.ok() || !this.gate(wall ? 'wsplat' : 'splat', wall ? .05 : .035)) return;
    this.burst(this.out(x, .8), this.ctx.currentTime, wall ? .11 : .06, wall ? 900 : 1500, 1, wall ? .3 : .09, 'lowpass');
  },
  drip(x) { if (this.ok() && this.gate('drip', .18)) this.tone(this.out(x, .5), this.ctx.currentTime, 1300, 500, .06, 'sine', .05); },
  animal(x, type) {
    const A = { chicken: [1100, 800, .12, 'square', 1500, 30, .08], duck: [520, 420, .16, 'sawtooth', 1000, 0, .1], sheep: [400, 360, .5, 'sawtooth', 900, 7, .1],
      pig: [190, 140, .22, 'sawtooth', 600, 12, .12], dog: [330, 220, .12, 'sawtooth', 800, 0, .14], cat: [650, 820, .4, 'sawtooth', 1300, 5, .08],
      rabbit: [1600, 1200, .08, 'square', 2200, 0, .05], rat: [2400, 1800, .07, 'square', 3000, 0, .04], frog: [140, 110, .18, 'square', 400, 25, .1], alien: [900, 1500, .3, 'sine', 2400, 18, .06], deer: [900, 500, .25, 'sawtooth', 1400, 8, .07] };
    const a = A[type]; if (!a || !this.ok() || !this.gate('animal', .12)) return;
    const t = this.ctx.currentTime, o = this.out(x, .7);
    this.voice(o, t, ...a);
    if (type === 'dog' || type === 'chicken') this.voice(o, t + a[2] + .06, ...a);
  },
  buy() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(); this.tone(o, t, 988, 990, .09, 'square', .06); this.tone(o, t + .09, 1319, 1320, .25, 'square', .06); },
  deny() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(); this.tone(o, t, 160, 120, .18, 'square', .08); this.tone(o, t + .1, 140, 100, .18, 'square', .06); },
  levelUpOld() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(); [523, 659, 784, 1047].forEach((f, k) => this.tone(o, t + k * .09, f, f, .3, 'triangle', .1)); },
  levelUp() { // impact, quick rising arpeggio, sparkle tail
    if (!this.ok()) return;
    const t = this.ctx.currentTime, o = this.out(undefined, .85);
    this.tone(o, t, 150, 50, .3, 'sine', .55); this.burst(o, t, .25, 5200, .7, .1);
    [523, 659, 784, 1047].forEach((f, k) => { this.tone(o, t + .03 + k * .065, f, f * 1.003, .3, 'triangle', .12); this.tone(o, t + .03 + k * .065, f * 2, f * 2, .1, 'square', .02); });
    this.tone(o, t + .32, 2093, 2093, .5, 'sine', .05); this.tone(o, t + .4, 2637, 2637, .45, 'sine', .035);
  },
  goldFade(x) { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(x, .5); [2349, 1976, 1568].forEach((f, k) => this.tone(o, t + k * .07, f, f * .98, .25, 'sine', .04)); },
  musicUpdate(on) { // club music, scheduled a little ahead. It plays out of the speakers: each one is its own source in the room
    if (!this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx, now = c.currentTime;
    if (!on || SETTINGS.volume <= 0) { if (this.mus) { this.mus.g.gain.setTargetAtTime(0, now, .25); const m = this.mus; setTimeout(() => m.g.disconnect(), 1500); this.mus = null; } return; }
    if (!this.mus) {
      const g = c.createGain(), duck = c.createGain(), dly = c.createDelay(1), fb = c.createGain(), dlp = c.createBiquadFilter();
      g.gain.value = 0; g.gain.setTargetAtTime(.6, now, .6); duck.connect(g);
      dly.delayTime.value = 60 / CLUB_BPM * .75; fb.gain.value = .32; dlp.type = 'lowpass'; dlp.frequency.value = 2600; dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(g); // dotted-eighth echo for the lead
      this.mus = { g, duck, dly, next: now + .05, step: 0, bar: 0, chans: [] }; this.musRoute();
    }
    const m = this.mus, spb = 60 / CLUB_BPM / 4, v = SETTINGS.volume;
    while (m.next < now + .25) { this.musicStep(m.step, m.next, m, v); m.next += spb; m.step = (m.step + 1) % 16; if (!m.step) m.bar = (m.bar + 1) % 16; }
    this.musPos();
  },
  musRoute() { // one chain per speaker (gain, distortion for when it dies, pan, distance muffling), plus a muffled room bleed
    const m = this.mus, c = this.ctx, sp = MAPS[mapIdx].club && typeof clubSpeakers !== 'undefined' ? clubSpeakers : [];
    m.chans = sp.map(s => { const g = c.createGain(), sh = c.createWaveShaper(), p = c.createStereoPanner ? c.createStereoPanner() : null, lp = c.createBiquadFilter();
      g.gain.value = 0; lp.type = 'lowpass'; lp.frequency.value = 3000; m.g.connect(g); g.connect(sh); if (p) { sh.connect(p); p.connect(lp); } else sh.connect(lp); lp.connect(this.bus); return { s, g, sh, p, lp }; });
    const rg = c.createGain(), rlp = c.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = sp.length ? 650 : 2400; rg.gain.value = sp.length ? .2 : 1; m.g.connect(rg); rg.connect(rlp); rlp.connect(this.bus); m.room = rg;
  },
  musPos() { // louder and brighter near a speaker, panned toward it; dead speakers stay silent
    const m = this.mus; if (!m || !m.chans.length) return;
    const t = this.ctx.currentTime, lx = snake ? snake.x : W / 2, ly = snake ? snake.y : H / 2; let alive = 0;
    for (const ch of m.chans) {
      if (!ch.s.alive) continue; alive++;
      const d = Math.hypot(ch.s.x - lx, ch.s.y - ly), att = 1 / (1 + (d / 250) ** 2);
      ch.g.gain.setTargetAtTime(.12 + .95 * att, t, .08); ch.lp.frequency.setTargetAtTime(1300 + 7000 * att, t, .1);
      if (ch.p) ch.p.pan.setTargetAtTime(clamp((ch.s.x - lx) / 300, -1, 1) * .85, t, .08);
    }
    m.room.gain.setTargetAtTime(.22 * alive / m.chans.length, t, .3); // all speakers gone: the room goes quiet
  },
  speakerDie(s) { // the speaker distorts, stutters and cuts out; a scratch and a pop where it stood
    if (!this.ctx) return;
    const t = this.ctx.currentTime, m = this.mus, ch = m && m.chans.find(q => q.s === s);
    if (ch) {
      const n = 256, cv = new Float32Array(n); for (let k = 0; k < n; k++) { const x = k / (n - 1) * 2 - 1; cv[k] = Math.tanh(x * 9) * .8; } ch.sh.curve = cv;
      const g = ch.g.gain; g.cancelScheduledValues(t); g.setValueAtTime(1.1, t);
      for (let k = 1; k <= 6; k++) g.setValueAtTime(k % 2 ? .05 : .8 - k * .1, t + k * .055); // cutting in and out
      g.setTargetAtTime(0, t + .38, .1); ch.lp.frequency.cancelScheduledValues(t); ch.lp.frequency.setTargetAtTime(280, t + .08, .12);
    }
    if (!this.ok()) return;
    const o = this.out(s.x, .75), f = this.burst(o, t, .42, 1800, 3, .32); // vinyl scratch: a swept noise band, back and forth
    f.frequency.setValueAtTime(2200, t); f.frequency.exponentialRampToValueAtTime(500, t + .12); f.frequency.exponentialRampToValueAtTime(1900, t + .22); f.frequency.exponentialRampToValueAtTime(260, t + .42);
    this.tone(o, t + .05, 180, 38, .5, 'sawtooth', .07); // the amp dying
    this.burst(o, t + .02, .08, 400, .7, .4, 'lowpass'); // the cone blowing
  },
  musicStep(s, t, m, v) { // a deeper house loop: 16 bars, A minor (Am F C G), with a breakdown and a build
    const c = this.ctx, bar = m.bar, o = m.g, D = m.duck, nf = n => 440 * Math.pow(2, (n - 69) / 12);
    const CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]][bar % 4], root = CH[0] - 24;
    const brk = bar === 12 || bar === 13, lead = (bar >= 8 && bar < 12) || bar >= 14;
    const kick = tt => { const os = c.createOscillator(), g = c.createGain(); os.frequency.setValueAtTime(150, tt); os.frequency.exponentialRampToValueAtTime(44, tt + .14); g.gain.setValueAtTime(.95 * v, tt); g.gain.exponentialRampToValueAtTime(.001, tt + .26); os.connect(g); g.connect(o); os.start(tt); os.stop(tt + .28);
      this.burst(o, tt, .012, 3500, 1, .25 * v); D.gain.setValueAtTime(.35, tt); D.gain.setTargetAtTime(1, tt + .02, .09); }; // the pad and bass breathe around every kick
    if (s % 4 === 0 && !brk) kick(t);
    if (s === 4 || s === 12) { this.burst(o, t, .16, 1500, .9, .34 * v); this.burst(o, t + .01, .35, 2400, .6, .06 * v); } // clap with a little room
    if (!brk) { if (s % 2 === 1) this.burst(o, t, .028, 9000, 1.4, (s % 4 === 3 ? .13 : .07) * v, 'highpass'); if (s % 4 === 2) this.burst(o, t, .16, 7600, 1, .1 * v, 'highpass'); } // closed hats, open hat on the off-beat
    if (!brk && (s % 4 === 2 || s === 7 || s === 15)) { // rolling off-beat bass
      const os = c.createOscillator(), sub = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(); os.type = 'sawtooth'; os.frequency.value = nf(root + 12); sub.frequency.value = nf(root);
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(950, t); lp.frequency.exponentialRampToValueAtTime(160, t + .18); g.gain.setValueAtTime(.2 * v, t); g.gain.exponentialRampToValueAtTime(.001, t + .22);
      os.connect(lp); sub.connect(lp); lp.connect(g); g.connect(D); os.start(t); sub.start(t); os.stop(t + .24); sub.stop(t + .24);
    }
    if (s === 0) { // a warm pad for the whole bar
      const bl = 60 / CLUB_BPM * 4, lp = c.createBiquadFilter(), g = c.createGain(); lp.type = 'lowpass'; lp.frequency.value = brk ? 2200 : 1100; g.gain.setValueAtTime(.001, t); g.gain.linearRampToValueAtTime((brk ? .09 : .055) * v, t + .25); g.gain.setTargetAtTime(.001, t + bl - .2, .15); lp.connect(g); g.connect(D);
      for (const n of CH) for (const dt of [-6, 6]) { const os = c.createOscillator(); os.type = 'sawtooth'; os.frequency.value = nf(n); os.detune.value = dt; os.connect(lp); os.start(t); os.stop(t + bl + .3); }
    }
    if (lead && s % 2 === 0 && [0, 1, 1, 0, 1, 0, 1, 1][(s / 2) | 0]) { // a plucked arpeggio, into the echo
      const n = CH[(s / 2) % 3] + 12 + (s === 14 ? 12 : 0), os = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(); os.type = 'square'; os.frequency.value = nf(n);
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(500, t + .15); g.gain.setValueAtTime(.045 * v, t); g.gain.exponentialRampToValueAtTime(.001, t + .18);
      os.connect(lp); lp.connect(g); g.connect(o); g.connect(m.dly); os.start(t); os.stop(t + .2);
    }
    if (bar === 13 && s === 0) { const f = this.burst(o, t, 60 / CLUB_BPM * 4, 400, 2, .14 * v, 'highpass'); f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(9000, t + 60 / CLUB_BPM * 4); } // the build back into the drop
    if (bar === 13 && s >= 8 && s % 2 === 0) kick(t); // snare-roll feel on the kick before the drop
  },
  comboBreak() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(undefined, .6); this.burst(o, t, .12, 3200, 1.2, .25); this.tone(o, t, 520, 140, .25, 'triangle', .08); for (let k = 0; k < 3; k++) this.tone(o, t + .05 + k * .06, 2600 - k * 500, 1800 - k * 400, .05, 'sine', .03); },
  combo(n) { // rising blip that climbs with the streak
    if (!this.ok()) return;
    const t = this.ctx.currentTime, o = this.out(undefined, .7), f = 520 * Math.pow(2, Math.min(n, 24) / 12);
    this.tone(o, t, f, f * 1.01, .09, 'triangle', .07); this.tone(o, t + .05, f * 1.5, f * 1.5, .08, 'sine', .04);
  },
  golden(small) { // bright bell chord with a sparkly tail: special, not loud (golden animals get a softer, shorter one)
    if (!this.ok()) return;
    const t = this.ctx.currentTime, o = this.out(undefined, small ? .45 : .8);
    if (small) { [[1976, 0], [2637, .07]].forEach(([f, d]) => this.tone(o, t + d, f, f, .6, 'sine', .05)); return; }
    [[1568, 0], [1976, .06], [2349, .12], [3136, .2]].forEach(([f, d]) => { this.tone(o, t + d, f, f, 1.1, 'sine', .07); this.tone(o, t + d, f * 2.01, f * 2, .5, 'sine', .02); });
    for (let k = 0; k < 6; k++) this.tone(o, t + .3 + k * .05, 3000 + k * 300, 3200 + k * 300, .08, 'triangle', .018);
    this.burst(o, t, .6, 7000, .8, .05);
  },
  knock() { // the mystery card gets hit and falls away
    if (!this.ok()) return;
    const t = this.ctx.currentTime, o = this.out();
    this.tone(o, t, 260, 120, .12, 'triangle', .2); this.burst(o, t, .05, 2200, 1.2, .2);
    const f = this.burst(o, t + .15, .9, 2000, .7, .16); f.frequency.setValueAtTime(2400, t + .15); f.frequency.exponentialRampToValueAtTime(200, t + 1);
  },
  roll() { if (this.ok()) this.tone(this.out(undefined, .8), this.ctx.currentTime, 1500, 1100, .03, 'square', .035); },
  whoosh() {
    if (!this.ok()) return;
    const t = this.ctx.currentTime, f = this.burst(this.out(), t, .7, 300, .7, .22);
    f.frequency.setValueAtTime(220, t); f.frequency.exponentialRampToValueAtTime(2400, t + .6);
  },
  pop() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(); this.tone(o, t, 600, 1400, .12, 'triangle', .12); this.burst(o, t, .05, 3000, 1, .08); },
  reveal() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(); [659, 880, 1319].forEach((f, k) => this.tone(o, t + k * .07, f, f, .4, 'triangle', .08)); },
  chime() {
    if (!this.ok()) return;
    const t = this.ctx.currentTime, o = this.out();
    this.tone(o, t, 880, 870, .5, 'sine', .07); this.tone(o, t + .08, 1320, 1310, .6, 'sine', .05);
  },
  slither(moving, wet) { // continuous scale-on-ground hiss; turns wet and louder in blood
    if (!this.ctx) return;
    if (!this.sl) {
      const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = this.noise; src.loop = true; f.type = 'bandpass'; f.Q.value = .9; g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(this.bus || c.destination); src.start(); this.sl = { src, f, g, v: -1, fq: -1 };
    }
    const v = moving ? +((.02 + wet * .07) * SETTINGS.volume).toFixed(3) : 0, fq = wet > .1 ? 600 : 2400, t = this.ctx.currentTime;
    if (v !== this.sl.v) { this.sl.g.gain.setTargetAtTime(v, t, .08); this.sl.v = v; }
    if (fq !== this.sl.fq) { this.sl.f.frequency.setTargetAtTime(fq, t, .1); this.sl.fq = fq; }
  },
  flClick(x, on) { // tiny flashlight switch
    if (!this.ok() || !this.gate('flc', .04)) return;
    const t = this.ctx.currentTime, o = this.out(x, .35);
    this.burst(o, t, .018, on ? 5200 : 4200, 3, .05); this.tone(o, t, on ? 2600 : 2200, on ? 2400 : 1900, .02, 'square', .008);
  },
  lampBreak(x, lit) { // soft thunk, a little glass tinkle, a couple of electric ticks
    if (!this.ok() || !this.gate('lamp', .15)) return;
    const t = this.ctx.currentTime, o = this.out(x, .5);
    this.tone(o, t, 170, 80, .12, 'sine', .12); this.burst(o, t, .09, 1100, .9, .1, 'lowpass');
    for (let k = 0; k < 5; k++) this.tone(o, t + .02 + k * .035 + Math.random() * .02, 3200 + Math.random() * 2600, 2800 + Math.random() * 1500, .07, 'sine', .018);
    this.burst(o, t + .01, .16, 6000, 1.2, .05);
    if (lit) for (let k = 0; k < 3; k++) this.burst(o, t + .04 + k * .06, .025, 7000, 2, .035, 'highpass');
  },
  dash() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(snake && snake.x, .7); const f = this.burst(o, t, .35, 500, .8, .35); f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2600, t + .3); this.tone(o, t, 90, 160, .2, 'sine', .25); },
  vacuum(dur = 2, lv = 1, x) { // a deep inhale: air roaring in, rising in pitch, with a low suck under it
    if (!this.ok()) return; const c = this.ctx, t = c.currentTime, o = this.out(x ?? (snake && snake.x), .8), d = dur + .25;
    const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(); src.buffer = this.noise; src.loop = true; bp.type = 'bandpass'; bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(1500 + 500 * lv, t + d * .8);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.45, t + .18); g.gain.setValueAtTime(.45, t + d - .3); g.gain.exponentialRampToValueAtTime(.001, t + d);
    src.connect(bp); bp.connect(g); g.connect(o); src.start(t, Math.random() * .4); src.stop(t + d + .05);
    this.tone(o, t, 70, 120, d, 'sine', .18); this.tone(o, t + d - .12, 260, 90, .14, 'sine', .25); // the low pull, and a gulp as it closes
  },
  sniff() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(undefined, .6); for (let k = 0; k < 3; k++) this.burst(o, t + k * .12, .09, 2600, 1.5, .18, 'bandpass'); },
  eye() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(undefined, .5); this.tone(o, t, 990, 1480, .22, 'sine', .07); this.tone(o, t + .09, 1480, 1980, .3, 'sine', .05); }, // 3rd Eye: a way out just showed up
  focus(dur = 1.5) { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(undefined, .8); // Focus: the world drops into slow motion, then snaps back
    this.tone(o, t, 180, 55, .7, 'sine', .32); const f = this.burst(o, t, .5, 1800, .8, .14); f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(260, t + .45);
    this.tone(o, t + dur * .9, 70, 190, .35, 'sine', .16); },
  camo() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(undefined, .6); const f = this.burst(o, t, .6, 2400, .7, .12); f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(300, t + .55); },
  hiss() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(snake && snake.x, 1); this.burst(o, t, .9, 5200, .6, .45, 'highpass'); this.burst(o, t, .7, 3200, 1.4, .25); this.tone(o, t, 70, 45, .6, 'sawtooth', .08); },
  smash(x, size) { // wood and plastic giving way
    if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(x, .9), k = clamp(size / 40, .5, 1.4);
    this.tone(o, t, 140 / k, 45, .25, 'sine', .5); this.burst(o, t, .3, 900, .7, .5 * k, 'lowpass');
    for (let i = 0; i < 6; i++) this.burst(o, t + rand(0, .18), rand(.02, .06), rand(1200, 4200), 3, rand(.15, .35));
  },
  click(on) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime, o = this.out(), os = c.createOscillator(), g = c.createGain();
    os.frequency.setValueAtTime(on ? 1500 : 2200, t); os.frequency.exponentialRampToValueAtTime(on ? 4200 : 700, t + .25);
    g.gain.setValueAtTime(.06, t); g.gain.exponentialRampToValueAtTime(.001, t + .28);
    os.connect(g); g.connect(o); os.start(t); os.stop(t + .3);
    this.burst(o, t, .12, 3000, .7, .15);
  }
};
addEventListener('pointerdown', () => Sfx.init());
let hoverBtn = null;
const HOVER_SFX = '.play,.card,.ghost,.tab,.btn,.seg button,.sseg button';
document.addEventListener('pointerover', e => { // soft tick on the important buttons only
  const b = e.target.closest ? e.target.closest(HOVER_SFX) : null;
  if (b !== hoverBtn) { hoverBtn = b; if (b) Sfx.ui('hover'); }
});
document.addEventListener('click', e => { // each button can name its own sound with data-sfx
  const b = e.target.closest && e.target.closest('button'); if (!b) return;
  const k = b.dataset.sfx || 'click'; if (k !== 'none') Sfx.ui(k);
}, true);
document.addEventListener('input', e => {
  if (e.target.type === 'range') Sfx.ui('tick');
  else if (e.target.type === 'color') Sfx.ui('click');
}, true);
// menu sounds while the world's sound is held (paused, or the solo death screen): played through their own small context, so they're heard right away
for (const k of ['ui', 'levelUp', 'buy', 'deny', 'whoosh', 'roll', 'knock', 'start', 'click', 'pop', 'reveal', 'chime', 'tick']) {
  const f = Sfx[k]; if (typeof f !== 'function') continue;
  Sfx[k] = function (...a) {
    if (!this.held || !this.uctx) return f.apply(this, a);
    const keep = [this.ctx, this.bus, this.lp, this.head, this.verb, this.master]; this.ctx = this.uctx; this.bus = this.lp = this.head = this.verb = this.master = null;
    try { return f.apply(this, a); } finally { [this.ctx, this.bus, this.lp, this.head, this.verb, this.master] = keep; }
  };
}

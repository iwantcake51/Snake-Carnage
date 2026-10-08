/* =========================================================
   HEARING: sound events the crowd can react to without seeing anything.
   Blind crowd runs entirely on this. A sound is { x, y, r (how far it carries), k (how loud, 0..1), type, life },
   and a listener never learns where the snake IS, only where a noise seemed to come from:
   - the guess gets worse with distance (direction and range both wobble), and walls muffle a sound (shorter reach, quieter);
   - every sound heard is folded into the listener's running guess (c.ear), so a repeated noise sharpens it;
   - screams, footsteps and crunches come from where the PERSON was, so panic spreads as "away from that yelling",
     never as a copy of someone else's threat coordinates.
   Only touch is exact: something brushing past your leg is right there.
   ========================================================= */
const SND = { // type: [reach px, loudness, how frightening 0..1, life s]
  slither: [120, .4, .4, .3], squelch: [150, .5, .5, .3], steps: [80, .3, .3, .35], scream: [170, .85, .85, .5], animal: [120, .5, .45, .4],
  kill: [230, 1, 1, .6], smash: [260, .9, .8, .5], wallSmash: [340, 1, 1, .6], lamp: [220, .7, .6, .5], hiss: [260, 1, 1, .6], splash: [140, .5, .5, .4], boom: [560, 1, 1, .8],
};
let sounds = [], soundSeq = 0;
function noise(type, x, y, k = 1, r) { // something made a sound here (cheap: only kept while it's audible)
  if (state !== 'play' && state !== 'ready') return;
  const d = SND[type] || SND.slither, wide = (type === 'scream' || type === 'kill') && MOD.doublePanic ? 1.6 : 1;
  if (sounds.length > 48) sounds.shift(); // a hard cap: a stampede can't flood it
  sounds.push({ id: ++soundSeq, type, x, y, r: (r || d[0]) * wide, k: d[1] * k, fear: d[2], t: T, life: d[3] });
}
function updateSounds() { let n = 0; for (const s of sounds) if (T - s.t < s.life) sounds[n++] = s; sounds.length = n; }
function guessAt(c, x, y, reach = 260) { // where a listener thinks a sound at (x, y) came from: near is sharp, far is vague
  const dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy), err = clamp(.12 + .9 * d / reach, .12, 1);
  const a = Math.atan2(dy, dx) + gauss() * err * .85, dd = Math.max(8, d * (1 + gauss() * err * .45)); // up to ~±45° and ±45% range at the edge of hearing
  return { x: clamp(c.x + Math.cos(a) * dd, B, W - B), y: clamp(c.y + Math.sin(a) * dd, B, H - B) };
}
function hear(c) { // fold every new sound this listener can hear into their guess; returns how scary the worst one was
  if (c.blastDeafT > T) { c.hearId = soundSeq; return null; } // unheard events cannot replay when hearing returns
  let worst = 0, worstS = null;
  const last = c.hearId || 0;
  for (const s of sounds) {
    if (s.id <= last || s.src === c) continue;
    const d2 = dist2(c.x, c.y, s.x, s.y); if (d2 > s.r * s.r) continue;
    let d = Math.sqrt(d2), r = s.r, k = s.k;
    if (d > 28 && !los(c.x, c.y, s.x, s.y)) { r *= .55; k *= .55; if (d >= r) continue; } // through a wall: muffled and shorter
    const v = k * (1 - d / r) * (c.deafT > T ? .3 : 1); // ears ringing after a Hiss II: almost nothing gets through
    if (v < .03) continue;
    const g = guessAt(c, s.x, s.y, r), E = c.ear || (c.ear = { x: g.x, y: g.y, conf: 0, t: T });
    E.conf *= Math.exp(-(T - E.t) * .35); // an old guess fades
    const w = v / (E.conf + v); E.x += (g.x - E.x) * w; E.y += (g.y - E.y) * w; E.conf = Math.min(3, E.conf + v); E.t = T; // repeats sharpen it
    const f = v * s.fear; if (f > worst) { worst = f; worstS = s; }
  }
  c.hearId = soundSeq;
  return worstS ? { v: worst, s: worstS } : null;
}
const touchingSnake = c => { // physical contact only: a segment right against them (no radar for the rest of the body)
  if (!snake || !snake.started) return null;
  const R = c.def.r + snakeRadius() + 5, n = snake.segs.length;
  if (dist2(c.x, c.y, snake.x, snake.y) > (R + n * snakeSegmentSpacing()) ** 2) return null; // nowhere near any part of it
  for (let i = 0; i < n; i += 2) { const g = snake.segs[i]; if (dist2(c.x, c.y, g.x, g.y) < R * R) return g; }
  return null;
};
function blindPerceive(c, hum) { // the Blind crowd's version of looking around: listening, and feeling
  const g = touchingSnake(c);
  if (g) { // brushed against it: the one exact piece of information they ever get
    const dx = c.x - g.x, dy = c.y - g.y, dd = Math.hypot(dx, dy) || 1; c.avx += dx / dd * 1.2; c.avy += dy / dd * 1.2; // recoil from the touch itself
    if (c.state !== 'panic') { panic(c, g.x, g.y, rand(3, 5), hum ? 'touched' : 'panic'); c.wasChased = true; adrenFrom(c, g.x, g.y); }
    else { c.fx = g.x; c.fy = g.y; }
    c.ear = { x: g.x, y: g.y, conf: 3, t: T };
    return;
  }
  const h = hear(c); if (!h) return;
  const E = c.ear, scary = h.v;
  if (c.fl && c.fl.on && !c.fl.helmet) c.fl.look = { x: E.x, y: E.y, t: rand(.8, 1.6) }; // the beam swings round to the noise, roughly
  if (c.state === 'panic') { if (scary > .12) { c.fx = E.x; c.fy = E.y; c.timer = Math.max(c.timer, rand(1.5, 3)); } return; } // keep running from the latest guess, not from the real thing
  const brave = hasTrait(c, 'calm') || hasTrait(c, 'brave') || hasTrait(c, 'confident') ? 1.35 : hasTrait(c, 'jumpy') || hasTrait(c, 'nervous') ? .7 : 1;
  const close = dist2(c.x, c.y, E.x, E.y) < 70 * 70 && E.conf > .6; // they're fairly sure it's right on top of them
  if (scary > .42 * brave || close && scary > .15 || E.conf > 1.6 && scary > .2) { // loud, close, or heard it again and again: run from where they think it is
    const ctx = !hum ? 'panic' : h.s.type === 'kill' ? 'heardKill' : h.s.type === 'scream' ? 'crowd' : 'heard';
    panic(c, E.x, E.y, rand(2.5, 4.5) * (c.panicK || 1), ctx);
  } else if (scary > .1 * brave && (c.state === 'wander' || c.state === 'idle' || c.state === 'uneasy')) { // something, somewhere: freeze and listen
    const fresh = c.state !== 'uneasy';
    c.state = 'uneasy'; c.fx = E.x; c.fy = E.y; c.timer = rand(1.4, 2.6) / (c.panicK || 1); c.listenT = T + rand(.7, 1.4);
    if (fresh && hum && Math.random() < .45 && T - (c.heardSaid || -99) > 6) { c.heardSaid = T; say(c, 'heard'); }
  }
}
/* the snake's own noise: scales on the ground, louder when it's fast, wet, or smashing through things */
let slitherT = 0;
function snakeNoise(dt) {
  const s = snake; if (!s || !s.started || !s.alive || (slitherT -= dt) > 0) return;
  slitherT = .2;
  const v = s.speed * (s.dashV || 1), wet = freshAt(s.x, s.y) > .4, snow = snowAt(s.x, s.y) > .3, grass = !MAPS[mapIdx].indoor && grassAt(s.x, s.y);
  const k = clamp(v / 140, .5, 2) * (grass ? 1.15 : snow ? 1.25 : 1) * sizeLoud(); // dry leaves and crunching snow carry; a bigger body is louder
  noise(wet ? 'squelch' : 'slither', s.x, s.y, Math.min(1, .7 * k), (wet ? 150 : 115) * Math.min(1.6, k));
}
const sizeLoud = () => clamp(snakeScale(), .7, 1.4);

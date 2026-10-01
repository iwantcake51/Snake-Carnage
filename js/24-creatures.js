/* =========================================================
   CREATURES + AI
   ========================================================= */
function makeCreature(type, x, y, zone) {
  const def = TYPES[type], a = rand(0, TAU);
  return { type, def, x, y, a, wa: a, state: 'wander', timer: rand(1, 3), fx: 0, fy: 0, phase: 0, moveAmt: 0, spd: 0,
           stains: [], feet: 0, step: 0, fs: 1, side: Math.random() < .5 ? -1 : 1, pt: rand(0, .2), zone, alive: true, avx: 0, avy: 0,
           look: def.human ? humanLook(type) : null, alert: 0, adren: 0,
           spdK: def.human ? (Math.random() < .12 ? rand(1.2, 1.32) : rand(.86, 1.12)) : rand(.92, 1.08) }; // natural speed differences
}
function giveFlash(c) { if (c.def.human && Math.random() < flashChance()) c.fl = newFlash(c); return c; }
function spawn(type, zone) {
  const def = TYPES[type], z = zone || { x: B, y: B, w: W - 2 * B, h: H - 2 * B };
  for (let k = 0; k < 300; k++) {
    const x = rand(z.x + def.r, z.x + z.w - def.r), y = rand(z.y + def.r, z.y + z.h - def.r);
    if (!free(x, y, def.r + 3)) continue;
    if (snake && k < 250 && dist2(x, y, snake.x, snake.y) < 200 * 200) continue;
    const c = giveFlash(makeCreature(type, x, y, zone)); c.born = T;
    if (def.human && state === 'play' && Math.random() < (MOD.rareAppetite ? .12 : .03)) { // rare golden target: worth a lot more
      c.golden = true; c.goldT = 35; Object.assign(c.look, { top: '#f2c230', top2: '#b8860b', pants: '#6e4f0c', shoes: '#fff3c4', outfit: 'tee', hat: null });
      if (state === 'play' || state === 'ready') goldenBanner();
    } else if (!def.human && state === 'play' && Math.random() < (MOD.rareAppetite ? .06 : .015)) { // rarer still: a golden animal
      c.golden = true; c.goldT = 28;
      c.def = { ...def, col: '#e0b52c', hcol: def.hcol ? '#c99a1a' : undefined, tcol: def.tcol ? '#b8901c' : undefined };
      if (state === 'play' || state === 'ready') goldenBanner(type);
    }
    creatures.push(c); return;
  }
}

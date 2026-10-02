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
function goldify(c) { // golden target: worth a fortune, gone (back to normal) when the ring runs out
  const def = c.def; c.golden = true; c.goldT = c.goldMax = def.human ? 35 : 28;
  if (def.human) { c.plainLook = { ...c.look }; Object.assign(c.look, { top: '#f2c230', top2: '#b8860b', pants: '#6e4f0c', shoes: '#fff3c4', outfit: c.look.outfit === 'suit' || c.look.outfit === 'alien' ? c.look.outfit : 'tee', hat: c.look.hat === 'helmet' ? 'helmet' : null }); }
  else { c.plainDef = def; c.def = { ...def, col: '#e0b52c', hcol: def.hcol ? '#c99a1a' : undefined, tcol: def.tcol ? '#b8901c' : undefined }; }
}
function ungoldify(c) {
  c.golden = false; c.goldT = 0;
  if (c.plainLook) { c.look = c.plainLook; c.plainLook = null; }
  if (c.plainDef) { c.def = c.plainDef; c.plainDef = null; }
  ringPops.push({ x: c.x, y: c.y, t: 0, c });
  if (state === 'play') { notify({ kind: 'info', icon: '◌', title: `The golden ${c.def.human ? (c.def.alien ? 'alien' : c.type === 'astronaut' ? 'astronaut' : 'human') : c.type} faded`, dur: 2 }); Sfx.goldFade && Sfx.goldFade(c.x); }
}
let ringPops = [];
function giveFlash(c) { if (c.def.human && Math.random() < flashChance(c)) c.fl = newFlash(c); return c; }
function spawn(type, zone) {
  const def = TYPES[type], z = zone || { x: B, y: B, w: W - 2 * B, h: H - 2 * B };
  for (let k = 0; k < 300; k++) {
    const x = rand(z.x + def.r, z.x + z.w - def.r), y = rand(z.y + def.r, z.y + z.h - def.r);
    if (!free(x, y, def.r + 3)) continue;
    if (snake && k < 250 && dist2(x, y, snake.x, snake.y) < 200 * 200) continue;
    const c = giveFlash(makeCreature(type, x, y, zone)); c.born = T; giveTraits(c);
    if (def.human && state === 'play' && Math.random() < (MOD.rareAppetite ? .12 : .03)) { // rare golden target: worth a lot more
      goldify(c);
      if (state === 'play' || state === 'ready') goldenBanner(null, c);
    } else if (!def.human && state === 'play' && Math.random() < (MOD.rareAppetite ? .06 : .015)) { // rarer still: a golden animal
      goldify(c);
      if (state === 'play' || state === 'ready') goldenBanner(type);
    }
    creatures.push(c); return;
  }
}

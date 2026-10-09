const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = name => fs.readFileSync(path.join(__dirname, '../js', name), 'utf8');
const air = read('38c-airstrikes.js');
const ctx = {
  T: 10, state: 'play', MOD: {}, SETTINGS: { creatureSpeed: 1 }, MAPS: [{}], mapIdx: 0,
  snake: null, B: 0, W: 1000, H: 1000, TAU: Math.PI * 2, creatures: [],
  AUTH: () => true, nearbyCreatures: () => ctx.creatures, los: () => true,
  clamp: (n, a, b) => Math.max(a, Math.min(b, n)),
  dist2: (x, y, a, b) => (x - a) ** 2 + (y - b) ** 2,
  rand: (a, b) => (a + b) / 2, gauss: () => 0,
  Math: Object.assign(Object.create(Math), { random: () => 1 }),
  Sfx: { vocal() {} }, aftertaste() {}, perceive() {}, footprints() {}, updateFlash() {},
  free: () => true, solid: () => false, angDiff: (a, b) => b - a,
};
vm.createContext(ctx);
vm.runInContext(read('27b-hearing.js') + '\n' + read('26-creature-ai.js') + '\n' +
  air.slice(air.indexOf('function airCrowdConcuss'), air.indexOf('function bombDeath')) +
  '\npickFleeGoal = c => { c.goal = { x: c.x + 100, y: c.y, fx: c.fx, fy: c.fy }; c.goalT = 10; }; steerDir = (c, a) => a; footprints = () => {};', ctx);
function person(x) {
  return { alive: true, x, y: 100, a: 0, wa: 0, def: { human: true, r: 7, walk: 20, run: 50 },
    state: 'wander', timer: 5, pt: 10, sayCD: 20, alert: 0, avx: 0, avy: 0,
    moveAmt: 0, phase: 0, bubbles: [], goalP: 0, goalD: Infinity, stuck: 0 };
}
const close = person(150), farther = person(250), outside = person(305), dead = person(155);
dead.alive = false;
ctx.creatures = [close, farther, outside, dead];
ctx.airCrowdConcuss(100, 100, 44);
assert.ok(close.blastStunT > farther.blastStunT);
assert.ok(close.blastDeafT > farther.blastDeafT);
assert.ok(close.blastDeafT - ctx.T <= 5 && farther.blastDeafT - ctx.T >= 2);
assert.equal(outside.blastStunT, undefined); assert.equal(dead.blastStunT, undefined);
assert.equal(close.state, 'panic');
const x = close.x, timer = close.timer;
ctx.updateCreature(close, .1);
assert.equal(close.x, x); assert.equal(close.spd, 0); assert.equal(close.timer, timer);
// Recovery happens without changing to an unrelated idle/wander state.
ctx.T = close.blastStunT + .01;
ctx.updateCreature(close, .1);
assert.ok(close.x > x); assert.equal(close.state, 'panic');
// A weaker subsequent blast never shortens a stronger existing timer.
const ends = [close.blastStunT, close.blastDeafT];
ctx.T = 10; close.blastStunT = 30; close.blastDeafT = 40; close.deafT = 50;
ctx.airCrowdConcuss(100, 100, 44);
assert.equal(close.blastStunT, 30); assert.equal(close.blastDeafT, 40); assert.equal(close.deafT, 50);
// Through-wall effects are weaker.
const sheltered = person(150); ctx.creatures = [sheltered]; ctx.los = () => false;
ctx.airCrowdConcuss(100, 100, 44);
assert.ok(sheltered.blastDeafT < ends[1]);
// Guests never independently alter authoritative NPC state.
ctx.AUTH = () => false; const guest = person(150); ctx.creatures = [guest];
ctx.airCrowdConcuss(100, 100, 44); assert.equal(guest.blastStunT, undefined);
ctx.AUTH = () => true; ctx.los = () => true;
// Deaf NPCs discard sounds; they do not hear them late when hearing recovers.
const listener = person(150); listener.blastDeafT = 15;
ctx.noise('scream', 150, 100); assert.equal(ctx.hear(listener), null); assert.equal(listener.ear, undefined);
ctx.T = 16; assert.equal(ctx.hear(listener), null);
ctx.noise('scream', 150, 100); assert.ok(ctx.hear(listener));
// Mute does not provide immunity; the effect is physical and also works for blind creatures.
ctx.MOD = { mute: true, blind: true }; const blind = person(150); ctx.creatures = [blind];
ctx.airCrowdConcuss(100, 100, 44);
assert.ok(blind.blastStunT > ctx.T); assert.equal(blind.state, 'panic');
console.log('PASS: blast distance, shelter, survivors only, stun/recovery, bounded refresh, authority, deafness/recovery, Mute and Blind.');

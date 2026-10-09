/* =========================================================
   ANIMATION TUNING: every moving thing's speed and size in one place.
   ANIM_DEFS lists each animation (people walking, tails wagging, trees in the wind, water, fire...) with the knobs it
   has; AN[id] holds their current values (1 = as designed), saved per browser. The drawing code reads them: animT(id)
   is the clock for one animation (the world clock at that animation's speed) and AN[id].amp scales how far it moves.
   The Animation editor (40g) shows and changes them live; Settings › Display and the admin panel open it.
   ========================================================= */
const ANIM_KEY = 'snakeCarnageAnim';
const ANP = { sp: ['Speed', 0, 3], amp: ['Amount', 0, 3], freq: ['How often', 0, 5] }; // [label, min, max]; every knob starts at 1
const ANIM_DEFS = [
  { g: 'People', id: 'walk', name: 'Legs', desc: 'Steps: how quickly the legs cycle for the ground covered, and how long the stride is.', p: ['sp', 'amp'], prev: 'human' },
  { g: 'People', id: 'arms', name: 'Arm swing', desc: 'How far the arms swing as people walk and pump when they run.', p: ['amp'], prev: 'human' },
  { g: 'People', id: 'bob', name: 'Body bob', desc: 'The rise and fall of the body with each step.', p: ['amp'], prev: 'human' },
  { g: 'People', id: 'flail', name: 'Panic flailing', desc: 'The jumpy ones flapping their arms as they run from you.', p: ['sp', 'amp'], prev: 'human', st: 'panic' },
  { g: 'People', id: 'dance', name: 'Dancing', desc: 'The club crowd: arms up and swaying to the beat.', p: ['sp', 'amp'], prev: 'human', st: 'dance' },
  { g: 'Animals', id: 'gait', name: 'Walk', desc: 'Four legs: how quickly the steps come and how much the body rocks.', p: ['sp', 'amp'], prev: 'dog' },
  { g: 'Animals', id: 'dogTail', name: 'Dog tail', desc: 'The wag: faster when they\'re excited, slower when they wander.', p: ['sp', 'amp'], prev: 'dog', st: 'idle' },
  { g: 'Animals', id: 'catTail', name: 'Cat tail', desc: 'The slow swish of a cat\'s tail.', p: ['sp', 'amp'], prev: 'cat', st: 'idle' },
  { g: 'Animals', id: 'ears', name: 'Rabbit ears', desc: 'The flop of a rabbit\'s ears.', p: ['sp', 'amp'], prev: 'rabbit', st: 'idle' },
  { g: 'Animals', id: 'deer', name: 'Deer head', desc: 'The slow nod of a grazing deer and the flick of its ears.', p: ['sp', 'amp'], prev: 'deer', st: 'idle' },
  { g: 'Animals', id: 'peck', name: 'Chicken peck', desc: 'Chickens pecking at the ground while they stand about.', p: ['sp', 'amp'], prev: 'chicken', st: 'idle' },
  { g: 'Animals', id: 'ratTail', name: 'Rat tail', desc: 'The sway down a rat\'s tail.', p: ['sp', 'amp'], prev: 'rat' },
  { g: 'Animals', id: 'antenna', name: 'Alien antennae', desc: 'The bob of an alien\'s antennae.', p: ['sp', 'amp'], prev: 'alien', st: 'idle' },
  { g: 'Animals', id: 'wings', name: 'Firefly wings', desc: 'How fast a firefly\'s wings beat.', p: ['sp'], prev: 'firefly', st: 'idle' },
  { g: 'Snake', id: 'slither', name: 'Slither', desc: 'The wave down your body as you move.', p: ['sp', 'amp'] },
  { g: 'Plants', id: 'trees', name: 'Trees and bushes', desc: 'Gusts through the canopy.', p: ['sp', 'amp'] },
  { g: 'Plants', id: 'grass', name: 'Grass tufts', desc: 'The blades bending in the wind.', p: ['sp', 'amp'] },
  { g: 'Plants', id: 'plants', name: 'Low plants', desc: 'Clover and ferns on the grass leaning with the gusts.', p: ['sp', 'amp'] },
  { g: 'Weather', id: 'snow', name: 'Snowflakes', desc: 'How fast snow falls and how far it drifts side to side.', p: ['sp', 'amp'] },
  { g: 'Weather', id: 'leaves', name: 'Falling leaves', desc: 'Autumn leaves fluttering down.', p: ['sp', 'amp'] },
  { g: 'Water', id: 'water', name: 'Water', desc: 'Caustics, glints, ripples, the fountain.', p: ['sp'] },
  { g: 'Fire and smoke', id: 'fire', name: 'Flames', desc: 'Crater fires, fire patches and burning: how fast the flames flicker and dance.', p: ['sp'] },
  { g: 'Fire and smoke', id: 'smoke', name: 'Smoke', desc: 'How smoke curls and drifts.', p: ['sp', 'amp'] },
  { g: 'Fire and smoke', id: 'gas', name: 'Gas clouds', desc: 'The roll of a gas bomb\'s cloud.', p: ['sp'] },
  { g: 'Lights', id: 'flicker', name: 'Lamp flicker', desc: 'How often lamps stutter and flicker.', p: ['freq'] },
  { g: 'Lights', id: 'moths', name: 'Moths', desc: 'Bugs circling the lamps at night.', p: ['sp', 'amp'] },
  { g: 'Lights', id: 'flies', name: 'Fireflies', desc: 'Fireflies drifting and glowing on summer nights.', p: ['sp'] },
  { g: 'Pickups', id: 'chunks', name: 'Flesh chunks', desc: 'Pieces of snake on the ground: their bob and pulsing glow.', p: ['sp', 'amp'] },
];
const AN = {};
function animLoad() {
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(ANIM_KEY)) || {}; } catch (e) {}
  for (const d of ANIM_DEFS) { AN[d.id] = {}; for (const k of d.p) { const v = saved[d.id] && saved[d.id][k]; AN[d.id][k] = typeof v === 'number' && isFinite(v) ? Math.min(ANP[k][2], Math.max(0, v)) : 1; } }
  for (const d of ANIM_DEFS) for (const k of ['sp', 'amp', 'freq']) if (!(k in AN[d.id])) AN[d.id][k] = 1; // every animation answers every knob (the ones it hasn't got stay at 1)
}
function animSave() {
  const out = {}; for (const d of ANIM_DEFS) for (const k of d.p) if (AN[d.id][k] !== 1) (out[d.id] = out[d.id] || {})[k] = AN[d.id][k];
  try { if (Object.keys(out).length) localStorage.setItem(ANIM_KEY, JSON.stringify(out)); else localStorage.removeItem(ANIM_KEY); } catch (e) {}
}
const animT = id => T * AN[id].sp; // one animation's clock
animLoad();

// Run with: node tests/dialogue.test.cjs
// Real dialogue data, compiler and engine in a deterministic game-state harness.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let seed = 1907;
const math = Object.create(Math);
math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const ctx = {
  Math: math, T: 100, tod: 12, mapIdx: 0, MAPS: [{ name: 'Town' }],
  season: { id: 'spring' }, light: { day: 1 }, MOD: {}, snake: null, state: 'play',
  creatures: [], NETM: { run: false }, Sfx: { vocal() {}, shout() {} },
  clamp: (v, a, b) => Math.max(a, Math.min(v, b)),
  dist2: (x, y, a, b) => (x - a) ** 2 + (y - b) ** 2,
  nearbyHumans: () => [], netBubNew() {},
  pick: a => a[Math.floor(math.random() * a.length)],
  rand: (a, b) => a + math.random() * (b - a),
  randi: (a, b) => a + Math.floor(math.random() * (b - a + 1)),
};
ctx.mapTheme = () => ctx.api.MAP_KEY[ctx.MAPS[ctx.mapIdx].name] || null; // (09d's: built-in maps by name)
vm.createContext(ctx);
const source = ['25-lines.js', '25-talk.js', '25-dialogue.js'].map(name =>
  fs.readFileSync(path.join(__dirname, '../js', name), 'utf8')).join('\n');
vm.runInContext(source + `
globalThis.api = { LINES, THREADS, ANSWERS, TRAIT_LINES, MAPL, MAP_KEY, TALK, WEATHER_TALK,
  SURVIVE, PERSONA_ANS, topicLines, buildTalk, answerFor, fillTalk, fillNames, finishLine,
  speakIn, say, topicFits, fromPool, tiered, SWEAR, weatherTalk,
  setDead: name => { lastDead = name; } };
`, ctx);
const api = ctx.api;
const person = (traits = []) => ({
  x: 0, y: 0, alive: true, state: 'wander', alert: 0, def: { human: true },
  voice: { heat: .2, swears: true }, traits, recent: [], topics: [], talkK: 1,
  panicK: 1, stutK: 0, bubbles: [], sayCD: 0,
});
const talkState = () => ({ asked: new Set(), used: new Set(), texts: new Set(), facts: new Set(), ask0: 0 });
const allTopics = [...Object.values(api.TALK).flat(), ...Object.values(api.WEATHER_TALK).flat()];
const originalAreas = ['generic', 'field', 'meadow', 'town', 'maze', 'farm', 'park', 'pool',
  'office', 'checker', 'crew', 'station', 'bunker', 'club'];
assert.deepEqual(Object.keys(api.TALK).sort(), originalAreas.sort());
assert.equal(allTopics.length, 74);
assert.equal(Object.values(api.TALK).flat().filter(t => t.B.length).length, 12);
let samples = 0;
for (const tp of allTopics) {
  for (const q of tp.q) {
    const answers = tp.A[q.key] || tp.A[q.type];
    assert.ok(answers?.length, tp.id + ':' + q.key + ' has no answers');
    for (const a of answers) {
      if (a.tags.includes('ask')) assert.ok(tp.N.some(n =>
        (!n.k || n.k.includes(q.key)) && (!n.t || n.t.some(t => a.tags.includes(t)))),
      tp.id + ' has an unanswered reply question: ' + a.text);
    }
    // Force every opener through the actual graph walker; sample variations in answers and follow-ups.
    const oneQuestion = { ...tp, q: [q] };
    for (let i = 0; i < 40; i++) {
      const out = [], people = [person(), person()];
      api.topicLines(oneQuestion, people, out, talkState(), true);
      assert.ok(out.length >= 2, tp.id + ' did not produce an exchange');
      for (const [speaker, text] of out) {
        assert.ok(speaker === 0 || speaker === 1);
        assert.ok(typeof text === 'string' && text.trim());
        assert.ok(!/undefined|null|\{(?:time|Time|nexthour|today|here)\}/.test(text), text);
        assert.ok(!/\|(yes|no|ask|unsure|open|closed)\b/.test(text), 'Leaked tag: ' + text);
      }
      assert.notEqual(out[0][0], out[1][0]);
      samples++;
    }
  }
}
// Replies to opening-time questions cannot accidentally come from the yes/no open-status pool.
const pizza = api.TALK.town.find(t => t.id === 'pizza');
const opens = pizza.q.find(q => q.key === 'opens');
for (let i = 0; i < 50; i++) {
  const a = api.answerFor(person(), pizza, opens, talkState());
  assert.ok(pizza.A.opens.some(x => x.text === a.text));
}
// World facts override remembered answers when a shop closes.
const open = pizza.q.find(q => q.key === 'open'), customer = person();
customer.said = { 'pizza:open': { text: "It should be open.", tags: ['open'] } };
ctx.tod = 23;
for (let i = 0; i < 50; i++) assert.ok(!api.answerFor(customer, pizza, open, talkState()).tags.includes('open'));
ctx.tod = 12;
// Do not turn an overheard first-person statement into the next person's own possessions/history.
const charger = api.TALK.generic.find(t => t.id === 'phone'), borrower = person();
borrower.overheard = { 'phone:charger': { text: 'I have the only red charger.', tags: [] } };
for (let i = 0; i < 50; i++) {
  const a = api.answerFor(borrower, charger, charger.q.find(q => q.key === 'charger'), talkState());
  assert.ok(!a.text.includes('red charger'));
}
// All speech pools keep the existing #thread contract and non-swearing alternatives.
function checkPools(value) {
  if (Array.isArray(value)) {
    if (value.every(v => typeof v === 'string')) {
      assert.ok(value.length);
      assert.equal(new Set(value).size, value.length, 'Duplicate in pool: ' + value[0]);
      assert.ok(value.some(v => !api.SWEAR.test(v)), 'No clean alternative: ' + value[0]);
      for (const text of value) {
        const tag = text.split('#')[1];
        if (tag) assert.ok(api.THREADS[tag], 'Missing thread: ' + tag);
      }
    } else value.forEach(checkPools);
  } else if (value && typeof value === 'object') Object.values(value).forEach(checkPools);
}
for (const bank of [api.LINES, api.TRAIT_LINES, api.MAPL, api.ANSWERS]) checkPools(bank);
const cleanSpeaker = person(); cleanSpeaker.voice.swears = false;
for (let i = 0; i < 100; i++) assert.ok(!api.SWEAR.test(api.fromPool(cleanSpeaker, api.LINES.airCivilianRisk)));
// Survivor questions don't combine "Are you hurt?" with answers intended for "Is that your blood?"
const injuries = api.SURVIVE.find(s => s.ask.includes('Are you hurt?'));
assert.ok(injuries && !injuries.ans.includes('Not mine.'));
assert.equal(api.SURVIVE.length, 9);
api.setDead('Sam');
const nb = api.speakIn({}, person(), 'Have you seen {dead}?', 'idle');
assert.equal(nb.text, 'Have you seen Sam?');
// The same new lines use the real multiplayer bubble hook, and Mute still suppresses speech.
let broadcasts = 0;
ctx.NETM.run = true; ctx.netBubNew = () => { broadcasts++; };
api.say(person(), 'airCivilianRisk'); assert.equal(broadcasts, 1);
ctx.MOD.mute = true;
const silent = person(); api.say(silent, 'blastClose');
assert.equal(silent.bubbles.length, 0); assert.equal(broadcasts, 1);
ctx.MOD = {};
// Earth errands do not show up in astronaut conversations.
ctx.MAPS[0] = { name: 'Moon', space: true };
assert.equal(api.topicFits(charger), false);
assert.equal(api.topicFits(api.TALK.generic.find(t => t.id === 'time')), true);
assert.equal(api.weatherTalk().length, 0);
console.log('PASS: ' + samples + ' generated exchanges across 74 topics, thread and clean-line coverage, survivor names, fact changes, speaker memory, Mute and multiplayer bubbles.');

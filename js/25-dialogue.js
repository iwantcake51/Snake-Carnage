/* =========================================================
   DIALOGUE ENGINE. Words live in 25-lines.js; this decides who talks, what comes out and how.
   Speech is typed out over time, so it can be cut off partway; panic wears it down; people remember
   what they said and come back to it (or don't).
   ========================================================= */
const isYell = t => /[A-Z]/.test(t) && t === t.toUpperCase();
const expand = s => s.replace(/\{([^{}]*\|[^{}]*)\}/g, (_, o) => pick(o.split('|')));
function adrenFrom(c, sx, sy) { // fear's sprint: not everyone has it in them, and only with the snake straight behind them
  if (c.adrenCD > T || c.seed > .5) return false; // about half of people never get the burst
  const a = c.a ?? 0, dx = sx - c.x, dy = sy - c.y, d = Math.hypot(dx, dy) || 1;
  if ((Math.cos(a) * dx + Math.sin(a) * dy) / d > -.9) return false; // within ~25° of directly behind
  c.adren = rand(.9, 1.5); c.adrenCD = T + rand(12, 18); return true;
}
function stretch(t) { // FUCKKK, NOOOO
  const words = t.split(' '), i = randi(0, words.length - 1), w = words[i];
  const vowel = w.search(/[aeiou](?!.*[aeiou])/i), pos = vowel >= 0 && Math.random() < .5 ? vowel : w.replace(/[^a-z]+$/i, '').length - 1;
  if (pos < 0 || !/[a-z]/i.test(w[pos])) return t;
  words[i] = w.slice(0, pos + 1) + w[pos].repeat(randi(1, 3)) + w.slice(pos + 1);
  return words.join(' ');
}
const mapKey = () => MAP_KEY[MAPS[mapIdx].name] || null;
const mapL = () => MAPL[mapKey()] || {};
function panicLevel(c) { // 0 calm .. 1 falling apart
  const h = c.voice ? c.voice.heat : .5, seen = Math.min(.25, (c.deathsSeen || 0) * .08);
  let p = c.state === 'panic' ? .5 + .35 * h + seen + (c.wasChased ? .12 : 0) : c.state === 'flee' || c.state === 'uneasy' ? .22 + .25 * h + seen : seen * .5;
  if (snake && c.state === 'panic') { const d = MOD.blind && c.def.human ? Math.hypot(c.x - c.fx, c.y - c.fy) : Math.hypot(c.x - snake.x, c.y - snake.y); if (d < 70) p += .2; } // blind: how close they THINK it is
  return clamp(p * (c.panicK > 1 ? 1.08 : c.panicK < 1 ? .9 : 1), 0, 1);
}
const tierOf = c => { const p = panicLevel(c); return p < .2 ? 0 : p < .48 ? 1 : p < .76 ? 2 : 3; };
function tiered(pool, tier) { // a plain list, or one split by panic: take the closest tier at or below, else above
  if (!pool || Array.isArray(pool)) return pool;
  for (let k = tier; k >= 0; k--) if (pool[k]) return pool[k];
  for (let k = tier + 1; k <= 3; k++) if (pool[k]) return pool[k];
  return null;
}
/* ---- personality: hidden traits shape heat, chattiness, panic speed, and how broken their speech gets ---- */
const TRAITS = {
  funny:     { heat: .45, talk: 1.3, panicK: 1,   stut: .5 },
  jumpy:     { heat: .95, talk: 1.1, panicK: 1.6, stut: 1.2 },
  calm:      { heat: .2,  talk: .9,  panicK: .6,  stut: .2 },
  nervous:   { heat: .8,  talk: 1,   panicK: 1.3, stut: 1.6 },
  confident: { heat: .35, talk: 1.1, panicK: .55, stut: .3 },
  rude:      { heat: .7,  talk: 1,   panicK: 1,   stut: .4 },
  pessimist: { heat: .55, talk: 1,   panicK: 1.1, stut: .7 },
  talkative: { heat: .6,  talk: 1.8, panicK: 1,   stut: .9 },
  quiet:     { heat: .4,  talk: .4,  panicK: 1,   stut: .6 },
  brave:     { heat: .35, talk: 1,   panicK: .5,  stut: .3 },
  curious:   { heat: .5,  talk: 1.3, panicK: .85, stut: .6 },
  distracted:{ heat: .5,  talk: 1.1, panicK: .8,  stut: .7 },
};
const CLASH = [['quiet', 'talkative'], ['calm', 'jumpy'], ['confident', 'nervous'], ['calm', 'nervous'], ['confident', 'pessimist'], ['quiet', 'rude'], ['brave', 'nervous'], ['brave', 'jumpy'], ['curious', 'distracted']];
const NAMES = ['Dave', 'Karen', 'Mike', 'Jess', 'Tom', 'Priya', 'Luis', 'Sam', 'Grace', 'Omar', 'Nina', 'Ben', 'Rosa', 'Kev', 'Hannah', 'Theo', 'Dana', 'Marcus', 'Lily', 'Ray'];
function giveTraits(c) {
  if (!c.def.human || c.def.alien) return;
  const keys = Object.keys(TRAITS), a = pick(keys); let b = Math.random() < .45 ? pick(keys) : null;
  if (b === a || CLASH.some(([x, y]) => (a === x && b === y) || (a === y && b === x))) b = null;
  c.traits = b ? [a, b] : [a];
  const T0 = c.traits.map(t => TRAITS[t]);
  c.voice = { heat: clamp(T0.reduce((s, t) => s + t.heat, 0) / T0.length + rand(-.12, .12), .1, 1), swears: Math.random() < (c.traits.includes('calm') ? .4 : c.traits.includes('rude') ? .95 : .72) };
  c.talkK = T0.reduce((s, t) => s * t.talk, 1); c.panicK = T0.reduce((s, t) => s * t.panicK, 1);
  c.stutK = T0.reduce((s, t) => s * t.stut, 1) * rand(.5, 1.3); // plenty of scared people never stutter at all
  c.name = pick(NAMES); c.recent = []; c.topics = [];
  c.vox = clamp((c.male ? .86 : 1.08) + gauss() * .09, .74, 1.3); // their own pitch: most voices sit mid-range, a few run high or low
}
const hasTrait = (c, t) => c.traits && c.traits.includes(t);
/* ---- picking a line ---- */
const SWEAR = /fuck|shit|hell\b|damn|jesus/i;
function fromPool(c, pool) {
  if (!pool || !pool.length) return null;
  if (c.voice && !c.voice.swears) { const clean = pool.filter(l => !SWEAR.test(l)); if (clean.length) pool = clean; }
  const unused = pool.filter(l => !c.recent.includes(l)); if (unused.length) pool = unused;
  const l = pick(pool); c.recent.push(l); if (c.recent.length > 10) c.recent.shift();
  return l;
}
function linePool(c, ctx) {
  const tier = tierOf(c), out = [];
  if (c.traits) for (const t of c.traits) { // personality first, sometimes
    const tl = TRAIT_LINES[t] && tiered(TRAIT_LINES[t][ctx], tier);
    if (tl && (t === 'funny' ? tier < 3 : true) && Math.random() < (t === 'quiet' ? .7 : .38)) return tl;
  }
  const m = mapL(), ml = m[ctx] && tiered(m[ctx], tier);
  if (ml && Math.random() < (c.type === 'astronaut' ? .7 : .55)) return ml; // astronauts mostly sound like astronauts
  const base = tiered(LINES[ctx === 'warned' ? 'crowd' : ctx] || LINES.panic, tier);
  if (out.length) return out.concat(base);
  return base;
}
function fillNames(t, c, name) {
  return t.replace(/\{a\}/g, name || 'thing').replace(/\{A\}/g, (name || 'thing').toUpperCase())
    .replace(/\{dead\}/g, lastDead || 'him').replace(/\{DEAD\}/g, (lastDead || 'him').toUpperCase());
}
function parseLine(raw) { const [text, tag] = raw.split('#'); return { text: expand(text), tag }; }
/* ---- how panic wears speech down. Many shapes, never one fixed stutter ---- */
function stutterWord(w) {
  const i = w.search(/[a-z]/i); if (i < 0) return w;
  const core = w.slice(i), up = core === core.toUpperCase(), head = core.slice(0, /^(th|wh|sh|ch)/i.test(core) ? 2 : 1);
  const bare = core.replace(/[.,!?…—]+$/, ''), r = Math.random();
  if (r < .4) return w.slice(0, i) + head + '-' + core;
  if (r < .55) return w.slice(0, i) + head + '-' + head.toLowerCase() + '-' + core;
  if (r < .75) return w.slice(0, i) + bare + '... ' + core;
  if (r < .9) return w.slice(0, i) + bare + '— ' + (up ? core : core.toLowerCase());
  return w.slice(0, i) + bare + ', ' + bare.toLowerCase() + ', ' + core.toLowerCase();
}
function disfluent(t, tier, c, yell) {
  const k = c.stutK ?? 1; if (t.length < 3 || /^\.+$/.test(t)) return t;
  const words = t.split(' '), r = Math.random();
  if (tier === 0) { // relaxed: the odd filler, nothing more
    if (!yell && Math.random() < .07 * k) return pick(['Uh, ', 'Um, ', 'I mean, ', 'Like, ', 'Oh, ']) + t[0].toLowerCase() + t.slice(1);
    return t;
  }
  if (tier === 1) { // uneasy: a hesitation or a repeat, about a third of the time
    if (r > .35 * k) return t;
    const s = Math.random();
    if (s < .35 && !yell) return pick(['Uh— ', 'Um... ', 'Wait, ', 'Okay, ']) + t[0].toLowerCase() + t.slice(1);
    words[0] = stutterWord(words[0]); return words.join(' ');
  }
  if (tier === 2) { // scared: shorter, repeats, starts over
    if (r > .5 * k) return t;
    const s = Math.random();
    if (s < .3) { words[0] = stutterWord(words[0]); return words.join(' '); }
    if (s < .55 && words.length > 2) { // "I don't— I don't— just move!"
      const start = words.slice(0, randi(1, Math.min(2, words.length - 1))).join(' ').replace(/[,.!?]+$/, ''), n = randi(1, 2);
      return (start + '— ').repeat(n) + (Math.random() < .5 ? pick(yell ? ['JUST MOVE!', 'GO!', 'RUN!'] : ['just move!', 'go!', 'never mind!']) : t);
    }
    if (s < .8 && words.length > 3) return words.slice(0, randi(2, words.length - 2)).join(' ').replace(/[,.!?]+$/, '') + '—';
    return t;
  }
  // falling apart: fragments, repeats with rising volume
  if (r > .6 * Math.max(.5, k)) return t;
  const s = Math.random();
  if (words.length === 1 && /^[a-z]+!?$/i.test(t)) { const w = t.replace(/!$/, ''), n = randi(2, 4), lo = w.toLowerCase(); return Array.from({ length: n }, (_, j) => j === n - 1 ? w.toUpperCase() : j ? lo : w[0].toUpperCase() + lo.slice(1)).join(', ') + '!'; } // Go, go, GO!
  if (s < .45 && words.length > 2) return words.slice(0, randi(1, Math.min(3, words.length - 1))).join(' ').replace(/[,.!?]+$/, '') + '—';
  if (s < .7) { const w = words[0].replace(/[,.!?]+$/, ''); return w + pick(['... ', '— ', ', ']) + w.toLowerCase() + pick([', ', '— ']) + words.slice(1).join(' '); }
  words[0] = stutterWord(words[0]); return words.join(' ');
}
function slur(t) { // ears ringing after a Hiss: words stretch, drop letters, trail off
  return t.split(' ').map(w => { const r = Math.random(); if (w.length > 3 && r < .3) return w.replace(/[aeiou]/i, m => m + m + m); if (w.length > 4 && r < .5) return w.slice(0, -2) + '-'; return w; }).join(' ').replace(/[.!?]*$/, '') + pick(['...', '..?', '—']);
}
const HOT_CTX = new Set(['witnessHuman', 'multiDeath', 'chased', 'bloodOnMe', 'touched', 'heardKill', 'blastClose', 'blastNear', 'strafeClose', 'airTargetSnake', 'airCivilianRisk']);
function finishLine(t, c, ctx) {
  let yell = isYell(t); const tier = tierOf(c);
  if (!yell && tier >= 2 && (HOT_CTX.has(ctx) || ctx === 'panic') && c.voice.heat > .6 && Math.random() < .3 + .2 * (tier - 2)) { t = t.toUpperCase(); yell = true; }
  else if (yell && c.voice.heat < .35 && tier < 3 && !MAPS[mapIdx].club && Math.random() < .5) { t = t.toLowerCase(); yell = false; }
  if (yell && c.voice.heat > .6 && tier >= 2 && Math.random() < .25) t = stretch(t);
  if (!yell && t.length) t = t[0].toUpperCase() + t.slice(1);
  if (!/[!?.…—]$/.test(t)) t += yell ? '!' : /^(what|where|why|is|did|how|was|which|who|are|do|you)\b/i.test(t) ? '?' : '.';
  if (ctx !== 'idle' && ctx !== 'answer' && ctx !== 'follow') t = disfluent(t, tier, c, yell);
  if (c.deafT > T) t = slur(t);
  return { text: t, yell };
}
/* ---- bubbles are typed out, so a thought can be cut off partway ---- */
const URG = { airTargetSnake: 4, airCivilianRisk: 4, jetNear: 2, jetFar: 1, blastClose: 4, blastNear: 3, blastFar: 1, strafeClose: 4, strafeFar: 2, heard: 2, heardKill: 3, touched: 4, idle: 0, mutter: 0, relief: 1, escaped: 1, crash: 1, bloodNearby: 1, jokeReact: 1, convoBreak: 1, stunned: 2, hissed: 2, deaf: 2, firstSight: 2, bloodySnake: 2, crowd: 2, warned: 2, answer: 2, follow: 3, panic: 3, witnessAnimal: 2, witnessHuman: 3, multiDeath: 3, wallSmash: 3, bloodOnMe: 3, spit: 3, chased: 4 };
const CUT = [[.6, .95], [.6, .95], [.3, .8], [.1, .6], [0, .5]]; // how far into a sentence each urgency lets you get
function bub(c, o) {
  const b = c.bubbles || (c.bubbles = []), len = o.text.length;
  const cps = o.act ? 0 : (o.yell ? rand(30, 42) : rand(16, 24)) * ((c.talkK || 1) > 1.4 ? 1.2 : 1) * (o.fast ? 1.3 : 1);
  const nb = { text: o.text, yell: !!o.yell, act: !!o.act, t: 0, delay: o.delay || 0, cps, urg: o.urg || 0, convo: o.convo, li: o.li,
    life: (cps ? len / cps : 0) + clamp(.8 + len * .028, 1, 2.1) };
  b.push(nb); if (b.length > 4) b.splice(0, b.length - 4);
  if (NETM.run) netBubNew(c, nb); // co-op: the line goes out to everyone as text
  return nb;
}
const shownLen = b => b.cps ? Math.min(b.text.length, Math.ceil(b.t * b.cps)) : b.text.length;
const typing = c => c.bubbles && c.bubbles.find(b => b.delay <= 0 && b.cps && shownLen(b) < b.text.length - 1);
const busyUntil = c => { let e = 0; if (c.bubbles) for (const b of c.bubbles) e = Math.max(e, (b.delay > 0 ? b.delay : 0) + (b.cps ? Math.max(0, (b.text.length - b.t * b.cps) / b.cps) : 0)); return e; };
function pauseFor(urg) {
  if (urg >= 3) return rand(.05, .2);
  if (Math.random() < .15) return rand(.4, .7); // a confused beat
  return rand(.15, .4);
}
function interrupt(c, urg) { // cut whatever they're saying; returns how long until the new thought can start
  if (c.bubbles) c.bubbles = c.bubbles.filter(q => q.delay <= 0); // queued thoughts are dropped
  const b = typing(c); if (!b) return urg >= 3 ? 0 : pauseFor(urg);
  const L = b.text.length, now = shownLen(b), [lo, hi] = CUT[urg];
  let at = Math.max(now + 1, Math.round(L * rand(lo, hi)));
  if (at >= L - 2) return (L - now) / b.cps + pauseFor(urg); // close enough to the end: they finish it
  if (!(urg >= 3 && Math.random() < .45)) { // mostly between words; real danger can cut mid-word ("tha—")
    const sp = b.text.indexOf(' ', at); if (sp < 0 || sp >= L - 2) return (L - now) / b.cps + pauseFor(urg);
    at = sp;
  }
  const kept = b.text.slice(0, at).replace(/[\s,.…—-]+$/, '');
  if (b.convo) b.convo.cut = b.li; // a conversation line cut short: the talk remembers which one, to pick it up again later (see resumeConvos)
  b.text = kept + '—'; b.life = b.text.length / b.cps + rand(.7, 1.1);
  return Math.max(0, (b.text.length - now) / b.cps) + pauseFor(urg);
}
/* ---- conversations: built fresh each time from typed topics, personalities and what happened ---- */
let lastDead = null;
const NAMES_RE = /\{name\}/g;
const heard = new Map(); // line -> when anyone last said it: nobody repeats what someone nearby just said
const recentTopics = []; // [{id, T}]: different pairs don't all talk about the same thing
const freshLine = l => T - (heard.get(l) ?? -99) > 40;
const pickFresh = (c, arr) => { const f = arr.filter(freshLine); return fromPool(c, f.length ? f : arr); };
const lc = t => t[0].toLowerCase() + t.slice(1);
/* ---- conversations: each one is a walk through one topic's thread graph (see 25-talk.js) ----
   The engine keeps the state of the talk: which topic, who asked, which question (key + type), what the answer
   established (tags), which follow-ups were used, and every line said so far. A follow-up is only possible when it
   names this question and this answer; a reply that is itself a question is only used when something answers it. */
const SPOKEN = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
function spokenTime() { // the clock the way people say it: "quarter past nine", "almost ten"
  const h = ((tod % 24) + 24) % 24, q = Math.round((h % 1) * 4) % 4, hr = Math.floor(h) + (Math.round((h % 1) * 4) === 4 ? 1 : 0);
  return q === 0 ? SPOKEN[hr % 12] : q === 1 ? 'quarter past ' + SPOKEN[hr % 12] : q === 2 ? 'half past ' + SPOKEN[hr % 12] : 'quarter to ' + SPOKEN[(hr + 1) % 12];
}
const darkOut = () => { const m = MAPS[mapIdx]; return m.indoor ? (tod % 24 >= 19 || tod % 24 < 6) : !!(light && light.day < .25); };
function fillTalk(t) {
  if (t.indexOf('{') < 0) return t;
  const st = spokenTime();
  return t.replace('{time}', st).replace('{Time}', st[0].toUpperCase() + st.slice(1)).replace('{nexthour}', SPOKEN[(Math.floor(tod % 24) + 1) % 12])
    .replace('{today}', darkOut() ? 'tonight' : 'today').replace('{here}', MAPS[mapIdx].indoor ? 'in here' : 'out here');
}
function topicFits(tp) { // can this topic be talked about here, now?
  const m = MAPS[mapIdx];
  if (tp.earth && m.space) return false;
  if (tp.out && (m.indoor || m.space)) return false;
  if (tp.dark && !darkOut()) return false;
  if (tp.light && darkOut()) return false;
  if (tp.not && season && tp.not.split(' ').includes(season.id)) return false;
  return true;
}
function talkPool() { const k = mapKey(); return (TALK[k] || []).concat(MAPS[mapIdx].club ? [] : TALK.generic.map(t => (t.generic = true, t))).concat(weatherTalk().map(t => (t.generic = true, t))).filter(topicFits); } // people talk about the weather they're actually standing in
function pickTopic(a, b) {
  const used = new Set(recentTopics.filter(r => T - r.T < 70).map(r => r.id)), ok = tp => tp.needs !== 'dog' || (a.dog && a.dog.alive) || (b.dog && b.dog.alive);
  let pool = talkPool().filter(t => ok(t) && !a.topics.includes(t.id) && !b.topics.includes(t.id) && !used.has(t.id));
  if (!pool.length) pool = talkPool().filter(t => ok(t) && !a.topics.includes(t.id));
  if (!pool.length) return null;
  const local = pool.filter(t => !t.generic); if (local.length && Math.random() < .7) pool = local; // mostly about where they are
  const tp = pick(pool); recentTopics.push({ id: tp.id, T }); if (recentTopics.length > 12) recentTopics.shift();
  for (const c of [a, b]) { c.topics.push(tp.id); if (c.topics.length > 6) c.topics.shift(); }
  return tp;
}
const FACT_TAGS = new Set(['open', 'closed']);
const keyOk = (n, key) => !n.k || n.k.includes(key), tagOk = (n, tags) => !n.t || n.t.some(t => tags.includes(t));
const hasFollow = (list, key, tags) => list.some(n => keyOk(n, key) && tagOk(n, tags));
function pickFreshT(c, list, v) { // tagged lines: not said in this talk, preferably not heard nearby lately, not in this person's recent lines
  let L = list.filter(l => !v.texts.has(l.text)); if (!L.length) L = list;
  const f = L.filter(l => freshLine(l.text) && !(c.recent || []).includes(l.text)); if (f.length) L = f;
  if (c.voice && !c.voice.swears) { const clean = L.filter(l => !SWEAR.test(l.text)); if (clean.length) L = clean; }
  const l = pick(L); if (c.recent) { c.recent.push(l.text); if (c.recent.length > 10) c.recent.shift(); }
  return l;
}
function answerFor(B, tp, q, v) { // an answer to what was actually asked, in this person's voice, consistent with what they said before
  const key = tp.id + ':' + q.key; B.said = B.said || {}; B.overheard = B.overheard || {};
  const fact = tp.fact && tp.fact(), previous = B.said[key];
  if (previous && !previous.tags.some(t => FACT_TAGS.has(t) && fact && t !== fact)) return { text: previous.text, tags: previous.tags, repeat: true };
  // Someone else's "I have a charger" or "my dog is two" cannot answer a question about this speaker.
  // Pick the listener's own answer; overheard first-person statements are never borrowed.
  for (const [tr, k] of PERSONA_K) if (hasTrait(B, tr) && PERSONA_ANS[tr][q.type] && Math.random() < k) { const l = pickFreshT(B, PERSONA_ANS[tr][q.type], v); return { text: l.text, tags: ['unsure'], persona: tr }; }
  let pool = tp.A[q.key] || tp.A[q.type] || [{ text: 'Huh.', tags: ['unsure'] }];
  if (fact) { const ok = pool.filter(a => !a.tags.some(t => FACT_TAGS.has(t) && t !== fact)); if (ok.length) pool = ok; } // the world decides: everyone agrees the shop is shut
  const ans = pool.filter(a => !a.tags.includes('ask') || hasFollow(tp.N, q.key, a.tags)); if (ans.length) pool = ans; // a question back only if something answers it
  return pickFreshT(B, pool, v);
}
const PERSONA_RE = ['Okay.', 'Never mind.', "I'll ask someone else.", "Don't worry about it."];
function topicLines(tp, P, out, v, first) { // one topic: opener, the answer to it, then follow-ups that fit, deeper only along the graph
  const ai = out.length ? out[out.length - 1][0] ^ 1 : v.ask0, bi = ai ^ 1, A = P[ai], B = P[bi]; // whoever didn't just speak starts a new topic
  const known = A.known || (A.known = {});
  const qs = tp.q.filter(q => !known[tp.id + ':' + q.key] && !v.asked.has(tp.id + ':' + q.key)); // never ask what they already know
  if (!qs.length) return false;
  const q = pickFreshT(A, qs, v), open = fillTalk(q.text), qkey = tp.id + ':' + q.key; v.asked.add(qkey);
  const push = (who, text, meta) => { out.push([who, text, tp.id, meta]); v.texts.add(text); };
  push(ai, (first || MAPS[mapIdx].club ? '' : Math.random() < .5 ? pickFresh(A, SWITCH[q.type === 'say' ? 'say' : 'q']) + ' ' : '') + open, { q: q.key, type: q.type, ask: ai });
  if (Math.random() < (MAPS[mapIdx].club ? .3 : .05)) { // didn't catch it
    push(bi, MAPS[mapIdx].club ? 'WHAT?' : pickFresh(B, MISHEAR), { mishear: 1 });
    if (Math.random() < .2 && q.type === 'say') { push(ai, pickFresh(A, NEVERMIND), { end: 1 }); return true; }
    push(ai, MAPS[mapIdx].club ? open.toUpperCase() : open, { q: q.key, repeat: 1 }); // says it again
  }
  const ans = answerFor(B, tp, q, v), atext = fillTalk(ans.text);
  push(bi, atext, { a: q.key, tags: ans.tags });
  for (const t of ans.tags) v.facts.add(t);
  known[qkey] = ans.tags; // the asker now knows; they won't ask again
  if (!ans.repeat) { B.said[qkey] = { text: atext, tags: ans.tags };
    for (const o of nearbyHumans(B.x, B.y, 130)) if (o !== A && o !== B && o.topics) (o.overheard = o.overheard || {})[qkey] = { text: atext, tags: ans.tags }; } // people nearby hear it too
  if (ans.persona) { if ((ans.persona === 'rude' || ans.persona === 'distracted') && Math.random() < .5) push(ai, pickFresh(A, PERSONA_RE), { end: 1 }); v.dead = true; return true; } // a non-answer: nowhere for the thread to go, and the talk fizzles
  let list = tp.N.filter(n => keyOk(n, q.key)), tags = ans.tags, last = bi, k = 0;
  const talky = Math.min(1.4, ((A.talkK || 1) + (B.talkK || 1)) / 2);
  for (let depth = 0; depth < 4; depth++) {
    const opts = list.filter(n => !v.used.has(n) && tagOk(n, tags));
    if (!opts.length) break;
    if (!tags.includes('ask') && Math.random() > (k ? .45 : .66) * talky) break; // an open question always gets picked up; otherwise, sometimes it just ends
    const n = pick(opts); v.used.add(n);
    const who = n.by === 'a' ? ai : n.by === 'b' ? bi : last ^ 1;
    const say = n.say.filter(l => !v.texts.has(l)); if (!say.length) break;
    push(who, fillTalk(pickFresh(P[who], say)), { n: 1 });
    let rs = n.re.filter(r => !r.tags.includes('ask') || hasFollow(n.then, null, r.tags)); if (!rs.length) { last = who; break; }
    const r = pickFreshT(P[who ^ 1], rs, v); push(who ^ 1, fillTalk(r.text), { tags: r.tags }); for (const t of r.tags) v.facts.add(t);
    last = who ^ 1; tags = r.tags; list = n.then; k++;
    if (!list.length) break; // the thread only goes deeper where the graph says it can
  }
  return true;
}
function buildTalk(a, b, surv) { // -> [[speaker 0|1, text, topic id?, meta], ...] plus the talk's state
  const out = [], v = { asked: new Set(), used: new Set(), texts: new Set(), facts: new Set(), ask0: 0 };
  if (surv) {
    const pt = a.pendingTopic;
    if (pt && pt.tp.B.length && Math.random() < .35) { // back to what they were talking about before it all happened
      const backs = pt.tp.B.filter(l => !l.req || pt.facts.has(l.req)); a.pendingTopic = b.pendingTopic = null;
      if (backs.length) {
        out.push([0, pick(backs).text, pt.tp.id], [1, pick(pt.tp.backRe || BACK_RE)]);
        return { out, v };
      }
    }
    const pool = SURVIVE.filter(s => lastDead || !s.ask[0].includes('{dead}')), s = pick(pool);
    out.push([0, pick(s.ask)], [1, pickFresh(b, s.ans)]);
    if (s.more && Math.random() < .6) { out.push([0, pick(s.more[0])]); if (s.more[1]) out.push([1, pick(s.more[1])]); }
    return { out, v };
  }
  const tp = pickTopic(a, b); if (!tp) return { out, v };
  if (tp.needs === 'dog') v.ask0 = b.dog && b.dog.alive ? 0 : 1; // the dog's owner is the one asked about it
  v.tp = tp;
  if (!topicLines(tp, [a, b], out, v, true)) return { out: [], v };
  if (!v.dead && !MAPS[mapIdx].club && Math.random() < .22 * Math.min(1.5, (a.talkK + b.talkK) / 2)) { const t2 = pickTopic(a, b); if (t2 && t2.needs !== 'dog') topicLines(t2, [a, b], out, v, false); } // drifts onto something else
  const lastL = out[out.length - 1];
  if (lastL && !/\?$/.test(lastL[1]) && !(lastL[3] && lastL[3].end) && Math.random() < .3) out.push([lastL[0] ^ 1, pickFresh(lastL[0] ? a : b, ACKS)]);
  return { out: out.map(l => [l[0], l[1].replace(NAMES_RE, () => pick(NAMES)), l[2], l[3]]), v };
}
let convos = [], convoT = 3, mutterT = 4, resumeT = 1, resumeCD = 0;
function speakIn(v, who, text, ctx, topicId) {
  const [t0, tag] = expand(fillNames(text, who)).split('#');
  if (tag && THREADS[tag]) who.mem = { tag, t: T };
  heard.set(text, T);
  const r = finishLine(t0, who, ctx), nb = bub(who, { ...r, urg: 0, convo: v, li: v.i });
  v.topic && (who.lastTopic = v.topic);
  return nb;
}
const pregame = () => state !== 'play' || !snake || !snake.started;
const startled = p => p.state === 'panic' || p.state === 'flee' || p.state === 'uneasy';
function suspendConvo(v) { // something cut the talk short: remember where it was, so it can pick up again (or be forgotten)
  for (const p of [v.a, v.b]) { const b = typing(p); if (b && b.convo === v) interrupt(p, 2); } // whoever was mid-sentence is cut off, naturally
  const at = v.cut ?? v.i; // the line that got cut (said again on resuming), or else the next one
  const rest = v.lines.slice(at), tier = Math.max(tierOf(v.a), tierOf(v.b));
  if (v.topic) for (const p of [v.a, v.b]) p.pendingTopic = { tp: v.topic, facts: v.state.facts };
  const meaty = rest.length >= 2 || (rest.length === 1 && v.cut !== undefined && !((rest[0][3] || {}).tags || []).includes('unsure')); // something real was left unsaid
  if (!meaty || v.survivor) return; // the talk was basically over: nothing to come back to
  const susp = { a: v.a, b: v.b, rest, T, tier, resumable: true };
  v.a.susp = v.b.susp = susp;
}
function updateConvos(dt) {
  if (MOD.mute) return;
  for (let i = convos.length - 1; i >= 0; i--) {
    const v = convos[i];
    const scared = !v.survivor && (startled(v.a) || startled(v.b)); // a scream, a death, the snake, a crash: whatever made either of them flinch
    const broke = !v.a.alive || !v.b.alive || dist2(v.a.x, v.a.y, v.b.x, v.b.y) > 150 * 150 || scared;
    if (broke) {
      if (scared && v.a.alive && v.b.alive) {
        suspendConvo(v);
        const calm = v.a.state === 'panic' ? v.b : v.b.state === 'panic' ? v.a : null; // one of them bolted mid-talk
        if (calm && calm.state !== 'panic' && Math.random() < .6) { const d = interrupt(calm, 1); bub(calm, { ...finishLine(pickFresh(calm, LINES.convoBreak), calm, 'idle'), delay: d, urg: 1 }); }
      }
      v.a.convo = v.b.convo = null; convos.splice(i, 1); continue;
    }
    if ((v.t -= dt) > 0) continue;
    if (v.i >= v.lines.length) { v.a.convo = v.b.convo = null; v.a.susp = v.b.susp = null; convos.splice(i, 1); continue; }
    const [sp, text, tid] = v.lines[v.i], who = sp ? v.b : v.a, other = sp ? v.a : v.b;
    if (v.lines[v.i].cutIn) interrupt(other, 1); // talks over the end of their sentence
    v.topic = tid ? talkPool().find(t => t.id === tid) || v.topic : v.topic;
    const nb = speakIn(v, who, text, v.survivor ? 'relief' : 'idle', tid);
    who.a = Math.atan2(other.y - who.y, other.x - who.x); other.a = Math.atan2(who.y - other.y, who.x - other.x); // they face each other
    if (who.state === 'wander' || who.state === 'idle') { who.state = 'idle'; who.timer = Math.max(who.timer, 2.5); }
    if (other.state === 'wander' || other.state === 'idle') { other.state = 'idle'; other.timer = Math.max(other.timer, 2.5); } // stay put while it lasts
    v.i++;
    const typeT = nb.text.length / nb.cps;
    const next = v.lines[v.i];
    if (next && next[0] !== sp && Math.random() < .08 && typeT > 1 && !/\?$/.test(nb.text)) { // the other one jumps in before they finish
      v.t = typeT * rand(.7, .9); next.cutIn = true;
    } else v.t = typeT + rand(.45, 1.15) / Math.max(.6, other.talkK || 1);
  }
  if ((resumeT -= dt) <= 0) { resumeT = rand(.8, 1.4); resumeConvos(); }
  if ((mutterT -= dt) <= 0) { mutterT = rand(3.5, 7); mutter(); }
  if ((convoT -= dt) > 0) return; convoT = rand(5, 10);
  if (convos.length >= (pregame() ? 3 : 2)) return;
  for (const c of creatures.slice().sort(() => Math.random() - .5)) { // two people standing close, both calm (or both just survived), start talking
    if (!c.alive || !c.def.human || c.def.alien || c.convo || c.susp || !c.topics || busyUntil(c) > 0 || Math.random() > .1 * (c.talkK || 1) * (c.state === 'wander' && c.alert > .3 ? 3 : 1)) continue; // rarer, unless something just happened worth talking about
    const surv = c.state === 'wander' && c.alert > .3 && (!snake || dist2(c.x, c.y, snake.x, snake.y) > 220 * 220);
    if (!surv && (c.state !== 'wander' && c.state !== 'idle' || c.alert > .3)) continue;
    const o = nearbyHumans(c.x, c.y, 70).find(o => o !== c && !o.def.alien && o.topics && !o.convo && !o.susp && busyUntil(o) <= 0 && (o.state === 'wander' || o.state === 'idle') && (MOD.blind || los(c.x, c.y, o.x, o.y)));
    if (!o) continue;
    const [A, B] = (o.talkK || 1) > (c.talkK || 1) ? [o, c] : [c, o]; // the chattier one starts
    const { out: lines, v: st } = buildTalk(A, B, surv); if (!lines.length) continue;
    const v = { a: A, b: B, lines, i: 0, t: rand(.2, .8), survivor: surv, topic: st.tp || null, state: st }; A.convo = B.convo = v; convos.push(v);
    break;
  }
}
function resumeConvos() { // after the danger: pick the talk back up, admit it's gone, or just let it go. Sparingly.
  for (const c of creatures) {
    const s = c.susp; if (!s || s.a !== c) continue;
    const a = s.a, b = s.b, age = T - s.T;
    if (!a.alive || !b.alive || age > 60) { a.susp = b.susp = null; continue; }
    if (age < 5 || a.convo || b.convo || startled(a) || startled(b) || busyUntil(a) > 0 || busyUntil(b) > 0) continue;
    if (snake && snake.started && !MOD.blind && (dist2(a.x, a.y, snake.x, snake.y) < 220 * 220 || dist2(b.x, b.y, snake.x, snake.y) < 220 * 220)) continue; // not while it's still right there
    a.susp = b.susp = null;
    if (dist2(a.x, a.y, b.x, b.y) > 110 * 110 || T < resumeCD) continue; // they got separated (or someone just did this): it's simply dropped
    const keep = [.55, .4, .2, .05][s.tier] ?? .1, r = Math.random();
    let lines = null;
    if (s.resumable && r < keep) { const first = s.rest[0]; lines = [[first[0], pick(CONVO_RESUME), first[2]], ...s.rest.map(l => [l[0], l[1], l[2], l[3]])]; } // "Anyway, what I was saying—" and the cut line again, then the rest
    else if (r < keep + .3) { const w = s.rest[0][0]; lines = [[w, pick(CONVO_LOST)], [w ^ 1, pick(CONVO_LOST_RE)]]; } // the one who was talking can't remember
    if (!lines) continue;
    resumeCD = T + rand(12, 20);
    const v = { a, b, lines, i: 0, t: rand(.3, .9), survivor: false, topic: a.pendingTopic ? a.pendingTopic.tp : null, state: { facts: new Set() } }; a.convo = b.convo = v; convos.push(v);
    a.pendingTopic = b.pendingTopic = null;
  }
}
function mutter() { // someone alone says something to nobody in particular, often about what they're doing
  const m = mapL();
  const cands = creatures.filter(c => c.alive && c.topics && !c.convo && (c.state === 'wander' || c.state === 'idle') && c.alert < .3 && busyUntil(c) <= 0 && !hasTrait(c, 'quiet'));
  if (!cands.length) return;
  const c = pick(cands); if (Math.random() > .3 * (c.talkK || 1)) return;
  const doing = [];
  if (c.dog && c.dog.alive) doing.push(...DOING.dog);
  if (c.dance) doing.push(...DOING.dance);
  if (c.fl && c.fl.on) doing.push(...DOING.flashlight);
  if (season) doing.push(...DOING[season.id]);
  if (!MAPS[mapIdx].indoor && light && light.day < .1) doing.push(...DOING.night);
  const pool = doing.length && (Math.random() < .5 || !m.mutter) ? doing : m.mutter; if (!pool) return;
  const raw = pickFresh(c, pool); if (!raw) return;
  const [t0, tag] = expand(raw).split('#'); if (tag && THREADS[tag]) c.mem = { tag, t: T }; heard.set(raw, T);
  bub(c, { ...finishLine(t0, c, 'idle') });
}
/* aliens: the same panic, in their own language */
const ALIEN_SYL = ['zh', 'kra', 'vesh', 'tol', 'qua', 'xi', 'ro', 'mek', 'thul', 'gra', 'nak', 'vo', 'ree', 'yth', 'kk', 'oth', 'sil', 'brr', 'eek', 'za', 'qor', 'lix'];
function gibberish(yell) {
  const words = Array.from({ length: randi(1, 3) }, () => { let w = ''; for (let k = randi(1, 3); k > 0; k--) w += pick(ALIEN_SYL) + (Math.random() < .15 ? "'" : ''); return w.replace(/'$/, ''); });
  let t = words.join(' ');
  if (yell) { t = t.toUpperCase(); if (Math.random() < .5) t = stretch(t); t += pick(['!', '!!', '?!']); } else t = t[0].toUpperCase() + t.slice(1) + pick(['.', '?', '...']);
  return t;
}
const talkCount = { t: -1, n: 0 };
function say(c, ctxRaw) {
  if (!c.def.human || !c.alive || MOD.mute) return;
  const [ctx, name] = ctxRaw.split(':');
  c.voice = c.voice || { heat: rand(.2, 1), swears: Math.random() < .7 }; c.recent = c.recent || [];
  if (hasTrait(c, 'quiet') && !HOT_CTX.has(ctx) && ctx !== 'answer' && ctx !== 'follow' && Math.random() < .55) return; // the quiet ones mostly keep it to themselves
  const urg = URG[ctx] ?? 2;
  if (ctx === 'act') { bub(c, { text: name, act: true }); return; }
  // already talking? more urgent news cuts in; anything else waits its turn or is dropped
  let delay = 0; const cur = c.bubbles && c.bubbles.filter(b => b.delay > 0 || (b.cps && shownLen(b) < b.text.length - 1));
  if (cur && cur.length) {
    const curUrg = Math.max(...cur.map(b => b.urg || 0));
    if (urg > curUrg || (urg >= 3 && Math.random() < .5)) delay = interrupt(c, urg);
    else if (urg >= 2 && busyUntil(c) < 1.5) delay = busyUntil(c) + pauseFor(urg);
    else return;
  }
  if (talkCount.t !== T) { talkCount.t = T; talkCount.n = creatures.reduce((n, o) => n + (o.bubbles && o.bubbles.length ? 1 : 0), 0); } // counted once per tick, not once per line
  const talking = talkCount.n - (c.bubbles && c.bubbles.length ? 1 : 0);
  if (talking >= 6 && urg < 3) { c.sayCD = rand(1.5, 3); return; }
  if (c.def.alien) { // gibberish, sometimes with a little action
    const yell = urg >= 2 || Math.random() < .4;
    if (ctx === 'spit') { bub(c, { text: pick(['spits green', 'gags', 'chitters in disgust']), act: true, delay }); bub(c, { text: gibberish(true), yell: true, delay: delay + .9, urg }); }
    else if (Math.random() < .12) bub(c, { text: pick(['clicks frantically', 'chitters', 'antennae flatten', 'hisses back']), act: true, delay });
    else bub(c, { text: gibberish(yell), yell, delay, urg });
    if (yell) Sfx.shout(c.x);
    c.sayCD = rand(3, 5.5); return;
  }
  if (ctx === 'spit') { // an action, then the line that goes with it
    bub(c, { text: pick(['spits blood', 'spits', 'gags and spits']), act: true, delay });
    bub(c, { ...finishLine(fromPool(c, c.voice.swears ? LINES.spit : LINES.spitClean), c, 'bloodOnMe'), delay: delay + .9, urg });
    Sfx.shout(c.x); c.sayCD = rand(3, 5); return;
  }
  let raw;
  if (ctx === 'follow') raw = fromPool(c, THREADS[name][1]);
  else if (ctx === 'answer') raw = fromPool(c, ANSWERS[name] || ANSWERS.whatFrom);
  else if (ctx === 'jokeReact') raw = hasTrait(c, 'rude') ? pick(['Shut up and run.', 'Not helping.', 'Shut UP.']) : fromPool(c, LINES.jokeReact);
  else raw = fromPool(c, linePool(c, ctx));
  if (!raw) return;
  const { text, tag } = parseLine(fillNames(raw, c, name));
  const fin = finishLine(text, c, ctx);
  const nb = bub(c, { ...fin, delay, urg });
  if (tag && THREADS[tag]) { c.mem = { tag, t: T }; askAround(c, tag); } // the question hangs in the air until something answers it
  if (hasTrait(c, 'funny') && ctx !== 'jokeReact' && TRAIT_LINES.funny[ctx] && (tiered(TRAIT_LINES.funny[ctx], tierOf(c)) || []).includes(raw)) reactToJoke(c);
  if (fin.yell) { const pf = voiceProfile(c, ctx); if (delay <= 0) Sfx.vocal(c.x, pf, c.vox || 1); else nb.prof = pf; }
  c.sayCD = ctx === 'chased' ? rand(2.2, 3.4) : rand(3.5, 6);
}
function reactToJoke(c) { // someone nearby doesn't appreciate it (or kind of does)
  if (Math.random() > .45) return;
  for (const o of nearbyHumans(c.x, c.y, 140)) {
    if (o === c || o.def.alien || o.reply) continue;
    o.reply = { t: rand(1.3, 2.2), ctx: 'jokeReact' }; return;
  }
}
function askAround(c, tag) { // someone close by who has already seen the snake answers the question
  if (!ANSWERS[tag]) return;
  for (const o of nearbyHumans(c.x, c.y, 160)) {
    if (o === c || o.def.alien || o.reply || !o.sawSnake) continue;
    if (Math.random() < .7) { o.reply = { t: rand(.7, 1.3), ctx: 'answer:' + tag }; c.mem = null; } // answered: no need to follow up themselves
    return;
  }
}
function followUp(c, on) { // something just answered what they said a while ago
  const m = c.mem, keep = m && m.tag === 'weird' ? 400 : 60; if (!m || T - m.t < 1 || T - m.t > keep) { if (m && T - m.t > keep) c.mem = null; return false; }
  const f = THREADS[m.tag]; if (!f || f[0] !== on) return false;
  c.mem = null; say(c, 'follow:' + m.tag); return true;
}
function mouthBlood(c) { // blood went in while they were screaming
  if (c.mouthBlood || !c.def.human || c.look && c.look.hat === 'helmet') return;
  c.mouthBlood = T; c.spitN = 0; say(c, 'spit');
  run.spits = (run.spits || 0) + 1; PROG.maxSpitRun = Math.max(PROG.maxSpitRun || 0, run.spits);
}
function aftertaste(c, dt) { // the blood stays with them: more spitting and complaining for a while
  if (!c.mouthBlood || c.spitN >= 3 || T - c.mouthBlood > 40 || busyUntil(c) > 0 || (c.bubbles && c.bubbles.length)) return;
  if ((c.tasteT = (c.tasteT ?? rand(5, 9)) - dt) > 0) return;
  c.tasteT = rand(7, 12); c.spitN++;
  if (Math.random() < .5) say(c, 'act:' + pick(c.def.alien ? ['spits green', 'gags'] : ['spits again', 'gags', 'wipes mouth on sleeve', 'retches']));
  else bub(c, { ...finishLine(fromPool(c, LINES.aftertaste), c, 'bloodOnMe'), urg: 1 });
}
/* which voice comes out: tied to how scared they are, who they are, and what just happened. The high yelp is kept rare
   (per person and across the crowd) so it stays a surprise instead of a chorus of squeaks. */
const SURPRISE_CTX = new Set(['firstSight', 'touched', 'hissed', 'wallSmash', 'crash', 'heard', 'bloodySnake']), VIOLENT_CTX = new Set(['witnessHuman', 'multiDeath', 'heardKill']);
let lastYelpT = -9;
function voiceProfile(c, ctx) {
  const tier = tierOf(c), jumpy = hasTrait(c, 'jumpy') || hasTrait(c, 'nervous'), steady = hasTrait(c, 'calm') || hasTrait(c, 'brave') || hasTrait(c, 'confident');
  const close = snake && !MOD.blind && dist2(c.x, c.y, snake.x, snake.y) < 60 * 60 || ctx === 'touched';
  const canYelp = T - lastYelpT > 1.4 && T - (c.yelpT ?? -99) > 12;
  let yelp = 0; // chance of the high, startled one
  if (SURPRISE_CTX.has(ctx) || close) yelp = (close ? .3 : .16) + (jumpy ? .25 : 0) - (steady ? .14 : 0) + (c.vox > 1.1 ? .08 : 0);
  if (canYelp && Math.random() < yelp) { lastYelpT = c.yelpT = T; return 'yelp'; }
  if (VIOLENT_CTX.has(ctx) && tier >= 2 && Math.random() < (steady ? .2 : .4)) return 'scream';
  if ((ctx === 'chased' || ctx === 'touched') && tier >= 3 && Math.random() < .35) return c.wasChased && c.runFor > 6 ? 'breath' : 'scream';
  if (ctx === 'chased' && c.runFor > 8 && Math.random() < .3) return 'breath'; // been running a long time
  if ((steady || hasTrait(c, 'rude')) && Math.random() < .5) return 'low';
  return 'shout';
}
function scream(c, ctx = 'panic') {
  say(c, ctx);
  if (MOD.mute) return; // silent crowd: nobody shouts a warning (seeing others panic still spreads it)
  if (MOD.blind) { noise('scream', c.x, c.y); return; } // blind: a scream is just a sound from where the screamer stands; whoever hears it works out the rest
  const R = 170 * (MOD.doublePanic ? 1.6 : 1);
  let n = 0;
  for (const o of nearbyHumans(c.x, c.y, R)) { // people who hear it panic a moment later and pass it on
    if (o === c || o.state === 'panic' || o.warn) continue;
    if (dist2(c.x, c.y, o.x, o.y) < 90 * 90 || los(c.x, c.y, o.x, o.y)) { o.warn = { x: c.fx, y: c.fy, t: rand(.25, .7) / (o.panicK || 1) }; n++; }
  }
  if (state === 'play') { crScream(n); if (n) netEmit({ t: 'scr', n }); } // a team challenge in co-op: everyone's counter moves
}
function panic(c, x, y, t, ctx = 'panic') {
  if (!c.alive) return;
  const was = c.state === 'panic';
  if (c.alert > .3) t *= 1.6; // been through this before: stays scared longer
  c.alert = Math.max(c.alert || 0, c.def.human ? 1 : .6);
  c.timer = was ? Math.max(c.timer, t) : t;
  c.state = 'panic'; c.fx = x; c.fy = y;
  if (c.def.human && !was) { if (ctx === 'none') { if (!MOD.mute) scream(c, 'panic'); } else scream(c, ctx); groupAlarm(c, x, y); }
  else if (!c.def.human && !was) { Sfx.animal(c.x, c.type); noise('animal', c.x, c.y); }
}
function flee(c, x, y, t) {
  if (c.state === 'panic') return;
  c.state = 'flee'; c.fx = x; c.fy = y; c.timer = Math.max(c.state === 'flee' ? c.timer : 0, t);
}
const WIT_NB = [];
function witness(x, y, victim) { // a kill happened at x,y
  if (victim.def.human && victim.name) lastDead = victim.name;
  noise('kill', x, y); // the crunch (and the cut-off scream) carries: that's all a blind crowd ever gets of it
  const lit = lightAt(x, y) > VISIBLE, R = MOD.doublePanic ? 2 : 1;
  for (const c of nearbyCreatures(x, y, 320 * R, WIT_NB)) { // nobody further than this can see it
    if (!c.alive) continue;
    const d = Math.hypot(c.x - x, c.y - y);
    if (MOD.blind && c.def.human) continue; // they can't see it: the 'kill' sound above reaches them when they next listen
    const sees = lit ? (c.def.human ? d < 320 * R && (d < 120 * R || los(c.x, c.y, x, y)) : d < 200 * R) : d < (c.def.human ? 45 : 60) * R;
    if (!sees) { if (c.fl && c.fl.on && d < 300) c.fl.look = { x, y, t: rand(1.2, 2.2) }; continue; } // heard it: point the light there
    if (!c.def.human) { panic(c, x, y, rand(2, 4)); continue; }
    c.deathsSeen = (c.deathsSeen || 0) + 1;
    if (c.mem && followUp(c, 'kill')) { if (c.state !== 'panic') panic(c, x, y, rand(4, 7), 'none'); continue; }
    if (c.deathsSeen >= 2 && !c.queasy && !c.puked && !c.def.alien && c.type !== 'astronaut' && Math.random() < .3 && d < 160) c.queasy = T; // it hits them later, once it's over
    if (false) { const running = c.state === 'panic'; say(c, 'act:' + (running ? 'throws up mid-run' : 'throws up')); c.puked = T; vomit(c); if (!running) panic(c, x, y, rand(4, 7), 'none'); continue; }
    const ctx = !victim.def.human ? 'witnessAnimal:' + victim.type : c.deathsSeen >= 2 ? 'multiDeath' : 'witnessHuman';
    if (c.state === 'panic') { c.timer = Math.max(c.timer, rand(4, 7)); if (Math.random() < .5) say(c, ctx); }
    else panic(c, x, y, rand(4, 7), ctx);
  }
}

let deaths = []; // where things died this run; people avoid these places
let goreLvl = 0; // how blood-covered the snake looks, updated once a frame
const snakeGore = () => snake ? snake.stains.reduce((a, l) => a + l.length, 0) : 0;
function perceive(c) {
  const s = snake, hum = c.def.human;
  c.avx = c.avy = 0;
  let panicN = 0, panicO = null; // one pass over the neighbors: personal space, a softer wider bubble, and who nearby is panicking
  const pdt = clamp(T - (c.pLast ?? T - .2), .05, .6); c.pLast = T;
  for (const o of nearbyCreatures(c.x, c.y, 120)) {
    if (o === c) continue;
    const dx = c.x - o.x, dy = c.y - o.y, d2 = dx * dx + dy * dy, rr = c.def.r + o.def.r;
    if (hum && o.def.human && o.state === 'panic' && d2 < 120 * 120) { panicN++; panicO = o; }
    if (d2 >= (rr + 30) * (rr + 30) || d2 === 0) continue;
    const dd = Math.sqrt(d2), soft = (rr + 30 - dd) / (rr + 30) * .3, hard = dd < rr + 8 ? (rr + 8 - dd) / (rr + 8) * 1.2 : 0;
    c.avx += dx / dd * (soft + hard); c.avy += dy / dd * (soft + hard);
  }
  if ((c.gTick = !c.gTick)) { groupTick(c, (c.gDt || 0) + pdt); c.gDt = 0; } else c.gDt = pdt; // group bookkeeping every other look round
  groupSteer(c);
  if (c.state !== 'idle' && Math.random() < .25) noteSpot(c);
  for (let k = 0; k < 8; k++) { // keep off walls and out of corners
    const a = k * TAU / 8, dx = Math.cos(a), dy = Math.sin(a);
    if (solid(c.x + dx * 26, c.y + dy * 26)) { c.avx -= dx * .5; c.avy -= dy * .5; }
  }
  if (state !== 'play' || !s.started) return;
  if (MOD.blind && hum) return blindPerceive(c, hum); // no eyes: hearing and touch only (see 27b-hearing)
  const dist = Math.hypot(c.x - s.x, c.y - s.y), sight = c.def.sight * (MOD.skittish ? 1.5 : MOD.oblivious ? .6 : 1) * (MOD.fog ? .55 : 1) * (s.camoT > 0 ? .25 - (upg('camo') > 2 ? .15 * (s.still || 0) : 0) : 1) * (hasTrait(c, 'distracted') ? .7 : hasTrait(c, 'curious') ? 1.15 : 1); // camouflage: only up close
  const seen = (dist < (s.camoT > 0 ? (upg('camo') > 2 ? 9 : 22) : 40) || (dist < sight * (c.alert > .3 ? 1.25 : 1) && lightAt(s.x, s.y) > VISIBLE && los(c.x, c.y, s.x, s.y)));
  if (hum && c.state === 'panic' && dist < 62 && Math.random() < .06) adrenFrom(c, s.x, s.y); // a burst of fear, only with the snake right on their heels
  if (dist < 75 && (seen || dist < 40)) c.closeCall = true; // the snake came right past them...
  else if (c.closeCall && dist > 140) { c.closeCall = false; if (hum && Math.random() < .6) say(c, 'relief'); } // ...and kept going
  if (c.state === 'flee' || c.state === 'panic' || c.state === 'uneasy') {
    if (seen) { c.fx = s.x; c.fy = s.y; if (dist < 90) c.wasChased = true; } // run from where it actually is
    if (dist < 60 + s.segs.length * snakeSegmentSpacing()) for (let i = 0; i < s.segs.length; i += 2) { // and around its body (they can see all of it)
      const g = s.segs[i], dx = c.x - g.x, dy = c.y - g.y, d2 = dx * dx + dy * dy;
      if (d2 < 3600 && d2 > 0) { const dd = Math.sqrt(d2); c.avx += dx / dd * (60 - dd) / 60; c.avy += dy / dd * (60 - dd) / 60; }
    }
  }
  if (seen && c.fl && c.fl.on && !c.flSpotted) { c.flSpotted = true; c.flSnap = rand(.35, .6); } // beam snaps onto it
  const gore = hum ? goreLvl : 0; // 0 clean .. 1 drenched
  if (hum && seen && c.mem && followUp(c, 'see')) { /* "what are we running from?" ... "OH. THAT." */ }
  else if (hum && dist < 85 && c.mem) followUp(c, 'near');
  if (hum && seen && !c.sawSnake && c.state !== 'panic') { c.sawSnake = true; if (Math.random() < .55 + gore * .4) say(c, gore > .2 ? 'bloodySnake' : 'firstSight'); }
  if (seen && c.state !== 'panic') {
    if (c.alert > .3 || MOD.noticeSnake) { // they've seen what it does: no second look needed
      if (c.alert > .3) panic(c, s.x, s.y, rand(4, 7), 'chased'); else { c.state = 'flee'; c.fx = s.x; c.fy = s.y; c.timer = 2.5; }
    } else if (gore > .45 && dist < 60 + 200 * gore && Math.random() < gore * .18) panic(c, s.x, s.y, rand(3, 5), 'bloodySnake'); // a blood-soaked snake is terrifying
    else if (dist < 75 + 170 * gore && (c.state === 'wander' || c.state === 'idle')) { // the bloodier it is, the earlier they get uneasy
      c.state = 'uneasy'; c.fx = s.x; c.fy = s.y; c.timer = (rand(1.5, 2.5) + gore * 2) / (c.panicK || 1);
      if (hasTrait(c, 'jumpy') && dist < 110 && Math.random() < .5) { panic(c, s.x, s.y, rand(3, 5), 'firstSight'); return; }
      if (gore > .2 && T - (c.goreSaid || -99) > 8 && Math.random() < .3) { c.goreSaid = T; say(c, 'bloodySnake'); }
    }
  }
  if (!hum || c.state === 'panic') return;
  if (panicN >= (hasTrait(c, 'calm') || hasTrait(c, 'confident') ? 3 : hasTrait(c, 'jumpy') ? 1 : 2)) { panic(c, panicO.fx, panicO.fy, rand(2.5, 4) * (c.panicK || 1), 'crowd'); return; } // a panicking crowd is contagious (seen, not heard)
  if (c.state === 'wander' || c.state === 'idle') { // blood and places where people died make them uneasy
    for (const d of deaths) {
      if (dist2(c.x, c.y, d.x, d.y) > 110 * 110 || (c.seen && c.seen.includes(d)) || !los(c.x, c.y, d.x, d.y)) continue;
      (c.seen = c.seen || []).push(d);
      c.state = 'uneasy'; c.fx = d.x; c.fy = d.y; c.timer = rand(2, 3.5);
      if (Math.random() < .6) say(c, 'bloodNearby');
      return;
    }
  }
}

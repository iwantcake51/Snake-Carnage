/* =========================================================
   DIALOGUE ENGINE. Words live in 25-lines.js; this decides who talks, what comes out and how.
   Speech is typed out over time, so it can be cut off partway; panic wears it down; people remember
   what they said and come back to it (or don't).
   ========================================================= */
const isYell = t => /[A-Z]/.test(t) && t === t.toUpperCase();
const expand = s => s.replace(/\{([^{}]*\|[^{}]*)\}/g, (_, o) => pick(o.split('|')));
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
  if (snake && c.state === 'panic') { const d = Math.hypot(c.x - snake.x, c.y - snake.y); if (d < 70) p += .2; }
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
const HOT_CTX = new Set(['witnessHuman', 'multiDeath', 'chased', 'bloodOnMe']);
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
const URG = { idle: 0, mutter: 0, relief: 1, escaped: 1, crash: 1, bloodNearby: 1, jokeReact: 1, convoBreak: 1, stunned: 2, hissed: 2, deaf: 2, firstSight: 2, bloodySnake: 2, crowd: 2, warned: 2, answer: 2, follow: 3, panic: 3, witnessAnimal: 2, witnessHuman: 3, multiDeath: 3, wallSmash: 3, bloodOnMe: 3, spit: 3, chased: 4 };
const CUT = [[.6, .95], [.6, .95], [.3, .8], [.1, .6], [0, .5]]; // how far into a sentence each urgency lets you get
function bub(c, o) {
  const b = c.bubbles || (c.bubbles = []), len = o.text.length;
  const cps = o.act ? 0 : (o.yell ? rand(30, 42) : rand(16, 24)) * ((c.talkK || 1) > 1.4 ? 1.2 : 1) * (o.fast ? 1.3 : 1);
  const nb = { text: o.text, yell: !!o.yell, act: !!o.act, t: 0, delay: o.delay || 0, cps, urg: o.urg || 0, full: o.full, topic: o.topic,
    life: (cps ? len / cps : 0) + clamp(.8 + len * .028, 1, 2.1) };
  b.push(nb); if (b.length > 4) b.splice(0, b.length - 4);
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
  if (b.full && b.topic !== undefined) c.lost = { full: b.full, topic: b.topic, tier: tierOf(c), T, partner: c.convo && (c.convo.a === c ? c.convo.b : c.convo.a) };
  b.text = kept + '—'; b.life = b.text.length / b.cps + rand(.7, 1.1);
  return Math.max(0, (b.text.length - now) / b.cps) + pauseFor(urg);
}
/* ---- conversations: built fresh each time from typed topics, personalities and what happened ---- */
let lastDead = null;
const NAMES_RE = /\{name\}/g;
const heard = new Map(); // line -> when anyone last said it: nobody repeats what someone nearby just said
const recentTopics = []; // [{id, T}]: different pairs don't all talk about the same thing
const freshLine = l => T - (heard.get(l) ?? -99) > 40;
function talkPool() { const k = mapKey(); return (TALK[k] || []).concat(MAPS[mapIdx].club ? [] : TALK.generic.map(t => ({ ...t, generic: true }))); }
function pickTopic(a, b) {
  const used = new Set(recentTopics.filter(r => T - r.T < 70).map(r => r.id));
  let pool = talkPool().filter(t => !a.topics.includes(t.id) && !b.topics.includes(t.id) && !used.has(t.id));
  if (!pool.length) pool = talkPool().filter(t => !a.topics.includes(t.id));
  if (!pool.length) return null;
  const local = pool.filter(t => !t.generic); if (local.length && Math.random() < .7) pool = local; // mostly about where they are
  const tp = pick(pool); recentTopics.push({ id: tp.id, T }); if (recentTopics.length > 12) recentTopics.shift();
  for (const c of [a, b]) { c.topics.push(tp.id); if (c.topics.length > 6) c.topics.shift(); }
  return tp;
}
const pickFresh = (c, arr) => { const f = arr.filter(freshLine); return fromPool(c, f.length ? f : arr); };
function answerFor(c, tp, type) { // an answer to what was actually asked, in this person's voice
  for (const [tr, k] of [['rude', .3], ['quiet', .4], ['distracted', .22], ['funny', .15]]) if (hasTrait(c, tr) && PERSONA_ANS[tr][type] && Math.random() < k) return pick(PERSONA_ANS[tr][type]);
  return pickFresh(c, (tp.a || {})[type] || (tp.a || {}).say || ['Huh.']);
}
function topicLines(tp, A, B, out, first) { // one topic: opener, answer, then maybe a few follow-ups
  const [type, open] = pickFresh(A, tp.q.map(q => q[1])) && tp.q.find(q => q[1] === A.recent[A.recent.length - 1]) || pick(tp.q);
  const ai = out.length ? (out[out.length - 1][0] ^ 1) : 0, bi = ai ^ 1; // whoever didn't just speak starts a new topic
  out.push([ai, (first ? '' : Math.random() < .5 ? pick(SWITCH) + ' ' : '') + open, tp.id]);
  if (Math.random() < (MAPS[mapIdx].club ? .3 : .05)) { // didn't catch it
    out.push([bi, MAPS[mapIdx].club ? 'WHAT?' : pick(MISHEAR)]);
    if (Math.random() < .2 && type === 'say') { out.push([ai, pick(NEVERMIND)]); return; }
    out.push([ai, MAPS[mapIdx].club ? open.toUpperCase() : open, tp.id]); // says it again
  }
  out.push([bi, answerFor(B, tp, type)]);
  const ns = (tp.n || []).slice().sort(() => Math.random() - .5);
  let k = 0;
  while (ns.length && Math.random() < (k ? .4 : .62) * Math.min(1.4, (A.talkK + B.talkK) / 2)) { // keep going, sometimes
    const [line, replies] = ns.pop(), who = Math.random() < .65 ? ai : bi;
    out.push([who, line, tp.id], [who ^ 1, pickFresh(who ? A : B, replies)]); k++;
  }
}
function buildTalk(a, b, surv) { // -> [[speaker 0|1, text, topic id?], ...]
  const out = [];
  if (surv) {
    if (a.pendingTopic && a.pendingTopic.back && Math.random() < .35) { // back to what they were talking about before it all happened
      const tp = a.pendingTopic; a.pendingTopic = b.pendingTopic = null;
      out.push([0, pick(tp.back), tp.id], [1, pick(BACK_RE)]); if (Math.random() < .5) out.push([0, pick(['Yeah. Fair.', 'Sorry. Coping.', 'Just saying.', '...right.'])]);
      return out;
    }
    const pool = SURVIVE.filter(s => lastDead || !s.ask[0].includes('{dead}')), s = pick(pool);
    out.push([0, pick(s.ask)], [1, pickFresh(b, s.ans)]);
    if (s.more && Math.random() < .6) { out.push([0, pick(s.more[0])]); if (s.more[1]) out.push([1, pick(s.more[1])]); }
    return out;
  }
  const tp = pickTopic(a, b); if (!tp) return out;
  topicLines(tp, a, b, out, true);
  if (Math.random() < .35 * Math.min(1.5, (a.talkK + b.talkK) / 2)) { const t2 = pickTopic(a, b); if (t2) topicLines(t2, a, b, out, false); } // drifts onto something else
  if (!/\?$/.test(out[out.length - 1][1]) && Math.random() < .3) out.push([out[out.length - 1][0] ^ 1, pick(ACKS)]);
  return out.map(l => [l[0], l[1].replace(NAMES_RE, () => pick(NAMES)), l[2]]);
}
let convos = [], convoT = 3, mutterT = 4;
function speakIn(v, who, text, ctx, topicId) {
  const [t0, tag] = expand(text).split('#');
  if (tag && THREADS[tag]) who.mem = { tag, t: T };
  heard.set(text, T);
  const r = finishLine(t0, who, ctx), nb = bub(who, { ...r, urg: 0, full: r.text, topic: topicId ? v.topic : undefined });
  v.topic && (who.lastTopic = v.topic);
  return nb;
}
const pregame = () => state !== 'play' || !snake || !snake.started;
function updateConvos(dt) {
  if (MOD.mute) return;
  for (let i = convos.length - 1; i >= 0; i--) {
    const v = convos[i];
    const panicky = !v.survivor && (v.a.state === 'panic' || v.b.state === 'panic');
    const broke = !v.a.alive || !v.b.alive || dist2(v.a.x, v.a.y, v.b.x, v.b.y) > 150 * 150 || panicky;
    if (broke) {
      if (panicky && v.a.alive && v.b.alive) {
        const calm = v.a.state === 'panic' ? v.b : v.a;
        for (const p of [v.a, v.b]) if (v.topic) p.pendingTopic = v.topic; // they might come back to it later
        if (calm.state !== 'panic' && Math.random() < .6) { const d = interrupt(calm, 1); bub(calm, { ...finishLine(fromPool(calm, LINES.convoBreak), calm, 'idle'), delay: d, urg: 1 }); }
      }
      v.a.convo = v.b.convo = null; convos.splice(i, 1); continue;
    }
    if ((v.t -= dt) > 0) continue;
    if (v.i >= v.lines.length) { v.a.convo = v.b.convo = null; convos.splice(i, 1); continue; }
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
  recoverThoughts(dt);
  if ((mutterT -= dt) <= 0) { mutterT = rand(3.5, 7); mutter(); }
  if ((convoT -= dt) > 0) return; convoT = rand(3, 6);
  if (convos.length >= (pregame() ? 3 : 2)) return;
  for (const c of creatures.slice().sort(() => Math.random() - .5)) { // two people standing close, both calm (or both just survived), start talking
    if (!c.alive || !c.def.human || c.def.alien || c.convo || !c.topics || busyUntil(c) > 0 || Math.random() > .22 * (c.talkK || 1)) continue;
    const surv = c.state === 'wander' && c.alert > .3 && (!snake || dist2(c.x, c.y, snake.x, snake.y) > 220 * 220);
    if (!surv && (c.state !== 'wander' && c.state !== 'idle' || c.alert > .3)) continue;
    const o = creatures.find(o => o !== c && o.alive && o.def.human && !o.def.alien && o.topics && !o.convo && busyUntil(o) <= 0 && (o.state === 'wander' || o.state === 'idle') && dist2(o.x, o.y, c.x, c.y) < 70 * 70 && los(c.x, c.y, o.x, o.y));
    if (!o) continue;
    const [A, B] = (o.talkK || 1) > (c.talkK || 1) ? [o, c] : [c, o]; // the chattier one starts
    const lines = buildTalk(A, B, surv); if (!lines.length) continue;
    const v = { a: A, b: B, lines, i: 0, t: rand(.2, .8), survivor: surv, topic: null }; A.convo = B.convo = v; convos.push(v);
    break;
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
function recoverThoughts(dt) { // back to what they were saying before the snake cut them off, or not
  for (const c of creatures) {
    const L = c.lost; if (!L || !c.alive) continue;
    if (T - L.T > 40) { c.lost = null; continue; }
    if (c.state === 'panic' || c.state === 'flee' || T - L.T < 4 || busyUntil(c) > 0 || Math.random() > dt * .4) continue;
    c.lost = null;
    const keep = [.6, .45, .22, .08][L.tier] ?? .1; // calm cut-offs often come back; real terror wipes them
    if (Math.random() > keep) continue; // forgotten
    const p = L.partner && L.partner.alive && dist2(p0x(L.partner), p0y(L.partner), c.x, c.y) < 150 * 150 && L.partner.state !== 'panic' ? L.partner : null;
    const full = L.full.replace(/[—]+$/, ''), lower = full[0].toLowerCase() + full.slice(1), r = Math.random();
    if (p && r < .3) { // the other one remembers
      bub(p, { ...finishLine(pick(LOST_PARTNER), p, 'idle') });
      if (Math.random() < .6) bub(c, { ...finishLine(pick(RESUME).replace('{full}', lower), c, 'idle'), delay: rand(1.4, 2) });
      else bub(c, { ...finishLine(pick(LOST_SHRUG), c, 'idle'), delay: rand(1.3, 1.9) });
    } else if (r < .55) bub(c, { ...finishLine(pick(RESUME).replace('{full}', lower), c, 'idle') });
    else if (r < .8) { bub(c, { ...finishLine(pick(LOST_SELF), c, 'idle') }); bub(c, { ...finishLine(pick(LOST_SHRUG), c, 'idle'), delay: rand(1.6, 2.4) }); }
    else bub(c, { ...finishLine(pick(LOST_SHRUG), c, 'idle') });
  }
}
const p0x = c => c.x, p0y = c => c.y;
/* aliens: the same panic, in their own language */
const ALIEN_SYL = ['zh', 'kra', 'vesh', 'tol', 'qua', 'xi', 'ro', 'mek', 'thul', 'gra', 'nak', 'vo', 'ree', 'yth', 'kk', 'oth', 'sil', 'brr', 'eek', 'za', 'qor', 'lix'];
function gibberish(yell) {
  const words = Array.from({ length: randi(1, 3) }, () => { let w = ''; for (let k = randi(1, 3); k > 0; k--) w += pick(ALIEN_SYL) + (Math.random() < .15 ? "'" : ''); return w.replace(/'$/, ''); });
  let t = words.join(' ');
  if (yell) { t = t.toUpperCase(); if (Math.random() < .5) t = stretch(t); t += pick(['!', '!!', '?!']); } else t = t[0].toUpperCase() + t.slice(1) + pick(['.', '?', '...']);
  return t;
}
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
  const talking = creatures.reduce((n, o) => n + (o !== c && o.bubbles && o.bubbles.length ? 1 : 0), 0);
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
  bub(c, { ...fin, delay, urg });
  if (tag && THREADS[tag]) { c.mem = { tag, t: T }; askAround(c, tag); } // the question hangs in the air until something answers it
  if (hasTrait(c, 'funny') && ctx !== 'jokeReact' && TRAIT_LINES.funny[ctx] && (tiered(TRAIT_LINES.funny[ctx], tierOf(c)) || []).includes(raw)) reactToJoke(c);
  if (fin.yell && delay <= 0) Sfx.shout(c.x);
  c.sayCD = ctx === 'chased' ? rand(2.2, 3.4) : rand(3.5, 6);
}
function reactToJoke(c) { // someone nearby doesn't appreciate it (or kind of does)
  if (Math.random() > .45) return;
  for (const o of creatures) {
    if (o === c || !o.alive || !o.def.human || o.def.alien || o.reply || dist2(o.x, o.y, c.x, c.y) > 140 * 140) continue;
    o.reply = { t: rand(1.3, 2.2), ctx: 'jokeReact' }; return;
  }
}
function askAround(c, tag) { // someone close by who has already seen the snake answers the question
  if (!ANSWERS[tag]) return;
  for (const o of creatures) {
    if (o === c || !o.alive || !o.def.human || o.def.alien || o.reply || !o.sawSnake || dist2(o.x, o.y, c.x, c.y) > 160 * 160) continue;
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
function scream(c, ctx = 'panic') {
  say(c, ctx);
  if (MOD.mute) return; // silent crowd: nobody shouts a warning (seeing others panic still spreads it)
  const R = 170 * (MOD.doublePanic ? 1.6 : 1);
  for (const o of creatures) { // people who hear it panic a moment later and pass it on
    if (o === c || !o.alive || !o.def.human || o.state === 'panic' || o.warn) continue;
    const d2 = dist2(c.x, c.y, o.x, o.y);
    if (d2 < R * R && (d2 < 90 * 90 || los(c.x, c.y, o.x, o.y))) o.warn = { x: c.fx, y: c.fy, t: rand(.25, .7) / (o.panicK || 1) };
  }
}
function panic(c, x, y, t, ctx = 'panic') {
  if (!c.alive) return;
  const was = c.state === 'panic';
  if (c.alert > .3) t *= 1.6; // been through this before: stays scared longer
  c.alert = Math.max(c.alert || 0, c.def.human ? 1 : .6);
  c.timer = was ? Math.max(c.timer, t) : t;
  c.state = 'panic'; c.fx = x; c.fy = y;
  if (c.def.human && !was) { if (ctx === 'none') { if (!MOD.mute) scream(c, 'panic'); } else scream(c, ctx); groupAlarm(c, x, y); }
  else if (!c.def.human && !was) Sfx.animal(c.x, c.type);
}
function flee(c, x, y, t) {
  if (c.state === 'panic') return;
  c.state = 'flee'; c.fx = x; c.fy = y; c.timer = Math.max(c.state === 'flee' ? c.timer : 0, t);
}
function witness(x, y, victim) { // a kill happened at x,y
  if (victim.def.human && victim.name) lastDead = victim.name;
  const lit = lightAt(x, y) > VISIBLE, R = MOD.doublePanic ? 2 : 1;
  for (const c of creatures) {
    if (!c.alive) continue;
    const d = Math.hypot(c.x - x, c.y - y);
    if (MOD.blind && c.def.human) { // they can't see it, but they hear it: run from roughly that direction
      if (d < 230) panic(c, x + rand(-110, 110), y + rand(-110, 110), rand(3, 6), d < 90 ? 'witnessHuman' : 'crowd');
      continue;
    }
    const sees = lit ? (c.def.human ? d < 320 * R && (d < 120 * R || los(c.x, c.y, x, y)) : d < 200 * R) : d < (c.def.human ? 45 : 60) * R;
    if (!sees) { if (c.fl && c.fl.on && d < 300) c.fl.look = { x, y, t: rand(1.2, 2.2) }; continue; } // heard it: point the light there
    if (!c.def.human) { panic(c, x, y, rand(2, 4)); continue; }
    c.deathsSeen = (c.deathsSeen || 0) + 1;
    if (c.mem && followUp(c, 'kill')) { if (c.state !== 'panic') panic(c, x, y, rand(4, 7), 'none'); continue; }
    if (c.deathsSeen === 3 && !c.def.alien && c.type !== 'astronaut' && Math.random() < .14 && d < 140) { const running = c.state === 'panic'; say(c, 'act:' + (running ? 'throws up mid-run' : 'throws up')); c.puked = T; vomit(c); if (!running) panic(c, x, y, rand(4, 7), 'none'); continue; }
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
  let panicN = 0, panicO = null; // one pass over everyone: personal space, a softer wider bubble, and who nearby is panicking
  for (const o of creatures) {
    if (o === c || !o.alive) continue;
    const dx = c.x - o.x, dy = c.y - o.y; if (dx > 120 || dx < -120 || dy > 120 || dy < -120) continue;
    const d2 = dx * dx + dy * dy, rr = c.def.r + o.def.r;
    if (hum && o.def.human && o.state === 'panic' && d2 < 120 * 120) { panicN++; panicO = o; }
    if (d2 >= (rr + 30) * (rr + 30) || d2 === 0) continue;
    const dd = Math.sqrt(d2), soft = (rr + 30 - dd) / (rr + 30) * .3, hard = dd < rr + 8 ? (rr + 8 - dd) / (rr + 8) * 1.2 : 0;
    c.avx += dx / dd * (soft + hard); c.avy += dy / dd * (soft + hard);
  }
  groupTick(c, .2); groupSteer(c);
  if (c.state !== 'idle' && Math.random() < .25) noteSpot(c);
  for (let k = 0; k < 8; k++) { // keep off walls and out of corners
    const a = k * TAU / 8, dx = Math.cos(a), dy = Math.sin(a);
    if (solid(c.x + dx * 26, c.y + dy * 26)) { c.avx -= dx * .5; c.avy -= dy * .5; }
  }
  if (state !== 'play' || !s.started) return;
  const dist = Math.hypot(c.x - s.x, c.y - s.y), sight = c.def.sight * (MOD.skittish ? 1.5 : MOD.oblivious ? .6 : 1) * (s.camoT > 0 ? .25 - (upg('camo') > 2 ? .15 * (s.still || 0) : 0) : 1) * (hasTrait(c, 'distracted') ? .7 : hasTrait(c, 'curious') ? 1.15 : 1); // camouflage: only up close
  const blind = MOD.blind && hum;
  const seen = !blind && (dist < (s.camoT > 0 ? 22 : 40) || (dist < sight * (c.alert > .3 ? 1.25 : 1) && lightAt(s.x, s.y) > VISIBLE && los(c.x, c.y, s.x, s.y)));
  if (blind && dist < 95 && c.state !== 'panic') { // heard something slither close by: bolt, roughly away from the sound
    if (dist < 50 || Math.random() < .35) panic(c, s.x + rand(-70, 70), s.y + rand(-70, 70), rand(2, 4), 'crowd');
    else if (c.state === 'wander' || c.state === 'idle') { c.state = 'uneasy'; c.fx = s.x + rand(-90, 90); c.fy = s.y + rand(-90, 90); c.timer = rand(1, 2); }
  }
  if (hum && c.state === 'panic' && dist < 70 && !(c.adrenCD > T) && Math.random() < .12) { c.adren = rand(1, 1.8); c.adrenCD = T + rand(7, 12); } // a burst of fear
  if (dist < 75 && (seen || dist < 40)) c.closeCall = true; // the snake came right past them...
  else if (c.closeCall && dist > 140) { c.closeCall = false; if (hum && Math.random() < .6) say(c, 'relief'); } // ...and kept going
  if (c.state === 'flee' || c.state === 'panic' || c.state === 'uneasy') {
    if (seen) { c.fx = s.x; c.fy = s.y; if (dist < 90) c.wasChased = true; } // run from where it actually is
    for (let i = 0; i < s.segs.length; i += 2) { // and around its body
      const g = s.segs[i], dx = c.x - g.x, dy = c.y - g.y, dd = Math.hypot(dx, dy);
      if (dd < 60 && dd > 0) { c.avx += dx / dd * (60 - dd) / 60; c.avy += dy / dd * (60 - dd) / 60; }
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
  if (!blind && (c.state === 'wander' || c.state === 'idle')) { // blood and places where people died make them uneasy
    for (const d of deaths) {
      if (dist2(c.x, c.y, d.x, d.y) > 110 * 110 || (c.seen && c.seen.includes(d)) || !los(c.x, c.y, d.x, d.y)) continue;
      (c.seen = c.seen || []).push(d);
      c.state = 'uneasy'; c.fx = d.x; c.fy = d.y; c.timer = rand(2, 3.5);
      if (Math.random() < .6) say(c, 'bloodNearby');
      return;
    }
  }
}

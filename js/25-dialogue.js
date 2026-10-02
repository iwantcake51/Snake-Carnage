const SCREAMS = ['AAAH!', 'HELP!', 'RUN!', 'OH GOD!', 'NO NO NO!', 'IT ATE THEM!', 'SNAKE!!', 'SOMEBODY HELP!', 'MOVE!',
  'WHAT IS THAT?!', 'GET AWAY!', 'MOMMY!', 'CALL 911!', "IT'S HUGE!", 'AAAAAAA!', 'NOT ME!', 'OH MY GOD!', 'KEEP RUNNING!', 'WHY?!', 'I SAW IT!', 'SNAKE! RUN!', 'EVERYBODY RUN!', "IT'S COMING!", 'GET OUT OF HERE!', 'WATCH OUT!',
  'IT HAS EYES!', "DON'T LOOK AT IT!", 'MY LEGS WON\'T WORK!', 'I LEFT THE OVEN ON!', 'NOT TODAY!', 'SOMEONE DO SOMETHING!', 'IS THAT BLOOD?!',
  'WHERE DID IT GO?!', 'IT GOT DAVE!', 'IT GOT KAREN!', 'IT GOT MY DOG!', 'I KNEW IT!', 'NOBODY BELIEVED ME!', 'GO GO GO!', 'HIDE!',
  'INSIDE! GET INSIDE!', 'SPLIT UP!', "DON'T SPLIT UP!", 'I CAN\'T BREATHE!', 'PLEASE NO!', 'TAKE HIM, NOT ME!', 'I HAVE KIDS!',
  'WHAT DO WE DO?!', "IT'S FAST!", "IT'S BEHIND YOU!", 'LOOK OUT!', 'OH NO OH NO!', 'SCREAMING INTERNALLY', 'HELP ME!', 'WHY ME?!',
  'I JUST GOT HERE!', 'THIS IS FINE', 'MAMA!', 'JESUS!', 'GET THE CAR!', 'RUN FASTER!', 'IT LICKED ME!', "I'M TOO YOUNG!", 'NOPE NOPE NOPE',
  'CALL ANIMAL CONTROL!', 'WHO FEEDS THAT THING?!', 'THE POLICE! CALL THEM!', "IT'S HUNGRY!", 'BIGGEST SNAKE EVER!', 'MY SHOES!',
  'NOT THE FACE!', 'STAY QUIET!', 'SHHH!', 'I SEE IT!', "IT'S GROWING!", 'GOODBYE CRUEL WORLD!', 'I SHOULD HAVE STAYED HOME!',
  'THE BLOOD! THE BLOOD!', 'EVERYONE STAY CALM!', 'I AM NOT CALM!', 'HEEELP!', 'OUTTA MY WAY!', 'SAVE YOURSELVES!', 'IT TOOK GRANDMA!'];
/* DIALOGUE. Lines written in ALL CAPS are yelled; the rest are spoken. Each context has its own lines so people
   react to what actually happened. Everyone gets a voice: how intense they are and whether they swear. */
const LINES = {
  firstSight: ['what is that', 'is that... a snake?', 'uh, guys?', 'holy shit, look at the size of it', "that's not normal", 'SNAKE!', 'oh hell no',
    'nope. nope.', 'is that thing real?', 'WHAT THE FUCK IS THAT?!', 'somebody call animal control', "don't make any sudden moves"],
  bloodySnake: ["it's covered in blood", 'why is it all red', "oh god, that's not its color", "it's been eating people", "THAT'S BLOOD ON IT!", 'jesus, look at it', 'is that... from people?'],
  witnessHuman: ['IT ATE HIM!', 'OH MY GOD!', 'WHAT THE FUCK!', 'he was right there', 'NO! NO NO NO!', 'jesus christ', 'it swallowed them whole',
    'did that just happen?', 'OH FUCK!', 'somebody do something', 'HOLY SHIT!', "they're gone... just gone", 'I saw it. I saw the whole thing'],
  witnessAnimal: ['it ate the {a}!', 'did it just eat that {a}?', 'oh god, the poor {a}', "it's eating everything", 'WHAT THE HELL!', 'gross, oh my god',
    'IT ATE THE {A}!', 'that was somebody\'s {a}', 'okay, I\'m leaving'],
  multiDeath: ["IT'S KILLING EVERYONE!", 'how many is that?!', 'WE NEED TO GET OUT OF HERE!', "it's not stopping", 'this is a massacre', 'OH GOD, NOT AGAIN!',
    "it's still hungry", 'NOBODY IS SAFE!', 'how is it still going?'],
  bloodOnMe: ["IT'S ON ME!", "oh god, it's warm", 'is this... blood?', 'GET IT OFF!', "it's in my hair", "I'm gonna be sick", 'EW, EW, EW!',
    "it's in my mouth", "OH FUCK, IT'S ON ME!", 'my shirt... oh no'],
  bloodNearby: ['is that blood?', 'why is there blood everywhere', 'oh no...', "something's wrong", "that's a lot of blood", "I don't like this",
    'what happened here?', 'is someone hurt?', 'we should go'],
  chased: ['GET AWAY!', 'LEAVE ME ALONE!', 'NOT ME!', 'PLEASE!', 'OH FUCK!', 'HELP!', "it's right behind me", 'faster, faster!', 'NO NO NO!',
    'GET THE FUCK AWAY!', "it's gaining on me", "don't look back"],
  crowd: ["what's happening?!", 'why is everyone running?!', 'RUN!', "what's going on", 'MOVE!', 'where is it?!', 'what are we running from?!',
    'GO GO GO!', 'oh shit, oh shit', 'WAIT FOR ME!'],
  escaped: ['I think I lost it', 'oh thank god', "keep going, don't stop", 'holy shit, that was close', 'is it gone?', "I'm never coming back here",
    'breathe... just breathe', 'I can\'t feel my legs'],
  relief: ['oh thank god', "it didn't see me", 'phew...', 'that was way too close', "I'm still alive?", 'it just... went past',
    'holy shit, it missed me', 'okay. okay. breathe.', "don't move, it's leaving", 'I think I peed a little', 'not today, snake', 'I owe someone a prayer'],
  panic: ['RUN!', 'HELP!', 'keep running', 'call the police', 'oh god, oh god', "this isn't happening", 'SOMEBODY HELP!', 'where do we go?!', 'FUCK!',
    "don't stop", 'SHIT!', 'we have to hide', 'GET INSIDE!']
};
const HOT_CTX = new Set(['witnessHuman', 'multiDeath', 'chased', 'bloodOnMe']);
const isYell = t => /[A-Z]/.test(t) && t === t.toUpperCase();
function stretch(t) { // FUCKKK, NOOOO
  const words = t.split(' '), i = randi(0, words.length - 1), w = words[i];
  const vowel = w.search(/[aeiou](?!.*[aeiou])/i), pos = vowel >= 0 && Math.random() < .5 ? vowel : w.replace(/[^a-z]+$/i, '').length - 1;
  if (pos < 0 || !/[a-z]/i.test(w[pos])) return t;
  words[i] = w.slice(0, pos + 1) + w[pos].repeat(randi(1, 3)) + w.slice(pos + 1);
  return words.join(' ');
}
function pickLine(c, ctx, name) {
  let pool = LINES[ctx] || LINES.panic;
  if (!c.voice.swears) { const clean = pool.filter(l => !/fuck|shit|hell|damn/i.test(l)); if (clean.length) pool = clean; }
  const unused = pool.filter(l => !c.recent.includes(l)); if (unused.length) pool = unused;
  let l = pick(pool); c.recent.push(l); if (c.recent.length > 5) c.recent.shift();
  return name ? l.replace('{a}', name).replace('{A}', name.toUpperCase()) : l;
}
function panicLevel(c) { // 0 calm .. 1 falling apart
  const h = c.voice ? c.voice.heat : .5, seen = Math.min(.25, (c.deathsSeen || 0) * .08);
  if (c.state === 'panic') return clamp(.55 + .35 * h + seen + (c.wasChased ? .1 : 0), 0, 1);
  if (c.state === 'flee' || c.state === 'uneasy') return clamp(.25 + .25 * h + seen, 0, 1);
  return seen * .5;
}
function stutterWord(w, twice) { // "did" -> "d-did", "WHAT" -> "W-WHAT", "where" -> "wh-where"; punctuation-only words are left alone
  const i = w.search(/[a-z]/i); if (i < 0) return w;
  const head = w.slice(i, i + 1 + (/^(th|wh|sh|ch)[a-z]/.test(w.slice(i)) ? 1 : 0));
  return w.slice(0, i) + head + '-' + (twice ? head + '-' : '') + w.slice(i);
}
function rattle(t, lvl, yell) { // speech gets less composed as panic rises; never every word, and often not at all
  if (lvl < .25 || t.length < 3) return t;
  const words = t.split(' ');
  if (lvl < .6) { // nervous: a hesitation or one light stutter
    const r = Math.random();
    if (r < .4) words[0] = stutterWord(words[0], false);
    else if (r < .55) return pick(yell ? ['UH— ', 'WAIT— '] : ['uh, ', 'um... ', 'I— ']) + (yell ? t : t[0].toLowerCase() + t.slice(1));
    return words.join(' ');
  }
  const r = Math.random(); // falling apart: pick one kind of breakdown
  if (r < .3) { // repeat the start of one or two words
    words[0] = stutterWord(words[0], Math.random() < .35);
    if (words.length > 3 && Math.random() < .35) { const k = randi(1, words.length - 1); words[k] = stutterWord(words[k], false); }
    return words.join(' ');
  }
  if (r < .55) { // interrupts itself and starts over
    const false0 = pick(['I', 'I-I', 'we', 'it', 'wh', 'oh', 'n-no', 'w-wait']);
    return (yell ? false0.toUpperCase() : false0[0].toUpperCase() + false0.slice(1)) + '—' + t;
  }
  if (r < .75 && words.length > 3) { // cuts the sentence short
    const cut = words.slice(0, randi(2, Math.min(3, words.length - 1))).join(' ').replace(/[,.!?]+$/, '');
    return stutterWord(cut, false) + (yell ? '—!' : '—');
  }
  return t; // sometimes they still get it out clean
}
function finishLine(t, c, ctx) { // intensity varies by person: some shout spoken lines, calm people say yelled ones
  let yell = isYell(t);
  if (!yell && HOT_CTX.has(ctx) && c.voice.heat > .75 && Math.random() < .35) { t = t.toUpperCase(); yell = true; }
  else if (yell && c.voice.heat < .35 && Math.random() < .5) { t = t.toLowerCase(); yell = false; }
  if (yell && c.voice.heat > .55 && Math.random() < .35) t = stretch(t);
  if (!yell) t = t[0].toUpperCase() + t.slice(1);
  if (!/[!?.…—]$/.test(t)) t += yell ? '!' : /^(what|where|why|is|did|how|was|which|who)\b/i.test(t) ? '?' : pick(['.', '...', '!']);
  return { text: rattle(t, panicLevel(c), yell), yell };
}
function say(c, ctxRaw) {
  if (!c.def.human || !c.alive || MOD.mute) return;
  const [ctx, name] = ctxRaw.split(':');
  c.voice = c.voice || { heat: rand(.2, 1), swears: Math.random() < .7 }; c.recent = c.recent || [];
  const b = c.bubbles || (c.bubbles = []);
  if (b.some(q => q.delay > 0)) return; // still mid-sentence
  const talking = creatures.reduce((n, o) => n + (o !== c && o.bubbles && o.bubbles.length ? 1 : 0), 0);
  if (talking >= 5 && ctx !== 'chased' && ctx !== 'bloodOnMe') { c.sayCD = rand(1.5, 3); return; }
  const chaos = (ctx === 'witnessHuman' || ctx === 'multiDeath' || ctx === 'chased') && c.voice.heat > .8 && Math.random() < .3;
  if (chaos) { // one word, shouted again and again with a breath in between
    const w = pick(c.voice.swears ? ['FUCK', 'NO', 'HELP', 'OH GOD', 'SHIT'] : ['NO', 'HELP', 'OH GOD', 'PLEASE']);
    let d = 0;
    for (let k = randi(2, 3); k > 0; k--) { b.push({ text: (d ? stretch(w) : w) + '!', yell: true, t: 0, life: rand(1, 1.4), delay: d }); d += rand(.65, 1); }
  } else {
    b.push({ ...finishLine(pickLine(c, ctx, name), c, ctx), t: 0, life: rand(1.7, 2.4), delay: 0 });
    if (Math.random() < .22 * c.voice.heat) b.push({ ...finishLine(pickLine(c, ctx, name), c, ctx), t: 0, life: rand(1.5, 2.1), delay: rand(1.2, 1.9) });
  }
  if (b.length > 4) b.splice(0, b.length - 4);
  if (b[b.length - 1] && b.find(q => q.delay <= 0 && q.t === 0 && q.yell)) Sfx.shout(c.x);
  c.sayCD = ctx === 'chased' ? rand(2.4, 3.6) : rand(3.5, 6);
}
function scream(c, ctx = 'panic') {
  say(c, ctx);
  if (MOD.mute) return; // silent crowd: nobody shouts a warning (seeing others panic still spreads it)
  const R = 170 * (MOD.doublePanic ? 1.6 : 1);
  for (const o of creatures) { // people who hear it panic a moment later and pass it on
    if (o === c || !o.alive || !o.def.human || o.state === 'panic' || o.warn) continue;
    const d2 = dist2(c.x, c.y, o.x, o.y);
    if (d2 < R * R && (d2 < 90 * 90 || los(c.x, c.y, o.x, o.y))) o.warn = { x: c.fx, y: c.fy, t: rand(.25, .7) };
  }
}
function panic(c, x, y, t, ctx = 'panic') {
  if (!c.alive) return;
  const was = c.state === 'panic';
  if (c.alert > .3) t *= 1.6; // been through this before: stays scared longer
  c.alert = Math.max(c.alert || 0, c.def.human ? 1 : .6);
  c.timer = was ? Math.max(c.timer, t) : t;
  c.state = 'panic'; c.fx = x; c.fy = y;
  if (c.def.human && !was) { scream(c, ctx); groupAlarm(c, x, y); }
  else if (!c.def.human && !was) Sfx.animal(c.x, c.type);
}
function flee(c, x, y, t) {
  if (c.state === 'panic') return;
  c.state = 'flee'; c.fx = x; c.fy = y; c.timer = Math.max(c.state === 'flee' ? c.timer : 0, t);
}
function witness(x, y, victim) { // a kill happened at x,y
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
  const dist = Math.hypot(c.x - s.x, c.y - s.y), sight = c.def.sight * (MOD.skittish ? 1.5 : MOD.oblivious ? .6 : 1) * (s.camoT > 0 ? .25 : 1); // camouflage: only up close
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
  if (hum && seen && !c.sawSnake && c.state !== 'panic') { c.sawSnake = true; if (Math.random() < .55 + gore * .4) say(c, gore > .2 ? 'bloodySnake' : 'firstSight'); }
  if (seen && c.state !== 'panic') {
    if (c.alert > .3 || SETTINGS.noticeSnake) { // they've seen what it does: no second look needed
      if (c.alert > .3) panic(c, s.x, s.y, rand(4, 7), 'chased'); else { c.state = 'flee'; c.fx = s.x; c.fy = s.y; c.timer = 2.5; }
    } else if (gore > .45 && dist < 60 + 200 * gore && Math.random() < gore * .18) panic(c, s.x, s.y, rand(3, 5), 'bloodySnake'); // a blood-soaked snake is terrifying
    else if (dist < 75 + 170 * gore && (c.state === 'wander' || c.state === 'idle')) { // the bloodier it is, the earlier they get uneasy
      c.state = 'uneasy'; c.fx = s.x; c.fy = s.y; c.timer = rand(1.5, 2.5) + gore * 2;
      if (gore > .2 && T - (c.goreSaid || -99) > 8 && Math.random() < .3) { c.goreSaid = T; say(c, 'bloodySnake'); }
    }
  }
  if (!hum || c.state === 'panic') return;
  if (panicN >= 2) { panic(c, panicO.fx, panicO.fy, rand(2.5, 4), 'crowd'); return; } // a panicking crowd is contagious (seen, not heard)
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

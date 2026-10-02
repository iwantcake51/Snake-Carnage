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
  stunned: ['it hit that thing hard', "it's dazed!", 'look, it slowed down!', 'is it hurt?', 'NOW! RUN WHILE IT\'S DIZZY!', 'it ran face-first into that'],
  deaf: ["I CAN'T HEAR!", 'my ears are ringing', 'what? WHAT?', "I can't hear myself think", 'everything sounds underwater', "WHY CAN'T I HEAR?!"],
  hissed: ['WHAT WAS THAT SOUND?!', 'IT HISSED AT ME!', 'nope nope NOPE', 'THAT NOISE!', 'it sounds ANGRY'],
  crash: ['what was that?', 'did something just break?', 'that came from over there', 'hello?', "something's in here with us"],
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
  const env = envPool(ctx); if (env.length && Math.random() < .45) pool = env; // where you are colors what you shout
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
function slur(t) { // ears ringing after a Hiss: words stretch, drop letters, trail off
  return t.split(' ').map(w => { const r = Math.random(); if (w.length > 3 && r < .3) return w.replace(/[aeiou]/i, m => m + m + m); if (w.length > 4 && r < .5) return w.slice(0, -2) + '-'; return w; }).join(' ').replace(/[.!?]*$/, '') + pick(['...', '..?', '—']);
}
function finishLine(t, c, ctx) { // intensity varies by person: some shout spoken lines, calm people say yelled ones
  let yell = isYell(t);
  if (!yell && HOT_CTX.has(ctx) && c.voice.heat > .75 && Math.random() < .35) { t = t.toUpperCase(); yell = true; }
  else if (yell && c.voice.heat < .35 && Math.random() < .5) { t = t.toLowerCase(); yell = false; }
  if (yell && c.voice.heat > .55 && Math.random() < .35) t = stretch(t);
  if (!yell) t = t[0].toUpperCase() + t.slice(1);
  if (!/[!?.…—]$/.test(t)) t += yell ? '!' : /^(what|where|why|is|did|how|was|which|who)\b/i.test(t) ? '?' : pick(['.', '...', '!']);
  if (c.deafT > T) t = slur(t);
  return { text: rattle(t, panicLevel(c), yell), yell };
}
/* ---- conversation memory: people remember what they just said and follow it up when something answers it ---- */
const FOLLOW = { // a line someone says -> the thread it opens
  "what are we running from?!": 'whatFrom', "what's happening?!": 'whatFrom', 'why is everyone running?!': 'whatFrom', "what's going on": 'whatFrom', 'where is it?!': 'whereIs',
  'is that... a snake?': 'isSnake', 'is that thing real?': 'isSnake', 'what is that': 'isSnake', "don't make any sudden moves": 'stayStill', 'stay quiet!': 'stayStill', 'shhh!': 'stayStill',
  'is it gone?': 'gone', 'I think I lost it': 'gone', 'it just... went past': 'gone', "don't move, it's leaving": 'gone', 'oh thank god': 'gone', 'not today, snake': 'gone',
  'somebody call animal control': 'animalControl', 'call the police': 'police', 'what happened here?': 'whatHappened', 'is someone hurt?': 'whatHappened', 'is that blood?': 'whatHappened',
  'we have to hide': 'hide', 'everyone stay calm!': 'calm', 'which way is the exit?!': 'exit', 'is this part of the show?!': 'show', 'is this a drill?!': 'drill',
};
const FOLLOW_UPS = { // thread -> what has to happen next, and what they say when it does
  whatFrom: ['see', ["OH FUCK, THAT'S WHAT.", "oh. OH. THAT'S WHAT.", 'never mind, I see it', "THAT! WE'RE RUNNING FROM THAT!", 'okay, running makes sense now']],
  whereIs: ['see', ['THERE IT IS!', "found it. wish I hadn't", "IT'S RIGHT THERE!"]],
  isSnake: ['kill', ["YEP, IT'S A SNAKE!", "IT'S REAL! IT'S VERY REAL!", 'okay. snake. confirmed. RUN.', "that answers that"]],
  stayStill: ['near', ['SUDDEN MOVES! SUDDEN MOVES!', 'FORGET WHAT I SAID, RUN!', 'okay, new plan: RUN']],
  gone: ['see', ["IT'S NOT GONE! IT'S NOT GONE!", 'NOPE, IT CAME BACK!', 'why did I say that', "IT'S BACK! WHY IS IT BACK?!"]],
  animalControl: ['kill', ["animal control isn't coming, is it?", 'CANCEL ANIMAL CONTROL, CALL THE ARMY!']],
  police: ['kill', ["the police can't fix this", 'WHERE ARE THE COPS?!']],
  whatHappened: ['see', ['oh. THAT happened.', 'never mind, I know what happened', 'OH GOD, IT DID THIS!']],
  hide: ['near', ["HIDING ISN'T WORKING!", 'IT FOUND US!']],
  calm: ['kill', ['I AM NOT CALM ANYMORE!', 'okay, panic. PANIC NOW.']],
  exit: ['near', ['FORGET THE EXIT, JUST RUN!', 'ANY DOOR! ANY DOOR!']],
  show: ['kill', ["THAT'S NOT A SHOW!", "IT'S NOT PART OF THE SHOW!"]],
  drill: ['kill', ['NOT A DRILL! NOT A DRILL!', "this is DEFINITELY not a drill"]],
};
const ANSWERS = { // someone nearby who already knows answers the question
  whatFrom: ['THE SNAKE!', 'A GIANT FUCKING SNAKE!', "don't ask, just RUN!", 'IT ATE SOMEONE!', 'BEHIND YOU!'],
  whereIs: ['RIGHT THERE!', 'EVERYWHERE!', "behind the— just run!"],
  isSnake: ["don't find out!", 'yes. move.', "I think so. Don't go closer.", 'BIGGEST ONE I EVER SAW'],
  whatHappened: ["you don't want to know", 'the snake. the snake happened.', "don't look"],
  exit: ['THIS WAY!', 'BACK DOWN THE HALL!', 'NO IDEA!'],
};
/* where you are changes what people shout: open ground, inside a building, out in space, in the club... */
const ENV_LINES = {
  open: { panic: ["there's nowhere to hide!", "it's wide open out here!", 'get to the trees!', 'WHERE DO WE EVEN GO?!', 'run for the road!'],
    chased: ["THERE'S NOWHERE TO HIDE!", "IT'S FASTER THAN ME!"], crowd: ['which way?!', 'SPREAD OUT!'] },
  indoor: { panic: ['get to the exit!', 'which way is the exit?!', 'LOCK THE DOORS!', 'down the hall!', 'get in a room and shut the door!', "the door won't open!"],
    chased: ["IT'S IN THE HALL!", 'SHUT THE DOOR! SHUT THE DOOR!'], crowd: ["what's in the hallway?!", 'everyone out!'], dark: ['who turned off the lights?!', "I can't see anything in here"] },
  office: { panic: ['I knew I should have worked from home', 'this is not in the handbook', 'HR is gonna hear about this', 'save the laptops! no wait, SAVE ME!', 'TAKE THE STAIRS!'],
    relief: ['I need a raise for this', "I'm taking the rest of the day off"] },
  space: { panic: ['GET TO THE AIRLOCK!', "we're in SPACE, there's nowhere to run!", 'how did a snake get up here?!', 'Houston?! HOUSTON?!', 'SEAL THE HATCH!'],
    chased: ['MY SUIT! IT GOT MY SUIT!', 'IT CAN BREATHE OUT HERE?!'], bloodOnMe: ["it's all over my visor!", 'I CAN\'T WIPE MY VISOR!'], firstSight: ['is that... on the moon?', 'how is it breathing?!', 'mission control is not gonna believe this'] },
  club: { panic: ['TURN THE MUSIC OFF!', "THE DJ ISN'T STOPPING!", 'is this part of the show?!', 'GET TO THE DOOR!', 'somebody spiked my drink... no, that\'s real'],
    firstSight: ['is that a costume?', 'is this part of the show?!', 'who brought a SNAKE?'], crowd: ["why is everyone running? it's a banger!"] },
  bunker: { panic: ['CODE RED! CODE RED!', 'lock down the bunker!', 'is this a drill?!', 'SEAL THE BLAST DOORS!', 'get to the armory!'],
    firstSight: ['contact! contact!', 'what the hell got in here?', 'is that a drill?'] },
  farm: { panic: ["it's after the animals!", 'get to the barn!', 'GET THE SHOTGUN! oh, we don\'t have one', 'run for the house!'], witnessAnimal: ['THAT WAS OUR BEST {A}!', 'not the {a}! we need that {a}!'] },
  town: { panic: ['GET INSIDE!', 'run for the square!', 'somebody stop it!', 'call 911! CALL 911!'] },
  pool: { panic: ['GET OUT OF THE WATER! wait, it\'s not IN the water', 'my towel! leave it!', 'run for the changing rooms!'] },
};
function envKey() { const m = MAPS[mapIdx]; return m.club ? 'club' : m.name === 'Bunker' ? 'bunker' : m.space ? 'space' : m.name === 'Office' ? 'office' : m.name === 'Farm' ? 'farm' : m.name === 'Town' ? 'town' : m.name === 'Pool' ? 'pool' : m.indoor ? 'indoor' : m.open ? 'open' : null; }
function envPool(ctx) {
  const k = envKey(), out = [];
  if (k && ENV_LINES[k] && ENV_LINES[k][ctx]) out.push(...ENV_LINES[k][ctx]);
  if ((k === 'office' || k === 'bunker' || k === 'club') && ENV_LINES.indoor[ctx]) out.push(...ENV_LINES.indoor[ctx]); // still a building
  if (MAPS[mapIdx].indoor && light && light.dark > .4 && ctx === 'panic' && Math.random() < .3) out.push(...ENV_LINES.indoor.dark);
  return out;
}
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
  const b = c.bubbles || (c.bubbles = []);
  if (b.some(q => q.delay > 0)) return; // still mid-sentence
  const urgent = ctx === 'chased' || ctx === 'bloodOnMe' || ctx === 'spit' || ctx === 'follow' || ctx === 'answer';
  const talking = creatures.reduce((n, o) => n + (o !== c && o.bubbles && o.bubbles.length ? 1 : 0), 0);
  if (talking >= 5 && !urgent) { c.sayCD = rand(1.5, 3); return; }
  if (c.def.alien) { // gibberish, sometimes with a little action
    const yell = HOT_CTX.has(ctx) || ctx === 'panic' || ctx === 'chased' || ctx === 'spit' || Math.random() < .4;
    if (ctx === 'spit') b.push({ text: pick(['spits green', 'gags', 'chitters in disgust']), act: true, t: 0, life: 1.4, delay: 0 }, { text: gibberish(true), yell: true, t: 0, life: 1.8, delay: .9 });
    else if (Math.random() < .12) b.push({ text: pick(['clicks frantically', 'chitters', 'antennae flatten', 'hisses back']), act: true, t: 0, life: 1.4, delay: 0 });
    else b.push({ text: gibberish(yell), yell, t: 0, life: rand(1.5, 2.2), delay: 0 });
    if (b.length > 4) b.splice(0, b.length - 4);
    if (yell) Sfx.shout(c.x);
    c.sayCD = rand(3, 5.5); return;
  }
  if (ctx === 'spit') { // an action, then the line that goes with it
    b.push({ text: pick(['spits blood', 'spits', 'gags and spits']), act: true, t: 0, life: 1.4, delay: 0 },
           { ...finishLine(pick(c.voice.swears ? ['EW, WHAT THE FUCK?', 'IT WENT IN MY MOUTH!', "that's SOMEONE'S BLOOD!", 'oh god oh god, I swallowed some'] : ['EW, EW, EW!', 'IT WENT IN MY MOUTH!', "that's someone's blood!", 'oh no, I swallowed some']), c, 'bloodOnMe'), t: 0, life: 2, delay: .9 });
    if (b.length > 4) b.splice(0, b.length - 4);
    Sfx.shout(c.x); c.sayCD = rand(3, 5); return;
  }
  if (ctx === 'act') { b.push({ text: name, act: true, t: 0, life: 1.6, delay: 0 }); if (b.length > 4) b.splice(0, b.length - 4); return; }
  const chaos = (ctx === 'witnessHuman' || ctx === 'multiDeath' || ctx === 'chased') && c.voice.heat > .8 && Math.random() < .3;
  if (chaos) { // one word, shouted again and again with a breath in between
    const w = pick(c.voice.swears ? ['FUCK', 'NO', 'HELP', 'OH GOD', 'SHIT'] : ['NO', 'HELP', 'OH GOD', 'PLEASE']);
    let d = 0;
    for (let k = randi(2, 3); k > 0; k--) { b.push({ text: (d ? stretch(w) : w) + '!', yell: true, t: 0, life: rand(1, 1.4), delay: d }); d += rand(.65, 1); }
  } else {
    const raw = ctx === 'follow' ? pick(FOLLOW_UPS[name][1]) : ctx === 'answer' ? pick(ANSWERS[name] || ANSWERS.whatFrom) : pickLine(c, ctx, name);
    b.push({ ...finishLine(raw, c, ctx), t: 0, life: rand(1.7, 2.4), delay: 0 });
    const tag = FOLLOW[raw.toLowerCase().replace(/^./, m => m)] || FOLLOW[raw];
    if (tag) { c.mem = { tag, t: T }; askAround(c, tag); } // the question hangs in the air until something answers it
    else if (Math.random() < .22 * c.voice.heat && ctx !== 'follow' && ctx !== 'answer') b.push({ ...finishLine(pickLine(c, ctx, name), c, ctx), t: 0, life: rand(1.5, 2.1), delay: rand(1.2, 1.9) });
  }
  if (b.length > 4) b.splice(0, b.length - 4);
  if (b[b.length - 1] && b.find(q => q.delay <= 0 && q.t === 0 && q.yell)) Sfx.shout(c.x);
  c.sayCD = ctx === 'chased' ? rand(2.4, 3.6) : rand(3.5, 6);
}
function askAround(c, tag) { // someone close by who has already seen the snake answers the question
  if (!ANSWERS[tag]) return;
  for (const o of creatures) {
    if (o === c || !o.alive || !o.def.human || o.def.alien || o.reply || !o.sawSnake || dist2(o.x, o.y, c.x, c.y) > 160 * 160) continue;
    if (Math.random() < .7) { o.reply = { t: rand(.7, 1.3), ctx: 'answer:' + tag }; c.mem = null; } // answered: no need to follow up themselves
    return;
  }
}
function followUp(c, on) { // something just answered what they said a moment ago
  const m = c.mem; if (!m || T - m.t < 1 || T - m.t > 22) { if (m && T - m.t > 22) c.mem = null; return false; }
  const f = FOLLOW_UPS[m.tag]; if (!f || f[0] !== on) return false;
  c.mem = null; c.bubbles = (c.bubbles || []).filter(q => q.delay <= 0); say(c, 'follow:' + m.tag); return true;
}
function mouthBlood(c) { // blood went in while they were screaming
  if (c.mouthBlood || !c.def.human || c.look && c.look.hat === 'helmet') return;
  c.mouthBlood = T; c.spitN = 0; say(c, 'spit');
  run.spits = (run.spits || 0) + 1; PROG.maxSpitRun = Math.max(PROG.maxSpitRun || 0, run.spits);
}
function aftertaste(c, dt) { // the blood stays with them: more spitting and complaining for a while
  if (!c.mouthBlood || c.spitN >= 3 || T - c.mouthBlood > 40 || (c.bubbles && c.bubbles.length)) return;
  if ((c.tasteT = (c.tasteT ?? rand(5, 9)) - dt) > 0) return;
  c.tasteT = rand(7, 12); c.spitN++;
  if (Math.random() < .5) say(c, 'act:' + pick(c.def.alien ? ['spits green', 'gags'] : ['spits again', 'gags', 'wipes mouth on sleeve', 'retches']));
  else { c.bubbles = c.bubbles || []; c.bubbles.push({ ...finishLine(pick(['I can still taste it', "it's in my teeth...", "that was someone's BLOOD in my mouth", 'I need to brush my teeth for a year', "I'm gonna throw up", 'why does it taste like pennies']), c, 'bloodOnMe'), t: 0, life: 2.2, delay: 0 }); }
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
  if (c.def.human && !was) { if (ctx === 'none') { if (!MOD.mute) scream(c, 'panic'); } else scream(c, ctx); groupAlarm(c, x, y); }
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
    if (c.mem && followUp(c, 'kill')) { if (c.state !== 'panic') panic(c, x, y, rand(4, 7), 'none'); continue; }
    if (c.deathsSeen === 3 && !c.def.alien && Math.random() < .35 && d < 160) { say(c, 'act:throws up'); c.puked = T; if (c.state !== 'panic') panic(c, x, y, rand(4, 7), 'none'); continue; }
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
  if (hum && seen && c.mem && followUp(c, 'see')) { /* "what are we running from?" ... "OH. THAT." */ }
  else if (hum && dist < 85 && c.mem) followUp(c, 'near');
  if (hum && seen && !c.sawSnake && c.state !== 'panic') { c.sawSnake = true; if (Math.random() < .55 + gore * .4) say(c, gore > .2 ? 'bloodySnake' : 'firstSight'); }
  if (seen && c.state !== 'panic') {
    if (c.alert > .3 || MOD.noticeSnake) { // they've seen what it does: no second look needed
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

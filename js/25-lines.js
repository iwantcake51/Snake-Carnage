/* =========================================================
   WHAT PEOPLE SAY. Only the words live here; 25-dialogue.js decides who says what, when, and how it comes out.
   - ALL CAPS lines are yelled. {a|b|c} picks one option each time it's said. "#tag" at the end opens a thread
     that something later can answer ("it's probably nothing#nothing" ... "Okay, I was wrong.").
   - A pool can be split by panic: { 0: calm, 1: uneasy, 2: scared, 3: falling apart }.
   - Write like people talk: short, flat, half-finished, boring. Not every line needs to be a punchline.
   ========================================================= */
const LINES = {
  firstSight: {
    0: ["Huh. What is that?", "Is that... a snake?", "Uh. Guys?", "Okay, what is that thing.", "Is that real?", "Wait. Wait, is that moving?", "That's a big {log|hose|thing}. Is that a— no.", "Is somebody seeing this or just me?", "Hey, uh... look.", "That's not normal, right?", "Is that someone's pet?", "Okay that's {huge|way too big}."],
    1: ["Oh no. No no.", "Okay, that's a snake.", "Is that thing {real|alive}?", "Holy shit, look at it.", "That is NOT a normal snake.", "Don't— don't move.#stayStill", "Back up. Slowly.#stayStill", "Oh hell no.", "Nope.", "Somebody call {animal control|somebody}.#animalControl"],
    2: ["SNAKE!", "WHAT THE FUCK IS THAT?!", "OH— what the hell?!", "THAT'S A SNAKE!", "IT'S HUGE!"],
    3: ["SNAKE!", "OH SHIT!", "WHAT—", "NO!"],
  },
  bloodySnake: ["It's... covered in something.", "Why is it all red?", "That's not its color. That's not its color.", "Oh god, has it been eating people?", "THAT'S BLOOD ON IT!", "Jesus. Look at it.", "Is that from a person?", "That's blood. That's a lot of blood.", "I'm gonna be sick.", "Nope. Nope, I'm out."],
  witnessHuman: {
    1: ["Wait— did it just...", "Where'd {dead} go?", "Did that just happen?", "Oh my god.", "No. No way.", "He was right there.", "I— what?", "It just... took them."],
    2: ["IT ATE HIM!", "OH MY GOD!", "WHAT THE FUCK!", "JESUS CHRIST!", "IT ATE {DEAD}!", "NO! NO!", "HOLY SHIT!", "Did it— IT ATE THEM!"],
    3: ["NO!", "OH GOD—", "{DEAD}!", "FUCK!", "HOLY—", "RUN!"],
  },
  witnessAnimal: ["Did it just eat that {a}?", "It ate the {a}.", "Oh, the poor {a}.", "Okay, that's gross.", "WHAT THE HELL!", "That was somebody's {a}!", "Okay. I'm leaving.", "IT ATE THE {A}!", "It's eating everything.", "Oh, come on, not the {a}."],
  multiDeath: {
    1: ["How many is that?", "It's not stopping.", "It's still hungry.", "That's— that's another one.", "Oh god, again?"],
    2: ["IT'S KILLING EVERYONE!", "WE NEED TO GO!", "NOT AGAIN!", "HOW IS IT STILL GOING?!", "WHY ISN'T ANYONE DOING ANYTHING?!"],
    3: ["GO!", "OUT! OUT!", "NO, NO—", "RUN!", "MOVE!"],
  },
  bloodOnMe: ["IT'S ON ME!", "Oh god, it's warm.", "Is this— is this blood?", "GET IT OFF!", "It's in my hair. It's in my HAIR.", "I'm gonna throw up.", "EW! EW!", "My {shirt|shoes|jacket}... oh no.", "OH FUCK, IT'S ON ME!", "That's not mine. That's not mine."],
  bloodNearby: ["Is that blood?", "Why's there blood everywhere?", "Oh. Oh no.", "Something's wrong.", "That's... a lot of blood.", "I don't like this.", "What happened here?#whatHappened", "Is someone hurt?#whatHappened", "We should go.", "It's probably ketchup.#nothing", "Probably nothing. Right?#nothing", "Okay, that's not ketchup."],
  chased: {
    1: ["It's behind me, isn't it.", "Don't look back. Don't look back.", "Is it following me?"],
    2: ["GET AWAY!", "LEAVE ME ALONE!", "NOT ME!", "IT'S RIGHT BEHIND ME!", "WHY IS IT FOLLOWING ME?!", "GO AWAY! GO AWAY!", "I CAN'T OUTRUN IT!", "SOMEBODY HELP ME!", "IT'S TOO FAST!", "NOT LIKE THIS!", "FASTER!", "GET THE FUCK AWAY!", "IT'S GAINING!", "WHY ME?!"],
    3: ["NO NO NO—", "GO!", "MOVE!", "HELP—", "AAH!", "PLEASE—", "OH SHIT—", "FUCK—"],
  },
  crowd: {
    0: ["Why's everyone running?#whatFrom", "What's going on?#whatFrom", "Is something happening?#whatFrom", "Wait, where's everyone going?#whatFrom"],
    1: ["What are we running from?!#whatFrom", "Wait— what's happening?#whatFrom", "Where is it?#whereIs", "Hey! Wait up!", "What is it? What is it?#whatFrom", "Okay, I'm running, I guess."],
    2: ["WHAT ARE WE RUNNING FROM?!#whatFrom", "WAIT FOR ME!", "WHERE IS IT?!#whereIs", "MOVE!", "GO GO GO!", "WHICH WAY?!"],
    3: ["GO!", "MOVE!", "RUN!", "OUT OF THE WAY!"],
  },
  escaped: ["I think I lost it.#gone", "Oh thank god.", "Keep going. Don't stop.", "Holy shit, that was close.", "Is it gone?#gone", "I'm never coming back here.", "Breathe. Just... breathe.", "I can't feel my legs.", "Okay. Okay okay okay.", "I think it gave up.#gone", "That was way too close."],
  relief: ["It didn't see me.", "Phew.", "That was way too close.", "I'm alive? I'm alive.", "It just... went past.#gone", "It missed me. It actually missed me.", "Don't move. It's leaving.#gone", "I think I peed a little.", "Okay. Breathe.", "Huh. Guess I'm not its type.", "...okay."],
  stunned: ["It's dizzy! Look at it!", "It knocked itself silly.", "It can't even go straight!", "Run while it's out of it!", "It hit that thing hard.", "It's dazed!", "It slowed down!", "Is it hurt?", "NOW! GO WHILE IT'S DIZZY!", "It ran face-first into that.", "Ha. Idiot. RUN."],
  deaf: ["I CAN'T HEAR!", "My ears are ringing.", "What? WHAT?", "I can't hear anything.", "Everything sounds underwater.", "WHY CAN'T I HEAR?!", "Huh? HUH?"],
  hissed: ["WHAT WAS THAT?!", "IT HISSED AT ME!", "Nope. Nope nope.", "THAT NOISE!", "That sounded angry.", "Did it just— hiss?"],
  crash: ["What was that?", "Did something just break?", "That came from over there.", "Hello?", "Something's in here.", "It's probably nothing.#nothing", "Probably the wind.#nothing", "Did you hear that?#nothing", "Okay, that was loud."],
  panic: {
    0: ["Did you hear something?", "Something's off.", "Hm?"],
    1: ["Wait— what was that?", "Okay, uh, we should go.", "Don't run. Don't run. Okay, run.", "My heart's going crazy.", "Where did it go? Where did it go?", "I can hear it.", "Stay close to me.", "Is it still following?", "I don't wanna be here.", "Quiet. Be quiet.", "Is it still back there?", "Keep walking. Just keep walking.", "Oh god. Oh god.", "This isn't happening.", "We should hide.#hide", "Somebody call {someone|the cops}.#police", "Which way? Which way?", "Okay. Okay."],
    2: ["MOVE!", "GO! GO!", "DON'T STOP!", "WHICH WAY?!", "GET BACK, GET BACK!", "IT'S RIGHT THERE!", "OUT OF THE WAY!", "KEEP RUNNING, DON'T LOOK!", "WE'RE GONNA DIE!", "SOMEONE CALL SOMEONE!", "THIS WAY! NO— THAT WAY!", "DON'T LET IT SEE YOU!", "WHERE'S EVERYONE GOING?!", "I CAN'T SEE IT! WHERE IS IT?!", "STAY AWAY FROM IT!", "JUST RUN!", "SOMEBODY HELP!", "GET INSIDE!", "OH SHIT, MOVE!", "RUN!", "WHERE DO WE GO?!", "HELP!", "KEEP GOING!", "Don't stop, don't stop."],
    3: ["GO, GO, GO!", "RUN!", "MOVE—", "OH SHIT—", "HELP!", "NO—", "GO!", "AAH!", "NONONO—", "GET—", "IT'S—", "PLEASE—", "OH GOD OH GOD—", "WAIT— WAIT—", "FASTER—"],
  },
  wallSmash: {
    1: ["Did it just— go through the wall?", "That was a WALL.", "Okay, walls don't stop it. Great."],
    2: ["IT CAME THROUGH THE WALL!", "THE WALL! IT BROKE THE WALL!", "WHAT THE FUCK, THROUGH THE WALL?!", "IT'S IN HERE! IT'S IN HERE NOW!"],
    3: ["THE WALL—", "IT'S THROUGH!", "RUN!"],
  },
  heard: { // Blind crowd: they only ever hear it
    0: ["Did you hear that?", "What was that noise?", "Hello? Somebody there?", "Something's moving.", "Is someone there?#nothing", "Probably just the wind.#nothing", "...hello?"],
    1: ["Something's out there.", "I can hear it. It's close.", "That sounded wet.", "What IS that sound?", "Who's there?", "Shh. Listen.", "Okay, that's not the wind.", "It's dragging something.", "Which way did that come from?"],
    2: ["SOMETHING'S HERE!", "IT'S CLOSE! I CAN HEAR IT!", "WHERE IS IT?!", "WHICH WAY?!", "WHO'S THERE?!", "STOP MOVING, I CAN'T HEAR IT!"],
    3: ["WHERE—", "GET AWAY!", "IT'S HERE—", "WHICH WAY—", "NO NO—"],
  },
  heardKill: {
    1: ["That was a scream. That was a real scream.", "Something just— crunched.", "What happened? What was that?", "Somebody's hurt.", "Hello?! Are you okay?!"],
    2: ["SOMEONE'S HURT!", "WHAT WAS THAT?!", "OH GOD, WHAT WAS THAT SOUND?!", "SOMETHING GOT THEM!", "WHO SCREAMED?!"],
    3: ["NO—", "WHAT—", "GO! GO!", "RUN!"],
  },
  touched: {
    1: ["Something touched me.", "What was that? Something brushed my leg.", "Something's down there."],
    2: ["SOMETHING TOUCHED ME!", "IT'S RIGHT HERE!", "IT BRUSHED MY LEG!", "GET IT OFF! GET IT OFF!", "IT'S SCALY!"],
    3: ["AAH!", "IT'S HERE—", "GET OFF—", "NO—"],
  },
  convoBreak: ["Wait, what?", "What's wrong?", "Hey, what—", "Why are you— oh.", "What? What is it?", "Huh?", "...what?"],
  jokeReact: ["Not helping.", "Okay, that was kinda funny.", "Shut up and run.", "Seriously? Now?", "...heh.", "Dude.", "Not the time.", "How are you joking right now?"],
  spit: ["EW, WHAT THE FUCK?", "IT WENT IN MY MOUTH!", "That's someone's BLOOD!", "Oh god, I swallowed some.", "Pfft— PTOO— oh god.", "Bleh— no, no no."],
  spitClean: ["EW! EW! EW!", "IT WENT IN MY MOUTH!", "That's someone's blood!", "Oh no. I swallowed some."],
  aftertaste: ["I can still taste it.", "It's in my teeth.", "That was someone's BLOOD in my mouth.", "I need to brush my teeth for a year.", "I'm gonna throw up.", "Why does it taste like pennies?", "Ugh. Ugh."],
};
/* someone opened a thread; when this happens, they close it. [what has to happen, lines] */
const THREADS = {
  whatFrom: ["see", ["OH. Okay, yeah, THAT.", "Oh— oh, THAT. Okay.", "OH FUCK, THAT'S WHAT.", "Never mind. I see it.", "THAT! WE'RE RUNNING FROM THAT!", "Oh. Yeah. Running makes sense now."]],
  whereIs: ["see", ["THERE! IT'S RIGHT THERE!", "Found it. Wish I hadn't.", "Oh. There it is."]],
  isSnake: ["kill", ["Yep. Snake. RUN.", "IT'S REAL! IT'S VERY REAL!", "Okay, that answers that."]],
  stayStill: ["near", ["SUDDEN MOVES! SUDDEN MOVES!", "Forget what I said, RUN!", "Okay, new plan— RUN!"]],
  gone: ["see", ["IT'S NOT GONE!", "Nope, it's back!", "Why did I say that.", "IT CAME BACK! WHY DID IT COME BACK?!"]],
  nothing: ["see", ["Okay, I was wrong.", "Okay. Not nothing.", "So it was NOT nothing.", "I take it back! I TAKE IT BACK!", "That's— not nothing. That's not nothing."]],
  weird: ["see", ["SEE? I TOLD YOU SOMETHING WAS WRONG!", "I KNEW IT! I said something was off!", "Told you. I TOLD you.", "Weird. I said weird. THAT'S WEIRD!"]],
  gotThis: ["near", ["I do NOT got this!", "Okay! I don't got this!", "NEVER MIND! NEVER MIND!", "Okay, plan B. Run."]],
  animalControl: ["kill", ["Animal control isn't coming, is it?", "Forget animal control, call the army!"]],
  police: ["kill", ["The cops can't fix this.", "WHERE ARE THE COPS?!"]],
  whatHappened: ["see", ["Oh. THAT happened.", "Never mind, I know what happened.", "OH GOD, IT DID THIS!"]],
  hide: ["near", ["HIDING ISN'T WORKING!", "IT FOUND US!"]],
  calm: ["kill", ["I am NOT calm anymore!", "Okay, panic. Panic now."]],
  exit: ["near", ["FORGET THE EXIT, JUST RUN!", "ANY DOOR! ANY DOOR!"]],
  show: ["kill", ["THAT'S NOT PART OF THE SHOW!", "Not a costume! NOT A COSTUME!"]],
  drill: ["kill", ["NOT A DRILL! NOT A DRILL!", "This is definitely not a drill."]],
};
const ANSWERS = { // someone nearby who's already seen it answers the question
  whatFrom: ["THE SNAKE!", "A GIANT FUCKING SNAKE!", "Don't ask, just RUN!", "IT ATE SOMEONE!", "BEHIND YOU!", "You don't wanna know!", "Snake. Big one. Go."],
  whereIs: ["RIGHT THERE!", "Back there!", "I don't know! Just go!", "Behind the— just run!"],
  isSnake: ["Don't find out!", "Yes. Move.", "I think so. Don't go closer.", "Yeah. Biggest one I've ever seen."],
  whatHappened: ["You don't wanna know.", "The snake. The snake happened.", "Don't look.", "Don't. Just keep walking."],
  exit: ["THIS WAY!", "Back down the hall!", "No idea!", "I don't know, I'm following you!"],
};

/* ---- personality: how each kind of person sounds. Tiers where panic changes them. ---- */
const TRAIT_LINES = {
  funny: { // humor to cope, never stand-up: dry, awkward, forced, and it runs out as panic climbs
    firstSight: { 0: ["Huh. Big noodle.", "Cool. That's fine. Normal-sized snake.", "Someone's pet got out. Someone's very big pet.", "Oh good. A snake. Love that.", "Ha. Is that— no. Ha."], 1: ["Cool. Awesome. Love that for us.", "Great. Perfect. Love snakes.", "Ha. Okay. Not funny."] },
    panic: { 1: ["Cool. Awesome. Love that for us.", "Well. This is a fun new development.", "So that's what the screaming was about.", "Great day for it.", "Super. Super normal day.", "Five stars, would not recommend."], 2: ["Cool. Cool cool cool.", "Love that. LOVE that.", "Ha. Ha. No.", "Nope! Fun's over!"] },
    witnessHuman: { 1: ["Okay. That's not funny.", "Ha— no. No.", "Okay, I'm done joking."] },
    relief: ["It skipped me. Rude, but okay.", "Guess I'm not its type.", "Too stringy. Good.", "I'll take it.", "Note to self: never come back here."],
    escaped: ["Zero stars.", "Can't believe cardio finally paid off.", "Okay. That's my workout for the year."],
  },
  nervous: {
    firstSight: { 0: ["I-is that... is that real?", "I knew something was wrong today.", "Oh no. Oh no, no."], 1: ["Oh god. Oh god oh god.", "I can't— I can't do this."] },
    panic: { 1: ["I knew it. I KNEW something was wrong.", "Oh no oh no oh no.", "I can't do this, I can't do this.", "Is it gone? Tell me it's gone."], 2: ["I CAN'T— I CAN'T—", "OH GOD!", "PLEASE, PLEASE—"] },
    relief: ["My hands won't stop shaking.", "I'm— I'm okay. I think.", "I need to sit down."],
  },
  jumpy: {
    firstSight: { 0: ["AAH! WHAT IS THAT?!", "OH— what the hell?!"] },
    panic: { 1: ["AAAH!", "Did it touch me? I think it touched me!"], 2: ["AAAAH!", "IT TOUCHED ME!"] },
    crash: ["AH! What was that?!", "JESUS— what?!"],
  },
  calm: {
    firstSight: { 0: ["Okay. Slowly back away.#stayStill", "Nobody panic.#calm", "Hm. That's a problem."], 1: ["Back up. Don't run yet.#stayStill"] },
    panic: { 1: ["Walk, don't run.", "Everyone move away slowly.", "Deep breaths. Keep going.", "This way. Come on.", "Keep moving."], 2: ["Okay, run. Now.", "Go. Go, go."] },
    relief: ["Okay. We're fine.", "Everyone alright?", "Alright. Keep moving."],
  },
  rude: {
    firstSight: { 0: ["Who the hell brought that here?", "Great. Just great.", "Not my problem."] },
    panic: { 1: ["Get out of my way!", "Move, idiot!", "Your problem, not mine!", "Outta the way!"], 2: ["MOVE!", "GET OUTTA MY WAY!", "SHOVE OVER!"] },
    crowd: { 1: ["Move! MOVE!", "Out of the way!"] },
    relief: ["Better them than me.", "Whatever. I'm out of here."],
  },
  curious: { firstSight: { 0: ["Wait, is that a snake? Hang on, let me see.", "Huh. Come look at this.", "Is it... real? I want a closer look."] }, panic: { 1: ["Okay. Okay, I've seen enough.", "Should NOT have gone closer."] } },
  distracted: { firstSight: { 0: ["Huh? What's everyone looking at?", "Sorry, what? Oh. OH."] }, crowd: { 1: ["Wait, why are we running?#whatFrom", "Hang on, what'd I miss?#whatFrom"] } },
  brave: { firstSight: { 0: ["Everyone get behind me.", "I'm not scared of a snake.#gotThis"] }, panic: { 1: ["Stay together!", "This way, come on!"] }, witnessHuman: { 2: ["GET AWAY FROM THEM!", "HEY! OVER HERE!"] } },
  quiet: { firstSight: ["...", "Huh.", "Oh."], panic: { 1: ["...", "No.", "Move."], 2: ["Go.", "Run."] }, relief: ["...", "Okay."] },
  talkative: {
    firstSight: { 0: ["Oh my god, guys, guys, look, are you seeing this?", "Okay, so is nobody else gonna mention the snake?", "Is that a— no way, I've seen videos of these, it's— is that real?"] },
    panic: { 1: ["Okay so there's a GIANT snake and I'm running and nobody's helping and—", "I'm calling my mom, I'm calling everyone.", "Okay, okay, okay, so what's the plan, does anyone have a plan?"], 2: ["WHAT DO WE DO, WHAT DO WE DO—", "I'M NOT DYING HERE, I HAVE PLANS—"] },
    relief: ["Did you see that? Did you SEE that? I'm telling everyone.", "Okay that's the craziest thing that's ever happened to me and I once saw a guy fall off a roof."],
  },
  confident: {
    firstSight: { 0: ["It's just a snake. Relax.#gotThis", "I got this. Stay back.#gotThis", "Everyone chill, it's fine.#gotThis", "I've handled snakes before.#gotThis"] },
    panic: { 1: ["Stay together!", "Follow me!", "Keep moving, I'll watch the back!"], 2: ["THIS WAY!", "STAY BEHIND ME!"] },
    witnessHuman: { 1: ["HEY! OVER HERE!"], 2: ["GET AWAY FROM THEM!"] },
    relief: ["Told you. Fine.", "See? Nothing to it.", "Okay. That was closer than I'd like."],
  },
  pessimist: {
    firstSight: { 0: ["Of course there's a snake. Of course.", "Yep. This is how I go.", "Figures."] },
    panic: { 1: ["We're all gonna die.", "There's no point running.", "Of course this happens to me.", "This is it. This is how it ends."], 2: ["WE'RE DEAD!", "I KNEW IT!"] },
    relief: ["It'll be back.", "Enjoy it while it lasts.", "Yeah, for now."],
    escaped: ["It's just playing with us.", "It'll come back. They always come back."],
  },
};
/* how answers come out of different people */
const RUDE_ANS = ["Why are you asking me?", "Do I look like I know?", "Google it.", "No idea. Why would I know?", "Figure it out.", "Ask someone else."];
const QUIET_ANS = ["Dunno.", "Mm.", "No idea.", "Maybe.", "...", "Eh."];
const MISHEAR = ["What?", "Huh?", "Sorry, what?", "What'd you say?", "Hm?"];
const NEVERMIND = ["Never mind.", "Forget it.", "Nothing.", "Doesn't matter."];
const ACKS = ["Huh.", "Okay.", "Cool.", "Figures.", "Ugh.", "Right.", "Yeah, okay.", "Mm.", "Fair.", "Sure.", "Weird.", "Typical."];
const TALK_ON = ["Oh, and remind me to call my sister later.", "Anyway, that's a whole thing.", "Which, honestly, is fine.", "I was literally just talking about this.", "Long story.", "Don't get me started."];
/* survivors: after it's gone */
const SURVIVE = [
  { ask: ["You still alive?", "You okay?", "You good?", "Hey. You alright?"], ans: ["Barely.", "Define okay.", "No. Yes. I don't know.", "...yeah.", "Ask me tomorrow."] },
  { ask: ["Did you see that?", "Did that just happen?", "Tell me you saw that."], ans: ["See it? It nearly ate ME.", "Yeah. I saw.", "I'm trying not to think about it.", "No. And I'm keeping it that way."], more: [["How are we still alive?", "Why'd it skip us?"], ["Luck.", "No idea.", "Don't jinx it."]] },
  { ask: ["Where's {dead}?", "Has anyone seen {dead}?", "Where'd {dead} go?"], ans: ["...don't.", "I saw. Don't ask me.", "I don't know. I don't know.", "Gone.", "Can we not?"], more: [["Oh god.", "...oh.", "No."], ["Keep walking.", "Yeah."]] },
  { ask: ["Was that a snake?", "That was a snake, right?", "Who do we even call about that?"], ans: ["A snake the size of a bus.", "Someone braver than us.", "I'm not calling anyone, I'm leaving.", "I don't think 'snake' covers it."] },
  { ask: ["Are you hurt?", "Is that your blood?"], ans: ["I don't think so.", "Not mine.", "Just shaking.", "I don't wanna check."], more: [["Me too.", "Okay. Okay good."]] },
  { ask: ["What do we do now?", "So what's the plan?"], ans: ["Stay out of the open.", "Leave. We leave.", "I don't know. Not this.", "Find somewhere with a door."], more: [["And away from IT.", "Good plan."]] },
  { ask: ["Can we go home now?", "I wanna go home."], ans: ["Yeah. Yeah, let's go.", "Which way's home?", "Same."] },
];
const BACK_RE = ["...yeah, actually.", "Are you serious right now?", "How are you thinking about that?", "Ask me later.", "Honestly? Yeah.", "Sure. If we live.", "Not really hungry anymore.", "Can we not?"];

/* ---- every map: small talk, mutters, and what people shout there ----
   (conversation topics live in 25-talk.js) */
const MAPL = {
  field: {
    mutter: ["My feet are killing me.", "Should've brought water.", "Is that rain? No.", "Ugh. Ticks.", "Long way back.", "Where'd that bird go?"],
    panic: ["There's nowhere to hide!", "It's wide open out here!", "GET TO THE TREES!", "WHERE DO WE EVEN GO?!", "RUN FOR THE ROAD!", "The fence! Over the fence!"],
    chased: ["THERE'S NOWHERE TO HIDE!", "IT'S FASTER THAN ME!"],
    firstSight: ["Is that... in the grass?", "Something's moving in the grass.", "That's not a deer."],
  },
  meadow: {
    mutter: ["Ugh, mud.", "Pretty out here.", "Ow. Something bit me.", "Smells like rain.", "I should come out here more."],
    panic: ["GET OFF THE TRAIL!", "TO THE TENTS!", "Not toward the lake!", "Into the trees!"],
    firstSight: ["Something's in the grass.", "That's not a garter snake.", "Is that coming from the lake?"],
  },
  town: {
    mutter: ["Where'd I park?", "Need to get milk.", "Ugh, this light takes forever.", "Is it gonna rain?", "Should've worn a jacket.", "Where are my keys..."],
    panic: ["GET INSIDE!", "INTO A SHOP! ANY SHOP!", "Run for the square!", "Somebody stop it!", "CALL 911!", "Get off the street!"],
    firstSight: ["Is that coming out of the sewer?", "Somebody's python got out.", "That's not a dog."],
    relief: ["I'm moving. I'm moving towns.", "Never complaining about traffic again."],
  },
  maze: {
    mutter: ["Dead end. Great.", "Hello? Anyone?", "This was a stupid idea.", "Left. No. Right."],
    panic: ["WHICH WAY?!", "DEAD END! DEAD END!", "It's in the hedges!", "WHERE'S THE EXIT?!", "Don't go that way!"],
    firstSight: ["Something's in the hedge.", "Did that hedge move?"],
  },
  farm: {
    mutter: ["Smells like rain.", "Stupid gate.", "Come on, girl.", "Mud everywhere.", "Long day."],
    panic: ["It's after the animals!", "GET TO THE BARN!", "Run for the house!", "Get the shotgun! Oh— we don't have one.", "Leave the animals!"],
    witnessAnimal: ["That was our best {a}!", "Not the {a}! We need that {a}!", "That {a} had a NAME!"],
    firstSight: ["That's not a rat snake.", "Something's in the feed."],
  },
  park: {
    mutter: ["Good boy.", "Where's the bin?", "Leave it. LEAVE IT.", "Nice out.", "Ugh, geese."],
    panic: ["GET THE DOG!", "Leave the bike!", "Out of the park! OUT!", "Over the bridge!"],
    firstSight: ["Is that someone's pet?", "That's a big— that's a snake."],
  },
  pool: {
    mutter: ["Ugh, the concrete's so hot.", "Where's my towel?", "Ow, hot, hot.", "I'm gonna burn.", "Mm. Five more minutes."],
    panic: ["GET OUT OF THE WATER! Wait— it's not IN the water.", "Leave the towel!", "Run for the changing rooms!", "OUT OF THE POOL!", "Over the fence!", "Don't slip! Don't slip!"],
    firstSight: ["Is that a pool noodle?", "That's— that's not a pool toy.", "Somebody's inflatable?"],
    relief: ["Never complaining about the lifeguard again."],
  },
  office: {
    mutter: ["Where's that file...", "Who keeps taking my stapler?", "Three more hours.", "Ugh. Mondays.", "Did I send that?", "Why is it so cold in here?"],
    panic: ["I KNEW I should've worked from home!", "This is NOT in the handbook!", "HR is gonna hear about this!", "TAKE THE STAIRS!", "Leave the laptop!", "To the stairwell!", "Which way's the exit?!#exit"],
    firstSight: ["Is that... in the break room?", "Did someone bring their snake to work?", "Is this a team-building thing?"],
    relief: ["I need a raise for this.", "I'm taking the rest of the day off.", "I'm putting this in a ticket."],
  },
  checker: {
    mutter: ["Black square. White square.", "My eyes hurt.", "Don't step on the cracks.", "Weird place."],
    panic: ["GET OFF THE BOARD!", "Edges! Stay on the edges!", "Run! Any direction!"],
    firstSight: ["Is that a game piece?"],
  },
  crew: { // Moon / Mars: suited astronauts, radio talk
    mutter: ["Copy that.", "Base, say again?", "Okay. Okay, nice and slow.", "My visor's fogging.", "Check, check.", "Long walk back."],
    panic: ["BASE, WE HAVE A PROBLEM!", "BACK TO THE HAB!", "Base, do you read?!", "I can't run in this suit!", "GET TO THE ROVER!", "Mayday! MAYDAY!"],
    chased: ["MY SUIT! WATCH MY SUIT!", "It's on my six!"],
    firstSight: ["Base... you seeing this?", "That's... not possible.", "How is it breathing out here?", "Base, I've got movement."],
    bloodOnMe: ["It's all over my visor!", "I can't wipe my visor!"],
    relief: ["Base, we're... okay. Mostly.", "Suit's intact. Somehow.", "Copy. Still here."],
  },
  station: {
    mutter: ["Where'd I leave my tablet...", "Ugh, cold coffee.", "Three more days.", "Beep. Beep. Shut up.", "Who left this here?"],
    panic: ["SEAL THE HATCH!", "TO THE ESCAPE POD!", "How did a snake get UP here?!", "Lock the module!", "Station-wide alert! SOMEONE!", "Don't open that door!"],
    firstSight: ["How did that get onboard?", "Is that from the bio lab?", "Somebody's experiment got out."],
    relief: ["I'm requesting a transfer.", "Somebody log that. I'm not logging that."],
  },
  bunker: {
    mutter: ["Clipboard. Where's my clipboard?", "Hum of these lights...", "Six hours left.", "Check. Check. Done.", "Freezing down here."],
    panic: ["CODE RED!", "LOCK IT DOWN!", "Is this a drill?!#drill", "SEAL THE BLAST DOORS!", "Get to the armory!", "Contact! CONTACT!"],
    firstSight: ["Contact.", "What the hell got in here?", "Is this a drill?#drill", "How'd that get past the doors?"],
  },
  club: {
    mutter: ["Woo!", "Where's my drink?", "My feet hurt.", "Who keeps stepping on me?", "THIS SONG!"],
    panic: ["TURN THE MUSIC OFF!", "THE DJ ISN'T STOPPING!", "Is this part of the show?!#show", "GET TO THE DOOR!", "Somebody spiked my drink— no, that's real!", "Out! Fire exit!"],
    firstSight: ["Is that a costume?", "Is this part of the show?#show", "Who brought a SNAKE?", "Okay, I've had too much."],
    crowd: ["Why's everyone running? It's a banger!"],
    mishear: .4,
  },
};
const MAP_KEY = { 'Open Field': 'field', Meadow: 'meadow', Town: 'town', Maze: 'maze', Farm: 'farm', Park: 'park', Pool: 'pool', Office: 'office', Checkerboard: 'checker', Moon: 'crew', Mars: 'crew', 'Space Station': 'station', Bunker: 'bunker', Club: 'club' };

/* ---- more of every map: talk, things people say to nobody, sightings, panic, chases, hiding, getting away ---- */
const MAPL_MORE = {
  field: {
    mutter: ["Ugh, burrs on my socks.", "Smells like cut grass.", "Is that a hawk?", "Middle of nowhere.", "Should've brought a jacket.", "Mud. Great.", "So quiet it's weird."],
    panic: ["RUN FOR THE FENCE!", "Which way's the car?!", "Get behind the bales!", "Don't go in the long grass!", "SPLIT UP! No— don't split up!"],
    chased: ["IT'S IN THE GRASS!", "I CAN'T SEE IT IN THE GRASS!", "WHY IS IT SO FAST?!", "OVER THE FENCE, OVER THE FENCE!"],
    escaped: ["I'm hiding in the hay. Don't tell anyone.", "Stay low. Stay low.", "I think it lost us in the grass.", "We should head for the road."],
    relief: ["It just went past the bales.", "I could hear it in the grass. Ugh.", "Never walking through long grass again."],
  },
  meadow: {
    mutter: ["Where'd I put the bug spray...", "Smells like smoke and lake.", "So many frogs.", "Stupid tent pole.", "My shoes are soaked.", "Dragonfly. Nice.", "Ow. Thistle."],
    panic: ["NOT THE LAKE!", "Back to the tents!", "Get to the car park!", "OFF THE TRAIL!", "It came out of the reeds!"],
    chased: ["IT'S IN THE REEDS!", "IT'S FOLLOWING THE TRAIL!", "WHY IS IT FOLLOWING ME?!"],
    firstSight: ["Something just went into the reeds.", "That's a big— that's not a garter snake.", "Was that a log moving?"],
    escaped: ["I'm in the tent. That counts as hiding, right?", "Stay by the fire. Snakes hate fire. Right?", "Is it gone? I can't see it in the grass."],
    relief: ["It went back toward the water.", "Okay, I'm done camping. Forever.", "I'm sleeping in the car tonight."],
  },
  town: {
    mutter: ["Ugh, gum on my shoe.", "Is that my bus?", "Red light. Of course.", "Smells like bread.", "Somebody's car alarm again.", "Where'd I put my wallet...", "Rent's due Friday."],
    panic: ["INTO THE STORE!", "GET OFF THE ROAD!", "Somebody call the cops!", "Not the alley! NOT THE ALLEY!", "UP THE STAIRS!"],
    chased: ["IT'S ON THE SIDEWALK!", "IT'S BEHIND THE CARS!", "GET IN A CAR! ANY CAR!"],
    firstSight: ["Is that a fire hose?", "Did that just come out of a drain?", "Someone's pet got out. A big pet."],
    escaped: ["I'm behind the dumpster. I'm not moving.", "Lock the door. Lock it!", "It went down the street. I think."],
    relief: ["I'm calling in sick tomorrow.", "Nobody's gonna believe this.", "I'm taking a cab home."],
  },
  maze: {
    mutter: ["Left. Then left again. Or right.", "I've seen this hedge before.", "Hello? Anyone?", "Should've dropped breadcrumbs.", "Dead end.", "This is stupid."],
    panic: ["WHICH WAY'S OUT?!", "IT'S IN THE NEXT ROW!", "Don't go down that one!", "BACK! BACK!"],
    chased: ["DEAD END! DEAD END!", "IT'S AROUND THE CORNER!", "I CAN HEAR IT IN THE HEDGE!"],
    escaped: ["Shh. It's on the other side of the hedge.", "Don't move. It can't see us.", "I think it took the other turn."],
    relief: ["I'm never doing a maze again.", "Can we just climb out? Through the hedge?"],
  },
  farm: {
    mutter: ["Come on, girl. Come on.", "Who left this gate open?", "Chores, chores, chores.", "Smells like rain.", "Stupid rooster.", "Eggs, then the pigs."],
    panic: ["GET IN THE HOUSE!", "Open the gate! Let them out!", "Leave the eggs!", "INTO THE BARN AND SHUT IT!", "Call the neighbors!"],
    chased: ["IT'S BY THE COOP!", "IT'S IN THE PEN!", "GET IN THE TRUCK!"],
    firstSight: ["That's no rat snake.", "Something's spooking the cows.", "What in the hell is in my yard?"],
    escaped: ["I'm in the hayloft. Don't come up.", "Stay in the truck.", "It went after the chickens. Poor chickens."],
    relief: ["We're gonna need a bigger dog.", "I'm selling the farm. I mean it this time."],
  },
  park: {
    mutter: ["Leave it. LEAVE IT.", "Good boy.", "Where's a bin when you need one.", "Ugh, geese.", "Nice day.", "Somebody's playing music."],
    panic: ["GRAB THE KIDS!", "Over the bridge!", "Get the dog! Get the dog!", "Not the pond!", "Out the gate!"],
    chased: ["IT'S BY THE POND!", "IT'S FASTER THAN THE DOG!", "WHY IS IT CHASING ME?!"],
    firstSight: ["Is that a pool noodle?", "Look at the size of that thing.", "The dog sees something."],
    escaped: ["Behind the gazebo. Shh.", "I think it went back toward the pond.", "Keep the dog quiet."],
    relief: ["I'm walking the dog inside from now on.", "So much for a nice day out."],
  },
  pool: {
    mutter: ["Ow, hot, hot.", "Where's my towel...", "Water in my ear.", "Five more minutes.", "Chlorine's strong today.", "Ugh, my phone's wet."],
    panic: ["GET OUT OF THE POOL!", "OVER THE FENCE!", "Leave your stuff!", "Into the changing rooms!", "DON'T RUN, IT'S SLIPPERY— RUN ANYWAY!"],
    chased: ["IT'S ON THE DECK!", "IT'S COMING ROUND THE POOL!", "I SLIPPED! I SLIPPED!"],
    firstSight: ["Is that an inflatable?", "Somebody's pool toy is moving.", "Lifeguard? LIFEGUARD?"],
    escaped: ["I'm in the deep end. It can't swim. Right?", "Hide in the changing room.", "Stay under the umbrella."],
    relief: ["Lifeguard slept through that.", "I'm never complaining about the water temperature again."],
  },
  office: {
    mutter: ["Reply all. Why.", "Where's my badge...", "Coffee. Need coffee.", "Who booked this room?", "Printer jam. Again.", "Five more emails.", "Why is it freezing in here?"],
    panic: ["Pull the fire alarm!", "Into the meeting room! Lock it!", "Under the desks!", "The elevator! No— the stairs!", "Somebody call facilities!"],
    chased: ["IT'S IN THE CUBICLES!", "IT'S BY THE PRINTER!", "WHY IS IT CHASING ME, I'M AN INTERN!"],
    escaped: ["I'm in the supply closet. Don't open it.", "Under my desk. This is fine.", "Lock the conference room."],
    relief: ["I'm putting this in the incident report.", "That's it. I'm working from home forever."],
  },
  checker: {
    mutter: ["Black, white, black...", "Don't step on the lines.", "This floor's making me dizzy.", "Weird place."],
    panic: ["OFF THE BOARD!", "Get behind the rook!", "Edges! Go to the edges!"],
    chased: ["IT'S CUTTING ACROSS!", "IT'S ON MY SQUARE!"],
    escaped: ["Behind the big piece. Stay there.", "It went round the queen."],
    relief: ["Checkmate. Not today.", "I hate this place."],
  },
  crew: {
    mutter: ["Copy that.", "Base, say again?", "Nice and slow.", "Visor's fogging.", "Long walk back.", "Check, check.", "Sample bag's full."],
    panic: ["Base! BASE!", "Back to the hab!", "Get to the airlock!", "Get in the rover!", "I can't run in this suit!"],
    escaped: ["Base, I'm hiding behind the lander.", "Holding position. Holding.", "It went past the dome."],
    relief: ["Base... we're okay. I think.", "Suit's intact. I checked twice."],
  },
  station: {
    mutter: ["Where's my tablet...", "Cold coffee again.", "Beep. Beep. Shut up.", "Filter needs changing.", "Three more days.", "Who left this floating?"],
    panic: ["SEAL THE MODULE!", "Get to the pod!", "Lock the hatch!", "Wake everyone up!", "Don't open that door!"],
    chased: ["IT'S IN THE CORRIDOR!", "IT'S BY THE AIRLOCK!", "HATCH! HATCH!"],
    escaped: ["I'm in the storage module. Don't come in.", "Hatch sealed. I think.", "Holding in the lab."],
    relief: ["I'm requesting a transfer.", "Someone log this. Not me."],
  },
  bunker: {
    mutter: ["Six hours left.", "Clipboard. Clipboard...", "Freezing down here.", "These red lights...", "Check. Check. Done.", "Who's on radio?"],
    panic: ["LOCK IT DOWN!", "Seal the corridor!", "Get to the armory!", "Radio topside!", "CODE RED!"],
    chased: ["IT'S IN THE CORRIDOR!", "IT'S PAST THE DOORS!", "CONTACT! CONTACT!"],
    escaped: ["In the storeroom. Door's shut.", "Holding at the bunks.", "It went toward the generator."],
    relief: ["Somebody write this up.", "I want a transfer topside."],
  },
  club: {
    mutter: ["Woo!", "Where'd everyone go?", "Somebody spilled on me.", "THIS SONG!", "My ears are ringing.", "Who keeps stepping on me?"],
    panic: ["CUT THE MUSIC!", "FIRE EXIT! FIRE EXIT!", "Behind the bar!", "OUT! EVERYONE OUT!", "Is this part of the show?!#show"],
    chased: ["IT'S ON THE DANCE FLOOR!", "IT'S BY THE BAR!", "MOVE! MOVE! IT'S BEHIND ME!"],
    escaped: ["Behind the bar. Stay down.", "In the bathroom. Locked.", "It's still on the dance floor."],
    relief: ["I'm sober now. Very sober.", "Best night ever. Worst night ever."],
  },
};
for (const [k, v] of Object.entries(MAPL_MORE)) for (const [c, arr] of Object.entries(v)) (MAPL[k][c] = MAPL[k][c] || []).push(...arr);


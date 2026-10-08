/* NPC dialogue: plain speech, distinct personalities, and short reactions under pressure.
   #tags and placeholders are consumed by 25-dialogue.js. Map lines never assert an untracked route or location.
   Swearing has clean alternatives. Recognition of airstrike targets is gated by observed events in 38c-airstrikes.js. */

const LINES = {
  "airTargetSnake": [
    "Wait, they're trying to hit the snake.",
    "They're after that fucking thing!",
    "It's the snake. That's what they're shooting at.",
    "Get away from it! They're aiming at it!",
    "They're trying to kill it with us still here!",
    "Those bombs keep landing where the snake is.",
    "They want that thing dead. They don't care who's near it.",
    "We're going to get hit standing near that thing.",
    "Get that fucking snake away from us!",
    "Don't bring it over here!",
    "We need to get away from the snake. Now.",
    "Look where they're firing. It's following the snake.",
    "They're trying to blow it up!",
    "So they just bomb us along with it?!",
    "How the fuck do we get away from both?",
    "They're going to kill us trying to kill that thing!",
    "They're firing where it's going!",
    "They know we're near it. They're shooting anyway.",
    "It's after us, and the planes are after it. Fuck.",
    "Why are they shooting while we're still here?",
    "They're going to hit us before they hit it.",
    "Stay away from that thing!",
    "I think they're trying to hit the snake.",
    "The bombs. Look where they're landing.",
    "They're following it with the plane!",
    "It's that thing they want. We're in the fucking way.",
    "They can't hit it without hitting us?",
    "They're not even waiting for us to get clear."
  ],
  "airCivilianRisk": [
    "They're trying to fucking kill us!",
    "WE'RE STILL DOWN HERE!",
    "They don't give a fuck about us!",
    "Stop! There's people here!",
    "What the fuck are they doing?!",
    "They know we're here. They have to.",
    "They're going to kill someone down here!",
    "Where the fuck are we supposed to go?!",
    "They're shooting with us still here!",
    "Are they fucking serious?!",
    "They're not waiting for us to leave.",
    "Can't they see us?!",
    "We're people, for fuck's sake!",
    "STOP FUCKING SHOOTING!",
    "They don't care who they hit!",
    "Please, just stop!",
    "How are we supposed to get out of here?",
    "They're going to fucking kill me!",
    "I thought they were here to help!",
    "Don't wait for them. They're not stopping.",
    "They're bombing this whole place!",
    "What did we do?!",
    "We're trying to get out!",
    "Someone tell them we're here!",
    "They can see us running, can't they?",
    "Fuck this. I'm getting out.",
    "They're still firing!",
    "Can't they give us a fucking minute?",
    "There's people everywhere!",
    "We're not all out yet!",
    "They haven't stopped. They can see us and they haven't stopped.",
    "Get us out of here!",
    "Do they think nobody's down here?",
    "We can't stay here and wait for them to notice!",
    "They nearly hit me and they're still going!",
    "We're going to die out here!",
    "Don't they care?",
    "They can't just do this!",
    "They're bombing people!"
  ],
  "jetNear": [
    "Jesus, that's loud.",
    "Is that a jet?",
    "What the hell was that?",
    "That sounded right over us.",
    "You hear that plane?",
    "That's a jet, isn't it?",
    "Why's it so loud?",
    "What's going on?",
    "Holy shit, that plane.",
    "What's it doing here?",
    "Is that the military?",
    "That's right fucking overhead!",
    "Fuck, that engine's loud.",
    "Where's that jet going?",
    "What are they doing up there?",
    "Is that a military jet?"
  ],
  "jetFar": [
    "You hear a plane?",
    "Sounds like a jet.",
    "Is that a plane out there?",
    "What's that rumbling?",
    "I think that's a jet.",
    "You hear that engine?",
    "Is that a military plane?",
    "What's a jet doing out here?",
    "That plane's loud as fuck.",
    "You think that's the military?",
    "Where's that noise coming from?",
    "What's going on up there?"
  ],
  "blastClose": [
    "OH SHIT!",
    "That was right here!",
    "Fuck, that was close.",
    "That almost hit me!",
    "I felt that one!",
    "Jesus Christ!",
    "Get back! Get back!",
    "I'm okay. I'm okay.",
    "FUCK! That nearly hit me!",
    "Oh my god, that was right there!",
    "I almost fucking died!",
    "What the FUCK!",
    "Not here! Please!",
    "I was right fucking there!",
    "How am I still alive?",
    "Don't stand there!",
    "Fuck, keep going!",
    "I thought that hit me!",
    "That was too fucking close!",
    "Get away from there!",
    "Oh god. Oh fuck.",
    "I'm still here.",
    "Please don't let the next one hit me.",
    "I can't do this!",
    "That scared the shit out of me!",
    "Fuck, that was loud!",
    "Where do I go?!",
    "I need to get out. Now."
  ],
  "blastNear": [
    "What the fuck just blew up?",
    "That wasn't far from here.",
    "We need to leave.",
    "Shit, that was close.",
    "Did something just explode?",
    "Where did that hit?",
    "Don't go that way!",
    "What the hell's happening?",
    "Are those fucking bombs?",
    "What just happened?!",
    "Oh god, that's close.",
    "That was a bomb, wasn't it?",
    "Is this really happening?",
    "We can't stay here!",
    "Fuck, which way do we go?",
    "Where are we supposed to go?",
    "How close was that?",
    "Get away from there! Come on!",
    "Why's this happening?!",
    "That sounded near us.",
    "I don't want to be here!",
    "Someone's going to get killed!",
    "Don't just stand there!",
    "No, that's too close."
  ],
  "blastFar": [
    "Did you hear that?",
    "Was that an explosion?",
    "Something blew up out there.",
    "That sounded pretty far away.",
    "What was that bang?",
    "I hope nobody was over there.",
    "You heard that too, right?",
    "I don't like that.",
    "What the fuck was that noise?",
    "Please tell me that wasn't a bomb.",
    "That was an explosion, right?",
    "Was that somewhere near here?",
    "How far off was that?",
    "I heard something blow up.",
    "What's happening over there?",
    "That didn't sound good.",
    "Should we leave?",
    "That sounded big.",
    "Is somebody bombing something?",
    "I don't want to wait around and find out."
  ],
  "strafeClose": [
    "OH FUCK!",
    "GET DOWN!",
    "Someone's shooting!",
    "That almost hit me!",
    "Move! Move!",
    "Shit, get out of here!",
    "What the fuck?!",
    "Don't stop!",
    "THEY'RE FUCKING SHOOTING!",
    "Fuck! Fuck! Move!",
    "They almost fucking shot me!",
    "Stop shooting! Stop!",
    "Get the fuck down!",
    "They're shooting over here!",
    "Don't stay here!",
    "Those are bullets!",
    "Get out of the way!",
    "I don't want to get shot!",
    "That went right fucking past me!",
    "Please, not me!"
  ],
  "strafeFar": [
    "Is that gunfire?",
    "What's that rattling?",
    "That sounded like shooting.",
    "You hear those shots?",
    "Where's that coming from?",
    "We should get out of here.",
    "Was that the plane?",
    "What the hell is going on?",
    "That's shooting, isn't it?",
    "Who the fuck is shooting?",
    "Are those shots?",
    "Sounds like a machine gun.",
    "Is the plane shooting?",
    "What are they shooting at?",
    "I hear gunfire. We need to go.",
    "Please tell me that's something else."
  ],
  "firstSight": {
    "0": [
      "What's that?",
      "Is that a snake?",
      "Hey, look at that.",
      "Is that thing real?",
      "Wait, it's moving.",
      "That's a fucking snake.",
      "How big is that thing?",
      "Don't go near it.",
      "Did somebody let that loose?",
      "There's a snake over there.",
      "I thought that was a hose.",
      "What is that doing here?"
    ],
    "1": [
      "Oh, shit.",
      "Back up.",
      "Don't get any closer.#stayStill",
      "That's way too big.",
      "Just give it some room.#stayStill",
      "Is it coming this way?",
      "I don't like how close that is.",
      "Someone call animal control.#animalControl",
      "Oh, fuck that.",
      "Keep away from it."
    ],
    "2": [
      "SNAKE!",
      "GET BACK!",
      "WHAT THE FUCK IS THAT?!",
      "It's coming over here!",
      "There's a fucking snake!",
      "Don't go near that thing!"
    ],
    "3": [
      "OH SHIT!",
      "BACK UP!",
      "NO!",
      "MOVE!",
      "Fuck!"
    ]
  },
  "bloodySnake": [
    "Is that blood on it?",
    "It's covered in blood.",
    "Oh god, where'd all that come from?",
    "Has it hurt somebody?",
    "Don't get near it.",
    "There's blood all over that thing.",
    "Is that someone's blood?",
    "Jesus Christ.",
    "What the fuck happened?",
    "I think I'm going to be sick."
  ],
  "witnessHuman": {
    "1": [
      "Oh my god.",
      "Did that just happen?",
      "They were right there.",
      "No. No, no.",
      "It just took them.",
      "What the fuck?",
      "I saw that.",
      "I don't believe this."
    ],
    "2": [
      "IT ATE THEM!",
      "OH MY GOD!",
      "It just killed someone!",
      "Jesus fucking Christ!",
      "GET AWAY FROM IT!",
      "NO!",
      "It swallowed them!",
      "Somebody help!"
    ],
    "3": [
      "NO!",
      "OH GOD!",
      "FUCK!",
      "RUN!",
      "Please!",
      "MOVE!"
    ]
  },
  "witnessAnimal": [
    "It just ate the {a}!",
    "Oh my god, that poor thing.",
    "Get away from it!",
    "What the fuck?!",
    "Don't let it near anything else!",
    "It swallowed that whole.",
    "Did you see what it just did?",
    "It ate it.",
    "We need to leave.",
    "That's not safe to be near."
  ],
  "multiDeath": {
    "1": [
      "It got somebody else.",
      "It hasn't stopped.",
      "Oh god, not again.",
      "How many people has it got?",
      "We need to get people away from it.",
      "I can't watch this."
    ],
    "2": [
      "IT'S KILLING PEOPLE!",
      "GET EVERYONE OUT!",
      "Don't let it near you!",
      "SOMEONE HELP THEM!",
      "Fuck, it got another one!",
      "KEEP RUNNING!"
    ],
    "3": [
      "GO!",
      "MOVE!",
      "NO, NO!",
      "RUN!",
      "PLEASE!"
    ]
  },
  "bloodOnMe": [
    "There's blood on me!",
    "Oh god, it's warm.",
    "Is this blood?",
    "Get it off me!",
    "It's all over me!",
    "I'm going to throw up.",
    "Oh, fuck.",
    "Is any of this mine?",
    "I need to wipe this off.",
    "Whose blood is this?",
    "Don't touch me. I'm covered in it.",
    "Oh my god, my clothes."
  ],
  "bloodNearby": [
    "Is that blood?",
    "What happened here?#whatHappened",
    "Is somebody hurt?#whatHappened",
    "There's a lot of it.",
    "Don't step in that.",
    "We should go.",
    "Something happened here.",
    "I don't want to get any closer.",
    "That looks fresh.",
    "Where did all this come from?",
    "Should we call someone?",
    "Oh, shit."
  ],
  "chased": {
    "1": [
      "Is it following me?",
      "Don't look back.",
      "Keep going.",
      "I need to get away from it.",
      "Please leave me alone."
    ],
    "2": [
      "GET AWAY FROM ME!",
      "HELP ME!",
      "It's right behind me!",
      "Leave me alone!",
      "Get the fuck away!",
      "I can't get away from it!",
      "IT'S TOO FAST!",
      "Please, not me!",
      "Someone help!",
      "Keep moving!",
      "Don't let it get me!",
      "Fuck, it's coming!",
      "I don't want to die!",
      "Get out of my way!"
    ],
    "3": [
      "NO, NO!",
      "HELP!",
      "PLEASE!",
      "FUCK!",
      "MOVE!",
      "GET AWAY!",
      "OH GOD!",
      "GO!"
    ]
  },
  "crowd": {
    "0": [
      "Why's everyone running?#whatFrom",
      "What's happening?#whatFrom",
      "What are they running from?#whatFrom",
      "What's going on?#whatFrom"
    ],
    "1": [
      "Wait, what's wrong?#whatFrom",
      "What are we running from?#whatFrom",
      "Where is it?#whereIs",
      "Wait for me!",
      "What did you see?#whatFrom",
      "Which way are we going?"
    ],
    "2": [
      "WHAT'S HAPPENING?!#whatFrom",
      "WAIT!",
      "WHERE IS IT?!#whereIs",
      "Don't push!",
      "Keep moving!",
      "WHICH WAY?!"
    ],
    "3": [
      "MOVE!",
      "GO!",
      "WAIT FOR ME!",
      "OUT OF THE WAY!"
    ]
  },
  "escaped": [
    "I think I lost it.#gone",
    "Is it still coming?#gone",
    "Keep going for a bit.",
    "Fuck, I need a breath.",
    "I can't keep running like that.",
    "I need to sit down.",
    "I'm shaking.",
    "Don't go back yet.",
    "I think we're away from it.#gone",
    "Oh, thank god.",
    "I thought it had me.",
    "Just give me a second."
  ],
  "relief": [
    "It went past.#gone",
    "Oh, thank god.",
    "Keep away from it.",
    "That was close.",
    "I thought it was coming for me.",
    "I'm okay.",
    "Fuck, my heart's racing.",
    "Don't go near it again.",
    "Just let it go.#gone",
    "I need a minute.",
    "Jesus.",
    "I'm not staying here."
  ],
  "stunned": [
    "It slowed down!",
    "Go while it's stopped!",
    "Now, get away!",
    "Did that hurt it?",
    "Keep moving!",
    "Don't wait for it!",
    "It's not moving right.",
    "This is our chance. Go!",
    "Get away before it starts again!",
    "Leave it alone!",
    "Don't go back toward it."
  ],
  "deaf": [
    "I can't hear anything!",
    "My ears won't stop ringing.",
    "What did you say?",
    "Speak up!",
    "Everything sounds muffled.",
    "My ears hurt.",
    "I can't hear you!"
  ],
  "hissed": [
    "Fuck, that noise!",
    "It hissed at me!",
    "Get back from it!",
    "Jesus Christ!",
    "Don't go near it.",
    "What the hell was that?"
  ],
  "crash": [
    "What was that?",
    "Did something break?",
    "You hear that crash?",
    "Hello?",
    "What's going on over there?",
    "Maybe something fell.#nothing",
    "That was loud.",
    "Should we go check?",
    "I don't like that sound."
  ],
  "panic": {
    "0": [
      "Something's wrong.",
      "What's going on?",
      "Wait a second."
    ],
    "1": [
      "We should leave.",
      "Stay close.",
      "Which way do we go?",
      "I don't want to stay here.",
      "Keep moving.",
      "Someone call for help.#police",
      "Don't leave me here.",
      "I'm scared.",
      "I can't think.",
      "Just give me a second.",
      "Stay with me.",
      "Where's everyone going?",
      "I need to get out.",
      "I can't stop shaking.",
      "There has to be somewhere we can go.",
      "We need somewhere to hide.#hide",
      "I don't know what to do.",
      "Come on, please."
    ],
    "2": [
      "MOVE!",
      "KEEP GOING!",
      "Don't stop here!",
      "WHICH WAY?!",
      "Get back!",
      "Leave me alone!",
      "Out of the way!",
      "RUN!",
      "We're going to die!",
      "SOMEBODY HELP!",
      "Stay with me!",
      "Don't leave me!",
      "Where do we go?!",
      "I can't do this!",
      "Get away from there!",
      "Please, keep moving!",
      "HELP!",
      "Oh shit, move!",
      "I don't want to die!",
      "Fuck this, run!",
      "Someone help us!",
      "Don't just stand there!",
      "Come on!",
      "Keep going, please!"
    ],
    "3": [
      "GO!",
      "RUN!",
      "MOVE!",
      "OH SHIT!",
      "HELP!",
      "NO!",
      "PLEASE!",
      "FUCK!",
      "DON'T!",
      "WAIT!",
      "OH GOD!",
      "Get away!",
      "Keep going!",
      "Not me!",
      "Come on!"
    ]
  },
  "wallSmash": {
    "1": [
      "It broke right through that.",
      "That didn't even stop it.",
      "Get away from the wall."
    ],
    "2": [
      "IT BROKE THROUGH!",
      "The wall didn't stop it!",
      "What the fuck, it went through!",
      "GET AWAY FROM THERE!"
    ],
    "3": [
      "IT'S THROUGH!",
      "MOVE!",
      "RUN!"
    ]
  },
  "heard": {
    "0": [
      "Did you hear something?",
      "What's that noise?",
      "Is someone there?",
      "Something's moving.",
      "Hello?",
      "You hear that too?",
      "What was that?"
    ],
    "1": [
      "I can hear something.",
      "That sounds close.",
      "Where's that coming from?",
      "Shh. Listen.",
      "Is somebody there?",
      "I don't know what that is.",
      "Keep quiet a second.",
      "Something's moving near us.",
      "I can't tell where it is."
    ],
    "2": [
      "WHAT IS THAT?!",
      "I CAN HEAR SOMETHING!",
      "WHERE IS IT?!",
      "Which way do I go?!",
      "Who's there?!",
      "Quiet! I need to hear!"
    ],
    "3": [
      "WHERE?!",
      "GET AWAY!",
      "NO!",
      "HELP!",
      "WHICH WAY?!"
    ]
  },
  "heardKill": {
    "1": [
      "Did somebody scream?",
      "What was that sound?",
      "Is someone hurt?",
      "Hello? Are you okay?",
      "What happened over there?"
    ],
    "2": [
      "WHO SCREAMED?!",
      "IS SOMEBODY HURT?!",
      "What the fuck was that noise?!",
      "SOMEBODY ANSWER ME!",
      "Are you okay?!"
    ],
    "3": [
      "OH GOD!",
      "WHAT WAS THAT?!",
      "GO!",
      "HELP!"
    ]
  },
  "touched": {
    "1": [
      "Something touched my leg.",
      "What just brushed against me?",
      "There's something next to me."
    ],
    "2": [
      "SOMETHING TOUCHED ME!",
      "It's right here!",
      "Get away from me!",
      "What the fuck touched me?!",
      "Something went against my leg!"
    ],
    "3": [
      "GET OFF!",
      "NO!",
      "FUCK!",
      "HELP!"
    ]
  },
  "convoBreak": [
    "Wait, what's wrong?",
    "What happened?",
    "Where are you going?",
    "What's going on?",
    "Hold on.",
    "What is it?",
    "Hey, wait."
  ],
  "jokeReact": [
    "Not now.",
    "How can you joke right now?",
    "Just keep moving.",
    "Seriously?",
    "Please stop.",
    "I can't do this right now.",
    "Shut up.",
    "Yeah. Just go."
  ],
  "spit": [
    "Fuck, it's in my mouth!",
    "Get it out!",
    "I got blood in my mouth!",
    "Oh god, I swallowed some.",
    "I need water.",
    "I'm going to be sick."
  ],
  "spitClean": [
    "It's in my mouth!",
    "I got blood in my mouth!",
    "I need to rinse my mouth out!",
    "Oh god, I swallowed some."
  ],
  "aftertaste": [
    "I can still taste it.",
    "I need some water.",
    "It won't come out.",
    "I think I'm going to throw up.",
    "I need to rinse my mouth.",
    "I can't stop tasting it.",
    "Oh god, that's disgusting."
  ]
};

const THREADS = {
  "whatFrom": [
    "see",
    [
      "Oh shit, I see it!",
      "That's what you're running from?",
      "Oh my god.",
      "Okay, go!",
      "I see it. Keep running!",
      "Fuck, that's huge!"
    ]
  ],
  "whereIs": [
    "see",
    [
      "There it is!",
      "Oh fuck, I see it.",
      "I've got it. Keep away."
    ]
  ],
  "isSnake": [
    "kill",
    [
      "It just killed someone!",
      "Get away from that thing!",
      "Oh my god. Run!"
    ]
  ],
  "stayStill": [
    "near",
    [
      "No, move!",
      "Forget that, run!",
      "It's too close. Get away!"
    ]
  ],
  "gone": [
    "see",
    [
      "It's still here!",
      "No, I can see it!",
      "It's back!",
      "Don't stop. It's still here!"
    ]
  ],
  "nothing": [
    "see",
    [
      "Oh shit, I was wrong.",
      "That's what made the noise.",
      "We need to go. Now.",
      "I see it. Fuck.",
      "Get away from that thing."
    ]
  ],
  "weird": [
    "see",
    [
      "I knew something was wrong!",
      "That's what it was.",
      "Fuck, I knew it.",
      "We should have left."
    ]
  ],
  "gotThis": [
    "near",
    [
      "No, back up!",
      "That's too close!",
      "I can't do this. Run!",
      "Fuck, get away!"
    ]
  ],
  "animalControl": [
    "kill",
    [
      "Call an ambulance too!",
      "It just killed somebody! Get help!"
    ]
  ],
  "police": [
    "kill",
    [
      "Tell them people are dying!",
      "We need help now!"
    ]
  ],
  "whatHappened": [
    "see",
    [
      "Was it that thing?",
      "Oh shit. Was that what did it?",
      "Get away from it!"
    ]
  ],
  "hide": [
    "near",
    [
      "It's too close!",
      "We need to move!"
    ]
  ],
  "calm": [
    "kill",
    [
      "Oh my god, run!",
      "No. Get everyone away!"
    ]
  ],
  "exit": [
    "near",
    [
      "We can't stop here!",
      "Just get away from it!"
    ]
  ],
  "show": [
    "kill",
    [
      "That's real! Get out!",
      "Oh my god, that wasn't an act!"
    ]
  ],
  "drill": [
    "kill",
    [
      "This is real! Run!",
      "Someone's dead! Get help!"
    ]
  ]
};

const ANSWERS = {
  "whatFrom": [
    "The snake!",
    "There's a huge fucking snake!",
    "Get away from the snake!",
    "It's a snake. Keep moving!",
    "There's a snake here!",
    "That thing!",
    "It's a snake. A big one."
  ],
  "whereIs": [
    "I saw it a second ago!",
    "I lost sight of it!",
    "I don't know where it is now!",
    "Just keep moving!"
  ],
  "isSnake": [
    "Yes! Keep away!",
    "It looks like one. Don't go near it.",
    "Yeah, a huge one.",
    "I think so. Stay back."
  ],
  "whatHappened": [
    "There's a snake here. Stay back.",
    "I saw a huge snake.",
    "I don't know. Keep away from it.",
    "We need to leave."
  ],
  "exit": [
    "I don't know!",
    "Help me find it!",
    "I'm looking for it too!",
    "I don't know this place!"
  ]
};

const TRAIT_LINES = {
  "funny": {
    "firstSight": {
      "0": [
        "Please tell me that's fake.",
        "Somebody tell me that's a hose.",
        "Yeah, I'm not petting that.",
        "I was fine not seeing that.",
        "That's bigger than I was expecting."
      ],
      "1": [
        "Okay, that's close enough.",
        "I don't find this funny anymore.",
        "Right. Time to leave."
      ]
    },
    "panic": {
      "1": [
        "I picked a great day to come out.",
        "Really wish I'd stayed home.",
        "Well, I'm awake now.",
        "I'm going to pretend I'm handling this.",
        "I wasn't planning on running today.",
        "Yeah, I hate this."
      ],
      "2": [
        "Okay, stop, I'm actually scared.",
        "I can't joke about this.",
        "Just run.",
        "This isn't funny anymore."
      ]
    },
    "witnessHuman": {
      "1": [
        "Oh god. No.",
        "I didn't think it would do that.",
        "Fuck. That really happened."
      ]
    },
    "relief": [
      "I need a very boring day tomorrow.",
      "I'm not doing that again.",
      "I'm going home and sitting down.",
      "That's enough outside for me.",
      "I might just stay home tomorrow."
    ],
    "escaped": [
      "I never want to run again.",
      "Please let the walk home be boring.",
      "I need a chair."
    ]
  },
  "nervous": {
    "firstSight": {
      "0": [
        "Is that thing real?",
        "Please don't go near it.",
        "I don't like this."
      ],
      "1": [
        "It's too close.",
        "Can we just leave?"
      ]
    },
    "panic": {
      "1": [
        "Don't leave me here.",
        "I can't think.",
        "Tell me where to go.",
        "Please stay with me."
      ],
      "2": [
        "I CAN'T DO THIS!",
        "PLEASE HELP!",
        "Don't let it get me!"
      ]
    },
    "relief": [
      "My hands won't stop shaking.",
      "I'm okay. I think.",
      "I need to sit down."
    ]
  },
  "jumpy": {
    "firstSight": {
      "0": [
        "Jesus! What is that?!",
        "Fuck, that scared me!",
        "Oh! What is that?!"
      ]
    },
    "panic": {
      "1": [
        "Oh god, don't come near me!",
        "I thought something touched me!"
      ],
      "2": [
        "GET AWAY!",
        "DON'T TOUCH ME!"
      ]
    },
    "crash": [
      "Jesus, what was that?!",
      "Fuck! Who's there?",
      "What was that noise?!"
    ]
  },
  "calm": {
    "firstSight": {
      "0": [
        "Give it some room.#stayStill",
        "Stay back from it.#calm",
        "Don't go any closer."
      ],
      "1": [
        "Back away. Slowly.#stayStill"
      ]
    },
    "panic": {
      "1": [
        "Stay with me.",
        "Keep moving.",
        "Take a breath. Come on.",
        "We'll find a way out.",
        "Just keep going."
      ],
      "2": [
        "Go. Right now.",
        "Don't stop for anything."
      ]
    },
    "relief": [
      "Take a second.",
      "Is everyone okay?",
      "We should keep going."
    ]
  },
  "rude": {
    "firstSight": {
      "0": [
        "Who the fuck let that out?",
        "What is that doing here?",
        "I'm not going near that."
      ]
    },
    "panic": {
      "1": [
        "Get out of my way!",
        "Fucking move!",
        "Don't block me!",
        "Let me through!"
      ],
      "2": [
        "MOVE!",
        "GET OUT OF MY WAY!",
        "LET ME PAST!"
      ]
    },
    "crowd": {
      "1": [
        "Move, for fuck's sake!",
        "Stop blocking me!"
      ]
    },
    "relief": [
      "I'm getting the fuck out.",
      "I'm done. I'm leaving."
    ]
  },
  "curious": {
    "firstSight": {
      "0": [
        "Is that actually a snake?",
        "Look how big it is.",
        "I've never seen one that big."
      ]
    },
    "panic": {
      "1": [
        "That's close enough.",
        "I shouldn't have gone near it."
      ]
    }
  },
  "distracted": {
    "firstSight": {
      "0": [
        "Huh? Oh, shit.",
        "Wait, what's that?"
      ]
    },
    "crowd": {
      "1": [
        "Wait, what happened?#whatFrom",
        "Why are you running?#whatFrom"
      ]
    }
  },
  "brave": {
    "firstSight": {
      "0": [
        "Stay back. I'll watch it.",
        "I think I can keep it away.#gotThis"
      ]
    },
    "panic": {
      "1": [
        "Stay with me!",
        "Come on, keep moving!"
      ]
    },
    "witnessHuman": {
      "2": [
        "GET AWAY FROM THEM!",
        "HEY! OVER HERE!"
      ]
    }
  },
  "quiet": {
    "firstSight": [
      "Oh, shit.",
      "Look.",
      "Stay back."
    ],
    "panic": {
      "1": [
        "Keep going.",
        "No.",
        "Move."
      ],
      "2": [
        "Go!",
        "Run!"
      ]
    },
    "relief": [
      "I'm okay.",
      "Give me a second."
    ]
  },
  "talkative": {
    "firstSight": {
      "0": [
        "Hey, look. Is that actually a snake?",
        "Are you seeing how big that is?",
        "I've seen big snakes, but nothing like that."
      ]
    },
    "panic": {
      "1": [
        "Where are we going? Does anyone know?",
        "I need to call somebody. I don't know who.",
        "Tell me what to do. I can't think."
      ],
      "2": [
        "WHAT DO WE DO?!",
        "I DON'T WANT TO DIE HERE!"
      ]
    },
    "relief": [
      "I thought it was going to get me. I really did.",
      "I don't know how I'm going to explain this."
    ]
  },
  "confident": {
    "firstSight": {
      "0": [
        "Give it room. It'll move on.#gotThis",
        "Stay back. I'll handle it.#gotThis",
        "Just let it pass.#gotThis",
        "I've been around snakes before.#gotThis"
      ]
    },
    "panic": {
      "1": [
        "Stay together!",
        "Keep up with me!",
        "Don't stop!"
      ],
      "2": [
        "COME ON!",
        "STAY WITH ME!"
      ]
    },
    "witnessHuman": {
      "1": [
        "HEY! GET AWAY FROM THEM!"
      ],
      "2": [
        "OVER HERE!"
      ]
    },
    "relief": [
      "Okay. We're still here.",
      "Keep going. We're doing fine.",
      "That was closer than I thought."
    ]
  },
  "pessimist": {
    "firstSight": {
      "0": [
        "This is going to go badly.",
        "We're too close to that thing.",
        "Can we leave already?"
      ]
    },
    "panic": {
      "1": [
        "We're not getting out of this.",
        "It's going to get us.",
        "We should have left earlier.",
        "I knew we shouldn't stay here."
      ],
      "2": [
        "WE'RE GOING TO DIE!",
        "IT'S GOING TO GET US!"
      ]
    },
    "relief": [
      "It could come back.",
      "Don't stop yet.",
      "We're not safe yet."
    ],
    "escaped": [
      "I'm not going back out there.",
      "I don't trust it to stay away."
    ]
  }
};

const RUDE_ANS = [
  "Ask somebody else.",
  "How should I know?",
  "I don't know.",
  "Not a clue.",
  "Go ask them.",
  "I haven't checked."
];

const QUIET_ANS = [
  "Not sure.",
  "Don't know.",
  "No idea.",
  "I haven't checked.",
  "Couldn't tell you.",
  "I'm not sure."
];

const MISHEAR = [
  "What was that?",
  "Sorry?",
  "Didn't catch that.",
  "What did you say?",
  "Say that again?"
];

const NEVERMIND = [
  "Never mind.",
  "I'll tell you later.",
  "Don't worry about it.",
  "It's nothing."
];

const ACKS = [
  "Okay.",
  "Right.",
  "Yeah.",
  "All right.",
  "Got it.",
  "Fair enough."
];

const TALK_ON = [
  "I'll tell you the rest later.",
  "It's a long story.",
  "We can talk about it later."
];

const BACK_RE = [
  "Can we talk about that later?",
  "I can't think about that right now.",
  "Give me a minute.",
  "Let's get out of here first.",
  "I just need a second."
];

const SURVIVE = [
  {
    "ask": [
      "Are you okay?",
      "You alright?",
      "Hey, how are you doing?"
    ],
    "ans": [
      "I'm shaking.",
      "I don't know yet.",
      "I need a minute.",
      "I think so.",
      "Not really."
    ],
    "more": [
      [
        "Take your time.",
        "I'm here."
      ],
      [
        "Thanks.",
        "Just stay with me."
      ]
    ]
  },
  {
    "ask": [
      "Did you see what happened?",
      "Were you looking when it happened?"
    ],
    "ans": [
      "Yeah. I wish I hadn't.",
      "I saw enough.",
      "Some of it.",
      "I couldn't look away."
    ],
    "more": [
      [
        "I keep thinking about it.",
        "I can't get it out of my head."
      ],
      [
        "Me too.",
        "Let's keep moving."
      ]
    ]
  },
  {
    "ask": [
      "Have you seen {dead}?",
      "Do you know where {dead} is?"
    ],
    "ans": [
      "I don't know where they are.",
      "I haven't seen them since it started.",
      "I lost track of them."
    ],
    "more": [
      [
        "I hope they're okay.",
        "We need to find out."
      ],
      [
        "We should ask someone.",
        "Yeah. Once we're somewhere safe."
      ]
    ]
  },
  {
    "ask": [
      "Was that really a snake?",
      "That was a snake, wasn't it?"
    ],
    "ans": [
      "That's what it looked like.",
      "I think so. I've never seen one that big.",
      "I don't know what else it could be."
    ]
  },
  {
    "ask": [
      "Are you hurt?",
      "Did you get injured?"
    ],
    "ans": [
      "I don't think so.",
      "Let me check.",
      "I can't tell yet."
    ],
    "more": [
      [
        "Take a look before we go.",
        "Just check."
      ],
      [
        "Okay.",
        "Give me a second."
      ]
    ]
  },
  {
    "ask": [
      "Is that your blood?",
      "Are you bleeding?"
    ],
    "ans": [
      "I don't know. I need to check.",
      "I don't think it's mine.",
      "I can't tell."
    ],
    "more": [
      [
        "We need to make sure.",
        "Let me know if you're hurt."
      ],
      [
        "Okay.",
        "I will."
      ]
    ]
  },
  {
    "ask": [
      "What do we do now?",
      "Where do we go from here?"
    ],
    "ans": [
      "Get farther away.",
      "Find somewhere safe and call for help.",
      "Keep going until we're away from this place."
    ],
    "more": [
      [
        "Okay. Stay with me.",
        "Let's go together."
      ],
      [
        "Yeah.",
        "I'm not leaving you."
      ]
    ]
  },
  {
    "ask": [
      "I want to go home.",
      "I just want to get out of here."
    ],
    "ans": [
      "Me too.",
      "We'll go together.",
      "Come on, let's go."
    ]
  },
  {
    "ask": [
      "Who should we call?",
      "Who do we tell about this?"
    ],
    "ans": [
      "Emergency services.",
      "Call for help. Tell them what happened.",
      "Anyone who can get help here."
    ]
  }
];

const MAPL = {
  "field": {
    "mutter": [
      "My feet hurt.",
      "Should've brought water.",
      "Long walk back.",
      "I've got something in my shoe.",
      "Need a break.",
      "Should've worn better shoes.",
      "Hope I didn't leave anything in the car.",
      "I need to sit down soon.",
      "I'm getting hungry.",
      "Where'd I put my phone?",
      "I should head back in a bit.",
      "That's enough walking for me.",
      "Need to clean these shoes."
    ],
    "panic": [
      "There's nothing to hide behind!",
      "We're out in the open!",
      "Which way did we come in?!",
      "Don't leave me out here!",
      "We need to get out of this field!",
      "Keep going!",
      "Where's the road?!",
      "I can't run much longer!",
      "Someone help us!",
      "We can't stay out here!",
      "Come on, hurry!"
    ],
    "chased": [
      "IT'S TOO FAST!",
      "Get it away from me!",
      "There's nowhere to go!",
      "HELP ME!",
      "I can't keep running!",
      "GET AWAY!"
    ],
    "firstSight": [
      "What's that moving out here?",
      "Is that a snake?",
      "Look how big it is."
    ],
    "escaped": [
      "Let's get back to the road.",
      "I need a minute before we keep going.",
      "Don't go back for anything.",
      "I want to leave this field."
    ],
    "relief": [
      "I didn't think I'd get away.",
      "I'm done walking out here.",
      "I need to find the car."
    ]
  },
  "meadow": {
    "mutter": [
      "I could sit here for a while.",
      "I should bring water next time.",
      "Where's my bag?",
      "I need to take my shoes off later.",
      "This is a long walk.",
      "I forgot to bring a snack.",
      "I should come back with a camera.",
      "My feet are sore.",
      "I need to check the time.",
      "I left my water in the car.",
      "My socks keep slipping.",
      "I should head back soon."
    ],
    "panic": [
      "We need to leave!",
      "Which way's the way back?!",
      "Don't go near it!",
      "Keep up!",
      "Don't leave anyone behind!",
      "I want to get out of here!",
      "Where do we go?!",
      "Come on!",
      "Get away from that thing!"
    ],
    "chased": [
      "It's coming after me!",
      "I can't get away!",
      "Don't let it get me!"
    ],
    "firstSight": [
      "Is that a snake out here?",
      "That thing's huge.",
      "Was that moving?",
      "What is that?",
      "Don't go close to it.",
      "I thought that was a log."
    ],
    "escaped": [
      "I want to get back to the car.",
      "Don't go looking for it.",
      "Let's keep going."
    ],
    "relief": [
      "I'm not staying out here.",
      "I want to go home.",
      "I don't want to come back."
    ]
  },
  "town": {
    "mutter": [
      "Where did I park?",
      "I need to get milk.",
      "Where are my keys?",
      "I forgot what else I needed.",
      "I should call when I get home.",
      "I need to check the bus time.",
      "I left the list at home.",
      "I need to get going.",
      "Where's my wallet?",
      "I should've walked the other way.",
      "I forgot my headphones.",
      "I need to stop at the store.",
      "I'll do the rest tomorrow."
    ],
    "panic": [
      "Somebody call 911!",
      "Get off the street!",
      "Find a way out of here!",
      "Someone help!",
      "Don't stand there!",
      "Get away from it!",
      "We need help over here!",
      "Let me past!",
      "Keep going!",
      "Don't get near it!",
      "Someone open a door!"
    ],
    "chased": [
      "HELP ME!",
      "Someone let me in!",
      "Get it away from me!"
    ],
    "firstSight": [
      "What's that doing in town?",
      "Someone's snake got loose?",
      "That thing's huge.",
      "Is that a snake?",
      "What the hell is that doing here?",
      "Don't go near it."
    ],
    "escaped": [
      "We need somewhere safe to call for help.",
      "Don't go back into the street yet.",
      "I want to get out of town."
    ],
    "relief": [
      "I need to call home.",
      "I'm going straight home.",
      "I can't believe that happened.",
      "I need somebody to pick me up.",
      "I'm not walking back alone."
    ]
  },
  "maze": {
    "mutter": [
      "Which way did I turn?",
      "This is taking longer than I thought.",
      "I need to remember the turns.",
      "I should've checked the map.",
      "I want to get out now.",
      "I can't keep track of this.",
      "I hope the others know the way.",
      "I need a minute.",
      "I'm tired of walking.",
      "Why did I agree to this?"
    ],
    "panic": [
      "Which way is out?!",
      "Where's the exit?!",
      "I don't know where to go!",
      "Don't leave me in here!",
      "Keep moving!",
      "We need a way out!",
      "Fuck, which turn?!",
      "Stay with me!",
      "Someone help us get out!"
    ],
    "chased": [
      "I CAN'T FIND THE EXIT!",
      "I need help!",
      "Let me past!"
    ],
    "firstSight": [
      "How did a snake get in here?",
      "What the hell is that?"
    ],
    "escaped": [
      "I still need to find the exit.",
      "Don't stop until we're out.",
      "Let's stay together."
    ],
    "relief": [
      "I'm not coming back in here.",
      "Can somebody help us find the way out?"
    ]
  },
  "farm": {
    "mutter": [
      "Need to finish the chores.",
      "I should check the feed later.",
      "Long day.",
      "I left my gloves somewhere.",
      "Need to wash up.",
      "Still plenty to do.",
      "Where'd I leave that bucket?",
      "I should check the gates.",
      "I need a drink of water.",
      "I forgot to grab my hat.",
      "I'll finish up before I leave."
    ],
    "panic": [
      "Get away from that thing!",
      "Keep it away from the animals!",
      "Someone call for help!",
      "We need to get out of here!",
      "Don't try to grab it!",
      "Leave your stuff!",
      "Hurry up!",
      "Keep going!",
      "Don't go near it!",
      "Come on, get away!"
    ],
    "witnessAnimal": [
      "It ate the {a}!",
      "Get the other animals away!",
      "Oh god, that poor thing."
    ],
    "chased": [
      "Get it away from me!",
      "I can't outrun this thing!",
      "HELP!"
    ],
    "firstSight": [
      "That's not like any snake I've seen here.",
      "How did that get onto the farm?",
      "Look at the size of it.",
      "That thing can't stay here.",
      "Don't go near it."
    ],
    "escaped": [
      "We need to get help before we go back.",
      "I don't want anyone going near it.",
      "Stay away from the farm for now."
    ],
    "relief": [
      "I need to warn the others.",
      "We're going to need help with that thing."
    ]
  },
  "park": {
    "mutter": [
      "I should take a break.",
      "Where's the nearest bin?",
      "Nice to get out for a bit.",
      "I need to check the time.",
      "My feet hurt.",
      "I should head home soon.",
      "I forgot to bring water.",
      "I should sit down.",
      "Need to call when I get back.",
      "Where's my phone?",
      "I've walked enough today."
    ],
    "panic": [
      "Get out of the park!",
      "Keep everyone away from it!",
      "Don't go near that thing!",
      "We need help!",
      "Keep moving!",
      "Is everyone coming?!",
      "Don't get separated!",
      "Let me through!",
      "Somebody call for help!"
    ],
    "chased": [
      "It's coming for me!",
      "Get it away!",
      "Someone help me!"
    ],
    "firstSight": [
      "Is that someone's snake?",
      "That's way too big.",
      "What the hell is that?",
      "There's a snake here.",
      "Don't go near it."
    ],
    "escaped": [
      "Let's leave the park.",
      "We need to warn people coming in.",
      "Don't go back for anything."
    ],
    "relief": [
      "I'm going home.",
      "I need a minute."
    ]
  },
  "pool": {
    "mutter": [
      "Where's my towel?",
      "I should check my bag.",
      "I need some water.",
      "I forgot my sandals.",
      "I should take a break.",
      "Where's my phone?",
      "I need to get changed later.",
      "I should pack up soon.",
      "I left something in the car.",
      "I need to find my shoes.",
      "I should've brought a spare shirt."
    ],
    "panic": [
      "Get away from the pool!",
      "Leave your stuff!",
      "Find the exit!",
      "Keep away from it!",
      "Somebody get help!",
      "Don't stop here!",
      "Just leave the bag!",
      "Come on, hurry!",
      "Where's the way out?!",
      "Let me through!",
      "Be careful!"
    ],
    "chased": [
      "Get it away from me!",
      "I can't run in these!",
      "HELP ME!"
    ],
    "firstSight": [
      "Is that an inflatable?",
      "Wait, is that real?",
      "That's not a pool toy.",
      "Is that a snake?",
      "Someone get the lifeguard.",
      "Don't touch it."
    ],
    "escaped": [
      "Leave the towels. We can get them later.",
      "We need to get farther away.",
      "Don't go back near the pool."
    ],
    "relief": [
      "I just want my clothes and to leave.",
      "I'm done here.",
      "I'm not getting back in."
    ]
  },
  "office": {
    "mutter": [
      "Did I send that email?",
      "I need to finish this before I leave.",
      "Where's my badge?",
      "I need some coffee.",
      "I forgot what I came over for.",
      "I need to call them back.",
      "Who was I supposed to email?",
      "Where'd I leave my notes?",
      "I need a break.",
      "I'll check that in a minute.",
      "I should get back to work.",
      "I left my phone on my desk.",
      "I hope that saved."
    ],
    "panic": [
      "Find the exit!#exit",
      "Leave the laptop!",
      "Everybody needs to get out!",
      "Don't go near it!",
      "Someone call for help!",
      "Leave your stuff!",
      "We need to leave the building!",
      "Come on, hurry!",
      "Don't stop for your bag!",
      "Keep moving!",
      "Let me past!",
      "Is everybody coming?!"
    ],
    "chased": [
      "Get it away from me!",
      "Someone help!",
      "I can't get away from it!"
    ],
    "firstSight": [
      "How did that get in the office?",
      "Is that a snake?",
      "Who let that in here?"
    ],
    "escaped": [
      "We need to tell people not to come in.",
      "Don't go back for your laptop.",
      "Call someone once we're clear."
    ],
    "relief": [
      "I'm going home.",
      "I need to let my family know I'm okay.",
      "I'm not going back in.",
      "I can't work after that.",
      "My stuff can wait."
    ]
  },
  "checker": {
    "mutter": [
      "This floor's hard to look at.",
      "My eyes need a break.",
      "I should've brought my glasses.",
      "Who designed this place?",
      "I need to sit down.",
      "I keep losing track of where I am.",
      "I should head back.",
      "This is a strange place."
    ],
    "panic": [
      "Get away from it!",
      "Keep moving!",
      "Where's the exit?!",
      "Don't stay here!",
      "We need to leave!",
      "Come on!"
    ],
    "chased": [
      "It's coming at me!",
      "GET AWAY!"
    ],
    "firstSight": [
      "Is that part of this place?",
      "Wait, that thing's moving."
    ],
    "escaped": [
      "I don't want to stay here.",
      "Keep going until we're clear."
    ],
    "relief": [
      "I'm done with this place.",
      "I need to leave."
    ]
  },
  "crew": {
    "mutter": [
      "Need to check the time.",
      "I'll check my suit again.",
      "One thing at a time.",
      "I need to mark that down.",
      "Where'd I put the sample bag?",
      "I should check in soon.",
      "Need to keep track of the route back.",
      "I'll check the radio.",
      "I need a short break.",
      "I should take a reading here.",
      "Better check the equipment.",
      "I'll log that when I get back.",
      "Need to keep moving."
    ],
    "panic": [
      "Base, we need help!",
      "We need to get back!",
      "Base, do you read me?!",
      "I can't move fast in this suit!",
      "Keep together!",
      "MAYDAY!",
      "Base, answer me!",
      "We need to get inside!",
      "Stay on the radio!",
      "Help us!",
      "We can't stay out here!"
    ],
    "chased": [
      "It's coming after me!",
      "I can't get away in this suit!"
    ],
    "firstSight": [
      "Base, there's something moving out here.",
      "How is that alive out here?",
      "Is that a snake?",
      "Base, you need to see this."
    ],
    "bloodOnMe": [
      "It's on my visor!",
      "There's blood on my suit!"
    ],
    "escaped": [
      "Base, we need help getting back.",
      "I'm going to keep moving.",
      "Stay on the radio with me."
    ],
    "relief": [
      "Base, I'm still here.",
      "I need to check my suit.",
      "Can you hear me?",
      "I need a minute.",
      "I'm checking for damage."
    ]
  },
  "station": {
    "mutter": [
      "Where's my tablet?",
      "I need to check the log.",
      "I should get something to eat.",
      "Where'd I put my cup?",
      "I need to finish my shift.",
      "I'll check that later.",
      "I need to call home soon.",
      "I forgot what I needed.",
      "I'll get back to it.",
      "I should get some rest.",
      "I need a break."
    ],
    "panic": [
      "Get everyone away from it!",
      "Find somewhere to seal off!",
      "Call the rest of the crew!",
      "We need help in here!",
      "Don't let anyone near it!",
      "Find a way out!",
      "Keep together!",
      "Get away from that thing!",
      "Come on!",
      "Someone answer me!",
      "We're not safe here!"
    ],
    "chased": [
      "IT'S AFTER ME!",
      "Open a hatch!",
      "I can't get away!"
    ],
    "firstSight": [
      "How did that get aboard?",
      "Is that a snake?",
      "Has anyone seen this before?"
    ],
    "escaped": [
      "We need to tell the rest of the crew.",
      "Don't go back until we know where it is.",
      "We need somewhere we can close off."
    ],
    "relief": [
      "Someone needs to call this in.",
      "I'm not going back near it.",
      "I need to sit down.",
      "Let me check for injuries."
    ]
  },
  "bunker": {
    "mutter": [
      "When's the shift change?",
      "I need to check the log.",
      "Where's the clipboard?",
      "I need a break.",
      "I'll check the radio.",
      "I should get something to eat.",
      "I need to finish this.",
      "Where's my pen?",
      "I'll check that in a minute.",
      "I need to call home later.",
      "Still got work to do."
    ],
    "panic": [
      "Call for help!",
      "Keep everyone away from it!",
      "This is real!#drill",
      "We need to get out!",
      "Find somewhere to close off!",
      "Don't let it near you!",
      "Get help down here!",
      "Keep moving!",
      "Don't go back!",
      "Stay together!",
      "Where's the way out?!"
    ],
    "chased": [
      "It's after me!",
      "I need help!",
      "Get it away!"
    ],
    "firstSight": [
      "What the hell is that?",
      "How did that get down here?",
      "Is that a real snake?",
      "Keep away from it."
    ],
    "escaped": [
      "We need to tell people upstairs.",
      "Don't let anyone come down.",
      "We need to get clear before we stop."
    ],
    "relief": [
      "I need a minute.",
      "Somebody call this in."
    ]
  },
  "club": {
    "mutter": [
      "Where's my drink?",
      "I need some water.",
      "My feet hurt.",
      "I should check my phone.",
      "I love this song.",
      "Where'd I leave my jacket?",
      "I need a minute outside.",
      "I should find my friends.",
      "What time is it?",
      "I need to sit down.",
      "I'll stay for one more."
    ],
    "panic": [
      "TURN THE MUSIC OFF!",
      "Get everyone out!",
      "Is that thing real?!#show",
      "Find the exit!",
      "Stop pushing!",
      "Let me through!",
      "There's something in here!",
      "Get away from it!",
      "I can't get through!",
      "Someone help us!",
      "Keep moving!"
    ],
    "chased": [
      "It's after me!",
      "LET ME THROUGH!",
      "GET OUT OF THE WAY!"
    ],
    "firstSight": [
      "Is that a costume?",
      "Is this part of something?#show",
      "Who brought that in here?",
      "Wait, is that real?"
    ],
    "crowd": [
      "What's happening?!#whatFrom",
      "Why's everyone running?!#whatFrom",
      "I can't hear you!"
    ],
    "escaped": [
      "We need to find the others.",
      "Don't go back in.",
      "Someone call for help."
    ],
    "relief": [
      "I just want to go home.",
      "I need to call my ride."
    ],
    "mishear": 0.4
  }
};

const MAP_KEY = { 'Open Field': 'field', Meadow: 'meadow', Town: 'town', Maze: 'maze', Farm: 'farm', Park: 'park', Pool: 'pool', Office: 'office', Checkerboard: 'checker', Moon: 'crew', Mars: 'crew', 'Space Station': 'station', Bunker: 'bunker', Club: 'club' };

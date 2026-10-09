/* Conversational branches: equivalent openers share an answer key.
   Replies and follow-ups must fit every alternative on their branch; no generic joke answers.
   #tags, |tags, time placeholders and environmental flags retain the existing dialogue protocol. */

const TALK = {
  "generic": [
    {
      "id": "phone",
      "q": [
        [
          "say",
          "My phone's about to die.",
          "dead"
        ],
        [
          "say",
          "I forgot to charge my phone.",
          "dead"
        ],
        [
          "yn",
          "Do you have a charger I can borrow?",
          "charger"
        ],
        [
          "yn",
          "You got a phone charger on you?",
          "charger"
        ]
      ],
      "a": {
        "dead": [
          "Mine's nearly dead too.",
          "Put it on low power for now.",
          "You can charge it when we get back."
        ],
        "charger": [
          "I've got one in the car.",
          "Not with me, sorry.",
          "I left mine at home.",
          "Yeah, remind me when we get back."
        ]
      },
      "n": [
        {
          "k": "dead",
          "say": [
            "I need it to get home."
          ],
          "re": [
            "Keep the screen off for a bit.",
            "We can work it out if it dies."
          ]
        },
        {
          "k": "charger",
          "say": [
            "I should start carrying one."
          ],
          "re": [
            "I keep meaning to as well.",
            "They're easy to forget."
          ]
        }
      ],
      "earth": true
    },
    {
      "id": "tired",
      "q": [
        [
          "say",
          "I'm so tired.",
          "tired"
        ],
        [
          "say",
          "I barely slept last night.",
          "tired"
        ],
        [
          "yn",
          "Did you sleep okay?",
          "slept"
        ],
        [
          "yn",
          "You get much sleep last night?",
          "slept"
        ],
        [
          "how",
          "How are you staying awake?",
          "awake"
        ],
        [
          "how",
          "How are you not tired?",
          "awake"
        ]
      ],
      "a": {
        "tired": [
          "You look tired.",
          "Same here.",
          "Try to get an early night."
        ],
        "slept": [
          "Not much. Kept waking up.",
          "Yeah, for once.",
          "A few hours.",
          "I went to bed pretty late."
        ],
        "awake": [
          "Coffee, mostly.",
          "I am tired. I'm just trying to keep moving.",
          "I had a nap earlier.",
          "I actually slept last night."
        ]
      },
      "n": [
        {
          "k": "tired",
          "say": [
            "I'm going straight to bed when I get home."
          ],
          "re": [
            "Probably a good idea.",
            "Don't get stuck on your phone."
          ]
        },
        {
          "k": "slept",
          "say": [
            "I need to sort my sleep out."
          ],
          "re": [
            "Me too.",
            "It's hard once you get into a bad routine."
          ]
        }
      ]
    },
    {
      "id": "time",
      "q": [
        [
          "what",
          "What time is it?",
          "time"
        ],
        [
          "what",
          "You got the time?",
          "time"
        ],
        [
          "yn",
          "Is it {nexthour} yet?",
          "hour"
        ],
        [
          "yn",
          "Have we got to {nexthour} yet?",
          "hour"
        ]
      ],
      "a": {
        "time": [
          "About {time}.",
          "It's {time}.",
          "I haven't got my phone on me.",
          "Not sure. My phone died."
        ],
        "hour": [
          "Not quite.",
          "Nearly.",
          "It's about {time}."
        ]
      },
      "n": [
        {
          "k": "time",
          "say": [
            "I should probably head back soon."
          ],
          "re": [
            "Yeah, let's start heading back.",
            "We can go in a bit."
          ]
        },
        {
          "k": "hour",
          "say": [
            "I lost track of the time."
          ],
          "re": [
            "Me too.",
            "I keep having to check."
          ]
        }
      ]
    },
    {
      "id": "hungry",
      "q": [
        [
          "say",
          "I'm hungry.",
          "hungry"
        ],
        [
          "say",
          "I should've eaten before I left.",
          "hungry"
        ],
        [
          "yn",
          "Are you hungry?",
          "hungry?"
        ],
        [
          "yn",
          "You want food soon?",
          "hungry?"
        ],
        [
          "what",
          "What do you want to eat later?",
          "food"
        ],
        [
          "what",
          "What sounds good for dinner?",
          "food"
        ]
      ],
      "a": {
        "hungry": [
          "We can get food in a bit.",
          "Me too.",
          "I brought a snack if you want some."
        ],
        "hungry?": [
          "Yeah, a little.",
          "Not yet.",
          "I could eat.",
          "I ate before I came."
        ],
        "food": [
          "Maybe pizza.",
          "Burgers, if that's okay.",
          "Something cheap.",
          "I'm not fussy."
        ]
      },
      "n": [
        {
          "k": "hungry",
          "say": [
            "I don't want to spend much."
          ],
          "re": [
            "We can get something cheap.",
            "Same, honestly."
          ]
        },
        {
          "k": "hungry?",
          "say": [
            "Let me know when you want to stop."
          ],
          "re": [
            "Okay.",
            "I will."
          ]
        },
        {
          "k": "food",
          "say": [
            "Let's decide when we're on the way back."
          ],
          "re": [
            "Works for me.",
            "Okay."
          ]
        }
      ],
      "back": [
        "I still need to eat something."
      ],
      "backRe": [
        "We'll get something once we're safe.",
        "Me too. Let's get away from here first."
      ],
      "earth": true
    },
    {
      "id": "weather",
      "out": true,
      "q": [
        [
          "yn",
          "Think it's going to rain?",
          "rain"
        ],
        [
          "yn",
          "Does it look like rain to you?",
          "rain"
        ],
        [
          "say",
          "I hope the weather holds.",
          "outside"
        ],
        [
          "say",
          "I don't want to get caught in the rain.",
          "outside"
        ]
      ],
      "a": {
        "rain": [
          "I haven't checked.",
          "It might.",
          "I'm not sure.",
          "I should have checked before we left."
        ],
        "outside": [
          "Me neither.",
          "We can leave if it starts.",
          "We'll keep an eye on it."
        ]
      },
      "n": [
        {
          "k": "rain",
          "say": [
            "I didn't bring a jacket."
          ],
          "re": [
            "We can head back if it starts.",
            "Neither did I."
          ]
        }
      ]
    },
    {
      "id": "weekend",
      "q": [
        [
          "what",
          "What are you doing this weekend?",
          "plans"
        ],
        [
          "what",
          "Got any plans for the weekend?",
          "plans"
        ],
        [
          "say",
          "I really need a day off.",
          "need"
        ],
        [
          "say",
          "I'm ready for the weekend.",
          "need"
        ]
      ],
      "a": {
        "plans": [
          "Working most of it.",
          "Nothing planned yet.",
          "Seeing my family.",
          "Probably staying home."
        ],
        "need": [
          "Same here.",
          "It's been a long week.",
          "I know how you feel."
        ]
      },
      "n": [
        {
          "k": "plans",
          "say": [
            "We should find a day to get food sometime."
          ],
          "re": [
            "Yeah, text me.",
            "I'll let you know when I'm free."
          ]
        },
        {
          "k": "need",
          "say": [
            "I'm not doing much when I finally get one."
          ],
          "re": [
            "Can't blame you.",
            "You need a rest."
          ]
        }
      ],
      "earth": true
    },
    {
      "id": "weird",
      "q": [
        [
          "say",
          "I feel a bit uneasy {here}.#weird",
          "weird"
        ],
        [
          "say",
          "Something about this place is putting me on edge.#weird",
          "weird"
        ]
      ],
      "a": {
        "weird": [
          "We can go if you want.",
          "I haven't noticed anything.",
          "You okay?|ask"
        ]
      },
      "n": [
        {
          "k": "weird",
          "say": [
            "I can't explain it. I just don't feel right."
          ],
          "re": [
            "We don't have to stay.",
            "Let's head back if you're uncomfortable."
          ]
        }
      ]
    },
    {
      "id": "work",
      "q": [
        [
          "how",
          "How's work been?",
          "work"
        ],
        [
          "how",
          "Work going okay?",
          "work"
        ],
        [
          "yn",
          "You still working at the same place?",
          "still"
        ],
        [
          "yn",
          "Are you still at that job?",
          "still"
        ]
      ],
      "a": {
        "work": [
          "Busy lately.",
          "Same as usual.",
          "I'm thinking about looking for something else.",
          "It's been alright."
        ],
        "still": [
          "Yeah, for now.",
          "Yeah, haven't found anything else yet.",
          "No, I left recently."
        ]
      },
      "n": [
        {
          "k": "work",
          "say": [
            "You getting any time off?"
          ],
          "re": [
            "A little.",
            "Not much at the moment.",
            "I've got some booked soon."
          ]
        },
        {
          "k": "still",
          "say": [
            "Let me know how it goes."
          ],
          "re": [
            "I will.",
            "Thanks."
          ]
        }
      ],
      "earth": true
    }
  ],
  "field": [
    {
      "id": "lost",
      "q": [
        [
          "yn",
          "Have we gone the wrong way?",
          "lost"
        ],
        [
          "yn",
          "Are we lost?",
          "lost"
        ],
        [
          "where",
          "Which way did we come in?",
          "way"
        ],
        [
          "where",
          "Where was the gate?",
          "way"
        ]
      ],
      "a": {
        "lost": [
          "I think we might have.",
          "I don't think so.",
          "Let me check the map."
        ],
        "way": [
          "I think it's back the way we came.",
          "I can't remember.",
          "We should check before we go farther."
        ]
      },
      "n": [
        {
          "k": "lost",
          "say": [
            "Let's stop and work it out."
          ],
          "re": [
            "Okay.",
            "Better than guessing."
          ]
        },
        {
          "k": "way",
          "say": [
            "I should've paid more attention."
          ],
          "re": [
            "Me too.",
            "We'll find it."
          ]
        }
      ],
      "back": [
        "We still need to find the way back."
      ],
      "backRe": [
        "Stay together. We'll find it.",
        "Let's check the map."
      ]
    },
    {
      "id": "deer",
      "q": [
        [
          "yn",
          "Have you seen any deer?",
          "seen"
        ],
        [
          "yn",
          "Any deer out here today?",
          "seen"
        ],
        [
          "say",
          "I saw deer out here last time.",
          "last"
        ],
        [
          "say",
          "There were deer here when I came before.",
          "last"
        ]
      ],
      "a": {
        "seen": [
          "Not so far.",
          "I haven't been looking.",
          "Nothing that I've noticed."
        ],
        "last": [
          "Maybe we'll see some.",
          "We might have to wait a while.",
          "Let's keep quiet then."
        ]
      },
      "n": [
        {
          "k": "seen",
          "say": [
            "I'd like to see some before we go."
          ],
          "re": [
            "Keep an eye on the trees.",
            "Maybe if we're quiet."
          ]
        }
      ]
    },
    {
      "id": "stars",
      "out": true,
      "dark": true,
      "q": [
        [
          "say",
          "You can see a lot more stars out here.",
          "stars"
        ],
        [
          "say",
          "I like being away from the streetlights.",
          "stars"
        ],
        [
          "yn",
          "Is that a planet?",
          "planet"
        ],
        [
          "yn",
          "You know what that bright one is?",
          "planet"
        ]
      ],
      "a": {
        "stars": [
          "It's nice.",
          "Yeah, much easier to see the sky.",
          "I don't get to see this at home."
        ],
        "planet": [
          "Not sure.",
          "Could be a planet.",
          "I can't tell."
        ]
      },
      "n": [
        {
          "k": "stars",
          "say": [
            "We should come out here more."
          ],
          "re": [
            "Yeah, when we've got time.",
            "I'd like that."
          ]
        },
        {
          "k": "planet",
          "say": [
            "I should look it up later."
          ],
          "re": [
            "Let me know what it is.",
            "We could get one of those sky apps."
          ]
        }
      ]
    },
    {
      "id": "fence",
      "q": [
        [
          "yn",
          "Are we allowed to be in this field?",
          "allowed"
        ],
        [
          "yn",
          "Is this open to the public?",
          "allowed"
        ],
        [
          "say",
          "This might be private land.",
          "private"
        ],
        [
          "say",
          "I don't know if we should be out here.",
          "private"
        ]
      ],
      "a": {
        "allowed": [
          "I'm not sure.",
          "I thought so, but we should check.",
          "I didn't see a sign."
        ],
        "private": [
          "We can turn back.",
          "Let's check for a sign.",
          "I don't want to get yelled at either."
        ]
      },
      "n": [
        {
          "k": "allowed",
          "say": [
            "Let's find out before we go farther."
          ],
          "re": [
            "Yeah, okay.",
            "Good idea."
          ]
        }
      ]
    },
    {
      "id": "car",
      "q": [
        [
          "yn",
          "Did you lock the car?",
          "locked"
        ],
        [
          "yn",
          "You locked up, right?",
          "locked"
        ],
        [
          "where",
          "Where did we leave the car?",
          "where"
        ],
        [
          "where",
          "Do you remember where we parked?",
          "where"
        ]
      ],
      "a": {
        "locked": [
          "Yeah, I checked.",
          "I think so.",
          "I'm pretty sure I did."
        ],
        "where": [
          "Back by the road.",
          "Near where we came in.",
          "I think I remember the way."
        ]
      },
      "n": [
        {
          "k": "locked",
          "say": [
            "Can you check the keys when we get back?"
          ],
          "re": [
            "Yeah, remind me.",
            "Sure."
          ]
        },
        {
          "k": "where",
          "say": [
            "You lead the way back then."
          ],
          "re": [
            "Okay.",
            "Let me check the route first."
          ]
        }
      ],
      "back": [
        "We need to get back to the car."
      ],
      "backRe": [
        "Let's work out the way back.",
        "Stay with me."
      ]
    }
  ],
  "meadow": [
    {
      "id": "lake",
      "not": "winter",
      "q": [
        [
          "yn",
          "Are you going in the lake?",
          "in"
        ],
        [
          "yn",
          "You thinking of going for a swim?",
          "in"
        ],
        [
          "say",
          "It's nice by the lake.",
          "nice"
        ],
        [
          "say",
          "I could stay by the water for a bit.",
          "nice"
        ]
      ],
      "a": {
        "in": [
          "Maybe later.",
          "No, I'm staying dry.",
          "I might, if it isn't too cold.",
          "Just putting my feet in."
        ],
        "nice": [
          "Me too.",
          "No rush to go.",
          "We can sit here a while."
        ]
      },
      "n": [
        {
          "k": "in",
          "say": [
            "I want to check how cold it is first."
          ],
          "re": [
            "Go on then.",
            "Let me know."
          ]
        }
      ]
    },
    {
      "id": "bugs",
      "not": "winter",
      "q": [
        [
          "say",
          "Something keeps biting me.",
          "bite"
        ],
        [
          "say",
          "I forgot the bug spray.",
          "bite"
        ],
        [
          "yn",
          "Have you got any bug spray?",
          "spray?"
        ],
        [
          "yn",
          "Can I borrow some bug spray?",
          "spray?"
        ]
      ],
      "a": {
        "bite": [
          "I brought some if you want it.",
          "They get bad near the water.",
          "We should've worn long sleeves."
        ],
        "spray?": [
          "Yeah, in my bag.",
          "Sorry, I forgot mine.",
          "I've only got a little left."
        ]
      },
      "n": [
        {
          "k": "bite",
          "say": [
            "I'm trying not to scratch."
          ],
          "re": [
            "That'll make it worse.",
            "I know, it's hard not to."
          ]
        },
        {
          "k": "spray?",
          "say": [
            "I need to remember it next time."
          ],
          "re": [
            "Write it on the list.",
            "It's easy to forget."
          ]
        }
      ]
    },
    {
      "id": "fire",
      "q": [
        [
          "yn",
          "Should we get more firewood?",
          "wood"
        ],
        [
          "yn",
          "Do we need more wood for later?",
          "wood"
        ],
        [
          "who",
          "Who got the wood last time?",
          "turn"
        ],
        [
          "who",
          "Was it you who got the firewood?",
          "turn"
        ]
      ],
      "a": {
        "wood": [
          "Probably a little more.",
          "I think we've got enough.",
          "We should check the pile."
        ],
        "turn": [
          "I did.",
          "I think it was you.",
          "I can't remember."
        ]
      },
      "n": [
        {
          "k": "wood",
          "say": [
            "Let's check before it gets too late."
          ],
          "re": [
            "Yeah.",
            "I'll come with you."
          ]
        },
        {
          "k": "turn",
          "say": [
            "I'll get it this time."
          ],
          "re": [
            "Thanks.",
            "I'll help you carry it."
          ]
        }
      ]
    },
    {
      "id": "trail",
      "q": [
        [
          "yn",
          "Does this trail loop back?",
          "loop"
        ],
        [
          "yn",
          "Does this bring us back to where we started?",
          "loop"
        ],
        [
          "how",
          "How much farther is the trail?",
          "long"
        ],
        [
          "how",
          "How long do you reckon we've got left?",
          "long"
        ],
        [
          "where",
          "Where does this trail end?",
          "end"
        ],
        [
          "where",
          "Where does this path come out?",
          "end"
        ]
      ],
      "a": {
        "loop": [
          "That's what the map said.",
          "I think so.",
          "We should check."
        ],
        "long": [
          "Maybe another mile.",
          "I'm not sure.",
          "It didn't look too long on the map."
        ],
        "end": [
          "I think it's near the parking lot.",
          "I'm not sure.",
          "Let me check the map."
        ]
      },
      "n": [
        {
          "k": "loop",
          "say": [
            "I don't want to go too far the wrong way."
          ],
          "re": [
            "Me neither.",
            "We'll check at the next sign."
          ]
        },
        {
          "k": "long",
          "say": [
            "I could use a break soon."
          ],
          "re": [
            "We can stop for a bit.",
            "Let me know when you want to stop."
          ]
        }
      ],
      "back": [
        "We need to work out where this trail goes."
      ],
      "backRe": [
        "Let's check the map.",
        "We can look for a sign."
      ]
    },
    {
      "id": "frogs",
      "not": "winter",
      "q": [
        [
          "yn",
          "Are those frogs I can hear?",
          "hear"
        ],
        [
          "yn",
          "Can you hear the frogs?",
          "hear"
        ]
      ],
      "a": {
        "hear": [
          "I think that's what it is.",
          "Yeah, near the water.",
          "I was wondering about that noise too."
        ]
      },
      "n": [
        {
          "k": "hear",
          "say": [
            "They're loud for something so small."
          ],
          "re": [
            "Yeah.",
            "There must be a few of them."
          ]
        }
      ]
    },
    {
      "id": "marsh",
      "q": [
        [
          "who",
          "Who brought the marshmallows?",
          "who"
        ],
        [
          "who",
          "Was it you who packed the marshmallows?",
          "who"
        ],
        [
          "yn",
          "Are there any marshmallows left?",
          "left"
        ],
        [
          "yn",
          "Have we still got marshmallows?",
          "left"
        ]
      ],
      "a": {
        "who": [
          "I brought them.",
          "I thought you did.",
          "I'm not sure anyone did."
        ],
        "left": [
          "A few, I think.",
          "I haven't checked.",
          "Might be some in the bag."
        ]
      },
      "n": [
        {
          "k": "who",
          "say": [
            "Let's check the bags."
          ],
          "re": [
            "I'll check mine.",
            "Okay."
          ]
        },
        {
          "k": "left",
          "say": [
            "I'll have a look later."
          ],
          "re": [
            "Save me one if there are any.",
            "Okay."
          ]
        }
      ]
    }
  ],
  "town": [
    {
      "id": "pizza",
      "q": [
        [
          "when",
          "What time does the pizza place open?",
          "opens"
        ],
        [
          "when",
          "Do you know when they open?",
          "opens"
        ],
        [
          "yn",
          "Is the pizza place open?",
          "open"
        ],
        [
          "yn",
          "Think we could get pizza now?",
          "open"
        ]
      ],
      "a": {
        "opens": [
          "Eleven, I think.",
          "Pretty sure it's eleven.",
          "I can't remember."
        ],
        "open": [
          "It should be open.|open",
          "I think it's open now.|open",
          "I think it's shut right now.|closed",
          "Not sure. We'd have to check.|unknown"
        ]
      },
      "n": [
        {
          "k": "opens",
          "say": [
            "I'll check before we go over."
          ],
          "re": [
            "Yeah, good idea.",
            "Let me know."
          ]
        },
        {
          "k": "open",
          "t": "open",
          "say": [
            "Want to go over?",
            "Should we get some?"
          ],
          "re": [
            "Yeah, I could eat.",
            "Sure. Let's go in a bit.",
            "I'd rather get something else."
          ]
        },
        {
          "k": "open",
          "t": "closed",
          "say": [
            "We'll get something else then.",
            "We can go another time."
          ],
          "re": [
            "Yeah.",
            "Works for me."
          ]
        }
      ],
      "fact": () => { const h = tod % 24; return h >= 11 && h < 22 ? 'open' : 'closed'; },
      "back": [
        "We can talk about getting food once we're clear."
      ],
      "backRe": [
        "Yeah. Let's get away from here first.",
        "We can decide later."
      ]
    },
    {
      "id": "traffic",
      "q": [
        [
          "how",
          "How long did it take you to get here?",
          "long"
        ],
        [
          "how",
          "Did it take long getting here?",
          "long"
        ],
        [
          "how",
          "How did you get here?",
          "how"
        ],
        [
          "how",
          "Did you drive over?",
          "how"
        ],
        [
          "say",
          "Traffic was awful on the way over.",
          "traffic"
        ],
        [
          "say",
          "Took ages getting through town.",
          "traffic"
        ]
      ],
      "a": {
        "long": [
          "About half an hour.",
          "Not too long.",
          "Longer than I expected.",
          "I walked, so about twenty minutes."
        ],
        "how": [
          "I took the bus.",
          "Yeah, drove.",
          "I walked.",
          "Got a ride."
        ],
        "traffic": [
          "It's been bad lately.",
          "You made it, at least.",
          "I'm glad you got here."
        ]
      },
      "n": [
        {
          "k": "long",
          "say": [
            "I should leave earlier next time."
          ],
          "re": [
            "Give yourself a bit more time.",
            "It's hard to judge."
          ]
        },
        {
          "k": "how",
          "say": [
            "I might try that next time."
          ],
          "re": [
            "Whatever's easiest.",
            "Depends where you're coming from."
          ]
        }
      ]
    },
    {
      "id": "store",
      "q": [
        [
          "yn",
          "Is the corner store open?",
          "open"
        ],
        [
          "yn",
          "Can we still get into the store?",
          "open"
        ],
        [
          "what",
          "Do you need anything from the store?",
          "need"
        ],
        [
          "what",
          "Want anything while I'm in there?",
          "need"
        ],
        [
          "when",
          "What time does the store close?",
          "close"
        ],
        [
          "when",
          "Do you know when they shut?",
          "close"
        ]
      ],
      "a": {
        "open": [
          "It should be open.|open",
          "Yeah, I think so.|open",
          "I think it's shut.|closed",
          "I'm not sure.|unknown"
        ],
        "need": [
          "Just a drink.",
          "Some chips, please.",
          "No, I'm okay. Thanks.",
          "Milk, if you don't mind."
        ],
        "close": [
          "Eleven, I think.",
          "I'm pretty sure it's eleven.",
          "I'm not sure."
        ]
      },
      "n": [
        {
          "k": "need",
          "say": [
            "I'll text you when I'm heading over."
          ],
          "re": [
            "Thanks.",
            "Okay."
          ]
        },
        {
          "k": "close",
          "say": [
            "I'll check the hours."
          ],
          "re": [
            "Good idea.",
            "Let me know."
          ]
        }
      ],
      "fact": () => { const h = tod % 24; return h >= 7 && h < 23 ? 'open' : 'closed'; },
      "back": [
        "I'll worry about the shopping later."
      ],
      "backRe": [
        "It can wait.",
        "Yeah, let's just get out of here."
      ]
    },
    {
      "id": "alley",
      "q": [
        [
          "yn",
          "Do you still take that shortcut through the alley?",
          "cut"
        ],
        [
          "yn",
          "You still go through that alley?",
          "cut"
        ],
        [
          "say",
          "I'd rather not go through the alley.",
          "warn"
        ],
        [
          "say",
          "Can we take the longer way?",
          "warn"
        ]
      ],
      "a": {
        "cut": [
          "Sometimes.",
          "Only during the day.",
          "Not lately.",
          "I usually go around."
        ],
        "warn": [
          "Yeah, that's fine.",
          "No problem.",
          "We've got time."
        ]
      },
      "n": [
        {
          "k": "cut",
          "say": [
            "I don't really like it back there."
          ],
          "re": [
            "Then let's go around.",
            "Fair enough."
          ]
        }
      ]
    },
    {
      "id": "rent",
      "q": [
        [
          "yn",
          "Did your rent go up too?",
          "up"
        ],
        [
          "yn",
          "Have they raised your rent?",
          "up"
        ],
        [
          "say",
          "My landlord wants more rent again.",
          "raised"
        ],
        [
          "say",
          "They raised my rent.",
          "raised"
        ]
      ],
      "a": {
        "up": [
          "Yeah, again.",
          "Not yet, thankfully.",
          "It's going up when I renew."
        ],
        "raised": [
          "That's rough.",
          "How much more?|ask",
          "I'm sorry. That's the last thing you need."
        ]
      },
      "n": [
        {
          "k": "up",
          "say": [
            "It's getting hard to afford this place."
          ],
          "re": [
            "I know.",
            "Everything keeps going up."
          ]
        },
        {
          "k": "raised",
          "t": "ask",
          "say": [
            "Another hundred a month.",
            "About fifty more."
          ],
          "re": [
            "That's a lot over a year.",
            "That's rough."
          ]
        }
      ]
    },
    {
      "id": "parking",
      "q": [
        [
          "where",
          "Where did you park?",
          "where"
        ],
        [
          "where",
          "Where's your car?",
          "where"
        ],
        [
          "yn",
          "Did you find a parking spot?",
          "found"
        ],
        [
          "yn",
          "Manage to park okay?",
          "found"
        ]
      ],
      "a": {
        "where": [
          "A couple of streets over.",
          "Near the main road.",
          "Farther away than I'd like."
        ],
        "found": [
          "Eventually.",
          "Yeah, took a while.",
          "Got lucky this time."
        ]
      },
      "n": [
        {
          "k": "where",
          "say": [
            "I can walk back with you."
          ],
          "re": [
            "Thanks.",
            "Yeah, let's go together."
          ]
        },
        {
          "k": "found",
          "say": [
            "It's always a pain around here."
          ],
          "re": [
            "Especially when it's busy.",
            "Yeah, I usually leave extra time."
          ]
        }
      ]
    }
  ],
  "maze": [
    {
      "id": "way",
      "q": [
        [
          "yn",
          "Have we already been this way?",
          "been"
        ],
        [
          "yn",
          "Didn't we come through here?",
          "been"
        ],
        [
          "where",
          "Which way is the exit?",
          "out"
        ],
        [
          "where",
          "Do you know the way out?",
          "out"
        ]
      ],
      "a": {
        "been": [
          "I think we did.",
          "I'm losing track.",
          "It all looks the same to me."
        ],
        "out": [
          "I'm not sure.",
          "I think it's left, but I could be wrong.",
          "We need to find a sign."
        ]
      },
      "n": [
        {
          "k": "been",
          "say": [
            "Let's remember this turn."
          ],
          "re": [
            "Good idea.",
            "I'll try."
          ]
        },
        {
          "k": "out",
          "say": [
            "I want to get out soon."
          ],
          "re": [
            "Me too.",
            "Let's keep looking."
          ]
        }
      ],
      "back": [
        "We still need to find the exit."
      ],
      "backRe": [
        "Stay with me. We'll find it.",
        "We need to find someone who knows the way."
      ]
    },
    {
      "id": "center",
      "q": [
        [
          "what",
          "What's in the middle of this maze?",
          "what"
        ],
        [
          "what",
          "Do you know what we're trying to get to?",
          "what"
        ],
        [
          "yn",
          "Do you get anything for finishing?",
          "prize"
        ],
        [
          "yn",
          "Is there a prize at the end?",
          "prize"
        ]
      ],
      "a": {
        "what": [
          "I haven't been there before.",
          "I think there's a place to sit.",
          "I'm not sure."
        ],
        "prize": [
          "I don't think so.",
          "Maybe, but I doubt it.",
          "I didn't check."
        ]
      },
      "n": [
        {
          "k": "what",
          "say": [
            "I could use a seat."
          ],
          "re": [
            "Same.",
            "Hopefully there's one."
          ]
        },
        {
          "k": "prize",
          "say": [
            "I mainly want to find the way out now."
          ],
          "re": [
            "Yeah, let's keep moving.",
            "Same here."
          ]
        }
      ]
    },
    {
      "id": "creepy",
      "dark": true,
      "q": [
        [
          "say",
          "It's a bit creepy in here after dark.#weird",
          "creepy"
        ],
        [
          "say",
          "I don't like being in this maze at night.#weird",
          "creepy"
        ],
        [
          "what",
          "Why did we decide to come after dark?",
          "why"
        ],
        [
          "what",
          "What made us think this was a good idea?",
          "why"
        ]
      ],
      "a": {
        "creepy": [
          "Let's try to get out then.",
          "Stay with me.",
          "I know what you mean."
        ],
        "why": [
          "Seemed fun earlier.",
          "I didn't think it'd take this long.",
          "I wasn't thinking about how dark it would get."
        ]
      },
      "n": [
        {
          "k": "creepy",
          "say": [
            "Don't get ahead of me."
          ],
          "re": [
            "I won't.",
            "I'll stay with you."
          ]
        }
      ]
    },
    {
      "id": "signal",
      "q": [
        [
          "yn",
          "Have you got phone signal?",
          "signal"
        ],
        [
          "yn",
          "Does your phone work in here?",
          "signal"
        ],
        [
          "yn",
          "Can you call someone?",
          "call"
        ],
        [
          "yn",
          "Can you get hold of anyone?",
          "call"
        ]
      ],
      "a": {
        "signal": [
          "Barely.",
          "No signal at all.",
          "One bar.",
          "It keeps dropping out."
        ],
        "call": [
          "I'll try.",
          "Not without a signal.",
          "Maybe if we get farther out."
        ]
      },
      "n": [
        {
          "k": "signal",
          "say": [
            "Try sending a message when it comes back."
          ],
          "re": [
            "I will.",
            "I'll keep checking."
          ]
        },
        {
          "k": "call",
          "say": [
            "Let me know if it connects."
          ],
          "re": [
            "I will.",
            "Okay."
          ]
        }
      ]
    }
  ],
  "farm": [
    {
      "id": "fence",
      "q": [
        [
          "say",
          "I need to fix that fence later.",
          "fix"
        ],
        [
          "say",
          "There's a loose board on the fence.",
          "fix"
        ],
        [
          "yn",
          "Did you look at that loose fence board?",
          "seen"
        ],
        [
          "yn",
          "Have you checked the fence yet?",
          "seen"
        ]
      ],
      "a": {
        "fix": [
          "I can help you.",
          "We should get it done soon.",
          "I'll grab the tools."
        ],
        "seen": [
          "Not yet.",
          "Yeah, it needs fixing.",
          "I had a quick look."
        ]
      },
      "n": [
        {
          "k": "fix",
          "say": [
            "Let's do it before we forget."
          ],
          "re": [
            "Okay.",
            "I'll give you a hand."
          ]
        },
        {
          "k": "seen",
          "say": [
            "I'll get the tools later."
          ],
          "re": [
            "Let me know when.",
            "I'll help."
          ]
        }
      ]
    },
    {
      "id": "hens",
      "q": [
        [
          "say",
          "The hens seem restless.",
          "restless"
        ],
        [
          "say",
          "They're making more noise than usual.",
          "restless"
        ],
        [
          "yn",
          "Can you hear the chickens?",
          "hear"
        ],
        [
          "yn",
          "Are the chickens making that noise?",
          "hear"
        ]
      ],
      "a": {
        "restless": [
          "We should check on them.",
          "They might want feeding.",
          "Could be something bothering them."
        ],
        "hear": [
          "Yeah, I hear them.",
          "I think so.",
          "Sounds like them."
        ]
      },
      "n": [
        {
          "k": "restless",
          "say": [
            "I'll have a look at the coop."
          ],
          "re": [
            "I'll come with you.",
            "Let me know if anything's wrong."
          ]
        },
        {
          "k": "hear",
          "say": [
            "I'll go check in a minute."
          ],
          "re": [
            "Okay.",
            "I'll come too."
          ]
        }
      ]
    },
    {
      "id": "feed",
      "q": [
        [
          "yn",
          "Have the animals been fed?",
          "fed"
        ],
        [
          "yn",
          "Did you get the feeding done?",
          "fed"
        ],
        [
          "who",
          "Who did the feeding?",
          "who"
        ],
        [
          "who",
          "Who fed them earlier?",
          "who"
        ]
      ],
      "a": {
        "fed": [
          "Yeah, all done.",
          "Not yet.",
          "Most of them.",
          "I thought you were doing it."
        ],
        "who": [
          "I did.",
          "I'm not sure anyone did yet.",
          "I thought you did."
        ]
      },
      "n": [
        {
          "k": "fed",
          "say": [
            "Let's check the list so we don't miss any."
          ],
          "re": [
            "Good idea.",
            "Okay, I'll get it."
          ]
        },
        {
          "k": "who",
          "say": [
            "We need to write it down when it's done."
          ],
          "re": [
            "Yeah, that'll help.",
            "I'll make a note next time."
          ]
        }
      ]
    },
    {
      "id": "tractor",
      "q": [
        [
          "yn",
          "Is the tractor still making that noise?",
          "noise"
        ],
        [
          "yn",
          "Has that noise in the tractor stopped?",
          "noise"
        ],
        [
          "say",
          "That noise in the tractor's back.",
          "again"
        ],
        [
          "say",
          "The tractor still doesn't sound right.",
          "again"
        ]
      ],
      "a": {
        "noise": [
          "It's still doing it.",
          "Haven't started it yet.",
          "I need to check it."
        ],
        "again": [
          "I'll take a look.",
          "We should call the mechanic.",
          "Don't leave it running then."
        ]
      },
      "n": [
        {
          "k": "noise",
          "say": [
            "I'd rather get it looked at before it gets worse."
          ],
          "re": [
            "Me too.",
            "I'll call someone."
          ]
        }
      ]
    },
    {
      "id": "market",
      "q": [
        [
          "yn",
          "Are we going to the market Saturday?",
          "going"
        ],
        [
          "yn",
          "We still doing the market this week?",
          "going"
        ],
        [
          "how",
          "How did the eggs sell last time?",
          "eggs"
        ],
        [
          "how",
          "Did you sell many eggs?",
          "eggs"
        ]
      ],
      "a": {
        "going": [
          "That's the plan.",
          "We need to check what we've got to take.",
          "I think so."
        ],
        "eggs": [
          "Sold nearly all of them.",
          "A few boxes left over.",
          "Not as many as I'd hoped."
        ]
      },
      "n": [
        {
          "k": "going",
          "say": [
            "I'll help get things ready."
          ],
          "re": [
            "Thanks.",
            "I'll let you know when."
          ]
        },
        {
          "k": "eggs",
          "say": [
            "We'll see how this week goes."
          ],
          "re": [
            "Yeah.",
            "Hopefully it's busy."
          ]
        }
      ]
    }
  ],
  "park": [
    {
      "id": "dog",
      "needs": "dog",
      "q": [
        [
          "yn",
          "Does your dog ever settle down?",
          "hyper"
        ],
        [
          "yn",
          "Does your dog ever slow down?",
          "hyper"
        ],
        [
          "how",
          "How old is your dog?",
          "age"
        ],
        [
          "how",
          "What age is your dog now?",
          "age"
        ],
        [
          "yn",
          "Can I pet your dog?",
          "pet"
        ],
        [
          "yn",
          "Is it okay if I say hello to your dog?",
          "pet"
        ]
      ],
      "a": {
        "hyper": [
          "Not often.",
          "Only once we get home.",
          "Usually settles down after a walk."
        ],
        "age": [
          "About two.",
          "Just turned four.",
          "We're not sure exactly. Came from a shelter."
        ],
        "pet": [
          "Sure, just go slowly.",
          "Better not. A bit nervous with new people.",
          "Let me settle the lead first."
        ]
      },
      "n": [
        {
          "k": "hyper",
          "say": [
            "Must keep you busy."
          ],
          "re": [
            "Definitely.",
            "Gets me out of the house."
          ]
        },
        {
          "k": "age",
          "say": [
            "How long have you had your dog?"
          ],
          "re": [
            "About a year.",
            "Since last summer.",
            "A few months now."
          ]
        },
        {
          "k": "pet",
          "say": [
            "No problem. I'll give you some room."
          ],
          "re": [
            "Thanks.",
            "Appreciate it."
          ]
        }
      ]
    },
    {
      "id": "ducks",
      "q": [
        [
          "yn",
          "Did you bring food for the ducks?",
          "food"
        ],
        [
          "yn",
          "Have you got anything for the ducks?",
          "food"
        ],
        [
          "say",
          "I like watching the ducks here.",
          "ducks"
        ],
        [
          "say",
          "I could sit by the ducks for a while.",
          "ducks"
        ]
      ],
      "a": {
        "food": [
          "No, forgot.",
          "Just some oats.",
          "Not this time."
        ],
        "ducks": [
          "Me too.",
          "We can stay a bit.",
          "It's a nice place to stop."
        ]
      },
      "n": [
        {
          "k": "food",
          "say": [
            "We can just watch them for a bit."
          ],
          "re": [
            "Yeah.",
            "No rush."
          ]
        }
      ]
    },
    {
      "id": "bench",
      "q": [
        [
          "yn",
          "Want to sit down for a minute?",
          "sit"
        ],
        [
          "yn",
          "Can we take a break?",
          "sit"
        ],
        [
          "say",
          "My legs are getting tired.",
          "legs"
        ],
        [
          "say",
          "I need a short break.",
          "legs"
        ]
      ],
      "a": {
        "sit": [
          "Yeah, my feet hurt.",
          "Sure.",
          "I was about to ask."
        ],
        "legs": [
          "We can stop.",
          "Let's find a seat.",
          "No rush, take a minute."
        ]
      },
      "n": [
        {
          "k": "sit",
          "say": [
            "Let's find somewhere to sit."
          ],
          "re": [
            "Okay.",
            "I'll keep an eye out."
          ]
        }
      ]
    },
    {
      "id": "jog",
      "q": [
        [
          "yn",
          "Are you still running regularly?",
          "running"
        ],
        [
          "yn",
          "You still doing your morning runs?",
          "running"
        ],
        [
          "how",
          "How many laps did you do?",
          "laps"
        ],
        [
          "how",
          "How many times did you go around?",
          "laps"
        ]
      ],
      "a": {
        "running": [
          "A few times a week.",
          "I've missed a few lately.",
          "Not as much as I should."
        ],
        "laps": [
          "Just two.",
          "Three, I think.",
          "Lost count, honestly."
        ]
      },
      "n": [
        {
          "k": "running",
          "say": [
            "I want to get back into it."
          ],
          "re": [
            "Start with a short one.",
            "Come along sometime."
          ]
        },
        {
          "k": "laps",
          "say": [
            "I'm done for now."
          ],
          "re": [
            "Same here.",
            "Let's cool down a bit."
          ]
        }
      ]
    },
    {
      "id": "pond",
      "q": [
        [
          "yn",
          "Are there fish in this pond?",
          "fish"
        ],
        [
          "yn",
          "Have you ever seen fish in here?",
          "fish"
        ],
        [
          "say",
          "I wouldn't want to swim in that pond.",
          "pond"
        ],
        [
          "say",
          "That water doesn't look very inviting.",
          "pond"
        ]
      ],
      "a": {
        "fish": [
          "I think so.",
          "I've seen little ones before.",
          "Haven't really looked."
        ],
        "pond": [
          "No, I'll stay out of it.",
          "Me neither.",
          "I'd rather just sit here."
        ]
      },
      "n": [
        {
          "k": "fish",
          "say": [
            "Let's see if we can spot any."
          ],
          "re": [
            "Okay.",
            "Might take a minute."
          ]
        }
      ]
    }
  ],
  "pool": [
    {
      "id": "water",
      "q": [
        [
          "yn",
          "Are you getting in the pool?",
          "in"
        ],
        [
          "yn",
          "You coming in for a swim?",
          "in"
        ],
        [
          "say",
          "I'm looking forward to a swim.",
          "nice"
        ],
        [
          "say",
          "I haven't been swimming in ages.",
          "nice"
        ]
      ],
      "a": {
        "in": [
          "In a minute.",
          "I'll stay here for now.",
          "Yeah, let me put my stuff down.",
          "I might later."
        ],
        "nice": [
          "Take your time getting in.",
          "Same here.",
          "It'll be nice to get in."
        ]
      },
      "n": [
        {
          "k": "in",
          "say": [
            "Let me know when you're ready."
          ],
          "re": [
            "Okay.",
            "I will."
          ]
        }
      ]
    },
    {
      "id": "sunscreen",
      "q": [
        [
          "yn",
          "Did you bring sunscreen?",
          "have"
        ],
        [
          "yn",
          "Have you got sunscreen with you?",
          "have"
        ],
        [
          "yn",
          "Can I borrow some sunscreen?",
          "have"
        ]
      ],
      "a": {
        "have": [
          "Yeah, in my bag.",
          "I forgot, sorry.",
          "I've only got a little left."
        ]
      },
      "n": [
        {
          "k": "have",
          "say": [
            "I always forget something."
          ],
          "re": [
            "It's easy to do.",
            "I should keep a spare in the car."
          ]
        }
      ]
    },
    {
      "id": "snacks",
      "q": [
        [
          "yn",
          "Is the snack bar open?",
          "open"
        ],
        [
          "yn",
          "Can we get snacks yet?",
          "open"
        ],
        [
          "when",
          "When does the snack bar close?",
          "close"
        ],
        [
          "when",
          "Do you know what time they stop serving?",
          "close"
        ],
        [
          "say",
          "I could really do with a cold drink.",
          "drink"
        ],
        [
          "say",
          "I want something cold to drink.",
          "drink"
        ]
      ],
      "a": {
        "open": [
          "I'm not sure.",
          "We can go check.",
          "I haven't looked."
        ],
        "close": [
          "I'm not sure.",
          "We'd have to ask.",
          "I didn't check the sign."
        ],
        "drink": [
          "Me too.",
          "Let's get something in a bit.",
          "I've got water if you want some."
        ]
      },
      "n": [
        {
          "k": "open",
          "say": [
            "I'll have a look in a bit."
          ],
          "re": [
            "Let me know.",
            "I'll come with you."
          ]
        },
        {
          "k": "close",
          "say": [
            "I'll ask before we get in the water."
          ],
          "re": [
            "Good idea.",
            "Thanks."
          ]
        }
      ],
      "back": [
        "I need a drink of water."
      ],
      "backRe": [
        "Me too.",
        "We'll find some once we're clear."
      ]
    },
    {
      "id": "lifeguard",
      "q": [
        [
          "yn",
          "Is there a lifeguard on duty?",
          "guard"
        ],
        [
          "yn",
          "Do you know if there's a lifeguard here?",
          "guard"
        ],
        [
          "say",
          "I want to check where the deep end starts.",
          "check"
        ],
        [
          "say",
          "I haven't swum here before.",
          "check"
        ]
      ],
      "a": {
        "guard": [
          "We should check.",
          "I haven't looked yet.",
          "I think so, but let's make sure."
        ],
        "check": [
          "Let's check the signs.",
          "We can ask somebody.",
          "Take it slowly."
        ]
      },
      "n": [
        {
          "k": "guard",
          "say": [
            "I'll ask before I get in."
          ],
          "re": [
            "Good idea.",
            "Let me know."
          ]
        }
      ]
    }
  ],
  "office": [
    {
      "id": "meeting",
      "q": [
        [
          "when",
          "When's the meeting?",
          "time"
        ],
        [
          "when",
          "What time did they say the meeting was?",
          "time"
        ],
        [
          "yn",
          "Are you going to the meeting?",
          "going"
        ],
        [
          "yn",
          "Do you have to sit in on that meeting?",
          "going"
        ]
      ],
      "a": {
        "time": [
          "Three, I think.",
          "It's on the calendar. I need to check.",
          "Pretty sure it's at three."
        ],
        "going": [
          "Yeah, I've got to.",
          "I don't think I'm needed.",
          "I'll check with my manager."
        ]
      },
      "n": [
        {
          "k": "time",
          "say": [
            "I'll check the invite."
          ],
          "re": [
            "Let me know if I'm wrong.",
            "Yeah, safest to check."
          ]
        },
        {
          "k": "going",
          "say": [
            "I'll send you the notes if you miss it."
          ],
          "re": [
            "Thanks.",
            "That'd help."
          ]
        }
      ]
    },
    {
      "id": "printer",
      "q": [
        [
          "yn",
          "Is the printer working?",
          "working"
        ],
        [
          "yn",
          "Can you print anything right now?",
          "working"
        ],
        [
          "say",
          "The printer's jammed.",
          "broken"
        ],
        [
          "say",
          "I can't get anything to print.",
          "broken"
        ]
      ],
      "a": {
        "working": [
          "I haven't tried.",
          "It jammed when I tried earlier.",
          "It was working a minute ago."
        ],
        "broken": [
          "I'll take a look.",
          "Did you check the paper tray?|ask",
          "We might need to call someone."
        ]
      },
      "n": [
        {
          "k": "working",
          "say": [
            "I'll have a look before I send anything."
          ],
          "re": [
            "Good idea.",
            "Let me know if it's working."
          ]
        },
        {
          "k": "broken",
          "t": "ask",
          "say": [
            "Not yet. I'll check.",
            "Yeah, there's paper in it."
          ],
          "re": [
            "Let's have a look together.",
            "I'll come over in a second."
          ]
        }
      ]
    },
    {
      "id": "coffee",
      "q": [
        [
          "yn",
          "Want a coffee?",
          "want"
        ],
        [
          "yn",
          "I'm getting coffee. Want one?",
          "want"
        ],
        [
          "say",
          "I could use a coffee.",
          "need"
        ],
        [
          "say",
          "I need a coffee before I start this.",
          "need"
        ]
      ],
      "a": {
        "want": [
          "Yes, please.",
          "No, thanks. I've had enough.",
          "Just a small one, thanks."
        ],
        "need": [
          "I could too.",
          "Take a break and get one.",
          "I'll come with you."
        ]
      },
      "n": [
        {
          "k": "want",
          "say": [
            "I'm heading over now."
          ],
          "re": [
            "Okay, thanks.",
            "See you in a minute."
          ]
        }
      ],
      "back": [
        "I still haven't had that coffee."
      ],
      "backRe": [
        "That can wait.",
        "We'll get something once we're safe."
      ]
    },
    {
      "id": "fridge",
      "q": [
        [
          "say",
          "My lunch isn't in the fridge.",
          "gone"
        ],
        [
          "say",
          "I can't find the food I brought.",
          "gone"
        ],
        [
          "who",
          "Do you know who moved my lunch?",
          "who"
        ],
        [
          "who",
          "Has somebody taken my food out of the fridge?",
          "who"
        ]
      ],
      "a": {
        "gone": [
          "Have you checked the back?|ask",
          "Maybe somebody moved it.",
          "I'll help you look."
        ],
        "who": [
          "I haven't seen anyone move it.",
          "No idea, sorry.",
          "You could ask the others."
        ]
      },
      "n": [
        {
          "k": "gone",
          "t": "ask",
          "say": [
            "Not properly. I'll check again.",
            "Yeah, I looked behind everything."
          ],
          "re": [
            "I'll help you look.",
            "Let's check the other shelf too."
          ]
        },
        {
          "k": "who",
          "say": [
            "I'll check again first."
          ],
          "re": [
            "Okay.",
            "Let me know if you find it."
          ]
        }
      ]
    },
    {
      "id": "friday",
      "q": [
        [
          "say",
          "This week feels really long.",
          "week"
        ],
        [
          "say",
          "I'm ready to go home.",
          "week"
        ],
        [
          "yn",
          "Do you have the weekend off?",
          "off"
        ],
        [
          "yn",
          "Are you working this weekend?",
          "off"
        ]
      ],
      "a": {
        "week": [
          "Me too.",
          "It's been a lot.",
          "I need a day off."
        ],
        "off": [
          "I need to check my schedule.",
          "I'm off Saturday, working Sunday.",
          "I've got both days off."
        ]
      },
      "n": [
        {
          "k": "week",
          "say": [
            "I'm not checking my emails when I get home."
          ],
          "re": [
            "Good.",
            "I should stop doing that too."
          ]
        },
        {
          "k": "off",
          "say": [
            "Hopefully you get a chance to rest."
          ],
          "re": [
            "Thanks.",
            "I hope so."
          ]
        }
      ]
    }
  ],
  "checker": [
    {
      "id": "who",
      "q": [
        [
          "who",
          "Who built this place?",
          "built"
        ],
        [
          "who",
          "Do you know who designed this?",
          "built"
        ],
        [
          "yn",
          "Is this supposed to be art?",
          "art"
        ],
        [
          "yn",
          "Is this some kind of installation?",
          "art"
        ]
      ],
      "a": {
        "built": [
          "No idea.",
          "There might be a sign somewhere.",
          "I haven't looked it up."
        ],
        "art": [
          "I think so.",
          "Probably.",
          "I'm not sure."
        ]
      },
      "n": [
        {
          "k": "built",
          "say": [
            "I'd like to know why they made it like this."
          ],
          "re": [
            "Me too.",
            "We can look it up later."
          ]
        },
        {
          "k": "art",
          "say": [
            "I've never seen anything like it."
          ],
          "re": [
            "Neither have I.",
            "It's unusual."
          ]
        }
      ]
    },
    {
      "id": "photo",
      "q": [
        [
          "yn",
          "Can you take a photo of me here?",
          "photo"
        ],
        [
          "yn",
          "Would you mind taking my picture?",
          "photo"
        ]
      ],
      "a": {
        "photo": [
          "Sure, give me your phone.",
          "Yeah, where do you want to stand?|ask",
          "Of course."
        ]
      },
      "n": [
        {
          "k": "photo",
          "say": [
            "Just here is fine."
          ],
          "re": [
            "Okay, hold still.",
            "Got it."
          ]
        }
      ]
    }
  ],
  "crew": [
    {
      "id": "suit",
      "q": [
        [
          "yn",
          "Can you check my suit pressure?",
          "pressure"
        ],
        [
          "yn",
          "Is my suit reading okay?",
          "pressure"
        ],
        [
          "how",
          "How's your oxygen?",
          "oxygen"
        ],
        [
          "how",
          "What have you got left on oxygen?",
          "oxygen"
        ]
      ],
      "a": {
        "pressure": [
          "Give me a second to check.",
          "I'll pull up the reading.",
          "Let me check the numbers."
        ],
        "oxygen": [
          "Enough for now. I'll keep checking.",
          "I'll get you a reading in a second.",
          "We should head back before too long."
        ]
      },
      "n": [
        {
          "k": "pressure",
          "say": [
            "Thanks. I'd rather check twice."
          ],
          "re": [
            "No problem.",
            "Better to be sure."
          ]
        },
        {
          "k": "oxygen",
          "say": [
            "Let's leave ourselves plenty of time."
          ],
          "re": [
            "Agreed.",
            "I'll keep an eye on it."
          ]
        }
      ]
    },
    {
      "id": "samples",
      "q": [
        [
          "how",
          "How many samples do we still need?",
          "left"
        ],
        [
          "how",
          "How many more are on the list?",
          "left"
        ],
        [
          "yn",
          "Are we finished collecting samples?",
          "done"
        ],
        [
          "yn",
          "Have we got everything we need?",
          "done"
        ]
      ],
      "a": {
        "left": [
          "A couple, I think.",
          "Let me check the list.",
          "I'm not sure we've marked all of them down."
        ],
        "done": [
          "I think so, but let's check.",
          "We might be missing one.",
          "Let me go through the list."
        ]
      },
      "n": [
        {
          "k": "left",
          "say": [
            "I'll check what I've got in my bag."
          ],
          "re": [
            "I'll check mine too.",
            "Good idea."
          ]
        },
        {
          "k": "done",
          "say": [
            "I don't want to come back for one we forgot."
          ],
          "re": [
            "Neither do I.",
            "Let's check properly."
          ]
        }
      ],
      "back": [
        "We can check the samples once we're safe."
      ],
      "backRe": [
        "Agreed. Let's get back first.",
        "Stay on the radio."
      ]
    },
    {
      "id": "home",
      "q": [
        [
          "yn",
          "Have you spoken to your family?",
          "called"
        ],
        [
          "yn",
          "Managed to call home yet?",
          "called"
        ],
        [
          "when",
          "When's your next call home?",
          "next"
        ],
        [
          "when",
          "When are you talking to your family next?",
          "next"
        ]
      ],
      "a": {
        "called": [
          "Not yet.",
          "Had a short call earlier.",
          "I'm waiting for a good time."
        ],
        "next": [
          "Hopefully after we get back.",
          "I haven't arranged it yet.",
          "Later, if I can."
        ]
      },
      "n": [
        {
          "k": "called",
          "say": [
            "I miss being able to just call whenever."
          ],
          "re": [
            "Me too.",
            "It's hard getting used to."
          ]
        },
        {
          "k": "next",
          "say": [
            "Tell them I said hello."
          ],
          "re": [
            "I will.",
            "Thanks."
          ]
        }
      ]
    }
  ],
  "station": [
    {
      "id": "shift",
      "q": [
        [
          "when",
          "When does your shift end?",
          "end"
        ],
        [
          "when",
          "What time are you off?",
          "end"
        ],
        [
          "how",
          "How long have you got left?",
          "left"
        ],
        [
          "how",
          "Much longer on your shift?",
          "left"
        ]
      ],
      "a": {
        "end": [
          "In a couple of hours.",
          "Not for a while yet.",
          "I need to check the roster."
        ],
        "left": [
          "About two hours.",
          "Not long, I hope.",
          "Still a few hours."
        ]
      },
      "n": [
        {
          "k": "end",
          "say": [
            "I need some sleep when I'm done."
          ],
          "re": [
            "Me too.",
            "Get some rest when you can."
          ]
        },
        {
          "k": "left",
          "say": [
            "I'll let you get back to it."
          ],
          "re": [
            "See you later.",
            "Catch you after."
          ]
        }
      ]
    },
    {
      "id": "maint",
      "q": [
        [
          "yn",
          "Did maintenance check that panel?",
          "fixed"
        ],
        [
          "yn",
          "Has somebody looked at that panel yet?",
          "fixed"
        ],
        [
          "say",
          "I'm worried about that panel.",
          "panel"
        ],
        [
          "say",
          "I don't think that panel's working properly.",
          "panel"
        ]
      ],
      "a": {
        "fixed": [
          "I'm not sure.",
          "They said they'd come by.",
          "I need to check the log."
        ],
        "panel": [
          "Let's report it.",
          "We should get maintenance to look.",
          "Don't touch it until it's checked."
        ]
      },
      "n": [
        {
          "k": "fixed",
          "say": [
            "I'll follow it up."
          ],
          "re": [
            "Thanks.",
            "Let me know what they say."
          ]
        }
      ]
    },
    {
      "id": "food",
      "q": [
        [
          "what",
          "What's for dinner?",
          "dinner"
        ],
        [
          "what",
          "Do you know what we're eating later?",
          "dinner"
        ],
        [
          "say",
          "I'm getting tired of the food here.",
          "tired"
        ],
        [
          "say",
          "I want something different to eat.",
          "tired"
        ]
      ],
      "a": {
        "dinner": [
          "Haven't checked.",
          "Same sort of thing as usual, probably.",
          "I'll look at the menu later."
        ],
        "tired": [
          "Me too.",
          "We could see what else is available.",
          "I know what you mean."
        ]
      },
      "n": [
        {
          "k": "dinner",
          "say": [
            "I miss cooking for myself."
          ],
          "re": [
            "Me too.",
            "You get tired of the same things."
          ]
        }
      ]
    },
    {
      "id": "air",
      "q": [
        [
          "yn",
          "Did you check the air filters?",
          "checked"
        ],
        [
          "yn",
          "Have the scrubbers been checked?",
          "checked"
        ],
        [
          "say",
          "The air smells a bit strange.#weird",
          "smell"
        ],
        [
          "say",
          "Does the air smell different to you?#weird",
          "smell"
        ]
      ],
      "a": {
        "checked": [
          "It's on my list.",
          "I need to check the maintenance log.",
          "I'll have a look."
        ],
        "smell": [
          "I hadn't noticed.",
          "We should report it.",
          "Let's get someone to check it."
        ]
      },
      "n": [
        {
          "k": "checked",
          "say": [
            "Let me know if they need anything."
          ],
          "re": [
            "I will.",
            "Thanks."
          ]
        }
      ]
    }
  ],
  "bunker": [
    {
      "id": "shift",
      "q": [
        [
          "who",
          "Who's taking over after us?",
          "next"
        ],
        [
          "who",
          "Do you know who's on the next shift?",
          "next"
        ],
        [
          "say",
          "I hope the next shift gets here on time.",
          "soon"
        ],
        [
          "say",
          "I'm ready to hand over.",
          "soon"
        ]
      ],
      "a": {
        "next": [
          "I need to check the roster.",
          "I can't remember.",
          "They'll be down soon."
        ],
        "soon": [
          "Me too.",
          "Finish your notes while we wait.",
          "Hopefully it won't be long."
        ]
      },
      "n": [
        {
          "k": "next",
          "say": [
            "I need to hand over these notes."
          ],
          "re": [
            "Leave them with the log as well.",
            "I'll remind you."
          ]
        }
      ]
    },
    {
      "id": "radio",
      "q": [
        [
          "yn",
          "Anything on the radio?",
          "heard"
        ],
        [
          "yn",
          "Have you heard anything come through?",
          "heard"
        ],
        [
          "say",
          "The radio's been quiet.",
          "quiet"
        ],
        [
          "say",
          "Haven't heard much on the radio.",
          "quiet"
        ]
      ],
      "a": {
        "heard": [
          "Nothing for a while.",
          "Just routine stuff.",
          "I haven't been listening the whole time."
        ],
        "quiet": [
          "We can check the connection.",
          "I'll try calling up.",
          "Keep listening."
        ]
      },
      "n": [
        {
          "k": "heard",
          "say": [
            "I'll check in later."
          ],
          "re": [
            "Okay.",
            "Let me know if anything comes up."
          ]
        }
      ]
    },
    {
      "id": "cards",
      "q": [
        [
          "yn",
          "Want to play cards after the shift?",
          "play"
        ],
        [
          "yn",
          "Cards later?",
          "play"
        ],
        [
          "say",
          "You still owe me from that card game.",
          "owe"
        ],
        [
          "say",
          "Don't forget what you owe me from last time.",
          "owe"
        ]
      ],
      "a": {
        "play": [
          "Sure, if I'm not too tired.",
          "Maybe. I need food first.",
          "Not tonight, sorry."
        ],
        "owe": [
          "I haven't forgotten.",
          "I'll get you later.",
          "Yeah, I know."
        ]
      },
      "n": [
        {
          "k": "play",
          "say": [
            "I'll ask the others too."
          ],
          "re": [
            "Okay.",
            "Let me know who's around."
          ]
        },
        {
          "k": "owe",
          "say": [
            "I'm going to keep reminding you."
          ],
          "re": [
            "I know you are.",
            "Fair enough."
          ]
        }
      ]
    },
    {
      "id": "food",
      "q": [
        [
          "what",
          "What's for dinner?",
          "chow"
        ],
        [
          "what",
          "Do you know what's for chow?",
          "chow"
        ],
        [
          "say",
          "I hope dinner's different this time.",
          "same"
        ],
        [
          "say",
          "I'm tired of eating the same thing.",
          "same"
        ]
      ],
      "a": {
        "chow": [
          "Haven't checked.",
          "I think there's stew.",
          "We'll find out when we get up there."
        ],
        "same": [
          "Same here.",
          "We don't get much choice.",
          "I know what you mean."
        ]
      },
      "n": [
        {
          "k": "chow",
          "say": [
            "I just want something hot."
          ],
          "re": [
            "Me too.",
            "I'll eat whatever they have."
          ]
        }
      ]
    }
  ],
  "club": [
    {
      "id": "song",
      "q": [
        [
          "say",
          "I LOVE THIS SONG!",
          "song"
        ],
        [
          "say",
          "I HAVEN'T HEARD THIS IN AGES!",
          "song"
        ],
        [
          "who",
          "WHO'S DJING?",
          "dj"
        ],
        [
          "who",
          "DO YOU KNOW WHO THIS DJ IS?",
          "dj"
        ]
      ],
      "a": {
        "song": [
          "ME TOO!",
          "I KNOW!",
          "THIS ONE'S GOOD!"
        ],
        "dj": [
          "NO IDEA!",
          "I DIDN'T CHECK!",
          "IT MIGHT BE ON THE FLYER!"
        ]
      },
      "n": [
        {
          "k": "song",
          "say": [
            "I'M STAYING FOR THIS ONE!"
          ],
          "re": [
            "SAME!",
            "YEAH, LET'S STAY!"
          ]
        },
        {
          "k": "dj",
          "say": [
            "I'LL LOOK IT UP LATER!"
          ],
          "re": [
            "LET ME KNOW!",
            "YEAH!"
          ]
        }
      ]
    },
    {
      "id": "drink",
      "q": [
        [
          "yn",
          "DO YOU WANT ANOTHER DRINK?",
          "another"
        ],
        [
          "yn",
          "ANOTHER DRINK?",
          "another"
        ],
        [
          "what",
          "WHAT DO YOU WANT TO DRINK?",
          "want"
        ],
        [
          "what",
          "YOU WANT ANYTHING FROM THE BAR?",
          "want"
        ],
        [
          "say",
          "I NEED WATER!",
          "water"
        ],
        [
          "say",
          "I NEED SOMETHING TO DRINK!",
          "water"
        ]
      ],
      "a": {
        "another": [
          "JUST WATER, PLEASE!",
          "NO, I'M GOOD!",
          "YEAH, SAME AGAIN!"
        ],
        "want": [
          "WATER!",
          "NOTHING, THANKS!",
          "A SODA, PLEASE!"
        ],
        "water": [
          "LET'S GET SOME!",
          "I'LL COME WITH YOU!",
          "YEAH, ME TOO!"
        ]
      },
      "n": [
        {
          "k": "another",
          "say": [
            "I'M GOING OVER NOW!"
          ],
          "re": [
            "OKAY!",
            "I'LL WAIT HERE!"
          ]
        },
        {
          "k": "want",
          "say": [
            "OKAY, I'LL BE BACK!"
          ],
          "re": [
            "THANKS!",
            "SEE YOU IN A MINUTE!"
          ]
        }
      ],
      "back": [
        "I just want some water now."
      ],
      "backRe": [
        "Me too.",
        "Let's get somewhere safe first."
      ]
    },
    {
      "id": "jess",
      "q": [
        [
          "where",
          "WHERE'S JESS?",
          "where"
        ],
        [
          "where",
          "DO YOU KNOW WHERE JESS WENT?",
          "where"
        ],
        [
          "yn",
          "HAVE YOU SEEN JESS?",
          "seen"
        ],
        [
          "yn",
          "DID YOU SEE WHERE JESS WENT?",
          "seen"
        ]
      ],
      "a": {
        "where": [
          "I HAVEN'T SEEN HER!",
          "I LOST TRACK OF HER!",
          "TRY TEXTING HER!"
        ],
        "seen": [
          "NOT RECENTLY!",
          "NO, SORRY!",
          "NOT SINCE WE GOT HERE!"
        ]
      },
      "n": [
        {
          "k": "where",
          "say": [
            "I'LL SEND HER A MESSAGE!"
          ],
          "re": [
            "LET ME KNOW IF SHE ANSWERS!",
            "I'LL KEEP LOOKING!"
          ]
        },
        {
          "k": "seen",
          "say": [
            "I'LL TRY HER PHONE!"
          ],
          "re": [
            "OKAY!",
            "LET ME KNOW!"
          ]
        }
      ]
    },
    {
      "id": "loud",
      "q": [
        [
          "say",
          "IT'S SO LOUD IN HERE!",
          "loud"
        ],
        [
          "say",
          "I CAN BARELY HEAR YOU!",
          "loud"
        ],
        [
          "yn",
          "DO YOU WANT TO GO OUTSIDE FOR A MINUTE?",
          "outside"
        ],
        [
          "yn",
          "NEED SOME AIR?",
          "outside"
        ]
      ],
      "a": {
        "loud": [
          "I KNOW!",
          "LET'S GET SOME AIR!",
          "WE CAN TALK OUTSIDE!"
        ],
        "outside": [
          "YEAH, LET'S GO!",
          "GIVE ME A MINUTE!",
          "AFTER THIS SONG!"
        ]
      },
      "n": [
        {
          "k": "loud",
          "say": [
            "YEAH, LET'S GO OUT FOR A MINUTE!"
          ],
          "re": [
            "I'M COMING!",
            "RIGHT BEHIND YOU!"
          ]
        },
        {
          "k": "outside",
          "say": [
            "I'LL WAIT FOR YOU!"
          ],
          "re": [
            "OKAY!",
            "THANKS!"
          ]
        }
      ]
    },
    {
      "id": "ride",
      "q": [
        [
          "how",
          "HOW ARE WE GETTING HOME?",
          "home"
        ],
        [
          "how",
          "WHAT'S THE PLAN FOR GETTING BACK?",
          "home"
        ],
        [
          "who",
          "WHO'S DRIVING?",
          "driver"
        ],
        [
          "who",
          "DID ANYONE AGREE TO DRIVE?",
          "driver"
        ]
      ],
      "a": {
        "home": [
          "WE CAN CALL A RIDE!",
          "I'M TAKING A CAB!",
          "WE STILL NEED TO FIGURE THAT OUT!"
        ],
        "driver": [
          "NOBODY, AS FAR AS I KNOW!",
          "I THOUGHT WE WERE GETTING A CAB!",
          "I DON'T THINK ANYONE'S DRIVING!"
        ]
      },
      "n": [
        {
          "k": "home",
          "say": [
            "LET'S SORT IT OUT BEFORE WE LEAVE!"
          ],
          "re": [
            "YEAH!",
            "GOOD IDEA!"
          ]
        },
        {
          "k": "driver",
          "say": [
            "LET'S BOOK A RIDE THEN!"
          ],
          "re": [
            "YEAH!",
            "OKAY!"
          ]
        }
      ],
      "back": [
        "We need to arrange a way home."
      ],
      "backRe": [
        "I'll try to call someone.",
        "We can call a ride once we're clear."
      ]
    }
  ]
};

const PERSONA_ANS = {
  "rude": {
    "when": [
      "I don't know. Check it yourself.|unsure",
      "Ask someone else.|unsure"
    ],
    "where": [
      "How should I know?|unsure",
      "No idea.|unsure"
    ],
    "yn": [
      "I haven't checked.|unsure",
      "I don't know.|unsure"
    ],
    "what": [
      "Ask someone else.|unsure",
      "No clue.|unsure"
    ],
    "how": [
      "I don't know.|unsure",
      "Couldn't tell you.|unsure"
    ],
    "who": [
      "No idea.|unsure",
      "I haven't asked.|unsure"
    ],
    "say": [
      "What do you want me to do about it?|unsure",
      "Okay. I heard you.|unsure"
    ]
  },
  "quiet": {
    "when": [
      "Not sure.|unsure",
      "I don't know.|unsure"
    ],
    "where": [
      "Not sure.|unsure",
      "I haven't checked.|unsure"
    ],
    "yn": [
      "I'm not sure.|unsure"
    ],
    "what": [
      "I don't know.|unsure",
      "Not sure.|unsure"
    ],
    "how": [
      "Not sure.|unsure",
      "I don't know.|unsure"
    ],
    "who": [
      "No idea.|unsure",
      "I'm not sure.|unsure"
    ],
    "say": [
      "Yeah.|unsure",
      "Mm.|unsure",
      "Okay.|unsure"
    ]
  },
  "distracted": {
    "yn": [
      "Sorry, I didn't catch that.|unsure"
    ],
    "when": [
      "Sorry, I'm not sure.|unsure",
      "I wasn't listening, sorry.|unsure"
    ],
    "where": [
      "Sorry, I didn't hear you.|unsure"
    ],
    "what": [
      "Sorry, I missed that.|unsure",
      "I wasn't listening.|unsure"
    ],
    "how": [
      "I didn't catch that, sorry.|unsure",
      "I'm not sure.|unsure"
    ],
    "who": [
      "I missed what you said.|unsure",
      "No idea, sorry.|unsure"
    ],
    "say": [
      "Sorry, I was looking at something.|unsure",
      "Sorry, I missed that.|unsure"
    ]
  },
  "funny": {}
};

const PERSONA_K = [
  [
    "rude",
    0.3
  ],
  [
    "quiet",
    0.4
  ],
  [
    "distracted",
    0.22
  ],
  [
    "funny",
    0.15
  ]
];

const SWITCH = {
  "q": [
    "Oh, before I forget.",
    "By the way.",
    "Hey."
  ],
  "say": [
    "Anyway.",
    "Oh, before I forget.",
    "By the way."
  ]
};

const CONVO_RESUME = [
  "Anyway, I was saying.",
  "Where were we? Oh, yeah.",
  "Before that happened, I was saying.",
  "Right, back to what I was saying."
];

const CONVO_LOST = [
  "I can't remember what I was saying.",
  "I've completely lost my train of thought.",
  "I don't feel like talking about it now.",
  "Let's leave it for now."
];

const CONVO_LOST_RE = [
  "That's okay.",
  "We can talk later.",
  "Take your time.",
  "Don't worry about it."
];

const DOING = {
  "dog": [
    "Easy, buddy.",
    "Come on, this way.",
    "Good dog.",
    "Stay close.",
    "Come here a second."
  ],
  "dance": [
    "I love this bit!",
    "This song's good!",
    "Come on!",
    "One more song.",
    "I'm staying for this one."
  ],
  "flashlight": [
    "I need to see where I'm going.",
    "Let me check over here.",
    "I should bring spare batteries next time."
  ],
  "winter": [
    "My hands are cold.",
    "I should've worn gloves.",
    "Need to get somewhere warm.",
    "I need a warmer coat."
  ],
  "autumn": [
    "I should bring an extra layer.",
    "Need to clear the leaves at home.",
    "I need to check the weather later."
  ],
  "spring": [
    "It's nice being out again.",
    "I should get outside more.",
    "Hope the weather holds."
  ],
  "summer": [
    "I need more water.",
    "I could use some shade.",
    "It's hot out here."
  ],
  "night": [
    "I need to watch where I'm walking.",
    "It's hard to see out here.",
    "I should head back soon."
  ]
};

const WEATHER_TALK = {
  "freezing": [
    {
      "id": "wx-freeze",
      "q": [
        [
          "say",
          "My fingers are freezing.",
          "cold"
        ],
        [
          "say",
          "I should've worn gloves.",
          "cold"
        ],
        [
          "yn",
          "Does it feel colder to you?",
          "colder"
        ],
        [
          "yn",
          "Is it getting colder?",
          "colder"
        ]
      ],
      "a": {
        "cold": [
          "Let's get somewhere warm soon.",
          "Mine are cold too.",
          "Keep your hands in your pockets."
        ],
        "colder": [
          "Feels like it.",
          "I'm definitely feeling it now.",
          "Hard to tell. I've been cold the whole time."
        ]
      },
      "n": [
        {
          "k": "cold",
          "say": [
            "I don't want to stay out much longer."
          ],
          "re": [
            "We can head back.",
            "Me neither."
          ]
        }
      ],
      "back": [
        "I still need to get somewhere warm."
      ],
      "backRe": [
        "Let's keep moving.",
        "We'll find somewhere warm."
      ]
    },
    {
      "id": "wx-ice",
      "q": [
        [
          "say",
          "Watch your footing.",
          "careful"
        ],
        [
          "say",
          "Be careful walking here.",
          "careful"
        ],
        [
          "yn",
          "Did you slip earlier?",
          "slip"
        ],
        [
          "yn",
          "Was that you slipping back there?",
          "slip"
        ]
      ],
      "a": {
        "careful": [
          "I will.",
          "Thanks.",
          "I'm taking it slowly."
        ],
        "slip": [
          "A little, but I'm okay.",
          "Caught myself.",
          "Nearly, but I stayed up."
        ]
      },
      "n": [
        {
          "k": "careful",
          "say": [
            "I don't want to fall out here."
          ],
          "re": [
            "Me neither.",
            "Just take your time."
          ]
        },
        {
          "k": "slip",
          "say": [
            "Be careful."
          ],
          "re": [
            "I will.",
            "Yeah, I'm slowing down."
          ]
        }
      ]
    }
  ],
  "winter": [
    {
      "id": "wx-snow",
      "q": [
        [
          "yn",
          "Think we'll get more snow?",
          "more"
        ],
        [
          "yn",
          "Are we getting more snow, do you think?",
          "more"
        ],
        [
          "say",
          "I like how it looks with the snow.",
          "love"
        ],
        [
          "say",
          "It's nice seeing the snow out here.",
          "love"
        ],
        [
          "when",
          "When do you think the snow will melt?",
          "melt"
        ],
        [
          "when",
          "How long do you think this snow will last?",
          "melt"
        ]
      ],
      "a": {
        "more": [
          "I haven't checked.",
          "It might.",
          "I'm not sure."
        ],
        "love": [
          "It is pretty.",
          "Yeah, before it turns to slush.",
          "I like it until I have to clear it."
        ],
        "melt": [
          "Depends if it warms up.",
          "Could be a while.",
          "I haven't checked the weather."
        ]
      },
      "n": [
        {
          "k": "more",
          "say": [
            "I'll check the forecast later."
          ],
          "re": [
            "Let me know.",
            "Good idea."
          ]
        }
      ],
      "back": [
        "I'd like to get out of the cold."
      ],
      "backRe": [
        "Let's keep moving.",
        "We'll find somewhere warm."
      ]
    }
  ],
  "autumn": [
    {
      "id": "wx-leaves",
      "q": [
        [
          "say",
          "There's leaves everywhere now.",
          "leaves"
        ],
        [
          "say",
          "The leaves have really started falling.",
          "leaves"
        ],
        [
          "yn",
          "Is it getting dark earlier?",
          "dark"
        ],
        [
          "yn",
          "Have you noticed how early it gets dark?",
          "dark"
        ]
      ],
      "a": {
        "leaves": [
          "Yeah, happened quickly.",
          "Feels like the year went fast.",
          "I like this time of year."
        ],
        "dark": [
          "Yeah, much earlier.",
          "I keep noticing it after work.",
          "Feels like we've lost half the day."
        ]
      },
      "n": [
        {
          "k": "leaves",
          "say": [
            "I need to clear the ones at home."
          ],
          "re": [
            "Me too.",
            "There's always more the next day."
          ]
        }
      ]
    },
    {
      "id": "wx-chilly",
      "q": [
        [
          "say",
          "It's getting chilly.",
          "chilly"
        ],
        [
          "say",
          "I should've brought another layer.",
          "chilly"
        ],
        [
          "yn",
          "Did you bring a jacket?",
          "jacket"
        ],
        [
          "yn",
          "Have you got something warmer with you?",
          "jacket"
        ]
      ],
      "a": {
        "chilly": [
          "We can head back soon.",
          "I'm feeling it too.",
          "Keep moving, that'll help."
        ],
        "jacket": [
          "Left it at home.",
          "Yeah, in my bag.",
          "Just this."
        ]
      },
      "n": [
        {
          "k": "chilly",
          "say": [
            "I'm bringing a warmer coat next time."
          ],
          "re": [
            "Good idea.",
            "Me too."
          ]
        },
        {
          "k": "jacket",
          "say": [
            "I wasn't expecting it to cool down so much."
          ],
          "re": [
            "Neither was I.",
            "It changes quickly."
          ]
        }
      ]
    }
  ],
  "spring": [
    {
      "id": "wx-spring",
      "q": [
        [
          "say",
          "It's nice to get out again.",
          "outside"
        ],
        [
          "say",
          "I've missed being outside.",
          "outside"
        ],
        [
          "yn",
          "Think it'll rain later?",
          "rain"
        ],
        [
          "yn",
          "Do you think we'll get rain later?",
          "rain"
        ]
      ],
      "a": {
        "outside": [
          "Me too.",
          "It's good to get a walk in.",
          "I needed this."
        ],
        "rain": [
          "I haven't checked.",
          "I'm not sure.",
          "Wouldn't surprise me."
        ]
      },
      "n": [
        {
          "k": "outside",
          "say": [
            "We should do this more often."
          ],
          "re": [
            "Yeah, when we're both free.",
            "I'd like that."
          ]
        },
        {
          "k": "rain",
          "say": [
            "I brought an umbrella just in case."
          ],
          "re": [
            "Good thinking.",
            "Better to have it."
          ]
        }
      ]
    }
  ],
  "summer": [
    {
      "id": "wx-heat",
      "q": [
        [
          "say",
          "It's so hot.",
          "hot"
        ],
        [
          "say",
          "I'm sweating through my shirt.",
          "hot"
        ],
        [
          "yn",
          "Did you put sunscreen on?",
          "sun"
        ],
        [
          "yn",
          "Are you wearing sunscreen?",
          "sun"
        ]
      ],
      "a": {
        "hot": [
          "We should find some shade.",
          "Me too.",
          "Make sure you've got water."
        ],
        "sun": [
          "Yeah, before I left.",
          "No, I forgot.",
          "I need to put more on."
        ]
      },
      "n": [
        {
          "k": "hot",
          "say": [
            "I'd like a cold drink."
          ],
          "re": [
            "Same.",
            "We can stop and get one."
          ]
        },
        {
          "k": "sun",
          "say": [
            "I brought some if you need it."
          ],
          "re": [
            "Thanks.",
            "I'll keep that in mind."
          ]
        }
      ]
    }
  ],
  "warmNight": [
    {
      "id": "wx-night",
      "q": [
        [
          "say",
          "It's nice out tonight.",
          "nice"
        ],
        [
          "say",
          "I'm glad it cooled down a bit.",
          "nice"
        ],
        [
          "yn",
          "Still feels warm, doesn't it?",
          "warm"
        ],
        [
          "yn",
          "Is it still warm to you?",
          "warm"
        ]
      ],
      "a": {
        "nice": [
          "Yeah, better than earlier.",
          "Nice to be out without the sun.",
          "I could stay out for a while."
        ],
        "warm": [
          "Yeah, hasn't cooled down much.",
          "A little.",
          "Better than earlier, at least."
        ]
      },
      "n": [
        {
          "k": "nice",
          "say": [
            "We should take evening walks more often."
          ],
          "re": [
            "Yeah.",
            "I'd like that."
          ]
        }
      ]
    }
  ]
};

function weatherTalk() { // which of the above fits right now: season, then how cold this hour actually is
  const m = MAPS[mapIdx]; if (!m || m.indoor || m.space || !season) return [];
  const h = (typeof tod === 'number' ? tod : 12) % 24, night = h < 6.5 || h > 20, id = season.id;
  if (id === 'winter') return [...WEATHER_TALK.winter, ...(night || h < 9 ? WEATHER_TALK.freezing : [])];
  if (id === 'autumn') return WEATHER_TALK.autumn.concat(night ? WEATHER_TALK.freezing.slice(0, 1) : []);
  if (id === 'summer') return night ? WEATHER_TALK.warmNight : WEATHER_TALK.summer;
  return WEATHER_TALK.spring;
}
/* ---- compile: tags parsed once, "?" answers marked as questions, every topic checked for follow-ups that can never fire ---- */
const parseTagged = s => { const [text, tags] = s.split('|'); const t = tags ? tags.split(' ') : []; if (/\?$/.test(text) && !t.includes('ask') && !t.includes('rq')) t.push('ask'); return { text, tags: t }; }; // rq: a rhetorical or tentative question ("Already?", "Maybe noon?") that needs no answer
const splitKeys = s => s ? s.split(' ') : null;
function compileTopic(tp) {
  if (tp.compiled) return tp; tp.compiled = true;
  tp.q = tp.q.map(([type, text, key]) => ({ type, text, key: key || type }));
  const A = {}; for (const k in tp.a || {}) A[k] = tp.a[k].map(parseTagged); tp.A = A;
  const node = n => ({ k: n.k === '*' || !n.k ? null : splitKeys(n.k), t: splitKeys(n.t), by: n.by, say: [].concat(n.say), re: (n.re || []).map(parseTagged), then: (n.then || []).map(node) });
  tp.N = (tp.n || []).map(node);
  tp.B = (tp.back || []).map(s => { const [text, req] = s.split('|'); return { text, req }; });
  return tp;
}
for (const k in TALK) TALK[k].forEach(compileTopic);
for (const k in WEATHER_TALK) WEATHER_TALK[k].forEach(compileTopic);
for (const k in PERSONA_ANS) for (const t in PERSONA_ANS[k]) PERSONA_ANS[k][t] = PERSONA_ANS[k][t].map(parseTagged);

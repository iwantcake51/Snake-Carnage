# Snake: Carnage — polish pass plan (v1.12)

Each box gets ticked as soon as that piece is done and checked in a headless run.

## 1. Critical fixes / UX
- [x] Buttons not clickable: drop CSS `zoom` (hit-testing breaks in Firefox/Safari/older Chrome) and scale UI with transforms; stop clickable buttons from floating
- [x] Challenge reset no longer opens the pause menu
- [x] Pause menu fits without scrolling
- [x] Resume prompt (WASD / arrows) centered; fades out if you pause again
- [x] Visible paused-game effect on the board
- [x] Time of day frozen until the snake actually starts moving
- [x] Themed scrollbars everywhere
- [x] Modifier menu: bigger, multi-column, no side scrollbar
- [x] Tooltips (map challenges, modifiers, mod bar) never clipped under the game window
- [x] Corner HUD fades to ~50% when the snake gets close
- [x] Speed selector removed (speed is now an upgrade)
- [x] Smaller level-up banner
- [x] XP bar shows current / needed XP
- [x] Blood/score readout aligned on the bar (drawn icons instead of emoji, baseline-aligned)
- [x] Outlines get pixelated with the rest of the picture
- [x] "Strong outlines" reworked into "Map outlines" (Off / Subtle / Strong)
- [x] Full mobile support: touch steering, pause/NV buttons, responsive layout

## 2. Modifiers
- [x] Shuffle rolls a lot more modifiers
- [x] Hovering a modifier explains exactly what it does
- [x] New "Free movement" modifier (any angle, not 8-way) with optional mouse-follow toggle

## 3. Challenges / progression
- [x] Permanent, harder per-map challenges
- [x] Permanent profile-wide challenges (more of them)
- [x] Challenges sorted easiest → hardest
- [x] Secret challenges (shown as secret, with clues in-game)
- [x] End-of-run summary: unlocks, XP/level progress, challenges done, every target type eaten with counts, animated
- [x] Title tooltips: how it was earned + date/time unlocked

## 4. Shop / cosmetics
- [x] Real previews for hats, eyes, trails, themes, card styles, effects (no emoji on the head)
- [x] Preset colors get real names

## 5. Upgrades / abilities
- [x] Upgrades screen bought with chips (level-gated)
- [x] Speed upgrades
- [x] Battering ram: break through desks, tables, benches, fences, consoles…
- [x] Abilities (dash, camouflage, scent) built as data so they can be synced in multiplayer later

## 6. AI dialogue
- [x] Conversation memory: follow-up lines that refer to what was just said ("What are we running from?" → "OH FUCK, THAT'S WHAT.")
- [x] Action lines (*spits blood* "Ew, what the fuck?") and lasting state (blood in mouth, reacting later)
- [x] Map-aware lines: open maps, indoor maps, space, alien gibberish

## 7. Eating / gibs / blood
- [x] Gibs drawn under the snake
- [x] Golden targets → golden gibs; aliens → green blood + green gibs
- [x] Brief blood mist on every kill
- [x] Meatier eating sounds
- [x] Gib physics kept (bounce, slide, trail, landing splat, wall deflection)

## 8. Combo UI
- [x] Smaller layout: number box on the right, list beside it, timer line underneath
- [x] Shakes harder as the combo grows
- [x] Breaks apart, pieces fall and fade when lost
- [x] Higher combos drain faster, with a cap

## 9. Golden targets
- [x] Notifications pop in and stack instead of replacing each other
- [x] Circular timer ring around every golden target
- [x] Ring expands and pops when time runs out; target turns back to normal

## 10. Animals
- [x] Redrawn animals
- [x] Frogs and bunnies hop: sprite grows, shadow shrinks at the top of the hop

## 11. Maps
- [x] Space maps rebuilt to look believable; all sound muffled on space maps
- [x] Aliens never share a map with humans; aliens act like people (gibberish, green blood/gibs)
- [x] Astronauts use helmet lights, not handheld flashlights
- [x] Alien Facility rewritten: no water, real enterable rooms, even and deliberate lighting
- [x] New indoor red-light map
- [x] New disco / club map
- [x] Open Field: no campfires, dirt trails, fireflies (glow without lighting the map, bleed when eaten)
- [x] Pool: concrete barriers removed
- [x] Other maps reworked to look designed (Town, Office, Farm, Park, Meadow, Checkerboard, Maze)

## 12. Lighting / performance
- [x] Lighting optimized: nearest/visible lights get dynamic shadows, the rest use baked masks
- [x] No light where there is no source (every fixed light has a visible fixture, windows only on real walls)
- [x] Flashlight flicker fixed
- [x] Graphics options: lighting quality, dynamic shadows, particles/effects
- [x] Insects around lamps; they scatter and fade when the lamp breaks

## 13. Time modes
- [x] Loading screen shows the time of day
- [x] Time modes: Dynamic, Daytime, Dawn, Dusk, Night

## 14. Overall polish
- [x] Remove generic / placeholder-looking UI bits, tighten spacing and styling (drawn tab icons, Excel-palette buildings replaced, real item previews)
- [x] Version bumped to 1.12

---

# Round 2

## Bugs
- [x] Frame loop can never die (an error in one frame used to freeze the game and leave the old frame on screen for the next run)
- [x] New run fully resets the previous render/game state
- [ ] Light poles can never freeze/soft-lock the run

## UI / themes / menus
- [ ] Themes recolor the whole UI (XP bar, menus, accents, buttons, notifications)
- [ ] Map name removed from the top bar
- [ ] Selected map glows clearly
- [ ] Parallax on the menus
- [ ] Crashed/summary panel scrolls and never clips
- [ ] "Move to begin" prompt matches the unpause key prompt
- [ ] Challenge HUD fades to ~50% a few seconds into the round
- [ ] Notifications fade when the snake heads toward them, and never overlap
- [ ] ? / ! marks pop in smoothly, stay small

## Modifiers
- [ ] Random runs: modifiers show at the bottom, then float up one by one and fade
- [ ] Clicking a modifier chip jumps to it in the modifier menu
- [ ] Incompatible modifiers greyed out with the reason
- [ ] Time-based modifiers removed
- [ ] "People spot the snake" moved from Settings to a modifier

## Maps
- [ ] Every map reworked again: laid out like the real place, room to turn and coil (it's Snake: long open runs, no tight dead ends)
- [ ] Meadow: one connected trail network, swaying grass, campsite by the lake
- [ ] Moon: rover tracks no longer run through the base
- [ ] People already walking along paths at the start, some with dogs

## Dialogue / AI
- [ ] Pool idle chatter; astronaut-specific lines; no blood-in-mouth or vomiting for astronauts
- [ ] Longer back-and-forth conversations, survivors talking afterwards
- [ ] Personality traits (funny, jumpy, calm, nervous, brave, pessimist, talkative, quiet) change panic and lines
- [ ] Hiss II: stronger stun, victims slowed, "I can't hear", slurred speech for a while
- [ ] Vomit is visible (stream + puddle), with a setting to turn it off

## Blood / impact
- [ ] Brief hit-stop on the eaten target
- [ ] Snake blood trails more visible
- [ ] Blood keeps its type everywhere (red / gold / alien green) and mixes when crossed; no silent fallback to red
- [ ] Gold ring pop only shows if you can see it

## Shadows / outlines / lights
- [ ] Object shadows more believable
- [ ] Snake shadow square-ish
- [ ] Outlines follow hopping sprites; fireflies never outlined
- [ ] Dropped flashlights flicker briefly then die; no flicker in normal use
- [ ] Fireflies cosmetic only: not edible, never flicker, visible at night
- [ ] Lamp bugs only at night, gathering gradually; still scatter

## Breakables
- [ ] Breakable objects clearly outlined
- [ ] Smashing slows the snake with a desaturated, edge-blurred stun that fades; people comment
- [ ] Big objects get damaged sprites and break in sections instead of vanishing

## Upgrades / skills
- [ ] Skill HUD with ready state and radial cooldown border
- [ ] Skills start each round on cooldown
- [ ] Holding a skill key no longer spams its sound
- [ ] Higher max levels where it fits; Muscle renamed Speed Demon
- [ ] Camouflage visibly changes the snake
- [ ] Scent reworked to be genuinely useful

## Balance
- [ ] Challenge tiers re-checked against what they actually require

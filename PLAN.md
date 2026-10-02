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
- [ ] Blood/score readout aligned on the bar
- [x] Outlines get pixelated with the rest of the picture
- [x] "Strong outlines" reworked into "Map outlines" (Off / Subtle / Strong)
- [ ] Full mobile support: touch steering, pause/NV buttons, responsive layout

## 2. Modifiers
- [x] Shuffle rolls a lot more modifiers
- [x] Hovering a modifier explains exactly what it does
- [x] New "Free movement" modifier (any angle, not 8-way) with optional mouse-follow toggle

## 3. Challenges / progression
- [x] Permanent, harder per-map challenges
- [x] Permanent profile-wide challenges (more of them)
- [ ] Challenges sorted easiest → hardest
- [ ] Secret challenges (shown as secret, with clues in-game)
- [x] End-of-run summary: unlocks, XP/level progress, challenges done, every target type eaten with counts, animated
- [ ] Title tooltips: how it was earned + date/time unlocked

## 4. Shop / cosmetics
- [ ] Real previews for hats, eyes, trails, themes, card styles, effects (no emoji on the head)
- [ ] Preset colors get real names

## 5. Upgrades / abilities
- [x] Upgrades screen bought with chips (level-gated)
- [x] Speed upgrades
- [x] Battering ram: break through desks, tables, benches, fences, consoles…
- [x] Abilities (dash, camouflage, scent) built as data so they can be synced in multiplayer later

## 6. AI dialogue
- [ ] Conversation memory: follow-up lines that refer to what was just said ("What are we running from?" → "OH FUCK, THAT'S WHAT.")
- [ ] Action lines (*spits blood* "Ew, what the fuck?") and lasting state (blood in mouth, reacting later)
- [ ] Map-aware lines: open maps, indoor maps, space, alien gibberish

## 7. Eating / gibs / blood
- [ ] Gibs drawn under the snake
- [ ] Golden targets → golden gibs; aliens → green blood + green gibs
- [ ] Brief blood mist on every kill
- [ ] Meatier eating sounds
- [ ] Gib physics kept (bounce, slide, trail, landing splat, wall deflection)

## 8. Combo UI
- [ ] Smaller layout: number box on the right, list beside it, timer line underneath
- [ ] Shakes harder as the combo grows
- [ ] Breaks apart, pieces fall and fade when lost
- [ ] Higher combos drain faster, with a cap

## 9. Golden targets
- [ ] Notifications pop in and stack instead of replacing each other
- [ ] Circular timer ring around every golden target
- [ ] Ring expands and pops when time runs out; target turns back to normal

## 10. Animals
- [ ] Redrawn animals
- [ ] Frogs and bunnies hop: sprite grows, shadow shrinks at the top of the hop

## 11. Maps
- [ ] Space maps rebuilt to look believable; all sound muffled on space maps
- [ ] Aliens never share a map with humans; aliens act like people (gibberish, green blood/gibs)
- [ ] Astronauts use helmet lights, not handheld flashlights
- [ ] Alien Facility rewritten: no water, real enterable rooms, even and deliberate lighting
- [ ] New indoor red-light map
- [ ] New disco / club map
- [ ] Open Field: no campfires, dirt trails, fireflies (glow without lighting the map, bleed when eaten)
- [ ] Pool: concrete barriers removed
- [ ] Other maps reworked to look designed (Town, Office, Farm, Park, Meadow, Checkerboard, Maze)

## 12. Lighting / performance
- [ ] Lighting optimized: nearest/visible lights get dynamic shadows, the rest use baked masks
- [ ] No light where there is no source (every fixed light has a visible fixture, windows only on real walls)
- [ ] Flashlight flicker fixed
- [ ] Graphics options: lighting quality, dynamic shadows, particles/effects
- [ ] Insects around lamps; they scatter and fade when the lamp breaks

## 13. Time modes
- [ ] Loading screen shows the time of day
- [x] Time modes: Dynamic, Daytime, Dawn, Dusk, Night

## 14. Overall polish
- [ ] Remove generic / placeholder-looking UI bits, tighten spacing and styling
- [x] Version bumped to 1.12

# Map rework: design pass

This is pass 1 of the map rework: a spatial plan for every built-in map, written before any code changed. Pass 2 is the implementation in `js/05-maps.js`, `js/09-obstacles.js` and `js/38-upgrades.js`.

No outside model was available from the build environment, so this plan was written as its own separate design pass. Each map was:

1. Rendered at 960×640 with a 40 px grid, then studied from the screenshot.
2. Run through a mechanical layout audit, which checks:
   - snake reachability (flood fill at the snake's radius)
   - scrape-through gaps between solids (3–22 px)
   - overlapping solids
   - light fixtures drawn on top of furniture
   - benches or trees in roads, and manholes off roads
   - breakable wall sections within 60 px of an existing doorway in the same wall

The rules the implementation follows are the ones at the top of `05-maps.js`, plus these:

- No unexplained dead ends, and no tiny snake traps.
- Lanes at least 60 px wide and doors at least 80 px wide.
- Lights only where a fixture would really be installed.
- Benches on paths and plazas, never in roads.
- Parking bays aligned, and manholes on road geometry.
- AC units in a mounted row.
- Every building has a reachable entrance.
- Breakable walls open a new route; they never sit beside an existing doorway.
- Never widen a map by copying its own blocks.

Each map keeps its identity, population, theme and lighting opportunities.

---

## Global

**Rooftop AC units.** Flat roofs scattered 2–4 AC units at seeded random spots. That produced overlapping and crooked units, for example two stacked on the Pool changing rooms.

*Plan:* units sit in one aligned row along the roof's long axis.
- The row is inset from the parapet, with equal spacing.
- The count follows the roof's length.
- The vent stays in the far corner.

This fixes every flat roof at once: the shops and supermarket in Town, both Pool buildings, the gas station kiosk and the diner.

---

## Open Field (outdoor, open)

**Identity:** nowhere to hide. Open grass, a couple of hay bales and trees.

**Routes:** none are needed. All of it is open ground, a single connected area.

**Light:** none. The field is meant to go dark at night, which is the risk.

**Verdict:** keep as is. The audit is clean.

## Meadow (outdoor, open)

**Identity:** a lake with a campsite, and dirt trails out to the west and south edges.

**Primary route:** the main trail, from the west edge up to the lake jetty.
**Secondary routes:** the south trail off the main trail, and the camp spur.
**Loops:** open meadow all round, so every trail is also a shortcut.

**Gathering:** the campfire, which has log seats, a bench and the tent.
**Lit area:** the campfire is the only light at night. Everything else is dark: fireflies and nothing more.

**Problem:** two of the north-west wood's trees overlap by 4 px (60,56 and 124,40). The crowns merge into one blob with a pinch notch between them.

*Plan:* nudge the second tree so they touch, rather than interpenetrate.

## Town (outdoor, streets)

**Identity:** a small-town grid.
- Main St runs east–west and crosses Elm St at the crossroads.
- Quiet streets: Hill, Church, Oak, Station and Birch.
- Places: the square with its fountain, the church and graves, the shop row with its service yard, the supermarket lot, the diner lot, the gas station, and houses on Birch Ln.

**Routes:**
- Every block is wrapped in streets, so the whole map is loops.
- The crossroads at Main×Elm is the main intersection.
- Chokepoints are the service yard (one way in from Hill St, one from Church St) and the narrow diner lot.

**Escape routes:** the streets that leave the map edge (Elm north and south, Station south, Oak south).

**Light:**
- Bright: Main St curb lamps every ~120 px, the gas canopy, the diner neon and the market doors.
- Dark: the churchyard, the service yard, the quiet streets, and the backs of the Birch Ln houses.

**Gathering:** the square's benches, the bus stop, the gas forecourt and the market doors.

**Audit:** clean. Bays are one size, manholes sit in roads, and benches are on the lawn edge or in the square.

**Problem:** the AC units on the flat roofs, fixed by the global change.

*Plan:* no layout change. The map already meets every rule.

## Maze (outdoor, procedural)

**Identity:** a hedge maze, regenerated every run. It has a fountain garden in the centre and extra openings, so it has loops.

**Verdict:** its dead ends are the point of a maze and are intentionally risky. The generator already:
- adds `cols × 2` extra openings
- keeps lanes 40 px wide or more
- puts lantern posts only where hedges meet

The three breakable hedges are picked from long hedges, so they always cut through to a neighbouring corridor.

*Plan:* keep as is.

## Farm (outdoor)

**Identity:** red barn and silo, the farmhouse, the shed, the pig pen, the sheep paddock, the crop field and the tractor.

**Routes before the rework:**
- The yard road ran from the pig-pen gate east to the farmhouse, with a branch south to the paddock gate.

**Problems:**
1. The barn doors open onto nothing: no track reaches them.
2. The shed has no track either.
3. One yard lamp stands inside the pig pen, on its fence line.
4. Another lamp stands on bare grass by the paddock fence corner, 150 px from the gate.

**Plan:**
- **Barn lane.** A dirt apron runs out of the barn doors, then a lane along the 40 px strip between the barn and the pen. It joins the yard road at the pen's north-east corner. Walkers use it, so the barn gets traffic.
- **Shed track.** A short track runs from the shed door south to the yard road.
- **Yard lights where a farm has them:**
  - one over the barn doors, on the barn
  - one at the lane–road junction
  - the existing one by the farmhouse door
  - one on the paddock gate post
- **Dark areas:** the crop field and the far paddock stay dark, giving cover for night hunting.
- **Gathering:** the yard junction, between the barn, the road and the tractor.

## Park (outdoor, open)

**Identity:** a city park.
- A loop path round the duck pond.
- Paths in from the west, east and south gates.
- A path to the bandstand, a playground with sand, swings and a slide, and trees.

**Routes:**
- The loop is the main circuit; three gates are the escape routes.
- The bandstand spur is a dead end, but an obvious destination.
- The playground spur also dead-ends at the sandpit.

**Problems:**
1. Two of the lamps stand on open grass, away from any path (232,356 and 740,420).
2. One bench stands in the grass beside the loop, at right angles to it (722,180). Another is set off from the west path.
3. Trees only line the edges, so the middle has no cover at all at night.

**Plan:**
- **Lamps on paths.** Lamps go along the path edges at regular spacing:
  - at each gate
  - at two points on the loop
  - by the playground
  - at the bandstand spur
- **Benches on paths.** Benches go on the path edges, along the path:
  - two on the loop, facing the pond
  - one on the west path near the junction
  - one by the playground for the parents
- **Picnic tables.** Two go on the lawn beside the playground.
- **Groves for cover.**
  - A small grove between the bandstand and the loop gives a dark patch next to the lit path.
  - A pair of trees on the south lawn.
  - Each is placed as a cluster that touches itself, with real gaps (40 px or more) to the paths.

## Pool (outdoor)

**Identity:**
- A lido: the pool on a tiled deck.
- The changing rooms (west building) and the snack bar (east building).
- A lawn with a fountain plaza, and sunbathing umbrellas.

**Routes:**
- The north–south walkway through the deck, with a path from the changing rooms to the deck.

**Problems:**
1. The snack bar has no path to its door.
2. The fountain plaza is cut off from the walkways.
3. Two lamps stand loose in the grass by the lawn bushes.
4. AC units on the roofs overlap (fixed globally).
5. The umbrellas stand alone on the lawn.

**Plan:**
- **Snack bar path.** A paved path from the snack bar's front down to the deck's east side.
- **Fountain path.** A paved path from the south walkway west to the fountain plaza.
- **Lamps.** Move them to the new path junctions, beside the paths.
- **Towels.** Each umbrella gets a towel laid out beside it (flat decor, walk-over), so the lawn reads as a sunbathing area.
- **Unchanged:** the underwater pool lights are intended, and remain as they are.

## Office (indoor)

**Identity:**
- Top row: reception, the glass boardroom and the corner office.
- A central corridor with EXIT signs at both ends.
- Bottom row: the open-plan floor with desk pods, a printer and the kitchen.

**Routes:**
- The corridor is the spine; every room has a door onto it.
- The boardroom's glass walls shatter for anyone who hits them, a pane at a time, so the boardroom opens straight into reception and the corner office.
- The kitchen has a corridor door and a second door into the open plan, so open plan, kitchen and corridor form a loop.

**Problems:**
1. The breakable section in the corner office's corridor wall sits 18 px from the office door.
2. The breakable section in the kitchen divider sits 16 px from the divider door.
3. The open-plan ceiling panels hang half over the desk pods, off the aisle grid.

**Plan:**
- **Corner office.** Move its door to the east end of the corridor wall. The breakable section then sits mid-wall, 90 px or more from any door: a second way into the office from the corridor.
- **Kitchen divider.** Move the divider door up to y 390–480. The breakable section goes in the lower run, 70 px from the door, giving a second route between the open plan and the kitchen.
- **Panel grid.** The panels follow the aisles between pods: two columns over the aisles, two rows over the pod rows, plus one over the printer and kitchen aisle.
- **Pendants stay.** The boardroom and kitchen pendants stay over their tables, which is where real offices hang them.

## Checkerboard (abstract)

**Identity:** an abstract checker floor with a few blocks.

**Verdict:** the audit is clean. Keep as is.

## Moon (outdoor, space)

**Identity:**
- A lunar base: hub dome, two modules on tubes, the landing pad, solar arrays and a rover.
- The rover tracks loop round the south of the base to the pad.

**Light:**
- Floodlight masts by the base, the arrays and the pad.
- The far craters and the south-west are dark.

**Verdict:** masts already sit by the structures and the track. The audit is clean. Keep as is.

## Mars (outdoor, space)

**Identity:** greenhouse, habitat and lab dome on a pressurized line, a return rocket on a scorched pad, and a rover.

**Problem:** one floodlight mast stands in the open at (700,450), 120 px from the rover track and from any structure.

*Plan:* move it to stand beside the track's bend toward the pad, so the masts light the rover route from the garage to the rocket.

## Alien Facility (indoor)

**Identity:**
- Top row: the specimen lab, the control room and the cryo bay.
- A wide hall.
- Bottom row: the hangar with the saucer, and the reactor room.

**Routes:**
- The hall is the spine; every room has a door.
- The breakable walls should loop the rooms.

**Problems:**
1. One breakable section is in the hall wall into the reactor room, 70 px from that room's existing door: a redundant second door.
2. The control room's ceiling strip hangs straight over the hologram table.

**Plan:**
- **Breakables loop the top row.** Move the hall-wall section into the wall between the control room and the cryo bay. With the lab–control section, the whole top row can then be looped once both are broken. Keep the hangar–reactor section.
- **Control room strip.** Move it to the clear floor in front of the consoles.

## Space Station (indoor, space)

**Identity:** the command module in the middle, a corridor ring with windows onto space, and four corner bays: hydroponics, crew quarters, galley and the airlock with its suits.

**Problems:**
1. **Bays not enclosed.** Each bay was just two wall stubs, so it was open on two sides. That gave no sense of rooms, and the three breakable sections opened rooms that were already open.
2. **Lights on furniture.** Three ceiling strips sit over a plant rack, a bunk and the galley table.

**Plan:**
- **Enclosed bays.** Each corner bay becomes a room:
  - a full wall toward the side hall (west or east)
  - a wall toward the top or bottom hall, with a 100 px door at its inner end
- **Breakables.** Each bay gets one breakable section mid-way along its side-hall wall. Breaking it gives the bay a second exit, and loops bay → hall → ring.
- **Sizes stay.** The ring corridor stays 80 px or more wide everywhere.
- **Strips off furniture.** The strips move to the aisles between the racks, below the bunks and above the galley table.

## Bunker (indoor)

**Identity:**
- Top row: barracks, the mess hall and stores.
- Bottom row: the generator room, comms and the med bay.
- One corridor between them; lockdown runs go red.
- The corridor's painted floor (dark concrete, hazard-striped edges, dashed center line) is a `hazard` floor detail, and the generator cables are two editable path shapes. Both can be moved, reshaped or resized in the editor without touching the floor painting.

**Routes:**
- The corridor spine, with a door into every room.
- The four breakables, one per shared wall, loop each pair of neighbouring rooms.

**Problems:**
1. The mess/stores breakable ends 10 px above the stores shelving, making a notch no one fits through.
2. The med bay lamp hangs over a cot.

**Plan:**
- **Breakable.** Raise the mess/stores breakable so it leaves a 40 px or more gap to the shelf.
- **Med bay lamp.** Move it to the aisle between the two cots.

## Club (indoor)

**Identity:** a nightclub.
- The DJ stage up top.
- The dance floor with its lights.
- The bar along the west wall.
- Booths along the east wall.
- The entrance with the velvet rope at the bottom.

**Routes:** one room with pillars, so it is all loops. The entrance is the escape route.

**Verdict:** the audit is clean. Keep as is.

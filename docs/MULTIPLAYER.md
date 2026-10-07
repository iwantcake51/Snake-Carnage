# Multiplayer

Private games for a few friends, 2 to 8 players (built and tested for 2–4). Never PvP: snakes pass through each other, and everyone hunts the same crowd. In the competitive modes you only race each other for it.

## Modes

The host picks one in the lobby.

| Mode | Who wins | Lives | Length |
|---|---|---|---|
| **Co-op** | Everyone together; the team score is what counts | One shared pool: 3 + number of players | No limit by default |
| **Free for all** | The best score | 3 each | 5 minutes by default |
| **Teams** (2, 3 or 4 teams) | The team with the most score (members' scores added up) | One pool per team: 2 + its players | 5 minutes by default |

- Round length can be set to no limit, 3, 5, 8 or 10 minutes in any mode.
  - The clock is real time and starts when the first player moves.
  - A run also ends when everyone is out of lives, or when the host ends it.
- **Teams:** everyone is put on the smallest team when they join. A player can tap their team chip to switch, and the host can move anyone.
  - In the run, each snake wears a ring in its team's color, and the score panel groups players under their team.
- **Results:** the scoreboard names the winner (or a draw) and the round's **MVP**: the best score, with what they led in (most eaten, best combo, most golden, most people). Free for all ranks the players; Teams lists each team with its total above its members.

## Playing

- **Host:** main menu → **Play with friends** → enter a name → **Host**. Share the 6-character code, or use **Copy invite link** (`…/?join=CODE`).
- **Join:** **Play with friends** → type the code → **Join**, or open the invite link. Friends you've played with show up under **Played with recently**; tap one to join their last lobby.
- **Lobby:**
  - The host picks the mode, the map, the time of day, the round length, the respawn time and the modifiers, and everyone plays with them.
  - Everyone presses **Ready** (or **Space**), the host included. A glowing dot next to each name shows it: green for ready, red for not yet. The host's **Start** unlocks only once every player is ready; once it has, the host's **Space** starts the run too.
  - Starting closes the screen to black for everyone, like a pair of shutters meeting on a red seam with the mode and map name, and opens it on the new world once it has loaded.
  - The host can kick players. Name tags and off-screen arrows can be switched off.
- **Lives:**
  - A death costs one life from your pool (see Modes). You're back after the respawn time (5 seconds by default; the host can pick 3, 5, 8, 10 or 15), with 1.5 seconds of grace.
  - Dying: your snake bursts into blood, chunks and coils of gut on every player's screen, scaled by each player's own blood settings. The spray stains whoever and whatever it hits: people, walls, the floor and other players' snakes.
  - Your screen jolts, your view drains to grey under a red wash within half a second, and the camera slowly pulls out to the whole map while a **You died** banner counts down. As you come back, the color and your own zoom fade back in.
  - With no lives left you watch someone else, a teammate first. The run ends when everyone is out, when the time runs out, or when the host ends it from the pause menu.
- **Pause:** pausing doesn't stop the world. It opens a small menu (Resume, Settings, Leave co-op, and End run for the host). Settings opened from it close straight back to the game, with Done or Esc.
- **End of run:**
  - A scoreboard for every player plus team totals (per team in Teams): score, eaten, people, animals, best combo, golden, deaths, XP and chips, with the MVP called out above it.
  - Everyone readies up again (ready dots on the scoreboard too). The host can **Play again** once all are ready, or **Return to lobby**, **Change map**, **Change modifiers** or **Kick**. Guests can **Ready** or **Leave lobby**.
  - The lobby stays open between runs.

## Progression

- Each player earns their own XP, chips, challenge progress and achievements from their own kills, with the same code as single player. Every kill has an id and is paid once, to the player the host credited it to.
- Challenges marked **Team** (panic, quiet panic, scream chain) read the shared crowd, so the whole team works on them together. Each player's own copy completes once and pays once. In free for all and Teams the same challenges are marked **Shared**: anyone's chaos counts.
- Everything else counts only what you do yourself.

## How it works

- **Files:** `js/40c-net-core.js` (connections, lobby, reconnects, host migration), `js/40d-net-sync.js` (the shared world), `js/40e-net-ui.js` (screens, name tags, team HUD, scoreboard).
  - Hooks into the rest of the game check `NETM.run`, `AUTH()` (host or single player) or `netIsGuest()`, so single player runs exactly as before.
- **Transport:**
  - WebRTC data channels via PeerJS (vendored at `js/vendor/peerjs.min.js`, loaded only when you open co-op).
  - Each link has a reliable ordered channel for events and lobby messages (JSON; a message over 6 KB is split and rejoined). It also has a raw unordered, no-retransmit channel for binary snapshots.
- **Host authority:**
  - The host runs every NPC, spawn, death, panic, frenzy, golden target, the time of day and the score bookkeeping.
  - Everyone loads the same map from the same seed, so static props, grass and snow match with nothing sent.
  - Each NPC reacts to whichever player is its current threat (the nearest, with hysteresis).
- **Guests:**
  - A guest steers its own snake locally, for zero input lag, and sends its head 20 times a second.
  - When a guest's snake reaches an NPC, the guest plays the kill at once and sends a claim. The host checks it, allowing for latency, and announces the kill.
- **Snapshots:**
  - The host sends 15 binary snapshots a second: player heads, plus 8 bytes per NPC that moved or changed state since that guest's last snapshot (and a few unchanged ones in rotation).
  - Guests draw remote things 110 ms in the past and interpolate, extrapolating briefly through a late packet.
- **Effects:** blood, gibs, mist, pools and sounds are never streamed. A kill event carries where it happened, the direction and the amount, and each screen makes its own.
- **Disconnects:**
  - A guest who drops or reloads mid-run reconnects with a token, gets the same slot back and rejoins the run with a full state sync.
  - If the host leaves, the earliest-joined guest becomes the new host and the others follow them. That run ends, since its world lived on the old host, and the lobby carries on.

## Networks

- **Signalling** (finding each other) uses the free public PeerJS server. Gameplay traffic goes straight between browsers.
- Some networks (strict NAT, some mobile carriers) can't connect browsers directly and need a TURN relay. To add one, run this in the browser console on each device:
  ```js
  localStorage.setItem('snakeCarnageTurn', JSON.stringify({ urls: 'turn:your.turn.server:3478', username: 'user', credential: 'pass' }))
  ```
- **Your own signalling server:** add `?peer=host:port/path` to the page URL; invite links carry it along.

## Testing

- `?netsim=LAT,JITTER,LOSS` (for example `?netsim=150,40,5`) adds latency in ms, jitter in ms and percent loss on the fast channel to every packet the page sends.
- Locally:
  1. Run a PeerServer: `npx peer --port 9000`, or `require('peer').PeerServer({ port: 9000, host: '127.0.0.1' })` if IPv6 isn't available.
  2. Serve the repo over HTTP.
  3. Open `index.html?peer=127.0.0.1:9000/` in several windows.
- All players need the same world width. A phone joining a desktop host reloads once into the host's width; this is automatic.

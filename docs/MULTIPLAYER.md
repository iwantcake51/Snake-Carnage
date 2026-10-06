# Co-op multiplayer

Private co-op for a few friends, 2 to 8 players (built and tested for 2–4). PvE only: snakes pass through each other, and everyone hunts the same crowd.

## Playing

- **Host:** main menu → **Play with friends** → enter a name → **Host**. Share the 6-character code, or use **Copy invite link** (`…/?join=CODE`).
- **Join:** **Play with friends** → type the code → **Join**, or open the invite link. Friends you've played with show up under **Played with recently**; tap one to join their last lobby.
- **Lobby:**
  - The host picks the map, the time of day and the modifiers, and everyone plays with them.
  - Guests press **Ready**. The host's **Start** unlocks once everyone is ready.
  - The host can kick players. Name tags and off-screen arrows can be switched off.
- **Lives:**
  - The team shares 3 + (number of players) lives.
  - A crash costs one life, and you're back 3 seconds later, with 1.5 seconds of grace.
  - With no lives left you watch a teammate. The run ends when everyone is out, or when the host ends it from the pause menu.
- **Pause:** pausing doesn't stop the world. It opens a small menu (Resume, Settings, Leave co-op, and End run for the host).
- **End of run:**
  - A scoreboard for every player plus team totals: score, eaten, people, animals, best combo, golden, crashes, XP and chips.
  - The host can **Play again**, **Return to lobby**, **Change map**, **Change modifiers** or **Kick**. Guests can **Ready** or **Leave lobby**.
  - The lobby stays open between runs.

## Progression

- Each player earns their own XP, chips, challenge progress and achievements from their own kills, with the same code as single player. Every kill has an id and is paid once, to the player the host credited it to.
- Challenges marked **Team** (panic, quiet panic, scream chain) read the shared crowd, so the whole team works on them together. Each player's own copy completes once and pays once.
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

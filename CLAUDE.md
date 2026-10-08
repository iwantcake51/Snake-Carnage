# Snake: Carnage

Browser game, plain HTML/CSS/JS, no build step. Deployed with Netlify.

## Rules for every change

1. **Bump the version by exactly 1.** `GAME_VERSION` sits at the top of `js/01-config.js` (e.g. `'1.3'` → `'1.4'`, `'1.9'` → `'1.10'`). Bump it once per change/PR, not once per commit. It shows in the bottom-left of the main menu.
2. **Ship through a pull request.** Commit to a feature branch, push, and open a PR into the default branch (or update the open one) so Netlify builds it. Don't push straight to the default branch.

## Layout

- `index.html`: the page. It loads `css/style.css`, then `js/01-…js` to `js/NN-…js` **in numeric order**.
- The JS files are classic scripts that share one global scope. Load order matters for top-level code, so when you add a file, give it a number in the right spot and add its `<script>` tag to `index.html`.
- One system per file: `05-maps`, `13-challenges` (map challenges), `14-modifiers`, `18-time-of-day`, `19-light-shadows`, `20-flashlights`, `23-giblets`, `25-dialogue`, `26-creature-ai`, `27-crowds`, `33-update` (main update loop), `34-render` (render and frame loop), `35-notify` (notifications), `36-cosmetics` (shop catalog, lifetime achievements and their cosmetic rewards), `37-shop` (shop UI and custom color picker), `38-upgrades` (upgrades, abilities, battering ram, the `NET` multiplayer hook), `39-progress` (permanent and secret challenges), `40-summary` (end-of-run summary), and so on. Newer ones: `09b-materials` (material layer stacks), `09c-vector-shapes` (editable drawn shapes), `09d-custom-maps` (custom map schema, migrations, compiler), `27b-hearing` (sound events and what people hear, used by Blind crowd), `40b-editor-runtime` (prop definitions and the editor's desktop-only entry), `03b-workers` (Web Worker pool for pure number-crunching such as snow), `03c-dropdown` (turns every `<select>`, game and editor, into the themed ladder dropdown; the real select stays hidden and keeps the value), `35b-perf` (Performance stats panel: per-part frame timings and the "Find what's slow" test), `21b-bloom` (soft glow round props that light up), `38b-destruction` (what breaking a prop looks, sounds and feels like; glass and the prop editor's "When it breaks"; every smash's real chunks of the object, impact flash and shock ring, colored dust), `38c-airstrikes` (outdoor air strikes on the snake's path: markers, jets, blasts, chunks of the real ground thrown up, craters and scorch marks; explosion light at night, the shockwave warp, ear ringing, the jet fly-by and bomb sounds with Doppler and a sky echo; and a snake bursting head to tail into blood in its own two colors when it dies to one, or any death in multiplayer), and multiplayer (co-op, free for all, teams): `40c-net-core` (connections, lobby, modes and teams, reconnects, host migration), `40d-net-sync` (the shared world, lives pools, round clock) and `40e-net-ui` (lobby, name tags, score panel, scoreboard).
- `js/editor/*.js` is the map editor itself. It is not in `index.html`: `40b-editor-runtime.js` loads it on demand, on desktop only (`EDITOR_FILES` lists it in order). `editor.html` is its standalone entry point `ed-qol.js` loads last and wraps ed-core's functions for the quality-of-life layer: command palette (Ctrl+K), smart guides, hover labels, smooth camera, clipboard for every kind of item, named undo, autosave, the prop scatter brush, number scrubbing, and the prop editor's zoom, handles and snapping.
- `js/vendor/` holds third-party code (PeerJS, loaded only when co-op opens).
- Co-op is host-authoritative (`docs/MULTIPLAYER.md`). Code that changes the world (spawning, deaths, panic, noise, scoring the crowd) must run only where `AUTH()` is true (the host, or single player); guests get it from the host. Keep single player working without co-op.
- `docs/MAP_DESIGN.md` holds the per-map layout plan and rules; keep it in step when a map's layout changes.
- `41-boot.js` must stay last: it builds the first menu and starts the frame loop after every other file has loaded.

## Testing

No test suite. Open `index.html` in a browser, or drive it headless with Playwright (Chromium is preinstalled in Claude's cloud env). Check that a night run has no console errors, then look at a screenshot.

For performance, turn on Settings › Graphics › Performance stats (or press F3 in a run). Full mode times the game's own code per part; "Find what's slow" switches each part off for a moment and measures what it really costs, graphics chip included. The pause screen's Performance tab (and Performance in the multiplayer menu) reports the run so far from an always-on recorder: frame-time breakdown, the worst hitches with what was happening (kills, smashing, how much blood and debris), and likely causes. Headless Chromium renders the canvas in software, so its frame times don't reflect a real GPU.

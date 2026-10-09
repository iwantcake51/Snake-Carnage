# Kenney asset packs

Drop [Kenney](https://kenney.nl/assets) packs here, one per pack: the `.zip` as downloaded is fine, or the extracted folder.

Kenney's assets are CC0, so they can ship with the game without credit (the game credits Kenney anyway, in Settings › Controls).

This folder is a source library, not part of the game. Netlify deletes it before publishing (`tools/bundle.mjs`), so whole packs never go up with the site. What the game uses is copied out of here:

- **Sprites and light masks** go into one atlas, `sprites/kenney.png`, so they're a single request. `tools/kenney-atlas.py` builds it from the zips here (run `python3 tools/kenney-atlas.py` from the repo root; it needs Pillow). To use another sprite, add it to `NAMES` there and to `KSPR_NAMES` in `js/03e-sprites.js`, in the same order.
- **Icons** for menus, the shop and the lobby are written into `js/03f-kenney-icons.js` as path data by `tools/kenney-icons.py` (add the name to `UI` or `BOARD` there and run it). Skill tree icons come from game-icons.net instead.
- **Audio** goes into `sounds/`, listed in `sounds/manifest.json`.

In use now:
- Particle Pack: smoke, fire, flame, scorch, dirt, muzzle flash, stars, flare, rings, sparks and a swipe.
- Foliage Sprites: the leaves, the low plants seen from above and the scattered petals.
- Light Masks: a flashlight cone, a lamp's pool, window panes and water caustics.
- Game Icons: multiplayer, star, basket, trophy, gear, wrench, lock and checkmark.
- Board Game Icons: the heart, the crown, the broken heart and the skull.

## Adding packs on GitHub

On the repository page, open this `kenney` folder, choose **Add file › Upload files** and drag the zips (or extracted folders) in. GitHub takes up to 100 files per upload and 25 MB per file there.

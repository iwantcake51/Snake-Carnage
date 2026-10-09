# Kenney asset packs

Drop [Kenney](https://kenney.nl/assets) packs here, one per pack: the `.zip` as downloaded is fine, or the extracted folder.

Kenney's assets are CC0, so they can ship with the game without credit (the game credits Kenney anyway, in Settings › Controls).

This folder is a source library, not part of the game. Netlify deletes it before publishing (`tools/bundle.mjs`), so whole packs never go up with the site. What the game uses is copied out of here:

- **Sprites** go into one atlas, `sprites/kenney.png`, so they're a single request. `tools/kenney-atlas.py` builds it from the zips here (run `python3 tools/kenney-atlas.py` from the repo root; it needs Pillow). To use another sprite, add it to `NAMES` there and to `KSPR_NAMES` in `js/03e-sprites.js`, in the same order.
- **Audio** goes into `sounds/`, listed in `sounds/manifest.json`.

In use now: from the Particle Pack, smoke, fire, flame, scorch, dirt, muzzle flash, star and flare; from Foliage Sprites, the leaves, the low plants seen from above and the scattered petals.

## Adding packs on GitHub

On the repository page, open this `kenney` folder, choose **Add file › Upload files** and drag the zips (or extracted folders) in. GitHub takes up to 100 files per upload and 25 MB per file there.

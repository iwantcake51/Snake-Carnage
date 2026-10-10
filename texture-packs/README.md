# Texture packs

Drop texture packs here, one per pack: the `.rar` as you have it is fine (so are `.zip` and `.7z`, or the extracted folder).

Like `kenney/`, this folder is a source library, not part of the game. Netlify deletes it before publishing (`tools/bundle.mjs`), so whole packs never go up with the site. What the game uses is copied out of here into the folders it loads from (ground and floor textures, sprites), sized and compressed for the game, and loaded from there, never from this folder.

Reading a `.rar` needs no extra program: it's opened with `node-unrar-js` from npm.

In use now (copied to `textures/ground/`, the dirt and the Moon's and Mars's graded to the maps' own colors; blended at random by `js/05e-ground-tex.js`):

- **SBS - Tiny Texture Pack - 128x128**: `Grass_05`, `06`, `08`, `09`, `10`, `16`, `17` and `21`, the grass on Open Field, Meadow, Park and Farm.
- **SBS - Tiny Texture Pack 2**: `Dirt_17`, `Dirt_11` and `Dirt_01` (trails, paths and yard roads), `Dirt_09` (the Farm's soil), `Dirt_03` (its pig pen), `Dirt_05` (the Moon's regolith, made grey) and `Stone_17` (Mars's stony ground).
- **SBS - Tiny Texture Pack 3**: `Terrain_05` and `Terrain_06` (Mars's rust-red rock and dust), `Stone_05` and `Stone_09` (the Moon's paler dust and darker rubble, made grey).
- **Snow003_1K-JPG.zip** ([ambientCG](https://ambientcg.com), CC0): its color and normal maps, baked into `textures/ground/snow_detail.jpg`, the surface of all snow (`js/10-snow.js`).

## Adding packs on GitHub

On the repository page, open this `texture-packs` folder, choose **Add file › Upload files** and drag the `.rar` files in. GitHub takes up to 100 files per upload and 25 MB per file there; for a bigger pack, split it into parts or send it another way.

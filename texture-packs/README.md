# Texture packs

Drop texture packs here, one per pack: the `.rar` as you have it is fine (so are `.zip` and `.7z`, or the extracted folder).

Like `kenney/`, this folder is a source library, not part of the game. Netlify deletes it before publishing (`tools/bundle.mjs`), so whole packs never go up with the site. What the game uses is copied out of here into the folders it loads from (ground and floor textures, sprites), sized and compressed for the game, and loaded from there, never from this folder.

Reading a `.rar` needs no extra program: it's opened with `node-unrar-js` from npm.

In use now: nothing yet.

## Adding packs on GitHub

On the repository page, open this `texture-packs` folder, choose **Add file › Upload files** and drag the `.rar` files in. GitHub takes up to 100 files per upload and 25 MB per file there; for a bigger pack, split it into parts or send it another way.

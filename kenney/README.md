# Kenney asset packs

Drop extracted [Kenney](https://kenney.nl/assets) packs here, one folder per pack, as they come out of the zip:

```
kenney/
  top-down-shooter/
    License.txt
    PNG/...
    Spritesheet/...
  impact-sounds/
    License.txt
    Audio/...
```

Keep each pack's `License.txt`. Kenney's assets are CC0, so they can ship with the game without credit.

This folder is a source library, not part of the game. Netlify deletes it before publishing (`tools/bundle.mjs`), so whole packs never go up with the site. When the game uses a file from a pack, it's copied to where the game loads it from (`sounds/` for audio, listed in `sounds/manifest.json`, and so on) and only that copy ships.

## Adding packs on GitHub

On the repository page, switch to the branch you're working on, open this `kenney` folder, choose **Add file › Upload files** and drag the extracted pack folders in. GitHub takes up to 100 files per upload and 25 MB per file there, so a big pack may need a few uploads (or upload just the parts you want, such as `PNG/` or `Audio/`).

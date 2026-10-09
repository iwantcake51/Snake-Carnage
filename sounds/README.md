# Sound files

The game synthesizes every sound by default. Any recording listed in `manifest.json` replaces (or layers over) the synthesized version. Several files for one name are picked at random each time.

```json
{
  "fuse": ["fuse.ogg"],
  "explosion": ["explosion1.ogg", "explosion2.ogg", "explosion3.ogg"],
  "gore": ["gore1.ogg", "gore2.ogg"],
  "crash": ["crash.ogg"],
  "bite": ["bite1.ogg", "bite2.ogg"]
}
```

| Name | Used for | Notes |
|---|---|---|
| `fuse` | Dead man's switch: the burning fuse | Loops, so a seamless loop works best |
| `explosion` | Bombs, gas pumps, the Dead man's switch blast | The synthesized sub-bass and sky echo still play under it |
| `gore` | A snake or person bursting | |
| `crash` | Hitting a wall | |
| `bite` | Eating, layered over the synthesized bite | |

Use only files you're allowed to ship. CC0 (public domain) is simplest: no credit needed. Good free sources:
- [OpenGameArt](https://opengameart.org), filtered to CC0, for example [Simple fuse sound](https://opengameart.org/content/simple-fuse-sound), [Explosions](https://opengameart.org/content/explosions-4) and [25 CC0 bang / firework SFX](https://opengameart.org/node/92774)
- [Kenney](https://kenney.nl/assets?q=audio): every audio pack is CC0
- [Freesound](https://freesound.org), filtered to the Creative Commons 0 license

Recordings only load when the game is served over http(s) (Netlify, or a local server). Opening `index.html` straight from disk uses the synthesized sounds.

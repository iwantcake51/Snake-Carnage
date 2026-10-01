# Snake: Carnage

Browser game, plain HTML/CSS/JS, no build step. Deployed with Netlify.

## Rules for every change

1. **Bump the version by exactly 1.** `GAME_VERSION` sits at the top of `js/01-config.js` (e.g. `'1.3'` → `'1.4'`, `'1.9'` → `'1.10'`). Bump it once per change/PR, not once per commit. It shows in the bottom-left of the main menu.
2. **Ship through a pull request.** Commit to a feature branch, push, and open a PR into the default branch (or update the open one) so Netlify builds it. Don't push straight to the default branch.

## Layout

- `index.html`: the page. It loads `css/style.css`, then `js/01-…js` to `js/NN-…js` **in numeric order**.
- The JS files are classic scripts that share one global scope. Load order matters for top-level code, so when you add a file, give it a number in the right spot and add its `<script>` tag to `index.html`.
- One system per file: `18-time-of-day`, `19-light-shadows`, `20-flashlights`, `21-streetlights`, `23-giblets`, `25-dialogue`, `26-creature-ai`, `27-crowds`, `33-update` (main update loop), `34-render` (render and frame loop), and so on.

## Testing

No test suite. Open `index.html` in a browser, or drive it headless with Playwright (Chromium is preinstalled in Claude's cloud env). Check that a night run has no console errors, then look at a screenshot.

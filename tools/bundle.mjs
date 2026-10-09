// Deploy-time bundling (Netlify runs this; see netlify.toml). Locally nothing changes: index.html loads every js/NN-*.js
// on its own, as always. For the live site this joins those scripts, in the same order, into one file named by its
// content (js/app.<hash>.js), names the stylesheet the same way, and rewrites index.html to use them, so a visit is two
// requests instead of seventy-odd, and a returning visitor's browser keeps both until the next change (see _headers).
// The sound manifest goes inside the bundle too, so the game doesn't fetch it.
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync('index.html', 'utf8');
const tags = [...html.matchAll(/<script src="(js\/[^"?]+\.js)"><\/script>\n?/g)];
if (!tags.length) { console.log('bundle: no game scripts found in index.html, nothing to do'); process.exit(0); }
const hash = s => createHash('sha256').update(s).digest('hex').slice(0, 12);

// Classic scripts share one global scope, so joining them keeps every top-level name where it was. Only 01-config's
// 'use strict' is dropped: as the first line of one big file it would switch strict mode on for every other file too.
let js = tags.map(([, src]) => `/* ---- ${src} ---- */\n` + readFileSync(src, 'utf8').replace(/^\s*(['"])use strict\1;?/, '')).join('\n;\n');
const man = existsSync('sounds/manifest.json') ? readFileSync('sounds/manifest.json', 'utf8').trim() || '{}' : '{}';
js = `const SOUND_MANIFEST = ${JSON.stringify(JSON.parse(man))};\n` + js;
const jsName = `js/app.${hash(js)}.js`; writeFileSync(jsName, js);

const css = readFileSync('css/style.css', 'utf8'), cssName = `css/style.${hash(css)}.css`; writeFileSync(cssName, css);

let out = html.replace(tags[0][0], `<script src="${jsName}"></script>\n`);
for (const t of tags.slice(1)) out = out.replace(t[0], '');
out = out.replace('href="css/style.css"', `href="${cssName}"`);
writeFileSync('index.html', out);
// kenney/ holds whole asset packs to pick from; only the copies the game loads ship, so the packs stay off the site.
rmSync('kenney', { recursive: true, force: true });
console.log(`bundle: ${tags.length} scripts -> ${jsName} (${(js.length / 1024).toFixed(0)} KB), ${cssName}`);

// Puts edited art in the game for everyone: takes a .zip (or a folder) from Settings › Display › Your art, after the
// pictures in it were edited, and copies the ones that changed into art/, then rewrites art/manifest.json, the list
// the game loads (03h-art; the live build inlines it). A picture as the game drew it (its CRC in the zip's
// originals.json) is left out, so the game keeps drawing that thing itself.
//   node tools/art-apply.mjs art-edits/my-art.zip     copy the changed pictures in (more than one zip or folder is fine)
//   node tools/art-apply.mjs --clean edits.zip         the same, after emptying art/ (what's not in the zip goes back to the game's own)
//   node tools/art-apply.mjs --manifest                only rebuild art/manifest.json from what's in art/
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { inflateRawSync } from 'node:zlib';

const ART = 'art', DIRS = /^(hats|eyes|trails|props|skins|people|animals|textures|sprites)\//, EXT = /\.(png|jpe?g|webp)$/i;
const args = process.argv.slice(2), clean = args.includes('--clean'), only = args.includes('--manifest'), srcs = args.filter(a => !a.startsWith('--'));
if (!only && !srcs.length) { console.log('usage: node tools/art-apply.mjs [--clean] <edited .zip or folder> ...  |  --manifest'); process.exit(1); }

const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xFFFFFFFF; for (const v of b) c = CRC[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function unzip(buf) { // [[path, Buffer]], stored or deflated
  let e = buf.length - 22; while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--; if (e < 0) throw new Error('not a .zip');
  const out = []; let p = buf.readUInt32LE(e + 16);
  for (let i = 0, n = buf.readUInt16LE(e + 10); i < n && buf.readUInt32LE(p) === 0x02014b50; i++) {
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), off = buf.readUInt32LE(p + 42), name = buf.toString('utf8', p + 46, p + 46 + nl);
    p += 46 + nl + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
    if (name.endsWith('/') || (method !== 0 && method !== 8)) continue;
    const start = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28), raw = buf.subarray(start, start + size);
    out.push([name, method ? inflateRawSync(raw) : raw]);
  }
  return out;
}
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const kind = b => b[0] === 0x89 && b[1] === 0x50 ? 'png' : b[0] === 0xFF && b[1] === 0xD8 ? 'jpg' : b.toString('latin1', 8, 12) === 'WEBP' ? 'webp' : '';
const size = b => kind(b) === 'png' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null;

if (!only) {
  if (clean && existsSync(ART)) for (const f of readdirSync(ART)) if (f !== 'manifest.json' && f !== 'README.md') rmSync(join(ART, f), { recursive: true, force: true });
  let took = 0, same = 0, odd = 0;
  for (const src of srcs) {
    const entries = statSync(src).isDirectory() ? walk(src).map(p => [relative(src, p).split(sep).join('/'), readFileSync(p)]) : unzip(readFileSync(src));
    const o = entries.find(([p]) => /(^|\/)originals\.json$/i.test(p)); let orig = {}; try { if (o) orig = JSON.parse(o[1].toString('utf8')); } catch (e) {}
    for (const [p, b] of entries) {
      if (!EXT.test(p) || /(^|\/)(__macosx|\.)/i.test(p)) continue;
      const key = p.replace(/^.*?editable\//, '').replace(EXT, '').toLowerCase(), ext = '.' + (kind(b) || p.split('.').pop().toLowerCase());
      if (!DIRS.test(key)) continue;
      if (!kind(b)) { console.log(`  skipped ${p}: not a PNG, JPEG or WebP inside`); odd++; continue; }
      if (orig[key + p.slice(p.lastIndexOf('.')).toLowerCase()] === crc(b)) { same++; continue; } // as the game drew it
      for (const e of ['.png', '.jpg', '.jpeg', '.webp']) rmSync(join(ART, key + e), { force: true }); // one picture per thing
      mkdirSync(dirname(join(ART, key)), { recursive: true }); writeFileSync(join(ART, key + ext), b); took++;
      const wh = size(b); console.log(`  ${key}${ext}${wh ? `  ${wh[0]}x${wh[1]}` : ''}${wh && Math.max(...wh) > 2048 ? '  (large: every visitor downloads it; 1024 is plenty)' : ''}`);
    }
  }
  console.log(`art-apply: ${took} picture${took === 1 ? '' : 's'} into art/${same ? `, ${same} unchanged left to the game` : ''}${odd ? `, ${odd} skipped` : ''}`);
}
mkdirSync(ART, { recursive: true });
const list = existsSync(ART) ? walk(ART).map(p => relative(ART, p).split(sep).join('/')).filter(p => EXT.test(p) && DIRS.test(p)).sort() : [];
writeFileSync(join(ART, 'manifest.json'), JSON.stringify(list, null, 1) + '\n');
console.log(`art/manifest.json: ${list.length} picture${list.length === 1 ? '' : 's'}`);

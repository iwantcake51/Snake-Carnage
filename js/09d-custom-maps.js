/* =========================================================
   CUSTOM MAPS: your own maps, made in the map editor, stored as plain data (never as code).
   A custom map is a JSON document (schema below). compileCustomMap turns it into the same kind of entry the
   built-in maps are (name, population, a build() that returns obstacles, lights, paths and a floor painter), so
   loadMap, the AI, lighting, seasons and challenges all work on it unchanged.
   Schema (version CUSTOM_MAP_VERSION; older documents are migrated up when they load):
   { format: 'snake-carnage-map', version, id, name, env: 'indoor' | 'outdoor', w, h,
     border, base (ground texture), ambient (indoor light level 0..1), weather: { seasons, snow },
     objects: [obstacles], lights: [lights], paths: [{ pts, w, style }], areas: [{ poly, tex }],
     shapes: [vector shapes, see 09c], materials: { id: material }, props: { kind: custom prop definition },
     spawn: { x, y, a }, population: [[type, count]], zones: [{ type, n, x, y, w, h }], walkers,
     meta: { created, modified, author, editor } }
   ========================================================= */
const CUSTOM_MAP_VERSION = 1, CUSTOM_KEY = 'snakeCarnageCustomMaps';
const CUSTOM_DEFAULTS = {
  outdoor: { border: '#4f7a33', base: 'grass', ambient: null, weather: { seasons: true, snow: true }, population: [['human', 10], ['rabbit', 4], ['dog', 2]], walkers: 0, grass: 140 },
  indoor: { border: '#26232c', base: 'tiles', ambient: .3, weather: { seasons: false, snow: false }, population: [['human', 12], ['rat', 2], ['cat', 1]], walkers: 0, grass: 0 },
};
function blankCustomMap(env, name) { // a completely empty map with sensible defaults for where it is
  const D = CUSTOM_DEFAULTS[env === 'indoor' ? 'indoor' : 'outdoor'], now = Date.now();
  const lights = env === 'indoor' ? [[.25, .3], [.75, .3], [.25, .7], [.75, .7]].map(([u, v]) => ({ x: Math.round(W * u), y: Math.round(H * v), r: 210, kind: 'fluor', fix: 'panel' })) : []; // controlled room lighting: a grid of ceiling panels
  return { format: 'snake-carnage-map', version: CUSTOM_MAP_VERSION, id: 'cm' + now.toString(36) + Math.floor(Math.random() * 1e4).toString(36), name: name || (env === 'indoor' ? 'My indoor map' : 'My outdoor map'), env, w: W, h: H,
    border: D.border, base: D.base, ambient: D.ambient, weather: { ...D.weather }, grass: D.grass, objects: [], lights, paths: [], areas: [], shapes: [], materials: {}, props: {},
    spawn: { x: Math.round(W / 2), y: Math.round(H / 2), a: 0 }, population: D.population.map(p => p.slice()), zones: [], walkers: D.walkers, meta: { created: now, modified: now, editor: GAME_VERSION } };
}
const CUSTOM_MIGRATIONS = { // version n -> n + 1. Add one here whenever the schema changes; old saves keep working.
  0: d => ({ ...d, format: 'snake-carnage-map', version: 1, shapes: d.shapes || [], materials: d.materials || {}, props: d.props || {}, zones: d.zones || [], weather: d.weather || { seasons: d.env !== 'indoor', snow: d.env !== 'indoor' } }),
};
function migrateCustomMap(d) {
  if (!d || typeof d !== 'object') return null;
  let v = d.version || 0, out = d;
  while (v < CUSTOM_MAP_VERSION && CUSTOM_MIGRATIONS[v]) { out = CUSTOM_MIGRATIONS[v](out); v = out.version; }
  if (out.version > CUSTOM_MAP_VERSION) console.warn('[custom map] made by a newer version of the game:', out.name);
  return out;
}
function customMaps() { try { return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || {}; } catch (e) { return {}; } }
function saveCustomMap(d) { const all = customMaps(); d.meta = { ...(d.meta || {}), modified: Date.now(), editor: GAME_VERSION }; all[d.id] = d; try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(all)); } catch (e) { return false; } registerCustomMaps(); return true; }
function deleteCustomMap(id) { const all = customMaps(); delete all[id]; try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(all)); } catch (e) {} registerCustomMaps(); }
/* ---- themes: what kind of place a map is, so its people talk and dress the part (25-dialogue's mapKey, 06's humanLook).
   Built-in maps have theirs by name; a custom map's is picked in the editor (Theme), or worked out from what's on it ---- */
const MAP_THEMES = { field: 'Open field', meadow: 'Meadow', park: 'Park', town: 'Town', farm: 'Farm', pool: 'Pool', maze: 'Hedge maze', checker: 'Checkerboard', office: 'Office', club: 'Club', bunker: 'Bunker', facility: 'Alien lab', station: 'Space station', crew: 'Moon base' };
const THEME_BY_NAME = { 'Open Field': 'field', Meadow: 'meadow', Town: 'town', Maze: 'maze', Farm: 'farm', Park: 'park', Pool: 'pool', Office: 'office', Checkerboard: 'checker', Moon: 'crew', Mars: 'crew', 'Space Station': 'station', Bunker: 'bunker', Club: 'club', 'Alien Facility': 'facility' };
const THEME_HINTS = { // what on a map points to which theme: obstacle kinds, light kinds and who lives there, each worth a few points
  office: { desk: 3, shelf: 1, couch: 1, table: 1, glass: 1 }, club: { dj: 6, speaker: 3, booth: 2, bar: 3, disco: 3 },
  station: { tube: 3, cryo: 2, module: 3, console: 2, pod: 2, holo: 2, astronaut: 2 }, crew: { lander: 5, dome: 3, solar: 2, astronaut: 3 },
  facility: { alien: 4, reactor: 4, saucer: 4, cryo: 2, tube: 1 }, bunker: { generator: 3, crate: 1, barrier: 2, bed: 1, emerg: 2, red: 2 },
  farm: { hay: 3, barn: 5, silo: 4, chicken: 2, duck: 1, pig: 3, sheep: 3 }, pool: { pool: 4, slide: 4, water: 1 },
  park: { bench: 2, gazebo: 4, lamp: 1, bin: 1, plant: 1 }, town: { building: 2, car: 2, fence: 1 }, maze: { hedge: 2 }, checker: { chess: 3 },
  meadow: { tree: .4, bush: .4, rabbit: 1, deer: 2, frog: 1 },
};
function detectMapTheme(d) { // -> a theme id from what the map is made of
  const n = {}; const add = (k, v = 1) => { if (k) n[k] = (n[k] || 0) + v; };
  for (const o of d.objects || []) add(o.kind || (o.t === 'c' ? 'tree' : 'wall'));
  for (const l of d.lights || []) add(l.kind);
  for (const a of d.areas || []) if (a.tex === 'water') add('water', 2);
  for (const [t, c] of d.population || []) add(t, Math.min(6, c) / 2);
  for (const z of d.zones || []) add(z.type, Math.min(6, z.n || 0) / 2);
  const indoor = d.env === 'indoor', score = {};
  for (const [th, hints] of Object.entries(THEME_HINTS)) { let v = 0; for (const [k, w] of Object.entries(hints)) v += Math.min(n[k] || 0, 8) * w; score[th] = v; }
  const inside = new Set(['office', 'club', 'station', 'facility', 'bunker']); // the right side of the door
  for (const th in score) if (inside.has(th) !== indoor && th !== 'club') score[th] *= .35;
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] >= 4) return best[0];
  if (indoor) return 'office'; // a room full of people: an office's worth of chatter
  return (n.tree || 0) + (n.bush || 0) > 10 ? 'meadow' : 'field';
}
const mapTheme = (m = MAPS[mapIdx]) => m ? (m.custom ? m.theme : THEME_BY_NAME[m.name]) || null : null;
let mapPropDefs = {}; // custom props a custom map brings with it (see propDefs in 05c)
function compileCustomMap(raw) {
  const d = migrateCustomMap(raw); if (!d) return null;
  const dx = Math.round((W - (d.w || W)) / 2), sx = p => p.map(([a, b]) => [a + dx, b]); // made on a different screen width: keep it centred
  const shift = o => { const c = JSON.parse(JSON.stringify(o)); if (typeof c.x === 'number') c.x += dx; if (c.poly) c.poly = sx(c.poly); if (c.pts) c.pts = sx(c.pts); if (c.nodes) c.nodes = c.nodes.map(n => [n[0] + dx, ...n.slice(1)]); return c; };
  const indoor = d.env === 'indoor';
  const zone = z => ({ x: z.x + dx, y: z.y, w: z.w, h: z.h });
  const pop = [...(d.population || []).filter(p => TYPES[p[0]] && p[1] > 0).map(p => [p[0], p[1]]), ...(d.zones || []).filter(z => TYPES[z.type] && z.n > 0).map(z => [z.type, z.n, zone(z)])];
  return { name: d.name, icon: indoor ? '🏠' : '🌳', border: d.border || CUSTOM_DEFAULTS[d.env].border, start: { x: (d.spawn || {}).x + dx || W / 2, y: (d.spawn || {}).y || H / 2, a: (d.spawn || {}).a || 0 },
    indoor, ambient: indoor ? d.ambient ?? .3 : undefined, custom: d.id, seasons: !indoor && (d.weather || {}).seasons !== false, snow: !indoor && (d.weather || {}).snow !== false, times: d.times,
    theme: d.theme && MAP_THEMES[d.theme] ? d.theme : detectMapTheme(d), // picked in the editor, or worked out from what's on it
    pop: pop.length ? pop : [['human', 8]], flash: typeof d.flash === 'number' ? d.flash : undefined, walkers: d.walkers || 0, grass: indoor ? 0 : d.grass ?? 140, data: d,
    build() {
      mapMaterials = d.materials || {}; if (JSON.stringify(mapPropDefs) !== JSON.stringify(d.props || {})) { mapPropDefs = d.props || {}; if (typeof propApply === 'function') propApply(); }
      const vs = compileVecShapes((d.shapes || []).map(shift));
      const obs = [...(d.objects || []).map(shift), ...vs.obs], trails = (d.paths || []).map(shift), areas = (d.areas || []).map(shift).map(a => (polyBounds(a), a));
      return { obs, lights: (d.lights || []).map(shift), paths: trails.map(t => t.pts), roads: [], customFx: vs.anim,
        floor(x) { paintBase(x, d.base || CUSTOM_DEFAULTS[d.env].base); paintAreas(x, areas); paintTrails(x, trails); paintVecFloor(x, vs.floor); },
        decor: vs.top.length ? x => paintVecFloor(x, vs.top) : null };
    } };
}
function registerCustomMaps() { // custom maps sit after the built-in ones in MAPS (re-registered after every save)
  for (let i = MAPS.length - 1; i >= 0; i--) if (MAPS[i].custom) MAPS.splice(i, 1);
  for (const d of Object.values(customMaps()).sort((a, b) => (a.meta || {}).created - (b.meta || {}).created)) { try { const m = compileCustomMap(d); if (m) MAPS.push(m); } catch (e) { console.warn('[custom map]', d && d.name, e); } }
  if (typeof mapIdx === 'number' && mapIdx >= MAPS.length) mapIdx = 0;
}
registerCustomMaps();

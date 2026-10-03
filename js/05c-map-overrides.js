/* =========================================================
   MAP EDITS
   Maps changed in the map editor (40b-editor). Each entry replaces that map's objects and lights at one world width
   (the width depends on the screen's shape, see W in 01-config). Edits saved in this browser win over the ones below.
   To ship edits with the game: Map editor -> Export, then replace this file with the downloaded one.
   ========================================================= */
const MAP_OVERRIDES = {};
const mapEditKey = name => name + '@' + W;
function localMapEdits() { try { return JSON.parse(localStorage.getItem('snakeCarnageMapEdits')) || {}; } catch (e) { return {}; } }
function mapOverride(name) { const k = mapEditKey(name); return localMapEdits()[k] || MAP_OVERRIDES[k] || null; }

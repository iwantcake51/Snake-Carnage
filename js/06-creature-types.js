/* =========================================================
   CREATURE TYPES  (easy to add more)
   ========================================================= */
const TYPES = {
  human:   { human: true, r: 9, walk: 26, run: 92, score: 3, grow: 3, blood: 1, sight: 150 },
  rabbit:  { r: 6, walk: 18, run: 115, score: 1, grow: 1, blood: 0.25, sight: 110, bl: 7, bw: 5, hr: 4, col: '#a08a6e', ears: 'long', tail: 'puff' },
  deer:    { r: 10, walk: 22, run: 120, score: 2, grow: 2, blood: 0.85, sight: 170, bl: 13, bw: 6.5, hr: 4.5, col: '#b07a45', ears: 'short', tail: 'puff' },
  frog:    { r: 5, walk: 10, run: 70, score: 1, grow: 1, blood: 0.12, sight: 60, bl: 4.5, bw: 4.5, hr: 3.5, col: '#5e9e3a', legs: true },
  dog:     { r: 9, walk: 30, run: 105, score: 2, grow: 2, blood: 0.5, sight: 120, bl: 10, bw: 5.5, hr: 4.5, col: '#8b5a2b', ears: 'flop', tail: 'line' },
  cat:     { r: 7, walk: 22, run: 110, score: 1, grow: 1, blood: 0.3, sight: 120, bl: 8, bw: 4.5, hr: 4, col: '#e08a3c', ears: 'short', tail: 'long' },
  chicken: { r: 6, walk: 16, run: 75, score: 1, grow: 1, blood: 0.22, sight: 80, bl: 6, bw: 5, hr: 3.3, col: '#f4f4ef', comb: true, beak: true },
  duck:    { r: 6, walk: 14, run: 70, score: 1, grow: 1, blood: 0.22, sight: 90, bl: 7, bw: 4.8, hr: 3.3, col: '#eeeee4', hcol: '#2f7a3a', beak: true },
  pig:     { r: 9, walk: 15, run: 70, score: 2, grow: 2, blood: 0.8, sight: 80, bl: 10, bw: 7.5, hr: 5, col: '#f2a6b0', snout: true, ears: 'short' },
  sheep:   { r: 9, walk: 12, run: 75, score: 2, grow: 2, blood: 0.75, sight: 90, bl: 10, bw: 7.5, hr: 4, col: '#f2f0ea', hcol: '#333', fluff: true },
  rat:     { r: 4, walk: 20, run: 95, score: 1, grow: 1, blood: 0.1, sight: 90, bl: 5.5, bw: 3, hr: 2.8, col: '#7d7d7d', tail: 'long', tcol: '#d99a9a' },
};
const SKINS = ['#ffdfc4', '#f1c27d', '#e0ac69', '#c68642', '#a86b3c', '#8d5524', '#5c3a1e'];
const HAIR_NATURAL = ['#1c1410', '#2c1b10', '#4a2e1a', '#6b4423', '#a0703c', '#d6b370', '#e8d7a8', '#8c8c8c', '#d9d9d9'];
const HAIR_DYED = ['#c2185b', '#3f51b5', '#26a69a', '#8e24aa', '#ff7043'];
const TOPS = ['#e05d5d', '#4c7bd9', '#f2c14e', '#56b870', '#8f6ad8', '#f4f1ea', '#ff8a4c', '#3fb8b0', '#3b3f4a', '#c94f7c', '#7d9c4a', '#2f6f8f', '#b5543c', '#e8e3d3'];
const PANTS = ['#2f4a7a', '#3c5f99', '#24272e', '#6b6f78', '#a08a62', '#4e5a3a', '#7a3b3b'];
const SHOES = ['#f2f2f2', '#1d1d1f', '#5a3a22', '#c43c3c', '#2d5fa8'];
const BUILDS = [{ w: 8.2, d: 4.6 }, { w: 9.2, d: 5.1 }, { w: 9.2, d: 5.1 }, { w: 10.4, d: 5.9 }];
function humanLook() { // a coordinated outfit; each map dresses its people a little differently
  const m = MAPS[mapIdx].name, b = pick(BUILDS);
  const L = { skin: pick(SKINS), hair: Math.random() < .08 ? pick(HAIR_DYED) : pick(HAIR_NATURAL), top: pick(TOPS), top2: pick(TOPS), pants: pick(PANTS),
    shoes: pick(SHOES), w: b.w, d: b.d, sleeves: Math.random() < .55 ? 'short' : 'long', hat: null, acc: null,
    hairStyle: pick(['short', 'short', 'long', 'bun', 'ponytail', 'curly', 'bald', 'buzz']), outfit: pick(['tee', 'tee', 'stripe', 'jacket', 'hoodie']),
    hatCol: pick(['#c0392b', '#2c3e50', '#27ae60', '#f39c12', '#8e44ad', '#ecf0f1']) };
  if (L.top2 === L.top) L.top2 = mixColor(L.top, '#000000', .3);
  if (m === 'Office') {
    Object.assign(L, { outfit: pick(['shirtTie', 'shirtTie', 'blazer']), top: pick(['#f4f1ea', '#dfe8f5', '#cfe0d8', '#f0e1e1']), top2: pick(['#2b2f3a', '#3a3f4f', '#4a3a2f']),
      pants: pick(['#24272e', '#3a3f4f', '#5a5f68']), tie: pick(['#a11d1d', '#2a4f9a', '#3a6f3a', '#6a3a8a']), sleeves: 'long' });
  } else if (m === 'Farm') {
    Object.assign(L, { outfit: pick(['overalls', 'overalls', 'plaid']), top: pick(['#c94f4f', '#4f7ac9', '#d9c08a']), top2: '#3c5f99' });
    if (Math.random() < .5) L.hat = 'straw';
  } else {
    if (Math.random() < .15) L.hat = pick(['cap', 'beanie']);
    if (Math.random() < .2) L.acc = 'backpack'; else if (Math.random() < .14) L.acc = 'bag';
    if (m === 'Town' && Math.random() < .1) L.outfit = 'vest';
  }
  return L;
}

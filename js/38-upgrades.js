/* =========================================================
   SKILL TREE + ABILITIES
   The skill tree (three branches: Movement, Hunting, Resilience) is bought with chips, one rank at a time. Major nodes
   (max 1) unlock an ability or a new behavior, some behind a level; the small passives between them have 3-5 ranks and
   nudge one number each. sk(id) is a node's rank as it counts right now (owned, switched on, not cancelled by a
   modifier); SKV turns ranks into the numbers the game uses, and the screen (38f-skill-tree) previews the same functions.
   Abilities are plain data: an id, a key, a cooldown, a duration and what they do. Every activation also goes out on NET
   as a small event ({ type, id, t, x, y, a }), so a multiplayer layer can replay it on another player's screen.
   ========================================================= */
const NET = { // multiplayer hook: nothing listens yet, but every ability use and break-through is reported here
  listeners: [], log: [],
  emit(e) { e.t = T; this.log.push(e); if (this.log.length > 60) this.log.shift(); for (const f of this.listeners) f(e); },
  on(f) { this.listeners.push(f); },
};
const SK_BRANCH = {
  move: { name: 'Movement', key: '1', blurb: 'Speed, turning and the Lunge' },
  hunt: { name: 'Hunting', key: '2', blurb: '3rd Eye, Camouflage and Hoover Mouth' },
  res: { name: 'Resilience', key: '3', blurb: 'Battering Ram, Hiss and getting back up' },
};
/* x, y: where the node sits on the tree (the screen's own units). req: [[id, rank], ...] all needed before the first rank.
   lvl: the account level the first rank needs, or one per rank ([4, 10, 16]). ranks: optional text per rank (what each one adds).
   fx: what the details panel shows, current -> next: [label, g => number, n => text] where g(id) is a rank. */
const pct = n => (n > 0 ? '+' : '') + Math.round(n) + '%', secs = n => (+n.toFixed(2)) + ' s', xk = n => (+n.toFixed(2)) + 'x', px = n => Math.round(n) + ' px';
const SKILL_TREE = [
  // ---- Movement ----
  { id: 'speed', br: 'move', name: 'Speed Demon', icon: 'speed', cost: [150, 200, 320, 480, 700], lvl: 2, req: [], x: 626, y: 800,
    desc: 'Each rank: your snake moves 5% faster. The first rank opens the Movement branch.', fx: [['Speed', g => SKV.speed(g) * 100 - 100, pct]] },
  { id: 'sidewind', br: 'move', name: 'Sidewinder', icon: 'sidewind', cost: [260, 420, 640], req: [['speed', 1]], x: 480, y: 718,
    desc: 'Each rank: your head swings round 16% quicker.', fx: [['Turn rate', g => SKV.turn(g) * 100 - 100, pct]] },
  { id: 'momentum', br: 'move', major: 1, name: 'Momentum', icon: 'momentum', cost: [2100], lvl: 20, req: [['sidewind', 2]], x: 335, y: 590,
    desc: 'Smashing through things keeps half your speed instead of stalling you, and pressing the opposite way whips you round in a tight U-turn (it picks the side that clears your body and the walls).', fx: [['Speed kept through a smash', g => g('momentum') ? 50 : 0, n => n ? 'Half the stall' : 'Full stall'], ['U-turn', g => g('momentum'), n => n ? 'Yes' : 'No']] },
  { id: 'dash', br: 'move', major: 1, abil: 1, name: 'Lunge', icon: 'dash', cost: [250], lvl: 3, req: [['speed', 1]], x: 588, y: 625,
    desc: 'A short burst of speed for catching runners. You can\'t lunge while you\'re concussed.', fx: [['Burst', g => SKV.lungeK(g), xk], ['Lasts', g => SKV.lungeDur(g), secs], ['Cooldown', g => SKV.lungeCd(g), secs]] },
  { id: 'stride', br: 'move', name: 'Long Stride', icon: 'stride', cost: [240, 400, 620], req: [['dash', 1]], x: 562, y: 470,
    desc: 'Each rank: the lunge lasts 0.07 s longer and hits a little harder.', fx: [['Lasts', g => SKV.lungeDur(g), secs], ['Burst', g => SKV.lungeK(g), xk]] },
  { id: 'pounce', br: 'move', major: 1, name: 'Pounce', icon: 'pounce', cost: [1800], lvl: 18, req: [['stride', 2]], x: 549, y: 300,
    desc: 'The lunge becomes a pounce: 2.7x speed and a much shorter cooldown. Eat something mid-lunge and it\'s ready again almost at once, and you keep going.', fx: [['Burst', g => SKV.lungeK(g), xk], ['Cooldown', g => SKV.lungeCd(g), secs]] },
  { id: 'spring', br: 'move', name: 'Coiled Spring', icon: 'spring', cost: [200, 320, 480, 700], req: [['dash', 1]], x: 437, y: 500,
    desc: 'Each rank: the lunge recharges 7% faster.', fx: [['Lunge cooldown', g => SKV.lungeCd(g), secs]] },
  { id: 'whip', br: 'move', name: 'Whiplash', icon: 'whip', cost: [220, 360, 560], req: [['spring', 1]], x: 386, y: 340,
    desc: 'Each rank: you turn 15% sharper mid-lunge, so a burst can bend round a corner after a runner.', fx: [['Turning while lunging', g => SKV.lungeTurn(g) * 100 - 100, pct]] },
  // ---- Hunting ----
  { id: 'scent', br: 'hunt', major: 1, abil: 1, name: '3rd Eye', icon: 'scent', cost: [400], lvl: 5, req: [], x: 850, y: 760,
    desc: 'A sixth sense, always on: five times a second it lays the best way out from under bombs and strafing lanes, a lifeline to the nearest meal when your combo is dying, and otherwise a trail to the best meal near you. Its key is Focus: the world slows right down for a moment (in multiplayer it lights up everyone near you instead).', fx: [['Focus', g => SKV.focusDur(g), secs], ['Focus cooldown', g => SKV.focusCd(g), secs]] },
  { id: 'keen', br: 'hunt', name: 'Keen Eye', icon: 'keen', cost: [300, 500, 780], req: [['scent', 1]], x: 850, y: 615,
    desc: 'Each rank: the 3rd Eye reads 20% further and Focus lasts 0.27 s longer.', fx: [['Sense range', g => SKV.eyeRange(g) * 100 - 100, pct], ['Focus', g => SKV.focusDur(g), secs]] },
  { id: 'gold', br: 'hunt', major: 1, name: 'Gold Sense', icon: 'gold', cost: [1100], lvl: 15, req: [['keen', 1]], x: 850, y: 465,
    desc: 'The 3rd Eye finds golden targets, even through a raid, routed round the danger, and marks everyone who can see you right now. Focus recharges 3 s sooner.', fx: [['Focus cooldown', g => SKV.focusCd(g), secs]] },
  { id: 'crowd', br: 'hunt', major: 1, name: 'Crowd Sense', icon: 'crowd', cost: [2000], lvl: 21, req: [['gold', 1]], x: 850, y: 300,
    desc: 'The 3rd Eye leads you to big crowds out in the open, where a lunge tears through them. Focus recharges another 3 s sooner.', fx: [['Focus cooldown', g => SKV.focusCd(g), secs]] },
  { id: 'camo', br: 'hunt', major: 1, abil: 1, name: 'Camouflage', icon: 'camo', cost: [600], lvl: 8, req: [['scent', 1]], x: 725, y: 600,
    desc: 'Vanish on the spot. Nobody sees you unless you\'re right on top of them, anyone already onto you loses you, and kills while hidden are silent. Every kill while hidden keeps you hidden 1 s longer.', fx: [['Hidden for', g => SKV.camoDur(g), secs], ['Cooldown', g => SKV.camoCd(g), secs]] },
  { id: 'cover', br: 'hunt', name: 'Deep Cover', icon: 'cover', cost: [260, 400, 580, 820], req: [['camo', 1]], x: 712, y: 445,
    desc: 'Each rank: hidden 0.5 s longer, 0.5 s less cooldown, and 4% faster while hidden.', fx: [['Hidden for', g => SKV.camoDur(g), secs], ['Cooldown', g => SKV.camoCd(g), secs], ['Speed while hidden', g => SKV.camoSpeed(g) * 100 - 100, pct]] },
  { id: 'phantom', br: 'hunt', major: 1, name: 'Phantom', icon: 'phantom', cost: [2400], lvl: 23, req: [['cover', 2]], x: 704, y: 290,
    desc: 'Your combo doesn\'t drain while you\'re hidden, hidden kills pay 25% more, the camouflage settles back in quicker after a turn, and it recharges 2 s sooner.', fx: [['Hidden kills pay', g => g('phantom') ? 25 : 0, pct], ['Cooldown', g => SKV.camoCd(g), secs]] },
  { id: 'hoover', br: 'hunt', major: 1, abil: 1, name: 'Hoover Mouth', icon: 'hoover', cost: [500], lvl: 6, req: [['scent', 1]], x: 975, y: 600,
    desc: 'Open wide and inhale: for a moment everything in a cone in front of you, people included, gets dragged toward your mouth. Never through walls.', fx: [['Pull', g => SKV.hoovDur(g), secs], ['Cone', g => SKV.hoovCone(g), n => Math.round(n) + '°'], ['Cooldown', g => SKV.hoovCd(g), secs]] },
  { id: 'breath', br: 'hunt', name: 'Deep Breath', icon: 'breath', cost: [320, 520, 800], req: [['hoover', 1]], x: 988, y: 445,
    desc: 'Each rank: the pull lasts longer, reaches further, widens and drags harder, and recharges about 1.3 s sooner.', fx: [['Pull', g => SKV.hoovDur(g), secs], ['Cone', g => SKV.hoovCone(g), n => Math.round(n) + '°'], ['Cooldown', g => SKV.hoovCd(g), secs]] },
  { id: 'vortex', br: 'hunt', major: 1, name: 'Vortex', icon: 'vortex', cost: [2300], lvl: 21, req: [['breath', 2]], x: 996, y: 290,
    desc: 'A huge pull in a 170° cone that drags in even people running for their lives: 2.5 s of it, every 9 s.', fx: [['Pull', g => SKV.hoovDur(g), secs], ['Cone', g => SKV.hoovCone(g), n => Math.round(n) + '°'], ['Cooldown', g => SKV.hoovCd(g), secs]] },
  // ---- Resilience ----
  { id: 'ram', br: 'res', major: 1, name: 'Battering Ram', icon: 'ram', cost: [300, 850, 1900], lvl: [4, 10, 16], req: [], x: 1074, y: 800,
    ranks: ['Small things: chairs, plants, crates, hay, fences, bins, glass. Barely slows you', 'Big furniture, bushes and small trees: desks, tables, benches, couches, shelves, beds, bars, consoles, speakers, saplings. A harder knock', 'Cars, rocks and the cracked wall sections on some maps: shortcuts, but the hit leaves you seeing stars'],
    desc: 'Smash through things instead of crashing into them; each rank takes on heavier things. Without it glass still breaks, but going through it knocks you senseless.', fx: [['Smashes', g => SKV.ramTier(g), n => ['Nothing', 'Small things', 'Furniture', 'Cars and walls'][n]]] },
  { id: 'skull', br: 'res', name: 'Thick Skull', icon: 'skull', cost: [220, 360, 540, 780], req: [['ram', 1]], x: 1222, y: 718,
    desc: 'Each rank: you shake off a daze 10% faster, whether it came from smashing through something, a wall, or a blast nearby. It never saves you from a direct hit.', fx: [['Daze recovery', g => SKV.dazeK(g) * 100 - 100, pct]] },
  { id: 'gut', br: 'res', name: 'Iron Stomach', icon: 'gut', cost: [350, 700, 1100], req: [['skull', 1]], x: 1365, y: 590,
    desc: 'Each rank: your combo lasts 10% longer between kills.', fx: [['Combo time', g => SKV.combo(g) * 100 - 100, pct]] },
  { id: 'hiss', br: 'res', major: 1, abil: 1, name: 'Hiss', icon: 'hiss', cost: [700], lvl: 11, req: [['ram', 1]], x: 1121, y: 625,
    desc: 'A blood-curdling hiss you can see rippling out: everything nearby panics and scatters.', fx: [['Radius', g => SKV.hissR(g), px], ['Cooldown', g => SKV.hissCd(g), secs]] },
  { id: 'rattle', br: 'res', name: 'Rattle', icon: 'rattle', cost: [380, 600, 900], req: [['hiss', 1]], x: 1147, y: 470,
    desc: 'Each rank: the hiss reaches 17 px further, and everyone it catches is slowed for 1.3 s more and half-deaf (and slurring) for 3.3 s more.', fx: [['Radius', g => SKV.hissR(g), px], ['Slowed for', g => SKV.hissSlow(g), secs], ['Half-deaf for', g => SKV.hissDeaf(g), secs]] },
  { id: 'shock', br: 'res', major: 1, name: 'Shockwave', icon: 'shock', cost: [2600], lvl: 24, req: [['rattle', 2]], x: 1160, y: 300,
    desc: 'The hiss knocks people off their feet and blows groups apart, reaches 30 px further, and recharges 2 s sooner.', fx: [['Radius', g => SKV.hissR(g), px], ['Cooldown', g => SKV.hissCd(g), secs]] },
];
for (const n of SKILL_TREE) n.max = n.cost.length;
const SKN = Object.fromEntries(SKILL_TREE.map(n => [n.id, n]));
const skNeedLv = (n, r) => Array.isArray(n.lvl) ? n.lvl[r] || 0 : r ? 0 : n.lvl || 0; // the level rank r+1 needs
const ABIL_NODES = SKILL_TREE.filter(n => n.abil); // the five skills with a key: dash, scent, camo, hoover, hiss
const ABILITY_IDS = new Set(ABIL_NODES.map(n => n.id));
PROG.tree = PROG.tree || {}; PROG.treeOff = PROG.treeOff || {};
/* ---- save migration: the old Upgrades (PROG.upg, levels per upgrade) become the same benefits on the tree, free ---- */
function treeFromUpgrades(u, off) { // u: { speed: 0..5, ram: 0..4, gut, dash, scent, camo, hoover, hiss: 0..3 }
  const t = {}, o = {}, give = (from, id, r) => { if (r > 0) { t[id] = Math.max(t[id] || 0, Math.min(r, SKN[id].max)); if (off && off[from]) o[id] = true; } }, L = id => u[id] | 0;
  if (L('speed')) { const s = L('speed'); give('speed', 'speed', s); give('speed', 'sidewind', s >= 5 ? 3 : s >= 4 ? 2 : s >= 2 ? 1 : 0); give('speed', 'momentum', s >= 5 ? 1 : 0); if (s >= 3) give('speed', 'skull', 3); } // Speed Demon III shook off dazes a third faster
  if (L('ram')) { const r = L('ram'); give('ram', 'ram', Math.min(r, 3)); if (r >= 4) give('ram', 'skull', L('speed') >= 3 ? 4 : 3); } // thick skull: concussions a quarter shorter
  give('gut', 'gut', L('gut'));
  if (L('dash')) { const r = L('dash'); give('dash', 'dash', 1); if (r >= 2) { give('dash', 'stride', 3); give('dash', 'spring', 4); } give('dash', 'pounce', r >= 3 ? 1 : 0); } // II: 0.8 s at 1.9x, 5 s; III: Pounce
  if (L('scent')) { const r = L('scent'); give('scent', 'scent', 1); if (r >= 2) { give('scent', 'gold', 1); give('scent', 'keen', 2); } if (r >= 3) { give('scent', 'crowd', 1); give('scent', 'keen', 3); } }
  if (L('camo')) { const r = L('camo'); give('camo', 'camo', 1); if (r >= 2) give('camo', 'cover', 3); if (r >= 3) { give('camo', 'cover', 4); give('camo', 'phantom', 1); } } // Stalker, Phantom
  if (L('hoover')) { const r = L('hoover'); give('hoover', 'hoover', 1); if (r >= 2) give('hoover', 'breath', 3); give('hoover', 'vortex', r >= 3 ? 1 : 0); }
  if (L('hiss')) { const r = L('hiss'); give('hiss', 'hiss', 1); if (r >= 2) give('hiss', 'rattle', 3); give('hiss', 'shock', r >= 3 ? 1 : 0); }
  return { t, o };
}
if (!PROG.treeV) { // once per save: carry the old upgrades over (never charged again; nothing already on the tree is lowered)
  const { t, o } = treeFromUpgrades(PROG.upg || {}, PROG.upgOff || {});
  for (const id in t) PROG.tree[id] = Math.max(PROG.tree[id] || 0, t[id]);
  for (const id in o) if (!(PROG.tree[id] > t[id])) PROG.treeOff[id] = true;
  PROG.treeV = 1; saveProg();
}
function treeMerge(t, off) { // tree v2: Quick Scales folded into Speed Demon's ranks, Wrecking Ball and Siege Head into Battering Ram's
  if (!t) return t; const was = id => t[id] | 0, gone = ['swift', 'wreck', 'siege'];
  if (was('swift')) t.speed = Math.min(5, (was('speed') || 1) + was('swift'));
  if (was('wreck')) t.ram = Math.min(3, 2 + (was('siege') ? 1 : 0)); // (a fresh migration already gives the ram its ranks)
  if (off) { if (off.swift) off.speed = true; if (off.wreck || off.siege) off.ram = true; }
  for (const id of gone) { delete t[id]; if (off) delete off[id]; }
  return t;
}
if (PROG.treeV < 2) { treeMerge(PROG.tree, PROG.treeOff); PROG.treeV = 2; saveProg(); }
let UPG_OVR = null; // co-op: while the host's AI deals with another player's snake, the ranks are that player's (their profile's tree)
const skOwn = id => Math.min(PROG.tree[id] || 0, SKN[id] ? SKN[id].max : 0); // bought, switched on or not
const sk = id => { const n = SKN[id]; if (!n || MOD.noUpgrades || (MOD.noAbilities && n.abil)) return 0; // a node's rank as it counts right now
  const r = UPG_OVR ? UPG_OVR[id] : edTestSkills && edTesting !== null ? edTestSkills[id] : PROG.treeOff[id] ? 0 : PROG.tree[id];
  return Math.max(0, Math.min(r | 0, n.max)); };
/* Every number the tree changes. g(id) is a rank: sk in play, a "what if" rank in the details panel. Capped and modest. */
const SKV = {
  speed: (g = sk) => 1 + .05 * g('speed'), // up to +25%
  turn: (g = sk) => 1 + .16 * g('sidewind'),
  lungeK: (g = sk) => g('pounce') ? 2.7 : 1.8 + .035 * g('stride'),
  lungeDur: (g = sk) => (g('pounce') ? .55 : .6) + .07 * g('stride'),
  lungeCd: (g = sk) => (g('pounce') ? 5 : 7) * (1 - .07 * g('spring')),
  lungeTurn: (g = sk) => 1 + .15 * g('whip'),
  eyeRange: (g = sk) => 1 + .2 * g('keen'),
  focusDur: (g = sk) => 1.2 + .27 * g('keen'),
  focusCd: (g = sk) => 16 - 3 * g('gold') - 3 * g('crowd'),
  camoDur: (g = sk) => 4 + .5 * g('cover'),
  camoCd: (g = sk) => 14 - .5 * g('cover') - 2 * g('phantom'),
  camoSpeed: (g = sk) => 1 + .04 * g('cover'),
  hoovLv: (g = sk) => g('vortex') ? 3 : 1 + g('breath') / 3, // 1..3: how hard and wide the pull is (22-snake hoover)
  hoovDur: (g = sk) => g('vortex') ? 2.5 : 1.5 + g('breath') / 6,
  hoovCd: (g = sk) => 16 - 4 / 3 * g('breath') - 3 * g('vortex'),
  hoovCone: (g = sk) => lvAt([0, .55, 1, 1.5], SKV.hoovLv(g)) * 2 * 180 / Math.PI,
  ramTier: (g = sk) => g('ram'),
  dazeK: (g = sk) => 1 + .1 * g('skull'), // how fast a daze wears off (never immunity: the daze still happens, a direct hit still kills)
  combo: (g = sk) => 1 + .1 * g('gut'),
  hissR: (g = sk) => 190 + 17 * g('rattle') + 30 * g('shock'),
  hissSlow: (g = sk) => 1.33 * g('rattle'),
  hissDeaf: (g = sk) => 3.33 * g('rattle'),
  hissCd: (g = sk) => 15 - 2 * g('shock'),
};
const lvAt = (a, l) => { const i = Math.max(0, Math.min(a.length - 1, Math.floor(l))), f = l - i; return i >= a.length - 1 ? a[a.length - 1] : a[i] + (a[i + 1] - a[i]) * f; }; // a per-level table read at a fractional level
/* The old upgrade levels, worked out from the tree, for code that still asks "which tier" (looks, challenges, the ram's targets) */
const upg = id => { switch (id) {
  case 'speed': return sk('speed');
  case 'ram': return SKV.ramTier();
  case 'dash': return sk('dash') ? sk('pounce') ? 3 : sk('stride') >= 2 ? 2 : 1 : 0;
  case 'scent': return sk('scent') ? 1 + sk('gold') + (sk('gold') ? sk('crowd') : 0) : 0;
  case 'camo': return sk('camo') ? sk('phantom') ? 3 : sk('cover') >= 2 ? 2 : 1 : 0;
  case 'hoover': return sk('hoover') ? sk('vortex') ? 3 : sk('breath') >= 2 ? 2 : 1 : 0;
  case 'hiss': return sk('hiss') ? sk('shock') ? 3 : sk('rattle') >= 2 ? 2 : 1 : 0;
  default: return sk(id);
} };
const ABIL = { // cd/dur read the tree each time
  dash: { get cd() { return SKV.lungeCd(); }, get dur() { return SKV.lungeDur(); }, go(s) { s.dashT = this.dur; s.dashK = SKV.lungeK(); s.lk = Math.max(s.lk || 0, .25); Sfx.dash(); const k = sk('pounce') ? 240 : 160; camF.kv.x += Math.cos(s.angle) * k; camF.kv.y += Math.sin(s.angle) * k; } }, // Pounce: much faster, much shorter cooldown
  scent: { get cd() { return SKV.focusCd(); }, get dur() { return SKV.focusDur(); }, go(s) { // Focus: the world slows down (solo), and everyone near you lights up
    const now = performance.now(); FOCUS.t0 = now; FOCUS.until = now + this.dur * 1000; s.pingT = this.dur + 1.5; updateScent.t = 0; Sfx.focus(this.dur); } },
  camo: { get cd() { return SKV.camoCd(); }, get dur() { return SKV.camoDur(); }, go(s) { s.camoT = this.dur; s.camoMax = this.dur + 4; Sfx.camo();
    if (AUTH()) for (const c of nearbyCreatures(s.x, s.y, 420, [])) if (c.alive && c.def.human) c.alert = Math.min(c.alert || 0, .2); } }, // anyone onto you loses you
  hoover: { get cd() { return SKV.hoovCd(); }, get dur() { return SKV.hoovDur(); }, go(s) {
    const lv = SKV.hoovLv(); s.hoovT = this.dur; s.hoovLv = lv; Sfx.vacuum(this.dur, Math.round(lv));
    if (netIsGuest()) netSend({ t: 'abil', id: 'hoover', lv, d: this.dur }); // co-op guest: the host pulls its crowd for us
  } },
  hiss: { get cd() { return SKV.hissCd(); }, dur: .8, go(s) {
    const lv = upg('hiss'), R = SKV.hissR(); s.hissLv = lv;
    Sfx.hiss(); shake = Math.max(shake, lv > 1 ? 8 : 5); s.hissT = this.dur; s.hissR = R;
    if (netIsGuest()) { netSend({ t: 'abil', id: 'hiss', lv }); return; } // co-op guest: the host scares its crowd for us
    crHiss(hissNpc(s, lv));
  } },
};
function hissNpc(s, lv) { // what a hiss does to the crowd (the deciding browser only; in co-op UPG_OVR holds the hisser's tree); returns how many people it scared
    const R = SKV.hissR(), slow = SKV.hissSlow(), deaf = SKV.hissDeaf(), shock = sk('shock'); noise('hiss', s.x, s.y, 1, R * 1.4);
    let hn = 0;
    for (const c of nearbyCreatures(s.x, s.y, R, [])) {
      if (c.def.human && c.state !== 'panic') hn++;
      const at = MOD.blind && c.def.human ? guessAt(c, s.x, s.y, R * 1.4) : s; // the blind only know it came from over there, somewhere
      panic(c, at.x, at.y, rand(3, 5) * (slow ? 1 + slow / 8 : 1), 'hissed'); c.alert = 1;
      if (slow) { c.slowT = T + slow; c.deafT = T + deaf; c.adren = 0; if (c.def.human && !c.def.alien) c.reply = { t: rand(.8, 1.6), ctx: 'deaf' }; } // Rattle: slowed, half-deaf and slurring
      if (shock) { const d = Math.hypot(c.x - s.x, c.y - s.y) || 1, f = (1 - d / R) * 260 + 60; c.kb = { vx: (c.x - s.x) / d * f, vy: (c.y - s.y) / d * f, t: .35 }; c.slowT = Math.max(c.slowT || 0, T + 5); if (typeof leaveGroup === 'function') leaveGroup(c); } // knocked flat, the group blown apart
    }
    return hn;
}
const abilCD = {};
const abilCd = id => ABIL[id].cd * (MOD.slowRecharge ? 2 : MOD.quickRecharge ? .5 : 1); // Slow recharge / Quick recharge
function useAbility(id) {
  if (!sk(id) || state !== 'play' || !snake || !snake.alive || !snake.started) return;
  const a = ABIL[id]; if ((abilCD[id] || 0) > T || (id === 'dash' && (snake.boomT > 0 || snake.ramT > 0 || snake.wallStun > 0))) { /* (no lunging while you're concussed: a blast, a smash, a wall) */ if (Sfx.ok() && Sfx.gate('deny', .6)) Sfx.deny(); abilityHud(); const b = document.querySelector(`#abil [data-a="${id}"]`); if (b) { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); } return; }
  abilCD[id] = T + abilCd(id); a.go(snake); run.abil = (run.abil || 0) + 1;
  NET.emit({ type: 'ability', id, x: snake.x, y: snake.y, a: snake.angle });
  if (NETM.run && NETM.host) netEmit({ t: 'abil', pid: NETM.me, id, x: Math.round(snake.x), y: Math.round(snake.y) }); // the others hear it (and see the hiss)
  abilityHud(true);
}
function resetAbilities() { for (const k in abilCD) delete abilCD[k]; for (const n of ABIL_NODES) abilCD[n.id] = T + abilCd(n.id); FOCUS.until = 0; if (snake) snake.pingT = 0; abilityHud(true); } // every skill starts the round recharging
const speedMult = () => SKV.speed();
const comboGutMult = () => SKV.combo();
const skillTip = n => `${n.name} (${abilKey(n.id)}): ${n.fx.map(([l, f, t]) => `${l} ${t(f(sk))}`).join(', ')}`;

/* ---- abilities HUD: bottom-center icons with a cooldown sweep ---- */
function abilityHud(rebuild) {
  const el = document.getElementById('abil'); if (!el) return;
  const list = state === 'menu' || state === 'loading' || state === 'editor' ? [] : ABIL_NODES.filter(n => sk(n.id)); // only in a run (never in the menus or a lobby)
  if (rebuild || el.dataset.n !== String(list.length)) {
    el.dataset.n = list.length;
    el.innerHTML = list.map(n => `<div class="ab" data-a="${n.id}" data-tip="${attr(skillTip(n))}">${upIcon(n.icon)}<i class="cd"></i><kbd>${abilKey(n.id) === 'Shift' ? '⇧' : abilKey(n.id)}</kbd></div>`).join('');
    refreshTouchAbilities();
  }
  for (const n of list) {
    const left = Math.max(0, (abilCD[n.id] || 0) - T), k = left / abilCd(n.id);
    for (const host of [el, document.querySelector('#touch .tabil')]) {
      const b = host && host.querySelector(`[data-a="${n.id}"]`); if (!b) continue;
      b.classList.toggle('ready', k <= 0); b.style.setProperty('--cd', (k * 360).toFixed(0) + 'deg');
    }
  }
}
function abilityTick() { // every frame: just slide the cooldown rings, so they sweep smoothly instead of ticking ten times a second
  for (const host of [document.getElementById('abil'), document.querySelector('#touch .tabil')]) {
    if (!host) continue;
    for (const b of host.children) { const id = b.dataset.a, A = ABIL[id]; if (!A) continue; const k = Math.max(0, (abilCD[id] || 0) - T) / abilCd(id); b.style.setProperty('--cd', (k * 360).toFixed(2) + 'deg'); }
  }
}
function refreshTouchAbilities() {
  const host = document.querySelector('#touch .tabil'); if (!host) return;
  host.innerHTML = (state === 'menu' || state === 'loading' || state === 'editor' ? [] : ABIL_NODES.filter(n => sk(n.id))).map(n => `<button class="tb ab" data-a="${n.id}" data-sfx="none" aria-label="${n.name}">${upIcon(n.icon)}<i class="cd"></i></button>`).join('');
  host.querySelectorAll('[data-a]').forEach(b => b.onpointerdown = e => { e.stopPropagation(); useAbility(b.dataset.a); });
}
function upIcon(k) { // small hand-drawn SVG glyphs (20 x 20), one per skill, so the tree and the HUD don't lean on emoji
  const P = {
    speed: '<path d="M3 13h7M5 9h8M3 5h6" stroke-width="2"/><path d="M12 4l6 6-6 6" stroke-width="2.4"/>',
    sidewind: '<path d="M3 16c4 0 3-6 7-6s3-6 7-6" stroke-width="2.2"/><path d="M14 3h3v3" stroke-width="1.8"/>',
    momentum: '<path d="M5 17V8a4 4 0 0 1 8 0v4" stroke-width="2.2"/><path d="M10 10l3 3 3-3" stroke-width="2"/>',
    ram: '<path d="M3 10h9" stroke-width="3"/><path d="M12 4v12M15 6l3-2M15 14l3 2M15 10h4" stroke-width="2"/>',
    gut: '<path d="M6 3c-2 4 6 5 3 9s-5 5 1 6 8-3 6-7" stroke-width="2.2"/>',
    hoover: '<path d="M3 10c0-3.5 3-6 7-6s7 2.5 7 6-3 6-7 6" stroke-width="2"/><path d="M18 6l-4 2M18 14l-4-2M19 10h-4" stroke-width="1.6"/>',
    dash: '<path d="M2 10h5M4 6h4M4 14h4" stroke-width="1.8"/><path d="M9 4l9 6-9 6 3-6z" stroke-width="1.6" fill="currentColor"/>',
    stride: '<path d="M2 10h14" stroke-width="2.2"/><path d="M13 6l4 4-4 4" stroke-width="2.2"/><path d="M5 7v6M9 7v6" stroke-width="1.4"/>',
    spring: '<path d="M4 16l12-2M4 12l12-2M4 8l12-2M4 4l12-2M4 16l12 2" stroke-width="1.7"/>',
    whip: '<path d="M3 15c0-6 4-10 10-10" stroke-width="2.2"/><path d="M10 2l4 3-3 4" stroke-width="2"/><path d="M8 17h9" stroke-width="1.4"/>',
    pounce: '<path d="M2 16l7-7" stroke-width="2"/><path d="M9 9l4-1-1 4z" fill="currentColor" stroke-width="1.4"/><path d="M14 3l1 4M17 5l-2 3M18 9l-3 0" stroke-width="1.6"/>',
    scent: '<path d="M2 10s3-5.5 8-5.5 8 5.5 8 5.5-3 5.5-8 5.5S2 10 2 10z" stroke-width="1.8"/><path d="M10 6.5c1 1 1 6 0 7c-1-1-1-6 0-7z" fill="currentColor" stroke-width="1.2"/>',
    keen: '<circle cx="10" cy="10" r="2.4" fill="currentColor" stroke-width="1"/><path d="M10 2v3M10 15v3M2 10h3M15 10h3" stroke-width="1.8"/><circle cx="10" cy="10" r="6" stroke-width="1.4" stroke-dasharray="2 2.6"/>',
    gold: '<path d="M10 2.5l6 6-6 9-6-9z" stroke-width="1.8"/><path d="M4 8.5h12M7.5 8.5L10 17.5l2.5-9" stroke-width="1.3"/>',
    crowd: '<circle cx="6" cy="7" r="2.2" stroke-width="1.6"/><circle cx="14" cy="7" r="2.2" stroke-width="1.6"/><circle cx="10" cy="12" r="2.2" stroke-width="1.6"/><path d="M2 17c1-2 3-3 4-3M18 17c-1-2-3-3-4-3" stroke-width="1.5"/>',
    camo: '<path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" stroke-width="1.8"/><path d="M4 16L16 4" stroke-width="2.2"/>',
    cover: '<path d="M10 2.5l6.5 2.5v5c0 4-3 6.5-6.5 7.5C6.5 16.5 3.5 14 3.5 10V5z" stroke-width="1.8"/><path d="M6.5 9h7M7.5 12h5" stroke-width="1.5" stroke-dasharray="1.6 1.6"/>',
    phantom: '<path d="M4 17V9a6 6 0 0 1 12 0v8l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5z" stroke-width="1.8"/><path d="M8 9v1M12 9v1" stroke-width="2"/>',
    breath: '<path d="M2 7h9a2.5 2.5 0 1 0-2.5-2.5M2 11h13a2.5 2.5 0 1 1-2.5 2.5M2 15h6" stroke-width="1.8"/>',
    vortex: '<path d="M10 10a1.5 1.5 0 1 1 1.5 1.5A3.5 3.5 0 1 1 15 8a5.5 5.5 0 1 1-5.5-5.5" stroke-width="1.9"/>',
    skull: '<path d="M4 11a6 6 0 1 1 12 0v2.5H4z" stroke-width="1.8"/><path d="M4 13.5h12v2.5H4zM10 5v4" stroke-width="1.6"/>',
    hiss: '<path d="M3 10c2-3 4-3 6 0s4 3 6 0" stroke-width="2.2"/><path d="M13 5l4-2M13 15l4 2M15 10h3" stroke-width="1.8"/>',
    rattle: '<path d="M10 2.5c2 0 3 1.2 3 2.5s-1 2.5-3 2.5-3-1.2-3-2.5 1-2.5 3-2.5zM10 7.5c2.3 0 3.5 1.3 3.5 2.8s-1.2 2.8-3.5 2.8-3.5-1.3-3.5-2.8 1.2-2.8 3.5-2.8zM10 13c2.6 0 4 1.3 4 2.8s-1.4 2.7-4 2.7-4-1.2-4-2.7 1.4-2.8 4-2.8z" stroke-width="1.5"/><path d="M2 6l2 1M18 6l-2 1M2 14l2-1M18 14l-2-1" stroke-width="1.4"/>',
    shock: '<circle cx="10" cy="10" r="1.8" fill="currentColor" stroke-width="1"/><path d="M5.5 5.5a6.4 6.4 0 0 0 0 9M14.5 5.5a6.4 6.4 0 0 1 0 9M3 3a10 10 0 0 0 0 14M17 3a10 10 0 0 1 0 14" stroke-width="1.7"/>',
  };
  return `<svg class="upi" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k] || ''}</svg>`;
}

/* ---- breaking through furniture (Battering Ram) ---- */
const RAM_TOUCH = ['glass'], TOUCH_KINDS = new Set(RAM_TOUCH); // breaks for anyone who hits it, no Battering Ram needed
const RAM_SMALL = ['chair', 'plant', 'crate', 'hay', 'barrier', 'bin', 'fence', 'glass'], RAM_LARGE = ['tree', 'bush', 'desk', 'table', 'bench', 'couch', 'shelf', 'bed', 'bar', 'booth', 'console', 'speaker'], RAM_HEAVY = ['car', 'rock', 'bwall'];
const RAM_KINDS = [null, new Set(RAM_SMALL), new Set([...RAM_SMALL, ...RAM_LARGE]), new Set([...RAM_SMALL, ...RAM_LARGE, ...RAM_HEAVY])];
RAM_KINDS.push(RAM_KINDS[3]); // tier 4: same targets, softer landings
const ramClass = o => RAM_HEAVY.includes(o.kind) ? 3 : RAM_LARGE.includes(o.kind) ? 2 : 1;
function obstacleHitBy(x, y, r) {
  for (const o of obstacles) {
    if (obsFlag(o, 'noCollide')) continue;
    const sp = shapeOf(o); if (sp) { if (x > o.x - r - 40 && x < o.x + o.w + r + 40 && y > o.y - r - 40 && y < o.y + o.h + r + 40 && polyHit(sp, x, y, r)) return o; continue; }
    if (o.t === 'r') { const nx = clamp(x, o.x, o.x + o.w), ny = clamp(y, o.y, o.y + o.h); if (dist2(x, y, nx, ny) < r * r) return o; }
    else if (dist2(x, y, o.x, o.y) < (r + o.r) ** 2) return o;
  }
  return null;
}
const canRam = o => { const own = upg('ram'), lv = MOD.demolition ? 3 : Math.max(0, own - (MOD.tough ? 1 : 0)); /* Demolition: anything breakable; Tough structures: one tier higher */ if (o && ((TOUCH_KINDS.has(o.kind) && o.kind !== 'border' && (!MOD.tough || own >= 1)) || o.pump)) return true; /* a gas pump goes up whatever hits it */ return lv > 0 && o && o.kind !== 'border' && RAM_KINDS[lv].has(o.kind) && !(o.kind === 'rock' && o.r > 26) && !(o.kind === 'tree' && (o.r > 20 || o.tinfo && o.tinfo.pine && o.r > 16)); }; // only saplings and small trees snap; big trunks still stop you
function smashObstacle(o, ang, quiet) { // quiet: catching up on breakage that happened before you joined (no sound or show)
  const i = obstacles.indexOf(o); if (i < 0) return;
  const mine = !NS.remote; // my snake did it (co-op: replays of other players' smashes only rebuild the world and show it)
  const fx = bfxFor(o); // the prop's own "when it breaks" (38b-destruction); null = the classic smash below
  if (!quiet) smashLook(o, fx, ang); // real pieces of it, the hit, its dust (cut from the map layer before it's redrawn without it)
  obstacles.splice(i, 1);
  if (typeof bucketList !== 'undefined') { const bb = o.t === 'r' ? [o.x - 2, o.y - 2, o.w + 4, o.h + 4] : [o.x - o.r - 2, o.y - o.r - 2, o.r * 2 + 4, o.r * 2 + 4]; // the blood that was on it goes with it (from every blood layer, old and new)
    for (const b of bucketList) { const w = b.wx; w.save(); w.beginPath(); if (o.t === 'r') w.rect(o.x - 1, o.y - 1, o.w + 2, o.h + 2); else w.arc(o.x, o.y, o.r + 1, 0, TAU); w.clip(); w.clearRect(...bb); w.restore(); }
    markW(); }
  if (o.kind === 'tree' || o.kind === 'bush') treeFall(o, ang, quiet); // its canopy goes too, and the leaves come down
  if (o.pump && !quiet) { const px = o.t === 'r' ? o.x + o.w / 2 : o.x, py = o.t === 'r' ? o.y + o.h / 2 : o.y; later.push({ t: .12, f: () => pumpBlast(px, py) }); } // a gas pump: a beat later, it goes up
  const cx = o.t === 'r' ? o.x + o.w / 2 : o.x, cy = o.t === 'r' ? o.y + o.h / 2 : o.y, size = o.t === 'r' ? Math.sqrt(o.w * o.h) : o.r * 1.6;
  if (fx) bfxWreck(bctx, o, fx, ang); else drawWreck(bctx, o, ang); // the broken piece stays on the floor as wreckage
  if (o.kind === 'speaker') { const sp = clubSpeakers.find(q => q.o === o); if (sp) { sp.alive = false; Sfx.speakerDie(sp); } }
  // the rest of a long object (a split table, a glass wall's other panes) stands as it was: no crack lines on the neighbours
  if (!quiet && fx) bfxBurst(o, fx, ang);
  else if (!quiet) for (let k = 0; k < 18 + size / 3; k++) { const a = ang + rand(-1.2, 1.2), sp = rand(60, 230); debris.push({ x: cx + rand(-size / 3, size / 3), y: cy + rand(-size / 3, size / 3), z: rand(4, 16), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(60, 170), t: 0, s: rand(1.6, 3.6), c: pick([o.color, shade(o.color, -.2), shade(o.color, .15)]) }); }
  drawObstacleLayer();
  bakeOutline(); buildSolid(); shadowKey = ''; bakeShadows(); bakeLightMasks({ x: cx, y: cy, r: size });
  const wall = o.kind === 'bwall', hard = wall || o.kind === 'rock'; // rocks knock you silly just like walls
  if (!quiet) { if (fx) Sfx.breakFx(fx.sound, cx, wall ? size * 2.5 : size, fx.vol); else Sfx.smash(cx, wall ? size * 2.5 : size); }
  if (mine && fx && fx.stun !== 'default') { shake = Math.max(shake, 8 * fx.shake); bfxStun(fx); }
  else if (mine) { shake = Math.max(shake, (hard ? 10 : ramClass(o) === 3 ? 4 : 2) * (fx ? fx.shake : 1));
  const lng = (snake.dashV || 1) > 1.25, cls = ramClass(o), dur = (hard ? 2.2 : cls === 3 ? 1 : cls === 2 ? .6 : .3) + (lng ? (hard ? .5 : .2) : 0); // big furniture knocks you a bit longer // lunging in: it hits harder on screen and lasts longer, but you keep more of your speed
  const res = 1; // (Thick Skull shortens the daze where it wears off: see SKV.dazeK in 22-snake)
  const keepMo = sk('momentum') ? .5 : 1; // Momentum: your speed survives the hit
  if (!hard && snake.wallStun > 0) snake.ramT = Math.max(snake.ramT, Math.min(snake.ramMax, dur * res)); // already seeing stars from a wall: furniture doesn't reset it
  else { snake.ramT = snake.ramMax = dur * res; snake.ramDeep = (hard ? .5 : cls === 3 ? .35 : cls === 2 ? .22 : .08) * (lng ? .6 : 1) * res * keepMo; /* small things barely slow you, same daze */ snake.wallStun = snake.wallMax = hard ? dur * res : 0; snake.stunFx = (hard ? .8 : cls === 3 ? .5 : cls === 2 ? .3 : .15) * (lng ? 1.2 : 1) * res; } /* (v1.57: much lighter dazes, the smallest things barely register) */
  if (hard) { snake.dashT = 0; snake.dashV = 1; snake.lk = 0; } } // a wall stops a lunge dead
  if (mine && o.kind === 'glass' && upg('ram') < 1) { snake.ramT = snake.ramMax = 2; snake.ramDeep = .5; snake.wallStun = snake.wallMax = 2; snake.stunFx = .9; snake.dashT = 0; snake.dashV = 1; snake.lk = 0; shake = Math.max(shake, 11); } // no Battering Ram: you go through the glass, but face first // dazed: slower, colours drain, edges blur, all easing back as speed returns
  if (wall && !quiet && !fx) { // a wall: bricks and plaster everywhere, a cloud of dust, and the snake sees stars
    for (let k = 0; k < 40; k++) { const a = ang + rand(-.9, .9), sp = rand(80, 300); debris.push({ x: cx + rand(-o.w / 2, o.w / 2), y: cy + rand(-o.h / 2, o.h / 2), z: rand(6, 20), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(80, 220), t: 0, s: rand(2.4, 5), c: pick([o.color, shade(o.color, -.25), shade(o.color, .2), '#8a7f74']) }); }
    for (let k = 0; k < 14; k++) mist.push({ x: cx + rand(-10, 10), y: cy + rand(-10, 10), vx: Math.cos(ang + rand(-1.4, 1.4)) * rand(20, 90), vy: Math.sin(ang + rand(-1.4, 1.4)) * rand(20, 90), r: rand(6, 14), g: rand(10, 24), t: 0, life: rand(1, 1.8), c: '#aaa096', a: rand(.25, .4) });
    wallSmoke(cx, cy, ang, o.w, o.h);
    if (mine) run.walls = (run.walls || 0) + 1;
  } else if (wall && mine && !quiet) run.walls = (run.walls || 0) + 1;
  const nk = fx ? fx.noise : 1, scare = fx ? fx.scare : wall; // how far it carries, and whether it sends people running
  if (AUTH() && nk > 0) { noise(wall ? 'wallSmash' : 'smash', cx, cy, clamp(size / 40, .6, 1.2) * nk);
  for (const c of nearbyCreatures(cx, cy, 230 * nk, [])) {
    if (MOD.blind && c.def.human) continue; // they hear the crash (above) and work out roughly where it was
    if (scare && c.def.human) { panic(c, cx, cy, rand(3, 5), 'wallSmash'); if (Math.random() < .45) c.reply = { t: rand(1.4, 2.6), ctx: 'stunned' }; continue; } // through the WALL
    if (c.state === 'wander' || c.state === 'idle') { c.state = 'uneasy'; c.fx = cx; c.fy = cy; c.timer = rand(1, 2); if (Math.random() < .4) say(c, 'crash'); }
    else if (c.def.human && Math.random() < .35) c.reply = { t: rand(.3, .9), ctx: 'stunned' };
  } }
  if (!mine) return;
  run.smashed = (run.smashed || 0) + 1; cr.smashed++; PROG.smashed = (PROG.smashed || 0) + 1;
  NET.emit({ type: 'smash', kind: o.kind, x: cx, y: cy }); netBroke(o, 'smash', ang);
}
function drawWreck(x, o, ang) { // a flattened, broken version of the object instead of it vanishing
  if (o.kind === 'speaker') return brokenSpeaker(x, o, ang);
  if (o.kind === 'bwall') return brokenWall(x, o, ang);
  if (o.kind === 'tree') return brokenTree(x, o, ang);
  x.save();
  if (o.t === 'r') { x.beginPath(); const r = seeded(Math.round(o.x * 3 + o.y)); x.moveTo(o.x, o.y); for (let k = 1; k <= 8; k++) x.lineTo(o.x + o.w * k / 8, o.y + r() * o.h * .35); x.lineTo(o.x + o.w, o.y + o.h); for (let k = 7; k >= 0; k--) x.lineTo(o.x + o.w * k / 8, o.y + o.h - r() * o.h * .35); x.closePath(); x.clip(); }
  x.globalAlpha = .7; drawObstacle(x, { ...o, cracked: true });
  x.globalAlpha = .45; x.fillStyle = '#1a1210'; if (o.t === 'r') x.fillRect(o.x, o.y, o.w, o.h); else circ(x, o.x, o.y, o.r);
  x.restore();
  const cx = o.t === 'r' ? o.x + o.w / 2 : o.x, cy = o.t === 'r' ? o.y + o.h / 2 : o.y, size = o.t === 'r' ? Math.sqrt(o.w * o.h) : o.r * 1.6;
  x.save(); x.globalAlpha = .6; x.fillStyle = shade(o.color, -.35);
  for (let k = 0; k < 6 + size / 6; k++) { const a = ang + rand(-1.4, 1.4), d = rand(0, size * .9); x.save(); x.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d); x.rotate(rand(0, TAU)); x.fillRect(-rand(2, 6), -1.2, rand(4, 12), rand(1.6, 3)); x.restore(); }
  x.restore();
}
function brokenTree(x, o, ang) { // snapped at the base: a splintered stump, the trunk and crown lying where it fell, leaves everywhere
  const r = seeded(Math.round(o.x * 5 + o.y * 3)), ca = Math.cos(ang), sa = Math.sin(ang), L = o.r * 2.2;
  x.save();
  x.fillStyle = 'rgba(0,0,0,.22)'; x.save(); x.translate(o.x + ca * L * .6 + 2, o.y + sa * L * .6 + 3); x.rotate(ang); ell(x, 0, 0, L * .6, o.r * .55); x.restore(); // shadow of the fallen crown
  x.save(); x.translate(o.x, o.y); x.rotate(ang); // the trunk, lying along the hit
  x.fillStyle = '#5a3d24'; x.fillRect(0, -o.r * .16, L * .55, o.r * .32); x.fillStyle = '#7a5434'; x.fillRect(0, -o.r * .16, L * .55, o.r * .09);
  for (let k = 0; k < 9; k++) { const t = .45 + r() * .9; x.fillStyle = r() < .5 ? o.color : shade(o.color, r() < .5 ? .15 : -.2); circ(x, L * t, (r() - .5) * o.r * 1.1, o.r * (.28 + r() * .3)); } // the crown, flattened and spread
  x.restore();
  x.fillStyle = '#4a3220'; circ(x, o.x, o.y, o.r * .26); x.fillStyle = '#c9a473'; circ(x, o.x, o.y, o.r * .19); x.strokeStyle = '#9a7a4f'; x.lineWidth = .6; x.beginPath(); x.arc(o.x, o.y, o.r * .11, 0, TAU); x.stroke(); // stump with its rings
  x.strokeStyle = '#e2c79a'; x.lineWidth = 1; for (let k = 0; k < 5; k++) { const a = r() * TAU, d = o.r * .2; x.beginPath(); x.moveTo(o.x + Math.cos(a) * d, o.y + Math.sin(a) * d); x.lineTo(o.x + Math.cos(a) * (d + 2 + r() * 3), o.y + Math.sin(a) * (d + 2 + r() * 3)); x.stroke(); } // splinters
  for (let k = 0; k < 18; k++) { const a = ang + (r() - .5) * 2.6, d = r() * L * 1.2; x.fillStyle = shade(o.color, (r() - .5) * .4); ell(x, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d, 1.4, .9); } // loose leaves
  x.restore();
}
function splitBreakables(list) { // long furniture breaks a section at a time, not all at once
  const out = [];
  let g = 0;
  for (const o of list) {
    const L = Math.max(o.w || 0, o.h || 0);
    if (o.t !== 'r' || !(RAM_KINDS[2].has(o.kind) || TOUCH_KINDS.has(o.kind)) || L < 110 || o.kind === 'desk') { out.push(o); continue; } // a long glass wall breaks a pane at a time
    const hz = o.w >= o.h, n = Math.ceil(L / 64), step = L / n; g++;
    const whole = { x: o.x, y: o.y, w: o.w, h: o.h }; // each section draws its slice of the whole thing, so it reads as one piece (no seams) until a part breaks off
    for (let k = 0; k < n; k++) out.push(hz ? { ...o, x: o.x + k * step, w: step, group: g, whole, gk: k } : { ...o, y: o.y + k * step, h: step, group: g, whole, gk: k });
  }
  return out;
}
function outlineBreakables(x) { // with the Battering Ram, everything you can smash wears an amber dashed edge
  if (!upg('ram')) return;
  x.save(); x.strokeStyle = 'rgba(255,186,70,.75)'; x.lineWidth = 1.4; x.setLineDash([4, 3]);
  for (const o of obstacles) if (canRam(o)) { x.beginPath(); if (o.t === 'r') x.rect(o.x - 1.5, o.y - 1.5, o.w + 3, o.h + 3); else x.arc(o.x, o.y, o.r + 1.5, 0, TAU); x.stroke(); }
  x.restore();
}

function canSeeSnake(c) {
  const s = snake, d = Math.hypot(c.x - s.x, c.y - s.y), sight = c.def.sight * (MOD.skittish ? 1.5 : MOD.oblivious ? .6 : 1) * (MOD.fog ? .55 : 1) * (s.camoT > 0 ? 0 : 1);
  return d < (s.camoT > 0 ? 24 : 40) || (d < sight && lightAt(s.x, s.y) > VISIBLE && los(c.x, c.y, s.x, s.y));
}
/* ---- 3rd Eye: a sixth sense for the fight. Five times a second it reads the danger round you (bomb markers by how soon they land,
   strafing lanes the rounds haven't reached yet) and lays the best way through it, around walls and through doorways:
   out of trouble first, then to gold, to the crowds out in the open, to the next meal. E is Focus: the world slows for a moment ---- */
let wisps = []; // (old name kept: other code clears it between runs)
let scentTrails = [];
const NAV = 16; let navGrid = null, navKey = '', navT = 0;
const EYE_COL = { out: '120,235,255', life: '255,170,60', gold: '255,214,70', crowd: '255,110,200' };
function navBuild() { // which 16 px cells the snake can't get through (any solid in them)
  const gw = Math.ceil(W / NAV), gh = Math.ceil(H / NAV), key = gw + 'x' + gh + ':' + obstacles.length;
  if (navGrid && navKey === key && T - navT < 3) return navGrid; navKey = key; navT = T;
  const g = new Uint8Array(gw * gh), k = NAV / SG, n = gw * gh;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { let b = 0; for (let v = 0; v < k && !b; v++) for (let u = 0; u < k; u++) { const gx = i * k + u, gy = j * k + v; if (gx < GW && gy < GH && solidGrid[gy * GW + gx]) { b = 1; break; } } g[j * gw + i] = b; }
  const old = navGrid && navGrid.g.length === n ? navGrid : null; // the work arrays survive a rebuild of the same size
  return navGrid = { g, gw, gh, dang: old ? old.dang : new Float32Array(n), cost: old ? old.cost : new Float32Array(n), par: old ? old.par : new Int32Array(n), hk: old ? old.hk : new Float32Array(n * 4), hv: old ? old.hv : new Int32Array(n * 4) };
}
function eyeDanger(N) { // how deadly each cell is about to be: 1 = a bomb about to land, the lane right in front of the rounds
  const { gw, gh, dang } = N, pad = snakeRadius() * .6 + 10; dang.fill(0); let any = false;
  const mark = (x0, y0, x1, y1, f) => { const i0 = clamp(x0 / NAV | 0, 0, gw - 1), i1 = clamp(x1 / NAV | 0, 0, gw - 1), j0 = clamp(y0 / NAV | 0, 0, gh - 1), j1 = clamp(y1 / NAV | 0, 0, gh - 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const w = f((i + .5) * NAV, (j + .5) * NAV); if (w > dang[j * gw + i]) { dang[j * gw + i] = w; any = true; } } };
  if (typeof strikes !== 'undefined') {
    for (const s of strikes) { const r = s.r + pad, w = clamp(1.4 - s.t / 3, .55, 1); mark(s.x - r, s.y - r, s.x + r, s.y + r, (x, y) => dist2(x, y, s.x, s.y) < r * r ? w : 0); }
    for (const s of strafes) { if (s.front >= s.len) continue; const hw = s.hw + pad, a0 = Math.max(0, s.front - 10), w = s.t < -2.5 ? .6 : 1;
      const xa = s.x0 + s.ca * a0, ya = s.y0 + s.sa * a0, xb = s.x0 + s.ca * s.len, yb = s.y0 + s.sa * s.len;
      mark(Math.min(xa, xb) - hw, Math.min(ya, yb) - hw, Math.max(xa, xb) + hw, Math.max(ya, yb) + hw, (x, y) => { const dx = x - s.x0, dy = y - s.y0, al = dx * s.ca + dy * s.sa; return al >= a0 && al <= s.len && Math.abs(dy * s.ca - dx * s.sa) < hw ? w : 0; }); }
  }
  return any;
}
function eyeSearch(N, sx, sy) { // cheapest way to every cell from your head (Dijkstra; danger is very expensive to cross, never forbidden: sometimes the only way out is through)
  const { g, gw, gh, dang, cost, par, hk, hv } = N, cap = hk.length;
  cost.fill(Infinity); let c = clamp(sy / NAV | 0, 0, gh - 1) * gw + clamp(sx / NAV | 0, 0, gw - 1);
  if (g[c]) { let best = -1; for (let r = 1; r <= 2 && best < 0; r++) for (let v = -r; v <= r && best < 0; v++) for (let u = -r; u <= r; u++) { const i = (c % gw) + u, j = (c / gw | 0) + v; if (i >= 0 && j >= 0 && i < gw && j < gh && !g[j * gw + i]) { best = j * gw + i; break; } } if (best < 0) return -1; c = best; } // your head is up against a wall
  let n = 0; const push = (k, v) => { if (n >= cap) return; let i = n++; while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= k) break; hk[i] = hk[p]; hv[i] = hv[p]; i = p; } hk[i] = k; hv[i] = v; };
  const pop = () => { const v = hv[0], k = hk[--n], w = hv[n]; let i = 0; for (;;) { let m = 2 * i + 1; if (m >= n) break; if (m + 1 < n && hk[m + 1] < hk[m]) m++; if (hk[m] >= k) break; hk[i] = hk[m]; hv[i] = hv[m]; i = m; } hk[i] = k; hv[i] = w; return v; };
  cost[c] = 0; par[c] = -1; push(0, c); const limit = 150 * SKV.eyeRange(); // about 2400 px of path (more with Keen Eye): anything further is not worth pointing at
  while (n) { const k0 = hk[0], q = pop(); if (k0 > cost[q] || k0 > limit) continue; const qi = q % gw, qj = q / gw | 0;
    for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { if (!u && !v) continue; const i = qi + u, j = qj + v; if (i < 0 || j < 0 || i >= gw || j >= gh) continue; const k = j * gw + i; if (g[k]) continue;
      if (u && v && (g[qj * gw + i] || g[j * gw + qi])) continue; // no cutting corners past a wall
      const nc = k0 + (u && v ? 1.414 : 1) * (1 + 16 * dang[k]); if (nc < cost[k]) { cost[k] = nc; par[k] = q; push(nc, k); } } }
  return c;
}
function eyePath(N, sx, sy, to, tx, ty) { // the route found above, walked back from the target, smoothed into a curve
  const { gw, par, cost } = N; if (!(cost[to] < Infinity)) return null;
  const cells = []; for (let c = to, n = 0; c >= 0 && n < 600; c = par[c], n++) cells.push(c);
  const pts = [sx, sy]; for (let i = cells.length - 2; i >= 0; i--) pts.push((cells[i] % gw + .5) * NAV, ((cells[i] / gw | 0) + .5) * NAV);
  if (tx !== undefined) pts.push(tx, ty);
  let P = pts; for (let it = 0; it < 2; it++) { const o = [P[0], P[1]]; for (let i = 0; i < P.length - 2; i += 2) { const ax = P[i], ay = P[i + 1], bx = P[i + 2], by = P[i + 3]; o.push(ax * .75 + bx * .25, ay * .75 + by * .25, ax * .25 + bx * .75, ay * .25 + by * .75); } o.push(P[P.length - 2], P[P.length - 1]); P = o; } // Chaikin: no stair steps
  const L = new Float32Array(P.length / 2); for (let i = 1; i < L.length; i++) L[i] = L[i - 1] + Math.hypot(P[2 * i] - P[2 * i - 2], P[2 * i + 1] - P[2 * i - 1]);
  return { P, L, len: L[L.length - 1] };
}
const eyeCell = (N, x, y) => clamp(y / NAV | 0, 0, N.gh - 1) * N.gw + clamp(x / NAV | 0, 0, N.gw - 1);
function eyeOpen(N, x, y) { // how open the ground round a spot is (0 boxed in, 1 wide open)
  const ci = clamp(x / NAV | 0, 0, N.gw - 1), cj = clamp(y / NAV | 0, 0, N.gh - 1); let s = 0, n = 0;
  for (let v = -4; v <= 4; v++) for (let u = -4; u <= 4; u++) { const i = ci + u, j = cj + v; n++; if (i < 0 || j < 0 || i >= N.gw || j >= N.gh || N.g[j * N.gw + i]) s++; }
  return 1 - s / n;
}
function eyePlan(s) { // what to show: a way out if you're in a pickle, a lifeline if your combo is dying, gold, a crowd in the open, the next meal
  const N = navBuild(), hot = eyeDanger(N), start = eyeSearch(N, s.x, s.y), want = {};
  if (start < 0) return want;
  const { dang, cost, gw, gh } = N, at = (x, y) => eyeCell(N, x, y);
  let danger = 0; if (hot) { const n = s.segs ? Math.max(3, Math.ceil(s.segs.length * .3)) + 2 : 1; for (let i = 0; i < n && s.segs && i < s.segs.length; i += 2) danger = Math.max(danger, dang[at(s.segs[i].x, s.segs[i].y)]); danger = Math.max(danger, dang[start]);
    if (!danger) { const ax = s.x + Math.cos(s.angle) * 70, ay = s.y + Math.sin(s.angle) * 70; danger = dang[at(ax, ay)] * .8; } } // about to head straight into one counts too
  if (danger > 0) { // a way out: the cheapest cell far enough from every danger that the front of your body clears it too
    const dd = N.dd || (N.dd = new Int16Array(gw * gh)), q = N.q || (N.q = new Int32Array(gw * gh)); let h = 0, e = 0;
    for (let k = 0; k < dd.length; k++) if (dang[k] > 0) { dd[k] = 0; q[e++] = k; } else dd[k] = 32767;
    while (h < e) { const c = q[h++], ci = c % gw, cj = c / gw | 0, d = dd[c] + 1; if (d > 12) continue; // distance (in cells) to the nearest danger
      for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { const i = ci + u, j = cj + v; if (i < 0 || j < 0 || i >= gw || j >= gh) continue; const k = j * gw + i; if (dd[k] > d) { dd[k] = d; q[e++] = k; } } }
    let fl = 0; if (s.segs) { const n = Math.max(3, Math.ceil(s.segs.length * .3)); for (let i = 1; i < n && i < s.segs.length; i++) fl += Math.hypot(s.segs[i].x - s.segs[i - 1].x, s.segs[i].y - s.segs[i - 1].y); }
    const m = clamp(Math.round(fl / NAV), 2, 9);
    let best = -1, bc = Infinity;
    for (let k = 0; k < cost.length; k++) { const c = cost[k]; if (c < bc && dd[k] > m && !N.g[k]) { bc = c; best = k; } }
    if (best >= 0 && bc > 1.5) /* (already clear: the body follows the head out) */ want.out = { cell: best, x: (best % gw + .5) * NAV, y: ((best / gw | 0) + .5) * NAV, k: danger };
  }
  const reach = c => { const k = at(c.x, c.y); return cost[k] < Infinity ? cost[k] * NAV : Infinity; };
  const safeAt = c => 1 - dang[at(c.x, c.y)]; // walking into a bomb for a meal is not a plan
  const cur = kind => (scentTrails.find(t => t.kind === kind && !t.dying) || {}).c;
  if (combo && typeof comboDur === 'function' && combo.t / comboDur() < .35) { // your combo is about to die: the nearest thing you can eat in time
    let best = null, bd = Infinity; for (const c of creatures) { if (!c.alive || c.def.fly || c.def.glow) continue; const d = reach(c) / Math.max(.15, safeAt(c)); if (d < bd) { bd = d; best = c; } }
    if (best && bd < 900) want.life = { c: best };
  }
  if (sk('gold')) { let best = null, bs = 0; for (const c of creatures) { if (!c.alive || !c.golden) continue; const d = reach(c); if (d === Infinity) continue; const sc = (c.def.human ? 2 : 1) * safeAt(c) * (c === cur('gold') ? 1.4 : 1) / (d + 120); if (sc > bs) { bs = sc; best = c; } } if (best) want.gold = { c: best }; } // gold, even with bombs coming down: the way round them
  if (sk('crowd')) { const pc = cur('crowd'); let best = null, bs = 0; for (const c of creatures) { if (!c.alive || !c.def.human || c === (want.gold && want.gold.c)) continue; // big crowds out in the open, where a lunge can tear through them
      const n = countNearby(c.x, c.y, 95, isHuman, c); if (n < 3) continue; const d = reach(c); if (d === Infinity || d > 1800) continue; const op = eyeOpen(N, c.x, c.y); if (op < .7) continue;
      const sc = Math.pow(n + 1, 1.4) * op * safeAt(c) * (pc && pc.alive && dist2(c.x, c.y, pc.x, pc.y) < 120 * 120 ? 1.6 : 1) / (d + 260); /* the same crowd as before: stay on it */ if (sc > bs) { bs = sc; best = c; } }
    if (best && pc && pc.alive && best !== pc && dist2(best.x, best.y, pc.x, pc.y) < 120 * 120 && reach(pc) < Infinity) best = pc; // still the same crowd: keep the same trail
    if (best) want.crowd = { c: best }; }
  if (!want.out && !want.life) { const pref = cur('meal'); let best = null, bs = 0; // the next meal: big and close, unaware, a crowd over a loner
    for (const c of creatures) { if (!c.alive || c.def.fly || c.def.glow || c === (want.gold && want.gold.c) || c === (want.crowd && want.crowd.c)) continue; const d = reach(c); if (d === Infinity) continue;
      let val = c.def.human ? 2 : (c.def.score || 1) * (1 + c.def.r / 12); if (c.golden) val *= 4;
      if (c.def.human) val *= 1 + countNearby(c.x, c.y, 70, isHuman, c) * .45;
      if (c.state === 'wander' || c.state === 'idle') val *= 1.3; else if (c.state === 'panic') val *= .75;
      const sc = val * safeAt(c) * (c === pref ? 1.6 : 1) / (d + 90); if (sc > bs) { bs = sc; best = c; } }
    if (best) want.meal = { c: best }; }
  return want;
}
function eyeCol(t) { return EYE_COL[t.kind] || (t.c ? (t.c.golden ? '255,214,70' : t.c.def.alien ? '140,255,120' : t.c.def.human ? '255,120,110' : '150,235,255') : '235,225,205'); }
const FOCUS = { until: 0, t0: 0 };
function timeScale() { // Focus: the world slows right down for a moment (solo only: co-op shares one clock)
  if (NETM.run || state !== 'play') return 1; const now = performance.now(); if (now >= FOCUS.until) return 1;
  const a = (now - FOCUS.t0) / 140, b = (FOCUS.until - now) / 220; return 1 - .62 * clamp(Math.min(a, b, 1), 0, 1);
}
function updateScent(dt) {
  const s = snake; wisps.length = 0;
  if (!s || !s.alive || !sk('scent') || state !== 'play' || !solidGrid) { for (const t of scentTrails) t.fade = Math.min(t.fade, 1) - dt * 3; scentTrails = scentTrails.filter(t => t.fade > 0); return; }
  if (s.pingT > 0) s.pingT -= dt;
  const sig = (typeof strikes !== 'undefined' ? strikes.length * 31 + strafes.length : 0) + (combo ? 1000 : 0); // a new bomb or lane: look again right away
  if ((updateScent.t = (updateScent.t || 0) - dt) <= 0 || sig !== updateScent.sig) { updateScent.t = .2; updateScent.sig = sig; // five times a second
    const want = eyePlan(s), wasOut = scentTrails.some(t => t.kind === 'out' && !t.dying);
    for (const t of scentTrails) if (!want[t.kind] || t.c !== (want[t.kind].c || null) || (t.c && !t.c.alive)) t.dying = true;
    for (const kind in want) { const w = want[kind], N = navGrid;
      let t = scentTrails.find(q => q.kind === kind && !q.dying); if (!t) scentTrails.push(t = { kind, c: w.c || null, fade: 0, off: Math.random() * 40 });
      const p = w.c ? eyePath(N, s.x, s.y, eyeCell(N, w.c.x, w.c.y), w.c.x, w.c.y) : eyePath(N, s.x, s.y, w.cell); if (p) Object.assign(t, p, { k: w.k || 0, ex: w.x, ey: w.y }); else t.dying = true; }
    if (want.out && !wasOut && Sfx.ok() && Sfx.gate('eye', 1.2)) Sfx.eye();
  }
  for (const t of scentTrails) { t.fade = t.dying ? t.fade - dt * 3 : Math.min(1, t.fade + dt * 4); if (t.P) { t.P[0] = s.x; t.P[1] = s.y; } t.off = (t.off + dt * (t.kind === 'out' ? 170 : 95)) % 1e5; } // the trail stays stuck to your head between re-plans
  scentTrails = scentTrails.filter(t => t.fade > 0);
}
function drawScent(x) {
  const s = snake; if (!s) return;
  x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
  const lv = sk('scent'), rk = SKV.eyeRange(), fx = Math.min(1, FX_K()), foc = timeScale() < 1 || s.pingT > 0 ? 1.35 : 1;
  for (const t of scentTrails) { if (!t.P || t.fade <= 0) continue;
    const out = t.kind === 'out', P = t.P, L = t.L, n = L.length, col = eyeCol(t), reach = out ? Math.max(260, t.len + 40) : (t.kind === 'meal' ? 560 : 900) * rk, end = Math.min(t.len, reach), a0 = Math.min(1, (out ? .95 : .6) * t.fade * foc);
    for (let i = 1; i < n && L[i - 1] < end; i++) { const f = 1 - L[i] / reach; if (f <= 0) break; // a soft band, strong by your head and thinning out along the way
      x.strokeStyle = `rgba(${col},${(a0 * (out ? .4 : .3) * f).toFixed(3)})`; x.lineWidth = (out ? 11 : 7) * f + 2; x.beginPath(); x.moveTo(P[2 * i - 2], P[2 * i - 1]); x.lineTo(P[2 * i], P[2 * i + 1]); x.stroke(); }
    const gap = (out ? 22 : 26) / Math.max(.4, fx); let j = 1; // marks streaming along it: chevrons on a way out, motes toward a meal
    for (let d = t.off % gap; d < end; d += gap) { while (j < n - 1 && L[j] < d) j++; const u = (d - L[j - 1]) / Math.max(.001, L[j] - L[j - 1]), px = P[2 * j - 2] + (P[2 * j] - P[2 * j - 2]) * u, py = P[2 * j - 1] + (P[2 * j + 1] - P[2 * j - 1]) * u, f = 1 - d / reach;
      if (d < 16) continue; const al = (a0 * 1.6 * f * Math.min(1, d / 40)).toFixed(3);
      if (out) { const a = Math.atan2(P[2 * j + 1] - P[2 * j - 1], P[2 * j] - P[2 * j - 2]), z = 5 + 2 * f; x.strokeStyle = `rgba(${col},${al})`; x.lineWidth = 2.4; x.beginPath(); x.moveTo(px - Math.cos(a - .7) * z, py - Math.sin(a - .7) * z); x.lineTo(px, py); x.lineTo(px - Math.cos(a + .7) * z, py - Math.sin(a + .7) * z); x.stroke(); }
      else { x.fillStyle = `rgba(${col},${al})`; x.beginPath(); x.arc(px, py, 1.3 + 1.6 * f, 0, TAU); x.fill(); } }
    if (out && t.ex !== undefined) { const r = 12 + 3 * Math.sin(T * 8); x.strokeStyle = `rgba(${col},${(a0 * .9).toFixed(3)})`; x.lineWidth = 2; x.setLineDash([4, 4]); x.lineDashOffset = -T * 40; x.beginPath(); x.arc(t.ex, t.ey, r, 0, TAU); x.stroke(); x.setLineDash([]); } // the safe spot
    else if (t.c && t.c.alive && t.len < reach) { const f = 1 - t.len / reach, big = t.kind === 'crowd' ? 22 : 7, r = t.c.def.r + big + 2.5 * Math.sin(T * 5); x.strokeStyle = `rgba(${col},${(a0 * 1.4 * (.4 + .6 * f)).toFixed(3)})`; x.lineWidth = t.kind === 'crowd' ? 2.2 : 1.6; x.beginPath(); x.arc(t.c.x, t.c.y, r, 0, TAU); x.stroke(); } // what's at the end, once you're close
  }
  if (lv && s.pingT > 0) { const k = Math.min(1, s.pingT); x.lineWidth = 1.5; // Focus: everyone close by lights up for a moment, through the dark
    for (const c of creatures) { if (!c.alive || c.def.fly) continue; const d = Math.hypot(c.x - s.x, c.y - s.y); if (d > 900) continue;
      x.strokeStyle = `rgba(${c.golden ? '255,214,70' : c.def.human ? '255,140,120' : '170,230,255'},${(.7 * k * (1 - d / 1000)).toFixed(3)})`; x.beginPath(); x.arc(c.x, c.y, c.def.r + 5, 0, TAU); x.stroke(); } }
  if (sk('gold')) { // Gold Sense: who can see you right now
    x.lineWidth = 1.4;
    for (const c of creatures) {
      if (!c.alive || !c.def.human) continue;
      const scared = c.state === 'panic' || c.state === 'flee', sees = !scared && canSeeSnake(c); if (!sees) continue;
      x.strokeStyle = 'rgba(255,70,60,.8)'; x.beginPath(); x.arc(c.x, c.y, c.def.r + 6 + Math.sin(T * 6 + (c.seed ?? .5) * 20) * 1.2, 0, TAU); x.stroke();
      x.fillStyle = 'rgba(255,70,60,.08)'; x.beginPath(); x.moveTo(c.x, c.y); x.arc(c.x, c.y, Math.min(90, c.def.sight * .6), c.a - .6, c.a + .6); x.closePath(); x.fill();
    }
  }
  x.restore();
}
/* ---- screen edges: a blur round the edges mid-lunge, a cold vignette while Focus slows the world ---- */
const EDGE_K = { lb: 0, fk: 0 }; // how far into a lunge (lb) and into Focus (fk) the screen edges are: the canvas blurs them (lungeEdges), #edgeFx adds the tint and speed lines
function edgeFxTick() {
  const el = document.getElementById('edgeFx'); if (!el) return;
  const s = snake, live = state === 'play' && s && s.alive, lb = live && !SETTINGS.reduceMotion ? clamp(s.lk || 0, 0, 1) : 0, fk = live ? clamp(1 - (timeScale() - .38) / .62, 0, 1) : 0;
  EDGE_K.lb = lb; EDGE_K.fk = fk;
  const key = (lb * 20 | 0) + ':' + (fk * 20 | 0); if (key === el.dataset.k) return; el.dataset.k = key;
  el.style.display = lb > .03 || fk > .03 ? '' : 'none';
  el.style.setProperty('--lb', lb.toFixed(2)); el.style.setProperty('--fk', fk.toFixed(2));
}
/* ---- Hiss: a visible soundwave rolling out; Battering Ram: a pressure wedge at the head just before impact ---- */
function drawHissWave(x) {
  const s = snake; if (!s || !(s.hissT > 0)) return;
  const p = 1 - s.hissT / ABIL.hiss.dur, R = s.hissR || 190;
  for (let k = 0; k < 3; k++) { const q = p - k * .12; if (q <= 0 || q >= 1) continue;
    const r = R * (1 - Math.pow(1 - q, 2.2)), al = (1 - q) * (s.hissLv > 2 ? .5 : .35);
    x.strokeStyle = `rgba(230,255,220,${al})`; x.lineWidth = (s.hissLv > 2 ? 5 : 3) * (1 - q) + 1; x.beginPath();
    for (let a = 0; a <= TAU + .01; a += TAU / 48) { const wob = Math.sin(a * 9 + T * 30) * 2.2 * (1 - q); x.lineTo(s.x + Math.cos(a) * (r + wob), s.y + Math.sin(a) * (r + wob)); } x.stroke(); }
}
function drawRamCharge(x) {
  const s = snake; if (!s || !s.alive || !upg('ram') || state !== 'play') return;
  const ca = Math.cos(s.angle), sa = Math.sin(s.angle), o = obstacleHitBy(s.x + ca * 22 * s.scale, s.y + sa * 22 * s.scale, snakeHitRadius() * 1.1);
  s.ramGlow = (s.ramGlow || 0) + (((o && canRam(o)) ? 1 : 0) - (s.ramGlow || 0)) * .3;
  if (s.ramGlow < .03) return;
  const g = s.ramGlow, hx = s.x + ca * 9, hy = s.y + sa * 9; // a bow wave of force bunching up ahead of the head
  x.save(); x.translate(hx, hy); x.rotate(s.angle);
  for (let k = 0; k < 3; k++) { x.strokeStyle = `rgba(255,${200 - k * 40},120,${(.55 - k * .15) * g})`; x.lineWidth = 2.4 - k * .6; x.beginPath(); x.arc(-4 - k * 3, 0, 9 + k * 3.5, -.9, .9); x.stroke(); }
  x.restore();
}
let clubSpeakers = []; // the club's music comes out of these; set up on map load
function setupSpeakers() { clubSpeakers = MAPS[mapIdx].club ? obstacles.filter(o => o.kind === 'speaker').map(o => ({ o, x: o.x + o.w / 2, y: o.y + o.h / 2, alive: true })) : []; if (Sfx.mus) { Sfx.mus.g.disconnect(); Sfx.mus = null; } }
function brokenSpeaker(x, o, ang) { // still standing, but gutted: cones blown out, box split, wires hanging
  const X = o.x, Y = o.y, w = o.w, h = o.h, r = seeded(Math.round(X * 7 + Y));
  x.save(); x.translate(X + w / 2, Y + h / 2); x.rotate((r() - .5) * .12); x.translate(-w / 2, -h / 2);
  x.fillStyle = '#0d0b10'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2a2630'; x.lineWidth = 2; x.strokeRect(1, 1, w - 2, h - 2);
  const big = Math.min(w, h) * .32, cones = h >= w ? [[w / 2, h * .3], [w / 2, h * .72]] : [[w * .3, h / 2], [w * .72, h / 2]];
  for (const [cx, cy] of cones) {
    x.fillStyle = '#050406'; circ(x, cx, cy, big); // the hole where the cone was
    x.fillStyle = '#3a3440'; for (let k = 0; k < 5; k++) { const a = r() * TAU; x.beginPath(); x.moveTo(cx + Math.cos(a) * big, cy + Math.sin(a) * big); x.lineTo(cx + Math.cos(a + .35) * big, cy + Math.sin(a + .35) * big); x.lineTo(cx + Math.cos(a + .17) * big * .35, cy + Math.sin(a + .17) * big * .35); x.fill(); } // torn flaps
    x.strokeStyle = '#6a5a3a'; x.lineWidth = .8; x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(cx + 6, cy + 4, cx + 3 + r() * 6, cy + big + 4); x.stroke(); // a dangling wire
  }
  x.strokeStyle = 'rgba(160,150,170,.35)'; x.lineWidth = 1; x.beginPath(); let px = r() * w, py = 0; x.moveTo(px, py); while (py < h) { px += (r() - .5) * 10; py += 6 + r() * 6; x.lineTo(px, py); } x.stroke(); // split down the cabinet
  x.restore();
  x.fillStyle = 'rgba(20,16,22,.6)'; for (let k = 0; k < 10; k++) { const a = ang + rand(-1.2, 1.2), d = rand(4, 26); circ(x, X + w / 2 + Math.cos(a) * d, Y + h / 2 + Math.sin(a) * d, rand(.8, 2)); }
}

/* ---- tier 3 ram: authored wall sections that can be smashed open (shortcuts and escape routes) ---- */
const BREAK_WALLS = {
  Office: [[560, 326, 60, 14], [706, 560, 14, 52], [690, 236, 60, 14]], // each opens a second way in: open plan <-> corridor, open plan <-> kitchen, corridor <-> corner office
  'Alien Facility': [[316, 110, 14, 60], [630, 110, 14, 60], [470, 480, 14, 60]], // lab | control | cryo, and hangar | reactor: break both top ones and the north rooms loop
  'Space Station': [[100, 190, 60, 14], [800, 190, 60, 14], [100, 436, 60, 14], [800, 436, 60, 14]], // each bay's hall-side wall: a second way out of every bay
  Bunker: [[330, 130, 14, 60], [640, 108, 14, 60], [390, 510, 14, 60], [700, 470, 14, 60]], // one in every wall between neighbouring rooms: break through and the rooms loop into each other
};
function addBreakWalls(list, mapName) { // cut each marked section out of the wall it sits in, as its own breakable piece
  let secs = BREAK_WALLS[mapName] || [];
  if (mapName === 'Maze') { // three hedge sections, picked the same way every time
    const r = seeded(4242), cand = list.filter(o => o.t === 'r' && o.kind === 'hedge' && Math.max(o.w, o.h) >= 90 && o.x > 40 && o.y > 40 && o.x + o.w < W - 40 && o.y + o.h < H - 40);
    secs = []; for (let k = 0; k < 3 && cand.length; k++) { const o = cand.splice(Math.floor(r() * cand.length), 1)[0], hz = o.w >= o.h, L = hz ? o.w : o.h, a = Math.round((L - 44) / 2); secs.push(hz ? [o.x + a, o.y, 44, o.h] : [o.x, o.y + a, o.w, 44]); }
  }
  let g = 0;
  for (const [x, y, w, h] of secs) {
    const i = list.findIndex(o => o.t === 'r' && o.kind !== 'bwall' && x >= o.x - .5 && y >= o.y - .5 && x + w <= o.x + o.w + .5 && y + h <= o.y + o.h + .5); if (i < 0) continue;
    const o = list[i], id = 'bw' + g++; list.splice(i, 1);
    const parts = o.w >= o.h ? [[o.x, o.y, x - o.x, o.h], [x + w, o.y, o.x + o.w - x - w, o.h]] : [[o.x, o.y, o.w, y - o.y], [o.x, y + h, o.w, o.y + o.h - y - h]];
    for (const [px, py, pw, ph] of parts) if (pw > 1 && ph > 1) list.push({ ...o, x: px, y: py, w: pw, h: ph, bgroup: id });
    list.push({ ...o, x, y, w, h, kind: 'bwall', base: o.kind, bgroup: id });
  }
  return list;
}
function drawBreakWall(x, o) { // the same wall, but you can see it's weak: patched bricks and a long crack
  const X = o.x, Y = o.y, w = o.w, h = o.h, hz = w >= h, r = seeded(Math.round(X * 3 + Y * 7));
  if (o.base === 'hedge') { x.fillStyle = shade(o.color, -.28); x.fillRect(X, Y, w, h); x.fillStyle = shade(o.color, -.05); for (let k = 0; k < 6; k++) circ(x, X + r() * w, Y + r() * h, Math.min(w, h) * .35); x.fillStyle = 'rgba(70,45,25,.6)'; for (let k = 0; k < 4; k++) x.fillRect(X + r() * w, Y + r() * h, 2, 2); }
  else {
    x.fillStyle = shade(o.color, -.06); x.fillRect(X, Y, w, h);
    x.strokeStyle = shade(o.color, -.28); x.lineWidth = .8; x.beginPath(); // brick courses
    if (hz) { for (let yy = Y + 4.5; yy < Y + h; yy += 4.5) { x.moveTo(X, yy); x.lineTo(X + w, yy); } for (let xx = X + 7; xx < X + w; xx += 10) { x.moveTo(xx, Y); x.lineTo(xx, Y + h); } }
    else { for (let xx = X + 4.5; xx < X + w; xx += 4.5) { x.moveTo(xx, Y); x.lineTo(xx, Y + h); } for (let yy = Y + 7; yy < Y + h; yy += 10) { x.moveTo(X, yy); x.lineTo(X + w, yy); } }
    x.stroke();
  }
  x.strokeStyle = 'rgba(20,12,10,.75)'; x.lineWidth = 1.1; x.beginPath(); let px = X + (hz ? 3 : w / 2), py = Y + (hz ? h / 2 : 3); x.moveTo(px, py);
  while (hz ? px < X + w - 3 : py < Y + h - 3) { if (hz) { px += 5 + r() * 5; py = Y + h / 2 + (r() - .5) * h * .8; } else { py += 5 + r() * 5; px = X + w / 2 + (r() - .5) * w * .8; } x.lineTo(px, py); }
  x.stroke();
}
function brokenWall(x, o, ang) { // a gap with jagged ends and rubble spilling out the far side
  const X = o.x, Y = o.y, w = o.w, h = o.h, hz = w >= h, r = seeded(Math.round(X + Y * 5));
  x.save(); x.fillStyle = 'rgba(40,32,28,.35)'; x.fillRect(X, Y, w, h); // the scar where it stood
  x.fillStyle = shade(o.color, -.15);
  for (const end of [0, 1]) for (let k = 0; k < 4; k++) { const s = 2 + r() * 5; hz ? x.fillRect(X + (end ? w - s - 1 : 1), Y + r() * (h - 3), s, 3) : x.fillRect(X + r() * (w - 3), Y + (end ? h - s - 1 : 1), 3, s); } // broken stubs at each end
  for (let k = 0; k < 34; k++) { const a = ang + (r() - .5) * 2.2, d = r() * 34, cx = X + w / 2 + Math.cos(a) * d, cy = Y + h / 2 + Math.sin(a) * d; x.fillStyle = pick([o.color, shade(o.color, -.25), shade(o.color, .15), '#8a7f74']); x.save(); x.translate(cx, cy); x.rotate(r() * TAU); x.fillRect(-2, -1.5, 3 + r() * 4, 2 + r() * 2.5); x.restore(); }
  x.fillStyle = 'rgba(200,190,180,.18)'; for (let k = 0; k < 6; k++) circ(x, X + w / 2 + Math.cos(ang) * r() * 30 + (r() - .5) * 20, Y + h / 2 + Math.sin(ang) * r() * 30 + (r() - .5) * 20, 6 + r() * 8); // plaster dust
  x.restore();
}

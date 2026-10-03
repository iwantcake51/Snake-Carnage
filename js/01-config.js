'use strict';
/* =========================================================
   CONFIG
   ========================================================= */
// Bump by exactly 1 (1.3 -> 1.4 -> ... -> 1.10) with every change you push. See CLAUDE.md.
const GAME_VERSION = '1.13';
const H = 640, B = 16, TAU = Math.PI * 2;
/* The world is as wide as the screen's shape allows (960 to 1472, in steps of 128): maps are built for the middle 960 and
   extended on both sides (see 05b-map-extend). Fixed for the session, so every buffer can be sized once. */
let W = (() => { try { const sw = Math.max(screen.width, screen.height), sh = Math.min(screen.width, screen.height); return 960 + 128 * Math.max(0, Math.min(4, Math.round((640 * sw / Math.max(1, sh - 60) - 960) / 128))); } catch (e) { return 960; } })();
const CONFIG = {
  snakeSpeeds: { Slow: 110, Normal: 140, Fast: 185 },
  turnRate: 17,          // rad/s, max swing speed of the head toward the new 8-way heading
  turnEase: 15,          // how quickly a turn settles (higher = snappier, eases out near the end)
  segSpacing: 9,
  snakeR: 10,
  startLen: 6,
  shakeMax: 16,
  maxParticles: 900,
  bloodColors: ['#8c0a0a'],   // one flat blood color everywhere
  snakeColors: ['#4e7cf6', '#4874ec'],
};
const SETTINGS_MIGRATE = s => { if (s.noticeSnake && s.mods && !s.mods.includes('noticeSnake')) s.mods.push('noticeSnake'); delete s.noticeSnake; return s; }; // moved from Settings to a modifier
const SETTINGS = Object.assign({
  darkness: .2, pixel: 1, creatureSpeed: .55, timeMode: 'Cycle', dayMinutes: 4, bloodFade: 'Normal', customHour: 22, volume: .7,
  lightQ: (() => { try { return matchMedia('(pointer: coarse)').matches ? 'Medium' : 'High'; } catch (e) { return 'High'; } })(), dynShadows: true, vomit: true, fxLevel: 'Normal', bloodQ: 'High', season: 'Random', shakeK: 1, bloodBlur: true, reduceFlash: false, bloodAmt: 'Full', simpleFx: false, mouseFollow: false,
  vignette: true, desaturate: true, shake: true, noticeSnake: false, uiSounds: true, mods: [], reduceMotion: false, bubbleSize: 'Normal', strongOutlines: false, snakeOutline: 'Subtle', uiScale: 'Auto', renderRes: 'Auto', fogQ: 'High', treeQ: 'High', fpsCap: 'VSync', fullscreen: false,
}, (() => { try { return SETTINGS_MIGRATE(JSON.parse(localStorage.getItem('snakeCarnageSettings')) || {}); } catch (e) { return {}; } })());
if (!SETTINGS.mapOutlines) SETTINGS.mapOutlines = SETTINGS.strongOutlines ? 'Strong' : 'Subtle'; // "Strong outlines" became "Map outlines"
if (!SETTINGS.pxFix) { SETTINGS.pixel = 1; SETTINGS.pxFix = 1; } // old default was a 2x chunky look
if (!['Cycle', 'Day', 'Dawn', 'Dusk', 'Night'].includes(SETTINGS.timeMode)) SETTINGS.timeMode = 'Cycle'; SETTINGS.dayMinutes = 4; // Cycle: each run starts at a random hour and the day moves on
SETTINGS.snake = Object.assign({ color: '#4e7cf6', color2: '#f2f2f2', pattern: 'Solid', hat: 'None', eyes: 'Normal', outline: 'None', trail: 'None' }, SETTINGS.snake);
if (SETTINGS.bloodQ === 'Normal') SETTINGS.bloodQ = 'Medium'; // renamed
/* Blood quality: how much blood is simulated and how finely it's drawn. Lower settings do less work, not just show less. */
const BQ_CFG = { Low: { n: .4, size: 1.3, step: 2, trail: .7, mist: .3, splat: .6 }, Medium: { n: .7, size: 1.12, step: 1, trail: 1, mist: .5, splat: .85 },
  High: { n: 1, size: 1, step: 1, trail: 1.2, mist: 1, splat: 1 }, Extreme: { n: 1.35, size: .92, step: 1, trail: 1.5, mist: 1.6, splat: 1.2 } };
const BQ = () => BQ_CFG[SETTINGS.bloodQ] || BQ_CFG.High;
const GRAV = () => { const m = typeof MAPS !== 'undefined' && MAPS[mapIdx]; return !m ? 1 : m.name === 'Moon' ? .4 : m.name === 'Mars' ? .55 : 1; }; // low gravity, but not so low that blood hangs in the air for ages // the Moon and Mars pull less; a station has its own (normal) gravity
const BLOOD = '#8c0a0a', GOLD_BLOOD = ['#c9a227', '#b38b1d', '#d6b443', '#a8821a']; // metallic gold, not glowing

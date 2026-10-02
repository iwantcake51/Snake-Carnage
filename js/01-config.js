'use strict';
/* =========================================================
   CONFIG
   ========================================================= */
// Bump by exactly 1 (1.3 -> 1.4 -> ... -> 1.10) with every change you push. See CLAUDE.md.
const GAME_VERSION = '1.12';
const W = 960, H = 640, B = 16, TAU = Math.PI * 2;
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
  lightQ: (() => { try { return matchMedia('(pointer: coarse)').matches ? 'Medium' : 'High'; } catch (e) { return 'High'; } })(), dynShadows: true, fxLevel: 'Normal', mouseFollow: false,
  vignette: true, desaturate: true, shake: true, noticeSnake: false, uiSounds: true, mods: [], reduceMotion: false, bubbleSize: 'Normal', strongOutlines: false, snakeOutline: 'Subtle', uiScale: 'Auto',
}, (() => { try { return SETTINGS_MIGRATE(JSON.parse(localStorage.getItem('snakeCarnageSettings')) || {}); } catch (e) { return {}; } })());
if (!SETTINGS.mapOutlines) SETTINGS.mapOutlines = SETTINGS.strongOutlines ? 'Strong' : 'Subtle'; // "Strong outlines" became "Map outlines"
if (!SETTINGS.pxFix) { SETTINGS.pixel = 1; SETTINGS.pxFix = 1; } // old default was a 2x chunky look
if (!['Cycle', 'Day', 'Dawn', 'Dusk', 'Night'].includes(SETTINGS.timeMode)) SETTINGS.timeMode = 'Cycle'; SETTINGS.dayMinutes = 4; // Cycle: each run starts at a random hour and the day moves on
SETTINGS.snake = Object.assign({ color: '#4e7cf6', color2: '#f2f2f2', pattern: 'Solid', hat: 'None', eyes: 'Normal', outline: 'None', trail: 'None' }, SETTINGS.snake);
const BLOOD = '#8c0a0a', GOLD_BLOOD = ['#c9a227', '#b38b1d', '#d6b443', '#a8821a']; // metallic gold, not glowing

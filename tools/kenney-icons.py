# Writes js/03f-kenney-icons.js: the Kenney icons the game uses, as path data, so they come with the page and take the text color.
# Run from the repo root after changing UI or BOARD: python3 tools/kenney-icons.py
#   UI:    Kenney Game Icons. Its vector file is one path holding every icon on a 50-unit grid; CELLS says which cell is which icon.
#   BOARD: Kenney Board Game Icons, one SVG per icon.
import re, zipfile
UI = ['multiplayer', 'star', 'basket', 'trophy', 'gear', 'wrench', 'locked', 'checkmark']
BOARD = ['suit_hearts', 'crown_a']
CELLS = {  # icon name -> (column, row) of its cell in vector_whiteIcons.svg
  'arrowRight': (0,0), 'arrowLeft': (1,0), 'arrowUp': (2,0), 'arrowDown': (3,0), 'forward': (4,0), 'backward': (5,0), 'up': (6,0),
  'down': (7,0), 'scrollVertical': (8,0), 'scrollHorizontal': (9,0), 'menuGrid': (10,0), 'menuList': (11,0),
  'barsHorizontal': (12,0), 'barsVertical': (13,0), 'pause': (14,0), 'upLeft': (0,1), 'upRight': (1,1), 'downRight': (2,1),
  'downLeft': (3,1), 'smaller': (4,1), 'larger': (5,1), 'minus': (6,1), 'plus': (7,1), 'zoomOut': (8,1), 'zoomIn': (9,1),
  'zoomDefault': (10,1), 'zoom': (11,1), 'singleplayer': (12,1), 'multiplayer': (13,1), 'massiveMultiplayer': (14,1),
  'open': (0,2), 'checkmark': (1,2), 'cross': (2,2), 'return': (3,2), 'save': (4,2), 'locked': (5,2), 'unlocked': (6,2),
  'leaderboardsSimple': (7,2), 'leaderboardsComplex': (8,2), 'trophy': (9,2), 'joystick': (10,2), 'star': (11,2), 'wrench': (12,2),
  'gear': (13,2), 'target': (14,2), 'tablet': (0,3), 'phone': (1,3), 'contrast': (2,3), 'home': (3,3), 'musicOn': (4,3),
  'musicOff': (5,3), 'trashcan': (6,3), 'trashcanOpen': (7,3), 'exclamation': (8,3), 'question': (9,3), 'warning': (10,3),
  'door': (11,3), 'import': (12,3), 'export': (13,3), 'information': (14,3), 'audioOff': (0,4), 'audioOn': (1,4), 'stop': (2,4),
  'fastForward': (3,4), 'rewind': (4,4), 'next': (5,4), 'previous': (6,4), 'power': (7,4), 'signal1': (8,4), 'signal2': (9,4),
  'signal3': (10,4), 'film': (11,4), 'video': (12,4), 'exitRight': (13,4), 'exitLeft': (14,4), 'gamepad': (0,5), 'gamepad1': (1,5),
  'gamepad2': (2,5), 'gamepad3': (3,5), 'gamepad4': (4,5), 'share1': (5,5), 'share2': (6,5), 'joystickUp': (7,5),
  'joystickLeft': (8,5), 'joystickRight': (9,5), 'mouse': (10,5), 'cart': (11,5), 'basket': (12,5), 'medal1': (13,5),
  'medal2': (14,5), 'buttonA': (0,6), 'buttonB': (1,6), 'buttonX': (2,6), 'buttonY': (3,6), 'button1': (4,6), 'button2': (5,6),
  'button3': (6,6), 'buttonL': (7,6), 'buttonR': (8,6), 'buttonL1': (9,6), 'buttonR1': (10,6), 'buttonL2': (11,6),
  'buttonR2': (12,6), 'buttonStart': (13,6), 'buttonSelect': (14,6),
}
gi = zipfile.ZipFile('kenney/kenney_game-icons.zip'); bg = zipfile.ZipFile('kenney/kenney_board-game-icons.zip')
read = lambda z, end: z.read(next(n for n in z.namelist() if n.endswith(end))).decode()
nums = lambda d: list(map(float, re.findall(r'-?\d+\.?\d*', d)))
def box(d): # the path's bounds (control points included: a hair loose), squared up with a little room
  v = nums(d); xs, ys = v[0::2], v[1::2]; x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys); s = max(x1 - x0, y1 - y0) * 1.08
  return ' '.join(f'{round(t, 2):g}' for t in ((x0 + x1 - s) / 2, (y0 + y1 - s) / 2, s, s))
sheet = re.search(r' d="([^"]+)"', read(gi, 'Vector/vector_whiteIcons.svg')).group(1)
cells = {}
for sub in (s.strip() for s in re.split(r'(?=M)', sheet) if s.strip()):
  v = nums(sub); xs, ys = v[0::2], v[1::2]; cells.setdefault((int((min(xs) + max(xs)) / 2 // 50), int((min(ys) + max(ys)) / 2 // 50)), []).append(sub)
out = []
for n in UI: d = ' '.join(cells[CELLS[n]]); out.append((n, box(d), d, 'Game Icons'))
for n in BOARD: d = ' '.join(re.findall(r' d="([^"]+)"', read(bg, f'Vector/Icons/{n}.svg'))); out.append((n, box(d), d, 'Board Game Icons'))
key = lambda n: re.sub(r'_(\w)', lambda m: m.group(1).upper(), n)
flat = lambda d: re.sub(r'\s+', ' ', d).strip()
lines = '\n'.join("  %s: ['%s', '%s'], // %s: %s" % (key(n), vb, flat(d), src, n) for n, vb, d, src in out)
HEAD = """/* =========================================================
   KENNEY ICONS (kenney.nl, CC0): menu, shop and lobby icons, from Kenney's Game Icons and Board Game Icons, written by
   tools/kenney-icons.py (add names there and run it). Path data and the box round it; kiSvg(name) draws one, filled in
   the text color. Skill tree icons stay with game-icons.net (03d-game-icons).
   ========================================================= */
const KI = {
"""
TAIL = """
};
const kiSvg = (k, cls = '') => KI[k] ? `<svg class="ki ${cls}" viewBox="${KI[k][0]}" fill="currentColor" aria-hidden="true"><path d="${KI[k][1]}"/></svg>` : '';
"""
open('js/03f-kenney-icons.js', 'w').write(HEAD + lines + TAIL)
print(len(out), 'icons -> js/03f-kenney-icons.js')

# Packs the Kenney sprites the game uses into one atlas, sprites/kenney.png (one request instead of dozens).
# Run from the repo root after changing NAMES: python3 tools/kenney-atlas.py
# The order here is the order of KSPR_NAMES in js/03e-sprites.js (which names the foliage leaf_1.., plant_1.., petals_1..): keep the two in step.
import zipfile, io
from PIL import Image
CELL, COLS = 128, 8
FX = 'kenney/kenney_particle-pack.zip'; FOL = 'kenney/kenney_foliage-sprites.zip'; LM = 'kenney/kenney_light-masks-1.0.zip'
NAMES = [
  ('smoke_04', FX), ('smoke_05', FX), ('smoke_07', FX), ('smoke_08', FX),
  ('fire_01', FX), ('fire_02', FX), ('flame_01', FX), ('flame_02', FX), ('flame_03', FX), ('flame_04', FX),
  ('scorch_01', FX), ('scorch_02', FX), ('scorch_03', FX), ('dirt_01', FX), ('dirt_02', FX), ('dirt_03', FX),
  ('muzzle_01', FX), ('muzzle_02', FX), ('muzzle_03', FX), ('star_06', FX), ('star_08', FX), ('flare_01', FX), ('circle_05', FX),
] + [('sprite_%04d' % n, FOL) for n in list(range(81, 90)) + list(range(96, 102))] + [
  ('cone_e_noise', LM), ('circle_a_noise', LM), ('window_e_noise', LM), ('water_caustics_c', LM), ('water_caustics_d', LM),
  ('smoke_01', FX), ('smoke_02', FX), ('smoke_06', FX), ('smoke_09', FX), ('smoke_10', FX), ('twirl_01', FX), ('twirl_02', FX), ('twirl_03', FX), ('circle_03', FX), # gas: wispy puffs, smoke rings, swirls, the bubble's skin
  ('circle_02', FX), ('circle_04', FX), ('star_01', FX), ('spark_01', FX), ('spark_02', FX), ('spark_03', FX), ('slash_01', FX), # breaking things (38b) and the blast's ring (38c): rings, a flare, sparks, a swipe
]
zips = {p: zipfile.ZipFile(p) for p in (FX, FOL, LM)}
def find(z, name):
  for n in z.namelist():
    if n.endswith('/' + name + '.png') and ('Transparent' in n or 'Shaded' in n) and 'Rotated' not in n: return n # (the light masks' Transparent set: white, the shape in the alpha)
  raise SystemExit('missing ' + name)
rows = (len(NAMES) + COLS - 1) // COLS
atlas = Image.new('LA', (COLS * CELL, rows * CELL), (0, 0))
for i, (name, src) in enumerate(NAMES):
  z = zips[src]; im = Image.open(io.BytesIO(z.read(find(z, name)))).convert('RGBA')
  im = im.resize((CELL, CELL), Image.LANCZOS).convert('LA')
  atlas.paste(im, ((i % COLS) * CELL, (i // COLS) * CELL))
atlas.save('sprites/kenney.png', optimize=True)
print(len(NAMES), 'sprites ->', 'sprites/kenney.png', atlas.size)

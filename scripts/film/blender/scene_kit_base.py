#!/usr/bin/env python3
"""Environment grammars for the scene compiler.

Each function builds the shell of a place - floor, walls, openings, the fixed
architecture - and returns the anchor where the scene's hero object stands.
None of them know which film they are in: the palette, the dimensions, the
dressing and the light all arrive from `data/films/<id>-sets.json`.

The scene itself is invented per film by `scripts/film/design-sets.js`. This
file is the vocabulary it composes from, not a set library.
"""

from __future__ import annotations

import math
import random

import bpy

from salt_scenes import (
    area,
    cone,
    cube,
    cylinder,
    dark_world,
    dust,
    emission,
    figure,
    ico,
    limb,
    plane,
    principled,
    sky,
    sphere,
    sun,
)
from jallianwala_scenes import dark_wood, limb as _limb  # noqa: F401
from stock_sets import (
    aged_brass,
    concrete,
    flat_sheet,
    ink_material,
    lamp_kit,
    palette as palette_of,
    paper,
    scaled,
    sheet,
    wet_stone,
    window_kit,
)


# ---------------------------------------------------------------------------
# shared helpers
# ---------------------------------------------------------------------------

def materials(params):
    p = palette_of(params)
    return {
        "paper": paper("KitPaper", p["paper"]),
        "paper_dim": paper("KitPaperDim", scaled(p["paper"], 0.66)),
        "paper_warm": paper("KitPaperWarm", scaled(p["paper"], 0.88)),
        "ink": ink_material("KitInk", p["ink"]),
        "wall": concrete("KitWall", p["paper"]),
        "wall_dim": concrete("KitWallDim", scaled(p["paper"], 0.60)),
        "stone": wet_stone("KitStone", p["paper"]),
        "metal": principled("KitMetal", scaled(p["ink"], 2.2), roughness=0.36,
                            metallic=0.74),
        "iron": principled("KitIron", scaled(p["ink"], 1.35), roughness=0.58,
                           metallic=0.42),
        "brass": aged_brass(),
        "wood": dark_wood(),
        "accent": principled("KitAccent", scaled(p["accent"], 0.92),
                             roughness=0.64),
        "accent_dim": principled("KitAccentDim", scaled(p["accent"], 0.55),
                                 roughness=0.78),
        "sodium": emission("KitSodium", p["sodium"], 3.4),
        "sodium_rgb": p["sodium"],
        "cool": (0.36, 0.54, 0.86),
        "glass": principled("KitGlass", (0.42, 0.46, 0.48), roughness=0.08,
                            transmission=0.72),
        "skin": principled("KitSkin", (0.055, 0.030, 0.018), roughness=0.68),
    }


TONES = {
    "dawn": ((0.010, 0.026, 0.040), (0.42, 0.20, 0.09), (0.004, 0.005, 0.008)),
    "day": ((0.030, 0.070, 0.100), (0.58, 0.52, 0.42), (0.030, 0.035, 0.040)),
    "dusk": ((0.018, 0.010, 0.016), (0.44, 0.16, 0.07), (0.006, 0.004, 0.006)),
    "night": ((0.001, 0.002, 0.004), (0.014, 0.016, 0.024), (0.0004, 0.0005, 0.0008)),
}

EXPOSURE = {"dawn": -0.28, "day": -0.50, "dusk": -0.42, "night": -0.72}


def practical(m, x, y, z, power=70.0, drop=0.7, radius=0.085, name="bulb"):
    cylinder(f"{name}-cord", (x, y, z + drop * 0.5), 0.008, drop, m["ink"],
             vertices=6)
    sphere(f"{name}-glass", (x, y, z), radius, m["sodium"],
           segments=16, rings=10)
    bpy.ops.object.light_add(type="POINT", location=(x, y, z))
    light = bpy.context.object
    light.name = f"{name}-light"
    light.data.energy = power
    light.data.color = m["sodium_rgb"]
    light.data.shadow_soft_size = 0.12
    return light


def key_light(m, kind="warm", power=1400.0, loc=(-4.6, 1.6, 4.2),
              target=(0, 4.6, 1.15), size=4.6):
    color = {"warm": (1.0, 0.86, 0.68), "cool": (0.78, 0.86, 1.0),
             "hard": (1.0, 0.97, 0.92), "sodium": (1.0, 0.70, 0.42)}.get(
                 kind, (1.0, 0.86, 0.68))
    return area("Key", loc, target, power, size, color)


def fill_light(m, power=280.0, loc=(4.8, 0.8, 3.0), target=(0, 5.0, 1.2),
               size=6.0):
    return area("Fill", loc, target, power, size, m["cool"])


def haze(count=60, seed=7, zmax=3.2, ymax=12.0):
    dust(count=count, seed=seed, zmax=zmax, ymax=ymax)


def shell(m, d, windows=False, doors=0, panel=False, back=None):
    """A room: floor, back wall, two side walls, a dark ceiling."""
    w, depth, h = d["w"], d["d"], d["h"]
    back = back if back is not None else depth * 0.62
    dark_world((0.0008, 0.0007, 0.0006))
    plane("Floor", (0, back * 0.5, 0), 44.0, m["stone"])
    cube("BackWall", (0, back, h * 0.5), (w, 0.20, h), m["wall"])
    cube("LeftWall", (-w * 0.5, back * 0.5, h * 0.5), (0.20, back, h),
         m["wall_dim"])
    cube("RightWall", (w * 0.5, back * 0.5, h * 0.5), (0.20, back, h),
         m["wall_dim"])
    cube("Ceiling", (0, back * 0.5, h), (w, back, 0.14), m["ink"])
    cube("Skirting", (0, back - 0.10, 0.10), (w, 0.14, 0.18), m["ink"])
    if panel:
        for i in range(7):
            cube(f"panel-{i}", (-w * 0.42 + i * w * 0.14, back - 0.12, h * 0.42),
                 (w * 0.12, 0.05, h * 0.72), m["wood"])
    if windows:
        for i, x in enumerate((-w * 0.30, w * 0.30)):
            window_kit(f"window-{i}", x, back - 0.12, h * 0.66, w * 0.16,
                       h * 0.34, m["cool"])
            for b in range(6):
                cube(f"blind-{i}-{b}", (x, back - 0.20, h * 0.44 + b * h * 0.055),
                     (w * 0.155, 0.02, 0.06), m["ink"])
    for i in range(doors):
        x = -w * 0.30 + i * w * 0.30
        cube(f"door-{i}", (x, back - 0.14, 1.02), (1.05, 0.08, 2.04),
             m["wood"])
        cube(f"door-frame-{i}", (x, back - 0.16, 1.06), (1.20, 0.06, 2.16),
             m["ink"])
    return (0.0, back * 0.62, 0.0)


def floor_seams(m, back, step=0.95, depth=5, w=13.0):
    for i in range(1, depth + 1):
        cube(f"seam-y-{i:02d}", (0, back - i * step, 0.004),
             (w, 0.012, 0.006), m["ink"])
    for i in range(-4, 5):
        cube(f"seam-x-{i:02d}", (i * step * 1.5, back * 0.5, 0.004),
             (0.012, back, 0.006), m["ink"])


def outdoor(tone="night", ground=190.0):
    sky(*TONES.get(tone, TONES["night"]))
    if tone in ("dawn", "dusk"):
        sun((22, 90, 7), radius=4.2)
    plane("Ground", (0, 30, 0), ground,
          wet_stone("GroundMat", (0.30, 0.28, 0.24)))


# ---------------------------------------------------------------------------
# spaces
# ---------------------------------------------------------------------------

def space_hall(m, d, seed, opts=None):
    anchor = shell(m, d, windows=bool(opts.get("windows", True)), doors=2,
                   panel=bool(opts.get("panel", False)))
    floor_seams(m, d["d"], w=d["w"])
    return anchor


def space_corridor(m, d, seed, opts=None):
    d = {**d, "w": max(3.4, d["w"] * 0.36), "h": max(3.6, d["h"])}
    anchor = shell(m, d, doors=4)
    floor_seams(m, d["d"], step=0.8, depth=6, w=d["w"])
    for i in range(3):
        practical(m, 0.0, d["d"] * 0.22 + i * d["d"] * 0.22, d["h"] - 0.45,
                  power=40, drop=0.35, radius=0.06, name=f"corridor-lamp-{i}")
    return (0.0, anchor[1] * 0.9, 0.0)


def space_cell(m, d, seed, opts=None):
    d = {**d, "w": min(7.4, d["w"] * 0.58), "d": min(5.6, d["d"] * 0.80),
         "h": min(4.4, d["h"])}
    anchor = shell(m, d)
    front = 2.15
    cube("bar-top", (0, front, 3.10), (d["w"] - 0.4, 0.10, 0.12), m["iron"])
    cube("bar-base", (0, front, 0.18), (d["w"] - 0.4, 0.10, 0.12), m["iron"])
    for i in range(14):
        x = -(d["w"] - 0.9) * 0.5 + i * (d["w"] - 0.9) / 13.0
        cylinder(f"bar-{i:02d}", (x, front, 1.64), 0.033, 2.80, m["iron"],
                 vertices=10)
    for i in range(2):
        cube(f"bar-cross-{i}", (0, front, 1.20 + i * 1.15),
             (d["w"] - 0.5, 0.06, 0.05), m["iron"])
    window_kit("cell-window", 0.0, d["d"] * 0.62 - 0.10, d["h"] - 0.55,
               0.80, 0.86, m["cool"])
    bpy.ops.object.light_add(type="SPOT", location=(0.0, d["d"] * 0.58, d["h"] - 0.55))
    shaft = bpy.context.object
    shaft.name = "shaft"
    shaft.data.energy = 380
    shaft.data.spot_size = math.radians(34)
    shaft.data.color = m["cool"]
    from salt_scenes import look_at
    look_at(shaft, (0.0, 3.4, 0.0))
    for i in range(9):
        rng = random.Random(seed + i)
        cube(f"scratch-{i}", (-d["w"] * 0.36 + rng.uniform(0, 0.5),
                              d["d"] * 0.60, 1.25 + i * 0.12),
             (0.006, 0.01, rng.uniform(0.05, 0.13)), m["ink"],
             rot=(0, math.radians(rng.uniform(-14, 14)), 0))
    practical(m, d["w"] * 0.30, d["d"] * 0.30, d["h"] - 0.35, power=28,
              drop=0.35, radius=0.05, name="cell-lamp")
    return anchor


def space_court(m, d, seed, opts=None):
    anchor = shell(m, d, doors=1, panel=True)
    floor_seams(m, d["d"], step=1.0, w=d["w"])
    back = d["d"] * 0.62
    cube("dais", (0, back - 0.55, 0.24), (d["w"] * 0.42, 2.0, 0.48), m["stone"])
    cube("bench-body", (0, back - 0.45, 0.92), (d["w"] * 0.34, 1.0, 0.90),
         m["wood"])
    cube("bench-top", (0, back - 0.55, 1.44), (d["w"] * 0.38, 1.2, 0.14),
         m["wood"])
    cube("bench-back", (0, back + 0.05, 2.55), (d["w"] * 0.42, 0.18, 2.3),
         m["wood"])
    cube("rail-top", (0, 3.55, 1.02), (d["w"] * 0.66, 0.10, 0.10), m["wood"])
    cube("rail-base", (0, 3.55, 0.12), (d["w"] * 0.66, 0.14, 0.12), m["wood"])
    for i in range(11):
        x = -d["w"] * 0.30 + i * d["w"] * 0.06
        cylinder(f"baluster-{i:02d}", (x, 3.55, 0.57), 0.033, 0.86, m["wood"],
                 vertices=10)
    for row in range(2):
        y = 1.35 + row * 0.95
        cube(f"pew-seat-{row}", (0, y, 0.46), (d["w"] * 0.58, 0.42, 0.10),
             m["wood"])
        cube(f"pew-back-{row}", (0, y + 0.30, 0.80), (d["w"] * 0.58, 0.09, 0.72),
             m["wood"])
    practical(m, 0.0, 5.1, d["h"] - 0.45, power=45, drop=1.2, radius=0.09,
              name="court-pendant")
    return (0.0, back * 0.72, 0.0)


def space_open(m, d, seed, opts=None):
    tone = opts.get("tone", "dusk")
    outdoor(tone, ground=210.0)
    y = 12.0
    for i in range(28):
        rng = random.Random(seed + i)
        cylinder(f"grass-{i:02d}", (rng.uniform(-18, 18), rng.uniform(2, 40),
                                   rng.uniform(0.05, 0.16)),
                 0.012, rng.uniform(0.18, 0.5), m["wall_dim"], vertices=5)
    return (0.0, y, 0.0)


def space_street(m, d, seed, opts=None):
    tone = opts.get("tone", "night")
    outdoor(tone, ground=120.0)
    for i in range(90):
        rng = random.Random(seed + i)
        cube(f"cobble-{i:02d}", (rng.uniform(-6.5, 6.5), rng.uniform(0, 24),
                                0.012),
             (rng.uniform(0.26, 0.48), rng.uniform(0.20, 0.34), 0.026),
             m["wall_dim"] if i % 3 else m["stone"],
             rot=(0, 0, rng.uniform(0, 1.6)))
    for side in (-1, 1):
        x = side * 6.2
        cube(f"front-{side}", (x, 9.0, 2.3), (0.4, 18.0, 4.6), m["wall"])
        for i in range(4):
            y = 2.4 + i * 3.7
            cube(f"shutter-{side}-{i}", (x - side * 0.24, y, 1.5),
                 (0.05, 2.5, 2.3), m["metal"])
            for b in range(8):
                cube(f"shutter-rib-{side}-{i}-{b}", (x - side * 0.27, y,
                                                     0.45 + b * 0.27),
                     (0.03, 2.46, 0.05), m["iron"])
        for i in range(2):
            y = 4.2 + i * 6.0
            cylinder(f"post-{side}-{i}", (x - side * 1.2, y, 2.0), 0.055, 4.0,
                     m["iron"], vertices=12)
            sphere(f"post-globe-{side}-{i}", (x - side * 1.2, y, 4.1), 0.15,
                   m["sodium"], segments=16, rings=10)
            bpy.ops.object.light_add(type="POINT", location=(x - side * 1.2, y, 4.1))
            light = bpy.context.object
            light.name = f"post-light-{side}-{i}"
            light.data.energy = 90
            light.data.color = m["sodium_rgb"]
            light.data.shadow_soft_size = 0.18
    return (0.0, 10.0, 0.0)


def space_warehouse(m, d, seed, opts=None):
    anchor = shell(m, d, doors=1)
    back = d["d"] * 0.62
    for i in range(46):
        cube(f"rib-{i:02d}", (-d["w"] * 0.48 + i * d["w"] * 0.021, back - 0.12,
                             d["h"] * 0.5), (0.05, 0.10, d["h"]), m["wall_dim"])
    cube("loading-door", (0, back - 0.14, 1.9), (2.7, 0.08, 3.8), m["paper_dim"])
    for i in range(5):
        cube(f"door-rung-{i}", (0, back - 0.20, 0.45 + i * 0.72),
             (2.6, 0.02, 0.04), m["metal"])
    area("DoorSpill", (0, back - 0.6, 2.2), (0, back - 4.0, 1.0), 240, 2.5,
         m["cool"])
    practical(m, -0.4, d["d"] * 0.28, d["h"] - 0.8, power=75, drop=1.4,
              radius=0.09, name="warehouse-bulb")
    floor_seams(m, d["d"], step=1.2, depth=4, w=d["w"])
    return (0.0, back * 0.72, 0.0)


def space_office(m, d, seed, opts=None):
    anchor = shell(m, d, windows=True, doors=1, panel=True)
    floor_seams(m, d["d"], step=0.9, w=d["w"])
    return anchor


def space_studio(m, d, seed, opts=None):
    anchor = shell(m, d, doors=1)
    back = d["d"] * 0.62
    for i in range(6):
        for j in range(3):
            cube(f"acoustic-{i}-{j}",
                 (-d["w"] * 0.40 + i * d["w"] * 0.16, back - 0.13,
                  d["h"] * 0.28 + j * d["h"] * 0.22),
                 (d["w"] * 0.14, 0.06, d["h"] * 0.18), m["paper_dim"])
    cube("glass-panel", (d["w"] * 0.34, back - 0.14, d["h"] * 0.62),
         (d["w"] * 0.24, 0.05, d["h"] * 0.40), m["glass"])
    limb("boom", (d["w"] * 0.30, 2.2, d["h"] - 0.35),
         (-0.6, 3.4, 2.2), 0.020, m["metal"])
    practical(m, 1.4, d["d"] * 0.30, d["h"] - 0.4, power=55, drop=0.4,
              radius=0.07, name="studio-lamp")
    floor_seams(m, d["d"], step=0.85, w=d["w"])
    return anchor


def space_ward(m, d, seed, opts=None):
    anchor = shell(m, d, windows=True, doors=1)
    back = d["d"] * 0.62
    for side in (-1, 1):
        for i in range(3):
            y = 2.0 + i * 1.85
            cube(f"bed-frame-{side}-{i}", (side * d["w"] * 0.30, y, 0.44),
                 (1.0, 2.0, 0.10), m["iron"])
            cube(f"bed-sheet-{side}-{i}", (side * d["w"] * 0.30, y, 0.53),
                 (0.96, 1.92, 0.14), m["paper_dim"])
            cube(f"bed-pillow-{side}-{i}", (side * d["w"] * 0.30, y + 0.72,
                                            0.62), (0.62, 0.34, 0.12),
                 m["paper"])
    floor_seams(m, d["d"], step=1.1, w=d["w"])
    practical(m, 0.0, d["d"] * 0.30, d["h"] - 0.5, power=60, drop=0.5,
              radius=0.08, name="ward-lamp")
    return (0.0, back * 0.78, 0.0)


def space_deck(m, d, seed, opts=None):
    tone = opts.get("tone", "dusk")
    outdoor(tone, ground=240.0)
    plane("Deck", (0, 9.0, 0.02), 26.0, m["iron"])
    for i in range(9):
        cube(f"deck-plate-{i}", (-9.0 + i * 2.2, 9.0, 0.03),
             (2.0, 20.0, 0.02), m["metal"])
    for side in (-1, 1):
        cube(f"rail-{side}", (side * 6.4, 9.0, 1.05), (0.08, 20.0, 0.10),
             m["metal"])
        for i in range(9):
            cylinder(f"stanchion-{side}-{i}", (side * 6.4, 0.5 + i * 2.4, 0.52),
                     0.035, 1.05, m["metal"], vertices=10)
    cylinder("mast", (0, 16.0, 3.4), 0.09, 6.8, m["metal"], vertices=14)
    limb("mast-arm", (0, 16.0, 6.2), (3.2, 16.0, 5.4), 0.05, m["metal"])
    return (0.0, 13.0, 0.03)


def space_yard(m, d, seed, opts=None):
    tone = opts.get("tone", "dusk")
    outdoor(tone, ground=200.0)
    for side in (-1, 1):
        for i in range(9):
            y = 2.0 + i * 3.0
            cylinder(f"fence-post-{side}-{i}", (side * 10.0, y, 1.4), 0.05,
                     2.8, m["iron"], vertices=8)
            for b in range(4):
                limb(f"wire-{side}-{i}-{b}", (side * 10.0, y - 1.5,
                                              0.5 + b * 0.55),
                     (side * 10.0, y + 1.5, 0.5 + b * 0.55), 0.010, m["metal"])
    cube("watchtower-leg-a", (-9.4, 20.0, 2.4), (0.16, 0.16, 4.8), m["wood"])
    cube("watchtower-leg-b", (-8.2, 20.0, 2.4), (0.16, 0.16, 4.8), m["wood"])
    cube("watchtower-box", (-8.8, 20.0, 5.0), (1.8, 1.6, 1.2), m["wood"])
    cube("watchtower-roof", (-8.8, 20.0, 5.7), (2.1, 1.9, 0.12), m["iron"])
    return (0.0, 9.0, 0.0)


def space_vault(m, d, seed, opts=None):
    d = {**d, "w": min(9.0, d["w"] * 0.68), "d": min(6.4, d["d"] * 0.85),
         "h": min(4.8, d["h"])}
    anchor = shell(m, d, doors=0)
    back = d["d"] * 0.62
    cube("vault-door", (0, back - 0.16, 1.7), (2.3, 0.14, 3.0), m["metal"])
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.46, minor_radius=0.05, major_segments=40,
        minor_segments=10, location=(0, back - 0.28, 1.85),
        rotation=(math.radians(90), 0, 0))
    from stock_sets import assign
    assign(bpy.context.object, m["brass"])
    for i in range(8):
        angle = i * math.tau / 8.0
        cylinder(f"bolt-{i}", (math.cos(angle) * 0.78, back - 0.24,
                               1.85 + math.sin(angle) * 0.78), 0.055, 0.10,
                 m["brass"], rot=(math.radians(90), 0, 0), vertices=14)
    for i in range(4):
        cube(f"shelf-{i}", (-d["w"] * 0.34, back - 0.4, 0.5 + i * 0.62),
             (d["w"] * 0.28, 0.42, 0.05), m["metal"])
    practical(m, 0.0, back * 0.70, d["h"] - 0.3, power=50, drop=0.5,
              radius=0.08, name="vault-lamp")
    return (0.0, back * 0.80, 0.0)


def space_archive(m, d, seed, opts=None):
    anchor = shell(m, d, doors=1)
    back = d["d"] * 0.62
    for side in (-1, 1):
        for i in range(5):
            y = 1.6 + i * 1.55
            cube(f"shelf-{side}-{i}", (side * d["w"] * 0.30, y, 1.5),
                 (0.9, 1.4, 3.0), m["wood"])
            for b in range(5):
                cube(f"shelf-board-{side}-{i}-{b}",
                     (side * d["w"] * 0.30, y, 0.35 + b * 0.62),
                     (0.86, 1.36, 0.05), m["wood"])
                for k in range(3):
                    cube(f"box-{side}-{i}-{b}-{k}",
                         (side * d["w"] * 0.30 + (k - 1) * 0.24, y,
                          0.52 + b * 0.62), (0.20, 0.26, 0.30),
                         m["paper_dim"])
    practical(m, 0.0, back * 0.55, d["h"] - 0.4, power=55, drop=0.6,
              radius=0.08, name="archive-lamp")
    return (0.0, back * 0.72, 0.0)


def space_lab(m, d, seed, opts=None):
    anchor = shell(m, d, windows=True, doors=1)
    back = d["d"] * 0.62
    cube("tile-wall", (0, back - 0.12, d["h"] * 0.45), (d["w"] * 0.9, 0.04,
                                                        d["h"] * 0.8),
         m["paper_dim"])
    for i in range(9):
        cube(f"tile-h-{i}", (0, back - 0.15, 0.4 + i * d["h"] * 0.085),
             (d["w"] * 0.9, 0.02, 0.012), m["ink"])
    cube("lab-bench", (0, back * 0.68, 0.92), (d["w"] * 0.62, 1.0, 0.09),
         m["metal"])
    practical(m, 0.6, back * 0.40, d["h"] - 0.6, power=60, drop=0.55,
              radius=0.07, name="lab-lamp")
    floor_seams(m, d["d"], step=0.85, w=d["w"])
    return (0.0, back * 0.74, 0.0)


def space_hangar(m, d, seed, opts=None):
    d = {**d, "w": max(16.0, d["w"] * 1.25), "h": max(6.2, d["h"] * 1.2)}
    anchor = shell(m, d, doors=0)
    back = d["d"] * 0.62
    cube("hangar-door", (0, back - 0.16, d["h"] * 0.46),
         (d["w"] * 0.52, 0.10, d["h"] * 0.88), m["paper_dim"])
    for i in range(7):
        limb(f"truss-{i}", (-d["w"] * 0.44, back * 0.25 + i * 1.1, d["h"] - 0.3),
             (d["w"] * 0.44, back * 0.25 + i * 1.1, d["h"] - 0.3), 0.05,
             m["iron"])
        limb(f"truss-diag-{i}", (-d["w"] * 0.44, back * 0.25 + i * 1.1,
                                d["h"] - 0.3),
             (-d["w"] * 0.10, back * 0.25 + i * 1.1, d["h"] - 1.5), 0.03,
             m["iron"])
        limb(f"truss-diag-b-{i}", (d["w"] * 0.44, back * 0.25 + i * 1.1,
                                  d["h"] - 0.3),
             (d["w"] * 0.10, back * 0.25 + i * 1.1, d["h"] - 1.5), 0.03,
             m["iron"])
    area("DoorLight", (0, back - 0.8, d["h"] * 0.4), (0, back - 8.0, 1.2),
         420, 4.0, (0.72, 0.82, 1.0))
    return (0.0, back * 0.66, 0.0)


def space_platform(m, d, seed, opts=None):
    tone = opts.get("tone", "dusk")
    outdoor(tone, ground=160.0)
    plane("Platform", (0, 9.0, 0.55), 26.0, m["stone"])
    for i in range(2):
        limb(f"rail-{i}", (-26, 15.0 + i * 1.45, 0.02), (26, 15.0 + i * 1.45, 0.02),
             0.065, m["metal"])
    for i in range(9):
        cube(f"canopy-post-{i}", (-12 + i * 3.0, 3.4, 2.4), (0.16, 0.16, 4.2),
             m["iron"])
    cube("canopy", (0, 3.4, 4.6), (24.0, 7.0, 0.12), m["metal"])
    cylinder("signal-post", (11.0, 14.0, 1.6), 0.07, 3.2, m["iron"],
             vertices=10)
    cube("signal-arm", (10.4, 14.0, 3.0), (1.2, 0.06, 0.16), m["accent"])
    practical(m, 0.0, 3.4, 4.3, power=60, drop=0.25, radius=0.07,
              name="platform-lamp")
    return (0.0, 10.0, 0.55)


def space_market(m, d, seed, opts=None):
    tone = opts.get("tone", "day")
    outdoor(tone, ground=150.0)
    for side in (-1, 1):
        for i in range(4):
            y = 3.0 + i * 3.2
            cube(f"stall-top-{side}-{i}", (side * 5.0, y, 0.94),
                 (2.4, 2.0, 0.08), m["wood"])
            cube(f"stall-awning-{side}-{i}", (side * 5.0, y, 2.35),
                 (2.8, 2.3, 0.06), m["accent_dim"],
                 rot=(math.radians(-6), 0, 0))
            for x in (-1.0, 1.0):
                for yy in (-0.85, 0.85):
                    cylinder(f"stall-leg-{side}-{i}-{x}-{yy}",
                             (side * 5.0 + x, y + yy, 0.46), 0.035, 0.92,
                             m["wood"], vertices=8)
            for k in range(3):
                cube(f"produce-{side}-{i}-{k}",
                     (side * 5.0 + (k - 1) * 0.5, y, 1.03),
                     (0.40, 0.34, 0.14), m["paper_warm"])
    return (0.0, 8.0, 0.0)


def space_temple(m, d, seed, opts=None):
    tone = opts.get("tone", "dawn")
    outdoor(tone, ground=180.0)
    for i in range(3):
        cube(f"step-{i}", (0, 8.0 + i * 0.8, 0.11 + i * 0.22),
             (12.0 - i * 1.2, 1.6, 0.22), m["stone"])
    cube("plinth", (0, 11.2, 0.85), (6.0, 4.0, 0.70), m["stone"])
    for x in (-2.4, -0.8, 0.8, 2.4):
        cylinder(f"pillar-{x:.1f}", (x, 11.6, 2.9), 0.24, 4.1, m["stone"],
                 vertices=20)
    cube("architrave", (0, 11.6, 5.05), (6.2, 1.2, 0.30), m["stone"])
    cube("shrine-door", (0, 12.4, 1.9), (1.5, 0.10, 2.4), m["ink"])
    return (0.0, 9.4, 0.66)


def space_tunnel(m, d, seed, opts=None):
    dark_world((0.0004, 0.0004, 0.0005))
    plane("Floor", (0, 10.0, 0), 60.0, m["stone"])
    for i in range(9):
        y = 2.0 + i * 2.0
        radius = 3.2
        for k in range(9):
            angle = math.pi * k / 8.0
            x0 = math.cos(angle) * radius
            z0 = math.sin(angle) * radius
            cube(f"rib-{i}-{k}", (x0 * 1.04, y, z0 * 1.04),
                 (0.16, 0.18, 0.30), m["wood"],
                 rot=(0, math.radians(90 - math.degrees(angle)), 0))
        limb(f"beam-l-{i}", (-radius, y, 2.2), (-radius, y, 0), 0.12,
             m["wood"])
        limb(f"beam-r-{i}", (radius, y, 2.2), (radius, y, 0), 0.12, m["wood"])
    for i in range(3):
        practical(m, 0.0, 4.0 + i * 5.0, 2.9, power=35, drop=0.35, radius=0.06,
                  name=f"tunnel-lamp-{i}")
    return (0.0, 10.0, 0.0)


def space_bunker(m, d, seed, opts=None):
    d = {**d, "h": min(3.4, d["h"] * 0.78)}
    anchor = shell(m, d, doors=1)
    back = d["d"] * 0.62
    for i in range(5):
        cube(f"bunker-rib-{i}", (-d["w"] * 0.40 + i * d["w"] * 0.20,
                                 back - 0.14, d["h"] * 0.5),
             (0.10, 0.06, d["h"]), m["ink"])
    for i in range(4):
        limb(f"cable-{i}", (-d["w"] * 0.40, back - 0.2, d["h"] - 0.25 - i * 0.12),
             (d["w"] * 0.40, back - 0.2, d["h"] - 0.45 - i * 0.12), 0.014,
             m["ink"])
    practical(m, 0.0, back * 0.55, d["h"] - 0.25, power=45, drop=0.3,
              radius=0.07, name="bunker-lamp")
    return (0.0, back * 0.76, 0.0)


def space_newsroom(m, d, seed, opts=None):
    anchor = shell(m, d, windows=False, doors=1)
    for row in range(3):
        for col in range(4):
            x = -d["w"] * 0.30 + col * d["w"] * 0.20
            y = 2.2 + row * 1.5
            cube(f"nroom-desk-{row}-{col}", (x, y, 0.78), (1.15, 0.75, 0.07),
                 m["wood"])
            cube(f"nroom-paper-{row}-{col}", (x, y, 0.83), (0.40, 0.30, 0.02),
                 m["paper"])
            practical(m, x, y, d["h"] - 0.55, power=26, drop=0.45, radius=0.05,
                      name=f"nroom-lamp-{row}-{col}")
    return (0.0, 3.6, 0.0)


SPACES = {
    "hall": space_hall,
    "corridor": space_corridor,
    "cell": space_cell,
    "court": space_court,
    "open": space_open,
    "street": space_street,
    "warehouse": space_warehouse,
    "office": space_office,
    "studio": space_studio,
    "ward": space_ward,
    "deck": space_deck,
    "yard": space_yard,
    "vault": space_vault,
    "archive": space_archive,
    "lab": space_lab,
    "hangar": space_hangar,
    "platform": space_platform,
    "market": space_market,
    "temple": space_temple,
    "tunnel": space_tunnel,
    "bunker": space_bunker,
    "newsroom": space_newsroom,
}

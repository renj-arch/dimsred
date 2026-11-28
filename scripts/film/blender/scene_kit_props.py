#!/usr/bin/env python3
"""Object grammars for the scene compiler.

A prop is a small, parameterised build from the shared primitives: a press, a
stamp, a radio rack, a cot. The film does not reuse a scene; it composes new
scenes from these objects with its own sizes, placement, palette and light.

Every builder stands on `z` (usually the floor) and grows upward. `s` is a
single scale factor, so the designer can make one film's press small and
another's monumental without touching Python.
"""

from __future__ import annotations

import math
import random

import bpy

from salt_scenes import cone, cube, cylinder, ico, limb, plane, sphere
from stock_sets import flat_sheet, ruling, scaled, sheet


# ---------------------------------------------------------------------------
# printing and paper
# ---------------------------------------------------------------------------

def press(p, x, y, z, s, m, seed):
    iron = m["iron"]
    cube(f"{p}-left", (x - 1.45 * s, y, z + 1.70 * s),
         (0.44 * s, 0.60 * s, 3.40 * s), iron)
    cube(f"{p}-right", (x + 1.45 * s, y, z + 1.70 * s),
         (0.44 * s, 0.60 * s, 3.40 * s), iron)
    cube(f"{p}-crown", (x, y, z + 3.32 * s), (3.36 * s, 0.56 * s, 0.40 * s),
         iron)
    cube(f"{p}-foot", (x, y, z + 0.20 * s), (3.20 * s, 0.84 * s, 0.40 * s),
         iron)
    cube(f"{p}-platen", (x, y - 0.36 * s, z + 1.96 * s),
         (2.50 * s, 0.62 * s, 0.42 * s), m["metal"])
    cube(f"{p}-bed", (x, y - 0.36 * s, z + 1.14 * s),
         (2.90 * s, 0.90 * s, 0.26 * s), iron)
    sheet(f"{p}-sheet", x, y - 0.86 * s, z + 1.38 * s, 1.36 * s, 0.82 * s,
          m["paper"], tilt=-8.0)
    cylinder(f"{p}-axle", (x + 2.16 * s, y + 0.10 * s, z + 2.04 * s),
             0.09 * s, 0.28 * s, m["metal"],
             rot=(0, math.radians(90), 0), vertices=20)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.80 * s, minor_radius=0.07 * s, major_segments=48,
        minor_segments=12, location=(x + 2.02 * s, y + 0.10 * s,
                                     z + 2.04 * s),
        rotation=(0, math.radians(90), 0))
    from stock_sets import assign
    assign(bpy.context.object, m["metal"])
    for i in range(6):
        angle = i * math.pi / 3.0
        limb(f"{p}-spoke-{i}",
             (x + 2.02 * s, y + 0.10 * s + math.sin(angle) * 0.72 * s,
              z + 2.04 * s + math.cos(angle) * 0.72 * s),
             (x + 2.02 * s, y + 0.10 * s, z + 2.04 * s), 0.032 * s, iron,
             vertices=8)


def paper_rack(p, x, y, z, s, m, seed):
    rng = random.Random(seed)
    cube(f"{p}-rail", (x, y, z + 1.90 * s), (2.30 * s, 0.05 * s, 0.05 * s),
         m["metal"])
    for i in range(7):
        sheet(f"{p}-sheet-{i:02d}", x - 0.96 * s + i * 0.32 * s, y + 0.04 * s,
              z + 1.44 * s, 0.62 * s, 0.88 * s,
              m["paper"] if i % 2 else m["paper_dim"],
              tilt=3.0, rot=math.radians(-7 + i * 2 + rng.uniform(-1, 1)))
    for side in (-1, 1):
        cylinder(f"{p}-post-{side}", (x + side * 1.12 * s, y, z + 0.95 * s),
                 0.035 * s, 1.90 * s, m["iron"], vertices=10)


def ink_slab(p, x, y, z, s, m, seed):
    cube(f"{p}-slab", (x, y, z + 0.05 * s), (0.62 * s, 0.46 * s, 0.10 * s),
         m["accent_dim"])
    cylinder(f"{p}-brayer", (x, y - 0.30 * s, z + 0.12 * s), 0.055 * s,
             0.50 * s, m["ink"], rot=(0, math.radians(90), 0), vertices=18)
    cylinder(f"{p}-brayer-grip", (x + 0.30 * s, y - 0.30 * s, z + 0.12 * s),
             0.024 * s, 0.20 * s, m["wood"], rot=(0, math.radians(90), 0),
             vertices=10)


def stamp(p, x, y, z, s, m, seed):
    cylinder(f"{p}-head", (x, y, z + 0.08 * s), 0.15 * s, 0.10 * s,
             m["brass"], vertices=28)
    cylinder(f"{p}-stem", (x, y, z + 0.24 * s), 0.05 * s, 0.22 * s,
             m["wood"], vertices=16)
    sphere(f"{p}-knob", (x, y, z + 0.38 * s), 0.075 * s, m["wood"],
           segments=18, rings=10)


def ink_pad(p, x, y, z, s, m, seed):
    cube(f"{p}-tray", (x, y, z + 0.03 * s), (0.46 * s, 0.34 * s, 0.05 * s),
         m["ink"])
    cube(f"{p}-felt", (x, y, z + 0.058 * s), (0.40 * s, 0.28 * s, 0.006 * s),
         m["accent_dim"])
    cube(f"{p}-lid", (x + 0.52 * s, y, z + 0.02 * s),
         (0.46 * s, 0.34 * s, 0.03 * s), m["metal"],
         rot=(0, 0, math.radians(6)))


def notes_stack(p, x, y, z, s, m, seed):
    rng = random.Random(seed)
    for i in range(16):
        flat_sheet(f"{p}-note-{i:02d}", x + rng.uniform(-0.01, 0.01) * s,
                   y + rng.uniform(-0.01, 0.01) * s, z + i * 0.0055 * s,
                   0.44 * s, 0.26 * s,
                   m["paper_warm"] if i % 4 else m["paper_dim"],
                   rot=rng.uniform(-0.04, 0.04))
    cube(f"{p}-band", (x, y, z + 0.050 * s), (0.10 * s, 0.27 * s, 0.066 * s),
         m["accent_dim"])


def ledger_desk(p, x, y, z, s, m, seed):
    desk(p, x, y, z, s, m, seed)
    flat_sheet(f"{p}-ledger-l", (x - 0.28 * s), (y - 0.05 * s),
               z + 0.955 * s, 0.56 * s, 0.80 * s, m["paper"], rot=0.03)
    flat_sheet(f"{p}-ledger-r", (x + 0.30 * s), (y - 0.05 * s),
               z + 0.955 * s, 0.56 * s, 0.80 * s, m["paper"], rot=-0.03)
    cube(f"{p}-spine", (x + 0.01 * s, y - 0.05 * s, z + 0.948 * s),
         (0.05 * s, 0.80 * s, 0.020 * s), m["ink"])
    ruling(f"{p}-rule-l", (x - 0.28 * s), (y - 0.05 * s), z + 0.960 * s,
           0.48 * s, 10, m["ink"], gap=0.044 * s)
    ruling(f"{p}-rule-r", (x + 0.30 * s), (y - 0.05 * s), z + 0.960 * s,
           0.48 * s, 10, m["ink"], gap=0.044 * s)


def desk(p, x, y, z, s, m, seed):
    cube(f"{p}-top", (x, y, z + 0.88 * s), (2.70 * s, 1.42 * s, 0.10 * s),
         m["wood"])
    cube(f"{p}-apron", (x, y, z + 0.79 * s), (2.50 * s, 1.24 * s, 0.10 * s),
         m["ink"])
    for lx in (-1.15, 1.15):
        for ly in (-0.55, 0.55):
            cube(f"{p}-leg-{lx:.1f}-{ly:.1f}", (x + lx * s, y + ly * s,
                                               z + 0.42 * s),
                 (0.13 * s, 0.13 * s, 0.84 * s), m["wood"])
    flat_sheet(f"{p}-paper", x - 0.55 * s, y + 0.10 * s, z + 0.94 * s,
               0.70 * s, 0.50 * s, m["paper"], rot=0.06)
    cylinder(f"{p}-pen", x + 0.70 * s, y - 0.10 * s, z + 0.945 * s,
             0.012 * s, 0.24 * s, m["ink"],
             rot=(0, math.radians(90), math.radians(18)), vertices=8)


def typewriter(p, x, y, z, s, m, seed):
    cube(f"{p}-body", (x, y, z + 0.16 * s), (0.86 * s, 0.50 * s, 0.26 * s),
         m["ink"])
    cube(f"{p}-deck", (x, y - 0.02 * s, z + 0.31 * s),
         (0.80 * s, 0.42 * s, 0.05 * s), m["metal"])
    cylinder(f"{p}-roller", (x, y + 0.18 * s, z + 0.40 * s), 0.055 * s,
             0.76 * s, m["ink"], rot=(0, math.radians(90), 0), vertices=18)
    for row in range(3):
        for k in range(9):
            kx = x - 0.32 * s + k * 0.08 * s
            ky = y - 0.16 * s + row * 0.07 * s
            cylinder(f"{p}-key-{row}-{k}", (kx, ky, z + 0.345 * s),
                     0.024 * s, 0.018 * s, m["paper_dim"], vertices=10)
    for side in (-1, 1):
        cylinder(f"{p}-knob-{side}", (x + side * 0.46 * s, y + 0.18 * s,
                                      z + 0.40 * s), 0.05 * s, 0.04 * s,
                 m["brass"], rot=(0, math.radians(90), 0), vertices=14)


def telephone(p, x, y, z, s, m, seed):
    cube(f"{p}-base", (x, y, z + 0.08 * s), (0.34 * s, 0.28 * s, 0.16 * s),
         m["ink"])
    cylinder(f"{p}-dial", (x, y - 0.06 * s, z + 0.165 * s), 0.10 * s,
             0.012 * s, m["paper_dim"], vertices=24)
    for i in range(10):
        angle = i * math.tau / 10.0
        cylinder(f"{p}-hole-{i}", (x + math.cos(angle) * 0.068 * s,
                                   y - 0.06 * s + math.sin(angle) * 0.068 * s,
                                   z + 0.172 * s), 0.012 * s, 0.006 * s,
                 m["ink"], vertices=8)
    cylinder(f"{p}-cradle", (x, y + 0.10 * s, z + 0.24 * s), 0.03 * s,
             0.36 * s, m["ink"], rot=(0, math.radians(90), 0), vertices=10)
    for side in (-1, 1):
        sphere(f"{p}-ear-{side}", (x + side * 0.19 * s, y + 0.10 * s,
                                   z + 0.24 * s), 0.055 * s, m["ink"],
               segments=14, rings=8)


def radio_rack(p, x, y, z, s, m, seed):
    cube(f"{p}-cabinet", (x, y, z + 1.28 * s), (2.20 * s, 0.70 * s, 2.56 * s),
         m["iron"])
    cube(f"{p}-top", (x, y, z + 2.60 * s), (2.34 * s, 0.80 * s, 0.10 * s),
         m["metal"])
    for i in range(3):
        cube(f"{p}-panel-{i}", (x, y - 0.38 * s, z + 0.52 * s + i * 0.75 * s),
             (1.92 * s, 0.06 * s, 0.62 * s), m["wood"])
    for i in range(4):
        cylinder(f"{p}-dial-{i}", (x - 0.69 * s + i * 0.46 * s, y - 0.43 * s,
                                   z + 2.08 * s), 0.11 * s, 0.03 * s,
                 m["brass"], rot=(math.radians(90), 0, 0), vertices=32)
        cylinder(f"{p}-dial-face-{i}", (x - 0.69 * s + i * 0.46 * s,
                                        y - 0.46 * s, z + 2.08 * s),
                 0.088 * s, 0.012 * s, m["paper_dim"],
                 rot=(math.radians(90), 0, 0), vertices=32)
    cube(f"{p}-meter", (x + 0.55 * s, y - 0.44 * s, z + 1.64 * s),
         (0.44 * s, 0.04 * s, 0.24 * s), m["paper_dim"])
    cube(f"{p}-needle", (x + 0.55 * s, y - 0.47 * s, z + 1.64 * s),
         (0.008 * s, 0.01 * s, 0.18 * s), m["accent_dim"])
    for i in range(6):
        cube(f"{p}-switch-{i}", (x - 0.88 * s + i * 0.29 * s, y - 0.42 * s,
                                 z + 1.28 * s), (0.08 * s, 0.04 * s, 0.13 * s),
             m["metal"])
        sphere(f"{p}-switch-knob-{i}", (x - 0.88 * s + i * 0.29 * s,
                                        y - 0.47 * s, z + 1.28 * s),
               0.025 * s, m["accent"], segments=12, rings=8)


def microphone(p, x, y, z, s, m, seed):
    cylinder(f"{p}-base", (x, y, z + 0.03 * s), 0.20 * s, 0.06 * s,
             m["metal"], vertices=24)
    cylinder(f"{p}-post", (x, y, z + 0.72 * s), 0.024 * s, 1.40 * s,
             m["metal"], vertices=10)
    cylinder(f"{p}-ring", (x, y + 0.05 * s, z + 1.48 * s), 0.15 * s,
             0.035 * s, m["brass"], rot=(math.radians(70), 0, 0),
             vertices=28)
    sphere(f"{p}-capsule", (x, y + 0.10 * s, z + 1.48 * s), 0.10 * s,
           m["ink"], segments=20, rings=12)


def map_table(p, x, y, z, s, m, seed):
    cube(f"{p}-top", (x, y, z + 0.92 * s), (3.40 * s, 2.00 * s, 0.10 * s),
         m["wood"])
    for lx in (-1.45, 1.45):
        for ly in (-0.78, 0.78):
            cube(f"{p}-leg-{lx:.1f}-{ly:.1f}", (x + lx * s, y + ly * s,
                                               z + 0.44 * s),
                 (0.15 * s, 0.15 * s, 0.88 * s), m["wood"])
    flat_sheet(f"{p}-map", x, y, z + 0.98 * s, 2.60 * s, 1.54 * s, m["paper"],
               rot=0.03)
    for i in range(9):
        cube(f"{p}-grid-h-{i}", (x, y - 0.72 * s + i * 0.18 * s,
                                 z + 0.986 * s), (2.50 * s, 0.008 * s, 0.008 * s),
             m["ink"])
    for i in range(13):
        cube(f"{p}-grid-v-{i}", (x - 1.20 * s + i * 0.20 * s, y,
                                 z + 0.986 * s), (0.008 * s, 1.44 * s, 0.008 * s),
             m["ink"])
    points = [(-0.95, -0.42), (-0.55, -0.18), (-0.10, -0.26), (0.35, -0.04),
              (0.82, -0.11), (1.08, 0.20)]
    for i in range(len(points) - 1):
        limb(f"{p}-route-{i}",
             (x + points[i][0] * s, y + points[i][1] * s, z + 0.992 * s),
             (x + points[i + 1][0] * s, y + points[i + 1][1] * s,
              z + 0.992 * s), 0.007 * s, m["accent"])
    for i, (px, py) in enumerate(points):
        cylinder(f"{p}-pin-{i}", (x + px * s, y + py * s, z + 1.01 * s),
                 0.016 * s, 0.06 * s, m["brass"], vertices=10)
        sphere(f"{p}-pin-head-{i}", (x + px * s, y + py * s, z + 1.045 * s),
               0.024 * s, m["accent"], segments=12, rings=8)
    limb(f"{p}-string", (x + points[0][0] * s, y + points[0][1] * s,
                         z + 1.06 * s),
         (x + points[-1][0] * s, y + points[-1][1] * s, z + 1.07 * s),
         0.003 * s, m["paper_dim"])


def long_table(p, x, y, z, s, m, seed):
    cube(f"{p}-top", (x, y, z + 1.00 * s), (5.20 * s, 2.00 * s, 0.12 * s),
         m["wood"])
    cube(f"{p}-apron", (x, y, z + 0.90 * s), (4.90 * s, 1.80 * s, 0.12 * s),
         m["ink"])
    for lx in (-2.30, 2.30):
        for ly in (-0.75, 0.75):
            cube(f"{p}-leg-{lx:.1f}-{ly:.1f}", (x + lx * s, y + ly * s,
                                               z + 0.45 * s),
                 (0.17 * s, 0.17 * s, 0.90 * s), m["wood"])
    for side in (-1, 1):
        for i in range(4):
            cx = x - 1.65 * s + i * 1.10 * s
            cy = y + side * 0.95 * s
            cube(f"{p}-chair-{side}-{i}", (cx, cy, z + 0.50 * s),
                 (0.56 * s, 0.56 * s, 0.08 * s), m["wood"])
            cube(f"{p}-chair-back-{side}-{i}", (cx, cy + side * 0.26 * s,
                                                z + 0.94 * s),
                 (0.56 * s, 0.09 * s, 0.80 * s), m["wood"])
            flat_sheet(f"{p}-folder-{side}-{i}", cx, y + side * 0.52 * s,
                       z + 1.075 * s, 0.40 * s, 0.28 * s, m["paper_dim"],
                       rot=(i % 3) * 0.05 - 0.05)
    for i, lx in enumerate((-1.55, 0.0, 1.55)):
        cylinder(f"{p}-pendant-cord-{i}", (x + lx * s, y, z + 4.55 * s),
                 0.008 * s, 2.3 * s, m["ink"], vertices=6)
        bpy.ops.mesh.primitive_cone_add(
            vertices=28, radius1=0.30 * s, radius2=0.10 * s, depth=0.20 * s,
            location=(x + lx * s, y, z + 3.32 * s))
        from stock_sets import assign
        assign(bpy.context.object, m["metal"])
        cylinder(f"{p}-glow-{i}", (x + lx * s, y, z + 3.22 * s), 0.24 * s,
                 0.012 * s, m["sodium"], vertices=28)
        bpy.ops.object.light_add(type="POINT", location=(x + lx * s, y,
                                                         z + 3.18 * s))
        light = bpy.context.object
        light.name = f"{p}-light-{i}"
        light.data.energy = 45
        light.data.color = m["sodium_rgb"]
        light.data.shadow_soft_size = 0.18


# ---------------------------------------------------------------------------
# containers, barriers, field objects
# ---------------------------------------------------------------------------

def crates(p, x, y, z, s, m, seed):
    def crate(prefix, cx, cy, cz, w=1.10, d=0.86, h=0.76):
        cube(f"{prefix}-box", (cx, cy, cz + h * 0.5), (w * s, d * s, h * s),
             m["wood"])
        cube(f"{prefix}-lid", (cx, cy, cz + h * s + 0.02 * s),
             (w * 1.02 * s, d * 1.02 * s, 0.05 * s), m["paper_dim"])
        for i in range(3):
            cube(f"{prefix}-band-{i}", (cx - w * 0.32 * s + i * w * 0.32 * s,
                                       cy, cz + h * 0.5 * s),
                 (0.035 * s, d * 1.01 * s, h * 1.01 * s), m["ink"])
    cube(f"{p}-pallet", (x, y, z + 0.06 * s), (1.60 * s, 1.10 * s, 0.10 * s),
         m["wood"])
    crate(f"{p}-a", x, y, z + 0.12 * s)
    crate(f"{p}-b", x, y, z + 0.90 * s)
    crate(f"{p}-c", x + 1.15 * s, y + 0.35 * s, z + 0.12 * s, w=0.82, d=0.70,
          h=0.62)


def barrel(p, x, y, z, s, m, seed):
    cylinder(f"{p}-body", (x, y, z + 0.44 * s), 0.26 * s, 0.88 * s,
             m["wood"], vertices=24)
    for i in range(3):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.265 * s, minor_radius=0.018 * s, major_segments=28,
            minor_segments=8, location=(x, y, z + 0.16 * s + i * 0.28 * s))
        from stock_sets import assign
        assign(bpy.context.object, m["metal"])


def tarp(p, x, y, z, s, m, seed):
    cube(f"{p}-pile", (x, y, z + 0.40 * s), (2.30 * s, 1.40 * s, 0.30 * s),
         m["accent_dim"], rot=(math.radians(3), math.radians(-2), 0))
    cube(f"{p}-fold", (x, y + 0.68 * s, z + 0.24 * s),
         (2.10 * s, 0.20 * s, 0.40 * s), m["accent_dim"])
    for i in range(4):
        limb(f"{p}-rope-{i}", (x - 0.95 * s + i * 0.63 * s, y + 0.72 * s,
                               z + 0.58 * s),
             (x - 0.95 * s + i * 0.63 * s, y + 1.35 * s, z + 0.04 * s),
             0.011 * s, m["paper_dim"])


def sandbags(p, x, y, z, s, m, seed):
    rng = random.Random(seed)
    for row in range(3):
        for i in range(3 - row):
            cube(f"{p}-bag-{row}-{i}",
                 (x + (i - (2 - row) * 0.5) * 0.52 * s + rng.uniform(-0.02, 0.02),
                  y + rng.uniform(-0.03, 0.03), z + 0.11 * s + row * 0.20 * s),
                 (0.48 * s, 0.30 * s, 0.18 * s), m["paper_dim"],
                 rot=(0, 0, rng.uniform(-0.20, 0.20)))


def fence(p, x, y, z, s, m, seed):
    for i in range(5):
        cylinder(f"{p}-post-{i}", (x - 2.0 * s + i * 1.0 * s, y, z + 1.2 * s),
                 0.045 * s, 2.4 * s, m["iron"], vertices=8)
    for b in range(4):
        limb(f"{p}-wire-{b}", (x - 2.0 * s, y, z + 0.55 * s + b * 0.50 * s),
             (x + 2.0 * s, y, z + 0.55 * s + b * 0.50 * s), 0.010 * s,
             m["metal"])
    for i in range(16):
        cube(f"{p}-barb-{i}", (x - 1.9 * s + i * 0.25 * s, y,
                               z + 1.05 * s), (0.02 * s, 0.10 * s, 0.02 * s),
             m["metal"], rot=(0, 0, math.radians(30 if i % 2 else -30)))


def flag(p, x, y, z, s, m, seed):
    cylinder(f"{p}-pole", (x, y, z + 4.8 * s), 0.07 * s, 9.6 * s, m["metal"],
             vertices=14)
    sphere(f"{p}-finial", (x, y, z + 9.68 * s), 0.12 * s, m["brass"],
           segments=16, rings=10)
    cube(f"{p}-banner", (x + 0.92 * s, y, z + 8.2 * s),
         (1.66 * s, 0.04 * s, 1.14 * s), m["accent_dim"])
    for i in range(5):
        cube(f"{p}-fold-{i}", (x + 0.26 * s + i * 0.29 * s, y - 0.02 * s,
                               z + 8.2 * s), (0.012 * s, 0.02 * s, 1.12 * s),
             m["accent"])


def podium(p, x, y, z, s, m, seed):
    cube(f"{p}-step-a", (x, y, z + 0.14 * s), (3.2 * s, 1.8 * s, 0.28 * s),
         m["stone"])
    cube(f"{p}-step-b", (x, y - 0.05 * s, z + 0.42 * s),
         (2.3 * s, 1.3 * s, 0.28 * s), m["stone"])
    cube(f"{p}-box", (x, y - 0.15 * s, z + 0.72 * s),
         (1.5 * s, 0.85 * s, 0.60 * s), m["wood"])
    cube(f"{p}-top", (x, y - 0.20 * s, z + 1.04 * s),
         (1.68 * s, 1.0 * s, 0.08 * s), m["wood"])
    microphone(f"{p}-mic", x - 0.30 * s, y - 0.25 * s, z + 1.08 * s, 0.55 * s,
               m, seed)


def ranks(p, x, y, z, s, m, seed):
    for row in range(5):
        count = 8 - row // 2
        for i in range(count):
            figure(x + (i - (count - 1) / 2.0) * 1.05 * s,
                   y + row * 1.35 * s, z, scale=0.94 * s,
                   cloth=(0.018, 0.016, 0.014), pose=0.0,
                   label=f"{p}-rank-{row}-{i}")


def cot(p, x, y, z, s, m, seed):
    cube(f"{p}-frame", (x, y, z + 0.42 * s), (1.05 * s, 2.05 * s, 0.10 * s),
         m["iron"])
    for lx in (-0.48, 0.48):
        for ly in (-0.95, 0.95):
            cylinder(f"{p}-leg-{lx:.2f}-{ly:.2f}", (x + lx * s, y + ly * s,
                                                    z + 0.21 * s),
                     0.028 * s, 0.42 * s, m["iron"], vertices=8)
    cube(f"{p}-mattress", (x, y, z + 0.53 * s), (0.98 * s, 1.98 * s, 0.14 * s),
         m["paper_dim"])
    cube(f"{p}-blanket", (x, y + 0.34 * s, z + 0.62 * s),
         (1.00 * s, 1.05 * s, 0.08 * s), m["accent_dim"])


def bars(p, x, y, z, s, m, seed):
    cube(f"{p}-frame-top", (x, y, z + 3.05 * s), (5.6 * s, 0.10 * s, 0.12 * s),
         m["iron"])
    cube(f"{p}-frame-base", (x, y, z + 0.18 * s), (5.6 * s, 0.10 * s, 0.12 * s),
         m["iron"])
    for i in range(13):
        cylinder(f"{p}-bar-{i:02d}", (x - 2.6 * s + i * 0.433 * s, y,
                                      z + 1.62 * s), 0.033 * s, 2.86 * s,
                 m["iron"], vertices=10)
    for i in range(2):
        cube(f"{p}-cross-{i}", (x, y, z + 1.18 * s + i * 1.15 * s),
             (5.5 * s, 0.06 * s, 0.05 * s), m["iron"])


def gavel(p, x, y, z, s, m, seed):
    cube(f"{p}-block", (x, y, z + 0.045 * s), (0.34 * s, 0.34 * s, 0.09 * s),
         m["wood"])
    cube(f"{p}-head", (x + 0.05 * s, y, z + 0.20 * s),
         (0.26 * s, 0.10 * s, 0.10 * s), m["wood"],
         rot=(0, 0, math.radians(18)))
    cylinder(f"{p}-handle", (x - 0.16 * s, y, z + 0.20 * s), 0.020 * s,
             0.30 * s, m["wood"], rot=(0, math.radians(72), 0), vertices=10)


def witness_box(p, x, y, z, s, m, seed):
    cube(f"{p}-box", (x, y, z + 0.62 * s), (1.15 * s, 1.15 * s, 1.24 * s),
         m["wood"])
    cube(f"{p}-rail", (x, y - 0.55 * s, z + 1.28 * s),
         (1.20 * s, 0.10 * s, 0.09 * s), m["wood"])


def scales(p, x, y, z, s, m, seed):
    cylinder(f"{p}-post", (x, y, z + 0.36 * s), 0.026 * s, 0.72 * s,
             m["brass"], vertices=10)
    limb(f"{p}-beam", (x - 0.66 * s, y, z + 0.72 * s),
         (x + 0.66 * s, y, z + 0.72 * s), 0.022 * s, m["brass"])
    for side in (-1, 1):
        cylinder(f"{p}-pan-{side}", (x + side * 0.66 * s, y, z + 0.53 * s),
                 0.12 * s, 0.018 * s, m["brass"], vertices=24)
        cylinder(f"{p}-cord-{side}", (x + side * 0.66 * s, y, z + 0.62 * s),
                 0.006 * s, 0.14 * s, m["brass"], vertices=6)


def plinth(p, x, y, z, s, m, seed):
    cube(f"{p}-base", (x, y, z + 0.14 * s), (2.20 * s, 1.40 * s, 0.28 * s),
         m["stone"])
    cube(f"{p}-step", (x, y, z + 0.40 * s), (1.60 * s, 1.05 * s, 0.26 * s),
         m["stone"])
    cube(f"{p}-shaft", (x, y, z + 0.82 * s), (1.05 * s, 0.75 * s, 0.58 * s),
         m["stone"])
    cube(f"{p}-cap", (x, y, z + 1.14 * s), (1.30 * s, 0.92 * s, 0.10 * s),
         m["paper_dim"])


def wreath(p, x, y, z, s, m, seed):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.30 * s, minor_radius=0.045 * s, major_segments=40,
        minor_segments=10, location=(x, y, z),
        rotation=(math.radians(78), 0, 0))
    from stock_sets import assign
    assign(bpy.context.object, m["accent_dim"])
    for i in range(18):
        angle = i * math.tau / 18.0
        ico(f"{p}-leaf-{i:02d}",
            (x + math.cos(angle) * 0.30 * s,
             y + math.sin(angle) * 0.075 * s,
             z + math.sin(angle) * 0.30 * s),
            0.055 * s, m["accent"], subdivisions=1)


def candles(p, x, y, z, s, m, seed):
    for i in range(3):
        cx = x + (i - 1) * 0.35 * s
        cylinder(f"{p}-candle-{i}", (cx, y, z + 0.16 * s), 0.035 * s,
                 0.30 * s, m["paper_warm"], vertices=16)
        cone(f"{p}-flame-{i}", (cx, y, z + 0.36 * s), 0.020 * s, 0.07 * s,
             m["sodium"], vertices=12)
        bpy.ops.object.light_add(type="POINT", location=(cx, y, z + 0.40 * s))
        light = bpy.context.object
        light.name = f"{p}-light-{i}"
        light.data.energy = 12
        light.data.color = m["sodium_rgb"]
        light.data.shadow_soft_size = 0.06


# ---------------------------------------------------------------------------
# machines, tools, rooms
# ---------------------------------------------------------------------------

def lathe(p, x, y, z, s, m, seed):
    cube(f"{p}-bed", (x, y, z + 0.82 * s), (2.20 * s, 0.50 * s, 0.16 * s),
         m["iron"])
    cube(f"{p}-head", (x + 0.90 * s, y, z + 1.12 * s),
         (0.42 * s, 0.52 * s, 0.46 * s), m["iron"])
    cylinder(f"{p}-chuck", (x + 0.62 * s, y, z + 1.12 * s), 0.16 * s,
             0.18 * s, m["metal"], rot=(0, math.radians(90), 0), vertices=24)
    cylinder(f"{p}-bar", (x + 0.10 * s, y, z + 1.12 * s), 0.045 * s,
             0.82 * s, m["metal"], rot=(0, math.radians(90), 0), vertices=12)
    cube(f"{p}-tail", (x - 0.78 * s, y, z + 1.10 * s),
         (0.26 * s, 0.36 * s, 0.36 * s), m["iron"])
    for i in range(7):
        ico(f"{p}-shaving-{i}", (x - 0.50 * s + i * 0.14 * s, y + 0.10 * s,
                                z + 0.90 * s), 0.014 * s, m["metal"],
            subdivisions=1)


def toolboard(p, x, y, z, s, m, seed):
    cube(f"{p}-board", (x, y, z + 1.35 * s), (3.20 * s, 0.08 * s, 2.10 * s),
         m["paper_dim"])
    for i in range(11):
        for j in range(7):
            cylinder(f"{p}-peg-{i}-{j}", (x - 1.50 * s + i * 0.28 * s,
                                          y - 0.05 * s,
                                          z + 0.42 * s + j * 0.26 * s),
                     0.010 * s, 0.02 * s, m["ink"],
                     rot=(math.radians(90), 0, 0), vertices=6)
    cylinder(f"{p}-hammer-handle", (x - 1.05 * s, y - 0.10 * s, z + 1.20 * s),
             0.024 * s, 0.56 * s, m["wood"], vertices=8)
    cube(f"{p}-hammer-head", (x - 1.05 * s, y - 0.10 * s, z + 1.50 * s),
         (0.28 * s, 0.10 * s, 0.11 * s), m["metal"])
    limb(f"{p}-wrench", (x - 0.35 * s, y - 0.10 * s, z + 0.90 * s),
         (x - 0.35 * s, y - 0.10 * s, z + 1.48 * s), 0.026 * s, m["metal"])
    cube(f"{p}-saw-blade", (x + 0.55 * s, y - 0.10 * s, z + 1.15 * s),
         (0.58 * s, 0.02 * s, 0.15 * s), m["metal"])
    cube(f"{p}-saw-handle", (x + 0.92 * s, y - 0.10 * s, z + 1.15 * s),
         (0.18 * s, 0.09 * s, 0.20 * s), m["wood"])


def workbench(p, x, y, z, s, m, seed):
    cube(f"{p}-top", (x, y, z + 0.92 * s), (3.0 * s, 1.2 * s, 0.12 * s),
         m["wood"])
    cube(f"{p}-apron", (x, y, z + 0.80 * s), (2.8 * s, 1.0 * s, 0.12 * s),
         m["ink"])
    for lx in (-1.30, 1.30):
        for ly in (-0.45, 0.45):
            cube(f"{p}-leg-{lx:.1f}-{ly:.1f}", (x + lx * s, y + ly * s,
                                               z + 0.44 * s),
                 (0.15 * s, 0.15 * s, 0.88 * s), m["wood"])
    cube(f"{p}-vice", (x + 1.10 * s, y - 0.25 * s, z + 1.10 * s),
         (0.32 * s, 0.28 * s, 0.20 * s), m["iron"])
    cylinder(f"{p}-vice-screw", (x + 1.10 * s, y - 0.42 * s, z + 1.08 * s),
             0.028 * s, 0.30 * s, m["metal"],
             rot=(math.radians(90), 0, 0), vertices=10)
    flat_sheet(f"{p}-plan", (x - 0.55 * s), (y - 0.10 * s), z + 0.99 * s,
               1.0 * s, 0.62 * s, m["paper_dim"], rot=-0.10)
    for i in range(4):
        cube(f"{p}-plan-line-{i}", (x - 0.55 * s, y - 0.10 * s,
                                    z + 0.996 * s),
             (0.86 * s, 0.008 * s, 0.006 * s), m["accent_dim"])


def valve(p, x, y, z, s, m, seed):
    cylinder(f"{p}-pipe", (x, y, z + 0.90 * s), 0.14 * s, 2.40 * s,
             m["metal"], rot=(math.radians(90), 0, 0), vertices=20)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.26 * s, minor_radius=0.035 * s, major_segments=32,
        minor_segments=8, location=(x, y - 0.20 * s, z + 0.90 * s),
        rotation=(0, math.radians(90), 0))
    from stock_sets import assign
    assign(bpy.context.object, m["metal"])
    for i in range(6):
        angle = i * math.pi / 3.0
        limb(f"{p}-spoke-{i}",
             (x, y - 0.20 * s + math.sin(angle) * 0.24 * s,
              z + 0.90 * s + math.cos(angle) * 0.24 * s),
             (x, y - 0.20 * s, z + 0.90 * s), 0.018 * s, m["metal"])
    cylinder(f"{p}-gauge", (x + 0.30 * s, y - 0.30 * s, z + 1.42 * s),
             0.09 * s, 0.04 * s, m["paper_dim"],
             rot=(math.radians(90), 0, 0), vertices=24)
    cube(f"{p}-needle", (x + 0.30 * s, y - 0.33 * s, z + 1.42 * s),
         (0.006 * s, 0.01 * s, 0.07 * s), m["accent_dim"])


def clock(p, x, y, z, s, m, seed):
    cylinder(f"{p}-body", (x, y, z), 0.34 * s, 0.06 * s, m["brass"],
             rot=(math.radians(90), 0, 0), vertices=48)
    cylinder(f"{p}-face", (x, y + 0.04 * s, z), 0.30 * s, 0.008 * s,
             m["paper_dim"], rot=(math.radians(90), 0, 0), vertices=48)
    limb(f"{p}-hour", (x, y + 0.05 * s, z), (x, y + 0.05 * s, z + 0.16 * s),
         0.010 * s, m["ink"])
    limb(f"{p}-minute", (x, y + 0.05 * s, z), (x + 0.13 * s, y + 0.05 * s, z),
         0.008 * s, m["ink"])
    for i in range(12):
        angle = i * math.tau / 12.0
        cube(f"{p}-tick-{i}", (x + math.cos(angle) * 0.24 * s,
                               y + 0.05 * s, z + math.sin(angle) * 0.24 * s),
             (0.012 * s, 0.006 * s, 0.032 * s), m["ink"],
             rot=(0, -angle, 0))


def lamp_post(p, x, y, z, s, m, seed):
    cylinder(f"{p}-post", (x, y, z + 2.1 * s), 0.06 * s, 4.2 * s, m["iron"],
             vertices=12)
    cone(f"{p}-arm", (x, y, z + 4.18 * s), 0.10 * s, 0.30 * s, m["iron"],
         vertices=12)
    sphere(f"{p}-globe", (x, y, z + 4.36 * s), 0.16 * s, m["sodium"],
           segments=18, rings=10)
    bpy.ops.object.light_add(type="POINT", location=(x, y, z + 4.36 * s))
    light = bpy.context.object
    light.name = f"{p}-light"
    light.data.energy = 90
    light.data.color = m["sodium_rgb"]
    light.data.shadow_soft_size = 0.18


def bed(p, x, y, z, s, m, seed):
    cube(f"{p}-frame", (x, y, z + 0.44 * s), (1.05 * s, 2.05 * s, 0.10 * s),
         m["iron"])
    cube(f"{p}-sheet", (x, y, z + 0.54 * s), (0.98 * s, 1.98 * s, 0.14 * s),
         m["paper_dim"])
    cube(f"{p}-pillow", (x, y + 0.72 * s, z + 0.62 * s),
         (0.62 * s, 0.34 * s, 0.12 * s), m["paper"])
    cube(f"{p}-head", (x, y + 1.02 * s, z + 0.78 * s),
         (1.05 * s, 0.06 * s, 0.76 * s), m["iron"])


def ballot_box(p, x, y, z, s, m, seed):
    cube(f"{p}-box", (x, y, z + 0.26 * s), (0.62 * s, 0.46 * s, 0.52 * s),
         m["wood"])
    cube(f"{p}-lid", (x, y, z + 0.54 * s), (0.64 * s, 0.48 * s, 0.05 * s),
         m["metal"])
    cube(f"{p}-slot", (x, y, z + 0.565 * s), (0.34 * s, 0.08 * s, 0.012 * s),
         m["ink"])
    cube(f"{p}-label", (x, y - 0.24 * s, z + 0.30 * s),
         (0.28 * s, 0.01 * s, 0.14 * s), m["paper"])


def oil_drum(p, x, y, z, s, m, seed):
    cylinder(f"{p}-body", (x, y, z + 0.44 * s), 0.28 * s, 0.88 * s,
             m["iron"], vertices=24)
    for i in range(3):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.285 * s, minor_radius=0.018 * s, major_segments=28,
            minor_segments=8, location=(x, y, z + 0.16 * s + i * 0.28 * s))
        from stock_sets import assign
        assign(bpy.context.object, m["metal"])


def pew(p, x, y, z, s, m, seed):
    cube(f"{p}-seat", (x, y, z + 0.46 * s), (5.0 * s, 0.42 * s, 0.10 * s),
         m["wood"])
    cube(f"{p}-back", (x, y + 0.30 * s, z + 0.80 * s),
         (5.0 * s, 0.09 * s, 0.72 * s), m["wood"])
    for side in (-2.1, 0.0, 2.1):
        cube(f"{p}-leg-{side}", (x + side * s, y, z + 0.23 * s),
             (0.12 * s, 0.34 * s, 0.46 * s), m["iron"])


def stage(p, x, y, z, s, m, seed):
    cube(f"{p}-deck", (x, y, z + 0.30 * s), (6.0 * s, 3.0 * s, 0.60 * s),
         m["wood"])
    cube(f"{p}-lip", (x, y - 1.52 * s, z + 0.32 * s),
         (6.0 * s, 0.08 * s, 0.10 * s), m["accent_dim"])
    for i in range(3):
        cylinder(f"{p}-curtain-rod-{i}", (x, y + 1.45 * s, z + 2.6 * s),
                 0.03 * s, 4.0 * s, m["metal"], vertices=8)


PROPS = {
    "press": press,
    "paper-rack": paper_rack,
    "ink-slab": ink_slab,
    "stamp": stamp,
    "ink-pad": ink_pad,
    "notes-stack": notes_stack,
    "ledger": ledger_desk,
    "desk": desk,
    "typewriter": typewriter,
    "telephone": telephone,
    "radio-rack": radio_rack,
    "microphone": microphone,
    "map-table": map_table,
    "long-table": long_table,
    "crates": crates,
    "barrel": barrel,
    "tarp": tarp,
    "sandbags": sandbags,
    "fence": fence,
    "flag": flag,
    "podium": podium,
    "ranks": ranks,
    "cot": cot,
    "bars": bars,
    "gavel": gavel,
    "witness-box": witness_box,
    "scales": scales,
    "plinth": plinth,
    "wreath": wreath,
    "candles": candles,
    "lathe": lathe,
    "toolboard": toolboard,
    "workbench": workbench,
    "valve": valve,
    "clock": clock,
    "lamp-post": lamp_post,
    "bed": bed,
    "ballot-box": ballot_box,
    "oil-drum": oil_drum,
    "pew": pew,
    "stage": stage,
}

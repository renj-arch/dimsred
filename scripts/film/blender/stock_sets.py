#!/usr/bin/env python3
"""Stock sets for films the authoring pass writes.

A film is still a set of real 3D rooms. What changes is who builds them. The
first three films each got a bespoke scene file; a film a week cannot. This
library is the studio backlot: nine dressed archetypes that a storyboard can
name, re-light and re-dress from data/films/<id>-sets.json.

The archetypes are deliberately object-led. They show a wall of paper, a desk,
an archive shelf, a corridor, a gate, a flame. They never reconstruct a person
being harmed, and they carry no read-at-a-glance text: the film's titles and
captions are drawn downstream, so a plate is free to be only a surface and a
light.

Every scene is deterministic from `seed`, so a re-render is the same plate.

Usage (from scripts/film/render-plates.js):

    blender -b --python stock_sets.py -- --scene wall_surface \
        --params '{"seed":3,"dressing":1,"prop":"notice"}' \
        --out out/plate.png --width 1920 --height 1080 --samples 32
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from salt_scenes import (  # noqa: E402
    area,
    assign,
    camera,
    cube,
    cylinder,
    dark_world,
    dust,
    emission,
    plane,
    principled,
    reset,
    sky,
    smooth,
    sphere,
)
from jallianwala_scenes import (  # noqa: E402
    aged_brass,
    dark_wood,
    flame,
    paper_material,
    plaster_material,
    render,
)


# ---------------------------------------------------------------------------
# palette
# ---------------------------------------------------------------------------

def _channel(value: int) -> float:
    """sRGB byte to linear, which is what a Principled color wants."""
    v = value / 255.0
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def rgb(hex_value: str, fallback=(0.5, 0.45, 0.38)):
    """A palette entry as linear RGB. Unknown values fall back, never crash."""
    if not isinstance(hex_value, str):
        return fallback
    value = hex_value.strip().lstrip("#")
    if len(value) != 6:
        return fallback
    try:
        return tuple(_channel(int(value[i:i + 2], 16)) for i in (0, 2, 4))
    except ValueError:
        return fallback


def scaled(color, factor):
    return tuple(min(1.0, max(0.0, c * factor)) for c in color)


def palette(params):
    given = params.get("palette") or {}
    return {
        "paper": rgb(given.get("paper"), (0.72, 0.66, 0.54)),
        "ink": rgb(given.get("ink"), (0.012, 0.011, 0.009)),
        "sodium": rgb(given.get("sodium"), (1.0, 0.52, 0.16)),
        "accent": rgb(given.get("accent"), (0.45, 0.09, 0.06)),
    }


def ink_material(name, color):
    return principled(name, scaled(color, 0.55), roughness=0.86)


def paper(name, color, roughness=0.88):
    return paper_material(name, color if isinstance(color, tuple) else (0.72, 0.66, 0.54))


def concrete(name, color):
    mat = principled(name, scaled(color, 0.34), roughness=0.9)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    tex = nodes.new("ShaderNodeTexNoise")
    tex.inputs["Scale"].default_value = 5.5
    tex.inputs["Detail"].default_value = 5.0
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.30
    ramp.color_ramp.elements[0].color = (*scaled(color, 0.20), 1)
    ramp.color_ramp.elements[1].position = 0.78
    ramp.color_ramp.elements[1].color = (*scaled(color, 0.42), 1)
    links.new(tex.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.18
    links.new(tex.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def wet_stone(name, color):
    mat = principled(name, scaled(color, 0.26), roughness=0.24, metallic=0.06)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    tex = nodes.new("ShaderNodeTexNoise")
    tex.inputs["Scale"].default_value = 9.0
    tex.inputs["Detail"].default_value = 6.0
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.32
    ramp.color_ramp.elements[0].color = (0.02, 0.018, 0.016, 1)
    ramp.color_ramp.elements[1].position = 0.66
    ramp.color_ramp.elements[1].color = (*scaled(color, 0.45), 1)
    links.new(tex.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    rough = nodes.new("ShaderNodeTexNoise")
    rough.inputs["Scale"].default_value = 3.0
    rmap = nodes.new("ShaderNodeValToRGB")
    rmap.color_ramp.elements[0].position = 0.35
    rmap.color_ramp.elements[0].color = (0.08, 0.08, 0.08, 1)
    rmap.color_ramp.elements[1].position = 0.75
    rmap.color_ramp.elements[1].color = (0.42, 0.42, 0.42, 1)
    links.new(rough.outputs["Fac"], rmap.inputs["Fac"])
    links.new(rmap.outputs["Color"], bsdf.inputs["Roughness"])
    return mat


# ---------------------------------------------------------------------------
# shared set kit
# ---------------------------------------------------------------------------

def sheet(name, x, y, z, width, height, mat, tilt=0.0, rot=0.0):
    """A single sheet of paper, thick enough to catch a raking light."""
    cube(name, (x, y, z), (width, 0.0035, height), mat,
         rot=(math.radians(tilt), 0.0, rot))


def flat_sheet(name, x, y, z, width, depth, mat, rot=0.0):
    """A sheet lying on a table. `sheet` is a wall page; this is its opposite."""
    cube(name, (x, y, z), (width, depth, 0.0035), mat, rot=(0.0, 0.0, rot))


def ruling(name, x, y, z, width, count, mat, gap=0.024):
    for i in range(count):
        cube(f"{name}-{i:02d}", (x, y, z + i * gap),
             (width * (1.0 - 0.06 * (i % 3)), 0.0012, 0.0016), mat)


def lamp_kit(prefix, x, y, z, accent, scale=1.0):
    """A practical lamp: a warm pool, a metal shade, a visible bulb."""
    metal = aged_brass()
    cylinder(f"{prefix}-base", (x, y, z + 0.02 * scale), 0.13 * scale, 0.04 * scale, metal, vertices=24)
    cylinder(f"{prefix}-stem", (x, y, z + 0.20 * scale), 0.018 * scale, 0.36 * scale, metal, vertices=12)
    bpy.ops.mesh.primitive_cone_add(
        vertices=28, radius1=0.21 * scale, radius2=0.07 * scale,
        depth=0.17 * scale, location=(x, y, z + 0.40 * scale),
    )
    shade = bpy.context.object
    shade.name = f"{prefix}-shade"
    assign(shade, principled(f"{prefix}-shade-mat", (0.045, 0.030, 0.018), roughness=0.5, metallic=0.4))
    cylinder(f"{prefix}-glow", (x, y, z + 0.315 * scale), 0.145 * scale, 0.008 * scale,
             emission(f"{prefix}-glow-mat", accent, 1.4), vertices=24)
    bpy.ops.object.light_add(type="POINT", location=(x, y, z + 0.30 * scale))
    light = bpy.context.object
    light.name = f"{prefix}-light"
    light.data.energy = 22 * scale
    light.data.color = accent
    light.data.shadow_soft_size = 0.16 * scale
    return light


def window_kit(prefix, x, y, z, width, height, cool):
    """A window is a cool rectangle, four bars and a little spill."""
    cube(f"{prefix}-glow", (x, y, z), (width, 0.006, height),
         emission(f"{prefix}-glow-mat", cool, 1.1))
    frame = principled(f"{prefix}-frame", (0.028, 0.022, 0.016), roughness=0.7)
    cube(f"{prefix}-bar-v", (x, y - 0.006, z), (0.035, 0.012, height * 1.02), frame)
    cube(f"{prefix}-bar-h", (x, y - 0.006, z), (width * 1.02, 0.012, 0.035), frame)
    cube(f"{prefix}-bar-h2", (x, y - 0.006, z - height * 0.34), (width * 1.02, 0.012, 0.028), frame)
    bpy.ops.object.light_add(type="AREA", location=(x, y - 0.55, z))
    spill = bpy.context.object
    spill.name = f"{prefix}-spill"
    spill.data.energy = 55
    spill.data.size = width * 1.2
    spill.data.color = cool
    spill.rotation_euler = (math.radians(90), 0, 0)


# ---------------------------------------------------------------------------
# archetypes
# ---------------------------------------------------------------------------

def scene_wall_surface(samples, width, height, out, params):
    """Pasted sheets on a wall, one gap where a column should be."""
    rng = random.Random(params.get("seed", 1))
    p = palette(params)
    dressing = int(params.get("dressing", 0))
    reset()
    dark_world((0.0006, 0.0005, 0.0004))

    floor = plane("Floor", (0, 1.0, 0), 9, wet_stone("FloorMat", p["paper"]))
    cube("Wall", (0, 1.35, 1.55), (8.4, 0.14, 3.1), concrete("WallMat", p["paper"]))
    cube("Skirting", (0, 1.24, 0.10), (8.4, 0.10, 0.20), ink_material("SkirtMat", p["ink"]))

    paper_mat = paper("SheetMat", p["paper"])
    sheet_mat = paper("SheetMatB", scaled(p["paper"], 0.82))
    accent = principled("StampMat", scaled(p["accent"], 0.8), roughness=0.82)

    if dressing == 1:
        # One enormous page, ruled, with a stamp frame: the censored column.
        sheet("BigPage", 0.15, 1.24, 1.55, 2.55, 2.35, paper_mat, tilt=0.4, rot=-0.01)
        ruling("BigRule", -0.42, 1.232, 0.72, 0.95, 24, ink_material("BigInk", p["ink"]), gap=0.052)
        for i in range(4):
            y = 0.52 + i * 0.36
            cube(f"BigLine-{i}", (0.42, 1.232, y), (1.05 - (i % 2) * 0.18, 0.0012, 0.0018),
                 ink_material(f"BigInkLine-{i}", p["ink"]))
        # the blank column: a missing block of ruled lines, edged in red
        for name, loc, dims in (
            ("BlankTop", (0.42, 1.228, 1.72), (0.62, 0.0022, 0.006)),
            ("BlankBottom", (0.42, 1.228, 1.02), (0.62, 0.0022, 0.006)),
            ("BlankLeft", (0.13, 1.228, 1.37), (0.006, 0.0022, 0.70)),
            ("BlankRight", (0.71, 1.228, 1.37), (0.006, 0.0022, 0.70)),
        ):
            cube(name, loc, dims, accent)
    elif dressing == 2:
        # A grid of index cards, one whole row missing.
        for row in range(6):
            for col in range(6):
                if row == 3:
                    continue
                x = -1.35 + col * 0.54 + rng.uniform(-0.02, 0.02)
                z = 0.55 + row * 0.42 + rng.uniform(-0.02, 0.02)
                sheet(f"Card-{row}-{col}", x, 1.26, z, 0.40, 0.30,
                      sheet_mat if (row + col) % 3 else paper_mat,
                      tilt=rng.uniform(-1.4, 1.4), rot=rng.uniform(-0.03, 0.03))
                ruling(f"CardRule-{row}-{col}", x, 1.252, z - 0.09, 0.26, 4,
                       ink_material(f"CardInk-{row}-{col}", p["ink"]), gap=0.045)
        cube("MissingRow", (0.15, 1.252, 1.81), (3.35, 0.002, 0.30),
             plaster_material("MissingMat", scaled(p["paper"], 0.55)))
    else:
        # A run of pasted notices, torn at the edges, with pace between them.
        for row in range(5):
            for col in range(5):
                if row == 2 and col == 2:
                    continue
                x = -1.5 + col * 0.76 + rng.uniform(-0.03, 0.03)
                z = 0.55 + row * 0.48 + rng.uniform(-0.025, 0.025)
                sheet(f"Notice-{row}-{col}", x, 1.26, z, 0.56, 0.40,
                      paper_mat if (row + col) % 2 else sheet_mat,
                      tilt=rng.uniform(-1.8, 1.8), rot=rng.uniform(-0.05, 0.05))
                ruling(f"NoticeRule-{row}-{col}", x, 1.252, z - 0.11, 0.38, 5,
                       ink_material(f"NoticeInk-{row}-{col}", p["ink"]), gap=0.042)
        cube("Gap", (0.15, 1.254, 1.51), (0.62, 0.002, 0.44),
             plaster_material("GapMat", scaled(p["paper"], 0.5)))

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.1, 1.2, 1.5))
    focus = bpy.context.object
    camera((0.85, -3.15, 1.62), (0.05, 1.2, 1.48), lens=52, fstop=2.4, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.7
    area("Rake", (-2.6, -1.5, 2.9), (0.0, 1.2, 1.4), 420, 1.1, (1.0, 0.62, 0.32))
    area("Fill", (2.4, -1.0, 1.2), (0.0, 1.2, 1.3), 55, 1.6, (0.32, 0.46, 0.62))
    area("Top", (0.0, 0.2, 3.3), (0.0, 1.2, 1.9), 90, 2.2, (0.55, 0.42, 0.28))
    render(samples, width, height, out)


def scene_paper_desk(samples, width, height, out, params):
    """A desk with one document, a lamp and the tools of making a record."""
    rng = random.Random(params.get("seed", 2))
    p = palette(params)
    dressing = int(params.get("dressing", 0)) % 3
    reset()
    dark_world((0.0005, 0.0004, 0.0003))

    plane("Desk", (0, 0, 0), 8, dark_wood())
    cube("DeskEdge", (0, 1.09, -0.04), (4.6, 0.22, 0.14),
         ink_material("DeskEdgeMat", p["ink"]))
    paper_mat = paper("DeskPaper", p["paper"])
    ink = ink_material("DeskInk", p["ink"])

    sheet("Document", 0.0, 0.0, 0.012, 2.30, 1.52, paper_mat,
          tilt=-0.35, rot=rng.uniform(-0.02, 0.02))
    ruling("DocRule", -0.72, -0.006, -0.52, 1.10, 20, ink, gap=0.048)
    for i in range(5):
        cube(f"DocLine-{i}", (0.62, -0.006, 0.46 - i * 0.085),
             (0.55 - (i % 2) * 0.14, 0.0014, 0.002), ink)

    if dressing == 1:
        # a second, older sheet underneath, offset
        sheet("Under", -0.22, -0.02, 0.006, 2.05, 1.35,
              paper("DeskPaperB", scaled(p["paper"], 0.78)), tilt=0.2, rot=0.05)
    elif dressing == 2:
        # a small stack at the corner and a red stamp mark
        for i in range(6):
            sheet(f"Stack-{i}", -1.42 + i * 0.008, -0.64 + i * 0.014, 0.012 + i * 0.010,
                  0.62, 0.46, paper_mat, tilt=0.4, rot=i * 0.012)
        cube("StampBar", (0.55, -0.46, 0.02), (0.62, 0.004, 0.008),
             principled("StampBarMat", scaled(p["accent"], 0.85), roughness=0.8))

    lamp_kit("DeskLamp", 1.42, 0.55, 0.0, p["sodium"], scale=0.95)
    cylinder("Glass", (1.02, -0.72, 0.10), 0.085, 0.20,
             principled("GlassMat", (0.30, 0.34, 0.33), roughness=0.06, transmission=0.85), vertices=28)
    cube("Pen", (0.55, -0.92, 0.014), (0.34, 0.018, 0.012),
         ink_material("PenMat", p["ink"]), rot=(0, 0, 0.6))

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.03))
    focus = bpy.context.object
    camera((-0.95, -3.05, 2.55), (0.02, 0.0, 0.12), lens=46, fstop=2.2, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.85
    area("Key", (0.6, -1.9, 3.0), (0.0, 0.0, 0.05), 235, 1.9, (1.0, 0.64, 0.34))
    area("Rim", (2.2, 0.9, 1.9), (0.0, 0.0, 0.05), 130, 1.5, (0.36, 0.56, 0.74))
    area("Side", (-2.5, 0.3, 1.4), (0.0, 0.0, 0.05), 26, 1.2, (0.52, 0.36, 0.24))
    render(samples, width, height, out)


def scene_room_interior(samples, width, height, out, params):
    """One room, one chair, one window; the corners stay black."""
    rng = random.Random(params.get("seed", 3))
    p = palette(params)
    reset()
    dark_world((0.0004, 0.0004, 0.0004))

    plane("RoomFloor", (0, 1.6, 0), 8, dark_wood())
    cube("BackWall", (0, 3.1, 1.4), (5.6, 0.18, 2.8), plaster_material("RoomPlaster", scaled(p["paper"], 0.62)))
    cube("SideWall", (-2.8, 1.6, 1.4), (0.18, 3.2, 2.8), plaster_material("RoomPlasterB", scaled(p["paper"], 0.50)))
    cube("Ceiling", (0, 1.6, 2.82), (5.8, 3.4, 0.12), ink_material("CeilMat", p["ink"]))

    window_kit("RoomWindow", -1.55, 3.0, 1.55, 1.25, 1.0, (0.36, 0.55, 0.78))
    cube("Table", (0.35, 1.5, 0.70), (1.55, 0.72, 0.07),
         dark_wood())
    for i, (x, y) in enumerate(((-0.36, 0.86), (1.06, 0.86), (-0.36, 2.14), (1.06, 2.14))):
        cube(f"TableLeg-{i}", (x, y, 0.34), (0.07, 0.07, 0.66), ink_material(f"LegMat-{i}", p["ink"]))
    # a chair seen from behind, never a person
    cube("ChairBack", (0.25, 0.62, 0.82), (0.52, 0.08, 0.95),
         ink_material("ChairMat", p["ink"]), rot=(0, 0, 0.05))
    for i, (x, y) in enumerate(((0.02, 0.62), (0.48, 0.62))):
        cube(f"ChairLeg-{i}", (x, y, 0.20), (0.05, 0.05, 0.40), ink_material(f"ChairLegMat-{i}", p["ink"]))
    sheet("RoomPaper", 0.35, 1.48, 0.742, 0.62, 0.44,
          paper("RoomPaperMat", p["paper"]), tilt=0.2, rot=rng.uniform(-0.1, 0.1))

    lamp_kit("RoomBulb", 0.35, 1.5, 0.78, p["sodium"], scale=0.55)
    bpy.context.object.data.energy = 12
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.3, 1.5, 0.9))
    focus = bpy.context.object
    camera((2.05, -2.55, 1.95), (-0.05, 1.65, 1.15), lens=32, fstop=2.8, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.75
    area("WindowFill", (-1.3, 1.9, 1.8), (-0.2, 2.0, 1.2), 50, 1.4, (0.38, 0.55, 0.78))
    area("Bounce", (1.2, 0.2, 0.4), (0.2, 1.6, 0.8), 16, 2.0, (0.62, 0.44, 0.28))
    render(samples, width, height, out)


def scene_corridor(samples, width, height, out, params):
    """A concrete corridor, doors on one side, one line of light at the end."""
    rng = random.Random(params.get("seed", 4))
    p = palette(params)
    reset()
    dark_world((0.0005, 0.0005, 0.0004))

    floor = plane("CorridorFloor", (0, 3.0, 0), 12, wet_stone("CorrFloor", p["paper"]))
    cube("CorrCeil", (0, 3.0, 2.55), (2.9, 7.0, 0.16), concrete("CorrCeilMat", p["paper"]))
    cube("WallL", (-1.45, 3.0, 1.27), (0.16, 7.0, 2.55), concrete("CorrWallL", p["paper"]))
    cube("WallR", (1.45, 3.0, 1.27), (0.16, 7.0, 2.55), concrete("CorrWallR", p["paper"]))
    cube("EndWall", (0, 6.5, 1.27), (2.9, 0.16, 2.55), concrete("CorrEnd", scaled(p["paper"], 0.8)))

    door = ink_material("CorrDoor", p["ink"])
    for i in range(4):
        y = 0.9 + i * 1.45
        cube(f"Door-{i}", (-1.36, y, 1.10), (0.08, 0.92, 2.05), door)
        cube(f"DoorFrame-{i}", (-1.32, y, 1.12), (0.06, 1.02, 2.15),
             principled(f"DoorFrameMat-{i}", scaled(p["paper"], 0.42), roughness=0.72))
        cube(f"DoorSlit-{i}", (-1.30, y, 0.035), (0.02, 0.86, 0.012),
             emission(f"DoorSlitMat-{i}", p["sodium"], 0.9))
        cube(f"DoorLight-{i}", (-1.33, y, 1.95), (0.04, 0.10, 0.16),
             emission(f"DoorLightMat-{i}", p["sodium"], 1.6))
        # a dim practical every other bay
        if i % 2 == 0:
            bpy.ops.object.light_add(type="AREA", location=(-1.15, y, 2.30))
            light = bpy.context.object
            light.data.energy = 26
            light.data.size = 0.7
            light.data.color = (1.0, 0.55, 0.24)
            light.rotation_euler = (0, math.radians(70), 0)

    bpy.ops.object.light_add(type="AREA", location=(0, 6.2, 1.9))
    end_light = bpy.context.object
    end_light.data.energy = 110
    end_light.data.size = 0.9
    end_light.data.color = (0.55, 0.68, 0.82)
    end_light.rotation_euler = (0, math.radians(180), 0)

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 4.0, 1.4))
    focus = bpy.context.object
    camera((0.10, -0.55, 1.48), (0.0, 5.8, 1.42), lens=34, fstop=4.0, focus=focus)
    bpy.context.scene.view_settings.exposure = -1.0
    dust(count=80, seed=11, zmax=2.4, ymax=6.5)
    render(samples, width, height, out)


def scene_exterior_night(samples, width, height, out, params):
    """A wet street: one sodium lamp, shuttered fronts, no people."""
    rng = random.Random(params.get("seed", 5))
    p = palette(params)
    reset()
    sky((0.006, 0.012, 0.020), (0.16, 0.085, 0.045), (0.002, 0.003, 0.005))

    plane("Street", (0, 4.0, 0), 22, wet_stone("StreetMat", p["paper"]))
    cube("Kerb", (0, 1.4, 0.10), (9.0, 0.22, 0.20), concrete("KerbMat", scaled(p["paper"], 0.7)))

    # a row of shuttered fronts with a few lit windows above
    for i in range(5):
        x = -5.0 + i * 2.5
        cube(f"Front-{i}", (x, 3.2, 1.35), (2.25, 0.55, 2.70),
             concrete(f"FrontMat-{i}", scaled(p["paper"], 0.55 + (i % 2) * 0.08)))
        cube(f"Shutter-{i}", (x, 2.90, 0.92), (1.80, 0.06, 1.55),
             principled(f"ShutterMat-{i}", scaled(p["ink"], 0.9), roughness=0.62, metallic=0.35))
        for k in range(6):
            cube(f"ShutterRib-{i}-{k}", (x, 2.86, 0.30 + k * 0.24),
                 (1.80, 0.02, 0.022), ink_material(f"RibMat-{i}-{k}", p["ink"]))
        if i in (1, 3):
            window_kit(f"Upper-{i}", x + 0.35, 2.92, 2.25, 0.55, 0.48, (0.42, 0.56, 0.74))
        elif i == 4:
            cube(f"UpperWarm-{i}", (x - 0.3, 2.92, 2.25), (0.50, 0.006, 0.44),
                 emission(f"UpperWarmMat-{i}", p["sodium"], 1.2))

    # the street lamp is the only warm source
    pole = aged_brass()
    cylinder("Pole", (1.55, 2.1, 1.85), 0.055, 3.7, pole, vertices=16)
    cylinder("PoleArm", (1.15, 2.1, 3.66), 0.040, 0.85, pole, rot=(0, math.radians(90), 0), vertices=12)
    cube("LampHead", (0.78, 2.1, 3.60), (0.34, 0.22, 0.10),
         principled("LampHeadMat", (0.05, 0.04, 0.03), roughness=0.5, metallic=0.4))
    cube("LampGlass", (0.78, 2.1, 3.545), (0.26, 0.16, 0.012),
         emission("LampGlassMat", p["sodium"], 3.4))
    bpy.ops.object.light_add(type="SPOT", location=(0.78, 2.1, 3.50))
    spot = bpy.context.object
    spot.data.energy = 800
    spot.data.spot_size = math.radians(95)
    spot.data.spot_blend = 0.55
    spot.data.color = (1.0, 0.58, 0.24)
    spot.rotation_euler = (0, 0, 0)

    # a puddle catches the lamp
    cylinder("Puddle", (0.35, 2.6, 0.006), 1.15, 0.004,
             principled("PuddleMat", (0.02, 0.022, 0.024), roughness=0.04, metallic=0.15), vertices=40)

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.6, 2.4, 1.6))
    focus = bpy.context.object
    camera((0.0, -2.7, 1.45), (0.45, 3.4, 1.85), lens=30, fstop=2.4, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.9
    area("Moon", (-3.0, -1.0, 4.5), (0.0, 3.0, 1.4), 40, 2.4, (0.36, 0.48, 0.68))
    dust(count=110, seed=17, zmax=3.2, ymax=8.0)
    render(samples, width, height, out)


def scene_gate(samples, width, height, out, params):
    """A gate in a wall: bars close on the lens, the wall stays still."""
    rng = random.Random(params.get("seed", 6))
    p = palette(params)
    reset()
    dark_world((0.0004, 0.0004, 0.0004))

    plane("GateGround", (0, 1.0, 0), 12, wet_stone("GateGroundMat", p["paper"]))
    cube("GateWallL", (-2.7, 1.8, 1.45), (3.2, 0.5, 2.9), concrete("GateWallLMat", p["paper"]))
    cube("GateWallR", (2.7, 1.8, 1.45), (3.2, 0.5, 2.9), concrete("GateWallRMat", p["paper"]))
    cube("GateLintel", (0, 1.8, 2.75), (2.3, 0.5, 0.35), concrete("GateLintelMat", scaled(p["paper"], 0.8)))
    cube("GateDark", (0, 2.1, 1.28), (2.3, 0.08, 2.55), ink_material("GateDarkMat", p["ink"]))

    metal = aged_brass()
    for i in range(9):
        x = -1.04 + i * 0.26
        cylinder(f"Bar-{i}", (x, 1.72, 1.30), 0.024, 2.55, metal, vertices=10)
        cylinder(f"BarTip-{i}", (x, 1.72, 2.60), 0.040, 0.10, metal, vertices=10)
    for k, z in enumerate((0.35, 1.15, 2.10)):
        cube(f"Rail-{k}", (0, 1.72, z), (2.28, 0.05, 0.07), metal)
    # chain and padlock: the gate is a lock, not a backdrop
    for i in range(9):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.045, minor_radius=0.012, major_segments=16, minor_segments=6,
            location=(0.05 + (i % 2) * 0.02, 1.66, 1.15 - i * 0.075),
            rotation=(math.radians(90), 0, 0),
        )
        assign(bpy.context.object, metal)
    cube("Padlock", (0.05, 1.64, 0.72), (0.16, 0.08, 0.20), metal)
    cylinder("PadlockShackle", (0.05, 1.64, 0.84), 0.055, 0.05, metal,
             rot=(math.radians(90), 0, 0), vertices=16)

    bpy.ops.object.light_add(type="AREA", location=(-1.8, -1.2, 3.0))
    key = bpy.context.object
    key.data.energy = 300
    key.data.size = 1.1
    key.data.color = (1.0, 0.62, 0.30)

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 1.7, 1.35))
    focus = bpy.context.object
    camera((0.35, -3.1, 1.55), (0.0, 1.7, 1.40), lens=44, fstop=2.0, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.9
    dust(count=50, seed=23, zmax=2.6, ymax=4.0)
    render(samples, width, height, out)


def _prop_register(p, x, y, z):
    paper_mat = paper("PropPaper", p["paper"])
    board = dark_wood()
    for i in range(3):
        cube(f"Register-{i}", (x, y, z + i * 0.075), (0.56 - i * 0.02, 0.40, 0.065),
             board if i == 0 else paper_mat,
             rot=(0, 0, (i - 1) * 0.04))
    cylinder("RegisterSpine", (x - 0.285, y, z + 0.075), 0.032, 0.62, board,
             rot=(0, math.radians(90), 0), vertices=12)


def _prop_newspaper(p, x, y, z):
    paper_mat = paper("PropNews", scaled(p["paper"], 0.92))
    cube("NewsFold", (x, y, z), (0.72, 0.50, 0.010), paper_mat, rot=(0, 0, 0.08))
    cube("NewsFoldB", (x + 0.04, y, z + 0.012), (0.66, 0.44, 0.010),
         paper_mat, rot=(0, 0, -0.04))
    ruling("NewsRule", x, y, z + 0.024, 0.46, 8,
           ink_material("NewsInk", p["ink"]), gap=0.045)


def _prop_notice(p, x, y, z):
    sheet("PropNotice", x, y, z, 0.58, 0.78, paper("PropNoticeMat", p["paper"]), tilt=0.6, rot=0.06)
    ruling("PropNoticeRule", x, y - 0.004, z - 0.26, 0.40, 9,
           ink_material("PropNoticeInk", p["ink"]), gap=0.052)


def _prop_lamp(p, x, y, z):
    cylinder("OilBase", (x, y, z), 0.10, 0.16,
             aged_brass(), vertices=24)
    cylinder("OilGlass", (x, y, z + 0.22), 0.075, 0.26,
             principled("OilGlassMat", (0.22, 0.18, 0.12), roughness=0.08, transmission=0.8), vertices=24)
    flame("OilFlame", (x, y, z + 0.20), scale=1.2)


def _prop_jar(p, x, y, z):
    cylinder("Jar", (x, y, z + 0.14), 0.13, 0.28,
             principled("JarMat", (0.30, 0.34, 0.33), roughness=0.05, transmission=0.9), vertices=28)
    cylinder("JarWater", (x, y, z + 0.10), 0.115, 0.18,
             principled("JarWaterMat", (0.22, 0.24, 0.20), roughness=0.12, transmission=0.6), vertices=28)
    cylinder("JarCap", (x, y, z + 0.29), 0.135, 0.03, aged_brass(), vertices=24)


def _prop_files(p, x, y, z):
    """A bundle of folders, one tab pulled proud of the stack."""
    for i in range(5):
        mat = paper(f"FilesMat-{i}", scaled(p["paper"], 0.94 - i * 0.07))
        cube(f"FileFolder-{i}", (x + (i % 2) * 0.02, y + i * 0.012, z + i * 0.028),
             (0.62 - (i % 3) * 0.03, 0.46, 0.022), mat,
             rot=(0, 0, -0.03 + i * 0.02))
        cube(f"FileTab-{i}", (x - 0.20 + (i % 3) * 0.19, y - 0.17, z + i * 0.028 + 0.020),
             (0.10, 0.02, 0.036), mat)
    cylinder("FileString", (x, y - 0.02, z + 0.085), 0.006, 0.44,
             ink_material("FileStringMat", p["accent"]),
             rot=(0, math.radians(90), 0), vertices=8)


def _prop_seal(p, x, y, z):
    """A folded sheet closed with red wax, the matrix still beside it."""
    flat_sheet("SealPaper", x, y, z, 0.62, 0.44, paper("SealPaperMat", p["paper"]),
               rot=0.04)
    flat_sheet("SealFold", x + 0.02, y - 0.03, z + 0.006, 0.58, 0.30,
               paper("SealFoldMat", scaled(p["paper"], 0.86)), rot=-0.05)
    cylinder("SealWax", (x + 0.05, y - 0.06, z + 0.014), 0.085, 0.020,
             principled("SealWaxMat", scaled(p["accent"], 0.90), roughness=0.55), vertices=28)
    cylinder("SealRim", (x + 0.05, y - 0.06, z + 0.026), 0.068, 0.008,
             principled("SealRimMat", scaled(p["accent"], 0.52), roughness=0.72), vertices=24)
    cylinder("SealMatrix", (x + 0.34, y + 0.05, z + 0.055), 0.030, 0.11,
             aged_brass(), vertices=20)
    cylinder("SealMatrixHead", (x + 0.34, y + 0.05, z + 0.125), 0.055, 0.030,
             aged_brass(), vertices=24)


def _prop_key(p, x, y, z):
    """An iron key laid on a sheet, bow and bit both readable."""
    sheet("KeyPaper", x, y, z, 0.66, 0.46, paper("KeyPaperMat", p["paper"]),
          tilt=0.2, rot=-0.03)
    iron = principled("KeyIronMat", (0.045, 0.042, 0.038), roughness=0.45, metallic=0.7)
    cylinder("KeyShaft", (x + 0.05, y - 0.04, z + 0.035), 0.012, 0.46, iron,
             rot=(0, math.radians(90), 0), vertices=12)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.075, minor_radius=0.014, major_segments=24, minor_segments=8,
        location=(x - 0.19, y - 0.04, z + 0.035),
        rotation=(math.radians(90), 0, 0),
    )
    bow = bpy.context.object
    bow.name = "KeyBow"
    assign(bow, iron)
    cube("KeyBit", (x + 0.21, y - 0.04, z + 0.010), (0.070, 0.024, 0.050), iron)
    cube("KeyBitB", (x + 0.15, y - 0.04, z + 0.028), (0.034, 0.024, 0.030), iron)


def _prop_book(p, x, y, z):
    """A closed volume: board covers, a page block, three rules in brass."""
    cover = principled("BookCoverMat", scaled(p["accent"], 0.52), roughness=0.62)
    pages = paper("BookPagesMat", p["paper"])
    cube("BookPages", (x, y, z + 0.038), (0.44, 0.60, 0.060), pages)
    cube("BookCoverFront", (x, y, z + 0.075), (0.46, 0.62, 0.012), cover)
    cube("BookCoverBack", (x, y, z + 0.004), (0.46, 0.62, 0.012), cover)
    cube("BookSpine", (x - 0.235, y, z + 0.040), (0.026, 0.62, 0.092), cover)
    brass = aged_brass()
    for i in range(3):
        cube(f"BookRule-{i}", (x + 0.02, y, z + 0.082 + i * 0.0015),
             (0.30 - i * 0.04, 0.002, 0.002), brass)


def scene_plinth_object(samples, width, height, out, params):
    """One object on a plinth, lit from the side, its shadow longer than itself."""
    p = palette(params)
    prop = params.get("prop", "register")
    reset()
    dark_world((0.0003, 0.0003, 0.0003))

    plane("PlinthFloor", (0, 0.6, 0), 8, wet_stone("PlinthFloorMat", p["paper"]))
    cube("Plinth", (0, 0.55, 0.45), (0.95, 0.95, 0.90),
         concrete("PlinthMat", scaled(p["paper"], 0.6)))
    cube("PlinthTop", (0, 0.55, 0.905), (1.02, 1.02, 0.02), ink_material("PlinthTopMat", p["ink"]))
    cube("Backdrop", (0, 2.4, 1.5), (6.0, 0.12, 3.0), ink_material("BackdropMat", p["ink"]))

    x, y, z = 0.0, 0.55, 0.92
    if prop == "newspaper":
        _prop_newspaper(p, x, y, z)
    elif prop == "notice":
        _prop_notice(p, x, y, z)
    elif prop == "lamp":
        _prop_lamp(p, x, y, z)
    elif prop == "jar":
        _prop_jar(p, x, y, z)
    elif prop == "files":
        _prop_files(p, x, y, z)
    elif prop == "seal":
        _prop_seal(p, x, y, z)
    elif prop == "key":
        _prop_key(p, x, y, z)
    elif prop == "book":
        _prop_book(p, x, y, z)
    else:
        _prop_register(p, x, y, z)

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0.55, 1.05))
    focus = bpy.context.object
    camera((-0.95, -2.30, 1.30), (0.0, 0.55, 1.02), lens=72, fstop=1.9, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.95
    area("HardKey", (-2.2, -1.0, 2.3), (0.0, 0.55, 1.0), 330, 0.7, (1.0, 0.66, 0.34))
    area("Rim", (1.9, 0.9, 1.9), (0.0, 0.55, 1.0), 90, 1.2, (0.34, 0.50, 0.68))
    area("Bounce", (0.0, -1.5, 0.2), (0.0, 0.55, 0.6), 10, 2.0, (0.6, 0.42, 0.26))
    render(samples, width, height, out)


def scene_flame_source(samples, width, height, out, params):
    """A candle on a dark table: the only warm thing in the room."""
    p = palette(params)
    reset()
    dark_world((0.0003, 0.0003, 0.0003))

    plane("FlameTable", (0, 0, 0), 6, dark_wood())
    cube("FlameBack", (0, 2.2, 1.4), (6.0, 0.12, 2.8), plaster_material("FlameBackMat", scaled(p["paper"], 0.28)))

    # brass holder, then a real candle with a visible wax column
    cylinder("FlameBase", (0, 0.35, 0.045), 0.20, 0.09, aged_brass(), vertices=32)
    cylinder("FlameCup", (0, 0.35, 0.135), 0.13, 0.09,
             principled("FlameCupMat", (0.10, 0.07, 0.04), roughness=0.35, metallic=0.55), vertices=28)
    wax = principled("FlameWax", (0.62, 0.46, 0.28), roughness=0.55)
    cylinder("Candle", (0, 0.35, 0.34), 0.095, 0.40, wax, vertices=36)
    cylinder("CandleTop", (0, 0.35, 0.545), 0.088, 0.012,
             principled("CandleTopMat", (0.58, 0.46, 0.30), roughness=0.7), vertices=32)
    cylinder("Wick", (0, 0.35, 0.568), 0.006, 0.045,
             ink_material("WickMat", (0.02, 0.015, 0.01)), vertices=8)
    flame("TableFlame", (0, 0.35, 0.575), scale=1.05)

    bpy.ops.object.light_add(type="POINT", location=(0, 0.35, 0.62))
    warm = bpy.context.object
    warm.data.energy = 9
    warm.data.color = (1.0, 0.46, 0.14)
    warm.data.shadow_soft_size = 0.035
    # the wax itself glows a little around the wick
    bpy.ops.object.light_add(type="AREA", location=(0, 0.35, 0.50))
    halo = bpy.context.object
    halo.data.energy = 2.2
    halo.data.size = 0.16
    halo.data.color = (1.0, 0.58, 0.24)

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0.35, 0.52))
    focus = bpy.context.object
    camera((0.42, -1.72, 0.66), (0.0, 0.35, 0.50), lens=82, fstop=2.0, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.75
    area("ColdRim", (1.4, 1.0, 1.3), (0.0, 0.35, 0.55), 45, 0.9, (0.30, 0.46, 0.66))
    area("GlassEdge", (-1.2, 0.8, 1.0), (0.0, 0.35, 0.55), 12, 0.7, (0.55, 0.40, 0.28))
    render(samples, width, height, out)


def scene_archive(samples, width, height, out, params):
    """A closed archive: shelves of files, one table, one work lamp."""
    rng = random.Random(params.get("seed", 8))
    p = palette(params)
    dressing = int(params.get("dressing", 0)) % 3
    prop = params.get("prop", "files")
    reset()
    dark_world((0.0005, 0.0004, 0.0003))

    plane("ArchiveFloor", (0, 1.4, 0), 10, dark_wood())
    cube("ArchiveBack", (0, 2.70, 1.50), (6.4, 0.16, 3.0),
         plaster_material("ArchiveWallMat", scaled(p["paper"], 0.30)))
    cube("ArchiveCeil", (0, 1.4, 2.95), (6.4, 4.2, 0.10),
         ink_material("ArchiveCeilMat", p["ink"]))

    wood = dark_wood()
    shelf_w = 1.62
    for b in range(3):
        cx = -1.78 + b * 1.78
        cube(f"ArchPostL-{b}", (cx - shelf_w / 2, 2.44, 1.42), (0.10, 0.62, 2.60), wood)
        cube(f"ArchPostR-{b}", (cx + shelf_w / 2, 2.44, 1.42), (0.10, 0.62, 2.60), wood)
        cube(f"ArchBackPanel-{b}", (cx, 2.72, 1.42), (shelf_w, 0.05, 2.55),
             ink_material(f"ArchPanelMat-{b}", p["ink"]))
        for s in range(6):
            z = 0.30 + s * 0.46
            cube(f"ArchShelf-{b}-{s}", (cx, 2.44, z), (shelf_w, 0.60, 0.045), wood)
            if dressing == 0:
                # rows of document boxes, some pale, one missing from the run
                for i in range(6):
                    if rng.random() < 0.10:
                        continue
                    bx = cx - 0.62 + i * 0.250
                    h = 0.26 + rng.uniform(-0.02, 0.04)
                    mat = paper(f"ArchBoxMat-{b}-{s}-{i}",
                                scaled(p["paper"], 0.70 + (i % 3) * 0.07))
                    cube(f"ArchBox-{b}-{s}-{i}", (bx, 2.42, z + 0.023 + h / 2),
                         (0.20, 0.44, h), mat, rot=(0, 0, rng.uniform(-0.015, 0.015)))
                    cube(f"ArchLabel-{b}-{s}-{i}", (bx, 2.198, z + 0.023 + h * 0.55),
                         (0.11, 0.002, 0.032), paper(f"ArchLabelMat-{b}-{s}-{i}", p["paper"]))
            elif dressing == 1 and s in (1, 2, 3):
                # a card catalogue: drawer faces and brass pulls
                cube(f"ArchDrawers-{b}-{s}", (cx, 2.40, z + 0.23),
                     (shelf_w - 0.10, 0.46, 0.42), wood)
                for row in range(3):
                    for col in range(8):
                        dx = cx - 0.63 + col * 0.18
                        dz = z + 0.09 + row * 0.13
                        cube(f"ArchDrawer-{b}-{s}-{row}-{col}", (dx, 2.165, dz),
                             (0.15, 0.012, 0.10), wood)
                        cylinder(f"ArchPull-{b}-{s}-{row}-{col}", (dx, 2.152, dz),
                                 0.012, 0.012, aged_brass(),
                                 rot=(math.radians(90), 0, 0), vertices=10)
            else:
                # files standing on edge, leaning, with gaps where one is out
                for i in range(11):
                    if rng.random() < 0.12:
                        continue
                    fx = cx - 0.66 + i * 0.132
                    mat = paper(f"ArchFileMat-{b}-{s}-{i}",
                                scaled(p["paper"], 0.74 + (i % 4) * 0.05))
                    cube(f"ArchFile-{b}-{s}-{i}", (fx, 2.40, z + 0.023 + 0.17),
                         (0.028, 0.34, 0.34), mat,
                         rot=(0, rng.uniform(-0.10, 0.10), 0))

    cube("ArchTableTop", (0.0, -0.30, 0.72), (1.90, 0.74, 0.07), wood)
    for i, (lx, ly) in enumerate(((-0.82, -0.60), (0.82, -0.60), (-0.82, 0.02), (0.82, 0.02))):
        cube(f"ArchTableLeg-{i}", (lx, ly, 0.35), (0.09, 0.09, 0.70),
             ink_material(f"ArchLegMat-{i}", p["ink"]))
    sheet("ArchBlotter", 0.0, -0.30, 0.758, 1.30, 0.54,
          paper("ArchBlotterMat", scaled(p["paper"], 0.72)), tilt=0.2, rot=0.01)

    px, py, pz = -0.02, -0.30, 0.760
    if prop == "seal":
        _prop_seal(p, px, py, pz)
    elif prop == "key":
        _prop_key(p, px, py, pz)
    elif prop == "book":
        _prop_book(p, px, py, pz)
    else:
        _prop_files(p, px, py, pz)

    lamp_kit("ArchLamp", 0.68, -0.34, 0.758, p["sodium"], scale=0.62)

    # Four framings of the same room. A re-dressed shelf is not a new scene;
    # a different lens on a different part of the archive is.
    view = str(params.get("camera", "wide"))
    if view == "shelf":
        bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 2.35, 1.35))
        focus = bpy.context.object
        camera((0.10, -1.05, 1.32), (0.0, 2.45, 1.38), lens=55, fstop=2.8, focus=focus)
    elif view == "table":
        bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, -0.20, 0.82))
        focus = bpy.context.object
        camera((0.62, -2.35, 1.62), (0.0, -0.10, 0.80), lens=48, fstop=2.6, focus=focus)
    elif view == "aisle":
        bpy.ops.object.empty_add(type="PLAIN_AXES", location=(-0.60, 2.20, 1.32))
        focus = bpy.context.object
        camera((1.60, -2.05, 1.48), (-0.45, 2.35, 1.30), lens=34, fstop=4.0, focus=focus)
    else:
        bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 1.30, 1.10))
        focus = bpy.context.object
        camera((0.55, -3.20, 1.75), (0.0, 1.90, 1.28), lens=42, fstop=4.0, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.85
    area("ArchKey", (-2.4, -0.8, 2.8), (0.0, 1.9, 1.4), 360, 1.3, (1.0, 0.62, 0.32))
    area("ArchFill", (2.2, -1.4, 1.5), (0.0, 1.9, 1.2), 45, 1.8, (0.34, 0.48, 0.66))
    area("ArchTable", (0.9, -1.2, 2.1), (0.0, -0.2, 0.8), 60, 0.8, (1.0, 0.60, 0.30))
    dust(40, seed=13, zmax=2.8, ymax=7)
    render(samples, width, height, out)


def scene_vault(samples, width, height, out, params):
    """A strongroom door: the wheel, the bolts, one lamp above the steel."""
    rng = random.Random(params.get("seed", 9))
    p = palette(params)
    dressing = int(params.get("dressing", 0)) % 3
    reset()
    dark_world((0.0004, 0.0004, 0.00035))

    plane("VaultFloor", (0, 0.8, 0), 12, wet_stone("VaultFloorMat", p["paper"]))
    cube("VaultCeil", (0, 1.6, 3.05), (7.0, 5.0, 0.12), ink_material("VaultCeilMat", p["ink"]))
    cube("VaultWallL", (-3.0, 2.2, 1.5), (0.9, 0.3, 3.0), concrete("VaultWallLMat", p["paper"]))
    cube("VaultWallR", (3.0, 2.2, 1.5), (0.9, 0.3, 3.0), concrete("VaultWallRMat", p["paper"]))
    cube("VaultLintel", (0, 2.2, 2.95), (5.2, 0.3, 0.5), concrete("VaultLintelMat", scaled(p["paper"], 0.8)))

    steel = principled("VaultSteel", (0.055, 0.058, 0.056), roughness=0.42, metallic=0.72)
    steel_dark = principled("VaultSteelDark", (0.022, 0.023, 0.022), roughness=0.5, metallic=0.62)
    brass = aged_brass()
    cube("VaultRecess", (0, 2.35, 1.42), (3.1, 0.18, 2.75), ink_material("VaultRecessMat", p["ink"]))
    cube("VaultDoor", (0, 2.18, 1.42), (2.55, 0.24, 2.62), steel)
    cube("VaultDoorInset", (0, 2.04, 1.42), (2.18, 0.03, 2.24), steel_dark)
    cube("VaultDoorSeam", (0, 2.03, 1.42), (0.012, 0.012, 2.24),
         ink_material("VaultSeamMat", p["ink"]))

    # The bolts are the door's teeth: a ring of them, all proud of the steel.
    for i in range(7):
        x = -0.96 + i * 0.32
        for z in (0.32, 2.52):
            cylinder(f"VaultBoltT-{i}-{z}", (x, 2.01, z), 0.036, 0.11,
                     steel_dark, rot=(math.radians(90), 0, 0), vertices=12)
    for i in range(5):
        z = 0.62 + i * 0.44
        for x in (-1.12, 1.12):
            cylinder(f"VaultBoltS-{i}-{x}", (x, 2.01, z), 0.036, 0.11,
                     steel_dark, rot=(math.radians(90), 0, 0), vertices=12)

    # Wheel: rim, hub and four spokes, facing the lens.
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.54, minor_radius=0.055, major_segments=32, minor_segments=10,
        location=(0.0, 2.00, 1.42), rotation=(math.radians(90), 0, 0),
    )
    wheel = bpy.context.object
    wheel.name = "VaultWheel"
    assign(wheel, brass)
    cylinder("VaultHub", (0.0, 1.98, 1.42), 0.10, 0.18, brass,
             rot=(math.radians(90), 0, 0), vertices=20)
    cylinder("VaultSpokeH", (0.0, 1.99, 1.42), 0.034, 1.02, brass,
             rot=(0, math.radians(90), 0), vertices=10)
    cylinder("VaultSpokeV", (0.0, 1.99, 1.42), 0.034, 1.02, brass,
             rot=(0, 0, 0), vertices=10)

    # Hinges on the left edge.
    for i, z in enumerate((0.45, 1.42, 2.40)):
        cube(f"VaultHinge-{i}", (-1.30, 2.02, z), (0.16, 0.12, 0.34), steel_dark)
        cylinder(f"VaultHingePin-{i}", (-1.30, 1.94, z), 0.045, 0.36, brass,
                 rot=(0, 0, 0), vertices=12)

    if dressing == 1:
        # The door is cracked: a blade of warm light on the floor.
        cube("VaultLightSlit", (1.20, 2.02, 1.42), (0.028, 0.02, 2.10),
             emission("VaultSlitMat", p["sodium"], 3.2))
        cube("VaultFloorSlit", (1.10, 0.9, 0.006), (0.10, 1.6, 0.006),
             emission("VaultFloorSlitMat", p["sodium"], 1.0))
    elif dressing == 2:
        # Crates and files waiting to go back in.
        for i in range(3):
            cube(f"VaultCrate-{i}", (1.95, 1.35 - i * 0.12, 0.24 + i * 0.02),
                 (0.60, 0.44, 0.44 - i * 0.04), dark_wood(),
                 rot=(0, 0, (i - 1) * 0.05))
        for i in range(4):
            cube(f"VaultCrateFile-{i}", (1.95, 1.10, 0.50 + i * 0.018),
                 (0.44, 0.02, 0.010), paper(f"VaultCrateFileMat-{i}", p["paper"]))

    # A small steel table holds the day's file.
    cube("VaultTableTop", (-1.95, 0.55, 0.72), (0.95, 0.55, 0.06), steel_dark)
    for i, (x, y) in enumerate(((-2.35, 0.30), (-1.55, 0.30), (-2.35, 0.80), (-1.55, 0.80))):
        cube(f"VaultTableLeg-{i}", (x, y, 0.36), (0.045, 0.045, 0.72), steel_dark)
    if params.get("prop") == "seal":
        _prop_seal(p, -1.95, 0.55, 0.76)
    elif params.get("prop") == "key":
        _prop_key(p, -1.95, 0.55, 0.76)
    elif params.get("prop") == "book":
        _prop_book(p, -1.95, 0.55, 0.76)
    else:
        _prop_files(p, -1.95, 0.55, 0.76)

    bpy.ops.object.light_add(type="AREA", location=(-1.8, -1.0, 3.2))
    key = bpy.context.object
    key.data.energy = 520
    key.data.size = 1.1
    key.data.color = (1.0, 0.62, 0.30)
    key.rotation_euler = (math.radians(40), 0, math.radians(-24))
    area("VaultFill", (2.0, -1.4, 1.6), (0.0, 2.2, 1.4), 70, 2.0, (0.32, 0.44, 0.62))
    # A rim on the wheel so the brass separates from the steel.
    area("VaultRim", (1.1, 1.0, 2.5), (0.0, 1.98, 1.42), 70, 0.5, (1.0, 0.72, 0.42))
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 2.0, 1.42))
    focus = bpy.context.object
    camera((0.55, -3.5, 1.62), (0.0, 2.25, 1.42), lens=40, fstop=4.0, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.65
    dust(55, seed=29, zmax=2.9, ymax=6)
    render(samples, width, height, out)


def scene_stacks(samples, width, height, out, params):
    """A narrow aisle between two shelf walls, the far end almost black."""
    rng = random.Random(params.get("seed", 10))
    p = palette(params)
    dressing = int(params.get("dressing", 0)) % 3
    reset()
    dark_world((0.0004, 0.0004, 0.0003))

    plane("StacksFloor", (0, 2.4, 0), 12, dark_wood())
    cube("StacksCeil", (0, 2.4, 2.78), (4.6, 6.0, 0.12), ink_material("StacksCeilMat", p["ink"]))
    cube("StacksEnd", (0, 5.15, 1.35), (4.6, 0.16, 2.7), ink_material("StacksEndMat", p["ink"]))
    cube("StacksSlit", (0, 5.06, 1.55), (0.10, 0.02, 1.90),
         emission("StacksSlitMat", p["sodium"], 1.8))

    wood = dark_wood()
    for side in (-1, 1):
        x = side * 1.02
        for post in range(4):
            y = 0.5 + post * 1.35
            cube(f"StacksPost-{side}-{post}", (x, y, 1.35), (0.09, 0.10, 2.62), wood)
        for shelf in range(6):
            z = 0.28 + shelf * 0.43
            cube(f"StacksShelf-{side}-{shelf}", (x, 2.45, z), (0.10, 4.6, 0.045), wood)
            if dressing == 0:
                for i in range(9):
                    if rng.random() < 0.10:
                        continue
                    y = 0.55 + i * 0.42
                    h = 0.24 + rng.uniform(-0.02, 0.04)
                    mat = paper(f"StacksBoxMat-{side}-{shelf}-{i}",
                                scaled(p["paper"], 0.66 + (i % 3) * 0.08))
                    cube(f"StacksBox-{side}-{shelf}-{i}", (x - side * 0.02, y, z + 0.023 + h / 2),
                         (0.46, 0.30, h), mat,
                         rot=(0, 0, rng.uniform(-0.02, 0.02)))
            elif dressing == 1:
                for i in range(13):
                    if rng.random() < 0.12:
                        continue
                    y = 0.40 + i * 0.30
                    mat = paper(f"StacksFileMat-{side}-{shelf}-{i}",
                                scaled(p["paper"], 0.70 + (i % 4) * 0.05))
                    cube(f"StacksFile-{side}-{shelf}-{i}", (x - side * 0.01, y, z + 0.19),
                         (0.34, 0.024, 0.32), mat,
                         rot=(rng.uniform(-0.08, 0.08), 0, 0))
            else:
                for i in range(7):
                    y = 0.50 + i * 0.56
                    mat = paper(f"StacksLooseMat-{side}-{shelf}-{i}",
                                scaled(p["paper"], 0.62 + (i % 3) * 0.06))
                    cube(f"StacksLoose-{side}-{shelf}-{i}", (x - side * 0.05, y, z + 0.035),
                         (0.40, 0.34, 0.05), mat,
                         rot=(0, 0, rng.uniform(-0.10, 0.10)))

    # One caged bulb halfway down, and a little light at the end.
    bpy.ops.object.light_add(type="POINT", location=(0.0, 3.0, 2.28))
    bulb = bpy.context.object
    bulb.data.energy = 170
    bulb.data.color = (1.0, 0.60, 0.28)
    sphere("StacksBulb", (0.0, 3.0, 2.28), 0.055,
           emission("StacksBulbMat", p["sodium"], 5.0), segments=12, rings=8)
    cylinder("StacksCage", (0.0, 3.0, 2.28), 0.13, 0.22,
             principled("StacksCageMat", (0.02, 0.02, 0.02), roughness=0.5, metallic=0.5),
             vertices=12)

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 4.0, 1.35))
    focus = bpy.context.object
    camera((0.30, -0.80, 1.50), (0.0, 4.60, 1.30), lens=30, fstop=2.8, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.55
    area("StacksFill", (-0.8, -0.4, 2.4), (0.0, 3.2, 1.2), 55, 1.0, (0.40, 0.52, 0.72))
    area("StacksTop", (0.0, 2.4, 2.70), (0.0, 2.8, 1.2), 130, 1.4, (1.0, 0.60, 0.28))
    dust(85, seed=31, zmax=2.6, ymax=6.5)
    render(samples, width, height, out)


def scene_index(samples, width, height, out, params):
    """A wall of card drawers, one pulled open, a table of cards beneath."""
    rng = random.Random(params.get("seed", 11))
    p = palette(params)
    dressing = int(params.get("dressing", 0)) % 3
    reset()
    dark_world((0.0005, 0.0004, 0.0003))

    plane("IndexFloor", (0, 1.0, 0), 10, dark_wood())
    cube("IndexWall", (0, 2.55, 1.45), (6.2, 0.16, 2.95),
         plaster_material("IndexWallMat", scaled(p["paper"], 0.28)))
    cube("IndexCabinet", (0, 2.36, 1.42), (4.40, 0.30, 2.55), dark_wood())
    cube("IndexCabinetFace", (0, 2.20, 1.42), (4.20, 0.02, 2.40),
         ink_material("IndexFaceMat", p["ink"]))

    brass = aged_brass()
    for row in range(7):
        for col in range(10):
            x = -1.80 + col * 0.40
            z = 0.34 + row * 0.33
            cube(f"IndexDrawer-{row}-{col}", (x, 2.15, z), (0.36, 0.05, 0.29),
                 dark_wood())
            cube(f"IndexLabel-{row}-{col}", (x, 2.122, z + 0.02), (0.20, 0.004, 0.07),
                 paper(f"IndexLabelMat-{row}-{col}", p["paper"]))
            cylinder(f"IndexPull-{row}-{col}", (x, 2.10, z - 0.055), 0.020, 0.020,
                     brass, rot=(math.radians(90), 0, 0), vertices=10)
            if dressing == 1 and row == 3 and col == 6:
                # one drawer out, its cards standing up
                cube(f"IndexOpenBox-{row}-{col}", (x, 1.92, z), (0.36, 0.42, 0.26),
                     dark_wood())
                for k in range(7):
                    cube(f"IndexCard-{row}-{col}-{k}", (x - 0.12 + k * 0.04, 1.90, z + 0.02),
                         (0.004, 0.34, 0.20), paper(f"IndexCardMat-{k}", p["paper"]),
                         rot=(0, 0, rng.uniform(-0.06, 0.06)))

    cube("IndexTableTop", (0.0, 0.55, 0.72), (1.70, 0.72, 0.07), dark_wood())
    for i, (x, y) in enumerate(((-0.72, 0.30), (0.72, 0.30), (-0.72, 0.80), (0.72, 0.80))):
        cube(f"IndexTableLeg-{i}", (x, y, 0.35), (0.08, 0.08, 0.70),
             ink_material(f"IndexLegMat-{i}", p["ink"]))
    if dressing != 1:
        for k in range(9):
            x = -0.35 + (k % 3) * 0.16
            y = 0.42 + (k // 3) * 0.11
            cube(f"IndexSpread-{k}", (x, y, 0.762), (0.13, 0.08, 0.0035),
                 paper(f"IndexSpreadMat-{k}", scaled(p["paper"], 0.82 + (k % 2) * 0.08)),
                 rot=(0, 0, rng.uniform(-0.20, 0.20)))
    lamp_kit("IndexLamp", 0.66, 0.50, 0.758, p["sodium"], scale=0.55)

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 2.2, 1.35))
    focus = bpy.context.object
    camera((0.45, -3.1, 1.50), (0.0, 2.25, 1.32), lens=46, fstop=4.0, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.85
    area("IndexKey", (-1.6, -1.1, 2.8), (0.0, 2.2, 1.4), 210, 1.0, (1.0, 0.62, 0.30))
    area("IndexFill", (1.8, -1.2, 1.4), (0.0, 2.2, 1.3), 40, 1.6, (0.36, 0.48, 0.66))
    dust(35, seed=37, zmax=2.4, ymax=5)
    render(samples, width, height, out)


def scene_office(samples, width, height, out, params):
    """An administrator's office: desk, window, one chair, one lamp."""
    rng = random.Random(params.get("seed", 12))
    p = palette(params)
    dressing = int(params.get("dressing", 0)) % 3
    reset()
    dark_world((0.0005, 0.0005, 0.0004))

    plane("OfficeFloor", (0, 1.2, 0), 10, dark_wood())
    cube("OfficeBack", (0, 3.25, 1.55), (6.0, 0.16, 3.1),
         plaster_material("OfficeWallMat", scaled(p["paper"], 0.34)))
    cube("OfficeCeil", (0, 1.4, 2.95), (6.0, 4.6, 0.10), ink_material("OfficeCeilMat", p["ink"]))
    cube("OfficeSideL", (-3.0, 1.4, 1.55), (0.16, 4.6, 3.1),
         plaster_material("OfficeSideLMat", scaled(p["paper"], 0.28)))
    cube("OfficeSideR", (3.0, 1.4, 1.55), (0.16, 4.6, 3.1),
         plaster_material("OfficeSideRMat", scaled(p["paper"], 0.28)))

    window_kit("OfficeWindow", 0.0, 3.16, 1.95, 1.55, 1.35, (0.40, 0.54, 0.72))
    for i in range(9):
        cube(f"OfficeBlind-{i}", (0.0, 3.12, 1.24 + i * 0.155), (1.66, 0.02, 0.045),
             principled(f"OfficeBlindMat-{i}", scaled(p["paper"], 0.55), roughness=0.8))

    wood = dark_wood()
    cube("OfficeDeskTop", (0.0, 0.55, 0.75), (2.30, 0.95, 0.08), wood)
    for i, (x, y) in enumerate(((-1.02, 0.22), (1.02, 0.22), (-1.02, 0.88), (1.02, 0.88))):
        cube(f"OfficeDeskLeg-{i}", (x, y, 0.36), (0.09, 0.09, 0.72),
             ink_material(f"OfficeLegMat-{i}", p["ink"]))
    # A typewriter, a phone and a file: the desk is a workplace, not a still life.
    cube("OfficeTypewriter", (-0.55, 0.52, 0.86), (0.52, 0.30, 0.16),
         principled("OfficeTypewriterMat", (0.035, 0.033, 0.030), roughness=0.45, metallic=0.35))
    for row in range(4):
        for col in range(8):
            cube(f"OfficeKey-{row}-{col}", (-0.72 + col * 0.048, 0.40, 0.905 + row * 0.022),
                 (0.026, 0.020, 0.010), paper(f"OfficeKeyMat-{row}-{col}", p["paper"]))
    cube("OfficePhone", (0.62, 0.50, 0.84), (0.20, 0.26, 0.10),
         principled("OfficePhoneMat", (0.04, 0.035, 0.03), roughness=0.5))
    cylinder("OfficePhoneDial", (0.62, 0.40, 0.90), 0.055, 0.012, aged_brass(),
             rot=(math.radians(90), 0, 0), vertices=20)
    flat_sheet("OfficeBlotter", -0.05, 0.62, 0.792, 0.95, 0.55,
               paper("OfficeBlotterMat", scaled(p["paper"], 0.78)), rot=0.02)
    flat_sheet("OfficePage", 0.28, 0.60, 0.795, 0.34, 0.44,
               paper("OfficePageMat", p["paper"]), rot=-0.06)

    # Chair behind the desk, its back to the window.
    cube("OfficeChairSeat", (0.0, 1.18, 0.46), (0.52, 0.50, 0.08), wood)
    cube("OfficeChairBack", (0.0, 1.40, 0.86), (0.52, 0.08, 0.78), wood)
    for i, (x, y) in enumerate(((-0.21, 1.02), (0.21, 1.02), (-0.21, 1.36), (0.21, 1.36))):
        cube(f"OfficeChairLeg-{i}", (x, y, 0.23), (0.045, 0.045, 0.46),
             ink_material(f"OfficeChairLegMat-{i}", p["ink"]))

    cube("OfficeCabinet", (-2.35, 2.10, 0.95), (0.85, 0.55, 1.90), wood)
    for i in range(4):
        cube(f"OfficeDrawer-{i}", (-2.35, 1.80, 0.30 + i * 0.42), (0.72, 0.04, 0.34),
             dark_wood())
        cylinder(f"OfficeDrawerPull-{i}", (-2.35, 1.77, 0.28 + i * 0.42), 0.020, 0.02,
                 aged_brass(), rot=(math.radians(90), 0, 0), vertices=10)

    if dressing == 1:
        # The auditor's table: folders, a calculator, a cup.
        for i in range(5):
            cube(f"OfficeFolder-{i}", (0.34 + i * 0.02, 0.72, 0.80 + i * 0.012),
                 (0.34, 0.24, 0.012), paper(f"OfficeFolderMat-{i}",
                                            scaled(p["paper"], 0.70 + i * 0.05)),
                 rot=(0, 0, -0.04 + i * 0.02))
        cube("OfficeCalculator", (0.78, 0.80, 0.81), (0.18, 0.24, 0.035),
             principled("OfficeCalcMat", (0.05, 0.05, 0.045), roughness=0.55))
        cylinder("OfficeCup", (0.94, 0.40, 0.82), 0.045, 0.10,
                 paper("OfficeCupMat", p["paper"]), vertices=16)
    elif dressing == 2:
        # The office emptied: sheets over the furniture.
        cube("OfficeDustDesk", (0.0, 0.55, 0.82), (2.38, 1.02, 0.035),
             paper("OfficeDustMat", scaled(p["paper"], 0.66)))
        cube("OfficeDustChair", (0.0, 1.28, 0.86), (0.60, 0.60, 0.90),
             paper("OfficeDustChairMat", scaled(p["paper"], 0.58)))

    lamp_kit("OfficeLamp", 0.92, 0.68, 0.792, p["sodium"], scale=0.60)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 1.4, 1.30))
    focus = bpy.context.object
    camera((0.85, -2.85, 1.58), (0.0, 2.0, 1.30), lens=40, fstop=3.5, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.85
    area("OfficeKey", (-1.7, -0.9, 2.7), (0.0, 2.0, 1.3), 180, 1.2, (1.0, 0.64, 0.34))
    area("OfficeFill", (2.0, -1.2, 1.6), (0.0, 2.2, 1.3), 40, 2.0, (0.36, 0.50, 0.70))
    dust(40, seed=41, zmax=2.8, ymax=5.5)
    render(samples, width, height, out)


def scene_map(samples, width, height, out, params):
    """A map table: a country drawn in ruling lines, one route in red."""
    rng = random.Random(params.get("seed", 13))
    p = palette(params)
    dressing = int(params.get("dressing", 0)) % 3
    reset()
    dark_world((0.0005, 0.0004, 0.0003))

    plane("MapFloor", (0, 1.0, 0), 10, dark_wood())
    cube("MapBack", (0, 2.85, 1.50), (6.4, 0.16, 3.0),
         plaster_material("MapWallMat", scaled(p["paper"], 0.26)))
    cube("MapCeil", (0, 1.2, 2.95), (6.4, 4.4, 0.10), ink_material("MapCeilMat", p["ink"]))

    wood = dark_wood()
    cube("MapTableTop", (0.0, 0.55, 0.74), (2.65, 1.55, 0.08), wood)
    for i, (x, y) in enumerate(((-1.18, 0.10), (1.18, 0.10), (-1.18, 1.00), (1.18, 1.00))):
        cube(f"MapTableLeg-{i}", (x, y, 0.35), (0.10, 0.10, 0.70),
             ink_material(f"MapLegMat-{i}", p["ink"]))

    # The map itself: paper, a grid, a coastline of short rules, a red route.
    flat_sheet("MapSheet", 0.0, 0.55, 0.785, 2.10, 1.20,
               paper("MapPaperMat", scaled(p["paper"], 0.92)), rot=0.02)
    ink = ink_material("MapInk", p["ink"])
    for i in range(11):
        cube(f"MapGridV-{i}", (-0.95 + i * 0.19, 0.55, 0.7875),
             (0.0022, 1.14, 0.0016), ink)
    for i in range(8):
        cube(f"MapGridH-{i}", (0.0, 0.02 + i * 0.15, 0.7875),
             (2.02, 0.0022, 0.0016), ink)

    # A route across the sheet; the grid is the map's only other ink.
    route = principled("MapRouteMat", scaled(p["accent"], 1.0), roughness=0.7)
    for i in range(9):
        cube(f"MapRoute-{i}", (-0.72 + i * 0.16, 0.78 - i * 0.055, 0.7918),
             (0.16, 0.012, 0.0018), route, rot=(0, 0, -0.18))
    for i in range(6):
        cylinder(f"MapMark-{i}", (-0.62 + i * 0.23, 0.32 + (i % 3) * 0.18, 0.792),
                 0.018, 0.004, route, vertices=12)

    if dressing == 1:
        # A second map on the wall, pinned open.
        sheet("MapWallSheet", 0.0, 2.76, 1.52, 1.95, 1.15,
              paper("MapWallSheetMat", scaled(p["paper"], 0.86)), tilt=0.2, rot=0.01)
        for i in range(6):
            cube(f"MapWallRule-{i}", (0.0, 2.752, 1.08 + i * 0.15),
                 (1.65, 0.002, 0.002), ink)
        for i in range(9):
            cube(f"MapWallGrid-{i}", (-0.80 + i * 0.20, 2.750, 1.52),
                 (0.002, 0.002, 1.08), ink)
    elif dressing == 2:
        # Rolls of maps and a case of instruments.
        for i in range(4):
            cylinder(f"MapRoll-{i}", (1.02, 0.20 + i * 0.06, 0.84),
                     0.055, 0.72, paper(f"MapRollMat-{i}", scaled(p["paper"], 0.80)),
                     rot=(0, math.radians(90), 0), vertices=14)
        cube("MapCase", (-0.92, 0.84, 0.82), (0.40, 0.26, 0.05), wood)
        cylinder("MapCompass", (-0.92, 0.84, 0.86), 0.07, 0.02, aged_brass(),
                 rot=(0, 0, 0), vertices=20)

    lamp_kit("MapLamp", 1.02, 0.22, 0.782, p["sodium"], scale=0.62)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.55, 0.82))
    focus = bpy.context.object
    camera((0.55, -2.55, 2.05), (0.0, 0.55, 0.80), lens=38, fstop=3.2, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.80
    area("MapKey", (-1.2, -1.0, 2.8), (0.0, 0.8, 1.0), 190, 1.2, (1.0, 0.64, 0.34))
    area("MapFill", (1.8, -1.0, 1.8), (0.0, 1.6, 1.2), 35, 2.0, (0.36, 0.50, 0.68))
    dust(30, seed=43, zmax=2.6, ymax=5)
    render(samples, width, height, out)


def scene_stair(samples, width, height, out, params):
    """A stone stair turning up into a cold window; the handrail is iron."""
    rng = random.Random(params.get("seed", 14))
    p = palette(params)
    dressing = int(params.get("dressing", 0)) % 3
    reset()
    dark_world((0.0004, 0.0004, 0.00035))

    stone = concrete("StairStoneMat", p["paper"])
    plane("StairFloor", (0, 0.4, 0), 8, wet_stone("StairFloorMat", p["paper"]))
    cube("StairWallL", (-1.55, 2.0, 1.75), (0.30, 5.2, 3.5), stone)
    cube("StairWallR", (1.55, 2.0, 1.75), (0.30, 5.2, 3.5), stone)
    cube("StairCeil", (0, 2.0, 3.45), (3.1, 5.2, 0.12), ink_material("StairCeilMat", p["ink"]))

    for i in range(12):
        h = 0.14 + i * 0.20
        cube(f"StairStep-{i}", (0, 0.55 + i * 0.34, h / 2),
             (2.55, 0.36, h), stone)
    cube("StairLanding", (0, 4.85, 1.35), (2.55, 1.0, 0.14), stone)

    iron = principled("StairIronMat", (0.03, 0.03, 0.028), roughness=0.45, metallic=0.65)
    for i in range(6):
        y = 0.70 + i * 0.62
        z = 0.20 + i * 0.30
        cylinder(f"StairPost-{i}", (1.12, y, z + 0.45), 0.028, 0.90, iron, vertices=10)
    for i in range(5):
        y1 = 0.70 + i * 0.62
        z1 = 0.20 + i * 0.30 + 0.90
        y2 = 0.70 + (i + 1) * 0.62
        z2 = 0.20 + (i + 1) * 0.30 + 0.90
        dy = y2 - y1
        dz = z2 - z1
        cube(f"StairRail-{i}", (1.12, (y1 + y2) / 2, (z1 + z2) / 2),
             (0.045, 0.045, math.hypot(dy, dz)), iron,
             rot=(math.atan2(dy, dz), 0, 0))

    if dressing == 1:
        # Down the stair: the landing window is behind the lens, the steps fall away.
        bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 3.0, 1.0))
        focus = bpy.context.object
        camera((0.35, 4.55, 2.65), (0.0, 0.8, 0.55), lens=30, fstop=3.0, focus=focus)
    elif dressing == 2:
        # The landing door, ajar.
        cube("StairDoor", (0.0, 5.30, 1.85), (1.05, 0.10, 2.10),
             ink_material("StairDoorMat", p["ink"]))
        cube("StairDoorSlit", (0.0, 5.24, 1.85), (0.05, 0.02, 1.85),
             emission("StairDoorSlitMat", p["sodium"], 2.4))
        bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 4.8, 1.5))
        focus = bpy.context.object
        camera((0.45, -1.85, 1.25), (0.0, 4.8, 1.75), lens=34, fstop=3.2, focus=focus)
    else:
        bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 3.2, 1.5))
        focus = bpy.context.object
        camera((0.40, -2.10, 1.15), (0.0, 4.0, 2.05), lens=30, fstop=3.0, focus=focus)

    # The window at the turn is the cold source; a service lamp warms the tread.
    window_kit("StairWindow", 0.0, 5.02, 2.55, 1.05, 1.70, (0.40, 0.56, 0.78))
    area("StairWindowSpill", (0.0, 4.80, 2.55), (0.0, 2.60, 1.40), 110, 1.2, (0.42, 0.58, 0.80))
    area("StairWarm", (-1.10, 0.55, 2.20), (0.0, 1.80, 1.00), 110, 0.9, (1.0, 0.58, 0.28))
    area("StairFill", (-1.0, 1.0, 2.8), (0.0, 3.2, 1.4), 40, 1.4, (0.34, 0.46, 0.64))
    bpy.context.scene.view_settings.exposure = -0.55
    dust(60, seed=47, zmax=3.2, ymax=6)
    render(samples, width, height, out)


SCENES = {
    "wall_surface": scene_wall_surface,
    "paper_desk": scene_paper_desk,
    "room_interior": scene_room_interior,
    "corridor": scene_corridor,
    "exterior_night": scene_exterior_night,
    "gate": scene_gate,
    "plinth_object": scene_plinth_object,
    "flame_source": scene_flame_source,
    "archive": scene_archive,
    "vault": scene_vault,
    "stacks": scene_stacks,
    "index": scene_index,
    "office": scene_office,
    "map": scene_map,
    "stair": scene_stair,
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--scene", required=True, choices=sorted(SCENES))
    ap.add_argument("--out", required=True)
    ap.add_argument("--width", type=int, default=1920)
    ap.add_argument("--height", type=int, default=1080)
    ap.add_argument("--samples", type=int, default=32)
    ap.add_argument("--params", default="{}")
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    args = ap.parse_args(argv)
    if args.width % 2 or args.height % 2:
        raise SystemExit("width and height must be even")
    try:
        params = json.loads(args.params)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"--params is not JSON: {exc}")
    if not isinstance(params, dict):
        raise SystemExit("--params must be an object")
    SCENES[args.scene](args.samples, args.width, args.height, os.path.abspath(args.out), params)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

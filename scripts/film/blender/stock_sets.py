#!/usr/bin/env python3
"""Stock sets for films the authoring pass writes.

A film is still a set of real 3D rooms. What changes is who builds them. The
first three films each got a bespoke scene file; a film a week cannot. This
library is the studio backlot: eight dressed archetypes that a storyboard can
name, re-light and re-dress from data/films/<id>-sets.json.

The archetypes are deliberately object-led. They show a wall of paper, a desk,
a corridor, a gate, a flame. They never reconstruct a person being harmed, and
they carry no read-at-a-glance text: the film's titles and captions are drawn
downstream, so a plate is free to be only a surface and a light.

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
    wax = principled("FlameWax", (0.72, 0.62, 0.44), roughness=0.55)
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
    dust(count=24, seed=29, zmax=1.1, ymax=1.6)
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

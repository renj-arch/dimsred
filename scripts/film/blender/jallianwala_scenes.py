#!/usr/bin/env python3
"""Procedural 3D plates for the Jallianwala Bagh film.

The film is deliberately object-led. It never reconstructs the killing: a
notice, a wall, a stopped watch, a well, a report and a flame carry the story.
Everything is generated on a CPU-only GitHub runner with Blender 4.2 LTS.
"""

from __future__ import annotations

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
    ico,
    plane,
    principled,
    render,
    reset,
    sky,
    smooth,
    sphere,
    sun,
)


# ---------------------------------------------------------------------------
# materials and small objects
# ---------------------------------------------------------------------------

def paper_material(name="Paper", tint=(0.78, 0.68, 0.50)):
    mat = principled(name, tint, roughness=0.86)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 18.0
    noise.inputs["Detail"].default_value = 3.0
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.08
    bump.inputs["Distance"].default_value = 0.005
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def stone_material(name="Stone", tint=(0.19, 0.16, 0.12)):
    mat = principled(name, tint, roughness=0.9)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 2.2
    noise.inputs["Detail"].default_value = 5.0
    noise.inputs["Roughness"].default_value = 0.7
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.28
    ramp.color_ramp.elements[0].color = (0.08, 0.065, 0.05, 1)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (0.30, 0.25, 0.18, 1)
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.35
    bump.inputs["Distance"].default_value = 0.04
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def wall_material():
    mat = principled("WallPlaster", (0.38, 0.27, 0.16), roughness=0.94)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    coord = nodes.new("ShaderNodeTexCoord")
    vor = nodes.new("ShaderNodeTexVoronoi")
    vor.feature = "DISTANCE_TO_EDGE"
    vor.inputs["Scale"].default_value = 4.5
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.08, 0.05, 0.03, 1)
    ramp.color_ramp.elements[1].position = 0.16
    ramp.color_ramp.elements[1].color = (0.48, 0.33, 0.19, 1)
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.42
    bump.inputs["Distance"].default_value = 0.06
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 7.0
    noise.inputs["Detail"].default_value = 4.0
    links.new(coord.outputs["Object"], vor.inputs["Vector"])
    links.new(vor.outputs["Distance"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def text_obj(name, body, loc, size=0.1, rot=(0, 0, 0), mat=None, align="LEFT"):
    curve = bpy.data.curves.new(name, type="FONT")
    curve.body = body
    curve.size = size
    curve.align_x = align
    curve.align_y = "CENTER"
    curve.extrude = 0.0015
    curve.space_line = 0.92
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = rot
    if mat is not None:
        assign(obj, mat)
    return obj


def brass(name="Brass"):
    return principled(name, (0.62, 0.40, 0.12), roughness=0.27, metallic=0.82)


def dark_wood(name="DarkWood"):
    return principled(name, (0.045, 0.028, 0.018), roughness=0.62)


def clock(date_angle=195.0, minute_angle=180.0):
    metal = brass()
    face = paper_material("ClockFace", (0.82, 0.76, 0.62))
    cylinder("WatchBody", (0, 0, 0.035), 0.34, 0.065, metal, vertices=48)
    cylinder("WatchFace", (0, 0, 0.070), 0.31, 0.010, face, vertices=48)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.315, minor_radius=0.025,
        major_segments=48, minor_segments=10, location=(0, 0, 0.076)
    )
    assign(bpy.context.object, metal)
    cylinder("WatchGlass", (0, 0, 0.082), 0.30, 0.006,
             principled("WatchGlass", (0.86, 0.92, 0.94), roughness=0.05, transmission=0.86),
             vertices=48)
    # Two hands. Angle is measured clockwise from 12 o'clock.
    for name, length, angle, width in (
        ("HourHand", 0.16, date_angle, 0.014),
        ("MinuteHand", 0.245, minute_angle, 0.009),
    ):
        rad = math.radians(angle)
        cube(name, (math.sin(rad) * length / 2, math.cos(rad) * length / 2, 0.086),
             (width, length, 0.004), metal, rot=(0, 0, -rad))
    # crown and chain
    cylinder("Crown", (0, 0.37, 0.045), 0.04, 0.05, metal, rot=(math.pi / 2, 0, 0), vertices=12)
    for i in range(7):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.026, minor_radius=0.006,
            major_segments=12, minor_segments=6,
            location=(0.03 + i * 0.045, -0.42 - i * 0.02, 0.018 + (i % 2) * 0.008),
            rotation=(math.pi / 2, 0, 0.3 + i * 0.12)
        )
        assign(bpy.context.object, metal)


def flame(name="Flame", loc=(0, 0, 0.7), scale=1.0):
    mat = emission("FlameEmission", (1.0, 0.38, 0.08), 7.0)
    core = ico(name, loc, 0.10 * scale, mat, subdivisions=2)
    core.scale = (0.55, 0.55, 1.55)
    glow = sphere(name + "Glow", loc, 0.22 * scale, emission("FlameGlow", (1.0, 0.22, 0.04), 1.5),
                  segments=16, rings=10)
    glow.scale = (0.8, 0.8, 1.2)
    glow.visible_shadow = False
    return core


def pockmarks(wall_y=5.82, count=42, seed=13):
    mat = principled("Pockmark", (0.055, 0.035, 0.022), roughness=0.95)
    rng = random.Random(seed)
    for i in range(count):
        r = rng.uniform(0.015, 0.055)
        cylinder(f"pock-{i:02d}", (rng.uniform(-3.4, 3.4), wall_y, rng.uniform(0.35, 2.8)),
                 r, 0.012, mat, rot=(math.pi / 2, 0, 0), vertices=10)


# ---------------------------------------------------------------------------
# scenes
# ---------------------------------------------------------------------------

def scene_notice(samples, width, height, out):
    reset()
    dark_world((0.0005, 0.0004, 0.0003))
    wood = dark_wood()
    plane("Desk", (0, 0, 0), 7, wood)
    paper = paper_material("NoticePaper", (0.80, 0.72, 0.58))
    cube("Notice", (0, 0, 0.012), (1.65, 1.05, 0.010), paper)
    ink = principled("Ink", (0.012, 0.010, 0.008), roughness=0.35)
    text_obj("NoticeHead", "NO PUBLIC\nMEETINGS", (-0.70, 0.30, 0.025), 0.145, mat=ink)
    text_obj("NoticeRule", "BY ORDER", (-0.70, -0.10, 0.025), 0.055, mat=ink)
    text_obj("NoticeDate", "AMRITSAR · 13 APRIL 1919", (-0.70, -0.36, 0.025), 0.045, mat=ink)
    # a fountain pen and an inkpot
    cube("Pen", (0.64, -0.30, 0.045), (0.42, 0.035, 0.018), ink, rot=(0, 0, -0.28))
    cylinder("Inkpot", (1.05, 0.25, 0.09), 0.15, 0.16, ink, vertices=24)
    # brass clock at 4:30, out of focus
    metal = brass()
    cylinder("DeskClock", (-1.30, 0.36, 0.055), 0.20, 0.09, metal, vertices=32)
    cylinder("DeskClockFace", (-1.30, 0.36, 0.102), 0.17, 0.006,
             paper_material("ClockPaper", (0.80, 0.73, 0.58)), vertices=32)
    # lamp on the right: a warm practical
    cylinder("LampBase", (1.50, 0.70, 0.18), 0.24, 0.36, metal, vertices=24)
    sphere("LampShade", (1.50, 0.70, 0.52), 0.30, emission("LampWarm", (1.0, 0.50, 0.18), 1.4),
           segments=24, rings=12).scale = (1.0, 1.0, 0.55)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0.02))
    focus = bpy.context.object
    camera((0.0, -2.9, 1.80), (0, 0, 0.06), lens=50, fstop=2.4, focus=focus)
    area("Key", (-0.8, -1.0, 3.2), (0, 0, 0.1), 380, 2.6, (1.0, 0.62, 0.34))
    area("Rim", (2.2, 0.8, 2.0), (0, 0, 0.1), 220, 2.0, (0.40, 0.62, 0.85))
    render(samples, width, height, out)


def _bagh(inside=False):
    reset()
    sky((0.006, 0.020, 0.030), (0.56, 0.24, 0.08), (0.008, 0.010, 0.015))
    sun((-26, 44, 12), 1.8)
    ground = principled("BaghGround", (0.23, 0.16, 0.095), roughness=0.96)
    plane("Ground", (0, 8, 0), 70, ground)
    wall = wall_material()
    cube("Wall", (0, 6.0, 1.65), (5.2, 0.32, 3.30), wall)
    # A round-topped gate. The cylinder is applied as a boolean cut, then the
    # wall is bevelled so the opening catches the low sun.
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=48, radius=1.12, depth=1.2, location=(0, 6.0, 1.12),
        rotation=(math.pi / 2, 0, 0)
    )
    cutter = bpy.context.object
    cutter.name = "GateCutter"
    wall_obj = bpy.data.objects["Wall"]
    mod = wall_obj.modifiers.new("Gate", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    mod.solver = "EXACT"
    bpy.context.view_layer.objects.active = wall_obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)
    bevel = wall_obj.modifiers.new("SoftEdges", "BEVEL")
    bevel.width = 0.035
    bevel.segments = 3
    # dark space behind the opening
    cube("Beyond", (0, 6.8, 1.2), (2.6, 0.05, 2.4), principled("BeyondBlack", (0.004, 0.004, 0.004), 0.9))
    # coping stones
    stone = stone_material()
    cube("Coping", (0, 6.0, 3.36), (5.35, 0.44, 0.12), stone)
    pockmarks(count=46)
    # A tree on the far side: a silhouette, not a botanical model.
    trunk = principled("TreeTrunk", (0.035, 0.022, 0.014), roughness=0.9)
    leaf = principled("Leaves", (0.020, 0.030, 0.016), roughness=0.85)
    cylinder("Trunk", (-4.9, 7.2, 1.8), 0.16, 3.6, trunk, rot=(0, -0.12, 0), vertices=9)
    for i in range(7):
        x = -4.9 + (i - 3) * 0.54
        z = 3.2 + (i % 3) * 0.42
        s = 0.9 + (i % 4) * 0.18
        ico(f"Canopy-{i}", (x, 7.1 + (i % 2) * 0.35, z), s, leaf, subdivisions=2)
    # a single cloth at the threshold
    cloth = principled("Cloth", (0.78, 0.73, 0.62), roughness=0.9)
    cube("Cloth", (0.32, 5.45, 0.018), (0.20, 0.13, 0.006), cloth, rot=(0, 0.12, 0.18))
    dust(100, seed=1919, zmax=3.2, ymax=14)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 6.0, 1.25))
    focus = bpy.context.object
    if inside:
        camera((0, 2.5, 1.05), (0, 6.0, 1.25), lens=38, fstop=4.0, focus=focus)
    else:
        camera((0.2, -4.6, 0.72), (0, 6.0, 1.55), lens=28, fstop=3.6, focus=focus)
    area("LowSun", (-9, 3, 4.2), (0, 6, 1.5), 1100, 5.0, (1.0, 0.48, 0.18))
    area("CoolFill", (8, 0, 5.0), (0, 6, 1.2), 420, 7.0, (0.34, 0.55, 0.75))


def scene_bagh_wall(samples, width, height, out):
    _bagh(False)
    render(samples, width, height, out)


def scene_bagh_gate(samples, width, height, out):
    _bagh(True)
    render(samples, width, height, out)


def scene_watch(samples, width, height, out):
    reset()
    dark_world((0.0004, 0.0003, 0.0002))
    floor = principled("DustFloor", (0.19, 0.14, 0.09), roughness=0.92)
    plane("Floor", (0, 0, 0), 7, floor)
    clock()
    dust(70, seed=515, zmax=0.5, ymax=2.0)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0.07))
    focus = bpy.context.object
    camera((0.64, -1.48, 0.78), (0, 0, 0.07), lens=65, fstop=1.9, focus=focus)
    area("Key", (-0.9, -1.1, 1.7), (0, 0, 0.07), 240, 1.0, (1.0, 0.52, 0.24))
    area("Rim", (1.0, 0.9, 1.1), (0, 0, 0.06), 150, 0.8, (0.42, 0.68, 1.0))
    area("Fill", (0, -1.6, 0.3), (0, 0, 0.06), 30, 1.8, (0.55, 0.55, 0.62))
    render(samples, width, height, out)


def scene_well(samples, width, height, out):
    reset()
    sky((0.008, 0.020, 0.028), (0.48, 0.28, 0.13), (0.006, 0.006, 0.008))
    ground = principled("WellGround", (0.21, 0.15, 0.10), roughness=0.95)
    plane("Ground", (0, 5, 0), 40, ground)
    stone = stone_material()
    # circular rim
    bpy.ops.mesh.primitive_torus_add(
        major_radius=1.85, minor_radius=0.30,
        major_segments=64, minor_segments=16, location=(0, 3.0, 0.34)
    )
    assign(bpy.context.object, stone)
    # blocks around the rim
    for i in range(22):
        a = (i / 22.0) * math.tau
        cube(f"RimBlock-{i:02d}", (math.sin(a) * 2.05, 3.0 + math.cos(a) * 2.05, 0.30),
             (0.22, 0.34, 0.24), stone, rot=(0, 0, -a))
    water = principled("WellWater", (0.006, 0.012, 0.013), roughness=0.045, metallic=0.4)
    cylinder("Water", (0, 3.0, 0.20), 1.62, 0.02, water, vertices=64)
    # a white cloth on the rim
    cloth = principled("WellCloth", (0.75, 0.70, 0.58), roughness=0.9)
    cube("WellCloth", (0.76, 4.50, 0.67), (0.26, 0.18, 0.012), cloth, rot=(0, 0.18, 0.4))
    # background wall
    cube("BackWall", (0, 7.2, 1.4), (5.0, 0.20, 2.8), wall_material())
    trunk = principled("Trunk", (0.035, 0.022, 0.014), roughness=0.9)
    leaf = principled("Leaf", (0.020, 0.028, 0.016), roughness=0.85)
    cylinder("Tree", (-4.4, 7.6, 1.8), 0.14, 4.0, trunk, vertices=9)
    for i in range(6):
        ico(f"Leaf-{i}", (-4.4 + (i - 2.5) * 0.55, 7.5, 3.2 + (i % 3) * 0.45),
            0.8 + (i % 3) * 0.2, leaf, subdivisions=2)
    dust(90, seed=313, zmax=3.0, ymax=10)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 3.0, 0.25))
    focus = bpy.context.object
    camera((0.2, -4.4, 4.3), (0, 3.0, 0.25), lens=42, fstop=4.0, focus=focus)
    area("Sky", (-5, -2, 7), (0, 3, 0.4), 540, 8.0, (0.42, 0.58, 0.82))
    area("Warm", (6, 6, 3.5), (0, 3, 0.4), 300, 4.0, (1.0, 0.48, 0.20))
    render(samples, width, height, out)


def scene_report(samples, width, height, out):
    reset()
    dark_world((0.0005, 0.0004, 0.0003))
    plane("Desk", (0, 0, 0), 7, dark_wood())
    paper = paper_material("ReportPaper", (0.80, 0.73, 0.58))
    cube("Report", (0, 0, 0.012), (1.85, 1.20, 0.010), paper)
    ink = principled("ReportInk", (0.025, 0.020, 0.015), roughness=0.65)
    red = principled("StampRed", (0.36, 0.035, 0.020), roughness=0.8)
    text_obj("ReportHead", "HUNTER COMMISSION", (-0.80, 0.46, 0.026), 0.105, mat=ink)
    text_obj("ReportSub", "DISORDERS INQUIRY · 1919–1920", (-0.80, 0.32, 0.026), 0.045, mat=ink)
    text_obj("ReportDead", "379 DEAD", (-0.80, 0.08, 0.026), 0.155, mat=ink)
    text_obj("ReportWounded", "1,200 WOUNDED", (-0.80, -0.14, 0.026), 0.095, mat=ink)
    text_obj("ReportNote", "THE OFFICIAL FIGURES", (-0.80, -0.31, 0.026), 0.042, mat=ink)
    text_obj("Stamp", "NO PROSECUTION", (0.42, -0.44, 0.030), 0.070, mat=red, align="CENTER")
    cube("StampFrame", (0.42, -0.44, 0.024), (0.40, 0.10, 0.002), red, rot=(0, 0, -0.12))
    # lamp and a small stack of papers
    metal = brass()
    cylinder("LampBase", (1.55, 0.42, 0.16), 0.24, 0.32, metal, vertices=24)
    sphere("LampShade", (1.55, 0.42, 0.48), 0.28, emission("ReportLamp", (1.0, 0.52, 0.22), 1.3),
           segments=24, rings=12).scale = (1.0, 1.0, 0.55)
    for i in range(3):
        cube(f"Stack-{i}", (-1.30 + i * 0.02, -0.55 + i * 0.025, 0.022 + i * 0.014),
             (0.32, 0.24, 0.008), paper)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0.02))
    focus = bpy.context.object
    camera((0.0, -1.65, 2.35), (0, 0, 0.02), lens=52, fstop=2.8, focus=focus)
    area("Key", (-0.6, -1.0, 3.0), (0, 0, 0.05), 460, 2.4, (1.0, 0.66, 0.38))
    area("Rim", (1.8, 0.8, 1.8), (0, 0, 0.05), 180, 2.0, (0.42, 0.60, 0.82))
    render(samples, width, height, out)


def scene_lamp(samples, width, height, out):
    reset()
    dark_world((0.0006, 0.0004, 0.0003))
    plane("Table", (0, 0, 0), 6, dark_wood())
    metal = brass()
    cylinder("LampBase", (0, 0, 0.13), 0.30, 0.26, metal, vertices=32)
    cylinder("LampStem", (0, 0, 0.35), 0.08, 0.22, metal, vertices=16)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.26, location=(0, 0, 0.53))
    bowl = bpy.context.object
    bowl.name = "LampBowl"
    bowl.scale = (1.0, 1.0, 0.70)
    assign(bowl, metal)
    smooth(bowl)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.23, minor_radius=0.022,
        major_segments=32, minor_segments=8, location=(0, 0, 0.64)
    )
    assign(bpy.context.object, metal)
    flame(loc=(0, 0, 0.82), scale=1.0)
    # a letter and a pen
    paper = paper_material("LetterPaper", (0.78, 0.70, 0.55))
    cube("Letter", (0.72, -0.30, 0.012), (0.46, 0.30, 0.008), paper, rot=(0, 0, 0.16))
    cube("Pen", (0.58, 0.18, 0.036), (0.30, 0.025, 0.014), principled("PenInk", (0.01, 0.008, 0.006), 0.35),
         rot=(0, 0, 0.5))
    dust(45, seed=77, zmax=1.4, ymax=2.0)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0.65))
    focus = bpy.context.object
    camera((0.90, -1.75, 0.88), (0, 0, 0.62), lens=50, fstop=2.0, focus=focus)
    area("WarmKey", (0.8, -0.8, 1.6), (0, 0, 0.55), 120, 0.9, (1.0, 0.48, 0.18))
    area("CoolRim", (-1.0, 0.9, 1.1), (0, 0, 0.55), 90, 0.8, (0.38, 0.62, 0.92))
    render(samples, width, height, out)


def scene_memorial(samples, width, height, out):
    reset()
    dark_world((0.0005, 0.0004, 0.0004))
    plane("Floor", (0, 0, 0), 8, stone_material("FloorStone", (0.055, 0.050, 0.045)))
    stone = stone_material("MemorialStone", (0.12, 0.10, 0.08))
    cube("Plinth", (0, 0, 0.45), (1.05, 0.58, 0.90), stone)
    cube("Step", (0, 0, 0.10), (1.45, 0.85, 0.20), stone)
    gold = principled("MemorialGold", (0.54, 0.35, 0.10), roughness=0.38, metallic=0.75)
    text_obj("Year", "1919", (0, -0.300, 0.46), 0.30,
             rot=(math.pi / 2, 0, 0), mat=gold, align="CENTER")
    flame(loc=(0, 0, 1.28), scale=1.35)
    # light shaft from above
    bpy.ops.object.light_add(type="SPOT", location=(0, -1.5, 5.0))
    spot = bpy.context.object
    spot.data.energy = 1200
    spot.data.angle = math.radians(28)
    spot.data.color = (1.0, 0.70, 0.42)
    spot.rotation_euler = (math.radians(18), 0, 0)
    dust(60, seed=919, zmax=2.2, ymax=3.0)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0.85))
    focus = bpy.context.object
    camera((0.0, -3.2, 1.05), (0, 0, 0.85), lens=68, fstop=2.4, focus=focus)
    render(samples, width, height, out)


SCENES = {
    "notice": scene_notice,
    "bagh-wall": scene_bagh_wall,
    "bagh-gate": scene_bagh_gate,
    "watch": scene_watch,
    "well": scene_well,
    "report": scene_report,
    "lamp": scene_lamp,
    "memorial": scene_memorial,
}


def main() -> int:
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--scene", required=True, choices=sorted(SCENES))
    ap.add_argument("--out", required=True)
    ap.add_argument("--width", type=int, default=1920)
    ap.add_argument("--height", type=int, default=1080)
    ap.add_argument("--samples", type=int, default=32)
    args = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    if args.width % 2 or args.height % 2:
        raise SystemExit("width and height must be even")
    SCENES[args.scene](args.samples, args.width, args.height, os.path.abspath(args.out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

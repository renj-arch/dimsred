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


def brass(name="Brass", tint=(0.62, 0.40, 0.12), roughness=0.27, metallic=0.82):
    return principled(name, tint, roughness=roughness, metallic=metallic)


def aged_brass(name="AgedBrass"):
    mat = principled(name, (0.20, 0.115, 0.045), roughness=0.46, metallic=0.78)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    coord = nodes.new("ShaderNodeTexCoord")
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 34.0
    noise.inputs["Detail"].default_value = 5.0
    links.new(coord.outputs["Generated"], noise.inputs["Vector"])
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.25
    ramp.color_ramp.elements[0].color = (0.055, 0.030, 0.012, 1)
    ramp.color_ramp.elements[1].position = 0.78
    ramp.color_ramp.elements[1].color = (0.29, 0.17, 0.065, 1)
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.22
    bump.inputs["Distance"].default_value = 0.003
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat



def dark_wood(name="DarkWood"):
    return principled(name, (0.045, 0.028, 0.018), roughness=0.62)


def clock(date_angle=195.0, minute_angle=180.0):
    metal = aged_brass()
    face = paper_material("ClockFace", (0.39, 0.32, 0.22))
    ink = principled("ClockInk", (0.028, 0.020, 0.014), roughness=0.68)
    cylinder("WatchBody", (0, 0, 0.035), 0.34, 0.065, metal, vertices=64)
    cylinder("WatchFace", (0, 0, 0.069), 0.302, 0.008, face, vertices=64)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.292, minor_radius=0.006,
        major_segments=64, minor_segments=8, location=(0, 0, 0.076)
    )
    assign(bpy.context.object, ink)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.318, minor_radius=0.026,
        major_segments=64, minor_segments=12, location=(0, 0, 0.077)
    )
    assign(bpy.context.object, metal)
    # A real dial: twelve raised hour blocks, four numerals, and a minute
    # chapter ring. Tiny geometry, but it stops the watch reading as a toy.
    for i in range(12):
        a = math.radians(i * 30.0)
        r = 0.245
        cube(
            f"HourTick-{i:02d}",
            (math.sin(a) * r, math.cos(a) * r, 0.078),
            (0.016 if i % 3 else 0.022, 0.038 if i % 3 else 0.050, 0.0024),
            ink,
            rot=(0, 0, -a)
        )
    for label, angle, r in (("XII", 0, 0.175), ("III", 90, 0.178),
                            ("VI", 180, 0.178), ("IX", 270, 0.178)):
        a = math.radians(angle)
        text_obj(label, label, (math.sin(a) * r, math.cos(a) * r, 0.079),
                 0.030, mat=ink, align="CENTER")
    # Two hands. Angle is measured clockwise from 12 o'clock.
    for name, length, angle, width in (
        ("HourHand", 0.16, date_angle, 0.014),
        ("MinuteHand", 0.245, minute_angle, 0.009),
    ):
        rad = math.radians(angle)
        cube(name, (math.sin(rad) * length / 2, math.cos(rad) * length / 2, 0.084),
             (width, length, 0.004), ink, rot=(0, 0, -rad))
    cylinder("CenterPin", (0, 0, 0.087), 0.017, 0.008, metal, vertices=20)
    # Scratches on the crystal: thin, irregular, only visible in the light.
    for i, (length, angle, r) in enumerate(((0.10, 12, 0.16), (0.06, 47, 0.21),
                                            (0.08, 79, 0.10), (0.05, 123, 0.23))):
        a = math.radians(angle)
        cube(f"Scratch-{i}", (math.sin(a) * r, math.cos(a) * r, 0.078),
             (0.002, length, 0.001), principled(f"ScratchInk-{i}", (0.55, 0.48, 0.38), 0.6),
             rot=(0, 0, -a))
    # crown and chain
    cylinder("Crown", (0, 0.37, 0.045), 0.04, 0.05, metal, rot=(math.pi / 2, 0, 0), vertices=16)
    for i in range(7):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.026, minor_radius=0.006,
            major_segments=16, minor_segments=8,
            location=(0.03 + i * 0.045, -0.42 - i * 0.02, 0.018 + (i % 2) * 0.008),
            rotation=(math.pi / 2, 0, 0.3 + i * 0.12)
        )
        assign(bpy.context.object, metal)


def flame(name="Flame", loc=(0, 0, 0.7), scale=1.0):
    outer_mat = emission("FlameOuter", (1.0, 0.30, 0.045), 2.4)
    inner_mat = emission("FlameInner", (1.0, 0.70, 0.24), 5.2)
    bpy.ops.mesh.primitive_cone_add(
        vertices=16, radius1=0.072 * scale, radius2=0.0,
        depth=0.24 * scale,
        location=(loc[0], loc[1], loc[2] + 0.12 * scale)
    )
    outer = bpy.context.object
    outer.name = name
    smooth(outer)
    assign(outer, outer_mat)
    core = sphere(name + "Core", (loc[0], loc[1], loc[2] + 0.045 * scale),
                  0.046 * scale, inner_mat, segments=16, rings=12)
    core.scale = (0.78, 0.78, 1.35)
    glow = sphere(name + "Glow", (loc[0], loc[1], loc[2] + 0.10 * scale),
                  0.10 * scale, emission("FlameGlow", (1.0, 0.20, 0.035), 0.55),
                  segments=16, rings=10)
    glow.scale = (0.9, 0.9, 1.3)
    glow.visible_shadow = False
    bpy.ops.object.light_add(type="POINT", location=(loc[0], loc[1], loc[2] + 0.12 * scale))
    lamp = bpy.context.object
    lamp.data.energy = 3.5 * scale
    lamp.data.color = (1.0, 0.42, 0.12)
    lamp.data.shadow_soft_size = 0.05
    return outer


def pockmarks(wall_y=5.82, count=42, seed=13):
    mat = principled("Pockmark", (0.055, 0.035, 0.022), roughness=0.95)
    rng = random.Random(seed)
    for i in range(count):
        x = rng.uniform(-3.4, 3.4)
        z = rng.uniform(0.35, 2.8)
        if abs(x) < 0.84 and z < 2.9:
            continue
        r = rng.uniform(0.015, 0.055)
        cylinder(f"pock-{i:02d}", (x, wall_y, z),
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
    bpy.context.scene.view_settings.exposure = -0.35
    area("Key", (-0.8, -1.0, 3.2), (0, 0, 0.1), 320, 2.6, (1.0, 0.62, 0.34))
    area("Rim", (2.2, 0.8, 2.0), (0, 0, 0.1), 190, 2.0, (0.40, 0.62, 0.85))
    render(samples, width, height, out)


def _bagh(inside=False):
    reset()
    sky((0.006, 0.020, 0.030), (0.56, 0.24, 0.08), (0.008, 0.010, 0.015))
    sun((-26, 44, 12), 1.8)
    ground = principled("BaghGround", (0.23, 0.16, 0.095), roughness=0.96)
    plane("Ground", (0, 8, 0), 70, ground)
    wall = wall_material()
    cube("Wall", (0, 6.0, 1.60), (7.0, 0.36, 3.20), wall)
    wall_obj = bpy.data.objects["Wall"]
    # A narrow arched entrance, not a round porthole. Cut the rectangular
    # opening first, then add the semicircular head with a second boolean.
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 6.0, 1.05))
    cutter = bpy.context.object
    cutter.name = "GateCutterRect"
    cutter.scale = (1.55, 1.20, 2.10)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod = wall_obj.modifiers.new("GateRect", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    mod.solver = "EXACT"
    bpy.context.view_layer.objects.active = wall_obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=48, radius=0.775, depth=1.20, location=(0, 6.0, 2.10),
        rotation=(math.pi / 2, 0, 0)
    )
    cutter = bpy.context.object
    cutter.name = "GateCutterArch"
    mod = wall_obj.modifiers.new("GateArch", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    mod.solver = "EXACT"
    bpy.context.view_layer.objects.active = wall_obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)
    bevel = wall_obj.modifiers.new("SoftEdges", "BEVEL")
    bevel.width = 0.030
    bevel.segments = 3
    # Stone surround: two jambs, voussoirs around the arch, and a threshold.
    gate_stone = stone_material("GateStone", (0.25, 0.21, 0.16))
    for side in (-1, 1):
        cube(f"GateJamb-{side}", (side * 0.86, 5.80, 1.03),
             (0.20, 0.40, 2.08), gate_stone)
    for i in range(9):
        a = (i / 8.0) * math.pi
        cube(f"Voussoir-{i}", (math.cos(a) * 0.86, 5.80, 2.10 + math.sin(a) * 0.86),
             (0.20, 0.40, 0.18), gate_stone, rot=(0, -a, 0))
    cube("Threshold", (0, 5.64, 0.055), (1.95, 0.62, 0.11), gate_stone)
    # One dark timber door stands ajar, so the entrance has a human scale.
    cube("GateDoor", (-0.38, 6.02, 1.04), (0.70, 0.055, 1.86), dark_wood(),
         rot=(0, 0, 0.22))
    for z in (0.55, 1.42):
        cube(f"DoorStrap-{z}", (-0.40, 5.985, z), (0.62, 0.010, 0.035),
             principled(f"Iron-{z}", (0.020, 0.018, 0.016), roughness=0.78, metallic=0.55),
             rot=(0, 0, 0.22))
    # dark space well behind the opening
    cube("Beyond", (0, 12.5, 1.5), (12.0, 0.05, 6.0),
         principled("BeyondBlack", (0.004, 0.004, 0.004), roughness=0.95))
    # coping stones
    stone = stone_material()
    cube("Coping", (0, 6.0, 3.26), (7.25, 0.48, 0.14), stone)
    pockmarks(count=62)
    # A tree on the far side: a silhouette, not a botanical model.
    trunk = principled("TreeTrunk", (0.035, 0.022, 0.014), roughness=0.9)
    leaf = principled("Leaves", (0.020, 0.030, 0.016), roughness=0.85)
    cylinder("Trunk", (-3.9, 7.2, 1.8), 0.16, 3.6, trunk, rot=(0, -0.12, 0), vertices=9)
    for i in range(7):
        x = -3.9 + (i - 3) * 0.54
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
        camera((0, 2.8, 1.10), (0, 6.0, 1.35), lens=48, fstop=4.0, focus=focus)
    else:
        camera((0.18, -3.8, 0.80), (0, 6.0, 1.48), lens=38, fstop=4.2, focus=focus)
    area("LowSun", (-9, 3, 4.2), (0, 6, 1.5), 1300, 5.0, (1.0, 0.48, 0.18))
    area("CoolFill", (8, 0, 5.0), (0, 6, 1.2), 500, 7.0, (0.34, 0.55, 0.75))


def scene_bagh_wall(samples, width, height, out):
    _bagh(False)
    render(samples, width, height, out)


def scene_bagh_gate(samples, width, height, out):
    _bagh(True)
    render(samples, width, height, out)


def scene_watch(samples, width, height, out):
    reset()
    dark_world((0.0004, 0.0003, 0.0002))
    floor = principled("DustFloor", (0.145, 0.095, 0.055), roughness=0.94)
    plane("Floor", (0, 0, 0), 7, floor)
    clock()
    dust(55, seed=515, zmax=0.38, ymax=1.8)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0.055))
    focus = bpy.context.object
    camera((0.54, -1.32, 0.70), (0, 0, 0.045), lens=62, fstop=2.2, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.85
    area("Key", (-0.9, -1.1, 1.7), (0, 0, 0.07), 125, 0.9, (1.0, 0.52, 0.24))
    area("Rim", (1.0, 0.9, 1.1), (0, 0, 0.06), 80, 0.7, (0.42, 0.68, 1.0))
    area("Fill", (0, -1.6, 0.3), (0, 0, 0.06), 12, 1.6, (0.55, 0.55, 0.62))
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
    water = principled("WellWater", (0.004, 0.010, 0.012), roughness=0.075, metallic=0.22)
    cylinder("Water", (0, 3.0, 0.20), 1.62, 0.02, water, vertices=64)
    # a white cloth on the rim
    cloth = principled("WellCloth", (0.62, 0.56, 0.44), roughness=0.94)
    cube("WellCloth", (0.76, 4.50, 0.67), (0.26, 0.18, 0.012), cloth, rot=(0, 0.18, 0.4))
    # background wall, wide enough to fill the frame
    cube("BackWall", (0, 8.6, 2.25), (12.0, 0.24, 4.50), wall_material())
    trunk = principled("Trunk", (0.035, 0.022, 0.014), roughness=0.9)
    leaf = principled("Leaf", (0.020, 0.028, 0.016), roughness=0.85)
    cylinder("Tree", (-5.8, 8.2, 2.4), 0.16, 5.0, trunk, vertices=9)
    for i in range(7):
        ico(f"Leaf-{i}", (-5.8 + (i - 3) * 0.58, 8.1, 4.2 + (i % 3) * 0.50),
            0.9 + (i % 3) * 0.22, leaf, subdivisions=2)
    dust(90, seed=313, zmax=3.4, ymax=11)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 3.0, 0.25))
    focus = bpy.context.object
    camera((0.2, -4.4, 4.3), (0, 3.0, 0.25), lens=42, fstop=4.0, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.45
    area("Sky", (-5, -2, 7), (0, 3, 0.4), 480, 8.0, (0.42, 0.58, 0.82))
    area("Warm", (6, 6, 3.5), (0, 3, 0.4), 260, 4.0, (1.0, 0.48, 0.20))
    render(samples, width, height, out)


def scene_report(samples, width, height, out):
    reset()
    dark_world((0.0005, 0.0004, 0.0003))
    plane("Desk", (0, 0, 0), 7, dark_wood())
    paper = paper_material("ReportPaper", (0.68, 0.60, 0.46))
    cube("Report", (0, 0, 0.012), (2.15, 1.42, 0.010), paper)
    ink = principled("ReportInk", (0.025, 0.020, 0.015), roughness=0.65)
    red = principled("StampRed", (0.36, 0.035, 0.020), roughness=0.8)
    text_obj("ReportHead", "HUNTER COMMISSION", (-1.00, 0.55, 0.026), 0.105, mat=ink)
    text_obj("ReportSub", "DISORDERS INQUIRY · 1919–1920", (-1.00, 0.40, 0.026), 0.045, mat=ink)
    text_obj("ReportDead", "379 DEAD", (-1.00, 0.14, 0.026), 0.160, mat=ink)
    text_obj("ReportWounded", "1,200 WOUNDED", (-1.00, -0.10, 0.026), 0.100, mat=ink)
    text_obj("ReportNote", "THE OFFICIAL FIGURES", (-1.00, -0.29, 0.026), 0.042, mat=ink)
    text_obj("Stamp", "NO PROSECUTION", (0.45, -0.49, 0.031), 0.063, mat=red, align="CENTER")
    cube("StampFrame", (0.45, -0.49, 0.024), (0.96, 0.15, 0.002), red, rot=(0, 0, -0.10))
    # lamp and a small stack of papers
    metal = aged_brass()
    cylinder("LampBase", (1.65, 0.42, 0.16), 0.24, 0.32, metal, vertices=24)
    sphere("LampShade", (1.65, 0.42, 0.48), 0.28, emission("ReportLamp", (1.0, 0.52, 0.22), 1.3),
           segments=24, rings=12).scale = (1.0, 1.0, 0.55)
    for i in range(3):
        cube(f"Stack-{i}", (-1.38 + i * 0.02, -0.62 + i * 0.025, 0.022 + i * 0.014),
             (0.32, 0.24, 0.008), paper)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0.02))
    focus = bpy.context.object
    camera((0.0, -2.1, 3.05), (0, 0, 0.02), lens=48, fstop=3.2, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.45
    area("Key", (-0.6, -1.0, 3.0), (0, 0, 0.05), 360, 2.4, (1.0, 0.66, 0.38))
    area("Rim", (1.8, 0.8, 1.8), (0, 0, 0.05), 150, 2.0, (0.42, 0.60, 0.82))
    render(samples, width, height, out)


def scene_lamp(samples, width, height, out):
    reset()
    dark_world((0.0006, 0.0004, 0.0003))
    plane("Table", (0, 0, 0), 6, dark_wood())
    metal = aged_brass()
    cylinder("LampBase", (0, 0, 0.12), 0.30, 0.24, metal, vertices=32)
    cylinder("LampStem", (0, 0, 0.33), 0.075, 0.20, metal, vertices=16)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.25, location=(0, 0, 0.51))
    bowl = bpy.context.object
    bowl.name = "LampBowl"
    bowl.scale = (1.0, 1.0, 0.64)
    assign(bowl, metal)
    smooth(bowl)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.225, minor_radius=0.020,
        major_segments=32, minor_segments=8, location=(0, 0, 0.62)
    )
    assign(bpy.context.object, metal)
    cylinder("Wick", (0, 0, 0.69), 0.022, 0.10,
             principled("WickChar", (0.020, 0.014, 0.010), roughness=0.95), vertices=12)
    flame(loc=(0, 0, 0.73), scale=0.72)
    # a letter and a pen
    paper = paper_material("LetterPaper", (0.62, 0.54, 0.40))
    cube("Letter", (0.58, -0.32, 0.012), (0.48, 0.32, 0.008), paper, rot=(0, 0, 0.16))
    letter_ink = principled("LetterInk", (0.030, 0.022, 0.016), roughness=0.72)
    text_obj("LetterLine1", "I renounce", (0.39, -0.31, 0.021), 0.026, mat=letter_ink,
             align="LEFT")
    text_obj("LetterLine2", "my knighthood", (0.39, -0.36, 0.021), 0.026, mat=letter_ink,
             align="LEFT")
    cube("Pen", (0.58, 0.18, 0.036), (0.30, 0.025, 0.014),
         principled("PenInk", (0.01, 0.008, 0.006), roughness=0.35), rot=(0, 0, 0.5))
    dust(45, seed=77, zmax=1.4, ymax=2.0)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0.62))
    focus = bpy.context.object
    camera((0.95, -2.05, 0.95), (0, 0, 0.58), lens=55, fstop=2.2, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.85
    area("WarmKey", (0.8, -0.8, 1.6), (0, 0, 0.55), 110, 0.9, (1.0, 0.48, 0.18))
    area("CoolRim", (-1.0, 0.9, 1.1), (0, 0, 0.55), 75, 0.8, (0.38, 0.62, 0.92))
    render(samples, width, height, out)


def scene_memorial(samples, width, height, out):
    reset()
    dark_world((0.0005, 0.0004, 0.0004))
    plane("Floor", (0, 0, 0), 8, stone_material("FloorStone", (0.050, 0.046, 0.042)))
    stone = stone_material("MemorialStone", (0.095, 0.085, 0.075))
    # A low memorial wall carries the name and date; the flame sits in front
    # of it, so the frame is an object study rather than a blocky statue.
    cube("MemorialWall", (0, 1.00, 1.05), (2.80, 0.35, 2.10), stone)
    cube("Plinth", (0, 0, 0.34), (0.82, 0.54, 0.68), stone)
    cube("Step", (0, 0, 0.09), (1.25, 0.78, 0.18), stone)
    gold = principled("MemorialGold", (0.54, 0.35, 0.10), roughness=0.38, metallic=0.75)
    text_obj("MemorialTitle", "JALLIANWALA BAGH", (0, 0.815, 1.72), 0.105,
             rot=(math.pi / 2, 0, 0), mat=gold, align="CENTER")
    text_obj("Year", "1919", (0, 0.812, 1.38), 0.30,
             rot=(math.pi / 2, 0, 0), mat=gold, align="CENTER")
    # bronze bowl and flame
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.22,
                                         location=(0, 0, 0.84))
    bowl = bpy.context.object
    bowl.name = "MemorialBowl"
    bowl.scale = (1.0, 1.0, 0.44)
    assign(bowl, aged_brass("MemorialBronze"))
    smooth(bowl)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.20, minor_radius=0.018,
        major_segments=32, minor_segments=8, location=(0, 0, 0.90)
    )
    assign(bpy.context.object, aged_brass("MemorialBronzeRim"))
    flame(loc=(0, 0, 0.98), scale=0.58)
    # light shaft from above
    bpy.ops.object.light_add(type="SPOT", location=(0, -1.0, 5.2))
    spot = bpy.context.object
    spot.data.energy = 900
    spot.data.spot_size = math.radians(30)
    spot.data.color = (1.0, 0.70, 0.42)
    spot.rotation_euler = (math.radians(15), 0, 0)
    area("Rim", (2.4, 1.8, 2.4), (0, 0.5, 1.0), 130, 2.0, (0.42, 0.60, 0.82))
    dust(60, seed=919, zmax=2.2, ymax=3.0)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0.98))
    focus = bpy.context.object
    camera((0.0, -4.0, 1.25), (0, 0, 1.00), lens=45, fstop=2.8, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.45
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

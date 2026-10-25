#!/usr/bin/env python3
"""Procedural 3D plates for the Bhopal film.

The film is object-led. It never reconstructs the dead or the dying: a tank, a
gauge, a flare, a courtroom ledger, a tap and a memorial carry the argument.
Everything is generated on a CPU-only GitHub runner with Blender 4.2 LTS.

The palette is midnight industrial: sodium orange, cold cyan, wet concrete,
oxidised steel and paper. The camera stays close to objects, never at the scale
of spectacle.
"""

from __future__ import annotations

import argparse
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
    reset,
    sky,
    smooth,
    sphere,
    sun,
)
from jallianwala_scenes import (  # noqa: E402
    aged_brass,
    dark_wood,
    flame,
    flat_shape,
    limb,
    paper_material,
    plaster_material,
    render,
    set_input,
    stone_material,
    text_obj,
)


# ---------------------------------------------------------------------------
# materials and shared industrial kit
# ---------------------------------------------------------------------------

def grime(name, tint, roughness=0.84, metallic=0.0, scale=7.0):
    """A painted or oxidised surface with broad dirt and a fine tooth."""
    mat = principled(name, tint, roughness=roughness, metallic=metallic)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    coord = nodes.new("ShaderNodeTexCoord")
    broad = nodes.new("ShaderNodeTexNoise")
    broad.inputs["Scale"].default_value = scale
    broad.inputs["Detail"].default_value = 4.0
    broad.inputs["Roughness"].default_value = 0.72
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.22
    ramp.color_ramp.elements[0].color = (tint[0] * 0.30, tint[1] * 0.28, tint[2] * 0.24, 1)
    ramp.color_ramp.elements[1].position = 0.82
    ramp.color_ramp.elements[1].color = (min(1.0, tint[0] * 1.35),
                                         min(1.0, tint[1] * 1.25),
                                         min(1.0, tint[2] * 1.18), 1)
    fine = nodes.new("ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = scale * 9.0
    fine.inputs["Detail"].default_value = 6.0
    fine.inputs["Roughness"].default_value = 0.82
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.20
    bump.inputs["Distance"].default_value = 0.004
    links.new(coord.outputs["Object"], broad.inputs["Vector"])
    links.new(broad.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(coord.outputs["Object"], fine.inputs["Vector"])
    links.new(fine.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def night_sky(horizon=(0.20, 0.070, 0.020), top=(0.003, 0.006, 0.014)):
    sky(top, horizon, (0.001, 0.002, 0.003))


def asphalt(name="Asphalt"):
    mat = principled(name, (0.018, 0.018, 0.017), roughness=0.96)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    coord = nodes.new("ShaderNodeTexCoord")
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 26.0
    noise.inputs["Detail"].default_value = 6.0
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.16
    bump.inputs["Distance"].default_value = 0.008
    links.new(coord.outputs["Object"], noise.inputs["Vector"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def concrete(name="Concrete", tint=(0.16, 0.155, 0.145)):
    return grime(name, tint, roughness=0.95, scale=3.0)


def steel(name="Steel", tint=(0.085, 0.095, 0.100)):
    return grime(name, tint, roughness=0.58, metallic=0.62, scale=4.5)


def rust(name="Rust", tint=(0.23, 0.095, 0.035)):
    return grime(name, tint, roughness=0.88, metallic=0.18, scale=8.0)


def paint(name="Paint", tint=(0.055, 0.085, 0.080)):
    return grime(name, tint, roughness=0.70, metallic=0.28, scale=5.0)


def sodium_lamp(name, loc, energy=180.0, size=0.9, color=(1.0, 0.50, 0.16)):
    area(name, loc, (loc[0], loc[1] - 1.0, loc[2] - 0.5), energy, size, color)


def point_lamp(name, loc, energy=18.0, color=(1.0, 0.50, 0.18), radius=0.10):
    bpy.ops.object.light_add(type="POINT", location=loc)
    lamp = bpy.context.object
    lamp.name = name
    lamp.data.energy = energy
    lamp.data.color = color
    lamp.data.shadow_soft_size = radius
    return lamp


def pipe_run(prefix, points, radius, mat, vertices=12):
    for i in range(len(points) - 1):
        limb(f"{prefix}-{i}", points[i], points[i + 1], radius, mat, vertices=vertices)
    for i, p in enumerate(points[1:-1], start=1):
        sphere(f"{prefix}-Joint-{i}", p, radius * 1.08, mat, segments=16, rings=10)


def ladder(prefix, x, y, z0, height, mat, width=0.38, rungs=14):
    for side in (-1, 1):
        cube(f"{prefix}-Rail-{side}", (x + side * width / 2, y, z0 + height / 2),
             (0.035, 0.035, height), mat)
    for i in range(rungs):
        z = z0 + 0.18 + i * ((height - 0.30) / max(1, rungs - 1))
        cube(f"{prefix}-Rung-{i}", (x, y - 0.01, z), (width, 0.055, 0.026), mat)


def storage_tank(prefix, x, y, radius, height, body, band):
    cylinder(f"{prefix}-Shell", (x, y, height / 2), radius, height, body, vertices=48)
    cylinder(f"{prefix}-Roof", (x, y, height + 0.05), radius * 1.04, 0.12, body, vertices=48)
    for i in range(4):
        z = height * (0.18 + i * 0.21)
        bpy.ops.mesh.primitive_torus_add(
            major_radius=radius * 1.015, minor_radius=0.045,
            major_segments=48, minor_segments=6, location=(x, y, z)
        )
        assign(bpy.context.object, band)
    ladder(f"{prefix}-Ladder", x + radius * 0.92, y - radius * 0.18,
           0.0, height + 0.2, band, width=0.34, rungs=16)
    # a small landing and a valve wheel give the tank a human scale
    cube(f"{prefix}-Landing", (x + radius + 0.22, y, height * 0.58),
         (0.42, 0.72, 0.05), band)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.24, minor_radius=0.035,
        major_segments=24, minor_segments=8,
        location=(x + radius + 0.22, y - 0.34, height * 0.58 + 0.18),
        rotation=(math.pi / 2, 0, 0)
    )
    assign(bpy.context.object, rust(f"{prefix}-ValveRust"))


def warning_band(prefix, x0, x1, y, z, mat, count=12):
    width = (x1 - x0) / count
    for i in range(count):
        cube(f"{prefix}-{i}", (x0 + width * (i + 0.5), y, z),
             (width * 0.92, 0.02, 0.20), mat)


def wall_window(prefix, x, y, z, width, height, mat, glow=None):
    cube(f"{prefix}-Frame", (x, y, z), (width + 0.12, 0.10, height + 0.12), mat)
    if glow:
        cube(f"{prefix}-Glow", (x, y - 0.065, z), (width, 0.012, height), glow)
    cube(f"{prefix}-BarV", (x, y - 0.08, z), (0.045, 0.05, height), mat)
    cube(f"{prefix}-BarH", (x, y - 0.08, z), (width, 0.05, 0.045), mat)


def sign_board(prefix, loc, width, height, mat, ink, lines, size=0.16):
    x, y, z = loc
    cube(f"{prefix}-Board", (x, y, z), (width, 0.08, height), mat)
    for i, line in enumerate(lines):
        text_obj(f"{prefix}-Line-{i}", line,
                 (x - width * 0.46, y - 0.046, z + height * 0.22 - i * size * 1.20),
                 size, rot=(math.pi / 2, 0, 0), mat=ink, align="LEFT")


# ---------------------------------------------------------------------------
# scenes
# ---------------------------------------------------------------------------

def scene_plant_gate(samples, width, height, out):
    reset()
    night_sky((0.16, 0.055, 0.018), (0.002, 0.004, 0.010))
    plane("Road", (0, 0, -0.01), 60, asphalt())
    plane("PlantGround", (0, 12, 0.0), 40, concrete("PlantConcrete", (0.085, 0.082, 0.075)))
    wall = plaster_material("GateWall", (0.10, 0.085, 0.070))
    cube("FactoryWall", (0, 8.0, 2.1), (15.0, 0.55, 4.2), wall)
    steel_mat = steel()
    rust_mat = rust()
    # gate posts and a hard, industrial threshold
    for side in (-1, 1):
        cube(f"GatePost-{side}", (side * 2.75, 4.4, 1.55), (0.36, 0.36, 3.10), steel_mat)
        cube(f"GatePostCap-{side}", (side * 2.75, 4.4, 3.16), (0.52, 0.52, 0.12), rust_mat)
    for z in (0.42, 1.70, 2.85):
        cube(f"GateBar-{z}", (0, 4.4, z), (5.1, 0.10, 0.10), rust_mat)
    for i in range(14):
        x = -2.45 + i * 0.38
        cube(f"GatePicket-{i}", (x, 4.4, 1.55), (0.055, 0.055, 2.90), steel_mat)
    # sign board, lit from below
    board = grime("GateBoard", (0.035, 0.050, 0.047), roughness=0.55, metallic=0.42)
    sign_board("GateSign", (0, 4.22, 2.55), 4.4, 1.15, board,
               grime("SignInk", (0.55, 0.46, 0.30), roughness=0.70),
               ["UNION CARBIDE", "INDIA LIMITED"], size=0.22)
    point_lamp("SignWash", (0, 3.30, 2.10), 38, (1.0, 0.48, 0.15), 0.35)
    # guard hut at left and a sodium post at right
    cube("GuardHut", (-5.0, 5.2, 1.25), (2.8, 2.2, 2.5), concrete("HutConcrete", (0.10, 0.095, 0.085)))
    cube("HutRoof", (-5.0, 5.2, 2.56), (3.1, 2.5, 0.14), rust_mat)
    cube("HutWindow", (-4.3, 4.08, 1.45), (0.9, 0.03, 0.55),
         emission("HutGlow", (0.90, 0.42, 0.12), 0.55))
    cylinder("LampPost", (5.2, 3.6, 2.4), 0.10, 4.8, steel_mat, vertices=12)
    cube("LampArm", (5.2, 3.0, 4.65), (0.16, 1.5, 0.14), steel_mat)
    cube("LampHead", (5.2, 2.33, 4.55), (0.55, 0.35, 0.16), steel_mat)
    cube("LampGlow", (5.2, 2.33, 4.45), (0.46, 0.28, 0.02),
         emission("SodiumGate", (1.0, 0.48, 0.12), 2.6))
    point_lamp("GateSodium", (5.2, 2.3, 4.35), 160, (1.0, 0.46, 0.12), 0.45)
    # bicycle silhouette at the gate, a small human trace without a body
    bike = principled("BikeSteel", (0.012, 0.012, 0.012), roughness=0.62, metallic=0.35)
    for wheel_x in (2.0, 2.85):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.33, minor_radius=0.020,
            major_segments=28, minor_segments=6,
            location=(wheel_x, 3.65, 0.35), rotation=(0, math.pi / 2, 0)
        )
        assign(bpy.context.object, bike)
    cube("BikeFrame", (2.42, 3.65, 0.55), (0.85, 0.035, 0.035), bike, rot=(0, 0.52, 0))
    cube("BikeSeat", (2.18, 3.65, 0.88), (0.22, 0.08, 0.05), bike)
    cube("BikeHandle", (2.68, 3.65, 0.92), (0.035, 0.035, 0.34), bike, rot=(0, 0.15, 0))
    # distant pipes and a stack, so the gate opens into a plant, not a wall
    for i in range(3):
        pipe_run(f"GatePipe-{i}", [(-9, 9.5, 1.2 + i * 0.7), (9, 9.5, 1.2 + i * 0.7)],
                 0.11, steel_mat)
    cylinder("GateStack", (9.0, 12.0, 5.2), 0.55, 10.4, steel_mat, vertices=24)
    cylinder("GateStackTip", (9.0, 12.0, 10.4), 0.62, 0.20, rust_mat, vertices=24)
    dust(70, seed=17, zmax=4.0, ymax=18)
    camera((6.4, -8.4, 2.65), (-0.4, 4.2, 2.0), lens=35, fstop=4.0)
    bpy.context.scene.view_settings.exposure = -1.0
    area("Key", (2.0, -5.0, 5.0), (0, 4.0, 2.0), 320, 3.0, (1.0, 0.55, 0.24))
    area("Rim", (-5.0, 2.0, 4.0), (0, 5.0, 2.0), 220, 2.4, (0.30, 0.48, 0.72))
    area("GateFill", (0.0, 1.5, 1.2), (0, 4.0, 1.2), 60, 2.0, (0.55, 0.32, 0.18))
    render(samples, width, height, out)


def scene_tank_farm(samples, width, height, out):
    reset()
    night_sky((0.24, 0.075, 0.020), (0.002, 0.005, 0.012))
    plane("Ground", (0, 10, 0), 80, concrete("FarmGround", (0.070, 0.068, 0.062)))
    body = paint("TankPaint", (0.115, 0.135, 0.125))
    band = rust("TankBand", (0.28, 0.120, 0.042))
    # four tanks at different depths, all faceted enough to read as built
    storage_tank("Tank-A", -7.2, 14.0, 3.2, 7.2, body, band)
    storage_tank("Tank-B", 0.0, 18.0, 3.8, 8.2, body, band)
    storage_tank("Tank-C", 7.8, 13.0, 2.7, 6.0, body, band)
    storage_tank("Tank-D", 13.5, 21.0, 3.0, 7.0, body, band)
    st = steel()
    # pipe rack in front of the tanks
    for i in range(5):
        x = -10 + i * 5.2
        cube(f"RackPost-{i}", (x, 7.4, 1.35), (0.18, 0.18, 2.7), st)
        cube(f"RackBeam-{i}", (x, 7.4, 2.72), (5.2, 0.18, 0.18), st)
    for j in range(5):
        pipe_run(f"Pipe-{j}", [(-11, 7.2, 2.95 + j * 0.22), (14, 7.2, 2.95 + j * 0.22)],
                 0.065 + j * 0.012, st)
    pipe_run("MainPipe", [(-11, 6.0, 0.8), (3, 6.0, 0.8), (3, 10.5, 0.8),
                          (3, 10.5, 7.2)], 0.24, rust())
    # flare tower to the right, a vertical line the eye can follow
    cube("FlareBase", (17.0, 16.0, 0.4), (2.4, 2.4, 0.8), concrete("FlareBaseConcrete"))
    cylinder("FlareStack", (17.0, 16.0, 9.0), 0.34, 18.0, st, vertices=20)
    for i in range(4):
        cylinder(f"FlareRing-{i}", (17.0, 16.0, 2.5 + i * 4.0), 0.48, 0.08, band, vertices=20)
    # a restrained flare: a hot cone, not a fireball
    bpy.ops.mesh.primitive_cone_add(
        vertices=32, radius1=0.16, radius2=0.0, depth=2.2,
        location=(17.0, 16.0, 18.2)
    )
    flare = bpy.context.object
    flare.name = "FlareFlame"
    smooth(flare)
    assign(flare, emission("FlareOrange", (1.0, 0.34, 0.05), 18.0))
    sphere("FlareCore", (17.0, 16.0, 18.1), 0.20,
           emission("FlareCoreHot", (1.0, 0.82, 0.42), 30.0), segments=16, rings=10)
    point_lamp("FlareLight", (17.0, 16.0, 18.0), 420, (1.0, 0.36, 0.08), 1.2)
    # perimeter lights and wet reflections
    for i, x in enumerate((-14, -4, 6, 16)):
        cylinder(f"PerimeterPost-{i}", (x, 4.0, 1.6), 0.075, 3.2, st, vertices=8)
        sphere(f"PerimeterLamp-{i}", (x, 4.0, 3.25), 0.13,
               emission(f"PerimeterGlow-{i}", (1.0, 0.52, 0.18), 3.0),
               segments=12, rings=8)
        point_lamp(f"PerimeterLight-{i}", (x, 4.0, 3.2), 38, (1.0, 0.46, 0.12), 0.18)
    # faint horizon buildings
    for i in range(12):
        x = -22 + i * 4.1
        h = 1.2 + (i * 7 % 5) * 0.7
        cube(f"HorizonBlock-{i}", (x, 30.0, h / 2), (3.2, 2.0, h),
             principled(f"HorizonMat-{i}", (0.008, 0.009, 0.010), roughness=0.95))
    dust(100, seed=21, zmax=6.0, ymax=28)
    camera((-3.0, -16.0, 4.0), (0.0, 16.0, 5.2), lens=28, fstop=5.0)
    bpy.context.scene.view_settings.exposure = -0.30
    area("MoonFill", (-14.0, -6.0, 12.0), (0, 14.0, 4.0), 1300, 8.0, (0.30, 0.46, 0.72))
    area("SodiumWash", (9.0, 1.0, 7.0), (0, 12.0, 3.0), 900, 6.0, (1.0, 0.46, 0.13))
    area("TankFill", (2.0, -2.0, 4.0), (0, 12.0, 3.0), 320, 5.0, (0.44, 0.56, 0.70))
    render(samples, width, height, out)


def scene_tank_610(samples, width, height, out):
    reset()
    night_sky((0.18, 0.060, 0.018), (0.002, 0.004, 0.009))
    plane("Ground", (0, 0, 0), 40, concrete("TankGround", (0.095, 0.090, 0.080)))
    body = paint("Tank610Paint", (0.055, 0.075, 0.068))
    band = rust("Tank610Band")
    storage_tank("Tank610", 0, 8.0, 4.6, 9.0, body, band)
    # stencilled identification, large enough to be a character in the frame
    text_obj("TankNumber", "610", (-1.5, 3.35, 5.0), 0.95,
             rot=(math.pi / 2, 0, 0), mat=rust("NumberRust", (0.36, 0.16, 0.05)))
    text_obj("TankLabel", "MIC", (1.7, 3.35, 6.55), 0.24,
             rot=(math.pi / 2, 0, 0), mat=rust("LabelRust", (0.30, 0.13, 0.04)))
    # foreground valve cluster and a gauge
    st = steel()
    pipe_run("TankPipe", [(2.8, 3.4, 0.8), (2.8, 3.4, 4.7), (6.0, 3.4, 4.7),
                          (6.0, 1.2, 4.7)], 0.26, st)
    cylinder("TankGaugeBody", (2.8, 3.15, 3.2), 0.42, 0.20, st,
             rot=(math.pi / 2, 0, 0), vertices=32)
    cylinder("TankGaugeFace", (2.8, 3.04, 3.2), 0.36, 0.015,
             paper_material("GaugeFace610", (0.50, 0.43, 0.31)),
             rot=(math.pi / 2, 0, 0), vertices=32)
    needle = principled("GaugeNeedle610", (0.34, 0.035, 0.020), roughness=0.5)
    cube("GaugeNeedle", (2.8, 3.02, 3.26), (0.015, 0.008, 0.28), needle,
         rot=(0, -0.55, 0))
    cylinder("GaugeHub", (2.8, 3.02, 3.20), 0.035, 0.008, needle,
             rot=(math.pi / 2, 0, 0), vertices=16)
    # a chain and a warning plate on the tank
    e = principled("Chain610", (0.035, 0.032, 0.028), roughness=0.55, metallic=0.45)
    for i in range(18):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.045, minor_radius=0.011,
            major_segments=12, minor_segments=5,
            location=(4.1 + 0.02 * (i % 2), 3.2, 0.75 + i * 0.085),
            rotation=(math.pi / 2, 0, (i % 2) * math.pi / 2)
        )
        assign(bpy.context.object, e)
    cube("WarningPlate", (4.25, 3.12, 2.0), (0.62, 0.02, 0.34),
         emission("WarningPlateGlow", (0.65, 0.22, 0.02), 0.12))
    text_obj("WarningText", "DANGER", (3.95, 3.10, 2.10), 0.065,
             rot=(math.pi / 2, 0, 0), mat=principled("WarningInk", (0.05, 0.035, 0.02), 0.8))
    # a concrete bund and a single work light at the base
    cube("Bund", (0, 2.0, 0.30), (11.0, 0.45, 0.60), concrete("BundConcrete", (0.105, 0.10, 0.09)))
    cylinder("WorkLampPost", (-5.2, 1.0, 1.2), 0.07, 2.4, st, vertices=8)
    cube("WorkLampHead", (-5.2, 2.0, 2.25), (0.22, 0.45, 0.10), st)
    cube("WorkLampGlow", (-5.2, 2.0, 2.18), (0.18, 0.40, 0.02),
         emission("WorkLampSodium", (1.0, 0.53, 0.17), 2.0))
    point_lamp("WorkLight", (-5.2, 2.0, 2.1), 80, (1.0, 0.48, 0.14), 0.3)
    dust(55, seed=31, zmax=5.0, ymax=10)
    camera((7.5, -7.8, 2.3), (0.8, 5.8, 4.4), lens=38, fstop=3.2)
    bpy.context.scene.view_settings.exposure = -0.9
    area("Key", (-2.5, -4.0, 5.0), (0, 5.0, 4.0), 300, 2.2, (0.52, 0.64, 0.82))
    area("Rim", (6.0, 5.0, 4.0), (0, 5.0, 3.0), 260, 2.4, (1.0, 0.46, 0.14))
    render(samples, width, height, out)


def scene_gauge(samples, width, height, out):
    reset()
    dark_world((0.0005, 0.0004, 0.0003))
    st = steel("GaugeSteel", (0.10, 0.105, 0.105))
    plane("GaugeBack", (0, 2.2, 0), 9, paint("GaugeWall", (0.022, 0.040, 0.042)))
    # the gauge faces the camera: a thick body, a bone face, a red arc
    cylinder("GaugeBody", (0, 0.15, 1.35), 1.18, 0.28, st,
             rot=(math.pi / 2, 0, 0), vertices=64)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=1.10, minor_radius=0.065,
        major_segments=64, minor_segments=10,
        location=(0, -0.02, 1.35), rotation=(math.pi / 2, 0, 0)
    )
    assign(bpy.context.object, aged_brass("GaugeBezel"))
    face = paper_material("GaugePaper", (0.64, 0.57, 0.42))
    cylinder("GaugeFace", (0, -0.03, 1.35), 1.02, 0.02, face,
             rot=(math.pi / 2, 0, 0), vertices=64)
    ink = principled("GaugeInk", (0.018, 0.016, 0.012), roughness=0.55)
    red = principled("GaugeRed", (0.42, 0.025, 0.012), roughness=0.62)
    # tick marks around the dial
    for i in range(41):
        a = math.radians(-225 + i * 270 / 40)
        r0, r1 = 0.82, 0.92 if i % 5 else 0.74
        x0, z0 = math.sin(a) * r0, 1.35 + math.cos(a) * r0
        x1, z1 = math.sin(a) * r1, 1.35 + math.cos(a) * r1
        limb(f"Tick-{i}", (x0, -0.055, z0), (x1, -0.055, z1), 0.008 if i % 5 else 0.016, ink,
             vertices=6)
    # red danger arc, drawn as short segments
    for i in range(9):
        a = math.radians(55 + i * 8)
        limb(f"DangerArc-{i}", (math.sin(a) * 0.86, -0.06, 1.35 + math.cos(a) * 0.86),
             (math.sin(a + math.radians(8)) * 0.86, -0.06,
              1.35 + math.cos(a + math.radians(8)) * 0.86), 0.030, red, vertices=8)
    text_obj("GaugeMIC", "MIC", (0, -0.065, 1.78), 0.20,
             rot=(math.pi / 2, 0, 0), mat=ink, align="CENTER")
    text_obj("GaugeUnit", "PRESSURE", (0, -0.065, 0.98), 0.075,
             rot=(math.pi / 2, 0, 0), mat=ink, align="CENTER")
    # a needle deep in the red, with a shadow on the face
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.08, 1.35))
    needle = bpy.context.object
    needle.name = "GaugeNeedle"
    needle.scale = (0.035, 0.018, 0.78)
    needle.rotation_euler = (0, math.radians(-38), 0)
    needle.location = (math.sin(math.radians(-38)) * 0.36, -0.075,
                       1.35 + math.cos(math.radians(-38)) * 0.36)
    assign(needle, red)
    cylinder("NeedleHub", (0, -0.09, 1.35), 0.10, 0.035, aged_brass("NeedleHubBrass"),
             rot=(math.pi / 2, 0, 0), vertices=24)
    # cable conduit and a valve wheel at the edge
    pipe_run("GaugePipe", [(-1.35, 0.2, 0.2), (-1.35, 0.2, 1.35), (-1.0, 0.2, 1.35)],
             0.11, st)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.44, minor_radius=0.055, major_segments=32, minor_segments=8,
        location=(1.55, 0.10, 0.62), rotation=(0, math.pi / 2, 0)
    )
    assign(bpy.context.object, rust("GaugeWheelRust"))
    for i in range(5):
        a = i * math.tau / 5
        cube(f"WheelSpoke-{i}", (1.55, 0.10 + math.cos(a) * 0.20, 0.62 + math.sin(a) * 0.20),
             (0.04, 0.30, 0.04), rust(), rot=(a, 0, 0))
    # condensation and dust on the glass
    for i in range(20):
        rng = random.Random(100 + i)
        sphere(f"GlassDust-{i}", (rng.uniform(-0.8, 0.8), -0.07, 1.35 + rng.uniform(-0.8, 0.8)),
               rng.uniform(0.004, 0.012), principled(f"GlassDustMat-{i}", (0.55, 0.45, 0.30), 0.9),
               segments=8, rings=6)
    camera((0.8, -5.2, 1.55), (0, 0, 1.35), lens=58, fstop=2.0)
    bpy.context.scene.view_settings.exposure = -0.55
    area("Key", (-2.2, -2.0, 2.8), (0, 0, 1.35), 260, 1.3, (0.62, 0.78, 0.92))
    area("Rim", (2.0, 1.5, 2.2), (0, 0, 1.35), 150, 1.0, (1.0, 0.44, 0.13))
    render(samples, width, height, out)


def scene_valve(samples, width, height, out):
    reset()
    night_sky((0.16, 0.050, 0.015), (0.001, 0.003, 0.007))
    plane("Ground", (0, 0, 0), 30, concrete("ValveGround", (0.085, 0.080, 0.072)))
    st = steel("ValveSteel", (0.075, 0.082, 0.085))
    rust_mat = rust("ValveRust")
    pipe_run("ValvePipe", [(-5.0, 1.3, 2.2), (0.0, 1.3, 2.2), (5.0, 1.3, 2.2)],
             0.48, st, vertices=24)
    cylinder("ValveBody", (0, 1.3, 2.2), 0.62, 0.80, st,
             rot=(0, math.pi / 2, 0), vertices=32)
    # large handwheel, slightly turned, with a worn rim
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.92, minor_radius=0.075, major_segments=48, minor_segments=8,
        location=(0, 1.3, 3.35), rotation=(0, 0, 0)
    )
    assign(bpy.context.object, rust_mat)
    for i in range(6):
        a = i * math.tau / 6
        cube(f"ValveSpoke-{i}", (math.cos(a) * 0.44, 1.3 + math.sin(a) * 0.44, 3.35),
             (0.62, 0.07, 0.07), rust_mat, rot=(0, 0, a))
    cylinder("ValveStem", (0, 1.3, 2.95), 0.11, 0.85, st, vertices=20)
    # warning tag on a chain
    cube("ValveTag", (0.65, 1.12, 2.0), (0.30, 0.02, 0.20), paper_material("TagPaper", (0.58, 0.39, 0.14)))
    text_obj("ValveTagText", "LOCK", (0.52, 1.10, 2.05), 0.07,
             rot=(math.pi / 2, 0, 0), mat=principled("TagInk", (0.04, 0.025, 0.012), 0.8))
    for i in range(6):
        sphere(f"TagChain-{i}", (0.52, 1.13, 2.55 - i * 0.075), 0.028, rust_mat,
               segments=10, rings=6)
    # a pressure line and a small gauge in the background
    pipe_run("ValveBypass", [(2.2, 1.3, 2.2), (2.2, 1.3, 4.1), (4.1, 1.3, 4.1)],
             0.16, st)
    cylinder("BypassGauge", (3.2, 1.15, 4.1), 0.32, 0.14, st,
             rot=(math.pi / 2, 0, 0), vertices=24)
    cylinder("BypassFace", (3.2, 1.06, 4.1), 0.26, 0.01,
             paper_material("BypassPaper", (0.52, 0.45, 0.32)),
             rot=(math.pi / 2, 0, 0), vertices=24)
    cube("BypassNeedle", (3.2, 1.04, 4.18), (0.012, 0.006, 0.20),
         principled("BypassNeedleMat", (0.42, 0.025, 0.014), 0.5), rot=(0, -0.6, 0))
    # wet ground with a single reflected work light
    cylinder("ValveLampPost", (-4.2, -0.8, 2.0), 0.08, 4.0, st, vertices=8)
    cube("ValveLampArm", (-4.2, 0.3, 3.95), (0.12, 2.2, 0.12), st)
    sphere("ValveLamp", (-4.2, 1.35, 3.85), 0.16,
           emission("ValveLampGlow", (1.0, 0.48, 0.12), 4.0), segments=16, rings=10)
    point_lamp("ValveLight", (-4.2, 1.35, 3.8), 100, (1.0, 0.46, 0.12), 0.2)
    dust(60, seed=44, zmax=4.0, ymax=8)
    camera((-2.0, -6.0, 2.0), (0.1, 1.5, 2.6), lens=42, fstop=2.8)
    bpy.context.scene.view_settings.exposure = -0.95
    area("Key", (0.0, -4.0, 4.2), (0, 1.0, 2.4), 280, 2.0, (0.46, 0.60, 0.78))
    area("Sodium", (3.2, 0.0, 4.4), (0, 1.2, 2.6), 240, 1.8, (1.0, 0.44, 0.12))
    render(samples, width, height, out)


def scene_flare(samples, width, height, out):
    reset()
    night_sky((0.22, 0.065, 0.014), (0.001, 0.003, 0.009))
    plane("Ground", (0, 0, 0), 70, concrete("FlareGround", (0.080, 0.075, 0.064)))
    st = steel("FlareSteel", (0.115, 0.120, 0.122))
    # A taller lattice tower, braced on both faces so it reads as structure.
    for x in (-2.3, 2.3):
        cube(f"TowerLeg-{x}", (x, 0, 8.2), (0.26, 0.26, 16.4), st)
        for i in range(8):
            z = 1.0 + i * 2.0
            cube(f"TowerBrace-{x}-{i}", (x, 0, z), (0.12, 0.12, 2.3), st, rot=(0, 0.38, 0))
    for z in (2.0, 6.0, 10.0, 14.0):
        cube(f"TowerBridge-{z}", (0, 0, z), (4.7, 0.16, 0.16), st)
    for i in range(7):
        z = 1.4 + i * 2.1
        limb(f"TowerCrossA-{i}", (-2.25, -0.02, z), (2.25, -0.02, z + 2.1), 0.045, st, vertices=6)
        limb(f"TowerCrossB-{i}", (2.25, 0.02, z), (-2.25, 0.02, z + 2.1), 0.045, st, vertices=6)
    pipe_run("FlareRiser", [(-0.6, 0.0, 0.0), (-0.6, 0.0, 12.0), (0.0, 0.0, 12.0),
                            (0.0, 0.0, 16.2)], 0.30, rust())
    cylinder("FlareTip", (0, 0, 16.7), 0.36, 1.0, rust(), vertices=24)
    # a large, wind-bent flame: three cones, not a single candle
    for i, (dx, dz, r, h) in enumerate(((0.0, 16.9, 0.56, 4.2), (0.35, 17.8, 0.34, 3.2),
                                       (-0.22, 18.6, 0.20, 2.4))):
        bpy.ops.mesh.primitive_cone_add(
            vertices=28, radius1=r, radius2=0.0, depth=h,
            location=(dx, 0.0, dz + h / 2), rotation=(0, 0.18, 0)
        )
        obj = bpy.context.object
        obj.name = f"FlareFlame-{i}"
        smooth(obj)
        assign(obj, emission(f"FlareFlameMat-{i}", (1.0, 0.38 - i * 0.05, 0.045), 22.0 - i * 4))
    sphere("FlareCore", (0, 0, 18.4), 0.34,
           emission("FlareCoreMat", (1.0, 0.84, 0.44), 36.0), segments=18, rings=12)
    point_lamp("FlareLight", (0, 0, 18.6), 1200, (1.0, 0.36, 0.07), 1.3)
    # aircraft warning lights on the tower
    for i, z in enumerate((6.0, 11.0, 15.0)):
        sphere(f"FlareWarning-{i}", (2.45, 0.0, z), 0.10,
               emission(f"FlareWarningMat-{i}", (1.0, 0.06, 0.015), 4.0), segments=12, rings=8)
    # pipework and tanks in the foreground, lit just enough to frame the tower
    storage_tank("FlareTank-A", -8.0, 9.0, 2.4, 5.0, paint("FlareTankPaint", (0.085, 0.105, 0.098)),
                 rust("FlareTankBand"))
    storage_tank("FlareTank-B", 8.5, 12.0, 2.8, 6.4, paint("FlareTankPaint", (0.085, 0.105, 0.098)),
                 rust("FlareTankBand"))
    pipe_run("FlarePipe", [(-12, 4.0, 1.0), (10, 4.0, 1.0)], 0.20, st)
    for i, x in enumerate((-10, -4, 3, 10)):
        cube(f"FlareLampPost-{i}", (x, 2.0, 1.5), (0.08, 0.08, 3.0), st)
        sphere(f"FlareLampGlow-{i}", (x, 2.0, 3.0), 0.13,
               emission(f"FlareLampMat-{i}", (1.0, 0.48, 0.14), 3.0), segments=12, rings=8)
        point_lamp(f"FlareLamp-{i}", (x, 2.0, 3.0), 55, (1.0, 0.44, 0.12), 0.18)
    dust(100, seed=52, zmax=8.0, ymax=24)
    camera((7.0, -21.0, 2.5), (0.0, 0.0, 9.5), lens=26, fstop=4.5)
    bpy.context.scene.view_settings.exposure = -0.30
    area("TowerRim", (-7.0, -5.0, 11.0), (0, 0, 8.0), 900, 5.0, (0.26, 0.42, 0.70))
    area("TowerSodium", (8.0, 2.0, 8.0), (0, 0, 8.0), 650, 4.0, (1.0, 0.44, 0.12))
    area("BaseFill", (0.0, -8.0, 2.0), (0, 0, 3.0), 220, 4.0, (0.44, 0.56, 0.70))
    render(samples, width, height, out)


def scene_control_panel(samples, width, height, out):
    reset()
    dark_world((0.0004, 0.0004, 0.0003))
    plane("Floor", (0, 0, 0), 12, concrete("ControlFloor", (0.040, 0.040, 0.038)))
    wall = paint("ControlWall", (0.045, 0.060, 0.058))
    cube("ControlWall", (0, 3.2, 1.8), (8.0, 0.25, 3.6), wall)
    # a long analog panel with instruments and switches
    panel = grime("ControlPanel", (0.045, 0.055, 0.048), roughness=0.62, metallic=0.35)
    cube("PanelBody", (0, 2.8, 1.55), (7.2, 0.45, 2.0), panel)
    for row, z in enumerate((2.28, 1.72, 1.16)):
        for i in range(7):
            x = -3.0 + i * 1.0
            cylinder(f"Dial-{row}-{i}", (x, 2.54, z), 0.28, 0.10, steel("DialSteel"),
                     rot=(math.pi / 2, 0, 0), vertices=28)
            cylinder(f"DialFace-{row}-{i}", (x, 2.45, z), 0.23, 0.008,
                     paper_material(f"DialPaper-{row}-{i}", (0.50, 0.46, 0.34)),
                     rot=(math.pi / 2, 0, 0), vertices=28)
            cube(f"DialNeedle-{row}-{i}", (x, 2.43, z + 0.05), (0.012, 0.006, 0.18),
                 principled(f"DialNeedleMat-{row}-{i}", (0.34, 0.025, 0.014), 0.5),
                 rot=(0, 0.65 if (i + row) % 3 else -0.8, 0))
    for i in range(10):
        x = -3.1 + i * 0.68
        cube(f"Switch-{i}", (x, 2.52, 0.72), (0.14, 0.06, 0.24), steel("SwitchSteel"))
        cube(f"SwitchLever-{i}", (x, 2.46, 0.80), (0.045, 0.04, 0.16),
             principled(f"SwitchLeverMat-{i}", (0.045, 0.040, 0.030), 0.55),
             rot=(0, 0.35 if i % 2 else -0.35, 0))
    # warning lamp and a handset
    cube("WarningHousing", (2.85, 2.50, 2.72), (0.42, 0.20, 0.36), rust("WarningHousingRust"))
    sphere("WarningLamp", (2.85, 2.34, 2.72), 0.15,
           emission("WarningLampGlow", (1.0, 0.06, 0.015), 4.5), segments=20, rings=12)
    point_lamp("WarningLight", (2.85, 2.25, 2.72), 28, (1.0, 0.08, 0.02), 0.16)
    # desk with a logbook, a cup and a telephone
    cube("ControlDesk", (0, 1.45, 0.72), (5.2, 1.0, 0.12), dark_wood("ControlDeskWood"))
    for side in (-1, 1):
        cube(f"DeskLeg-{side}", (side * 2.35, 1.45, 0.36), (0.12, 0.12, 0.72), steel("DeskLegSteel"))
    paper = paper_material("LogPaper", (0.56, 0.50, 0.37))
    cube("LogBook", (-1.2, 1.35, 0.80), (0.70, 0.48, 0.035), paper, rot=(0, 0, 0.10))
    for i in range(5):
        cube(f"LogLine-{i}", (-1.4, 1.35 - i * 0.045, 0.821), (0.44, 0.005, 0.002),
             principled(f"LogInk-{i}", (0.025, 0.020, 0.016), 0.7))
    cylinder("ControlCup", (1.25, 1.15, 0.88), 0.10, 0.16,
             principled("CupMat", (0.24, 0.21, 0.16), 0.5), vertices=20)
    cube("PhoneBase", (1.85, 1.42, 0.82), (0.50, 0.34, 0.08),
         principled("PhoneMat", (0.045, 0.040, 0.032), 0.55))
    cube("PhoneHandset", (1.85, 1.42, 0.88), (0.46, 0.12, 0.08),
         principled("PhoneHandsetMat", (0.035, 0.030, 0.025), 0.5))
    # a chair, empty, and a wall clock
    cube("ControlChairSeat", (0, 0.45, 0.48), (0.95, 0.90, 0.10), principled("ChairMat", (0.035, 0.028, 0.022), 0.8))
    cube("ControlChairBack", (0, 0.0, 0.95), (0.95, 0.10, 0.95), principled("ChairMat", (0.035, 0.028, 0.022), 0.8))
    cylinder("ControlChairPost", (0, 0.45, 0.24), 0.06, 0.48, steel("ChairPost"))
    cylinder("ControlClock", (-2.6, 2.50, 2.90), 0.36, 0.10, aged_brass("ControlClockBrass"),
             rot=(math.pi / 2, 0, 0), vertices=40)
    cylinder("ControlClockFace", (-2.6, 2.44, 2.90), 0.31, 0.008,
             paper_material("ControlClockPaper", (0.60, 0.54, 0.40)),
             rot=(math.pi / 2, 0, 0), vertices=40)
    for i in range(12):
        a = i * math.tau / 12
        cube(f"ClockTick-{i}", (-2.6 + math.sin(a) * 0.25, 2.43,
                                2.90 + math.cos(a) * 0.25),
             (0.012, 0.003, 0.045), principled("ClockTickInk", (0.02, 0.018, 0.014), 0.7),
             rot=(0, a, 0))
    cube("ClockHour", (-2.6, 2.42, 2.94), (0.012, 0.004, 0.16),
         principled("ClockHandInk", (0.02, 0.018, 0.014), 0.6), rot=(0, 0.55, 0))
    cube("ClockMinute", (-2.6, 2.41, 2.94), (0.008, 0.004, 0.23),
         principled("ClockHandInk", (0.02, 0.018, 0.014), 0.6), rot=(0, -1.2, 0))
    camera((4.2, -6.2, 2.1), (0, 1.7, 1.7), lens=40, fstop=3.2)
    bpy.context.scene.view_settings.exposure = -1.0
    area("Key", (-2.0, -2.0, 3.4), (0, 1.8, 1.6), 240, 2.0, (0.52, 0.66, 0.82))
    area("Practical", (2.8, 2.0, 2.6), (0, 1.8, 1.4), 120, 0.8, (1.0, 0.44, 0.14))
    area("ScreenFill", (0.0, 0.0, 2.0), (0, 2.5, 1.5), 55, 1.2, (0.25, 0.48, 0.56))
    render(samples, width, height, out)

def scene_pipe_corridor(samples, width, height, out):
    reset()
    night_sky((0.12, 0.040, 0.012), (0.001, 0.002, 0.006))
    plane("Ground", (0, 8, 0), 60, concrete("PipeGround", (0.070, 0.068, 0.062)))
    st = steel("PipeSteel", (0.080, 0.085, 0.088))
    rust_mat = rust("PipeRust")
    # a receding rack of pipes, each one catching the same sodium line
    for j in range(7):
        z = 1.1 + j * 0.42
        x = -3.6 + (j % 3) * 0.18
        pipe_run(f"CorridorPipe-{j}", [(x, -1.0, z), (x + 0.4, 20.0, z)],
                 0.11 + (j % 2) * 0.035, st if j % 2 else rust_mat)
    for i in range(6):
        y = 0.5 + i * 3.4
        cube(f"RackPostL-{i}", (-4.2, y, 1.9), (0.16, 0.16, 3.8), st)
        cube(f"RackPostR-{i}", (4.2, y, 1.9), (0.16, 0.16, 3.8), st)
        cube(f"RackBeam-{i}", (0, y, 3.75), (8.6, 0.16, 0.16), st)
        cube(f"RackCross-{i}", (0, y, 2.4), (8.4, 0.10, 0.10), rust_mat)
    # a low catwalk and handrail
    cube("Catwalk", (2.6, 10.0, 0.55), (1.5, 20.0, 0.08), st)
    for i in range(9):
        y = 1.0 + i * 2.2
        cube(f"CatwalkPost-{i}", (3.3, y, 1.2), (0.07, 0.07, 1.3), st)
        cube(f"CatwalkRail-{i}", (3.3, y, 1.8), (0.07, 2.2, 0.07), st)
    # steam vent and a single work lamp
    cylinder("SteamVent", (-2.3, 7.0, 0.7), 0.18, 1.4, rust_mat, vertices=16)
    for i in range(5):
        sphere(f"Steam-{i}", (-2.3 + i * 0.08, 7.0 - i * 0.05, 1.5 + i * 0.10),
               0.10 + i * 0.025, principled(f"SteamMat-{i}", (0.13, 0.14, 0.145), 0.98),
               segments=10, rings=6)
    cylinder("CorridorLampPost", (4.8, 5.0, 2.1), 0.08, 4.2, st, vertices=8)
    cube("CorridorLampArm", (4.8, 3.8, 4.1), (0.12, 2.5, 0.12), st)
    sphere("CorridorLamp", (4.8, 2.55, 4.0), 0.16,
           emission("CorridorLampGlow", (1.0, 0.47, 0.13), 4.0), segments=16, rings=10)
    point_lamp("CorridorLight", (4.8, 2.55, 3.9), 280, (1.0, 0.46, 0.13), 0.30)
    # A second lamp at the far end gives the rack a vanishing point.
    cylinder("FarPipeLampPost", (-3.6, 17.0, 2.0), 0.07, 4.0, st, vertices=8)
    sphere("FarPipeLamp", (-3.6, 17.0, 4.0), 0.13,
           emission("FarPipeLampGlow", (1.0, 0.47, 0.13), 3.0), segments=12, rings=8)
    point_lamp("FarPipeLight", (-3.6, 17.0, 3.9), 120, (1.0, 0.46, 0.13), 0.25)
    dust(80, seed=63, zmax=5.0, ymax=20)
    camera((-1.4, -6.5, 1.35), (0.4, 10.0, 2.7), lens=32, fstop=4.0)
    bpy.context.scene.view_settings.exposure = -0.30
    area("Key", (-3.0, -2.0, 4.5), (0, 6.0, 2.0), 520, 3.0, (0.32, 0.48, 0.70))
    area("SodiumRim", (4.0, 4.0, 4.4), (0, 8.0, 2.5), 500, 2.6, (1.0, 0.44, 0.12))
    area("Fill", (0.0, -3.0, 1.5), (0, 8.0, 1.5), 180, 3.0, (0.38, 0.48, 0.62))
    render(samples, width, height, out)


def scene_company_sign(samples, width, height, out):
    reset()
    dark_world((0.001, 0.001, 0.001))
    plane("Ground", (0, 0, 0), 20, concrete("SignGround", (0.075, 0.072, 0.066)))
    wall = concrete("SignWall", (0.11, 0.105, 0.095))
    cube("SignWall", (0, 2.6, 2.3), (10.0, 0.50, 4.6), wall)
    # rust streaks run from the bolts; the sign is part of the wall, not a card
    board = steel("SignBoard", (0.045, 0.060, 0.055))
    cube("CompanyBoard", (0, 2.30, 2.35), (7.2, 0.12, 1.75), board)
    ink = grime("CompanyInk", (0.68, 0.55, 0.34), roughness=0.62, metallic=0.22)
    text_obj("CompanyLine1", "UNION CARBIDE", (-3.1, 2.23, 2.68), 0.30,
             rot=(math.pi / 2, 0, 0), mat=ink, align="LEFT")
    text_obj("CompanyLine2", "INDIA LIMITED", (-3.1, 2.23, 2.22), 0.22,
             rot=(math.pi / 2, 0, 0), mat=ink, align="LEFT")
    text_obj("CompanyLine3", "BHOPAL PESTICIDES PLANT", (-3.1, 2.23, 1.80), 0.105,
             rot=(math.pi / 2, 0, 0), mat=ink, align="LEFT")
    for i in range(10):
        x = -3.3 + i * 0.72
        cube(f"SignBolt-{i}", (x, 2.22, 3.10 + (i % 2) * -1.45), (0.06, 0.03, 0.06),
             rust("BoltRust"))
        cube(f"RustStreak-{i}", (x, 2.225, 2.50 - (i % 3) * 0.18),
             (0.035, 0.006, 0.62 + (i % 4) * 0.14), rust("StreakRust"))
    # pipe entering the wall on the left, and a lamp at the right edge
    st = steel()
    pipe_run("SignPipe", [(-5.5, 1.8, 0.6), (-5.5, 1.8, 3.5), (-3.7, 1.8, 3.5)],
             0.20, st)
    cylinder("SignLampPost", (5.4, 0.2, 2.4), 0.08, 4.8, st, vertices=8)
    cube("SignLampArm", (5.4, 1.2, 4.65), (0.12, 2.0, 0.12), st)
    sphere("SignLamp", (5.4, 2.2, 4.55), 0.16,
           emission("SignLampGlow", (1.0, 0.48, 0.14), 4.0), segments=16, rings=10)
    point_lamp("SignLight", (5.4, 2.2, 4.45), 100, (1.0, 0.45, 0.12), 0.25)
    camera((1.8, -6.8, 2.2), (-0.4, 2.2, 2.35), lens=45, fstop=3.2)
    bpy.context.scene.view_settings.exposure = -0.30
    area("Key", (-2.0, -3.0, 4.8), (0, 2.2, 2.3), 520, 2.8, (0.56, 0.68, 0.82))
    area("Warm", (4.0, 0.0, 3.0), (0, 2.2, 2.2), 260, 1.6, (1.0, 0.48, 0.16))
    area("Fill", (0.0, -4.0, 1.5), (0, 2.2, 1.5), 140, 2.0, (0.40, 0.50, 0.64))
    render(samples, width, height, out)


def scene_city_rooftops(samples, width, height, out):
    reset()
    night_sky((0.20, 0.072, 0.022), (0.001, 0.003, 0.010))
    roof_z = 5.6
    # The camera is on the roof, behind a parapet. The city rises to meet the
    # horizon, so the frame has a foreground, a middle and a distance.
    plane("ForegroundRoof", (0, -7.0, roof_z), 42, concrete("RoofConcrete", (0.095, 0.085, 0.070)))
    cube("Parapet", (0, -1.9, roof_z + 0.55), (24.0, 0.38, 1.10),
         concrete("ParapetConcrete", (0.125, 0.110, 0.090)))
    cube("ParapetCap", (0, -1.9, roof_z + 1.15), (24.2, 0.52, 0.12), rust("ParapetRust"))
    rng = random.Random(77)

    # A dense, layered roofscape. The near row is darker; the far rows are
    # lighter and cooler, which gives the eye a distance to travel.
    rows = (
        (14.0, 6, 7.0, 12.0, (0.070, 0.062, 0.052)),
        (25.0, 7, 8.0, 15.0, (0.085, 0.076, 0.064)),
        (38.0, 8, 9.0, 17.0, (0.100, 0.092, 0.080)),
    )
    for row, (base_y, count, min_h, max_h, color) in enumerate(rows):
        for i in range(count):
            x = -24.0 + i * (48.0 / (count - 1)) + rng.uniform(-1.7, 1.7)
            y = base_y + rng.uniform(-1.4, 1.4)
            h = min_h + rng.uniform(0.0, max_h - min_h)
            w = 4.6 + rng.uniform(0.0, 2.8)
            d = 5.4 + rng.uniform(0.0, 2.2)
            block_mat = principled(f"CityBlockMat-{row}-{i}", color, roughness=0.92)
            cube(f"CityBlock-{row}-{i}", (x, y, h / 2), (w, d, h), block_mat)
            cube(f"CityLip-{row}-{i}", (x, y, h + 0.10), (w + 0.22, d + 0.16, 0.20),
                 principled(f"CityLipMat-{row}-{i}", (color[0] * 1.6, color[1] * 1.5, color[2] * 1.4), 0.9))
            # A facade grid, not three floating windows on a black slab.
            cols = 4 + (row > 0)
            levels = max(3, int(h / 2.2))
            for k in range(cols):
                for level in range(levels):
                    if rng.random() < 0.48:
                        wx = x - w * 0.39 + k * (w * 0.78 / max(1, cols - 1))
                        wz = 1.0 + level * (h - 1.6) / max(1, levels - 1)
                        warm = rng.random() < 0.82
                        wcol = (0.95, 0.48, 0.15) if warm else (0.34, 0.48, 0.62)
                        cube(f"CityWindow-{row}-{i}-{k}-{level}",
                             (wx, y - d / 2 - 0.026, wz),
                             (0.22, 0.02, 0.30),
                             emission(f"CityWindowMat-{row}-{i}-{k}-{level}", wcol, 0.85))
            # rooftop clutter: tank, stairwell, antenna, washing line
            if i % 3 != 1:
                cylinder(f"RoofTank-{row}-{i}", (x + w * 0.22, y - d * 0.16, h + 0.58),
                         0.42, 0.95, principled(f"RoofTankMat-{row}-{i}",
                                              (0.030, 0.028, 0.023), 0.82),
                         vertices=20)
                cylinder(f"RoofTankCap-{row}-{i}", (x + w * 0.22, y - d * 0.16, h + 1.08),
                         0.45, 0.10, rust(f"RoofTankCapMat-{row}-{i}"), vertices=20)
            if i % 2 == 0:
                cube(f"Stairwell-{row}-{i}", (x - w * 0.20, y + d * 0.10, h + 0.55),
                     (1.2, 1.4, 1.1), principled(f"StairwellMat-{row}-{i}",
                                                (color[0] * 1.4, color[1] * 1.3, color[2] * 1.2), 0.9))
            if i % 2 == 1:
                limb(f"RoofMast-{row}-{i}", (x - w * 0.24, y, h),
                     (x - w * 0.24, y, h + 2.2), 0.035, steel(f"RoofMastMat-{row}-{i}"), vertices=6)
                for k in range(3):
                    cube(f"RoofMastBar-{row}-{i}-{k}", (x - w * 0.24, y, h + 0.9 + k * 0.48),
                         (0.85, 0.025, 0.025), steel(f"RoofMastMat-{row}-{i}"))

    # A minaret and the plant's flare break the skyline; both are landmarks,
    # not decoration.
    plaster = plaster_material("MinaretPlaster", (0.22, 0.18, 0.12))
    cylinder("MinaretBase", (13.0, 30.0, 10.0), 0.58, 20.0, plaster, vertices=20)
    cylinder("MinaretBalcony", (13.0, 30.0, 16.0), 1.05, 0.28, plaster, vertices=20)
    cylinder("MinaretTop", (13.0, 30.0, 20.0), 0.20, 6.0, plaster, vertices=16)
    sphere("MinaretDome", (13.0, 30.0, 23.4), 0.48,
           principled("DomeMat", (0.070, 0.095, 0.090), roughness=0.38, metallic=0.55),
           segments=24, rings=14)
    sphere("MinaretLight", (13.0, 30.0, 21.7), 0.10,
           emission("MinaretLightGlow", (0.18, 0.62, 0.32), 3.0), segments=12, rings=8)
    cylinder("HorizonFlare", (28.0, 48.0, 12.0), 0.18, 24.0, steel("HorizonFlareSteel"), vertices=12)
    sphere("HorizonFlareTip", (28.0, 48.0, 24.1), 0.40,
           emission("HorizonFlareGlow", (1.0, 0.40, 0.07), 9.0), segments=16, rings=10)
    point_lamp("HorizonFlareLight", (28.0, 48.0, 24.0), 90, (1.0, 0.38, 0.06), 0.5)

    # Foreground roof: water tank, laundry, pots, string lights.
    tank_z = roof_z + 0.55
    cylinder("WaterTank", (-5.8, -3.6, tank_z + 1.25), 1.05, 2.5,
             principled("WaterTankMat", (0.035, 0.035, 0.031), roughness=0.68, metallic=0.30),
             vertices=28)
    cylinder("WaterTankCap", (-5.8, -3.6, tank_z + 2.56), 1.10, 0.14, rust("WaterTankRust"), vertices=28)
    for band_z in (0.55, 1.35, 2.15):
        cylinder(f"WaterTankBand-{band_z}", (-5.8, -3.6, tank_z + band_z), 1.07, 0.06,
                 rust("WaterTankRust"), vertices=28)
    tank_leg_steel = steel("TankLegSteel")
    for i in range(4):
        lx = -5.8 - 0.68 + (i % 2) * 1.36
        ly = -3.6 - 0.68 + (i // 2) * 1.36
        cube(f"TankLeg-{i}", (lx, ly, roof_z + 0.28), (0.11, 0.11, 0.56), tank_leg_steel)
    cylinder("LaundryPostL", (4.6, -2.2, roof_z + 1.15), 0.045, 2.3,
             steel("LaundrySteel"), vertices=8)
    cylinder("LaundryPostR", (9.2, -2.2, roof_z + 1.15), 0.045, 2.3,
             steel("LaundrySteel"), vertices=8)
    cube("LaundryLine", (6.9, -2.2, roof_z + 2.20), (4.8, 0.018, 0.018), steel("LaundrySteel"))
    for i in range(5):
        cube(f"LaundryCloth-{i}", (5.3 + i * 0.78, -2.18, roof_z + 1.75),
             (0.42, 0.024, 0.72), principled(f"LaundryMat-{i}",
                                           (0.30, 0.24, 0.17), 0.92))
    for i, x in enumerate((-10.5, -8.0, -6.5, 7.0, 9.5, 11.5)):
        cylinder(f"StringPost-{i}", (x, -1.9, roof_z + 0.95), 0.028, 1.9,
                 steel("StringSteel"), vertices=6)
        sphere(f"StringBulb-{i}", (x, -1.9, roof_z + 1.90), 0.055,
               emission(f"StringBulbGlow-{i}", (1.0, 0.55, 0.20), 2.8), segments=10, rings=6)
        if i % 2 == 0:
            point_lamp(f"StringLight-{i}", (x, -1.9, roof_z + 1.9), 8,
                       (1.0, 0.50, 0.16), 0.12)
    for i, (x, y) in enumerate(((-2.8, -3.2), (-2.0, -3.5), (2.6, -3.4), (3.4, -3.0))):
        cylinder(f"Pot-{i}", (x, y, roof_z + 0.18), 0.20, 0.36,
                 rust(f"PotMat-{i}"), vertices=12)
        sphere(f"Plant-{i}", (x, y, roof_z + 0.52), 0.28,
               principled(f"PlantMat-{i}", (0.055, 0.11, 0.045), 0.9), segments=12, rings=8)

    # The plant is a distant orange smudge; the city is a field of windows.
    for i in range(7):
        point_lamp(f"StreetGlow-{i}", (-15.0 + i * 5.0, 12.0, 1.2), 26,
                   (1.0, 0.40, 0.10), 0.35)
    camera((-0.6, -11.5, roof_z + 1.8), (-0.6, 18.0, 8.2), lens=28, fstop=5.0)
    bpy.context.scene.view_settings.exposure = -0.10
    area("MoonFill", (-18.0, -3.0, 18.0), (0, 18.0, 7.0), 1800, 12.0, (0.30, 0.45, 0.72))
    area("CitySodium", (16.0, 2.0, 12.0), (0, 20.0, 6.0), 1400, 9.0, (1.0, 0.44, 0.12))
    area("ForegroundFill", (0.0, -12.0, 11.0), (0, -1.0, roof_z + 1.0), 480, 6.0, (0.44, 0.54, 0.68))
    render(samples, width, height, out)


def scene_street_lamp(samples, width, height, out):
    reset()
    night_sky((0.16, 0.050, 0.015), (0.001, 0.002, 0.006))
    plane("Street", (0, 6, 0), 40, asphalt("StreetAsphalt"))
    concrete_mat = concrete("StreetConcrete", (0.13, 0.115, 0.095))
    # A closed lane with a real end wall: a door, a window and a stairwell,
    # not a flat orange rectangle at the vanishing point.
    for side in (-1, 1):
        for i in range(3):
            y = -1.0 + i * 4.8
            h = 4.4 + (i % 2) * 1.0
            cube(f"LaneBlock-{side}-{i}", (side * 3.9, y, h / 2),
                 (2.4, 4.8, h), concrete_mat)
            cube(f"LaneShutter-{side}-{i}", (side * 2.66, y, 1.10),
                 (0.06, 2.2, 2.2), steel("ShutterSteel"))
            for k in range(7):
                cube(f"ShutterRib-{side}-{i}-{k}", (side * 2.62, y, 0.20 + k * 0.30),
                     (0.04, 2.2, 0.035), rust("ShutterRust"))
            cube(f"LaneWindow-{side}-{i}", (side * 2.67, y - 1.1, 3.15),
                 (0.04, 0.72, 0.90), emission(f"LaneWindowGlow-{side}-{i}",
                                            (0.68, 0.31, 0.08), 0.45))
            cube(f"LaneBalcony-{side}-{i}", (side * 2.35, y, 2.42),
                 (0.85, 1.6, 0.08), concrete_mat)
            for k in range(4):
                cube(f"BalconyRail-{side}-{i}-{k}", (side * 2.30, y - 0.6 + k * 0.4, 2.62),
                     (0.05, 0.05, 0.40), steel("BalconySteel"))
    cube("LaneEndWall", (0, 15.0, 2.8), (8.0, 0.35, 5.6), concrete_mat)
    cube("LaneEndDoor", (0.9, 14.78, 1.05), (1.0, 0.05, 2.1),
         paint("LaneEndDoorPaint", (0.10, 0.14, 0.13)))
    cube("LaneEndDoorGlow", (0.9, 14.74, 1.65), (0.62, 0.02, 0.42),
         emission("LaneEndDoorGlowMat", (0.72, 0.34, 0.10), 0.55))
    cube("LaneEndWindow", (-1.8, 14.78, 3.3), (1.3, 0.04, 0.9),
         emission("LaneEndWindowGlow", (0.56, 0.26, 0.07), 0.42))
    for i in range(3):
        cube(f"EndWindowBar-{i}", (-2.3 + i * 0.45, 14.75, 3.3), (0.035, 0.05, 0.95),
             steel("EndWindowSteel"))
    # a single sodium lamp on a bracket, the source of the whole frame
    cylinder("StreetLampPost", (2.55, 4.2, 2.2), 0.10, 4.4, steel("LampPostSteel"), vertices=10)
    cube("StreetLampArm", (1.80, 4.2, 4.28), (1.6, 0.12, 0.12), steel("LampPostSteel"))
    cube("StreetLampHead", (0.95, 4.2, 4.18), (0.64, 0.34, 0.16), steel("LampHeadSteel"))
    cube("StreetLampGlow", (0.95, 4.2, 4.08), (0.56, 0.28, 0.02),
         emission("StreetLampMat", (1.0, 0.50, 0.14), 4.5))
    point_lamp("StreetLight", (0.95, 4.2, 4.0), 300, (1.0, 0.47, 0.12), 0.50)
    # a second, weaker bulb down the lane gives the eye a destination
    cylinder("FarBulbPost", (-2.2, 11.0, 2.0), 0.06, 4.0, steel("FarBulbSteel"), vertices=8)
    sphere("FarBulb", (-2.2, 11.0, 4.0), 0.10,
           emission("FarBulbGlow", (1.0, 0.52, 0.16), 2.2), segments=12, rings=8)
    point_lamp("FarBulbLight", (-2.2, 11.0, 3.9), 40, (1.0, 0.48, 0.14), 0.18)
    # puddle and drain, with a wet, irregular edge
    cylinder("Puddle", (0.2, 1.1, 0.012), 1.1, 0.008,
             principled("PuddleWater", (0.012, 0.016, 0.018), 0.08, metallic=0.15), vertices=32)
    cylinder("PuddleSmall", (-1.2, 6.8, 0.012), 0.55, 0.006,
             principled("PuddleWater", (0.012, 0.016, 0.018), 0.08, metallic=0.15), vertices=24)
    cylinder("Drain", (1.95, 1.0, 0.012), 0.26, 0.02, rust("DrainRust"), vertices=16)
    # bicycle, chair, bucket and a parked auto-rickshaw
    bike = steel("StreetBike", (0.012, 0.012, 0.012))
    for wheel_y in (2.4, 3.3):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.33, minor_radius=0.020, major_segments=28, minor_segments=6,
            location=(1.35, wheel_y, 0.35), rotation=(0, math.pi / 2, 0)
        )
        assign(bpy.context.object, bike)
    cube("StreetBikeFrame", (1.35, 2.85, 0.55), (0.035, 0.92, 0.035), bike, rot=(0.50, 0, 0))
    cube("StreetBikeSeat", (1.35, 2.55, 0.88), (0.08, 0.22, 0.04), bike)
    cube("StreetChair", (-1.65, 0.3, 0.55), (0.60, 0.60, 0.06), dark_wood("ChairWood"))
    for side in (-1, 1):
        cube(f"ChairLeg-{side}", (-1.65 + side * 0.25, 0.3, 0.27), (0.05, 0.05, 0.54), dark_wood("ChairWood"))
    cylinder("StreetBucket", (1.95, 2.0, 0.20), 0.22, 0.40, rust("BucketRust"), vertices=20)
    auto = paint("AutoPaint", (0.055, 0.11, 0.075))
    cube("AutoBody", (-1.75, 8.0, 0.55), (1.10, 1.85, 0.62), auto)
    cube("AutoRoof", (-1.75, 8.0, 1.28), (1.18, 1.95, 0.10), auto)
    cube("AutoWindshield", (-1.75, 7.10, 1.02), (0.92, 0.04, 0.46),
         principled("AutoGlass", (0.20, 0.28, 0.28), 0.10, transmission=0.45))
    cube("AutoSeat", (-1.75, 8.05, 0.78), (0.82, 1.05, 0.16),
         principled("AutoSeatMat", (0.055, 0.045, 0.035), 0.8))
    for i, (wx, wy) in enumerate(((-1.75, 7.25), (-1.75, 8.75), (-1.75, 7.95))):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.22, minor_radius=0.055, major_segments=20, minor_segments=6,
            location=(wx, wy, 0.24), rotation=(0, math.pi / 2, 0)
        )
        assign(bpy.context.object, steel("AutoWheelSteel"))
    sphere("AutoHeadlight", (-1.75, 7.08, 0.62), 0.09,
           emission("AutoHeadlightGlow", (1.0, 0.56, 0.18), 2.0), segments=12, rings=8)
    # overhead wires
    for i in range(3):
        cube(f"Wire-{i}", (0, 7.0, 4.9 - i * 0.35), (0.012, 20.0, 0.012), steel("WireSteel"))
    dust(70, seed=88, zmax=3.6, ymax=14)
    camera((0.4, -6.8, 1.7), (0.0, 8.0, 2.6), lens=35, fstop=2.4)
    bpy.context.scene.view_settings.exposure = -0.35
    area("LampFill", (0.6, 1.0, 3.0), (0, 5.0, 1.8), 180, 1.6, (1.0, 0.47, 0.14))
    area("CoolSky", (-2.0, 6.0, 6.0), (0, 6.0, 3.0), 120, 3.0, (0.24, 0.36, 0.58))
    area("EndFill", (0.0, 10.0, 4.0), (0, 14.0, 2.4), 90, 2.0, (1.0, 0.45, 0.14))
    render(samples, width, height, out)


def scene_hospital_corridor(samples, width, height, out):
    reset()
    dark_world((0.0005, 0.0005, 0.0004))
    plane("Floor", (0, 6, 0), 30, principled("HospitalFloor", (0.10, 0.10, 0.095), 0.30))
    wall = plaster_material("HospitalWall", (0.22, 0.21, 0.18))
    for side in (-1, 1):
        cube(f"HospitalWall-{side}", (side * 2.2, 6.0, 1.55), (0.25, 14.0, 3.1), wall)
    cube("HospitalCeiling", (0, 6.0, 3.12), (4.7, 14.0, 0.18), wall)
    # doors and a curtained bay
    for i in range(4):
        y = 1.0 + i * 3.2
        cube(f"HospitalDoor-{i}", (-2.05, y, 1.05), (0.06, 1.05, 2.1),
             paint("HospitalDoorPaint", (0.10, 0.14, 0.13)))
        cube(f"HospitalDoorGlass-{i}", (-2.00, y, 1.62), (0.02, 0.42, 0.52),
             emission(f"HospitalDoorGlow-{i}", (0.52, 0.68, 0.64), 0.30))
        cube(f"DoorHandle-{i}", (-1.98, y - 0.42, 1.02), (0.04, 0.06, 0.12), steel("HandleSteel"))
    # fluorescent tubes in a receding rhythm
    for i in range(5):
        y = -0.5 + i * 3.0
        cube(f"FluoroHousing-{i}", (0, y, 3.01), (0.64, 1.4, 0.10), steel("FluoroHousingSteel"))
        cube(f"FluoroTube-{i}", (0, y, 2.94), (0.44, 1.25, 0.035),
             emission(f"FluoroGlow-{i}", (0.72, 0.86, 0.82), 1.7))
        point_lamp(f"FluoroLight-{i}", (0, y, 2.85), 24, (0.64, 0.82, 0.86), 0.22)
    # empty stretcher and IV stand, no patient
    st = steel("HospitalSteel", (0.12, 0.13, 0.13))
    cube("StretcherDeck", (0.75, 3.0, 0.86), (0.85, 1.9, 0.08), st)
    for i in range(4):
        x = 0.40 + (i % 2) * 0.70
        y = 2.35 + (i // 2) * 1.05
        cylinder(f"StretcherLeg-{i}", (x, y, 0.44), 0.035, 0.84, st, vertices=8)
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.085, minor_radius=0.025, major_segments=16, minor_segments=6,
            location=(x, y, 0.10), rotation=(0, math.pi / 2, 0)
        )
        assign(bpy.context.object, st)
    cube("StretcherSheet", (0.75, 3.0, 0.92), (0.78, 1.75, 0.025),
         principled("SheetMat", (0.48, 0.46, 0.40), 0.92))
    cylinder("IVPole", (1.55, 3.8, 1.05), 0.035, 2.1, st, vertices=8)
    cube("IVBag", (1.55, 3.8, 1.88), (0.16, 0.08, 0.30),
         principled("IVBagMat", (0.30, 0.42, 0.40), 0.18, transmission=0.35))
    # a curtain rail and a partly drawn curtain
    cube("CurtainRail", (1.95, 5.4, 2.9), (0.06, 4.0, 0.06), steel("RailSteel"))
    for i in range(9):
        cube(f"CurtainFold-{i}", (1.92, 4.0 + i * 0.26, 1.9),
             (0.04, 0.20, 1.7), principled(f"CurtainMat-{i}", (0.28, 0.30, 0.27), 0.95),
             rot=(0, 0, 0.04 * (i % 2)))
    camera((0.5, -1.0, 1.55), (0.0, 8.0, 1.6), lens=35, fstop=3.2)
    bpy.context.scene.view_settings.exposure = -0.9
    area("CorridorKey", (0.0, 0.0, 2.8), (0, 5.0, 1.2), 150, 2.0, (0.58, 0.72, 0.72))
    render(samples, width, height, out)


def scene_clinic_window(samples, width, height, out):
    reset()
    dark_world((0.0004, 0.0005, 0.0006))
    plane("Floor", (0, 0, 0), 12, concrete("ClinicFloor", (0.075, 0.070, 0.060)))
    wall = plaster_material("ClinicWall", (0.18, 0.17, 0.145))
    cube("ClinicWall", (0, 3.5, 1.8), (7.0, 0.25, 3.6), wall)
    cube("ClinicSide", (-3.4, 0.8, 1.8), (0.25, 5.2, 3.6), wall)
    # a tall window with a dusty, moonlit pane
    cube("WindowFrame", (0.2, 3.35, 1.95), (2.0, 0.10, 2.4), dark_wood("ClinicWindowWood"))
    cube("WindowPane", (0.2, 3.28, 1.95), (1.72, 0.02, 2.14),
         emission("WindowMoon", (0.28, 0.40, 0.52), 0.40))
    for i in range(3):
        cube(f"WindowBar-{i}", (-0.62 + i * 0.42, 3.26, 1.95), (0.035, 0.05, 2.20),
             dark_wood("ClinicWindowWood"))
    cube("WindowSill", (0.2, 3.20, 0.76), (2.2, 0.34, 0.10), dark_wood("ClinicWindowWood"))
    # an oxygen cylinder, a chair, a small table and a bottle
    cylinder("OxygenCylinder", (-1.55, 2.2, 0.72), 0.28, 1.44,
             paint("OxygenPaint", (0.035, 0.13, 0.10)), vertices=24)
    cylinder("OxygenNeck", (-1.55, 2.2, 1.48), 0.10, 0.18, steel("OxygenSteel"), vertices=16)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.14, minor_radius=0.022, major_segments=20, minor_segments=6,
        location=(-1.55, 2.2, 1.58), rotation=(math.pi / 2, 0, 0)
    )
    assign(bpy.context.object, steel("OxygenSteel"))
    cube("ClinicChairSeat", (0.7, 1.1, 0.48), (0.72, 0.70, 0.07), dark_wood("ClinicChairWood"))
    cube("ClinicChairBack", (0.7, 0.75, 0.92), (0.72, 0.08, 0.90), dark_wood("ClinicChairWood"))
    for side in (-1, 1):
        cube(f"ClinicChairLeg-{side}", (0.7 + side * 0.28, 1.1, 0.24), (0.05, 0.05, 0.48),
             dark_wood("ClinicChairWood"))
    cube("ClinicTable", (-0.55, 1.25, 0.72), (0.95, 0.70, 0.08), dark_wood("ClinicTableWood"))
    cylinder("ClinicBottle", (-0.55, 1.20, 0.93), 0.06, 0.30,
             principled("BottleGlass", (0.22, 0.34, 0.32), 0.08, transmission=0.55), vertices=18)
    cylinder("ClinicCup", (-0.25, 1.35, 0.83), 0.075, 0.12,
             principled("ClinicCupMat", (0.30, 0.27, 0.22), 0.5), vertices=18)
    # a hanging bulb and a curtain at the right edge
    cylinder("ClinicBulbCord", (1.55, 0.8, 2.55), 0.006, 1.2, steel("CordSteel"), vertices=6)
    sphere("ClinicBulb", (1.55, 0.8, 1.92), 0.10,
           emission("ClinicBulbGlow", (1.0, 0.62, 0.28), 2.8), segments=16, rings=10)
    point_lamp("ClinicBulbLight", (1.55, 0.8, 1.90), 34, (1.0, 0.58, 0.24), 0.12)
    for i in range(8):
        cube(f"ClinicCurtain-{i}", (2.65, -1.4 + i * 0.26, 1.78),
             (0.04, 0.20, 1.65), principled(f"ClinicCurtainMat-{i}", (0.26, 0.30, 0.28), 0.95))
    camera((-1.8, -5.2, 1.5), (0.2, 2.3, 1.3), lens=40, fstop=2.4)
    bpy.context.scene.view_settings.exposure = -0.9
    area("Moon", (0.8, 1.0, 3.2), (0, 3.0, 1.5), 90, 2.0, (0.24, 0.38, 0.58))
    area("BulbFill", (1.5, 0.8, 1.8), (0, 1.2, 1.0), 30, 0.5, (1.0, 0.55, 0.22))
    render(samples, width, height, out)

def scene_newspaper_desk(samples, width, height, out):
    reset()
    dark_world((0.0005, 0.0004, 0.0003))
    plane("Desk", (0, 0, 0), 8, dark_wood("NewsDeskWood"))
    cube("DeskBlotter", (0, 0, 0.004), (3.1, 2.0, 0.008),
         principled("BlotterLeather", (0.030, 0.024, 0.018), 0.78))
    paper = paper_material("NewsPaper", (0.66, 0.59, 0.45))
    cube("Newspaper", (0, 0, 0.012), (2.55, 1.75, 0.010), paper, rot=(0, 0, -0.02))
    ink = principled("NewsInk", (0.022, 0.018, 0.014), 0.62)
    text_obj("NewsKicker", "THE CITY EDITION", (-1.02, 0.64, 0.025), 0.050,
             mat=ink, align="LEFT")
    text_obj("NewsHead", "BHOPAL", (-1.02, 0.38, 0.025), 0.235,
             mat=ink, align="LEFT")
    text_obj("NewsSub", "THE NIGHT THE GAS CAME", (-1.02, 0.12, 0.025), 0.070,
             mat=ink, align="LEFT")
    # column rules and body lines: a real front page, not a headline card
    for i in range(4):
        x = -1.04 + i * 0.66
        cube(f"NewsRule-{i}", (x, 0, 0.024), (0.008, 1.28, 0.002), ink)
    for i in range(7):
        cube(f"NewsLine-{i}", (-0.66 + (i % 2) * 0.60, 0.02 - (i // 2) * 0.07, 0.029),
             (0.36 - (i % 3) * 0.04, 0.006, 0.0017), ink)
    # typewriter, lamp, telephone and a cup
    typewriter = grime("Typewriter", (0.045, 0.045, 0.040), 0.55, 0.35)
    cube("TypewriterBase", (1.55, 0.55, 0.10), (0.82, 0.58, 0.14), typewriter, rot=(0, 0, 0.04))
    cube("TypewriterBody", (1.55, 0.55, 0.24), (0.74, 0.48, 0.20), typewriter, rot=(0, 0, 0.04))
    for i in range(5):
        cylinder(f"TypeKey-{i}", (1.28 + i * 0.12, 0.31, 0.36), 0.028, 0.03,
                 aged_brass("TypeKeyBrass"), rot=(math.pi / 2, 0, 0), vertices=12)
    cube("TypePaper", (1.55, 0.61, 0.44), (0.58, 0.32, 0.006), paper, rot=(0.20, 0, 0.04))
    cylinder("NewsLampBase", (-1.65, -0.62, 0.12), 0.16, 0.24, aged_brass("NewsLampBrass"), vertices=24)
    cylinder("NewsLampStem", (-1.65, -0.62, 0.30), 0.024, 0.26, aged_brass("NewsLampBrass"), vertices=12)
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.24, radius2=0.09,
                                  depth=0.20, location=(-1.65, -0.62, 0.46))
    assign(bpy.context.object, grime("NewsShade", (0.045, 0.032, 0.020), 0.48, 0.45))
    cylinder("NewsLampGlow", (-1.65, -0.62, 0.36), 0.16, 0.01,
             emission("NewsLampMat", (1.0, 0.52, 0.22), 0.9), vertices=24)
    point_lamp("NewsLampLight", (-1.65, -0.62, 0.35), 20, (1.0, 0.54, 0.24), 0.16)
    cube("NewsPhone", (1.55, -0.58, 0.10), (0.52, 0.36, 0.09),
         principled("NewsPhoneMat", (0.040, 0.035, 0.030), 0.55))
    cube("NewsHandset", (1.55, -0.58, 0.18), (0.48, 0.13, 0.08),
         principled("NewsHandsetMat", (0.030, 0.026, 0.022), 0.5))
    cylinder("NewsCup", (0.95, -0.76, 0.10), 0.09, 0.16,
             principled("NewsCupMat", (0.24, 0.20, 0.15), 0.5), vertices=20)
    # an ashtray with a single unlit cigarette (no smoke, no body)
    cylinder("Ashtray", (0.55, -0.90, 0.035), 0.14, 0.05,
             principled("AshtrayMat", (0.10, 0.10, 0.10), 0.4), vertices=20)
    cube("Cigarette", (0.52, -0.90, 0.063), (0.16, 0.018, 0.018),
         paper_material("CigarettePaper", (0.62, 0.54, 0.40)), rot=(0, 0, 0.4))
    # the year is not decoration; it is the cut
    text_obj("NewsYear", "1984", (1.47, 0.02, 0.031), 0.160, mat=ink, align="CENTER")
    camera((0.0, -3.2, 2.65), (0.0, 0.0, 0.10), lens=40, fstop=2.1)
    bpy.context.scene.view_settings.exposure = -0.75
    area("Key", (-1.0, -1.8, 3.6), (0, 0, 0.10), 220, 1.6, (1.0, 0.64, 0.34))
    area("Rim", (1.8, 1.2, 2.2), (0, 0, 0.10), 100, 1.4, (0.36, 0.56, 0.78))
    render(samples, width, height, out)


def scene_courtroom(samples, width, height, out):
    reset()
    dark_world((0.0006, 0.0005, 0.0004))
    plane("Floor", (0, 0, 0), 20, dark_wood("CourtFloorWood"))
    wall = plaster_material("CourtWall", (0.24, 0.20, 0.15))
    court_wood = principled("CourtWood", (0.16, 0.085, 0.040), roughness=0.55)
    cube("CourtBackWall", (0, 6.0, 2.2), (12.0, 0.30, 4.4), wall)
    for side in (-1, 1):
        cube(f"CourtSideWall-{side}", (side * 5.8, 2.0, 2.2), (0.30, 8.0, 4.4), wall)
    # raised bench, empty
    cube("CourtBench", (0, 4.7, 1.15), (7.2, 1.8, 2.3), court_wood)
    cube("CourtBenchTop", (0, 4.0, 2.30), (7.4, 2.1, 0.18), court_wood)
    cube("CourtBenchFront", (0, 3.55, 1.35), (7.2, 0.18, 2.7), court_wood)
    # witness box, clerk table, empty chairs
    cube("WitnessBox", (-3.2, 3.2, 0.65), (1.5, 1.4, 1.3), court_wood)
    cube("ClerkTable", (2.8, 3.1, 0.72), (2.6, 1.2, 0.14), court_wood)
    for side in (-1, 1):
        cube(f"ClerkLeg-{side}", (2.8 + side * 1.1, 3.1, 0.36), (0.12, 0.12, 0.72),
             court_wood)
    for i in range(3):
        cube(f"CourtChairSeat-{i}", (-2.4 + i * 2.4, 1.6, 0.48), (1.1, 1.0, 0.08),
             court_wood)
        cube(f"CourtChairBack-{i}", (-2.4 + i * 2.4, 1.15, 0.98), (1.1, 0.10, 1.0),
             court_wood)
    # the scales: a thin brass beam, two pans, a central column
    brass_mat = aged_brass("CourtBrass")
    cylinder("ScalesBase", (2.3, 3.0, 0.95), 0.26, 0.12, brass_mat, vertices=24)
    cylinder("ScalesColumn", (2.3, 3.0, 1.42), 0.045, 0.95, brass_mat, vertices=16)
    cube("ScalesBeam", (2.3, 3.0, 1.90), (1.45, 0.06, 0.055), brass_mat)
    for side in (-1, 1):
        cube(f"ScalesChain-{side}", (2.3 + side * 0.66, 3.0, 1.62),
             (0.018, 0.018, 0.55), brass_mat)
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=24, radius=0.25, depth=0.06,
            location=(2.3 + side * 0.66, 3.0, 1.34)
        )
        assign(bpy.context.object, brass_mat)
    # ceiling fan, files and a tall window
    cylinder("FanRod", (0, 2.0, 4.25), 0.035, 0.9, steel("FanSteel"), vertices=8)
    cylinder("FanHub", (0, 2.0, 3.72), 0.20, 0.16, steel("FanSteel"), vertices=20)
    for i in range(3):
        a = i * math.tau / 3
        cube(f"FanBlade-{i}", (math.sin(a) * 0.65, 2.0 + math.cos(a) * 0.65, 3.72),
             (0.16, 1.2, 0.035), steel("FanBladeSteel"), rot=(0, 0, a))
    cube("CourtWindow", (0, 5.82, 2.6), (2.0, 0.04, 1.9),
         emission("CourtWindowGlow", (0.22, 0.32, 0.46), 0.30))
    for i in range(4):
        cube(f"CourtWindowBar-{i}", (-0.8 + i * 0.53, 5.80, 2.6), (0.035, 0.05, 1.95),
             court_wood)
    for i in range(6):
        cube(f"CourtFile-{i}", (1.55 + (i % 3) * 0.16, 3.1 + (i // 3) * 0.22, 0.82 + (i % 2) * 0.03),
             (0.34, 0.24, 0.035), paper_material(f"CourtFilePaper-{i}", (0.52, 0.45, 0.32)),
             rot=(0, 0, 0.06 * (i % 3)))
    # an empty dock at the right, with a rail and a plain chair
    cube("DockRail", (4.35, 2.1, 1.05), (0.10, 2.5, 0.08), brass_mat)
    for i in range(4):
        cube(f"DockPost-{i}", (4.35, 1.0 + i * 0.75, 0.62), (0.07, 0.07, 1.24), brass_mat)
    cube("DockChair", (4.35, 2.1, 0.55), (0.75, 0.75, 0.08), court_wood)
    camera((5.5, -6.8, 2.4), (0.0, 4.2, 1.8), lens=35, fstop=4.2)
    bpy.context.scene.view_settings.exposure = -0.30
    area("Key", (-3.0, -2.0, 5.2), (0, 3.0, 1.8), 700, 4.0, (0.52, 0.66, 0.80))
    area("Warm", (4.0, 4.0, 3.6), (0, 3.0, 1.6), 380, 2.6, (1.0, 0.47, 0.16))
    area("Fill", (0.0, -4.0, 1.5), (0, 3.0, 1.2), 160, 3.0, (0.40, 0.50, 0.64))
    render(samples, width, height, out)


def scene_court_ledger(samples, width, height, out):
    reset()
    dark_world((0.0005, 0.0004, 0.0003))
    plane("Desk", (0, 0, 0), 7, dark_wood("LedgerDesk"))
    paper = paper_material("LedgerPaper", (0.66, 0.57, 0.41))
    cube("LedgerBook", (0, 0, 0.020), (2.30, 1.55, 0.035), paper, rot=(0, 0, 0.02))
    cube("LedgerSpine", (-1.14, 0, 0.032), (0.12, 1.58, 0.045),
         principled("LedgerLeather", (0.075, 0.030, 0.018), 0.62))
    ink = principled("LedgerInk", (0.020, 0.016, 0.012), 0.62)
    red = principled("LedgerRed", (0.34, 0.025, 0.014), 0.66)
    text_obj("LedgerHead", "IN THE SUPREME COURT OF INDIA", (-0.98, 0.56, 0.045), 0.060,
             mat=ink, align="LEFT")
    text_obj("LedgerCase", "BHOPAL GAS LEAK CASE", (-0.98, 0.40, 0.045), 0.088,
             mat=ink, align="LEFT")
    text_obj("LedgerSettlement", "SETTLEMENT", (-0.98, 0.10, 0.045), 0.160,
             mat=ink, align="LEFT")
    text_obj("LedgerAmount", "$470,000,000", (-0.98, -0.14, 0.045), 0.150,
             mat=red, align="LEFT")
    text_obj("LedgerYear", "1989", (0.84, -0.48, 0.047), 0.115, mat=ink, align="CENTER")
    for i in range(9):
        cube(f"LedgerLine-{i}", (0.22, 0.28 - i * 0.055, 0.043),
             (0.66 - (i % 3) * 0.06, 0.006, 0.0018), ink)
    # stamp block, pen, gavel and a file stack
    cube("LedgerStamp", (1.28, 0.52, 0.08), (0.24, 0.16, 0.06),
         dark_wood("LedgerStampWood"), rot=(0, 0, -0.2))
    cylinder("LedgerStampHandle", (1.28, 0.52, 0.17), 0.055, 0.14,
             dark_wood("LedgerStampWood"), vertices=16)
    # A circular court seal on the page. The edit iris opens from this mark,
    # not from an empty sheet: the paper becomes the seal becomes the court.
    seal = principled("LedgerSealRed", (0.46, 0.030, 0.020), 0.58)
    cylinder("LedgerSealDisc", (0.52, -0.34, 0.045), 0.165, 0.0025, seal, vertices=48)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.128, minor_radius=0.007,
                                     major_segments=48, minor_segments=8,
                                     location=(0.52, -0.34, 0.048))
    assign(bpy.context.object, seal)
    text_obj("LedgerSealYear", "1989", (0.52, -0.34, 0.050), 0.038, mat=seal, align="CENTER")
    cube("LedgerPen", (-0.42, -0.62, 0.052), (0.40, 0.025, 0.016),
         principled("LedgerPenInk", (0.012, 0.010, 0.008), 0.35), rot=(0, 0, 0.55))
    cube("GavelHead", (1.58, -0.38, 0.12), (0.42, 0.14, 0.14),
         dark_wood("GavelWood"), rot=(0, 0, 0.2))
    cylinder("GavelHandle", (1.58, -0.52, 0.12), 0.035, 0.44,
             dark_wood("GavelWood"), rot=(math.pi / 2, 0, 0.2), vertices=12)
    for i in range(4):
        cube(f"LedgerFile-{i}", (-1.35 + i * 0.03, -0.45 + i * 0.02, 0.030 + i * 0.012),
             (0.45, 0.32, 0.010), paper, rot=(0, 0, i * 0.03))
    # a lamp at the edge, exactly enough light to read the amount
    cylinder("LedgerLampBase", (-1.55, 0.72, 0.12), 0.15, 0.24,
             aged_brass("LedgerLampBrass"), vertices=24)
    cylinder("LedgerLampStem", (-1.55, 0.72, 0.30), 0.022, 0.26,
             aged_brass("LedgerLampBrass"), vertices=12)
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.23, radius2=0.08,
                                  depth=0.19, location=(-1.55, 0.72, 0.46))
    assign(bpy.context.object, grime("LedgerShade", (0.045, 0.032, 0.020), 0.48, 0.45))
    cylinder("LedgerLampGlow", (-1.55, 0.72, 0.36), 0.16, 0.01,
             emission("LedgerLampMat", (1.0, 0.52, 0.21), 0.9), vertices=24)
    point_lamp("LedgerLampLight", (-1.55, 0.72, 0.35), 20, (1.0, 0.54, 0.23), 0.16)
    camera((0.8, -3.2, 2.7), (0.0, 0, 0.1), lens=42, fstop=2.0)
    bpy.context.scene.view_settings.exposure = -0.85
    area("Key", (0.0, -1.8, 3.4), (0, 0, 0.05), 220, 1.5, (1.0, 0.63, 0.33))
    area("Rim", (1.8, 1.0, 1.8), (0, 0, 0.05), 80, 1.2, (0.36, 0.56, 0.78))
    render(samples, width, height, out)


def scene_water_tap(samples, width, height, out):
    reset()
    night_sky((0.10, 0.035, 0.012), (0.001, 0.002, 0.004))
    plane("Ground", (0, 0, 0), 20, concrete("TapGround", (0.085, 0.080, 0.070)))
    wall = plaster_material("TapWall", (0.15, 0.135, 0.11))
    cube("TapWall", (0, 2.2, 1.6), (8.0, 0.35, 3.2), wall)
    cube("TapPlinth", (0, 2.0, 0.25), (8.0, 0.55, 0.50), concrete("TapPlinth", (0.10, 0.095, 0.085)))
    # a standpipe with a heavy, corroded tap
    st = steel("TapSteel", (0.10, 0.10, 0.095))
    pipe_run("TapPipe", [(-2.4, 2.0, 1.9), (-2.4, 1.4, 1.9), (-1.9, 1.4, 1.9)],
             0.13, rust("TapPipeRust"))
    cylinder("TapBody", (-1.65, 1.35, 1.55), 0.16, 0.72, rust("TapBodyRust"),
             rot=(0, 0, 0), vertices=20)
    pipe_run("TapSpout", [(-1.65, 1.35, 1.20), (-1.65, 1.35, 1.05),
                          (-1.65, 1.05, 1.05)], 0.09, rust("TapSpoutRust"))
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.25, minor_radius=0.035, major_segments=24, minor_segments=6,
        location=(-1.65, 1.35, 1.92), rotation=(0, 0, 0)
    )
    assign(bpy.context.object, rust("TapWheelRust"))
    for i in range(4):
        a = i * math.tau / 4
        cube(f"TapWheelSpoke-{i}", (-1.65 + math.cos(a) * 0.13, 1.35 + math.sin(a) * 0.13, 1.92),
             (0.35, 0.035, 0.035), rust("TapWheelRust"), rot=(0, 0, a))
    # bucket and a thin, toxic-looking puddle
    cylinder("Bucket", (-1.35, 0.75, 0.24), 0.30, 0.48, rust("BucketRust"), vertices=24)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.30, minor_radius=0.018, major_segments=24, minor_segments=6,
        location=(-1.35, 0.75, 0.48), rotation=(0, 0, 0)
    )
    assign(bpy.context.object, rust("BucketRust"))
    cylinder("PuddleToxic", (-1.45, 0.2, 0.012), 1.05, 0.008,
             principled("PuddleToxic", (0.08, 0.070, 0.025), 0.12, metallic=0.20), vertices=32)
    cylinder("PuddleToxicSmall", (-0.45, 0.55, 0.012), 0.45, 0.006,
             principled("PuddleToxic", (0.08, 0.070, 0.025), 0.12, metallic=0.20), vertices=24)
    # barrels at the edge and a warning sign
    for i in range(3):
        cylinder(f"Barrel-{i}", (-4.0 + i * 0.8, 0.9, 0.55), 0.30, 1.10,
                 rust(f"BarrelRust-{i}"), vertices=20)
        for k in range(3):
            bpy.ops.mesh.primitive_torus_add(
                major_radius=0.30, minor_radius=0.018, major_segments=20, minor_segments=5,
                location=(-4.0 + i * 0.8, 0.9, 0.20 + k * 0.34)
            )
            assign(bpy.context.object, steel("BarrelBandSteel"))
    cube("TapSign", (-0.55, 1.98, 2.35), (1.45, 0.03, 0.55),
         paper_material("TapSignPaper", (0.56, 0.46, 0.30)))
    text_obj("TapSignText", "DO NOT DRINK", (-1.20, 1.95, 2.45), 0.10,
             rot=(math.pi / 2, 0, 0), mat=principled("TapSignInk", (0.05, 0.030, 0.018), 0.8), align="LEFT")
    point_lamp("TapLight", (1.2, 0.7, 2.8), 80, (0.80, 0.85, 0.75), 0.30)
    camera((-0.4, -4.8, 1.5), (-0.8, 1.2, 1.45), lens=36, fstop=2.4)
    bpy.context.scene.view_settings.exposure = -0.55
    area("Key", (0.0, -1.5, 3.2), (0, 1.5, 1.4), 210, 2.2, (0.58, 0.70, 0.70))
    area("Warm", (1.8, 1.0, 2.2), (0, 1.5, 1.3), 90, 1.1, (1.0, 0.46, 0.14))
    render(samples, width, height, out)


def scene_sample_jar(samples, width, height, out):
    reset()
    dark_world((0.0004, 0.0004, 0.0003))
    plane("Bench", (0, 0, 0), 6, concrete("LabBench", (0.070, 0.075, 0.072)))
    # a glass jar with a murky sample, a label and a pipette
    glass = principled("JarGlass", (0.34, 0.42, 0.40), 0.04, transmission=0.85)
    # An open-ended tube reads as glass; a solid cylinder reads as a can.
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=48, radius=0.34, depth=0.78, end_fill_type="NOTHING",
        location=(0, 0, 0.42)
    )
    jar = bpy.context.object
    jar.name = "JarBody"
    smooth(jar)
    assign(jar, glass)
    cylinder("JarBottom", (0, 0, 0.035), 0.34, 0.03, glass, vertices=48)
    cylinder("JarShoulder", (0, 0, 0.82), 0.32, 0.06, glass, vertices=40)
    cylinder("JarNeck", (0, 0, 0.90), 0.22, 0.12, glass, vertices=32)
    cylinder("JarLid", (0, 0, 0.98), 0.24, 0.08, steel("JarLidSteel"), vertices=32)
    liquid = principled("SampleLiquid", (0.16, 0.12, 0.030), 0.22, transmission=0.15)
    cylinder("SampleLiquid", (0, 0, 0.36), 0.305, 0.58, liquid, vertices=40)
    # label on the front of the jar
    cube("JarLabel", (0, -0.335, 0.42), (0.32, 0.01, 0.22),
         paper_material("JarLabelPaper", (0.64, 0.58, 0.43)))
    text_obj("JarLabelTop", "BHOPAL", (0, -0.345, 0.48), 0.040,
             rot=(math.pi / 2, 0, 0), mat=principled("JarInk", (0.03, 0.025, 0.02), 0.7), align="CENTER")
    text_obj("JarLabelBottom", "WATER SAMPLE", (0, -0.345, 0.41), 0.020,
             rot=(math.pi / 2, 0, 0), mat=principled("JarInk", (0.03, 0.025, 0.02), 0.7), align="CENTER")
    # a second, smaller vial, a pipette and a notebook
    cylinder("Vial", (0.80, 0.15, 0.20), 0.09, 0.40, glass, vertices=24)
    cylinder("VialLiquid", (0.80, 0.15, 0.15), 0.075, 0.26, liquid, vertices=24)
    cylinder("VialCap", (0.80, 0.15, 0.42), 0.10, 0.06, steel("VialCapSteel"), vertices=20)
    cylinder("Pipette", (-0.75, -0.10, 0.10), 0.018, 0.80,
             glass, rot=(0, 0, 0.10), vertices=12)
    cube("LabNotebook", (0.80, -0.35, 0.035), (0.62, 0.46, 0.06),
         paper_material("LabPaper", (0.56, 0.50, 0.37)), rot=(0, 0, -0.12))
    for i in range(5):
        cube(f"LabLine-{i}", (0.55, -0.35 - i * 0.055, 0.067), (0.34, 0.005, 0.002),
             principled("LabInk", (0.02, 0.018, 0.014), 0.7), rot=(0, 0, -0.12))
    # a lamp behind the jar makes the glass edge and the liquid glow
    cylinder("LabLampBase", (1.65, 0.60, 0.12), 0.15, 0.24, aged_brass("LabLampBrass"), vertices=24)
    cylinder("LabLampStem", (1.65, 0.60, 0.30), 0.022, 0.26, aged_brass("LabLampBrass"), vertices=12)
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.23, radius2=0.08,
                                  depth=0.19, location=(1.65, 0.60, 0.46))
    assign(bpy.context.object, grime("LabShade", (0.045, 0.032, 0.020), 0.48, 0.45))
    cylinder("LabLampGlow", (1.65, 0.60, 0.36), 0.16, 0.01,
             emission("LabLampMat", (1.0, 0.52, 0.22), 0.9), vertices=24)
    point_lamp("LabLampLight", (1.65, 0.60, 0.35), 18, (1.0, 0.54, 0.23), 0.15)
    camera((0.0, -3.8, 1.55), (0, 0, 0.42), lens=55, fstop=1.8)
    bpy.context.scene.view_settings.exposure = -0.7
    area("Key", (-1.2, -1.8, 3.0), (0, 0, 0.45), 170, 1.2, (0.62, 0.76, 0.88))
    area("Rim", (1.6, 1.0, 1.7), (0, 0, 0.45), 100, 0.8, (1.0, 0.48, 0.16))
    render(samples, width, height, out)


def scene_memorial_wall(samples, width, height, out):
    reset()
    dark_world((0.0004, 0.0003, 0.0003))
    plane("Floor", (0, 0, 0), 12, stone_material("MemorialFloor", (0.045, 0.040, 0.035)))
    wall = stone_material("MemorialWallStone", (0.065, 0.060, 0.052))
    cube("MemorialWall", (0, 3.4, 1.8), (10.0, 0.40, 3.6), wall)
    for side in (-1, 1):
        cube(f"MemorialPier-{side}", (side * 4.4, 2.8, 1.8), (0.55, 1.2, 3.6), wall)
    # plaques, each a name-sized rectangle; no readable personal names invented
    for row in range(4):
        for col in range(8):
            x = -3.7 + col * 1.05
            z = 1.0 + row * 0.60
            cube(f"Plaque-{row}-{col}", (x, 3.16, z), (0.76, 0.035, 0.30),
                 aged_brass(f"PlaqueMat-{row}-{col}"))
            for line in range(2):
                cube(f"PlaqueLine-{row}-{col}-{line}", (x - 0.26, 3.13, z + 0.06 - line * 0.10),
                     (0.38 - line * 0.10, 0.006, 0.014),
                     principled(f"PlaqueInk-{row}-{col}-{line}", (0.020, 0.018, 0.014), 0.8))
    text_obj("MemorialTitle", "BHOPAL", (0, 3.12, 3.25), 0.34,
             rot=(math.pi / 2, 0, 0), mat=aged_brass("MemorialTitleBrass"), align="CENTER")
    text_obj("MemorialYear", "1984", (0, 3.12, 2.92), 0.20,
             rot=(math.pi / 2, 0, 0), mat=aged_brass("MemorialYearBrass"), align="CENTER")
    # marigolds and candles on the ledge
    ledge = concrete("MemorialLedge", (0.10, 0.095, 0.085))
    cube("MemorialLedge", (0, 2.8, 0.64), (9.0, 0.55, 0.16), ledge)
    rng = random.Random(123)
    for i in range(18):
        sphere(f"Marigold-{i}", (-3.2 + i * 0.36, 2.55 + rng.uniform(-0.1, 0.1), 0.78),
               rng.uniform(0.035, 0.065),
               principled(f"MarigoldMat-{i}", (0.55, 0.16, 0.012), 0.85), segments=10, rings=6)
    for i in range(5):
        cylinder(f"Candle-{i}", (-2.4 + i * 1.2, 2.55, 0.82), 0.045, 0.20,
                 paper_material(f"CandleWax-{i}", (0.55, 0.46, 0.30)), vertices=16)
        flame(f"CandleFlame-{i}", (-2.4 + i * 1.2, 2.55, 0.93), 0.38)
    point_lamp("MemorialWarm", (0, 2.0, 1.5), 34, (1.0, 0.42, 0.10), 0.5)
    camera((0.5, -5.2, 1.55), (0, 2.8, 1.55), lens=42, fstop=2.6)
    bpy.context.scene.view_settings.exposure = -0.9
    area("Key", (-2.0, -2.0, 3.0), (0, 2.8, 1.8), 120, 2.0, (0.44, 0.56, 0.72))
    area("Warm", (0.0, 2.0, 1.2), (0, 2.8, 1.0), 70, 1.2, (1.0, 0.42, 0.10))
    render(samples, width, height, out)


def scene_memorial_flame(samples, width, height, out):
    reset()
    dark_world((0.0003, 0.0002, 0.0002))
    plane("Stone", (0, 0, 0), 4, stone_material("FlameStone", (0.045, 0.040, 0.035)))
    brass_mat = aged_brass("FlameBrass")
    cylinder("FlameBowl", (0, 0, 0.26), 0.56, 0.18, brass_mat, vertices=48)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.55, minor_radius=0.035, major_segments=48, minor_segments=8,
        location=(0, 0, 0.36)
    )
    assign(bpy.context.object, brass_mat)
    cylinder("FlameBase", (0, 0, 0.10), 0.42, 0.20, brass_mat, vertices=40)
    # a single flame behind a low glass wind-ring, never a glowing enclosure
    flame("MemorialFlame", (0, 0, 0.38), 2.4)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.60, minor_radius=0.035, major_segments=48, minor_segments=8,
        location=(0, 0, 0.43)
    )
    glass = bpy.context.object
    glass.name = "FlameGlassRing"
    assign(glass, principled("FlameGlassMat", (0.20, 0.26, 0.26), 0.05, transmission=0.78))
    # petals on the stone
    rng = random.Random(200)
    for i in range(16):
        a = rng.uniform(0, math.tau)
        r = rng.uniform(0.70, 1.35)
        sphere(f"FlamePetal-{i}", (math.cos(a) * r, math.sin(a) * r, 0.025),
               rng.uniform(0.025, 0.050),
               principled(f"FlamePetalMat-{i}", (0.48, 0.13, 0.010), 0.85), segments=10, rings=6)
    point_lamp("FlameWarm", (0, 0, 0.66), 9, (1.0, 0.40, 0.08), 0.18)
    camera((0.35, -2.2, 0.88), (0, 0, 0.55), lens=60, fstop=1.8)
    bpy.context.scene.view_settings.exposure = -0.35
    area("FlameFill", (0.0, -1.2, 1.5), (0, 0, 0.60), 28, 0.8, (1.0, 0.42, 0.10))
    render(samples, width, height, out)


def scene_archive(samples, width, height, out):
    reset()
    dark_world((0.0004, 0.0003, 0.0003))
    plane("Floor", (0, 0, 0), 10, concrete("ArchiveFloor", (0.055, 0.052, 0.048)))
    wall = concrete("ArchiveWall", (0.10, 0.095, 0.085))
    cube("ArchiveBack", (0, 3.2, 1.8), (9.0, 0.30, 3.6), wall)
    st = steel("ArchiveSteel", (0.055, 0.055, 0.052))
    for side in (-1, 1):
        for shelf in range(4):
            cube(f"Shelf-{side}-{shelf}", (side * 3.3, 1.2, 0.35 + shelf * 0.78),
                 (5.0, 1.4, 0.06), st)
        for post in range(3):
            cube(f"ShelfPost-{side}-{post}", (side * 3.3, 0.5 + post * 0.7, 1.7),
                 (0.06, 0.06, 3.4), st)
    # archive boxes, some with visible labels
    rng = random.Random(301)
    for side in (-1, 1):
        for shelf in range(4):
            for i in range(5):
                if rng.random() < 0.18:
                    continue
                x = side * 3.3 + (i - 2) * 0.92
                z = 0.44 + shelf * 0.78
                cube(f"Box-{side}-{shelf}-{i}", (x, 1.2, z + 0.18),
                     (0.72, 0.60, 0.34),
                     paper_material(f"BoxMat-{side}-{shelf}-{i}", (0.38, 0.30, 0.20)))
                cube(f"BoxLabel-{side}-{shelf}-{i}", (x, 0.88, z + 0.20),
                     (0.32, 0.01, 0.16),
                     paper_material(f"BoxLabelPaper-{side}-{shelf}-{i}", (0.62, 0.55, 0.40)))
    # a reading table in the middle, with one open file and a lamp
    cube("ArchiveTable", (0, 1.0, 0.72), (3.4, 1.8, 0.10), dark_wood("ArchiveTableWood"))
    for side in (-1, 1):
        cube(f"ArchiveTableLeg-{side}", (side * 1.5, 1.0, 0.36), (0.12, 1.6, 0.72),
             dark_wood("ArchiveTableWood"))
    cube("ArchiveFile", (0, 1.0, 0.79), (1.1, 0.8, 0.025),
         paper_material("ArchivePaper", (0.56, 0.49, 0.36)), rot=(0, 0, 0.04))
    ink = principled("ArchiveInk", (0.02, 0.018, 0.014), 0.7)
    text_obj("ArchiveTitle", "BHOPAL", (-0.40, 0.85, 0.81), 0.100, mat=ink, align="LEFT")
    text_obj("ArchiveSub", "CLAIMS 1984-2026", (-0.40, 0.72, 0.81), 0.035, mat=ink, align="LEFT")
    for i in range(5):
        cube(f"ArchiveLine-{i}", (-0.10, 0.94 - i * 0.05, 0.81), (0.58, 0.006, 0.002), ink)
    cylinder("ArchiveLampBase", (1.40, 0.55, 0.85), 0.12, 0.18, aged_brass("ArchiveLampBrass"), vertices=20)
    cylinder("ArchiveLampStem", (1.40, 0.55, 0.98), 0.018, 0.20, aged_brass("ArchiveLampBrass"), vertices=10)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.20, radius2=0.07,
                                  depth=0.16, location=(1.40, 0.55, 1.12))
    assign(bpy.context.object, grime("ArchiveShade", (0.045, 0.032, 0.020), 0.48, 0.45))
    cylinder("ArchiveLampGlow", (1.40, 0.55, 1.04), 0.14, 0.01,
             emission("ArchiveLampMat", (1.0, 0.52, 0.22), 0.8), vertices=24)
    point_lamp("ArchiveLampLight", (1.40, 0.55, 1.03), 17, (1.0, 0.54, 0.23), 0.14)
    camera((0.0, -4.8, 1.75), (0, 1.6, 1.35), lens=38, fstop=3.0)
    bpy.context.scene.view_settings.exposure = -0.95
    area("Key", (-2.0, -2.0, 3.0), (0, 1.5, 1.4), 180, 2.4, (0.54, 0.66, 0.80))
    area("Warm", (1.0, 1.0, 1.5), (0, 1.5, 1.2), 80, 0.8, (1.0, 0.48, 0.16))
    render(samples, width, height, out)


def scene_siren(samples, width, height, out):
    reset()
    night_sky((0.16, 0.050, 0.014), (0.001, 0.003, 0.008))
    plane("Roof", (0, 0, 0), 12, concrete("SirenRoof", (0.070, 0.065, 0.058)))
    cube("SirenParapet", (0, 0.8, 0.35), (8.0, 0.3, 0.7), concrete("SirenParapet", (0.09, 0.082, 0.07)))
    st = steel("SirenSteel", (0.08, 0.085, 0.085))
    cylinder("SirenPole", (-0.35, 1.5, 2.2), 0.10, 4.4, st, vertices=12)
    cylinder("SirenBase", (-0.35, 1.5, 0.05), 0.30, 0.10, st, vertices=16)
    # Braces must land on the roof. The first cut had three diagonal cubes
    # floating beside the pole, which read as broken geometry rather than a
    # support. Two limbs now meet the pole and the roof plate.
    limb("SirenBrace-L", (-0.35, 1.5, 0.62), (-1.18, 1.5, 0.02), 0.035, st, vertices=8)
    limb("SirenBrace-R", (-0.35, 1.5, 0.62), (0.48, 1.5, 0.02), 0.035, st, vertices=8)
    # The horn is an open flared bell, mounted clear of the pole so the mouth
    # reads from the camera. A solid cone with a capped wide end looks like a
    # dish, which is exactly what the first draft did.
    bpy.ops.mesh.primitive_cone_add(
        vertices=40, radius1=0.11, radius2=0.58, depth=1.15,
        end_fill_type='NOTHING', location=(0.55, 2.0, 4.55),
        rotation=(0, math.pi / 2, 0)
    )
    horn = bpy.context.object
    horn.name = "SirenHorn"
    smooth(horn)
    assign(horn, grime("SirenHornMat", (0.16, 0.145, 0.115), 0.58, 0.45))
    cylinder("SirenMotor", (-0.09, 2.0, 4.55), 0.155, 0.30, st,
             rot=(0, math.pi / 2, 0), vertices=24)
    cube("SirenBracket", (-0.22, 1.75, 4.55), (0.10, 0.55, 0.09), st)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.59, minor_radius=0.035, major_segments=40, minor_segments=7,
        location=(1.13, 2.0, 4.55), rotation=(0, math.pi / 2, 0)
    )
    assign(bpy.context.object, rust("SirenRimRust"))
    sphere("SirenBeacon", (-0.09, 2.0, 4.79), 0.08,
           emission("SirenBeaconGlow", (1.0, 0.05, 0.01), 5.0), segments=12, rings=8)
    point_lamp("SirenBeaconLight", (-0.09, 2.0, 4.79), 16, (1.0, 0.06, 0.01), 0.12)
    # distant city, kept low and soft so the horn owns the frame
    rng = random.Random(411)
    for i in range(18):
        x = -16 + i * 1.9
        h = 0.8 + rng.uniform(0, 2.4)
        cube(f"SirenCity-{i}", (x, 10.0 + (i % 3) * 2.0, h / 2), (1.6, 2.4, h),
             principled(f"SirenCityMat-{i}", (0.020, 0.019, 0.017), 0.96))
    dust(50, seed=412, zmax=4.0, ymax=14)
    camera((6.5, -8.0, 2.2), (0.2, 2.0, 4.1), lens=42, fstop=3.0)
    bpy.context.scene.view_settings.exposure = -0.25
    area("Moon", (-4.0, 1.0, 6.0), (0, 2.0, 3.8), 360, 5.0, (0.34, 0.46, 0.68))
    area("HornWarm", (1.0, 1.0, 2.0), (0, 2.0, 4.2), 220, 2.0, (1.0, 0.46, 0.14))
    area("HornRim", (4.0, 3.0, 5.0), (0, 2.0, 4.2), 300, 2.0, (0.40, 0.54, 0.74))
    area("HornFace", (4.2, -1.0, 6.2), (0.8, 2.0, 4.5), 260, 2.2, (0.55, 0.64, 0.80))
    area("RoofFill", (3.0, 0.0, 1.0), (0, 1.5, 1.0), 80, 2.0, (1.0, 0.46, 0.14))
    render(samples, width, height, out)


def scene_clock(samples, width, height, out):
    reset()
    dark_world((0.0004, 0.0003, 0.0002))
    plane("Desk", (0, 0, 0), 6, dark_wood("ClockDesk"))
    wall = plaster_material("ClockWall", (0.12, 0.10, 0.08))
    cube("ClockWall", (0, 1.8, 1.8), (7.0, 0.25, 3.6), wall)
    # the clock is the set: a large wall clock at 00:45
    cylinder("ClockBody", (0, 1.62, 2.15), 0.92, 0.26, aged_brass("ClockBodyBrass"),
             rot=(math.pi / 2, 0, 0), vertices=64)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.86, minor_radius=0.045, major_segments=64, minor_segments=8,
        location=(0, 1.45, 2.15), rotation=(math.pi / 2, 0, 0)
    )
    assign(bpy.context.object, aged_brass("ClockBezelBrass"))
    face = paper_material("ClockFacePaper", (0.66, 0.58, 0.42))
    cylinder("ClockFace", (0, 1.45, 2.15), 0.80, 0.015, face,
             rot=(math.pi / 2, 0, 0), vertices=64)
    ink = principled("ClockInk", (0.022, 0.018, 0.014), 0.62)
    red = principled("ClockRed", (0.34, 0.020, 0.010), 0.62)
    for i in range(12):
        a = i * math.tau / 12
        r0, r1 = (0.62, 0.72) if i % 3 == 0 else (0.66, 0.72)
        limb(f"ClockTick-{i}", (math.sin(a) * r0, 1.44, 2.15 + math.cos(a) * r0),
             (math.sin(a) * r1, 1.44, 2.15 + math.cos(a) * r1), 0.012, ink, vertices=6)
    text_obj("Clock12", "12", (0, 1.43, 2.73), 0.07, rot=(math.pi / 2, 0, 0), mat=ink, align="CENTER")
    text_obj("Clock6", "6", (0, 1.43, 1.57), 0.07, rot=(math.pi / 2, 0, 0), mat=ink, align="CENTER")
    text_obj("ClockBrand", "BHOPAL", (0, 1.43, 2.15), 0.07, rot=(math.pi / 2, 0, 0), mat=ink, align="CENTER")
    # hands: 00:45, the minute hand on the 9
    cube("ClockHourHand", (0, 1.42, 2.15 + 0.17), (0.028, 0.012, 0.34), ink,
         rot=(0, 0.26, 0))
    cube("ClockMinuteHand", (0, 1.41, 2.15), (0.020, 0.012, 0.64), red,
         rot=(0, -1.57, 0))
    cylinder("ClockPin", (0, 1.40, 2.15), 0.045, 0.02, red,
             rot=(math.pi / 2, 0, 0), vertices=20)
    # desk below: logbook, phone and a cup; the clock hangs above it
    paper = paper_material("ClockLogPaper", (0.56, 0.48, 0.34))
    cube("ClockLog", (0.10, -0.2, 0.74), (1.25, 0.85, 0.05), paper, rot=(0, 0, 0.05))
    text_obj("ClockLogText", "00:45", (0.10, -0.2, 0.77), 0.20, mat=red, align="CENTER")
    text_obj("ClockLogSub", "TANK 610", (0.10, -0.2, 0.64), 0.06, mat=ink, align="CENTER")
    cube("ClockDesk", (0, -0.2, 0.55), (2.4, 1.2, 0.10), dark_wood("ClockDeskWood"))
    cylinder("ClockPhone", (1.25, 0.10, 0.66), 0.22, 0.10, steel("ClockPhoneSteel"), vertices=24)
    cylinder("ClockCup", (-1.10, 0.10, 0.68), 0.09, 0.15,
             principled("ClockCupMat", (0.22, 0.18, 0.14), 0.5), vertices=20)
    camera((0.0, -4.5, 1.9), (0, 1.2, 1.85), lens=48, fstop=2.0)
    bpy.context.scene.view_settings.exposure = -0.75
    area("Key", (-1.2, -1.5, 3.2), (0, 1.2, 1.9), 150, 1.4, (1.0, 0.62, 0.32))
    area("Rim", (1.5, 1.0, 2.5), (0, 1.2, 2.0), 80, 1.0, (0.38, 0.54, 0.74))
    render(samples, width, height, out)

SCENES = {
    "plant-gate": scene_plant_gate,
    "tank-farm": scene_tank_farm,
    "tank-610": scene_tank_610,
    "gauge": scene_gauge,
    "valve": scene_valve,
    "flare": scene_flare,
    "control-panel": scene_control_panel,
    "pipe-corridor": scene_pipe_corridor,
    "company-sign": scene_company_sign,
    "city-rooftops": scene_city_rooftops,
    "street-lamp": scene_street_lamp,
    "hospital-corridor": scene_hospital_corridor,
    "clinic-window": scene_clinic_window,
    "newspaper-desk": scene_newspaper_desk,
    "courtroom": scene_courtroom,
    "court-ledger": scene_court_ledger,
    "water-tap": scene_water_tap,
    "sample-jar": scene_sample_jar,
    "memorial-wall": scene_memorial_wall,
    "memorial-flame": scene_memorial_flame,
    "archive": scene_archive,
    "siren": scene_siren,
    "clock": scene_clock,
}


def main() -> int:
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


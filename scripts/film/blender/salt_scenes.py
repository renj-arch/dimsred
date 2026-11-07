#!/usr/bin/env python3
"""Build the 3D plates for the Salt March film inside Blender.

This script is deliberately independent of any local machine. GitHub Actions
runs it with:

    blender -b --python scripts/film/blender/salt_scenes.py -- \
        --scene march --out out/film/salt-march/plates/march-wide.png \
        --width 1920 --height 1080 --samples 32

The look is stylised cinematic documentary, not photorealism: a white salt
flat, a low dawn sun, charcoal silhouettes, dust, and a very shallow depth of
field. Keeping the geometry procedural removes asset-licence risk and keeps the
render inside a CPU-only runner.
"""

from __future__ import annotations

import argparse
import math
import os
import random
import sys

import bpy
from mathutils import Vector


# ---------------------------------------------------------------------------
# scene helpers
# ---------------------------------------------------------------------------

def reset() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.materials, bpy.data.curves,
                       bpy.data.lights, bpy.data.cameras):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 6
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 3
    scene.cycles.transmission_bounces = 8
    scene.cycles.transparent_max_bounces = 8
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 18
    scene.render.resolution_percentage = 100
    scene.render.fps = 24
    try:
        scene.view_settings.view_transform = "AgX"
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    scene.view_settings.exposure = 0.0


def _set(node, names, value) -> None:
    for name in names:
        if name in node.inputs:
            node.inputs[name].default_value = value
            return


def principled(name: str, color, roughness=0.5, metallic=0.0, transmission=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    _set(bsdf, ("Base Color",), (*color, 1.0))
    _set(bsdf, ("Roughness",), roughness)
    _set(bsdf, ("Metallic",), metallic)
    if transmission:
        _set(bsdf, ("Transmission Weight", "Transmission"), transmission)
        _set(bsdf, ("IOR",), 1.54)
    return mat


def emission(name: str, color, strength=1.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    em = nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*color, 1.0)
    em.inputs["Strength"].default_value = strength
    links.new(em.outputs["Emission"], out.inputs["Surface"])
    return mat


def assign(obj, mat) -> None:
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def smooth(obj) -> None:
    for poly in obj.data.polygons:
        poly.use_smooth = True


def cube(name, loc, scale, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    return obj


def cylinder(name, loc, radius, depth, mat, rot=(0, 0, 0), vertices=10):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius,
                                        depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    assign(obj, mat)
    smooth(obj)
    return obj


def sphere(name, loc, radius, mat, segments=20, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings,
                                         radius=radius, location=loc)
    obj = bpy.context.object
    obj.name = name
    assign(obj, mat)
    smooth(obj)
    return obj


def ico(name, loc, radius, mat, subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions,
                                          radius=radius, location=loc)
    obj = bpy.context.object
    obj.name = name
    assign(obj, mat)
    smooth(obj)
    return obj


def plane(name, loc, size, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_plane_add(size=size, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    assign(obj, mat)
    return obj


def look_at(obj, target) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def camera(loc, target, lens=35, fstop=4.0, focus=None):
    bpy.ops.object.camera_add(location=loc)
    cam = bpy.context.object
    cam.name = "Camera"
    cam.data.lens = lens
    cam.data.sensor_width = 36
    cam.data.dof.use_dof = True
    cam.data.dof.aperture_fstop = fstop
    if focus is not None:
        cam.data.dof.focus_object = focus
    else:
        cam.data.dof.focus_distance = (Vector(target) - Vector(loc)).length
    look_at(cam, target)
    bpy.context.scene.camera = cam
    return cam


def area(name, loc, target, power, size, color):
    bpy.ops.object.light_add(type="AREA", location=loc)
    light = bpy.context.object
    light.name = name
    light.data.energy = power
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    look_at(light, target)
    return light


def dark_world(color=(0.0, 0.0, 0.0)):
    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (*color, 1.0)
        bg.inputs["Strength"].default_value = 1.0


def sky(top=(0.008, 0.025, 0.038), horizon=(0.30, 0.13, 0.055), bottom=(0.004, 0.007, 0.010)):
    dark_world((0.001, 0.0015, 0.0025))
    mat = bpy.data.materials.new("SkyGradient")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    em = nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = 1.0
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (*bottom, 1.0)
    ramp.color_ramp.elements[1].position = 0.48
    ramp.color_ramp.elements[1].color = (*horizon, 1.0)
    e = ramp.color_ramp.elements.new(0.54)
    e.color = (*top, 1.0)
    e = ramp.color_ramp.elements.new(1.0)
    e.color = (0.004, 0.006, 0.012, 1.0)
    sep = nodes.new("ShaderNodeSeparateXYZ")
    tex = nodes.new("ShaderNodeTexCoord")
    links.new(tex.outputs["Generated"], sep.inputs["Vector"])
    links.new(sep.outputs["Z"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], em.inputs["Color"])
    links.new(em.outputs["Emission"], out.inputs["Surface"])
    sphere("SkyDome", (0, 0, 0), 420, mat, segments=64, rings=32)
    # The camera is inside; backfaces must be visible.
    bpy.context.object.visible_shadow = False


def sun(loc=(-38, 105, 20), radius=5.0):
    mat = emission("SunEmission", (1.0, 0.42, 0.15), 18.0)
    obj = sphere("Sun", loc, radius, mat, segments=24, rings=16)
    obj.visible_shadow = False
    # A second, larger, dimmer disc makes the bloom feel photographic.
    glow = emission("SunGlow", (1.0, 0.34, 0.10), 2.5)
    sphere("SunGlow", loc, radius * 1.9, glow, segments=24, rings=16).visible_shadow = False


def dust(count=90, seed=7, zmax=2.6, ymax=55):
    rng = random.Random(seed)
    mat = principled("Dust", (0.72, 0.60, 0.44), roughness=0.8)
    for i in range(count):
        x = rng.uniform(-11, 11)
        y = rng.uniform(1, ymax)
        z = rng.uniform(0.05, zmax)
        r = rng.uniform(0.008, 0.030)
        ico(f"dust-{i:03d}", (x, y, z), r, mat, subdivisions=1)


def salt_material():
    mat = principled("Salt", (0.92, 0.88, 0.78), roughness=0.38, transmission=0.10)
    return mat


def figure(x, y, z=0.0, scale=1.0, cloth=(0.025, 0.022, 0.020),
           pose=0.0, staff=False, label="marcher"):
    """A low-poly silhouette. At 20-50 m the anatomy disappears into gesture."""
    body = principled(f"Cloth-{cloth[0]:.3f}-{cloth[1]:.3f}-{cloth[2]:.3f}",
                      cloth, roughness=0.72)
    skin = principled("SkinDark", (0.06, 0.035, 0.020), roughness=0.65)
    s = scale
    # torso
    cube(f"{label}-{x:.2f}-torso", (x, y, z + 1.02 * s),
         (0.34 * s, 0.22 * s, 0.62 * s), body)
    # head
    sphere(f"{label}-{x:.2f}-head", (x, y, z + 1.50 * s),
           0.115 * s, skin, segments=16, rings=10)
    # legs, split by the walking pose
    for side, sign in (("l", -1), ("r", 1)):
        angle = math.radians(pose * sign)
        cylinder(f"{label}-{x:.2f}-{side}leg",
                 (x + sign * 0.085 * s, y, z + 0.40 * s),
                 0.055 * s, 0.78 * s, body,
                 rot=(angle, 0, 0), vertices=8)
    # arms
    for side, sign in (("l", -1), ("r", 1)):
        angle = math.radians(-pose * sign * 0.8)
        cylinder(f"{label}-{x:.2f}-{side}arm",
                 (x + sign * 0.22 * s, y, z + 1.05 * s),
                 0.042 * s, 0.66 * s, body,
                 rot=(angle, 0, sign * math.radians(7)), vertices=8)
    if staff:
        cylinder(f"{label}-{x:.2f}-staff", (x + 0.29 * s, y + 0.02, z + 0.82 * s),
                 0.018 * s, 1.75 * s, principled("StaffWood", (0.11, 0.055, 0.025), 0.7),
                 rot=(math.radians(-3), math.radians(3), 0), vertices=8)


# ---------------------------------------------------------------------------
# scenes
# ---------------------------------------------------------------------------

def scene_march(samples: int, width: int, height: int, out: str) -> None:
    reset()
    sky((0.006, 0.020, 0.030), (0.34, 0.14, 0.055), (0.002, 0.004, 0.008))
    sun((-40, 180, 22), 5.5)

    salt = principled("SaltFlat", (0.70, 0.65, 0.54), roughness=0.86)
    # Cracked salt crust: large voronoi cells, very low contrast.
    nodes = salt.node_tree.nodes
    links = salt.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    tex = nodes.new("ShaderNodeTexCoord")
    vor = nodes.new("ShaderNodeTexVoronoi")
    vor.feature = "DISTANCE_TO_EDGE"
    vor.inputs["Scale"].default_value = 0.24
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.18, 0.15, 0.12, 1)
    ramp.color_ramp.elements[1].position = 0.10
    ramp.color_ramp.elements[1].color = (0.72, 0.67, 0.56, 1)
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.24
    bump.inputs["Distance"].default_value = 0.08
    links.new(tex.outputs["Object"], vor.inputs["Vector"])
    links.new(vor.outputs["Distance"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(vor.outputs["Distance"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

    plane("SaltFlat", (0, 70, 0), 360, salt)
    sea = principled("Sea", (0.008, 0.040, 0.055), roughness=0.13, metallic=0.15)
    plane("Sea", (0, 250, 0.015), 300, sea, rot=(0, 0, 0))

    # The line: close enough to read as people, far enough to become a thread.
    rng = random.Random(1930)
    march = []
    yy = 3.4
    for i in range(28):
        if i < 8:
            yy += rng.uniform(1.1, 1.8)
        elif i < 18:
            yy += rng.uniform(1.8, 3.0)
        else:
            yy += rng.uniform(2.8, 4.6)
        x = rng.uniform(-1.7, 1.7) + (0.0 if i % 2 else 0.55)
        s = rng.uniform(0.92, 1.08)
        pose = rng.choice([-14, -8, 0, 8, 14, 20])
        figure(x, yy, 0, s, pose=pose, staff=(i % 5 == 0), label=f"m{i:02d}")
        march.append((x, yy))

    dust(110, seed=1930, zmax=2.2, ymax=58)

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 12, 1.1))
    focus = bpy.context.object
    focus.name = "Focus"
    camera((0.4, -10.5, 0.72), (0, 25, 2.6), lens=32, fstop=3.2, focus=focus)
    # A touch of warm bounce from the salt; the sun is the key.
    area("WarmBounce", (-8, 2, 1.2), (0, 12, 1.0), 370, 5.0, (1.0, 0.52, 0.25))
    area("CoolRim", (12, 30, 9), (0, 18, 1.2), 900, 6.0, (0.35, 0.62, 0.85))

    render(samples, width, height, out)


def scene_crystal(samples: int, width: int, height: int, out: str) -> None:
    reset()
    dark_world((0.0005, 0.0007, 0.001))
    floor = principled("BlackStone", (0.006, 0.006, 0.008), roughness=0.18)
    plane("Stone", (0, 0, 0), 6, floor)

    glass = principled("Crystal", (0.85, 0.92, 0.96), roughness=0.07, transmission=0.88)
    salt = salt_material()
    rng = random.Random(12)
    for i in range(7):
        x = rng.uniform(-0.28, 0.28)
        y = rng.uniform(-0.20, 0.20)
        s = rng.uniform(0.07, 0.18)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, 0.04 + s * 0.6),
                                        rotation=(rng.uniform(0, 3.1), rng.uniform(0, 3.1),
                                                  rng.uniform(0, 3.1)))
        obj = bpy.context.object
        obj.scale = (s * rng.uniform(0.7, 1.2), s * rng.uniform(0.7, 1.2), s * 1.5)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        bevel = obj.modifiers.new("Bevel", "BEVEL")
        bevel.width = s * 0.10
        bevel.segments = 2
        assign(obj, glass if i % 2 else salt)
        smooth(obj)

    # A few loose grains for scale.
    for i in range(45):
        x = rng.uniform(-0.55, 0.55)
        y = rng.uniform(-0.45, 0.45)
        r = rng.uniform(0.003, 0.010)
        ico(f"grain-{i:02d}", (x, y, 0.004 + r), r, salt, subdivisions=1)

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0.14))
    focus = bpy.context.object
    focus.name = "Focus"
    camera((0.82, -1.25, 0.52), (0, 0, 0.14), lens=95, fstop=2.8, focus=focus)
    area("Key", (1.2, -1.4, 2.2), (0, 0, 0.15), 420, 1.2, (1.0, 0.58, 0.30))
    area("Rim", (-1.6, 1.3, 1.4), (0, 0, 0.12), 360, 1.0, (0.35, 0.66, 0.95))
    area("Fill", (0, -2.0, 0.5), (0, 0, 0.12), 60, 2.0, (0.5, 0.55, 0.65))
    render(samples, width, height, out)


def scene_dandi(samples: int, width: int, height: int, out: str) -> None:
    reset()
    sky((0.01, 0.03, 0.045), (0.38, 0.18, 0.08), (0.004, 0.008, 0.012))
    sun((-14, 24, 7), 1.4)
    mud = principled("WetMud", (0.045, 0.030, 0.020), roughness=0.24)
    plane("Mud", (0, 0, 0), 30, mud)
    water = principled("WetSheen", (0.01, 0.025, 0.030), roughness=0.08, metallic=0.1)
    plane("Water", (0, 2.4, 0.006), 30, water)
    sea = emission("DandiSea", (0.03, 0.08, 0.10), 0.4)
    plane("DandiSea", (0, 5.2, 0.01), 40, sea)

    salt = salt_material()
    rng = random.Random(6)
    for i in range(12):
        x = rng.uniform(-0.22, 0.22)
        y = rng.uniform(-0.16, 0.16)
        s = rng.uniform(0.025, 0.085)
        obj = ico(f"salt-{i:02d}", (x, y, 0.03 + s * 0.5), s, salt, subdivisions=2)
        obj.scale = (rng.uniform(0.8, 1.4), rng.uniform(0.8, 1.4), rng.uniform(1.0, 1.8))

    wood = principled("StaffWood", (0.095, 0.045, 0.020), roughness=0.75)
    cylinder("Staff", (0.34, 0.12, 1.05), 0.025, 2.2, wood,
             rot=(math.radians(-8), math.radians(5), 0), vertices=10)
    # An out-of-focus arm/hand silhouette at the top right: the gesture, not a
    # detailed hand. This avoids a plastic-looking model in a macro shot.
    arm = principled("ArmSilhouette", (0.012, 0.008, 0.006), roughness=0.65)
    arm_obj = sphere("Arm", (0.55, -0.18, 0.55), 0.22, arm, segments=20, rings=12)
    arm_obj.scale = (0.55, 0.42, 1.5)
    arm_obj.rotation_euler = (math.radians(28), math.radians(18), math.radians(-12))

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0.08))
    focus = bpy.context.object
    focus.name = "Focus"
    camera((0.32, -0.78, 0.34), (0, 0, 0.10), lens=85, fstop=2.2, focus=focus)
    area("Key", (-1.4, -1.0, 1.8), (0, 0, 0.1), 260, 1.0, (1.0, 0.48, 0.22))
    area("Rim", (1.1, 1.2, 0.9), (0, 0, 0.1), 180, 0.8, (0.42, 0.72, 1.0))
    render(samples, width, height, out)


def scene_dharasana(samples: int, width: int, height: int, out: str) -> None:
    reset()
    sky((0.32, 0.38, 0.40), (0.72, 0.58, 0.40), (0.18, 0.16, 0.14))
    sun((18, 26, 22), 3.0)
    ground = principled("DustGround", (0.30, 0.24, 0.17), roughness=0.92)
    plane("Ground", (0, 20, 0), 90, ground)
    # Two lines: volunteers in white, police in khaki. No gore, no spectacle.
    white = (0.72, 0.68, 0.58)
    khaki = (0.22, 0.18, 0.10)
    for i in range(9):
        x = (i - 4) * 0.72
        figure(x, 9.0 + (i % 2) * 0.5, 0, 0.98, cloth=white, pose=0, label="vol")
    for i in range(7):
        x = (i - 3) * 0.76
        figure(x, 14.2 + (i % 2) * 0.4, 0, 1.02, cloth=khaki, pose=0, label="pol")
    # A fallen cap in the empty space.
    cap = principled("Cap", (0.16, 0.13, 0.08), roughness=0.85)
    cylinder("FallenCap", (0.1, 5.6, 0.035), 0.14, 0.05, cap, rot=(0, 0, 0), vertices=16)
    dust(85, seed=21, zmax=1.8, ymax=22)
    camera((0, -5.2, 1.05), (0, 12, 1.15), lens=38, fstop=5.6)
    area("HarshSun", (8, 4, 12), (0, 12, 1), 1300, 3.0, (1.0, 0.72, 0.45))
    area("SkyFill", (-10, 2, 6), (0, 12, 1), 300, 8.0, (0.55, 0.65, 0.75))
    render(samples, width, height, out)


def scene_prison(samples: int, width: int, height: int, out: str) -> None:
    reset()
    sky((0.06, 0.08, 0.10), (0.30, 0.20, 0.12), (0.01, 0.01, 0.01))
    ground = principled("PrisonGround", (0.10, 0.085, 0.07), roughness=0.9)
    plane("Ground", (0, 12, 0), 80, ground)
    stone = principled("Stone", (0.16, 0.15, 0.13), roughness=0.82)
    dark = principled("Iron", (0.02, 0.022, 0.025), roughness=0.42, metallic=0.65)
    # two towers and a lintel
    cube("TowerL", (-3.4, 9, 3.2), (2.2, 2.0, 6.4), stone)
    cube("TowerR", (3.4, 9, 3.2), (2.2, 2.0, 6.4), stone)
    cube("Lintel", (0, 9, 6.5), (9.2, 2.1, 1.2), stone)
    for i in range(9):
        x = -2.2 + i * 0.55
        cylinder(f"Bar-{i}", (x, 8.0, 3.1), 0.055, 5.6, dark, vertices=8)
    # warm light behind the gate
    warm = emission("GateLight", (1.0, 0.50, 0.18), 3.5)
    plane("GateGlow", (0, 9.5, 3.0), 4.6, warm, rot=(math.radians(90), 0, 0))
    # silhouettes waiting outside
    for i in range(7):
        figure(-4.4 + i * 1.25, 3.0 + (i % 2) * 0.6, 0, 0.9,
               cloth=(0.015, 0.012, 0.010), pose=0, label="wait")
    dust(65, seed=31, zmax=4.0, ymax=12)
    camera((0, -7.5, 1.25), (0, 9, 3.0), lens=34, fstop=4.5)
    area("CoolSky", (0, -12, 9), (0, 9, 3), 500, 10.0, (0.45, 0.60, 0.80))
    render(samples, width, height, out)


SCENES = {
    "march": scene_march,
    "crystal": scene_crystal,
    "dandi": scene_dandi,
    "dharasana": scene_dharasana,
    "prison": scene_prison,
}


def render(samples: int, width: int, height: int, out: str) -> None:
    scene = bpy.context.scene
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = out
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    bpy.ops.render.render(write_still=True)
    print(f"[blender] wrote {out}", flush=True)


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

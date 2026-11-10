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
import json
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


def cone(name, loc, radius, depth, mat, rot=(0, 0, 0), vertices=4):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=0.0,
                                    depth=depth, location=loc, rotation=rot)
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

TONES = {
    "dawn": ((0.006, 0.020, 0.030), (0.34, 0.14, 0.055), (0.002, 0.004, 0.008)),
    "day": ((0.020, 0.055, 0.085), (0.52, 0.44, 0.33), (0.018, 0.026, 0.036)),
    "dusk": ((0.020, 0.010, 0.015), (0.42, 0.13, 0.050), (0.006, 0.004, 0.005)),
    "night": ((0.001, 0.002, 0.004), (0.012, 0.014, 0.022), (0.0005, 0.0006, 0.001)),
}


def params_of(params):
    return params or {}


def tone_of(params, default="dawn"):
    tone = str(params_of(params).get("tone", default))
    return tone if tone in TONES else default


def preset_of(params, presets):
    index = int(params_of(params).get("framing", 0)) % len(presets)
    return presets[index]


def scene_march(samples: int, width: int, height: int, out: str, params=None) -> None:
    p = params_of(params)
    tone = tone_of(params, "dawn")
    reset()
    sky(*TONES[tone])
    sun((-40, 180, 22), 5.5 if tone != "day" else 4.0)

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
    seed = int(p.get("seed", 1930))
    dressing = max(0, min(2, int(p.get("dressing", 1))))
    rng = random.Random(seed)
    march = []
    yy = 3.4
    for i in range(22 + 6 * dressing):
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

    dust(90 + 20 * dressing, seed=seed + 7, zmax=2.2, ymax=58)

    presets = [
        ((0.4, -10.5, 0.72), (0, 25, 2.6), 32, 3.2),
        ((-13.0, -7.0, 1.35), (0, 26, 2.4), 48, 3.6),
        ((9.0, -8.0, 2.10), (0, 26, 1.9), 38, 4.0),
        ((1.4, -3.2, 1.55), (0, 34, 2.0), 26, 5.6),
        ((0.6, 12.0, 2.40), (0, 30, 1.5), 62, 2.6),
        ((0.0, -22.0, 4.60), (0, 30, 0.9), 22, 8.0),
    ]
    loc, target, lens, fstop = preset_of(params, presets)
    # Focus on the march itself, not on an empty point at the camera. The old
    # focus object sat at the camera position for the telephoto preset, so the
    # whole plate rendered as an out-of-focus smear.
    camera(loc, target, lens=lens, fstop=fstop)
    # A touch of warm bounce from the salt; the sun is the key.
    area("WarmBounce", (-8, 2, 1.2), (0, 12, 1.0), 370, 5.0, (1.0, 0.52, 0.25))
    area("CoolRim", (12, 30, 9), (0, 18, 1.2), 900, 6.0, (0.35, 0.62, 0.85))

    render(samples, width, height, out)


def scene_crystal(samples: int, width: int, height: int, out: str, params=None) -> None:
    p = params_of(params)
    reset()
    dark_world((0.0005, 0.0007, 0.001))
    floor = principled("BlackStone", (0.006, 0.006, 0.008), roughness=0.18)
    plane("Stone", (0, 0, 0), 6, floor)

    glass = principled("Crystal", (0.85, 0.92, 0.96), roughness=0.07, transmission=0.88)
    salt = salt_material()
    seed = int(p.get("seed", 12))
    dressing = max(0, min(2, int(p.get("dressing", 0))))
    rng = random.Random(seed)
    for i in range(7 + 2 * dressing):
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
    presets = [
        ((0.82, -1.25, 0.52), (0, 0, 0.14), 95, 2.8),
        ((0.00, -1.05, 1.35), (0, 0, 0.10), 70, 4.0),
        ((-1.00, -0.90, 0.35), (0, 0, 0.12), 85, 2.4),
        ((0.35, -1.60, 0.22), (0, 0, 0.10), 120, 2.0),
        ((1.25, 0.35, 0.75), (0, 0, 0.10), 75, 3.2),
        ((0.00, 0.05, 1.80), (0, 0, 0.08), 55, 5.6),
    ]
    loc, target, lens, fstop = preset_of(params, presets)
    camera(loc, target, lens=lens, fstop=fstop, focus=focus)
    area("Key", (1.2, -1.4, 2.2), (0, 0, 0.15), 420, 1.2, (1.0, 0.58, 0.30))
    area("Rim", (-1.6, 1.3, 1.4), (0, 0, 0.12), 360, 1.0, (0.35, 0.66, 0.95))
    area("Fill", (0, -2.0, 0.5), (0, 0, 0.12), 60, 2.0, (0.5, 0.55, 0.65))
    render(samples, width, height, out)


def scene_dandi(samples: int, width: int, height: int, out: str, params=None) -> None:
    p = params_of(params)
    reset()
    sky(*TONES[tone_of(params, "dawn")])
    sun((-14, 24, 7), 1.4)
    mud = principled("WetMud", (0.045, 0.030, 0.020), roughness=0.24)
    plane("Mud", (0, 0, 0), 30, mud)
    water = principled("WetSheen", (0.01, 0.025, 0.030), roughness=0.08, metallic=0.1)
    plane("Water", (0, 2.4, 0.006), 30, water)
    sea = emission("DandiSea", (0.03, 0.08, 0.10), 0.4)
    plane("DandiSea", (0, 5.2, 0.01), 40, sea)

    salt = salt_material()
    seed = int(p.get("seed", 6))
    dressing = max(0, min(2, int(p.get("dressing", 0))))
    rng = random.Random(seed)
    for i in range(10 + 3 * dressing):
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
    presets = [
        ((0.32, -0.78, 0.34), (0, 0, 0.10), 85, 2.2),
        ((0.00, -1.25, 0.65), (0, 1.2, 0.08), 55, 4.0),
        ((0.70, -0.45, 0.22), (0, 0, 0.08), 110, 1.8),
        ((-0.90, -1.40, 0.55), (0, 1.8, 0.12), 70, 3.5),
        ((0.00, -2.60, 1.40), (0, 3.0, 0.10), 40, 5.6),
        ((0.20, -0.50, 1.10), (0, 0.4, 0.08), 95, 2.6),
    ]
    loc, target, lens, fstop = preset_of(params, presets)
    camera(loc, target, lens=lens, fstop=fstop, focus=focus)
    area("Key", (-1.4, -1.0, 1.8), (0, 0, 0.1), 260, 1.0, (1.0, 0.48, 0.22))
    area("Rim", (1.1, 1.2, 0.9), (0, 0, 0.1), 180, 0.8, (0.42, 0.72, 1.0))
    render(samples, width, height, out)


def scene_dharasana(samples: int, width: int, height: int, out: str, params=None) -> None:
    p = params_of(params)
    reset()
    sky(*TONES[tone_of(params, "day")])
    sun((18, 26, 22), 3.0)
    ground = principled("DustGround", (0.30, 0.24, 0.17), roughness=0.92)
    plane("Ground", (0, 20, 0), 90, ground)
    # Two lines: volunteers in white, police in khaki. No gore, no spectacle.
    seed = int(p.get("seed", 21))
    dressing = max(0, min(2, int(p.get("dressing", 1))))
    white = (0.72, 0.68, 0.58)
    khaki = (0.22, 0.18, 0.10)
    rng = random.Random(seed)
    for i in range(7 + 2 * dressing):
        x = (i - 4) * 0.72 + rng.uniform(-0.08, 0.08)
        figure(x, 9.0 + (i % 2) * 0.5, 0, 0.98, cloth=white, pose=0, label="vol")
    for i in range(5 + dressing):
        x = (i - 3) * 0.76 + rng.uniform(-0.06, 0.06)
        figure(x, 14.2 + (i % 2) * 0.4, 0, 1.02, cloth=khaki, pose=0, label="pol")
    # A fallen cap in the empty space.
    cap = principled("Cap", (0.16, 0.13, 0.08), roughness=0.85)
    cylinder("FallenCap", (0.1, 5.6, 0.035), 0.14, 0.05, cap, rot=(0, 0, 0), vertices=16)
    dust(70 + 15 * dressing, seed=seed, zmax=1.8, ymax=22)
    presets = [
        ((0, -5.2, 1.05), (0, 12, 1.15), 38, 5.6),
        ((0, -2.8, 0.65), (0, 11.5, 1.00), 52, 4.0),
        ((-7, -4.0, 1.60), (0, 12, 1.10), 45, 5.0),
        ((0, -8.0, 3.60), (0, 13, 0.70), 32, 8.0),
        ((3.5, -4.5, 1.20), (0, 12, 1.00), 65, 3.2),
        ((0.1, -1.6, 0.45), (0.1, 5.6, 0.15), 80, 2.8),
    ]
    loc, target, lens, fstop = preset_of(params, presets)
    camera(loc, target, lens=lens, fstop=fstop)
    area("HarshSun", (8, 4, 12), (0, 12, 1), 1300, 3.0, (1.0, 0.72, 0.45))
    area("SkyFill", (-10, 2, 6), (0, 12, 1), 300, 8.0, (0.55, 0.65, 0.75))
    render(samples, width, height, out)


def scene_prison(samples: int, width: int, height: int, out: str, params=None) -> None:
    p = params_of(params)
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
    seed = int(p.get("seed", 31))
    dressing = max(0, min(2, int(p.get("dressing", 1))))
    rng = random.Random(seed)
    for i in range(5 + 2 * dressing):
        figure(-4.4 + i * 1.25 + rng.uniform(-0.15, 0.15), 3.0 + (i % 2) * 0.6, 0, 0.9,
               cloth=(0.015, 0.012, 0.010), pose=0, label="wait")
    dust(50 + 12 * dressing, seed=seed, zmax=4.0, ymax=12)
    presets = [
        ((0, -7.5, 1.25), (0, 9, 3.0), 34, 4.5),
        ((-5.5, -5.0, 1.40), (0, 9, 3.2), 42, 4.0),
        ((4.5, -5.5, 2.00), (0, 9, 3.0), 50, 5.0),
        ((0, -3.0, 0.70), (0, 8, 2.6), 55, 2.8),
        ((0, -11.0, 4.60), (0, 9, 2.4), 28, 8.0),
        ((1.2, -2.2, 1.20), (0, 8, 3.4), 70, 2.2),
    ]
    loc, target, lens, fstop = preset_of(params, presets)
    camera(loc, target, lens=lens, fstop=fstop)
    area("CoolSky", (0, -12, 9), (0, 9, 3), 500, 10.0, (0.45, 0.60, 0.80))
    render(samples, width, height, out)


def scene_village(samples: int, width: int, height: int, out: str, params=None) -> None:
    """The village that fed the march: huts, a well, an ashram, a grove.

    The salt films need the human world the tax was taken from. The set is
    built from the same low-poly vocabulary as the march: mud walls, thatch,
    terracotta, one warm doorway in a dark wall. No crowd spectacle, no
    reconstructed violence.
    """
    p = params_of(params)
    seed = int(p.get("seed", 101))
    prop = str(p.get("prop", "huts"))
    tone = tone_of(params, "dawn")
    rng = random.Random(seed)
    reset()
    sky(*TONES[tone])
    if tone != "night":
        sun((-52, 140, 18), 4.0)

    mud = principled("VillageMud", (0.16, 0.10, 0.060), roughness=0.92)
    whitewash = principled("VillageWhite", (0.55, 0.50, 0.40), roughness=0.88)
    thatch = principled("VillageThatch", (0.095, 0.065, 0.030), roughness=0.96)
    terracotta = principled("VillagePot", (0.24, 0.085, 0.040), roughness=0.78)
    wood = principled("VillageWood", (0.09, 0.050, 0.022), roughness=0.82)
    dust_mat = principled("VillageDust", (0.34, 0.27, 0.18), roughness=0.96)
    leaf = principled("VillageLeaf", (0.030, 0.055, 0.020), roughness=0.9)
    ground = principled("VillageGround", (0.22, 0.16, 0.10), roughness=0.95)
    plane("VillageGround", (0, 28, 0), 140, ground)
    plane("VillagePath", (0, 8, 0.006), 3.4, dust_mat, rot=(0, 0, 0))

    def hut(x, y, s=1.0, lit=True):
        w, d, h = 2.4 * s, 1.9 * s, 1.8 * s
        cube(f"hut-{x:.1f}-{y:.1f}-wall", (x, y, h / 2), (w, d, h), mud)
        cone(f"hut-{x:.1f}-{y:.1f}-roof", (x, y, h + 0.62 * s),
             1.95 * s, 1.25 * s, thatch, rot=(0, 0, math.radians(45)))
        if lit:
            cube(f"hut-{x:.1f}-{y:.1f}-door",
                 (x, y - d / 2 - 0.018, 0.46 * s), (0.52 * s, 0.02, 0.84 * s),
                 emission("DoorWarm", (1.0, 0.44, 0.15), 1.4))
        pot = ico(f"hut-{x:.1f}-{y:.1f}-pot", (x + w * 0.62, y - d * 0.55, 0.22 * s),
                  0.20 * s, terracotta, subdivisions=2)
        pot.scale = (1.0, 1.0, 1.15)

    def pot(x, y, z=0.0, s=1.0):
        body = sphere(f"pot-{x:.1f}-{y:.1f}", (x, y, z + 0.28 * s), 0.24 * s,
                      terracotta, segments=18, rings=12)
        body.scale = (1.0, 1.0, 1.18)
        cylinder(f"pot-{x:.1f}-{y:.1f}-neck", (x, y, z + 0.50 * s),
                 0.105 * s, 0.10 * s, terracotta, vertices=16)

    def tree(x, y, s=1.0):
        cylinder(f"tree-{x:.1f}-{y:.1f}-trunk", (x, y, 1.25 * s), 0.13 * s,
                 2.5 * s, wood, vertices=8)
        canopy = ico(f"tree-{x:.1f}-{y:.1f}-canopy", (x, y, 2.75 * s),
                     1.35 * s, leaf, subdivisions=2)
        canopy.scale = (1.15, 1.0, 0.78)

    if prop == "huts":
        for i in range(4):
            hut(-5.4 + i * 3.6 + rng.uniform(-0.18, 0.18),
                11.5 + (i % 2) * 1.8, 0.92 + rng.uniform(0.0, 0.16))
        for i in range(3):
            figure(-3.2 + i * 1.9, 5.4 + (i % 2) * 0.6, 0, 0.92,
                   cloth=(0.30, 0.26, 0.20), pose=rng.choice([-6, 0, 6]), label="v")

    elif prop == "hearth":
        for i in range(8):
            a = i * math.pi / 4
            ico(f"stone-{i}", (math.cos(a) * 0.62, 4.4 + math.sin(a) * 0.62, 0.09),
                0.13, principled("HearthStone", (0.16, 0.14, 0.12), roughness=0.9),
                subdivisions=1)
        for i in range(6):
            x = rng.uniform(-0.18, 0.18)
            y = 4.4 + rng.uniform(-0.18, 0.18)
            ico(f"flame-{i}", (x, y, 0.18 + rng.uniform(0.0, 0.16)),
                 rng.uniform(0.055, 0.10), emission(f"Flame-{i}", (1.0, 0.40, 0.10), 6.0),
                subdivisions=1)
        pot(0, 4.4, 0.34, 1.05)
        figure(1.55, 3.4, 0, 0.96, cloth=(0.30, 0.18, 0.10), pose=0, label="cook")
        area("FireLight", (0, 4.4, 0.9), (0, 4.4, 0.4), 90, 0.8, (1.0, 0.38, 0.12))
        dust(24, seed=seed, zmax=3.4, ymax=6)
        hut(-4.6, 8.6, 0.85)

    elif prop == "well":
        base = cylinder("WellBase", (0, 6.2, 0.38), 1.18, 0.76, mud, vertices=32)
        base.scale = (1.0, 1.0, 1.0)
        bpy.ops.mesh.primitive_torus_add(major_radius=1.05, minor_radius=0.22,
                                         location=(0, 6.2, 0.84))
        rim = bpy.context.object
        rim.name = "WellRim"
        assign(rim, principled("WellStone", (0.20, 0.18, 0.15), roughness=0.88))
        smooth(rim)
        cylinder("WellMouth", (0, 6.2, 0.72), 0.82, 0.03,
                 principled("WellDark", (0.004, 0.003, 0.002), roughness=0.9), vertices=32)
        for side, sign in (("l", -1), ("r", 1)):
            cylinder(f"WellPost-{side}", (sign * 1.05, 6.2, 1.72), 0.065, 2.0, wood, vertices=8)
        cylinder("WellBeam", (0, 6.2, 2.65), 0.055, 2.3, wood,
                 rot=(0, math.radians(90), 0), vertices=8)
        cylinder("WellRope", (0.18, 6.2, 1.95), 0.012, 1.4, principled("Rope", (0.28, 0.22, 0.12), roughness=0.9), vertices=6)
        pot(0.18, 6.2, 1.16, 0.88)
        figure(-1.85, 5.2, 0, 0.94, cloth=(0.32, 0.20, 0.12), pose=0, label="woman")
        figure(-1.0, 7.6, 0, 0.92, cloth=(0.26, 0.22, 0.18), pose=6, label="woman2")
        hut(4.8, 10.2, 0.9)

    elif prop == "ashram":
        for i in range(3):
            cube(f"ashram-wall-{i}", (-3.0 + i * 3.0, 9.8, 0.55), (2.8, 0.18, 1.1),
                 whitewash)
        for i in range(4):
            plane(f"mat-{i}", (-2.0 + i * 1.4, 6.4 + (i % 2) * 0.35, 0.012),
                  1.05, principled(f"Mat-{i}", (0.30, 0.24, 0.14), roughness=0.96))
        for i in range(5):
            figure(-2.8 + i * 1.45, 7.5 + (i % 2) * 0.5, 0, 0.90,
                   cloth=(0.62, 0.58, 0.48), pose=0, label="s")
        tree(-5.4, 10.6, 1.15)
        tree(5.2, 11.4, 0.95)
        area("AshramWarm", (-2, 4, 3.2), (0, 7, 1), 160, 3.5, (1.0, 0.55, 0.26))

    elif prop == "grove":
        for i, (x, y, s) in enumerate(((-4.2, 10.5, 1.15), (-1.2, 12.2, 1.0),
                                       (2.6, 10.8, 1.2), (5.2, 13.0, 0.95),
                                       (0.8, 15.0, 1.05))):
            tree(x, y, s)
        plane("GrovePath", (0, 7, 0.007), 2.6, dust_mat)
        figure(-0.8, 6.4, 0, 0.94, cloth=(0.60, 0.56, 0.46), pose=0, label="g")
        figure(1.2, 7.2, 0, 0.96, cloth=(0.12, 0.10, 0.08), pose=0, label="guard")
        dust(55, seed=seed + 3, zmax=2.6, ymax=14)

    elif prop == "field":
        soil = principled("FieldSoil", (0.12, 0.075, 0.040), roughness=0.97)
        for i in range(10):
            y = 5.0 + i * 0.85
            cube(f"furrow-{i}", (0, y, 0.035), (16, 0.12, 0.07), soil)
        figure(1.6, 6.2, 0, 0.95, cloth=(0.28, 0.22, 0.14), pose=8, staff=True, label="farmer")
        hut(-5.0, 13.0, 0.85)
        hut(5.4, 14.0, 0.80)
        dust(40, seed=seed + 5, zmax=2.2, ymax=16)

    else:
        hut(0, 8.0, 1.0)

    presets = {
        "huts": [
            ((0, -8.0, 1.35), (0, 11, 1.5), 30, 4.5),
            ((-7.0, -3.0, 1.5), (0, 11, 1.3), 46, 4.0),
            ((7.0, -2.0, 1.7), (0, 11, 1.2), 42, 4.5),
            ((0, 1.0, 2.4), (0, 12, 1.0), 24, 6.0),
            ((0, -12.0, 4.2), (0, 12, 0.8), 26, 8.0),
            ((2.6, 2.0, 1.1), (0, 10, 1.4), 60, 2.8),
        ],
        "hearth": [
            ((0.0, -0.6, 0.72), (0, 4.4, 0.55), 55, 2.2),
            ((2.2, 1.2, 1.2), (0, 4.4, 0.5), 42, 3.2),
            ((-2.0, 0.4, 0.62), (0, 4.4, 0.5), 65, 2.0),
            ((0.0, 0.6, 2.3), (0, 4.4, 0.4), 30, 5.6),
            ((1.0, -1.5, 0.9), (0, 4.4, 0.6), 75, 1.8),
            ((0.0, -3.0, 1.7), (0, 5.0, 0.8), 35, 4.0),
        ],
        "well": [
            ((0, -0.8, 1.5), (0, 6.2, 1.2), 35, 4.0),
            ((2.8, 1.6, 1.6), (0, 6.2, 1.1), 45, 3.2),
            ((-3.2, 1.4, 1.3), (0, 6.2, 1.0), 50, 2.8),
            ((0, 2.0, 2.8), (0, 6.2, 0.9), 28, 6.0),
            ((1.6, 0.2, 0.9), (0.2, 6.2, 1.7), 70, 2.0),
            ((0, -4.0, 2.0), (0, 6.2, 1.0), 38, 5.0),
        ],
        "ashram": [
            ((0, -7.0, 1.4), (0, 8, 1.2), 32, 4.5),
            ((4.5, -3.5, 1.6), (0, 8, 1.1), 46, 3.6),
            ((-4.0, -2.5, 1.3), (0, 7.5, 1.0), 52, 3.0),
            ((0, -10, 4.0), (0, 8, 0.9), 26, 8.0),
            ((0, 2.0, 1.4), (0, 8, 1.4), 58, 2.6),
            ((2.0, -5.0, 2.2), (0, 8, 1.0), 36, 5.6),
        ],
        "grove": [
            ((0, -6.0, 1.4), (0, 8, 2.2), 34, 4.0),
            ((-5.0, -2.0, 1.5), (0, 8, 2.0), 48, 3.2),
            ((5.0, -2.5, 1.7), (0, 8, 1.8), 44, 3.6),
            ((0, 1.0, 1.3), (0, 9, 2.4), 28, 5.6),
            ((1.0, -2.0, 2.6), (0, 8, 1.8), 62, 2.6),
            ((0, -10, 4.0), (0, 9, 1.6), 30, 7.0),
        ],
        "field": [
            ((0, -7.0, 1.5), (0, 8, 1.0), 32, 5.6),
            ((3.2, -2.0, 1.3), (0, 7, 0.9), 45, 4.0),
            ((-3.4, -1.5, 1.7), (0, 8, 1.1), 50, 3.6),
            ((0, -2.0, 2.6), (0, 8, 0.8), 26, 7.0),
            ((1.5, 1.0, 1.1), (1.6, 6.2, 1.4), 70, 2.2),
            ((0, -12, 3.6), (0, 10, 0.9), 28, 8.0),
        ],
    }
    loc, target, lens, fstop = preset_of(params, presets.get(prop, presets["huts"]))
    camera(loc, target, lens=lens, fstop=fstop)
    if tone == "night":
        area("MoonFill", (0, -8, 9), (0, 8, 1), 160, 8.0, (0.40, 0.52, 0.78))
    bpy.context.scene.view_settings.exposure = {
        "dawn": -0.15, "day": 0.05, "dusk": -0.35, "night": -1.2
    }[tone]
    render(samples, width, height, out)


SCENES = {
    "march": scene_march,
    "crystal": scene_crystal,
    "dandi": scene_dandi,
    "dharasana": scene_dharasana,
    "prison": scene_prison,
    "village": scene_village,
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
    ap.add_argument("--params", default="{}")
    args = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    if args.width % 2 or args.height % 2:
        raise SystemExit("width and height must be even")
    params = json.loads(args.params) if args.params else {}
    SCENES[args.scene](args.samples, args.width, args.height, os.path.abspath(args.out),
                       params)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

# --- generic compiler exports (added 2026-10-30) ---
def reset():
    pass
def camera(loc, target, lens=35, fstop=4.0, focus=None):
    pass
def limb(name, start, end, radius=0.12, mat=None, vertices=8):
    import bpy
    pass
def render(samples, width, height, out):
    try:
        from jallianwala_scenes import render as _r
        return _r(samples, width, height, out)
    except Exception:
        pass

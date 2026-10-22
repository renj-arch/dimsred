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
    figure,
    ico,
    plane,
    principled,
    render as _render,
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
    coord = nodes.new("ShaderNodeTexCoord")
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 28.0
    noise.inputs["Detail"].default_value = 3.0
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.10
    bump.inputs["Distance"].default_value = 0.004
    links.new(coord.outputs["Object"], noise.inputs["Vector"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def stone_material(name="Stone", tint=(0.19, 0.16, 0.12)):
    mat = principled(name, tint, roughness=0.9)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    coord = nodes.new("ShaderNodeTexCoord")
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 2.2
    noise.inputs["Detail"].default_value = 5.0
    noise.inputs["Roughness"].default_value = 0.7
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.28
    ramp.color_ramp.elements[0].color = (0.035, 0.028, 0.020, 1)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (0.16, 0.125, 0.085, 1)
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.35
    bump.inputs["Distance"].default_value = 0.04
    links.new(coord.outputs["Object"], noise.inputs["Vector"])
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
    # Brick is evaluated in X/Z, not the cube's X/Y, so map the wall's
    # vertical axis into texture Y. Object coordinates are in metres, which
    # keeps the courses the same size on the bagh wall and the well wall.
    sep = nodes.new("ShaderNodeSeparateXYZ")
    comb = nodes.new("ShaderNodeCombineXYZ")
    brick = nodes.new("ShaderNodeTexBrick")
    set_input(brick, "Scale", 1.0)
    set_input(brick, "Brick Width", 0.27)
    set_input(brick, "Row Height", 0.125)
    set_input(brick, "Mortar Size", 0.009)
    set_input(brick, "Mortar Smooth", 0.12)
    set_input(brick, "Color1", (0.175, 0.120, 0.075, 1))
    set_input(brick, "Color2", (0.105, 0.070, 0.042, 1))
    set_input(brick, "Mortar", (0.035, 0.025, 0.016, 1))
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.24
    bump.inputs["Distance"].default_value = 0.018
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 18.0
    noise.inputs["Detail"].default_value = 5.0
    links.new(coord.outputs["Object"], sep.inputs["Vector"])
    links.new(sep.outputs["X"], comb.inputs["X"])
    links.new(sep.outputs["Z"], comb.inputs["Y"])
    links.new(sep.outputs["Y"], comb.inputs["Z"])
    links.new(comb.outputs["Vector"], brick.inputs["Vector"])
    links.new(brick.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(coord.outputs["Object"], noise.inputs["Vector"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def plaster_material(name="Plaster", tint=(0.28, 0.225, 0.155)):
    """Lime plaster with broad damp patches and a fine tooth.

    The memorial wall is plastered brick, not a naked brick wall. Repeating a
    brick texture across a close-up made every course look like a garden wall.
    """
    mat = principled(name, tint, roughness=0.96)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    coord = nodes.new("ShaderNodeTexCoord")
    broad = nodes.new("ShaderNodeTexNoise")
    broad.inputs["Scale"].default_value = 0.75
    broad.inputs["Detail"].default_value = 5.0
    broad.inputs["Roughness"].default_value = 0.65
    broad_ramp = nodes.new("ShaderNodeValToRGB")
    broad_ramp.color_ramp.elements[0].position = 0.20
    broad_ramp.color_ramp.elements[0].color = (0.055, 0.043, 0.030, 1)
    broad_ramp.color_ramp.elements[1].position = 0.80
    broad_ramp.color_ramp.elements[1].color = (0.28, 0.22, 0.15, 1)
    fine = nodes.new("ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = 42.0
    fine.inputs["Detail"].default_value = 6.0
    fine.inputs["Roughness"].default_value = 0.8
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.30
    bump.inputs["Distance"].default_value = 0.012
    links.new(coord.outputs["Object"], broad.inputs["Vector"])
    links.new(broad.outputs["Fac"], broad_ramp.inputs["Fac"])
    links.new(broad_ramp.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(coord.outputs["Object"], fine.inputs["Vector"])
    links.new(fine.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def set_input(node, name, value):
    """Set a node socket only when this Blender build exposes it."""
    sock = node.inputs.get(name)
    if sock is not None:
        sock.default_value = value


def render(samples, width, height, out):
    """Render with a restrained photographic bloom on the emissive practicals."""
    scene = bpy.context.scene
    scene.use_nodes = True
    tree = scene.node_tree
    tree.nodes.clear()
    layers = tree.nodes.new("CompositorNodeRLayers")
    glare = tree.nodes.new("CompositorNodeGlare")
    glare.glare_type = "FOG_GLOW"
    glare.quality = "HIGH"
    glare.threshold = 0.85
    glare.size = 7
    glare.mix = -0.82
    comp = tree.nodes.new("CompositorNodeComposite")
    tree.links.new(layers.outputs["Image"], glare.inputs["Image"])
    tree.links.new(glare.outputs["Image"], comp.inputs["Image"])
    _render(samples, width, height, out)


def limb(name, start, end, radius, mat, vertices=8):
    """A tapered branch between two points, aimed along its own Z axis."""
    a = Vector(start)
    b = Vector(end)
    v = b - a
    obj = cylinder(name, (a + b) * 0.5, radius, v.length, mat, vertices=vertices)
    obj.rotation_euler = v.to_track_quat("Z", "Y").to_euler()
    return obj


def leaf_cluster(prefix, x, y, z, size, mat, count=4, seed=1):
    rng = random.Random(seed)
    for i in range(count):
        ico(
            f"{prefix}-{i:02d}",
            (x + rng.uniform(-1.0, 1.0) * size,
             y + rng.uniform(-0.32, 0.32) * size,
             z + rng.uniform(-0.65, 0.75) * size),
            size * rng.uniform(0.52, 1.0), mat, subdivisions=2
        )


def tree_kit(prefix, x, y, base_z, height, trunk, leaf, seed=11, spread=2.2):
    """A believable silhouette tree: trunk, forks and many small leaf masses."""
    rng = random.Random(seed)
    top = (x, y, base_z + height * 0.58)
    limb(f"{prefix}-Trunk", (x, y, base_z), top, height * 0.048, trunk, vertices=10)
    for i in range(7):
        a = (i / 7.0) * math.tau + rng.uniform(-0.25, 0.25)
        end = (x + math.cos(a) * spread * rng.uniform(0.45, 1.0),
               y + rng.uniform(-0.55, 0.55),
               base_z + height * rng.uniform(0.58, 0.92))
        limb(f"{prefix}-Fork-{i}", top, end, height * 0.017, trunk, vertices=7)
        leaf_cluster(f"{prefix}-Leaves-{i}", end[0], end[1], end[2],
                     height * rng.uniform(0.10, 0.17), leaf, count=4, seed=seed + i)
    leaf_cluster(f"{prefix}-Crown", x, y, base_z + height * 0.83,
                 height * 0.23, leaf, count=7, seed=seed + 30)


def paver_floor(prefix, cx, cy, cols, rows, size, z=0.018, seed=5, skip=None):
    """Uneven stone paving around a set, with gaps and small height changes.

    `skip=(x, y, radius)` leaves a circular hole: a floor laid across a well
    mouth otherwise turns the well into a tiled paddling pool.
    """
    rng = random.Random(seed)
    mats = [
        principled(f"{prefix}-StoneA", (0.095, 0.075, 0.052), roughness=0.97),
        principled(f"{prefix}-StoneB", (0.130, 0.100, 0.068), roughness=0.95),
        principled(f"{prefix}-StoneC", (0.070, 0.056, 0.040), roughness=0.98),
    ]
    for ix in range(cols):
        for iy in range(rows):
            x = cx + (ix - (cols - 1) / 2.0) * size + rng.uniform(-0.012, 0.012)
            y = cy + (iy - (rows - 1) / 2.0) * size + rng.uniform(-0.012, 0.012)
            if skip and ((x - skip[0]) ** 2 + (y - skip[1]) ** 2) < skip[2] ** 2:
                continue
            cube(
                f"{prefix}-Paver-{ix:02d}-{iy:02d}",
                (x, y, z + rng.uniform(-0.006, 0.008)),
                (size * rng.uniform(0.88, 0.97), size * rng.uniform(0.86, 0.96),
                 rng.uniform(0.022, 0.040)),
                rng.choice(mats), rot=(0, 0, rng.uniform(-0.025, 0.025))
            )


def paper_scrap(prefix, x, y, z, mat, size=0.10, rot=0.0):
    cube(prefix, (x, y, z), (size, size * 0.62, 0.0022), mat,
         rot=(0, 0, rot))


def shell_casing(prefix, x, y, z, mat, rot=0.0):
    cylinder(prefix, (x, y, z), 0.017, 0.095, mat,
             rot=(math.pi / 2, 0, rot), vertices=12)


def flat_shape(name, points, loc, mat, rot=0.0, parent=None):
    """A thin, single-sided polygon used for human silhouettes.

    A distant crowd should read as people, not as stacked cubes with sphere
    heads. Flat cut-outs keep the outline and lose the toy geometry.
    """
    mesh = bpy.data.meshes.new(name + "Mesh")
    verts = [(x, 0.0, z) for x, z in points]
    mesh.from_pydata(verts, [], [list(range(len(verts)))])
    mesh.validate()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = (0, 0, rot)
    obj.data.materials.append(mat)
    if parent is not None:
        obj.parent = parent
    return obj


def crowd_figure(prefix, x, y, scale=0.95, pose=0.0, cloth=(0.012, 0.011, 0.010)):
    """A backlit human cut-out, with a turban and a slight turn."""
    mat = principled(prefix + "Silhouette", cloth, roughness=0.98)
    rng = random.Random(sum(ord(c) for c in prefix))
    pivot = bpy.data.objects.new(prefix + "Pivot", None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = (x, y, 0.0)
    pivot.rotation_euler = (0, 0, math.radians(pose))
    pivot.scale = (scale, scale, scale)
    # torso: shoulders, waist, hips
    torso = [(-0.115, 1.52), (0.115, 1.52), (0.19, 1.38), (0.205, 1.04),
             (0.145, 0.88), (0.165, 0.74), (-0.165, 0.74), (-0.145, 0.88),
             (-0.205, 1.04), (-0.19, 1.38)]
    flat_shape(prefix + "-Torso", torso, (0, 0, 0), mat, parent=pivot)
    # head and neck
    head = [(math.cos(a) * 0.092, 1.625 + math.sin(a) * 0.112)
            for a in [i * math.tau / 16 for i in range(16)]]
    flat_shape(prefix + "-Head", head, (0, 0, 0), mat, parent=pivot)
    flat_shape(prefix + "-Neck", [(-0.050, 1.50), (0.050, 1.50),
                                  (0.050, 1.40), (-0.050, 1.40)],
               (0, 0, 0), mat, parent=pivot)
    # legs, separated so the silhouette has a gap and a stride
    flat_shape(prefix + "-LegL", [(-0.155, 0.78), (-0.020, 0.78),
                                  (-0.030, 0.06), (-0.130, 0.035)],
               (0, 0, 0), mat, parent=pivot)
    flat_shape(prefix + "-LegR", [(0.020, 0.78), (0.155, 0.78),
                                  (0.130, 0.035), (0.030, 0.06)],
               (0, 0, 0), mat, parent=pivot)
    # arms hang with a small asymmetric bend
    flat_shape(prefix + "-ArmL", [(-0.185, 1.40), (-0.245, 1.33),
                                  (-0.225, 0.86), (-0.155, 0.84),
                                  (-0.145, 1.31)],
               (0, 0, 0), mat, parent=pivot)
    flat_shape(prefix + "-ArmR", [(0.185, 1.40), (0.245, 1.33),
                                  (0.225, 0.86), (0.155, 0.84),
                                  (0.145, 1.31)],
               (0, 0, 0), mat, parent=pivot)
    # a turban or head-wrap; not every figure, so the crowd is not a uniform
    if rng.random() > 0.38:
        turban = [(math.cos(a) * 0.118, 1.745 + math.sin(a) * 0.070)
                  for a in [i * math.tau / 14 for i in range(14)]]
        flat_shape(prefix + "-Turban", turban, (0, 0, 0), mat, parent=pivot)
    # a contact shadow keeps the cut-out on the paving
    shadow = bpy.data.objects.new(prefix + "-Shadow", None)
    bpy.context.collection.objects.link(shadow)
    shadow.location = (x, y + 0.06, 0.021)
    shadow.scale = (scale * 0.22, scale * 0.09, 0.002)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=1.0,
                                         location=shadow.location)
    blob = bpy.context.object
    blob.name = prefix + "-ShadowBlob"
    blob.scale = shadow.scale
    blob.data.materials.append(principled(prefix + "ShadowMat",
                                          (0.004, 0.003, 0.002), roughness=1.0))


def torn_notice(prefix, x, y, z, rot=0.0, width=0.36, height=0.46):
    paper = paper_material(f"{prefix}-Paper", (0.48, 0.39, 0.26))
    ink = principled(f"{prefix}-Ink", (0.018, 0.014, 0.010), roughness=0.72)
    cube(prefix, (x, y, z), (width, 0.004, height), paper, rot=(0, 0, rot))
    text_obj(f"{prefix}-Line1", "NO", (x - width * 0.30, y - 0.004, z + height * 0.22),
             0.052, rot=(math.pi / 2, 0, rot), mat=ink)
    text_obj(f"{prefix}-Line2", "MEETINGS", (x - width * 0.34, y - 0.004, z + height * 0.05),
             0.036, rot=(math.pi / 2, 0, rot), mat=ink)
    # printed body lines and a faded seal: at wall distance the old posters read
    # as blank rectangles.
    for i in range(6):
        lw = width * (0.48 - (i % 3) * 0.07)
        cube(f"{prefix}-Print-{i}", (x - width * 0.10, y - 0.005,
                                     z - height * 0.11 - i * height * 0.075),
             (lw, 0.001, 0.006), ink)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=width * 0.13, minor_radius=0.004,
        major_segments=24, minor_segments=6,
        location=(x + width * 0.22, y - 0.006, z - height * 0.28),
        rotation=(math.pi / 2, 0, rot)
    )
    assign(bpy.context.object, ink)


def book_stack(prefix, x, y, z, count=3):
    mats = [
        principled(f"{prefix}-LeatherA", (0.075, 0.026, 0.018), roughness=0.62),
        principled(f"{prefix}-LeatherB", (0.040, 0.055, 0.038), roughness=0.68),
        principled(f"{prefix}-LeatherC", (0.055, 0.040, 0.026), roughness=0.64),
    ]
    page = paper_material(f"{prefix}-Pages", (0.52, 0.44, 0.31))
    gold = principled(f"{prefix}-BookGold", (0.36, 0.24, 0.08), roughness=0.42, metallic=0.7)
    for i in range(count):
        w = 0.62 + i * 0.07
        d = 0.44 + (i % 2) * 0.04
        h = 0.070 + (i % 3) * 0.012
        cube(f"{prefix}-Book-{i}", (x + i * 0.018, y + i * 0.012, z + i * h),
             (w, d, h), mats[i % 3], rot=(0, 0, -0.05 + i * 0.03))
        cube(f"{prefix}-Pages-{i}", (x + i * 0.018 + 0.015, y + i * 0.012, z + i * h),
             (w * 0.92, d * 0.88, h * 0.58), page,
             rot=(0, 0, -0.05 + i * 0.03))
        cube(f"{prefix}-Band-{i}", (x + i * 0.018, y + i * 0.012, z + i * h + h * 0.25),
             (w * 0.12, d * 1.01, h * 0.10), gold,
             rot=(0, 0, -0.05 + i * 0.03))


def spectacles(prefix, x, y, z):
    metal = aged_brass(f"{prefix}-Brass")
    glass = principled(f"{prefix}-Glass", (0.20, 0.28, 0.28), roughness=0.12,
                       transmission=0.55)
    for side in (-1, 1):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.075, minor_radius=0.005,
            major_segments=24, minor_segments=6,
            location=(x + side * 0.088, y, z),
            rotation=(math.pi / 2, 0, 0)
        )
        assign(bpy.context.object, metal)
        cylinder(f"{prefix}-Lens-{side}", (x + side * 0.088, y, z + 0.002),
                 0.070, 0.004, glass, rot=(math.pi / 2, 0, 0), vertices=24)
    cube(f"{prefix}-Bridge", (x, y, z), (0.040, 0.006, 0.008), metal)
    for side in (-1, 1):
        cube(f"{prefix}-Temple-{side}", (x + side * 0.17, y + 0.10, z),
             (0.006, 0.18, 0.006), metal, rot=(0, 0, side * 0.20))


def jali_screen(prefix, y, z0, width=3.0, height=2.2, cols=9, rows=8):
    stone = stone_material(f"{prefix}-Stone", (0.13, 0.105, 0.075))
    for i in range(cols + 1):
        x = -width / 2.0 + i * (width / cols)
        cube(f"{prefix}-V-{i}", (x, y, z0 + height / 2.0),
             (0.036, 0.045, height), stone)
    for j in range(rows + 1):
        z = z0 + j * (height / rows)
        cube(f"{prefix}-H-{j}", (0, y, z),
             (width, 0.045, 0.036), stone)
    for i in range(cols):
        for j in range(rows):
            if (i + j) % 3:
                continue
            x = -width / 2.0 + (i + 0.5) * (width / cols)
            z = z0 + (j + 0.5) * (height / rows)
            cube(f"{prefix}-Boss-{i}-{j}", (x, y - 0.015, z),
                 (0.075, 0.022, 0.075), stone, rot=(0, 0, math.pi / 4))


def marigold_cluster(prefix, x, y, z, count=14, spread=0.30, seed=9):
    rng = random.Random(seed)
    gold = principled(f"{prefix}-MarigoldA", (0.46, 0.145, 0.012), roughness=0.82)
    pale = principled(f"{prefix}-MarigoldB", (0.66, 0.265, 0.018), roughness=0.78)
    for i in range(count):
        flower = sphere(f"{prefix}-{i:02d}",
               (x + rng.uniform(-1, 1) * spread,
                y + rng.uniform(-1, 1) * spread * 0.55,
                z + rng.uniform(0, 0.030)),
               rng.uniform(0.012, 0.022), rng.choice((gold, pale)),
               segments=10, rings=6)
        flower.scale = (1.0, 1.0, 0.62)
        flower.rotation_euler = (0, 0, rng.uniform(0, math.pi))


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
    face = paper_material("ClockFace", (0.30, 0.245, 0.16))
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
             (0.002, length, 0.001), principled(f"ScratchInk-{i}", (0.14, 0.11, 0.075), 0.7),
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
    # A narrow, hot teardrop: a bright core inside a thinner orange envelope.
    # The old wide cone read as a wax egg once it was tone-mapped.
    outer_mat = emission("FlameOuter", (1.0, 0.42, 0.07), 12.0)
    inner_mat = emission("FlameInner", (1.0, 0.86, 0.48), 26.0)
    bpy.ops.mesh.primitive_cone_add(
        vertices=24, radius1=0.024 * scale, radius2=0.0,
        depth=0.115 * scale,
        location=(loc[0], loc[1], loc[2] + 0.0575 * scale)
    )
    outer = bpy.context.object
    outer.name = name
    outer.scale = (0.86, 0.86, 1.0)
    smooth(outer)
    assign(outer, outer_mat)
    core = sphere(name + "Core", (loc[0], loc[1], loc[2] + 0.030 * scale),
                  0.016 * scale, inner_mat, segments=16, rings=12)
    core.scale = (0.70, 0.70, 1.55)
    # No glowing sphere around the flame: it turned into an orange marble.
    # The compositor bloom is enough once the cone itself is hot.
    bpy.ops.mesh.primitive_cone_add(
        vertices=16, radius1=0.009 * scale, radius2=0.0,
        depth=0.026 * scale, location=(loc[0], loc[1], loc[2] + 0.013 * scale)
    )
    blue = bpy.context.object
    blue.name = name + "Blue"
    assign(blue, emission("FlameBlue", (0.20, 0.34, 1.0), 2.2))
    blue.visible_shadow = False
    bpy.ops.object.light_add(type="POINT", location=(loc[0], loc[1], loc[2] + 0.06 * scale))
    lamp = bpy.context.object
    lamp.data.energy = 3.4 * scale
    lamp.data.color = (1.0, 0.44, 0.13)
    lamp.data.shadow_soft_size = 0.025
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
    leather = principled("DeskLeather", (0.024, 0.019, 0.014), roughness=0.72)
    cube("DeskMat", (0, 0, 0.003), (2.15, 1.42, 0.006), leather, rot=(0, 0, 0.02))
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
    clock_hand = principled("ClockHandInk", (0.015, 0.012, 0.009), roughness=0.55)
    cube("ClockHour", (-1.30, 0.36, 0.108), (0.012, 0.095, 0.0015), clock_hand,
         rot=(0, 0, -0.72))
    cube("ClockMinute", (-1.30, 0.36, 0.109), (0.008, 0.145, 0.0015), clock_hand,
         rot=(0, 0, 1.57))
    cylinder("ClockPin", (-1.30, 0.36, 0.112), 0.012, 0.002, clock_hand, vertices=12)
    # lamp on the right: a warm practical, kept inside the frame
    cylinder("LampBase", (1.42, 0.58, 0.13), 0.14, 0.24, metal, vertices=24)
    cylinder("LampStem", (1.42, 0.58, 0.28), 0.022, 0.20, metal, vertices=12)
    shade_metal = principled("NoticeShadeMetal", (0.045, 0.032, 0.020),
                             roughness=0.48, metallic=0.45)
    bpy.ops.mesh.primitive_cone_add(
        vertices=32, radius1=0.22, radius2=0.080, depth=0.18,
        location=(1.42, 0.58, 0.40)
    )
    assign(bpy.context.object, shade_metal)
    cylinder("LampGlow", (1.42, 0.58, 0.305), 0.15, 0.010,
             emission("LampWarm", (1.0, 0.50, 0.18), 0.8), vertices=24)
    bpy.ops.object.light_add(type="POINT", location=(1.42, 0.58, 0.30))
    lamp_light = bpy.context.object
    lamp_light.data.energy = 16
    lamp_light.data.color = (1.0, 0.54, 0.23)
    lamp_light.data.shadow_soft_size = 0.17
    # the rest of the desk: a folded newspaper, a second stack of paper, a
    # magnifier, a cup, a stick of sealing wax and a red official seal
    news = paper_material("NewsPaper", (0.55, 0.47, 0.34))
    cube("NewsSheet", (-1.34, -0.50, 0.017), (0.48, 0.64, 0.008), news,
         rot=(0, 0, 0.13))
    cube("NewsFold", (-1.38, -0.50, 0.024), (0.42, 0.58, 0.009), news,
         rot=(0, 0, 0.13))
    for i in range(9):
        cube(f"NewsLine-{i}", (-1.42 + (i % 2) * 0.06, -0.72 + i * 0.047, 0.030),
             (0.30 - (i % 3) * 0.045, 0.004, 0.0014), ink,
             rot=(0, 0, 0.13))
    page = paper_material("NoticeStackPaper", (0.70, 0.62, 0.47))
    for i in range(4):
        cube(f"NoticeStack-{i}", (1.22, -0.54, 0.018 + i * 0.009),
             (0.39, 0.53, 0.008), page, rot=(0, 0, 0.04 - i * 0.025))
    # brass magnifier
    cylinder("MagnifierHandle", (1.16, -0.70, 0.035), 0.022, 0.28, metal,
             rot=(math.pi / 2, 0, 0.5), vertices=12)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.120, minor_radius=0.014,
        major_segments=32, minor_segments=8,
        location=(0.93, -0.54, 0.042), rotation=(math.pi / 2, 0, 0.5)
    )
    assign(bpy.context.object, metal)
    cylinder("MagnifierLens", (0.93, -0.54, 0.042), 0.110, 0.004,
             principled("MagnifierGlass", (0.20, 0.27, 0.27), roughness=0.08,
                        transmission=0.55), rot=(math.pi / 2, 0, 0.5), vertices=32)
    # tea cup with a dark rim
    cylinder("Cup", (-1.24, 0.74, 0.095), 0.10, 0.16,
             principled("CupCeramic", (0.22, 0.18, 0.13), roughness=0.42), vertices=24)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.095, minor_radius=0.008,
        major_segments=24, minor_segments=6, location=(-1.24, 0.74, 0.175)
    )
    assign(bpy.context.object, ink)
    # red seal on the notice and a stick of wax
    red = principled("NoticeSeal", (0.30, 0.020, 0.012), roughness=0.55)
    cylinder("NoticeSeal", (0.56, -0.38, 0.027), 0.078, 0.014, red, vertices=24)
    cylinder("NoticeSealInner", (0.56, -0.38, 0.035), 0.050, 0.010, red, vertices=24)
    cylinder("WaxStick", (1.15, 0.10, 0.035), 0.019, 0.34, red,
             rot=(math.pi / 2, 0, 1.15), vertices=10)
    spectacles("NoticeGlasses", -1.12, -0.48, 0.032)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0.02))
    focus = bpy.context.object
    camera((0.55, -3.45, 2.12), (0.0, 0.0, 0.10), lens=46, fstop=2.1, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.82
    area("Key", (-1.0, -1.4, 3.3), (0, 0, 0.1), 260, 1.8, (1.0, 0.62, 0.34))
    area("Rim", (2.2, 0.8, 2.0), (0, 0, 0.1), 150, 1.8, (0.40, 0.62, 0.85))
    area("Fill", (1.0, -1.8, 1.2), (0, 0, 0.1), 28, 1.2, (0.55, 0.40, 0.26))
    render(samples, width, height, out)


def _bagh(inside=False, empty=False):
    reset()
    sky((0.006, 0.020, 0.030), (0.56, 0.24, 0.08), (0.008, 0.010, 0.015))
    sun((-26, 44, 12), 1.8)
    ground = principled("BaghGround", (0.16, 0.115, 0.072), roughness=0.96)
    plane("Ground", (0, 8, 0), 70, ground)
    paver_floor("BaghPavers", 0, 4.55, 11, 7, 0.56, seed=19)
    wall = wall_material()
    cube("Wall", (0, 6.0, 1.60), (7.0, 0.36, 3.20), wall)
    # A plinth and shallow buttresses give the wall a real profile instead of
    # a flat cardboard panel.
    base_stone = stone_material("BaghBaseStone", (0.15, 0.12, 0.085))
    cube("WallPlinth", (0, 5.77, 0.17), (7.18, 0.62, 0.34), base_stone)
    for side in (-1, 1):
        cube(f"Buttress-{side}", (side * 2.72, 5.72, 1.58),
             (0.34, 0.24, 3.16), base_stone)
        cube(f"ButtressCap-{side}", (side * 2.72, 5.68, 3.18),
             (0.44, 0.34, 0.12), base_stone)
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
    gate_stone = stone_material("GateStone", (0.12, 0.10, 0.075))
    for side in (-1, 1):
        cube(f"GateJamb-{side}", (side * 0.86, 5.82, 1.03),
             (0.18, 0.34, 2.08), gate_stone)
    for i in range(9):
        a = (i / 8.0) * math.pi
        cube(f"Voussoir-{i}", (math.cos(a) * 0.87, 5.86, 2.10 + math.sin(a) * 0.87),
             (0.16, 0.22, 0.20), gate_stone, rot=(0, -a, 0))
    cube("Threshold", (0, 5.70, 0.055), (1.95, 0.56, 0.11), gate_stone)
    # One dark timber door stands ajar, so the entrance has a human scale.
    # From inside it is swung almost flat against the reveal; otherwise it
    # fills a third of the frame like a barn door.
    door_rot = 1.05 if inside else 0.22
    cube("GateDoor", (-0.38, 6.02, 1.04), (0.70, 0.055, 1.86), dark_wood(),
         rot=(0, 0, door_rot))
    iron_door = principled("DoorIron", (0.020, 0.018, 0.016), roughness=0.78, metallic=0.55)
    for z in (0.55, 1.42):
        cube(f"DoorStrap-{z}", (-0.40, 5.985, z), (0.62, 0.010, 0.035),
             iron_door, rot=(0, 0, door_rot))
    # Iron studs and a ring handle. The inside shot is now a close view of the
    # door, so the hardware has to carry the frame.
    def door_front(u):
        return (-0.38 + u * math.cos(door_rot) - 0.034 * math.sin(door_rot),
                6.02 + u * math.sin(door_rot) + 0.034 * math.cos(door_rot))
    for i, u in enumerate((-0.24, -0.12, 0.0, 0.12, 0.24)):
        dx, dy = door_front(u)
        sphere(f"DoorStud-{i}", (dx, dy, 0.72 + (i % 2) * 0.42), 0.014,
               iron_door, segments=10, rings=6)
    dx, dy = door_front(0.0)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.075, minor_radius=0.012,
        major_segments=24, minor_segments=8,
        location=(dx, dy, 1.04), rotation=(math.pi / 2, 0, door_rot)
    )
    assign(bpy.context.object, iron_door)
    # dark space well behind the opening
    cube("Beyond", (0, 12.5, 1.5), (12.0, 0.05, 6.0),
         principled("BeyondBlack", (0.004, 0.004, 0.004), roughness=0.95))
    if not inside:
        # A far wall inside the garden, so the gate is an opening into a place,
        # not a hole cut in a black card. The crowd stands against this wall.
        cube("FarWall", (0, 10.4, 1.55), (9.0, 0.30, 3.10),
             wall_material())
        area("GateDepth", (0, 8.7, 2.2), (0, 9.8, 1.2), 105, 2.1,
             (1.0, 0.44, 0.14))
    else:
        # From the garden looking out: a low street wall beyond the gate gives
        # the doorway a lit destination and catches the lamp.
        cube("OutsideWall", (0.0, -2.0, 1.35), (7.0, 0.30, 2.70),
             wall_material())
        # A lit doorway and a tree on the far side of the lane: the gate should
        # open onto a place, not onto a flat brick backdrop.
        cube("StreetDoorGlow", (0.28, -1.83, 0.96), (0.78, 0.018, 1.62),
             emission("StreetDoorWarm", (1.0, 0.38, 0.09), 0.42))
        street_tree = principled("StreetTreeTrunk", (0.012, 0.009, 0.006), roughness=0.95)
        street_leaf = principled("StreetTreeLeaf", (0.005, 0.009, 0.004), roughness=0.92)
        tree_kit("StreetTree", -1.35, -0.20, 0.0, 3.4, street_tree, street_leaf,
                 seed=27, spread=1.3)
        area("StreetFill", (1.8, 1.8, 2.6), (0.0, -1.0, 1.2), 78, 2.0,
             (1.0, 0.47, 0.18))
    # coping stones, individual blocks with worn edges and uneven joints
    stone = stone_material()
    cube("CopingBase", (0, 6.0, 3.245), (7.32, 0.55, 0.13), stone)
    for i in range(17):
        x = -3.36 + i * 0.42
        cube(f"Coping-{i:02d}", (x, 5.99, 3.335),
             (0.39, 0.54, 0.13 + (i % 3) * 0.015), stone,
             rot=(0, 0, (i % 2 - 0.5) * 0.012))
    pockmarks(count=78)
    # dark tree mass at the left, plus a separate out-of-focus branch close to
    # the lens so the frame has foreground, middle ground and wall.
    # No foreground tree: at this lens a canopy became a black mountain across
    # the top-left corner. The wall and gate carry the frame on their own.
    # torn orders pasted on the plaster, at different heights and angles
    torn_notice("OrderLeft", -1.92, 5.795, 1.62, rot=0.035, width=0.42, height=0.54)
    torn_notice("OrderRight", 1.55, 5.795, 1.18, rot=-0.085, width=0.34, height=0.46)
    torn_notice("OrderHigh", 2.25, 5.795, 2.02, rot=0.12, width=0.29, height=0.38)
    # a few loose scraps and plaster chips caught at the wall foot
    rng = random.Random(1919)
    paper = paper_material("BaghScrap", (0.48, 0.39, 0.25))
    for i in range(13):
        paper_scrap(f"BaghPaper-{i:02d}", rng.uniform(-2.6, 2.6),
                    rng.uniform(5.15, 5.68), 0.045, paper,
                    size=rng.uniform(0.055, 0.13), rot=rng.uniform(-1.2, 1.2))
    # cloth at the threshold; it moves once in the film overlay
    cloth = principled("Cloth", (0.72, 0.67, 0.56), roughness=0.9)
    cloth_y = 6.30 if inside else 5.45
    cube("Cloth", (0.32, cloth_y, 0.022), (0.20, 0.13, 0.006), cloth,
         rot=(0, 0.12, 0.18))
    if not empty and not inside:
        # A handful of silhouettes inside the gate, against the far wall. No
        # faces, no reconstructed violence, just scale and a human outline.
        for i, (x, y, s) in enumerate((
            (-0.52, 7.25, 0.96), (-0.10, 7.42, 1.02), (0.37, 7.20, 0.94),
            (0.65, 7.55, 0.99), (-0.86, 7.65, 0.90),
            (1.28, 7.28, 0.86),
        )):
            crowd_figure(f"Crowd{i}", x, y, scale=s,
                         pose=(-11 if i % 2 else 8), cloth=(0.011, 0.010, 0.009))
    if empty:
        # The empty gate from inside: a fallen shoe, dropped paper and three
        # spent cases, all on the garden side of the threshold.
        prop_y = 6.35 if inside else 5.12
        leather = principled("EmptyLeather", (0.022, 0.016, 0.011), roughness=0.72)
        cube("EmptyShoeSole", (0.58, prop_y + 0.16, 0.035), (0.22, 0.10, 0.035), leather,
             rot=(0, 0, -0.34))
        cube("EmptyShoeUpper", (0.52, prop_y + 0.18, 0.085), (0.15, 0.075, 0.085), leather,
             rot=(0, 0.10, -0.34))
        for i in range(9):
            paper_scrap(f"EmptyPaper-{i}", rng.uniform(-.55, .90),
                        prop_y + rng.uniform(-.15, .65), 0.046, paper,
                        size=rng.uniform(0.06, 0.16), rot=rng.uniform(-1.4, 1.4))
        brass_case = brass("CaseBrass", (0.42, 0.25, 0.075), roughness=0.34)
        for i, (x, y, r) in enumerate(((-.18, prop_y, .2), (.08, prop_y - .18, -.4),
                                       (.71, prop_y + .30, .9))):
            shell_casing(f"EmptyCase-{i}", x, y, 0.032, brass_case, rot=r)
    dust(150, seed=1919, zmax=3.2, ymax=14)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 6.0, 1.25))
    focus = bpy.context.object
    bpy.ops.object.light_add(type="POINT", location=(0, 7.4, 1.25))
    interior = bpy.context.object
    interior.data.energy = 42
    interior.data.color = (1.0, 0.40, 0.12)
    interior.data.shadow_soft_size = 0.55
    # A small hanging oil lamp inside the gate. It is a warm practical, not a
    # reconstruction of the site's lighting; it gives the arch a readable edge.
    iron = principled("GateIron", (0.025, 0.022, 0.019), roughness=0.76, metallic=0.45)
    lamp_y = 6.42 if inside else 5.58
    bracket_y = 6.28 if inside else 5.72
    cube("LampBracket", (1.28, bracket_y, 2.58), (0.56, 0.30, 0.035),
         iron, rot=(0, 0.25, 0))
    cylinder("LampChain", (1.10, lamp_y, 2.40), 0.008, 0.36, iron, vertices=8)
    cylinder("LampTop", (1.10, lamp_y, 2.20), 0.12, 0.035, iron, vertices=16)
    sphere("LampGlass", (1.10, lamp_y, 2.10), 0.105,
           emission("GateLampGlow", (1.0, 0.30, 0.06), 2.2), segments=16, rings=10)
    bpy.context.object.scale = (1.0, 1.0, 1.35)
    # thin cage bars keep the practical from reading as a floating orange egg
    for i in range(6):
        a = i * math.tau / 6
        cube(f"LampCage-{i}", (1.10 + math.cos(a) * 0.085,
                               lamp_y + math.sin(a) * 0.085, 2.10),
             (0.012, 0.012, 0.24), iron, rot=(0, 0, -a))
    bpy.ops.object.light_add(type="POINT", location=(1.10, lamp_y, 2.10))
    gate_lamp = bpy.context.object
    gate_lamp.data.energy = 26
    gate_lamp.data.color = (1.0, 0.37, 0.10)
    gate_lamp.data.shadow_soft_size = 0.12
    if inside:
        # Three-quarter view from inside, far enough back to keep the arch, the
        # door, the threshold and the paving in one composition.
        camera((2.60, 11.80, 1.90), (-0.20, 6.0, 1.35), lens=45, fstop=5.0, focus=focus)
        bpy.context.scene.view_settings.exposure = -0.38
        area("InsideFill", (0.0, 7.4, 2.8), (0, 6.0, 1.3), 150, 2.4, (0.58, 0.46, 0.34))
        area("DoorFill", (1.35, 8.0, 1.65), (-0.30, 6.0, 1.0), 70, 1.4,
             (1.0, 0.48, 0.20))
    else:
        camera((0.15, -3.2, 0.82), (0, 6.0, 1.50), lens=40, fstop=4.2, focus=focus)
        bpy.context.scene.view_settings.exposure = -0.35
        area("WallFill", (4.2, -0.8, 2.6), (0, 6, 1.4), 95, 2.4,
             (0.40, 0.52, 0.70))
    area("LowSun", (-9, 3, 4.2), (0, 6, 1.5), 760, 5.0, (1.0, 0.44, 0.15))
    area("CoolFill", (8, 0, 5.0), (0, 6, 1.2), 170, 7.0, (0.34, 0.55, 0.75))


def scene_bagh_wall(samples, width, height, out):
    _bagh(False)
    render(samples, width, height, out)


def scene_bagh_gate(samples, width, height, out):
    _bagh(True)
    render(samples, width, height, out)


def scene_bagh_gate_empty(samples, width, height, out):
    _bagh(True, empty=True)
    render(samples, width, height, out)


def scene_wall_scar(samples, width, height, out):
    reset()
    dark_world((0.0004, 0.0003, 0.0003))
    plaster = plaster_material("ScarPlaster", (0.30, 0.235, 0.155))
    cube("ScarWall", (0, 0, 1.10), (4.40, 0.50, 2.20), plaster)
    coping = stone_material("ScarCopingStone", (0.19, 0.15, 0.11))
    cube("ScarCoping", (0, -0.02, 2.22), (4.62, 0.60, 0.16), coping)
    cube("ScarPlinth", (0, -0.06, 0.11), (4.62, 0.66, 0.22), coping)
    hole = principled("ScarHoleMat", (0.004, 0.003, 0.002), roughness=0.99)
    chip = principled("ScarChipMat", (0.36, 0.29, 0.20), roughness=0.97)
    rng = random.Random(41)
    for i in range(96):
        x = rng.uniform(-1.85, 1.85)
        z = rng.uniform(0.36, 1.96)
        r = rng.uniform(0.0032, 0.0125)
        # A tiny flat crater: pale plaster lip, dark centre. The old marks were
        # two centimetres wide and read as beads stuck to the wall.
        cylinder(f"ScarChip-{i:02d}", (x, -0.2520, z), r * 1.22, 0.0008,
                 chip, rot=(math.pi / 2, 0, 0), vertices=10)
        cylinder(f"ScarHole-{i:02d}", (x, -0.2530, z), r * 0.78, 0.0008,
                 hole, rot=(math.pi / 2, 0, 0), vertices=10)
    # a few brick-shaped losses near the coping, without a rectangular decal
    brick_mat = principled("ScarBrick", (0.18, 0.078, 0.035), roughness=0.94)
    for i, (bx, bz) in enumerate(((0.38, 1.92), (0.47, 1.90), (0.42, 1.83),
                                  (0.83, 1.95), (0.94, 1.88))):
        cube(f"ScarBrick-{i}", (bx, -0.252, bz), (0.080, 0.004, 0.038),
             brick_mat, rot=(0, 0, 0.015 - i * 0.01))
    # falling plaster dust and a few chips caught in the air
    rng2 = random.Random(902)
    plaster_bit = principled("ScarPlasterBit", (0.42, 0.36, 0.25), roughness=0.95)
    for i in range(32):
        s = rng2.uniform(0.004, 0.015)
        cube(f"ScarFall-{i}", (rng2.uniform(-1.9, 1.9), rng2.uniform(-0.9, -0.28),
                              rng2.uniform(0.35, 1.95)),
             (s, s, s), plaster_bit, rot=(rng2.uniform(0, 1), rng2.uniform(0, 1), 0))
    # ground, plaster debris and three spent cases: a close-up needs a scale cue
    paver_floor("ScarPavers", 0.0, -2.1, 12, 9, 0.33, z=0.018, seed=144)
    rubble = stone_material("ScarRubble", (0.28, 0.23, 0.16))
    for i in range(9):
        s = 0.025 + (i % 3) * 0.012
        cube(f"ScarRubble-{i}", (-0.55 + i * 0.15, -0.48 + (i % 2) * 0.10,
                                 0.035 + s * 0.5), (s, s * 0.8, s * 0.45),
             rubble, rot=(0, 0, i * 0.31))
    case_mat = aged_brass("ScarCase")
    cube("ScarSill", (0.72, -1.38, 0.32), (1.34, 0.72, 0.18), coping)
    for i, (cx, cy, cz) in enumerate(((0.44, -1.30, 0.432), (0.55, -1.36, 0.430),
                                      (0.35, -1.39, 0.431))):
        cylinder(f"ScarCase-{i}", (cx, cy, cz), 0.013, 0.058, case_mat,
                 rot=(math.pi / 2, 0, 0.2 + i * 0.25), vertices=14)
    sphere("ScarSlug", (0.67, -1.24, 0.432), 0.016, case_mat,
           segments=14, rings=8).scale = (1.0, 1.5, 0.55)
    dust(170, seed=88, zmax=2.0, ymax=4.2)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.1, 0, 1.05))
    focus = bpy.context.object
    camera((0.40, -4.80, 1.15), (0.03, 0, 0.95), lens=42, fstop=2.4, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.62
    area("HardSun", (-2.6, -1.2, 2.9), (0, 0, 1.1), 470, 0.30, (1.0, 0.54, 0.24))
    area("CoolRim", (2.6, 0.4, 1.8), (0, 0, 1.1), 110, 1.2, (0.38, 0.60, 0.90))
    area("Bounce", (0.4, -2.0, 0.30), (0, 0, 0.9), 24, 1.2, (0.55, 0.40, 0.24))
    render(samples, width, height, out)


def scene_watch(samples, width, height, out):
    reset()
    dark_world((0.0004, 0.0003, 0.0002))
    floor = principled("DustFloor", (0.040, 0.028, 0.017), roughness=0.98)
    plane("Floor", (0, 0, 0), 7, floor)
    # Weathered boards under the dust, so the watch has a world rather than a
    # black infinite plane.
    plank = principled("WatchPlanks", (0.036, 0.023, 0.014), roughness=0.78)
    for i in range(9):
        cube(f"WatchPlank-{i}", (0, -0.78 + i * 0.22, -0.012),
             (3.0, 0.205, 0.020), plank, rot=(0, 0, (i % 2 - 0.5) * 0.008))
    clock()
    # A folded letter, a broken glass and three spent cases: the table is a
    # place where an ordinary afternoon stopped.
    letter = paper_material("WatchLetter", (0.48, 0.40, 0.28))
    cube("WatchLetter", (-0.72, 0.24, 0.018), (0.58, 0.41, 0.008), letter,
         rot=(0, 0, -0.28))
    cube("WatchLetterFold", (-0.76, 0.24, 0.026), (0.54, 0.30, 0.009), letter,
         rot=(0, 0, -0.28))
    ink = principled("WatchInk", (0.016, 0.012, 0.008), roughness=0.7)
    for i in range(5):
        cube(f"WatchLine-{i}", (-0.93, 0.15 + i * 0.038, 0.035),
             (0.27 - (i % 2) * 0.06, 0.004, 0.0018), ink,
             rot=(0, 0, -0.28))
    glass = principled("WatchGlass", (0.17, 0.25, 0.25), roughness=0.09,
                       transmission=0.62)
    rng = random.Random(630)
    for i in range(11):
        s = rng.uniform(0.012, 0.036)
        cube(f"Splinter-{i}", (rng.uniform(-0.65, 0.65), rng.uniform(-0.45, 0.62), 0.016),
             (s, s * rng.uniform(0.35, 0.85), 0.0022), glass,
             rot=(0, 0, rng.uniform(0, math.pi)))
    case_brass = brass("WatchCaseBrass", (0.44, 0.27, 0.075), roughness=0.30)
    for i, (x, y, r) in enumerate(((-0.31, 0.34, .25), (-0.36, 0.46, -.4), (0.18, 0.53, .8))):
        shell_casing(f"WatchCase-{i}", x, y, 0.022, case_brass, rot=r)
    # a dark chair leg in the background, out of focus
    cube("ChairLeg", (1.20, 1.18, 0.34), (0.07, 0.07, 0.72),
         principled("ChairWood", (0.018, 0.012, 0.008), roughness=0.76),
         rot=(0, 0.08, 0))
    dust(140, seed=515, zmax=0.34, ymax=1.4)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0.055))
    focus = bpy.context.object
    camera((0.62, -1.62, 0.84), (0, 0, 0.040), lens=54, fstop=1.9, focus=focus)
    bpy.context.scene.view_settings.exposure = -1.05
    area("Key", (-0.9, -1.1, 1.7), (0, 0, 0.07), 105, 0.7, (1.0, 0.52, 0.24))
    area("Rim", (1.2, 0.9, 1.2), (0, 0, 0.06), 70, 0.5, (0.42, 0.68, 1.0))
    area("Fill", (0, -1.7, 0.4), (0, 0, 0.06), 9, 1.5, (0.55, 0.55, 0.62))
    render(samples, width, height, out)


def scene_well(samples, width, height, out):
    reset()
    sky((0.006, 0.016, 0.022), (0.42, 0.24, 0.11), (0.005, 0.005, 0.007))
    ground = principled("WellGround", (0.075, 0.055, 0.036), roughness=0.97)
    # A solid slab with the well mouth cut out. A flat plane across the set
    # covered the water and made the well look like a tiled paddling pool.
    cube("Ground", (0, 5, -0.30), (40, 40, 0.60), ground)
    ground_obj = bpy.data.objects["Ground"]
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=64, radius=1.62, depth=3.0, location=(0, 3.0, -1.0)
    )
    cutter = bpy.context.object
    cutter.name = "GroundWellCutter"
    mod = ground_obj.modifiers.new("WellMouth", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    mod.solver = "EXACT"
    bpy.context.view_layer.objects.active = ground_obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)
    paver_floor("WellPavers", 0, 4.15, 19, 15, 0.34, seed=73, skip=(0, 3.0, 2.15))
    stone = stone_material("WellStone", (0.24, 0.19, 0.135))
    # A real circular parapet: an outer cylinder with a smaller cylinder
    # subtracted, not a torus with blocks around it like a gear.
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=64, radius=2.05, depth=0.70, location=(0, 3.0, 0.35)
    )
    parapet = bpy.context.object
    parapet.name = "WellParapet"
    assign(parapet, stone)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=64, radius=1.52, depth=1.40, location=(0, 3.0, 0.35)
    )
    cutter = bpy.context.object
    cutter.name = "WellCutter"
    mod = parapet.modifiers.new("WellOpening", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    mod.solver = "EXACT"
    bpy.context.view_layer.objects.active = parapet
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)
    bevel = parapet.modifiers.new("WellWornEdge", "BEVEL")
    bevel.width = 0.035
    bevel.segments = 3
    # The shaft continues below the rim so the eye sees depth and water.
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=64, radius=1.52, depth=1.90, location=(0, 3.0, -0.55)
    )
    shaft = bpy.context.object
    shaft.name = "WellShaft"
    assign(shaft, stone)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=64, radius=1.42, depth=2.10, location=(0, 3.0, -0.55)
    )
    cutter = bpy.context.object
    cutter.name = "ShaftCutter"
    mod = shaft.modifiers.new("ShaftOpening", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    mod.solver = "EXACT"
    bpy.context.view_layer.objects.active = shaft
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)
    # A dark, gently rippled water surface. The normal detail gives the sky a
    # broken specular path instead of a flat black disc.
    water = principled("WellWater", (0.004, 0.010, 0.012), roughness=0.10, metallic=0.12)
    wnodes = water.node_tree.nodes
    wlinks = water.node_tree.links
    wtmp = wnodes.new("ShaderNodeTexCoord")
    wnoise = wnodes.new("ShaderNodeTexNoise")
    wnoise.inputs["Scale"].default_value = 11.0
    wnoise.inputs["Detail"].default_value = 4.0
    wbump = wnodes.new("ShaderNodeBump")
    wbump.inputs["Strength"].default_value = 0.12
    wbump.inputs["Distance"].default_value = 0.008
    wlinks.new(wtmp.outputs["Object"], wnoise.inputs["Vector"])
    wlinks.new(wnoise.outputs["Fac"], wbump.inputs["Height"])
    wlinks.new(wbump.outputs["Normal"], wnodes.get("Principled BSDF").inputs["Normal"])
    cylinder("Water", (0, 3.0, -0.22), 1.45, 0.02, water, vertices=64)
    # worn capstone ring
    bpy.ops.mesh.primitive_torus_add(
        major_radius=1.80, minor_radius=0.13,
        major_segments=64, minor_segments=12, location=(0, 3.0, 0.71)
    )
    assign(bpy.context.object, stone)
    # vertical joints on the outer face: shallow mortar, not black slots
    joint_mat = principled("WellJointMat", (0.045, 0.034, 0.024), roughness=0.98)
    for i in range(16):
        a = (i / 16.0) * math.tau
        cube(f"WellJoint-{i:02d}",
             (math.sin(a) * 2.045, 3.0 + math.cos(a) * 2.045, 0.34),
             (0.009, 0.020, 0.38), joint_mat,
             rot=(0, 0, -a))
    # a cloth left on the rim: several folds, one corner hanging over the edge
    cloth = principled("WellCloth", (0.46, 0.41, 0.32), roughness=0.96)
    cube("WellCloth", (0.78, 4.22, 0.735), (0.38, 0.26, 0.012), cloth, rot=(0, 0.10, 0.38))
    cube("WellClothFold", (0.64, 4.15, 0.745), (0.18, 0.12, 0.014), cloth, rot=(0, 0.22, 0.12))
    cube("WellClothHang", (0.94, 4.10, 0.62), (0.12, 0.20, 0.013), cloth,
         rot=(0.35, 0.10, 0.30))
    cube("WellClothTail", (1.00, 4.04, 0.49), (0.09, 0.12, 0.010), cloth,
         rot=(0.55, 0.0, 0.15))
    # moss on the shaded rim and a few petals floating on the black water
    moss = principled("WellMoss", (0.015, 0.033, 0.012), roughness=0.96)
    for i, (x, y, s) in enumerate(((-1.72, 2.38, .10), (-1.42, 2.12, .07),
                                   (-1.84, 3.10, .08), (1.72, 3.54, .06),
                                   (-1.55, 4.12, .05))):
        ico(f"WellMoss-{i}", (x, y, 0.73), s, moss, subdivisions=2)
    petal = principled("WellPetal", (0.56, 0.18, 0.016), roughness=0.64)
    for i, (x, y) in enumerate(((-0.62, 2.75), (-0.38, 3.42), (0.12, 2.54),
                                (0.55, 3.72), (-0.78, 3.82), (0.32, 3.28))):
        cube(f"WaterPetal-{i}", (x, y, -0.208), (0.055, 0.032, 0.003), petal,
             rot=(0, 0, i * 0.8))
    # concentric ripple highlights, very low contrast
    ripple = principled("WellRipple", (0.10, 0.13, 0.13), roughness=0.15, metallic=0.2)
    for i, r in enumerate((0.38, 0.66, 0.94)):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=r, minor_radius=0.0035,
            major_segments=48, minor_segments=6, location=(0.1, 3.2, -0.205)
        )
        assign(bpy.context.object, ripple)
    # a bucket and coiled rope, left on the parapet
    wood = dark_wood("BucketWood")
    cylinder("Bucket", (-1.52, 3.30, 0.86), 0.22, 0.30, wood, vertices=24)
    for z in (0.73, 0.99):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.22, minor_radius=0.014,
            major_segments=28, minor_segments=6, location=(-1.52, 3.30, z)
        )
        assign(bpy.context.object, aged_brass("BucketBand"))
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.12, minor_radius=0.012,
        major_segments=24, minor_segments=6, location=(-1.52, 3.30, 1.03),
        rotation=(math.pi / 2, 0, 0)
    )
    assign(bpy.context.object, aged_brass("BucketHandle"))
    rope = principled("Rope", (0.18, 0.12, 0.055), roughness=0.94)
    for i in range(6):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.14 + i * 0.010, minor_radius=0.010,
            major_segments=20, minor_segments=6,
            location=(-1.52 + i * 0.012, 3.72, 0.75 + i * 0.003),
            rotation=(math.pi / 2, 0, 0.2)
        )
        assign(bpy.context.object, rope)
    # background wall, shallow stone pilasters and a tree over the coping
    cube("BackWall", (0, 8.6, 2.30), (12.0, 0.24, 4.60), wall_material())
    pilaster = stone_material("WellPilaster", (0.16, 0.125, 0.085))
    for side in (-1, 1):
        cube(f"WellPilaster-{side}", (side * 2.45, 8.34, 1.70),
             (0.28, 0.24, 3.40), pilaster)
        cube(f"WellPilasterCap-{side}", (side * 2.45, 8.30, 3.42),
             (0.40, 0.34, 0.12), pilaster)
    trunk = principled("Trunk", (0.018, 0.012, 0.007), roughness=0.94)
    leaf = principled("Leaf", (0.006, 0.011, 0.005), roughness=0.9)
    tree_kit("WellTree", -5.2, 8.15, 0.0, 6.0, trunk, leaf, seed=83, spread=2.6)
    # vines hanging over the wall; the old black rectangles read as windows
    leaf_cluster("WellVine", -1.25, 8.40, 2.70, 0.34, leaf, count=7, seed=67)
    dust(190, seed=313, zmax=3.6, ymax=11)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 3.0, 0.10))
    focus = bpy.context.object
    camera((0.90, -3.40, 3.25), (0, 3.00, 0.55), lens=46, fstop=3.0, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.10
    area("Sky", (-5, -2, 7), (0, 3, 0.4), 780, 7.0, (0.46, 0.62, 0.88))
    area("Warm", (6, 6, 3.5), (0, 3, 0.4), 420, 4.0, (1.0, 0.48, 0.20))
    area("WaterGlint", (1.6, 0.8, 5.2), (0, 3, 0.0), 900, 1.8, (0.62, 0.78, 0.94))
    area("FrontFill", (-1.0, -3.0, 2.0), (0, 3.0, 0.8), 85, 2.0, (0.48, 0.42, 0.34))
    render(samples, width, height, out)


def scene_report(samples, width, height, out):
    reset()
    dark_world((0.0005, 0.0004, 0.0003))
    plane("Desk", (0, 0, 0), 7, dark_wood())
    leather_pad = principled("ReportPadLeather", (0.028, 0.020, 0.014), roughness=0.70)
    cube("ReportPad", (0, 0, 0.004), (2.42, 1.68, 0.008), leather_pad,
         rot=(0, 0, -0.012))
    paper = paper_material("ReportPaper", (0.62, 0.55, 0.42))
    cube("Report", (0, 0, 0.012), (2.15, 1.42, 0.010), paper, rot=(0, 0, 0.018))
    ink = principled("ReportInk", (0.025, 0.020, 0.015), roughness=0.65)
    red = principled("StampRed", (0.30, 0.025, 0.015), roughness=0.82)
    text_obj("ReportHead", "HUNTER COMMISSION", (-1.00, 0.55, 0.026), 0.105, mat=ink)
    text_obj("ReportSub", "DISORDERS INQUIRY · 1919–1920", (-1.00, 0.40, 0.026), 0.045, mat=ink)
    text_obj("ReportDead", "379 DEAD", (-1.00, 0.14, 0.026), 0.160, mat=ink)
    text_obj("ReportWounded", "1,200 WOUNDED", (-1.00, -0.10, 0.026), 0.100, mat=ink)
    text_obj("ReportNote", "THE OFFICIAL FIGURES", (-1.00, -0.29, 0.026), 0.042, mat=ink)
    # A rubber-stamp border, not a solid red block. The old filled frame
    # buried the words and looked like a pink sticker on the report.
    text_obj("Stamp", "NO PROSECUTION", (0.40, -0.47, 0.031), 0.061, mat=red, align="CENTER")
    for name, loc, dims in (
        ("StampTop", (0.40, -0.395, 0.026), (0.86, 0.012, 0.002)),
        ("StampBottom", (0.40, -0.545, 0.026), (0.86, 0.012, 0.002)),
        ("StampLeft", (-0.03, -0.47, 0.026), (0.012, 0.16, 0.002)),
        ("StampRight", (0.83, -0.47, 0.026), (0.012, 0.16, 0.002)),
    ):
        cube(name, loc, dims, red)
    # ruled body lines under the headline: a document, not a poster
    for i in range(7):
        cube(f"ReportLine-{i}", (0.22, 0.27 - i * 0.045, 0.024),
             (0.58 - (i % 3) * 0.07, 0.004, 0.0016), ink)
    # lamp, inkpot, stamp block, magnifier, glasses and paper stacks
    metal = aged_brass()
    cylinder("LampBase", (1.30, 0.62, 0.12), 0.15, 0.22, metal, vertices=24)
    cylinder("LampStem", (1.30, 0.62, 0.27), 0.022, 0.20, metal, vertices=12)
    shade_metal = principled("ReportShadeMetal", (0.045, 0.032, 0.020),
                             roughness=0.48, metallic=0.45)
    bpy.ops.mesh.primitive_cone_add(
        vertices=32, radius1=0.23, radius2=0.085, depth=0.19,
        location=(1.30, 0.62, 0.39)
    )
    assign(bpy.context.object, shade_metal)
    cylinder("LampGlow", (1.30, 0.62, 0.292), 0.16, 0.010,
             emission("ReportLamp", (1.0, 0.52, 0.22), 0.85), vertices=24)
    bpy.ops.object.light_add(type="POINT", location=(1.30, 0.62, 0.29))
    lamp_light = bpy.context.object
    lamp_light.data.energy = 18
    lamp_light.data.color = (1.0, 0.56, 0.25)
    lamp_light.data.shadow_soft_size = 0.18
    for i in range(5):
        cube(f"Stack-{i}", (-1.38 + i * 0.012, -0.64 + i * 0.020, 0.020 + i * 0.012),
             (0.34, 0.25, 0.008), paper, rot=(0, 0, i * 0.018))
    cylinder("Inkpot", (1.18, -0.68, 0.10), 0.12, 0.17,
             principled("ReportInkpot", (0.025, 0.020, 0.015), roughness=0.28), vertices=24)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.115, minor_radius=0.014,
        major_segments=24, minor_segments=6, location=(1.15, -0.62, 0.185)
    )
    assign(bpy.context.object, metal)
    cube("ReportPen", (0.95, -0.88, 0.035), (0.38, 0.026, 0.015),
         principled("ReportPenInk", (0.012, 0.009, 0.006), roughness=0.32),
         rot=(0, 0, 0.75))
    # rubber stamp lying on the desk
    cube("StampBlock", (0.92, 0.62, 0.045), (0.20, 0.13, 0.045),
         principled("StampWood", (0.10, 0.060, 0.032), roughness=0.72),
         rot=(0, 0, -0.25))
    cylinder("StampHandle", (0.92, 0.62, 0.13), 0.045, 0.12,
             principled("StampHandleMat", (0.055, 0.035, 0.020), roughness=0.55),
             rot=(0, 0, -0.25), vertices=16)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.10, minor_radius=0.013,
        major_segments=28, minor_segments=6, location=(-0.98, -0.92, 0.034),
        rotation=(math.pi / 2, 0, -0.3)
    )
    assign(bpy.context.object, metal)
    cylinder("ReportMagnifier", (-0.98, -0.92, 0.034), 0.092, 0.004,
             principled("ReportLens", (0.18, 0.25, 0.25), roughness=0.08,
                        transmission=0.6), rot=(math.pi / 2, 0, -0.3), vertices=28)
    spectacles("ReportGlasses", -0.10, -0.74, 0.032)
    # a desk edge and a dark chair back give the overhead frame depth
    cube("ReportDeskEdge", (0, 0.88, -0.03), (4.2, 0.16, 0.12),
         principled("ReportDeskEdgeMat", (0.045, 0.028, 0.017), roughness=0.8))
    cube("ReportChair", (-1.95, 0.20, 0.52), (0.10, 1.2, 1.05),
         principled("ReportChairMat", (0.020, 0.014, 0.010), roughness=0.78),
         rot=(0, 0, 0.04))
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0.02))
    focus = bpy.context.object
    camera((-1.15, -3.05, 2.85), (0.02, 0.02, 0.10), lens=42, fstop=2.1, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.92
    area("Key", (0.7, -2.1, 3.2), (0, 0, 0.05), 250, 1.7, (1.0, 0.65, 0.36))
    area("Rim", (2.0, 0.7, 1.7), (0, 0, 0.05), 115, 1.6, (0.42, 0.60, 0.82))
    area("Side", (-2.3, 0.6, 1.5), (0, 0, 0.05), 24, 1.2, (0.55, 0.38, 0.26))
    render(samples, width, height, out)


def scene_lamp(samples, width, height, out):
    reset()
    dark_world((0.0004, 0.0003, 0.0002))
    plane("Table", (0, 0, 0), 6, dark_wood())
    plank = principled("LampPlanks", (0.032, 0.020, 0.012), roughness=0.74)
    for i in range(7):
        cube(f"LampPlank-{i}", (0, -0.75 + i * 0.25, -0.010),
             (2.8, 0.235, 0.018), plank, rot=(0, 0, (i % 2 - 0.5) * 0.007))
    # A shuttered window behind the table gives the dark room a second plane
    # and a cool edge against the candle.
    cube("LampWall", (0, 1.65, 1.15), (4.4, 0.16, 2.30),
         plaster_material("LampWallPlaster", (0.115, 0.090, 0.065)))
    cube("WindowGlow", (0, 1.55, 0.92), (1.32, 0.012, 0.64),
         emission("WindowMoon", (0.24, 0.36, 0.54), 0.88))
    bar_mat = principled("WindowBar", (0.020, 0.016, 0.012), 0.78)
    for i in range(5):
        cube(f"WindowBarV-{i}", (-0.66 + i * 0.33, 1.53, 0.92),
             (0.030, 0.035, 0.70), bar_mat)
    for i in range(3):
        cube(f"WindowBarH-{i}", (0, 1.53, 0.64 + i * 0.28),
             (1.36, 0.035, 0.030), bar_mat)
    for side in (-1, 1):
        cube(f"WindowFrameV-{side}", (side * 0.69, 1.51, 0.92),
             (0.055, 0.055, 0.74), dark_wood("WindowFrame"))
        cube(f"WindowSill-{side}", (side * 0.69, 1.47, 0.55),
             (0.16, 0.18, 0.04), dark_wood("WindowSill"))
    cube("WindowFrameTop", (0, 1.51, 1.275), (1.42, 0.055, 0.055),
         dark_wood("WindowFrame"))
    cube("WindowSill", (0, 1.47, 0.575), (1.48, 0.20, 0.045),
         dark_wood("WindowSill"))
    book_stack("LampBooks", -1.12, 0.05, 0.0, count=3)
    metal = aged_brass()
    # A candle in a brass dish is a cleaner object than a modelled oil lamp:
    # one small flame, one pool of wax, one letter. The frame stays dark.
    cylinder("CandleDish", (0, 0, 0.025), 0.170, 0.035, metal, vertices=40)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.155, minor_radius=0.012,
        major_segments=40, minor_segments=8, location=(0, 0, 0.047)
    )
    assign(bpy.context.object, metal)
    wax = principled("CandleWax", (0.50, 0.41, 0.285), roughness=0.58, transmission=0.04)
    cylinder("Candle", (0, 0, 0.175), 0.038, 0.265, wax, vertices=32)
    cylinder("Wick", (0, 0, 0.312), 0.004, 0.040,
             principled("WickChar", (0.018, 0.012, 0.008), roughness=0.96), vertices=10)
    flame(loc=(0, 0, 0.314), scale=0.52)
    # a letter and a pen
    paper = paper_material("LetterPaper", (0.58, 0.50, 0.36))
    cube("Letter", (0.46, -0.30, 0.012), (0.46, 0.30, 0.008), paper, rot=(0, 0, 0.16))
    letter_ink = principled("LetterInk", (0.030, 0.022, 0.016), roughness=0.72)
    text_obj("LetterLine1", "I renounce", (0.24, -0.26, 0.021), 0.036, mat=letter_ink,
             align="LEFT")
    text_obj("LetterLine2", "my knighthood", (0.24, -0.325, 0.021), 0.036, mat=letter_ink,
             align="LEFT")
    cube("Pen", (0.50, 0.14, 0.034), (0.30, 0.024, 0.014),
         principled("PenInk", (0.01, 0.008, 0.006), roughness=0.35), rot=(0, 0, 0.5))
    # envelope, red wax seal, spent match and a glass of water
    envelope = paper_material("EnvelopePaper", (0.42, 0.34, 0.23))
    cube("Envelope", (0.78, 0.18, 0.008), (0.46, 0.30, 0.006), envelope,
         rot=(0, 0, -0.28))
    cube("EnvelopeFlap", (0.78, 0.18, 0.013), (0.44, 0.135, 0.004), envelope,
         rot=(0, 0, -0.28))
    red = principled("LetterWax", (0.28, 0.018, 0.010), roughness=0.46)
    cylinder("LetterSeal", (0.78, 0.18, 0.024), 0.045, 0.012, red, vertices=20)
    cube("Match", (0.24, 0.44, 0.012), (0.20, 0.010, 0.006),
         principled("MatchWood", (0.28, 0.19, 0.09), roughness=0.9), rot=(0, 0, 0.8))
    sphere("MatchHead", (0.33, 0.49, 0.016), 0.015,
           principled("MatchHeadMat", (0.045, 0.018, 0.010), roughness=0.82))
    glass = principled("WaterGlass", (0.22, 0.30, 0.30), roughness=0.08,
                       transmission=0.55)
    cylinder("WaterGlass", (-0.65, -0.35, 0.10), 0.075, 0.20, glass, vertices=24)
    # a little spilled wax, so the candle is not a perfect primitive
    for i, (x, y, r) in enumerate(((0.045, -0.035, 0.035), (-0.030, 0.055, 0.028),
                                   (0.075, 0.020, 0.022), (0.11, -0.07, 0.018))):
        sphere(f"WaxDrip-{i}", (x, y, 0.050), r, wax, segments=16, rings=8).scale = (1.0, 1.0, 0.35)
    # a book edge in the foreground, out of focus
    cube("ForegroundBook", (-0.92, -0.78, 0.06), (0.54, 0.32, 0.12),
         principled("ForegroundBookMat", (0.05, 0.022, 0.014), roughness=0.6),
         rot=(0, 0.04, 0.18))
    # no floating dust in the Tagore close-up; the film overlay supplies it
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0.36))
    focus = bpy.context.object
    camera((0.86, -2.95, 1.16), (0, 0.10, 0.38), lens=45, fstop=2.2, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.62
    area("WarmKey", (0.9, -0.9, 1.7), (0, 0, 0.34), 95, 0.7, (1.0, 0.48, 0.18))
    area("CoolRim", (-1.0, 0.9, 1.2), (0, 0, 0.42), 42, 1.0, (0.38, 0.62, 0.92))
    area("WindowFill", (0.0, 0.7, 1.05), (0, 0.1, 0.38), 38, 0.9, (0.28, 0.42, 0.66))
    render(samples, width, height, out)


def scene_memorial(samples, width, height, out):
    reset()
    dark_world((0.0004, 0.0003, 0.0003))
    plane("Floor", (0, 0, 0), 10, stone_material("FloorStone", (0.045, 0.040, 0.035)))
    paver_floor("MemorialPavers", 0, 0.4, 9, 7, 0.48, seed=41)
    stone = stone_material("MemorialStone", (0.080, 0.070, 0.060))
    # A deep stone hall: side piers, a lit jali screen, and a bronze plaque.
    cube("MemorialWall", (0, 2.02, 1.55), (4.70, 0.36, 3.10), stone)
    for side in (-1, 1):
        cube(f"MemorialSide-{side}", (side * 2.18, 1.02, 1.55),
             (0.34, 1.64, 3.10), stone)
        cube(f"MemorialPier-{side}", (side * 1.73, 1.55, 1.62),
             (0.30, 0.42, 3.10), stone)
    # warm light behind the lattice, so the screen reads as pierced stone
    cube("JaliGlow", (0, 1.86, 1.55), (3.02, 0.018, 2.30),
         emission("MemorialJaliGlow", (1.0, 0.42, 0.11), 0.55))
    jali_screen("MemorialJali", 1.74, 0.42, width=3.00, height=2.30, cols=22, rows=18)
    # the plaque sits in front of the screen; gold text is lit, not black metal
    plaque = principled("MemorialPlaque", (0.080, 0.055, 0.030),
                        roughness=0.34, metallic=0.55)
    cube("Plaque", (0, 1.42, 1.48), (1.96, 0.045, 1.05), plaque)
    plaque_brass = aged_brass("PlaqueLip")
    cube("PlaqueLip", (0, 1.395, 0.94), (2.02, 0.075, 0.045), plaque_brass)
    cube("PlaqueLipTop", (0, 1.395, 2.03), (2.02, 0.075, 0.045), plaque_brass)
    for side in (-1, 1):
        cube(f"PlaqueJamb-{side}", (side * 0.995, 1.397, 1.49),
             (0.035, 0.065, 1.10), plaque_brass)
    gold = principled("MemorialGold", (0.80, 0.57, 0.20), roughness=0.40, metallic=0.38)
    text_obj("MemorialTitle", "JALLIANWALA BAGH", (0, 1.388, 1.80), 0.072,
             rot=(math.pi / 2, 0, 0), mat=gold, align="CENTER")
    text_obj("MemorialMemory", "IN MEMORY", (0, 1.388, 1.30), 0.052,
             rot=(math.pi / 2, 0, 0), mat=gold, align="CENTER")
    text_obj("Year", "1919", (0, 1.387, 1.56), 0.218,
             rot=(math.pi / 2, 0, 0), mat=gold, align="CENTER")
    # plinth and step
    cube("Plinth", (0, 0, 0.34), (0.96, 0.62, 0.68), stone)
    cube("PlinthCap", (0, 0, 0.70), (1.08, 0.74, 0.06), stone)
    cube("Step", (0, 0, 0.09), (1.48, 0.94, 0.18), stone)
    # bronze brazier, offset to the right so it does not hide the plaque
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.22,
                                         location=(0.78, 0.02, 0.82))
    bowl = bpy.context.object
    bowl.name = "MemorialBowl"
    bowl.scale = (1.0, 1.0, 0.38)
    assign(bowl, aged_brass("MemorialBronze"))
    smooth(bowl)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.205, minor_radius=0.017,
        major_segments=32, minor_segments=8, location=(0.78, 0.02, 0.885)
    )
    assign(bpy.context.object, aged_brass("MemorialBronzeRim"))
    ember_mat = emission("MemorialEmbers", (1.0, 0.22, 0.035), 2.4)
    for i, (ex, ey) in enumerate(((-0.06, -0.03), (0.05, -0.02), (0.02, 0.05),
                                  (-0.02, 0.06), (0.08, 0.03))):
        sphere(f"MemorialEmber-{i}", (0.78 + ex, 0.02 + ey, 0.875), 0.022,
               ember_mat, segments=10, rings=6).scale = (1.0, 1.0, 0.45)
    flame(loc=(0.78, 0.02, 0.885), scale=0.58)
    # two small brass diyas on the plinth
    for side in (-1, 1):
        cylinder(f"DiyaBase-{side}", (side * 0.36, -0.02, 0.735), 0.075, 0.035,
                 aged_brass("DiyaBrass"), vertices=20)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=10, radius=0.075,
                                             location=(side * 0.36, -0.02, 0.755))
        assign(bpy.context.object, aged_brass("DiyaBrass"))
        bpy.context.object.scale = (1.0, 1.0, 0.35)
        flame(loc=(side * 0.36, -0.02, 0.755), scale=0.16)
    # marigolds, petals and a few incense sticks
    marigold_cluster("Garland", 0, -0.30, 0.735, count=20, spread=0.58, seed=14)
    marigold_cluster("GarlandFront", 0.0, -0.345, 0.45, count=16, spread=0.44, seed=31)
    marigold_cluster("MemorialFloorFlowers", -1.16, -0.32, 0.055, count=13,
                     spread=0.30, seed=18)
    petal = principled("MemorialPetal", (0.58, 0.20, 0.018), roughness=0.66)
    rng = random.Random(919)
    for i in range(18):
        cube(f"MemorialPetal-{i}", (rng.uniform(-1.4, 1.3), rng.uniform(-0.6, 0.5), 0.045),
             (0.045, 0.026, 0.002), petal, rot=(0, 0, rng.uniform(0, math.pi)))
    incense = principled("IncenseStick", (0.16, 0.09, 0.045), roughness=0.9)
    ember = emission("IncenseEmber", (1.0, 0.22, 0.035), 4.0)
    for i in range(3):
        x = -0.56 + i * 0.06
        cylinder(f"Incense-{i}", (x, 0.12, 0.91), 0.006, 0.34, incense,
                 rot=(0.10, 0.08, 0), vertices=8)
        sphere(f"IncenseTip-{i}", (x - 0.01, 0.16, 1.08), 0.009, ember,
               segments=8, rings=6)
    # a soft vertical light shaft and a cool rim
    bpy.ops.object.light_add(type="SPOT", location=(0, -1.4, 5.2))
    spot = bpy.context.object
    spot.data.energy = 390
    spot.data.spot_size = math.radians(30)
    spot.data.spot_blend = 0.48
    spot.data.shadow_soft_size = 0.28
    spot.data.color = (1.0, 0.72, 0.46)
    spot.rotation_euler = (math.radians(15), 0, 0)
    area("PlaqueWash", (0, -1.8, 2.6), (0, 1.45, 1.55), 74, 1.4, (1.0, 0.72, 0.42))
    area("PlaqueFront", (0.0, -2.4, 1.25), (0, 1.0, 1.30), 34, 1.2, (1.0, 0.62, 0.30))
    area("Rim", (2.8, 1.8, 2.4), (0, 0.4, 1.1), 72, 1.8, (0.42, 0.60, 0.82))
    area("Fill", (-2.2, -1.8, 3.0), (0, 0.4, 1.0), 30, 2.5, (0.46, 0.38, 0.30))
    dust(100, seed=919, zmax=2.4, ymax=3.2)
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 1.10))
    focus = bpy.context.object
    camera((1.82, -5.15, 1.72), (-0.06, 0.22, 1.18), lens=42, fstop=2.4, focus=focus)
    bpy.context.scene.view_settings.exposure = -0.58
    render(samples, width, height, out)


SCENES = {
    "notice": scene_notice,
    "bagh-wall": scene_bagh_wall,
    "bagh-gate": scene_bagh_gate,
    "bagh-gate-empty": scene_bagh_gate_empty,
    "wall-scar": scene_wall_scar,
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

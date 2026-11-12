#!/usr/bin/env python3
"""Compile one film's invented scene into Blender geometry.

There is no set library. A film ships `data/films/<id>-sets.json`; its
`scenes` map is written per film by `scripts/film/design-sets.js` from that
film's own narration. Each entry names a space grammar, a hero object, a small
number of supporting props, its own dimensions, seed, tone, lens and light.

    "press-01": {
      "space": "warehouse",
      "hero": "press",
      "props": ["paper-rack", "ink-slab"],
      "seed": 4183, "framing": 0, "tone": "night",
      "dims": {"w": 13.0, "d": 7.4, "h": 5.2},
      "light": {"key": "warm", "fill": "cool", "practicals": 2},
      "visual": "...", "sfx": ["..."]
    }

The vocabulary lives in `scene_kit_base.py` (spaces) and
`scene_kit_props.py` (objects). Two films may share a noun - a press is a
press - but their scenes differ in space, hero, props, dimensions, palette,
light and lens, and `validate-sets.js` refuses a scene fingerprint that an
earlier film already used.

Usage:

    blender -b --python scene_compiler.py -- \
        --spec data/films/azad-hind-1943-sets.json \
        --scene press-01 --out out/plate.png \
        --width 1920 --height 1080 --samples 32

    python3 scene_compiler.py --list
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from salt_scenes import camera, reset  # noqa: E402
from jallianwala_scenes import render  # noqa: E402
from scene_kit_base import (  # noqa: E402
    EXPOSURE,
    SPACES,
    fill_light,
    haze,
    key_light,
    materials,
    practical,
)
from scene_kit_props import PROPS  # noqa: E402


DIMS = {"w": (7.0, 19.0), "d": (5.0, 12.0), "h": (3.2, 7.6)}
SLOTS = [
    (-2.55, 0.35, 0.92),
    (2.55, 0.45, 0.88),
    (-1.75, 1.65, 0.78),
    (1.95, 1.75, 0.82),
    (0.10, 2.35, 0.70),
    (-3.10, 1.15, 0.66),
    (3.10, 1.30, 0.62),
]
OPEN_SPACES = {"open", "street", "yard", "deck", "platform", "market", "temple"}


def clamp(value, low, high):
    return max(low, min(high, value))


def dims_of(spec):
    given = spec.get("dims") or {}
    return {
        key: clamp(float(given.get(key, default)), DIMS[key][0], DIMS[key][1])
        for key, default in (("w", 13.0), ("d", 7.2), ("h", 4.6))
    }


def cameras_for(spec, anchor, dims):
    """Six framings, all aimed at the hero, none of them a stock shot list."""
    ax, ay, az = anchor
    dist = 5.2 + ay * 0.34
    reach = dims["w"] * 0.22
    return [
        ((ax - reach, ay - dist, az + 1.55), (ax, ay - 0.4, az + 1.25), 36, 2.8),
        ((ax + reach, ay - dist * 0.92, az + 1.72), (ax, ay - 0.2, az + 1.10),
         44, 2.6),
        ((ax - reach * 0.45, ay - dist * 0.72, az + 1.05), (ax, ay, az + 1.35),
         52, 2.2),
        ((ax + reach * 0.35, ay - dist * 0.60, az + 1.25), (ax, ay - 0.2,
                                                             az + 1.55),
         58, 2.0),
        ((ax, ay - dist * 0.46, az + 0.72), (ax, ay - 0.1, az + 1.45), 68, 1.9),
        ((ax - reach, ay - dist * 0.30, az + 2.35), (ax, ay + 0.4, az + 0.90),
         30, 3.2),
    ]


def compose(spec, palette):
    space = str(spec.get("space", ""))
    hero = str(spec.get("hero", ""))
    if space not in SPACES:
        raise SystemExit(f"unknown space '{space}'")
    if hero not in PROPS:
        raise SystemExit(f"unknown hero '{hero}'")

    m = materials(palette)
    seed = int(spec.get("seed", 1))
    rng = random.Random(seed)
    dims = dims_of(spec)
    tone = str(spec.get("tone", "night"))
    light = spec.get("light") or {}
    dressing = spec.get("dressing") or {}
    density = clamp(int(dressing.get("density", 2)), 0, 4)

    reset()
    anchor = SPACES[space](m, dims, seed, {"tone": tone,
                                           "windows": bool(spec.get("windows", True)),
                                           "panel": bool(spec.get("panel", False))})

    # The hero, at the anchor the space names. Its scale is the film's own.
    hero_scale = clamp(float(spec.get("heroScale", 1.0)), 0.45, 1.8)
    PROPS[hero](f"{hero}-{seed}", anchor[0], anchor[1], anchor[2], hero_scale, m,
                seed)

    used = {hero}
    wanted = [str(p) for p in (spec.get("props") or []) if str(p) in PROPS]
    wanted = [p for p in wanted if p != hero]
    for index, prop in enumerate(wanted[:max(0, density)]):
        if prop in used and len(wanted) <= 3:
            continue
        used.add(prop)
        dx, dy, scale = SLOTS[index % len(SLOTS)]
        jitter = 0.22 if index < 3 else 0.42
        sx = anchor[0] + (dx + rng.uniform(-jitter, jitter)) * (dims["w"] / 13.0)
        sy = anchor[1] + (dy + rng.uniform(-jitter, jitter)) * (dims["d"] / 7.2)
        s = clamp(scale * float(spec.get("heroScale", 1.0)) *
                  rng.uniform(0.92, 1.06), 0.4, 1.4)
        PROPS[prop](f"{prop}-{seed}", sx, sy, anchor[2], s, m, seed + index * 17)

    # Light: one key, one fill, and the practicals the film asked for.
    key_light(m, str(light.get("key", "warm")),
              power=float(light.get("keyPower", 1450.0)),
              loc=(-dims["w"] * 0.34, max(0.6, anchor[1] - 3.4), dims["h"] + 0.4),
              target=(anchor[0], anchor[1] - 0.5, anchor[2] + 1.1),
              size=dims["w"] * 0.34)
    fill_light(m, power=float(light.get("fillPower", 280.0)),
               loc=(dims["w"] * 0.32, max(0.4, anchor[1] - 4.2), dims["h"] * 0.7),
               target=(anchor[0], anchor[1] - 0.3, anchor[2] + 1.0),
               size=dims["w"] * 0.42)
    # `practicals` arrives either as a count (older storyboards) or as a list of
    # named sources (salt-march-sets.json ships ["sodium"]). int() on that list
    # was the plate-test crash: "TypeError: int() argument must be ... not 'list'"
    # (run 42871227104, scene_compiler.py line 159).
    practicals = light.get("practicals", 0)
    if isinstance(practicals, (list, tuple)):
        practicals = len(practicals)
    for i in range(clamp(int(practicals), 0, 3)):
        practical(m, anchor[0] + (i - 1) * 1.6, anchor[1] - 2.2 - i * 0.5,
                  dims["h"] - 0.55, power=40, drop=0.45, radius=0.07,
                  name=f"practical-{i}")

    # Atmosphere, brightness and the lens the line asked for.
    haze(int(40 + 12 * density), seed + 5, zmax=dims["h"] * 0.8,
         ymax=anchor[1] + 4.0)
    presets = cameras_for(spec, anchor, dims)
    framing = int(spec.get("framing", 0)) % len(presets)
    loc, target, lens, fstop = presets[framing]
    camera(loc, target, lens=lens, fstop=fstop)

    scene = bpy.context.scene
    scene.view_settings.exposure = EXPOSURE.get(tone, -0.6) + float(
        spec.get("exposureTrim", 0.0))
    try:
        scene.view_settings.view_transform = "AgX"
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass


def load_spec(path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--spec")
    ap.add_argument("--scene")
    ap.add_argument("--out")
    ap.add_argument("--width", type=int, default=1920)
    ap.add_argument("--height", type=int, default=1080)
    ap.add_argument("--samples", type=int, default=32)
    ap.add_argument("--params", default="{}")
    ap.add_argument("--list", action="store_true")
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    args = ap.parse_args(argv)

    if args.list:
        print(json.dumps({"spaces": sorted(SPACES), "props": sorted(PROPS),
                          "tones": sorted(EXPOSURE)}, indent=2))
        return 0
    if not (args.spec and args.scene and args.out):
        raise SystemExit("--spec, --scene and --out are required")
    if args.width % 2 or args.height % 2:
        raise SystemExit("width and height must be even")

    doc = load_spec(args.spec)
    scenes = doc.get("scenes") or {}
    spec = scenes.get(args.scene)
    if not spec:
        raise SystemExit(f"scene '{args.scene}' is not in {args.spec}")
    try:
        overrides = json.loads(args.params) if args.params else {}
    except json.JSONDecodeError as exc:
        raise SystemExit(f"--params is not JSON: {exc}")
    if isinstance(overrides, dict):
        spec = {**spec, **{k: v for k, v in overrides.items()
                          if k in ("framing", "tone", "heroScale", "exposureTrim")}}
    compose(spec, doc.get("palette") or {})
    render(args.samples, args.width, args.height, os.path.abspath(args.out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

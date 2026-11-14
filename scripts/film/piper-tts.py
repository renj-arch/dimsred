#!/usr/bin/env python3
"""Render film narration with Piper on the GitHub Actions runner.

The film renderer passes every narration line once, keeps the voice loaded, and
gets a duration for each line back. No API key, no cloud TTS, no owner machine.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import wave
from pathlib import Path

from piper import PiperVoice
from piper.config import SynthesisConfig


def ensure_voice(voice: str, data_dir: Path) -> Path:
    data_dir.mkdir(parents=True, exist_ok=True)
    model = data_dir / f"{voice}.onnx"
    config = data_dir / f"{voice}.onnx.json"
    if model.exists() and config.exists():
        return model
    print(f"[piper] downloading voice {voice} into {data_dir}", file=sys.stderr)
    subprocess.run(
        [sys.executable, "-m", "piper.download_voices", "--data-dir", str(data_dir), voice],
        check=True,
    )
    if not model.exists() or not config.exists():
        raise RuntimeError(f"Voice {voice!r} did not download both {model.name} and {config.name}")
    return model


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--voice", default="en_US-lessac-medium")
    ap.add_argument("--data-dir", default=".cache/piper")
    ap.add_argument("--length-scale", type=float, default=1.0)
    args = ap.parse_args()

    payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
    texts = payload.get("texts")
    if not isinstance(texts, list) or not texts:
        raise SystemExit("input JSON must contain a non-empty 'texts' array")

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    model = ensure_voice(args.voice, Path(args.data_dir))
    voice = PiperVoice.load(str(model))
    syn = SynthesisConfig(length_scale=args.length_scale, normalize_audio=True)

    durations = []
    for i, text in enumerate(texts):
        clean = " ".join(str(text or "").split())
        out = out_dir / f"audio-{i:04d}.wav"
        if not clean:
            durations.append(0.0)
            continue
        with wave.open(str(out), "wb") as wav:
            voice.synthesize_wav(clean, wav, syn_config=syn)
            seconds = wav.getnframes() / float(wav.getframerate())
        durations.append(round(seconds, 3))
        print(f"[piper] {i + 1}/{len(texts)} {seconds:.2f}s  {out.name}", file=sys.stderr)

    (out_dir / "durations.json").write_text(
        json.dumps({"voice": args.voice, "durations": durations}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"[piper] wrote {len(texts)} files to {out_dir}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Render film narration with Edge TTS on the GitHub Actions runner.

Edge TTS is used only for the narrator voice. It is not an evidence source and
it never touches the script: the build passes one already-validated line at a
time and gets a duration back. Every line is retried, converted to a mono WAV,
and measured locally so the timeline cannot drift from the audio.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import subprocess
import sys
import time
import wave
from pathlib import Path

import edge_tts


async def synthesize(text: str, voice: str, rate: str, pitch: str, out: Path) -> None:
    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await communicate.save(str(out))


def convert_to_wav(mp3: Path, wav: Path) -> float:
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3),
            "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", str(wav),
        ],
        check=True,
    )
    with wave.open(str(wav), "rb") as handle:
        return handle.getnframes() / float(handle.getframerate())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--voice", default="en-IN-PrabhatNeural")
    ap.add_argument("--rate", default="-4%")
    ap.add_argument("--pitch", default="-2Hz")
    ap.add_argument("--retries", type=int, default=3)
    args = ap.parse_args()

    payload = json.loads(Path(args.input).read_text(encoding="utf-8-sig"))
    texts = payload.get("texts")
    if not isinstance(texts, list) or not texts:
        raise SystemExit("input JSON must contain a non-empty 'texts' array")

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    durations: list[float] = []

    for index, text in enumerate(texts):
        clean = " ".join(str(text or "").split())
        wav = out_dir / f"audio-{index:04d}.wav"
        if not clean:
            durations.append(0.0)
            continue

        mp3 = out_dir / f"audio-{index:04d}.mp3"
        last_error: Exception | None = None
        for attempt in range(1, max(1, args.retries) + 1):
            try:
                asyncio.run(synthesize(clean, args.voice, args.rate, args.pitch, mp3))
                seconds = convert_to_wav(mp3, wav)
                if seconds <= 0:
                    raise RuntimeError("Edge TTS produced an empty file")
                mp3.unlink(missing_ok=True)
                durations.append(round(seconds, 3))
                print(
                    f"[edge] {index + 1}/{len(texts)} {seconds:.2f}s  {wav.name}",
                    file=sys.stderr,
                )
                break
            except Exception as exc:  # noqa: BLE001 - retry the network failure
                last_error = exc
                mp3.unlink(missing_ok=True)
                if attempt < args.retries:
                    delay = 2 ** attempt
                    print(
                        f"[edge] line {index + 1} attempt {attempt} failed: {exc}; "
                        f"retrying in {delay}s",
                        file=sys.stderr,
                    )
                    time.sleep(delay)
        else:
            raise SystemExit(
                f"Edge TTS failed for line {index + 1} after {args.retries} attempts: {last_error}"
            )

    (out_dir / "durations.json").write_text(
        json.dumps({"voice": args.voice, "durations": durations}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"[edge] wrote {len(texts)} files to {out_dir}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

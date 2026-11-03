'use strict';

/**
 * The vlymbooq theme.
 *
 * An original ten-second cue built from a felt-piano motif, a low archive
 * drone, paper and thread texture, and one stamp. It is synthesised from first
 * principles so the channel owns the recording and nothing is sampled.
 *
 * The motif is A3 - C4 - F4 - E4 - D4 - A3: a small, unresolved turn that
 * sounds like a question being opened rather than a trailer telling you how to
 * feel. The same cue sits under every film's title and in the channel bumper.
 */

const fs = require('fs');
const path = require('path');

const RATE = 48000;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function panGains(pan) {
  const p = clamp(pan, -1, 1);
  return [Math.sqrt((1 - p) / 2), Math.sqrt((1 + p) / 2)];
}

function add(buf, index, value, pan) {
  const [l, r] = panGains(pan);
  buf.left[index] += value * l;
  buf.right[index] += value * r;
}

function piano(buf, start, freq, duration, gain, pan) {
  const n = Math.floor(duration * RATE);
  const first = Math.floor(start * RATE);
  const attack = 0.010;
  const release = Math.min(0.35, duration * 0.35);
  let lp = 0;
  let lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    if (first + i >= buf.left.length) break;
    const at = t < attack ? t / attack : 1;
    const rel = t > duration - release ? Math.max(0, (duration - t) / release) : 1;
    const env = at * rel * Math.exp(-1.85 * t);
    const hammer = t < 0.018 ? (1 - t / 0.018) * 0.10 : 0;
    const detune = 1 + 0.0007 * Math.sin(2 * Math.PI * 0.21 * t);
    let v = 0;
    const partials = [1, 0.52, 0.27, 0.13, 0.065, 0.032];
    for (let h = 0; h < partials.length; h++) {
      const hf = freq * (h + 1) * detune * (1 + h * 0.00035);
      v += partials[h] * Math.sin(2 * Math.PI * hf * t + h * 0.35);
    }
    // Felt, not hammered steel: a gentle two-pole low-pass.
    lp += 0.42 * (v - lp);
    lp2 += 0.42 * (lp - lp2);
    add(buf, first + i, (lp2 * env + hammer * Math.sin(2 * Math.PI * freq * 1.5 * t)) * gain, pan);
  }
}

function drone(buf, start, freq, duration, gain, pan) {
  const n = Math.floor(duration * RATE);
  const first = Math.floor(start * RATE);
  const attack = 1.4;
  const release = 2.2;
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    if (first + i >= buf.left.length) break;
    const at = Math.min(1, t / attack);
    const rel = t > duration - release ? Math.max(0, (duration - t) / release) : 1;
    const arc = 0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, t / duration));
    const env = at * rel * arc;
    const vib = 1 + 0.0026 * Math.sin(2 * Math.PI * 0.13 * t);
    let v = 0;
    for (let h = 1; h <= 6; h++) {
      v += Math.sin(2 * Math.PI * freq * h * vib * t) / (h * h * 0.6 + 0.4);
    }
    lp += 0.045 * (v - lp);
    add(buf, first + i, lp * env * gain, pan);
  }
}

function bowedString(buf, start, freq, duration, gain, pan) {
  const n = Math.floor(duration * RATE);
  const first = Math.floor(start * RATE);
  const attack = 0.55;
  const release = 0.8;
  let lp = 0;
  const rng = makeRng(7919);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    if (first + i >= buf.left.length) break;
    const at = Math.min(1, t / attack);
    const rel = t > duration - release ? Math.max(0, (duration - t) / release) : 1;
    const env = at * rel * Math.exp(-0.32 * t);
    const vib = 1 + 0.0035 * Math.sin(2 * Math.PI * 5.2 * t + 0.4);
    let v = 0;
    for (let h = 1; h <= 7; h++) {
      v += Math.sin(2 * Math.PI * freq * h * vib * t + h * 0.2) / (h * 1.15);
    }
    const bow = (rng() * 2 - 1) * 0.02;
    lp += 0.08 * (v + bow - lp);
    add(buf, first + i, lp * env * gain, pan);
  }
}

function noiseBurst(buf, start, duration, gain, pan, color) {
  const n = Math.floor(duration * RATE);
  const first = Math.floor(start * RATE);
  const rng = makeRng(104729);
  let lp = 0;
  let hpState = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    if (first + i >= buf.left.length) break;
    const env = Math.exp(-(color === 'paper' ? 42 : 18) * t);
    const raw = rng() * 2 - 1;
    if (color === 'paper') {
      hpState = 0.92 * (hpState + raw * 0.08);
      add(buf, first + i, (raw - hpState) * env * gain, pan);
    } else {
      lp += 0.04 * (raw - lp);
      add(buf, first + i, lp * env * gain, pan);
    }
  }
}

function stamp(buf, start) {
  const n = Math.floor(0.55 * RATE);
  const first = Math.floor(start * RATE);
  const rng = makeRng(31337);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    if (first + i >= buf.left.length) break;
    const env = Math.exp(-9.5 * t);
    const f = 62 - 18 * Math.min(1, t / 0.12);
    const thump = Math.sin(2 * Math.PI * f * t) * env;
    const click = (rng() * 2 - 1) * Math.exp(-80 * t) * 0.35;
    lp += 0.12 * (click - lp);
    add(buf, first + i, (thump * 0.8 + lp) * 0.55, 0.02);
  }
}

function reverb(buf) {
  const comb = [1557, 1617, 1491, 1422, 1277, 1356];
  const allpass = [556, 441, 341, 225];
  const outL = new Float32Array(buf.left.length);
  const outR = new Float32Array(buf.right.length);
  comb.forEach((delay, ci) => {
    const d = Math.floor(delay * RATE / 44100);
    const feedback = 0.72 - ci * 0.018;
    const wet = 0.10;
    const linesL = new Float32Array(d);
    const linesR = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < buf.left.length; i++) {
      const dl = linesL[idx];
      const dr = linesR[idx];
      linesL[idx] = buf.left[i] + dl * feedback;
      linesR[idx] = buf.right[i] + dr * feedback;
      outL[i] += dl * wet;
      outR[i] += dr * wet;
      idx = (idx + 1) % d;
    }
  });
  allpass.forEach((delay, ai) => {
    const d = Math.floor(delay * RATE / 44100);
    const g = 0.5;
    const lineL = new Float32Array(d);
    const lineR = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < buf.left.length; i++) {
      const inputL = outL[i] + buf.left[i] * 0.02;
      const inputR = outR[i] + buf.right[i] * 0.02;
      const dl = lineL[idx];
      const dr = lineR[idx];
      lineL[idx] = inputL + dl * g;
      lineR[idx] = inputR + dr * g;
      outL[i] = dl - inputL * g;
      outR[i] = dr - inputR * g;
      idx = (idx + 1) % d;
    }
  });
  for (let i = 0; i < buf.left.length; i++) {
    buf.left[i] = outL[i] * 0.82 + buf.left[i] * 0.55;
    buf.right[i] = outR[i] * 0.82 + buf.right[i] * 0.55;
  }
}

function writeWav(file, left, right) {
  const frames = left.length;
  const dataBytes = frames * 4;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);
  const body = Buffer.alloc(dataBytes);
  for (let i = 0; i < frames; i++) {
    const l = Math.round(clamp(left[i], -1, 1) * 32767);
    const r = Math.round(clamp(right[i], -1, 1) * 32767);
    body.writeInt16LE(l, i * 4);
    body.writeInt16LE(r, i * 4 + 2);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.concat([header, body]));
}

function renderTheme(file, duration = 12) {
  const frames = Math.ceil(duration * RATE);
  const buf = { left: new Float32Array(frames), right: new Float32Array(frames) };

  // The room: a low A and a fifth that never quite resolve.
  drone(buf, 0.0, 55.0, 11.6, 0.10, -0.15);
  drone(buf, 0.4, 82.5, 10.8, 0.035, 0.20);

  // The motif. Each note is placed a breath apart, then the last one is left
  // hanging so the film can enter on the unresolved third.
  piano(buf, 0.55, 220.00, 4.2, 0.40, -0.08); // A3
  piano(buf, 1.35, 261.63, 4.0, 0.36, 0.10);  // C4
  piano(buf, 2.15, 349.23, 3.6, 0.34, -0.14); // F4
  piano(buf, 2.95, 329.63, 3.4, 0.32, 0.16);  // E4
  piano(buf, 3.75, 293.66, 3.2, 0.30, -0.05); // D4
  piano(buf, 5.05, 220.00, 5.0, 0.26, 0.02);  // A3
  piano(buf, 6.10, 440.00, 4.2, 0.105, -0.22); // A4, a distant answer
  piano(buf, 6.55, 523.25, 4.0, 0.080, 0.22);  // C5

  // A single bowed thread under the turn.
  bowedString(buf, 3.55, 110.0, 4.4, 0.050, 0.0);
  bowedString(buf, 4.25, 164.81, 3.2, 0.032, -0.30);

  // Paper, a pin, and the stamp that names the room.
  noiseBurst(buf, 0.22, 0.42, 0.11, -0.42, 'paper');
  noiseBurst(buf, 1.05, 0.30, 0.055, 0.48, 'paper');
  noiseBurst(buf, 2.72, 0.22, 0.045, 0.36, 'paper');
  stamp(buf, 5.62);
  noiseBurst(buf, 5.60, 0.55, 0.10, 0.10, 'room');

  // One low bell at the end, the room settling.
  piano(buf, 8.05, 110.00, 3.4, 0.10, -0.10);
  piano(buf, 8.05, 164.81, 3.0, 0.05, 0.12);

  reverb(buf);

  // A gentle top-and-tail so the cue can loop under a title without a click.
  const fadeIn = Math.floor(0.18 * RATE);
  const fadeOut = Math.floor(2.6 * RATE);
  for (let i = 0; i < frames; i++) {
    let g = 1;
    if (i < fadeIn) g *= i / fadeIn;
    if (i > frames - fadeOut) g *= Math.max(0, (frames - i) / fadeOut);
    buf.left[i] *= g;
    buf.right[i] *= g;
  }

  let peak = 0;
  for (let i = 0; i < frames; i++) {
    peak = Math.max(peak, Math.abs(buf.left[i]), Math.abs(buf.right[i]));
  }
  const scale = peak > 0 ? 0.86 / peak : 1;
  for (let i = 0; i < frames; i++) {
    buf.left[i] *= scale;
    buf.right[i] *= scale;
  }
  writeWav(file, buf.left, buf.right);
  return { file, duration, peak: peak * scale };
}

function main() {
  const out = process.argv[2] || path.join('out', 'brand', 'vlymbooq-theme.wav');
  const result = renderTheme(out);
  console.log(`theme: ${result.file} (${result.duration}s, peak ${result.peak.toFixed(2)})`);
}

if (require.main === module) main();

module.exports = { renderTheme, RATE };

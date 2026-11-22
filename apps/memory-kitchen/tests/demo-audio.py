"""Build the demo video's soundtrack from timed cues (written by tests/demo-video.mjs) and real
recordings (tests/demo-sounds/, all CC0, see CREDITS.md).

The cues say when an animation *starts* in the page; the sounds are placed where the picture hits:
- board operations follow the knife / pestle timing in src/ops.js (knife() and drawTool());
- a piece dropped into the pot lands ~0.8 s after it starts falling (potScene drop curve);
- a pot step plays for POT_STEP_MS, and the pot keeps simmering / sizzling until it is served;
- the dish's flight to the plate lasts 900 ms and ends with the plate set down.

Usage: python3 tests/demo-audio.py cues.json out.wav
"""
import json
import os
import subprocess
import sys
import wave

import numpy as np

SR = 44100
HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'demo-sounds')
POT_STEP = 2.6      # POT_STEP_MS
DROP_LAND = 0.95    # pieces touch the pan (measured on the recorded frames)
SERVE = 2.4         # SERVE_MS: pieces gather before the dish flies
FLY = 0.9           # flyToPlate duration
rng = np.random.default_rng(7)


def load(name, channels=1):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', os.path.join(HERE, name), '-f', 's16le', '-ac', str(channels), '-ar', str(SR), '-'],
                         check=True, capture_output=True).stdout
    x = np.frombuffer(raw, '<i2').astype(np.float32) / 32768
    return x.reshape(-1, channels) if channels > 1 else x


def peak_norm(x, peak):
    m = np.max(np.abs(x)) or 1.0
    return x / m * peak


def fade(x, fin=0.005, fout=0.05):
    x = x.copy()
    a, b = int(fin * SR), int(fout * SR)
    if a: x[:a] *= np.linspace(0, 1, a)[:, None] if x.ndim > 1 else np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b)[:, None] if x.ndim > 1 else np.linspace(1, 0, b)
    return x


def hits(x, before=0.008, after=0.25, min_gap=0.12, min_db=-26):
    """Cut single strikes out of a recording of many (onset = sharp rise in short-term energy)."""
    hop = 220
    e = np.sqrt(np.convolve(x ** 2, np.ones(hop) / hop, 'same')[::hop] + 1e-12)
    db = 20 * np.log10(e)
    out, last = [], -1e9
    for i in range(4, len(db)):
        if db[i] - db[i - 4] > 10 and db[i] > min_db and (i - last) * hop / SR > min_gap:
            s = i * hop - int(before * SR)
            seg = x[max(0, s): s + int((before + after) * SR)]
            if len(seg) > 0.1 * SR:
                out.append(fade(peak_norm(seg, 1.0), 0.002, 0.08))
            last = i
    return out


def first_hit(x, length):
    h = hits(x, after=length, min_db=-35)
    return h[0] if h else fade(peak_norm(x[:int(length * SR)], 1.0))


def main():
    cues_path, out_path = sys.argv[1], sys.argv[2]
    data = json.load(open(cues_path))
    duration = float(data['duration'])
    n = int((duration + 1) * SR)
    L = np.zeros(n, np.float32)
    R = np.zeros(n, np.float32)

    def put(x, at, gain=1.0, pan=0.0):
        """Mono clip, placed at `at` seconds, panned -1..1."""
        i = int(at * SR)
        if i >= n or i + len(x) <= 0:
            return
        if i < 0:
            x, i = x[-i:], 0
        x = x[: n - i] * gain
        L[i:i + len(x)] += x * np.sqrt((1 - pan) / 2) * 1.414
        R[i:i + len(x)] += x * np.sqrt((1 + pan) / 2) * 1.414

    chop_hits = hits(load('chop.mp3'), after=0.24)
    mash_hits = hits(load('mash.mp3'), after=0.30, min_gap=0.1)
    plop = first_hit(load('plop.mp3'), 0.7)
    plop_small = fade(peak_norm(load('plop-small.mp3'), 1.0))
    paper = load('paper.mp3')
    click = fade(peak_norm(load('click.mp3'), 1.0), 0.001, 0.05)
    plate = first_hit(load('plate.mp3'), 0.7)
    whoosh = fade(peak_norm(load('whoosh.mp3'), 1.0), 0.01, 0.1)
    simmer = load('simmer.mp3')
    sizzle = load('sizzle.mp3')
    print(f'chop hits {len(chop_hits)}, mash hits {len(mash_hits)}', file=sys.stderr)

    def pick(pool):
        return pool[rng.integers(len(pool))]

    def paper_bit(length, gain):
        s = rng.integers(0, len(paper) - int(length * SR))
        return fade(peak_norm(paper[s:s + int(length * SR)], 1.0), 0.03, min(0.15, length / 3)) * gain

    def loop(src, start, length, gain, fin=0.4, fout=0.6):
        """A stretch of a continuous recording (simmer, sizzle) from a random offset."""
        m = int(length * SR)
        if m <= 0:
            return
        off = rng.integers(0, max(1, len(src) - m - 1))
        seg = src[off:off + m]
        if len(seg) < m:
            seg = np.tile(src, int(np.ceil(m / len(src))) + 1)[:m]
        put(fade(seg, fin, fout), start, gain)

    cues = sorted(data['cues'], key=lambda c: c['t'])
    serve_at = next((c['t'] - SERVE for c in cues if c['type'] == 'fly'), duration)
    simmering = sizzling = None  # when the pot started to keep simmering / sizzling

    for c in cues:
        t, kind = c['t'], c['type']
        if kind == 'click':
            put(click, t, 0.22, rng.uniform(-0.2, 0.2))
        elif kind == 'pick':
            put(paper_bit(0.35, 1.0), t, 0.18, -0.3)
        elif kind == 'mixdrop':
            put(paper_bit(0.6, 1.0), t, 0.25, -0.3)
        elif kind == 'op':
            ms, op, k = c.get('ms', 2200) / 1000, c['op'], max(2, c.get('n') or 9)
            pan = -0.35  # the board is on the left
            if op == 'slice':
                for i in range(k - 1):
                    u = 0.03 + (i + 0.16) / (k - 1) * 0.82
                    put(pick(chop_hits), t + u * ms, rng.uniform(0.75, 0.95), pan)
            elif op == 'dice':
                for i in range(k - 1):
                    put(pick(chop_hits), t + (0.03 + (i + 0.16) / (k - 1) * 0.40) * ms, rng.uniform(0.6, 0.8), pan)
                    put(pick(chop_hits), t + (0.43 + (i + 0.16) / (k - 1) * 0.45) * ms, rng.uniform(0.6, 0.8), pan)
            elif op == 'mash':
                for j in range(1, 6):  # the pestle touches down where |sin(6πu)| = 0
                    put(pick(mash_hits), t + j / 6 * ms, rng.uniform(0.8, 1.0), pan)
            elif op == 'mix':
                put(paper_bit(min(1.2, ms * 0.6), 1.0), t + 0.1 * ms, 0.3, pan)
                for u in (0.38, 0.48, 0.58):
                    put(paper_bit(0.18, 1.0), t + u * ms, 0.2, pan)
        elif kind == 'drop':
            put(plop, t + DROP_LAND, 0.75, 0.05)
            put(plop_small, t + DROP_LAND + 0.12, 0.35, 0.15)
        elif kind == 'step':
            op, heat = c.get('op'), c.get('heat', 2)
            g = 0.55 + 0.15 * heat
            if op in ('stew', 'steam'):
                loop(simmer, t, POT_STEP + 0.3, g, 0.35, 0.5)
                simmering = simmering or t + POT_STEP
            elif op in ('reduce', 'sear', 'stirfry'):
                loop(sizzle, t, POT_STEP + 0.3, g * 0.9, 0.25, 0.5)
                if simmering:
                    loop(simmer, t, POT_STEP, 0.25)
                sizzling = sizzling or t + POT_STEP
        elif kind == 'fly':
            put(whoosh, t + 0.05, 0.45, 0.4)
        elif kind == 'land':
            put(plate, t - 0.06, 0.7, 0.6)

    # The pot keeps going quietly between steps until it is served, then fades as the dish gathers.
    for start, src, gain in ((simmering, simmer, 0.28), (sizzling, sizzle, 0.22)):
        if start is not None and serve_at > start:
            loop(src, start - 0.2, serve_at - start + SERVE * 0.8, gain, 0.6, SERVE * 0.7)

    amb = load('ambience.mp3', 2)
    reps = int(np.ceil(n / len(amb))) + 1
    amb = np.concatenate([amb] * reps)[:n]
    amb = fade(amb, 1.0, 1.5) * 0.35
    left = L + amb[:, 0]
    right = R + amb[:, 1]
    mix = np.stack([left, right], axis=1)[: int(duration * SR)]
    mix = np.tanh(mix * 1.8) / np.tanh(1.8) * 0.84  # louder overall, soft limiter keeps peaks under -1.5 dB
    pcm = (np.clip(mix, -1, 1) * 32767).astype('<i2')
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f'soundtrack {duration:.1f}s, {len(cues)} cues -> {out_path}')


if __name__ == '__main__':
    main()

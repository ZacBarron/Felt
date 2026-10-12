"""Synthesize the promo's calm sound bed and effects (numpy + wave only).

Writes 48 kHz 16 bit stereo WAV files to public/audio. Everything is made
from sine waves and filtered noise, so there are no outside samples.
Run from the promo folder: python3 scripts/make_audio.py
"""

import os
import wave

import numpy as np

SR = 48000
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "audio")
rng = np.random.default_rng(7)


def t_axis(seconds):
    return np.arange(int(SR * seconds)) / SR


def note(name):
    names = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4, "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[pitch] + 12 * (octave - 4)) / 12)


def fft_filter(x, low=None, high=None, slope=1.0):
    """Gentle filter in the frequency domain with soft roll offs."""
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    gain = np.ones_like(f)
    if high is not None:
        gain /= np.sqrt(1 + (f / high) ** (4 * slope))
    if low is not None:
        gain /= np.sqrt(1 + (low / np.maximum(f, 1e-3)) ** (4 * slope))
    return np.fft.irfft(spec * gain, n=len(x))


def one_pole_sweep(x, cutoffs):
    """Low pass with a cutoff that changes per sample (for swishes)."""
    y = np.zeros_like(x)
    a = np.exp(-2 * np.pi * cutoffs / SR)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def write(name, left, right=None, peak=0.9):
    right = left if right is None else right
    stereo = np.stack([left, right], axis=1)
    m = np.max(np.abs(stereo)) or 1.0
    stereo = stereo / m * peak
    data = (stereo * 32767).astype("<i2")
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, f"{name}.wav"), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def soft_voice(freq, t, detune=0.0):
    """A warm, round tone: sine plus a little second and third harmonic."""
    f = freq * (1 + detune)
    return np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t) + 0.05 * np.sin(6 * np.pi * f * t)


def pad():
    total = 20.6
    t = t_axis(total)
    chords = [
        (0.0, 9.6, ["D2", "A2", "F#3", "A3", "C#4", "E4"]),  # Dmaj9
        (9.0, 17.8, ["G2", "D3", "F#3", "B3", "D4", "A4"]),  # Gmaj9 over the drill and rating
        (17.2, total, ["D2", "A2", "D3", "F#3", "A3", "E4"]),  # home
    ]
    left = np.zeros_like(t)
    right = np.zeros_like(t)
    for start, end, notes in chords:
        env = np.clip((t - start) / 1.6, 0, 1) * np.clip((end - t) / 1.6, 0, 1)
        env = np.sin(env * np.pi / 2) ** 2
        for i, n in enumerate(notes):
            f = note(n)
            lfo = 0.75 + 0.25 * np.sin(2 * np.pi * (0.07 + 0.023 * i) * t + i)
            weight = 1.0 if f < 200 else 0.55
            left += env * lfo * weight * soft_voice(f, t, -0.0016)
            right += env * lfo * weight * soft_voice(f, t, 0.0016)
    air = fft_filter(rng.standard_normal(len(t)), low=300, high=1800) * 0.02
    left = fft_filter(left + air, high=1400)
    right = fft_filter(right + air, high=1400)
    fade = np.clip(t / 2.0, 0, 1) * np.clip((total - t) / 2.5, 0, 1)
    write("pad", left * fade, right * fade, peak=0.5)


def tap():
    t = t_axis(0.12)
    body = np.sin(2 * np.pi * 210 * t) * np.exp(-t / 0.018)
    click = np.sin(2 * np.pi * 1650 * t) * np.exp(-t / 0.006)
    noise = fft_filter(rng.standard_normal(len(t)), low=2000, high=7000) * np.exp(-t / 0.003)
    x = body * 0.9 + click * 0.35 + noise * 0.12
    write("tap", x, peak=0.7)


def deal():
    t = t_axis(0.28)
    env = np.where(t < 0.07, (t / 0.07) ** 1.5, np.exp(-(t - 0.07) / 0.05))
    cut = np.linspace(5200, 1600, len(t))
    noise = rng.standard_normal(len(t))
    x = one_pole_sweep(noise, cut) - one_pole_sweep(noise, cut * 0.25)
    write("deal", x * env, x * env * 0.9, peak=0.6)


def flip():
    t = t_axis(0.12)
    noise = fft_filter(rng.standard_normal(len(t)), low=1800, high=6500)
    env = np.exp(-t / 0.012) + 0.3 * np.exp(-np.abs(t - 0.035) / 0.006)
    knock = np.sin(2 * np.pi * 420 * t) * np.exp(-t / 0.02)
    write("flip", noise * env * 0.6 + knock * 0.5, peak=0.6)


def bell(freq, t, decay):
    partials = [(1.0, 1.0), (2.0, 0.28), (2.76, 0.12), (5.4, 0.04)]
    x = np.zeros_like(t)
    for ratio, amp in partials:
        x += amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t * ratio / decay)
    attack = np.clip(t / 0.006, 0, 1)
    return x * attack


def chime():
    t = t_axis(2.2)
    x = bell(note("A5"), t, 0.9) + 0.5 * bell(note("E6"), np.maximum(t - 0.06, 0), 0.8) * (t > 0.06)
    write("chime", fft_filter(x, high=5000), peak=0.5)


def correct():
    t = t_axis(1.4)
    a = bell(note("D5"), t, 0.5)
    b = bell(note("A5"), np.maximum(t - 0.09, 0), 0.6) * (t > 0.09)
    write("correct", fft_filter(a * 0.8 + b, high=4500), peak=0.5)


def brush():
    total = 1.5
    t = t_axis(total)
    env = np.sin(np.clip(t / total, 0, 1) * np.pi) ** 2
    noise = rng.standard_normal(len(t))
    cut = 900 + 2600 * np.sin(np.clip(t / total, 0, 1) * np.pi)
    x = one_pole_sweep(noise, cut) - one_pole_sweep(noise, cut * 0.3)
    pan = np.clip(t / total, 0, 1)  # moves left to right with the brush stroke
    write("brush", x * env * (1 - 0.6 * pan), x * env * (0.4 + 0.6 * pan), peak=0.5)


def resolve():
    t = t_axis(2.4)
    x = np.zeros_like(t)
    for i, n in enumerate(["D4", "F#4", "A4", "D5"]):
        d = i * 0.04
        x += bell(note(n), np.maximum(t - d, 0), 1.4) * (t > d)
    swell = np.clip(t / 0.03, 0, 1)
    tail = np.clip((2.4 - t) / 0.4, 0, 1)
    write("resolve", fft_filter(x * swell * tail, high=3500), peak=0.5)


if __name__ == "__main__":
    pad()
    tap()
    deal()
    flip()
    chime()
    correct()
    brush()
    resolve()
    print("Wrote audio to", os.path.abspath(OUT))

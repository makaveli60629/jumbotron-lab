import numpy as np
import wave, os, subprocess, math

SR = 44100
OUTDIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')
os.makedirs(OUTDIR, exist_ok=True)

def write_wav(path, audio, sr=SR):
    audio = np.clip(audio, -1.0, 1.0)
    pcm = (audio * 32767.0).astype(np.int16)
    with wave.open(path, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm.tobytes())

def env_click(n, attack=0.001, decay=0.03):
    t = np.arange(n) / SR
    a = np.exp(-t/decay)
    a[t < attack] = t[t < attack] / attack
    return a

def noise(n, seed=0):
    rng = np.random.default_rng(seed)
    return rng.standard_normal(n)

def bandpass(x, f1, f2):
    # simple FFT bandpass (fast enough for short sounds)
    X = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1/SR)
    mask = (freqs >= f1) & (freqs <= f2)
    X *= mask
    y = np.fft.irfft(X, n=len(x))
    return y

def to_mp3(wav_path, mp3_path, gain_db=0.0):
    # -q:a 2 good quality; apply gain via volume filter
    vf = f"volume={gain_db}dB" if abs(gain_db) > 1e-6 else "volume=1.0"
    subprocess.check_call([
        'ffmpeg','-y','-hide_banner','-loglevel','error',
        '-i', wav_path,
        '-filter:a', vf,
        '-codec:a','libmp3lame','-q:a','2',
        mp3_path
    ])

# 1) chips_vacuum: whoosh + clatter

def chips_vacuum():
    dur = 1.05
    n = int(SR*dur)
    t = np.arange(n)/SR

    # Whoosh: filtered noise with rising center frequency
    w = noise(n, seed=1)
    # Sweep filter by blending two bandpasses
    w1 = bandpass(w, 200, 1200)
    w2 = bandpass(w, 800, 5000)
    sweep = np.clip(t/dur, 0, 1)
    whoosh = (1-sweep)*w1 + sweep*w2
    whoosh *= np.exp(-t/0.55)

    # Clatter: many short chip clicks
    clatter = np.zeros(n)
    rng = np.random.default_rng(2)
    times = np.sort(rng.uniform(0.25, 0.95, size=55))
    for i, ct in enumerate(times):
        start = int(ct*SR)
        ln = int(SR*rng.uniform(0.012, 0.028))
        if start+ln >= n:
            continue
        c = noise(ln, seed=100+i)
        c = bandpass(c, 1200, 8500)
        c *= env_click(ln, attack=0.0007, decay=rng.uniform(0.010, 0.022))
        c *= rng.uniform(0.12, 0.25)
        clatter[start:start+ln] += c

    audio = 0.55*whoosh + 0.9*clatter
    # Add a tiny low thump at the start
    th_n = int(SR*0.06)
    th_t = np.arange(th_n)/SR
    th = np.sin(2*np.pi*90*th_t) * np.exp(-th_t/0.04) * 0.25
    audio[:th_n] += th

    return audio

# 2) chips_stack_stick: single clack

def chips_stack_stick():
    dur = 0.18
    n = int(SR*dur)
    t = np.arange(n)/SR
    base = noise(n, seed=3)
    clack = bandpass(base, 900, 9000)
    clack *= env_click(n, attack=0.0008, decay=0.035)
    # Add a weighted low component
    low = np.sin(2*np.pi*180*t) * np.exp(-t/0.06)
    audio = 0.75*clack + 0.18*low
    return audio

# 3) hand_knock_check: two thumps

def hand_knock_check():
    dur = 0.45
    n = int(SR*dur)
    audio = np.zeros(n)
    def thump(at, freq=120, amp=0.55):
        start = int(at*SR)
        ln = int(SR*0.12)
        tt = np.arange(ln)/SR
        th = (np.sin(2*np.pi*freq*tt) * np.exp(-tt/0.07))
        th += 0.25*bandpass(noise(ln, seed=int(at*1000)), 80, 900) * np.exp(-tt/0.08)
        th *= amp
        audio[start:start+ln] += th
    thump(0.06, freq=120, amp=0.55)
    thump(0.19, freq=115, amp=0.50)
    # Felt muffling
    audio = bandpass(audio, 60, 1800)
    return audio

# 4) card_slide_vacuum: zip + shhh

def card_slide_vacuum():
    dur = 0.65
    n = int(SR*dur)
    t = np.arange(n)/SR

    # Zip: short high transient
    zip_n = int(SR*0.05)
    zz = bandpass(noise(zip_n, seed=9), 2200, 12000)
    zz *= env_click(zip_n, attack=0.0005, decay=0.015)
    zip_sig = np.zeros(n)
    zip_sig[:zip_n] = zz*0.55

    # Slide: long friction noise
    fr = bandpass(noise(n, seed=10), 700, 7000)
    env = np.exp(-t/0.45)
    # ramp in quickly then decay
    env[t < 0.03] = t[t < 0.03]/0.03
    fr *= env*0.32

    # Tiny low air movement
    air = bandpass(noise(n, seed=11), 120, 700) * env * 0.10

    audio = zip_sig + fr + air
    return audio

SFX = {
    'chips_vacuum': chips_vacuum,
    'chips_stack_stick': chips_stack_stick,
    'hand_knock_check': hand_knock_check,
    'card_slide_vacuum': card_slide_vacuum,
}

for name, fn in SFX.items():
    wav = os.path.join(OUTDIR, f'{name}.wav')
    mp3 = os.path.join(OUTDIR, f'{name}.mp3')
    audio = fn()
    # normalize
    peak = float(np.max(np.abs(audio)))
    if peak > 1e-9:
        audio = audio / peak * 0.95
    write_wav(wav, audio)
    # Slight gain tweaks: vacuum louder
    gain = 2.0 if name == 'chips_vacuum' else 0.0
    to_mp3(wav, mp3, gain_db=gain)
    try:
        os.remove(wav)
    except OSError:
        pass

print('Generated:', ', '.join([f'{k}.mp3' for k in SFX.keys()]))

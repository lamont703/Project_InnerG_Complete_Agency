"""Make finished shorts play in BOTH ears: copy the left channel into the right.

    python3 scripts/dual_mono.py <file or folder> [...]

WHY. His mic records on the LEFT channel only, and every part, answer, draft and video
kept that layout — so a viewer hears him in one ear. Found 2026-10-01 on the AI shorts;
all 28 on-deck files had the right channel at about -100 dB.

LEVEL. Filling the second channel adds 3 dB of loudness (two channels of the same signal),
so the copy is turned down 3.01 dB to stay on the -16 LUFS every part is cut to.

WHAT IT TOUCHES. Only the audio. A video's picture is stream-copied, never re-encoded.
An mp3 sitting next to a wav of the same name is rebuilt from that wav rather than from
itself, so it does not lose a generation. A file whose right channel is already live is
skipped, so running this twice changes nothing.
"""
import os, re, subprocess, sys, shutil, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FF = f"{ROOT}/node_modules/ffmpeg-static/ffmpeg"
AF = "pan=stereo|c0=c0|c1=c0,volume=-3.01dB"

def rms(f):
    o = subprocess.run([FF, "-hide_banner", "-i", f, "-vn", "-af", "astats=measure_overall=none", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    return [float(x) for x in re.findall(r"RMS level dB: (-?[\d.]+|-inf)", o.replace("-inf", "-200"))]

def fix(f):
    ext = f.rsplit(".", 1)[-1].lower()
    if ext not in ("wav", "mp3", "mp4"): return
    r = rms(f)
    if len(r) < 2 or r[1] > r[0] - 20:
        print(f"  skip (already both ears)  {os.path.relpath(f, ROOT)}"); return
    tmp = os.path.join(tempfile.mkdtemp(prefix="dualmono-"), os.path.basename(f))
    if ext == "wav":
        cmd = ["-i", f, "-af", AF, "-c:a", "pcm_s24le", tmp]
    elif ext == "mp3":
        twin = f[:-4] + ".wav"
        if os.path.exists(twin) and len(rms(twin)) > 1 and rms(twin)[1] > -60:
            cmd = ["-i", twin, "-c:a", "libmp3lame", "-b:a", "192k", tmp]   # twin already fixed
        else:
            cmd = ["-i", f, "-af", AF, "-c:a", "libmp3lame", "-b:a", "192k", tmp]
    else:
        cmd = ["-i", f, "-map", "0:v:0", "-map", "0:a:0", "-c:v", "copy", "-af", AF,
               "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", tmp]
    subprocess.run([FF, "-nostdin", "-v", "error", "-y", *cmd], check=True)
    shutil.move(tmp, f)
    l, r2 = rms(f)[:2]
    print(f"  fixed  L {l:6.1f} / R {r2:6.1f} dB   {os.path.relpath(f, ROOT)}")

for a in sys.argv[1:]:
    files = [os.path.join(a, x) for x in sorted(os.listdir(a))] if os.path.isdir(a) else [a]
    # wavs first, so each mp3 can be rebuilt from its already-fixed wav
    for f in sorted(files, key=lambda x: (not x.endswith(".wav"), x)):
        if os.path.isfile(f): fix(f)

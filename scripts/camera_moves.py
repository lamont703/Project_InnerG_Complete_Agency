"""Punch-ins, punch-outs and the opening push-in, on a finished 9:16 (or 16:9) cut.

    python3 scripts/camera_moves.py --spec=<finish.spec.json> --in=<in.mp4> --out=<out.mp4>

Reads spec["camera"]:
  {
    "max": 1.15,                       # the punched-in framing, as a zoom factor
    "hook": {"to": 1.15, "secs": 3.0},  # opening push-in: 1.0 -> `to` over `secs`, ease-out
    "shots": [[5.6, 1.0], [18.3, 1.15], ...],   # from time t, hold zoom z (a hard cut)
    "compensate": [[19.04, 22.54, 1.125]]       # this span is ALREADY zoomed by k in the source
  }

THE ZOOM IS ANCHORED AT THE TOP CENTER. The frame keeps its top edge and its horizontal
center and loses the bottom and sides, so the face grows and drops slightly — a punch-in.
It is also the anchor the q5 bar fix used, which is what makes `compensate` seamless: inside
an already-zoomed span the move applied is z / k, so the viewer sees one steady z and the fix
vanishes into the punch instead of showing as its own jump.

HARD CUTS ON PAUSES. Shots change on a frame boundary at the times given; pick them in the
gaps between sentences (the cut's words.json), never inside a word.

WHY PIL AND NOT zoompan. zoompan snaps its crop to whole pixels, so a slow push-in judders
visibly. PIL's resize takes a fractional source box, so a 3-second push is smooth. Every frame
is decoded and re-encoded once (crf 14); audio is stream-copied untouched.

RUN IT FIRST in the finishing chain: cards, captions and the wordmark go on top of the moved
picture, so they stay still while the camera moves under them.
"""
import json, math, subprocess, sys
from PIL import Image

def arg(n, d=None):
    for a in sys.argv[1:]:
        if a.startswith(f"--{n}="): return a.split("=", 1)[1]
    return d

ROOT = __import__("os").path.dirname(__import__("os").path.dirname(__import__("os").path.abspath(__file__)))
FF = f"{ROOT}/node_modules/ffmpeg-static/ffmpeg"
FP = f"{ROOT}/node_modules/ffprobe-static/bin/darwin/x64/ffprobe"
spec = json.load(open(arg("spec"))); CAM = spec["camera"]
IN, OUT = arg("in"), arg("out")

info = subprocess.run([FP, "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate",
                       "-of", "default=nw=1:nk=1", IN], capture_output=True, text=True).stdout.split()
W, H = int(info[0]), int(info[1]); a, b = info[2].split("/"); FPS = int(a) / int(b)

hook = CAM.get("hook"); shots = sorted(CAM.get("shots", [])); comp = CAM.get("compensate", [])
def zoom(t):
    """The zoom the VIEWER should see at time t."""
    z = 1.0
    if hook and t < hook["secs"]:
        u = t / hook["secs"]; z = 1.0 + (hook["to"] - 1.0) * (1 - (1 - u) ** 3)   # ease-out
    elif hook:
        z = hook["to"]
    for st, zz in shots:
        if t >= st: z = zz
    return z
def applied(t):
    """The zoom to APPLY, given what the source already carries."""
    z = zoom(t)
    for s0, s1, k in comp:
        if s0 <= t < s1:
            # The source is already zoomed by k here, and a zoom OUT needs pixels that are not
            # there — so a compensated span must sit inside a punch of at least k. Checked below.
            z = z / k
    return max(1.0, z)

for s0, s1, k in comp:
    for t in (s0, (s0 + s1) / 2, s1 - 1 / FPS):
        if zoom(t) < k - 1e-6:
            sys.exit(f"  compensated span {s0}-{s1} (source already x{k}) is not inside a punch of at least x{k} at {t:.2f}s")

dec = subprocess.Popen([FF, "-v", "error", "-i", IN, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
enc = subprocess.Popen([FF, "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", info[2],
                        "-i", "-", "-i", IN, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium",
                        "-crf", "14", "-pix_fmt", "yuv420p", "-c:a", "copy", "-shortest", OUT], stdin=subprocess.PIPE)
n = 0; FB = W * H * 3; moved = 0
while True:
    buf = dec.stdout.read(FB)
    if len(buf) < FB: break
    t = n / FPS; z = applied(t)
    if abs(z - 1.0) > 1e-4:
        im = Image.frombytes("RGB", (W, H), buf)
        cw, ch = W / z, H / z
        x0 = (W - cw) / 2; y0 = 0.0                      # top-center anchor
        buf = im.resize((W, H), Image.LANCZOS, box=(x0, y0, x0 + cw, y0 + ch)).tobytes(); moved += 1
    enc.stdin.write(buf); n += 1
enc.stdin.close(); enc.wait(); dec.wait()
print(f"  camera  {n} frames, {moved} moved  hook {hook}  {len(shots)} shots  -> {OUT}")

# ── CHECK: every whole-frame jump in the output must be a planned cut ─────────
# A punch that lands a few frames off an existing zoom in the source (the q5 bar patch was
# 0.24s off the first time) shows as a quick in-out FLICKER. Nothing errors, so scan for it:
# any frame-to-frame change far above normal motion that is not a planned shot is reported.
def small(f):
    raw = subprocess.run([FF, "-v", "error", "-i", f, "-vf", "scale=54:96,format=gray", "-f", "rawvideo", "-"],
                         capture_output=True).stdout
    fr = [raw[i:i + 54 * 96] for i in range(0, len(raw) - 54 * 96 + 1, 54 * 96)]
    return [sum(abs(x - y) for x, y in zip(fr[i], fr[i + 1])) / (54 * 96) for i in range(len(fr) - 1)]
# Compare against the SOURCE: the joins between avatar shots and his own head moves are in
# both files; only a jump that is in the output and NOT in the source was made here.
d_out, d_in = small(OUT), small(IN)
med = sorted(d_out)[len(d_out) // 2]
planned = [st for st, _ in shots]
odd = []
for i, dv in enumerate(d_out):
    t = (i + 1) / FPS
    src = d_in[i] if i < len(d_in) else 0
    if dv > max(12.0, 8 * med) and dv > 2 * src + 4 and not any(abs(t - p) <= 1.5 / FPS for p in planned):
        odd.append((round(t, 2), round(dv, 1)))
if odd:
    print(f"  WARNING: {len(odd)} unplanned jumps (possible flickers): {odd[:12]}")
else:
    print(f"  check: every whole-frame jump is a planned cut ({len(planned)} cuts)")

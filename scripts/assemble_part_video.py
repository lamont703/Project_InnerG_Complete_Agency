"""Cut the per-part avatar renders to an edit list and lay the finished audio over them.

THE RENDERS ARE DRIVEN BY THE FULL MASTER AUDIO, so their clock and the edit's clock are the
same one — verified by cross-correlating each render's own audio against its master (lag 0ms,
correlation 1.000 on all six). That is why the in and out points transfer without adjustment.

VIDEO FROM THE RAW RENDER, AUDIO FROM THE FINISHED MIX. The renders were bought against the
untouched masters; the audio laid over them is the edit — ducked breaths, room-tone beds, the
gaps he set. Ducking a breath does not move a mouth, so the sync holds.

A GAP IS A HELD FRAME, not black and not a dissolve. The avatar is square and still by the
motion prompt, so the last frame of the outgoing beat reads as a beat between sentences.

FRAME COUNTS COME FROM THE TIMELINE, NEVER FROM EACH SEGMENT'S OWN DURATION. Rounding each
piece independently drifts — the previous long-form came out 0.36s long that way. Every
boundary is rounded to a frame ONCE, and each segment is the difference between two of them.
"""
import json, os, subprocess, sys, tempfile
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FF=f"{ROOT}/node_modules/ffmpeg-static/ffmpeg"
FP=f"{ROOT}/node_modules/ffprobe-static/bin/darwin/x64/ffprobe"
# Scratch space — was a hardcoded, long-gone session scratchpad.
S=os.environ.get("ASSEMBLE_SCRATCH") or tempfile.mkdtemp(prefix="assemble-")
FPS=25
def ff(a): subprocess.run([FF,"-nostdin","-v","error","-y",*a],check=True)
def dur(f): return float(subprocess.run([FP,"-v","error","-show_entries","format=duration","-of","default=nw=1:nk=1",f],capture_output=True,text=True).stdout)

ed=json.load(open(sys.argv[1])); audio=sys.argv[2]; out=sys.argv[3]
frame=lambda t: round(t*FPS)

# lay the timeline out first, then read every frame count off it
segs=[]; t=0.0
for i,b in enumerate(ed["beats"]):
    if i:
        g=b["gapBefore"]
        segs.append({"kind":"gap","start":t,"end":t+g,"from":i-1}); t+=g
    L=b["out_m"]-b["in_m"]
    segs.append({"kind":"beat","start":t,"end":t+L,"i":i}); t+=L
TOTAL=t
for s in segs: s["frames"]=frame(s["end"])-frame(s["start"])

print(f"\n  {ed['name']}   {TOTAL:.2f}s = {frame(TOTAL)} frames at {FPS}fps\n")
pieces=[]
for n,s in enumerate(segs):
    p=f"{S}/_v{n:02d}.mp4"
    if s["kind"]=="beat":
        b=ed["beats"][s["i"]]
        ff(["-ss",f"{b['in_m']:.3f}","-i",b["mp4"],"-frames:v",str(s["frames"]),
            "-vf",f"fps={FPS},scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1",
            "-an","-c:v","libx264","-preset","medium","-crf","17","-pix_fmt","yuv420p",p])
        print(f"   {b['slot']:7} {b['id']:26} {b['in_m']:6.3f}→{b['out_m']:6.3f}  {s['frames']:5d}f")
    else:
        prev=ed["beats"][s["from"]]
        still=f"{S}/_hold{n:02d}.png"
        # the LAST frame of the outgoing beat, not the first of the next: the gap belongs
        # to the sentence that just ended
        ff(["-ss",f"{max(0,prev['out_m']-1.0/FPS):.3f}","-i",prev["mp4"],"-frames:v","1",still])
        ff(["-loop","1","-i",still,"-frames:v",str(s["frames"]),
            "-vf",f"fps={FPS},scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:-1:-1",
            "-c:v","libx264","-preset","medium","-crf","17","-pix_fmt","yuv420p",p])
        print(f"   {'gap':7} {'held frame':26} {'':6} {'':6}  {s['frames']:5d}f")
    pieces.append(p)

lst=f"{S}/_vcat.txt"
open(lst,"w").write("\n".join(f"file '{p}'" for p in pieces))
mute=f"{S}/_vmute.mp4"
ff(["-f","concat","-safe","0","-i",lst,"-c","copy",mute])
ff(["-i",mute,"-i",audio,"-map","0:v:0","-map","1:a:0","-c:v","copy",
    "-c:a","aac","-b:a","256k","-shortest",out])
vd=dur(out)
nf=subprocess.run([FP,"-v","error","-select_streams","v:0","-count_frames",
    "-show_entries","stream=nb_read_frames","-of","default=nw=1:nk=1",out],capture_output=True,text=True).stdout.strip()
print(f"\n   -> {out}")
print(f"      {vd:.2f}s · {nf} frames · audio {dur(audio):.2f}s · drift {vd-dur(audio):+.3f}s\n")

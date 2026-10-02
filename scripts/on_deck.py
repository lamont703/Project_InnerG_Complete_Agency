"""Move a finished audio short into the channel's on-deck folder and keep its README true.

WHY A LEDGER AND NOT A HAND-WRITTEN LIST. Everything else in the channel folder learned this
the hard way: a README typed by hand goes stale the moment a second file lands beside it, and
nothing ever checks it against the audio. So each short's real numbers — runtime, level, the
six parts it is made of, and every in/out point if it was hand-edited — go into on-deck.json
when it arrives, and the README is regenerated from that.

  python3 scripts/on_deck.py add    <slug> [--edit <edit.json>]     # audio short
  python3 scripts/on_deck.py video  <slug> [--edit <edit.json>]     # rendered video short
  python3 scripts/on_deck.py crop   <slug>                          # 9:16 cut-down for Shorts
  python3 scripts/on_deck.py sheet
"""
import json, os, shutil, subprocess, sys, re, datetime
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FF=f"{ROOT}/node_modules/ffmpeg-static/ffmpeg"
FP=f"{ROOT}/node_modules/ffprobe-static/bin/darwin/x64/ffprobe"
DRAFTS=f"{ROOT}/experiments/content-parts/drafts"
DECK=f"{ROOT}/ShearQuery YouTube Channel/on deck audio shorts"
LEDGER=f"{DECK}/on-deck.json"
VDECK=f"{ROOT}/ShearQuery YouTube Channel/on deck video shorts"
VLEDGER=f"{VDECK}/on-deck.json"
SDECK=f"{ROOT}/ShearQuery YouTube Channel/on deck shorts"
SLEDGER=f"{SDECK}/on-deck.json"
FF=f"{ROOT}/node_modules/ffmpeg-static/ffmpeg"
# 608x1080 out of the 1920x1080 frame, centred, then up to 1080x1920. The x offset was
# chosen by matching the framing of the 9x16 twin already in hooks/ — face centred, mic
# at the lower left, the LED strip just in shot on the right.
CROP_W, CROP_X = 608, 656
CHANNEL=f"{ROOT}/ShearQuery YouTube Channel"
FOLD={"hook":"hooks","stakes":"stakes","turn":"turns","proof":"proof","cta":"ctas","middle":"answers"}
def dur(f): return float(subprocess.run([FP,"-v","error","-show_entries","format=duration","-of","default=nw=1:nk=1",f],capture_output=True,text=True).stdout)
def lufs(f):
    o=subprocess.run(f'{FF} -hide_banner -i "{f}" -af ebur128=framelog=quiet -f null - 2>&1 | grep -E "^ +I:" | tail -1',
                     shell=True,capture_output=True,text=True).stdout
    m=re.search(r"(-?\d+\.\d+)",o); return round(float(m.group(1)),1) if m else None
def peak(f):
    o=subprocess.run(f'{FF} -hide_banner -i "{f}" -af astats=measure_overall=Peak_level:measure_perchannel=none -f null - 2>&1 | grep -i "Peak level" | tail -1',
                     shell=True,capture_output=True,text=True).stdout
    m=re.search(r"(-?\d+\.\d+)",o); return round(float(m.group(1)),1) if m else None
def load(p=None): p=p or LEDGER; return json.load(open(p)) if os.path.exists(p) else {"shorts":[]}
def save(d,p=None): json.dump(d,open(p or LEDGER,"w"),indent=2)
def vinfo(f):
    o=subprocess.run([FP,"-v","error","-select_streams","v:0","-show_entries",
        "stream=width,height,r_frame_rate","-of","csv=p=0",f],capture_output=True,text=True).stdout.strip().split(",")
    n=subprocess.run([FP,"-v","error","-select_streams","v:0","-count_frames",
        "-show_entries","stream=nb_read_frames","-of","default=nw=1:nk=1",f],capture_output=True,text=True).stdout.strip()
    fps=o[2] if len(o)>2 else ""
    return {"width":int(o[0]),"height":int(o[1]),"fps":eval(fps) if "/" in fps else fps,"frames":int(n) if n.isdigit() else None}

def video(slug,editfile=None):
    """A rendered video short: the mp4 plus the avatar shots it was cut from."""
    os.makedirs(VDECK,exist_ok=True)
    src=None
    for cand in (f"{DRAFTS}/{slug}-16x9.mp4", f"{DRAFTS}/{slug}.mp4"):
        if os.path.exists(cand): src=cand; break
    if not src: sys.exit(f"  no rendered video for {slug} in {DRAFTS}")
    dst=f"{VDECK}/{os.path.basename(src)}"
    shutil.copy2(src,dst)
    rec={"slug":slug,"file":os.path.basename(src),"secs":round(dur(src),2),
         "addedAt":datetime.datetime.now().strftime("%Y-%m-%d"),**vinfo(src),
         "avatar":"HEYGEN_LANDSCAPE_AVATAR_ID","expressiveness":"medium"}
    if editfile:
        ed=json.load(open(editfile))
        rec["title"]=ed.get("name","").split(" · ")[0]
        rec["order"]=ed.get("order")
        # THE REUSABLE SHOTS THIS WAS CUT FROM. The point of rendering per part is that the
        # next video reuses them, so the record has to name them or nobody will know.
        rec["shots"]=[{"slot":b["slot"],"id":b["id"],
                       "render":f"{FOLD[b['slot']]}/avatar_renders/{b['id']}.mp4",
                       "in":b.get("in_m"),"out":b.get("out_m")} for b in ed["beats"]]
    L=load(VLEDGER); L["shorts"]=[s for s in L["shorts"] if s["slug"]!=slug]+[rec]
    L["shorts"].sort(key=lambda s:s["slug"]); save(L,VLEDGER)
    print(f"  {slug} -> on deck video  ({rec['secs']}s, {rec['width']}x{rec['height']})")
    vsheet()

def crop(slug):
    """The 9:16 cut-down. It UPSCALES — 608px of real width stretched to 1080 — which is
    the cost of rendering 16:9 and cutting down, and is what the existing twin did too."""
    os.makedirs(SDECK,exist_ok=True)
    src=None
    for cand in (f"{VDECK}/{slug}-16x9.mp4", f"{DRAFTS}/{slug}-16x9.mp4"):
        if os.path.exists(cand): src=cand; break
    if not src: sys.exit(f"  no 16:9 video for {slug}")
    dst=f"{SDECK}/{slug}-9x16.mp4"
    subprocess.run([FF,"-nostdin","-v","error","-y","-i",src,
        "-vf",f"crop={CROP_W}:1080:{CROP_X}:0,scale=1080:1920:flags=lanczos",
        "-c:v","libx264","-preset","slow","-crf","18","-pix_fmt","yuv420p",
        "-c:a","copy",dst],check=True)
    rec={"slug":slug,"file":os.path.basename(dst),"secs":round(dur(dst),2),
         "addedAt":datetime.datetime.now().strftime("%Y-%m-%d"),**vinfo(dst),
         "from":os.path.basename(src),"crop":f"{CROP_W}x1080 at x={CROP_X}, upscaled to 1080x1920"}
    v=load(VLEDGER)
    prev=next((x for x in v["shorts"] if x["slug"]==slug),None)
    if prev: rec["title"]=prev.get("title",slug); rec["shots"]=prev.get("shots")
    L=load(SLEDGER); L["shorts"]=[x for x in L["shorts"] if x["slug"]!=slug]+[rec]
    L["shorts"].sort(key=lambda x:x["slug"]); save(L,SLEDGER)
    print(f"  {slug} -> on deck shorts  ({rec['secs']}s, {rec['width']}x{rec['height']})")
    ssheet()

def ssheet():
    L=load(SLEDGER); S=L["shorts"]
    T=["# On deck — shorts (9:16)","",
       "The vertical cut-downs, ready for captions and the intro and ending.","",
       "**These upscale.** The avatar is rendered 16:9 and cut down, so 608 pixels of real width",
       "are stretched to 1080 — about 1.8x. It is what the existing 9x16 twin in `hooks/` did and it",
       "holds up at phone size, but it is not native vertical: a 9:16 render would need a portrait",
       "avatar, and those belong to other formats (see CLAUDE.md on never pointing one format at",
       "another format's avatar id).","",
       "The 16:9 masters are in `on deck video shorts/`. Regenerate this file with",
       "`python3 scripts/on_deck.py sheet`.",""]
    if not S: T+=["Nothing here yet.",""]
    else:
        T+=["| short | length | geometry | cut from |","|---|---|---|---|"]
        for s in S:
            T.append(f"| **{s.get('title',s['slug'])}**<br>`{s['file']}` | {s['secs']}s · {s.get('frames','?')}f | "
                     f"{s['width']}x{s['height']} @ {s.get('fps','?')}fps | `{s.get('from','')}` |")
        T+=["","Crop: "+S[0].get("crop","")+" — chosen to match the framing of the existing 9x16 twin.",""]
    open(f"{SDECK}/README.md","w").write("\n".join(T)+"\n")
    print(f"  {len(S)} short(s) -> {SDECK}/README.md")

def vsheet():
    L=load(VLEDGER); S=L["shorts"]
    T=["# On deck — video shorts","",
       "Rendered avatar video, cut to a Script Bench edit with the finished audio laid over it.",
       "**Not finished.** Each one still needs, in roughly this order:","",
       "1. the cuts settled — see the note on each below",
       "2. a 9:16 crop for Shorts and Reels (these are rendered 16:9)",
       "3. burned-in captions",
       "4. the corner wordmark",
       "5. the 3s ShearQuery intro and the 15s ending","",
       "Masters are in `experiments/content-parts/drafts/`; these are copies. The per-part avatar",
       "shots each video was cut from are listed below and are **reusable** — a later video that",
       "uses the same part cuts its own in and out from the same render and buys nothing.","",
       "Regenerate this file with `python3 scripts/on_deck.py sheet`.",""]
    if not S: T+=["Nothing on deck yet.",""]
    else:
        T+=["| short | length | geometry | avatar |","|---|---|---|---|"]
        for s in S:
            T.append(f"| **{s.get('title',s['slug'])}**<br>`{s['file']}` | {s['secs']}s · {s.get('frames','?')}f | "
                     f"{s['width']}x{s['height']} @ {s.get('fps','?')}fps | {s.get('avatar','')} · {s.get('expressiveness','')} |")
        T.append("")
        for s in S:
            T+= [f"## {s.get('title',s['slug'])}","",
                 f"`{s['file']}` · {s['secs']}s · {s['width']}x{s['height']} · added {s['addedAt']}",""]
            if s.get("shots"):
                T+=["Cut from these reusable avatar shots:","",
                    "| beat | part | render | in → out |","|---|---|---|---|"]
                for b in s["shots"]:
                    io=f"{b['in']:.3f} → {b['out']:.3f}" if b.get("in") is not None else "—"
                    T.append(f"| {b['slot']} | `{b['id']}` | `{b['render']}` | {io} |")
                T.append("")
    open(f"{VDECK}/README.md","w").write("\n".join(T)+"\n")
    print(f"  {len(S)} video short(s) -> {VDECK}/README.md")

def add(slug,editfile=None):
    os.makedirs(DECK,exist_ok=True)
    src=f"{DRAFTS}/{slug}.wav"
    if not os.path.exists(src): sys.exit(f"  no such draft: {src}")
    for ext in ("wav","mp3"):
        s=f"{DRAFTS}/{slug}.{ext}"
        if os.path.exists(s): shutil.copy2(s,f"{DECK}/{slug}.{ext}")
    rec={"slug":slug,"secs":round(dur(src),2),"lufs":lufs(src),"peak":peak(src),
         "addedAt":datetime.datetime.now().strftime("%Y-%m-%d"),"hasMp3":os.path.exists(f"{DECK}/{slug}.mp3")}
    if editfile:
        ed=json.load(open(editfile))
        rec["title"]=ed.get("name","").split(" · ")[0]
        rec["source"]="hand-edited on the Script Bench"
        rec["order"]=ed.get("order")
        rec["beats"]=[{"slot":b["slot"],"id":b["id"],"in":b.get("in_m"),"out":b.get("out_m"),
                       "gapBefore":b.get("gapBefore")} for b in ed["beats"]]
    else:
        # drafts.json is the default batch; a batch built from its own plan writes <name>-built.json.
        import glob
        built=[f"{DRAFTS}/drafts.json"]+sorted(glob.glob(f"{DRAFTS}/*-built.json"))
        d=next((x for f in built if os.path.exists(f) for x in json.load(open(f)) if x["slug"]==slug),None)
        rec["title"]=d["title"] if d else slug
        rec["source"]="built by build_drafts.py"
        if d: rec["beats"]=[{"slot":b["kind"],"id":b["id"],"secs":float(b["len"])} for b in d["beats_out"]]
    L=load(); L["shorts"]=[s for s in L["shorts"] if s["slug"]!=slug]+[rec]
    L["shorts"].sort(key=lambda s:s["slug"]); save(L)
    print(f"  {slug} -> on deck  ({rec['secs']}s, {rec['lufs']} LUFS)")
    sheet()

def sheet():
    L=load(); S=L["shorts"]
    T=["# On deck — audio shorts","",
       "Finished audio, levelled and ready for a picture pass. **Nothing here has a video yet**:",
       "each one still needs an avatar render or a visual treatment, captions, and the intro and ending.","",
       "Masters live in `experiments/content-parts/drafts/`; these are copies. Regenerate this file with",
       "`python3 scripts/on_deck.py sheet` — it is written from `on-deck.json`, never by hand.",""]
    if not S: T+=["Nothing on deck yet.",""]
    else:
        T+=["| short | length | level | built |","|---|---|---|---|"]
        for s in S:
            T.append(f"| **{s.get('title',s['slug'])}**<br>`{s['slug']}.mp3` | {s['secs']}s | "
                     f"{s['lufs']} LUFS · peak {s['peak']} dBFS | {s.get('source','')} |")
        T.append("")
        for s in S:
            T+= [f"## {s.get('title',s['slug'])}","",
                 f"`{s['slug']}.wav` (24-bit master) · `{s['slug']}.mp3` · {s['secs']}s · {s['lufs']} LUFS · added {s['addedAt']}",""]
            if s.get("order"): T.append(f"Order: **{s['order']}**. {s.get('source','')}.")
            T.append("")
            if s.get("beats"):
                if "in" in (s["beats"][0] or {}):
                    T+=["| beat | part | in → out | gap before |","|---|---|---|---|"]
                    for b in s["beats"]:
                        g=f"{b['gapBefore']:.2f}s" if b.get("gapBefore") else "—"
                        T.append(f"| {b['slot']} | `{b['id']}` | {b['in']:.3f} → {b['out']:.3f} | {g} |")
                else:
                    T+=["| beat | part | length |","|---|---|---|"]
                    for b in s["beats"]: T.append(f"| {b['slot']} | `{b['id']}` | {b['secs']:.2f}s |")
                T.append("")
    open(f"{DECK}/README.md","w").write("\n".join(T)+"\n")
    print(f"  {len(S)} short(s) -> {DECK}/README.md")

if __name__=="__main__":
    e=sys.argv[sys.argv.index("--edit")+1] if "--edit" in sys.argv else None
    if len(sys.argv)>1 and sys.argv[1]=="add": add(sys.argv[2],e)
    elif len(sys.argv)>1 and sys.argv[1]=="video": video(sys.argv[2],e)
    elif len(sys.argv)>1 and sys.argv[1]=="crop": crop(sys.argv[2])
    else: sheet(); vsheet(); ssheet()

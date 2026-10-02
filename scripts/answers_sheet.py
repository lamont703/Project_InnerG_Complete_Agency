"""Copy every interview answer into the channel folder and write one README for all of them.

WHY GENERATED. The first version of answers/README.md was hand-written for interview-001,
and the second interview would have meant either editing it by hand or leaving seven wavs
undocumented beside seven that were. Same reason the parts READMEs are generated: the text
lives in one place — here, each interview's transcript.json — and everything else is derived.
"""
import json, os, shutil, glob
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CP=f"{ROOT}/experiments/content-parts"
DST=f"{ROOT}/ShearQuery YouTube Channel/answers"; os.makedirs(DST,exist_ok=True)
books=[]
for tj in sorted(glob.glob(f"{CP}/answers/*/transcript.json")):
    d=json.load(open(tj)); d["_dir"]=os.path.dirname(tj); books.append(d)
L=["# Answers — raw material for the middles","",
   "**These are not parts.** Hooks, stakes, turns, proofs and CTAs are cut tight because they",
   "get used whole. An answer is 20 to 55 seconds and a Short needs 15 to 25 of it, so the",
   "pauses are deliberately still in: which seconds become the video is decided from the text",
   "below, and a pause trimmed now cannot be put back.","",
   "Copies. Masters and both transcripts are under `experiments/content-parts/answers/`.",
   "Regenerate with `python3 scripts/answers_sheet.py`.",""]
n=0
for d in books:
    L+= [f"## Interview {d['interview']}",""]
    if d.get("target"): L+= [f"Target: **{d['target']}**",""]
    L+= ["| file | length | what it covers |","|---|---|---|"]
    for a in d["answers"]:
        if a["id"]=="q1-joined" or not a.get("secs"): pass
        src=os.path.join(ROOT,a["file"])
        if os.path.exists(src):
            shutil.copy2(src,os.path.join(DST,os.path.basename(a["file"]))); n+=1
        L.append(f"| `{os.path.basename(a['file'])}` | {a['secs']}s | {a['label']} |")
    L.append("")
    for a in d["answers"]:
        L+= [f"### {a['id']}","",a.get("text","")," "]
    L.append("")
L+=["## One joined take","",
    "`q1-joined.wav` in interview-001 is two takes spliced — that folder's README records where",
    "the splice is and the two cut points that were audible before it.",""]
open(f"{DST}/README.md","w").write("\n".join(L)+"\n")
print(f"  {n} answer files -> {DST}")
print(f"  {sum(len(d['answers']) for d in books)} answers across {len(books)} interviews documented")

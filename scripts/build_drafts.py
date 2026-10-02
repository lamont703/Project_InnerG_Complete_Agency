"""Assemble shorts from the parts library and interview 001. AUDIO ONLY.

No avatar is bought. What these drafts settle is whether the structure holds up
when you listen to it, and that is decided before anything is rendered.

EVERY BOUNDARY IS THE QUIETEST 40ms IN A RANGE, never a word timestamp. Whisper
put the end of "call?" 0.42s early in q1b and the cut landed inside the word.
Searching the envelope cannot make that mistake, and where a range holds no real
gap this refuses instead of cutting inside a word.

THE BEAT BETWEEN PARTS IS BUILT, NOT INHERITED. Each part carries whatever room
its own cut left on the ends, which ranged from 0.03s to 0.82s across the first
build — dead air at one join and no breath at the next, in the same file. So
every beat is trimmed tight to its speech and a deliberate 0.28s bed goes between
them.

THAT BED IS ROOM TONE, HALF FROM EACH SIDE, NOT SILENCE. Digital silence between
two takes puts a hole in the floor that reads as a glitch (a -73 dB hole was
audible in the first q1 join). And the four recording sessions sit at floors from
-50 to -57 dB, so a bed taken wholly from one side steps the floor at the far
seam; crossfading the outgoing take's tone into the incoming take's spreads that
step across 0.04s where nothing can hear it.
"""
import json, subprocess, numpy as np, os, re, sys, tempfile
ROOT="/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services"
FF=f"{ROOT}/node_modules/ffmpeg-static/ffmpeg"
FP=f"{ROOT}/node_modules/ffprobe-static/bin/darwin/x64/ffprobe"
CP=f"{ROOT}/experiments/content-parts"
# Scratch space. It used to be one session's scratchpad, hardcoded, and every run after that
# session ended died on the first temp file.
S=os.environ.get("DRAFT_SCRATCH") or tempfile.mkdtemp(prefix="drafts-")
OUT=f"{CP}/drafts"; os.makedirs(OUT,exist_ok=True)
ANSWER_DIRS={"answer":f"{CP}/answers/interview-001","answer003":f"{CP}/answers/interview-003",
             "answer004":f"{CP}/answers/interview-004"}
man=json.load(open(f"{CP}/manifest.json")); P={p["id"]:p for p in man["parts"]}
# GAPS ARE SET FROM HIS OWN SPEECH, not chosen. 305 internal pauses measured across the
# 15 answer takes: median 0.14s, 75th percentile 0.23s, 90th 0.34s. The first version used
# 0.34s on every join — his 85th percentile, uniformly — which is what made the joins
# audible as edits rather than as breaths. A beat change is a bigger boundary than a
# mid-sentence pause, so it sits above his median, and entering or leaving the MIDDLE is a
# bigger boundary still than hook->stakes.
GAP_WRAP, GAP_MID = 0.20, 0.28    # the gap the LISTENER hears, not the bed inserted
EDGE_HEAD, EDGE_TAIL, XF = 0.10, 0.03, 0.02
SHAVE_FLOOR = -54.0   # below this is room tone on every session measured; above it may be a soft word
# The head margin is deliberately wider than the tail: a part's head carries his breath and
# lead-in and only a 0.02s fade, while its tail carries the cleaning recipe's 0.12s fade-out,
# which is the ramp that warps. So lead-in is kept and the tail stays tight.
# NOTHING IS EVER FADED TO ZERO AT AN INTERNAL SEAM. Butt-joining two pieces that
# each fade out and in over 8ms puts a 16ms hole in continuous room tone, and at a
# -47 dB floor that hole is audible as a small warp right before a word — which is
# exactly what came back from the first listen of short-03, the draft with the most
# seams and the loudest bed. Pieces are chained with acrossfade instead, so the
# outgoing tone hands over to the incoming tone and the floor never drops out.

def dur(f): return float(subprocess.run([FP,"-v","error","-show_entries","format=duration","-of","default=nw=1:nk=1",f],capture_output=True,text=True).stdout)
def env(f):
    raw=subprocess.run([FF,"-v","error","-i",f,"-ac","1","-ar","48000","-f","f32le","-"],capture_output=True).stdout
    x=np.frombuffer(raw,dtype=np.float32); h=480
    return 20*np.log10(np.sqrt((x[:len(x)//h*h].reshape(-1,h)**2).mean(1))+1e-9)
def lufs(f):
    o=subprocess.run(f'{FF} -hide_banner -i "{f}" -af ebur128=framelog=quiet -f null - 2>&1 | grep -E "^ +I:" | tail -1',
                     shell=True,capture_output=True,text=True).stdout
    return float(re.search(r"(-?\d+\.\d+)",o).group(1))
def ff(args): subprocess.run([FF,"-nostdin","-v","error","-y",*args],check=True)
def quiet_head(f,floor=-38.0):
    """How long the file is quiet before its first audible frame."""
    e=env(f); a=[i for i,v in enumerate(e>floor) if v]
    return (a[0]/100) if a else 0.0

def quiet_tail(f,floor=-38.0):
    e=env(f); a=[i for i,v in enumerate(e>floor) if v]
    return ((len(e)-1-a[-1])/100) if a else 0.0

def chain(pieces,out,xf=XF):
    """Concatenate with a crossfade at every seam — no piece reaches zero."""
    if len(pieces)==1:
        ff(["-i",pieces[0],"-ar","48000","-ac","2","-c:a","pcm_s24le",out]); return out
    ins=[x for f in pieces for x in ("-i",f)]
    fc,prev="","0:a"
    for i in range(1,len(pieces)):
        fc+=f"[{prev}][{i}:a]acrossfade=d={xf}:c1=tri:c2=tri[x{i}];"; prev=f"x{i}"
    ff([*ins,"-filter_complex",fc.rstrip(";"),"-map",f"[{prev}]",
        "-ar","48000","-ac","2","-c:a","pcm_s24le",out]); return out

def gap(f,lo,hi,need=-34.0):
    e=env(f); i0,i1=int(lo*100),int(hi*100)
    b=min(range(i0,i1-4),key=lambda i:e[i:i+4].mean()); lvl=e[b:b+4].mean()
    if lvl>need: raise SystemExit(f"  no gap in {os.path.basename(f)} {lo}-{hi}s — quietest 40ms is {lvl:.0f} dB")
    return round((b+2)/100,2), lvl

MAXPAUSE, TIGHTEN_TO = 0.40, 0.26

def tighten(src,out):
    """Shorten any pause over 0.40s to 0.26s, in the DRAFT only.

    The answer masters keep their pauses on purpose — which seconds become a
    middle is decided from the transcript, and a pause trimmed there cannot be
    put back. But a 0.88s hole mid-thought is dead air in a 40-second short, and
    it is his delivery rather than anything the edit did.

    THE CUT COMES OUT OF THE MIDDLE OF THE PAUSE, so what is left either side is
    his own room tone at his own level, and the taper into and out of the pause
    is untouched.
    """
    e=env(src); q=e<-38
    runs,st=[],None
    for i,v in enumerate(q):
        if v and st is None: st=i
        elif not v and st is not None:
            if (i-st)/100>MAXPAUSE: runs.append((st,i))
            st=None
    if not runs: return src,0.0
    keep,at,saved=[],0,0.0
    for a,b in runs:
        mid=(a+b)//2; half=int(TIGHTEN_TO*100/2)
        keep.append((at/100,(mid-(b-a-int(TIGHTEN_TO*100))//2)/100))
        cutlen=(b-a)/100-TIGHTEN_TO; saved+=cutlen
        at=int(keep[-1][1]*100+cutlen*100)
    keep.append((at/100,dur(src)))
    parts=[]
    for j,(a,b) in enumerate(keep):
        p=f"{S}/_tg{j}.wav"
        ff(["-ss",f"{a:.3f}","-to",f"{b:.3f}","-i",src,"-ar","48000","-ac","2","-c:a","pcm_s24le",p])
        parts.append(p)
    chain(parts,out)
    return out, round(saved,2)

def debreath(src,out):
    """Duck audible inhales to just above the room, leaving the quiet ones alone.

    A BREATH IS NOT A DEFECT; A BREATH YOU CAN HEAR OVER THE ROOM IS. Removing all of
    them makes speech sound assembled, so this only touches events that are LOUD: inside
    a pause, 12 dB or more above that pause's own floor, 40-300ms long, and with more than
    a quarter of their energy above 4 kHz — which is a nasal inhale and not a vowel, a
    plosive or a word tail. Each one is ducked to the floor + 3 dB over a 15ms ramp, so the
    timing of the breath survives and only its loudness goes.
    """
    # BOTH CHANNELS STAY THROUGHOUT. Reading with -ac 1 and writing with -ac 2 cost exactly
    # 3 dB, because ffmpeg's mono-to-stereo upmix scales each channel by 0.707 to hold power
    # constant — which measured as a -19.0 LUFS cut where every other draft sits at -16.3.
    raw=subprocess.run([FF,"-v","error","-i",src,"-ac","2","-ar","48000","-f","f32le","-"],capture_output=True).stdout
    sm=np.frombuffer(raw,dtype=np.float32).reshape(-1,2)
    x=sm.mean(1); h=480; n=len(x)//h
    if n<10: return src,0
    fr8=x[:n*h].reshape(-1,h)
    e=20*np.log10(np.sqrt((fr8**2).mean(1))+1e-9)
    spec=np.abs(np.fft.rfft(fr8*np.hanning(h),axis=1)); freqs=np.fft.rfftfreq(h,1/48000)
    hf=spec[:,freqs>4000].sum(1)/np.maximum(spec.sum(1),1e-9)
    voiced=np.zeros(n,bool); run=None
    for i,v in enumerate(e>-33):
        if v and run is None: run=i
        elif not v and run is not None:
            if i-run>=6: voiced[run:i]=True
            run=None
    if run is not None and n-run>=6: voiced[run:]=True
    pauses=[]; st=None
    for i in range(n):
        if not voiced[i] and st is None: st=i
        elif voiced[i] and st is not None:
            if i-st>=8: pauses.append((st,i))
            st=None
    if st is not None and n-st>=8: pauses.append((st,n))
    gain=np.ones(len(sm),dtype=np.float32); hits=0
    for a,b in pauses:
        seg=e[a:b]; floor=float(np.percentile(seg,25)); i=a
        while i<b:
            if e[i]>floor+12:
                j=i
                while j<b and e[j]>floor+8: j+=1
                dur=(j-i)/100
                if 0.04<=dur<=0.30 and float(hf[i:j].mean())>0.25:
                    pk=float(e[i:j].max()); cut=max(0.0,pk-(floor+3))
                    g=10**(-cut/20); s0,s1=i*h,j*h; ramp=int(0.015*48000)
                    gain[s0:s1]=g
                    gain[max(0,s0-ramp):s0]=np.linspace(1,g,min(ramp,s0))
                    gain[s1:s1+ramp]=np.linspace(g,1,len(gain[s1:s1+ramp]))
                    hits+=1
                i=j
            else: i+=1
    if not hits: return src,0
    y=(sm*gain[:,None]).astype(np.float32)
    p=subprocess.Popen([FF,"-nostdin","-v","error","-y","-f","f32le","-ar","48000","-ac","2","-i","pipe:0",
        "-ar","48000","-ac","2","-c:a","pcm_s24le",out],stdin=subprocess.PIPE)
    p.communicate(y.tobytes())
    return out,hits

def speech(f,floor=-45.0,minrun_start=2,minrun_end=5):
    """First and last time speech is sustained above `floor` for `minrun` frames (50ms).

    THE TWO ENDS NEED DIFFERENT RULES, because they fail in opposite directions.

    At the END, a lenient test accepted isolated breath frames at -42 and put the boundary
    0.21s past the last word on hook-ever-run-a-chair, which the beat then kept and which
    showed up as a 0.61s gap where 0.18s was intended. So the end needs a sustained 50ms run.

    At the START, that same strictness skips SHORT LEADING WORDS: proof-sixteen-chairs opens
    on "I" and its first 50ms run does not begin until 0.41s, 0.29s past the word. Clipping
    a leading "I" or "And" is the mistake already made twice here. So the start stays lenient
    and the 0.10s head margin covers it.

    -45 dB, NOT -35, and the margin kept beyond it is 0.03s. Every part was cut
    with a 0.12s fade-out on its tail, so a wider margin retains part of that
    fade: the tone ramps 8 dB down and then the level bed comes in underneath it,
    which is the small warp heard at the slice points in the first short-03. The
    beat now ends at its own speech and the bed supplies the whole gap, so no
    ramp is ever inside the assembly.
    """
    e=env(f)
    def R(minrun):
        runs=[]; st=None
        for i,v in enumerate(e>floor):
            if v and st is None: st=i
            elif not v and st is not None:
                if i-st>=minrun: runs.append((st,i))
                st=None
        if st is not None and len(e)-st>=minrun: runs.append((st,len(e)))
        return runs
    return R(minrun_start)[0][0]/100, R(minrun_end)[-1][1]/100

ABOVE_FLOOR = 6.0  # a window this far above the take's OWN floor is word decay, not room

def tone(src,secs,tag):
    """The quietest window of `secs` in this take — its own room, nothing grafted.

    A BEAT WITH NO PAUSE IN IT HAS NO ROOM TO LEND. proof-both-sides is 5.95s of
    near-continuous speech, so its quietest 0.16s sits at -47 dB: that is the
    decay of a word, and laying it under a join puts a ghost of speech there.
    Such a side reports its level and the caller takes the bed from the other one.
    """
    e=env(src); n=int(secs*100)
    # THE TYPICAL ROOM, NOT THE QUIETEST MOMENT. Taking the minimum put beds at
    # -62 dB in a take whose floor is -55, which stepped the level 12 dB at the
    # join. Among windows that hold no speech at all, this takes the one closest
    # to the take's ordinary quiet level, so the bed sits where the room sits.
    quiet=[i for i in range(len(e)-n) if e[i:i+n].max()<-40]
    if quiet:
        target=float(np.percentile(e[e<-40],40)) if (e<-40).any() else -55.0
        b=min(quiet,key=lambda i:abs(e[i:i+n].mean()-target))
    else:
        b=min(range(len(e)-n),key=lambda i:e[i:i+n].mean())
    out=f"{S}/_tone_{tag}.wav"
    ff(["-ss",f"{b/100:.2f}","-t",f"{secs:.3f}","-i",src,"-ar","48000","-ac","2","-c:a","pcm_s24le",out])
    lvl=float(e[b:b+n].mean()); floor=float(np.percentile(e,3))
    # RELATIVE, NOT ABSOLUTE. The four sessions floor anywhere from -50 to -57 dB,
    # so a fixed threshold calls a quiet session's real room "decay" and passes a
    # loud one's decay as room. proof-both-sides has almost no pause in it and its
    # quietest 0.16s is -47 dB — which is 4.9 dB above its own floor, so it IS room.
    return out, round(lvl,1), lvl-floor <= ABOVE_FLOOR

# A plan file can be named, so a new batch builds without rebuilding (and rewriting) every
# draft in draft-plan.json:  python3 scripts/build_drafts.py drafts/ai-plan.json
PLAN=sys.argv[1] if len(sys.argv)>1 else "drafts/draft-plan.json"
PLAN=PLAN if os.path.isabs(PLAN) else f"{CP}/{PLAN}"
DRAFTS=json.load(open(PLAN))
for d in DRAFTS:
    # "intact": true LEAVES EVERY BEAT AS RECORDED — no pause tightening, no breath ducking,
    # only the edges trimmed and the joins built. Added 2026-10-01: on the AI drafts the
    # breath detector fired 4 times in a 4s CTA, catching the "s"/"th" at the start of words
    # ("send it to them" transcribed as "to him"), which sounded like parts cut mid-line.
    INTACT=bool(d.get("intact"))
    print(f"\n=== {d['title']}")
    beats=[]
    for b in d["beats"]:
        if b[0]=="part":
            p=P[b[1]]; src=os.path.join(ROOT,p["audio"])
            beats.append(dict(kind=p["part"],id=b[1],src=src,text=p["text"],master=b[1],off=0.0))
        else:
            kind,q,a,z=b; src=f"{ANSWER_DIRS[kind]}/{q}.wav"
            if isinstance(a,list): a,l=gap(src,a[1],a[2]); print(f"   in  {q} @ {a}s ({l:.0f} dB)")
            if z is None: z=round(dur(src),2)
            elif isinstance(z,list): z,l=gap(src,z[1],z[2]); print(f"   out {q} @ {z}s ({l:.0f} dB)")
            cut=f"{S}/_m_{q}.wav"
            ff(["-ss",str(a),"-to",str(z),"-i",src,"-ar","48000","-ac","2","-c:a","pcm_s24le",cut])
            tight,saved=(cut,0) if INTACT else tighten(cut,f"{S}/_mt_{q}.wav")
            if saved: print(f"   tightened {q}: {saved}s of pause removed")
            beats.append(dict(kind="middle",id=f"{q}  {a}–{z}s",src=tight,text=None,answers=kind,master=q,off=float(a)))

    pieces=[]
    for i,b in enumerate(beats):
        # TIGHTENING AND DE-BREATHING RUN ON EVERY BEAT NOW. They used to run on the middle
        # only, which left a 10-second proof free to carry its own dead air and its own
        # audible sniff into the cut.
        if b["kind"]!="middle" and not INTACT:
            tg,saved=tighten(b["src"],f"{S}/_wt{i}.wav")
            if saved: print(f"   tightened {b['id']}: {saved}s of pause removed"); b["src"]=tg
        db_,hits=(b["src"],0) if INTACT else debreath(b["src"],f"{S}/_db{i}.wav")
        if hits: print(f"   {b['id']}: ducked {hits} audible breath{'s' if hits>1 else ''}"); b["src"]=db_
        s,e_=speech(b["src"])
        # NEVER LET THE MARGIN REACH THE PART'S OWN FADE. A part cleaned by
        # content_parts.js carries a 0.12s fade-out; any of it kept here is a ramp
        # inside the assembly, which is the warp. Middles have no fade to avoid.
        room = dur(b["src"]) - (0.12 if b["kind"]!="middle" else 0.0) - e_
        tail = max(0.0, min(EDGE_TAIL, room))
        # THE LAST BEAT KEEPS ITS OWN DECAY AND FADE. Nothing follows it, so the reason for the
        # tight tail (no ramp inside the assembly) does not apply, and trimming it made the
        # final word stop dead.
        if i==len(beats)-1: tail=max(0.0, dur(b["src"])-e_)
        head = min(EDGE_HEAD, s)
        trimmed=f"{S}/_b{i}.wav"
        ff(["-ss",f"{max(0,s-head):.3f}","-to",f"{min(dur(b['src']),e_+tail):.3f}","-i",b["src"],
            "-ar","48000","-ac","2","-c:a","pcm_s24le",trimmed])
        b["len"]=dur(trimmed); b["_trim"]=trimmed
        b["m_in"]=b["off"]+max(0,s-head)   # valid only in INTACT mode, where src IS the master
        # Only a library part carries the cleaning recipe's 0.12s fade-out; a middle
        # is cut straight out of an answer and has none, so it cannot fail this.
        if b["kind"]!="middle" and tail<EDGE_TAIL:
            print(f"   {b['id']}: margin clamped to {tail:.3f}s to stay clear of its fade")
        if i: # the bed: outgoing take's tone crossfaded into the incoming take's
            prev_trim=beats[i-1]["_trim"]
            # THE BED IS SOLVED FOR, NOT CHOSEN. What a listener hears is the outgoing
            # word's decay + the bed + the incoming breath, and the first two of those vary
            # per take: setting a fixed bed gave gaps from 0.16s to 0.56s. So each beat's
            # own quiet is measured and the bed is whatever is left to reach the target.
            target = GAP_MID if (b["kind"]=="middle" or beats[i-1]["kind"]=="middle") else GAP_WRAP
            qt, qh = quiet_tail(prev_trim), quiet_head(trimmed)
            BED = target - qt - qh + 2*XF
            # THE BED CANNOT GO BELOW ZERO, so when the two takes' own quiet already exceeds
            # the target, the quiet is taken off the beats themselves — first the incoming
            # head, then the outgoing tail. Both are quiet by construction, so removing X
            # removes exactly X of gap and cannot touch a word. Without this, joins ran from
            # 0.19s to 0.60s while most sat on 0.21s, and it is the INCONSISTENCY that reads
            # as stitching rather than any single gap being wrong.
            if BED < 0.02:
                # SHAVE ONLY ROOM TONE. qh/qt use -38 dB to judge the gap a listener hears, but
                # env() downmixes his left-only mic with a silent right channel, so every level
                # reads ~6 dB low and a soft leading "And" (-38 to -45 on the mic) counted as
                # quiet. Shaving up to qh cut it off turn-bad-experience (2026-10-01). The cap is
                # the head that is quiet at -54, which is room, never a word.
                shave=min(qh,quiet_head(trimmed,SHAVE_FLOOR),0.02-BED)
                if shave>0.005:
                    ff(["-ss",f"{shave:.3f}","-i",trimmed,"-ar","48000","-ac","2","-c:a","pcm_s24le",f"{S}/_b{i}h.wav"])
                    trimmed=f"{S}/_b{i}h.wav"; b["len"]=dur(trimmed); b["_trim"]=trimmed; b["m_in"]+=shave
                    qh=quiet_head(trimmed); BED=target-qt-qh+2*XF
            if BED < 0.02:
                shave=min(qt,quiet_tail(prev_trim,SHAVE_FLOOR),0.02-BED)
                if shave>0.005:
                    d0=dur(prev_trim)
                    ff(["-t",f"{d0-shave:.3f}","-i",prev_trim,"-ar","48000","-ac","2","-c:a","pcm_s24le",f"{S}/_b{i-1}t.wav"])
                    prev_trim=f"{S}/_b{i-1}t.wav"
                    beats[i-1]["_trim"]=prev_trim; beats[i-1]["len"]=dur(prev_trim)
                    pieces[-1]=prev_trim
                    qt=quiet_tail(prev_trim); BED=target-qt-qh+2*XF
            BED=max(0.02,min(0.40,BED))
            b["gap"]=round(qt+BED+qh-2*XF,3)     # what the listener hears, recorded per join
            t1,l1,r1=tone(beats[i-1]["src"],BED/2+0.02,f"{i}a")
            t2,l2,r2=tone(b["src"],BED/2+0.02,f"{i}b")
            if not r1 and r2: t1,l1=t2,l2          # outgoing beat has no room to lend
            elif not r2 and r1: t2,l2=t1,l1        # incoming beat has none
            elif not r1 and not r2:                # neither does: take the quieter
                if l2<l1: t1,l1=t2,l2
                else: t2,l2=t1,l1
            if not (r1 and r2): print(f"   bed at beat {i}: borrowed tone (no pause in one side)")
            bed=f"{S}/_bed{i}.wav"
            # THE TWO HALVES GET LEVEL-MATCHED TOWARDS EACH OTHER FIRST. Two takes from
            # different sessions can floor 13 dB apart — interview-003's answers sit near
            # -50 while some parts sit at -63 — and crossfading them raw turns that
            # difference into a 0.30s RAMP right before a word, which is audible in a way
            # a step is not. Each half moves at most 6 dB, so neither is boosted into hiss.
            mid=(l1+l2)/2
            g1=max(-6.0,min(6.0,mid-l1)); g2=max(-6.0,min(6.0,mid-l2))
            ff(["-i",t1,"-i",t2,"-filter_complex",
                f"[0:a]volume={g1:.2f}dB[a];[1:a]volume={g2:.2f}dB[b];"
                f"[a][b]acrossfade=d={min(0.04,BED/3):.3f}:c1=tri:c2=tri[o]",
                "-map","[o]","-ar","48000","-ac","2","-c:a","pcm_s24le",bed])
            l1,l2=l1+g1,l2+g2
            pieces.append(bed); b["bed"]=(round(l1,1),round(l2,1))
        pieces.append(trimmed)

    raw_=f"{S}/_raw.wav"; chain(pieces,raw_)
    wav=f"{OUT}/{d['slug']}.wav"
    T_=dur(raw_)
    # BOTH EARS. His mic is left-only, so the mix is copied to the right channel and turned
    # down 3.01 dB to stay at -16 LUFS (see scripts/dual_mono.py). Without this every short
    # played in one ear (2026-10-01).
    ff(["-i",raw_,"-af",f"afade=t=in:d=0.02,afade=t=out:st={T_-0.04:.3f}:d=0.04,pan=stereo|c0=c0|c1=c0,volume=-3.01dB",
        "-ar","48000","-ac","2","-c:a","pcm_s24le",wav])
    ff(["-i",wav,"-c:a","libmp3lame","-b:a","192k",f"{OUT}/{d['slug']}.mp3"])
    t=0.0
    for i,b in enumerate(beats):
        if i: t+=dur(f"{S}/_bed{i}.wav")-XF*2
        print(f"   {int(t//60)}:{t%60:05.2f}  {b['kind']:7} {b['id']:36} {b['len']:5.2f}s"
              + (f"   bed {b['bed'][0]:.0f}/{b['bed'][1]:.0f} dB" if i else ""))
        b["at"]=round(t,2); t+=b["len"]
    d["secs"]=round(dur(wav),2); d["lufs"]=round(lufs(wav),1)
    d["beats_out"]=[{k:v for k,v in b.items() if k!="src"} for b in beats]
    # THE EDIT LIST FOR THE PICTURE. scripts/assemble_part_video.py cuts each part's full-length
    # avatar render (scripts/render_part_avatars.js) to the same in/out this audio used, so it
    # needs those points on the MASTER's clock. Only INTACT drafts can give them: tightening
    # removes pauses and moves every later word, which no single in point can describe.
    if INTACT:
        FOLDER={"hook":"hooks","stakes":"stakes","turn":"turns","proof":"proof","cta":"ctas","middle":"answers"}
        eb=[]
        for i,b in enumerate(beats):
            eb.append({"slot":b["kind"],"id":b["master"],
                "mp4":f"{ROOT}/ShearQuery YouTube Channel/{FOLDER[b['kind']]}/avatar_renders/{b['master']}.mp4",
                "in_m":round(b["m_in"],3),"out_m":round(b["m_in"]+b["len"],3),
                "gapBefore":None if i==0 else round(b["at"]-(beats[i-1]["at"]+beats[i-1]["len"]),3)})
        json.dump({"name":d["title"],"order":"-".join(x["slot"] for x in eb),"beats":eb},
                  open(f"{OUT}/{d['slug']}.edit.json","w"),indent=1)
    print(f"   -> {d['secs']}s   {d['lufs']} LUFS")
BUILT=f"{OUT}/drafts.json" if PLAN.endswith("draft-plan.json") else PLAN[:-len(".json")].removesuffix("-plan")+"-built.json"
json.dump(DRAFTS,open(BUILT,"w"),indent=1,default=str)

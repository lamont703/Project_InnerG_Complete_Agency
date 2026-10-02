"""Write an OVERLAYS.md teaching card (or the hook text) from a small JSON spec.

    python3 scripts/make_card.py <card.json>          # writes <card.json's "dir">/index.html

Then render it like any card:
    node scripts/render_overlay_frames.js --comp=<dir> --out=<dir>/renders/<name>.mov --dur=<dur> --w=1080 --h=1920 --fps=25

WHY A GENERATOR. The first two Shorts' cards were hand-written HTML and every one repeated the
same tokens, motion functions and layout. Ten more by hand is ten chances to drift from the
approved look. The style below is lifted from the approved compositions
(reference/ai03-*, reference/ai02-*); the spec only says WHAT appears and WHEN.

CARD SPEC (times are seconds from the card's own time zero = its `at` in finish.spec.json;
every element time is a word time from the cut's words.json minus that `at`):
  {"dir": "reference/<name>-overlay", "kind": "teaching|story|highlight", "dur": 20.0,
   "header": "comment header — what it teaches, band, time zero, word times, sources",
   "height": 392 | 540,                         # card band height (top is y 940)
   "kicker": "IF YOUR WEBSITE CAN'T TALK TO AN",
   "title": "You sit at the <mark>top</mark>",  # <mark> = highlighter sweep at title_mark_at
   "title_size": 44, "title_mark_at": 3.3,
   "figure": {"text": "$83,000", "sub": "8 chairs × $200 × 52 weeks ≈ $83,200", "at": 3.9},
   "chip":   {"text": "Less than minimum wage", "at": 16.9, "tone": "brand|ok|red"},
   "rows":   [{"text": "...", "key": "✕|→|1|✓", "tone": "bad|why|plain|ok", "at": 5.1,
               "glow_until": 6.1, "strike_at": 9.0}],
   "bubbles":[{"text": "...", "side": "left|right", "who": "CLIENT", "at": 2.2}],
   "banner": {"html": "Make your website <b>agent-friendly</b>", "at": 26.1}}

HOOK TEXT SPEC: {"dir": ..., "hook": ["line one", "line two"], "dur": 14.72, "header": "..."}
"""
import json, os, sys, html as H

TOKENS = """:root{--card:rgba(14,18,22,.90);--rule:rgba(255,255,255,.12);--ink:#F2F5F7;
      --soft:#AAB4BB;--faint:#76828A;--brand:#00b2de;--amber:#FFB020;--red:#FF5A4E;--ok:#3FCF8E}"""

MOTION = r"""
const clamp=(v)=>Math.max(0,Math.min(1,v));
const out3=(u)=>1-Math.pow(1-clamp(u),3);
const in2=(u)=>Math.pow(clamp(u),2);
const inout2=(u)=>{u=clamp(u);return u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;};
const back=(u)=>{u=clamp(u);const c=2,c3=c+1;return 1+c3*Math.pow(u-1,3)+c*Math.pow(u-1,2);};
const R=(t,a,d)=>clamp((t-a)/d);
const el=(id)=>document.getElementById(id);
function cardInOut(id,t,a,b){const i=out3(R(t,a,.45)),o=in2(R(t,b,.4));
  el(id).style.opacity=(i*(1-o)).toFixed(4);el(id).style.transform=`translateY(${((1-i)*60+o*30).toFixed(2)}px)`;}
function rowIn(id,t,a,dx=-24,d=.33){const u=out3(R(t,a,d));el(id).style.opacity=u.toFixed(4);el(id).style.transform=`translateX(${((1-u)*dx).toFixed(2)}px)`;}
function glow(id,t,a,b){el(id).style.opacity=(R(t,a,.2)*(1-R(t,b,.4))).toFixed(4);}
function marker(id,t,a){el(id).style.transform=`scaleX(${out3(R(t,a,.45)).toFixed(4)})`;}
function strike(id,t,a){el(id).style.width=`${(104*inout2(R(t,a,.4))).toFixed(2)}%`;}
function chipPop(id,t,a){const u=R(t,a,.3);el(id).style.opacity=clamp(u*3).toFixed(4);el(id).style.transform=`scale(${(0.6+0.4*back(u)).toFixed(4)})`;}
function figLand(id,t,a){const u=R(t,a,.5);el(id).style.opacity=clamp(u*2.5).toFixed(4);
  const s=u<1?0.82+0.24*out3(u)-0.06*Math.sin(Math.PI*u):1;el(id).style.transform=`scale(${s.toFixed(4)})`;}
function banner(id,t,a){const u=out3(R(t,a,.4));el(id).style.opacity=u.toFixed(4);el(id).style.transform=`translateY(${((1-u)*24).toFixed(2)}px)`;}
"""

def card(c):
    rows, js = [], []
    dur = c["dur"]; h = c.get("height", 392)
    js.append(f'cardInOut("card",t,0.15,{dur - 0.70:.2f});')
    title = c.get("title")
    if title:
        t_html = title.replace("<mark>", '<span class="mark"><b>').replace("</mark>", '</b><i id="mk"></i></span>')
        rows.append(f'<div id="title" style="font-size:{c.get("title_size", 44)}px">{t_html}</div>')
        js.append('rowIn("title",t,0.40,-20,.35);')
        if "<mark>" in title: js.append(f'marker("mk",t,{c.get("title_mark_at", 1.0)});')
    if c.get("figure"):
        f = c["figure"]
        rows.append(f'<div class="figwrap"><div id="fig">{H.escape(f["text"])}</div>'
                    + (f'<div id="figsub">{H.escape(f["sub"])}</div>' if f.get("sub") else "") + "</div>")
        js.append(f'figLand("fig",t,{f["at"]});')
        if f.get("sub"): js.append(f'rowIn("figsub",t,{f["at"] + 0.6},-16,.3);')
    for i, b in enumerate(c.get("bubbles", [])):
        who = f'<span class="who">{H.escape(b["who"])}</span>' if b.get("who") else ""
        rows.append(f'<div class="bub {b.get("side", "left")}" id="u{i}">{who}{H.escape(b["text"])}</div>')
        js.append(f'rowIn("u{i}",t,{b["at"]},{-24 if b.get("side", "left") == "left" else 24},.33);')
    for i, r in enumerate(c.get("rows", [])):
        tone = r.get("tone", "plain")
        txt = H.escape(r["text"])
        if r.get("strike_at") is not None: txt = f'<span class="stk">{txt}<s id="s{i}"></s></span>'
        rows.append(f'<div class="row {tone}" id="r{i}"><div class="glow" id="g{i}"></div>'
                    f'<span class="k">{H.escape(r.get("key", "→"))}</span><span>{txt}</span></div>')
        js.append(f'rowIn("r{i}",t,{r["at"]});')
        js.append(f'glow("g{i}",t,{r["at"]},{r.get("glow_until", r["at"] + 1.6)});')
        if r.get("strike_at") is not None: js.append(f'strike("s{i}",t,{r["strike_at"]});')
    chip = c.get("chip")
    chip_html = (f'<div id="chip" class="{chip.get("tone", "brand")}">{H.escape(chip["text"])}</div>' if chip else "")
    if chip: js.append(f'chipPop("chip",t,{chip["at"]});')
    ban = c.get("banner")
    ban_html = f'<div id="banner"><span>{ban["html"]}</span></div>' if ban else ""
    if ban: js.append(f'banner("banner",t,{ban["at"]});')
    kicker = f'<div class="kicker">{H.escape(c["kicker"])}</div>' if c.get("kicker") else ""
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&display=swap">
<style>
/*
 * {c.get("kind", "teaching").upper()} — generated by scripts/make_card.py. See OVERLAYS.md.
{chr(10).join(" * " + l for l in c.get("header", "").splitlines())}
 */
{TOKENS}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:1080px;height:1920px;overflow:hidden;background:transparent}}
body{{font-family:"Inter","Helvetica Neue",Arial,sans-serif;color:var(--ink)}}
#card{{position:absolute;left:40px;right:40px;top:940px;height:{h}px;background:var(--card);
      border:1px solid var(--rule);border-radius:28px;padding:24px 30px;opacity:0;overflow:hidden;
      box-shadow:0 18px 50px rgba(0,0,0,.45)}}
.kicker{{font-size:19px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--faint)}}
#title{{margin-top:6px;font-weight:900;letter-spacing:-.03em;line-height:1.06;opacity:0}}
#title b{{color:var(--brand)}}
.mark{{position:relative;display:inline-block}}
.mark i{{position:absolute;left:-4px;right:-4px;bottom:3px;height:12px;border-radius:4px;background:var(--brand);
        opacity:.35;transform:scaleX(0);transform-origin:left}}
.figwrap{{margin-top:4px}}
#fig{{font-size:120px;font-weight:900;line-height:.95;letter-spacing:-.03em;color:var(--brand);opacity:0;transform-origin:left bottom}}
#figsub{{font-size:22px;font-weight:600;color:var(--faint);margin-top:6px;opacity:0}}
#chip{{position:absolute;right:30px;top:24px;padding:10px 18px;border-radius:999px;font-size:18px;font-weight:800;
      letter-spacing:.10em;text-transform:uppercase;opacity:0;border:2px solid rgba(0,178,222,.6);background:rgba(0,178,222,.16)}}
#chip.ok{{background:var(--ok);color:#07140E;border-color:var(--ok)}}
#chip.red{{background:rgba(255,90,78,.16);border-color:rgba(255,90,78,.7)}}
.row{{position:relative;display:flex;align-items:center;gap:16px;min-height:60px;margin-top:11px;border:2px solid var(--rule);
     border-radius:18px;padding:8px 18px;opacity:0;font-size:30px;font-weight:600;line-height:1.2}}
.row .k{{flex:0 0 auto;font-size:27px;font-weight:900;color:var(--faint)}}
.row.bad .k{{color:var(--red)}} .row.why .k{{color:var(--brand)}} .row.ok .k{{color:var(--ok)}}
.row .glow{{position:absolute;inset:-2px;border-radius:18px;border:3px solid var(--brand);box-shadow:0 0 22px rgba(0,178,222,.5);opacity:0}}
.row.bad .glow{{border-color:var(--red);box-shadow:0 0 22px rgba(255,90,78,.45)}}
.row.ok .glow{{border-color:var(--ok);box-shadow:0 0 22px rgba(63,207,142,.45)}}
.stk{{position:relative;display:inline-block}}
.stk s{{position:absolute;left:-2px;top:52%;height:4px;width:0;background:var(--red);border-radius:2px}}
.bub{{max-width:86%;margin-top:12px;padding:14px 20px;border-radius:24px;font-size:29px;font-weight:600;line-height:1.22;opacity:0}}
.bub.left{{background:rgba(255,255,255,.10);border:2px solid var(--rule);border-bottom-left-radius:8px}}
.bub.right{{margin-left:auto;background:rgba(0,178,222,.20);border:2px solid rgba(0,178,222,.6);border-bottom-right-radius:8px}}
.bub .who{{display:block;font-size:16px;font-weight:800;letter-spacing:.12em;color:var(--faint);margin-bottom:4px}}
#banner{{position:absolute;left:24px;right:24px;bottom:18px;min-height:62px;display:flex;align-items:center;justify-content:center;
        border-radius:16px;padding:8px 16px;background:rgba(0,178,222,.16);border:2px solid rgba(0,178,222,.6);
        font-size:29px;font-weight:800;letter-spacing:-.01em;line-height:1.2;opacity:0;text-align:center}}
#banner b{{color:var(--brand)}}
</style>
</head>
<body>
  <div id="card">{chip_html}
    {kicker}
    {chr(10).join("    " + r for r in rows)}
    {ban_html}
  </div>
<script>{MOTION}
const DUR={dur};
function setT(t){{
  {chr(10).join("  " + j for j in js)}
}}
window.setT=setT; setT(0);
</script>
</body>
</html>
"""

def hook(c):
    lines = "\n".join(f'    <div class="ln">{H.escape(l)}</div>' for l in c["hook"])
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@800;900&display=swap">
<style>
/*
 * HOOK TEXT — generated by scripts/make_card.py. The promise, frame 0 through the end of the
 * intro. Style approved on ai-03 (owner's TikTok reference): white boxes, black heavy type,
 * block bottom at y 1440 — below the mouth, above the captions.
{chr(10).join(" * " + l for l in c.get("header", "").splitlines())}
 */
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:1080px;height:1920px;overflow:hidden;background:transparent}}
body{{font-family:"Inter","Helvetica Neue",Arial,sans-serif}}
#hook{{position:absolute;left:0;right:0;bottom:480px;display:flex;flex-direction:column;align-items:center;opacity:0}}
.ln{{background:#fff;color:#0E1216;font-weight:900;font-size:66px;letter-spacing:-.02em;line-height:1.12;
    padding:10px 30px;border-radius:18px;margin-top:-8px;text-align:center;white-space:nowrap}}
.ln:first-child{{margin-top:0}}
</style>
</head>
<body>
  <div id="hook">
{lines}
  </div>
<script>
const clamp=(v)=>Math.max(0,Math.min(1,v));
const out3=(u)=>1-Math.pow(1-clamp(u),3);
const DUR={c["dur"]};
function setT(t){{
  const i=out3(clamp(t/.25)), o=clamp((t-(DUR-.25))/.25);
  const h=document.getElementById("hook");
  h.style.opacity=(i*(1-o)).toFixed(4);
  h.style.transform=`scale(${{(0.92+0.08*i).toFixed(4)}})`;
}}
window.setT=setT; setT(0);
</script>
</body>
</html>
"""

for p in sys.argv[1:]:
    c = json.load(open(p))
    os.makedirs(c["dir"], exist_ok=True)
    open(os.path.join(c["dir"], "index.html"), "w").write(hook(c) if "hook" in c else card(c))
    print(f"  wrote {c['dir']}/index.html")

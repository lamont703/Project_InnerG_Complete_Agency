import { EXT_APPS_BUNDLE } from "@/lib/mcp/apps/vendor/ext-apps-bundle";

/**
 * The upload box: an MCP App rendered inside the Claude conversation when
 * upload_photo runs.
 *
 * BUILT ON THE OFFICIAL SDK, AFTER A HAND-ROLLED VERSION NEVER APPEARED.
 * Version one spoke the postMessage protocol directly from the spec. It passed
 * a simulated host, and in claude.ai it never showed: Claude fetched the view
 * on every call and no upload ever arrived (2026-09-28). The SDK's App class
 * answers pings, reports size the way hosts measure it, and is what Claude is
 * tested against, so the box now uses it — vendored inline, because the
 * sandbox's default CSP allows inline script only (scripts/vendor_mcp_ext_apps.js).
 *
 * IT REPORTS ON ITSELF. Each step — loaded, connected, result received,
 * upload started/finished/failed — is sent to /api/mcp-upload/<token>/event
 * and lands in agent_requests as "app/<step>", so the next failure says where
 * it stopped instead of leaving only an absence to reason from.
 *
 * WHY THE PHOTO GOES STRAIGHT TO SHEARQUERY: a tool call is a JSON-RPC body,
 * ours are capped at 32KB, and a phone photo is megabytes. The resource
 * declares our origin in csp.connectDomains; a host may still refuse it, so
 * any failure to reach us switches the box to the fallback link.
 *
 * Text from the host is set with textContent, never innerHTML.
 */

export const PHOTO_UPLOAD_URI = "ui://shearquery/photo-upload";
export const MCP_APP_MIME = "text/html;profile=mcp-app";

/** How long after connecting to wait for the tool result before saying so. */
const RESULT_WAIT_MS = 20_000;

export function photoUploadHtml(origin: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Add a photo</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    padding: 16px;
    font-family: var(--font-sans, system-ui, -apple-system, "Segoe UI", sans-serif);
    background: var(--color-background-primary, transparent);
    color: var(--color-text-primary, CanvasText);
    font-size: 14px; line-height: 1.45;
  }
  h1 { font-size: 15px; font-weight: 700; margin: 0 0 4px; }
  p { margin: 0; }
  .muted { color: var(--color-text-secondary, GrayText); font-size: 13px; }
  label.field { display: block; margin-top: 14px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; }
  select, .pick {
    width: 100%; margin-top: 6px; padding: 10px 12px; font: inherit; border-radius: 10px;
    border: 1px solid var(--color-border-primary, rgba(128,128,128,.4));
    background: var(--color-background-secondary, transparent); color: inherit;
  }
  .pick { display: flex; align-items: center; justify-content: center; min-height: 120px; cursor: pointer; text-align: center; border-style: dashed; }
  .pick img { max-width: 100%; max-height: 220px; border-radius: 8px; display: block; }
  input[type=file] { position: absolute; width: 1px; height: 1px; opacity: 0; }
  .guide { margin-top: 6px; }
  .row { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
  button {
    font: inherit; font-weight: 700; padding: 10px 16px; border-radius: 10px; cursor: pointer;
    border: 1px solid var(--color-border-primary, rgba(128,128,128,.4)); background: transparent; color: inherit;
  }
  button.primary { background: var(--color-text-primary, #111); color: var(--color-background-primary, #fff); border-color: transparent; }
  button:disabled { opacity: .5; cursor: default; }
  .msg { margin-top: 12px; font-size: 13px; overflow-wrap: anywhere; }
  .err { color: #c0392b; }
  .ok { color: #1e8449; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
  <h1>Add a photo to your Google listing</h1>
  <p class="muted">It is saved as a draft first. Nothing goes on Google until you approve it.</p>

  <label class="field" for="category">Where it goes</label>
  <select id="category"></select>
  <p class="muted guide" id="guide"></p>

  <label class="field" for="file">Photo</label>
  <label class="pick" id="pick" for="file"><span>Tap to choose a photo</span></label>
  <input type="file" id="file" accept="image/jpeg,image/png,image/webp" />

  <div class="row">
    <button class="primary" id="upload" disabled>Upload</button>
    <button id="fallback" hidden>Open the upload page instead</button>
  </div>
  <p class="msg" id="msg" role="status"></p>

<script>${EXT_APPS_BUNDLE}</script>
<script>
(function () {
  var ORIGIN = ${JSON.stringify(origin)};
  var CATEGORIES = [
    ["COVER", "Cover photo", "Your best shot of the shop itself."],
    ["EXTERIOR", "Outside", "The storefront as someone arriving would see it."],
    ["INTERIOR", "Inside", "The chairs, the waiting area, the room."],
    ["AT_WORK", "Work you've done", "Finished cuts and styles, good light, clean background."],
    ["TEAMS", "The team", "The people who'll be doing the work."],
    ["PROFILE", "Profile picture", "The small round image next to your name."],
    ["LOGO", "Logo", "Your logo on a plain background."]
  ];
  var MAX_EDGE = 1600;
  var uploadUrl = null, fallbackUrl = null, token = "pending", file = null, app = null, gotResult = false;
  var hostName = "", platform = "";

  var $ = function (id) { return document.getElementById(id); };
  var sel = $("category"), guide = $("guide"), msg = $("msg");

  // ── self-reporting: fetch first, an image request if fetch is refused ──
  function report(event, detail) {
    var d = String(detail || "").slice(0, 300);
    var url = ORIGIN + "/api/mcp-upload/" + encodeURIComponent(token) + "/event";
    try {
      fetch(url, { method: "POST", body: JSON.stringify({ event: event, detail: d, host: hostName, platform: platform }), keepalive: true })
        .catch(function () {
          try { new Image().src = url + "?e=" + encodeURIComponent(event) + "&d=" + encodeURIComponent(d) + "&h=" + encodeURIComponent(hostName) + "&p=" + encodeURIComponent(platform); } catch (e) {}
        });
    } catch (e) {}
  }
  window.addEventListener("error", function (e) { report("error", (e && e.message) || "script error"); });
  report("loaded", typeof window.McpExtApps);

  CATEGORIES.forEach(function (c) {
    var o = document.createElement("option"); o.value = c[0]; o.textContent = c[1]; sel.appendChild(o);
  });
  sel.value = "INTERIOR";
  function showGuide() {
    var c = CATEGORIES.filter(function (x) { return x[0] === sel.value; })[0];
    guide.textContent = c ? c[2] : "";
  }
  function setCategory(cat) {
    if (cat && CATEGORIES.some(function (c) { return c[0] === cat; })) { sel.value = cat; showGuide(); }
  }
  sel.addEventListener("change", showGuide); showGuide();

  function say(text, kind) { msg.textContent = text; msg.className = "msg " + (kind || ""); }
  function refresh() { $("upload").disabled = !(uploadUrl && file); }

  function applyTheme(ctx) {
    var vars = ctx && ctx.styles && ctx.styles.variables;
    if (!vars) return;
    Object.keys(vars).forEach(function (k) { if (vars[k]) document.documentElement.style.setProperty(k, vars[k]); });
  }

  function onResult(result) {
    gotResult = true;
    var s = (result && result.structuredContent) || {};
    if (result && result.isError || !s.uploadUrl) {
      report("no-result", "result without uploadUrl");
      say((result && result.content && result.content[0] && result.content[0].text) || "Uploading isn't available right now.", "err");
      return;
    }
    uploadUrl = s.uploadUrl; fallbackUrl = s.fallbackUrl || null;
    var m = /\\/api\\/mcp-upload\\/([^/?#]+)/.exec(uploadUrl); if (m) token = m[1];
    setCategory(s.category);
    $("fallback").hidden = !fallbackUrl;
    report("tool-result", "");
    refresh();
  }

  // ── picking and shrinking ──
  $("file").addEventListener("change", function () {
    file = (this.files && this.files[0]) || null;
    var pick = $("pick");
    pick.textContent = "";
    if (file) {
      // A data: URL, not blob: — the sandbox's default img-src allows data:.
      var reader = new FileReader();
      reader.onload = function () {
        var img = document.createElement("img");
        img.alt = "Selected photo"; img.src = String(reader.result);
        pick.textContent = ""; pick.appendChild(img);
      };
      reader.readAsDataURL(file);
      var t = document.createElement("span"); t.textContent = file.name; pick.appendChild(t);
    } else {
      var e = document.createElement("span"); e.textContent = "Tap to choose a photo"; pick.appendChild(e);
    }
    say("");
    refresh();
  });

  function shrink(f) {
    if (!/^image\\//.test(f.type) || f.size < 900000 || !window.createImageBitmap) return Promise.resolve(f);
    return createImageBitmap(f).then(function (bmp) {
      var scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
      var c = document.createElement("canvas");
      c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
      var ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise(function (r) { c.toBlob(r, "image/jpeg", 0.85); });
    }).then(function (blob) {
      return blob && blob.size < f.size ? new File([blob], f.name.replace(/\\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : f;
    }).catch(function () { return f; });
  }

  // ── upload ──
  $("upload").addEventListener("click", function () {
    if (!uploadUrl || !file) return;
    var btn = this; btn.disabled = true; say("Uploading…");
    report("upload-start", file.type + " " + file.size);
    var label = sel.options[sel.selectedIndex].textContent;
    shrink(file).then(function (f) {
      var body = new FormData(); body.append("file", f); body.append("category", sel.value);
      return fetch(uploadUrl, { method: "POST", body: body });
    }).then(function (res) {
      return res.json().then(function (j) { return { status: res.status, body: j }; });
    }).then(function (r) {
      if (!r.body || !r.body.ok) {
        btn.disabled = false;
        report("upload-failed", r.status + " " + ((r.body && r.body.message) || ""));
        say((r.body && r.body.message) || "The upload failed.", "err");
        return;
      }
      report("upload-ok", r.body.changeId);
      say("Uploaded. It's a draft — Claude will show it to you before anything goes on Google.", "ok");
      $("file").disabled = true; sel.disabled = true;
      var text = "I uploaded a photo for \\"" + label + "\\" on my Google listing (draft " + r.body.changeId + "). " +
        (r.body.canPublish ? "Show me the draft and publish it when I say so." : "Show me the draft.");
      if (!app) return;
      app.sendMessage({ role: "user", content: [{ type: "text", text: text }] }).then(function (res) {
        // The host can decline without throwing; the result says so.
        if (res && res.isError) throw new Error("host declined the message");
        report("message-sent", "");
      }).catch(function (err) {
        report("message-failed", err && err.message);
        say("Uploaded as a draft. Tell Claude \\"I uploaded the photo\\" to review and publish it.", "ok");
      });
    }).catch(function (err) {
      btn.disabled = false;
      report("network-blocked", err && err.message);
      say("This box couldn't reach ShearQuery from here. Use the upload page instead — it does the same thing.", "err");
      $("fallback").hidden = !fallbackUrl;
    });
  });

  $("fallback").addEventListener("click", function () {
    if (!fallbackUrl) return;
    var open = app ? app.openLink({ url: fallbackUrl }) : Promise.reject(new Error("not connected"));
    open.catch(function () { say("Open this link to upload: " + fallbackUrl); });
  });

  // ── connect through the SDK ──
  if (!window.McpExtApps || !window.McpExtApps.App) {
    report("error", "SDK missing");
    say("This box couldn't start. Use the link in Claude's reply instead.", "err");
    return;
  }
  app = new window.McpExtApps.App(
    { name: "ShearQuery photo upload", version: "2.0.0" },
    { availableDisplayModes: ["inline"] },
    { autoResize: true }
  );
  // Registered BEFORE connect: the host may send these the moment the handshake ends.
  app.ontoolinput = function (p) { setCategory(p && p.arguments && p.arguments.category); };
  app.ontoolresult = onResult;
  app.onhostcontextchanged = applyTheme;
  app.onteardown = function () { return {}; };

  app.connect().then(function () {
    var ctx = app.getHostContext && app.getHostContext();
    hostName = (app.getHostVersion && app.getHostVersion() && app.getHostVersion().name) || "";
    platform = (ctx && ctx.platform) || "";
    applyTheme(ctx);
    report("connected", "");
    setTimeout(function () {
      if (!gotResult) {
        report("no-result", "none after ${RESULT_WAIT_MS}ms");
        say("Claude didn't pass the upload details to this box. Use the link in Claude's reply instead.", "err");
      }
    }, ${RESULT_WAIT_MS});
  }).catch(function (err) {
    report("error", "connect failed: " + (err && err.message));
    say("This box couldn't connect to Claude. Use the link in Claude's reply instead.", "err");
  });
})();
</script>
</body>
</html>`;
}

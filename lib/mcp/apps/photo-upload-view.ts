/**
 * The upload box: an MCP App rendered inside the Claude conversation when
 * upload_photo runs.
 *
 * Protocol: MCP Apps 2026-01-26 (github.com/modelcontextprotocol/ext-apps,
 * specification/2026-01-26/apps.mdx, read 2026-09-29). The view talks to the
 * host over postMessage JSON-RPC:
 *
 *   view → host   ui/initialize, then ui/notifications/initialized
 *   host → view   ui/notifications/tool-result  — carries structuredContent
 *                 with the one-time upload URL
 *   view → host   ui/message after the upload, so Claude carries on and shows
 *                 the draft for approval; ui/open-link for the fallback page
 *
 * WHY THE PHOTO GOES STRAIGHT TO SHEARQUERY and not through a tool call: a
 * tool call is a JSON-RPC body, ours are capped at 32KB, and a phone photo is
 * megabytes. The resource declares our origin in csp.connectDomains so the
 * sandbox allows the POST. A host may still refuse it ("MAY further
 * restrict"), so any failure to reach us switches the box to the fallback
 * link instead of leaving the owner stuck.
 *
 * Self-contained: inline script and style only, no external loads, which is
 * what the spec's restrictive default CSP permits. Text from the host is set
 * with textContent, never innerHTML.
 */

export const PHOTO_UPLOAD_URI = "ui://shearquery/photo-upload";
export const MCP_APP_MIME = "text/html;profile=mcp-app";

export function photoUploadHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Add a photo</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 16px;
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
  input[type=file] { display: none; }
  .guide { margin-top: 6px; }
  .row { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
  button {
    font: inherit; font-weight: 700; padding: 10px 16px; border-radius: 10px; cursor: pointer;
    border: 1px solid var(--color-border-primary, rgba(128,128,128,.4)); background: transparent; color: inherit;
  }
  button.primary { background: var(--color-text-primary, #111); color: var(--color-background-primary, #fff); border-color: transparent; }
  button:disabled { opacity: .5; cursor: default; }
  .msg { margin-top: 12px; font-size: 13px; }
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
  <label class="pick" id="pick" for="file"><span id="pickText">Tap to choose a photo</span></label>
  <input type="file" id="file" accept="image/jpeg,image/png,image/webp" />

  <div class="row">
    <button class="primary" id="upload" disabled>Upload</button>
    <button id="fallback" hidden>Open the upload page instead</button>
  </div>
  <p class="msg" id="msg" role="status"></p>

<script>
(function () {
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
  var uploadUrl = null, fallbackUrl = null, file = null, nextId = 1, pending = {};

  var $ = function (id) { return document.getElementById(id); };
  var sel = $("category"), guide = $("guide"), msg = $("msg");

  CATEGORIES.forEach(function (c) {
    var o = document.createElement("option"); o.value = c[0]; o.textContent = c[1]; sel.appendChild(o);
  });
  sel.value = "INTERIOR";
  function showGuide() {
    var c = CATEGORIES.filter(function (x) { return x[0] === sel.value; })[0];
    guide.textContent = c ? c[2] : "";
  }
  sel.addEventListener("change", showGuide); showGuide();

  function say(text, kind) { msg.textContent = text; msg.className = "msg " + (kind || ""); reportSize(); }

  // ── JSON-RPC over postMessage ──
  function request(method, params) {
    var id = nextId++;
    return new Promise(function (resolve, reject) {
      pending[id] = { resolve: resolve, reject: reject };
      window.parent.postMessage({ jsonrpc: "2.0", id: id, method: method, params: params || {} }, "*");
    });
  }
  function notify(method, params) {
    window.parent.postMessage({ jsonrpc: "2.0", method: method, params: params || {} }, "*");
  }
  window.addEventListener("message", function (e) {
    if (e.source !== window.parent) return;
    var m = e.data;
    if (!m || m.jsonrpc !== "2.0") return;
    if (m.id != null && pending[m.id] && !m.method) {
      var p = pending[m.id]; delete pending[m.id];
      if (m.error) p.reject(new Error(m.error.message || "Request failed")); else p.resolve(m.result);
      return;
    }
    if (m.method === "ui/notifications/tool-result") onResult(m.params || {});
    else if (m.method === "ui/notifications/tool-input") {
      var cat = m.params && m.params.arguments && m.params.arguments.category;
      if (cat && CATEGORIES.some(function (c) { return c[0] === cat; })) { sel.value = cat; showGuide(); }
    } else if (m.method === "ui/notifications/host-context-changed") applyTheme(m.params);
    else if (m.method === "ui/resource-teardown" && m.id != null) {
      window.parent.postMessage({ jsonrpc: "2.0", id: m.id, result: {} }, "*");
    }
  });

  function applyTheme(ctx) {
    var vars = ctx && ctx.styles && ctx.styles.variables;
    if (!vars) return;
    Object.keys(vars).forEach(function (k) { if (vars[k]) document.documentElement.style.setProperty(k, vars[k]); });
  }

  function onResult(result) {
    var s = result.structuredContent || {};
    if (result.isError || !s.uploadUrl) {
      say((result.content && result.content[0] && result.content[0].text) || "Uploading isn't available right now.", "err");
      return;
    }
    uploadUrl = s.uploadUrl; fallbackUrl = s.fallbackUrl || null;
    if (s.category && CATEGORIES.some(function (c) { return c[0] === s.category; })) { sel.value = s.category; showGuide(); }
    $("fallback").hidden = !fallbackUrl;
    refresh();
  }

  function reportSize() {
    var h = Math.ceil(document.documentElement.getBoundingClientRect().height);
    notify("ui/notifications/size-changed", { width: document.documentElement.clientWidth, height: h });
  }
  if (window.ResizeObserver) new ResizeObserver(reportSize).observe(document.body);

  function refresh() { $("upload").disabled = !(uploadUrl && file); }

  // ── picking and shrinking ──
  $("file").addEventListener("change", function () {
    file = this.files && this.files[0] || null;
    var pick = $("pick");
    pick.textContent = "";
    if (file) {
      var img = document.createElement("img");
      img.alt = "Selected photo";
      img.src = URL.createObjectURL(file);
      img.onload = reportSize;
      pick.appendChild(img);
    } else {
      var t = document.createElement("span"); t.textContent = "Tap to choose a photo"; pick.appendChild(t);
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
    var label = sel.options[sel.selectedIndex].textContent;
    shrink(file).then(function (f) {
      var body = new FormData(); body.append("file", f); body.append("category", sel.value);
      return fetch(uploadUrl, { method: "POST", body: body });
    }).then(function (res) {
      return res.json().then(function (j) { return { status: res.status, body: j }; });
    }).then(function (r) {
      if (!r.body || !r.body.ok) { btn.disabled = false; say((r.body && r.body.message) || "The upload failed.", "err"); return; }
      say("Uploaded. It's a draft — Claude will show it to you before anything goes on Google.", "ok");
      $("file").disabled = true; sel.disabled = true;
      var text = "I uploaded a photo for \\"" + label + "\\" on my Google listing (draft " + r.body.changeId + "). " +
        (r.body.canPublish ? "Show me the draft and publish it when I say so." : "Show me the draft.");
      request("ui/message", { role: "user", content: { type: "text", text: text } }).catch(function () {
        request("ui/update-model-context", { content: [{ type: "text", text: text }] }).catch(function () {});
        say("Uploaded as a draft. Tell Claude \\"I uploaded the photo\\" to review and publish it.", "ok");
      });
    }).catch(function () {
      // Most likely the host blocked the request to our domain. The link does the same job.
      btn.disabled = false;
      say("This box couldn't reach ShearQuery from here. Use the upload page instead — it does the same thing.", "err");
      $("fallback").hidden = !fallbackUrl;
    });
  });

  $("fallback").addEventListener("click", function () {
    if (!fallbackUrl) return;
    request("ui/open-link", { url: fallbackUrl }).catch(function () {
      say("Open this link to upload: " + fallbackUrl);
    });
  });

  // ── handshake ──
  request("ui/initialize", {
    appInfo: { name: "ShearQuery photo upload", version: "1.0.0" },
    appCapabilities: { availableDisplayModes: ["inline"] },
    protocolVersion: "2026-01-26"
  }).then(function (r) {
    applyTheme(r && r.hostContext);
    notify("ui/notifications/initialized", {});
    reportSize();
  }).catch(function () { notify("ui/notifications/initialized", {}); });
})();
</script>
</body>
</html>`;
}

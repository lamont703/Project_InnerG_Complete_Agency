/*
 * WHAT A FORMAT NEEDS IN THE MAILBOX BEFORE IT CAN RENDER.
 *
 * This lived only in the worker's blockers(), which meant it ran AFTER the
 * proposal had been sent and a code minted. The first Lookbook request proved
 * why that is too late: no grid was attached, so the model invented six style
 * names and the proposal told the sender it would be "rendered from the grid
 * image you attached". Nothing had been attached. The worker would have caught
 * it eventually, but only once a code came back, and by then the fabricated
 * style names had already been read as a real plan.
 *
 * So the check runs at PROPOSE time as well, and both callers read it from
 * here rather than keeping two copies that can drift. Plain JS on purpose:
 * stages.ts imports it and the worker requires it, the same way both already
 * share lib/newsdesk-config.js.
 *
 * This is only about MATERIAL — a file that has to exist. Whether the b-roll
 * library can serve a tag set is a live question against the database and
 * stays in the worker.
 */
function missingMaterial(request, attachments) {
  const atts = Array.isArray(attachments) ? attachments : [];
  const has = (re) => atts.some((a) => re.test(String((a && a.mimeType) || "")));
  const hasImage = has(/^image\//i);
  /*
   * A Drive link counts as having the video. The worker resolves it by fileId
   * at claim time, so refusing here would reject the documented way to send a
   * clip too large to attach.
   */
  const hasVideo = has(/^video\//i) || atts.some((a) => a && a.driveFileId);
  const out = [];

  if (request.kind === "grid") {
    if (!hasImage) out.push("a Lookbook needs a 2x3 grid image attached, and none was");
    return out;
  }
  if (request.kind === "card") return out;   // a figure needs nothing but its fields

  const segments = (request.spec && request.spec.segments) || [];
  if (segments.some((sg) => sg.mode !== "avatar" && ["headline", "chart"].includes(sg.visual)) && !hasImage) {
    out.push("the spec shows the article on screen, so it needs the screenshot attached");
  }
  if (segments.some((sg) => sg.mode === "clip") && !hasVideo) {
    out.push("the spec cuts to a clip, so it needs the video attached or a Drive link to it");
  }
  return out;
}

module.exports = { missingMaterial };

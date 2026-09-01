/**
 * Choosing a bitrate that FITS, instead of one that used to.
 *
 * THE BUG THIS EXISTS TO PREVENT, and it is an expensive one. render_queued.js
 * compressed every short at a fixed `-maxrate 1100k`, chosen when the only
 * avatar output was a static talking head on a still background — which lands
 * around 1.3MB and clears the bucket's 5MB ceiling with room to spare.
 *
 * Then the avatar path started producing EDITED video: b-roll cutaways, whip
 * transitions, a music bed. Far more motion, so the same settings produce
 * 6.02MB — and the upload is refused AFTER HeyGen has been paid. The video
 * exists, it cost $1.16, and it has nowhere to go.
 *
 * A FIXED BITRATE IS A GUESS ABOUT CONTENT. A budget is not: the ceiling and
 * the duration are both known before encoding starts, so the bitrate that fits
 * can simply be calculated.
 */

/**
 * The video bitrate that lands a clip of `seconds` under `limitMB`.
 *
 * HEADROOM IS NOT PADDING. x264 tracks an average, not a maximum: a busy
 * passage overshoots and the container adds its own overhead, so aiming at
 * exactly the limit lands over it often enough to matter. 8% back is the
 * difference between "usually fits" and "fits".
 *
 * @param {{seconds:number, limitMB?:number, audioKbps?:number, headroom?:number}} o
 * @returns {number} kbps for video
 */
function fitBitrate(o) {
  const seconds = Number(o.seconds);
  if (!(seconds > 0)) throw new Error("fitBitrate needs a positive duration");
  const limitMB = o.limitMB ?? 5;
  const audioKbps = o.audioKbps ?? 96;
  const headroom = o.headroom ?? 0.92;

  const budgetKbits = limitMB * headroom * 1024 * 8;
  const video = Math.floor(budgetKbits / seconds - audioKbps);

  /*
   * A FLOOR, BECAUSE SOME CLIPS CANNOT FIT AND SHOULD SAY SO. A four-minute
   * video in a 5MB bucket needs about 60kbps, which is not a video any more.
   * Returning something unwatchable silently is worse than the caller finding
   * out the clip is too long for where it is going.
   */
  return Math.max(300, video);
}

/** True when even the floor bitrate cannot fit — the caller must not pretend. */
function fitsAtAll(o) {
  const seconds = Number(o.seconds);
  const limitMB = o.limitMB ?? 5;
  const audioKbps = o.audioKbps ?? 96;
  const headroom = o.headroom ?? 0.92;
  return (limitMB * headroom * 1024 * 8) / seconds - audioKbps >= 300;
}

module.exports = { fitBitrate, fitsAtAll };

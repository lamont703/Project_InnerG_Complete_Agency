/**
 * Transition sounds, SYNTHESIZED rather than licensed.
 *
 * WHY MAKE THEM INSTEAD OF FETCHING THEM. A whoosh is filtered noise with an
 * envelope — it is one of the few sounds that is genuinely cheaper to generate
 * than to source. And sourcing carries the one risk this pipeline has otherwise
 * avoided completely: Freesound licences vary PER SOUND, CC-BY-NC forbids
 * commercial use outright, and a single NC clip mixed into a monetised video is
 * the whole exposure. Pixabay has sound effects on the site but does not expose
 * them through the API at all, so there is no clean automated route there.
 *
 * Generated audio has no licence, no attribution, no Content ID surface and no
 * provenance to track. For transition stings that is the entire job.
 *
 * WHAT IT WILL NOT BEAT is a recorded whoosh from a real library. This is a
 * serviceable synthetic, not a designed sound. If these read as cheap, the
 * upgrade is a hand-picked CC0 set, not a better filter graph.
 */

const n = (v) => Number(v).toFixed(3);

/**
 * The lavfi source for one transition sound.
 *
 * whoosh  — pink noise, band-limited, sharp in and slow out. Air moving.
 * riser   — the same but reversed envelope, for arriving ON a beat.
 * thud    — a low sine with a fast decay, under the whoosh, for weight.
 *
 * @param {{type?:string, seconds?:number, gain?:number}} [o]
 * @returns {string} an ffmpeg lavfi input description
 */
function source(o = {}) {
  const type = o.type ?? "whoosh";
  const d = o.seconds ?? 0.45;
  if (type === "thud") return `sine=frequency=90:duration=${n(d)}:sample_rate=48000`;
  return `anoisesrc=d=${n(d)}:c=pink:a=0.9:r=48000`;
}

/**
 * The filter chain that shapes that source into the sound, and places it.
 *
 * `adelay` NEEDS ONE VALUE PER CHANNEL. Given a single value on a stereo
 * stream it delays only the left channel, and the result is a sound that
 * arrives twice — once in each ear, milliseconds apart. It reads as a broken
 * encode, not as a delay. Hence the doubled argument.
 *
 * @param {number} i Index of the lavfi input.
 * @param {{type?:string, seconds?:number, gain?:number, at:number}} s
 * @returns {{chain:string, label:string}}
 */
function shape(i, s) {
  const type = s.type ?? "whoosh";
  const d = s.seconds ?? 0.45;
  /*
   * 0.55 WAS INAUDIBLE AND MEASURABLY SO. It peaked at -17.6dB against a voice
   * peaking at -3.2dB — roughly 15dB under the thing it plays beneath, which is
   * not "subtle", it is gone. 2.2 lands near -7dB: clearly present, still well
   * under the words.
   *
   * DO NOT SIMPLY RAISE IT FURTHER. Measured, gain 3.5 peaks at -1.6dB and gain
   * 4.5 peaks at -3.7dB — QUIETER. That is not headroom, it is the waveform
   * clipping, and the number going down is the only warning you get.
   */
  const gain = s.gain ?? 2.2;
  const ms = Math.max(0, Math.round(s.at * 1000));
  const label = `sfx${i}`;

  let f;
  if (type === "thud") {
    f = `afade=t=out:st=0:d=${n(d)}:curve=exp,lowpass=f=200`;
  } else if (type === "riser") {
    // Slow in, hard stop: it should land exactly on the cut, not wash over it.
    f = `highpass=f=400,lowpass=f=8000,afade=t=in:st=0:d=${n(d * 0.85)}:curve=exp,` +
        `afade=t=out:st=${n(d * 0.85)}:d=${n(d * 0.15)}`;
  } else {
    f = `highpass=f=300,lowpass=f=7000,` +
        `afade=t=in:st=0:d=${n(d * 0.4)}:curve=exp,` +
        `afade=t=out:st=${n(d * 0.4)}:d=${n(d * 0.6)}:curve=exp`;
  }

  return {
    chain: `[${i}:a]${f},volume=${n(gain)},aformat=channel_layouts=stereo,adelay=${ms}|${ms}[${label}]`,
    label,
  };
}

/**
 * Mix the stings under the voice.
 *
 * normalize=0 IS NOT OPTIONAL. amix divides by the number of inputs by default,
 * so adding four transition sounds quietly drops the speaker by up to 12dB. The
 * voice is the content; the whooshes are seasoning, and the default does the
 * exact opposite of that.
 */
function mix(labels) {
  if (!labels.length) return null;
  const inputs = ["[0:a]", ...labels.map((l) => `[${l}]`)].join("");
  /*
   * LIMITED AFTER MIXING, because normalize=0 means the sum can exceed full
   * scale. The voice peaks at -3.2dB and a sting near -7dB; when one lands on a
   * stressed word they add, and the result clips — as a crackle on exactly the
   * transition the sting was meant to sell.
   */
  return `${inputs}amix=inputs=${labels.length + 1}:duration=first:normalize=0,` +
         `alimiter=limit=0.95:level=disabled[aout]`;
}

module.exports = { source, shape, mix };

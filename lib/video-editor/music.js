/**
 * A music bed that gets out of the way of the voice.
 *
 * DUCKING IS THE WHOLE JOB. Music laid under speech at a fixed level is either
 * audible and fighting the words, or quiet enough not to fight and therefore
 * pointless. sidechaincompress pushes the music down whenever the voice is
 * present and lets it back up in the gaps, which is why a bed can be loud
 * enough to feel in the pauses without ever competing with a sentence.
 *
 * THE ARGUMENT ORDER IS THE TRAP. sidechaincompress takes [main][sidechain]:
 * the FIRST input is the one being compressed, the second is the trigger. Wired
 * the obvious way round — voice first, because the voice matters more — it
 * ducks the VOICE under the music. It does not error. It sounds like a bad mix
 * rather than a wiring mistake, which is how it survives a listen.
 *
 * THE VOICE IS NEEDED TWICE, so it is split. Using [0:a] as both the sidechain
 * trigger and a mix input without asplit consumes the stream on first use and
 * ffmpeg fails with a filtergraph error that names neither problem.
 */

const n = (v) => Number(v).toFixed(3);

/**
 * @param {{duration:number, gain?:number, fadeIn?:number, fadeOut?:number,
 *          threshold?:number, ratio?:number, attack?:number, release?:number,
 *          musicInput?:number}} o
 * @returns {{graph:string, label:string}}
 */
function bedGraph(o) {
  const dur = o.duration;
  const gain = o.gain ?? 0.35;
  const fadeIn = o.fadeIn ?? 1.5;
  const fadeOut = o.fadeOut ?? 2.5;
  const mi = o.musicInput ?? 1;

  const parts = [
    // The voice, twice: once to trigger the ducking, once to be heard.
    `[0:a]asplit=2[voice_key][voice_mix]`,
    /*
     * aloop BEFORE atrim, so a track shorter than the video still fills it.
     * Trimming first would just end the bed early and leave silence under the
     * last third, which reads as the music "stopping" rather than as a choice.
     */
    `[${mi}:a]aloop=loop=-1:size=2e9,atrim=0:${n(dur)},asetpts=N/SR/TB,` +
      `afade=t=in:st=0:d=${n(fadeIn)},afade=t=out:st=${n(Math.max(0, dur - fadeOut))}:d=${n(fadeOut)},` +
      `volume=${n(gain)}[bed]`,
    // [main=bed][sidechain=voice]: the BED is what gets pushed down.
    `[bed][voice_key]sidechaincompress=threshold=${n(o.threshold ?? 0.03)}:` +
      `ratio=${n(o.ratio ?? 12)}:attack=${n(o.attack ?? 8)}:release=${n(o.release ?? 350)}[ducked]`,
    // normalize=0, then limit: same reasoning as the transition stings.
    `[voice_mix][ducked]amix=inputs=2:duration=first:normalize=0,` +
      `alimiter=limit=0.95:level=disabled[aout]`,
  ];
  return { graph: parts.join(";"), label: "aout" };
}

module.exports = { bedGraph };

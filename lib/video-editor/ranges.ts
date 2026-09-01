/**
 * The typed surface of the cut engine. The implementation is in
 * ranges-core.js, which is plain JavaScript so the CommonJS scripts can share
 * it rather than keeping their own copies — see that file for the reasoning.
 *
 * Nothing here has behaviour. ranges.test.ts exercises this module, so it is
 * still the real implementation under test.
 */
import core from "./ranges-core.js";

export interface Range {
  start: number;
  end: number;
}

export const EPSILON: number = core.EPSILON;
export const normaliseCuts: (cuts: Range[], duration: number) => Range[] = core.normaliseCuts;
export const keepRanges: (cuts: Range[], duration: number) => Range[] = core.keepRanges;
export const totalDuration: (ranges: Range[]) => number = core.totalDuration;
export const selectFilter: (keep: Range[]) => { video: string; audio: string } | null = core.selectFilter;
export const formatTime: (seconds: number) => string = core.formatTime;
export const parseTime: (input: string) => number | null = core.parseTime;

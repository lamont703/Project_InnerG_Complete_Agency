/**
 * PSI Candidate Information Bulletins — which one belongs to which licence.
 *
 * WHY THIS FILE EXISTS. "psi candidate information bulletin" is 210/mo in the
 * US and 50/mo in Texas — the highest-volume artifact term in the whole set,
 * and it is PSI's own name for the document. Meanwhile nothing on any board
 * site tells a candidate which bulletin is theirs or where it lives.
 *
 * THE IDS ARE OPAQUE AND THAT IS THE WHOLE POINT. The bulletins sit at
 *
 *     https://test-takers.psiexams.com/api/content/bulletin/{id}
 *
 * with nothing in the URL naming the exam. Nobody stumbles into this: the
 * board sites do not reference the IDs, the portal's served HTML contains no
 * PDF links, and — the detail that makes guessing actively dangerous — every
 * unknown /api/ path returns the JavaScript app's shell with **HTTP 200**, so
 * a wrong guess looks exactly like a hit. They were found by walking the
 * board's PSI client code:
 *
 *     /api/account/{client}/test        -> tests, each with a globalTestId
 *     /api/account/{client}/test/{code} -> mentions bulletin/{n}
 *     /api/content/bulletin/{n}         -> the PDF
 *
 * COPYRIGHT. PSI is a private vendor and these bulletins are its copyrighted
 * documents. This file catalogues IDENTIFIERS and factual exam parameters —
 * which bulletin, how many questions, how long — and links to the original.
 * Nothing here reproduces a bulletin's contents, and nothing built on it
 * should.
 *
 * VERIFY BEFORE RELYING. Verified means the ID returned a PDF and the title
 * was read from page 1. These are numbers on a vendor's content API, not
 * stable document names; nothing guarantees 713 stays the manicurist
 * bulletin. Re-check before citing.
 */

export interface PsiBulletin {
  /** The opaque id in /api/content/bulletin/{id}. */
  id: number;
  /** Bulletin title as read from page 1 of the PDF. */
  title: string;
  /** Licence this bulletin serves, in the board's own wording. */
  licence: string;
  /** Scored written questions, where we hold the figure. Null = not held. */
  writtenItems: number | null;
  /** Written exam minutes, where held. */
  writtenMinutes: number | null;
  /** Practical minutes. Null where the state has no practical exam. */
  practicalMinutes: number | null;
  notes?: string;
}

export const PSI_BULLETIN_URL = (id: number) =>
  `https://test-takers.psiexams.com/api/content/bulletin/${id}`;

/**
 * TEXAS — eight separate bulletins, one per licence. Verified 2026-08-05.
 *
 * Written/practical figures come from lib/texas-specialty-exams.ts, which was
 * transcribed from the January 2026 bulletins. We hold structures for the four
 * SPECIALTY exams only; barber and cosmetology operator are recorded as null
 * rather than guessed, because TDLR publishes school pass rates for those two
 * and the question counts were never transcribed.
 */
export const TX_BULLETINS: PsiBulletin[] = [
  { id: 701, title: "Barber License Examination", licence: "Class A Barber", writtenItems: null, writtenMinutes: null, practicalMinutes: null },
  { id: 703, title: "Cosmetology Operator License Examination", licence: "Cosmetology Operator", writtenItems: null, writtenMinutes: null, practicalMinutes: null },
  { id: 705, title: "Barber Technician License Examination", licence: "Barber Technician", writtenItems: null, writtenMinutes: null, practicalMinutes: null },
  { id: 707, title: "Barber Manicurist", licence: "Barber Manicurist", writtenItems: null, writtenMinutes: null, practicalMinutes: null },
  { id: 709, title: "Shampoo License", licence: "Shampoo Specialist", writtenItems: null, writtenMinutes: null, practicalMinutes: null },
  { id: 711, title: "Hair Weaving License Examination", licence: "Hair Weaving Specialist", writtenItems: 40, writtenMinutes: 55, practicalMinutes: 76 },
  { id: 713, title: "Manicurist License Examination", licence: "Manicurist", writtenItems: 60, writtenMinutes: 90, practicalMinutes: 81 },
  { id: 715, title: "Esthetician License Examination", licence: "Esthetician", writtenItems: 75, writtenMinutes: 105, practicalMinutes: 101 },
];

/**
 * CALIFORNIA — six IDs, but only TWO documents. Verified 2026-08-09.
 *
 * 916, 930, 940, 941 and 942 are the same file byte for byte: one combined
 * 26-page bulletin covering five licences. Only 11070, the hairstylist theory
 * bulletin, is a distinct document. Texas issues eight bulletins for eight
 * licences; California issues two for six. Do not assume one bulletin per
 * licence, and do not assume an ID range — Texas sits at 701-715, California
 * at 916-942 with an outlier at 11070.
 *
 * No practical anywhere: California abolished it for every licence type on
 * 1 January 2022, so practicalMinutes is null throughout and that is a fact
 * about the state, not a gap in our data.
 */
export const CA_BULLETINS: PsiBulletin[] = [
  { id: 916, title: "CA Barber Examination", licence: "Barber", writtenItems: 85, writtenMinutes: 120, practicalMinutes: null, notes: "combined bulletin" },
  { id: 930, title: "CA Cosmetologist Examination", licence: "Cosmetologist", writtenItems: 100, writtenMinutes: 120, practicalMinutes: null, notes: "combined bulletin" },
  { id: 941, title: "CA Esthetician Examination", licence: "Esthetician", writtenItems: 75, writtenMinutes: 90, practicalMinutes: null, notes: "combined bulletin" },
  { id: 942, title: "CA Manicurist Examination", licence: "Manicurist", writtenItems: 60, writtenMinutes: 90, practicalMinutes: null, notes: "combined bulletin" },
  { id: 940, title: "CA Electrology Examination", licence: "Electrologist", writtenItems: 50, writtenMinutes: 90, practicalMinutes: null, notes: "combined bulletin" },
  { id: 11070, title: "CA Hairstylist Theory Examination", licence: "Hairstylist", writtenItems: null, writtenMinutes: null, practicalMinutes: null, notes: "the only distinct CA document" },
];

/** The five IDs that resolve to one identical file. */
export const CA_COMBINED_IDS = [916, 930, 940, 941, 942] as const;

/**
 * Boards whose PSI portal we know but whose bulletin IDs are NOT yet mapped.
 * Listed so the gap is visible rather than looking like an absence of states.
 */
export const UNMAPPED_PORTALS = [
  { state: "Maryland", portal: "https://test-takers.psiexams.com/mdcos", note: "Practical exams still required — six of them." },
] as const;

export const BULLETINS_CHECKED = { TX: "2026-08-05", CA: "2026-08-09" } as const;

/**
 * Hashtags per post concept.
 *
 * WHY A MODULE AND NOT A STRING IN EACH CAPTION. Hashtags are the only
 * discovery surface a new account has - nobody is searching for us by name, so
 * the tags are how a post reaches anyone who does not already follow. Writing
 * them per post means they drift, get forgotten (all fourteen posts in the
 * queue had none), and can never be evaluated as a set.
 *
 * THREE BANDS, DELIBERATELY MIXED. A broad tag like #barber has enormous reach
 * and a post disappears from it in seconds. A narrow one like #barberschool has
 * a fraction of the volume and a post can sit near the top for hours. Local
 * tags reach the only people who can actually walk into one of these shops.
 * Using only broad tags is the common mistake and it is the same as using none.
 *
 * FEWER THAN THE LIMIT. Instagram permits 30. Filling all 30 reads as
 * desperation to a human and stuffs unrelated audiences into the reach, which
 * hurts the engagement rate that decides whether the post travels at all.
 * These sets sit around 12-16.
 *
 * NO CLAIMS ABOUT WHICH TAGS "WORK". Nobody outside Meta knows the ranking, and
 * anyone who says otherwise is guessing. These are chosen for topical honesty -
 * a post about barber school pass rates belongs in #barberschool - which is the
 * only defensible basis and also the one least likely to be penalised.
 */

/** Reaches people who can physically visit a shop we list. */
const TEXAS = ["#texasbarber", "#houstonbarber", "#dallasbarber", "#austinbarber", "#satxbarber"];

/** The trade itself — broad, high volume, brief exposure. */
const TRADE = ["#barber", "#barbershop", "#barberlife", "#barbersinctv"];

const BY_CONCEPT: Record<string, string[]> = {
  /* Exam and licensing data. The audience is students and schools. */
  "state-average": [
    "#barberschool", "#barbercollege", "#cosmetologyschool", "#barberstudent",
    "#cosmetologystudent", "#futurebarber", "#stateboardexam", "#barberapprentice",
    "#barbereducation", ...TRADE.slice(0, 2), ...TEXAS.slice(0, 3),
  ],
  stat: [
    "#barberschool", "#barberstudent", "#stateboardexam", "#cosmetologyschool",
    "#futurebarber", "#barbereducation", "#barberapprentice", "#cosmetologystudent",
    ...TRADE.slice(0, 2), ...TEXAS.slice(0, 3),
  ],
  "kit-list": [
    "#stateboardexam", "#barberschool", "#barberstudent", "#cosmetologystudent",
    "#barberkit", "#futurebarber", "#barbereducation", "#practicalexam",
    ...TRADE.slice(0, 2), ...TEXAS.slice(0, 3),
  ],
  deadline: [
    "#barberlicense", "#cosmetologylicense", "#licenserenewal", "#tdlr",
    "#barberschool", "#cosmetologist", ...TRADE.slice(0, 3), ...TEXAS.slice(0, 3),
  ],
  "school-spotlight": [
    "#barberschool", "#barbercollege", "#barberstudent", "#futurebarber",
    "#barbereducation", "#stateboardexam", ...TRADE.slice(0, 2), ...TEXAS.slice(0, 4),
  ],

  /* Shop round-ups. The audience is customers looking for a chair. */
  "city-roundup": [
    "#fade", "#taperfade", "#haircut", "#menshaircut", "#barbershopconnect",
    ...TRADE, ...TEXAS,
  ],

  /* Style reference. The widest audience, and the one that comments. */
  hairstyles: [
    "#haircut", "#haircutideas", "#menshaircut", "#menshair", "#fade", "#taperfade",
    "#360waves", "#burstfade", "#twists", "#shapeup", "#lineup", "#freshcut",
    ...TRADE.slice(0, 3), ...TEXAS.slice(0, 2),
  ],
};

const FALLBACK = [...TRADE, ...TEXAS.slice(0, 2), "#haircut", "#freshcut"];

/** The tag set for a concept, deduplicated and capped. */
export function hashtagsFor(concept: string | null | undefined, max = 16): string[] {
  const tags = BY_CONCEPT[String(concept || "")] || FALLBACK;
  return [...new Set(tags)].slice(0, max);
}

/**
 * Tags appended to a caption, separated by blank lines.
 *
 * The gap matters: Instagram truncates a caption after a couple of lines, so
 * pushing the tags well below the fold keeps the readable part readable while
 * the tags still count.
 */
export function captionWithHashtags(caption: string, concept: string | null | undefined): string {
  const existing = (caption.match(/#\w+/g) || []).map((t) => t.toLowerCase());
  const tags = hashtagsFor(concept).filter((t) => !existing.includes(t.toLowerCase()));
  if (!tags.length) return caption;
  return `${caption}\n\n.\n.\n.\n${tags.join(" ")}`;
}

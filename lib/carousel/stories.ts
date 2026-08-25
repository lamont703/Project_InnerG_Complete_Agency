/**
 * Comic carousel stories, as data.
 *
 * WHY THE COPY LIVES IN CODE. These are rendered to PNGs by a headless browser
 * and then handed to Instagram, which means the words are baked into pixels the
 * moment a deck is rendered. Keeping them in a typed file makes the copy
 * reviewable in a pull request, diffable when someone tightens a line, and
 * impossible to change accidentally between the preview and the post — which is
 * the failure the publisher's own queue comments warn about: a caption and its
 * artwork drifting apart.
 *
 * THE SHAPE EVERY STORY FOLLOWS, and it is not decoration:
 *
 *   HOOK   open polarizing enough to stop a thumb
 *   UP     let them agree, let them feel clever
 *   DOWN   take it away
 *   TURN   the thing they did not see
 *   LAND   a lesson that is actually balanced and actually useful
 *   ASK    one question that forces a side
 *
 * NO STORY ENDS ON THE JOKE. A punchline earns a laugh and nothing else; the
 * lesson is what earns a save and a share, and the ask is what earns a comment.
 * A deck missing its LAND or its ASK will not validate — see validateStory().
 *
 * THE HUMOUR IS STRUCTURAL, BORROWED AS CRAFT. Four sitcom engines: the petty
 * grievance prosecuted like case law, ensemble bickering where everyone is half
 * right, one character whose energy is the entire joke, and comedy that turns
 * sincere in the final beat. Structure only — none of the material.
 *
 * PROVENANCE. The arguments come from a public panel by 619 Barbershop
 * (San Antonio) about booth rent, commission and slow days. Those arguments are
 * industry-wide rather than anyone's property, and every word below is original
 * — but `sourceCredit` travels with the deck so the caption can say where the
 * conversation came from. Publishing without it would be taking something.
 */

export type Beat = "HOOK" | "UP" | "DOWN" | "TURN" | "LAND" | "ASK";

export interface Card {
  beat: Beat;
  /**
   * SHOUT is the big condensed all-caps card — the hook and the punchlines.
   * BODY is normal weight. SAY is dialogue and renders in quotes.
   * Mixing them is the rhythm; a deck of nine SHOUTs is a billboard, not a story.
   */
  kind: "shout" | "body" | "say";
  lines: string[];
}

export interface Story {
  id: string;
  title: string;
  /** The engine borrowed, recorded so the next writer knows the intent. */
  engine: string;
  /** Shown on every card's eyebrow chip. */
  chip: string;
  cards: Card[];
  /** Instagram caption. The ask is repeated here — most comments start here. */
  caption: string;
  hashtags: string[];
  sourceCredit: string;
}

const CREDIT = "Conversation sparked by @_619barbershop's panel on booth rent and slow days.";

export const STORIES: readonly Story[] = [
  {
    id: "dead-in-here",
    title: "Dead In Here",
    engine: "petty lie, prosecuted like case law",
    chip: "Shop Talk · No. 01",
    cards: [
      { beat: "HOOK", kind: "shout", lines: ["Your barber lied to you today"] },
      { beat: "HOOK", kind: "body", lines: ["11:04am. His phone buzzes."] },
      { beat: "HOOK", kind: "say", lines: ["yo is it busy"] },
      { beat: "UP", kind: "body", lines: ["Four heads waiting. He's already counting.", "Thirty. Sixty. Ninety. One-twenty.", "“It's supposed to be twenty-five.”", "…I'm rounding."] },
      { beat: "UP", kind: "shout", lines: ["dead bro. stay home."] },
      { beat: "UP", kind: "body", lines: ["Four cuts. No split. No waiting on nobody.", "Briefly, the smartest man in Texas."] },
      { beat: "DOWN", kind: "body", lines: ["4pm. Nine more walked in.", "One bag of chips since Tuesday.", "His shoulder is making a sound."] },
      { beat: "TURN", kind: "say", lines: ["told you it was slow lol"] },
      { beat: "LAND", kind: "body", lines: ["You don't build a book on the days you showed up for.", "You build it on the days nobody else did."] },
      { beat: "ASK", kind: "shout", lines: ["Ever told somebody it was dead when it wasn't?"] },
    ],
    caption:
      "He said it was dead. It was not dead. ✂️\n\nSwipe for the whole crime.\n\nBe honest in the comments — have you ever told another barber the shop was slow when you had four heads waiting? No judgement. Mostly.\n\n" +
      CREDIT,
    hashtags: ["barbershop", "barberlife", "boothrent", "barbershopconnect", "barbersofinstagram"],
    sourceCredit: CREDIT,
  },
  {
    id: "different-bills",
    title: "Different Bills",
    engine: "ensemble bickering, nobody wins",
    chip: "Shop Talk · No. 02",
    cards: [
      { beat: "HOOK", kind: "shout", lines: ["On commission? Slow days aren't your fault"] },
      { beat: "HOOK", kind: "say", lines: ["I give him seventy percent. Seventy.", "What am I paying for, if not to fill this chair?"] },
      { beat: "UP", kind: "say", lines: ["Rent don't care if it's slow.", "Rent don't care if I'm sick."] },
      { beat: "UP", kind: "say", lines: ["Exactly. You picked that.", "I picked a partner."] },
      { beat: "UP", kind: "shout", lines: ["You picked a landlord who takes 70% and calls it mentorship"] },
      { beat: "DOWN", kind: "body", lines: ["The owner has been standing there the entire time."] },
      { beat: "DOWN", kind: "say", lines: ["When it's slow, I lose too.", "Lights. Water. Gas. Rent on the building.", "You lose a cut. I lose a day."] },
      { beat: "TURN", kind: "body", lines: ["Commission — you're buying help. You pay in percentage.", "Booth rent — you're buying freedom. You pay in risk."] },
      { beat: "LAND", kind: "body", lines: ["Nobody's robbing anybody. You picked different bills.", "The only wrong move is picking one and expecting the other one's benefits."] },
      { beat: "ASK", kind: "shout", lines: ["Booth rent or commission — which are you, and would you switch?"] },
    ],
    caption:
      "The oldest argument in the shop, settled in 10 swipes. Sort of. ✂️\n\nCommission barbers: is a slow shop the owner's problem?\nBooth renters: is that just an excuse?\n\nSay your side in the comments — and say which one you'd pick if you were opening tomorrow.\n\n" +
      CREDIT,
    hashtags: ["boothrent", "barbershop", "barberbusiness", "salonowner", "barbersofinstagram"],
    sourceCredit: CREDIT,
  },
  {
    id: "terrence",
    title: "Terrence The Mannequin Head",
    engine: "broad comedy, hard sincere turn",
    chip: "Shop Talk · No. 03",
    cards: [
      { beat: "HOOK", kind: "shout", lines: ["Barber school sold you a dream and left out one part"] },
      { beat: "HOOK", kind: "body", lines: ["Day one out of school. License still warm.", "Clippers still in the box they came in."] },
      { beat: "UP", kind: "body", lines: ["He's got the shop name. The logo. The handle.", "Four followers. Two are his mom."] },
      { beat: "UP", kind: "shout", lines: ["Booked out in six months. Watch."] },
      { beat: "DOWN", kind: "body", lines: ["Week three. Clients so far:", "His cousin. His cousin's friend. And Terrence."] },
      { beat: "DOWN", kind: "body", lines: ["Terrence is a mannequin head.", "Terrence does not tip."] },
      { beat: "DOWN", kind: "say", lines: ["It's slow in here, bro.", "This shop don't got no traffic."] },
      { beat: "TURN", kind: "say", lines: ["How many numbers you get this week?", "Not cut. Talked to."] },
      { beat: "LAND", kind: "body", lines: ["School taught you to cut. It didn't hand you anybody to cut.", "Year one you're a barber who's also in sales. The ones who make it work that out in month two, not year two."] },
      { beat: "ASK", kind: "shout", lines: ["How long did it take to fill your chair? Real numbers."] },
    ],
    caption:
      "Every shop has a Terrence. ✂️\n\nTo the barbers who made it past year one — how many months until your book was full? Drop the real number, not the highlight reel. Somebody three weeks out of school needs to see it.\n\n" +
      CREDIT,
    hashtags: ["barberschool", "newbarber", "barberlife", "barbersofinstagram", "barbereducation"],
    sourceCredit: CREDIT,
  },
  {
    id: "rell",
    title: "Rell Has Never Seen It Busy",
    engine: "one character, escalating",
    chip: "Shop Talk · No. 04",
    cards: [
      { beat: "HOOK", kind: "shout", lines: ["The barber complaining it's slow is why it's slow"] },
      { beat: "HOOK", kind: "body", lines: ["Meet Rell.", "Rell arrives at 1:15. Rell's shift started at ten."] },
      { beat: "UP", kind: "body", lines: ["Rell surveys the shop. Two people waiting.", "Rell shakes his head slowly, like he's arrived at a crime scene."] },
      { beat: "UP", kind: "shout", lines: ["Man it's DEAD in here"] },
      { beat: "UP", kind: "body", lines: ["“I'll be back.”", "Rell does not come back."] },
      { beat: "DOWN", kind: "shout", lines: ["4:10pm — eleven people walk in"] },
      { beat: "DOWN", kind: "body", lines: ["7:30pm the shop is still going.", "Music on. Somebody ordered food for everybody."] },
      { beat: "TURN", kind: "body", lines: ["8:02pm, Rell posts: “shops be slow out here fr”", "He has never seen his own shop busy. Not once.", "He's always gone before it happens."] },
      { beat: "LAND", kind: "body", lines: ["Busy isn't a time of day. It's what shows up for people who were already there.", "You can't complain about a wave you keep leaving the beach before."] },
      { beat: "ASK", kind: "shout", lines: ["Every shop has a Rell. Don't tag him. Just say the city."] },
    ],
    caption:
      "Rell is going to see this and not recognise himself. ✂️\n\nDon't tag him. We're not doing that. Just comment the city he's in so we know how far this goes.\n\n" +
      CREDIT,
    hashtags: ["barbershop", "barberlife", "shopculture", "barbersofinstagram", "barbershoptalk"],
    sourceCredit: CREDIT,
  },
  {
    id: "nobody-announces",
    title: "Nobody Announces A Packed Shop",
    engine: "double standard, prosecuted",
    chip: "Shop Talk · No. 05",
    cards: [
      { beat: "HOOK", kind: "shout", lines: ["Nobody has ever walked in and said “wow it's busy in here”"] },
      { beat: "HOOK", kind: "body", lines: ["Not once. Not in the history of barbering.", "But slow? Slow gets announced. Slow gets a press conference."] },
      { beat: "UP", kind: "say", lines: ["It's slow.", "— Yeah."] },
      { beat: "UP", kind: "say", lines: ["Like… real slow.", "— I heard you."] },
      { beat: "UP", kind: "shout", lines: ["This the slowest I ever seen it"] },
      { beat: "DOWN", kind: "body", lines: ["Three weeks ago: fourteen people in this room.", "Chairs full. Bench full. Nobody said one word about it."] },
      { beat: "DOWN", kind: "body", lines: ["Because busy is expected. Busy is the floor.", "Busy is what you thought you signed up for."] },
      { beat: "TURN", kind: "body", lines: ["So the record only ever gets written on the bad days.", "Of course the shop feels like it's dying. You only take notes at funerals."] },
      { beat: "LAND", kind: "body", lines: ["If you only count on the slow days, your business will always look like it's failing.", "Say the good weeks out loud too. Not for morale — for accuracy."] },
      { beat: "ASK", kind: "shout", lines: ["When did you last say out loud that it was BUSY?"] },
    ],
    caption:
      "Genuine question. ✂️\n\nWhen is the last time you walked into your own shop and said, out loud, that it was busy? Not slow. Busy.\n\nIf you can't remember, that's the whole post.\n\n" +
      CREDIT,
    hashtags: ["barbershop", "barberlife", "smallbusiness", "barbersofinstagram", "shopowner"],
    sourceCredit: CREDIT,
  },
];

/**
 * Instagram refuses a carousel outside this range, so a deck is checked before render.
 *
 * TEN. NOT TWENTY. This was 20, written from memory, and Instagram rejected an
 * 11-card deck at the parent-container step with "too little or too many
 * attachments to qualify as a carousel". Meta's content-publishing reference is
 * explicit: a carousel is "limited to 10 images, videos, or a mix of the two."
 *
 * The failure is worth remembering because of WHERE it lands. Every child
 * container is created and accepted one at a time — eleven successful calls —
 * and only the parent refuses. So an over-long deck looks like it is working
 * right up until the last step.
 *
 * Also from that page, and relevant here: "Carousel images are all cropped
 * based on the first image in the carousel." Every card is 4:5, so they crop to
 * 4:5 and nothing moves. Mixing ratios in one deck would silently crop the rest.
 */
export const MIN_CARDS = 2;
export const MAX_CARDS = 10;
/** Instagram truncates hard past this; the ask must land above the fold. */
export const MAX_CAPTION = 2200;

export interface StoryProblem {
  storyId: string;
  problem: string;
}

/**
 * Refuse a deck that breaks the format, BEFORE a browser renders eleven PNGs
 * and Instagram rejects the lot on the last call.
 *
 * The LAND and ASK checks are not bureaucracy. A story that ends on its
 * punchline is the exact failure this format is built to avoid: it reads well,
 * earns a laugh, and produces no saves and no comments.
 */
export function validateStory(s: Story): string[] {
  const out: string[] = [];
  if (s.cards.length < MIN_CARDS) out.push(`only ${s.cards.length} cards; Instagram needs ${MIN_CARDS}+`);
  if (s.cards.length > MAX_CARDS) out.push(`${s.cards.length} cards; Instagram caps carousels at ${MAX_CARDS}`);
  if (s.cards[0]?.beat !== "HOOK") out.push("first card is not a HOOK — nothing stops the thumb");
  if (!s.cards.some((c) => c.beat === "LAND")) out.push("no LAND card — the story ends on the joke");
  if (s.cards[s.cards.length - 1]?.beat !== "ASK") out.push("last card is not an ASK — nothing invites a comment");
  if (s.caption.length > MAX_CAPTION) out.push(`caption is ${s.caption.length} chars; max ${MAX_CAPTION}`);
  if (!s.caption.includes(s.sourceCredit)) out.push("caption drops sourceCredit — the panel goes uncredited");
  s.cards.forEach((c, i) => {
    if (c.lines.length === 0) out.push(`card ${i + 1} has no lines`);
    if (c.lines.join(" ").length > 190) out.push(`card ${i + 1} is too long to read on a phone`);
  });
  return out;
}

export function findStory(id: string): Story | undefined {
  return STORIES.find((s) => s.id === id);
}

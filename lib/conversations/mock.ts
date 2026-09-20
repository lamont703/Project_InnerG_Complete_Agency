import type { Thread } from "./types";

/**
 * Invented conversations for the Conversations prototype. Nobody here is real.
 *
 * CHOSEN TO EXERCISE THE STATES THAT ARE EASY TO FORGET, rather than to look
 * busy. A screen built only from happy-path threads hides the work: every one
 * of these exists because it forces the interface to answer a question.
 *
 *   ct_pyrs  opted OUT of SMS after replying STOP — the composer must refuse.
 *   ct_hall  email unsubscribe, SMS still fine — consent is per channel.
 *   ct_okon  a failed SMS with a carrier code, still sitting in the thread.
 *   ct_bram  no phone at all, so SMS is unavailable for a different reason.
 *   ct_delg  both channels in one thread, which is the whole point of the app.
 *   ct_vasq  unknown SMS consent — reachable in principle, not yet permitted.
 *
 * Times are relative to load so the list always reads as "today" in a demo.
 */
const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

export const MOCK_THREADS: Thread[] = [
  {
    id: "th_delg",
    unread: 2,
    assignedTo: "Lamont",
    contact: {
      id: "ct_delg",
      name: "Andrea Delgado",
      phone: "+17135550142",
      email: "a.delgado@example.com",
      tags: ["Booth renter", "Houston", "Invoice due"],
      smsConsent: "opted_in",
      emailConsent: "opted_in",
      consentNote: "Opted in at booth-rent signup, 4 Mar 2026.",
    },
    messages: [
      {
        id: "m1", channel: "email", direction: "outbound", provider: "mailgun",
        subject: "Your booth rent statement — March",
        body: "Hi Andrea, your March statement is attached. Rent is due on the 5th as usual. Let me know if anything on it looks wrong and I will get it corrected the same day.",
        at: ago(2880), status: "opened",
      },
      {
        id: "m2", channel: "sms", direction: "inbound", provider: "twilio",
        body: "Got the statement, thanks. Quick question though — is the chair fee separate from the rent now?",
        at: ago(190), status: "delivered",
      },
      {
        id: "m3", channel: "sms", direction: "outbound", provider: "twilio",
        body: "It is, as of this month. Rent covers the station and the chair fee covers the equipment lease. Both are itemised on the statement so you can see the split.",
        at: ago(184), status: "delivered",
      },
      {
        id: "m4", channel: "sms", direction: "inbound", provider: "twilio",
        body: "Ok that makes sense. One more — can I pay both on the same card or do they have to be separate?",
        at: ago(21), status: "delivered",
      },
      {
        id: "m5", channel: "sms", direction: "inbound", provider: "twilio",
        body: "Also I might bring on an apprentice next month, does that change the rent",
        at: ago(18), status: "delivered",
      },
    ],
  },
  {
    id: "th_okon",
    unread: 0,
    assignedTo: "Lamont",
    contact: {
      id: "ct_okon",
      name: "Chidi Okonkwo",
      phone: "+12815550198",
      email: "chidi.okonkwo@example.com",
      tags: ["Shop owner", "Katy"],
      smsConsent: "opted_in",
      emailConsent: "opted_in",
      consentNote: "Opted in by reply Y, 11 Jun 2026.",
    },
    messages: [
      {
        id: "m1", channel: "sms", direction: "outbound", provider: "twilio",
        body: "Chidi — your shop listing is live. Want me to add the second location while I am in there?",
        at: ago(460), status: "delivered",
      },
      {
        id: "m2", channel: "sms", direction: "outbound", provider: "twilio",
        body: "Following up on the second location — I can have it up this afternoon if you send me the address.",
        at: ago(120), status: "undelivered",
        failureCode: "30003",
        failureReason: "Unreachable destination handset. The device may be off or out of coverage.",
      },
      {
        id: "m3", channel: "email", direction: "outbound", provider: "mailgun",
        subject: "Second location for Fresh Cuts Katy",
        body: "Tried to text and it did not get through, so trying here. Send me the address for the second shop and I will get the listing up today.",
        at: ago(116), status: "delivered",
      },
    ],
  },
  {
    id: "th_hall",
    unread: 1,
    contact: {
      id: "ct_hall",
      name: "Simone Hall",
      phone: "+17135550177",
      email: "simone.hall@example.com",
      tags: ["Student", "Exam prep"],
      smsConsent: "opted_in",
      emailConsent: "opted_out",
      consentNote: "Unsubscribed from email 2 Sep 2026. SMS consent still valid.",
    },
    messages: [
      {
        id: "m1", channel: "email", direction: "outbound", provider: "mailgun",
        subject: "Your practical exam kit list",
        body: "Here is the full kit list for the Texas practical. Print it and tick things off as you pack them the night before, not the morning of.",
        at: ago(7200), status: "opened",
      },
      {
        id: "m2", channel: "sms", direction: "inbound", provider: "twilio",
        body: "I unsubscribed from the emails by accident, sorry. Can you text me the kit list instead?",
        at: ago(44), status: "delivered",
      },
    ],
  },
  {
    id: "th_pyrs",
    unread: 0,
    contact: {
      id: "ct_pyrs",
      name: "Trevon Pyers",
      phone: "+18325550113",
      email: "tpyers@example.com",
      tags: ["Former renter"],
      smsConsent: "opted_out",
      emailConsent: "opted_in",
      consentNote: "Replied STOP on 28 Aug 2026. Twilio is enforcing this at the number level.",
    },
    messages: [
      {
        id: "m1", channel: "sms", direction: "outbound", provider: "twilio",
        body: "Trevon, we have a chair opening up in October if you are looking to come back.",
        at: ago(26000), status: "delivered",
      },
      {
        id: "m2", channel: "sms", direction: "inbound", provider: "twilio",
        body: "STOP",
        at: ago(25800), status: "delivered",
      },
      {
        id: "m3", channel: "email", direction: "inbound", provider: "mailgun",
        subject: "Re: chair opening",
        body: "Nothing personal, I just get too many texts. Email is fine if something comes up.",
        at: ago(25600), status: "delivered",
      },
    ],
  },
  {
    id: "th_bram",
    unread: 0,
    contact: {
      id: "ct_bram",
      name: "Keisha Bramwell",
      email: "k.bramwell@example.com",
      tags: ["School contact", "Instructor"],
      smsConsent: "unknown",
      emailConsent: "opted_in",
      consentNote: "No phone number collected.",
    },
    messages: [
      {
        id: "m1", channel: "email", direction: "inbound", provider: "mailgun",
        subject: "Instructor roster for the fall cohort",
        body: "Attaching the roster for the fall cohort. Two of the instructors are new so their licence numbers are not in your system yet.",
        at: ago(520), status: "delivered",
      },
      {
        id: "m2", channel: "email", direction: "outbound", provider: "mailgun",
        subject: "Re: Instructor roster for the fall cohort",
        body: "Got it. I will add the two new instructors and verify the licence numbers against TDLR before the cohort starts.",
        at: ago(505), status: "opened",
      },
    ],
  },
  {
    id: "th_vasq",
    unread: 0,
    contact: {
      id: "ct_vasq",
      name: "Miguel Vasquez",
      phone: "+12105550164",
      email: "m.vasquez@example.com",
      tags: ["Lead", "San Antonio"],
      smsConsent: "unknown",
      emailConsent: "opted_in",
      consentNote: "Came in through the directory contact form. No SMS consent captured.",
    },
    messages: [
      {
        id: "m1", channel: "email", direction: "inbound", provider: "mailgun",
        subject: "Question about listing my shop",
        body: "Saw the directory and wanted to ask what it costs to get my shop listed, and whether you cover San Antonio yet.",
        at: ago(95), status: "delivered",
      },
    ],
  },
];

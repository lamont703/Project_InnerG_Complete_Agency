import { describe, it, expect } from "vitest";
import { decide, privateReplyFor, publicReplyFor, looksLikeEmail, PAYLOAD, OPENER, MENU_BUTTONS, TOPICS, kitEmail, PUBLIC_REPLIES, type FlowState } from "./instagram-flow";

const st = (stage: FlowState["stage"], email: string | null = null): FlowState => ({ stage, email, topics: [] });

describe("the comment", () => {
  it("gets a short public reply and a private opener with one SEND IT button", () => {
    expect(PUBLIC_REPLIES).toContain(publicReplyFor("17890000000000001"));
    const p = privateReplyFor(null);
    expect(p.kind).toBe("opener");
    expect(p.buttons).toEqual([{ type: "postback", title: "SEND IT 🎁", payload: PAYLOAD.sendKit }]);
  });
  it("says it's a bot in the very first message, button or fallback", () => {
    expect(OPENER.text.toLowerCase()).toContain("bot");
    expect(OPENER.fallbackText.toLowerCase()).toContain("bot");
  });
  it("sends someone who already has the kit straight to the menu", () => {
    expect(privateReplyFor(st("done", "a@b.co")).kind).toBe("menu");
  });
});

describe("the conversation", () => {
  it("SEND IT asks for the email and says what else they'll get", () => {
    const a = decide(st("opened"), { type: "postback", payload: PAYLOAD.sendKit });
    expect(a[0]).toEqual({ kind: "stage", stage: "awaiting_email" });
    const said = a.filter((x) => x.kind === "text").map((x: any) => x.text).join(" ");
    expect(said).toContain("LIVE AI Barber Beauty Business Training");
    expect(said).toContain("best email");
  });
  it("an email captures, finishes and shows the three-topic menu", () => {
    const a = decide(st("awaiting_email"), { type: "text", text: "Lamont703@Gmail.com" });
    expect(a).toContainEqual({ kind: "capture_email", email: "lamont703@gmail.com" });
    expect(a).toContainEqual({ kind: "stage", stage: "done" });
    expect((a.find((x) => x.kind === "buttons") as any).buttons).toEqual(MENU_BUTTONS);
  });
  it("asks again for something that isn't an email", () => {
    const a = decide(st("awaiting_email"), { type: "text", text: "what is this" });
    expect(a).toEqual([{ kind: "text", text: expect.stringContaining("doesn't look like an email") }]);
  });
  it("each topic answers with link buttons, in any order", () => {
    for (const t of ["claude", "live", "shop"] as const) {
      const a = decide(st("done", "a@b.co"), { type: "postback", payload: PAYLOAD.topic(t) });
      expect(a[0]).toEqual({ kind: "topic", topic: t });
      expect((a[1] as any).buttons.every((b: any) => b.type === "web_url")).toBe(true);
    }
  });
  it("typed 'send' works when the button couldn't be sent", () => {
    expect(decide(st("opened"), { type: "text", text: "Send" })[0]).toEqual({ kind: "stage", stage: "awaiting_email" });
  });
  it("answers anything else typed with a nudge back to the buttons — no AI", () => {
    const a = decide(st("done", "a@b.co"), { type: "text", text: "how much is a haircut in houston?" });
    expect(a).toHaveLength(1);
    expect(a[0].kind).toBe("buttons");
    expect((a[0] as any).buttons).toEqual(MENU_BUTTONS);
  });
});

describe("Instagram's limits", () => {
  it("keeps every button message to 3 buttons and 640 characters", () => {
    const msgs = [{ text: OPENER.text, buttons: OPENER.buttons }, { text: "x".repeat(10), buttons: MENU_BUTTONS }, ...Object.values(TOPICS)];
    for (const m of msgs) {
      expect(m.buttons.length).toBeLessThanOrEqual(3);
      expect(Buffer.byteLength(m.text, "utf8")).toBeLessThanOrEqual(640);
      for (const b of m.buttons) expect(b.title.length).toBeLessThanOrEqual(20);
    }
  });
  it("tags every link it sends", () => {
    for (const t of Object.values(TOPICS)) for (const b of t.buttons) if (b.type === "web_url" && new URL(b.url).hostname.endsWith("shearquery.com")) expect(b.url).toContain("src=ig_dm");
  });
});

describe("the kit email", () => {
  it("carries unsubscribe and the mailing address", () => {
    const e = kitEmail({ unsubscribeUrl: "https://x/u", mailingAddress: "1 Main St, Atlanta, GA" });
    expect(e.html).toContain("Unsubscribe");
    expect(e.html).toContain("1 Main St");
  });
  it("reads an email out of a short message", () => {
    expect(looksLikeEmail("my email is jo@shop.com")).toBe("jo@shop.com");
    expect(looksLikeEmail("no email here")).toBeNull();
  });
});

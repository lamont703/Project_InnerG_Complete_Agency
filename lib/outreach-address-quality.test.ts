import { describe, it, expect } from "vitest";
import { judgeAddress, selectSendable } from "./outreach-address-quality";

describe("addresses that are not addresses", () => {
  it("refuses theme placeholders nobody replaced", () => {
    // Both were in the first real target list.
    expect(judgeAddress("user@domain.com").ok).toBe(false);
    expect(judgeAddress("hello@nelson.com").ok).toBe(false);
  });

  it("refuses the font designer whose address ships inside Google Fonts", () => {
    // impallari@gmail.com is Pablo Impallari, on any site using his typefaces.
    expect(judgeAddress("impallari@gmail.com").reason).toBe("placeholder");
  });

  it("refuses mailboxes nobody reads", () => {
    expect(judgeAddress("postmaster@school.com").reason).toBe("unreachable_role");
    expect(judgeAddress("abuse@school.com").reason).toBe("unreachable_role");
  });

  it("accepts an ordinary school address", () => {
    expect(judgeAddress("info@brightonbarber.com").ok).toBe(true);
    expect(judgeAddress("renewbarberacademy@gmail.com").ok).toBe(true);
  });
});

describe("institutions with no owner to reach", () => {
  it("refuses K-12 districts the crawler's filter missed", () => {
    expect(judgeAddress("michelle.doporto@birdvilleschools.net", "Birdville Center Of Technology").reason)
      .toBe("wrong_audience");
  });

  it("refuses the prison education system", () => {
    expect(judgeAddress("communications@wsdtx.org", "Windham School District").reason).toBe("wrong_audience");
  });

  it("refuses on the name even when the domain looks ordinary", () => {
    expect(judgeAddress("info@example-school.com", "Klein High School").reason).toBe("wrong_audience");
  });
});

describe("addresses shared across rows", () => {
  it("sends once to a chain that runs campuses from one inbox", () => {
    const { sendable, refused } = selectSendable([
      { email: "bella@x.com", schoolName: "Bella Beauty College - Waco Campus" },
      { email: "bella@x.com", schoolName: "Bella Beauty College - Airport Campus" },
      { email: "bella@x.com", schoolName: "Bella Beauty College - Corpus Campus" },
    ]);
    expect(sendable).toHaveLength(1);
    expect(refused.map((r) => r.reason)).toEqual(["duplicate", "duplicate"]);
  });

  it("refuses an address that three UNRELATED schools share — that's a template", () => {
    const { sendable, refused } = selectSendable([
      { email: "sarahbrown@gmail.com", schoolName: "Amenti Beauty Academy LLC" },
      { email: "sarahbrown@gmail.com", schoolName: "Duvalls School Of Cosmetology" },
      { email: "sarahbrown@gmail.com", schoolName: "Acc Academy Of Cosmetology" },
    ]);
    expect(sendable).toHaveLength(0);
    expect(refused.every((r) => r.reason === "shared_across_schools")).toBe(true);
  });

  it("leaves genuinely distinct schools alone", () => {
    const { sendable } = selectSendable([
      { email: "a@one.com", schoolName: "One Barber College" },
      { email: "b@two.com", schoolName: "Two Beauty Academy" },
    ]);
    expect(sendable).toHaveLength(2);
  });

  it("still applies the placeholder rule to a shared address", () => {
    const { sendable } = selectSendable([
      { email: "user@domain.com", schoolName: "A School" },
      { email: "user@domain.com", schoolName: "A School Campus Two" },
    ]);
    expect(sendable).toHaveLength(0);
  });
});

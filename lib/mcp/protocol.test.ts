import { describe, it, expect } from "vitest";
import {
  negotiateProtocol,
  negotiatedInitializeVersion,
  SUPPORTED_PROTOCOL_VERSIONS,
  MODERN_PROTOCOL_VERSIONS,
  LEGACY_PROTOCOL_VERSIONS,
  DEFAULT_LEGACY_VERSION,
  MCP_HEADER_MISMATCH,
  MCP_UNSUPPORTED_PROTOCOL_VERSION,
} from "./protocol";

/**
 * THE BUG THESE TESTS EXIST FOR. A real Claude connector could not add this
 * server: it declared the current protocol revision, the handler answered
 * HTTP 400 with `{"error":"Unsupported MCP-Protocol-Version: …"}`, and the
 * client had nothing to negotiate with. It reported "Not found 400" and
 * stopped. Nothing in our logs said "wrong protocol version" — just a 400 with
 * no method, which is what a rejection before body parse looks like.
 *
 * So the first test is the regression: the current revision must be served, and
 * an unknown version must come back as a real UnsupportedProtocolVersionError
 * carrying the list a client can retry with.
 */

describe("negotiateProtocol", () => {
  it("serves the current revision as modern", () => {
    const n = negotiateProtocol({ headerVersion: "2026-07-28" });
    expect(n).toEqual({ ok: true, era: "modern", version: "2026-07-28" });
  });

  it("serves every legacy revision we advertise as legacy", () => {
    for (const version of LEGACY_PROTOCOL_VERSIONS) {
      expect(negotiateProtocol({ headerVersion: version })).toEqual({
        ok: true,
        era: "legacy",
        version,
      });
    }
  });

  it("advertises every supported version back to a client that asked for none of them", () => {
    const n = negotiateProtocol({ headerVersion: "1900-01-01" });
    if (n.ok) throw new Error("expected a refusal");

    expect(n.status).toBe(400);
    expect(n.code).toBe(MCP_UNSUPPORTED_PROTOCOL_VERSION);
    // The list is the whole point: without it the client cannot pick a version
    // to retry with, which is exactly how the connector failed.
    expect(n.data).toEqual({ supported: SUPPORTED_PROTOCOL_VERSIONS, requested: "1900-01-01" });
    expect(n.data?.supported).toContain("2026-07-28");
    expect(n.data?.supported).toContain("2025-06-18");
  });

  it("treats a missing version as legacy rather than refusing it", () => {
    // Permitted explicitly by the transport binding for pre-2025-06-18 clients,
    // and refusing here would break every client that predates the header.
    for (const absent of [undefined, null, "", "   "]) {
      expect(negotiateProtocol({ headerVersion: absent })).toEqual({
        ok: true,
        era: "legacy",
        version: DEFAULT_LEGACY_VERSION,
      });
    }
  });

  it("reads the version from _meta when there is no header", () => {
    expect(negotiateProtocol({ metaVersion: "2026-07-28" })).toEqual({
      ok: true,
      era: "modern",
      version: "2026-07-28",
    });
  });

  it("refuses a header that contradicts the body", () => {
    const n = negotiateProtocol({ headerVersion: "2026-07-28", metaVersion: "2025-06-18" });
    if (n.ok) throw new Error("expected a refusal");

    expect(n.status).toBe(400);
    expect(n.code).toBe(MCP_HEADER_MISMATCH);
    // Both values named, because the point of the rule is that two components
    // disagreed and a human has to see which said what.
    expect(n.message).toContain("2026-07-28");
    expect(n.message).toContain("2025-06-18");
  });

  it("accepts a header and body that agree", () => {
    expect(negotiateProtocol({ headerVersion: "2026-07-28", metaVersion: "2026-07-28" })).toEqual({
      ok: true,
      era: "modern",
      version: "2026-07-28",
    });
  });

  it("does not refuse a request merely for omitting one of the two", () => {
    // Deliberate narrowing of the spec's header validation. The rule guards
    // against an intermediary routing on a header while the server executes the
    // body — which cannot happen when only one value exists. Strictness here is
    // what refused a working client.
    expect(negotiateProtocol({ headerVersion: "2025-06-18", metaVersion: undefined }).ok).toBe(true);
    expect(negotiateProtocol({ headerVersion: null, metaVersion: "2025-06-18" }).ok).toBe(true);
  });

  it("ignores a non-string version instead of crashing on it", () => {
    for (const junk of [42, {}, [], true]) {
      expect(negotiateProtocol({ metaVersion: junk }).ok).toBe(true);
    }
  });
});

describe("negotiatedInitializeVersion", () => {
  it("echoes a legacy version the client asked for", () => {
    for (const version of LEGACY_PROTOCOL_VERSIONS) {
      expect(negotiatedInitializeVersion(version)).toBe(version);
    }
  });

  it("never answers a handshake with a modern version", () => {
    // A modern revision has no initialize handshake, so naming one in the
    // handshake response would tell the client to switch to a protocol whose
    // first message it has already failed to use.
    for (const version of MODERN_PROTOCOL_VERSIONS) {
      expect(negotiatedInitializeVersion(version)).toBe(DEFAULT_LEGACY_VERSION);
    }
  });

  it("falls back to our floor for anything unrecognised", () => {
    for (const junk of ["1900-01-01", "", null, undefined, 7, {}]) {
      expect(negotiatedInitializeVersion(junk)).toBe(DEFAULT_LEGACY_VERSION);
    }
  });
});

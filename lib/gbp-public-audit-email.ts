import type { PublicAuditResult } from "@/lib/gbp-audit-public";
import { SITE_URL } from "./site";

/**
 * The free audit, as an email.
 *
 * Written to be the same report the visitor just read, not a teaser for it.
 * Someone who hands over an address after seeing their score has already been
 * given the value; sending them a stripped version to force a second visit
 * would be a worse trade than not asking at all.
 *
 * The coverage caveat is carried through for the same reason it's on the page:
 * a score of 31 that quietly omits how much wasn't looked at is a misleading
 * number in someone's inbox, where it will be read without the surrounding
 * context.
 *
 * Pure — no network.
 */

const SITE = SITE_URL;

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export interface PublicAuditEmailInput {
  businessName: string;
  city?: string | null;
  audit: PublicAuditResult;
}

export function buildPublicAuditEmail(input: PublicAuditEmailInput): { subject: string; html: string } {
  const { businessName, city, audit } = input;
  const gaps = audit.checks.filter((c) => c.status === "warn" || c.status === "fail");

  const subject = `${businessName}: your Google profile scored ${audit.score}`;

  const gapRows = gaps
    .map(
      (c) => `
      <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9">
        <strong style="color:#0f172a">${esc(c.label)}</strong><br>
        <span style="color:#475569;font-size:14px">${esc(c.detail)}</span>
        ${c.fix ? `<br><span style="color:#1d4ed8;font-size:13px">${esc(c.fix)}</span>` : ""}
      </td></tr>`
    )
    .join("");

  const benchmark =
    audit.benchmark.sampleSize >= 5
      ? `<p style="color:#64748b;font-size:13px;margin:16px 0 0">
           Compared against ${audit.benchmark.sampleSize} other listings${
             audit.benchmark.city ? ` in ${esc(audit.benchmark.city)}` : ""
           } from our directory.
         </p>`
      : "";

  const locked = audit.locked
    .slice(0, 4)
    .map((l) => `<li style="margin-bottom:6px"><strong>${esc(l.label)}</strong> — ${esc(l.why)}</li>`)
    .join("");

  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
    <p style="font-size:13px;color:#64748b;margin:0 0 6px">Google Business Profile audit</p>
    <h2 style="margin:0 0 2px;font-size:20px">${esc(businessName)}</h2>
    ${city ? `<p style="margin:0;color:#64748b;font-size:14px">${esc(city)}</p>` : ""}

    <p style="margin:20px 0 4px;font-size:44px;font-weight:800;line-height:1">${audit.score}</p>
    <p style="margin:0;color:#64748b;font-size:13px">out of 100, on what's publicly visible</p>

    <p style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px;margin:20px 0 0;font-size:13px;color:#78350f">
      <strong>This covers ${audit.coverage.visible} of ${audit.coverage.total} checks.</strong>
      The other ${audit.coverage.total - audit.coverage.visible} — including your profile attributes
      and the searches people used to find you — are only visible to the profile owner. A high score
      here doesn't mean the profile is finished.
    </p>

    ${
      gaps.length
        ? `<h3 style="margin:26px 0 4px;font-size:15px">What we found</h3>
           <table style="width:100%;border-collapse:collapse">${gapRows}</table>`
        : `<p style="margin:24px 0 0;color:#475569;font-size:14px">
             Nothing visible is missing — but the ${audit.coverage.total - audit.coverage.visible}
             checks above still haven't been looked at.
           </p>`
    }
    ${benchmark}

    <h3 style="margin:26px 0 6px;font-size:15px">What we couldn't see</h3>
    <ul style="color:#475569;font-size:14px;padding-left:18px;margin:0">${locked}</ul>

    <p style="margin:26px 0 0">
      <a href="${SITE}/google-business-profile-audit"
         style="background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block">
        Connect Google for the full audit
      </a>
    </p>

    <p style="color:#94a3b8;font-size:12px;margin-top:28px;line-height:1.5">
      You asked for this report on our free Google Business Profile audit. We won't email you again
      unless you ask.<br>
      ShearQuery by Inner G Complete Agency
    </p>
  </div>`.trim();

  return { subject, html };
}

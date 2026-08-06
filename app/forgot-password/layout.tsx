import type { Metadata } from "next";

/**
 * noindex — this page is an auth surface built around a password-reset request,
 * and it was serving `<meta name="robots" content="index, follow">`.
 *
 * It lives in a layout because the page itself is `"use client"` and a client
 * component cannot export `metadata`. Same reason the /account pages were
 * missed; see app/account/layout.tsx.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}

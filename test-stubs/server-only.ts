// Stub for the `server-only` package under Vitest.
//
// That package exists to fail at build time if a server module is pulled into a
// client bundle, and it fails just as hard inside a test runner — at transform
// time, so vi.mock() can't intercept it. Aliasing it to this empty module lets
// server-side modules (lib/page-markdown.ts) be unit-tested directly without
// weakening the real guard in application code.
export {};

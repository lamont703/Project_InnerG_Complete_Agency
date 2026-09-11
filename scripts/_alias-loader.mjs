/**
 * Resolve the "@/..." path alias for scripts that import app libraries directly.
 *
 *   node --experimental-strip-types --import ./scripts/_alias-loader.mjs script.mjs
 *
 * WHY. tsconfig maps "@/*" to the repo root and Next honours it, but plain Node
 * does not — an import of "@/lib/gbp-write" fails with "Cannot find package
 * '@/lib'", which reads like a missing dependency rather than a missing alias.
 * The alternative was re-implementing library functions inside scripts, which
 * drops whatever those libraries do beyond the API call. gbp-write.ts records a
 * gbp_write_snapshots row on every write; a hand-rolled copy of the same HTTP
 * call posts successfully and silently writes nothing to the audit trail.
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./_alias-resolver.mjs", pathToFileURL(import.meta.dirname + "/"));

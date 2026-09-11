import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const ROOT = path.resolve(import.meta.dirname, "..");

export async function resolve(specifier, context, next) {
  /*
   * "server-only" is not an installed package — Next substitutes it at build
   * time. Its whole job is to make a client bundle fail loudly, so in a Node
   * script it has nothing to enforce and resolving it to an empty module is
   * correct rather than a workaround. Without this, importing any lib that
   * declares it dies with "Cannot find package 'server-only'", which looks
   * like a missing dependency somebody should install. Installing it would be
   * the wrong fix.
   */
  if (specifier === "server-only" || specifier === "client-only") {
    return { url: "data:text/javascript,export{}", shortCircuit: true, format: "module" };
  }
  if (specifier.startsWith("@/")) {
    // Mirror the tsconfig mapping, then let Node's own resolution take over so
    // extensionless imports still find .ts / .tsx / index files.
    const asPath = path.join(ROOT, specifier.slice(2));
    /*
     * TEST THE FILE EXISTS, do not rely on next() throwing. Resolution and
     * loading are separate phases: next() happily RESOLVES a path with no
     * extension and the failure only surfaces later as ERR_MODULE_NOT_FOUND on
     * the bare name, so the extensionless candidate always "won" and the .ts one
     * was never tried. An extensionless import is the normal shape inside this
     * repo's own libraries, so that was every internal import.
     */
    for (const cand of [asPath, asPath + ".ts", asPath + ".tsx", asPath + ".js",
                        asPath + ".mjs", path.join(asPath, "index.ts")]) {
      if (!fs.existsSync(cand) || fs.statSync(cand).isDirectory()) continue;
      return next(pathToFileURL(cand).href, context);
    }
  }
  /*
   * RELATIVE IMPORTS NEED THE SAME TREATMENT, and forgetting them made the
   * alias fix look broken. TypeScript source says `from "./interpret"` with no
   * extension — that is the normal shape, not an oddity — so every internal
   * import inside an aliased library failed even once "@/..." resolved fine.
   * The alias only gets you to the first file; its neighbours are relative.
   */
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const from = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : ROOT;
    const asPath = path.resolve(from, specifier);
    for (const cand of [asPath + ".ts", asPath + ".tsx", asPath + ".js", asPath + ".mjs",
                        asPath, path.join(asPath, "index.ts")]) {
      if (!fs.existsSync(cand) || fs.statSync(cand).isDirectory()) continue;
      return next(pathToFileURL(cand).href, context);
    }
  }

  return next(specifier, context);
}

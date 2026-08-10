import "server-only";
import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { protectionBypassHeaders } from "./vercel-bypass";

/**
 * Generic Markdown rendering of any public page, for the `.md` convention
 * documented in public/llms.txt.
 *
 * Entity profiles (/shop/{slug}.md etc.) and the comparison tools have
 * purpose-built Markdown built straight from their source records — those are
 * always better and take precedence. This is the fallback for the ~170
 * editorial, guide and hub pages that have no single backing record: it
 * renders the page, strips the chrome, and serializes the real content.
 *
 * Rendering the page rather than reading the TSX is deliberate — it means the
 * Markdown reflects whatever the page actually shows, including live data,
 * without every page needing a hand-written second copy that would rot.
 */

const CHROME_SELECTORS = [
  "script", "style", "noscript", "template", "svg", "iframe", "canvas",
  "header", "nav", "footer",
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
  '[aria-hidden="true"]', "[hidden]",
  ".sr-only",
].join(", ");

const BLOCK_TAGS = new Set([
  "p", "div", "section", "article", "ul", "ol", "li", "table", "blockquote",
  "pre", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "br", "tr",
]);

function absolute(href: string, origin: string): string {
  if (!href) return "";
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  if (href.startsWith("#")) return "";
  return href.startsWith("/") ? `${origin}${href}` : href;
}

/** Collapse runs of whitespace but keep intentional single spaces. */
const squash = (s: string) => s.replace(/\s+/g, " ");

interface Ctx {
  $: cheerio.CheerioAPI;
  origin: string;
}

function inline(node: AnyNode, ctx: Ctx): string {
  const { $ } = ctx;
  if (node.type === "text") return squash((node as any).data || "");
  if (node.type !== "tag") return "";

  const el = node as Element;
  const tag = el.tagName?.toLowerCase();
  const kids = () => (el.children || []).map((c) => inline(c, ctx)).join("");

  switch (tag) {
    case "br":
      return "\n";
    case "strong":
    case "b": {
      const t = kids().trim();
      return t ? `**${t}**` : "";
    }
    case "em":
    case "i": {
      const t = kids().trim();
      return t ? `*${t}*` : "";
    }
    case "code": {
      const t = kids().trim();
      return t ? `\`${t}\`` : "";
    }
    case "a": {
      const text = kids().trim();
      if (!text) return "";
      const href = absolute($(el).attr("href") || "", ctx.origin);
      return href ? `[${text}](${href})` : text;
    }
    case "img": {
      const alt = $(el).attr("alt")?.trim();
      return alt ? `![${alt}]` : "";
    }
    // Elements that occupy their own line in the rendered page but sit inside
    // an otherwise-inline container (a table cell's name + meta row, a pair of
    // toggle buttons). Without a separator they run together as
    // "…Academy](url)Dallas" or "(215)Cosmetology Schools".
    case "div":
    case "section":
    case "button":
    case "label": {
      const t = kids().trim();
      return t ? ` ${t} ` : "";
    }
    // A span is inline by default — "Shear<span>Query</span>" must stay
    // "ShearQuery" — but Tailwind's `block`/`sm:block` turns one into its own
    // visual line, which is a common way to split a headline. Those need the
    // same separator as the block tags above, or the twin renders
    // "Google Business Profile Optimizationfor barbershops". Keyed off the
    // class because the display value isn't knowable without the stylesheet.
    case "span": {
      const t = kids().trim();
      if (!t) return "";
      const cls = $(el).attr("class") || "";
      return /(?:^|\s|:)block(?:\s|$)/.test(cls) ? ` ${t} ` : t;
    }
    default:
      return kids();
  }
}

/**
 * Join inline children, then normalize the separator artifacts that creates.
 *
 * The separator is chosen by looking at whether real text sits between the
 * elements. Prose ("the <strong>bold</strong> word") interleaves text nodes
 * with elements, and inserting spaces there would mangle it. A row of discrete
 * items — badge spans in a flex container, a <time> next to a status pill —
 * has element children and no text between them, and concatenating those
 * produces "barbercosmetologyesthetician". Same rule covers both.
 */
function inlineAll(children: AnyNode[], ctx: Ctx): string {
  const hasInterleavedText = children.some(
    (c) => c.type === "text" && String((c as any).data || "").trim()
  );
  const elementCount = children.filter((c) => c.type === "tag").length;
  const sep = !hasInterleavedText && elementCount > 1 ? " " : "";

  return children
    .map((c) => inline(c, ctx))
    .join(sep)
    .replace(/[ \t]+/g, " ")
    .replace(/ ([,.;:!?])/g, "$1")
    .trim();
}

/** True when the element contains no nested block-level content. */
function isLeafBlock(el: Element): boolean {
  return !(el.children || []).some(
    (c) => c.type === "tag" && BLOCK_TAGS.has((c as Element).tagName?.toLowerCase() || "")
  );
}

function tableToMarkdown(el: Element, ctx: Ctx): string {
  const { $ } = ctx;
  const rows: string[][] = [];
  $(el)
    .find("tr")
    .each((_, tr) => {
      const cells: string[] = [];
      $(tr)
        .children("th, td")
        .each((__, cell) => {
          cells.push(inlineAll(cell.children || [], ctx).replace(/\|/g, "\\|"));
        });
      if (cells.some((c) => c)) rows.push(cells);
    });
  if (!rows.length) return "";

  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => [...r, ...Array(width - r.length).fill("")];
  const [head, ...body] = rows;
  return [
    `| ${pad(head).join(" | ")} |`,
    `| ${Array(width).fill("---").join(" | ")} |`,
    ...body.map((r) => `| ${pad(r).join(" | ")} |`),
  ].join("\n");
}

function block(node: AnyNode, ctx: Ctx, depth = 0): string[] {
  const { $ } = ctx;
  if (node.type === "text") {
    const t = squash((node as any).data || "").trim();
    return t ? [t] : [];
  }
  if (node.type !== "tag") return [];

  const el = node as Element;
  const tag = el.tagName?.toLowerCase() || "";
  const children = el.children || [];
  const descend = () => children.flatMap((c) => block(c, ctx, depth));

  if (/^h[1-6]$/.test(tag)) {
    const text = inlineAll(children, ctx);
    return text ? [`${"#".repeat(Number(tag[1]))} ${text}`] : [];
  }

  switch (tag) {
    case "hr":
      return ["---"];
    case "table": {
      const md = tableToMarkdown(el, ctx);
      return md ? [md] : [];
    }
    case "pre": {
      const code = $(el).text().replace(/\s+$/, "");
      return code.trim() ? ["```\n" + code + "\n```"] : [];
    }
    case "blockquote": {
      const inner = descend();
      return inner.length ? [inner.map((l) => `> ${l}`).join("\n> \n")] : [];
    }
    case "ul":
    case "ol": {
      const ordered = tag === "ol";
      const items: string[] = [];
      let n = 1;
      for (const c of children) {
        if (c.type !== "tag" || (c as Element).tagName?.toLowerCase() !== "li") continue;
        const li = c as Element;
        const parts = isLeafBlock(li)
          ? [inlineAll(li.children || [], ctx)]
          : block(li, ctx, depth + 1);
        const text = parts.filter(Boolean).join(" ").trim();
        if (!text) continue;
        items.push(`${"  ".repeat(depth)}${ordered ? `${n++}.` : "-"} ${text}`);
      }
      return items.length ? [items.join("\n")] : [];
    }
    case "li":
      return isLeafBlock(el) ? [inlineAll(children, ctx)].filter(Boolean) : descend();
    case "p":
      return [inlineAll(children, ctx)].filter(Boolean);
    default: {
      // A container whose children are all inline is itself a paragraph;
      // otherwise recurse so nested layout divs don't collapse into one blob.
      if (isLeafBlock(el)) {
        const text = inlineAll(children, ctx);
        return text ? [text] : [];
      }
      return descend();
    }
  }
}

export interface PageMarkdownResult {
  markdown: string;
  title: string;
}

/**
 * Fetch a rendered page and convert its content to Markdown.
 * Returns null when the page doesn't exist or has no extractable content.
 */
export async function renderPageMarkdown(
  routePath: string,
  origin: string
): Promise<PageMarkdownResult | null> {
  let html: string;
  try {
    const res = await fetch(`${origin}${routePath}`, {
      headers: {
        // Marks the request as our own so a page can distinguish it if needed,
        // and keeps it out of human-traffic analytics.
        "User-Agent": "InnerGComplete-MarkdownRenderer/1.0",
        "X-Markdown-Render": "1",
        // Without this, the self-fetch on a Deployment-Protection-guarded host
        // returns Vercel's login page and we cheerfully convert that to
        // Markdown. No-op on production, where nothing is protected.
        ...protectionBypassHeaders(origin),
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    html = await res.text();
  } catch (e) {
    console.error(`renderPageMarkdown fetch failed for ${routePath}:`, e);
    return null;
  }

  const $ = cheerio.load(html);
  const title =
    $("head > title").first().text().trim() ||
    $("h1").first().text().trim() ||
    routePath;
  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    "";

  // Pull FAQ pairs out of JSON-LD before stripping scripts — several pages
  // carry answers there that are worth stating explicitly for a crawler.
  const faqs: { q: string; a: string }[] = [];
  $('script[type="application/ld+json"]').each((_, s) => {
    try {
      const raw = JSON.parse($(s).text());
      for (const node of Array.isArray(raw) ? raw : [raw]) {
        if (node?.["@type"] !== "FAQPage") continue;
        for (const item of node.mainEntity || []) {
          const q = item?.name;
          const a = item?.acceptedAnswer?.text;
          if (q && a) faqs.push({ q: String(q), a: String(a) });
        }
      }
    } catch {
      /* a malformed block shouldn't sink the whole page */
    }
  });

  $(CHROME_SELECTORS).remove();

  // Prefer the semantic landmark. Only ~93 of ~180 pages use <main>, and for
  // the rest <body> is the right fallback: scoping to the h1's container
  // silently drops everything that is a SIBLING of the header block, which on
  // these pages is the entire table/tool. Chrome is already stripped above, so
  // body is close to page content anyway.
  let root: cheerio.Cheerio<any> = $("main").first();
  if (!root.length) root = $("body");

  const ctx: Ctx = { $, origin };
  const lines = root
    .toArray()
    .flatMap((el) => block(el as AnyNode, ctx))
    .map((l) => l.trim())
    .filter(Boolean);

  // Consecutive duplicates are usually a heading echoed in a mobile/desktop
  // pair of the same markup — keep the first, drop the repeat.
  const deduped: string[] = [];
  for (const line of lines) {
    if (deduped[deduped.length - 1] !== line) deduped.push(line);
  }

  const body = deduped.join("\n\n").trim();
  if (!body) return null;

  // Only append FAQs the page does NOT already render.
  //
  // The FAQ block is lifted from FAQPage JSON-LD, and most pages carry that
  // markup ALONGSIDE a visible "Common questions" section built from the same
  // array — so appending unconditionally printed every question twice. On the
  // California pages that was 5-7 questions repeated verbatim a few lines
  // apart, in a document whose entire audience is models reading it as
  // context.
  //
  // The block still earns its place when the JSON-LD carries answers the page
  // does not show, so this filters rather than removing the feature. Matching
  // is on a normalised question — punctuation and case stripped — because the
  // rendered DOM and the JSON-LD string routinely differ on curly quotes and
  // entities for what is the same sentence.
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const bodyNorm = normalise(body);
  const unrendered = faqs.filter((f) => !bodyNorm.includes(normalise(f.q)));

  const parts = [
    `# ${title}`,
    `Source: ${origin}${routePath}`,
    description && `> ${description}`,
    body,
    unrendered.length &&
      ["## Frequently asked questions", ...unrendered.map((f) => `### ${f.q}\n\n${f.a}`)].join("\n\n"),
  ].filter(Boolean) as string[];

  return { markdown: parts.join("\n\n") + "\n", title };
}

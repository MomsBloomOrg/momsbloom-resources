/**
 * Makes the client PDF of docs/technical-guide.md: `pnpm guide:pdf [output.pdf]`.
 * Default output: ~/Downloads/momsbloom-technical-guide.pdf (outside the public repo).
 *
 * 1. The Mermaid block becomes a PNG (mermaid-cli through npx).
 * 2. GitHub's own renderer (`gh api /markdown`) makes the HTML, so the PDF matches what GitHub shows.
 * 3. Playwright's Chromium prints it, with print CSS for page breaks.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const SOURCE = resolve(import.meta.dirname, "../docs/technical-guide.md");
const output = resolve(process.argv[2] ?? join(homedir(), "Downloads", "momsbloom-technical-guide.pdf"));
const work = mkdtempSync(join(tmpdir(), "guide-pdf-"));
const DIAGRAM = "GUIDEDIAGRAMPLACEHOLDER";

// 1. Diagram
const markdown = readFileSync(SOURCE, "utf8");
const mermaid = /```mermaid\n([\s\S]*?)```/.exec(markdown);
if (!mermaid) throw new Error("No Mermaid block in the guide.");
writeFileSync(join(work, "parts.mmd"), mermaid[1]);
execFileSync("npx", ["-y", "@mermaid-js/mermaid-cli", "-i", join(work, "parts.mmd"), "-o", join(work, "parts.png"), "-b", "white", "-s", "3"], { stdio: "inherit" });
const diagram = readFileSync(join(work, "parts.png")).toString("base64");

// 2. Markdown to HTML
const body = execFileSync("gh", ["api", "-X", "POST", "/markdown", "--input", "-"], {
  input: JSON.stringify({ text: markdown.replace(mermaid[0], DIAGRAM), mode: "gfm" }),
  encoding: "utf8",
}).replace(`<p>${DIAGRAM}</p>`, `<figure class="diagram"><img alt="Diagram of the parts" src="data:image/png;base64,${diagram}"></figure>`);
if (!body.includes("figure class=\"diagram\"")) throw new Error("The diagram placeholder was not replaced.");

const CSS = `
  @page { size: Letter; margin: 0.75in 0.75in 0.8in; }
  body { font: 10.5pt/1.45 -apple-system, "Helvetica Neue", Arial, sans-serif; color: #1f2328; }
  h1 { font-size: 19pt; margin: 0 0 6pt; }
  h2 { font-size: 15pt; border-bottom: 1px solid #d0d7de; padding-bottom: 3pt; margin: 18pt 0 8pt; }
  h3 { font-size: 12pt; margin: 14pt 0 6pt; }
  p, li { orphans: 3; widows: 3; }
  ul, ol { padding-left: 18pt; margin: 4pt 0; }
  li { margin: 2pt 0; }
  code { font: 9pt ui-monospace, Menlo, monospace; background: #f3f4f6; padding: 0 2pt; border-radius: 3px; }
  pre { background: #f6f8fa; padding: 6pt 8pt; border-radius: 4px; white-space: pre-wrap; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0; font-size: 9.5pt; }
  th, td { border: 1px solid #d0d7de; padding: 2.5pt 5pt; text-align: left; vertical-align: top; }
  th { background: #f6f8fa; }
  a { color: #0b5cad; text-decoration: none; }
  figure.diagram { margin: 6pt 0; text-align: center; }
  figure.diagram img { max-width: 100%; max-height: 8.2in; }

  /* Page flow: a heading never ends a page; keep blocks whole when they fit on one page. */
  h1, h2, h3 { break-after: avoid; }
  section.keep, table, tr, pre, figure, li { break-inside: avoid; }
  /* A long section may still break, but never right after its heading (break-after above). */
`;

// 3. Print
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}</body></html>`);
  const broken = await page.evaluate(() => {
    // GitHub's renderer gives headings no id; make GitHub's slugs so #links in the guide work.
    for (const h of document.querySelectorAll("h1, h2, h3")) {
      h.id = h.textContent.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s/g, "-");
    }
    // Wrap each h2/h3 and the blocks after it (up to the next heading) in a section kept whole.
    for (const h of [...document.querySelectorAll("h2, h3")]) {
      const section = document.createElement("section");
      section.className = "keep";
      h.before(section);
      let next = h;
      while (next && !(next !== h && /^H[1-3]$/.test(next.tagName))) {
        const after = next.nextElementSibling;
        section.append(next);
        next = after;
      }
    }
    return [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute("href")).filter((href) => !document.getElementById(href.slice(1)));
  });
  if (broken.length) throw new Error(`Links to missing headings: ${broken.join(", ")}`);

  await page.pdf({
    path: output,
    format: "Letter",
    printBackground: true,
    outline: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="font: 8pt Arial, sans-serif; color: #57606a; width: 100%; padding: 0 0.75in; display: flex; justify-content: space-between;">
      <span>MomsBloom Resource Directory: Technical Guide</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
    margin: { top: "0.75in", bottom: "0.8in", left: "0.75in", right: "0.75in" },
  });
} finally {
  await browser.close();
}
console.log(`PDF written: ${output}`);

#!/usr/bin/env node
/**
 * One-time setup for a new client site made from this template.
 *
 *   node setup.mjs
 *
 * Asks for the business name and portal slug, puts the name on the "under
 * construction" page, writes a short client README, then deletes itself.
 * Run it once, right after cloning the new repo, then commit and push.
 */
import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const rl = createInterface({ input: process.stdin, terminal: false });
const lines = rl[Symbol.asyncIterator](); // one stream of answers: works typed or piped

async function ask(question, { fallback = "", check, fix = (v) => v } = {}) {
  for (;;) {
    process.stdout.write(`${question}${fallback ? ` [${fallback}]` : ""}: `);
    const next = await lines.next();
    if (next.done) throw new Error("Setup cancelled (input ended).");
    const value = fix(String(next.value).trim() || fallback);
    const problem = check?.(value);
    if (!problem) return value;
    console.log(`  ${problem}`);
  }
}

console.log("\nNew client site setup. Press Enter to accept a suggestion in [brackets].\n");

const SITE_NAME = await ask("Business name", { check: (v) => (!v ? "Required." : null) });
const suggested = SITE_NAME.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const SLUG = await ask("Portal slug (use the same one in the portal)", {
  fallback: suggested,
  fix: (v) => v.toLowerCase(),
  check: (v) => (/^[a-z0-9][a-z0-9-]{0,39}$/.test(v) ? null : "Lowercase letters, numbers and dashes only (max 40)."),
});
rl.close();

const values = { SITE_NAME, SLUG };
const htmlEscape = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const TEXT = new Set([".html", ".css", ".js", ".txt", ".xml", ".svg"]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name === ".git" || name === "node_modules") return [];
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

let changed = 0;
for (const file of walk(root)) {
  if (!TEXT.has(extname(file))) continue;
  const before = readFileSync(file, "utf8");
  const escape = [".html", ".xml", ".svg"].includes(extname(file)) ? htmlEscape : (s) => s;
  const after = before.replace(/\{\{([A-Z_]+)\}\}/g, (m, key) => (key in values ? escape(values[key]) : m));
  if (after !== before) {
    writeFileSync(file, after);
    changed++;
  }
}

writeFileSync(
  join(root, "README.md"),
  `# ${SITE_NAME}

Hosted by Grōth. Pushing to \`main\` deploys it.

| | |
|---|---|
| Preview | https://${SLUG}.groth.io |
| Portal slug | \`${SLUG}\` |
| Contact form address | \`https://forms.groth.io/f/${SLUG}\` |

Right now the site is a Grōth "under construction" page (\`index.html\`, \`styles.css\`).
Replace them with the real site.

## Before launch
- [ ] Replace \`index.html\`, \`styles.css\` and \`favicon.svg\` with the real site
- [ ] Remove \`<meta name="robots" content="noindex">\` from every page
- [ ] Change \`robots.txt\` to allow indexing (instructions inside) and add a \`sitemap.xml\`
- [ ] Contact form: portal.groth.io → Admin → ${SITE_NAME} → Website forms →
      "Form code to paste into the site". Submit it on the preview and check the email arrives
- [ ] Page titles, descriptions and a 1200×630 \`og-image.jpg\` for link previews
`
);

unlinkSync(fileURLToPath(import.meta.url));

console.log(`
Done. Filled in ${changed} files and wrote README.md. setup.mjs has removed itself.

Next:
  1. Commit and push to main.
  2. portal.groth.io → Admin → New client
       slug:        ${SLUG}
       GitHub repo: this repo's name
  3. The "under construction" page is live at https://${SLUG}.groth.io in 1-2 minutes.
`);

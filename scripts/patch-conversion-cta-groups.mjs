/**
 * Remplace le premier bloc `.cta-group` hero par ConversionCtaPriorityGroup.
 * Usage: node scripts/patch-conversion-cta-groups.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagesRoot = join(root, "src/pages");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, acc);
    else if (name.endsWith(".astro")) acc.push(path);
  }
  return acc;
}

function importPath(fromFile) {
  const rel = relative(join(root, "src"), fromFile).replace(/\\/g, "/");
  const depth = rel.split("/").length - 1;
  return `${"../".repeat(depth)}components/ConversionCtaPriorityGroup.astro`;
}

function extractFirstCtaGroup(content) {
  const marker = '<div class="cta-group';
  const start = content.indexOf(marker);
  if (start === -1) return null;

  let depth = 0;
  let i = start;
  while (i < content.length) {
    if (content.startsWith("<div", i)) depth += 1;
    if (content.startsWith("</div>", i)) {
      depth -= 1;
      if (depth === 0) {
        return {
          start,
          end: i + "</div>".length,
          block: content.slice(start, i + "</div>".length),
        };
      }
    }
    i += 1;
  }
  return null;
}

function buildComponentTag(block, locale) {
  const buttonStyle = /btn-primary/.test(block) ? "primary" : "green";
  const phoneIcon = /UiIcon name="phone"/.test(block);
  const estimateIcon = /UiIcon name="(bolt|clipboard)"/.test(block);
  const estimateIconName = /UiIcon name="clipboard"/.test(block)
    ? "clipboard"
    : "bolt";

  const props = [
    `locale="${locale}"`,
    `buttonStyle="${buttonStyle}"`,
    phoneIcon ? "phoneIcon" : null,
    estimateIcon ? "estimateIcon" : null,
    estimateIcon && estimateIconName !== "bolt"
      ? `estimateIconName="${estimateIconName}"`
      : null,
  ].filter(Boolean);

  return `<ConversionCtaPriorityGroup ${props.join(" ")} />`;
}

function patchFile(filePath) {
  if (filePath.includes("[service].astro")) return false;
  if (filePath.includes("ConversionCtaPriorityGroup.astro")) return false;

  let content = readFileSync(filePath, "utf8");
  if (content.includes("ConversionCtaPriorityGroup")) return false;

  const extracted = extractFirstCtaGroup(content);
  if (!extracted) return false;

  const locale = filePath.replace(/\\/g, "/").includes("/en/") ? "en" : "fr";
  const componentTag = buildComponentTag(extracted.block, locale);
  const importLine = `import ConversionCtaPriorityGroup from "${importPath(filePath)}";`;

  content =
    content.slice(0, extracted.start) +
    componentTag +
    content.slice(extracted.end);

  if (!content.includes(importLine)) {
    content = content.replace(/^---\n([\s\S]*?)---/m, (match, front) => {
      if (front.includes("ConversionCtaPriorityGroup")) return match;
      return `---\n${front}${importLine}\n---`;
    });
  }

  writeFileSync(filePath, content, "utf8");
  return true;
}

const files = walk(pagesRoot).filter(
  (f) =>
    f.includes(`${join("pages", "services")}`) ||
    f.includes(`${join("pages", "en", "services")}`),
);

let patched = 0;
for (const file of files) {
  if (patchFile(file)) {
    patched += 1;
    console.log("patched", relative(root, file));
  }
}

console.log(`Done. Patched ${patched} file(s).`);

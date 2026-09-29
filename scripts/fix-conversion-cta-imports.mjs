/**
 * Ajoute l'import ConversionCtaPriorityGroup aux pages patchées sans import.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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

let fixed = 0;
for (const file of walk(join(root, "src/pages"))) {
  const content = readFileSync(file, "utf8");
  if (!content.includes("<ConversionCtaPriorityGroup")) continue;
  if (content.includes("import ConversionCtaPriorityGroup")) continue;

  const importLine = `import ConversionCtaPriorityGroup from "${importPath(file)}";`;
  const updated = content.replace(/^---\r?\n([\s\S]*?)\r?\n---/m, (match, front) => {
    return `---\n${front}${importLine}\n---`;
  });

  if (updated !== content) {
    writeFileSync(file, updated, "utf8");
    fixed += 1;
    console.log("fixed import:", relative(root, file));
  }
}

console.log(`Fixed ${fixed} file(s).`);

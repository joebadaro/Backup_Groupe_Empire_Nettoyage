import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "src");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, acc);
    else if (name.endsWith(".astro")) acc.push(path);
  }
  return acc;
}

let fixed = 0;
for (const file of walk(root)) {
  const content = readFileSync(file, "utf8");
  const updated = content.replace(
    /\.astro";import ConversionCtaPriorityGroup/g,
    '.astro";\nimport ConversionCtaPriorityGroup',
  );
  if (updated !== content) {
    writeFileSync(file, updated, "utf8");
    fixed += 1;
  }
}
console.log(`Fixed ${fixed} import line(s).`);

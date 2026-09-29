import fs from "node:fs";

const g = fs.readFileSync(
  "scripts/browser-verify-output/_gtag-G-2YKLBMPG8B.js",
  "utf8",
);
const ids = [...new Set(g.match(/(?:AW|G|GT|DC|UA)-[A-Z0-9]+/g) || [])];
const sendTo = [...new Set(g.match(/AW-\d+\/[A-Za-z0-9_-]+/g) || [])];
const blob10 = g.match(/"10":"([^"]+)"/);
const funcs = [
  ...new Set(
    [...g.matchAll(/"function":"(__[a-zA-Z0-9_]+)"/g)].map((x) => x[1]),
  ),
];

const out = {
  ids,
  sendTo,
  blob10: blob10?.[1] || null,
  funcs,
};
fs.writeFileSync(
  "scripts/browser-verify-output/gtag-destination-parse.json",
  JSON.stringify(out, null, 2),
);
console.log(JSON.stringify(out, null, 2));

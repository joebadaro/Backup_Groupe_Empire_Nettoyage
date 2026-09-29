import fs from "node:fs";

const html = fs.readFileSync("dist/index.html", "utf8");
const links = [...html.matchAll(/<link[^>]*rel="preload"[^>]*>/g)].map(
  (m) => m[0],
);
console.log("preload count", links.length);
for (const l of links) {
  if (/as="image"|hero|font/i.test(l)) {
    console.log(l.slice(0, 350));
    console.log("---");
  }
}
const idx = html.indexOf("hero-slide-2.webp");
console.log("first hero-slide-2 index contexts:");
let from = 0;
for (let i = 0; i < 5; i++) {
  const p = html.indexOf("hero-slide-2", from);
  if (p < 0) break;
  console.log(html.slice(Math.max(0, p - 80), p + 120).replace(/\s+/g, " "));
  console.log("---");
  from = p + 1;
}

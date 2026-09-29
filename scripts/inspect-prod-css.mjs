const BASE = "https://groupenettoyageempire.com";
const html = await fetch(`${BASE}/`, {
  headers: { "Cache-Control": "no-cache" },
}).then((r) => r.text());
const links = [...html.matchAll(/href="(\/_astro\/[^"]+\.css)"/g)].map((m) => m[1]);
console.log("css count", links.length);
for (const href of links) {
  const css = await fetch(`${BASE}${href}`, {
    headers: { "Cache-Control": "no-cache" },
  }).then((r) => r.text());
  console.log(href.slice(0, 60), "len", css.length, {
    has900: css.includes("900px"),
    has525: css.includes("5.25rem"),
    has275: css.includes("2.75rem"),
    heroSection: css.includes(".hero-section"),
  });
}

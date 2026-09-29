import fs from "node:fs";

const gtm = fs.readFileSync(
  "scripts/browser-verify-output/_gtm-TPKDH7S2.js",
  "utf8",
);

// Container config usually starts near beginning with tags:[{function:...
const start = gtm.indexOf('"tags":[');
const start2 = gtm.indexOf("tags:[");
const idx = start >= 0 ? start : start2;
console.log("tags idx", idx);

// Extract a large head chunk for human inspection
const head = gtm.slice(0, 25000);
fs.writeFileSync(
  "scripts/browser-verify-output/_gtm-head-25k.js",
  head,
);

// Find all __function tags
const funcs = [
  ...new Set([...gtm.matchAll(/"function":"(__[a-zA-Z0-9_]+)"/g)].map((m) => m[1])),
];
const funcCounts = {};
for (const m of gtm.matchAll(/"function":"(__[a-zA-Z0-9_]+)"/g)) {
  funcCounts[m[1]] = (funcCounts[m[1]] || 0) + 1;
}

// Extract each tag object roughly (non-greedy limited)
const tagBlocks = [];
const re = /\{"function":"(__[a-zA-Z0-9_]+)"[\s\S]*?"tag_id":(\d+)\}/g;
let m;
while ((m = re.exec(gtm)) && tagBlocks.length < 80) {
  const block = m[0];
  // Only keep if reasonably sized (real tags, not library)
  if (block.length < 5000) {
    tagBlocks.push({
      fn: m[1],
      tag_id: m[2],
      preview: block.slice(0, 800),
      len: block.length,
    });
  }
}

// Triggers
const trigFuncs = [
  ...new Set(
    [...gtm.matchAll(/"function":"(__[a-zA-Z0-9_]+)"/g)].map((x) => x[1]),
  ),
];

// Look for aw / ads conversion specific fields
const adsBits = [];
for (const pat of [
  /conversion_id[^,]{0,80}/g,
  /conversion_label[^,]{0,80}/g,
  /aw_remarketing[^,]{0,80}/g,
  /"currencyCode":"[^"]+"/g,
  /send_to[^,]{0,100}/g,
]) {
  const hits = gtm.match(pat) || [];
  adsBits.push(...hits.slice(0, 20));
}

const out = {
  funcs,
  funcCounts,
  tagBlocks,
  adsBits: [...new Set(adsBits)].slice(0, 80),
  hasAwLiteral: /AW-\d+/.test(gtm),
  hasUaLiteral: /UA-\d+-\d+/.test(gtm),
  hasDcLiteral: /DC-\d+/.test(gtm),
};

fs.writeFileSync(
  "scripts/browser-verify-output/gtm-tags-extract.json",
  JSON.stringify(out, null, 2),
);
console.log(
  JSON.stringify(
    {
      funcCounts,
      tagCount: tagBlocks.length,
      tags: tagBlocks.map((t) => ({
        fn: t.fn,
        tag_id: t.tag_id,
        preview: t.preview.slice(0, 350),
      })),
      adsBits: out.adsBits,
      hasAwLiteral: out.hasAwLiteral,
      hasUaLiteral: out.hasUaLiteral,
      hasDcLiteral: out.hasDcLiteral,
    },
    null,
    2,
  ),
);

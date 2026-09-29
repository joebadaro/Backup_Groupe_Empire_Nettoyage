import fs from "node:fs";

const gtm = fs.readFileSync(
  "scripts/browser-verify-output/_gtm-TPKDH7S2.js",
  "utf8",
);

// Find dataLayer-ish config blobs
const markers = [
  "phone_call",
  "generate_lead",
  "phone_call_mobile",
  "main_call_button_click",
  "secondary_estimate_form_click",
  "header_choice",
  "phone_popup",
  "conversion",
  "AW-",
  "send_to",
  "gtag",
  "G-",
];

const snippets = {};
for (const m of markers) {
  const idx = gtm.indexOf(m);
  if (idx < 0) {
    snippets[m] = null;
    continue;
  }
  snippets[m] = gtm.slice(Math.max(0, idx - 120), idx + m.length + 200);
}

// Extract quoted strings that look like IDs / labels / events
const strings = [...gtm.matchAll(/"([^"\\]{2,120})"/g)].map((m) => m[1]);
const interesting = strings.filter((s) =>
  /^(AW-|G-|GT-|UA-|DC-)|conversion|phone_call|generate_lead|page_view|click|form|estimate|call|lead|linker|remark/i.test(
    s,
  ),
);

// Unique interesting strings
const uniq = [...new Set(interesting)].sort();

// Look for function(__CONTAINER_ID__) style decoded JSON
const jsonish = [];
for (const m of gtm.matchAll(/\{[^{}]{0,40}"vtp_[a-zA-Z]+"[^{}]{0,200}\}/g)) {
  jsonish.push(m[0]);
}

// Broader vtp_ keys
const vtpKeys = [
  ...new Set([...gtm.matchAll(/"(vtp_[a-zA-Z0-9_]+)"/g)].map((x) => x[1])),
].sort();

const vtpSamples = {};
for (const key of vtpKeys) {
  const re = new RegExp(`"${key}":("([^"\\\\]*)"|[0-9]+|true|false)`, "g");
  const vals = [];
  let mm;
  while ((mm = re.exec(gtm)) && vals.length < 20) {
    vals.push(mm[2] ?? mm[1]);
  }
  if (vals.length) vtpSamples[key] = [...new Set(vals)];
}

// Tag type codes commonly used
const typeHits = {};
for (const t of [
  "googtag",
  "gaawe",
  "awct",
  "gclidw",
  "sp",
  "html",
  "img",
  "lcl",
  "flc",
  "fls",
  "ym",
  "bzi",
  "pntr",
  "hjtc",
  "baut",
  "paused",
]) {
  typeHits[t] = (gtm.match(new RegExp(`"type":"${t}"`, "g")) || []).length;
  if (!typeHits[t]) {
    // sometimes without quotes style
    typeHits[t] += (gtm.match(new RegExp(`type:${t}\\b`, "g")) || []).length;
  }
}

const out = {
  snippets,
  interestingStrings: uniq,
  vtpKeys,
  vtpSamples,
  typeHits,
  jsonishSample: jsonish.slice(0, 30),
};

fs.writeFileSync(
  "scripts/browser-verify-output/gtm-container-deep.json",
  JSON.stringify(out, null, 2),
);
console.log(
  JSON.stringify(
    {
      interestingStrings: uniq,
      vtpSamples,
      typeHits,
      snippetKeys: Object.fromEntries(
        Object.entries(snippets).map(([k, v]) => [k, v ? v.slice(0, 180) : null]),
      ),
    },
    null,
    2,
  ),
);

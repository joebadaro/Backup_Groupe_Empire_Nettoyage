import fs from "node:fs";

for (const label of ["A-gtm", "B-direct"]) {
  const j = JSON.parse(
    fs.readFileSync(
      `scripts/browser-verify-output/gtag-equiv-${label}.json`,
      "utf8",
    ),
  );
  const lead = j.results.find((r) => r.name === "generate_lead_fr_success_ui");
  console.log("\n==", label, "==");
  for (const s of lead.action.sample) {
    const u = s.url;
    console.log({
      en: s.en,
      tid: s.tid,
      has_demande: u.includes("demande_estimation"),
      has_estimate: u.includes("estimate_request"),
      has_form_name: u.includes("form_name"),
      has_lead_type: u.includes("lead_type"),
      // GA4 often encodes as ep.form_name / epn.
      snippet: u.replace(/%3D/g, "=").replace(/%26/g, "&").slice(0, 350),
    });
  }
}

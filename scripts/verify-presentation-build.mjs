import { readFileSync, statSync } from "fs";

function check(path, label) {
  const html = readFileSync(path, "utf8");
  const hasYtIframe = /<iframe[^>]+youtube\.com/i.test(html);
  const hasEmbedHost = html.includes("data-svp-embed-src");
  const canonical = html.match(/rel="canonical" href="([^"]+)"/);
  const hreflangs = [...html.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(
    (m) => `${m[1]} -> ${m[2]}`,
  );
  console.log(`--- ${label}`);
  console.log(`  youtube iframe initial: ${hasYtIframe}`);
  console.log(`  svp lazy embed attr: ${hasEmbedHost}`);
  console.log(`  canonical: ${canonical?.[1] ?? "missing"}`);
  console.log(`  hreflang: ${hreflangs.join(" | ")}`);
  console.log(`  VideoObject: ${html.includes("VideoObject")}`);
  console.log(`  tel CTA: ${html.includes("tel:5148939939")}`);
  console.log(`  estimate widget: ${html.includes("openEstimationWidget")}`);
}

check("dist/presentation/index.html", "FR presentation");
check("dist/en/presentation/index.html", "EN presentation");
check("dist/index.html", "FR home");
check("dist/en/index.html", "EN home");
check("dist/realisations-video/index.html", "FR gallery");

for (const f of [
  "public/images/videos/video-presentation-groupe-nettoyage-empire-fr.webp",
  "public/images/videos/video-presentation-groupe-nettoyage-empire-en.webp",
]) {
  const s = statSync(f);
  console.log(`${f}: ${s.size} bytes`);
}

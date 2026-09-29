/**
 * Poll production until presentation pages are live, then verify.
 */
const BASE = "https://groupenettoyageempire.com";
const COMMIT_MARKER = "Découvrez Groupe Nettoyage Empire";
const URLS = [
  "/presentation/",
  "/en/presentation/",
  "/",
  "/en/",
  "/realisations-video/",
  "/en/video-gallery/",
];

async function fetchStatus(path) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "follow",
    headers: { "User-Agent": "EmpireDeployVerify/1.0" },
  });
  const html = await res.text();
  return { path, status: res.status, html, url: res.url };
}

async function waitForDeploy(maxMs = 600000) {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < maxMs) {
    attempt += 1;
    const r = await fetchStatus("/presentation/");
    const live =
      r.status === 200 &&
      r.html.includes(COMMIT_MARKER) &&
      r.html.includes("qN362y2IN_0");
    console.log(
      `[${new Date().toISOString()}] attempt ${attempt}: /presentation/ -> ${r.status}, live=${live}`,
    );
    if (live) {
      return { activeAt: new Date().toISOString(), attempts: attempt };
    }
    await new Promise((resolve) => setTimeout(resolve, 20000));
  }
  throw new Error("Deploy wait timeout");
}

const deploy = await waitForDeploy();
console.log("DEPLOY_ACTIVE_AT", deploy.activeAt);

const results = [];
for (const path of URLS) {
  results.push(await fetchStatus(path));
}

for (const r of results) {
  console.log(`HTTP ${r.status} ${r.path}`);
}

const fr = results.find((r) => r.path === "/presentation/");
const en = results.find((r) => r.path === "/en/presentation/");
const frGallery = results.find((r) => r.path === "/realisations-video/");
const enGallery = results.find((r) => r.path === "/en/video-gallery/");
const frHome = results.find((r) => r.path === "/");
const enHome = results.find((r) => r.path === "/en/");

const checks = {
  frVideoId: fr?.html.includes("qN362y2IN_0"),
  enVideoId: en?.html.includes("Ayk97N_OxDQ"),
  frNoIframeBefore: !/<iframe[^>]+youtube\.com/i.test(fr?.html ?? ""),
  enNoIframeBefore: !/<iframe[^>]+youtube\.com/i.test(en?.html ?? ""),
  frCanonical: fr?.html.includes('rel="canonical" href="https://groupenettoyageempire.com/presentation/"'),
  enCanonical: en?.html.includes('rel="canonical" href="https://groupenettoyageempire.com/en/presentation/"'),
  frHreflang: fr?.html.includes('hreflang="en" href="https://groupenettoyageempire.com/en/presentation/"'),
  frThumb: fr?.html.includes("video-presentation-groupe-nettoyage-empire-fr.webp"),
  enThumb: en?.html.includes("video-presentation-groupe-nettoyage-empire-en.webp"),
  frTel: fr?.html.includes("tel:5148939939"),
  enTel: en?.html.includes("tel:5148939939"),
  frHomeTeaser: frHome?.html.includes("presentation-home-teaser"),
  enHomeTeaser: enHome?.html.includes("presentation-home-teaser"),
  frGalleryFirst: frGallery?.html.includes('href="/presentation/"') &&
    frGallery?.html.indexOf('href="/presentation/"') <
      (frGallery?.html.indexOf('data-yid="46rCcc5hGLk"') ?? 999999),
  enGalleryFirst: enGallery?.html.includes('href="/en/presentation/"') &&
    enGallery?.html.indexOf('href="/en/presentation/"') <
      (enGallery?.html.indexOf('data-yid="46rCcc5hGLk"') ?? 999999),
  frThumb200: (await fetch(`${BASE}/images/videos/video-presentation-groupe-nettoyage-empire-fr.webp`)).status === 200,
  enThumb200: (await fetch(`${BASE}/images/videos/video-presentation-groupe-nettoyage-empire-en.webp`)).status === 200,
};

console.log("CHECKS", JSON.stringify(checks, null, 2));

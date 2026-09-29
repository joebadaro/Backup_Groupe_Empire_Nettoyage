/**
 * Poll production for homepage teaser deploy verification.
 */
const BASE = "https://groupenettoyageempire.com";
const FR_BTN = "Voir la vidéo de présentation";
const EN_BTN = "Watch Our Company Video";
const OLD_FR_BTN = "Voir notre présentation";
const PAGES = ["/", "/en/", "/presentation/", "/en/presentation/", "/realisations-video/", "/en/video-gallery/"];

async function fetchHtml(path) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "follow",
    headers: { "User-Agent": "EmpireTeaserDeployVerify/1.0" },
  });
  return { path, status: res.status, html: await res.text() };
}

async function waitForDeploy(maxMs = 600000) {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < maxMs) {
    attempt += 1;
    const r = await fetchHtml("/");
    const live =
      r.status === 200 &&
      r.html.includes(FR_BTN) &&
      r.html.includes("presentation-home-teaser__card") &&
      !r.html.includes(OLD_FR_BTN);
    console.log(`[${new Date().toISOString()}] attempt ${attempt}: live=${live} status=${r.status}`);
    if (live) return { activeAt: new Date().toISOString(), attempts: attempt };
    await new Promise((resolve) => setTimeout(resolve, 20000));
  }
  throw new Error("Deploy wait timeout");
}

const deploy = await waitForDeploy();
console.log("DEPLOY_ACTIVE_AT", deploy.activeAt);

const pageResults = [];
for (const path of PAGES) {
  pageResults.push(await fetchHtml(path));
}

const frHome = pageResults.find((p) => p.path === "/");
const enHome = pageResults.find((p) => p.path === "/en/");
const frGallery = pageResults.find((p) => p.path === "/realisations-video/");
const enGallery = pageResults.find((p) => p.path === "/en/video-gallery/");

console.log(
  JSON.stringify(
    {
      deploy,
      http: pageResults.map((p) => ({ path: p.path, status: p.status })),
      frBtn: frHome?.html.includes(FR_BTN),
      enBtn: enHome?.html.includes(EN_BTN),
      frLink: frHome?.html.includes('presentation-home-teaser__card') && frHome?.html.includes('href="/presentation/"'),
      enLink: enHome?.html.includes('href="/en/presentation/"'),
      noYoutubeHome:
        !/<iframe[^>]+youtube\.com/i.test(frHome?.html ?? "") &&
        !/<iframe[^>]+youtube\.com/i.test(enHome?.html ?? ""),
      galleryFrFirst:
        (frGallery?.html.indexOf('href="/presentation/"') ?? 999999) <
        (frGallery?.html.indexOf("data-yid=") ?? 999999),
      galleryEnFirst:
        (enGallery?.html.indexOf('href="/en/presentation/"') ?? 999999) <
        (enGallery?.html.indexOf("data-yid=") ?? 999999),
    },
    null,
    2,
  ),
);

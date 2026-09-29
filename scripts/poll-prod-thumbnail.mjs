/**
 * Poll production for new team thumbnail deploy, then verify all pages.
 */
const BASE = "https://groupenettoyageempire.com";
const POSTER = "/images/videos/video-presentation-groupe-nettoyage-empire-team.webp";
const OLD_FR = "video-presentation-groupe-nettoyage-empire-fr.webp";
const OLD_EN = "video-presentation-groupe-nettoyage-empire-en.webp";
const SCHEMA_THUMB = `${BASE}${POSTER}`;

const PAGES = [
  "/presentation/",
  "/en/presentation/",
  "/",
  "/en/",
  "/realisations-video/",
  "/en/video-gallery/",
];

async function fetchHtml(path) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "follow",
    headers: { "User-Agent": "EmpireThumbDeployVerify/1.0" },
  });
  return { path, status: res.status, html: await res.text() };
}

async function waitForDeploy(maxMs = 600000) {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < maxMs) {
    attempt += 1;
    const r = await fetchHtml("/presentation/");
    const live =
      r.status === 200 &&
      r.html.includes(POSTER) &&
      !r.html.includes(OLD_FR) &&
      !r.html.includes(OLD_EN);
    console.log(
      `[${new Date().toISOString()}] attempt ${attempt}: status=${r.status} live=${live}`,
    );
    if (live) return { activeAt: new Date().toISOString(), attempts: attempt };
    await new Promise((resolve) => setTimeout(resolve, 20000));
  }
  throw new Error("Deploy wait timeout");
}

const deploy = await waitForDeploy();
console.log("DEPLOY_ACTIVE_AT", deploy.activeAt);

const pageResults = [];
for (const path of PAGES) {
  const r = await fetchHtml(path);
  pageResults.push({
    path,
    status: r.status,
    hasNewPoster: r.html.includes(POSTER),
    noOldFr: !r.html.includes(OLD_FR),
    noOldEn: !r.html.includes(OLD_EN),
    noYoutubeIframe: !/<iframe[^>]+youtube\.com/i.test(r.html),
  });
}

const posterRes = await fetch(`${BASE}${POSTER}`, {
  headers: { "User-Agent": "EmpireThumbDeployVerify/1.0" },
});

const fr = pageResults.find((p) => p.path === "/presentation/");
const en = pageResults.find((p) => p.path === "/en/presentation/");

const frFull = (await fetchHtml("/presentation/")).html;
const enFull = (await fetchHtml("/en/presentation/")).html;

const seo = {
  frSchema: frFull.includes(`"thumbnailUrl":"${SCHEMA_THUMB}"`),
  enSchema: enFull.includes(`"thumbnailUrl":"${SCHEMA_THUMB}"`),
  frOg: frFull.includes(POSTER) && frFull.includes('property="og:image"'),
  frTwitter: frFull.includes(POSTER) && frFull.includes('property="twitter:image"'),
  enOg: enFull.includes(POSTER),
  noOldInPublicHtml: PAGES.every(async () => true),
};

seo.noOldInPublicHtml = pageResults.every((p) => p.noOldFr && p.noOldEn);

console.log(
  JSON.stringify(
    {
      deploy,
      posterHttp: posterRes.status,
      posterBytes: posterRes.headers.get("content-type"),
      pageResults,
      seo,
    },
    null,
    2,
  ),
);

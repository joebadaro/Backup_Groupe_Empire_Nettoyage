const BASE = "https://groupenettoyageempire.com";

async function check(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Cache-Control": "no-cache", "User-Agent": "EmpirePostDeploy/1.0" },
  });
  const html = await res.text();
  return {
    path,
    status: res.status,
    deployHeader:
      res.headers.get("x-nf-deploy-id") ||
      res.headers.get("x-nf-request-id") ||
      null,
    canonical: (html.match(/rel="canonical" href="([^"]+)"/) || [])[1] ?? null,
    hreflangCount: (html.match(/hreflang=/g) || []).length,
    gtm: /googletagmanager\.com\/gtm\.js/i.test(html),
    headerModal: html.includes("header-choice-modal") || html.includes("HeaderChoiceModal"),
    ahPopup: html.includes("ah-phone-popup"),
    estimateForm: html.includes("estimate-request") || html.includes("EstimateRequest"),
    tel514: html.includes("5148939939") || html.includes("+15148939939"),
    sitemapInRobots: null,
  };
}

const pages = ["/", "/en/"];
for (const p of pages) {
  console.log(JSON.stringify(await check(p)));
}

const robots = await fetch(`${BASE}/robots.txt`).then((r) => r.text());
console.log("robots sitemap", robots.includes("sitemap"));

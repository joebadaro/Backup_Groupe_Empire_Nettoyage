/** Contexte page partagé pour Meta Pixel Lite (aucune dépendance réseau). */

const K_UTM = "empire_vit_utm_v1";
const K_FBCLID = "empire_meta_fbclid_v1";

export type MetaLanguage = "fr" | "en";

export interface MetaUtm {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  fbclid: string;
}

export interface MetaPageContext {
  language: MetaLanguage;
  pageType: string;
  pagePath: string;
  pageTitle: string;
  serviceName: string;
  city: string;
  utm: MetaUtm;
}

export function getLanguage(pathname = ""): MetaLanguage {
  return pathname.startsWith("/en") ? "en" : "fr";
}

export function cleanPageTitle(raw = ""): string {
  let t = raw.trim();
  const pipe = t.indexOf("|");
  if (pipe > 0) t = t.slice(0, pipe).trim();
  return t.slice(0, 120) || "Page";
}

/** Heuristique légère — pas de changement d’URL SEO. */
export function getPageType(pathname: string): string {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/" || p === "/en") return "home";
  if (p.includes("demande-estimation") || p.includes("estimate-request")) {
    return "estimate";
  }
  if (p.includes("estimation-privee")) return "estimate_private";
  if (p.includes("/contact")) return "contact";
  if (p.includes("/promotions")) return "promotions";
  if (p.includes("/realisations") || p.includes("video-gallery")) {
    return "portfolio";
  }
  if (p.includes("/conseils/") || p.includes("/en/advice")) return "blog";
  if (p.includes("/services/")) return "service";
  if (p.includes("/equipements") || p.includes("/equipment")) return "equipment";
  if (p.includes("/a-propos") || p.includes("/about")) return "about";
  return "other";
}

const CITY_SLUG_LABELS: Record<string, string> = {
  montreal: "Montréal",
  laval: "Laval",
  longueuil: "Longueuil",
  brossard: "Brossard",
  boucherville: "Boucherville",
  westmount: "Westmount",
  "saint-lambert": "Saint-Lambert",
  "saint-bruno": "Saint-Bruno-de-Montarville",
  "sainte-julie": "Sainte-Julie",
  chambly: "Chambly",
  candiac: "Candiac",
  chateauguay: "Châteauguay",
  beloeil: "Beloeil",
  "la-prairie": "La Prairie",
  "rive-sud": "Rive-Sud",
  "saint-jean": "Saint-Jean-sur-Richelieu",
};

function cityFromPath(pathname: string): string {
  const parts = pathname.toLowerCase().split("/").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const slug = parts[i];
    if (CITY_SLUG_LABELS[slug]) return CITY_SLUG_LABELS[slug];
    if (slug.startsWith("nettoyage-tapis-")) {
      const c = slug.replace("nettoyage-tapis-", "");
      if (CITY_SLUG_LABELS[c]) return CITY_SLUG_LABELS[c];
    }
    if (slug.startsWith("upholstery-cleaning-")) {
      const c = slug.replace("upholstery-cleaning-", "");
      if (CITY_SLUG_LABELS[c]) return CITY_SLUG_LABELS[c];
    }
    if (slug.startsWith("nettoyage-meubles-rembourres-")) {
      const c = slug.replace("nettoyage-meubles-rembourres-", "");
      if (CITY_SLUG_LABELS[c]) return CITY_SLUG_LABELS[c];
    }
  }
  return "";
}

export function captureMarketingParams(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(location.search);
    const fbclid = params.get("fbclid") || "";
    if (fbclid) sessionStorage.setItem(K_FBCLID, fbclid);

    if (sessionStorage.getItem(K_UTM)) return;
    const utmSource = params.get("utm_source") || "";
    const utmMedium = params.get("utm_medium") || "";
    const utmCampaign = params.get("utm_campaign") || "";
    if (utmSource || utmMedium || utmCampaign || fbclid) {
      sessionStorage.setItem(
        K_UTM,
        JSON.stringify({ utmSource, utmMedium, utmCampaign }),
      );
    }
  } catch {
    /* ignore */
  }
}

export function readUtm(): MetaUtm {
  let utmSource = "";
  let utmMedium = "";
  let utmCampaign = "";
  try {
    const raw = sessionStorage.getItem(K_UTM);
    if (raw) {
      const p = JSON.parse(raw) as {
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
      };
      utmSource = p.utmSource || "";
      utmMedium = p.utmMedium || "";
      utmCampaign = p.utmCampaign || "";
    }
    const fbclid = sessionStorage.getItem(K_FBCLID) || "";
    return { utmSource, utmMedium, utmCampaign, fbclid };
  } catch {
    return { utmSource: "", utmMedium: "", utmCampaign: "", fbclid: "" };
  }
}

export function getLastKnownCity(): string {
  try {
    return sessionStorage.getItem("empire_vit_last_city_v1")?.trim() || "";
  } catch {
    return "";
  }
}

export function getServiceNameFromDom(): string {
  if (typeof document === "undefined") return "";
  const el = document.querySelector("[data-vit-service-name]");
  return el?.getAttribute("data-vit-service-name")?.trim().slice(0, 120) || "";
}

export function buildMetaPageContext(): MetaPageContext {
  const pagePath = `${location.pathname}${location.search || ""}`.slice(0, 220);
  const pathname = location.pathname || "/";
  const city =
    cityFromPath(pathname) ||
    getLastKnownCity() ||
    "";
  const serviceName =
    getServiceNameFromDom() ||
    (getPageType(pathname) === "service" ? cleanPageTitle(document.title) : "");

  return {
    language: getLanguage(pathname),
    pageType: getPageType(pathname),
    pagePath,
    pageTitle: cleanPageTitle(document.title),
    serviceName,
    city,
    utm: readUtm(),
  };
}

/** Paramètres Meta recommandés (content_* + custom). */
export function toMetaParams(
  ctx: MetaPageContext,
  extra: Record<string, string | number | undefined> = {},
): Record<string, string> {
  const out: Record<string, string> = {
    content_name: ctx.pageTitle,
    content_category: ctx.serviceName || ctx.pageType,
    page_type: ctx.pageType,
    language: ctx.language,
  };
  if (ctx.city) out.city = ctx.city;
  if (ctx.utm.utmSource) out.utm_source = ctx.utm.utmSource;
  if (ctx.utm.utmMedium) out.utm_medium = ctx.utm.utmMedium;
  if (ctx.utm.utmCampaign) out.utm_campaign = ctx.utm.utmCampaign;
  if (ctx.utm.fbclid) out.fbclid = ctx.utm.fbclid;
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== "") out[k] = String(v);
  }
  return out;
}

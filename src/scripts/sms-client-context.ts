/**
 * Contexte trafic / page partagé pour les beacons SMS (client uniquement).
 * Indépendant du Meta Pixel.
 */

const K_UTM = "empire_vit_utm_v1";
const K_FBCLID = "empire_meta_fbclid_v1";

export interface SmsTrafficContext {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  fbclid: string;
  isMetaTraffic: boolean;
}

export function captureSmsTrafficParams(): void {
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

export function readSmsTrafficContext(): SmsTrafficContext {
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
  } catch {
    /* ignore */
  }
  const fbclid = (() => {
    try {
      return sessionStorage.getItem(K_FBCLID) || "";
    } catch {
      return "";
    }
  })();

  return {
    utmSource,
    utmMedium,
    utmCampaign,
    fbclid,
    isMetaTraffic: detectMetaTraffic(utmSource, utmMedium, fbclid),
  };
}

function detectMetaTraffic(
  utmSource: string,
  utmMedium: string,
  fbclid: string,
): boolean {
  if (fbclid) return true;
  const src = utmSource.toLowerCase();
  const med = utmMedium.toLowerCase();
  if (
    src.includes("facebook") ||
    src.includes("instagram") ||
    src === "fb" ||
    src === "ig"
  ) {
    return true;
  }
  if (med.includes("facebook") || med.includes("instagram")) return true;
  const ref = (document.referrer || "").toLowerCase();
  if (ref.includes("facebook.com") || ref.includes("instagram.com")) return true;
  if (isMetaInAppBrowser()) return true;
  return false;
}

export function isMetaInAppBrowser(): boolean {
  const ua = navigator.userAgent || "";
  const u = ua.toLowerCase();
  if (u.includes("fban/") || u.includes("fbav/") || u.includes("fb_iab")) return true;
  if (u.includes("fbios") || u.includes("[fb")) return true;
  if (u.includes("instagram") && !u.includes("externalhit")) {
    if (/iphone|ipad|android/i.test(ua)) return true;
  }
  return false;
}

export function isLikelyAutomatedClient(): boolean {
  if (navigator.webdriver) return true;
  if (document.visibilityState === "hidden") return true;
  const ua = (navigator.userAgent || "").toLowerCase();
  if (
    ua.includes("headless") ||
    ua.includes("lighthouse") ||
    ua.includes("facebookexternalhit") ||
    ua.includes("facebot")
  ) {
    return true;
  }
  return false;
}

export function isMetaRealVisitor(): boolean {
  const traffic = readSmsTrafficContext();
  if (!traffic.isMetaTraffic) return false;
  if (isMetaInAppBrowser()) return true;
  if (traffic.fbclid) return true;
  const src = traffic.utmSource.toLowerCase();
  const med = traffic.utmMedium.toLowerCase();
  if (
    src.includes("facebook") ||
    src.includes("instagram") ||
    src === "fb" ||
    src === "ig" ||
    med.includes("facebook") ||
    med.includes("instagram")
  ) {
    return true;
  }
  const ref = (document.referrer || "").toLowerCase();
  if (ref.includes("facebook.com") || ref.includes("instagram.com")) return true;
  return false;
}

export function isQuickHumanPageView(): boolean {
  return !isLikelyAutomatedClient();
}

export function formatTrafficSource(
  utmSource?: string,
  utmMedium?: string,
  referrer?: string,
): string {
  const traffic = readSmsTrafficContext();
  const src = (utmSource ?? traffic.utmSource).toLowerCase();
  const med = (utmMedium ?? traffic.utmMedium).toLowerCase();
  const ref = (referrer ?? document.referrer ?? "").toLowerCase();

  if (traffic.isMetaTraffic || traffic.fbclid) return "Meta";
  if (src === "google" && (med === "cpc" || med === "ppc" || med === "paid")) {
    return "Google Ads";
  }
  if (src.includes("google")) return "Google";
  if (src.includes("bing")) return "Bing";
  if (utmSource?.trim() || traffic.utmSource.trim()) {
    const raw = (utmSource ?? traffic.utmSource).trim();
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  if (ref.includes("google.")) return "Google";
  if (ref.includes("facebook.") || ref.includes("instagram.")) return "Meta";
  if (ref.includes("bing.")) return "Bing";
  return "Direct";
}

function cleanPageTitle(): string {
  let t = document.title || "";
  const pipe = t.indexOf("|");
  if (pipe > 0) t = t.slice(0, pipe).trim();
  return t.trim() || location.pathname || "Page";
}

export function getServiceFromPage(): string {
  const vit = document.querySelector("[data-vit-service-name]");
  const fromAttr = vit?.getAttribute("data-vit-service-name")?.trim();
  if (fromAttr) return fromAttr.slice(0, 120);
  return "";
}

export function getPageLabel(): string {
  const path = location.pathname.replace(/\/$/, "") || "/";
  const service = getServiceFromPage();
  if (service) return service;

  const labels: Record<string, string> = {
    "/": "Accueil",
    "/services": "Services",
    "/equipements": "Équipements",
    "/realisations": "Réalisations",
    "/equipe": "Équipe",
    "/a-propos": "À propos",
    "/conseils": "Conseils",
    "/produits": "Produits",
    "/contact": "Contact",
    "/demande-estimation": "Demande d'estimation gratuite",
    "/en": "Home",
    "/en/services": "Services",
    "/en/equipment": "Equipment",
    "/en/projects": "Projects",
    "/en/team": "Team",
    "/en/about": "About",
    "/en/tips": "Tips",
    "/en/products": "Products",
    "/en/contact": "Contact",
    "/en/estimate-request": "Free estimate request",
  };

  if (labels[path]) return labels[path];
  if (path.startsWith("/services/") || path.startsWith("/en/services/")) {
    return cleanPageTitle();
  }
  if (
    path.includes("-nettoyage-") ||
    path.includes("-cleaning-") ||
    /\/(montreal|laval|longueuil|quebec|gatineau|sherbrooke|trois-rivieres)/i.test(path)
  ) {
    return cleanPageTitle();
  }
  return cleanPageTitle();
}

export function trafficFieldsForPayload(): Record<string, unknown> {
  const t = readSmsTrafficContext();
  return {
    utmSource: t.utmSource,
    utmMedium: t.utmMedium,
    utmCampaign: t.utmCampaign,
    fbclid: t.fbclid,
    isMetaTraffic: t.isMetaTraffic,
    referrer: (document.referrer || "").slice(0, 300),
    trafficSource: formatTrafficSource(),
  };
}

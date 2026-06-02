/**
 * Contexte trafic / engagement partagé pour les beacons SMS (client uniquement).
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

export interface SmsEngagementSnapshot {
  dwellSeconds: number;
  scrollPx: number;
  hasClick: boolean;
  strongEngagement: boolean;
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
  const ua = navigator.userAgent || "";
  if (/fban\/|fbav\/|fb_iab|fbios|\[fb/i.test(ua)) return true;
  if (/instagram/i.test(ua) && /iphone|ipad|android/i.test(ua)) return true;
  return false;
}

/** Seuils engagement pour SMS « visiteur engagé » (rare). */
export function evaluateStrongEngagement(
  dwellMs: number,
  scrollPx: number,
  hasClick: boolean,
  isMeta: boolean,
): SmsEngagementSnapshot {
  const dwellSeconds = Math.floor(dwellMs / 1000);
  const minDwell = isMeta ? 45 : 28;
  const minScroll = isMeta ? 220 : 140;
  const deepScroll = isMeta ? 380 : 280;
  const strongEngagement =
    dwellSeconds >= minDwell &&
    scrollPx >= minScroll &&
    (hasClick || scrollPx >= deepScroll);

  return {
    dwellSeconds,
    scrollPx: Math.round(scrollPx),
    hasClick,
    strongEngagement,
  };
}

export function trafficFieldsForPayload(): Record<string, unknown> {
  const t = readSmsTrafficContext();
  return {
    utmSource: t.utmSource,
    utmMedium: t.utmMedium,
    utmCampaign: t.utmCampaign,
    fbclid: t.fbclid,
    isMetaTraffic: t.isMetaTraffic,
  };
}

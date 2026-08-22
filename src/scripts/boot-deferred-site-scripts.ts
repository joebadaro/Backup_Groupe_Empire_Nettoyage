/**
 * Charge les scripts site hors chemin critique LCP mobile.
 * Un seul point d’entrée Layout évite qu’Astro bundlise visitor-sms en script statique séparé.
 */
function loadPublicSiteScripts(): void {
  void import("./visitor-sms.ts");
  void import("./header-choice-modal.ts");
  void import("./after-hours-phone-popup.ts");
  void import("./conversion-cta-priority.ts");
}

function loadPrivateCalculatorScripts(): void {
  void import("./visitor-sms.ts");
}

export function bootDeferredSiteScripts(mode: "public" | "private"): void {
  if (mode === "private") {
    loadPrivateCalculatorScripts();
    return;
  }

  let loaded = false;
  const load = () => {
    if (loaded) return;
    loaded = true;
    loadPublicSiteScripts();
  };

  const scheduleIdle = () => {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(load, { timeout: 2500 });
    } else {
      setTimeout(load, 1);
    }
  };

  if (document.readyState === "complete") {
    scheduleIdle();
  } else {
    window.addEventListener("load", scheduleIdle, { once: true });
  }

  window.addEventListener(
    "pointerdown",
    () => {
      load();
    },
    { passive: true, capture: true, once: true },
  );
}

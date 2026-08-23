/**
 * Charge les scripts site hors chemin critique LCP mobile.
 * Injecté dynamiquement (Layout) — s’exécute au chargement du module.
 * Mode via window.__empireSiteScriptMode (currentScript est null pour type=module).
 */
declare global {
  interface Window {
    __empireSiteScriptMode?: "public" | "private";
  }
}

function loadPublicSiteScripts(): void {
  void import("./visitor-sms.ts");
  void import("./header-choice-modal.ts");
  void import("./after-hours-phone-popup.ts");
  void import("./conversion-cta-priority.ts");
}

function loadPrivateCalculatorScripts(): void {
  void import("./visitor-sms.ts");
}

const mode =
  window.__empireSiteScriptMode === "private" ||
  document.body?.dataset?.empireSiteMode === "private"
    ? "private"
    : "public";

if (mode === "private") {
  loadPrivateCalculatorScripts();
} else {
  loadPublicSiteScripts();
}

/**
 * Tiny entry: loads the full estimator only when the user opens it (dynamic import).
 * No idle preload — avoids pulling estimation-main into Lighthouse’s early navigation tree.
 */
let loadPromise: Promise<void> | null = null;

export function loadEstimationMain(): Promise<void> {
  if (!loadPromise) {
    loadPromise = import("./estimation-main.ts").then(() => {});
  }
  return loadPromise;
}

function bootstrapOpen(): void {
  void loadEstimationMain().then(() => {
    window.openEstimationWidget();
  });
}

if (typeof window !== "undefined") {
  window.openEstimationWidget = bootstrapOpen;
}

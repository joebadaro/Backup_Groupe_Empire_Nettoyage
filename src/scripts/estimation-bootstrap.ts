/**
 * Tiny entry: loads the full estimator on demand (dynamic import) so the large chunk
 * is not on the initial critical path. Idle preloads the chunk before first interaction.
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

  const idlePreload = () => {
    void loadEstimationMain();
  };
  if ("requestIdleCallback" in window) {
    requestIdleCallback(idlePreload, { timeout: 12000 });
  } else {
    setTimeout(idlePreload, 3000);
  }
}

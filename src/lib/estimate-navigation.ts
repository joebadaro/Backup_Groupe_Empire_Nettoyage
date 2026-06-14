/** Redirige vers le formulaire d'estimation (sur page, widget ou URL dédiée). */
export function navigateToEstimateForm(): void {
  const onPageForm = document.getElementById("estimate-request-form");
  if (onPageForm) {
    onPageForm.scrollIntoView({ behavior: "smooth", block: "start" });
    const firstField = onPageForm.querySelector<HTMLElement>(
      "input, select, textarea, button",
    );
    firstField?.focus({ preventScroll: true });
    return;
  }

  if (typeof window.openEstimationWidget === "function") {
    window.openEstimationWidget();
    return;
  }

  const path = window.location.pathname || "/";
  window.location.href = path.startsWith("/en")
    ? "/en/estimate-request/"
    : "/demande-estimation/";
}

declare global {
  interface Window {
    openEstimationWidget?: () => void;
  }
}

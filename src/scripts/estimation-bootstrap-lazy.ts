/**
 * Charge estimation-bootstrap.ts seulement au premier appel à openEstimationWidget.
 * Réduit le JS critique initial ; le HTML/CSS du modal restent dans le DOM.
 */
if (typeof window !== "undefined") {
  window.openEstimationWidget = function () {
    void import("./estimation-bootstrap.ts").then(() => {
      window.openEstimationWidget();
    });
  };
}

/**
 * Formulaire public demande d'estimation — aucun calcul de prix.
 */

const ENDPOINT = "/.netlify/functions/submit-estimate-request";

export function initEstimateRequestForm(form: HTMLFormElement): void {
  const floorRow = form.querySelector<HTMLElement>("[data-erf-floor-row]");
  const errBox = form.querySelector<HTMLElement>("[data-erf-error]");
  const successBox = form.querySelector<HTMLElement>("[data-erf-success]");
  const submitBtn = form.querySelector<HTMLButtonElement>('[type="submit"]');

  function setFloorVisibility(): void {
    const checked = form.querySelector<HTMLInputElement>('input[name="dwellingType"]:checked');
    const v = checked?.value ?? "";
    const needsFloor = v === "condo" || v === "appartement";
    if (floorRow) {
      floorRow.hidden = !needsFloor;
      floorRow.style.display = needsFloor ? "" : "none";
    }
    const floorInput = form.querySelector<HTMLInputElement>("#erf-floor");
    if (floorInput) {
      floorInput.required = needsFloor;
      if (!needsFloor) floorInput.value = "";
    }
  }

  form.querySelectorAll('input[name="dwellingType"]').forEach((el) => {
    el.addEventListener("change", setFloorVisibility);
  });
  setFloorVisibility();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!submitBtn) return;
    if (errBox) {
      errBox.hidden = true;
      errBox.textContent = "";
    }
    if (successBox) successBox.hidden = true;

    submitBtn.disabled = true;
    const prevLabel = submitBtn.textContent;
    submitBtn.textContent = form.getAttribute("data-sending-label") ?? "…";

    try {
      const fd = new FormData(form);
      const res = await fetch(ENDPOINT, {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      form.reset();
      setFloorVisibility();
      if (successBox) successBox.hidden = false;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : String(err);
      if (errBox) {
        errBox.textContent = msg;
        errBox.hidden = false;
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = prevLabel ?? "";
    }
  });
}

/**
 * Formulaire public demande d'estimation — aucun calcul de prix.
 */

const ENDPOINT = "/.netlify/functions/submit-estimate-request";

export function initEstimateRequestForm(form: HTMLFormElement): void {
  const floorRow = form.querySelector<HTMLElement>("[data-erf-floor-row]");
  const otherRow = form.querySelector<HTMLElement>("[data-erf-other-service-row]");
  const errBox = form.querySelector<HTMLElement>("[data-erf-error]");
  const successBox = form.querySelector<HTMLElement>("[data-erf-success]");
  const submitBtn = form.querySelector<HTMLButtonElement>('[type="submit"]');
  const locale = String(form.querySelector<HTMLInputElement>('input[name="locale"]')?.value ?? "fr");
  const isEn = locale === "en";

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

  function setOtherServiceVisibility(): void {
    const autre = form.querySelector<HTMLInputElement>(
      'input[name="services"][value="autre"]',
    );
    const checked = Boolean(autre?.checked);
    const detail = form.querySelector<HTMLInputElement>("#erf-otherServiceDetail");
    if (otherRow) {
      otherRow.hidden = !checked;
      otherRow.style.display = checked ? "" : "none";
    }
    if (detail) {
      detail.required = checked;
      if (!checked) detail.value = "";
    }
  }

  form.querySelectorAll('input[name="dwellingType"]').forEach((el) => {
    el.addEventListener("change", setFloorVisibility);
  });
  setFloorVisibility();

  form.querySelectorAll('input[name="services"]').forEach((el) => {
    el.addEventListener("change", setOtherServiceVisibility);
  });
  setOtherServiceVisibility();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!submitBtn) return;
    if (errBox) {
      errBox.hidden = true;
      errBox.textContent = "";
    }
    if (successBox) successBox.hidden = true;

    const serviceBoxes = form.querySelectorAll<HTMLInputElement>(
      'input[name="services"]:checked',
    );
    if (serviceBoxes.length === 0) {
      if (errBox) {
        errBox.textContent = isEn
          ? "Please select at least one service."
          : "Veuillez cocher au moins un service.";
        errBox.hidden = false;
      }
      return;
    }

    const autreChecked = form.querySelector<HTMLInputElement>(
      'input[name="services"][value="autre"]:checked',
    );
    const otherDetail = form
      .querySelector<HTMLInputElement>("#erf-otherServiceDetail")
      ?.value.trim();
    if (autreChecked && !otherDetail) {
      if (errBox) {
        errBox.textContent = isEn
          ? "Please specify the requested service."
          : "Veuillez préciser le service demandé.";
        errBox.hidden = false;
      }
      return;
    }

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
      setOtherServiceVisibility();
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

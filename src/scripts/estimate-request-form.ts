/**
 * Formulaire public demande d'estimation — aucun calcul de prix.
 */

const ENDPOINT = "/.netlify/functions/submit-estimate-request";

function scrollElIntoView(el: HTMLElement | null): void {
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function initEstimateRequestForm(form: HTMLFormElement): void {
  const root = form.closest(".erf-inner");
  const floorRow = form.querySelector<HTMLElement>("[data-erf-floor-row]");
  const otherRow = form.querySelector<HTMLElement>("[data-erf-other-service-row]");
  const errBox = root?.querySelector<HTMLElement>("[data-erf-error]") ?? null;
  const successBox = root?.querySelector<HTMLElement>("[data-erf-success]") ?? null;
  const formPanel = root?.querySelector<HTMLElement>("[data-erf-form-panel]") ?? null;
  const submitBtn = form.querySelector<HTMLButtonElement>('[type="submit"]');
  const locale = String(form.querySelector<HTMLInputElement>('input[name="locale"]')?.value ?? "fr");
  const isEn = locale === "en";
  const genericError =
    form.getAttribute("data-erf-error-generic")?.trim() ||
    (isEn
      ? "An error occurred. Please try again or call us directly at 514-893-9939."
      : "Une erreur est survenue. Veuillez réessayer ou nous appeler directement au 514-893-9939.");

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
        scrollElIntoView(errBox);
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
        scrollElIntoView(errBox);
      }
      return;
    }

    const prevLabel = submitBtn.textContent;
    const sendingLabel = form.getAttribute("data-sending-label") ?? "…";
    submitBtn.disabled = true;
    submitBtn.textContent = sendingLabel;

    let submissionSucceeded = false;

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

      submissionSucceeded = true;
      form.reset();
      setFloorVisibility();
      setOtherServiceVisibility();

      if (formPanel) {
        formPanel.hidden = true;
        formPanel.setAttribute("aria-hidden", "true");
      }
      if (successBox) {
        successBox.hidden = false;
        successBox.removeAttribute("aria-hidden");
        scrollElIntoView(successBox);
        successBox.focus();
      }
    } catch {
      if (errBox) {
        errBox.textContent = genericError;
        errBox.hidden = false;
        scrollElIntoView(errBox);
      }
    } finally {
      if (submissionSucceeded) {
        submitBtn.disabled = true;
        submitBtn.setAttribute("aria-disabled", "true");
        submitBtn.textContent = prevLabel ?? "";
      } else {
        submitBtn.disabled = false;
        submitBtn.removeAttribute("aria-disabled");
        submitBtn.textContent = prevLabel ?? "";
      }
    }
  });
}

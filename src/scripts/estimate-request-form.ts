/**
 * Formulaire public demande d'estimation — aucun calcul de prix.
 */

import { preparePhotoFiles } from "./estimate-request-image-compress";

const ENDPOINT = "/.netlify/functions/submit-estimate-request";

/** Ordre d’affichage des exemples (aligné sur le formulaire) */
const SERVICE_ORDER = [
  "sofa_meubles",
  "tapis",
  "matelas",
  "cuir",
  "tuiles",
  "tapis_commercial",
  "protecteur",
  "autre",
] as const;

const DESCRIPTION_PLACEHOLDER_FR: Record<string, string> = {
  sofa_meubles:
    "Exemple : nettoyage d'un sofa 3 places, d'une causeuse 2 places et d'un fauteuil 1 place. Taches visibles sur les coussins et les accoudoirs.",
  tapis:
    "Exemple : nettoyage d'un tapis 9 x 12 en laine et d'un tapis 5 x 7 synthétique. Préciser s'il y a des taches, odeurs ou zones très passantes.",
  matelas:
    "Exemple : nettoyage d'un matelas queen avec taches d'urine, odeur ou dégâts localisés. Préciser la grandeur du matelas et le type de problème.",
  cuir:
    "Exemple : nettoyage d'un sofa 3 places en cuir et d'une causeuse 2 places en cuir. Préciser si le cuir est sec, taché ou décoloré.",
  tuiles:
    "Exemple : nettoyage de tuiles et céramique sur environ 800 pi², 3 pièces au total : cuisine, passage et salle de bains.",
  tapis_commercial:
    "Exemple : nettoyage de tapis commercial d'environ 5 000 pi². Préciser le type de commerce, le nombre de pièces et les zones les plus sales.",
  protecteur:
    "Exemple : application d'un protecteur anti tache sur un sofa, des chaises ou un tapis après le nettoyage.",
  autre:
    "Exemple : décrivez le service souhaité, le nombre d'items, les dimensions approximatives et le problème principal.",
};

const DESCRIPTION_PLACEHOLDER_EN: Record<string, string> = {
  sofa_meubles:
    "Example: cleaning of a 3 seat sofa, a 2 seat loveseat and one armchair. Visible stains on cushions and armrests.",
  tapis:
    "Example: cleaning of one 9 x 12 wool rug and one 5 x 7 synthetic rug. Mention stains, odors or high traffic areas.",
  matelas:
    "Example: cleaning of a queen mattress with urine stains, odor or localized damage. Mention mattress size and the main issue.",
  cuir:
    "Example: cleaning of one 3 seat leather sofa and one 2 seat leather loveseat. Mention if the leather is dry, stained or discolored.",
  tuiles:
    "Example: tile and ceramic cleaning for about 800 sq. ft., 3 rooms total: kitchen, hallway and bathroom.",
  tapis_commercial:
    "Example: commercial carpet cleaning for about 5,000 sq. ft. Mention the type of business, number of rooms and the dirtiest areas.",
  protecteur:
    "Example: stain protector application on a sofa, chairs or a carpet after cleaning.",
  autre:
    "Example: describe the requested service, number of items, approximate dimensions and the main issue.",
};

const DESCRIPTION_PLACEHOLDER_GENERAL_FR =
  "Exemple : indiquez les items à nettoyer, les dimensions approximatives, le type de tissu ou de tapis, les taches, les odeurs et votre ville.";

const DESCRIPTION_PLACEHOLDER_GENERAL_EN =
  "Example: list the items to clean, approximate dimensions, fabric or carpet type, stains, odors and your city.";

function buildDescriptionPlaceholder(checkedServiceValues: string[], isEn: boolean): string {
  const dict = isEn ? DESCRIPTION_PLACEHOLDER_EN : DESCRIPTION_PLACEHOLDER_FR;
  const general = isEn ? DESCRIPTION_PLACEHOLDER_GENERAL_EN : DESCRIPTION_PLACEHOLDER_GENERAL_FR;
  if (checkedServiceValues.length === 0) return general;

  const ordered = SERVICE_ORDER.filter((k) => checkedServiceValues.includes(k));
  const parts = ordered.map((k) => dict[k]).filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") : general;
}

function scrollElIntoView(el: HTMLElement | null): void {
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function initEstimateRequestForm(form: HTMLFormElement): void {
  const root = form.closest(".erf-inner");
  const floorRow = form.querySelector<HTMLElement>("[data-erf-floor-row]");
  const otherRow = form.querySelector<HTMLElement>("[data-erf-other-service-row]");
  const errBox = root?.querySelector<HTMLElement>("[data-erf-error]") ?? null;
  const successFull = root?.querySelector<HTMLElement>("[data-erf-success-full]") ?? null;
  const successPartial = root?.querySelector<HTMLElement>("[data-erf-success-partial]") ?? null;
  const photoClientMsg = root?.querySelector<HTMLElement>("#erf-photo-client-msg") ?? null;
  const formPanel = root?.querySelector<HTMLElement>("[data-erf-form-panel]") ?? null;
  const submitBtn = form.querySelector<HTMLButtonElement>('[type="submit"]');
  const locale = String(form.querySelector<HTMLInputElement>('input[name="locale"]')?.value ?? "fr");
  const isEn = locale === "en";
  const genericError =
    form.getAttribute("data-erf-error-generic")?.trim() ||
    (isEn
      ? "An error occurred. Please try again or call us directly at 514-893-9939."
      : "Une erreur est survenue. Veuillez réessayer ou nous appeler directement au 514-893-9939.");

  // Progressive steps navigation
  const steps = [...form.querySelectorAll<HTMLElement>("[data-erf-step]")];
  const progressSteps = [...(root?.querySelectorAll<HTMLElement>(".erf-progress-step") ?? [])];
  const progressLine = root?.querySelector<HTMLElement>(".erf-progress-line") ?? null;

  function updateProgressBar(stepNum: number): void {
    progressSteps.forEach((stepEl) => {
      const stepVal = parseInt(stepEl.getAttribute("data-step") ?? "1", 10);
      if (stepVal <= stepNum) {
        stepEl.classList.add("active");
      } else {
        stepEl.classList.remove("active");
      }
    });
    if (progressLine) {
      // Step 1: 0%, Step 2: 50%, Step 3: 100%
      const percentage = (stepNum - 1) * 50;
      progressLine.style.width = `${percentage}%`;
    }
  }

  function showStep(stepNum: number): void {
    steps.forEach((stepPanel) => {
      const panelStep = parseInt(stepPanel.getAttribute("data-erf-step") ?? "1", 10);
      if (panelStep === stepNum) {
        stepPanel.hidden = false;
        stepPanel.style.display = "";
        stepPanel.classList.add("active");
      } else {
        stepPanel.hidden = true;
        stepPanel.style.display = "none";
        stepPanel.classList.remove("active");
      }
    });
    updateProgressBar(stepNum);
    
    // Scroll to the top of the form panel
    if (formPanel) {
      formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function validateStep(stepNum: number): boolean {
    if (stepNum === 1) {
      const nameEl = form.querySelector<HTMLInputElement>("#erf-fullName");
      const phoneEl = form.querySelector<HTMLInputElement>("#erf-phone");
      const emailEl = form.querySelector<HTMLInputElement>("#erf-email");
      
      let valid = true;
      if (nameEl && !nameEl.reportValidity()) valid = false;
      if (phoneEl && !phoneEl.reportValidity()) valid = false;
      if (emailEl && !emailEl.reportValidity()) valid = false;
      return valid;
    }
    
    if (stepNum === 2) {
      // Validate service cards
      const serviceBoxes = form.querySelectorAll<HTMLInputElement>('input[name="services"]:checked');
      if (serviceBoxes.length === 0) {
        if (errBox) {
          errBox.textContent = isEn
            ? "Please select at least one service."
            : "Veuillez cocher au moins un service.";
          errBox.hidden = false;
          errBox.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return false;
      }
      
      // Validate other service detail if checked
      const autreChecked = form.querySelector<HTMLInputElement>('input[name="services"][value="autre"]:checked');
      const otherDetail = form.querySelector<HTMLInputElement>("#erf-otherServiceDetail");
      if (autreChecked && otherDetail) {
        if (!otherDetail.reportValidity()) return false;
      }
      
      // Validate address
      const cityEl = form.querySelector<HTMLInputElement>("#erf-city");
      if (cityEl && !cityEl.reportValidity()) return false;
      
      // Validate dwelling
      const dwellingChecked = form.querySelector<HTMLInputElement>('input[name="dwellingType"]:checked');
      if (!dwellingChecked) {
        const radio = form.querySelector<HTMLInputElement>('input[name="dwellingType"]');
        if (radio) radio.reportValidity();
        return false;
      }
      
      // Validate floor
      const v = dwellingChecked.value;
      if (v === "condo" || v === "appartement") {
        const floorEl = form.querySelector<HTMLInputElement>("#erf-floor");
        if (floorEl && !floorEl.reportValidity()) return false;
      }
      
      if (errBox) {
        errBox.hidden = true;
        errBox.textContent = "";
      }
      return true;
    }
    
    return true;
  }

  // Set up next step navigation buttons
  form.querySelectorAll<HTMLButtonElement>(".erf-next-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextStepVal = parseInt(btn.getAttribute("data-next-step") ?? "1", 10);
      const currentStepVal = nextStepVal - 1;
      if (validateStep(currentStepVal)) {
        showStep(nextStepVal);
      }
    });
  });

  // Set up back navigation buttons
  form.querySelectorAll<HTMLButtonElement>(".erf-back-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const prevStepVal = parseInt(btn.getAttribute("data-prev-step") ?? "1", 10);
      showStep(prevStepVal);
    });
  });

  // Set up service card selection logic
  const serviceCards = root?.querySelectorAll<HTMLElement>(".erf-service-card") ?? [];
  serviceCards.forEach((card) => {
    const checkbox = card.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!checkbox) return;
    
    // Sync UI with initial state
    if (checkbox.checked) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }

    card.addEventListener("click", (e) => {
      // If user clicked directly on checkbox, let standard behavior handle it, but prevent double toggling
      if (e.target === checkbox) return;
      
      e.preventDefault();
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    });

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        card.classList.add("selected");
      } else {
        card.classList.remove("selected");
      }
      setOtherServiceVisibility();
      updateDescriptionPlaceholder();
    });
  });

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

  function getCheckedServiceValues(): string[] {
    return [...form.querySelectorAll<HTMLInputElement>('input[name="services"]:checked')].map(
      (el) => el.value,
    );
  }

  function updateDescriptionPlaceholder(): void {
    const ta = form.querySelector<HTMLTextAreaElement>("#erf-description");
    if (!ta) return;
    ta.placeholder = buildDescriptionPlaceholder(getCheckedServiceValues(), isEn);
  }

  form.querySelectorAll('input[name="dwellingType"]').forEach((el) => {
    el.addEventListener("change", () => {
      setFloorVisibility();
      // Style active dwelling option
      form.querySelectorAll<HTMLElement>(".erf-dwelling-option").forEach((opt) => {
        const radio = opt.querySelector<HTMLInputElement>('input[type="radio"]');
        if (radio?.checked) {
          opt.classList.add("selected");
        } else {
          opt.classList.remove("selected");
        }
      });
    });
  });
  setFloorVisibility();

  form.querySelectorAll('input[name="services"]').forEach((el) => {
    el.addEventListener("change", () => {
      setOtherServiceVisibility();
      updateDescriptionPlaceholder();
    });
  });
  setOtherServiceVisibility();
  updateDescriptionPlaceholder();

  const descField = form.querySelector<HTMLTextAreaElement>("#erf-description");
  if (descField) {
    descField.addEventListener("input", () => {
      /* Le placeholder natif disparaît dès qu’il y a du contenu ; on resynchronise si le champ est vidé. */
      if (descField.value.trim() === "") updateDescriptionPlaceholder();
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!submitBtn) return;
    if (errBox) {
      errBox.hidden = true;
      errBox.textContent = "";
    }
    if (successFull) {
      successFull.hidden = true;
      successFull.setAttribute("aria-hidden", "true");
    }
    if (successPartial) {
      successPartial.hidden = true;
      successPartial.setAttribute("aria-hidden", "true");
    }
    if (photoClientMsg) {
      photoClientMsg.hidden = true;
      photoClientMsg.textContent = "";
    }

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

    // Auto-fill description if left blank by client to satisfy backend validation
    const descriptionInput = form.querySelector<HTMLTextAreaElement>("#erf-description");
    if (descriptionInput && descriptionInput.value.trim() === "") {
      const selectedServicesText = [...serviceBoxes].map(box => {
        const card = box.closest(".erf-service-card");
        const label = card?.querySelector(".erf-card-label")?.textContent?.trim();
        return label || box.value;
      }).join(", ");
      
      descriptionInput.value = isEn 
        ? `Quote request for services: ${selectedServicesText}`
        : `Demande d'estimation pour les services : ${selectedServicesText}`;
    }

    const prevLabel = submitBtn.textContent;
    const sendingLabel = form.getAttribute("data-sending-label") ?? "…";
    submitBtn.disabled = true;
    submitBtn.textContent = sendingLabel;

    let submissionSucceeded = false;

    try {
      const photosInput = form.querySelector<HTMLInputElement>("#erf-photos");
      const { files: preparedPhotos, warnings } = await preparePhotoFiles(
        photosInput?.files ?? null,
        isEn,
      );
      if (photoClientMsg) {
        if (warnings.length > 0) {
          photoClientMsg.textContent = warnings.join("\n");
          photoClientMsg.hidden = false;
          scrollElIntoView(photoClientMsg);
        } else {
          photoClientMsg.hidden = true;
          photoClientMsg.textContent = "";
        }
      }

      const fd = new FormData(form);
      fd.delete("photos");
      for (const f of preparedPhotos) {
        fd.append("photos", f, f.name);
      }

      const res = await fetch(ENDPOINT, {
        method: "POST",
        body: fd,
      });

      let data: { ok?: boolean; error?: string; photoDelivery?: string } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        if (errBox) {
          errBox.textContent = genericError;
          errBox.hidden = false;
          scrollElIntoView(errBox);
        }
        return;
      }

      if (!res.ok || !data.ok) {
        if (errBox) {
          const serverMsg = typeof data.error === "string" && data.error.trim() ? data.error.trim() : "";
          errBox.textContent = serverMsg || genericError;
          errBox.hidden = false;
          scrollElIntoView(errBox);
        }
        return;
      }

      submissionSucceeded = true;
      form.reset();
      
      // Reset card visual state
      root?.querySelectorAll(".erf-service-card.selected").forEach((el) => {
        el.classList.remove("selected");
      });
      root?.querySelectorAll(".erf-dwelling-option.selected").forEach((el) => {
        el.classList.remove("selected");
      });

      setFloorVisibility();
      setOtherServiceVisibility();
      updateDescriptionPlaceholder();

      if (photoClientMsg) {
        photoClientMsg.hidden = true;
        photoClientMsg.textContent = "";
      }

      if (formPanel) {
        formPanel.hidden = true;
        formPanel.setAttribute("aria-hidden", "true");
      }

      const partial = data.photoDelivery === "partial";
      if (successFull && successPartial) {
        successFull.hidden = partial;
        successPartial.hidden = !partial;
      } else if (successFull) {
        successFull.hidden = false;
      }

      const showSuccess = successPartial && partial ? successPartial : successFull;
      if (showSuccess) {
        showSuccess.hidden = false;
        showSuccess.removeAttribute("aria-hidden");
        scrollElIntoView(showSuccess);
        showSuccess.focus();
      }
      
      // Reset back to step 1 panel for future requests
      showStep(1);
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

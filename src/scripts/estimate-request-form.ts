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
  const yOffset = -90; // Safe space for sticky/fixed mobile header
  const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
  window.scrollTo({ top: y, behavior: "smooth" });
}

function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function showErrorForField(fieldContainer: HTMLElement, inputEl: HTMLInputElement | HTMLTextAreaElement | null, message: string): void {
  if (!fieldContainer) return;
  
  let errEl = fieldContainer.querySelector<HTMLElement>(".erf-field-error");
  if (!errEl) {
    errEl = document.createElement("div");
    errEl.className = "erf-field-error";
    errEl.style.color = "#b71c1c";
    errEl.style.fontSize = "0.85rem";
    errEl.style.fontWeight = "600";
    errEl.style.marginTop = "6px";
    errEl.style.animation = "fadeIn 0.2s ease";
    fieldContainer.appendChild(errEl);
  }
  errEl.textContent = message;

  if (inputEl) {
    inputEl.style.borderColor = "#b71c1c";
    inputEl.style.boxShadow = "0 0 0 3px rgba(183, 28, 28, 0.12)";
  }
}

function clearErrorsForStep(stepPanel: HTMLElement): void {
  if (!stepPanel) return;
  
  stepPanel.querySelectorAll(".erf-field-error").forEach((el) => el.remove());

  stepPanel.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    "input, textarea, select"
  ).forEach((input) => {
    input.style.borderColor = "";
    input.style.boxShadow = "";
  });
}

export function initEstimateRequestForm(form: HTMLFormElement): void {
  if (form.dataset.erfInitialized === "true") return;
  form.dataset.erfInitialized = "true";

  const root = form.closest(".erf-inner") as HTMLElement | null;
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

  let updateContactPreferenceUI: () => void = () => {};

  // Progressive steps navigation
  const steps = [...form.querySelectorAll<HTMLElement>("[data-erf-step]")];
  const progressSteps = [...(root?.querySelectorAll<HTMLElement>(".erf-progress-step") ?? [])];
  const progressLine = root?.querySelector<HTMLElement>(".erf-progress-line") ?? null;
  let currentStep = 1;
  const draftStorageKey = `erf-form-draft-${locale}`;
  let draftSaveTimer: ReturnType<typeof setTimeout> | null = null;

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

  /** Désactive toute validation HTML native — seule la validation JS par étape s’applique. */
  function disableNativeValidation(): void {
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input, textarea, select",
    ).forEach((el) => {
      el.required = false;
      el.setCustomValidity("");
    });
  }

  function setStepVisibility(stepNum: number, options?: { scrollToTop?: boolean }): void {
    const scrollToTop = options?.scrollToTop ?? false;
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

    if (scrollToTop) {
      if (root) {
        scrollElIntoView(root);
      } else if (formPanel) {
        scrollElIntoView(formPanel);
      }
    }
  }

  function validateStep(stepNum: number): boolean {
    const stepPanel = steps.find((s) => parseInt(s.getAttribute("data-erf-step") ?? "1", 10) === stepNum);
    if (!stepPanel) return true;

    // Clear previous errors for this step
    clearErrorsForStep(stepPanel);

    let firstErrorField: HTMLElement | null = null;

    const setError = (fieldContainer: HTMLElement, inputEl: HTMLInputElement | HTMLTextAreaElement | null, msg: string) => {
      showErrorForField(fieldContainer, inputEl, msg);
      if (!firstErrorField) {
        firstErrorField = fieldContainer;
      }
    };

    if (stepNum === 1) {
      const nameEl = form.querySelector<HTMLInputElement>("#erf-fullName");
      const nameField = nameEl?.parentElement;
      if (nameEl && !nameEl.value.trim() && nameField) {
        setError(nameField, nameEl, isEn ? "Please enter your full name." : "Veuillez entrer votre nom complet.");
      }

      const phoneEl = form.querySelector<HTMLInputElement>("#erf-phone");
      const phoneField = phoneEl?.parentElement;
      if (phoneEl && !phoneEl.value.trim() && phoneField) {
        setError(phoneField, phoneEl, isEn ? "Please enter your phone number." : "Veuillez entrer votre numéro de téléphone.");
      }

      const emailEl = form.querySelector<HTMLInputElement>("#erf-email");
      const emailField = emailEl?.parentElement;
      if (emailEl && emailEl.value.trim() && !isValidEmail(emailEl.value) && emailField) {
        setError(emailField, emailEl, isEn ? "Please enter a valid email address." : "Veuillez entrer une adresse courriel valide.");
      }
    }

    if (stepNum === 2) {
      // Validate service cards (at least one check box must be checked)
      const serviceBoxes = form.querySelectorAll<HTMLInputElement>('input[name="services"]:checked');
      const serviceGrid = form.querySelector<HTMLElement>(".erf-services-grid");
      const serviceField = serviceGrid?.closest("fieldset");
      if (serviceBoxes.length === 0 && serviceField) {
        setError(serviceField, null, isEn ? "Please select at least one service." : "Veuillez sélectionner un service.");
      }

      // Validate other service detail if checked
      const autreChecked = form.querySelector<HTMLInputElement>('input[name="services"][value="autre"]:checked');
      const otherDetail = form.querySelector<HTMLInputElement>("#erf-otherServiceDetail");
      const otherField = form.querySelector<HTMLElement>("[data-erf-other-service-row]");
      if (autreChecked && otherDetail && !otherDetail.value.trim() && otherField) {
        setError(otherField, otherDetail, isEn ? "Please specify the requested service." : "Veuillez préciser le service demandé.");
      }

      // Validate address
      const cityEl = form.querySelector<HTMLInputElement>("#erf-city");
      const cityField = cityEl?.parentElement;
      if (cityEl && !cityEl.value.trim() && cityField) {
        setError(cityField, cityEl, isEn ? "Please enter your address or city." : "Veuillez entrer votre adresse ou votre ville.");
      }

      // Validate dwelling type
      const dwellingChecked = form.querySelector<HTMLInputElement>('input[name="dwellingType"]:checked');
      const dwellingGrid = form.querySelector<HTMLElement>(".erf-dwelling-grid");
      const dwellingField = dwellingGrid?.closest("fieldset");
      if (!dwellingChecked && dwellingField) {
        setError(dwellingField, null, isEn ? "Please select a property type." : "Veuillez sélectionner un type de logement.");
      }

      // Validate floor if dwelling is condo/apartment
      if (dwellingChecked) {
        const v = dwellingChecked.value;
        if (v === "condo" || v === "appartement") {
          const floorEl = form.querySelector<HTMLInputElement>("#erf-floor");
          const floorField = form.querySelector<HTMLElement>("[data-erf-floor-row]");
          if (floorEl && !floorEl.value.trim() && floorField) {
            setError(floorField, floorEl, isEn ? "Please indicate the floor." : "Veuillez indiquer l’étage.");
          }
        }
      }
    }

    if (stepNum === 3) {
      const contactPref = form.querySelector<HTMLInputElement>('input[name="contactPreference"]:checked');
      if (contactPref && contactPref.value === "courriel") {
        const inlineEmail = form.querySelector<HTMLInputElement>("#erf-inline-email");
        const inlineEmailField = form.querySelector<HTMLElement>("#erf-inline-email-container");
        if (inlineEmail && (!inlineEmail.value.trim() || !isValidEmail(inlineEmail.value)) && inlineEmailField) {
          setError(
            inlineEmailField,
            inlineEmail,
            isEn
              ? "Please enter your email address to receive your estimate by email."
              : "Veuillez entrer votre adresse courriel pour recevoir votre estimation par courriel."
          );
        }
      }
    }

    if (firstErrorField) {
      scrollElIntoView(firstErrorField);
      return false;
    }

    return true;
  }

  function goToStep(stepNum: number, options?: { scrollToTop?: boolean }): void {
    currentStep = stepNum;
    disableNativeValidation();
    setStepVisibility(currentStep, options);
  }

  function stayOnCurrentStepAfterError(): void {
    setStepVisibility(currentStep, { scrollToTop: false });
  }

  function collectDraft(): Record<string, unknown> {
    return {
      currentStep,
      fullName: form.querySelector<HTMLInputElement>("#erf-fullName")?.value ?? "",
      phone: form.querySelector<HTMLInputElement>("#erf-phone")?.value ?? "",
      email: form.querySelector<HTMLInputElement>("#erf-email")?.value ?? "",
      city: form.querySelector<HTMLInputElement>("#erf-city")?.value ?? "",
      floor: form.querySelector<HTMLInputElement>("#erf-floor")?.value ?? "",
      description: form.querySelector<HTMLTextAreaElement>("#erf-description")?.value ?? "",
      otherServiceDetail: form.querySelector<HTMLInputElement>("#erf-otherServiceDetail")?.value ?? "",
      services: getCheckedServiceValues(),
      dwellingType:
        form.querySelector<HTMLInputElement>('input[name="dwellingType"]:checked')?.value ?? "",
      contactPreference:
        form.querySelector<HTMLInputElement>('input[name="contactPreference"]:checked')?.value ?? "telephone",
      inlineEmail: form.querySelector<HTMLInputElement>("#erf-inline-email")?.value ?? "",
    };
  }

  function saveDraft(): void {
    try {
      sessionStorage.setItem(draftStorageKey, JSON.stringify(collectDraft()));
    } catch {
      /* quota / private mode */
    }
  }

  function scheduleDraftSave(): void {
    if (draftSaveTimer) clearTimeout(draftSaveTimer);
    draftSaveTimer = setTimeout(saveDraft, 200);
  }

  function clearDraft(): void {
    try {
      sessionStorage.removeItem(draftStorageKey);
    } catch {
      /* ignore */
    }
  }

  function restoreDraft(): void {
    try {
      const raw = sessionStorage.getItem(draftStorageKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as Record<string, unknown>;

      const setVal = (sel: string, val: unknown) => {
        const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(sel);
        if (el && typeof val === "string") el.value = val;
      };

      setVal("#erf-fullName", draft.fullName);
      setVal("#erf-phone", draft.phone);
      setVal("#erf-email", draft.email);
      setVal("#erf-city", draft.city);
      setVal("#erf-floor", draft.floor);
      setVal("#erf-description", draft.description);
      setVal("#erf-otherServiceDetail", draft.otherServiceDetail);
      setVal("#erf-inline-email", draft.inlineEmail);

      if (Array.isArray(draft.services)) {
        form.querySelectorAll<HTMLInputElement>('input[name="services"]').forEach((cb) => {
          cb.checked = draft.services.includes(cb.value);
          const card = cb.closest(".erf-service-card");
          if (card) card.classList.toggle("selected", cb.checked);
        });
      }

      if (typeof draft.dwellingType === "string" && draft.dwellingType) {
        const radio = form.querySelector<HTMLInputElement>(
          `input[name="dwellingType"][value="${draft.dwellingType}"]`,
        );
        if (radio) radio.checked = true;
      }

      if (typeof draft.contactPreference === "string" && draft.contactPreference) {
        const pref = form.querySelector<HTMLInputElement>(
          `input[name="contactPreference"][value="${draft.contactPreference}"]`,
        );
        if (pref) pref.checked = true;
      }

      setFloorVisibility();
      setOtherServiceVisibility();
      updateDescriptionPlaceholder();
      updateContactPreferenceUI();

      const step = typeof draft.currentStep === "number" ? draft.currentStep : 1;
      goToStep(Math.min(3, Math.max(1, step)), { scrollToTop: false });
    } catch {
      /* ignore corrupt draft */
    }
  }

  form.addEventListener("input", scheduleDraftSave);
  form.addEventListener("change", scheduleDraftSave);

  form.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || currentStep >= 3) return;
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.tagName === "TEXTAREA") return;
    e.preventDefault();
    const panel = steps.find(
      (s) => parseInt(s.getAttribute("data-erf-step") ?? "1", 10) === currentStep,
    );
    panel?.querySelector<HTMLButtonElement>(".erf-next-btn")?.click();
  });

  // Set up next step navigation buttons
  form.querySelectorAll<HTMLButtonElement>(".erf-next-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const nextStepVal = parseInt(btn.getAttribute("data-next-step") ?? "1", 10);
      if (!validateStep(currentStep)) {
        stayOnCurrentStepAfterError();
        saveDraft();
        return;
      }
      goToStep(nextStepVal, { scrollToTop: true });
      saveDraft();
    });
  });

  // Set up back navigation buttons
  form.querySelectorAll<HTMLButtonElement>(".erf-back-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const prevStepVal = parseInt(btn.getAttribute("data-prev-step") ?? "1", 10);
      goToStep(prevStepVal, { scrollToTop: true });
    });
  });

  disableNativeValidation();
  setStepVisibility(currentStep, { scrollToTop: false });

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
    if (floorInput && !needsFloor) {
      floorInput.value = "";
    }
    disableNativeValidation();
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
    if (detail && !checked) {
      detail.value = "";
    }
    disableNativeValidation();
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
    e.stopPropagation();
    if (!submitBtn) return;

    if (currentStep < 3) {
      if (!validateStep(currentStep)) {
        stayOnCurrentStepAfterError();
      } else {
        goToStep(currentStep + 1, { scrollToTop: true });
      }
      return;
    }

    for (let step = 1; step <= 3; step++) {
      if (!validateStep(step)) {
        if (step !== currentStep) {
          goToStep(step, { scrollToTop: false });
        } else {
          stayOnCurrentStepAfterError();
        }
        return;
      }
    }
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
      const clientName =
        (form.querySelector("#erf-fullName") as HTMLInputElement | null)?.value?.trim() ||
        "";
      window.dispatchEvent(
        new CustomEvent("empire:lead-form-submitted", {
          bubbles: true,
          detail: { clientName },
        }),
      );
      clearDraft();
      form.reset();
      
      // Reset card visual state
      root?.querySelectorAll(".erf-service-card.selected").forEach((el) => {
        el.classList.remove("selected");
      });
      root?.querySelectorAll(".erf-dwelling-option.selected").forEach((el) => {
        el.classList.remove("selected");
      });

      if (typeof updateContactPreferenceUI === "function") {
        updateContactPreferenceUI();
      }

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
      goToStep(1, { scrollToTop: false });
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

  // Set up contact preference logic
  const inlineEmailContainer = form.querySelector<HTMLElement>("#erf-inline-email-container");
  const mainEmailInput = form.querySelector<HTMLInputElement>("#erf-email");
  const inlineEmailInput = form.querySelector<HTMLInputElement>("#erf-inline-email");

  updateContactPreferenceUI = function (): void {
    const checked = form.querySelector<HTMLInputElement>('input[name="contactPreference"]:checked');
    const value = checked?.value ?? "telephone";

    // Style active option
    form.querySelectorAll<HTMLElement>(".erf-pref-option").forEach((opt) => {
      const radio = opt.querySelector<HTMLInputElement>('input[type="radio"]');
      if (radio?.checked) {
        opt.classList.add("selected");
      } else {
        opt.classList.remove("selected");
      }
    });

    if (value === "courriel") {
      if (inlineEmailContainer) {
        inlineEmailContainer.style.display = "";
      }
      if (inlineEmailInput) {
        // Sync from main email input if it has content
        if (mainEmailInput && mainEmailInput.value.trim() && !inlineEmailInput.value.trim()) {
          inlineEmailInput.value = mainEmailInput.value.trim();
        }
      }
    } else {
      if (inlineEmailContainer) {
        inlineEmailContainer.style.display = "none";
      }
      if (inlineEmailInput) {
        inlineEmailInput.setCustomValidity("");
      }
    }
    disableNativeValidation();
  };

  form.querySelectorAll('input[name="contactPreference"]').forEach((el) => {
    el.addEventListener("change", () => {
      updateContactPreferenceUI();
    });
  });

  // Bidirectional email sync
  if (mainEmailInput && inlineEmailInput) {
    mainEmailInput.addEventListener("input", () => {
      inlineEmailInput.value = mainEmailInput.value;
      inlineEmailInput.setCustomValidity("");
    });
    inlineEmailInput.addEventListener("input", () => {
      mainEmailInput.value = inlineEmailInput.value;
      inlineEmailInput.setCustomValidity("");
    });
  }

  // Initial call
  updateContactPreferenceUI();
  restoreDraft();
}

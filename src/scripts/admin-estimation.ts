import {
  formatPastedText,
  validatePastedText,
} from "../lib/adminEstimation/formatPastedText";
import {
  CONTENT_ZONE,
  FONT_FIT,
  isLetterAspectRatio,
  LETTER_TEMPLATE_IMAGE,
  OVERFLOW_MESSAGE,
  TEMPLATE_RATIO_MESSAGE,
} from "../lib/adminEstimation/template";

type AppState = "editing" | "preview";

let state: AppState = "editing";
let lastText = "";
let contentOverflows = false;
let templateRatioValid = true;
let fittedFontPt = FONT_FIT.basePt;

function ptToScreenPx(pt: number): number {
  const sheet = document.getElementById("ae-letter-sheet");
  if (!sheet || sheet.clientWidth <= 0) return (pt * 96) / 72;
  return (pt * sheet.clientWidth) / (8.5 * 72);
}

function applyFontSize(inner: HTMLElement, pt: number, forPrint: boolean): void {
  inner.style.fontSize = forPrint ? `${pt}pt` : `${ptToScreenPx(pt)}px`;
}

const form = document.getElementById("ae-form") as HTMLFormElement | null;
const textArea = document.getElementById("ae-estimation-text") as HTMLTextAreaElement | null;
const formFields = document.getElementById("ae-form-fields");
const formHeader = document.querySelector(".ae-form-header");
const previewSection = document.getElementById("ae-preview-section");
const formErrors = document.getElementById("ae-form-errors");
const templateWarning = document.getElementById("ae-template-warning");
const overflowWarning = document.getElementById("ae-overflow-warning");
const contentInner = document.getElementById("ae-content-inner");
const printContentInner = document.getElementById("ae-print-content-inner");
const btnPreview = document.getElementById("ae-btn-preview") as HTMLButtonElement | null;
const btnEdit = document.getElementById("ae-btn-edit") as HTMLButtonElement | null;
const btnReset = document.getElementById("ae-btn-reset") as HTMLButtonElement | null;
const btnPrint = document.getElementById("ae-btn-print") as HTMLButtonElement | null;

function readText(): string {
  return textArea?.value ?? "";
}

function writeText(text: string): void {
  if (textArea) textArea.value = text;
}

function showErrors(messages: string[]): void {
  if (!formErrors) return;
  if (!messages.length) {
    formErrors.hidden = true;
    formErrors.textContent = "";
    return;
  }
  formErrors.hidden = false;
  formErrors.textContent = messages.join(" ");
}

function applyContentZoneInsets(): void {
  document.querySelectorAll<HTMLElement>(".ae-content-zone").forEach((zone) => {
    zone.style.top = CONTENT_ZONE.top;
    zone.style.right = CONTENT_ZONE.right;
    zone.style.bottom = CONTENT_ZONE.bottom;
    zone.style.left = CONTENT_ZONE.left;
  });
}

function setTemplateBackgroundMode(valid: boolean): void {
  document.querySelectorAll<HTMLElement>(".ae-letter-bg").forEach((bg) => {
    bg.classList.toggle("ae-letter-bg--ratio-invalid", !valid);
  });
}

function updateTemplateWarning(): void {
  if (!templateWarning) return;
  if (templateRatioValid) {
    templateWarning.hidden = true;
    templateWarning.textContent = "";
    return;
  }
  templateWarning.hidden = false;
  templateWarning.textContent = TEMPLATE_RATIO_MESSAGE.fr;
}

function contentFits(inner: HTMLElement, zone: HTMLElement): boolean {
  return inner.scrollHeight <= zone.clientHeight + 1;
}

function fitFontSize(inner: HTMLElement, zone: HTMLElement): boolean {
  let size = FONT_FIT.basePt;
  applyFontSize(inner, size, false);

  while (!contentFits(inner, zone) && size > FONT_FIT.minPt) {
    size -= FONT_FIT.stepPt;
    applyFontSize(inner, size, false);
  }

  fittedFontPt = size;
  inner.dataset.fittedPt = String(size);
  applySpaciousLayout(inner, zone, size);
  return contentFits(inner, zone);
}

/** Texte court : exploiter l'espace sans réduire la police. */
function applySpaciousLayout(inner: HTMLElement, zone: HTMLElement, pt: number): void {
  const ratio = inner.scrollHeight / Math.max(zone.clientHeight, 1);
  const spacious = pt >= FONT_FIT.basePt - 0.01 && ratio < 0.82;
  inner.classList.toggle("ae-content-inner--spacious", spacious);
}

function syncPrintClone(): void {
  if (!contentInner || !printContentInner) return;
  printContentInner.innerHTML = contentInner.innerHTML;
  applyFontSize(printContentInner, fittedFontPt, true);
  printContentInner.classList.toggle(
    "ae-content-inner--spacious",
    contentInner.classList.contains("ae-content-inner--spacious"),
  );
}

function updatePrintButton(overflows: boolean): void {
  if (!btnPrint) return;
  btnPrint.disabled = overflows || !templateRatioValid;
  btnPrint.hidden = state !== "preview";
}

function updateOverflowUi(overflows: boolean): void {
  contentOverflows = overflows;
  if (overflowWarning) {
    overflowWarning.hidden = !overflows;
    overflowWarning.textContent = OVERFLOW_MESSAGE.fr;
  }
  updatePrintButton(overflows);
}

function renderPreview(text: string): void {
  if (!contentInner || !previewSection) return;

  const formatted = formatPastedText(text);
  contentInner.innerHTML = formatted.html;
  applyContentZoneInsets();
  updateTemplateWarning();

  previewSection.hidden = false;
  state = "preview";

  const zone = contentInner.parentElement as HTMLElement;
  void zone.offsetHeight;
  const fits = fitFontSize(contentInner, zone);
  syncPrintClone();

  updateOverflowUi(!fits);

  if (formFields) formFields.hidden = true;
  if (formHeader) (formHeader as HTMLElement).hidden = true;
  if (btnPreview) btnPreview.hidden = true;
  if (btnEdit) btnEdit.hidden = false;
  updatePrintButton(!fits);
}

function enterEditMode(): void {
  state = "editing";
  if (formFields) formFields.hidden = false;
  if (formHeader) (formHeader as HTMLElement).hidden = false;
  if (previewSection) previewSection.hidden = true;
  if (btnPreview) btnPreview.hidden = false;
  if (btnEdit) btnEdit.hidden = true;
  if (btnPrint) btnPrint.hidden = true;
  showErrors([]);
  if (overflowWarning) overflowWarning.hidden = true;
}

function resetAll(): void {
  lastText = "";
  contentOverflows = false;
  writeText("");
  fittedFontPt = FONT_FIT.basePt;
  if (contentInner) {
    contentInner.innerHTML = "";
    applyFontSize(contentInner, FONT_FIT.basePt, false);
  }
  if (printContentInner) {
    printContentInner.innerHTML = "";
    applyFontSize(printContentInner, FONT_FIT.basePt, true);
  }
  enterEditMode();
  showErrors([]);
}

function handlePrint(): void {
  if (contentOverflows || !lastText.trim() || !templateRatioValid) return;
  const printRoot = document.getElementById("ae-print-root");
  if (printRoot) printRoot.hidden = false;
  window.print();
}

async function validateTemplateImage(): Promise<void> {
  try {
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => reject(new Error("load failed"));
      img.src = LETTER_TEMPLATE_IMAGE;
    });
    templateRatioValid = isLetterAspectRatio(dims.w, dims.h);
  } catch {
    templateRatioValid = false;
  }
  setTemplateBackgroundMode(templateRatioValid);
  updateTemplateWarning();
}

function wireEvents(): void {
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = readText();
    const errors = validatePastedText(text);
    if (errors.length) {
      showErrors(errors);
      return;
    }
    showErrors([]);
    lastText = text;
    renderPreview(text);
  });

  btnEdit?.addEventListener("click", () => {
    writeText(lastText);
    enterEditMode();
  });

  btnReset?.addEventListener("click", () => {
    if (state === "preview" && lastText.trim()) {
      const ok = window.confirm("Réinitialiser le texte et l'aperçu ?");
      if (!ok) return;
    }
    resetAll();
  });

  btnPrint?.addEventListener("click", () => {
    handlePrint();
  });

  window.addEventListener("resize", () => {
    if (state !== "preview" || !lastText.trim() || !contentInner) return;
    const zone = contentInner.parentElement as HTMLElement;
    const fits = fitFontSize(contentInner, zone);
    syncPrintClone();
    updateOverflowUi(!fits);
  });
}

async function init(): Promise<void> {
  applyContentZoneInsets();
  await validateTemplateImage();
  wireEvents();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void init();
  });
} else {
  void init();
}

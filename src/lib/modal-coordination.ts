type AfterHoursController = {
  closeSilent: () => void;
  cancelTimer: () => void;
  isOpen: () => boolean;
};

let headerChoiceModalOpen = false;
let afterHoursController: AfterHoursController | null = null;

export function registerAfterHoursController(controller: AfterHoursController): void {
  afterHoursController = controller;
}

export function isHeaderChoiceModalOpen(): boolean {
  return headerChoiceModalOpen;
}

export function canAutoShowAfterHoursPopup(): boolean {
  return !headerChoiceModalOpen;
}

export function notifyHeaderChoiceModalOpening(): void {
  afterHoursController?.cancelTimer();
  if (afterHoursController?.isOpen()) {
    afterHoursController.closeSilent();
  }
  headerChoiceModalOpen = true;
  document.body.classList.add("header-choice-modal-open");
}

export function notifyHeaderChoiceModalClosed(): void {
  headerChoiceModalOpen = false;
  document.body.classList.remove("header-choice-modal-open");
}

export function notifyAfterHoursPopupOpen(): void {
  if (headerChoiceModalOpen) return;
  document.body.classList.add("ah-phone-popup-open");
}

export function notifyAfterHoursPopupClosed(): void {
  document.body.classList.remove("ah-phone-popup-open");
}

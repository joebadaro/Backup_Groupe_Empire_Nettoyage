/**
 * iOS Safari cancels tel: navigation when modal DOM is mutated in the same click gesture.
 * Track synchronously, defer close until navigation starts (page hidden / pagehide).
 */
export function trackTelClickAndDeferClose(
  onTrack: () => void,
  onClose: () => void,
): void {
  onTrack();

  let closed = false;
  const safeClose = (): void => {
    if (closed) return;
    closed = true;
    onClose();
  };

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "hidden") safeClose();
    },
    { once: true },
  );
  window.addEventListener("pagehide", safeClose, { once: true });
}

/** Focus the dialog panel — never the tel: link (iOS may require a second tap on a focused link). */
export function focusModalPanel(panel: HTMLElement): void {
  panel.focus();
}

export function bindTelCallLinkHandoff(
  link: HTMLElement | null,
  onTrack: () => void,
  onClose: () => void,
): void {
  if (!link || link.dataset.telHandoffBound === "1") return;
  link.dataset.telHandoffBound = "1";
  link.addEventListener(
    "click",
    () => {
      trackTelClickAndDeferClose(onTrack, onClose);
    },
    { passive: true },
  );
}

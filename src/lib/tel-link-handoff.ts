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

export function focusModalForKeyboard(panel: HTMLElement, callLinkId: string): void {
  const isTouchIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isTouchIOS) {
    panel.focus();
    return;
  }

  document.getElementById(callLinkId)?.focus();
}

/**
 * Scripts site publics — hors chemin critique LCP mobile.
 * Chargé UNIQUEMENT via scheduler inline (Layout) après window.load + idle
 * (ou immédiat au 1er pointerdown).
 * Imports statiques : pas de __vitePreload / preload-helper pour ce graphe.
 */
import "./visitor-sms.ts";
import "./header-choice-modal.ts";
import "./after-hours-phone-popup.ts";
import "./conversion-cta-priority.ts";

/**
 * Experimental GA4 direct (no GTM) — mirrors published GTM-TPKDH7S2 triggers.
 * Measurement ID: G-2YKLBMPG8B only. No AW- IDs.
 */
export const GA4_MEASUREMENT_ID = "G-2YKLBMPG8B";

/** Same CSS as GTM predicate for phone_call */
export const PHONE_CALL_SELECTOR = 'a[href^="tel:"], a[href^="tel:"] *';

/** Same CSS as GTM predicate for phone_call_mobile (sticky-btn may be legacy; primary-call is live) */
export const PHONE_CALL_MOBILE_SELECTOR =
  "a.sticky-btn.btn-call, a.sticky-btn.btn-call *, #header-choice-modal-primary-call, #header-choice-modal-primary-call *";

/** GTM generate_lead: element visibility on .erf-success-card when URL contains /demande-estimation/ */
export const GENERATE_LEAD_SUCCESS_SELECTOR = ".erf-success-card";
export const GENERATE_LEAD_PATH_INCLUDES = "/demande-estimation/";

export const GENERATE_LEAD_PARAMS = {
  form_name: "demande_estimation",
  lead_type: "estimate_request",
} as const;

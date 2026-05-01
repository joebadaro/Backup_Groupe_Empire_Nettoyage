/**
 * Notifications SMS « visiteur » : signal humain, une fois par session pour la visite,
 * calculateur et engagement (appel OU envoi de formulaire). Filtrage bots / hors Québec côté serveur.
 */

const TRACK_URL = "/.netlify/functions/track-visit";

const K_FIRST = "empire_sms_first_v2";
const K_CALC = "empire_sms_calc_v2";
const K_LEAD = "empire_sms_lead_v2";
const K_FORM_START = "empire_sms_form_start_v2";
const K_PAGE_COUNT = "empire_page_count_v2";
const K_CLIENT_NAME = "empire_client_display_name_v2";

/** Mettre à true pour activer un SMS séparé au premier focus dans un formulaire (spec optionnelle). */
const ENABLE_FORM_START_SMS = false;

type VisitEvent =
    | "first_visit"
    | "calculator"
    | "call_click"
    | "form_start"
    | "form_submit";

function cleanPageTitle(): string {
    let t = document.title || "";
    const pipe = t.indexOf("|");
    if (pipe > 0) t = t.slice(0, pipe).trim();
    return t.trim() || document.location.pathname || "Page";
}

function sendVisitBeacon(payload: Record<string, unknown>): void {
    const body = JSON.stringify(payload);
    try {
        if (
            typeof navigator.sendBeacon === "function" &&
            navigator.sendBeacon(
                TRACK_URL,
                new Blob([body], { type: "application/json" }),
            )
        ) {
            return;
        }
    } catch {
        /* fall through */
    }
    void fetch(TRACK_URL, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body,
    }).catch(() => {});
}

function notify(
    event: VisitEvent,
    options?: { clientName?: string; humanConfirmed?: boolean },
): void {
    const storedName = sessionStorage.getItem(K_CLIENT_NAME)?.trim();
    const clientName = options?.clientName?.trim() || storedName || undefined;
    const payload: Record<string, unknown> = {
        event,
        pageTitle: cleanPageTitle(),
        pagePath: `${location.pathname}${location.search || ""}`.slice(0, 220),
    };
    if (clientName) payload.clientName = clientName;
    if (event === "first_visit") {
        payload.humanConfirmed =
            options?.humanConfirmed !== undefined ? options.humanConfirmed : true;
    }
    sendVisitBeacon(payload);
}

function bumpPageCount(): number {
    const n = parseInt(sessionStorage.getItem(K_PAGE_COUNT) || "0", 10) + 1;
    sessionStorage.setItem(K_PAGE_COUNT, String(n));
    return n;
}

function rememberClientNameFromInputs(): void {
    const sync = (): void => {
        const a = document.getElementById("input-name") as HTMLInputElement | null;
        const b = document.getElementById("mobile-input-name") as HTMLInputElement | null;
        const v = ((a?.value || b?.value) ?? "").trim();
        if (v) sessionStorage.setItem(K_CLIENT_NAME, v);
    };
    document.addEventListener(
        "blur",
        (e) => {
            const t = e.target as HTMLElement | null;
            if (!t) return;
            if (t.id === "input-name" || t.id === "mobile-input-name") sync();
        },
        true,
    );
}

let signalDwell = false;
let signalScroll = false;
let signalClick = false;
let signalSecondPage = false;
/** Calculateur, ou (si activé) premier focus formulaire — signal humain immédiat (spec) */
let signalImmediateHuman = false;

function hasHumanSignal(): boolean {
    return (
        signalDwell ||
        signalScroll ||
        signalClick ||
        signalSecondPage ||
        signalImmediateHuman
    );
}

function trySendFirstVisit(): void {
    if (sessionStorage.getItem(K_FIRST)) return;
    if (!hasHumanSignal()) return;
    sessionStorage.setItem(K_FIRST, "1");
    notify("first_visit", { humanConfirmed: true });
}

function initHumanSignals(): void {
    const pageNum = bumpPageCount();
    if (pageNum >= 2) {
        signalSecondPage = true;
        trySendFirstVisit();
    }

    window.setTimeout(() => {
        signalDwell = true;
        trySendFirstVisit();
    }, 13_000);

    window.addEventListener(
        "scroll",
        () => {
            if (window.scrollY > 48) {
                signalScroll = true;
                trySendFirstVisit();
            }
        },
        { passive: true },
    );

    document.addEventListener(
        "click",
        () => {
            signalClick = true;
            trySendFirstVisit();
        },
        true,
    );
}

function initCalculatorOpen(): void {
    window.addEventListener("empire:estimator-open", () => {
        signalImmediateHuman = true;
        trySendFirstVisit();

        if (sessionStorage.getItem(K_CALC)) return;
        sessionStorage.setItem(K_CALC, "1");
        notify("calculator");
    });
}

function initCallClicks(): void {
    document.addEventListener(
        "click",
        (e) => {
            const el = e.target as HTMLElement | null;
            const a = el?.closest?.("a[href^='tel:']");
            if (!a) return;
            if (sessionStorage.getItem(K_LEAD)) return;
            sessionStorage.setItem(K_LEAD, "call");
            notify("call_click");
        },
        true,
    );
}

function initLeadFormSubmitted(): void {
    window.addEventListener(
        "empire:lead-form-submitted",
        ((e: CustomEvent<{ clientName?: string }>) => {
            signalImmediateHuman = true;
            trySendFirstVisit();

            if (sessionStorage.getItem(K_LEAD)) return;
            sessionStorage.setItem(K_LEAD, "form");
            const name = e.detail?.clientName?.trim();
            notify("form_submit", { clientName: name });
        }) as EventListener,
    );
}

function initFormStart(): void {
    if (!ENABLE_FORM_START_SMS) return;

    document.addEventListener(
        "focusin",
        (e) => {
            const t = e.target as HTMLElement | null;
            if (!t) return;
            const formRoot =
                t.closest("#contact-form") ||
                t.closest("#commercial-request-form") ||
                t.closest("#mobile-contact-form-container");
            if (!formRoot) return;
            if (t.tagName !== "INPUT" && t.tagName !== "TEXTAREA") return;

            signalImmediateHuman = true;
            trySendFirstVisit();

            if (sessionStorage.getItem(K_FORM_START)) return;
            sessionStorage.setItem(K_FORM_START, "1");
            notify("form_start");
        },
        true,
    );
}

function boot(): void {
    rememberClientNameFromInputs();
    initHumanSignals();
    initCalculatorOpen();
    initCallClicks();
    initLeadFormSubmitted();
    initFormStart();
}

if (typeof window !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
}

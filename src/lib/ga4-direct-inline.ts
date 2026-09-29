/**
 * Inline snippet source of truth for Layout/LandingLayout (copied as is:inline).
 * Kept here for documentation / tests — Layout embeds the runtime string.
 *
 * GTM parity:
 * - phone_call on tel: clicks
 * - phone_call_mobile on sticky-btn.btn-call / #header-choice-modal-primary-call
 * - generate_lead once when .erf-success-card becomes visible on /demande-estimation/
 */
export const GA4_DIRECT_INLINE = `
(function () {
  var MEASUREMENT_ID = 'G-2YKLBMPG8B';
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID);

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
  var first = document.getElementsByTagName('script')[0];
  first.parentNode.insertBefore(s, first);

  function closestMatch(el, selector) {
    if (!el || !el.closest) return null;
    try { return el.closest(selector); } catch (e) { return null; }
  }

  function fire(name, params) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', name, params || {});
  }

  // --- phone_call / phone_call_mobile (GTM click triggers) ---
  document.addEventListener(
    'click',
    function (e) {
      var t = e.target;
      if (!t) return;
      var telHit = closestMatch(t, 'a[href^="tel:"]');
      var mobileHit = closestMatch(
        t,
        'a.sticky-btn.btn-call, #header-choice-modal-primary-call'
      );
      if (telHit) fire('phone_call');
      if (mobileHit) fire('phone_call_mobile');
    },
    true
  );

  // --- generate_lead (GTM element visibility on .erf-success-card, path /demande-estimation/) ---
  var leadSent = false;
  function pathAllowsLead() {
    var p = (location.pathname || '');
    return p.indexOf('/demande-estimation/') !== -1 || p === '/demande-estimation';
  }

  function cardIsVisible(el) {
    if (!el || el.hasAttribute('hidden')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    var st = window.getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) {
      return false;
    }
    var r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var visibleH = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    return visibleH / r.height >= 0.99;
  }

  function tryGenerateLead() {
    if (leadSent || !pathAllowsLead()) return;
    var cards = document.querySelectorAll('.erf-success-card');
    for (var i = 0; i < cards.length; i++) {
      if (cardIsVisible(cards[i])) {
        leadSent = true;
        fire('generate_lead', {
          form_name: 'demande_estimation',
          lead_type: 'estimate_request'
        });
        return;
      }
    }
  }

  function watchLead() {
    if (!pathAllowsLead()) return;
    tryGenerateLead();
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function () { tryGenerateLead(); },
        { threshold: [0, 1] }
      );
      document.querySelectorAll('.erf-success-card').forEach(function (el) {
        io.observe(el);
      });
    }
    var mo = new MutationObserver(function () { tryGenerateLead(); });
    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'class', 'style', 'aria-hidden']
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchLead);
  } else {
    watchLead();
  }
})();
`.trim();

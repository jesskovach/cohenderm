const toggle = document.getElementById("menuToggle");
  const nav = document.getElementById("mainNav");
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  // ---- segmented controls (provider, visit preference) ----
  document.querySelectorAll(".seg").forEach(seg => {
    seg.addEventListener("click", e => {
      const btn = e.target.closest("button");
      if (!btn) return;
      seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
    });
  });


  // ===== WIRING: patient portal ===================================
  // Mass General Brigham's Epic MyChart instance. Confirm this is the
  // instance the practice's patients actually use before launch.
  const PORTAL_URL = "https://patientgateway.massgeneralbrigham.org/";
  const PORTAL_NAME = "Patient Gateway";
  // Confirm the exact self-signup path with the practice; MGB may route new
  // accounts through an activation code issued at the first visit instead.
  const PORTAL_SIGNUP_URL = "https://patientgateway.massgeneralbrigham.org/";
  document.querySelectorAll("#portalHeader, #portalNav, .portal-link").forEach(a => {
    a.href = PORTAL_URL;
  });
  document.querySelectorAll(".portal-signup").forEach(a => {
    a.href = PORTAL_SIGNUP_URL;
  });

  // ===== WIRING: cookie consent ===================================
  // Stores one value: "all" (analytics allowed) or "essential".
  // Analytics are OFF until consent is "all" AND the visitor is not on a
  // page that handles health information. HHS has taken enforcement action
  // over tracking technologies on health sites; keep this gate in place.
  const CONSENT_KEY = "sf-consent";
  const POLICY_DATE = "August 1, 2026";
  const PHI_ROUTES = ["patient-info", "account"];      // never measured
  const consentBar = document.getElementById("consentBar");

  function readConsent(){
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }
  function gpcOn(){
    return navigator.globalPrivacyControl === true;
  }
  function analyticsAllowed(){
    if (gpcOn()) return false;                          // honor GPC outright
    if (readConsent() !== "all") return false;
    const route = (location.hash.replace(/^#\/?/, "").split("#")[0]) || "home";
    if (PHI_ROUTES.includes(route)) return false;
    if (location.hash.includes("book")) return false;   // application form
    return true;
  }
  function paintConsentState(){
    const v = readConsent();
    const label = gpcOn() ? "essential only (Global Privacy Control detected)"
                : v === "all" ? "analytics allowed" : "essential only";
    document.querySelectorAll("#consentState").forEach(el => el.textContent = label);
    document.querySelectorAll(".ana-state").forEach(el => el.textContent = analyticsAllowed() ? "on" : "off");
    document.querySelectorAll(".policy-date").forEach(el => el.textContent = POLICY_DATE);
  }
  function setConsent(v){
    try { localStorage.setItem(CONSENT_KEY, v); } catch (e) {}
    consentBar.classList.remove("show");
    paintConsentState();
    // loadAnalytics() would be called here once a provider is chosen.
  }
  if (!readConsent() && !gpcOn()) consentBar.classList.add("show");
  paintConsentState();
  document.getElementById("cookieAccept")?.addEventListener("click", () => setConsent("all"));
  document.getElementById("cookieReject")?.addEventListener("click", () => setConsent("essential"));
  document.getElementById("cookieAccept2")?.addEventListener("click", () => setConsent("all"));
  document.getElementById("cookieReject2")?.addEventListener("click", () => setConsent("essential"));


  // ---- Fitzpatrick scroll bar: the page passes through all six tones as you read ----
  const toneBar = document.getElementById("toneBar");
  let toneTick = false;
  function updateToneBar(){
    toneTick = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    toneBar.style.width = max > 0 ? (window.scrollY / max * 100) + "%" : "0";
  }
  window.addEventListener("scroll", () => {
    if (!toneTick){ toneTick = true; requestAnimationFrame(updateToneBar); }
  }, { passive: true });
  window.addEventListener("resize", updateToneBar);
  updateToneBar();

  // ---- theme toggle (persists; default follows the visitor's OS setting) ----
  const themeToggle = document.getElementById("themeToggle");
  const rootEl = document.documentElement;
  function isDarkNow(){
    const t = rootEl.getAttribute("data-theme");
    return t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  function applyTheme(t){
    if (t) rootEl.setAttribute("data-theme", t);
    else rootEl.removeAttribute("data-theme");
    themeToggle.textContent = isDarkNow() ? "☀" : "☾";
    themeToggle.setAttribute("aria-label", isDarkNow() ? "Switch to light mode" : "Switch to dark mode");
  }
  let savedTheme = null;
  try { savedTheme = localStorage.getItem("sf-theme"); } catch (e) {}
  // URL override for demos/screenshots: ?theme=dark or ?theme=light
  const urlTheme = new URLSearchParams(location.search).get("theme");
  if (urlTheme === "dark" || urlTheme === "light") savedTheme = urlTheme;
  applyTheme(savedTheme);

  // Screenshot helper: ?shot=<element id> shifts that section to the top after load.
  // Uses a transform (not scroll) because headless Chrome captures at scroll position 0.
  const shotTarget = new URLSearchParams(location.search).get("shot");
  if (shotTarget) window.addEventListener("load", () => setTimeout(() => {
    const el = document.getElementById(shotTarget);
    if (el){
      const y = el.getBoundingClientRect().top + window.scrollY - 16;
      document.body.style.transform = "translateY(-" + y + "px)";
    }
  }, 500));
  themeToggle.addEventListener("click", () => {
    const next = isDarkNow() ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem("sf-theme", next); } catch (e) {}
  });

  // ---- footer year ----
  document.getElementById("year").textContent = new Date().getFullYear();

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

  // ---- photo upload (mockup: files never leave the browser) ----
  const photoDrop = document.getElementById("photoDrop");
  const photoInput = document.getElementById("photoInput");
  const photoThumbs = document.getElementById("photoThumbs");
  const MAX_PHOTOS = 4;
  const photos = [];

  function renderPhotos(){
    photoThumbs.innerHTML = "";
    photos.forEach((p, i) => {
      const t = document.createElement("div");
      t.className = "thumb";
      const img = document.createElement("img");
      img.alt = p.file.name;
      img.src = p.url;
      img.onerror = () => {
        // HEIC and other formats the browser can't decode: show the filename instead
        img.remove();
        const f = document.createElement("span");
        f.className = "fname";
        f.textContent = p.file.name;
        t.prepend(f);
      };
      const rm = document.createElement("button");
      rm.type = "button";
      rm.setAttribute("aria-label", "Remove " + p.file.name);
      rm.textContent = "×";
      rm.addEventListener("click", () => {
        URL.revokeObjectURL(p.url);
        photos.splice(i, 1);
        renderPhotos();
      });
      t.append(img, rm);
      photoThumbs.append(t);
    });
    photoDrop.style.display = photos.length >= MAX_PHOTOS ? "none" : "";
  }

  function addPhotos(files){
    for (const file of files){
      if (photos.length >= MAX_PHOTOS) break;
      if (!file.type.startsWith("image/")) continue;
      photos.push({ file, url: URL.createObjectURL(file) });
    }
    renderPhotos();
  }

  photoDrop?.addEventListener("click", () => photoInput.click());
  photoDrop?.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " "){ e.preventDefault(); photoInput.click(); }
  });
  photoInput?.addEventListener("change", () => { addPhotos(photoInput.files); photoInput.value = ""; });
  if (photoDrop) ["dragover","dragleave","drop"].forEach(ev => photoDrop.addEventListener(ev, e => {
    e.preventDefault();
    photoDrop.classList.toggle("dragover", ev === "dragover");
    if (ev === "drop") addPhotos(e.dataTransfer.files);
  }));


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

  // ===== WIRING: application form =================================
  // To go live, set APPLICATION_ENDPOINT to your form endpoint URL.
  // The form POSTs multipart FormData with fields: provider, reason,
  // name, contact, notes, and photo_1..photo_4 (image files).
  //
  // IMPORTANT — PHI: applications include medical reasons and skin
  // photos, which are protected health information. The endpoint
  // provider must be HIPAA-compliant and sign a BAA (e.g. IntakeQ,
  // Jotform HIPAA plan, Klara). A standard form service without a
  // BAA is not appropriate for this data.
  //
  // Leave "" for demo mode: nothing is sent, success is simulated.
  const APPLICATION_ENDPOINT = "";
  // ================================================================

  const apptForm = document.getElementById("apptForm");
  const isLive = APPLICATION_ENDPOINT !== "";
  const _pf = document.getElementById("photoFine");
  if (_pf) _pf.textContent = isLive
    ? "Photos are sent securely with your application."
    : "Photos stay on your device in this mockup — nothing is uploaded or stored.";

  apptForm?.addEventListener("submit", async e => {
    e.preventDefault();
    const s = document.getElementById("apptSuccess");
    const btn = apptForm.querySelector("button[type=submit]");
    const n = photos.length;
    if (isLive){
      btn.disabled = true;
      btn.textContent = "Sending…";
      const data = new FormData();
      data.append("provider", document.querySelector("#provSeg button[aria-pressed=true]").textContent);
      data.append("visit_preference", document.querySelector("#modeSeg button[aria-pressed=true]").textContent);
      data.append("reason", document.getElementById("fConcern").value);
      data.append("name", document.getElementById("fName").value);
      data.append("contact", document.getElementById("fPhone").value);
      data.append("notes", document.getElementById("fNotes").value);
      photos.forEach((p, i) => data.append("photo_" + (i + 1), p.file, p.file.name));
      try {
        const res = await fetch(APPLICATION_ENDPOINT, { method: "POST", body: data, headers: { "Accept": "application/json" } });
        if (!res.ok) throw new Error("HTTP " + res.status);
      } catch (err){
        btn.disabled = false;
        btn.textContent = "Submit application";
        s.innerHTML = "<b>Something went wrong.</b> Your application wasn't sent — please try again, or call <a href=\"tel:+17814493588\">781-449-3588</a> and we'll take it by phone.";
        s.classList.add("show");
        return;
      }
    }
    s.innerHTML = "<b>Application received" + (n ? " — with " + n + " photo" + (n > 1 ? "s" : "") : "") +
      ".</b> Rachel and the clinical team read every application personally. We'll respond by text or email — with an invitation to schedule your initial medical exam, or your place on the waitlist." +
      (isLive ? "" : " (Mockup — no application or photos were actually sent.) <a href=\"#/account\">Preview the patient account (demo) →</a>");
    s.classList.add("show");
    btn.disabled = true;
    btn.textContent = "Application received ✓";
  });

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

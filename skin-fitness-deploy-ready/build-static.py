#!/usr/bin/env python3
"""Convert the single-file Skin Fitness mockup into a deploy-ready static site.

  python3 build-static.py skin-fitness-mockup.html out/

Produces one real HTML file per route, shared CSS/JS, images as files,
per-page metadata, schema, sitemap.xml, robots.txt, and a 404.
"""
import base64, hashlib, pathlib, re, sys, html as ihtml

SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "skin-fitness-mockup.html")
OUT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "site")
ORIGIN = "https://jaycohenmd.net"

PAGES = {
  "home": ("index.html", "/",
    "Skin Fitness | Medical Dermatology in Needham, MA",
    "Medical dermatology and a structured year of skin conditioning in Needham. Healthy skin is a process. Not a procedure."),
  "method": ("method/index.html", "/method",
    "The Skin Fitness Method | Jay Cohen Dermatology",
    "Four phases, one year, measurable skin health. Rachel Cohen's published skin-conditioning framework, delivered by a medical dermatology practice."),
  "about": ("about/index.html", "/about",
    "About the Practice | Jay Cohen Dermatology, Needham MA",
    "Founded by Dr. Jay Cohen and built deliberately: board-certified dermatology, a Mohs-trained surgeon, and a published conditioning framework."),
  "providers": ("providers/index.html", "/providers",
    "Our Providers | Jay Cohen Dermatology, Needham MA",
    "Jay L. Cohen MD JD, Kerry Fike MD RPh, and Rachel Cohen NP-C DCNP. Board-certified dermatology and Mohs-trained surgical care in Needham."),
  "esthetician": ("esthetician/index.html", "/esthetician",
    "Medical Esthetician | Jay Cohen Dermatology, Needham MA",
    "Marina Kitzis, medical esthetician: facials, glycolic peels, and treatment for teen and adult acne inside a medical dermatology practice."),
  "patient-info": ("patient-info/index.html", "/patient-info",
    "Patient Information | Jay Cohen Dermatology, Needham MA",
    "Appointments, what to bring, insurance and referrals, emergencies, and office policies. Patient Gateway for secure messaging and records."),
  "services": ("services/index.html", "/services",
    "Dermatology Services | Skin Cancer, Acne, Cosmetic | Needham MA",
    "Skin cancer screening and surgery, medical dermatology for acne, rosacea, eczema and psoriasis, plus cosmetic dermatology and the Skin Fitness program."),
  "education": ("education/index.html", "/education",
    "Patient Education | Jay Cohen Dermatology, Needham MA",
    "Plain-language treatment handouts for acne, nails, dermatitis and warts, plus trusted dermatology resources from our clinical team."),
  "cookie-policy": ("cookie-policy/index.html", "/cookie-policy",
    "Cookie Policy | Jay Cohen Dermatology",
    "What this website stores on your device, why, and how to change it."),
  "pay": ("pay/index.html", "/pay",
    "Pay Your Bill | Jay Cohen Dermatology, Needham MA",
    "Pay your balance online through Rectangle Health, or by phone during office hours."),
}
NOINDEX = {"cookie-policy"}

src = SRC.read_text()

# ── images out of base64 ────────────────────────────────────────────────
(OUT / "assets/img").mkdir(parents=True, exist_ok=True)
uri_to_file, by_hash = {}, {}
for m in re.finditer(r'<img[^>]*?alt="([^"]*)"[^>]*?src="(data:image/(jpeg|png);base64,([A-Za-z0-9+/=]+))"', src):
    alt, uri, fmt, b64 = m.groups()
    raw = base64.b64decode(b64)
    h = hashlib.md5(raw).hexdigest()
    if h not in by_hash:
        slug = re.sub(r'[^a-z0-9]+', '-', alt.lower()).strip('-')[:44] or "image"
        name = f"{slug}.jpg"
        i = 2
        while (OUT / "assets/img" / name).exists():
            name = f"{slug}-{i}.jpg"; i += 1
        (OUT / "assets/img" / name).write_bytes(raw)
        by_hash[h] = name
    uri_to_file[uri] = f"/assets/img/{by_hash[h]}"
for uri, path in uri_to_file.items():
    src = src.replace(uri, path)
print(f"images: {len(by_hash)} files")

# ── split off CSS and JS ────────────────────────────────────────────────
css = re.search(r'<style>([\s\S]*?)</style>', src).group(1)
(OUT / "assets").mkdir(parents=True, exist_ok=True)
(OUT / "assets/styles.css").write_text(css.strip() + "\n")

js = re.search(r'<script>([\s\S]*?)</script>\s*$', src.strip()).group(1)
# drop the hash router: pages are real files now
js = re.sub(r'  // ---- router ----[\s\S]*?  render\(\);\n', '', js, count=1)
js = js.replace('''  toggle.addEventListener("click", () => {''',
                '''  const toggle = document.getElementById("menuToggle");
  const nav = document.getElementById("mainNav");
  toggle.addEventListener("click", () => {''')

# site.js is shared by every page, but several elements live on only one of
# them — the application form on home, the extra consent buttons on the
# cookie-policy page. Without guards the first missing element throws and
# every binding after it (theme toggle, form, tone bar) silently never
# attaches. Optional chaining on the bindings; explicit checks where a
# property is written directly.
js = re.sub(r'(document\.getElementById\("[A-Za-z0-9_]+"\))\.addEventListener\(',
            r'\1?.addEventListener(', js)
for ident in ("photoInput", "apptForm"):
    js = js.replace(f"{ident}.addEventListener(", f"{ident}?.addEventListener(")
js = js.replace('photoDrop.addEventListener(', 'photoDrop?.addEventListener(')
js = js.replace('["dragover","dragleave","drop"].forEach(ev => photoDrop?.addEventListener(',
                'if (photoDrop) ["dragover","dragleave","drop"].forEach(ev => photoDrop.addEventListener(')
js = js.replace('document.getElementById("photoFine").textContent = isLive',
                'const _pf = document.getElementById("photoFine");\n  if (_pf) _pf.textContent = isLive')
(OUT / "assets/site.js").write_text(js.strip() + "\n")

# ── shared chrome ───────────────────────────────────────────────────────
tone_bar = re.search(r'(<div class="tone-progress"[\s\S]*?</div>)', src).group(1)
announce = re.search(r'(<div class="announce">[\s\S]*?</div>)', src).group(1)
header   = re.search(r'(<header class="site">[\s\S]*?</header>)', src).group(1)
consent  = re.search(r'(<div class="consent" id="consentBar"[\s\S]*?\n</div>)', src).group(1)
footer   = re.search(r'(<footer class="site">[\s\S]*?</footer>)', src).group(1)

def rewrite_links(t):
    t = t.replace('href="#/#book"', 'href="/#book"')
    t = re.sub(r'href="#/([a-z-]+)"', r'href="/\1"', t)
    t = t.replace('href="#/"', 'href="/"')
    t = t.replace(' data-nav', '').replace(' data-route="', ' data-r="')
    return t

for part in ("tone_bar", "announce", "header", "consent", "footer"):
    globals()[part] = rewrite_links(globals()[part])

ORG_SCHEMA = f'''{{
  "@context": "https://schema.org",
  "@graph": [
    {{
      "@type": "MedicalClinic",
      "@id": "{ORIGIN}/#practice",
      "name": "Jay L. Cohen, M.D., P.C.",
      "alternateName": "Skin Fitness",
      "url": "{ORIGIN}/",
      "telephone": "+1-781-449-3588",
      "faxNumber": "+1-781-449-5474",
      "medicalSpecialty": "Dermatologic",
      "address": {{
        "@type": "PostalAddress",
        "streetAddress": "464 Hillside Ave., Suite 303",
        "addressLocality": "Needham",
        "addressRegion": "MA",
        "postalCode": "02494",
        "addressCountry": "US"
      }},
      "geo": {{ "@type": "GeoCoordinates", "latitude": 42.290807, "longitude": -71.2372525 }},
      "openingHoursSpecification": [{{
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
        "opens": "08:00", "closes": "16:00"
      }}],
      "areaServed": ["Needham, MA","Wellesley, MA","Newton, MA","Dedham, MA"],
      "sameAs": [
        "https://www.google.com/maps/search/Dr.+Jay+L.+Cohen,+MD.,P.C.+464+Hillside+Ave+Needham+MA",
        "https://www.instagram.com/fitskinrxderm/"
      ]
    }},
    {{
      "@type": "WebSite",
      "@id": "{ORIGIN}/#website",
      "name": "Skin Fitness — Jay Cohen Dermatology",
      "url": "{ORIGIN}/",
      "publisher": {{ "@id": "{ORIGIN}/#practice" }}
    }}
  ]
}}'''

PHYSICIANS = f'''{{
  "@context": "https://schema.org",
  "@graph": [
    {{ "@type": "Physician", "name": "Jay L. Cohen, MD, JD", "medicalSpecialty": "Dermatologic",
       "worksFor": {{ "@id": "{ORIGIN}/#practice" }}, "url": "{ORIGIN}/providers" }},
    {{ "@type": "Physician", "name": "Kerry Fike, MD, RPh", "medicalSpecialty": "Dermatologic",
       "worksFor": {{ "@id": "{ORIGIN}/#practice" }}, "url": "{ORIGIN}/providers" }},
    {{ "@type": "Person", "name": "Rachel Cohen, NP-C, DCNP", "jobTitle": "Dermatology Nurse Practitioner",
       "worksFor": {{ "@id": "{ORIGIN}/#practice" }}, "url": "{ORIGIN}/providers" }}
  ]
}}'''

def page_html(slug, title, desc, body, canonical, extra_schema=""):
    nav = header
    # mark the active nav item
    if slug != "home":
        nav = nav.replace(f'data-r="{slug}"', f'data-r="{slug}" aria-current="page"')
    robots = '\n  <meta name="robots" content="noindex">' if slug in NOINDEX else ""
    schema = f'\n  <script type="application/ld+json">{ORG_SCHEMA}</script>'
    if extra_schema:
        schema += f'\n  <script type="application/ld+json">{extra_schema}</script>'
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{ihtml.escape(title)}</title>
  <meta name="description" content="{ihtml.escape(desc)}">
  <link rel="canonical" href="{ORIGIN}{canonical}">{robots}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Skin Fitness — Jay Cohen Dermatology">
  <meta property="og:title" content="{ihtml.escape(title)}">
  <meta property="og:description" content="{ihtml.escape(desc)}">
  <meta property="og:url" content="{ORIGIN}{canonical}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="/assets/styles.css">{schema}
</head>
<body>
{tone_bar}
{announce}
{nav}
<main>
{body}
</main>
{consent}
{footer}
<script src="/assets/site.js"></script>
</body>
</html>
'''

# ── one file per route ──────────────────────────────────────────────────
blocks = dict(re.findall(
    r'<div class="page" id="page-([a-z-]+)">([\s\S]*?)(?=\n<!-- =+ [A-Z]|</main>)', src))
written = []
for slug, (fname, route, title, desc) in PAGES.items():
    if slug not in blocks:
        print(f"  ! missing block: {slug}")
        continue
    body = rewrite_links(f'<div class="page active" id="page-{slug}">{blocks[slug]}</div>')
    extra = PHYSICIANS if slug == "providers" else ""
    dest = OUT / fname
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(page_html(slug, title, desc, body, route, extra))
    written.append(fname)

# 404
nf = page_html("404", "Page not found | Jay Cohen Dermatology",
               "That page does not exist.", '''<div class="page active">
  <section class="page-head"><div class="wrap">
    <div class="eyebrow">404</div>
    <h1>That page doesn't exist.</h1>
    <p class="lede">The link may be out of date. Try the menu above, or call the office at
      <a href="tel:+17814493588">781-449-3588</a>.</p>
    <div class="hero-ctas"><a class="btn btn-solid" href="/">Back to the homepage</a></div>
  </div></section>
</div>''', "/404")
nf = nf.replace('<link rel="canonical"', '<meta name="robots" content="noindex">\n  <link rel="canonical"', 1)
(OUT / "404.html").write_text(nf)
written.append("404.html")

# ── sitemap + robots ────────────────────────────────────────────────────
from datetime import date
today = date.today().isoformat()
urls = "\n".join(
  f"  <url>\n    <loc>{ORIGIN}{r}</loc>\n    <lastmod>{today}</lastmod>\n  </url>"
  for s, (f, r, t, d) in PAGES.items() if s not in NOINDEX)
(OUT / "sitemap.xml").write_text(
  f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n')
(OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {ORIGIN}/sitemap.xml\n")
(OUT / "CNAME").write_text("jaycohenmd.net\n")
(OUT / ".nojekyll").write_text("")

print(f"pages: {len(written)} → {', '.join(written)}")
print(f"assets: styles.css, site.js, {len(by_hash)} images")
print(f"also: sitemap.xml, robots.txt, CNAME, .nojekyll")

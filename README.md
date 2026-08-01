# Cohen Dermatology Website Management

# Deploy

Static site. No build step, no dependencies. Upload the contents of this folder to any static host.

```
index.html              /
method/index.html       /method
about/index.html        /about
providers/index.html    /providers
esthetician/index.html  /esthetician
patient-info/index.html /patient-info
services/index.html     /services
education/index.html    /education
pay/index.html          /pay
cookie-policy/index.html /cookie-policy   (noindex)
404.html
assets/styles.css
assets/site.js
assets/img/            9 photos
sitemap.xml  robots.txt  CNAME  .nojekyll
```

Directory-style URLs, so `/services` resolves identically on GitHub Pages, Netlify, Cloudflare Pages, S3, and nginx. No host-specific rewrite rules needed.

## GitHub Pages

1. Create a repo, commit everything in this folder at the root.
2. Settings → Pages → Source: **Deploy from a branch** → `main` / `root`.
3. Settings → Pages → Custom domain: `jaycohenmd.net` (the `CNAME` file already declares it).
4. At the domain registrar, point DNS at GitHub:
   - Four `A` records for the apex: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - One `CNAME` for `www` → `<username>.github.io`
5. Wait for DNS, then tick **Enforce HTTPS**.

Note: DNS currently points at Canva. Changing it takes the Canva site offline — cut over deliberately, not mid-day.

## Before launch

**1. The application form does not submit anywhere.** In `assets/site.js`, `APPLICATION_ENDPOINT` is `""` (demo mode: it simulates success). Applications carry medical reasons and skin photos, which are PHI. The endpoint must be a HIPAA-compliant service with a signed BAA — IntakeQ, Jotform's HIPAA plan, Klara. A standard form service is not acceptable here.

Alternative: delete the form and point that button at Patient Gateway, which is already the protected channel for everything clinical.

**2. Confirm the eight `ASSUMPTION` claims.** Search the HTML files. Each marks something needing Rachel's sign-off — the January 2027 date, the waitlist policy, "medical concerns are prioritized in review," the testimonial placeholders, telehealth scope, and two clinical phrasings.

**3. Testimonials are placeholders.** Written in the design's voice, not real patient quotes. Replace with real, permissioned reviews or delete the section.

**4. Verify the Patient Gateway URL** is the instance this practice's patients actually use. `PORTAL_URL` in `assets/site.js` drives all five portal links.

**5. Photography.** Three clinical photos are licensed Canva Pro stock. Four headshots came from the old site and are low-resolution — fine at card size, first thing to upgrade.

## After launch

1. Search Console → add `jaycohenmd.net` → verify by **DNS TXT**.
2. Submit `sitemap.xml`.
3. Test the homepage and `/providers` at `search.google.com/test/rich-results` — `MedicalClinic` and `Physician` schema should both parse.
4. URL Inspection → Request indexing on the homepage.
5. Add the site to the Google Business Profile, and add the Business Profile URL to the `sameAs` array in the schema block (in each page's `<head>`).

## Rebuilding

This folder was generated from the single-file mockup by `build-static.py`:

```bash
python3 build-static.py skin-fitness-mockup.html site/
```

Edit the mockup and re-run to regenerate everything, or edit these files directly — they are plain HTML and there is no build requirement.

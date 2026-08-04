# Jay Cohen Dermatology

The practice website for Jay L. Cohen, M.D., P.C. — 464 Hillside Ave., Suite 303, Needham, MA.

**Built, but not live on purpose.** It is staged at
<https://cohenderm.kovachconsultants.workers.dev> while the practice decides.
`jaycohenmd.net` still serves the old Canva site and its DNS is deliberately
unpointed — don't point it at anything.

---

## Do not edit the files at the repo root

Every `.html` file here is **generated**. A rebuild overwrites them without
warning. The only files you should ever edit by hand live in `_source/`.

```
_source/mockup.html            source of truth for the whole site
_source/build-static.py        splits it into the deployed pages
_source/skin-fitness-full.html preserved Skin Fitness build (see below)
```

## Build

```bash
cd _source
python3 build-static.py mockup.html ../_build
# copy _build/* over the repo root, excluding _source/, README.md, .git/, .assetsignore
cd .. && git add -A && git commit -m "..." && git push
```

Pushing to `main` auto-deploys in about a minute. The host is a **Cloudflare
Worker with static assets**, connected to this repo through the Cloudflare
dashboard. There is no build step on Cloudflare's side — it serves the repo
as-is, which is why the built files are committed.

`_source/` is excluded from what the Worker serves via `.assetsignore`
(verified: it 404s).

> **Rebuild before assuming the deployed files match the source.** They have
> drifted before. Build to a temp directory and diff against the repo root.

## Pages

```
/               homepage (About is merged in here)
/providers/     Jay Cohen MD JD · Kerry Fike MD RPh · Rachel Cohen NP-C DCNP
/esthetician/   Marina Kitzis
/patient-info/  appointments, insurance, policies, new-patient process
/services/      medical, cosmetic, telehealth
/education/     patient handouts + resource organisations
/pay/           Rectangle Health
/cookie-policy/ noindex
404.html
```

Directory-style URLs with trailing slashes. The host 307s bare paths to the
slashed form, so **every internal link, canonical, sitemap entry and schema
`url` uses the trailing slash.** Keep it that way.

`/about/` and `/method/` no longer exist. `_redirects` 301s both to `/`
(verified working).

## The two switches

Both live at the top of `_source/build-static.py`.

### `DEMO`

```python
DEMO = True
```

While true, every page carries `<meta name="robots" content="noindex">` and the
footer keeps its "Design concept — for review. Not a live medical site." notice.
Setting it to `False` removes **both together** — that is the point of one
switch, so they cannot fall out of step at launch.

`robots.txt` deliberately stays `Allow: /` so crawlers can reach the pages and
read the noindex. Disallowing the crawl would hide it.

**At launch:** flip to `False`, rebuild, push, then point the domain.

### `BOOKING_URL`

```python
BOOKING_URL = ""
```

Empty: all eleven booking controls read "Call to book" and dial the office, and
the booking copy says online booking isn't live yet. Set: they read "Book
online", point at the vendor, and open in a new tab.

**The booking form must never live on this origin.** A new-patient form collects
a name plus the fact that someone is seeking care, which is PHI because it
concerns *future* treatment. Cloudflare only signs BAAs with Enterprise
customers, so the form stays at the vendor and is reached cross-origin. There
are zero same-origin form actions in this build and it should stay that way.

IntakeQ includes the BAA at every tier ($29.90/mo at low volume). Jotform gates
HIPAA behind Gold ($99–129/mo).

## Other wiring

| Constant | Purpose |
|---|---|
| `PORTAL_URL` | MGB Patient Gateway. Confirmed with the office — the practice charts in Epic MyChart and this is their instance. |
| `ORIGIN` | `https://jaycohenmd.net` — canonicals and sitemap. |

## The Skin Fitness build

This site was originally built as "Skin Fitness," a branded program site around
Rachel Cohen's published framework. It was repositioned to a plain practice site
in August 2026. That work was **not deleted**:

- `_source/skin-fitness-full.html` — the complete original build, preserved
- <https://github.com/jesskovach/cohenderm-method> — it now has its own site

The only Skin Fitness references remaining here are Rachel's credential lines on
the Providers page, which cite her real peer-reviewed paper. Those are
credentials, not positioning.

## Build-time checks

`build-static.py` refuses to write a page whose `<section>` tags don't balance.
An unclosed section silently nests everything after it, so a dark band bleeds
its text colour onto light ones — which shipped once and made a third of the
homepage unreadable.

## Before launch

1. Flip `DEMO` to `False` and rebuild.
2. **Telehealth** is described on Services and Patient Info for a service the
   practice does not currently offer. Build it or strip it.
3. Confirm the practice still wants the "Now accepting new patients" line if
   their books ever close.
4. Point DNS. Changing it takes the Canva site offline — cut over deliberately.

## After launch

1. Search Console → add `jaycohenmd.net` → verify by DNS TXT.
2. Submit `sitemap.xml`.
3. Test `/` and `/providers/` at <https://search.google.com/test/rich-results> —
   `MedicalClinic` and `Physician` should both parse.
4. Make hours, address format and phone match **character-for-character** across
   Google, Vitals, Healthgrades, WebMD and Yelp. Inconsistent listings suppress
   local ranking, and this is the highest-value item on the list.
5. Add the Business Profile URL to the schema `sameAs` array.

Hours are Mon–Fri 8:00 a.m.–4:00 p.m., confirmed with the office.

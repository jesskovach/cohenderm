# Source

`mockup.html` is the single-file source of truth for the whole site.
`build-static.py` splits it into the deployed static pages.

```bash
cd _source
python3 build-static.py mockup.html ../_build
```

Then copy `_build/` over the repo root (excluding `_source/`, `README.md`,
`.git/`) and push. The Cloudflare Worker redeploys automatically.

Edit `mockup.html`, never the built pages — a rebuild overwrites them.

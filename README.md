# Document Redactor

Document Redactor is a privacy-first PDF redaction prototype that runs directly in the browser. It now uses a worker-first two-lane pipeline:

- Searchable pages stay on a native PDF text lane powered by Pyodide + PyMuPDF.
- Scanned or image-heavy pages fall back to OCR with Tesseract.js.

The review UI stays responsive because the heavy extraction, OCR, preview rendering, and export work happen off the main thread.

## Stack

- Astro + React
- Tailwind CSS
- Zustand
- Pyodide
- PyMuPDF
- Tesseract.js
- pdf-lib

## Runtime architecture

- `/` is the landing page.
- `/redact` hosts the interactive redaction tool.
- `src/workers/redactor.worker.ts` is the processing boundary for PDF load, page classification, OCR, previews, detection, and export.
- Detection is rules-only in this release: email, phone, URL, IBAN, card-like patterns, dates, IDs, large numbers, and custom keywords.

## Export behavior

- Default export path: true PDF redaction with PyMuPDF redact annotations and applied redactions
- Backup path: explicit flattened fallback export if true redaction fails on a malformed or unsupported document
- Manual review remains required before export

## Privacy notes

- Document contents are processed locally in the browser.
- Google Analytics loads with denied-by-default consent mode settings so the site can respect consent choices consistently. Document contents are not sent to Google Analytics.
- Pyodide, PyMuPDF, and OCR runtime assets are synced into `public/` during install so the deployed app does not depend on runtime third-party asset fetches.
- Detection is assistive only. Review every suggestion before export.

## Local development

```sh
pnpm install
pnpm dev
```

Useful commands:

```sh
pnpm test
pnpm build
pnpm check:styles
pnpm exec tsc --noEmit
```

`pnpm install` runs `scripts/sync-runtime-assets.mjs`, which copies or downloads the required Pyodide, PyMuPDF, and Tesseract assets into `public/`.

## Deployment

The project includes a GitHub Pages workflow in `.github/workflows/deploy.yml`.

- Push to `main`
- Enable GitHub Pages with the GitHub Actions source
- The workflow runs `actions/configure-pages@v5` before build and passes the resolved Pages `origin` and `base_path` into Astro, so project-page repos automatically build under `/<repo>/`
- User or org sites such as `https://<account>.github.io/` build at the root path automatically
- For a custom domain, add `public/CNAME` with your domain and configure the domain in the repository Pages settings; the workflow-provided `origin` will be used for the Astro `site` value during deploy

## MVP constraints

- PDF only for ingestion
- 25 MB max file size
- 30 page max document size
- English OCR assets ship with the app; extra OCR languages can be auto-selected from searchable text and fetched on demand when needed
- Review-first workflow with no auto-export

## UI styling

- Use Tailwind utilities, semantic theme tokens, and shared variant-based components for presentation.
- Do not add inline presentation styles in React or Astro templates.
- Runtime geometry values are allowed only at rendering boundaries such as viewer overlays, zoom, and progress indicators.

# docs-reader

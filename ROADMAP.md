# ROADMAP.md - Document Redactor

## Current architecture

The app now ships with:

- Astro landing/docs surface plus a React app route at `/app`
- A dedicated worker-first processing pipeline
- Two PDF lanes:
  - searchable text pages via PyMuPDF extraction
  - scanned pages via OCR
- Rules-only detection
- True PDF redaction as the primary export path
- Explicit flattened fallback export when true redaction fails

## Near-term follow-ups

- Improve OCR quality and page capability messaging
- Add richer bulk review actions beyond identical-match grouping
- Add progress cancellation and worker reset polish
- Expand automated browser-level integration coverage for the worker pipeline
- Profile large-document memory usage on mid-range devices

## Planned next steps

- Multilingual OCR asset support
- Saved keyword presets
- Better malformed-PDF diagnostics and recovery UX
- Search-preserving reporting or audit artifacts for reviewed exports
- Local entity detection as an explicitly optional later layer, not part of the default MVP path

## Longer-term exploration

- Image upload outside PDFs
- Plain text file ingestion
- Metadata cleaning controls
- Desktop wrapper for stricter offline packaging

# Shared Agent Rules

## Project Identity

Name: `Document Redactor`

Purpose:
- A privacy-first web app for detecting and permanently redacting sensitive data in PDF documents.
- Designed to run on GitHub Pages as a fully static site.
- Built for users who want local document processing in the browser without sending document contents to an application backend.

Primary use case:
- User opens the site.
- User drops in a PDF.
- App renders the document, extracts text, falls back to OCR for scanned pages, detects likely sensitive content, and lets the user review everything.
- User approves/rejects detections, adds manual redactions, and exports a rasterized redacted PDF.

Core product principle:
- This is a privacy tool with AI assistance, not an LLM-first product.

## Product Guardrails

Must preserve:
- No document content should be uploaded to an app server for processing.
- Processing must happen in the browser.
- Manual review is mandatory in spirit and clearly communicated in the UI.
- Export must prioritize safe redaction over preserving searchable text.

Must not add by default:
- Accounts
- Cloud storage
- Collaboration
- Server-side document processing
- Paid features
- Background API dependencies for core detection/redaction flow

Current MVP constraints:
- PDF input only
- 25 MB file size limit
- 30 page limit
- Rasterized PDF export
- OCR currently uses English language assets

Important privacy caveat:
- The current implementation does not send PDF data out for processing.
- Some runtime assets may still be fetched externally on first use, especially model/OCR assets, unless those assets are later bundled and hosted locally.

## Tech Stack

Framework:
- Astro
- React
- Tailwind CSS

State:
- Zustand

Document processing:
- `pdfjs-dist` for PDF loading, text extraction, and rendering
- `tesseract.js` for OCR on scanned/image-only pages
- `pdf-lib` for assembling exported redacted PDFs

AI / detection:
- Regex-based rules for deterministic sensitive-data detection
- `@huggingface/transformers` for in-browser NER
- Current NER model: `Xenova/bert-base-multilingual-cased-ner-hrl`

Deployment:
- GitHub Pages
- GitHub Actions workflow for static deploy

## Architecture Summary

Main route:
- `/` is the full app

Core modules:
- `src/lib/pdf.ts`
  - PDF loading
  - page rendering
  - native text extraction
- `src/lib/ocr.ts`
  - OCR worker setup
  - OCR span extraction
- `src/lib/detection.ts`
  - regex detection
  - custom keyword detection
- `src/lib/ner.ts`
  - browser-side multilingual NER
- `src/lib/processDocument.ts`
  - orchestrates extraction, OCR fallback, rule detection, and NER
- `src/lib/export.ts`
  - rasterized export pipeline
- `src/store/reviewStore.ts`
  - review state, manual redactions, filters, export status
- `src/components/DocumentRedactorApp.tsx`
  - top-level application UI

Data model concepts:
- `SourceDocument`
- `PageAsset`
- `TextSpan`
- `Detection`
- `ManualRedaction`
- `ExportJob`

## Detection Strategy

Layer 1:
- Regex rules for emails, phone numbers, IDs, numbers, and custom keywords

Layer 2:
- Local NER in the browser for names, organizations, and address-like entities

Layer 3:
- User review
- User can approve, reject, add manual text-based redactions, and draw freeform manual boxes

Do not replace this with a general-purpose LLM without a clear product decision.

Why not Gemma / small local LLMs for core MVP detection:
- Too heavy for the current browser-first GitHub Pages architecture
- Worse fit for exact span extraction and coordinate mapping
- Harder to make predictable for redaction review
- NER + rules + manual review is the intended MVP path

## Export Rules

Current export behavior:
- Render each page to a bitmap
- Burn approved redactions and manual redactions into the image
- Rebuild a new PDF from images

Reason:
- Stronger MVP guarantee that redacted text is not still selectable under an overlay

Do not silently switch to visual-only overlays on top of original PDF text.

## UX Rules

The UI should feel:
- Calm
- privacy-focused
- explicit about limitations
- review-first, not “one-click magic”

Always preserve:
- clear upload state
- visible progress for extraction/OCR/model work
- page preview
- detection sidebar
- filters by status/source/type
- manual redaction tools
- explicit export action

## Implementation Rules For Future Work

Prefer:
- Local browser processing over remote services
- Deterministic rules and narrow models over general LLM behavior
- Progressive enhancement
- Failure-tolerant fallbacks
- Clear warning copy when OCR or NER is unavailable

Avoid:
- Tight coupling between UI and processing logic
- Giant page components without lib/store separation
- Hidden network dependencies
- Claims of perfect detection accuracy

If changing detection:
- Keep manual review central
- Preserve coordinate mapping from extracted text back to page overlays
- Document any new network or model-loading behavior

If changing privacy behavior:
- Update `README.md`
- Update in-app copy
- Call out the change explicitly in PR/summary notes

If changing deployment base path:
- Update `astro.config.mjs`

## Current Known Limitations

- OCR language is not yet multilingual
- First-run model/OCR asset loading may require network access
- Large browser bundles are expected because of PDF/OCR/NER dependencies
- Export is safe-first, not fidelity-first
- Text-preserving redaction is intentionally not implemented in MVP

## Good Next Steps

High-value future improvements:
- Serve model and OCR assets locally from the deployed app for stricter offline behavior
- Add image upload support
- Add plain text support
- Improve multilingual evaluation and model fallback logic
- Add better browser/device capability messaging
- Explore search-preserving redaction only after the safe rasterized path is stable

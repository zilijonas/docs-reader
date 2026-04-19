import { APP_LIMITS } from '../../lib/constants';

export const landingNavLinks = [
  { href: '#how', label: 'How it works' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#limits', label: 'Limits' },
] as const;

export const howSteps = [
  {
    number: '01',
    icon: 'upload',
    title: 'Drop a PDF',
    description:
      'Searchable pages stay on the native text lane. Scanned pages automatically fall back to OCR.',
  },
  {
    number: '02',
    icon: 'review',
    title: 'Review detections',
    description:
      'Emails, phones, IBANs, cards, dates, IDs, and custom keywords surface as suggestions. Approve what should go.',
  },
  {
    number: '03',
    icon: 'export',
    title: 'Export, redacted',
    description:
      'True PDF redaction via applied annotations. A flattened fallback is available if the source is malformed.',
  },
] as const;

export const privacyBullets = [
  {
    title: 'No server roundtrip',
    description: 'File bytes stay in browser memory.',
  },
  {
    title: 'Assets bundled',
    description: 'Pyodide, PyMuPDF and OCR models ship with the app.',
  },
  {
    title: 'Review-first export',
    description: 'Redaction is not applied until you click Export.',
  },
] as const;

export const pipelineSteps = [
  { title: 'Your browser tab', description: 'File bytes stay in-memory', filled: true },
  { title: 'Web Worker', description: 'Off-main-thread processing', filled: false },
  { title: 'Pyodide + PyMuPDF', description: 'Native text extraction', filled: false },
  { title: 'Tesseract.js', description: 'OCR fallback for scans', filled: false },
  { title: 'Rules engine', description: 'Regex detection', filled: false },
  { title: 'Your review', description: 'Approve / reject / draw', filled: false },
  { title: 'pdf-lib export', description: 'True redaction applied', filled: true },
] as const;

export const limitStats = [
  { label: 'File cap', value: `${APP_LIMITS.maxFileSizeMb} MB`, note: 'Per document' },
  { label: 'Pages', value: String(APP_LIMITS.maxPages), note: 'Maximum' },
  { label: 'Input', value: 'PDF', note: 'Only, for now' },
] as const;

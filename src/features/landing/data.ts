import { APP_LIMITS } from '../../lib/constants';

export const landingNavLinks = [
  { href: '#how', label: 'How it works' },
  { href: '#privacy', label: 'Privacy' },
] as const;

export const howSteps = [
  {
    number: '01',
    icon: 'upload',
    title: 'Drop a PDF',
    description: 'Text stays local. Scans use in-browser OCR.',
  },
  {
    number: '02',
    icon: 'review',
    title: 'Review detections',
    description: 'We suggest emails, phones, IBANs, IDs, and more. You decide what gets redacted.',
  },
  {
    number: '03',
    icon: 'export',
    title: 'Export safely',
    description: 'True PDF redaction. Not just visual masking.',
  },
] as const;

export const techHighlights = [
  'In-browser processing (WebAssembly)',
  'OCR for scanned PDFs',
  'Pattern detection (emails, IDs, IBANs, etc.)',
  'Secure PDF redaction (not reversible)',
] as const;

export const limitStats = [
  { label: 'File cap', value: `${APP_LIMITS.maxFileSizeMb} MB`, note: 'Per document' },
  { label: 'Pages', value: String(APP_LIMITS.maxPages), note: 'Maximum' },
  { label: 'Input', value: 'PDF', note: 'Only, for now' },
] as const;

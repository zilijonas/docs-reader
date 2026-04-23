import { APP_LIMITS } from '../../lib/app-config';

export type LandingNavLink = {
  href: string;
  label: string;
  icon: 'how' | 'privacy' | 'faq';
};

export type LandingFooterLink = {
  href: string;
  label: string;
  icon: 'how' | 'privacy' | 'faq' | 'terms' | 'security' | 'contact';
};

export type LandingMobileLink = {
  href: string;
  label: string;
  icon: 'app' | 'how' | 'privacy' | 'faq' | 'terms' | 'security' | 'contact';
};

export const getLandingNavLinks = (baseUrl: string): LandingNavLink[] => [
  { href: `${baseUrl}how-it-works`, label: 'How it works', icon: 'how' },
  { href: `${baseUrl}privacy`, label: 'Privacy', icon: 'privacy' },
  { href: `${baseUrl}faq`, label: 'FAQ', icon: 'faq' },
];

export const getLandingFooterLinks = (baseUrl: string): LandingFooterLink[] => [
  { href: `${baseUrl}how-it-works`, label: 'How it works', icon: 'how' },
  { href: `${baseUrl}privacy`, label: 'Privacy', icon: 'privacy' },
  { href: `${baseUrl}faq`, label: 'FAQ', icon: 'faq' },
  { href: `${baseUrl}terms`, label: 'Terms', icon: 'terms' },
  { href: `${baseUrl}security`, label: 'Security', icon: 'security' },
  { href: `${baseUrl}contact`, label: 'Contact', icon: 'contact' },
];

export const getLandingMobileLinks = (baseUrl: string, appUrl: string): LandingMobileLink[] => [
  { href: appUrl, label: 'Redact your PDF', icon: 'app' },
  { href: `${baseUrl}#how`, label: 'How it works', icon: 'how' },
  { href: `${baseUrl}privacy`, label: 'Privacy', icon: 'privacy' },
  { href: `${baseUrl}faq`, label: 'FAQ', icon: 'faq' },
  { href: `${baseUrl}terms`, label: 'Terms', icon: 'terms' },
  { href: `${baseUrl}security`, label: 'Security', icon: 'security' },
  { href: `${baseUrl}contact`, label: 'Contact', icon: 'contact' },
];

export const landingHero = {
  statusPill: 'Private by design',
  statusDetail: 'Runs in your browser',
  headlineLead: 'Redact sensitive data in your PDF.',
  headlineAccent: '',
  headlineTrail: 'Before you share it.',
  subtext:
    'Use a browser-based PDF redactor to find sensitive information, review every redaction, and export a permanently redacted PDF. Everything stays on your device - your file is never uploaded.',
  primaryCta: 'Redact your PDF',
  secondaryCta: 'See how it works',
  quickPoints: ['Local PDF redaction', 'No file uploads', 'Review before export'],
} as const;

export const heroTrustBadges = [
  {
    label: 'No file uploads',
    mobileLabel: 'No uploads',
    note: 'Processed in your browser.',
    icon: 'cloudOff',
  },
  {
    label: 'Runs on your device',
    mobileLabel: 'Local',
    note: 'PDF stays on your device.',
    icon: 'monitor',
  },
  {
    label: 'Review before export',
    mobileLabel: 'Review',
    note: 'Approve every redaction.',
    icon: 'eye',
  },
  {
    label: 'Permanent redaction',
    mobileLabel: 'Irreversible',
    note: 'Export removes selected data.',
    icon: 'shield',
  },
] as const;

export const howSection = {
  eyebrow: 'How it works',
  title: 'Local PDF redaction in a few clear steps.',
  intro:
    'Open a PDF, review suggested redactions, and export a clean copy without sending the document to a processing server.',
} as const;

export const howSteps = [
  {
    number: '01',
    icon: 'upload',
    title: 'Open your PDF',
    description: 'Drop your file into the page. Your browser opens it on your device.',
  },
  {
    number: '02',
    icon: 'search',
    title: 'We mark possible sensitive data',
    description:
      'We highlight things like names, emails, phone numbers, IDs, and bank details that may need to be hidden.',
  },
  {
    number: '03',
    icon: 'review',
    title: 'Review and adjust',
    description: 'Keep or remove our suggestions. Add your own markings if needed.',
  },
  {
    number: '04',
    icon: 'export',
    title: 'Export a clean PDF',
    description: 'Save a version with the selected data permanently removed.',
  },
] as const;

export const browserExplainer = {
  eyebrow: 'Local processing',
  title: 'How can a website use your file without uploading it?',
  paragraphs: [
    'Your browser is a tool on your device.',
    'When you open hddn, the website loads the tool into your browser.',
    'Then your browser can open and edit your PDF on your device.',
    'That means your file does not need to be sent anywhere.',
  ],
  shortTitle: 'Short version',
  shortPoints: [
    'The website gives your browser the tool.',
    'Your browser uses that tool on your device.',
    'Your PDF does not need to be sent anywhere to be edited.',
  ],
} as const;

export const privacySection = {
  eyebrow: 'Privacy and trust',
  title: 'Local PDF redaction keeps your document on your device',
  paragraphs: [
    'Your PDF is processed directly in your browser.',
    'It is not uploaded, stored, or sent to an app server for redaction.',
  ],
  supportLine:
    'You review everything before export, and the final file is saved back to your device.',
  highlightsTitle: 'What this means',
} as const;

export const privacyHighlights = [
  'No file uploads for redaction',
  'Review every suggestion',
  'Manual changes stay in your control',
  'Permanent redaction on export',
] as const;

export const useCasesSection = {
  eyebrow: 'When to use hddn',
  title: 'Use this PDF redactor before a document leaves your hands.',
  items: [
    {
      label: 'Share safely',
      title: 'Before sending a PDF to someone else',
      description:
        'Check the file first, hide what should stay private, then send the clean version.',
      icon: 'send',
    },
    {
      label: 'Before AI tools',
      title: 'Before uploading a document to AI tools',
      description:
        'Remove personal details first when you want to use a document with another tool.',
      icon: 'bot',
    },
    {
      label: 'Everyday documents',
      title: 'Before sharing contracts, reports, IDs, or forms',
      description:
        'Use it on the kinds of PDFs that often carry names, numbers, and sensitive details.',
      icon: 'files',
    },
    {
      label: 'General protection',
      title: 'Any time a PDF contains personal or sensitive information',
      description: 'If a document feels too revealing to share as-is, review it here first.',
      icon: 'shield',
    },
  ],
} as const;

export const whySection = {
  eyebrow: 'Why people use it',
  title: 'Simple, review-first PDF redaction.',
  intro:
    'Built for people who want calm, browser-based PDF redaction before a document leaves their hands.',
  items: [
    'Simple to understand',
    'No signup required',
    'Free to use',
    'You review every change',
    'Clean PDF export',
    'Sensitive data stays under your control',
  ],
} as const;

export const limitsSection = {
  eyebrow: 'Supported right now',
  title: 'A clear scope for safe, focused PDF redaction.',
} as const;

export const limitStats = [
  { label: 'Input', value: 'PDF', note: 'Files only' },
  {
    label: 'File cap',
    value: `${APP_LIMITS.maxFileSizeMb} MB`,
    note: 'Per file',
  },
  { label: 'Pages', value: String(APP_LIMITS.maxPages), note: 'Per document' },
] as const;

export const footerCta = {
  title: 'Ready to clean up a PDF?',
  body: 'Redact sensitive information before you share your PDF.',
  buttonLabel: 'Redact your PDF',
  trustLine: 'Free to use. No signup required.',
} as const;

export type StructuredData = Record<string, unknown>;

export interface SeoMetadata {
  title: string;
  description: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonicalPath?: string;
  structuredData?: StructuredData | StructuredData[];
}

export const SITE_SEO = {
  siteName: "hddn",
  alternateSiteName: "Document Redactor",
  defaultRobots: "index, follow",
  ogImageAlt:
    "Preview of a browser-based PDF redaction tool for hiding sensitive information locally",
} as const;

export const HOME_WEBSITE_STRUCTURED_DATA: StructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_SEO.siteName,
  alternateName: SITE_SEO.alternateSiteName,
  url: "https://hddn.app/",
};

export const SEO = {
  home: {
    title: "PDF Redactor Online | Redact PDFs Locally | hddn",
    description:
      "Redact PDF files locally in your browser. Find sensitive information, review every redaction, and export a permanently redacted PDF without uploading your document.",
    canonicalPath: "/",
    structuredData: HOME_WEBSITE_STRUCTURED_DATA,
  },
  howItWorks: {
    title: "How Local PDF Redaction Works | hddn",
    description:
      "See how hddn opens PDFs in your browser, flags sensitive text, supports manual review, and exports a safely redacted PDF.",
    canonicalPath: "/how-it-works/",
  },
  faq: {
    title: "PDF Redaction FAQ | Privacy, Uploads, Limits | hddn",
    description:
      "Answers about local PDF redaction, file uploads, analytics, PDF limits, permanent redaction, and manual review in hddn.",
    canonicalPath: "/faq/",
  },
  privacy: {
    title: "Privacy Policy | Local PDF Redaction | hddn",
    description:
      "Learn how hddn keeps PDF redaction in your browser, what analytics data is optional, and which infrastructure services still see basic request metadata.",
    canonicalPath: "/privacy/",
  },
  security: {
    title: "Security Overview | Browser PDF Redaction | hddn",
    description:
      "Understand hddn's security model: browser-only PDF processing, no document uploads, manual review before export, and current limitations.",
    canonicalPath: "/security/",
  },
  contact: {
    title: "Contact hddn | PDF Redaction Support",
    description:
      "Contact hddn with questions, bug reports, privacy concerns, or feedback about the local PDF redaction tool.",
    canonicalPath: "/contact/",
  },
  terms: {
    title: "Terms of Use | hddn PDF Redactor",
    description:
      "Read the terms for using hddn, including acceptable use, service limitations, and your responsibility to review redactions before sharing documents.",
    canonicalPath: "/terms/",
  },
  redact: {
    title: "Redact PDF Online | Local Browser Tool | hddn",
    description:
      "Open a PDF, review sensitive content, and export a redacted copy locally in your browser.",
    robots: "noindex, follow",
    canonicalPath: "/redact/",
  },
  notFound: {
    title: "Page Not Found | hddn",
    description:
      "The page you requested could not be found. Jump back to the document redactor or return to the homepage.",
    robots: "noindex, nofollow",
  },
} as const satisfies Record<string, SeoMetadata>;

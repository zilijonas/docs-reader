/// <reference types="astro/client" />

interface Window {
  dataLayer?: unknown[][];
  gtag?: (...args: unknown[]) => void;
}

declare module '*.svg?raw' {
  const content: string;
  export default content;
}

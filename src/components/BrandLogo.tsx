import logoSvg from '../assets/logo.svg?raw';

type BrandLogoProps = {
  className?: string;
  title?: string;
};

const baseLogoSvg = logoSvg
  .replace(/<g clip-path="url\(#clip0_3_20\)">/, '<g>')
  .replace(/<defs>[\s\S]*?<\/defs>/, '')
  .replaceAll('fill="#1E1E1E"', 'fill="currentColor"');

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

export function BrandLogo({ className, title }: BrandLogoProps) {
  const svgMarkup = baseLogoSvg.replace(
    '<svg ',
    `<svg class="${escapeHtml(className ?? '')}" ${title ? `role="img" aria-label="${escapeHtml(title)}"` : 'aria-hidden="true"'} `,
  );

  const markupWithTitle = title
    ? svgMarkup.replace('>', `><title>${escapeHtml(title)}</title>`)
    : svgMarkup;

  return <span dangerouslySetInnerHTML={{ __html: markupWithTitle }} />;
}

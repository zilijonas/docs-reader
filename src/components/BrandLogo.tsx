type BrandLogoProps = {
  className?: string;
  title?: string;
};

export function BrandLogo({ className, title }: BrandLogoProps) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
      role={title ? 'img' : undefined}
      viewBox="0 0 325 104"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <g clipPath="url(#brand-logo-clip)">
        <path
          d="M53.9767 43.9874V61.1572H19.9435V43.9874H53.9767ZM-1 0H25.5534V104H-1V0ZM49.4888 0H75.8552V104H49.4888V0Z"
          fill="currentColor"
        />
        <path
          d="M133.076 41.6981V20.1132C133.076 18.587 132.702 17.5514 131.954 17.0063C131.206 16.3522 129.897 16.0252 128.027 16.0252H96.2378V0H136.068C144.545 0 150.591 1.63522 154.206 4.90567C157.946 8.06709 159.816 12.4822 159.816 18.1509V41.6981H133.076ZM133.076 83.8868V39.0818H159.816V85.8491C159.816 91.5178 157.946 95.9874 154.206 99.2579C150.591 102.419 144.545 104 136.068 104H96.2378V87.9748H128.027C129.897 87.9748 131.206 87.6478 131.954 86.9937C132.702 86.3396 133.076 85.304 133.076 83.8868ZM86.327 0H113.254V104H86.327V0Z"
          fill="currentColor"
        />
        <path
          d="M216.355 41.6981V20.1132C216.355 18.587 215.981 17.5514 215.233 17.0063C214.485 16.3522 213.176 16.0252 211.306 16.0252H179.517V0H219.347C227.824 0 233.87 1.63522 237.485 4.90567C241.225 8.06709 243.095 12.4822 243.095 18.1509V41.6981H216.355ZM216.355 83.8868V39.0818H243.095V85.8491C243.095 91.5178 241.225 95.9874 237.485 99.2579C233.87 102.419 227.824 104 219.347 104H179.517V87.9748H211.306C213.176 87.9748 214.485 87.6478 215.233 86.9937C215.981 86.3396 216.355 85.304 216.355 83.8868ZM169.606 0H196.533V104H169.606V0Z"
          fill="currentColor"
        />
        <path
          d="M301.504 0H326V104H302.065L276.072 41.8616V104H251.576V0H275.885L301.504 61.9748V0Z"
          fill="currentColor"
        />
        <rect fill="currentColor" height="104" width="72" x="171" />
        <rect fill="currentColor" height="52" width="72" x="175" />
        <rect fill="currentColor" height="52" width="72" x="167" y="52" />
      </g>
      <defs>
        <clipPath id="brand-logo-clip">
          <rect fill="white" height="104" width="325" />
        </clipPath>
      </defs>
    </svg>
  );
}

import { copy } from '@/lib/copy';

export function DropzoneHero() {
  return (
    <div className="mx-auto max-w-[44rem] text-center">
      <span className="ui-eyebrow-pill fade-in">{copy.dropzone.eyebrow}</span>
      <h1 className="fade-in fade-in-delay-1 text-display-dropzone tracking-tight-hero mt-5 text-balance">
        {copy.dropzone.headingLead}{' '}
        <span className="text-brand font-serif italic">{copy.dropzone.headingAccent}</span>
      </h1>
      <p className="text-content-muted fade-in fade-in-delay-2 mx-auto mt-4 max-w-[34rem] text-lg leading-[1.55] text-balance max-sm:text-base">
        {copy.dropzone.hint}
      </p>
    </div>
  );
}

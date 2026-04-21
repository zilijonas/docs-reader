import { Shield } from 'lucide-react';

import { copy } from '../../../lib/copy';
import { Button, Panel } from '../../../components/ui';

export function CookieConsentBanner({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <Panel
      className="anim-float-in pointer-events-auto mx-auto grid w-full max-w-5xl gap-4 border-[color:color-mix(in_oklab,var(--theme-border-strong)_78%,white)] bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--theme-brand-soft)_72%,white)_0%,transparent_48%),color-mix(in_oklab,var(--theme-surface)_92%,var(--theme-canvas))] shadow-[var(--theme-shadow-float)] md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
      padding="lg"
      tone="overlay"
    >
      <div className="grid min-w-0 gap-3.5">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:color-mix(in_oklab,var(--theme-border)_92%,white)] bg-[color:color-mix(in_oklab,var(--theme-surface)_85%,var(--theme-canvas))] px-3 py-1.5 font-mono text-[0.71875rem] leading-4 tracking-[var(--tracking-ui-wide)] text-content uppercase">
          <Shield size={14} strokeWidth={1.65} />
          {copy.consent.eyebrow}
        </div>

        <div className="grid max-w-[40rem] gap-2">
          <h2 className="type-body-lg font-semibold text-content">{copy.consent.heading}</h2>
          <p className="text-sm leading-6 text-content-muted">{copy.consent.body}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-stretch gap-3 md:justify-end">
        <Button className="min-w-[10.25rem] flex-1 md:flex-none" onClick={onDecline} variant="secondary">
          {copy.consent.decline}
        </Button>
        <Button className="min-w-[10.25rem] flex-1 md:flex-none" onClick={onAccept}>
          {copy.consent.accept}
        </Button>
      </div>
    </Panel>
  );
}


import { ShieldCheck, Smile, Zap } from 'lucide-react';

import { cn } from '@/lib/cn';
import { copy } from '@/lib/copy';

function getBenefitIcon(id: (typeof copy.dropzone.benefits)[number]['id']) {
  if (id === 'privacy') {
    return <ShieldCheck size={24} strokeWidth={1.8} />;
  }

  if (id === 'local') {
    return <Zap size={24} strokeWidth={1.8} />;
  }

  return <Smile size={24} strokeWidth={1.8} />;
}

export function DropzoneBenefitStrip() {
  return (
    <div className="mt-8 grid grid-cols-3 gap-3 sm:mt-10 sm:gap-5">
      {copy.dropzone.benefits.map((benefit) => (
        <div className="flex flex-col items-center text-center" key={benefit.id}>
          <span
            className={cn(
              'inline-flex size-14 items-center justify-center rounded-full sm:size-16',
              benefit.id === 'privacy'
                ? 'bg-trust-soft text-trust'
                : benefit.id === 'local'
                  ? 'bg-brand-soft/55 text-brand'
                  : 'bg-[rgba(142,111,245,0.12)] text-[rgb(126,92,238)]',
            )}
          >
            {getBenefitIcon(benefit.id)}
          </span>
          <p className="text-content mt-3 text-base font-medium max-sm:text-sm">{benefit.title}</p>
          <p className="text-content-muted leading-copy mt-1 max-w-[13rem] text-sm max-sm:text-xs">
            {benefit.body}
          </p>
        </div>
      ))}
    </div>
  );
}

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp, FileText, ListOrdered, Mail, Menu, Pencil, Shield, X } from 'lucide-react';

import { IconButton } from '../../../components/ui';
import type { LandingMobileLink } from '../data';

type LandingMobileNavProps = {
  links: LandingMobileLink[];
};

const linkIcons = {
  app: Pencil,
  how: ListOrdered,
  privacy: Shield,
  faq: CircleHelp,
  terms: FileText,
  security: Shield,
  contact: Mail,
} as const;

export function LandingMobileNav({ links }: LandingMobileNavProps) {
  const [open, setOpen] = useState(false);
  const headingId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open navigation menu"
        className="border-border bg-surface text-content hover:border-border-strong hover:bg-surface-muted inline-flex size-10 items-center justify-center rounded-full border transition-colors duration-200 md:hidden"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Menu size={18} strokeWidth={1.8} />
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              aria-labelledby={headingId}
              aria-modal="true"
              className="z-drawer-backdrop bg-content/45 fixed inset-0 px-4 py-6 backdrop-blur-sm md:hidden"
              onClick={() => setOpen(false)}
              role="dialog"
            >
              <aside
                className="border-border bg-surface shadow-float ml-auto h-full w-full max-w-sm rounded-(--radius-panel) border p-5"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="grid h-full grid-rows-[auto_1fr] gap-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2
                      className="text-content leading-reading text-lg font-semibold text-pretty"
                      id={headingId}
                    >
                      Menu
                    </h2>
                    <IconButton
                      aria-label="Close navigation menu"
                      onClick={() => setOpen(false)}
                      shape="pill"
                      size="md"
                      tone="surface"
                    >
                      <X size={16} strokeWidth={1.8} />
                    </IconButton>
                  </div>

                  <nav aria-label="Mobile site navigation" className="grid content-start gap-2">
                    {links.map((link) => {
                      const Icon = linkIcons[link.icon];
                      return (
                        <a
                          className="border-border bg-surface-muted text-content hover:border-border-strong hover:bg-surface flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors duration-200"
                          href={link.href}
                          key={link.href}
                          onClick={() => setOpen(false)}
                        >
                          <span
                            className="bg-canvas text-content-subtle inline-flex size-7 items-center justify-center rounded-full"
                            aria-hidden="true"
                          >
                            <Icon size={16} strokeWidth={1.8} />
                          </span>
                          <span>{link.label}</span>
                        </a>
                      );
                    })}
                  </nav>
                </div>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

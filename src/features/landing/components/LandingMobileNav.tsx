import { useId, useState } from "react";
import { Menu, X } from "lucide-react";

import { Dialog, IconButton } from "../../../components/ui";
import type { LandingNavLink } from "../data";

type LandingMobileNavProps = {
  links: LandingNavLink[];
};

export function LandingMobileNav({ links }: LandingMobileNavProps) {
  const [open, setOpen] = useState(false);
  const headingId = useId();

  return (
    <>
      <IconButton
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open navigation menu"
        className="landing-mobile-nav-trigger"
        onClick={() => setOpen(true)}
        shape="pill"
        size="lg"
        tone="surface"
      >
        <Menu size={18} strokeWidth={1.8} />
      </IconButton>

      <Dialog
        className="landing-mobile-nav-dialog"
        labelledBy={headingId}
        onClose={() => setOpen(false)}
        open={open}
        size="sm"
      >
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="type-body-lg m-0 font-semibold text-content" id={headingId}>
              Menu
            </h2>
            <IconButton
              aria-label="Close navigation menu"
              onClick={() => setOpen(false)}
              shape="pill"
              size="md"
              tone="neutral"
            >
              <X size={16} strokeWidth={1.8} />
            </IconButton>
          </div>

          <nav aria-label="Mobile site navigation" className="grid gap-2">
            {links.map((link) => (
              <a
                className="rounded-[1rem] border border-border bg-surface px-4 py-3 text-sm font-medium text-content no-underline transition hover:border-border-strong hover:bg-surface-muted"
                href={link.href}
                key={link.href}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </Dialog>
    </>
  );
}

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { CircleHelp, FileText, ListOrdered, Mail, Menu, Pencil, Shield, X } from "lucide-react";

import { IconButton } from "../../../components/ui";
import type { LandingMobileLink } from "../data";

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
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open navigation menu"
        className="landing-mobile-nav-trigger"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Menu size={18} strokeWidth={1.8} />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              aria-labelledby={headingId}
              aria-modal="true"
              className="landing-mobile-nav-overlay"
              onClick={() => setOpen(false)}
              role="dialog"
            >
              <aside
                className="landing-mobile-nav-sidebar"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="landing-mobile-nav-shell">
                  <div className="landing-mobile-nav-head">
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
                    {links.map((link) => {
                      const Icon = linkIcons[link.icon];
                      return (
                        <a
                          className="landing-mobile-nav-link"
                          href={link.href}
                          key={link.href}
                          onClick={() => setOpen(false)}
                        >
                          <span className="landing-mobile-nav-link-icon" aria-hidden="true">
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

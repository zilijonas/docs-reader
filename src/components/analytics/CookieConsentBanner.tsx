import { Shield } from 'lucide-react';

import { Button, Panel } from '../ui';

export function CookieConsentBanner({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <Panel className="cookie-consent-card anim-float-in" padding="lg" tone="overlay">
      <div className="cookie-consent-copy">
        <div className="cookie-consent-label">
          <Shield size={14} strokeWidth={1.65} />
          Analytics consent
        </div>
        <div className="cookie-consent-text">
          <h2 className="type-body-lg font-semibold text-content">Help us understand usage, not your documents.</h2>
          <p className="text-sm leading-6 text-content-muted">
            We only use analytics to understand how many people use the site and which parts work well. Analytics
            starts with denied-by-default consent settings, and your PDFs never leave your computer.
          </p>
        </div>
      </div>

      <div className="cookie-consent-actions">
        <Button className="cookie-consent-button" onClick={onDecline} variant="secondary">
          Decline
        </Button>
        <Button className="cookie-consent-button" onClick={onAccept}>
          Accept analytics
        </Button>
      </div>
    </Panel>
  );
}

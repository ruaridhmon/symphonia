import { Globe2, ShieldCheck } from 'lucide-react';

import { ToggleSwitch } from './ToggleSwitch';

type Props = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  requireConsent: boolean;
  onRequireConsentChange: (value: boolean) => void;
  consentText: string;
  onConsentTextChange: (value: string) => void;
};

export default function PublicShareSettings({
  enabled,
  onEnabledChange,
  requireConsent,
  onRequireConsentChange,
  consentText,
  onConsentTextChange,
}: Props) {
  return (
    <section
      className="rounded-2xl p-4 sm:p-5"
      style={{
        border: '1px solid var(--border)',
        background:
          enabled
            ? 'color-mix(in srgb, var(--accent) 5%, var(--card))'
            : 'var(--card)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Globe2 size={16} style={{ color: 'var(--accent)' }} />
            <h2 className="text-sm font-semibold text-foreground">Public share link</h2>
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Let people open the share link without logging in, enter their name, and continue straight into the form.
          </p>
        </div>
        <ToggleSwitch
          id="toggle-public-share"
          checked={enabled}
          onChange={onEnabledChange}
        />
      </div>

      {enabled ? (
        <div
          className="mt-4 rounded-xl p-4"
          style={{
            border: '1px solid var(--border)',
            backgroundColor: 'var(--background)',
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} style={{ color: 'var(--accent)' }} />
                <div className="text-sm font-medium text-foreground">Consent step before form</div>
              </div>
              <div className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Use this if respondents need to agree to consent wording or read terms before continuing.
              </div>
            </div>
            <ToggleSwitch
              id="toggle-public-consent"
              checked={requireConsent}
              onChange={onRequireConsentChange}
            />
          </div>

          {requireConsent ? (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1 text-foreground">
                Consent text
              </label>
              <textarea
                value={consentText}
                onChange={(event) => onConsentTextChange(event.target.value)}
                rows={4}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  border: '1px solid var(--input)',
                  backgroundColor: 'var(--card)',
                  color: 'var(--foreground)',
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

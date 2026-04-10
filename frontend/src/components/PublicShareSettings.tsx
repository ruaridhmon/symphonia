import { Globe2 } from 'lucide-react';

import { ToggleSwitch } from './ToggleSwitch';

type Props = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
};

export default function PublicShareSettings({
  enabled,
  onEnabledChange,
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
    </section>
  );
}

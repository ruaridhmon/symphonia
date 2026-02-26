import type { Form, Round } from '../../types/summary';

type Props = {
  form: Form;
  activeRound: Round | null;
};

export default function FormInfoCard({ form, activeRound }: Props) {
  return (
    <div className="card p-4">
      <h3
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'var(--muted-foreground)' }}
      >
        Form Info
      </h3>
      <div className="text-sm space-y-2">
        <div className="text-foreground font-medium">{form.title}</div>
        <div
          className="flex items-center gap-2 text-sm"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: activeRound
                ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                : 'var(--muted)',
              color: activeRound ? 'var(--accent)' : 'var(--muted-foreground)',
            }}
          >
            {activeRound && (
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: 'var(--accent)' }}
              />
            )}
            {activeRound
              ? `Round ${activeRound.round_number} active`
              : 'No active round'}
          </span>
        </div>
      </div>
    </div>
  );
}

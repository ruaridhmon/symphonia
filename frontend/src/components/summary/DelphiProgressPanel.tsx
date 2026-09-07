import type { Round, RoundWithResponses } from '../../types/summary';
import { ratingProgress, stanceLabels } from '../../utils/delphiProgress';

const colours = ['#0f766e', '#be123c', '#64748b', '#a16207', '#7c3aed', '#cbd5e1'];
export default function DelphiProgressPanel({ round, rounds, responses }: {
  round: Round | null; rounds: Round[]; responses: RoundWithResponses[];
}) {
  if (!round || rounds.length < 2) return null;
  const rows = ratingProgress(round, rounds, responses);
  const loaded = responses.some(r => r.id === round.id);
  return <section className="card p-4 sm:p-6" aria-label="Delphi round progress">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-lg font-semibold m-0">Round progress</h2>
      <span className="text-sm text-muted-foreground">Recorded responses</span>
    </div>
    <ol className="flex flex-wrap gap-2 my-4 p-0 list-none" aria-label="Responses by round">
      {[...rounds].sort((a, b) => a.round_number - b.round_number).map(r => <li key={r.id}
        className="rounded-lg border px-3 py-2 text-sm" aria-current={r.id === round.id ? 'step' : undefined}
        style={{ borderColor: r.id === round.id ? 'var(--accent)' : 'var(--border)' }}>
        Round {r.round_number} <strong className="ml-2">{r.response_count ?? '—'}</strong>
        <span className="text-muted-foreground"> responses</span>
      </li>)}
    </ol>
    {!loaded ? <p className="text-sm text-muted-foreground">Vote data is unavailable.</p> : !rows.length
      ? <p className="text-sm text-muted-foreground">Open responses identify candidate claims. A later rating round lets participants explicitly validate them.</p>
      : <>
        <p className="text-sm text-muted-foreground">Direct participant ratings. Agreement includes “Agree” and “Strongly agree”; neutral and uncertain ratings remain in the denominator.</p>
        <div className="space-y-5 mt-4">{rows.map(row => {
          const total = row.votes.reduce((a, b) => a + b, 0);
          return <article key={row.key}>
            <h3 className="text-sm font-semibold mb-2">{row.label}</h3>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm mb-2">
              <span>{row.percent === null ? 'Awaiting ratings' : `${Math.round(row.percent)}% agree · ${row.votes[0]} of ${row.answered} ratings`}</span>
              {row.delta !== null && <span className="text-muted-foreground">{row.delta > 0 ? '+' : ''}{Math.round(row.delta)} pp vs Round {row.previousRound} ({row.previousAnswered} ratings)</span>}
            </div>
            {total > 0 && <div className="flex h-2 rounded-full overflow-hidden" aria-hidden="true">
              {row.votes.map((n, i) => n > 0 && <span key={i} style={{ width: `${n / total * 100}%`, background: colours[i] }} />)}
            </div>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
              {row.votes.map((n, i) => n > 0 && <span key={i}>{stanceLabels[i]} <strong>{n}</strong></span>)}
            </div>
          </article>;
        })}</div>
        <p className="text-xs text-muted-foreground mt-4 mb-0">Changes compare identical questions and scales. Panel composition may differ between rounds. Agreement does not by itself establish scientific validity.</p>
      </>}
  </section>;
}

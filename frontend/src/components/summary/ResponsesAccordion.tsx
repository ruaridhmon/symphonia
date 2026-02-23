import { useState } from 'react';
import { ChevronDown, ChevronRight, User, MessageSquare } from 'lucide-react';
import { ResponseEditor } from '../index';
import VoiceMirroring from '../VoiceMirroring';
import type { Round, RoundWithResponses } from '../../types/summary';
import { extractQuestionText } from '../../utils/questions';

type Props = {
  structuredRounds: RoundWithResponses[];
  rounds: Round[];
  formQuestions: (string | Record<string, unknown>)[];
  formId: number;
  token: string;
  onResponseUpdated: (
    roundId: number,
    updated: { id: number; answers: Record<string, string>; version: number },
  ) => void;
};

/**
 * Inline accordion for viewing responses per round.
 * Replaces the immediate overlay modal with a toggleable in-page panel.
 * Questions are always visible; responses are secondary and toggled per round.
 */
export default function ResponsesAccordion({
  structuredRounds,
  rounds,
  formQuestions,
  formId,
  token,
  onResponseUpdated,
}: Props) {
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());

  function toggleRound(roundId: number) {
    setExpandedRounds(prev => {
      const next = new Set(prev);
      if (next.has(roundId)) {
        next.delete(roundId);
      } else {
        next.add(roundId);
      }
      return next;
    });
  }

  function expandAll() {
    setExpandedRounds(new Set(structuredRounds.map(r => r.id)));
  }

  function collapseAll() {
    setExpandedRounds(new Set());
  }

  if (structuredRounds.length === 0) {
    return (
      <div className="card p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
          <MessageSquare size={18} />
          Expert Responses
        </h2>
        <p style={{ color: 'var(--muted-foreground)' }}>
          No responses yet for this form.
        </p>
      </div>
    );
  }

  const allExpanded = expandedRounds.size === structuredRounds.length;

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <MessageSquare size={18} />
          Expert Responses
        </h2>
        <button
          onClick={allExpanded ? collapseAll : expandAll}
          className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
          style={{
            color: 'var(--accent)',
            backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      <div className="space-y-2">
        {structuredRounds.map(round => {
          const isExpanded = expandedRounds.has(round.id);
          const roundQuestions =
            rounds.find(r => r.id === round.id)?.questions ||
            formQuestions ||
            [];
          const responseCount = round.responses.length;

          return (
            <div
              key={round.id}
              className="rounded-lg overflow-hidden transition-all"
              style={{
                border: '1px solid var(--border)',
                backgroundColor: isExpanded
                  ? 'var(--card)'
                  : 'var(--muted)',
              }}
            >
              {/* Round header — always visible, clickable */}
              <button
                onClick={() => toggleRound(round.id)}
                className="w-full flex items-center justify-between p-3 sm:p-4 text-left transition-colors"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)',
                }}
                aria-expanded={isExpanded}
                aria-controls={`responses-round-${round.id}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex items-center justify-center w-6 h-6 rounded-md transition-transform"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                      color: 'var(--accent)',
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </span>
                  <span
                    className="font-semibold text-sm"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Round {round.round_number}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                    style={{
                      backgroundColor:
                        responseCount > 0
                          ? 'color-mix(in srgb, var(--accent) 10%, transparent)'
                          : 'var(--muted)',
                      color:
                        responseCount > 0
                          ? 'var(--accent)'
                          : 'var(--muted-foreground)',
                    }}
                  >
                    <User size={11} />
                    {responseCount} response{responseCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </button>

              {/* Expanded content — responses */}
              {isExpanded && (
                <div
                  id={`responses-round-${round.id}`}
                  className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 slide-down"
                  role="region"
                  aria-label={`Responses for Round ${round.round_number}`}
                  style={{
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  {/* Show questions for this round */}
                  {roundQuestions.length > 0 && (
                    <div className="pt-3 pb-1">
                      <h4
                        className="text-xs font-semibold uppercase tracking-wider mb-2"
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        Questions
                      </h4>
                      <ol className="list-decimal list-inside space-y-1">
                        {roundQuestions.map((q, i) => (
                          <li
                            key={i}
                            className="text-sm"
                            style={{ color: 'var(--foreground)' }}
                          >
                            {extractQuestionText(q)}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {responseCount === 0 ? (
                    <p
                      className="text-sm py-2"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      No responses for this round yet.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-3 pt-2">
                        {round.responses.map(resp => (
                          <ResponseEditor
                            key={resp.id}
                            response={resp}
                            questions={roundQuestions}
                            token={token}
                            onUpdated={updated =>
                              onResponseUpdated(round.id, updated)
                            }
                          />
                        ))}
                      </div>

                      {/* Voice Mirroring — AI clarifications */}
                      <div className="pt-3">
                        <VoiceMirroring
                          formId={formId}
                          roundId={round.id}
                          responses={round.responses.map(r => ({
                            id: r.id,
                            email: r.email,
                            answers: r.answers,
                          }))}
                          questions={roundQuestions}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { createPortal } from 'react-dom';
import { LoadingButton, ResponseEditor } from '../index';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { X } from 'lucide-react';
import type { Round, RoundWithResponses } from '../../types/summary';

type Props = {
  open: boolean;
  onClose: () => void;
  structuredRounds: RoundWithResponses[];
  rounds: Round[];
  formQuestions: (string | Record<string, unknown>)[];
  token: string;
  onResponseUpdated: (roundId: number, updated: { id: number; answers: Record<string, unknown>; version: number }) => void;
};

export default function ResponsesModal({
  open,
  onClose,
  structuredRounds,
  rounds,
  formQuestions,
  token,
  onResponseUpdated,
}: Props) {
  const modalRef = useFocusTrap({ active: open, onEscape: onClose });

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-stretch justify-end"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.34)' }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Responses"
    >
      <div
        ref={modalRef}
        className="card w-full sm:w-[min(42rem,92vw)] h-[100dvh] sm:h-[calc(100dvh-1.5rem)] sm:my-3 rounded-none sm:rounded-2xl overflow-hidden text-left flex flex-col"
        style={{ boxShadow: '0 30px 70px rgba(15, 23, 42, 0.22)' }}
      >
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Responses
            </div>
            <h3 className="text-lg font-semibold text-foreground m-0">Expert responses</h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
            style={{
              color: 'var(--muted-foreground)',
              backgroundColor: 'var(--muted)',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.color = 'var(--foreground)'}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.color = 'var(--muted-foreground)'}
            aria-label="Close responses"
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="px-4 sm:px-6 py-2 text-xs flex-shrink-0"
          style={{ color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)' }}
        >
          Review and edit responses without leaving the summary.
        </div>

        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-4">
          {structuredRounds.length === 0 ? (
            <div
              className="rounded-xl px-4 py-5"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
            >
              No responses yet for this form.
            </div>
          ) : (
            structuredRounds.map(round => {
              const roundQuestions =
                rounds.find(r => r.id === round.id)?.questions ||
                formQuestions ||
                [];
              return (
                <div
                  key={round.id}
                  className="rounded-xl p-3 sm:p-4"
                  style={{
                    backgroundColor: 'var(--muted)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-base font-semibold text-foreground m-0">
                        Round {round.round_number}
                      </h4>
                      <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                        {round.responses.length === 0
                          ? 'No responses'
                          : `${round.responses.length} response${round.responses.length === 1 ? '' : 's'}`}
                      </div>
                    </div>
                  </div>

                  {round.responses.length === 0 ? (
                    <p className="text-sm m-0" style={{ color: 'var(--muted-foreground)' }}>
                      No responses for this round.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {round.responses.map(resp => (
                        <ResponseEditor
                          key={resp.id}
                          response={resp}
                          questions={roundQuestions}
                          token={token}
                          onUpdated={updated => onResponseUpdated(round.id, updated)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div
          className="px-4 sm:px-6 py-3 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <LoadingButton
            variant="secondary"
            size="md"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Close
          </LoadingButton>
        </div>
      </div>
    </div>,
    document.body
  );
}

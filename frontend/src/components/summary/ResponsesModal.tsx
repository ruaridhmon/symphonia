import { createPortal } from 'react-dom';
import { LoadingButton, ResponseEditor } from '../index';
import type { Round, RoundWithResponses, StructuredResponse } from '../../types/summary';
import { extractQuestionText } from '../../utils/questions';

type Props = {
  open: boolean;
  onClose: () => void;
  structuredRounds: RoundWithResponses[];
  rounds: Round[];
  formQuestions: (string | Record<string, unknown>)[];
  token: string;
  onResponseUpdated: (roundId: number, updated: { id: number; answers: Record<string, string>; version: number }) => void;
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
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card max-w-full sm:max-w-3xl w-full max-h-screen sm:max-h-[90vh] rounded-none sm:rounded-lg overflow-y-auto p-4 sm:p-6 text-left"
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-foreground">All Responses</h3>
          <button
            onClick={onClose}
            className="text-lg w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{
              color: 'var(--muted-foreground)',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = 'var(--muted)'}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ✕
          </button>
        </div>

        {structuredRounds.length === 0 ? (
          <p style={{ color: 'var(--muted-foreground)' }}>
            No responses yet for this form.
          </p>
        ) : (
          structuredRounds.map(round => {
            const roundQuestions =
              rounds.find(r => r.id === round.id)?.questions ||
              formQuestions ||
              [];
            return (
              <div
                key={round.id}
                className="mb-6 p-3 sm:p-4 rounded-lg"
                style={{
                  backgroundColor: 'var(--muted)',
                  border: '1px solid var(--border)',
                }}
              >
                <h4 className="text-lg font-semibold mb-3 text-foreground">
                  Round {round.round_number}
                </h4>
                {round.responses.length === 0 ? (
                  <p style={{ color: 'var(--muted-foreground)' }}>
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

        <LoadingButton
          variant="secondary"
          size="md"
          onClick={onClose}
          className="mt-6"
        >
          Close
        </LoadingButton>
      </div>
    </div>,
    document.body
  );
}

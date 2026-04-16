import { act, type ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import FormPage from '../FormPage';

const mocks = vi.hoisted(() => ({
  getForm: vi.fn(),
  acceptFormConsent: vi.fn(),
  getActiveRound: vi.fn(),
  submitResponse: vi.fn(),
  hasSubmitted: vi.fn(),
  getMyResponse: vi.fn(),
  saveDraft: vi.fn(),
  getDraft: vi.fn(),
  deleteDraft: vi.fn(),
}));

vi.mock('../api/forms', () => ({
  getForm: mocks.getForm,
  acceptFormConsent: mocks.acceptFormConsent,
}));

vi.mock('../api/rounds', () => ({
  getActiveRound: mocks.getActiveRound,
}));

vi.mock('../api/responses', () => ({
  submitResponse: mocks.submitResponse,
  hasSubmitted: mocks.hasSubmitted,
  getMyResponse: mocks.getMyResponse,
  saveDraft: mocks.saveDraft,
  getDraft: mocks.getDraft,
  deleteDraft: mocks.deleteDraft,
}));

vi.mock('../components', () => ({
  BackLink: ({ label }: { label: string }) => <a>{label}</a>,
  LoadingButton: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  SynthesisDisplay: ({ content }: { content: string }) => <div>{content}</div>,
  PresenceIndicator: () => <div data-testid="presence-indicator" />,
  StructuredInput: () => <div data-testid="structured-input" />,
  Skeleton: () => <div data-testid="skeleton" />,
  SkeletonCard: () => <div data-testid="skeleton-card" />,
}));

vi.mock('../components/ConsentGate', () => ({
  default: () => <div data-testid="consent-gate" />,
}));

vi.mock('../components/DocumentTemplateResponse', () => ({
  default: () => <div data-testid="document-template-response" />,
}));

vi.mock('../components/SurveyQuestionList', () => ({
  default: ({ responses, onChange }: { responses: Record<string, { position?: string }>; onChange: (key: string, value: Record<string, unknown>) => void }) => (
    <div data-testid="survey-question-list">
      <button
        onClick={() =>
          onChange('q1', {
            position: '5',
            evidence: '',
            confidence: 5,
            confidenceJustification: '',
            counterarguments: '',
            citations: [],
            expertNominations: [],
          })
        }
      >
        Set slider
      </button>
      <span data-testid="q1-position">{responses.q1?.position ?? ''}</span>
    </div>
  ),
}));

vi.mock('../hooks/usePresence', () => ({
  usePresence: () => ({ viewers: [] }),
}));

vi.mock('../hooks/useDocumentTitle', () => ({
  useDocumentTitle: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('FormPage draft initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the form in loading mode until the initial draft fetch completes', async () => {
    const question = {
      label: 'Staff AI literacy, capability, and training',
      requireEvidence: false,
      requireCounterarguments: false,
      requireConfidence: false,
      inputType: 'slider',
    };
    const draftRequest = deferred<{ draft: null }>();

    mocks.getForm.mockResolvedValue({
      title: 'Race test form',
      questions: [question],
      consent_required: false,
      consent_completed: true,
      document_template: null,
    });
    mocks.getActiveRound.mockResolvedValue({
      round_number: 1,
      questions: [question],
      previous_round_synthesis: '',
    });
    mocks.hasSubmitted.mockResolvedValue({ submitted: false });
    mocks.getDraft.mockReturnValue(draftRequest.promise);

    render(
      <MemoryRouter initialEntries={['/form/1']}>
        <Routes>
          <Route path="/form/:id" element={<FormPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(mocks.getDraft).toHaveBeenCalledWith(1));
    expect(screen.queryByTestId('survey-question-list')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^submit$/i })).not.toBeInTheDocument();

    await act(async () => {
      draftRequest.resolve({ draft: null });
      await draftRequest.promise;
    });

    expect(await screen.findByTestId('survey-question-list')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^submit$/i })).toBeInTheDocument();
  });

  it('clears a validation error once the highlighted question is answered', async () => {
    const question = {
      label: 'Staff AI literacy, capability, and training',
      requireEvidence: false,
      requireCounterarguments: false,
      requireConfidence: false,
      inputType: 'slider',
    };

    mocks.getForm.mockResolvedValue({
      title: 'Validation test form',
      questions: [question],
      consent_required: false,
      consent_completed: true,
      document_template: null,
    });
    mocks.getActiveRound.mockResolvedValue({
      round_number: 1,
      questions: [question],
      previous_round_synthesis: '',
    });
    mocks.hasSubmitted.mockResolvedValue({ submitted: false });
    mocks.getDraft.mockResolvedValue({ draft: null });

    render(
      <MemoryRouter initialEntries={['/form/1']}>
        <Routes>
          <Route path="/form/:id" element={<FormPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: /^submit$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please answer "Staff AI literacy, capability, and training" before submitting.',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Set slider' }));

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});

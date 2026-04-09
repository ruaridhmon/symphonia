import { Download, FileSpreadsheet, FileText, Layers3, MessageSquareText, X } from 'lucide-react';
import { saveAs } from 'file-saver';
import { useEffect, useState } from 'react';
import { saveBackendExport } from '../api/exports';
import { getRounds, getRoundsWithResponses } from '../api/rounds';
import type { Form, Round, RoundWithResponses } from '../types/summary';

interface DownloadSheetProps {
  open: boolean;
  onClose: () => void;
  form: Pick<Form, 'id' | 'title'> | null;
  rounds?: Round[];
  structuredRounds?: RoundWithResponses[];
}

type ExportScope = 'consultation' | 'synthesis' | 'responses';

const SCOPE_OPTIONS: Array<{
  id: ExportScope;
  label: string;
  description: string;
  icon: typeof Layers3;
}> = [
  {
    id: 'consultation',
    label: 'Everything',
    description: 'Summary and all responses together.',
    icon: Layers3,
  },
  {
    id: 'synthesis',
    label: 'Summary only',
    description: 'Consensus and round synthesis.',
    icon: FileText,
  },
  {
    id: 'responses',
    label: 'Responses only',
    description: 'All participant responses by round.',
    icon: MessageSquareText,
  },
];

function formatDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB');
}

function serializeAnswer(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

async function exportWordDocument(
  scope: ExportScope,
  form: Pick<Form, 'id' | 'title'>,
  rounds: Round[],
  structuredRounds: RoundWithResponses[],
) {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx');

  const children: InstanceType<typeof Paragraph>[] = [];
  const pushHeading = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) => {
    children.push(new Paragraph({ text, heading: level }));
  };
  const pushText = (text: string) => {
    children.push(new Paragraph({ children: [new TextRun(text || ' ')] }));
  };

  pushHeading(form.title, HeadingLevel.TITLE);
  pushText(`Exported ${new Date().toLocaleString('en-GB')}`);

  if (scope === 'synthesis' || scope === 'consultation') {
    pushHeading('Summary', HeadingLevel.HEADING_1);
    rounds.forEach((round) => {
      pushHeading(`Round ${round.round_number}`, HeadingLevel.HEADING_2);
      if (round.synthesis) {
        round.synthesis.split('\n').forEach((line) => pushText(line));
      } else {
        pushText('No summary available.');
      }
    });
  }

  if (scope === 'responses' || scope === 'consultation') {
    pushHeading(scope === 'consultation' ? 'Responses' : 'All responses', HeadingLevel.HEADING_1);
    structuredRounds.forEach((round) => {
      pushHeading(`Round ${round.round_number}`, HeadingLevel.HEADING_2);
      if (!round.responses.length) {
        pushText('No responses recorded.');
        return;
      }
      round.responses.forEach((response, index) => {
        pushHeading(
          `Response ${index + 1}${response.email ? ` (${response.email})` : ''}`,
          HeadingLevel.HEADING_3,
        );
        if (response.timestamp) {
          pushText(`Submitted: ${formatDate(response.timestamp)}`);
        }
        Object.entries(response.answers || {}).forEach(([key, value]) => {
          pushText(`${key}: ${serializeAnswer(value)}`);
        });
      });
    });
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const base = form.title.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase() || `form-${form.id}`;
  const suffix = scope === 'consultation' ? 'consultation' : scope === 'responses' ? 'responses' : 'summary';
  saveAs(blob, `${base}-${suffix}.docx`);
}

export default function DownloadSheet({
  open,
  onClose,
  form,
  rounds,
  structuredRounds,
}: DownloadSheetProps) {
  const providedRounds = rounds ?? [];
  const providedStructuredRounds = structuredRounds ?? [];
  const [selectedScope, setSelectedScope] = useState<ExportScope>('consultation');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadedRounds, setLoadedRounds] = useState<Round[]>(providedRounds);
  const [loadedStructuredRounds, setLoadedStructuredRounds] = useState<RoundWithResponses[]>(providedStructuredRounds);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    setLoadedRounds(providedRounds);
  }, [providedRounds]);

  useEffect(() => {
    setLoadedStructuredRounds(providedStructuredRounds);
  }, [providedStructuredRounds]);

  useEffect(() => {
    if (!open) {
      setSelectedScope('consultation');
      setBusyAction(null);
      setMessage(null);
    }
  }, [open]);

  useEffect(() => {
    let cancelled = false;

    async function loadDetails() {
      if (!open || !form) return;
      if (providedRounds.length > 0 && providedStructuredRounds.length > 0) return;

      setLoadingDetails(true);
      setMessage(null);
      try {
        const [roundData, responseData] = await Promise.all([
          getRounds(form.id),
          getRoundsWithResponses(form.id),
        ]);
        if (!cancelled) {
          setLoadedRounds(roundData as unknown as Round[]);
          setLoadedStructuredRounds(responseData as unknown as RoundWithResponses[]);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : 'Failed to load export data.');
        }
      } finally {
        if (!cancelled) {
          setLoadingDetails(false);
        }
      }
    }

    void loadDetails();
    return () => {
      cancelled = true;
    };
  }, [open, form?.id, providedRounds.length, providedStructuredRounds.length]);

  const visible = open && !!form;
  const exportReady = loadedRounds.length > 0 || loadedStructuredRounds.length > 0;

  async function handlePdfDownload() {
    if (!form) return;
    const actionKey = `${selectedScope}-pdf`;
    setBusyAction(actionKey);
    setMessage(null);
    try {
      await saveBackendExport(form.id, selectedScope, 'pdf');
      setMessage('Download started.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Download failed.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleWordDownload() {
    if (!form) return;
    const actionKey = `${selectedScope}-word`;
    setBusyAction(actionKey);
    setMessage(null);
    try {
      await exportWordDocument(selectedScope, form, loadedRounds, loadedStructuredRounds);
      setMessage('Word document downloaded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Word export failed.');
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Download consultation"
      aria-hidden={!visible}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: visible ? 'flex' : 'none',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.42)',
          backdropFilter: 'blur(8px)',
        }}
      />

      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 520,
          backgroundColor: 'var(--card)',
          border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
          borderRadius: 26,
          padding: '1rem',
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.18)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
              Download
            </div>
            <h2 className="mt-1 text-[1.05rem] font-semibold text-foreground">{form?.title ?? 'Consultation'}</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Choose what to export, then pick a format.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full"
            style={{
              color: 'var(--muted-foreground)',
              backgroundColor: 'color-mix(in srgb, var(--foreground) 4%, transparent)',
              border: '1px solid color-mix(in srgb, var(--border) 55%, transparent)',
            }}
            aria-label="Close download sheet"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {SCOPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = selectedScope === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedScope(option.id)}
                className="flex w-full items-center gap-3 rounded-[1.15rem] px-4 py-3 text-left transition-colors"
                style={{
                  backgroundColor: active
                    ? 'color-mix(in srgb, var(--accent) 8%, var(--background))'
                    : 'var(--background)',
                  border: active
                    ? '1px solid color-mix(in srgb, var(--accent) 30%, var(--border))'
                    : '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
                }}
              >
                <div
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: active
                      ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                      : 'color-mix(in srgb, var(--foreground) 4%, transparent)',
                    color: active ? 'var(--accent)' : 'var(--muted-foreground)',
                  }}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">{option.label}</div>
                  <div className="mt-0.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {option.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div
          className="mt-4 rounded-[1.25rem] p-4"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--background) 84%, var(--card) 16%)',
            border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
          }}
        >
          <div className="text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: 'var(--muted-foreground)' }}>
            Format
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handlePdfDownload()}
              disabled={busyAction !== null || loadingDetails || !form}
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-2.5 text-sm font-medium"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                color: 'var(--accent)',
                opacity: busyAction && busyAction !== `${selectedScope}-pdf` ? 0.6 : 1,
              }}
            >
              <Download size={15} />
              {busyAction === `${selectedScope}-pdf` ? 'Preparing PDF…' : 'Download PDF'}
            </button>
            <button
              type="button"
              onClick={() => void handleWordDownload()}
              disabled={busyAction !== null || loadingDetails || !exportReady || !form}
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-2.5 text-sm font-medium"
              style={{
                backgroundColor: 'var(--background)',
                border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
                color: 'var(--foreground)',
                opacity: busyAction && busyAction !== `${selectedScope}-word` ? 0.6 : 1,
              }}
            >
              <FileSpreadsheet size={15} />
              {busyAction === `${selectedScope}-word` ? 'Preparing Word…' : 'Download Word'}
            </button>
          </div>
          {message ? (
            <p className="mt-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {message}
            </p>
          ) : loadingDetails ? (
            <p className="mt-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Loading consultation data…
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

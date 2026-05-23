import { Download, FileSpreadsheet, FileText, Layers3, MessageSquareText, X } from 'lucide-react';
import { saveAs } from 'file-saver';
import { useEffect, useState } from 'react';
import { saveBackendExport } from '../api/exports';
import { getRounds, getRoundsWithResponses } from '../api/rounds';
import type { Form, Round, RoundWithResponses } from '../types/summary';
import type { Probe } from '../types/synthesis';
import { extractQuestionText } from '../utils/questions';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function questionKey(question: unknown): string | null {
  if (!isRecord(question)) return null;
  const id = question.questionId;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

function isSimpleQuestion(question: unknown): boolean {
  if (!isRecord(question)) return false;
  return ['text', 'textarea', 'single_select', 'multi_select', 'slider', 'likert', 'document']
    .includes(String(question.inputType || ''));
}

function questionLookup(questions: (string | Record<string, unknown>)[]) {
  const lookup: Record<string, string | Record<string, unknown>> = {};
  questions.forEach((question, index) => {
    lookup[`q${index + 1}`] = question;
    const id = questionKey(question);
    if (id) lookup[id] = question;
  });
  return lookup;
}

function scalarText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value).trim();
}

function coerceAnswerPosition(value: unknown): string {
  const scalar = scalarText(value);
  if (scalar) return scalar;
  if (Array.isArray(value)) {
    return value.map(coerceAnswerPosition).filter(Boolean).join('\n');
  }
  if (!isRecord(value)) return '';
  for (const key of ['position', 'value', 'answer', 'selected', 'selectedScore', 'score']) {
    if (key in value) {
      const next = coerceAnswerPosition(value[key]);
      if (next.trim()) return next;
    }
  }
  return '';
}

function formatAnswerFields(value: unknown, question: unknown): Array<{ label: string; value: string }> {
  const simple = isSimpleQuestion(question);
  if (value == null) return [{ label: 'Response', value: 'No response provided' }];
  if (!isRecord(value)) return [{ label: 'Response', value: serializeAnswer(value) || 'No response provided' }];

  if (Array.isArray(value.selectedOptions)) {
    const selected = value.selectedOptions.map(scalarText).filter(Boolean);
    const otherText = scalarText(value.otherText);
    if (otherText) selected.push(otherText);
    if (selected.length) return [{ label: 'Response', value: selected.join(', ') }];
  }

  const position = coerceAnswerPosition(value);
  const fields: Array<{ label: string; value: string }> = [];
  if (position) fields.push({ label: simple ? 'Response' : 'Position', value: position });
  if (simple) return fields.length ? fields : [{ label: 'Response', value: 'No response provided' }];

  const labelledKeys: Array<[string, string]> = [
    ['evidence', 'Evidence'],
    ['confidence', 'Confidence'],
    ['confidenceJustification', 'Confidence rationale'],
    ['counterarguments', 'Counterarguments'],
  ];
  labelledKeys.forEach(([key, label]) => {
    if (!(key in value)) return;
    let rendered = scalarText(value[key]);
    if (!rendered) return;
    if (key === 'confidence') rendered = `${rendered}/10`;
    fields.push({ label, value: rendered });
  });

  ([
    ['citations', 'Citations'],
    ['expertNominations', 'Expert nominations'],
  ] as const).forEach(([key, label]) => {
    const items = value[key];
    if (!Array.isArray(items)) return;
    const rendered = items.map(scalarText).filter(Boolean);
    if (rendered.length) fields.push({ label, value: rendered.join(', ') });
  });

  return fields.length ? fields : [{ label: 'Response', value: serializeAnswer(value) || 'No response provided' }];
}

const ROUND_FEEDBACK_PREAMBLE_RE = /^\s*below is a synthesis you can use as the round\s+1 feedback report and as the basis for round\s+2\.?\s*/i;

function cleanSynthesisText(value: string | null | undefined): string {
  return (value || '').replace(ROUND_FEEDBACK_PREAMBLE_RE, '').trim();
}

function getProbeQuestions(round: Round): Probe[] {
  const probes = round.synthesis_json?.follow_up_probes;
  if (!Array.isArray(probes)) return [];
  return probes.filter((probe): probe is Probe => typeof probe?.question === 'string' && probe.question.trim().length > 0);
}

function getNextRoundQuestionRows(round: Round, nextRound: Round | undefined) {
  const configuredQuestions = (nextRound?.questions || [])
    .map((question) => extractQuestionText(question).trim())
    .filter(Boolean);
  if (configuredQuestions.length) {
    return {
      title: `Questions for Round ${round.round_number + 1}`,
      intro: 'These are the questions currently configured for the next round.',
      rows: configuredQuestions.map((question) => ({ question, rationale: undefined, targetExperts: [] as number[] })),
    };
  }

  const probes = getProbeQuestions(round);
  if (!probes.length) return null;
  return {
    title: `Proposed questions for Round ${round.round_number + 1}`,
    intro: 'Use these questions to turn the synthesis into a focused next round.',
    rows: probes.map((probe) => ({
      question: probe.question.trim(),
      rationale: probe.rationale?.trim(),
      targetExperts: Array.isArray(probe.target_experts) ? probe.target_experts : [],
    })),
  };
}

function wrapExportText(value: string, lineLength = 88): string[] {
  const lines: string[] = [];

  for (const rawLine of value.split('\n')) {
    if (!rawLine) {
      lines.push('');
      continue;
    }

    let remaining = rawLine;
    while (remaining.length > lineLength) {
      const slice = remaining.slice(0, lineLength + 1);
      const breakAt = Math.max(slice.lastIndexOf(' '), slice.lastIndexOf('\t'));
      const cut = breakAt > lineLength * 0.5 ? breakAt : lineLength;
      lines.push(remaining.slice(0, cut).trimEnd());
      remaining = remaining.slice(cut).trimStart();
    }
    lines.push(remaining);
  }

  return lines.length ? lines : [''];
}

async function exportWordDocument(
  scope: ExportScope,
  form: Pick<Form, 'id' | 'title'>,
  rounds: Round[],
  structuredRounds: RoundWithResponses[],
) {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    TextRun,
    convertInchesToTwip,
  } = await import('docx');

  const children: InstanceType<typeof Paragraph>[] = [];
  const pushHeading = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) => {
    children.push(
      new Paragraph({
        text,
        heading: level,
        spacing: {
          before: level === HeadingLevel.TITLE ? 0 : 200,
          after: 100,
        },
        keepNext: true,
      }),
    );
  };
  const pushText = (text: string) => {
    children.push(
      new Paragraph({
        children: [new TextRun(text || ' ')],
        spacing: { after: 120 },
      }),
    );
  };
  const pushLabelValue = (label: string, value: string) => {
    const wrapped = wrapExportText(value || ' ');
    children.push(
      new Paragraph({
        spacing: { before: 40, after: 24 },
        keepNext: true,
        children: [new TextRun({ text: label, bold: true, color: '0F2F67', size: 22 })],
      }),
    );
    wrapped.forEach((line, index) => {
      children.push(
        new Paragraph({
          spacing: { after: index === wrapped.length - 1 ? 110 : 24 },
          indent: { left: 320 },
          children: [new TextRun(line || ' ')],
        }),
      );
    });
  };
  const pushQuestionAnswer = (
    questionLabel: string,
    fields: Array<{ label: string; value: string }>,
  ) => {
    children.push(
      new Paragraph({
        spacing: { before: 80, after: 50 },
        keepNext: true,
        children: [new TextRun({ text: questionLabel, bold: true, color: '0F2F67', size: 23 })],
      }),
    );
    fields.forEach((field, fieldIndex) => {
      const wrapped = wrapExportText(field.value || ' ');
      children.push(
        new Paragraph({
          spacing: { before: fieldIndex === 0 ? 0 : 40, after: 20 },
          indent: { left: 320 },
          keepNext: true,
          children: [new TextRun({ text: `${field.label}:`, bold: true, color: '344054' })],
        }),
      );
      wrapped.forEach((line, index) => {
        children.push(
          new Paragraph({
            spacing: { after: index === wrapped.length - 1 ? 90 : 20 },
            indent: { left: 520 },
            children: [new TextRun(line || ' ')],
          }),
        );
      });
    });
  };

  pushHeading(form.title, HeadingLevel.TITLE);
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 240 },
      border: {
        bottom: {
          color: 'D6DFEE',
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
      children: [new TextRun({ text: `Exported ${new Date().toLocaleString('en-GB')}`, color: '667085' })],
    }),
  );

  if (scope === 'synthesis' || scope === 'consultation') {
    pushHeading('Summary', HeadingLevel.HEADING_1);
    rounds.forEach((round, index) => {
      pushHeading(`Round ${round.round_number}${round.round_number === 1 ? ' feedback report' : ''}`, HeadingLevel.HEADING_2);
      const synthesisText = cleanSynthesisText(round.synthesis);
      if (synthesisText) {
        synthesisText.split('\n').forEach((line) => pushText(line));
      } else {
        pushText('No summary available.');
      }
      const nextQuestions = getNextRoundQuestionRows(round, rounds[index + 1]);
      if (nextQuestions) {
        pushHeading(nextQuestions.title, HeadingLevel.HEADING_3);
        pushText(nextQuestions.intro);
        nextQuestions.rows.forEach((row, rowIndex) => {
          pushLabelValue(`${rowIndex + 1}.`, row.question);
          if (row.rationale) pushLabelValue('Rationale', row.rationale);
          if (row.targetExperts?.length) {
            pushLabelValue('Target experts', row.targetExperts.map((expert) => `Expert ${expert}`).join(', '));
          }
        });
      }
    });
  }

  if (scope === 'responses' || scope === 'consultation') {
    pushHeading(scope === 'consultation' ? 'Responses' : 'All responses', HeadingLevel.HEADING_1);
    structuredRounds.forEach((round) => {
      pushHeading(`Round ${round.round_number}`, HeadingLevel.HEADING_2);
      const sourceRound = rounds.find(item => item.id === round.id || item.round_number === round.round_number);
      const questions = sourceRound?.questions || [];
      const questionsByKey = questionLookup(questions);
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
          pushLabelValue('Submitted', formatDate(response.timestamp));
        }
        Object.entries(response.answers || {}).forEach(([key, value]) => {
          const question = questionsByKey[key];
          const fallbackLabel = key.startsWith('q') ? key.toUpperCase() : key;
          const questionLabel = extractQuestionText(question) || fallbackLabel;
          pushQuestionAnswer(questionLabel, formatAnswerFields(value, question));
        });
        children.push(
          new Paragraph({
            border: {
              bottom: {
                color: 'E2E8F0',
                style: BorderStyle.SINGLE,
                size: 4,
              },
            },
            spacing: { before: 40, after: 120 },
          }),
        );
      });
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.7),
              right: convertInchesToTwip(0.7),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(0.7),
            },
          },
        },
        children,
      },
    ],
    styles: {
      default: {
        document: {
          run: {
            font: 'Aptos',
            size: 22,
            color: '172033',
          },
          paragraph: {
            spacing: {
              line: 320,
            },
          },
        },
      },
    },
  });
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
  const providedRounds = rounds ?? null;
  const providedStructuredRounds = structuredRounds ?? null;
  const [selectedScope, setSelectedScope] = useState<ExportScope>('consultation');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadedRounds, setLoadedRounds] = useState<Round[]>(providedRounds ?? []);
  const [loadedStructuredRounds, setLoadedStructuredRounds] = useState<RoundWithResponses[]>(providedStructuredRounds ?? []);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (providedRounds) {
      setLoadedRounds(providedRounds);
    }
  }, [providedRounds]);

  useEffect(() => {
    if (providedStructuredRounds) {
      setLoadedStructuredRounds(providedStructuredRounds);
    }
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
      if (providedRounds && providedStructuredRounds) return;

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
  }, [open, form?.id, providedRounds, providedStructuredRounds]);

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
        alignItems: 'center',
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
          borderRadius: 14,
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-md"
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
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors"
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
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg"
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
          className="mt-4 rounded-lg p-4"
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
              className="inline-flex items-center gap-2 rounded-md px-3.5 py-2.5 text-sm font-medium"
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
              className="inline-flex items-center gap-2 rounded-md px-3.5 py-2.5 text-sm font-medium"
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

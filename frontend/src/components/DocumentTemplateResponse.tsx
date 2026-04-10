import { createElement, type CSSProperties, type ReactNode } from 'react';
import { emptyStructuredResponse, type StructuredResponse } from '../types/structured-input';
import RichDocumentEditor from './RichDocumentEditor';
import DocumentTemplateFieldControl from './DocumentTemplateFieldControl';
import {
  buildDocumentTemplateLines,
  buildRichDocumentTemplateFieldMap,
  getDocumentTemplateContent,
  getRichFillableTemplateContent,
  isEditableDocumentTemplate,
  isRichFillableDocumentTemplate,
  slugifyDocumentFieldKey,
  type RenderableDocumentTemplateField,
} from '../utils/documentTemplate';
import { isResponseAnswered } from '../utils/responseValidation';

interface DocumentTemplateResponseProps {
  template: string;
  answers: Record<string, StructuredResponse>;
  onChange?: (key: string, value: StructuredResponse) => void;
  onFieldSelect?: (questionKey: string) => void;
  highlightedQuestionKey?: string | null;
  readOnly?: boolean;
  compact?: boolean;
}

function parseInlineStyle(styleValue: string | null): CSSProperties | undefined {
  if (!styleValue?.trim()) return undefined;
  const style: CSSProperties = {};
  styleValue.split(';').forEach((rule) => {
    const [rawProperty, rawValue] = rule.split(':');
    const property = rawProperty?.trim().toLowerCase();
    const value = rawValue?.trim();
    if (!property || !value) return;
    if (property === 'color') style.color = value;
    if (property === 'background-color') style.backgroundColor = value;
    if (property === 'text-align') style.textAlign = value as CSSProperties['textAlign'];
    if (property === 'font-weight') style.fontWeight = value as CSSProperties['fontWeight'];
    if (property === 'font-style') style.fontStyle = value as CSSProperties['fontStyle'];
    if (property === 'font-family') style.fontFamily = value;
    if (property === 'font-size') style.fontSize = value;
    if (property === 'text-decoration') style.textDecoration = value;
    if (property === 'margin-left') style.marginLeft = value;
  });
  return Object.keys(style).length ? style : undefined;
}

function extractSelectedOptions(response: StructuredResponse | undefined): string[] {
  return (response?.position || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isRichFieldVisible(
  field: RenderableDocumentTemplateField,
  orderedEntries: Array<{ field: RenderableDocumentTemplateField; response: StructuredResponse }>,
): boolean {
  if (!field.conditionalOnQuestionId || !field.conditionalOnOption) return true;
  const controllingQuestionId = field.conditionalOnQuestionId;
  const controlling = orderedEntries.find(({ field: candidate }) => (
    candidate.questionId === controllingQuestionId ||
    candidate.key === slugifyDocumentFieldKey(controllingQuestionId)
  ));
  if (!controlling) return false;
  return extractSelectedOptions(controlling.response).includes(field.conditionalOnOption);
}

function renderRichTemplateNode({
  node,
  fieldMap,
  orderedEntries,
  highlightedQuestionKey,
  readOnly,
  onChange,
  onFieldSelect,
  keyPrefix,
}: {
  node: ChildNode;
  fieldMap: Map<string, { field: RenderableDocumentTemplateField; response: StructuredResponse }>;
  orderedEntries: Array<{ field: RenderableDocumentTemplateField; response: StructuredResponse }>;
  highlightedQuestionKey: string | null;
  readOnly: boolean;
  onChange?: (key: string, value: StructuredResponse) => void;
  onFieldSelect?: (questionKey: string) => void;
  keyPrefix: string;
}): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const fieldKey = element.getAttribute('data-symphonia-field-key');
  if (fieldKey) {
    const entry = fieldMap.get(fieldKey);
    if (!entry || !isRichFieldVisible(entry.field, orderedEntries)) return null;
    return (
      <DocumentTemplateFieldControl
        key={`${keyPrefix}-${entry.field.questionKey}`}
        field={entry.field}
        response={entry.response}
        readOnly={readOnly}
        highlighted={highlightedQuestionKey === entry.field.questionKey}
        onChange={(nextValue) => onChange?.(entry.field.questionKey, nextValue)}
        onSelect={() => onFieldSelect?.(entry.field.questionKey)}
      />
    );
  }

  const descendantFieldKeys = Array.from(element.querySelectorAll<HTMLElement>('[data-symphonia-field-key]'))
    .map((fieldElement) => fieldElement.getAttribute('data-symphonia-field-key'))
    .filter((value): value is string => !!value);
  if (
    descendantFieldKeys.length > 0 &&
    descendantFieldKeys.every((descendantKey) => {
      const entry = fieldMap.get(descendantKey);
      return !entry || !isRichFieldVisible(entry.field, orderedEntries);
    })
  ) {
    return null;
  }

  const tagName = element.tagName.toLowerCase();
  const allowedTags = new Set([
    'p', 'div', 'span', 'strong', 'em', 'u', 's', 'mark',
    'h1', 'h2', 'h3', 'blockquote', 'ul', 'ol', 'li', 'br', 'hr',
  ]);
  if (!allowedTags.has(tagName)) {
    return Array.from(element.childNodes).map((child, index) =>
      renderRichTemplateNode({
        node: child,
        fieldMap,
        orderedEntries,
        highlightedQuestionKey,
        readOnly,
        onChange,
        onFieldSelect,
        keyPrefix: `${keyPrefix}-${index}`,
      }),
    );
  }

  if (tagName === 'br') {
    return <br key={keyPrefix} />;
  }
  if (tagName === 'hr') {
    return (
      <hr
        key={keyPrefix}
        style={{
          border: 'none',
          borderTop: '1px solid color-mix(in srgb, var(--border) 78%, transparent)',
          margin: '1.2rem 0',
        }}
      />
    );
  }

  const children = Array.from(element.childNodes).map((child, index) =>
    renderRichTemplateNode({
      node: child,
      fieldMap,
      orderedEntries,
      highlightedQuestionKey,
      readOnly,
      onChange,
      onFieldSelect,
      keyPrefix: `${keyPrefix}-${index}`,
    }),
  );

  return createElement(
    tagName,
    {
      key: keyPrefix,
      className: element.className || undefined,
      style: parseInlineStyle(element.getAttribute('style')),
    },
    children,
  );
}

export default function DocumentTemplateResponse({
  template,
  answers,
  onChange,
  onFieldSelect,
  highlightedQuestionKey = null,
  readOnly = false,
  compact = false,
}: DocumentTemplateResponseProps) {
  if (isEditableDocumentTemplate(template)) {
    const key = 'q1';
    const response = answers[key];
    const value = response?.position || getDocumentTemplateContent(template);
    const highlighted = !readOnly && highlightedQuestionKey === key;

    return (
      <div
        className="rounded-xl p-4 sm:p-5"
        data-question-key={key}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--foreground) 1.5%, var(--card))',
          border: highlighted
            ? '1px solid color-mix(in srgb, var(--destructive) 42%, var(--border))'
            : '1px solid var(--border)',
          scrollMarginTop: '6rem',
        }}
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <span>Edit your copy of the document</span>
          {!readOnly ? (
            <span
              aria-label={isResponseAnswered(response) ? 'Document ready to submit' : 'Document not ready'}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold"
              style={{
                border: isResponseAnswered(response)
                  ? '1px solid color-mix(in srgb, #138a52 35%, transparent)'
                  : '1px solid color-mix(in srgb, var(--border) 90%, transparent)',
                backgroundColor: isResponseAnswered(response)
                  ? 'color-mix(in srgb, #138a52 12%, transparent)'
                  : 'transparent',
                color: isResponseAnswered(response) ? '#138a52' : 'var(--muted-foreground)',
              }}
            >
              {isResponseAnswered(response) ? '✓' : ''}
            </span>
          ) : null}
        </div>
        <RichDocumentEditor
          value={value}
          readOnly={readOnly}
          placeholder="Write the document here…"
          minHeight={readOnly ? '14rem' : '20rem'}
          onChange={(nextValue) => onChange?.(key, { ...(response ?? emptyStructuredResponse()), position: nextValue })}
        />
      </div>
    );
  }

  if (isRichFillableDocumentTemplate(template)) {
    const parser = new DOMParser();
    const document = parser.parseFromString(getRichFillableTemplateContent(template) || '<p></p>', 'text/html');
    const fieldMap = buildRichDocumentTemplateFieldMap(template, answers);
    const orderedEntries = Array.from(fieldMap.values());
    const content = Array.from(document.body.childNodes).map((node, index) =>
      renderRichTemplateNode({
        node,
        fieldMap,
        orderedEntries,
        highlightedQuestionKey,
        readOnly,
        onChange,
        keyPrefix: `rich-${index}`,
      }),
    );

    return (
      <div
        className={compact ? '' : 'rounded-xl p-4 sm:p-5'}
        style={{
          background: compact
            ? 'transparent'
            : 'linear-gradient(180deg, color-mix(in srgb, var(--card) 96%, white) 0%, color-mix(in srgb, var(--foreground) 1%, var(--card)) 100%)',
          border: compact ? 'none' : '1px solid var(--border)',
        }}
      >
        <style>{`
          .symphonia-rich-template {
            color: var(--foreground);
          }
          .symphonia-rich-template h1 { font-size: 1.9rem; line-height: 1.15; margin: 0 0 1rem; font-weight: 700; color: #10223e; }
          .symphonia-rich-template h2 { font-size: 1.3rem; line-height: 1.2; margin: 1.15rem 0 0.7rem; font-weight: 650; color: #183153; }
          .symphonia-rich-template h3 { font-size: 1.08rem; line-height: 1.3; margin: 1rem 0 0.55rem; font-weight: 650; color: #1f3557; }
          .symphonia-rich-template p, .symphonia-rich-template li { line-height: 1.8; }
          .symphonia-rich-template ul, .symphonia-rich-template ol { padding-left: 1.35rem; margin: 0.7rem 0; }
          .symphonia-rich-template blockquote {
            margin: 0.9rem 0;
            padding: 0.75rem 1rem;
            border-left: 4px solid color-mix(in srgb, var(--accent) 42%, transparent);
            background: color-mix(in srgb, var(--accent) 5%, white);
            border-radius: 0.9rem;
          }
        `}</style>
        <div
          className={compact ? '' : 'rounded-2xl px-5 py-6 sm:px-6 sm:py-7'}
          style={{
            backgroundColor: compact ? 'transparent' : 'color-mix(in srgb, white 88%, var(--background))',
            border: compact ? 'none' : '1px solid color-mix(in srgb, var(--border) 68%, transparent)',
            boxShadow: compact ? 'none' : '0 10px 24px -20px rgba(15, 23, 42, 0.38)',
          }}
        >
          <div className="symphonia-rich-template space-y-3">{content}</div>
        </div>
      </div>
    );
  }

  const lines = buildDocumentTemplateLines(template, answers);

  function isInlineTextField(fieldType: string) {
    return fieldType === 'short' || fieldType === 'long';
  }

  return (
    <div
      className="rounded-xl p-4 sm:p-5"
      style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--card) 96%, white) 0%, color-mix(in srgb, var(--foreground) 1%, var(--card)) 100%)',
          border: '1px solid var(--border)',
      }}
    >
      <div
        className="rounded-2xl px-4 py-5 sm:px-5 sm:py-6"
        style={{
          backgroundColor: 'color-mix(in srgb, white 88%, var(--background))',
          border: '1px solid color-mix(in srgb, var(--border) 68%, transparent)',
          boxShadow: '0 10px 24px -20px rgba(15, 23, 42, 0.38)',
        }}
      >
        <div className="space-y-3">
          {lines.map((line) => {
            if (line.segments.length === 0) {
              return <div key={line.key} style={{ minHeight: '0.9rem' }} aria-hidden="true" />;
            }

            return (
              <div
                key={line.key}
                className="flex flex-wrap items-start gap-x-2 gap-y-2"
                style={{ minHeight: '1.9rem' }}
              >
                {line.segments.map((segment, segmentIndex) => {
                  if (segment.type === 'text') {
                    return (
                      <span
                        key={`${line.key}-text-${segmentIndex}`}
                        className="text-sm whitespace-pre-wrap"
                        style={{ color: 'var(--foreground)', lineHeight: 1.75 }}
                      >
                        {segment.value}
                      </span>
                    );
                  }

                  const { questionKey } = segment.value;
                  const response = answers[questionKey] ?? segment.response;
                  const value = response.position || '';
                  const answered = isResponseAnswered(response);
                  const highlighted = !readOnly && highlightedQuestionKey === questionKey;
                  const isShort = segment.value.fieldType === 'short';
                  const usesInlineTextField = isInlineTextField(segment.value.fieldType);

                  return (
                    <div
                      key={`${line.key}-${questionKey}-${segmentIndex}`}
                      className="inline-flex min-w-[15rem] max-w-full flex-col gap-1 rounded-2xl px-3 py-2.5 align-top"
                      data-question-key={questionKey}
                      style={{
                        width: usesInlineTextField
                          ? (isShort ? 'min(100%, 22rem)' : 'min(100%, 34rem)')
                          : 'min(100%, 38rem)',
                        backgroundColor: highlighted
                          ? 'color-mix(in srgb, var(--destructive) 4%, white)'
                          : 'color-mix(in srgb, var(--background) 78%, white)',
                        border: highlighted
                          ? '1px solid color-mix(in srgb, var(--destructive) 42%, var(--border))'
                          : '1px solid color-mix(in srgb, var(--border) 88%, transparent)',
                        boxShadow: answered
                          ? 'inset 0 0 0 1px color-mix(in srgb, #138a52 18%, transparent)'
                          : 'none',
                        scrollMarginTop: '6rem',
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--muted-foreground)' }}>
                          {segment.value.label}
                        </span>
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            backgroundColor: segment.value.optional
                              ? 'color-mix(in srgb, var(--foreground) 5%, transparent)'
                              : 'color-mix(in srgb, var(--accent) 10%, transparent)',
                            color: segment.value.optional ? 'var(--muted-foreground)' : 'var(--accent)',
                          }}
                        >
                          {segment.value.optional ? 'Optional' : 'Required'}
                        </span>
                        {!readOnly ? (
                          <span
                            aria-label={answered ? 'Question answered' : 'Question not answered'}
                            title={answered ? 'Answered' : 'Not answered'}
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold"
                            style={{
                              border: answered
                                ? '1px solid color-mix(in srgb, #138a52 35%, transparent)'
                                : '1px solid color-mix(in srgb, var(--border) 90%, transparent)',
                              backgroundColor: answered
                                ? 'color-mix(in srgb, #138a52 12%, transparent)'
                                : 'transparent',
                              color: answered ? '#138a52' : 'var(--muted-foreground)',
                            }}
                          >
                            {answered ? '✓' : ''}
                          </span>
                        ) : null}
                      </span>
                      <DocumentTemplateFieldControl
                        field={segment.value}
                        response={response}
                        readOnly={readOnly}
                        onChange={(nextValue) => onChange?.(questionKey, nextValue)}
                        highlighted={false}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

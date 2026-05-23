import { createElement, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { emptyStructuredResponse, type StructuredResponse } from '../types/structured-input';
import AnswerStateBadge from './AnswerStateBadge';
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
import type { QuestionInput } from '../utils/questions';
import { isResponseAnswered } from '../utils/responseValidation';

interface DocumentTemplateResponseProps {
  template: string;
  answers: Record<string, StructuredResponse>;
  onChange?: (key: string, value: StructuredResponse) => void;
  onFieldSelect?: (questionKey: string) => void;
  highlightedQuestionKey?: string | null;
  readOnly?: boolean;
  compact?: boolean;
  editableHeading?: string;
  editablePlaceholder?: string;
  editableMinHeight?: string;
  questions?: QuestionInput[];
  paginate?: boolean;
  initialPage?: number;
  onBeforePageChange?: () => void | Promise<void>;
  onPaginationChange?: (state: { currentPage: number; totalPages: number; isLastPage: boolean }) => void;
}

interface RichTemplatePage {
  title: string;
  nodes: ChildNode[];
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

function getNodeText(node: ChildNode): string {
  return node.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function hasRichField(node: ChildNode, fieldKey: string): boolean {
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const element = node as HTMLElement;
  if (element.getAttribute('data-symphonia-field-key') === fieldKey) return true;
  return Boolean(element.querySelector(`[data-symphonia-field-key="${CSS.escape(fieldKey)}"]`));
}

function hasAnyRichField(nodes: ChildNode[]): boolean {
  return nodes.some((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const element = node as HTMLElement;
    return Boolean(
      element.getAttribute('data-symphonia-field-key') ||
      element.querySelector('[data-symphonia-field-key]'),
    );
  });
}

function splitRichTemplatePages(nodes: ChildNode[]): RichTemplatePage[] {
  const pages: RichTemplatePage[] = [];
  let current: RichTemplatePage = { title: 'Start', nodes: [] };
  let currentSection = '';

  const pushCurrent = () => {
    if (current.nodes.length === 0) return;
    pages.push(current);
  };

  nodes.forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      current.nodes.push(node);
      return;
    }

    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();
    const headingText = getNodeText(node);
    const startsSection = tagName === 'h2';
    const startsRecommendationPage =
      tagName === 'h3' && /recommendation-by-recommendation/i.test(currentSection);

    if (startsRecommendationPage && !hasAnyRichField(current.nodes)) {
      current = {
        title: headingText || 'Recommendation',
        nodes: [...current.nodes, node],
      };
      return;
    }

    if (startsSection && pages.length === 0 && !hasAnyRichField(current.nodes)) {
      currentSection = headingText;
      current = {
        title: headingText || 'Section',
        nodes: [...current.nodes, node],
      };
      return;
    }

    if (startsSection || startsRecommendationPage) {
      pushCurrent();
      currentSection = startsSection ? headingText : currentSection;
      current = {
        title: headingText || (startsSection ? 'Section' : 'Recommendation'),
        nodes: [node],
      };
      return;
    }

    current.nodes.push(node);
  });

  pushCurrent();
  return pages.length > 0 ? pages : [{ title: 'Questions', nodes }];
}

function getShortPageTitle(title: string, index: number) {
  if (/summary/i.test(title)) return 'Summary';
  if (/conclusion/i.test(title)) return 'Conclusion';
  const recommendationMatch = title.match(/Recommendation\s+(\d+)/i);
  if (recommendationMatch) return `Rec. ${recommendationMatch[1]}`;
  return `Section ${index + 1}`;
}

export default function DocumentTemplateResponse({
  template,
  answers,
  onChange,
  onFieldSelect,
  highlightedQuestionKey = null,
  readOnly = false,
  compact = false,
  editableHeading = 'Edit your copy of the document',
  editablePlaceholder = 'Write the document here…',
  editableMinHeight,
  questions,
  paginate = false,
  initialPage = 1,
  onBeforePageChange,
  onPaginationChange,
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
          <span>{editableHeading}</span>
          <AnswerStateBadge
            answered={isResponseAnswered(response)}
            answeredLabel="Answered"
            pendingLabel="No response"
            showLabel={readOnly}
          />
        </div>
        <RichDocumentEditor
          value={value}
          readOnly={readOnly}
          placeholder={editablePlaceholder}
          minHeight={editableMinHeight ?? (readOnly ? '14rem' : '20rem')}
          onChange={(nextValue) => onChange?.(key, { ...(response ?? emptyStructuredResponse()), position: nextValue })}
        />
      </div>
    );
  }

  if (isRichFillableDocumentTemplate(template)) {
    const parser = new DOMParser();
    const document = parser.parseFromString(getRichFillableTemplateContent(template) || '<p></p>', 'text/html');
    const fieldMap = buildRichDocumentTemplateFieldMap(template, answers, questions);
    const orderedEntries = Array.from(fieldMap.values());
    const allNodes = Array.from(document.body.childNodes);
    const pages = useMemo(() => splitRichTemplatePages(allNodes), [template]);
    const [currentPage, setCurrentPage] = useState(() => Math.max(0, initialPage - 1));
    const [isChangingPage, setIsChangingPage] = useState(false);
    const shouldPaginate = paginate && pages.length > 1 && !readOnly;
    const selectedPage = shouldPaginate ? pages[Math.min(currentPage, pages.length - 1)] : null;
    const visibleNodes = selectedPage?.nodes ?? allNodes;
    const content = visibleNodes.map((node, index) =>
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

    useEffect(() => {
      if (!shouldPaginate) {
        onPaginationChange?.({ currentPage: 1, totalPages: 1, isLastPage: true });
        return;
      }
      onPaginationChange?.({
        currentPage: currentPage + 1,
        totalPages: pages.length,
        isLastPage: currentPage >= pages.length - 1,
      });
    }, [currentPage, onPaginationChange, pages.length, shouldPaginate]);

    useEffect(() => {
      if (!shouldPaginate) return;
      if (currentPage >= pages.length) {
        setCurrentPage(Math.max(0, pages.length - 1));
      }
    }, [currentPage, pages.length, shouldPaginate]);

    async function changePage(nextPage: number) {
      if (isChangingPage) return;
      const boundedPage = Math.max(0, Math.min(pages.length - 1, nextPage));
      if (boundedPage === currentPage) return;
      setIsChangingPage(true);
      try {
        await onBeforePageChange?.();
        setCurrentPage(boundedPage);
      } finally {
        setIsChangingPage(false);
      }
    }

    useEffect(() => {
      if (!shouldPaginate || !highlightedQuestionKey) return;
      const entry = orderedEntries.find(({ field }) => field.questionKey === highlightedQuestionKey);
      if (!entry) return;
      const pageIndex = pages.findIndex((page) =>
        page.nodes.some((node) => hasRichField(node, entry.field.key)),
      );
      if (pageIndex >= 0 && pageIndex !== currentPage) {
        setCurrentPage(pageIndex);
      }
    }, [currentPage, highlightedQuestionKey, orderedEntries, pages, shouldPaginate]);

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
          {shouldPaginate ? (
            <div
              className="mb-5 rounded-xl p-3"
              style={{
                border: '1px solid color-mix(in srgb, var(--border) 78%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--background) 72%, white)',
              }}
            >
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--muted-foreground)' }}>
                Round 2 sections
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Round 2 sections">
                {pages.map((page, index) => {
                  const isActive = index === currentPage;
                  return (
                    <button
                      key={`${page.title}-${index}`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => void changePage(index)}
                      disabled={isChangingPage}
                      className="inline-flex shrink-0 items-center justify-center rounded-md px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55"
                      style={{
                        border: isActive
                          ? '1px solid color-mix(in srgb, var(--accent) 56%, var(--border))'
                          : '1px solid color-mix(in srgb, var(--border) 82%, transparent)',
                        backgroundColor: isActive
                          ? 'color-mix(in srgb, var(--accent) 12%, var(--background))'
                          : 'var(--background)',
                        color: isActive ? 'var(--accent)' : 'var(--foreground)',
                      }}
                    >
                      {getShortPageTitle(page.title, index)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="symphonia-rich-template space-y-3">{content}</div>
          {shouldPaginate ? (
            <div
              className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
              style={{ borderColor: 'color-mix(in srgb, var(--border) 76%, transparent)' }}
            >
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--accent)' }}>
                  Section {currentPage + 1} of {pages.length}
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">{selectedPage?.title}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void changePage(currentPage - 1)}
                  disabled={currentPage === 0 || isChangingPage}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-45"
                  style={{
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => void changePage(currentPage + 1)}
                  disabled={currentPage >= pages.length - 1 || isChangingPage}
                  className="inline-flex min-w-[8.25rem] items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45"
                  style={{
                    border: '1px solid color-mix(in srgb, var(--accent) 34%, var(--border))',
                    backgroundColor: 'color-mix(in srgb, var(--accent) 10%, var(--background))',
                    color: 'var(--accent)',
                  }}
                >
                  {isChangingPage ? 'Saving...' : 'Save & Next'}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const lines = buildDocumentTemplateLines(template, answers);

  function isInlineTextField(fieldType: string) {
    return fieldType === 'short' || fieldType === 'long';
  }

  function usesFullWidthField(fieldType: string) {
    return (
      isInlineTextField(fieldType) ||
      fieldType === 'single_select' ||
      fieldType === 'multi_select' ||
      fieldType === 'slider' ||
      fieldType === 'likert'
    );
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
                  const answered = isResponseAnswered(response);
                  const highlighted = !readOnly && highlightedQuestionKey === questionKey;
                  const fullWidthField = usesFullWidthField(segment.value.fieldType);

                  return (
                    <div
                      key={`${line.key}-${questionKey}-${segmentIndex}`}
                      className="flex max-w-full flex-col gap-1 rounded-2xl px-3 py-2.5 align-top"
                      data-question-key={questionKey}
                      style={{
                        width: fullWidthField ? '100%' : 'min(100%, 38rem)',
                        minWidth: fullWidthField ? 0 : '15rem',
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
                        {readOnly ? (
                          <AnswerStateBadge
                            answered={answered}
                            answeredLabel="Answered"
                            pendingLabel="No response"
                            showLabel
                          />
                        ) : (
                          <>
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
                            <AnswerStateBadge answered={answered} />
                          </>
                        )}
                      </span>
                      <DocumentTemplateFieldControl
                        field={{ ...segment.value, showLabel: false }}
                        response={response}
                        readOnly={readOnly}
                        showMeta={false}
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

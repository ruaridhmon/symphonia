import { useMemo, useRef, useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { API_BASE_URL } from '../config';
import RichDocumentEditor from './RichDocumentEditor';
import DocumentTemplateResponse from './DocumentTemplateResponse';
import { importDocxAsHtml } from '../utils/docxImport';
import {
  createDocumentTemplatePlaceholder,
  createEditableDocumentTemplate,
  getDocumentTemplateContent,
  getDocumentTemplateMode,
  htmlToPlainText,
  isEditableDocumentTemplate,
  parseDocumentTemplateFields,
} from '../utils/documentTemplate';
import type { StructuredResponse } from '../types/structured-input';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

interface DocumentTemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  previewAnswers?: Record<string, StructuredResponse>;
  onPreviewChange?: (key: string, value: StructuredResponse) => void;
}

const COMMAND_OPTIONS = [
  { id: 'short', label: 'Short text', description: 'Single-line answer', value: createDocumentTemplatePlaceholder('short', 'Field name') },
  { id: 'long', label: 'Long text', description: 'Paragraph answer', value: createDocumentTemplatePlaceholder('long', 'Section response') },
  { id: 'optional short', label: 'Optional short text', description: 'Single-line optional answer', value: createDocumentTemplatePlaceholder('short', 'Optional field', true) },
  { id: 'optional long', label: 'Optional long text', description: 'Paragraph optional answer', value: createDocumentTemplatePlaceholder('long', 'Optional response', true) },
];

export default function DocumentTemplateEditor({
  value,
  onChange,
  previewAnswers = {},
  onPreviewChange,
}: DocumentTemplateEditorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashRange, setSlashRange] = useState<{ start: number; end: number } | null>(null);
  const [fillableView, setFillableView] = useState<'author' | 'participant'>('author');
  const mode = getDocumentTemplateMode(value);
  const editableContent = getDocumentTemplateContent(value);
  const fields = useMemo(() => parseDocumentTemplateFields(value), [value]);
  const filteredCommands = COMMAND_OPTIONS.filter((option) =>
    !slashQuery.trim() || option.id.includes(slashQuery.trim().toLowerCase()),
  );

  function updateSlashState(nextValue: string, caretPosition: number) {
    if (mode !== 'fillable') {
      setSlashQuery('');
      setSlashRange(null);
      return;
    }

    const beforeCaret = nextValue.slice(0, caretPosition);
    const lineStart = beforeCaret.lastIndexOf('\n') + 1;
    const slashIndex = beforeCaret.lastIndexOf('/');
    if (slashIndex < lineStart) {
      setSlashQuery('');
      setSlashRange(null);
      return;
    }

    const query = beforeCaret.slice(slashIndex + 1);
    if (!/^[a-z\s]*$/i.test(query)) {
      setSlashQuery('');
      setSlashRange(null);
      return;
    }

    setSlashQuery(query);
    setSlashRange({ start: slashIndex, end: caretPosition });
  }

  function insertTemplateAtCursor(snippet: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value ? `${value}\n${snippet}` : snippet);
      return;
    }

    const selectionStart = slashRange?.start ?? textarea.selectionStart;
    const selectionEnd = slashRange?.end ?? textarea.selectionEnd;
    const nextValue = `${value.slice(0, selectionStart)}${snippet}${value.slice(selectionEnd)}`;
    onChange(nextValue);
    setSlashQuery('');
    setSlashRange(null);

    const labelStart = snippet.indexOf(':') + 1;
    const labelEnd = snippet.lastIndexOf('}}');
    const nextSelectionStart = selectionStart + (labelStart > 0 ? labelStart : snippet.length);
    const nextSelectionEnd = selectionStart + (labelEnd > labelStart ? labelEnd : snippet.length);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextSelectionStart, nextSelectionEnd);
    });
  }

  async function handleFileSelected(file: File | null) {
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      if (mode === 'editable') {
        const normalizedHtml = await importDocxAsHtml(file);
        onChange(createEditableDocumentTemplate(normalizedHtml));
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);

      const csrfToken = getCookie('csrf_token');
      const bearerToken = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/forms/document-template/extract`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
          ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.detail || `Upload failed (HTTP ${response.status})`);
      }

      if (typeof payload.template === 'string') {
        onChange(payload.template);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to import .docx file');
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  function switchMode(nextMode: 'fillable' | 'editable') {
    if (nextMode === mode) return;

    if (nextMode === 'editable') {
      const source = editableContent.trim() || value.trim();
      const paragraphs = source
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`)
        .join('');
      onChange(createEditableDocumentTemplate(paragraphs || '<p></p>'));
      return;
    }

    const fallback = htmlToPlainText(editableContent);
    onChange(fallback);
  }

  return (
    <div
      className="rounded-xl p-4 sm:p-5"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--foreground) 2%, var(--card))',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Document Template</h3>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Choose whether participants fill marked fields in place or receive their own editable copy of the whole document.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex overflow-hidden rounded-lg"
            style={{ border: '1px solid var(--border)' }}
          >
            {[
              { id: 'fillable', label: 'Fill fields' },
              { id: 'editable', label: 'Editable copy' },
            ].map((option) => {
              const active = mode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => switchMode(option.id as 'fillable' | 'editable')}
                  className="px-3 py-2 text-sm font-medium"
                  style={{
                    border: 'none',
                    borderRight: option.id === 'fillable' ? '1px solid var(--border)' : 'none',
                    backgroundColor: active ? 'var(--accent)' : 'var(--card)',
                    color: active ? 'white' : 'var(--muted-foreground)',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".docx"
            onChange={(event) => handleFileSelected(event.target.files?.[0] ?? null)}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
              color: 'var(--accent)',
              border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              cursor: isUploading ? 'progress' : 'pointer',
            }}
          >
            <Upload size={15} />
            {isUploading ? 'Importing…' : 'Import .docx'}
          </button>
        </div>
      </div>

      <div className="mt-4">
        {isEditableDocumentTemplate(value) ? (
          <RichDocumentEditor
            value={editableContent}
            placeholder="Paste or import the base document here…"
            minHeight="20rem"
            onChange={(nextValue) => onChange(createEditableDocumentTemplate(nextValue))}
          />
        ) : (
          <div
            className="rounded-2xl p-4"
            style={{
              backgroundColor: 'color-mix(in srgb, white 84%, var(--background))',
              border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
            }}
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div
                className="inline-flex overflow-hidden rounded-xl"
                style={{ border: '1px solid color-mix(in srgb, var(--border) 80%, transparent)' }}
              >
                {[
                  { id: 'author', label: 'Authoring view' },
                  { id: 'participant', label: 'Participant view' },
                ].map((option) => {
                  const active = fillableView === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFillableView(option.id as 'author' | 'participant')}
                      className="px-3 py-2 text-sm font-medium"
                      style={{
                        border: 'none',
                        borderRight: option.id === 'author' ? '1px solid color-mix(in srgb, var(--border) 80%, transparent)' : 'none',
                        backgroundColor: active ? 'white' : 'transparent',
                        color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  color: 'var(--muted-foreground)',
                }}
              >
                {fields.length} field{fields.length === 1 ? '' : 's'}
              </span>
            </div>

            {fillableView === 'author' ? (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {COMMAND_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => insertTemplateAtCursor(option.value)}
                      className="rounded-full px-3 py-1.5 text-xs font-medium"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                        color: 'var(--accent)',
                        border: '1px solid color-mix(in srgb, var(--accent) 24%, transparent)',
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="text-xs" style={{ color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
                  Write the document as normal text, then type <code>/</code> or use the buttons above to insert fillable parts directly into the draft.
                </div>
                <div className="relative mt-4">
                  <textarea
                    ref={textareaRef}
                    data-testid="document-template-source"
                    value={value}
                    onChange={(event) => {
                      onChange(event.target.value);
                      updateSlashState(event.target.value, event.target.selectionStart ?? 0);
                    }}
                    onClick={(event) => updateSlashState(event.currentTarget.value, event.currentTarget.selectionStart ?? 0)}
                    onKeyUp={(event) => updateSlashState(event.currentTarget.value, event.currentTarget.selectionStart ?? 0)}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setSlashQuery('');
                        setSlashRange(null);
                      }, 120);
                    }}
                    rows={16}
                    className="w-full rounded-2xl px-5 py-5 text-sm"
                    style={{
                      border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
                      backgroundColor: 'white',
                      color: 'var(--foreground)',
                      outline: 'none',
                      resize: 'vertical',
                      lineHeight: 1.75,
                      fontFamily: 'Georgia, Cambria, \"Times New Roman\", serif',
                      boxShadow: '0 10px 24px -24px rgba(15, 23, 42, 0.45)',
                    }}
                    placeholder={`Background\nThis consultation asks experts to complete the draft note below.\n\nRecommendation\n{{long:Executive summary}}\n\nLead organisation\n{{short:Organisation}}`}
                  />
                  {slashRange && filteredCommands.length > 0 ? (
                    <div
                      className="absolute left-4 right-4 top-4 z-10 rounded-2xl p-2"
                      style={{
                        backgroundColor: 'color-mix(in srgb, white 94%, var(--card))',
                        border: '1px solid color-mix(in srgb, var(--border) 85%, transparent)',
                        boxShadow: '0 18px 40px -28px rgba(15, 23, 42, 0.5)',
                      }}
                    >
                      {filteredCommands.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => insertTemplateAtCursor(option.value)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--foreground)',
                          }}
                        >
                          <span className="text-sm font-medium">{option.label}</span>
                          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                            {option.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div>
                <div className="mb-3 text-xs" style={{ color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
                  This is the same document flow participants will complete. Switch back to authoring view to change the source text or insert fields.
                </div>
                <DocumentTemplateResponse
                  template={value}
                  answers={previewAnswers}
                  onChange={onPreviewChange}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div
          className="rounded-lg px-3 py-3 text-xs"
          style={{
            backgroundColor: 'var(--background)',
            border: '1px solid var(--border)',
            color: 'var(--muted-foreground)',
            lineHeight: 1.6,
          }}
        >
          {isEditableDocumentTemplate(value) ? (
            <>Participants will open this document and edit their own copy directly. `.docx` imports preserve much more structure here than the fill-field mode.</>
          ) : (
            <><code>{'{{short:Field}}'}</code> creates a one-line answer box. <code>{'{{long:Field}}'}</code> creates a
            larger response area. Typing <code>/</code> in the editor opens quick insert options, and reusing the same placeholder name maps to one shared field.</>
          )}
        </div>

        <div
          className="rounded-lg px-3 py-3"
          style={{
            backgroundColor: 'var(--background)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <FileText size={15} />
            {isEditableDocumentTemplate(value) ? 'Participant view' : 'Fillable fields'}
          </div>
          {isEditableDocumentTemplate(value) ? (
            <p className="mt-2 text-xs" style={{ color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
              Participants will see the imported document itself and can edit their own version before submitting.
            </p>
          ) : fields.length === 0 ? (
            <p className="mt-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Add at least one placeholder to create a document form.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {fields.map((field) => (
                <span
                  key={field.key}
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                    color: 'var(--accent)',
                  }}
                >
                  {field.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {uploadError && (
        <div
          className="mt-3 rounded-lg px-3 py-2 text-sm"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
            border: '1px solid var(--destructive)',
            color: 'var(--destructive)',
          }}
        >
          {uploadError}
        </div>
      )}
    </div>
  );
}

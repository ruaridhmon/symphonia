import { useMemo, useRef, useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { API_BASE_URL } from '../config';
import RichDocumentEditor from './RichDocumentEditor';
import { importDocxAsHtml } from '../utils/docxImport';
import {
  createEditableDocumentTemplate,
  getDocumentTemplateContent,
  getDocumentTemplateMode,
  htmlToPlainText,
  isEditableDocumentTemplate,
  parseDocumentTemplateFields,
} from '../utils/documentTemplate';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

interface DocumentTemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function DocumentTemplateEditor({
  value,
  onChange,
}: DocumentTemplateEditorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const mode = getDocumentTemplateMode(value);
  const editableContent = getDocumentTemplateContent(value);
  const fields = useMemo(() => parseDocumentTemplateFields(value), [value]);

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
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={16}
            className="w-full rounded-xl px-3 py-3 text-sm"
            style={{
              border: '1px solid var(--input)',
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
              outline: 'none',
              resize: 'vertical',
              lineHeight: 1.6,
              fontFamily: 'inherit',
            }}
            placeholder={`Background\nThis consultation asks experts to complete the draft note below.\n\nRecommendation\n{{long:Executive summary}}\n\nLead organisation\n{{short:Organisation}}`}
          />
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
            larger response area. Reusing the same placeholder name will map to one shared field.</>
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

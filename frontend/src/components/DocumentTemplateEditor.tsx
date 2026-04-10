import { useMemo, useRef, useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { API_BASE_URL } from '../config';
import RichDocumentEditor from './RichDocumentEditor';
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

function normalizeImportedDocumentHtml(sourceHtml: string): string {
  const parser = new DOMParser();
  const document = parser.parseFromString(sourceHtml, 'text/html');

  document.querySelectorAll('script, style').forEach((node) => node.remove());

  document.querySelectorAll('*').forEach((element) => {
    const allowedAttributes = new Set(['href', 'colspan', 'rowspan', 'class', 'style']);
    for (const attribute of Array.from(element.attributes)) {
      const attributeName = attribute.name.toLowerCase();
      if (!allowedAttributes.has(attributeName)) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (attributeName === 'href') {
        const href = attribute.value.trim();
        if (!/^(https?:|mailto:|tel:|#)/i.test(href)) {
          element.removeAttribute(attribute.name);
        }
      }

      if (attributeName === 'style') {
        const safeStyles = attribute.value
          .split(';')
          .map((rule) => rule.trim())
          .filter(Boolean)
          .filter((rule) => {
            const [property = ''] = rule.split(':');
            return [
              'color',
              'background-color',
              'text-align',
              'font-weight',
              'font-style',
              'text-decoration',
              'text-decoration-line',
              'text-decoration-color',
              'border',
              'border-top',
              'border-right',
              'border-bottom',
              'border-left',
            ].includes(property.trim().toLowerCase());
          });

        if (safeStyles.length > 0) {
          element.setAttribute('style', safeStyles.join('; '));
        } else {
          element.removeAttribute('style');
        }
      }
    }
  });

  if (!document.body.innerHTML.trim()) {
    return '<p></p>';
  }

  return document.body.innerHTML
    .replace(/<p>\s*<\/p>/g, '<p></p>')
    .trim();
}

function inlineEditableImportStyles(container: HTMLElement): string {
  const styleProperties = [
    'color',
    'background-color',
    'text-align',
    'font-weight',
    'font-style',
    'text-decoration',
    'text-decoration-line',
    'text-decoration-color',
    'border',
    'border-top',
    'border-right',
    'border-bottom',
    'border-left',
  ];

  container.querySelectorAll<HTMLElement>('*').forEach((element) => {
    const computed = window.getComputedStyle(element);
    const rules = styleProperties
      .map((property) => {
        const value = computed.getPropertyValue(property).trim();
        if (!value) return null;
        if (property === 'color' && value === 'rgb(0, 0, 0)') return null;
        if (property === 'background-color' && /rgba?\(0,\s*0,\s*0,\s*0\)/.test(value)) return null;
        if (property.startsWith('border') && (value === '0px none rgb(0, 0, 0)' || value === 'none')) return null;
        if ((property === 'text-decoration' || property === 'text-decoration-line') && value === 'none') return null;
        if (property === 'font-weight' && value === '400') return null;
        if (property === 'font-style' && value === 'normal') return null;
        if (property === 'text-align' && value === 'start') return null;
        return `${property}: ${value}`;
      })
      .filter((rule): rule is string => Boolean(rule));

    if (rules.length > 0) {
      element.setAttribute('style', rules.join('; '));
    }

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name === 'class' && attribute.value.startsWith('docx')) {
        continue;
      }
      if (name.startsWith('data-')) {
        element.removeAttribute(attribute.name);
      }
    }
  });

  const documentRoot = container.querySelector<HTMLElement>('.docx');
  return documentRoot?.innerHTML || container.innerHTML;
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
        const arrayBuffer = await file.arrayBuffer();
        const docxPreview = await import('docx-preview');
        const container = document.createElement('div');
        await docxPreview.renderAsync(arrayBuffer, container, undefined, {
          className: 'docx',
          inWrapper: false,
          ignoreWidth: true,
          ignoreHeight: true,
          breakPages: false,
          renderFootnotes: false,
          renderEndnotes: false,
          renderHeaders: false,
          renderFooters: false,
          useBase64URL: true,
        });

        const normalizedHtml = normalizeImportedDocumentHtml(inlineEditableImportStyles(container));
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

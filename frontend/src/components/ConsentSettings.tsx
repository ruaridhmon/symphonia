import { useRef, useState } from 'react';
import { FileText, ShieldCheck, Upload, X } from 'lucide-react';

import { ToggleSwitch } from './ToggleSwitch';
import RichDocumentEditor from './RichDocumentEditor';
import { importDocxAsHtml } from '../utils/docxImport';

type Props = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  consentText: string;
  onConsentTextChange: (value: string) => void;
  consentDocument: string;
  onConsentDocumentChange: (value: string) => void;
};

export default function ConsentSettings({
  enabled,
  onEnabledChange,
  consentText,
  onConsentTextChange,
  consentDocument,
  onConsentDocumentChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileSelected(file: File | null) {
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const html = await importDocxAsHtml(file);
      onConsentDocumentChange(html);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to import consent document');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <section
      className="rounded-2xl p-4 sm:p-5"
      style={{
        border: '1px solid var(--border)',
        background:
          enabled
            ? 'color-mix(in srgb, var(--accent) 5%, var(--card))'
            : 'var(--card)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} style={{ color: 'var(--accent)' }} />
            <h2 className="text-sm font-semibold text-foreground">Consent step</h2>
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Show a short agreement gate before the form. This works for normal participants and public share links.
          </p>
        </div>
        <ToggleSwitch
          id="toggle-consent-step"
          checked={enabled}
          onChange={onEnabledChange}
        />
      </div>

      {enabled ? (
        <div className="mt-4 space-y-4">
          <div
            className="rounded-xl p-4"
            style={{
              border: '1px solid var(--border)',
              backgroundColor: 'var(--background)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <FileText size={16} style={{ color: 'var(--accent)' }} />
                  Consent document
                </div>
                <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  Optional. Upload a `.docx` file if participants should read a document before ticking consent.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
                  {isUploading ? 'Importing…' : consentDocument ? 'Replace document' : 'Upload .docx'}
                </button>
                {consentDocument ? (
                  <button
                    type="button"
                    onClick={() => onConsentDocumentChange('')}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
                    style={{
                      backgroundColor: 'var(--card)',
                      color: 'var(--muted-foreground)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <X size={15} />
                    Remove
                  </button>
                ) : null}
              </div>
            </div>

            {uploadError ? (
              <p className="mt-3 text-sm" style={{ color: 'var(--destructive)' }}>
                {uploadError}
              </p>
            ) : null}

            {consentDocument ? (
              <div className="mt-4">
                <RichDocumentEditor
                  value={consentDocument}
                  readOnly
                  minHeight="14rem"
                />
              </div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              Consent text
            </label>
            <textarea
              value={consentText}
              onChange={(event) => onConsentTextChange(event.target.value)}
              rows={4}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{
                border: '1px solid var(--input)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              This appears directly above the checkbox.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

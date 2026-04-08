import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { API_BASE_URL } from '../config';
import type { ConfigurableQuestion } from '../utils/questions';
import { parseQuestionnaireText, type QuestionnaireImportResult } from '../utils/questionnaireImport';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

interface QuestionnaireImporterProps {
  onImported: (result: QuestionnaireImportResult) => void;
  onQuestionsImported: (questions: ConfigurableQuestion[]) => void;
}

export default function QuestionnaireImporter({
  onImported,
  onQuestionsImported,
}: QuestionnaireImporterProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileSelected(file: File | null) {
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

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

      if (typeof payload.template !== 'string') {
        throw new Error('The uploaded file could not be read.');
      }

      const result = parseQuestionnaireText(payload.template);
      onQuestionsImported(result.questions);
      onImported(result);
      if (result.questions.length === 0) {
        setUploadError(result.warnings[0] ?? 'No questions could be imported from that document.');
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to import questionnaire .docx');
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  return (
    <div
      className="mb-4 rounded-xl p-4"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--foreground) 2%, var(--card))',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Import Questionnaire</h3>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Upload a `.docx` questionnaire spec and Symphonia will convert the first round into survey questions.
            Selects, sliders, and text fields are imported where the format is explicit.
          </p>
        </div>
        <div>
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
            {isUploading ? 'Importing…' : 'Import questionnaire .docx'}
          </button>
        </div>
      </div>

      {uploadError ? (
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
      ) : null}
    </div>
  );
}

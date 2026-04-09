import { saveAs } from 'file-saver';

type ExportFormat = 'markdown' | 'json' | 'pdf';
type ExportKind = 'synthesis' | 'responses' | 'consultation';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function fetchBackendExport(
  formId: number,
  kind: ExportKind,
  format: ExportFormat,
): Promise<{ blob: Blob; filename: string }> {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
  const bearerToken = localStorage.getItem('access_token');
  const csrfToken = getCookie('csrf_token');
  const endpoint =
    kind === 'synthesis'
      ? `/forms/${formId}/export_synthesis?format=${format}`
      : kind === 'responses'
        ? `/forms/${formId}/export_responses?format=${format}`
        : `/forms/${formId}/export_consultation?format=${format}`;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    },
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const bodyText = await response.text();
      if (bodyText) {
        try {
          const parsed = JSON.parse(bodyText) as { detail?: string };
          detail = parsed.detail || bodyText;
        } catch {
          detail = bodyText;
        }
      }
    } catch {
      // ignore body parse errors
    }
    throw new Error(`Export failed (${response.status}): ${detail}`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
  const filename =
    filenameMatch?.[1] ||
    `export.${format === 'json' ? 'json' : format === 'pdf' ? 'pdf' : 'md'}`;
  return { blob, filename };
}

export async function saveBackendExport(
  formId: number,
  kind: ExportKind,
  format: ExportFormat,
) {
  const { blob, filename } = await fetchBackendExport(formId, kind, format);
  saveAs(blob, filename);
}

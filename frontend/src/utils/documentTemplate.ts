import { emptyStructuredResponse, type StructuredResponse } from '../types/structured-input';

export interface DocumentTemplateField {
  key: string;
  label: string;
  fieldType: 'short' | 'long';
  rows: number;
  placeholder: string;
}

const PLACEHOLDER_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function parseDocumentTemplateFields(template: string): DocumentTemplateField[] {
  const fields: DocumentTemplateField[] = [];
  const seen = new Set<string>();

  for (const match of template.matchAll(PLACEHOLDER_PATTERN)) {
    const rawToken = (match[1] || '').trim();
    if (!rawToken) continue;

    let fieldType: 'short' | 'long' = 'long';
    let rows = 4;
    let label = rawToken;

    const separatorIndex = rawToken.indexOf(':');
    if (separatorIndex > 0) {
      const prefix = rawToken.slice(0, separatorIndex).trim().toLowerCase();
      const remainder = rawToken.slice(separatorIndex + 1).trim();
      if ((prefix === 'short' || prefix === 'long') && remainder) {
        fieldType = prefix;
        rows = prefix === 'short' ? 1 : 6;
        label = remainder;
      }
    }

    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    fields.push({
      key,
      label,
      fieldType,
      rows,
      placeholder: `Enter ${label.toLowerCase()}`,
    });
  }

  return fields;
}

export function buildDocumentTemplatePreview(
  template: string,
  answers: Record<string, StructuredResponse>,
): Array<{ type: 'text'; value: string } | { type: 'field'; value: DocumentTemplateField; response: StructuredResponse }> {
  const blocks: Array<{ type: 'text'; value: string } | { type: 'field'; value: DocumentTemplateField; response: StructuredResponse }> = [];
  let cursor = 0;

  for (const match of template.matchAll(PLACEHOLDER_PATTERN)) {
    const fullMatch = match[0];
    const rawToken = match[1] || '';
    const start = match.index ?? 0;
    const preceding = template.slice(cursor, start);
    if (preceding) {
      blocks.push({ type: 'text', value: preceding });
    }

    const field = parseDocumentTemplateFields(`{{${rawToken}}}`)[0];
    if (field) {
      const response = answers[`q${blocks.filter((block) => block.type === 'field').length + 1}`] ?? emptyStructuredResponse();
      blocks.push({ type: 'field', value: field, response });
    } else {
      blocks.push({ type: 'text', value: fullMatch });
    }

    cursor = start + fullMatch.length;
  }

  const trailing = template.slice(cursor);
  if (trailing) {
    blocks.push({ type: 'text', value: trailing });
  }

  return blocks;
}

export function isDocumentTemplate(template: string | null | undefined): boolean {
  return Boolean(template && template.trim());
}

import type { StructuredResponse } from '../types/structured-input';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function isStructuredAnswer(value: unknown): value is StructuredResponse {
  if (!isRecord(value)) return false;
  return (
    'position' in value ||
    'evidence' in value ||
    'confidence' in value ||
    'confidenceJustification' in value ||
    'counterarguments' in value
  );
}

export function formatAnswerForDisplay(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(v => formatAnswerForDisplay(v)).filter(Boolean).join(', ');
  }

  if (isStructuredAnswer(value)) {
    const parts: string[] = [];
    if (value.position?.trim()) parts.push(`Position: ${value.position.trim()}`);
    if (value.evidence?.trim()) parts.push(`Evidence: ${value.evidence.trim()}`);
    if (typeof value.confidence === 'number') parts.push(`Confidence: ${value.confidence}/10`);
    if (value.confidenceJustification?.trim()) {
      parts.push(`Confidence rationale: ${value.confidenceJustification.trim()}`);
    }
    if (value.counterarguments?.trim()) {
      parts.push(`Counterarguments: ${value.counterarguments.trim()}`);
    }
    if (Array.isArray(value.citations) && value.citations.length > 0) {
      parts.push(`Citations: ${value.citations.join(', ')}`);
    }
    if (Array.isArray(value.expertNominations) && value.expertNominations.length > 0) {
      parts.push(`Expert nominations: ${value.expertNominations.join(', ')}`);
    }
    return parts.join('\n');
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

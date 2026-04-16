import type { StructuredResponse } from '../types/structured-input';
import { emptyStructuredResponse } from '../types/structured-input';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function stringifyAnswerScalar(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return String(value);
  return '';
}

export function coerceAnswerPosition(value: unknown): string {
  const scalar = stringifyAnswerScalar(value);
  if (scalar) return scalar;

  if (Array.isArray(value)) {
    return value
      .map((item) => coerceAnswerPosition(item).trim())
      .filter(Boolean)
      .join('\n');
  }

  if (!isRecord(value)) return '';

  for (const key of ['position', 'value', 'answer', 'selected', 'selectedScore', 'score']) {
    if (key in value) {
      const next = coerceAnswerPosition(value[key]);
      if (next.trim()) return next;
    }
  }

  return '';
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

export function normalizeStructuredAnswer(value: unknown): StructuredResponse {
  if (!isRecord(value)) {
    return {
      ...emptyStructuredResponse(),
      position: coerceAnswerPosition(value),
    };
  }

  const normalized = emptyStructuredResponse();

  return {
    ...normalized,
    ...(Array.isArray(value.citations)
      ? { citations: value.citations.filter((item): item is string => typeof item === 'string') }
      : {}),
    ...(Array.isArray(value.expertNominations)
      ? {
          expertNominations: value.expertNominations.filter(
            (item): item is string => typeof item === 'string',
          ),
        }
      : {}),
    position: coerceAnswerPosition(value),
    evidence: stringifyAnswerScalar(value.evidence),
    confidence:
      typeof value.confidence === 'number' && Number.isFinite(value.confidence)
        ? value.confidence
        : normalized.confidence,
    confidenceJustification: stringifyAnswerScalar(value.confidenceJustification),
    counterarguments: stringifyAnswerScalar(value.counterarguments),
  };
}

export function normalizeAnswerRecord(
  answers: Record<string, unknown>,
): Record<string, StructuredResponse> {
  return Object.fromEntries(
    Object.entries(answers).map(([key, value]) => [key, normalizeStructuredAnswer(value)]),
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

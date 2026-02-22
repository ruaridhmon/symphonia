import { api } from './client';

/* ── Types ── */

export interface SubmitResponsePayload {
  form_id: number;
  answers: Record<string, string>;
}

export interface ResponseItem {
  id: number;
  form_id: number;
  user_id: number;
  round_id: number;
  answers: Record<string, string>;
  version: number;
}

export interface HasSubmittedResult {
  submitted: boolean;
}

export interface MyResponse {
  answers: Record<string, string>;
}

/* ── API calls ── */

/**
 * Submit (or re-submit) a response for the active round.
 *
 * Note: the backend expects form-encoded data for this endpoint,
 * so we use postForm (URLSearchParams) instead of JSON.
 */
export function submitResponse(formId: number, answers: Record<string, unknown>) {
  return api.postForm<{ ok: boolean }>('/submit', {
    form_id: String(formId),
    answers: JSON.stringify(answers),
  });
}

/** Check whether the current user has submitted for the active round */
export function hasSubmitted(formId: number) {
  return api.get<HasSubmittedResult>(`/has_submitted?form_id=${formId}`);
}

/** Get the current user's response for the active round */
export function getMyResponse(formId: number) {
  return api.get<MyResponse>(`/form/${formId}/my_response`);
}

/** Admin: get all responses for a form (active round by default) */
export function getResponses(formId: number, allRounds = false) {
  return api.get<ResponseItem[]>(
    `/form/${formId}/responses${allRounds ? '?all_rounds=true' : ''}`
  );
}

/** Admin: update a response's answers (with optimistic concurrency via version) */
export function updateResponse(
  responseId: number,
  answers: Record<string, string>,
  version: number
) {
  return api.put<ResponseItem>(`/responses/${responseId}`, {
    answers,
    version,
  });
}

/** Admin: force-update a response (overwrite regardless of version conflict) */
export function forceUpdateResponse(
  responseId: number,
  answers: Record<string, string>,
  version: number
) {
  return api.put<ResponseItem>(`/responses/${responseId}/force`, {
    answers,
    version,
  });
}

/* ── Server-side Drafts ── */

export interface DraftData {
  answers: Record<string, unknown>;
  updated_at: string | null;
}

/** Save (upsert) a draft for the active round */
export function saveDraft(formId: number, answers: Record<string, unknown>) {
  return api.put<{ ok: boolean }>(`/forms/${formId}/draft`, { answers });
}

/** Load a saved draft for the active round */
export function getDraft(formId: number) {
  return api.get<{ draft: DraftData | null }>(`/forms/${formId}/draft`);
}

/** Delete a draft (e.g. after successful submission) */
export function deleteDraft(formId: number) {
  return api.delete<{ ok: boolean }>(`/forms/${formId}/draft`);
}

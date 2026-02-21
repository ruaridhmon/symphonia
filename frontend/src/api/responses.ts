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
 * so we use URLSearchParams instead of JSON.
 */
export async function submitResponse(formId: number, answers: Record<string, string>) {
  const token = localStorage.getItem('access_token');
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

  const body = new URLSearchParams();
  body.append('form_id', String(formId));
  body.append('answers', JSON.stringify(answers));

  const response = await fetch(`${API_BASE_URL}/submit`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    const { ApiError } = await import('./client');
    throw new ApiError(response.status, await response.text());
  }

  return response.json() as Promise<{ ok: boolean }>;
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

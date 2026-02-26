import { api } from './client';

/* ── Types ── */

export interface Form {
  id: number;
  title: string;
  questions: string[];
  allow_join: boolean;
  join_code: string;
}

export interface FormListItem extends Form {
  participant_count: number;
  current_round: number;
}

export interface FormDetail extends Form {
  expert_labels?: Record<string, unknown>;
}

export interface CreateFormPayload {
  title: string;
  questions: string[];
  allow_join?: boolean;
  join_code?: string;
}

export interface UpdateFormPayload {
  title?: string;
  questions?: string[];
  allow_join?: boolean;
}

/* ── API calls ── */

/** Admin: list all forms with participant counts */
export function getForms() {
  return api.get<FormListItem[]>('/forms');
}

/** Get a single form by id */
export function getForm(formId: number) {
  return api.get<FormDetail>(`/forms/${formId}`);
}

/** Admin: create a new form */
export function createForm(data: CreateFormPayload) {
  return api.post<FormListItem>('/create_form', data);
}

/** Admin: update a form */
export function updateForm(formId: number, data: UpdateFormPayload) {
  return api.put<FormDetail>(`/forms/${formId}`, data);
}

/** User: list forms the current user has unlocked */
export function getMyForms() {
  return api.get<Form[]>('/my_forms');
}

/** User: unlock a form with a join code */
export function unlockForm(joinCode: string) {
  return api.post<{ message: string }>('/forms/unlock', { join_code: joinCode });
}

/* ── User-created forms ── */

export interface OwnedForm {
  id: number;
  title: string;
  join_code: string;
  allow_join: boolean;
  round_count: number;
  participant_count?: number;
}

/** Create a consultation form as the current user */
export function createUserForm(data: { title: string; questions?: unknown[]; allow_join?: boolean }) {
  return api.post<OwnedForm & { owner_id: number }>('/forms/create', {
    questions: [],
    allow_join: true,
    ...data,
  });
}

/** List forms created by current user */
export function getMyCreatedForms() {
  return api.get<OwnedForm[]>('/forms/my-created');
}

/** Regenerate the join code for a form I own */
export function regenerateJoinCode(formId: number) {
  return api.post<{ join_code: string; form_id: number }>(`/forms/${formId}/regenerate-join-code`);
}

/** Delete a form I own */
export function deleteMyForm(formId: number) {
  return api.delete<{ deleted: number; title: string }>(`/forms/${formId}/delete`);
}

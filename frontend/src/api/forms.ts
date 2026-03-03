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
  return api.post<FormListItem>('/forms/create', data);
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

/* ── Invite Codes ── */

export interface InviteCodeItem {
  id: number;
  code: string;
  form_role: string;
  created_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  label: string | null;
}

export function getInviteCodes(formId: number) {
  return api.get<InviteCodeItem[]>(`/forms/${formId}/invite-codes`);
}

export function createInviteCode(formId: number, data?: { form_role?: string; label?: string; max_uses?: number; expires_at?: string }) {
  return api.post<InviteCodeItem>(`/forms/${formId}/invite-codes`, data ?? {});
}

export function updateInviteCode(formId: number, codeId: number, data: { is_active?: boolean; label?: string; max_uses?: number }) {
  return api.patch<InviteCodeItem>(`/forms/${formId}/invite-codes/${codeId}`, data);
}

/* ── Participants ── */

export interface Participant {
  user_id: number;
  email: string;
  form_role: string;
  joined_at: string | null;
}

export function getParticipants(formId: number) {
  return api.get<Participant[]>(`/forms/${formId}/participants`);
}

export function removeParticipant(formId: number, userId: number) {
  return api.delete<{ removed: number; form_id: number }>(`/forms/${formId}/participants/${userId}`);
}

/* ── Join (invite-code-aware) ── */

export function joinForm(code: string) {
  return api.post<{ message: string; form_id: number }>('/forms/join', { code });
}

/* ── Magic join ── */

export function magicJoin(code: string) {
  return api.get<{ message: string; form_id: number; title: string }>(`/join/${code}`);
}

/* ── Admin: User Management ── */

export interface UserListItem {
  id: number;
  email: string;
  role: string;
  is_admin: boolean;
  created_at: string | null;
}

export function getAdminUsers() {
  return api.get<UserListItem[]>('/admin/users');
}

export function updateUserRole(userId: number, role: string) {
  return api.patch<{ id: number; email: string; role: string }>(`/admin/users/${userId}/role`, { role });
}

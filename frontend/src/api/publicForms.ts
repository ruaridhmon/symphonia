import { publicApi } from './client';

export interface PublicFormDetail {
  id: number;
  title: string;
  description?: string | null;
  questions: Array<string | Record<string, unknown>>;
  document_template?: string | null;
  join_code: string;
  previous_round_synthesis?: string;
  allow_public_responses: boolean;
  public_require_consent: boolean;
  public_consent_text: string;
  public_require_upload: boolean;
  public_upload_prompt: string;
}

export interface PublicSessionDetail {
  session_token: string;
  participant_name: string;
  submitted: boolean;
  upload_filename?: string | null;
  form: PublicFormDetail;
  draft: {
    answers: Record<string, unknown>;
    updated_at: string | null;
  } | null;
}

export function getPublicForm(joinCode: string) {
  return publicApi.get<PublicFormDetail>(`/public/forms/${encodeURIComponent(joinCode)}`);
}

export function startPublicFormSession(
  joinCode: string,
  data: {
    participantName: string;
    consentGiven: boolean;
    file?: File | null;
  },
) {
  const formData = new FormData();
  formData.append('participant_name', data.participantName);
  formData.append('consent_given', data.consentGiven ? 'true' : 'false');
  if (data.file) {
    formData.append('file', data.file);
  }
  return publicApi.postMultipart<{ session_token: string; form_id: number; title: string }>(
    `/public/forms/${encodeURIComponent(joinCode)}/start`,
    formData,
  );
}

export function getPublicFormSession(sessionToken: string) {
  return publicApi.get<PublicSessionDetail>(`/public/forms/session/${encodeURIComponent(sessionToken)}`);
}

export function savePublicDraft(
  sessionToken: string,
  data: { participant_name: string; answers: Record<string, unknown> },
) {
  return publicApi.put<{ ok: boolean }>(
    `/public/forms/session/${encodeURIComponent(sessionToken)}/draft`,
    data,
  );
}

export function submitPublicResponse(
  sessionToken: string,
  data: { participant_name: string; answers: Record<string, unknown> },
) {
  return publicApi.post<{ ok: boolean }>(
    `/public/forms/session/${encodeURIComponent(sessionToken)}/submit`,
    data,
  );
}

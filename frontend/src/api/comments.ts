import { api } from './client';

/* ── Types ── */

export interface Comment {
  id: number;
  round_id: number;
  section_type: string;
  section_index: number | null;
  parent_id: number | null;
  author_id: number;
  author_email: string | null;
  body: string;
  created_at: string | null;
  updated_at: string | null;
  replies: Comment[];
}

export interface CreateCommentPayload {
  section_type: string;
  section_index: number | null;
  parent_id: number | null;
  body: string;
}

/* ── API calls ── */

/** Get all comments for a round */
export function getComments(formId: number, roundId: number) {
  return api.get<Comment[]>(
    `/forms/${formId}/rounds/${roundId}/comments`
  );
}

/** Create a new comment */
export function createComment(
  formId: number,
  roundId: number,
  payload: CreateCommentPayload
) {
  return api.post<Comment>(
    `/forms/${formId}/rounds/${roundId}/comments`,
    payload
  );
}

/** Update a comment's body */
export function updateComment(commentId: number, body: string) {
  return api.put<Comment>(`/comments/${commentId}`, { body });
}

/** Delete a comment */
export function deleteComment(commentId: number) {
  return api.delete<{ ok: boolean }>(`/comments/${commentId}`);
}

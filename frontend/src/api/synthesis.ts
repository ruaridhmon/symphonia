import { api } from './client';
import type { SynthesisData } from '../types/synthesis';

/* ── Types ── */

export interface SynthesisVersion {
  id: number;
  round_id: number;
  version: number;
  synthesis: string | null;
  synthesis_json: SynthesisData | null;
  model_used: string | null;
  strategy: string | null;
  is_active: boolean;
  created_at: string | null;
}

export interface GenerateSynthesisPayload {
  model: string;
  strategy: string;
  n_analysts?: number;
  mode?: string;
}

export interface GenerateSynthesisResult {
  synthesis: string;
  summary?: string;
  synthesis_json?: SynthesisData;
}

/* ── API calls ── */

/** Get all synthesis versions for a round */
export function getSynthesisVersions(formId: number, roundId: number) {
  return api.get<SynthesisVersion[]>(
    `/forms/${formId}/rounds/${roundId}/synthesis_versions`
  );
}

/** Activate a specific synthesis version */
export function activateVersion(versionId: number) {
  return api.put<{ ok: boolean }>(
    `/synthesis_versions/${versionId}/activate`,
    {}
  );
}

/** Generate a new synthesis for a round */
export function generateSynthesis(
  formId: number,
  roundId: number,
  payload: GenerateSynthesisPayload
) {
  return api.post<GenerateSynthesisResult>(
    `/forms/${formId}/rounds/${roundId}/generate_synthesis`,
    payload
  );
}

/** Save/push the editor synthesis content */
export function pushSummary(formId: number, summary: string) {
  return api.post<{ ok: boolean }>(`/forms/${formId}/push_summary`, {
    summary,
  });
}

/* ── Devil's Advocate ── */

export interface Counterargument {
  argument: string;
  rationale: string;
  strength: 'strong' | 'moderate' | 'weak';
}

export interface DevilsAdvocateResult {
  counterarguments: Counterargument[];
}

/** Generate AI devil's advocate counterarguments for a round */
export function generateDevilsAdvocate(formId: number, roundId: number) {
  return api.post<DevilsAdvocateResult>(
    `/forms/${formId}/rounds/${roundId}/devil_advocate`
  );
}

/* ── Audience Translation ── */

export type AudienceType =
  | 'policy_maker'
  | 'technical'
  | 'general_public'
  | 'executive'
  | 'academic';

export interface TranslateResult {
  audience: AudienceType;
  audience_label: string;
  translated_text: string;
}

/** Translate synthesis for a specific audience */
export function translateSynthesis(
  formId: number,
  roundId: number,
  audience: AudienceType,
  synthesisText: string
) {
  return api.post<TranslateResult>(
    `/forms/${formId}/rounds/${roundId}/translate`,
    { audience, synthesis_text: synthesisText }
  );
}

/* ── Voice Mirroring ── */

export interface VoiceMirrorInput {
  expert: string;
  question: string;
  answer: string;
}

export interface ClarifiedResponse {
  expert: string;
  question: string;
  original: string;
  clarified: string;
}

export interface VoiceMirrorResult {
  clarified_responses: ClarifiedResponse[];
}

/** Clarify expert responses for accessibility */
export function voiceMirror(
  formId: number,
  roundId: number,
  responses: VoiceMirrorInput[]
) {
  return api.post<VoiceMirrorResult>(
    `/forms/${formId}/rounds/${roundId}/voice_mirror`,
    { responses }
  );
}

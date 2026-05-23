import { api } from './client';
import type { SynthesisData } from '../types/synthesis';
import type { PreviousRoundStatistics } from '../components/RoundIntroCard';

/* ── Types ── */

export interface Round {
  id: number;
  round_number: number;
  synthesis: string | null;
  synthesis_json: SynthesisData | null;
  is_active: boolean;
  questions: (string | Record<string, unknown>)[];
  context_settings?: RoundContextSettings;
  convergence_score: number | null;
  response_count: number;
  draft_count?: number;
}

export interface ActiveRound {
  id: number;
  round_number: number;
  questions: (string | Record<string, unknown>)[];
  context_settings?: RoundContextSettings;
  previous_round_synthesis: string;
  previous_round_statistics?: PreviousRoundStatistics | null;
  show_own_response_to_participants?: boolean;
  previous_round_own_response?: Record<string, unknown> | null;
}

export interface NextRoundResult {
  id: number;
  round_number: number;
  questions: (string | Record<string, unknown>)[];
  context_settings?: RoundContextSettings;
}

export interface RoundConfig {
  questions?: (string | Record<string, unknown>)[];
  context_settings?: RoundContextSettings;
}

export interface RoundContextSettings {
  intro_title?: string;
  intro_body?: string;
}

/* ── API calls ── */

/** Get all rounds for a form */
export function getRounds(formId: number) {
  return api.get<Round[]>(`/forms/${formId}/rounds`);
}

/** Get the currently active round for a form */
export function getActiveRound(formId: number) {
  return api.get<ActiveRound>(`/forms/${formId}/active_round`);
}

/** Admin: advance to the next round */
export function nextRound(formId: number, config?: RoundConfig) {
  return api.post<NextRoundResult>(`/forms/${formId}/next_round`, config);
}

/** Admin: update questions/context for an existing round */
export function updateRound(formId: number, roundId: number, config: RoundConfig) {
  return api.patch<NextRoundResult>(`/forms/${formId}/rounds/${roundId}`, config);
}

/** Admin: make an existing round live */
export function activateRound(formId: number, roundId: number) {
  return api.post<NextRoundResult>(`/forms/${formId}/rounds/${roundId}/activate`);
}

/* ── Types for rounds with responses ── */

export interface ResponseDetail {
  id: number;
  answers: Record<string, unknown>;
  email: string | null;
  timestamp: string;
  version: number;
  round_id: number;
}

export interface RoundWithResponses {
  id: number;
  round_number: number;
  synthesis: string;
  is_active: boolean;
  responses: ResponseDetail[];
}

/** Get all rounds with their responses */
export function getRoundsWithResponses(formId: number) {
  return api.get<RoundWithResponses[]>(
    `/forms/${formId}/rounds_with_responses`
  );
}

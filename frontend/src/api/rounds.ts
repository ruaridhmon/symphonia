import { api } from './client';
import type { SynthesisData } from '../types/synthesis';

/* ── Types ── */

export interface Round {
  id: number;
  round_number: number;
  synthesis: string | null;
  synthesis_json: SynthesisData | null;
  is_active: boolean;
  questions: (string | Record<string, unknown>)[];
  convergence_score: number | null;
  response_count: number;
}

export interface ActiveRound {
  id: number;
  round_number: number;
  questions: string[];
  previous_round_synthesis: string;
}

export interface NextRoundResult {
  id: number;
  round_number: number;
  questions: string[];
}

export interface RoundConfig {
  questions?: string[];
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

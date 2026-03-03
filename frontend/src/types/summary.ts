import type { SynthesisData } from './synthesis';

/** Shared types for the Summary workspace */

export type Round = {
  id: number;
  round_number: number;
  synthesis: string;
  synthesis_json?: SynthesisData | null;
  is_active: boolean;
  questions: (string | Record<string, unknown>)[];
  convergence_score?: number | null;
  response_count?: number;
};

export type Form = {
  id: number;
  title: string;
  questions: (string | Record<string, unknown>)[];
  allow_join: boolean;
  join_code: string;
};

export type StructuredResponse = {
  id: number;
  answers: Record<string, unknown>;
  email: string | null;
  timestamp: string;
  version: number;
  round_id: number;
};

export type RoundWithResponses = {
  id: number;
  round_number: number;
  synthesis: string;
  is_active: boolean;
  responses: StructuredResponse[];
};

export type SynthesisVersion = {
  id: number;
  round_id: number;
  version: number;
  synthesis: string | null;
  synthesis_json: SynthesisData | null;
  model_used: string | null;
  strategy: string | null;
  created_at: string | null;
  is_active: boolean;
};

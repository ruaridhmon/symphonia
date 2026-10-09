import { getRounds, updateRound } from '../api/rounds';
import type { Round } from '../types/summary';
import { buildDelphiRoundTwoQuestions } from './delphiRoundTwo';

const agreement = ['Agree', 'Neither agree nor disagree', 'Disagree'];
/** Repair only an unanswered second round, with server-side stale/draft checks. */
export async function prepareRoundTwoEntry(formId: number, round: Round): Promise<Round['questions']> {
  if (round.round_number !== 2) return round.questions;
  const isRating = (q: Round['questions'][number]): boolean => typeof q === 'object' && /_response$/.test(String(q.questionId)) && Array.isArray(q.options);
  const ratings = round.questions.filter(isRating) as Record<string, unknown>[];
  const correct = ratings.length && ratings.every(q => JSON.stringify(q.options) === JSON.stringify(agreement))
    && ratings.every(q => round.questions.some(c => typeof c === 'object' && c.questionId === String(q.questionId).replace(/_response$/, '_confidence') && c.optional === false));
  if (correct) return round.questions;
  const rounds = await getRounds(formId);
  const live = rounds.find(r => r.id === round.id);
  if (!live || !live.is_active || live.response_count || live.draft_count || rounds.some(r => r.round_number > 2)) return round.questions;
  // Never reconstruct a claim set that is already present: retain its IDs, wording and provenance.
  const existingRatings = live.questions.filter(isRating) as Record<string, unknown>[];
  let questions: Round['questions'];
  if (existingRatings.length) {
    questions = live.questions.map(q => typeof q === 'object' && isRating(q)
      ? {...q, inputType:'single_select', options:[...agreement], optional:false}
      : typeof q === 'object' && /_confidence$/.test(String(q.questionId)) ? {...q, optional:false} : q);
    if (!existingRatings.every(q => questions.some(c => typeof c === 'object' && c.questionId === String(q.questionId).replace(/_response$/, '_confidence')))) return round.questions;
  } else {
    const opening = rounds.find(r => r.round_number === 1);
    if (!opening) return round.questions;
    questions = buildDelphiRoundTwoQuestions(opening.synthesis || '', opening.synthesis_json?.narrative === opening.synthesis ? opening.synthesis_json?.reasoning_graph : null);
    if (!questions.length) throw new Error('Review the first-round claims before adding Round 2 ratings.');
  }
  if (JSON.stringify(questions) === JSON.stringify(live.questions)) return live.questions;
  const updated = await updateRound(formId, round.id, {questions, expected_questions:live.questions, require_unanswered:true});
  return updated.questions;
}

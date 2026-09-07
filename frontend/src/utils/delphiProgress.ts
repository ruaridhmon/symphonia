import { coerceAnswerPosition } from './answers';
import type { Round, RoundWithResponses } from '../types/summary';

type Question = string | Record<string, unknown>;
export const stanceLabels = ['Agree', 'Disagree', 'Neutral', 'Unable to judge', 'Unrecognised', 'Not answered'] as const;
export type VoteCounts = [number, number, number, number, number, number];

export function stance(value: string): number {
  const v = value.trim().toLowerCase();
  if (['strongly agree', 'agree'].includes(v)) return 0;
  if (['strongly disagree', 'disagree'].includes(v)) return 1;
  if (['neither agree nor disagree', 'neutral'].includes(v)) return 2;
  if (['unable to judge — need more information', "don't know / unsure", 'unsure', 'uncertain'].includes(v)) return 3;
  return v ? 4 : 5;
}
function ratingQuestion(q: Question): q is Record<string, unknown> {
  return typeof q === 'object' && q !== null && ['likert', 'single_select'].includes(String(q.inputType))
    && Array.isArray(q.options) && q.options.some(o => stance(String(o)) === 0)
    && q.options.some(o => stance(String(o)) === 1);
}
function wording(q: Record<string, unknown>): string {
  return `${String(q.sectionTitle || '').trim()}|${String(q.label || '').trim()}`;
}
function counts(q: Record<string, unknown>, index: number, responses: RoundWithResponses | undefined): VoteCounts {
  const result: VoteCounts = [0, 0, 0, 0, 0, 0];
  for (const r of responses?.responses || []) {
    const answer = r.answers[`q${index + 1}`] ?? r.answers[String(q.questionId)];
    result[stance(coerceAnswerPosition(answer))]++;
  }
  return result;
}
export function ratingProgress(round: Round, rounds: Round[], responses: RoundWithResponses[]) {
  const current = responses.find(r => r.id === round.id);
  const previous = rounds.find(r => r.round_number === round.round_number - 1);
  const previousResponses = responses.find(r => r.id === previous?.id);
  return round.questions.flatMap((q, index) => {
    if (!ratingQuestion(q)) return [];
    // Never compare by position/claim number alone: rewriting a claim starts a new series.
    const priorIndex = previous?.questions.findIndex(p => ratingQuestion(p)
      && !!q.questionId && p.questionId === q.questionId && wording(p) === wording(q)
      && JSON.stringify(p.options) === JSON.stringify(q.options)) ?? -1;
    const votes = counts(q, index, current);
    const prior = priorIndex >= 0 && previousResponses
      ? counts(previous!.questions[priorIndex] as Record<string, unknown>, priorIndex, previousResponses) : null;
    const answered = votes.slice(0, 5).reduce((a, b) => a + b, 0);
    const priorAnswered = prior?.slice(0, 5).reduce((a, b) => a + b, 0) || 0;
    const percent = answered ? 100 * votes[0] / answered : null;
    const history = rounds.filter(r => r.round_number <= round.round_number).sort((a,b) => a.round_number-b.round_number).flatMap(r => {
      const i = r.questions.findIndex(p => ratingQuestion(p) && !!q.questionId && p.questionId === q.questionId && wording(p) === wording(q) && JSON.stringify(p.options) === JSON.stringify(q.options));
      const data = responses.find(x => x.id === r.id);
      if (i < 0 || !data) return [];
      const v = counts(r.questions[i] as Record<string, unknown>, i, data);
      const n = v.slice(0,5).reduce((a,b)=>a+b,0);
      return [{round:r.round_number, votes:v, n, percent:n ? 100*v[0]/n : null}];
    });
    const commentIndex = round.questions.findIndex(p => typeof p === 'object' && p !== null && p.sectionTitle === q.sectionTitle && !!q.sectionTitle && /comment|clarification|justify/i.test(String(p.label)));
    const stableEmails = (rs: RoundWithResponses | undefined) => {
      const map = new Map<string, typeof rs extends undefined ? never : import('../types/summary').StructuredResponse>();
      const duplicate = new Set<string>();
      for (const r of rs?.responses || []) if (r.email) { if (map.has(r.email)) duplicate.add(r.email); map.set(r.email,r); }
      duplicate.forEach(e=>map.delete(e)); return map;
    };
    const oldByIdentity = stableEmails(previousResponses);
    const newByIdentity = stableEmails(current);
    let matched = 0, changed = 0;
    const evidence = (current?.responses || []).map((r,i) => {
      const position = coerceAnswerPosition(r.answers[`q${index+1}`] ?? r.answers[String(q.questionId)]);
      const old = priorIndex >= 0 && r.email && newByIdentity.has(r.email) ? oldByIdentity.get(r.email) : undefined;
      const before = old ? coerceAnswerPosition(old.answers[`q${priorIndex+1}`] ?? old.answers[String(q.questionId)]) : '';
      const comparable = !!old && stance(before)<4 && stance(position)<4;
      if(comparable) { matched++; if(stance(before)!==stance(position)) changed++; }
      const commentQuestion = round.questions[commentIndex];
      const comment = commentIndex >= 0 ? coerceAnswerPosition(r.answers[`q${commentIndex+1}`] ?? r.answers[String(typeof commentQuestion === 'object' ? commentQuestion.questionId : '')]) : '';
      return {participant:`Response ${i+1}`,position,group:stance(position),comment,before:comparable ? before : null,changed:comparable && stance(before)!==stance(position)};
    });
    return [{ history, evidence, matched, changed, key: String(q.questionId || index), label: String(q.sectionTitle || q.label), votes, answered, percent,
      previousRound: previous?.round_number,
      delta: percent !== null && prior && priorAnswered ? percent - 100 * prior[0] / priorAnswered : null,
      previousAnswered: priorAnswered }];
  });
}
export function synthesisProvenanceNote(round: Round | null, rounds: Round[]): string | null {
  if (!round?.synthesis?.trim()) return null;
  if (round.response_count === 0) return `No responses have been submitted in Round ${round.round_number}. This text is background or a draft, not a result from this round.`;
  const previous = rounds.find(r => r.round_number === round.round_number - 1);
  if (previous?.synthesis?.trim() === round.synthesis.trim()) return `This text matches Round ${previous.round_number}. Review it against this round’s responses before treating it as an updated result.`;
  return null;
}

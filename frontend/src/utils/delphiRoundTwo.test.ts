import { describe, expect, it } from 'vitest';
import { buildDelphiRoundTwoQuestions, extractDelphiClaims } from './delphiRoundTwo';

const SYNTHESIS = `
  <h2>Claims</h2>
  <div style="border-left: 5px solid #dc2626">
    <p>🟥 Claim 1: <strong>A fully elected second chamber is favoured.</strong></p>
    <p>People making this claim: <strong>4 of 10</strong></p>
    <details><summary>Show supporting experts</summary><ul>
      <li>Expert A: Agree</li><li>Expert B: Agree</li><li>Expert C: Agree</li><li>Expert D: Agree</li>
    </ul></details>
    <details><summary>Show opposing experts</summary><ul>
      <li>Expert E: Disagree</li><li>Expert F: Disagree</li><li>Expert G: Disagree</li>
      <li>Expert H: Disagree</li><li>Expert I: Disagree</li>
    </ul></details>
    <details><summary>Show uncertain experts</summary><ul><li>Expert J: Unsure</li></ul></details>
  </div>
`;

describe('Delphi Round 2 builder', () => {
  it('extracts the claim and complete Round 1 stance counts', () => {
    expect(extractDelphiClaims(SYNTHESIS)).toEqual([{
      number: 1,
      text: 'A fully elected second chamber is favoured.',
      support: 4,
      oppose: 5,
      uncertain: 1,
      notClassified: 0,
      total: 10,
    }]);
  });

  it('creates a rating plus targeted conditional follow-ups', () => {
    const questions = buildDelphiRoundTwoQuestions(SYNTHESIS) as Record<string, unknown>[];
    expect(questions).toHaveLength(4);
    expect(questions[0]).toMatchObject({
      questionId: 'claim_1_rating',
      inputType: 'likert',
      optional: false,
      sectionTitle: 'Claim 1: A fully elected second chamber is favoured.',
      groupPrompt: expect.stringContaining('4 support · 5 oppose · 1 uncertain · 0 not classified'),
    });
    expect(questions[1]).toMatchObject({
      questionId: 'claim_1_reason',
      inputType: 'single_select',
      optional: false,
      conditionalOnQuestionId: 'claim_1_rating',
      conditionalOnOptions: expect.arrayContaining(['Disagree', 'Neither agree nor disagree']),
    });
    expect(questions[2]).toMatchObject({
      questionId: 'claim_1_explanation',
      inputType: 'textarea',
      optional: false,
    });
    expect(questions[3]).toMatchObject({
      questionId: 'claim_1_revision',
      inputType: 'textarea',
      optional: true,
    });
  });

  it('does not invent Round 2 questions when no claims are present', () => {
    expect(buildDelphiRoundTwoQuestions('<h2>Summary</h2><p>No claims.</p>')).toEqual([]);
  });
});

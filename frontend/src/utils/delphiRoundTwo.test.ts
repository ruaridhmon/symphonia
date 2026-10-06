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

  it('creates a balanced response and separate optional confidence and comment', () => {
    const questions = buildDelphiRoundTwoQuestions(SYNTHESIS) as Record<string, unknown>[];
    expect(questions).toHaveLength(3);
    expect(questions[0]).toMatchObject({
      questionId: 'claim_1_response',
      inputType: 'single_select',
      optional: false,
      sectionTitle: 'Claim 1: A fully elected second chamber is favoured.',
      groupPrompt: expect.stringContaining('4 support · 5 oppose · 1 uncertain · 0 not classified'),
    });
    expect(questions[2]).toMatchObject({
      questionId: 'claim_1_comment',
      inputType: 'textarea',
      optional: true,
    });
    expect(questions[1]).toMatchObject({questionId:'claim_1_confidence',inputType:'single_select',optional:true,options:['Not at all confident','Slightly confident','Moderately confident','Very confident','Extremely confident']});
    expect(questions[1]).not.toHaveProperty('defaultValue');
    expect(questions[0].options).toEqual(['Strongly agree', 'Agree', 'Neither agree nor disagree', 'Disagree', 'Strongly disagree', 'Unable to judge — need more information']);
    expect(questions.every(q => !q.conditionalOnQuestionId)).toBe(true);
  });

  it('does not invent Round 2 questions when no claims are present', () => {
    expect(buildDelphiRoundTwoQuestions('<h2>Summary</h2><p>No claims.</p>')).toEqual([]);
  });
});

it('rates every normalized claim, including visibly inferred and minority claims, with unchanged wording',()=>{
 const graph={version:1 as const,response_count:2,mapped_response_count:0,rejected_flow_count:0,flows:[],claims:[{id:'claim_minority',text:'Retain this unique exception.',origin:'explicit' as const,sources:[]},{id:'claim_bridge',text:'This is an inferred necessary step.',origin:'inferred' as const,sources:[],question:'Does this bridge follow?',based_on_responses:[1]}]};
 const q=buildDelphiRoundTwoQuestions(SYNTHESIS,graph) as Record<string,unknown>[];
 expect(q).toHaveLength(6);expect(q[0]).toMatchObject({questionId:'claim_minority_response',claimText:'Retain this unique exception.',claimOrigin:'explicit'});
 expect(q[3]).toMatchObject({claimOrigin:'inferred',claimText:'This is an inferred necessary step.',inferenceQuestion:'Does this bridge follow?'});
 expect(q[3].groupPrompt).toContain('not directly stated');
});

it('preserves an inferred label when a saved claim list is used without graph metadata',()=>{
 const q=buildDelphiRoundTwoQuestions('<div><p>Claim 1: <strong>An unstated bridge.</strong></p><p>Inferred · unconfirmed. Not directly stated by an expert.</p></div>') as Record<string,unknown>[];
 expect(q[0].claimOrigin).toBe('inferred');expect(q[0].groupPrompt).toContain('not directly stated');
});

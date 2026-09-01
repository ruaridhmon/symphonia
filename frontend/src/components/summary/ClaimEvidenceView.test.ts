import { describe, expect, it } from 'vitest';
import { parseClaimEvidence } from './ClaimEvidenceView';

describe('parseClaimEvidence', () => {
  it('extracts every supporting and opposing expert excerpt from saved synthesis HTML', () => {
    const claims = parseClaimEvidence(`
      <p><strong>Claims</strong></p>
      <p>🟩 Claim 1: <strong>Virtual wards are ready for selected pathways.</strong></p>
      <p>People making this claim: <strong>2 of 3</strong></p>
      <p>Opposing views: <strong>Safety concerns remain.</strong></p>
      <p>Show supporting statements</p>
      <ul>
        <li><p>Response Dr A: We have safely used this pathway for a year.</p></li>
        <li><p>Response Nurse B: Clear escalation makes this workable.</p></li>
      </ul>
      <p>Show opposing statements</p>
      <ul><li><p>Response Researcher C: The evidence is not yet representative.</p></li></ul>
    `);

    expect(claims).toEqual([{
      id: '1',
      status: 'agreement',
      title: 'Virtual wards are ready for selected pathways.',
      people: '2 of 3',
      opposingView: 'Safety concerns remain.',
      supporting: [
        { expert: 'Dr A', quote: 'We have safely used this pathway for a year.' },
        { expert: 'Nurse B', quote: 'Clear escalation makes this workable.' },
      ],
      opposing: [
        { expert: 'Researcher C', quote: 'The evidence is not yet representative.' },
      ],
    }]);
  });

  it('parses the nested div and details structure saved by the backend', () => {
    const claims = parseClaimEvidence(`
      <h2>Claims</h2>
      <div style="border-left: 5px solid #16a34a">
        <p>🟩 Claim 1: <strong>Virtual wards are ready for selected pathways.</strong></p>
        <p>People making this claim: <strong>2 of 3</strong></p>
        <p>Opposing views: <strong>Safety concerns remain.</strong></p>
        <details>
          <summary>Show supporting statements</summary>
          <ul>
            <li>Response Dr A: We have safely used this pathway for a year.</li>
            <li>Response Nurse B: Clear escalation makes this workable.</li>
          </ul>
        </details>
        <details>
          <summary>Show opposing statements</summary>
          <ul><li>Response Researcher C: The evidence is not yet representative.</li></ul>
        </details>
      </div>
    `);

    expect(claims).toHaveLength(1);
    expect(claims[0]).toMatchObject({
      id: '1',
      status: 'agreement',
      people: '2 of 3',
      supporting: [
        { expert: 'Dr A', quote: 'We have safely used this pathway for a year.' },
        { expert: 'Nurse B', quote: 'Clear escalation makes this workable.' },
      ],
      opposing: [
        { expert: 'Researcher C', quote: 'The evidence is not yet representative.' },
      ],
    });
  });

  it('falls back to an empty claim list for ordinary synthesis prose', () => {
    expect(parseClaimEvidence('# Summary\n\nMost respondents agreed.')).toEqual([]);
  });
});

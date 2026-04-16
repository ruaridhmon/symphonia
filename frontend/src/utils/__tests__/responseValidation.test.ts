import { describe, expect, it } from 'vitest';
import { emptyStructuredResponse } from '../../types/structured-input';
import {
  isResponseAnswered,
  validateDocumentTemplateResponses,
  validateQuestionResponses,
} from '../responseValidation';

describe('responseValidation', () => {
  it('treats slider zero as an answered survey response', () => {
    const answers = {
      q1: { ...emptyStructuredResponse(), position: '0' },
    };

    expect(isResponseAnswered(answers.q1)).toBe(true);
    expect(
      validateQuestionResponses(
        [
          {
            label: 'How significant is this issue?',
            inputType: 'slider',
            optional: false,
            minValue: 0,
            maxValue: 10,
          },
        ],
        answers,
      ),
    ).toEqual({ ok: true });
  });

  it('treats slider zero as an answered document-template field', () => {
    const answers = {
      q1: { ...emptyStructuredResponse(), position: '0' },
    };

    expect(
      validateDocumentTemplateResponses(
        '{{slider:Priority score|0|10|Low|Balanced|High}}',
        answers,
      ),
    ).toEqual({ ok: true });
  });

  it('treats numeric and legacy answer shapes as answered survey responses', () => {
    expect(isResponseAnswered({ ...emptyStructuredResponse(), position: 2 as never })).toBe(true);
    expect(isResponseAnswered({ value: 4 } as never)).toBe(true);
    expect(isResponseAnswered({ selectedScore: 6 } as never)).toBe(true);
    expect(isResponseAnswered({ answer: ['Workload', 'Equity'] } as never)).toBe(true);

    expect(
      validateQuestionResponses(
        [
          {
            label: 'How significant is this issue?',
            inputType: 'slider',
            optional: false,
            minValue: 0,
            maxValue: 10,
          },
        ],
        {
          q1: { value: 2 } as never,
        },
      ),
    ).toEqual({ ok: true });
  });
});

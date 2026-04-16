import { describe, expect, it } from 'vitest';
import { emptyStructuredResponse } from '../../types/structured-input';
import {
  buildRichDocumentTemplateFieldMap,
  createRichFillableDocumentTemplate,
  remapRichFillableAnswersToQuestionOrder,
  serializeRichDocumentField,
} from '../documentTemplate';

const questions = [
  { questionId: 'Q0', label: 'Role' },
  { questionId: 'Q0_other', label: 'Other role', conditionalOnQuestionId: 'Q0', conditionalOnOption: 'Other' },
  { questionId: 'Q0a', label: 'Stakeholder' },
  { questionId: 'Q0b', label: 'Organisation type' },
  { questionId: 'Q0c', label: 'Context', optional: true },
  { questionId: 'Q0d', label: 'Gender' },
  { questionId: 'Q0d_other', label: 'Self describe', conditionalOnQuestionId: 'Q0d', conditionalOnOption: 'Prefer to self-describe' },
  { questionId: 'Q1_1', label: 'Staff AI literacy, capability, and training', inputType: 'slider', minValue: 0, maxValue: 10 },
];

function richTemplateWithOrphanField() {
  return createRichFillableDocumentTemplate([
    serializeRichDocumentField({
      key: 'q0',
      questionId: 'Q0',
      label: 'Role',
      fieldType: 'single_select',
      inputType: 'single_select',
      optional: false,
      rows: 1,
      placeholder: 'Select one',
      options: ['Leader', 'Other'],
    }),
    serializeRichDocumentField({
      key: 'q0-other',
      questionId: 'Q0_other',
      label: 'Other role',
      fieldType: 'short',
      inputType: 'text',
      optional: false,
      rows: 1,
      placeholder: 'Write your answer here',
      conditionalOnQuestionId: 'Q0',
      conditionalOnOption: 'Other',
    }),
    serializeRichDocumentField({
      key: 'q0a',
      questionId: 'Q0a',
      label: 'Stakeholder',
      fieldType: 'single_select',
      inputType: 'single_select',
      optional: false,
      rows: 1,
      placeholder: 'Select one',
      options: ['A'],
    }),
    serializeRichDocumentField({
      key: 'q0b',
      questionId: 'Q0b',
      label: 'Organisation type',
      fieldType: 'single_select',
      inputType: 'single_select',
      optional: false,
      rows: 1,
      placeholder: 'Select one',
      options: ['Secondary'],
    }),
    serializeRichDocumentField({
      key: 'q0b-other',
      questionId: 'Q0b_other',
      label: 'Other organisation',
      fieldType: 'short',
      inputType: 'text',
      optional: false,
      rows: 1,
      placeholder: 'Write your answer here',
      conditionalOnQuestionId: 'Q0b',
      conditionalOnOption: 'Other',
    }),
    serializeRichDocumentField({
      key: 'q0c',
      questionId: 'Q0c',
      label: 'Context',
      fieldType: 'long',
      inputType: 'textarea',
      optional: true,
      rows: 4,
      placeholder: 'Write your response here',
    }),
    serializeRichDocumentField({
      key: 'q0d',
      questionId: 'Q0d',
      label: 'Gender',
      fieldType: 'single_select',
      inputType: 'single_select',
      optional: false,
      rows: 1,
      placeholder: 'Select one',
      options: ['Non-binary'],
    }),
    serializeRichDocumentField({
      key: 'q0d-other',
      questionId: 'Q0d_other',
      label: 'Self describe',
      fieldType: 'short',
      inputType: 'text',
      optional: false,
      rows: 1,
      placeholder: 'Please describe',
      conditionalOnQuestionId: 'Q0d',
      conditionalOnOption: 'Prefer to self-describe',
    }),
    serializeRichDocumentField({
      key: 'q1-1',
      questionId: 'Q1_1',
      label: 'Staff AI literacy, capability, and training',
      fieldType: 'slider',
      inputType: 'slider',
      optional: false,
      rows: 1,
      placeholder: 'Select a score',
      minValue: 0,
      maxValue: 10,
    }),
  ].join(''));
}

describe('rich fillable template alignment', () => {
  it('remaps legacy template-order answers onto question order when an orphan template field exists', () => {
    const template = richTemplateWithOrphanField();
    const legacyAnswers = {
      q1: { ...emptyStructuredResponse(), position: 'Leader' },
      q4: { ...emptyStructuredResponse(), position: 'Secondary' },
      q6: { ...emptyStructuredResponse(), position: 'Context text' },
      q7: { ...emptyStructuredResponse(), position: 'Non-binary' },
      q9: { ...emptyStructuredResponse(), position: '4' },
    };

    const remapped = remapRichFillableAnswersToQuestionOrder(template, questions, legacyAnswers);

    expect(remapped.q5?.position).toBe('Context text');
    expect(remapped.q6?.position).toBe('Non-binary');
    expect(remapped.q8?.position).toBe('4');
  });

  it('maps rich template fields by question id and skips orphan fields', () => {
    const template = richTemplateWithOrphanField();
    const answers = {
      q5: { ...emptyStructuredResponse(), position: 'Context text' },
      q8: { ...emptyStructuredResponse(), position: '4' },
    };

    const fieldMap = buildRichDocumentTemplateFieldMap(template, answers, questions);

    expect(fieldMap.get('q0c')?.field.questionKey).toBe('q5');
    expect(fieldMap.get('q1-1')?.field.questionKey).toBe('q8');
    expect(fieldMap.has('q0b-other')).toBe(false);
  });
});

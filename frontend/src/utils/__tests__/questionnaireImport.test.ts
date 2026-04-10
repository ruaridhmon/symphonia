import { describe, expect, it } from 'vitest';
import { parseDocumentTemplateFields } from '../documentTemplate';
import { convertQuestionnaireTextToRichTemplate, parseQuestionnaireText } from '../questionnaireImport';

describe('questionnaireImport', () => {
  it('maps questionnaire response types to the correct fillable field types', () => {
    const questionnaireText = [
      'Round 1: Full question set',
      '',
      'Intro text for participants',
      '',
      'Thank you for taking part in this consultation on AI in education.',
      '',
      'Section A. About you',
      '',
      'Q0. Which of the following best describes your current role?',
      'Response type: Select one.',
      '',
      '• School/college senior leader',
      '• Middle leader',
      '• Teacher/lecturer/tutor',
      '• Support staff',
      '• Other',
      '',
      'Q0a. Which stakeholder group are you responding as part of?',
      'Response type: Select one.',
      '',
      '• School / college leadership group',
      '• TUC / workforce group',
      '• Other / mixed perspective',
      '',
      'Q1. Which five of the above challenges most need attention now?',
      'Response type: Select up to 5.',
      '',
      '• Workload',
      '• Safeguarding',
      '• Vendor lock-in',
      '',
      'Q2. Thinking about AI in education over the next 2–3 years, how significant is each challenge?',
      'Response type: 0-10 slider for each item.',
      'Anchor labels: 0 = Not at all significant, 5 = Moderately significant, 10 = Extremely significant',
      '',
      '• Staff AI literacy',
      '• Governance uncertainty',
      '',
      'Q3. Optional: anything important about your context?',
      'Response type: Free text, max 40 words.',
    ].join('\n');

    const parsed = parseQuestionnaireText(questionnaireText);
    expect(parsed.questions).toHaveLength(7);

    expect(parsed.questions[0]).toMatchObject({
      questionId: 'Q0',
      inputType: 'single_select',
      options: [
        'School/college senior leader',
        'Middle leader',
        'Teacher/lecturer/tutor',
        'Support staff',
        'Other',
      ],
    });
    expect(parsed.questions[1]).toMatchObject({
      questionId: 'Q0_other',
      inputType: 'text',
      conditionalOnQuestionId: 'Q0',
      conditionalOnOption: 'Other',
    });
    expect(parsed.questions[2]).toMatchObject({
      questionId: 'Q0a',
      inputType: 'single_select',
      options: ['School / college leadership group', 'TUC / workforce group', 'Other / mixed perspective'],
    });
    expect(parsed.questions[3]).toMatchObject({
      questionId: 'Q1',
      inputType: 'multi_select',
      maxSelections: 5,
      options: ['Workload', 'Safeguarding', 'Vendor lock-in'],
    });
    expect(parsed.questions[4]).toMatchObject({
      questionId: 'Q2_1',
      inputType: 'slider',
      label: 'Staff AI literacy',
      minValue: 0,
      maxValue: 10,
      minLabel: 'Not at all significant',
      midLabel: 'Moderately significant',
      maxLabel: 'Extremely significant',
    });
    expect(parsed.questions[5]).toMatchObject({
      questionId: 'Q2_2',
      inputType: 'slider',
      label: 'Governance uncertainty',
    });
    expect(parsed.questions[6]).toMatchObject({
      questionId: 'Q3',
      inputType: 'textarea',
      optional: true,
    });
  });

  it('serializes inferred questionnaire fields into rich fillable template nodes', () => {
    const questionnaireText = [
      'Round 1: Full question set',
      '',
      'Q1. Which role best describes you?',
      'Response type: Select one.',
      'School leader',
      'Teacher',
      'Support staff',
      'Other',
      '',
      'Q2. Which two issues matter most?',
      'Response type: Select up to 2.',
      'Workload',
      'Safeguarding',
      'Vendor lock-in',
      '',
      'Q3. Rate each challenge below.',
      'Response type: 0-10 slider for each item.',
      'Anchor labels: 0 = Not significant, 5 = Moderate, 10 = Very significant',
      'Workload burden',
      'Safeguarding risk',
    ].join('\n');

    const converted = convertQuestionnaireTextToRichTemplate(questionnaireText);
    const fields = parseDocumentTemplateFields(converted.template);

    expect(fields.map((field) => field.fieldType)).toEqual([
      'single_select',
      'short',
      'multi_select',
      'slider',
      'slider',
    ]);
    expect(fields[0]?.options).toEqual(['School leader', 'Teacher', 'Support staff', 'Other']);
    expect(fields[1]).toMatchObject({
      label: 'Other: Please specify',
      optional: false,
    });
    expect(fields[2]).toMatchObject({
      fieldType: 'multi_select',
      maxSelections: 2,
      options: ['Workload', 'Safeguarding', 'Vendor lock-in'],
    });
    expect(fields[3]).toMatchObject({
      label: 'Workload burden',
      fieldType: 'slider',
      minLabel: 'Not significant',
      midLabel: 'Moderate',
      maxLabel: 'Very significant',
    });
  });
});

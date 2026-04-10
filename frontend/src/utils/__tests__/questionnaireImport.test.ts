import { describe, expect, it } from 'vitest';
import { parseDocumentTemplateFields } from '../documentTemplate';
import { convertQuestionnaireTextToRichTemplate, parseQuestionnaireText } from '../questionnaireImport';

const FULL_AI_EDUCATION_QUESTIONNAIRE = `
Round 1: Full question set

Intro text for participants

Thank you for taking part in this consultation on AI in education. We are interested in the most important concerns, priorities, and opportunities relating to AI in education, particularly around workload realities, professional autonomy, governance and safeguarding, financial and commercial risks, implementation burden, equity, and where AI may genuinely help. Please answer from the perspective of your professional experience and judgement. There are no right or wrong answers. Estimated completion time: 12–15 minutes.

Section A. About you

Q0. Which of the following best describes your current role?
Response type: Select one.

School/college senior leader
Middle leader
Teacher/lecturer/tutor
Support staff
Digital / data / IT lead
Governor / trustee / board member
Union / workforce representative
Policy / system leader
Researcher / adviser
Other

Q0a. Which stakeholder group are you responding as part of?
Response type: Select one.

School / college leadership group
TUC / workforce group
Other / mixed perspective

Q0b. What type of organisation or setting do you primarily work with?
Response type: Select one.

Primary school
Secondary school
All-through school
Sixth form / college / FE
Multi-academy trust
Local authority
Union / representative body
National policy / arm's-length body
Other

Q0c. Optional: anything important about your context?
Response type: Free text, max 40 words.

Q0d. What is your gender?
Response type: Select one.

Woman
Man
Non-binary
Prefer to self-describe (free text, max 20 words)
Prefer not to say

Section B. Overall significance of different challenges

Q1. Thinking about AI in education over the next 2–3 years, how significant is each of the following challenges in your context?
Response type: 0–10 slider for each item.
Anchor labels: 0 = Not at all significant, 5 = Moderately significant, 10 = Extremely significant

Staff AI literacy, capability, and training
Time available for training and implementation
Workload created by checking, editing, monitoring, or compliance
Lack of clear evidence that AI reduces workload in practice
Governance, policy, and regulatory uncertainty
Data protection, privacy, and safeguarding risks
Commercial influence over educational decisions
Cost, affordability, and long-term financial sustainability
Risk of vendor lock-in or dependence on a small number of providers
Loss of professional autonomy or teacher/staff agency
Pressure to adopt AI faster than evidence justifies
Unequal access between institutions, staff, or learners
Risk of bias or unfairness in AI systems
Difficulty integrating AI into existing systems and infrastructure
Lack of clarity about accountability when AI causes error or harm
Student misuse, over-reliance, or inappropriate use of AI
Lack of robust evidence on learning outcomes
Misalignment between leadership priorities and workforce realities

Section C. Forced prioritisation

Q2. Which five of the above challenges most need attention now?
Response type: Select up to 5. Same list as Q1.

Q3. Which one of these is the single most important priority right now?
Response type: Select one. Same list as Q1.

Section D. Why these priorities matter

Q4. For each challenge you selected in Q2, please rate it on the following three dimensions.
Routing: Show only for items selected in Q2.
Response type: Three 0–10 sliders per selected item.

Q4a. How urgent is this challenge in the next 12 months? (0 = Not at all urgent … 10 = Extremely urgent)
Q4b. If this challenge is not addressed, how serious is its likely impact? (0 = Not at all serious … 10 = Extremely serious)
Q4c. How poorly addressed is this challenge at present? (0 = Already well addressed … 10 = Very poorly addressed)

Section E. Where AI may genuinely help

Q5. In which areas is AI most likely to provide genuine benefit in education, if implemented well?
Response type: Select up to 3.

Reducing routine administrative work
Supporting planning or resource preparation
Assessment and feedback processes
Communication and operational efficiency
Student support and inclusion
Staff development and professional learning
Data analysis and planning
Digital assessment and infrastructure readiness
I do not currently see clear benefits
Other

Q5a. If you selected “Other”, please specify.
Routing: Only if ‘Other’ selected in Q5.
Response type: Free text, max 30 words.

Q6. For the areas you selected above, what would need to be in place for AI to help rather than create new problems?
Response type: Free text, max 120 words.

Section F. Workload reality and implementation burden

Q7. Please indicate how far you agree or disagree with the following statements.
Response type: 0–10 slider for each item.
Anchor labels: 0 = Strongly disagree, 5 = Neither agree nor disagree, 10 = Strongly agree

AI is likely to reduce workload in practice.
AI is likely to create hidden work through checking, editing, monitoring, or compliance.
The workload of safe AI adoption is currently underestimated.
AI may be used to justify staffing reductions rather than to support staff.
The people expected to use AI are not always given enough time or support to do so well.
There is too much hype about workload reduction and not enough attention to implementation reality.

Section G. Professional autonomy and strategic direction

Q8. Please indicate how far you agree or disagree with the following statements.
Response type: 0–10 slider for each item.
Anchor labels: 0 = Strongly disagree, 5 = Neither agree nor disagree, 10 = Strongly agree

Professionals should retain the right to override AI-generated outputs.
Institutions should provide clear guidance on approved tools and uses.
Too much prescription risks undermining professional judgement.
Too little guidance leaves staff exposed to risk and inconsistency.
AI adoption should be shaped as much from the bottom up as from the top down.
Current approaches risk de-professionalising education work.

Section H. Governance, compliance, and accountability

Q9. How confident are you that the current system is equipped to govern AI in education well in the following areas?
Response type: 0–10 slider for each item.
Anchor labels: 0 = Not at all confident, 5 = Moderately confident, 10 = Very confident

Institutional leadership capacity
Governance / board / trustee capacity
Policy and regulatory clarity
Data protection and safeguarding arrangements
Accountability for errors or harm
Availability of trustworthy evidence to guide decisions

Q9a. How confident are you that teachers in your setting have adequate AI literacy in each of the following dimensions?
Response type: 0–10 slider for each item.
Anchor labels: 0 = Not at all confident, 5 = Moderately confident, 10 = Very confident

Technical AI literacy - understanding how AI works, algorithms and models (de-mystifying AI)
Practical AI literacy - responsible use, evaluating AI outputs, informed decisions
Human/ethical AI literacy - societal impacts, rights and democracy, wellbeing and equity

Section I. Commercialisation and financial sustainability

Q10. How concerned are you about the following aspects of AI commercialisation in education?
Response type: 0–10 slider for each item.
Anchor labels: 0 = Not at all concerned, 5 = Moderately concerned, 10 = Extremely concerned

Schools or colleges feeling pushed into AI procurement because of hype
Long-term cost escalation
Vendor lock-in
Educational priorities being shaped by commercial providers
Lack of transparency in procurement or product claims
AI being used mainly as a cost-cutting strategy
State-funded institutions being more financially exposed than better-resourced settings
Imported models or partnerships shaping education without adequate scrutiny

Section J. Student use, equity, and safeguarding

Q11. How concerned are you about the following potential effects of AI on learners and institutions?
Response type: 0–10 slider for each item.
Anchor labels: 0 = Not at all concerned, 5 = Moderately concerned, 10 = Extremely concerned

Unequal access between better- and less-resourced settings
Bias or unfairness in AI systems
Increased cheating or misuse
Cognitive offloading or over-reliance
Inadequate safeguarding
Limited age-appropriate tools for pupils
Students being inadequately prepared for an AI-enabled world
SEND or disadvantaged learners being poorly served by current tools
Students not being adequately taught AI literacy as a curriculum subject (distinct from managing the risks of misuse)

Section K. Safeguards and conditions for acceptable adoption

Q12. Which safeguards or conditions are most important if AI tools are used in education?
Response type: Select up to 5.

Transparent procurement criteria
Independent evidence of effectiveness
Clear human accountability
Strong data protection and limits on data use
Right to human review and override
National or sector-wide standards
Staff consultation before adoption
Workforce / union involvement
Ongoing review of workload impact
Equality impact assessment
Easy exit from vendors / no lock-in
Minimum training and support entitlement
Clear guidance on approved uses
Other

Q12a. If you selected “Other”, please specify.
Routing: Only if ‘Other’ selected in Q12.
Response type: Free text, max 30 words.

Q12b. If one free resource were available to all staff to improve AI literacy, which would be most useful?

Ready-to-use lesson plans and classroom activities
Curated lists of approved AI tools and examples
Short explainer guides to build personal understanding
Case studies showing AI literacy across different subjects
Whole-school AI guidance or policy templates
Structured CPD programme or training course
Other (please specify, max 20 words)

Section L. Open responses

Q13. What is the single issue about AI in education that most “keeps you awake at night”, and why?
Response type: Free text, max 120 words.

Q14. What is one thing policymakers, system leaders, or institutions should do first?
Response type: Free text, max 100 words.

Round 2: Re-prioritisation

Intro text for Round 2

Thank you for taking part in Round 1. In this round, we are asking you to reflect on the overall pattern of responses. You will see the highest-rated challenges from Round 1 and be asked to re-prioritise them. Estimated completion time: 8–10 minutes.

Before Q15, the platform will show: the top 8 issues overall; the top issues by stakeholder group; a short neutral synthesis of the main themes from the free-text responses.

Section M. Re-prioritisation after feedback

Q15. Having seen the Round 1 summary, how high a priority do you think each of the following issues should be for action?
Response type: 0–10 slider for each of the top 8 issues from Round 1.
Anchor labels: 0 = Very low priority, 5 = Medium priority, 10 = Very high priority

Populate this dynamically with the Round 1 top 8.

Q16. Which three of these issues should be the immediate focus for action in the next 12 months?
Response type: Select up to 3. Dynamic list: the same top 8 issues shown in Q15.

Q17. On which of these issues do you think broad cross-stakeholder consensus is most possible?
Response type: Select up to 3. Dynamic list: the same top 8 issues shown in Q15.

Q18. On which one issue is it most important not to force false consensus?
Response type: Select 1. Dynamic list: the same top 8 issues shown in Q15.

Q18a. Optional: why?
Routing: Optional follow-up after Q18.
Response type: Free text, max 60 words.
`.trim();

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

  it('handles partial questionnaire excerpts and preserves select and slider field types', () => {
    const questionnaireText = [
      'perience and judgement. There are no right or wrong answers. Estimated completion time: 12-15 minutes.',
      '',
      'Section A. About you',
      '',
      'Q0. Which of the following best describes your current role?',
      'Response type: Select one.',
      'School/college senior leader',
      'Middle leader',
      'Teacher/lecturer/tutor',
      'Support staff',
      'Digital / data / IT lead',
      'Governor / trustee / board member',
      'Union / workforce representative',
      'Policy / system leader',
      'Researcher / adviser',
      'Other',
      '',
      'Q0a. Which stakeholder group are you responding as part of?',
      'Response type: Select one.',
      'School / college leadership group',
      'TUC / workforce group',
      'Other / mixed perspective',
      '',
      'Q1. Thinking about AI in education over the next 2-3 years, how significant is each of the following challenges in your context?',
      'Response type: 0-10 slider for each item.',
      'Anchor labels: 0 = Not at all significant, 5 = Moderately significant, 10 = Extremely significant',
      'Staff AI literacy, capability, and training',
      'Time available for training and implementation',
    ].join('\n');

    const converted = convertQuestionnaireTextToRichTemplate(questionnaireText);
    const fields = parseDocumentTemplateFields(converted.template);

    expect(fields.map((field) => field.fieldType)).toEqual([
      'single_select',
      'short',
      'single_select',
      'slider',
      'slider',
    ]);
    expect(fields[0]).toMatchObject({
      label: 'Which of the following best describes your current role?',
      options: [
        'School/college senior leader',
        'Middle leader',
        'Teacher/lecturer/tutor',
        'Support staff',
        'Digital / data / IT lead',
        'Governor / trustee / board member',
        'Union / workforce representative',
        'Policy / system leader',
        'Researcher / adviser',
        'Other',
      ],
    });
    expect(fields[2]).toMatchObject({
      label: 'Which stakeholder group are you responding as part of?',
      fieldType: 'single_select',
      options: [
        'School / college leadership group',
        'TUC / workforce group',
        'Other / mixed perspective',
      ],
    });
    expect(fields[3]).toMatchObject({
      label: 'Staff AI literacy, capability, and training',
      fieldType: 'slider',
      minLabel: 'Not at all significant',
      midLabel: 'Moderately significant',
      maxLabel: 'Extremely significant',
    });
    expect(fields[4]).toMatchObject({
      label: 'Time available for training and implementation',
      fieldType: 'slider',
    });
  });

  it('parses split question id and prompt lines into the correct typed fields', () => {
    const questionnaireText = [
      'Round 1: Full question set',
      '',
      'Section A. About you',
      '',
      'Q0.',
      'Which of the following best describes your current role?',
      'Response type: Select one.',
      'School/college senior leader',
      'Middle leader',
      'Teacher/lecturer/tutor',
      'Support staff',
      'Other',
      '',
      'Q0a.',
      'Which stakeholder group are you responding as part of?',
      'Response type: Select one.',
      'School / college leadership group',
      'TUC / workforce group',
      'Other / mixed perspective',
      '',
      'Q1.',
      'Thinking about AI in education over the next 2-3 years, how significant is each of the following challenges in your context?',
      'Response type: 0-10 slider for each item.',
      'Anchor labels: 0 = Not at all significant, 5 = Moderately significant, 10 = Extremely significant',
      'Staff AI literacy, capability, and training',
      'Time available for training and implementation',
    ].join('\n');

    const parsed = parseQuestionnaireText(questionnaireText);
    expect(parsed.questions.map((question) => question.questionId)).toEqual([
      'Q0',
      'Q0_other',
      'Q0a',
      'Q1_1',
      'Q1_2',
    ]);
    expect(parsed.questions[0]).toMatchObject({
      questionId: 'Q0',
      label: 'Which of the following best describes your current role?',
      inputType: 'single_select',
      options: [
        'School/college senior leader',
        'Middle leader',
        'Teacher/lecturer/tutor',
        'Support staff',
        'Other',
      ],
    });
    expect(parsed.questions[2]).toMatchObject({
      questionId: 'Q0a',
      label: 'Which stakeholder group are you responding as part of?',
      inputType: 'single_select',
      options: ['School / college leadership group', 'TUC / workforce group', 'Other / mixed perspective'],
    });
    expect(parsed.questions[3]).toMatchObject({
      questionId: 'Q1_1',
      label: 'Staff AI literacy, capability, and training',
      inputType: 'slider',
      minLabel: 'Not at all significant',
      midLabel: 'Moderately significant',
      maxLabel: 'Extremely significant',
    });

    const converted = convertQuestionnaireTextToRichTemplate(questionnaireText);
    const fields = parseDocumentTemplateFields(converted.template);
    expect(fields.map((field) => field.fieldType)).toEqual([
      'single_select',
      'short',
      'single_select',
      'slider',
      'slider',
    ]);
    expect(fields[0]).toMatchObject({
      questionId: 'Q0',
      label: 'Which of the following best describes your current role?',
      options: [
        'School/college senior leader',
        'Middle leader',
        'Teacher/lecturer/tutor',
        'Support staff',
        'Other',
      ],
    });
    expect(fields[3]).toMatchObject({
      questionId: 'Q1_1',
      label: 'Staff AI literacy, capability, and training',
      fieldType: 'slider',
    });
  });

  it('imports the full AI education questionnaire with correct static field types and routed follow-ups', () => {
    const parsed = parseQuestionnaireText(FULL_AI_EDUCATION_QUESTIONNAIRE);

    expect(parsed.importedRoundLabel).toBe('Round 1: Full question set');
    expect(parsed.skippedRoundLabels).toEqual(['Round 2: Re-prioritisation']);
    expect(parsed.warnings).toContain(
      'Later rounds were not imported into the active form: Round 2: Re-prioritisation.',
    );

    expect(parsed.questions.find((question) => question.questionId === 'Q0')).toMatchObject({
      inputType: 'single_select',
      options: [
        'School/college senior leader',
        'Middle leader',
        'Teacher/lecturer/tutor',
        'Support staff',
        'Digital / data / IT lead',
        'Governor / trustee / board member',
        'Union / workforce representative',
        'Policy / system leader',
        'Researcher / adviser',
        'Other',
      ],
    });
    expect(parsed.questions.find((question) => question.questionId === 'Q0d_other')).toMatchObject({
      inputType: 'text',
      conditionalOnQuestionId: 'Q0d',
      conditionalOnOption: 'Prefer to self-describe (free text, max 20 words)',
    });
    expect(parsed.questions.find((question) => question.questionId === 'Q1_1')).toMatchObject({
      inputType: 'slider',
      label: 'Staff AI literacy, capability, and training',
      minLabel: 'Not at all significant',
      midLabel: 'Moderately significant',
      maxLabel: 'Extremely significant',
    });
    expect(parsed.questions.find((question) => question.questionId === 'Q2')).toMatchObject({
      inputType: 'multi_select',
      maxSelections: 5,
    });
    expect(parsed.questions.find((question) => question.questionId === 'Q2')?.options?.slice(0, 3)).toEqual([
      'Staff AI literacy, capability, and training',
      'Time available for training and implementation',
      'Workload created by checking, editing, monitoring, or compliance',
    ]);
    expect(parsed.questions.find((question) => question.questionId === 'Q3')).toMatchObject({
      inputType: 'single_select',
    });
    expect(parsed.questions.find((question) => question.questionId === 'Q4')).toBeUndefined();
    expect(parsed.questions.find((question) => question.questionId === 'Q4a')).toBeUndefined();
    expect(parsed.questions.find((question) => question.questionId === 'Q4b')).toBeUndefined();
    expect(parsed.questions.find((question) => question.questionId === 'Q4c')).toBeUndefined();
    expect(parsed.questions.find((question) => question.questionId === 'Q5a')).toMatchObject({
      inputType: 'textarea',
      conditionalOnQuestionId: 'Q5',
      conditionalOnOption: 'Other',
    });
    expect(parsed.questions.find((question) => question.questionId === 'Q12a')).toMatchObject({
      inputType: 'textarea',
      conditionalOnQuestionId: 'Q12',
      conditionalOnOption: 'Other',
    });
    expect(parsed.questions.find((question) => question.questionId === 'Q12b')).toMatchObject({
      inputType: 'single_select',
    });
    expect(parsed.questions.find((question) => question.questionId === 'Q12b_other')).toMatchObject({
      inputType: 'text',
      conditionalOnQuestionId: 'Q12b',
      conditionalOnOption: 'Other (please specify, max 20 words)',
    });

    const converted = convertQuestionnaireTextToRichTemplate(FULL_AI_EDUCATION_QUESTIONNAIRE);
    const fields = parseDocumentTemplateFields(converted.template);

    expect(fields.find((field) => field.questionId === 'Q5a')).toMatchObject({
      fieldType: 'long',
      conditionalOnQuestionId: 'Q5',
      conditionalOnOption: 'Other',
    });
    expect(fields.find((field) => field.questionId === 'Q12b_other')).toMatchObject({
      fieldType: 'short',
      conditionalOnQuestionId: 'Q12b',
      conditionalOnOption: 'Other (please specify, max 20 words)',
    });
    expect(fields.find((field) => field.questionId === 'Q4a')).toBeUndefined();
    expect(fields.find((field) => field.questionId === 'Q15')).toBeUndefined();
  });
});

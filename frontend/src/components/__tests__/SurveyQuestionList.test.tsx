import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SurveyQuestionList from '../SurveyQuestionList';

describe('SurveyQuestionList review state', () => {
  it('shows answer status instead of required metadata in read-only mode', () => {
    render(
      <SurveyQuestionList
        questions={[
          {
            label: 'What changed?',
            inputType: 'text',
            optional: false,
          },
        ]}
        formId="1"
        responses={{
          q1: {
            position: 'The policy was updated.',
            evidence: '',
            counterarguments: '',
            confidence: 5,
            confidenceJustification: '',
            citations: [],
            expertNominations: [],
          },
        }}
        onChange={() => {}}
        readOnly
        persistDraft={false}
      />,
    );

    expect(screen.getByText('Answered')).toBeInTheDocument();
    expect(screen.queryByText('Required')).not.toBeInTheDocument();
    expect(screen.getByText('The policy was updated.')).toBeInTheDocument();
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { emptyStructuredResponse } from '../../types/structured-input';
import SurveyQuestionInput from '../SurveyQuestionInput';

describe('SurveyQuestionInput slider', () => {
  it('commits the midpoint when an unset slider is clicked', () => {
    const onChange = vi.fn();

    render(
      <SurveyQuestionInput
        question={{
          label: 'Staff AI literacy, capability, and training',
          requireEvidence: false,
          requireCounterarguments: false,
          requireConfidence: false,
          inputType: 'slider',
          minValue: 0,
          maxValue: 10,
          minLabel: 'Not at all significant',
          midLabel: 'Moderately significant',
          maxLabel: 'Extremely significant',
        }}
        value={emptyStructuredResponse()}
        onChange={onChange}
      />,
    );

    const slider = screen.getByRole('slider');
    fireEvent.click(slider);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        position: '5',
      }),
    );
  });
});

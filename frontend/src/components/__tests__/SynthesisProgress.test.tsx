import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SynthesisProgress from '../SynthesisProgress';

describe('SynthesisProgress', () => {
  it('renders nothing when visible is false', () => {
    const { container } = render(
      <SynthesisProgress stage="preparing" step={1} totalSteps={5} visible={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders progress bar when visible', () => {
    render(
      <SynthesisProgress stage="preparing" step={1} totalSteps={5} visible={true} />,
    );
    expect(screen.getByText('Preparing responses…')).toBeInTheDocument();
  });

  it('displays correct percentage', () => {
    render(
      <SynthesisProgress stage="synthesising" step={3} totalSteps={10} visible={true} />,
    );
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('shows 0% when totalSteps is 0', () => {
    render(
      <SynthesisProgress stage="preparing" step={0} totalSteps={0} visible={true} />,
    );
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('displays step count when not complete', () => {
    render(
      <SynthesisProgress stage="analyzing" step={2} totalSteps={6} visible={true} />,
    );
    expect(screen.getByText('Step 2 of 6')).toBeInTheDocument();
  });

  it('hides step count when stage is "complete"', () => {
    render(
      <SynthesisProgress stage="complete" step={5} totalSteps={5} visible={true} />,
    );
    expect(screen.getByText('Complete!')).toBeInTheDocument();
    expect(screen.queryByText(/Step/)).not.toBeInTheDocument();
  });

  it('hides step count when stage is "mock_complete"', () => {
    render(
      <SynthesisProgress stage="mock_complete" step={5} totalSteps={5} visible={true} />,
    );
    expect(screen.getByText('Wrapping up…')).toBeInTheDocument();
    expect(screen.queryByText(/Step/)).not.toBeInTheDocument();
  });

  it('adds "complete" class when stage is complete', () => {
    const { container } = render(
      <SynthesisProgress stage="complete" step={5} totalSteps={5} visible={true} />,
    );
    expect(container.firstChild).toHaveClass('complete');
  });

  it('renders correct label for each known stage', () => {
    const stages: Record<string, string> = {
      preparing: 'Preparing responses…',
      mock_init: 'Initialising…',
      synthesising: 'Synthesising insights…',
      analyzing: 'Analysing responses…',
      mapping_results: 'Mapping results…',
      formatting: 'Formatting output…',
      generating: 'Generating synthesis…',
    };

    for (const [stage, label] of Object.entries(stages)) {
      const { unmount } = render(
        <SynthesisProgress stage={stage} step={1} totalSteps={5} visible={true} />,
      );
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it('uses stage name as label for unknown stages', () => {
    render(
      <SynthesisProgress stage="custom_stage" step={1} totalSteps={5} visible={true} />,
    );
    expect(screen.getByText('custom_stage')).toBeInTheDocument();
  });

  it('sets progress bar width correctly', () => {
    const { container } = render(
      <SynthesisProgress stage="synthesising" step={7} totalSteps={10} visible={true} />,
    );
    const fill = container.querySelector('.synthesis-progress-fill') as HTMLElement;
    expect(fill.style.width).toBe('70%');
  });
});

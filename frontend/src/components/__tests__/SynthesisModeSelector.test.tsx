import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import SynthesisModeSelector from '../SynthesisModeSelector';

describe('SynthesisModeSelector', () => {
  const defaultProps = {
    mode: 'simple' as const,
    onModeChange: vi.fn(),
  };

  it('renders all three mode options', () => {
    render(<SynthesisModeSelector {...defaultProps} />);
    expect(screen.getByText('Simple')).toBeInTheDocument();
    expect(screen.getByText('Committee')).toBeInTheDocument();
    expect(screen.getByText('TTD')).toBeInTheDocument();
  });

  it('displays descriptions for each mode', () => {
    render(<SynthesisModeSelector {...defaultProps} />);
    expect(screen.getByText('Quick one-shot summary')).toBeInTheDocument();
    expect(screen.getByText('Multi-analyst structured synthesis')).toBeInTheDocument();
    expect(screen.getByText('Iterative diffusion refinement')).toBeInTheDocument();
  });

  it('displays speed labels', () => {
    render(<SynthesisModeSelector {...defaultProps} />);
    expect(screen.getByText('Fast')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('Thorough')).toBeInTheDocument();
  });

  it('marks the selected mode with the "selected" class', () => {
    render(<SynthesisModeSelector mode="committee" onModeChange={vi.fn()} />);
    const committeeButton = screen.getByRole('button', {
      name: /committee synthesis mode/i,
    });
    expect(committeeButton.className).toContain('selected');

    const simpleButton = screen.getByRole('button', {
      name: /simple synthesis mode/i,
    });
    expect(simpleButton.className).not.toContain('selected');
  });

  it('calls onModeChange with the correct mode when clicked', async () => {
    const onModeChange = vi.fn();
    const user = userEvent.setup();
    render(<SynthesisModeSelector mode="simple" onModeChange={onModeChange} />);

    await user.click(screen.getByRole('button', { name: /committee synthesis mode/i }));
    expect(onModeChange).toHaveBeenCalledWith('committee');

    await user.click(screen.getByRole('button', { name: /ttd synthesis mode/i }));
    expect(onModeChange).toHaveBeenCalledWith('ttd');
  });

  it('shows expanded tooltip detail when info button is clicked', async () => {
    const user = userEvent.setup();
    render(<SynthesisModeSelector {...defaultProps} />);

    // Detail text should not be visible initially
    expect(screen.queryByText(/single AI pass/i)).not.toBeInTheDocument();

    // Click the info button for Simple mode
    const infoButton = screen.getByRole('button', { name: /more info about simple/i });
    await user.click(infoButton);

    expect(screen.getByText(/single AI pass/i)).toBeInTheDocument();
    expect(screen.getByText(/Quick overviews/i)).toBeInTheDocument();
  });

  it('collapses tooltip when info button is clicked again', async () => {
    const user = userEvent.setup();
    render(<SynthesisModeSelector {...defaultProps} />);

    const infoButton = screen.getByRole('button', { name: /more info about simple/i });
    await user.click(infoButton);
    expect(screen.getByText(/single AI pass/i)).toBeInTheDocument();

    await user.click(infoButton);
    expect(screen.queryByText(/single AI pass/i)).not.toBeInTheDocument();
  });

  it('only one tooltip is expanded at a time', async () => {
    const user = userEvent.setup();
    render(<SynthesisModeSelector {...defaultProps} />);

    // Expand Simple tooltip
    await user.click(screen.getByRole('button', { name: /more info about simple/i }));
    expect(screen.getByText(/single AI pass/i)).toBeInTheDocument();

    // Expand Committee tooltip — Simple should collapse
    await user.click(screen.getByRole('button', { name: /more info about committee/i }));
    expect(screen.queryByText(/single AI pass/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Multiple independent AI analysts/i)).toBeInTheDocument();
  });

  it('info button click does not trigger mode selection', async () => {
    const onModeChange = vi.fn();
    const user = userEvent.setup();
    render(<SynthesisModeSelector mode="simple" onModeChange={onModeChange} />);

    await user.click(screen.getByRole('button', { name: /more info about committee/i }));
    expect(onModeChange).not.toHaveBeenCalled();
  });
});

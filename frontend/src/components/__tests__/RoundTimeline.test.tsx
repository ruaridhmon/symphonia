import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import RoundTimeline from '../RoundTimeline';
import type { Round } from '../../types/summary';

function makeRound(overrides: Partial<Round> = {}): Round {
  return {
    id: 1,
    round_number: 1,
    synthesis: '',
    synthesis_json: null,
    is_active: false,
    questions: [],
    convergence_score: null,
    response_count: 0,
    ...overrides,
  };
}

describe('RoundTimeline', () => {
  it('renders nothing when rounds is empty', () => {
    const { container } = render(
      <RoundTimeline
        rounds={[]}
        activeRoundId={null}
        selectedRoundId={null}
        onSelectRound={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders round count text', () => {
    const rounds = [makeRound({ id: 1, round_number: 1 })];
    render(
      <RoundTimeline
        rounds={rounds}
        activeRoundId={null}
        selectedRoundId={null}
        onSelectRound={vi.fn()}
      />,
    );
    expect(screen.getByText('1 round')).toBeInTheDocument();
  });

  it('pluralizes round count', () => {
    const rounds = [
      makeRound({ id: 1, round_number: 1 }),
      makeRound({ id: 2, round_number: 2 }),
      makeRound({ id: 3, round_number: 3 }),
    ];
    render(
      <RoundTimeline
        rounds={rounds}
        activeRoundId={null}
        selectedRoundId={null}
        onSelectRound={vi.fn()}
      />,
    );
    expect(screen.getByText('3 rounds')).toBeInTheDocument();
  });

  it('calls onSelectRound when a round card is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const rounds = [
      makeRound({ id: 1, round_number: 1 }),
      makeRound({ id: 2, round_number: 2 }),
    ];

    render(
      <RoundTimeline
        rounds={rounds}
        activeRoundId={null}
        selectedRoundId={1}
        onSelectRound={onSelect}
      />,
    );

    // Click the second round card
    const cards = screen.getAllByRole('option');
    await user.click(cards[1]);
    expect(onSelect).toHaveBeenCalledWith(rounds[1]);
  });

  it('marks selected round card with selected class', () => {
    const rounds = [
      makeRound({ id: 10, round_number: 1 }),
      makeRound({ id: 20, round_number: 2 }),
    ];

    render(
      <RoundTimeline
        rounds={rounds}
        activeRoundId={null}
        selectedRoundId={20}
        onSelectRound={vi.fn()}
      />,
    );

    const cards = screen.getAllByRole('option');
    expect(cards[1].className).toContain('selected');
    expect(cards[0].className).not.toContain('selected');
  });

  it('shows "Live" badge for active round', () => {
    const rounds = [
      makeRound({ id: 1, round_number: 1, is_active: true }),
    ];

    render(
      <RoundTimeline
        rounds={rounds}
        activeRoundId={1}
        selectedRoundId={1}
        onSelectRound={vi.fn()}
      />,
    );

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('shows "Synthesised" badge for completed rounds with synthesis', () => {
    const rounds = [
      makeRound({ id: 1, round_number: 1, synthesis: 'Some synthesis content', is_active: false }),
    ];

    render(
      <RoundTimeline
        rounds={rounds}
        activeRoundId={null}
        selectedRoundId={1}
        onSelectRound={vi.fn()}
      />,
    );

    expect(screen.getByText('Synthesised')).toBeInTheDocument();
  });

  it('shows "Pending" badge for rounds without synthesis and not active', () => {
    const rounds = [
      makeRound({ id: 1, round_number: 1, synthesis: '', is_active: false }),
    ];

    render(
      <RoundTimeline
        rounds={rounds}
        activeRoundId={null}
        selectedRoundId={1}
        onSelectRound={vi.fn()}
      />,
    );

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('displays response count in stats', () => {
    const rounds = [
      makeRound({ id: 1, round_number: 1, response_count: 12 }),
    ];

    render(
      <RoundTimeline
        rounds={rounds}
        activeRoundId={null}
        selectedRoundId={1}
        onSelectRound={vi.fn()}
      />,
    );

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('responses')).toBeInTheDocument();
  });

  it('displays convergence score formatted as percentage', () => {
    const rounds = [
      makeRound({ id: 1, round_number: 1, convergence_score: 0.73 }),
    ];

    render(
      <RoundTimeline
        rounds={rounds}
        activeRoundId={null}
        selectedRoundId={1}
        onSelectRound={vi.fn()}
      />,
    );

    expect(screen.getByText('73%')).toBeInTheDocument();
    expect(screen.getByText('convergence')).toBeInTheDocument();
  });

  it('shows dash for null convergence score', () => {
    const rounds = [
      makeRound({ id: 1, round_number: 1, convergence_score: null }),
    ];

    render(
      <RoundTimeline
        rounds={rounds}
        activeRoundId={null}
        selectedRoundId={1}
        onSelectRound={vi.fn()}
      />,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('displays question count in stats', () => {
    const rounds = [
      makeRound({ id: 1, round_number: 1, questions: ['Q1', 'Q2', 'Q3'] }),
    ];

    render(
      <RoundTimeline
        rounds={rounds}
        activeRoundId={null}
        selectedRoundId={1}
        onSelectRound={vi.fn()}
      />,
    );

    expect(screen.getByText('questions')).toBeInTheDocument();
  });

  it('renders stepper nodes with aria labels', () => {
    const rounds = [
      makeRound({ id: 1, round_number: 1, is_active: true }),
      makeRound({ id: 2, round_number: 2, synthesis: 'Done' }),
    ];

    render(
      <RoundTimeline
        rounds={rounds}
        activeRoundId={1}
        selectedRoundId={1}
        onSelectRound={vi.fn()}
      />,
    );

    expect(screen.getByRole('tab', { name: /round 1.*active/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /round 2.*synthesised/i })).toBeInTheDocument();
  });

  it('calls onSelectRound when stepper node is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const rounds = [
      makeRound({ id: 1, round_number: 1 }),
      makeRound({ id: 2, round_number: 2 }),
    ];

    render(
      <RoundTimeline
        rounds={rounds}
        activeRoundId={null}
        selectedRoundId={1}
        onSelectRound={onSelect}
      />,
    );

    const tabs = screen.getAllByRole('tab');
    await user.click(tabs[1]);
    expect(onSelect).toHaveBeenCalledWith(rounds[1]);
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SurveyStatisticsPanel from '../SurveyStatisticsPanel';
import type { RoundWithResponses } from '../../../types/summary';

describe('SurveyStatisticsPanel', () => {
  it('renders averages, ranges, and distribution for numeric survey questions', () => {
    const roundResponses: RoundWithResponses = {
      id: 1,
      round_number: 1,
      synthesis: '',
      is_active: true,
      responses: [
        {
          id: 1,
          round_id: 1,
          email: null,
          timestamp: '2026-04-28T00:00:00Z',
          version: 1,
          answers: { q1: { position: '0' } },
        },
        {
          id: 2,
          round_id: 1,
          email: null,
          timestamp: '2026-04-28T00:00:00Z',
          version: 1,
          answers: { q1: { position: '0.5' } },
        },
        {
          id: 3,
          round_id: 1,
          email: null,
          timestamp: '2026-04-28T00:00:00Z',
          version: 1,
          answers: { q1: { position: '1' } },
        },
      ],
    };

    render(
      <SurveyStatisticsPanel
        questions={[{ label: 'Support for the proposal', inputType: 'slider' }]}
        roundResponses={roundResponses}
      />,
    );

    expect(screen.getByText('Survey statistics')).toBeInTheDocument();
    expect(screen.getByText('Support for the proposal')).toBeInTheDocument();
    expect(screen.getByText('Average')).toBeInTheDocument();
    expect(screen.getAllByText('0.5').length).toBeGreaterThan(0);
    expect(screen.getByText('Range')).toBeInTheDocument();
    expect(screen.getByText('0 - 1')).toBeInTheDocument();
  });

  it('renders distributions for named Likert questions', () => {
    const roundResponses: RoundWithResponses = {
      id: 1,
      round_number: 1,
      synthesis: '',
      is_active: true,
      responses: [
        {
          id: 1,
          round_id: 1,
          email: null,
          timestamp: '2026-04-28T00:00:00Z',
          version: 1,
          answers: { q1: { position: 'Agree', evidence: 'Virtual wards reduced avoidable admissions in our trust.' } },
        },
        {
          id: 2,
          round_id: 1,
          email: null,
          timestamp: '2026-04-28T00:00:00Z',
          version: 1,
          answers: { q1: { position: 'Agree' } },
        },
        {
          id: 3,
          round_id: 1,
          email: null,
          timestamp: '2026-04-28T00:00:00Z',
          version: 1,
          answers: { q1: { position: 'Disagree' } },
        },
      ],
    };

    render(
      <SurveyStatisticsPanel
        questions={[{ label: 'Confidence in delivery', inputType: 'likert', options: ['Agree', 'Disagree'] }]}
        roundResponses={roundResponses}
      />,
    );

    expect(screen.getByText('Confidence in delivery')).toBeInTheDocument();
    expect(screen.getByText('Agree')).toBeInTheDocument();
    expect(screen.getByText('Disagree')).toBeInTheDocument();
    expect(screen.getByText('67%')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByText('Show original responses (1)')).toBeInTheDocument();
    expect(screen.getByText('Virtual wards reduced avoidable admissions in our trust.')).toBeInTheDocument();
  });
});

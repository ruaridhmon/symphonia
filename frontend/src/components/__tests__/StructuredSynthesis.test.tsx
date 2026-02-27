import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import StructuredSynthesis from '../StructuredSynthesis';
import type { SynthesisData } from '../../types/synthesis';

function makeSynthesisData(overrides: Partial<SynthesisData> = {}): SynthesisData {
  return {
    agreements: [],
    disagreements: [],
    nuances: [],
    confidence_map: { overall: 0.75 },
    follow_up_probes: [],
    meta_synthesis_reasoning: '',
    ...overrides,
  };
}

describe('StructuredSynthesis', () => {
  it('renders overview stats with correct counts', () => {
    const data = makeSynthesisData({
      agreements: [
        { claim: 'A1', supporting_experts: [1, 2], confidence: 0.9, evidence_summary: 'Evidence A' },
      ],
      disagreements: [
        { topic: 'D1', positions: [], severity: 'high' },
        { topic: 'D2', positions: [], severity: 'low' },
      ],
      nuances: [
        { claim: 'N1', context: 'Context N', relevant_experts: [1] },
      ],
      follow_up_probes: [
        { question: 'P1?', target_experts: [1], rationale: 'Because' },
        { question: 'P2?', target_experts: [2], rationale: 'Also' },
        { question: 'P3?', target_experts: [3], rationale: 'Why' },
      ],
    });

    const { container } = render(<StructuredSynthesis data={data} />);

    // Check overview stat labels exist (they appear in both stats and section headers)
    const statLabels = container.querySelectorAll('.structured-stat-label');
    const labelTexts = Array.from(statLabels).map(el => el.textContent);
    expect(labelTexts).toContain('Agreements');
    expect(labelTexts).toContain('Disagreements');
    expect(labelTexts).toContain('Nuances & Uncertainties');
    expect(labelTexts).toContain('Follow-up Probes');

    // Check stat values
    const statValues = container.querySelectorAll('.structured-stat-value');
    const valueTexts = Array.from(statValues).map(el => el.textContent);
    expect(valueTexts).toContain('1'); // agreements
    expect(valueTexts).toContain('2'); // disagreements
    expect(valueTexts).toContain('3'); // probes
  });

  it('renders agreement claims when section is expanded', () => {
    const data = makeSynthesisData({
      agreements: [
        {
          claim: 'AI will transform education',
          supporting_experts: [1, 3],
          confidence: 0.85,
          evidence_summary: 'Multiple experts cited recent studies',
        },
      ],
    });

    render(<StructuredSynthesis data={data} />);
    // Agreements section is expanded by default
    expect(screen.getByText('AI will transform education')).toBeInTheDocument();
    expect(screen.getByText('Multiple experts cited recent studies')).toBeInTheDocument();
  });

  it('renders expert labels when provided', () => {
    const data = makeSynthesisData({
      agreements: [
        {
          claim: 'Claim',
          supporting_experts: [1, 2],
          confidence: 0.8,
          evidence_summary: 'Evidence',
        },
      ],
    });

    render(
      <StructuredSynthesis
        data={data}
        expertLabels={{ 1: 'Dr. Smith', 2: 'Prof. Jones' }}
      />,
    );
    expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
    expect(screen.getByText('Prof. Jones')).toBeInTheDocument();
  });

  it('falls back to E{id} when no expert labels provided', () => {
    const data = makeSynthesisData({
      agreements: [
        {
          claim: 'Claim',
          supporting_experts: [5],
          confidence: 0.8,
          evidence_summary: 'Evidence',
        },
      ],
    });

    render(<StructuredSynthesis data={data} />);
    expect(screen.getByText('E5')).toBeInTheDocument();
  });

  it('renders disagreements with severity badge', () => {
    const data = makeSynthesisData({
      disagreements: [
        {
          topic: 'Methodology debate',
          severity: 'high',
          positions: [
            { position: 'Quantitative approach is better', experts: [1], evidence: 'Stats show...' },
            { position: 'Qualitative is richer', experts: [2], evidence: 'Depth matters...' },
          ],
        },
      ],
    });

    render(<StructuredSynthesis data={data} />);
    // Disagreements section is expanded by default
    expect(screen.getByText('Methodology debate')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('Quantitative approach is better')).toBeInTheDocument();
    expect(screen.getByText('Qualitative is richer')).toBeInTheDocument();
  });

  it('collapses and expands sections on click', async () => {
    const user = userEvent.setup();
    const data = makeSynthesisData({
      agreements: [
        { claim: 'Hidden claim', supporting_experts: [], confidence: 0.7, evidence_summary: 'Ev' },
      ],
    });

    render(<StructuredSynthesis data={data} />);

    // Initially expanded
    expect(screen.getByText('Hidden claim')).toBeInTheDocument();

    // Click section header button (use aria id to avoid duplicate text match)
    const header = document.getElementById('synthesis-header-agreements')!;
    await user.click(header);
    expect(screen.queryByText('Hidden claim')).not.toBeInTheDocument();

    // Click again to expand
    await user.click(header);
    expect(screen.getByText('Hidden claim')).toBeInTheDocument();
  });

  it('nuances section is collapsed by default', () => {
    const data = makeSynthesisData({
      nuances: [
        { claim: 'Nuanced point', context: 'Some context', relevant_experts: [1] },
      ],
    });

    const { container } = render(<StructuredSynthesis data={data} />);
    // Nuances collapsed by default
    expect(screen.queryByText('Nuanced point')).not.toBeInTheDocument();
    // But the section header should be visible (use class selector to avoid stat label duplicate)
    expect(container.querySelector('.structured-section-title')).toHaveTextContent('Nuances & Uncertainties');
  });

  it('expands nuances section on click', async () => {
    const user = userEvent.setup();
    const data = makeSynthesisData({
      nuances: [
        { claim: 'Nuanced point', context: 'Some context', relevant_experts: [1] },
      ],
    });

    render(<StructuredSynthesis data={data} />);
    const header = document.getElementById('synthesis-header-nuances')!;
    await user.click(header);
    expect(screen.getByText('Nuanced point')).toBeInTheDocument();
    expect(screen.getByText('Some context')).toBeInTheDocument();
  });

  it('renders follow-up probes', () => {
    const data = makeSynthesisData({
      follow_up_probes: [
        { question: 'What about scalability?', target_experts: [1, 3], rationale: 'Key concern' },
      ],
    });

    render(<StructuredSynthesis data={data} />);
    // Probes section is expanded by default
    expect(screen.getByText('What about scalability?')).toBeInTheDocument();
    expect(screen.getByText('Key concern')).toBeInTheDocument();
  });

  it('renders convergence score when provided', () => {
    const data = makeSynthesisData();
    render(<StructuredSynthesis data={data} convergenceScore={0.82} />);
    expect(screen.getByText('Convergence')).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
  });

  it('renders overall confidence from confidence_map', () => {
    const data = makeSynthesisData({
      confidence_map: { overall: 0.65 },
    });
    render(<StructuredSynthesis data={data} />);
    expect(screen.getByText('Overall confidence')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('does not render empty sections', () => {
    const data = makeSynthesisData(); // all arrays empty
    render(<StructuredSynthesis data={data} />);
    // Section headers should not appear for empty arrays
    expect(screen.queryByText('Agreements')).toBeInTheDocument(); // stats label always shows
    // But the section body/header button should not be there
    expect(screen.queryByRole('button', { name: /agreements/i })).not.toBeInTheDocument();
  });

  it('renders narrative section when provided', async () => {
    const user = userEvent.setup();
    const data = makeSynthesisData({
      narrative: 'This is the narrative summary of the round.',
    });

    render(<StructuredSynthesis data={data} />);
    // Narrative is collapsed by default
    expect(screen.queryByText('This is the narrative summary of the round.')).not.toBeInTheDocument();

    // Click to expand
    const header = screen.getByText('Narrative Summary').closest('button')!;
    await user.click(header);
    expect(screen.getByText('This is the narrative summary of the round.')).toBeInTheDocument();
  });
});

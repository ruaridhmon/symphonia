import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DocumentTemplateResponse, { splitRichTemplatePages } from '../DocumentTemplateResponse';

function parseTemplateNodes(html: string): ChildNode[] {
  const document = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(document.body.childNodes);
}

describe('splitRichTemplatePages', () => {
  it('keeps numbered recommendations on separate pages under the Round 2 recommendations section', () => {
    const pages = splitRichTemplatePages(parseTemplateNodes(`
      <h1>Round 2 Recommendations</h1>
      <p>The UK needs to adopt a national model for connected data.</p>
      <h2>Recommendations for Round 2</h2>
      <h2>Each recommendation</h2>
      <p>For each revised recommendation, answer the two required questions.</p>
      <h3>Recommendation 1. Give local systems a clear national mandate</h3>
      <p>Recommendation 1 context.</p>
      <span data-symphonia-field-key="recommendation_1_rating"></span>
      <h3>Recommendation 2. Establish a national Connected ICB programme</h3>
      <p>Recommendation 2 context.</p>
      <span data-symphonia-field-key="recommendation_2_rating"></span>
      <h2>Conclusions</h2>
      <p>The question is no longer whether this can be done.</p>
    `));

    expect(pages.map((page) => page.title)).toEqual([
      'Summary',
      'Recommendation 1. Give local systems a clear national mandate',
      'Recommendation 2. Establish a national Connected ICB programme',
      'Conclusions',
    ]);
  });
});

describe('DocumentTemplateResponse pagination', () => {
  it('keeps section tabs and next controls in read-only review mode', () => {
    render(
      <DocumentTemplateResponse
        template={`<!-- symphonia-document-mode: fillable-rich -->
          <h1>Round 2 Recommendations</h1>
          <p>Summary text.</p>
          <h3>Recommendation 1. First recommendation</h3>
          <p>Recommendation 1 context.</p>
          <span data-symphonia-field-key="rec1"></span>
          <h3>Recommendation 2. Second recommendation</h3>
          <p>Recommendation 2 context.</p>
          <span data-symphonia-field-key="rec2"></span>
        `}
        answers={{}}
        questions={[]}
        readOnly
        paginate
      />,
    );

    expect(screen.getByRole('tab', { name: 'Summary' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Rec. 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Rec. 2' })).toBeInTheDocument();
    expect(screen.getByText('Section 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save & Next/i })).not.toBeInTheDocument();
  });
});

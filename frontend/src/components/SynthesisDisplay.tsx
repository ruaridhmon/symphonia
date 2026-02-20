import MarkdownRenderer from './MarkdownRenderer';

interface SynthesisDisplayProps {
  content: string;
  title?: string;
  subtitle?: string;
}

/**
 * Themed synthesis display card using MarkdownRenderer.
 * Supports both raw HTML and markdown content.
 */
export default function SynthesisDisplay({
  content,
  title = 'Synthesis',
  subtitle,
}: SynthesisDisplayProps) {
  if (!content) return null;

  return (
    <div className="card-lg p-6 sm:p-8 space-y-4 fade-in">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      <MarkdownRenderer content={content} />
    </div>
  );
}

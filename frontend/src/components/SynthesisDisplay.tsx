interface SynthesisDisplayProps {
  content: string;
  title?: string;
}

export default function SynthesisDisplay({ content, title = 'Synthesis' }: SynthesisDisplayProps) {
  if (!content) return null;

  return (
    <div className="card-lg p-8 sm:p-10 space-y-4">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}

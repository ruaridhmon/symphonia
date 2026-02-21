import { memo, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Props for custom markdown component overrides (react-markdown component signatures) */
type MdProps = { children?: ReactNode } & Record<string, any>;
type MdCodeProps = { className?: string; children?: ReactNode } & Record<string, any>;
type MdLinkProps = { href?: string; children?: ReactNode } & Record<string, any>;

/**
 * Preprocess content to recover markdown from HTML-wrapped sources.
 *
 * The TipTap editor wraps raw text in `<p>` tags and strips newlines,
 * producing content like `<p># Heading ## Subheading - item</p>`.
 * This function detects such cases and recovers parseable markdown.
 */
function preprocessContent(raw: string): { text: string; forceMarkdown: boolean } {
  let text = raw.trim();

  // If content is complex HTML with styled elements or nested tags
  // (e.g., committee synthesis HTML with <div>, <h3>, <ul>), render as HTML directly.
  const hasComplexHtml = /<(?:div|section|table|thead|tbody|tr)\b/i.test(text);
  if (hasComplexHtml) {
    return { text, forceMarkdown: false };
  }

  // Detect markdown syntax that's trapped inside <p> tags
  // (common when TipTap wraps LLM-generated markdown)
  const markdownSignals = /(?:^|\s)#{1,6}\s|^\s*[-*+]\s|\*\*|__|\|.*\|/m;

  // Strip <p> wrappers and convert <br> to newlines
  let stripped = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/^<p>/i, '')
    .replace(/<\/p>$/i, '');

  // Check if the stripped content looks like markdown
  if (markdownSignals.test(stripped)) {
    // Recover line breaks before markdown block elements:
    // headings (## ), list items (- ), horizontal rules (---), table rows (|)
    stripped = stripped
      .replace(/\s+(#{1,6}\s)/g, '\n\n$1')      // headings
      .replace(/\s+([-*+]\s)/g, '\n$1')           // list items
      .replace(/\s+(\|)/g, '\n$1')                // table rows
      .replace(/\s+(>{1,}\s)/g, '\n$1')           // blockquotes
      .replace(/\s+(---+|___+|\*\*\*+)/g, '\n\n$1'); // horizontal rules

    return { text: stripped.trim(), forceMarkdown: true };
  }

  return { text, forceMarkdown: false };
}

/**
 * Renders markdown (or raw HTML) with full theme-aware styling.
 * Supports GFM (tables, strikethrough, task lists) and raw HTML passthrough.
 *
 * Handles content that may have been wrapped in <p> tags by WYSIWYG editors
 * (e.g., TipTap) by detecting markdown syntax and recovering structure.
 */
function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  const { text, forceMarkdown } = preprocessContent(content);

  // If preprocessing recovered markdown, always use ReactMarkdown
  if (forceMarkdown) {
    return (
      <div className={`markdown-body ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={markdownComponents}
        >
          {text}
        </ReactMarkdown>
      </div>
    );
  }

  // Detect if content is HTML (starts with a tag) vs markdown
  const isHTML = /^\s*<[a-z][\s\S]*>/i.test(text);

  if (isHTML) {
    return (
      <div
        className={`markdown-body ${className}`}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }

  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

/** Shared component overrides for ReactMarkdown */
const markdownComponents = {
  h1: ({ children }: MdProps) => <h1 className="md-h1">{children}</h1>,
  h2: ({ children }: MdProps) => <h2 className="md-h2">{children}</h2>,
  h3: ({ children }: MdProps) => <h3 className="md-h3">{children}</h3>,
  h4: ({ children }: MdProps) => <h4 className="md-h4">{children}</h4>,
  p: ({ children }: MdProps) => <p className="md-p">{children}</p>,
  ul: ({ children }: MdProps) => <ul className="md-ul">{children}</ul>,
  ol: ({ children }: MdProps) => <ol className="md-ol">{children}</ol>,
  li: ({ children }: MdProps) => <li className="md-li">{children}</li>,
  blockquote: ({ children }: MdProps) => <blockquote className="md-blockquote">{children}</blockquote>,
  code: ({ className: codeClass, children, ...props }: MdCodeProps) => {
    const isInline = !codeClass;
    return isInline ? (
      <code className="md-code-inline" {...props}>{children}</code>
    ) : (
      <pre className="md-code-block">
        <code className={codeClass} {...props}>{children}</code>
      </pre>
    );
  },
  table: ({ children }: MdProps) => (
    <div className="md-table-wrapper">
      <table className="md-table">{children}</table>
    </div>
  ),
  th: ({ children }: MdProps) => <th className="md-th">{children}</th>,
  td: ({ children }: MdProps) => <td className="md-td">{children}</td>,
  hr: () => <hr className="md-hr" />,
  a: ({ href, children }: MdLinkProps) => (
    <a href={href} className="md-link" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  strong: ({ children }: MdProps) => <strong className="md-strong">{children}</strong>,
  em: ({ children }: MdProps) => <em className="md-em">{children}</em>,
};

export default memo(MarkdownRenderer);

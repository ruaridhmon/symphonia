import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders markdown (or raw HTML) with full theme-aware styling.
 * Supports GFM (tables, strikethrough, task lists) and raw HTML passthrough.
 */
export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  // Detect if content is HTML (starts with a tag) vs markdown
  const isHTML = /^\s*<[a-z][\s\S]*>/i.test(content.trim());

  if (isHTML) {
    return (
      <div
        className={`markdown-body ${className}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({ children }) => <h1 className="md-h1">{children}</h1>,
          h2: ({ children }) => <h2 className="md-h2">{children}</h2>,
          h3: ({ children }) => <h3 className="md-h3">{children}</h3>,
          h4: ({ children }) => <h4 className="md-h4">{children}</h4>,
          p: ({ children }) => <p className="md-p">{children}</p>,
          ul: ({ children }) => <ul className="md-ul">{children}</ul>,
          ol: ({ children }) => <ol className="md-ol">{children}</ol>,
          li: ({ children }) => <li className="md-li">{children}</li>,
          blockquote: ({ children }) => <blockquote className="md-blockquote">{children}</blockquote>,
          code: ({ className: codeClass, children, ...props }) => {
            const isInline = !codeClass;
            return isInline ? (
              <code className="md-code-inline" {...props}>{children}</code>
            ) : (
              <pre className="md-code-block">
                <code className={codeClass} {...props}>{children}</code>
              </pre>
            );
          },
          table: ({ children }) => (
            <div className="md-table-wrapper">
              <table className="md-table">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="md-th">{children}</th>,
          td: ({ children }) => <td className="md-td">{children}</td>,
          hr: () => <hr className="md-hr" />,
          a: ({ href, children }) => (
            <a href={href} className="md-link" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="md-strong">{children}</strong>,
          em: ({ children }) => <em className="md-em">{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsDownUp, ChevronsUpDown, Quote } from 'lucide-react';
import MarkdownRenderer from '../MarkdownRenderer';

type EvidenceKind = 'supporting' | 'opposing';
type ClaimStatus = 'agreement' | 'uncertain' | 'disagreement';

export type ExpertExcerpt = {
  expert: string;
  quote: string;
};

export type ClaimEvidence = {
  id: string;
  status: ClaimStatus;
  title: string;
  people?: string;
  opposingView?: string;
  supporting: ExpertExcerpt[];
  opposing: ExpertExcerpt[];
};

const CLAIM_RE = /^[🟥🟨🟩]\s*Claim\s+(\d+):\s*(.*)$/i;
const GROUP_RE = /^Show\s+(supporting|opposing)\s+statements$/i;

function cleanText(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function stripFormatting(value: string): string {
  return cleanText(value.replace(/\*\*/g, '').replace(/^[-*+]\s+/, ''));
}

function parseExcerpt(value: string, index: number): ExpertExcerpt {
  const cleaned = stripFormatting(value);
  const match = cleaned.match(/^(?:Response\s+)?([^:]{1,120}):\s*([\s\S]+)$/i);
  if (!match) return { expert: `Expert ${index + 1}`, quote: cleaned };
  return {
    expert: stripFormatting(match[1]),
    quote: stripFormatting(match[2]),
  };
}

type Token = { type: 'text' | 'list'; text: string; items?: string[] };

function tokensFromHtml(content: string): Token[] {
  const document = new DOMParser().parseFromString(content, 'text/html');
  const tokens: Token[] = [];

  const visit = (container: Element): void => {
    Array.from(container.children).forEach(node => {
      if (node.tagName === 'UL' || node.tagName === 'OL') {
        const items = Array.from(node.querySelectorAll(':scope > li'))
          .map(item => cleanText(item.textContent || ''))
          .filter(Boolean);
        tokens.push({ type: 'list', text: '', items });
        return;
      }

      if (/^(H[1-6]|P|SUMMARY)$/.test(node.tagName)) {
        const text = cleanText(node.textContent || '');
        if (text) tokens.push({ type: 'text', text });
        return;
      }

      // Saved syntheses wrap each claim in a styled div and each evidence
      // list in details/summary. Recurse through those structural wrappers
      // without also emitting their flattened text, which would merge the
      // whole claim into a single token.
      visit(node);
    });
  };

  visit(document.body);
  return tokens;
}

function tokensFromMarkdown(content: string): Token[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const tokens: Token[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const text = stripFormatting(lines[index].replace(/^#{1,6}\s+/, ''));
    if (!text || /^---+$/.test(text)) continue;
    if (/^[-*+]\s+/.test(lines[index].trim())) {
      const items: string[] = [];
      while (index < lines.length && /^[-*+]\s+/.test(lines[index].trim())) {
        items.push(stripFormatting(lines[index]));
        index += 1;
      }
      index -= 1;
      tokens.push({ type: 'list', text: '', items });
    } else {
      tokens.push({ type: 'text', text });
    }
  }
  return tokens;
}

export function parseClaimEvidence(content: string): ClaimEvidence[] {
  const tokens = /<[a-z][\s\S]*>/i.test(content) ? tokensFromHtml(content) : tokensFromMarkdown(content);
  const claims: ClaimEvidence[] = [];
  let current: ClaimEvidence | null = null;
  let pendingGroup: EvidenceKind | null = null;

  tokens.forEach(token => {
    if (token.type === 'list') {
      if (current && pendingGroup) {
        current[pendingGroup] = (token.items || []).map(parseExcerpt).filter(item => item.quote);
      }
      pendingGroup = null;
      return;
    }

    const claimMatch = token.text.match(CLAIM_RE);
    if (claimMatch) {
      const emoji = token.text[0];
      current = {
        id: claimMatch[1],
        status: emoji === '🟩' ? 'agreement' : emoji === '🟨' ? 'uncertain' : 'disagreement',
        title: stripFormatting(claimMatch[2]),
        supporting: [],
        opposing: [],
      };
      claims.push(current);
      pendingGroup = null;
      return;
    }
    if (!current) return;

    const groupMatch = token.text.match(GROUP_RE);
    if (groupMatch) {
      pendingGroup = groupMatch[1].toLowerCase() as EvidenceKind;
    } else if (/^People making this claim:/i.test(token.text)) {
      current.people = stripFormatting(token.text.replace(/^People making this claim:\s*/i, ''));
      pendingGroup = null;
    } else if (/^Opposing views?:/i.test(token.text)) {
      current.opposingView = stripFormatting(token.text.replace(/^Opposing views?:\s*/i, ''));
      pendingGroup = null;
    }
  });

  return claims;
}

const STATUS = {
  agreement: { label: 'Agreement', color: '#16a34a', background: 'color-mix(in srgb, #16a34a 9%, var(--card))' },
  uncertain: { label: 'Uncertain', color: '#d97706', background: 'color-mix(in srgb, #d97706 9%, var(--card))' },
  disagreement: { label: 'Disagreement', color: '#dc2626', background: 'color-mix(in srgb, #dc2626 8%, var(--card))' },
} as const;

function EvidenceGroup({ kind, excerpts, expanded, onToggle }: {
  kind: EvidenceKind;
  excerpts: ExpertExcerpt[];
  expanded: boolean;
  onToggle: () => void;
}) {
  if (!excerpts.length) return null;
  const supporting = kind === 'supporting';
  const color = supporting ? '#16a34a' : '#dc2626';
  const label = supporting ? 'Supporting expert excerpts' : 'Opposing expert excerpts';
  return (
    <section className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)', borderLeft: `4px solid ${color}` }}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="flex min-h-12 w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold"
        style={{ background: 'color-mix(in srgb, var(--muted) 24%, var(--card))', color: 'var(--foreground)' }}
      >
        <Quote size={16} aria-hidden="true" style={{ color }} />
        <span>{label}</span>
        <span className="ml-auto rounded-full px-2 py-0.5 text-xs" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
          {excerpts.length}
        </span>
        {expanded ? <ChevronUp size={17} aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}
      </button>
      {expanded && (
        <div className="grid gap-2 border-t p-2 sm:p-3" style={{ borderColor: 'var(--border)' }}>
          {excerpts.map((excerpt, index) => (
            <blockquote key={`${excerpt.expert}-${index}`} className="m-0 rounded-lg border p-3" style={{ borderColor: 'var(--border)', background: 'var(--background)' }}>
              <div className="mb-1 text-xs font-bold" style={{ color }}>{excerpt.expert}</div>
              <p className="m-0 text-sm leading-6" style={{ color: 'var(--foreground)' }}>“{excerpt.quote}”</p>
            </blockquote>
          ))}
        </div>
      )}
    </section>
  );
}

export default function ClaimEvidenceView({ content }: { content: string }) {
  const claims = useMemo(() => parseClaimEvidence(content), [content]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  if (!claims.length) return <MarkdownRenderer content={content} />;

  const groupKeys = claims.flatMap(claim => [
    ...(claim.supporting.length ? [`${claim.id}-supporting`] : []),
    ...(claim.opposing.length ? [`${claim.id}-opposing`] : []),
  ]);
  const allExpanded = groupKeys.length > 0 && groupKeys.every(key => expanded.has(key));
  const toggle = (key: string) => setExpanded(current => {
    const next = new Set(current);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  return (
    <section aria-label="Claims and expert evidence" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h3 className="m-0 text-lg font-semibold">Claims</h3>
          <p className="m-0 mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>Open a section to inspect the original expert excerpts attached to each claim.</p>
        </div>
        {groupKeys.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(allExpanded ? new Set() : new Set(groupKeys))}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-xs font-semibold"
            style={{ borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
          >
            {allExpanded ? <ChevronsDownUp size={16} aria-hidden="true" /> : <ChevronsUpDown size={16} aria-hidden="true" />}
            {allExpanded ? 'Collapse all evidence' : 'Expand all evidence'}
          </button>
        )}
      </div>

      {claims.map(claim => {
        const status = STATUS[claim.status];
        return (
          <article key={claim.id} className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)', borderLeft: `5px solid ${status.color}`, background: 'var(--card)' }}>
            <header className="p-3 sm:p-4" style={{ background: status.background }}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: status.color }}>{status.label}</span>
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Claim {claim.id}</span>
                {claim.people && <span className="ml-auto rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>{claim.people} experts</span>}
              </div>
              <h4 className="m-0 text-base font-semibold leading-6 sm:text-lg">{claim.title}</h4>
              {claim.opposingView && <p className="m-0 mt-2 text-sm leading-5" style={{ color: 'var(--muted-foreground)' }}><strong>Opposing view:</strong> {claim.opposingView}</p>}
            </header>
            {(claim.supporting.length > 0 || claim.opposing.length > 0) ? (
              <div className="grid gap-2 border-t p-2 sm:p-3" style={{ borderColor: 'var(--border)' }}>
                <EvidenceGroup kind="supporting" excerpts={claim.supporting} expanded={expanded.has(`${claim.id}-supporting`)} onToggle={() => toggle(`${claim.id}-supporting`)} />
                <EvidenceGroup kind="opposing" excerpts={claim.opposing} expanded={expanded.has(`${claim.id}-opposing`)} onToggle={() => toggle(`${claim.id}-opposing`)} />
              </div>
            ) : (
              <p className="m-0 border-t px-3 py-3 text-sm sm:px-4" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                No original free-text expert excerpts were submitted for this claim.
              </p>
            )}
          </article>
        );
      })}
    </section>
  );
}

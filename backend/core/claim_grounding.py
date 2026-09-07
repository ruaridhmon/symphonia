"""Validate attributed excerpts without manufacturing missing evidence."""
import re

GROUPS = ('supporting', 'opposing', 'uncertain')


def ground_claim(claim, sources, labels):
    """Exact text establishes provenance, not semantic correctness of an LLM stance.

    Conflicting written classifications are left unclassified for review. Recorded
    ratings are authoritative when the caller has matched a questionnaire item.
    """
    def identity(value):
        match = re.match(r'^Response\s+(\d+)\b', value.strip(), re.I)
        if match and 1 <= int(match[1]) <= len(sources):
            return int(match[1])
        return None

    def body(value):
        return re.sub(r'^Response\s+\d+(?:\s+\([^)]*\))?\s*:\s*', '', value.strip(), flags=re.I).strip().strip('"“”')

    recorded = bool(claim.pop('_recorded_positions', False))
    candidates = {}
    memberships = {}
    for group in GROUPS:
        members = {identity(v): v for v in claim.get(group + '_experts', []) if identity(v)}
        quotes = {}
        for value in claim.get(group + '_statements', []):
            index, quote = identity(value), body(value)
            if index and len(quote) >= 12 and any(quote in text for text in sources[index - 1]):
                quotes.setdefault(index, []).append(f'Response {index} ({labels[index - 1]}): {quote}')
        # Never infer an omitted sentence from keyword overlap.
        ids = set(members) if recorded else set(quotes)
        candidates[group] = (members, quotes, ids)
        for index in ids:
            memberships.setdefault(index, set()).add(group)
    for group, (members, quotes, ids) in candidates.items():
        unique = sorted(index for index in ids if len(memberships[index]) == 1)
        stance = {'supporting': 'Agree', 'opposing': 'Disagree', 'uncertain': 'Unable to judge'}[group]
        claim[group + '_experts'] = [members.get(index, f'Response {index} ({labels[index - 1]}): {stance}') for index in unique]
        claim[group + '_statements'] = list(dict.fromkeys(value for index in unique for value in quotes.get(index, [])))
    claim['people'] = f"{len(claim['supporting_experts'])} of {len(sources)}"
    claim['status'] = ('Clear disagreement' if claim['opposing_experts'] else
                       'Uncontested' if claim['supporting_experts'] and not claim['uncertain_experts'] else
                       'Questionable')

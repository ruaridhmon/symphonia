"""A faithful, reproducible final account. No model-generated votes or claim wording."""
import hashlib
import json
from collections import Counter


def position(value):
    if isinstance(value, dict):
        return str(value.get('position', value.get('value', '')) or '').strip()
    return str(value or '').strip()


def is_rating(q):
    return isinstance(q, dict) and str(q.get('questionId', '')).startswith('claim_') and any(str(o).lower() in {'agree', 'strongly agree'} for o in q.get('options', [])) and any(str(o).lower() in {'disagree', 'strongly disagree'} for o in q.get('options', []))


def build_final_account(form, rounds, responses):
    baseline = next((r for r in rounds if r.round_number == 2), None)
    final = next((r for r in rounds if r.round_number == 3), None)
    if not baseline or not final or not any(is_rating(q) for q in baseline.questions or []):
        raise ValueError('Complete the fixed claim review and reconsideration rounds first.')
    opening = next((r for r in rounds if r.round_number == 1), None)
    graph = (opening.synthesis_json or {}).get('reasoning_graph') if opening and (opening.synthesis_json or {}).get('narrative') == opening.synthesis else None
    if graph and graph.get('source_revision'):
        from .reasoning import response_revision
        opening_responses=[{'response_id':s.id,'answers':s.answers} for s in responses if s.round_id==opening.id]
        if response_revision(opening_responses)!=graph['source_revision']:
            raise ValueError('Opening responses changed after the reasoning map was saved. Review or regenerate the map before final synthesis.')
    by_round = {r.id: [s for s in responses if s.round_id == r.id] for r in rounds}
    revision_data = {'title':form.title,'questions': [(r.id, r.questions) for r in rounds], 'graph': graph,
                     'responses': [(s.id, s.round_id, s.user_id, s.version, s.answers) for s in responses]}
    revision = hashlib.sha256(json.dumps(revision_data, sort_keys=True, default=str).encode()).hexdigest()
    # Stable pseudonyms use stored identity, never fuzzy name matching. Admin records have
    # separate identities and consequently cannot fabricate a returning expert's movement.
    identities = sorted({s.user_id for s in responses})
    labels = {uid: f'Expert {i+1}' for i, uid in enumerate(identities)}
    claims = []
    for index, q in enumerate(final.questions or []):
        if not is_rating(q):
            continue
        key = q['questionId']
        old_index = next((i for i, old in enumerate(baseline.questions) if isinstance(old, dict) and old.get('questionId') == key and old.get('sectionTitle') == q.get('sectionTitle') and old.get('options') == q.get('options')), None)
        if old_index is None:
            raise ValueError('The final claim wording or scale differs from Round 2. No comparison can be made.')
        def answer(response, question_index, questions):
            if question_index is None:
                return ''
            question = questions[question_index]
            return position((response.answers or {}).get(f'q{question_index+1}', (response.answers or {}).get(question.get('questionId'))))
        def paired_index(questions, suffix):
            prefix = key.removesuffix('_response')
            return next((i for i, c in enumerate(questions) if isinstance(c, dict) and (c.get('questionId') == prefix + suffix or (c.get('sectionTitle') == q.get('sectionTitle') and c.get('label') == ('Confidence in your rating' if suffix == '_confidence' else 'Explain your position')))), None)
        def record(s, r, rating_index):
            return {'response_id': s.id, 'expert': labels[s.user_id],
                    'position': answer(s, rating_index, r.questions),
                    'confidence': answer(s, paired_index(r.questions, '_confidence'), r.questions),
                    'justification': answer(s, paired_index(r.questions, '_comment'), r.questions), 'original_answers':{f'q{i+1}':(s.answers or {}).get(f'q{i+1}', (s.answers or {}).get(r.questions[i].get('questionId'))) for i in [rating_index, paired_index(r.questions, '_confidence'), paired_index(r.questions, '_comment')] if i is not None}}
        previous = by_round[baseline.id]
        prior_counts = Counter(s.user_id for s in previous)
        final_counts = Counter(s.user_id for s in by_round[final.id])
        old_by_user = {s.user_id: s for s in previous if prior_counts[s.user_id] == 1}
        current_records = []
        for s in by_round[final.id]:
            current = record(s, final, index)
            prior = old_by_user.get(s.user_id) if final_counts[s.user_id] == 1 else None
            before = record(prior, baseline, old_index) if prior else None
            current.update(before=before, position_changed=current['position'] != before['position'] if before else None,
                           confidence_changed=current['confidence'] != before['confidence'] if before else None,
                           justification_changed=current['justification'] != before['justification'] if before else None)
            current_records.append(current)
        old_records = [record(s, baseline, old_index) for s in previous]
        def distribution(records, field, options):
            counts = Counter(r[field] or 'Not recorded' for r in records)
            return [{'label': label, 'count': counts[label]} for label in dict.fromkeys([*options, *counts])]
        confidence_options = ['Not at all confident', 'Slightly confident', 'Moderately confident', 'Very confident', 'Extremely confident']
        text = q.get('claimText') or str(q.get('sectionTitle') or q.get('label') or '').split(': ', 1)[-1]
        claims.append({'id': key, 'text': text, 'origin': q.get('claimOrigin', 'explicit'),
                       'inference_question': q.get('inferenceQuestion'), 'options': q['options'],
                       'positions': distribution(current_records, 'position', q['options']),
                       'confidence': distribution(current_records, 'confidence', confidence_options),
                       'round_two': old_records, 'final_responses': current_records,
                       'round_two_positions': distribution(old_records, 'position', q['options']),
                       'changes': sum(r['position_changed'] is True for r in current_records),
                       'matched': sum(r['before'] is not None for r in current_records)})
    if not by_round[final.id]:
        raise ValueError('No Round 3 responses have been recorded yet.')
    lines = [f'# {form.title}', '## Round 4 · Final synthesis',
             'This account preserves the frozen claim wording and recorded expert judgments. Disagreement is a valid outcome. Confidence is separate from agreement.',
             f'{len(by_round[baseline.id])} submissions in Round 2; {len(by_round[final.id])} in Round 3. Missing ratings are not agreement or disagreement.']
    for c in claims:
        lines += [f"### {c['text']}"]
        if c['origin'] == 'inferred':
            lines += ['Inferred · unconfirmed. This was not directly stated by an expert.', c.get('inference_question') or '']
        lines += ['Final positions: ' + '; '.join(f"{d['count']} {d['label']}" for d in c['positions'] if d['count']) + '.',
                  'Confidence: ' + '; '.join(f"{d['count']} {d['label']}" for d in c['confidence'] if d['count']) + '.',
                  f"{c['changes']} of {c['matched']} matched returning experts changed their exact position."]
        for r in c['final_responses']:
            if r['justification']:
                lines += [f"{r['expert']} — {r['position']}; confidence: {r['confidence'] or 'not recorded'}", r['justification']]
    if graph:
        lines += ['## Reasoning connections · interpretation']
        claim_text = {c['id']: c['text'] for c in graph.get('claims', [])}
        for e in graph.get('claim_edges', []):
            lines += [f"{claim_text.get(e['from'], e['from'])} → {e['relation']} → {claim_text.get(e['to'], e['to'])}"]
    else:
        lines += ['No source-linked opening reasoning graph was saved. No graph has been invented for this account.']
    return {'revision': revision, 'form_id': form.id, 'title': form.title, 'stage': 4,
            'method': 'recorded_data_organizer', 'claims': claims, 'reasoning_graph': graph,
            'round_two_count': len(by_round[baseline.id]), 'round_three_count': len(by_round[final.id]),
            'rounds':[{'round_number':r.round_number,'questions':r.questions,'responses':[{'response_id':s.id,'expert':labels[s.user_id],'answers':s.answers,'version':s.version} for s in by_round[r.id]]} for r in rounds],
            'markdown': '\n\n'.join(lines)}

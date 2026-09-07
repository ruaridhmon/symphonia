from core.claim_grounding import ground_claim


def test_no_fabricated_or_cross_respondent_quotes_or_fallback():
    claim = {'supporting_experts':['Response 1: Agree', 'Response 99: Agree'], 'supporting_statements':['Response 1: An invented supporting sentence.', 'Response 2: I oppose binding powers.']}
    ground_claim(claim, [['I oppose binding powers.'], ['I favour binding powers.']], ['One','Two'])
    assert claim['supporting_statements'] == []
    assert claim['people'] == '0 of 2'


def test_conflicts_are_unclassified_and_exact_distinct_quotes_survive():
    quote = 'I support this with safeguards.'
    claim = {'supporting_statements':[f'Response 1: {quote}', f'Response 1: {quote}', 'Response 2: I support it for a different reason.'], 'opposing_statements':[f'Response 1: {quote}']}
    ground_claim(claim, [[quote], ['I support it for a different reason.']], ['One','Two'])
    assert claim['people'] == '1 of 2'
    assert len(claim['supporting_statements']) == 1
    assert claim['opposing_statements'] == []
    assert claim['uncertain_experts'] == []


def test_recorded_rating_does_not_require_a_prose_quote():
    claim = {'_recorded_positions':True, 'supporting_experts':['Response 1: Agree'], 'supporting_statements':['Response 1: A fabricated sentence about agreement.']}
    ground_claim(claim, [['Agree']], ['One'])
    assert claim['people'] == '1 of 1'
    assert claim['supporting_statements'] == []

from core.routes import _format_custom_claim_list


def test_custom_claims_render_uncertain_excerpts_without_opposing_summary():
    markdown = """
Claim 1
Status: Questionable
People: 1 of 3
Text: A fully elected second chamber is preferred.
Opposing views: A hybrid chamber is preferred.
Supporting experts:
- Response 1 (Expert A): Agree
Opposing experts:
- Response 2 (Expert B): Disagree
Uncertain experts:
- Response 3 (Expert C): Neither agree nor disagree
Supporting statements:
- Response 1 (Expert A): An elected chamber would have democratic legitimacy.
Opposing statements:
- Response 2 (Expert B): A fully elected chamber could duplicate the Commons.
Uncertain statements:
- Response 3 (Expert C): An elected chamber may be legitimate, but its powers remain unclear.
"""

    responses = [
        {"email": "Expert A", "answers": {"q1": "An elected chamber would have democratic legitimacy."}},
        {"email": "Expert B", "answers": {"q1": "A fully elected chamber could duplicate the Commons."}},
        {"email": "Expert C", "answers": {"q1": "An elected chamber may be legitimate, but its powers remain unclear."}},
    ]

    rendered = _format_custom_claim_list(
        markdown,
        questions=[{"label": "What should replace the House of Lords?", "inputType": "textarea"}],
        response_dicts=responses,
    )

    assert "Opposing views:" not in rendered
    assert "Show supporting statements" in rendered
    assert "Show opposing statements" in rendered
    assert "Show uncertain statements" in rendered
    assert "An elected chamber may be legitimate, but its powers remain unclear." in rendered

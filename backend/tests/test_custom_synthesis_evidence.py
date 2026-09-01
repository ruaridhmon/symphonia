from core.routes import _format_custom_claim_list


def test_custom_claim_list_keeps_every_expert_position_separate_from_quotes():
    rendered = _format_custom_claim_list(
        """Claims

Claim 1
Status: Clear disagreement
People: 2 of 4
Text: Virtual wards are ready for wider rollout.
Opposing views: Two experts disagree.
Supporting experts:
- Response 1 (Dr A): Strongly agree
- Response 2 (Dr B): Agree
Opposing experts:
- Response 3 (Dr C): Disagree
Uncertain experts:
- Response 4 (Dr D): Neither agree nor disagree
Supporting statements:
- None
Opposing statements:
- Response 3 (Dr C): The escalation pathway still has gaps.
"""
    )

    assert "Show supporting experts" in rendered
    assert "Response 1 (Dr A): Strongly agree" in rendered
    assert "Response 2 (Dr B): Agree" in rendered
    assert "Show opposing experts" in rendered
    assert "Response 3 (Dr C): Disagree" in rendered
    assert "Show uncertain experts" in rendered
    assert "Response 4 (Dr D): Neither agree nor disagree" in rendered
    assert "Show supporting statements" not in rendered
    assert "Show opposing statements" in rendered
    assert "The escalation pathway still has gaps." in rendered

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


def test_custom_claim_list_replaces_incomplete_model_positions_with_all_responses():
    questions = [{"label": "Virtual wards are ready for wider NHS rollout."}]
    responses = [
        {"email": "Dr A", "answers": {"q1": {"position": "Strongly agree"}}},
        {"email": "Dr B", "answers": {"q1": {"position": "Agree"}}},
        {"email": "Dr C", "answers": {"q1": {"position": "Disagree"}}},
        {
            "email": "Dr D",
            "answers": {"q1": {"position": "Neither agree nor disagree"}},
        },
    ]
    rendered = _format_custom_claim_list(
        """Claims

Claim 1
Status: Clear disagreement
People: 1 of 4
Text: Virtual wards are ready for wider NHS rollout.
Opposing views: One expert disagrees.
Supporting experts:
- Response 1 (Dr A): Strongly agree
Opposing experts:
- None
Uncertain experts:
- None
Supporting statements:
- None
Opposing statements:
- None
""",
        questions=questions,
        response_dicts=responses,
    )

    assert "Response 1 (Dr A): Strongly agree" in rendered
    assert "Response 2 (Dr B): Agree" in rendered
    assert "Response 3 (Dr C): Disagree" in rendered
    assert "Response 4 (Dr D): Neither agree nor disagree" in rendered
    assert "People making this claim: <strong>2 of 4</strong>" in rendered


def test_custom_claim_list_never_labels_a_named_likert_option_as_an_excerpt():
    rendered = _format_custom_claim_list(
        """Claims

Claim 1
Status: Clear disagreement
People: 0 of 1
Text: Remote monitoring can expand without worsening inequalities.
Opposing views: One expert disagrees.
Supporting experts:
- None
Opposing experts:
- Response 1 (Healthwatch patient advocate): Strongly disagree
Uncertain experts:
- None
Supporting statements:
- None
Opposing statements:
- Response 1 (Healthwatch patient advocate): Strongly disagree
"""
    )

    assert "Show opposing experts" in rendered
    assert "Show opposing statements" not in rendered

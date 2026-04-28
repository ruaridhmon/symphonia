from types import SimpleNamespace

from core.routes import _build_responses_markdown


def test_responses_markdown_uses_question_text_and_structured_fields():
    form = SimpleNamespace(title="Consultation review")
    rounds_payload = [
        {
            "round_number": 1,
            "questions": [
                {
                    "label": "What is your main concern?",
                    "inputType": "textarea",
                },
                {
                    "label": "What evidence supports this?",
                    "requireEvidence": True,
                    "requireConfidence": True,
                },
            ],
            "responses": [
                {
                    "email": "expert@example.com",
                    "timestamp": "2026-04-28T10:00:00+00:00",
                    "answers": {
                        "q1": {"position": "Implementation needs more support."},
                        "q2": {
                            "position": "The rollout is likely too fast.",
                            "evidence": "Several teams reported training gaps.",
                            "confidence": 8,
                            "confidenceJustification": "Consistent across responses.",
                            "counterarguments": "Some teams are ready now.",
                        },
                    },
                }
            ],
        }
    ]

    markdown = _build_responses_markdown(form, rounds_payload)

    assert "**What is your main concern?**" in markdown
    assert "- **Response:**" in markdown
    assert "Implementation needs more support." in markdown
    assert "**What evidence supports this?**" in markdown
    assert "- **Position:**" in markdown
    assert "- **Evidence:**" in markdown
    assert "- **Confidence:**" in markdown
    assert "8/10" in markdown
    assert "{'position'" not in markdown
    assert '"position"' not in markdown


def test_responses_markdown_maps_question_id_answers():
    form = SimpleNamespace(title="Survey review")
    rounds_payload = [
        {
            "round_number": 1,
            "questions": [
                {
                    "questionId": "Q1_1",
                    "label": "Staff AI literacy",
                    "inputType": "slider",
                }
            ],
            "responses": [
                {
                    "email": None,
                    "timestamp": None,
                    "answers": {"Q1_1": {"position": "7"}},
                }
            ],
        }
    ]

    markdown = _build_responses_markdown(form, rounds_payload)

    assert "**Staff AI literacy**" in markdown
    assert "- **Response:**" in markdown
    assert "  7" in markdown
    assert "Q1_1" not in markdown

"""Tests for custom-claim evidence preservation."""

from core.routes import _add_synthetic_demo_evidence, _format_custom_synthesis_material


def test_custom_material_includes_question_source_statements():
    material = _format_custom_synthesis_material(
        [
            {
                "label": "Virtual wards are ready for wider rollout.",
                "inputType": "likert",
                "source_statements": [
                    {
                        "expert_label": "Expert 2",
                        "quote": "We are ready in respiratory pathways, with safeguards.",
                        "stance": "supporting",
                    },
                    {
                        "expert_label": "Expert 5",
                        "quote": "Escalation remains too inconsistent for wider rollout.",
                        "stance": "opposing",
                    },
                ],
            }
        ],
        [{"email": "expert@example.com", "answers": {"q1": "Agree"}}],
    )

    assert "Original expert statements retained for this claim" in material
    assert "[supporting] Expert 2: We are ready in respiratory pathways, with safeguards." in material
    assert "[opposing] Expert 5: Escalation remains too inconsistent for wider rollout." in material
    assert "Response 1 (expert@example.com)" in material


def test_synthetic_demo_evidence_is_labelled_and_counted():
    output = _add_synthetic_demo_evidence(
        {
            "claims": [
                {
                    "text": "Virtual wards are ready for wider rollout.",
                    "status": "Questionable",
                    "people": "",
                    "opposing_views": "",
                    "supporting_statements": [],
                    "opposing_statements": [],
                }
            ]
        },
        [{"label": "Virtual wards are ready.", "inputType": "likert"}],
        [
            {"email": "Guest: A, nurse lead [one]", "answers": {"q1": "Agree"}},
            {"email": "Guest: B, safety academic [two]", "answers": {"q1": "Disagree"}},
            {"email": "Guest: C, GP [three]", "answers": {"q1": "Neither agree nor disagree"}},
        ],
    )

    claim = output["claims"][0]
    assert claim["people"] == "1 of 3"
    assert claim["status"] == "Clear disagreement"
    assert claim["supporting_statements"][0]["response"] == "Synthetic expert 1 (nurse lead)"
    assert claim["opposing_statements"][0]["response"] == "Synthetic expert 2 (safety academic)"
    assert "Illustrative synthetic view" in claim["supporting_statements"][0]["quote"]

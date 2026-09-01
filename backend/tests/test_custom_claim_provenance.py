"""Tests for custom-claim evidence preservation."""

from core.routes import _format_custom_synthesis_material


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

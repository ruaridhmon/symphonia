from core.routes import _extract_answer_position, _validate_required_answers


def test_extract_answer_position_accepts_numeric_and_legacy_shapes():
    assert _extract_answer_position(2) == "2"
    assert _extract_answer_position({"position": 4}) == "4"
    assert _extract_answer_position({"value": 6}) == "6"
    assert _extract_answer_position({"selectedScore": 8}) == "8"
    assert (
        _extract_answer_position({"answer": ["Workload", "Equity"]})
        == "Workload\nEquity"
    )


def test_validate_required_answers_accepts_legacy_value_field():
    questions = [
        {
            "label": "Staff AI literacy, capability, and training",
            "inputType": "slider",
            "optional": False,
        }
    ]

    answers = {
        "q1": {"value": 2},
    }

    assert _validate_required_answers(questions, answers) is None

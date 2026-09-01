from core.routes import _format_custom_claim_list


def test_custom_claim_supporting_statements_render_as_expandable_exact_text():
    source_text = """Claims

Claim 1
Status: Uncontested
People: 2 of 3
Text: Virtual wards should prioritise frail patients
Opposing views: None
Supporting statements:
- Response 1: Virtual wards helped us avoid several unnecessary admissions.
- Response 2: Frail patients benefited most from daily remote monitoring.
Opposing statements:
- None
"""

    rendered = _format_custom_claim_list(source_text)

    assert '<details class="custom-claim-evidence">' in rendered
    assert "<summary>Show supporting statements</summary>" in rendered
    assert "Response 1: Virtual wards helped us avoid several unnecessary admissions." in rendered
    assert "Response 2: Frail patients benefited most from daily remote monitoring." in rendered
    assert "<summary>Show opposing statements</summary>" not in rendered


def test_custom_claim_json_preserves_exact_source_quotes():
    source_json = """{
      "claims": [{
        "status": "Uncontested",
        "people": "7 of 10",
        "text": "Virtual wards are ready for selected pathways.",
        "opposing_views": "None",
        "supporting_statements": [
          {"response": 3, "quote": "The respiratory pathway has operated safely for twelve months."}
        ],
        "opposing_statements": []
      }]
    }"""

    rendered = _format_custom_claim_list(source_json)

    assert "<strong>Virtual wards are ready for selected pathways.</strong>" in rendered
    assert "<summary>Show supporting statements</summary>" in rendered
    assert "Response 3: The respiratory pathway has operated safely for twelve months." in rendered

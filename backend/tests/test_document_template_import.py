from __future__ import annotations

from io import BytesIO
import zipfile

from fastapi.testclient import TestClient


def _build_questionnaire_docx(lines: list[str]) -> bytes:
    content_types_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""
    rels_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""
    paragraphs = "\n".join(
        (f"<w:p><w:r><w:t>{line}</w:t></w:r></w:p>" if line else "<w:p/>")
        for line in lines
    )
    document_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {paragraphs}
    <w:sectPr/>
  </w:body>
</w:document>"""

    output = BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types_xml)
        archive.writestr("_rels/.rels", rels_xml)
        archive.writestr("word/document.xml", document_xml)
    return output.getvalue()


def _build_questionnaire_docx_with_soft_breaks(
    paragraph_runs: list[list[str]],
) -> bytes:
    content_types_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""
    rels_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""
    paragraphs = []
    for runs in paragraph_runs:
        if not runs:
            paragraphs.append("<w:p/>")
            continue
        fragments = []
        for index, run in enumerate(runs):
            if index > 0:
                fragments.append("<w:r><w:br/></w:r>")
            fragments.append(f"<w:r><w:t>{run}</w:t></w:r>")
        paragraphs.append(f"<w:p>{''.join(fragments)}</w:p>")
    document_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {" ".join(paragraphs)}
    <w:sectPr/>
  </w:body>
</w:document>"""

    output = BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types_xml)
        archive.writestr("_rels/.rels", rels_xml)
        archive.writestr("word/document.xml", document_xml)
    return output.getvalue()


class _FakeMessage:
    def __init__(self, content: str):
        self.content = content


class _FakeChoice:
    def __init__(self, content: str):
        self.message = _FakeMessage(content)


class _FakeCompletion:
    def __init__(self, content: str):
        self.choices = [_FakeChoice(content)]


class _FakeCompletions:
    def __init__(self, content: str):
        self._content = content

    def create(self, **_kwargs):
        return _FakeCompletion(self._content)


class _FakeChat:
    def __init__(self, content: str):
        self.completions = _FakeCompletions(content)


class _FakeOpenAIClient:
    def __init__(self, content: str):
        self.chat = _FakeChat(content)


def test_llm_fillable_docx_import_returns_rich_template(
    client: TestClient, admin_headers: dict, monkeypatch
):
    fake_llm_json = """
    {
      "documentTitle": "AI in Education Consultation",
      "introParagraphs": ["Thank you for taking part in this consultation."],
      "questions": [
        {
          "questionId": "Q0",
          "label": "Which of the following best describes your current role?",
          "sectionTitle": "About you",
          "inputType": "single_select",
          "options": ["School leader", "Teacher", "Support staff", "Other"]
        },
        {
          "questionId": "Q0_other",
          "label": "Other: Please specify",
          "inputType": "text",
          "conditionalOnQuestionId": "Q0",
          "conditionalOnOption": "Other"
        },
        {
          "questionId": "Q1",
          "label": "Which two issues matter most?",
          "sectionTitle": "Priorities",
          "inputType": "multi_select",
          "options": ["Workload", "Safeguarding", "Vendor lock-in"],
          "maxSelections": 2
        },
        {
          "questionId": "Q2",
          "label": "How significant is workload burden?",
          "sectionTitle": "Priorities",
          "inputType": "slider",
          "minValue": 0,
          "maxValue": 10,
          "minLabel": "Not significant",
          "midLabel": "Moderate",
          "maxLabel": "Very significant"
        }
      ]
    }
    """.strip()

    monkeypatch.setattr(
        "core.routes.get_openai_client",
        lambda: _FakeOpenAIClient(fake_llm_json),
    )

    docx_bytes = _build_questionnaire_docx(
        [
            "Round 1: Full question set",
            "",
            "Section A. About you",
            "",
            "Q0. Which of the following best describes your current role?",
            "Response type: Select one.",
            "School leader",
            "Teacher",
            "Support staff",
            "Other",
        ]
    )

    response = client.post(
        "/forms/document-template/extract",
        headers=admin_headers,
        files={
            "file": (
                "questionnaire.docx",
                docx_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        data={"mode": "fillable", "assist": "llm_fillable"},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["mode"] == "fillable"
    assert payload["placeholder_count"] == 4
    assert payload["template"].startswith(
        "<!-- symphonia-document-mode: fillable-rich -->"
    )
    assert 'data-symphonia-field-type="single_select"' in payload["template"]
    assert 'data-symphonia-field-type="multi_select"' in payload["template"]
    assert 'data-symphonia-max-selections="2"' in payload["template"]
    assert 'data-symphonia-field-type="slider"' in payload["template"]
    assert 'data-symphonia-min-label="Not significant"' in payload["template"]
    assert "Other: Please specify" in payload["template"]


def test_standard_docx_extract_preserves_soft_line_breaks(
    client: TestClient, admin_headers: dict
):
    docx_bytes = _build_questionnaire_docx_with_soft_breaks(
        [
            [
                "Q0. Which of the following best describes your current role?",
                "Response type: Select one.",
            ],
            [
                "School leader",
                "Teacher",
                "Other",
            ],
        ]
    )

    response = client.post(
        "/forms/document-template/extract",
        headers=admin_headers,
        files={
            "file": (
                "questionnaire.docx",
                docx_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        data={"mode": "fillable"},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["template"].splitlines()[:5] == [
        "Q0. Which of the following best describes your current role?",
        "Response type: Select one.",
        "School leader",
        "Teacher",
        "Other",
    ]


def test_create_form_accepts_unprefixed_rich_fillable_document_template(
    client: TestClient, admin_headers: dict
):
    unprefixed_template = """
    <div>
      <div>Q13 What is the single issue about AI in education that most keeps you awake at night, and why?</div>
      <span
        data-symphonia-field-key="q13"
        data-symphonia-question-id="Q13"
        data-symphonia-field-label="What is the single issue about AI in education that most keeps you awake at night, and why?"
        data-symphonia-field-type="long"
        data-symphonia-input-type="textarea"
        data-symphonia-optional="false"
        data-symphonia-rows="4"
        data-symphonia-placeholder="Write your response here"
      ></span>
    </div>
    """.strip()

    response = client.post(
        "/forms/create",
        headers=admin_headers,
        json={
            "title": "Rich fillable save fallback",
            "questions": [],
            "document_template": unprefixed_template,
        },
    )

    assert response.status_code == 201, response.text
    created = response.json()

    detail_response = client.get(
        f"/forms/{created['id']}",
        headers=admin_headers,
    )
    assert detail_response.status_code == 200, detail_response.text
    payload = detail_response.json()

    assert payload["document_template"].startswith(
        "<!-- symphonia-document-mode: fillable-rich -->"
    )


def test_update_form_preserves_rich_template_when_edit_payload_drops_template(
    client: TestClient, admin_headers: dict
):
    template = """
    <!-- symphonia-document-mode: fillable-rich -->
    <h2>Recommendation 1</h2>
    <p>Review this section before answering.</p>
    <span
      data-symphonia-field-key="rec1_status"
      data-symphonia-question-id="REC1_STATUS"
      data-symphonia-field-label="Should recommendation 1 remain?"
      data-symphonia-field-type="single_select"
      data-symphonia-input-type="single_select"
      data-symphonia-optional="false"
      data-symphonia-options="[&quot;Yes&quot;, &quot;No&quot;]"
    ></span>
    """.strip()

    create_response = client.post(
        "/forms/create",
        headers=admin_headers,
        json={
            "title": "Preserve rich template",
            "questions": [],
            "document_template": template,
            "allow_public_responses": True,
        },
    )
    assert create_response.status_code == 201, create_response.text
    form_id = create_response.json()["id"]

    detail_response = client.get(f"/forms/{form_id}", headers=admin_headers)
    assert detail_response.status_code == 200, detail_response.text
    existing = detail_response.json()
    assert existing["document_template"]

    update_response = client.put(
        f"/forms/{form_id}",
        headers=admin_headers,
        json={
            "title": "Preserve rich template after title edit",
            "questions": existing["questions"],
            "document_template": None,
            "allow_public_responses": True,
            "require_consent": False,
        },
    )
    assert update_response.status_code == 200, update_response.text

    updated_response = client.get(f"/forms/{form_id}", headers=admin_headers)
    assert updated_response.status_code == 200, updated_response.text
    updated = updated_response.json()
    assert updated["document_template"] == existing["document_template"]
    assert updated["questions"] == existing["questions"]

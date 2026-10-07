"""Refresh unanswered claim reviews without changing recorded judgments."""

from copy import deepcopy


def refresh_review_questions(questions, claims):
    """Keep the review's configured fields and scales while updating its claim set."""
    # A later free-text round has no frozen claim identities to synchronize.
    if not any(
        isinstance(q, dict) and str(q.get("questionId", "")).startswith("claim_")
        for q in questions
    ):
        return deepcopy(questions)
    suffixes = ("_response", "_confidence", "_comment")
    templates = {}
    for question in questions:
        if not isinstance(question, dict):
            raise ValueError("Custom review questions")
        key = str(question.get("questionId", ""))
        suffix = next(
            (
                suffix
                for suffix in suffixes
                if key.startswith("claim_") and key.endswith(suffix)
            ),
            None,
        )
        if suffix is None:
            raise ValueError("Custom review questions")
        templates.setdefault(suffix, question)
    if "_response" not in templates:
        raise ValueError("Custom review questions")

    updated = []
    for index, claim in enumerate(claims, 1):
        for suffix in suffixes:
            if suffix not in templates:
                continue
            question = deepcopy(templates[suffix])
            question.update(
                questionId=claim["id"] + suffix,
                claimId=claim["id"],
                claimText=claim["text"],
                claimOrigin=claim["origin"],
                sectionTitle=f"Claim {index}: {claim['text']}",
            )
            question.pop("inferenceQuestion", None)
            if claim["origin"] == "inferred":
                question["inferenceQuestion"] = claim["question"]
            if suffix == "_response":
                question["groupPrompt"] = (
                    "Inferred · unconfirmed. This claim was not directly stated by an expert. "
                    + claim["question"]
                    + " Agreement does not establish that the original expert stated it."
                    if claim["origin"] == "inferred"
                    else "Review the previous round before rating. Consensus is not required: "
                    "retain your view if the evidence still supports it."
                )
            updated.append(question)
    return updated

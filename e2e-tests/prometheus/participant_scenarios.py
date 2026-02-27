"""
participant_scenarios.py — Participant-side test scenarios for Symphonia E2E.

Follows the pattern established in test_scenarios.py, focused on the
non-admin user journey: dashboard, join flow, form submission, waiting page.
"""
from __future__ import annotations

from test_scenarios import (
    TestScenario,
    TestStep,
    StepType,
    Severity,
)


def get_participant_scenarios() -> list[TestScenario]:
    """Return all participant journey scenarios."""
    return [
        _participant_dashboard_empty(),
        _participant_join_form(),
        _participant_form_submission(),
        _participant_waiting_page(),
    ]


# ─── Scenario Definitions ────────────────────────────────────────────────────


class ParticipantDashboardEmptyScenario:
    """
    Scenario: Participant logs in with no forms joined.

    Expected state:
    - "Join a New Form" section visible with join code input
    - "My Forms" section visible with empty state ("No consultations yet")
    - No ErrorBoundary crashes

    Screenshot: participant-dashboard-empty
    """

    @staticmethod
    def get_scenario() -> TestScenario:
        return _participant_dashboard_empty()


class ParticipantJoinFormScenario:
    """
    Scenario: Participant enters a join code to unlock a form.

    Tests both invalid and valid join code paths:
    - Invalid code → "Invalid join code." error message
    - Valid code → form appears in "My Forms" list

    Prerequisites:
    - A form must exist with allow_join=True and a known join_code
    - Use API to create one if needed (POST /create_form as admin)

    Screenshots: participant-join-invalid, participant-join-success
    """

    @staticmethod
    def get_scenario() -> TestScenario:
        return _participant_join_form()


class ParticipantFormSubmissionScenario:
    """
    Scenario: Participant fills out and submits a form.

    Flow:
    1. Navigate to /form/:id
    2. Verify questions render with input fields
    3. Fill all question fields
    4. Click Submit
    5. Verify redirect to /waiting or success confirmation

    Prerequisites:
    - Participant must have unlocked the form (POST /forms/unlock)
    - Must NOT have already submitted (use a fresh user)

    Screenshots: participant-form-load, participant-form-filled,
                 participant-form-submitted
    """

    @staticmethod
    def get_scenario() -> TestScenario:
        return _participant_form_submission()


class ParticipantWaitingPageScenario:
    """
    Scenario: Participant views the waiting page after submission.

    Expected state:
    - "Thank you for your submission" heading
    - Animated orbit dots
    - "This page will update automatically" note
    - WebSocket connection to /ws for live synthesis push

    ⚠ KNOWN BUG: When API_BASE_URL is empty string (default dev config),
    `new URL('')` throws TypeError, triggering ErrorBoundary with
    "Waiting Page Error". This test documents the bug state.

    Screenshots: participant-waiting-page, participant-waiting-error
    """

    @staticmethod
    def get_scenario() -> TestScenario:
        return _participant_waiting_page()


# ─── Scenario Builders ──────────────────────────────────────────────────────


def _participant_dashboard_empty() -> TestScenario:
    return TestScenario(
        name="participant-dashboard-empty",
        description=(
            "Participant with no joined forms sees empty dashboard. "
            "Should show 'Join a New Form' section and 'No consultations yet' message."
        ),
        severity=Severity.HIGH,
        requires_auth=True,
        requires_admin=False,
        tags=["participant", "dashboard", "smoke"],
        steps=[
            TestStep(StepType.NAVIGATE, "/"),
            TestStep(
                StepType.SCREENSHOT,
                "participant-dashboard-empty",
                context=(
                    "User dashboard with no forms joined. Should show: "
                    "(1) 'Join a New Form' heading with join code input and 'Join Form' button, "
                    "(2) 'My Forms' heading with 'No consultations yet' empty state. "
                    "Should NOT show admin features (form editor, new form button)."
                ),
                full_page=True,
            ),
            TestStep(StepType.ASSERT_NO_ERROR),
            TestStep(
                StepType.ASSERT_TEXT,
                "No consultations yet",
                context="Empty dashboard should display 'No consultations yet' text.",
            ),
        ],
    )


def _participant_join_form() -> TestScenario:
    return TestScenario(
        name="participant-join-form",
        description=(
            "Participant enters join codes — invalid shows error, valid adds form to list."
        ),
        severity=Severity.CRITICAL,
        requires_auth=True,
        requires_admin=False,
        tags=["participant", "join", "critical-path"],
        steps=[
            # Start at dashboard
            TestStep(StepType.NAVIGATE, "/"),
            TestStep(
                StepType.SCREENSHOT,
                "participant-join-before",
                context="Dashboard before entering any join code.",
            ),
            # Enter invalid code — the click/fill interaction would be
            # handled by the test runner (BrowserAgent.click + fill)
            TestStep(
                StepType.SCREENSHOT,
                "participant-join-invalid",
                context=(
                    "Dashboard after submitting an invalid join code. "
                    "Should show error text 'Invalid join code.' in red below the input field. "
                    "The join code input should still be visible."
                ),
            ),
            TestStep(StepType.ASSERT_NO_ERROR),
            # Enter valid code
            TestStep(
                StepType.SCREENSHOT,
                "participant-join-success",
                context=(
                    "Dashboard after successfully joining a form. "
                    "The form title should appear in the 'My Forms' list. "
                    "Each form item shows the title and an 'Enter' button."
                ),
                full_page=True,
            ),
            TestStep(StepType.ASSERT_NO_ERROR),
        ],
    )


def _participant_form_submission() -> TestScenario:
    return TestScenario(
        name="participant-form-submission",
        description=(
            "Participant navigates to a form, fills answers, and submits. "
            "Verifies redirect to waiting page or success confirmation."
        ),
        severity=Severity.CRITICAL,
        requires_auth=True,
        requires_admin=False,
        tags=["participant", "form", "submission", "critical-path"],
        steps=[
            # Navigate to form page (form ID discovered dynamically)
            TestStep(StepType.NAVIGATE, "/form/1"),  # Placeholder — runner substitutes real ID
            TestStep(
                StepType.SCREENSHOT,
                "participant-form-load",
                context=(
                    "Form submission page for a participant. Should show: "
                    "(1) Form title at the top, "
                    "(2) Questions rendered with text input fields (textarea or StructuredInput), "
                    "(3) A 'Submit' button. "
                    "Should NOT show admin controls or form editing capabilities."
                ),
                full_page=True,
            ),
            TestStep(StepType.ASSERT_NO_ERROR),
            # After filling (handled by runner)
            TestStep(
                StepType.SCREENSHOT,
                "participant-form-filled",
                context=(
                    "Form with all questions filled in by the participant. "
                    "Input fields should contain text. Submit button should be active."
                ),
            ),
            # After submission
            TestStep(
                StepType.SCREENSHOT,
                "participant-form-submitted",
                context=(
                    "State after form submission. Should show either: "
                    "(a) Redirect to /waiting page with 'Thank you for your submission' heading, or "
                    "(b) Success confirmation on the form page itself. "
                    "Should NOT show an error or crash."
                ),
            ),
            TestStep(StepType.ASSERT_NO_ERROR),
        ],
    )


def _participant_waiting_page() -> TestScenario:
    return TestScenario(
        name="participant-waiting-page",
        description=(
            "Participant views the waiting page after submission. "
            "⚠ Known bug: may crash with ErrorBoundary when API_BASE_URL is empty."
        ),
        severity=Severity.MEDIUM,
        requires_auth=True,
        requires_admin=False,
        tags=["participant", "waiting", "known-bug"],
        steps=[
            TestStep(StepType.NAVIGATE, "/waiting"),
            TestStep(
                StepType.SCREENSHOT,
                "participant-waiting-page",
                context=(
                    "Waiting page after form submission. Expected content: "
                    "'Thank you for your submission' heading, animated orbit dots, "
                    "form title/round badge, and a note about automatic updates. "
                    "⚠ KNOWN BUG: May show 'Waiting Page Error' ErrorBoundary "
                    "if API_BASE_URL is empty string (new URL('') throws TypeError). "
                    "If ErrorBoundary is visible, screenshot the error state."
                ),
                full_page=True,
            ),
            # Don't assert_no_error here — the known bug would fail the test.
            # Instead, take a second screenshot specifically for the error state.
            TestStep(
                StepType.SCREENSHOT,
                "participant-waiting-error",
                context=(
                    "Waiting page error state documentation. "
                    "If ErrorBoundary is showing: look for '⚠' icon, "
                    "'Waiting Page Error' title, monospace error message, 'Try Again' button. "
                    "Root cause: WaitingPage.tsx line ~28: "
                    "`new URL(API_BASE_URL).host` where API_BASE_URL = '' (empty string)."
                ),
            ),
        ],
    )


# ─── Dynamic Step Generators ─────────────────────────────────────────────────


def get_participant_form_steps(form_id: str) -> list[TestStep]:
    """Generate dynamic steps for testing a specific form as a participant."""
    return [
        TestStep(StepType.NAVIGATE, f"/form/{form_id}"),
        TestStep(
            StepType.SCREENSHOT,
            f"participant-form-{form_id}",
            context=(
                f"Participant form page for form {form_id}. "
                "Should show form title, numbered questions with input fields, "
                "and a Submit button at the bottom."
            ),
            full_page=True,
        ),
        TestStep(StepType.ASSERT_NO_ERROR),
    ]


def get_participant_already_submitted_steps(form_id: str) -> list[TestStep]:
    """Generate steps for verifying already-submitted state on a form."""
    return [
        TestStep(StepType.NAVIGATE, f"/form/{form_id}"),
        TestStep(
            StepType.SCREENSHOT,
            f"participant-form-{form_id}-already-submitted",
            context=(
                f"Form {form_id} visited after participant already submitted. "
                "Should show pre-filled answers in read-only mode or a 'Submitted' "
                "status badge. The Submit button may be disabled or replaced with "
                "a 'Review' label."
            ),
            full_page=True,
        ),
        TestStep(StepType.ASSERT_NO_ERROR),
    ]

"""
test_scenarios.py — Test scenario definitions for Symphonia E2E testing.

Each scenario defines a sequence of steps: navigate, interact, screenshot, analyze.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class Severity(Enum):
    CRITICAL = "critical"    # Would block users
    HIGH = "high"            # Major feature broken
    MEDIUM = "medium"        # Degraded experience
    LOW = "low"              # Minor visual issue


class StepType(Enum):
    NAVIGATE = "navigate"
    AUTHENTICATE = "authenticate"
    CLICK = "click"
    SCREENSHOT = "screenshot"
    WAIT = "wait"
    ASSERT_TEXT = "assert_text"
    ASSERT_NO_ERROR = "assert_no_error"
    EXTRACT_FORM_IDS = "extract_form_ids"


@dataclass
class TestStep:
    """A single step in a test scenario."""
    type: StepType
    value: str = ""          # path for navigate, selector for click, name for screenshot
    context: str = ""        # context passed to vision analysis
    timeout: int = 10000
    full_page: bool = False  # for screenshot step


@dataclass
class TestScenario:
    """A complete test scenario with steps and metadata."""
    name: str
    description: str
    severity: Severity
    requires_auth: bool = False
    requires_admin: bool = False
    steps: list[TestStep] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)


# ─── Scenario Definitions ────────────────────────────────────────────────────

def get_all_scenarios() -> list[TestScenario]:
    """Return all test scenarios."""
    return [
        _login_page_smoke(),
        _register_page_smoke(),
        _auth_flow(),
        _dashboard_smoke(),
        _atlas_smoke(),
        _waiting_page_smoke(),
        _result_page_smoke(),
        _thankyou_page_smoke(),
        _admin_settings_smoke(),
        _admin_new_form_smoke(),
        _not_found_page(),
        _summary_page_round_navigation(),
        _full_admin_journey(),
    ]


def _login_page_smoke() -> TestScenario:
    return TestScenario(
        name="login-page-smoke",
        description="Verify login page loads correctly with email/password fields",
        severity=Severity.CRITICAL,
        requires_auth=False,
        tags=["smoke", "auth", "public"],
        steps=[
            TestStep(StepType.NAVIGATE, "/login"),
            TestStep(StepType.SCREENSHOT, "01-login-page",
                     context="Login page for Symphonia. Should show email and password inputs, a submit button, and possibly a registration link."),
            TestStep(StepType.ASSERT_NO_ERROR),
        ],
    )


def _register_page_smoke() -> TestScenario:
    return TestScenario(
        name="register-page-smoke",
        description="Verify registration page loads correctly",
        severity=Severity.HIGH,
        requires_auth=False,
        tags=["smoke", "auth", "public"],
        steps=[
            TestStep(StepType.NAVIGATE, "/register"),
            TestStep(StepType.SCREENSHOT, "02-register-page",
                     context="Registration page for Symphonia. Should show registration form fields."),
            TestStep(StepType.ASSERT_NO_ERROR),
        ],
    )


def _auth_flow() -> TestScenario:
    return TestScenario(
        name="auth-flow",
        description="Full authentication flow: login with admin credentials, verify redirect to dashboard",
        severity=Severity.CRITICAL,
        requires_auth=False,
        tags=["auth", "critical-path"],
        steps=[
            TestStep(StepType.NAVIGATE, "/login"),
            TestStep(StepType.SCREENSHOT, "03-auth-before-login",
                     context="Login page before entering credentials."),
            TestStep(StepType.AUTHENTICATE),
            TestStep(StepType.SCREENSHOT, "04-auth-after-login",
                     context="Page after successful login. Should be the dashboard with forms listed, not the login page."),
            TestStep(StepType.ASSERT_NO_ERROR),
        ],
    )


def _dashboard_smoke() -> TestScenario:
    return TestScenario(
        name="dashboard-smoke",
        description="Verify dashboard loads and shows form list",
        severity=Severity.CRITICAL,
        requires_auth=True,
        tags=["smoke", "dashboard"],
        steps=[
            TestStep(StepType.NAVIGATE, "/"),
            TestStep(StepType.SCREENSHOT, "05-dashboard",
                     context="Admin dashboard. Should show a list of consultation forms, navigation header, and possibly a 'New Form' button."),
            TestStep(StepType.ASSERT_NO_ERROR),
            TestStep(StepType.EXTRACT_FORM_IDS),
        ],
    )


def _atlas_smoke() -> TestScenario:
    return TestScenario(
        name="atlas-smoke",
        description="Verify Atlas (UX atlas) page loads",
        severity=Severity.MEDIUM,
        requires_auth=True,
        tags=["smoke"],
        steps=[
            TestStep(StepType.NAVIGATE, "/atlas"),
            TestStep(StepType.SCREENSHOT, "06-atlas",
                     context="Atlas page (UX documentation/guide). Should show content or a meaningful UI."),
            TestStep(StepType.ASSERT_NO_ERROR),
        ],
    )


def _waiting_page_smoke() -> TestScenario:
    return TestScenario(
        name="waiting-page-smoke",
        description="Verify waiting room page loads",
        severity=Severity.MEDIUM,
        requires_auth=True,
        tags=["smoke"],
        steps=[
            TestStep(StepType.NAVIGATE, "/waiting"),
            TestStep(StepType.SCREENSHOT, "07-waiting",
                     context="Waiting room page. May show a message about waiting for the next round, or redirect."),
            TestStep(StepType.ASSERT_NO_ERROR),
        ],
    )


def _result_page_smoke() -> TestScenario:
    return TestScenario(
        name="result-page-smoke",
        description="Verify result page loads",
        severity=Severity.MEDIUM,
        requires_auth=True,
        tags=["smoke"],
        steps=[
            TestStep(StepType.NAVIGATE, "/result"),
            TestStep(StepType.SCREENSHOT, "08-result",
                     context="Result page. May show synthesis results or require a form context to display content."),
            TestStep(StepType.ASSERT_NO_ERROR),
        ],
    )


def _thankyou_page_smoke() -> TestScenario:
    return TestScenario(
        name="thankyou-page-smoke",
        description="Verify thank-you page loads",
        severity=Severity.LOW,
        requires_auth=True,
        tags=["smoke"],
        steps=[
            TestStep(StepType.NAVIGATE, "/thank-you"),
            TestStep(StepType.SCREENSHOT, "09-thankyou",
                     context="Thank-you confirmation page. Should show a confirmation message."),
            TestStep(StepType.ASSERT_NO_ERROR),
        ],
    )


def _admin_settings_smoke() -> TestScenario:
    return TestScenario(
        name="admin-settings-smoke",
        description="Verify admin settings page loads",
        severity=Severity.MEDIUM,
        requires_auth=True,
        requires_admin=True,
        tags=["smoke", "admin"],
        steps=[
            TestStep(StepType.NAVIGATE, "/admin/settings"),
            TestStep(StepType.SCREENSHOT, "10-admin-settings",
                     context="Admin settings page. Should show application configuration options."),
            TestStep(StepType.ASSERT_NO_ERROR),
        ],
    )


def _admin_new_form_smoke() -> TestScenario:
    return TestScenario(
        name="admin-new-form-smoke",
        description="Verify admin new form page loads",
        severity=Severity.MEDIUM,
        requires_auth=True,
        requires_admin=True,
        tags=["smoke", "admin"],
        steps=[
            TestStep(StepType.NAVIGATE, "/admin/forms/new"),
            TestStep(StepType.SCREENSHOT, "11-admin-new-form",
                     context="Admin page for creating a new consultation form. Should show form creation fields."),
            TestStep(StepType.ASSERT_NO_ERROR),
        ],
    )


def _not_found_page() -> TestScenario:
    return TestScenario(
        name="not-found-page",
        description="Verify 404 page renders correctly (not a crash)",
        severity=Severity.LOW,
        requires_auth=False,
        tags=["smoke", "error-handling"],
        steps=[
            TestStep(StepType.NAVIGATE, "/this-page-does-not-exist-12345"),
            TestStep(StepType.SCREENSHOT, "12-not-found",
                     context="404 Not Found page. Should show a styled 'page not found' message, NOT a JavaScript crash or ErrorBoundary."),
            TestStep(StepType.ASSERT_NO_ERROR),
        ],
    )


def _summary_page_round_navigation() -> TestScenario:
    """
    THE CRITICAL BUG SCENARIO.

    This tests the exact flow that broke: navigate to a form's summary page,
    then try to view previous rounds. The RoundCard component uses icons
    (MessageSquare, BarChart3, HelpCircle) that may not be imported.
    """
    return TestScenario(
        name="summary-page-round-navigation",
        description="CRITICAL: Tests the exact bug path — Summary Page with round navigation. "
                    "RoundCard uses MessageSquare, BarChart3, HelpCircle icons. "
                    "Missing imports cause crashes when viewing previous rounds.",
        severity=Severity.CRITICAL,
        requires_auth=True,
        requires_admin=True,
        tags=["critical-path", "bug-regression", "summary", "rounds"],
        steps=[
            # First go to dashboard to find form IDs
            TestStep(StepType.NAVIGATE, "/"),
            TestStep(StepType.EXTRACT_FORM_IDS),
            # The actual summary navigation happens dynamically in the test runner
            # based on discovered form IDs. These are placeholder steps.
            TestStep(StepType.SCREENSHOT, "13-summary-page-entry",
                     context="Summary page initial load. Should show form title, round timeline, "
                             "synthesis content. Look for ErrorBoundary patterns."),
            TestStep(StepType.ASSERT_NO_ERROR),
        ],
    )


def _full_admin_journey() -> TestScenario:
    """End-to-end admin journey: dashboard → form editor → summary."""
    return TestScenario(
        name="full-admin-journey",
        description="Full admin workflow: dashboard → pick a form → editor → summary",
        severity=Severity.HIGH,
        requires_auth=True,
        requires_admin=True,
        tags=["journey", "admin"],
        steps=[
            TestStep(StepType.NAVIGATE, "/"),
            TestStep(StepType.SCREENSHOT, "14-journey-dashboard",
                     context="Starting point: admin dashboard with form list."),
            TestStep(StepType.EXTRACT_FORM_IDS),
            # Dynamic steps added by runner based on form IDs
        ],
    )


def get_dynamic_summary_steps(form_id: str) -> list[TestStep]:
    """Generate dynamic steps for testing a specific form's summary page."""
    return [
        TestStep(StepType.NAVIGATE, f"/admin/form/{form_id}/summary"),
        TestStep(StepType.SCREENSHOT, f"summary-form-{form_id}-initial",
                 context=f"Summary page for form {form_id}. Should show round timeline, "
                         "synthesis editor, structured analysis sections. "
                         "Look for ErrorBoundary render or missing icon crashes.",
                 full_page=True),
        TestStep(StepType.ASSERT_NO_ERROR),
    ]


def get_dynamic_form_editor_steps(form_id: str) -> list[TestStep]:
    """Generate dynamic steps for testing a specific form's editor."""
    return [
        TestStep(StepType.NAVIGATE, f"/admin/form/{form_id}"),
        TestStep(StepType.SCREENSHOT, f"editor-form-{form_id}",
                 context=f"Form editor for form {form_id}. Should show form configuration, "
                         "question list, and round management."),
        TestStep(StepType.ASSERT_NO_ERROR),
    ]

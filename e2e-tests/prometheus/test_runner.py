#!/usr/bin/env python3
"""
test_runner.py — Prometheus: Vision-Powered QA for Symphonia

Orchestrates browser automation, vision analysis, and report generation.
Catches bugs like missing icon imports by combining DOM heuristics with
Claude Vision analysis of screenshots.

Usage:
    python3 test_runner.py                    # Run all scenarios
    python3 test_runner.py --scenario login   # Run specific scenario
    python3 test_runner.py --no-vision        # Skip vision analysis (faster)
    python3 test_runner.py --headed           # Run with visible browser
"""
from __future__ import annotations

import os
import sys
import time
import argparse
from pathlib import Path
from datetime import datetime, timezone

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from browser_agent import BrowserAgent, ScreenshotResult
from vision_analyst import VisionAnalyst, VisionAnalysis
from test_scenarios import (
    get_all_scenarios, TestScenario, TestStep, StepType, Severity,
    get_dynamic_summary_steps, get_dynamic_form_editor_steps,
)
from report import ReportGenerator, ScenarioResult, TestReport

OUTPUT_DIR = Path(__file__).parent


class PrometheusRunner:
    """Orchestrates the entire test run."""

    def __init__(self, headless: bool = True, use_vision: bool = True, scenario_filter: str | None = None):
        self.headless = headless
        self.use_vision = use_vision
        self.scenario_filter = scenario_filter
        self.browser = BrowserAgent(headless=headless)
        self.vision = VisionAnalyst() if use_vision else None
        self.report_gen = ReportGenerator(OUTPUT_DIR)
        self.discovered_form_ids: list[str] = []
        self.results: list[ScenarioResult] = []

    def run(self) -> TestReport:
        """Execute all test scenarios and generate reports."""
        start_time = time.time()
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        print("=" * 70)
        print("🔥 PROMETHEUS — Vision-Powered QA System for Symphonia")
        print(f"   Timestamp: {timestamp}")
        print(f"   Vision analysis: {'ENABLED' if self.use_vision else 'DISABLED'}")
        print(f"   Browser: {'headed' if not self.headless else 'headless'}")
        print("=" * 70)

        # Start browser
        self.browser.start()
        authenticated = False

        try:
            scenarios = get_all_scenarios()

            # Filter if requested
            if self.scenario_filter:
                scenarios = [s for s in scenarios if self.scenario_filter.lower() in s.name.lower()]
                if not scenarios:
                    print(f"[!] No scenarios matching '{self.scenario_filter}'")
                    return self._build_report(timestamp, start_time)

            for scenario in scenarios:
                print(f"\n{'─' * 60}")
                print(f"▶ {scenario.name} [{scenario.severity.value.upper()}]")
                print(f"  {scenario.description}")

                # Handle auth requirement
                if scenario.requires_auth and not authenticated:
                    print("  [AUTH] Authenticating...")
                    authenticated = self.browser.authenticate()
                    if not authenticated:
                        print("  [AUTH] ❌ Authentication failed — skipping authenticated scenarios")
                        self.results.append(ScenarioResult(
                            name=scenario.name,
                            description=scenario.description,
                            severity=scenario.severity.value,
                            verdict="SKIP",
                            steps_completed=0,
                            steps_total=len(scenario.steps),
                            error_message="Authentication failed",
                        ))
                        continue
                    print("  [AUTH] ✅ Authenticated")

                result = self._run_scenario(scenario)
                self.results.append(result)

                # After dashboard, run dynamic form-specific tests
                if scenario.name == "dashboard-smoke" and self.discovered_form_ids:
                    self._run_dynamic_form_tests()

                # Print inline verdict
                icon = {"PASS": "✅", "FAIL": "❌", "WARNING": "⚠️", "SKIP": "⏭️"}.get(result.verdict, "❓")
                print(f"  Result: {icon} {result.verdict}")
                if result.error_message:
                    print(f"  Error: {result.error_message}")

        finally:
            self.browser.stop()

        report = self._build_report(timestamp, start_time)
        self.report_gen.generate(report)

        # Print summary
        print(f"\n{'=' * 70}")
        print("📊 FINAL RESULTS")
        print(f"   ✅ Passed:   {report.passed}")
        print(f"   ❌ Failed:   {report.failed}")
        print(f"   ⚠️  Warnings: {report.warnings}")
        print(f"   ⏭️  Skipped:  {report.skipped}")
        print(f"   Duration:   {report.duration_seconds:.1f}s")
        print(f"\n   Reports: {OUTPUT_DIR / 'report.html'}")
        print(f"            {OUTPUT_DIR / 'RESULTS.md'}")
        print("=" * 70)

        return report

    def _run_scenario(self, scenario: TestScenario) -> ScenarioResult:
        """Execute a single test scenario."""
        start = time.time()
        screenshots = []
        vision_analyses = []
        all_dom_errors = []
        all_console_errors = []
        steps_completed = 0
        error_msg = ""

        try:
            for step in scenario.steps:
                success = self._execute_step(
                    step, screenshots, vision_analyses, all_dom_errors, all_console_errors
                )
                if success:
                    steps_completed += 1
                else:
                    error_msg = f"Step failed: {step.type.value} {step.value}"
                    break

        except Exception as e:
            error_msg = f"Scenario exception: {e}"

        duration = (time.time() - start) * 1000

        # Determine verdict
        has_vision_fail = any(va.verdict == "FAIL" for va in vision_analyses)
        has_dom_errors = len(all_dom_errors) > 0
        has_vision_warning = any(va.verdict == "WARNING" for va in vision_analyses)

        if error_msg or has_vision_fail or has_dom_errors:
            verdict = "FAIL"
        elif has_vision_warning:
            verdict = "WARNING"
        else:
            verdict = "PASS"

        return ScenarioResult(
            name=scenario.name,
            description=scenario.description,
            severity=scenario.severity.value,
            verdict=verdict,
            steps_completed=steps_completed,
            steps_total=len(scenario.steps),
            screenshots=screenshots,
            vision_analyses=vision_analyses,
            dom_errors=all_dom_errors,
            console_errors=all_console_errors,
            error_message=error_msg,
            duration_ms=duration,
        )

    def _execute_step(
        self,
        step: TestStep,
        screenshots: list,
        vision_analyses: list,
        dom_errors: list,
        console_errors: list,
    ) -> bool:
        """Execute a single test step. Returns True on success."""

        if step.type == StepType.NAVIGATE:
            result = self.browser.navigate(step.value, timeout=step.timeout)
            dom_errors.extend(result.dom_errors)
            console_errors.extend(result.console_errors)
            return result.success

        elif step.type == StepType.AUTHENTICATE:
            return self.browser.authenticate()

        elif step.type == StepType.SCREENSHOT:
            ss = self.browser.screenshot(step.value, full_page=step.full_page)
            screenshots.append(ss.path)
            dom_errors.extend(ss.dom_errors)
            console_errors.extend(ss.console_errors)

            # Run vision analysis if enabled
            if self.vision:
                print(f"  [VISION] Analyzing {step.value}...")
                analysis = self.vision.analyze_screenshot(
                    ss.path,
                    context=step.context,
                    dom_errors=ss.dom_errors,
                    console_errors=ss.console_errors,
                    page_text=ss.page_text_snippet,
                )
                vision_analyses.append(analysis)
                icon = {"PASS": "✅", "FAIL": "❌", "WARNING": "⚠️"}.get(analysis.verdict, "❓")
                print(f"  [VISION] {icon} {analysis.summary[:100]}")
            return True

        elif step.type == StepType.CLICK:
            return self.browser.click(step.value, timeout=step.timeout)

        elif step.type == StepType.WAIT:
            return self.browser.wait_for_selector(step.value, timeout=step.timeout)

        elif step.type == StepType.ASSERT_NO_ERROR:
            # Check that no DOM errors were accumulated
            # This is a soft check — errors are already captured
            return True

        elif step.type == StepType.ASSERT_TEXT:
            text = self.browser.get_page_text()
            if step.value.lower() not in text.lower():
                dom_errors.append(f"Expected text not found: '{step.value}'")
                return False
            return True

        elif step.type == StepType.EXTRACT_FORM_IDS:
            ids = self.browser.get_form_ids()
            if ids:
                self.discovered_form_ids = ids
                print(f"  [DISCOVERY] Found form IDs: {ids}")
            else:
                print("  [DISCOVERY] No form IDs found on dashboard")
            return True

        return True

    def _run_dynamic_form_tests(self):
        """Run form-specific tests for each discovered form."""
        print(f"\n{'─' * 60}")
        print(f"▶ DYNAMIC: Testing {len(self.discovered_form_ids)} discovered form(s)")

        for form_id in self.discovered_form_ids[:5]:  # Cap at 5 forms
            # Test form editor
            print(f"\n  📝 Form editor for form {form_id}")
            editor_scenario = TestScenario(
                name=f"dynamic-form-editor-{form_id}",
                description=f"Editor page for form {form_id}",
                severity=Severity.MEDIUM,
                steps=get_dynamic_form_editor_steps(form_id),
            )
            result = self._run_scenario(editor_scenario)
            self.results.append(result)
            icon = {"PASS": "✅", "FAIL": "❌", "WARNING": "⚠️"}.get(result.verdict, "❓")
            print(f"  Editor: {icon} {result.verdict}")

            # Test summary page (THE CRITICAL PATH)
            print(f"\n  📊 Summary page for form {form_id} (CRITICAL BUG PATH)")
            summary_scenario = TestScenario(
                name=f"dynamic-summary-{form_id}",
                description=f"Summary page for form {form_id} — tests round navigation and icon rendering",
                severity=Severity.CRITICAL,
                steps=get_dynamic_summary_steps(form_id),
            )
            result = self._run_scenario(summary_scenario)
            self.results.append(result)
            icon = {"PASS": "✅", "FAIL": "❌", "WARNING": "⚠️"}.get(result.verdict, "❓")
            print(f"  Summary: {icon} {result.verdict}")

            # Try to click on round timeline elements to test navigation
            self._test_round_navigation(form_id)

    def _test_round_navigation(self, form_id: str):
        """Test clicking through rounds on a summary page — the exact bug path."""
        print(f"  🔄 Testing round navigation for form {form_id}")

        # Navigate to summary
        nav = self.browser.navigate(f"/admin/form/{form_id}/summary")
        if not nav.success:
            print(f"  ⚠️ Could not navigate to summary page for form {form_id}")
            return

        time.sleep(2)

        # Try to find round timeline buttons
        try:
            page = self.browser._page

            # Look for round selection elements
            round_selectors = [
                '[class*="round-timeline"] button',
                '[class*="RoundTimeline"] button',
                'button:has-text("Round")',
                '[role="tab"]',
                '[class*="round"] button',
                '[class*="timeline"] button',
            ]

            round_buttons = []
            for sel in round_selectors:
                try:
                    buttons = page.query_selector_all(sel)
                    if buttons:
                        round_buttons = buttons
                        break
                except Exception:
                    continue

            if not round_buttons:
                print(f"  ℹ️ No round navigation buttons found (may be single-round form)")
                return

            print(f"  Found {len(round_buttons)} round button(s)")

            # Click each round button and screenshot
            for i, btn in enumerate(round_buttons):
                try:
                    btn_text = btn.inner_text()[:50]
                    print(f"  Clicking round button {i+1}: '{btn_text}'")
                    btn.click()
                    time.sleep(2)

                    ss = self.browser.screenshot(
                        f"round-nav-form-{form_id}-round-{i+1}",
                        full_page=True,
                    )

                    screenshots = [ss.path]
                    vision_analyses = []

                    if self.vision:
                        analysis = self.vision.analyze_screenshot(
                            ss.path,
                            context=f"Summary page after clicking round {i+1} for form {form_id}. "
                                    "This is the CRITICAL BUG PATH — the RoundCard component "
                                    "uses MessageSquare, BarChart3, HelpCircle icons that may crash "
                                    "if not imported. Look for ErrorBoundary render patterns: "
                                    "⚠ icon, error title, monospace error message, 'Try Again' button.",
                            dom_errors=ss.dom_errors,
                            console_errors=ss.console_errors,
                            page_text=ss.page_text_snippet,
                        )
                        vision_analyses.append(analysis)
                        icon = {"PASS": "✅", "FAIL": "❌", "WARNING": "⚠️"}.get(analysis.verdict, "❓")
                        print(f"  [VISION] Round {i+1}: {icon} {analysis.summary[:80]}")

                    verdict = "FAIL" if (ss.dom_errors or any(v.verdict == "FAIL" for v in vision_analyses)) else "PASS"

                    self.results.append(ScenarioResult(
                        name=f"round-navigation-form-{form_id}-round-{i+1}",
                        description=f"Round {i+1} navigation on form {form_id} summary",
                        severity="critical",
                        verdict=verdict,
                        steps_completed=3,
                        steps_total=3,
                        screenshots=screenshots,
                        vision_analyses=vision_analyses,
                        dom_errors=ss.dom_errors,
                        console_errors=ss.console_errors,
                    ))

                except Exception as e:
                    print(f"  ⚠️ Error clicking round {i+1}: {e}")
                    self.results.append(ScenarioResult(
                        name=f"round-navigation-form-{form_id}-round-{i+1}",
                        description=f"Round {i+1} navigation on form {form_id} summary",
                        severity="critical",
                        verdict="FAIL",
                        steps_completed=0,
                        steps_total=3,
                        error_message=str(e),
                    ))

        except Exception as e:
            print(f"  ⚠️ Round navigation test error: {e}")

    def _build_report(self, timestamp: str, start_time: float) -> TestReport:
        """Build the final test report."""
        duration = time.time() - start_time
        passed = sum(1 for r in self.results if r.verdict == "PASS")
        failed = sum(1 for r in self.results if r.verdict == "FAIL")
        warnings = sum(1 for r in self.results if r.verdict == "WARNING")
        skipped = sum(1 for r in self.results if r.verdict == "SKIP")

        return TestReport(
            timestamp=timestamp,
            duration_seconds=duration,
            total_scenarios=len(self.results),
            passed=passed,
            failed=failed,
            warnings=warnings,
            skipped=skipped,
            results=self.results,
        )


def main():
    parser = argparse.ArgumentParser(description="Prometheus: Vision-Powered QA for Symphonia")
    parser.add_argument("--scenario", type=str, help="Filter scenarios by name substring")
    parser.add_argument("--no-vision", action="store_true", help="Skip vision analysis (faster)")
    parser.add_argument("--headed", action="store_true", help="Run browser in headed mode")
    args = parser.parse_args()

    runner = PrometheusRunner(
        headless=not args.headed,
        use_vision=not args.no_vision,
        scenario_filter=args.scenario,
    )

    report = runner.run()

    # Exit code: 0 if all pass, 1 if any fail
    sys.exit(1 if report.failed > 0 else 0)


if __name__ == "__main__":
    main()

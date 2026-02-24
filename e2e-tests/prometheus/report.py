"""
report.py — HTML and Markdown report generation for Prometheus QA results.
"""
from __future__ import annotations

import json
import time
import base64
from pathlib import Path
from dataclasses import dataclass, field
from datetime import datetime

from vision_analyst import VisionAnalysis


@dataclass
class ScenarioResult:
    """Aggregated result for a single test scenario."""
    name: str
    description: str
    severity: str
    verdict: str  # PASS, FAIL, WARNING, SKIP
    steps_completed: int
    steps_total: int
    screenshots: list[str] = field(default_factory=list)
    vision_analyses: list[VisionAnalysis] = field(default_factory=list)
    dom_errors: list[str] = field(default_factory=list)
    console_errors: list[str] = field(default_factory=list)
    error_message: str = ""
    duration_ms: float = 0


@dataclass
class TestReport:
    """Complete test run report."""
    timestamp: str
    duration_seconds: float
    total_scenarios: int
    passed: int
    failed: int
    warnings: int
    skipped: int
    results: list[ScenarioResult] = field(default_factory=list)


class ReportGenerator:
    """Generates HTML and Markdown reports from test results."""

    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate(self, report: TestReport):
        """Generate both HTML and Markdown reports."""
        self._generate_html(report)
        self._generate_markdown(report)

    def _generate_markdown(self, report: TestReport):
        """Generate RESULTS.md with test findings."""
        lines = [
            "# Prometheus QA Results",
            "",
            f"**Run timestamp:** {report.timestamp}",
            f"**Duration:** {report.duration_seconds:.1f}s",
            "",
            "## Summary",
            "",
            f"| Metric | Count |",
            f"|--------|-------|",
            f"| Total scenarios | {report.total_scenarios} |",
            f"| ✅ Passed | {report.passed} |",
            f"| ❌ Failed | {report.failed} |",
            f"| ⚠️ Warnings | {report.warnings} |",
            f"| ⏭️ Skipped | {report.skipped} |",
            "",
            "## Scenario Results",
            "",
        ]

        for r in report.results:
            icon = {"PASS": "✅", "FAIL": "❌", "WARNING": "⚠️", "SKIP": "⏭️"}.get(r.verdict, "❓")
            lines.append(f"### {icon} {r.name} [{r.severity.upper()}]")
            lines.append(f"*{r.description}*")
            lines.append(f"- **Verdict:** {r.verdict}")
            lines.append(f"- **Steps:** {r.steps_completed}/{r.steps_total}")
            lines.append(f"- **Duration:** {r.duration_ms:.0f}ms")

            if r.error_message:
                lines.append(f"- **Error:** `{r.error_message}`")

            if r.dom_errors:
                lines.append("- **DOM Errors:**")
                for err in r.dom_errors:
                    lines.append(f"  - `{err}`")

            if r.vision_analyses:
                lines.append("- **Vision Analysis:**")
                for va in r.vision_analyses:
                    lines.append(f"  - [{va.verdict}] {va.summary} (confidence: {va.confidence:.0%}, method: {va.analysis_method})")
                    if va.error_description:
                        lines.append(f"    - Error: {va.error_description}")
                    if va.visual_anomalies:
                        for anom in va.visual_anomalies:
                            lines.append(f"    - Anomaly: {anom}")

            if r.screenshots:
                lines.append("- **Screenshots:**")
                for ss in r.screenshots:
                    lines.append(f"  - `{Path(ss).name}`")

            lines.append("")

        # Overall assessment
        lines.append("## Assessment")
        lines.append("")
        if report.failed > 0:
            lines.append(f"🔴 **{report.failed} scenario(s) FAILED.** Immediate attention required.")
        elif report.warnings > 0:
            lines.append(f"🟡 **All scenarios passed but {report.warnings} warning(s) detected.** Review recommended.")
        else:
            lines.append("🟢 **All scenarios passed.** Application appears healthy.")

        md_path = self.output_dir / "RESULTS.md"
        md_path.write_text("\n".join(lines))
        print(f"[Report] Markdown report written to {md_path}")

    def _generate_html(self, report: TestReport):
        """Generate report.html with embedded screenshots."""
        # Build scenario cards
        scenario_cards = []
        for r in report.results:
            verdict_class = {
                "PASS": "pass", "FAIL": "fail", "WARNING": "warning", "SKIP": "skip"
            }.get(r.verdict, "skip")
            verdict_icon = {
                "PASS": "✅", "FAIL": "❌", "WARNING": "⚠️", "SKIP": "⏭️"
            }.get(r.verdict, "❓")

            # Build screenshot thumbnails
            screenshots_html = ""
            for ss_path in r.screenshots:
                try:
                    with open(ss_path, "rb") as f:
                        img_b64 = base64.standard_b64encode(f.read()).decode()
                    screenshots_html += f'''
                    <div class="screenshot">
                        <img src="data:image/png;base64,{img_b64}" alt="{Path(ss_path).stem}" loading="lazy" />
                        <p class="screenshot-label">{Path(ss_path).stem}</p>
                    </div>'''
                except Exception:
                    screenshots_html += f'<p class="screenshot-label">⚠ Could not load: {Path(ss_path).name}</p>'

            # Build vision analysis section
            vision_html = ""
            for va in r.vision_analyses:
                va_class = va.verdict.lower()
                vision_html += f'''
                <div class="vision-result {va_class}">
                    <strong>{va.verdict}</strong> — {_html_escape(va.summary)}
                    <br><small>Method: {va.analysis_method} | Confidence: {va.confidence:.0%}</small>
                    {"<br><em>Error: " + _html_escape(va.error_description) + "</em>" if va.error_description else ""}
                </div>'''

            # Build errors section
            errors_html = ""
            if r.dom_errors:
                errors_html += '<div class="errors"><strong>DOM Errors:</strong><ul>'
                for e in r.dom_errors:
                    errors_html += f'<li>{_html_escape(e)}</li>'
                errors_html += '</ul></div>'

            scenario_cards.append(f'''
            <div class="scenario-card {verdict_class}">
                <div class="scenario-header">
                    <span class="verdict-icon">{verdict_icon}</span>
                    <h3>{_html_escape(r.name)}</h3>
                    <span class="severity-badge {r.severity.lower()}">{r.severity.upper()}</span>
                </div>
                <p class="description">{_html_escape(r.description)}</p>
                <div class="meta">
                    Steps: {r.steps_completed}/{r.steps_total} | Duration: {r.duration_ms:.0f}ms
                    {" | <strong>Error:</strong> " + _html_escape(r.error_message) if r.error_message else ""}
                </div>
                {vision_html}
                {errors_html}
                <div class="screenshots-grid">
                    {screenshots_html}
                </div>
            </div>''')

        # Assemble full HTML
        overall_class = "fail" if report.failed > 0 else ("warning" if report.warnings > 0 else "pass")
        overall_text = (
            f"🔴 {report.failed} FAILED" if report.failed > 0
            else (f"🟡 {report.warnings} WARNING(S)" if report.warnings > 0
                  else "🟢 ALL PASSED")
        )

        html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prometheus QA Report — Symphonia</title>
<style>
    :root {{
        --bg: #0f1117;
        --card: #1a1d27;
        --border: #2a2d3a;
        --text: #e4e4e7;
        --text-muted: #9ca3af;
        --pass: #22c55e;
        --fail: #ef4444;
        --warning: #f59e0b;
        --skip: #6b7280;
        --accent: #6366f1;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 2rem; }}
    .header {{ text-align: center; margin-bottom: 2rem; }}
    .header h1 {{ font-size: 2rem; margin-bottom: 0.5rem; }}
    .header .meta {{ color: var(--text-muted); font-size: 0.9rem; }}
    .summary-bar {{ display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-bottom: 2rem; }}
    .summary-stat {{ background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 1rem 1.5rem; text-align: center; min-width: 120px; }}
    .summary-stat .number {{ font-size: 2rem; font-weight: 700; }}
    .summary-stat .label {{ font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }}
    .summary-stat.pass .number {{ color: var(--pass); }}
    .summary-stat.fail .number {{ color: var(--fail); }}
    .summary-stat.warning .number {{ color: var(--warning); }}
    .summary-stat.skip .number {{ color: var(--skip); }}
    .overall-badge {{ display: inline-block; padding: 0.5rem 1.5rem; border-radius: 999px; font-weight: 700; font-size: 1.1rem; margin-bottom: 2rem; }}
    .overall-badge.pass {{ background: rgba(34,197,94,0.15); color: var(--pass); border: 1px solid var(--pass); }}
    .overall-badge.fail {{ background: rgba(239,68,68,0.15); color: var(--fail); border: 1px solid var(--fail); }}
    .overall-badge.warning {{ background: rgba(245,158,11,0.15); color: var(--warning); border: 1px solid var(--warning); }}
    .scenario-card {{ background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }}
    .scenario-card.fail {{ border-left: 4px solid var(--fail); }}
    .scenario-card.pass {{ border-left: 4px solid var(--pass); }}
    .scenario-card.warning {{ border-left: 4px solid var(--warning); }}
    .scenario-card.skip {{ border-left: 4px solid var(--skip); }}
    .scenario-header {{ display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }}
    .scenario-header h3 {{ font-size: 1.1rem; flex: 1; }}
    .verdict-icon {{ font-size: 1.5rem; }}
    .severity-badge {{ font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: 600; }}
    .severity-badge.critical {{ background: rgba(239,68,68,0.2); color: var(--fail); }}
    .severity-badge.high {{ background: rgba(245,158,11,0.2); color: var(--warning); }}
    .severity-badge.medium {{ background: rgba(99,102,241,0.2); color: var(--accent); }}
    .severity-badge.low {{ background: rgba(107,114,128,0.2); color: var(--skip); }}
    .description {{ color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.75rem; }}
    .meta {{ color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.75rem; }}
    .vision-result {{ padding: 0.75rem; border-radius: 8px; margin-bottom: 0.5rem; font-size: 0.9rem; }}
    .vision-result.pass {{ background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); }}
    .vision-result.fail {{ background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); }}
    .vision-result.warning {{ background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); }}
    .errors {{ margin: 0.75rem 0; padding: 0.75rem; background: rgba(239,68,68,0.08); border-radius: 8px; font-size: 0.85rem; }}
    .errors ul {{ margin-left: 1.5rem; }}
    .screenshots-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 1rem; margin-top: 1rem; }}
    .screenshot img {{ width: 100%; border-radius: 8px; border: 1px solid var(--border); }}
    .screenshot-label {{ font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem; text-align: center; }}
</style>
</head>
<body>
<div class="header">
    <h1>🔥 Prometheus QA Report</h1>
    <p class="meta">Symphonia Visual QA — {report.timestamp} — Duration: {report.duration_seconds:.1f}s</p>
</div>

<div style="text-align: center;">
    <div class="overall-badge {overall_class}">{overall_text}</div>
</div>

<div class="summary-bar">
    <div class="summary-stat"><div class="number">{report.total_scenarios}</div><div class="label">Total</div></div>
    <div class="summary-stat pass"><div class="number">{report.passed}</div><div class="label">Passed</div></div>
    <div class="summary-stat fail"><div class="number">{report.failed}</div><div class="label">Failed</div></div>
    <div class="summary-stat warning"><div class="number">{report.warnings}</div><div class="label">Warnings</div></div>
    <div class="summary-stat skip"><div class="number">{report.skipped}</div><div class="label">Skipped</div></div>
</div>

{"".join(scenario_cards)}

<div style="text-align: center; color: var(--text-muted); margin-top: 3rem; font-size: 0.8rem;">
    Generated by Prometheus QA System — Vision-Powered Testing for Symphonia
</div>
</body>
</html>'''

        html_path = self.output_dir / "report.html"
        html_path.write_text(html)
        print(f"[Report] HTML report written to {html_path}")


def _html_escape(text: str) -> str:
    """Basic HTML escaping."""
    return (text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;"))

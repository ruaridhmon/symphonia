"""
vision_analyst.py — Claude Vision analysis layer for visual QA.

Analyzes screenshots using Claude's vision capabilities to detect errors,
anomalies, and visual quality issues that DOM-based testing would miss.
"""
from __future__ import annotations

import os
import json
import base64
import time
from pathlib import Path
from dataclasses import dataclass, field

VISION_REPORTS_DIR = Path(__file__).parent / "vision_reports"
VISION_REPORTS_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class VisionAnalysis:
    """Result of Claude Vision analysis on a screenshot."""
    screenshot_path: str
    screenshot_name: str
    verdict: str  # "PASS", "FAIL", "WARNING", "ERROR"
    summary: str
    details: str
    error_detected: bool
    error_description: str = ""
    visual_anomalies: list[str] = field(default_factory=list)
    confidence: float = 0.0
    analysis_method: str = "claude_vision"  # or "dom_heuristic"
    raw_response: str = ""


class VisionAnalyst:
    """Analyzes screenshots using Claude Vision for visual QA."""

    def __init__(self):
        self._client = None
        self._api_available = False
        self._init_client()

    def _init_client(self):
        """Initialize the Anthropic client."""
        try:
            import anthropic
            self._client = anthropic.Anthropic()
            # Quick check that the key works (don't actually call yet)
            self._api_available = True
            print("[VisionAnalyst] Anthropic API client initialized")
        except Exception as e:
            print(f"[VisionAnalyst] Anthropic API not available: {e}")
            self._api_available = False

    def analyze_screenshot(
        self,
        screenshot_path: str,
        context: str = "",
        dom_errors: list[str] | None = None,
        console_errors: list[str] | None = None,
        page_text: str = "",
    ) -> VisionAnalysis:
        """
        Analyze a screenshot for errors and visual quality.

        Uses Claude Vision API if available, falls back to DOM heuristics.
        """
        name = Path(screenshot_path).stem

        # Try Claude Vision first
        if self._api_available:
            try:
                result = self._analyze_with_vision(screenshot_path, context, dom_errors, console_errors)
                self._save_report(result)
                return result
            except Exception as e:
                print(f"[VisionAnalyst] Vision API failed for {name}: {e}")

        # Fallback to DOM heuristics
        result = self._analyze_with_heuristics(
            screenshot_path, context, dom_errors or [], console_errors or [], page_text
        )
        self._save_report(result)
        return result

    def _analyze_with_vision(
        self,
        screenshot_path: str,
        context: str,
        dom_errors: list[str] | None,
        console_errors: list[str] | None,
    ) -> VisionAnalysis:
        """Use Claude Vision API to analyze the screenshot."""
        name = Path(screenshot_path).stem

        # Read and encode the image
        with open(screenshot_path, "rb") as f:
            image_data = base64.standard_b64encode(f.read()).decode("utf-8")

        # Build the analysis prompt
        dom_context = ""
        if dom_errors:
            dom_context += f"\n\nDOM errors detected: {json.dumps(dom_errors)}"
        if console_errors:
            dom_context += f"\n\nConsole errors: {json.dumps(console_errors[:10])}"

        prompt = f"""You are a senior QA engineer analyzing a screenshot of the Symphonia web application.

Context: {context or 'General page screenshot'}
{dom_context}

Analyze this screenshot carefully. You must determine:

1. **Is this an error page?** Look for:
   - Red warning triangles or ⚠ symbols
   - Error messages like "Something went wrong", "Error", "Failed to Load"
   - JavaScript variable errors (e.g., "Can't find variable: MessageSquare")
   - React ErrorBoundary patterns: centered card with error title + "Try Again" button
   - Blank/empty pages where content should be
   - Browser error pages (404, 500, etc.)
   - Loading spinners that seem stuck

2. **Visual quality check:**
   - Is the layout correct? (no overlapping elements, broken grids)
   - Are there missing images or broken icons?
   - Does the content look complete or truncated?
   - Is there readable text where expected?
   - Are interactive elements (buttons, inputs) visible?

3. **Functional assessment:**
   - Does this look like a working, usable page?
   - Is there meaningful content displayed?
   - Are navigation elements present?

Respond in this exact JSON format:
{{
    "verdict": "PASS" | "FAIL" | "WARNING",
    "error_detected": true | false,
    "error_description": "Description of error if detected, empty otherwise",
    "summary": "One-line summary of what the page shows",
    "details": "Detailed analysis of the page state",
    "visual_anomalies": ["list", "of", "anomalies"],
    "confidence": 0.95
}}

Be precise and honest. A login page is PASS (not an error). A loading skeleton is WARNING. An error boundary render is FAIL."""

        response = self._client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": image_data,
                            },
                        },
                        {
                            "type": "text",
                            "text": prompt,
                        },
                    ],
                }
            ],
        )

        raw_text = response.content[0].text

        # Parse JSON from response
        try:
            # Find JSON block in response
            json_start = raw_text.find("{")
            json_end = raw_text.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                parsed = json.loads(raw_text[json_start:json_end])
            else:
                raise ValueError("No JSON found in response")
        except (json.JSONDecodeError, ValueError):
            # If JSON parsing fails, treat response as text analysis
            is_error = any(w in raw_text.lower() for w in ["error", "fail", "broken", "crash"])
            parsed = {
                "verdict": "FAIL" if is_error else "PASS",
                "error_detected": is_error,
                "error_description": raw_text[:200] if is_error else "",
                "summary": raw_text[:200],
                "details": raw_text,
                "visual_anomalies": [],
                "confidence": 0.5,
            }

        return VisionAnalysis(
            screenshot_path=screenshot_path,
            screenshot_name=name,
            verdict=parsed.get("verdict", "WARNING"),
            summary=parsed.get("summary", ""),
            details=parsed.get("details", ""),
            error_detected=parsed.get("error_detected", False),
            error_description=parsed.get("error_description", ""),
            visual_anomalies=parsed.get("visual_anomalies", []),
            confidence=parsed.get("confidence", 0.0),
            analysis_method="claude_vision",
            raw_response=raw_text,
        )

    def _analyze_with_heuristics(
        self,
        screenshot_path: str,
        context: str,
        dom_errors: list[str],
        console_errors: list[str],
        page_text: str,
    ) -> VisionAnalysis:
        """Fallback: analyze using DOM text and error patterns."""
        name = Path(screenshot_path).stem
        errors_found = []
        anomalies = []

        # Check DOM errors
        for err in dom_errors:
            errors_found.append(err)

        # Check console errors
        critical_console = [e for e in console_errors if "[page_error]" in e or "ReferenceError" in e]
        for err in critical_console:
            errors_found.append(f"Console: {err}")

        # Check page text for error patterns
        error_keywords = [
            "Can't find variable",
            "is not defined",
            "Something went wrong",
            "Failed to Load",
            "Try Again",
            "ErrorBoundary",
            "ChunkLoadError",
        ]
        text_lower = page_text.lower()
        for kw in error_keywords:
            if kw.lower() in text_lower:
                errors_found.append(f"Page text contains: '{kw}'")

        # Check for mostly empty page
        visible_text = page_text.strip()
        if len(visible_text) < 50 and context != "login page":
            anomalies.append("Very little visible text — possibly blank/broken page")

        has_errors = len(errors_found) > 0
        verdict = "FAIL" if has_errors else ("WARNING" if anomalies else "PASS")

        return VisionAnalysis(
            screenshot_path=screenshot_path,
            screenshot_name=name,
            verdict=verdict,
            summary=f"Heuristic analysis: {'ERRORS FOUND' if has_errors else 'No errors detected'}",
            details=f"DOM errors: {errors_found}\nAnomalies: {anomalies}\nConsole errors: {console_errors[:5]}",
            error_detected=has_errors,
            error_description="; ".join(errors_found) if errors_found else "",
            visual_anomalies=anomalies,
            confidence=0.7 if has_errors else 0.5,
            analysis_method="dom_heuristic",
            raw_response="",
        )

    def _save_report(self, analysis: VisionAnalysis):
        """Save individual vision report to disk."""
        report_path = VISION_REPORTS_DIR / f"{analysis.screenshot_name}.json"
        report_data = {
            "screenshot_path": analysis.screenshot_path,
            "screenshot_name": analysis.screenshot_name,
            "verdict": analysis.verdict,
            "summary": analysis.summary,
            "details": analysis.details,
            "error_detected": analysis.error_detected,
            "error_description": analysis.error_description,
            "visual_anomalies": analysis.visual_anomalies,
            "confidence": analysis.confidence,
            "analysis_method": analysis.analysis_method,
            "raw_response": analysis.raw_response,
        }
        with open(report_path, "w") as f:
            json.dump(report_data, f, indent=2)

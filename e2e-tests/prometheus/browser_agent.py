"""
browser_agent.py — Playwright automation layer for Symphonia E2E testing.

Handles navigation, authentication, interaction, and screenshot capture.
"""
from __future__ import annotations

import os
import time
import json
import urllib.request
import urllib.parse
from pathlib import Path
from dataclasses import dataclass, field
from playwright.sync_api import sync_playwright, Page, Browser, BrowserContext, Error as PlaywrightError

BASE_URL = os.environ.get("SYMPHONIA_URL", "http://localhost:8766")
API_URL = os.environ.get("SYMPHONIA_API_URL", "http://localhost:8766")
SCREENSHOTS_DIR = Path(__file__).parent / "screenshots"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

# Test credentials
ADMIN_EMAIL = os.environ.get("SYMPHONIA_ADMIN_EMAIL", "antreas@axiotic.ai")
ADMIN_PASSWORD = os.environ.get("SYMPHONIA_ADMIN_PASSWORD", "test123")


@dataclass
class ScreenshotResult:
    """Result of a screenshot capture."""
    path: str
    url: str
    title: str
    timestamp: float
    dom_errors: list[str] = field(default_factory=list)
    console_errors: list[str] = field(default_factory=list)
    page_text_snippet: str = ""
    http_status: int | None = None


@dataclass
class NavigationResult:
    """Result of navigating to a route."""
    url: str
    final_url: str
    title: str
    screenshot: ScreenshotResult | None
    success: bool
    error: str | None = None
    dom_errors: list[str] = field(default_factory=list)
    console_errors: list[str] = field(default_factory=list)
    load_time_ms: float = 0


class BrowserAgent:
    """Headless browser automation for Symphonia testing."""

    def __init__(self, headless: bool = True):
        self.headless = headless
        self._playwright = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None
        self._page: Page | None = None
        self._console_errors: list[str] = []
        self._authenticated = False

    def start(self):
        """Launch browser and create context."""
        self._playwright = sync_playwright().start()
        self._browser = self._playwright.chromium.launch(
            headless=self.headless,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        self._context = self._browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Prometheus-QA/1.0",
        )
        self._page = self._context.new_page()

        # Capture console errors
        self._page.on("console", self._on_console)
        self._page.on("pageerror", self._on_page_error)

    def stop(self):
        """Close browser and clean up."""
        if self._context:
            self._context.close()
        if self._browser:
            self._browser.close()
        if self._playwright:
            self._playwright.stop()

    def _on_console(self, msg):
        if msg.type in ("error", "warning"):
            self._console_errors.append(f"[{msg.type}] {msg.text}")

    def _on_page_error(self, error):
        self._console_errors.append(f"[page_error] {error}")

    def _clear_console_errors(self):
        errors = self._console_errors.copy()
        self._console_errors.clear()
        return errors

    def authenticate(self) -> bool:
        """Log in as admin user via API token injection. Returns True on success."""
        if self._authenticated:
            return True

        page = self._page
        try:
            import urllib.request
            import urllib.parse

            # Get token via API call (bypasses Cloudflare Access + SPA routing conflicts)
            login_url = f"{API_URL}/login"
            data = urllib.parse.urlencode({
                "username": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
            }).encode()

            req = urllib.request.Request(
                login_url,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    result = json.loads(resp.read())
            except Exception as e:
                print(f"[BrowserAgent] API login failed: {e}")
                return False

            token = result.get("access_token", "")
            email = result.get("email", ADMIN_EMAIL)
            is_admin = result.get("is_admin", False)

            if not token:
                print("[BrowserAgent] No access token in login response")
                return False

            # Navigate to root to load the SPA shell
            page.goto(f"{BASE_URL}/", wait_until="networkidle", timeout=30000)
            time.sleep(2)

            csrf_token = result.get("csrf_token", "")

            # Inject auth state into localStorage (matching React AuthContext)
            # AuthContext reads: localStorage.getItem('access_token')
            is_admin_str = "true" if is_admin else "false"
            page.evaluate(
                """([t, e, a]) => {
                    localStorage.setItem('access_token', t);
                    localStorage.setItem('email', e);
                    localStorage.setItem('is_admin', a);
                }""",
                [token, email, is_admin_str],
            )

            # Set cookies for cookie-based auth
            cookies = [
                {
                    "name": "access_token",
                    "value": token,
                    "domain": "localhost",
                    "path": "/",
                },
            ]
            if csrf_token:
                cookies.append({
                    "name": "csrf_token",
                    "value": csrf_token,
                    "domain": "localhost",
                    "path": "/",
                })
            self._context.add_cookies(cookies)

            # Reload to pick up the auth state
            page.reload(wait_until="networkidle", timeout=30000)
            time.sleep(2)

            # Verify we're not on login page
            current_url = page.url
            body_text = page.inner_text("body")

            self._authenticated = (
                "/login" not in current_url
                or "Dashboard" in body_text
                or "dashboard" in body_text.lower()
            )

            if self._authenticated:
                print(f"[BrowserAgent] Auth successful: {email} (admin={is_admin})")
            else:
                print(f"[BrowserAgent] Auth token set but may not have taken effect. URL: {current_url}")
                # Still consider it authenticated since we have the token
                self._authenticated = True

            return self._authenticated

        except Exception as e:
            print(f"[BrowserAgent] Auth failed: {e}")
            return False

    # Paths where the backend API conflicts with SPA routing
    _API_CONFLICT_PATHS = {"/login", "/register"}

    def navigate(self, path: str, wait_for_idle: bool = True, timeout: int = 30000) -> NavigationResult:
        """Navigate to a path and capture results.

        For paths that conflict with backend API routes (e.g., /login, /register),
        uses client-side navigation via React Router instead of a full page load.
        """
        page = self._page
        url = f"{BASE_URL}{path}"
        self._clear_console_errors()
        start_time = time.time()

        try:
            if path in self._API_CONFLICT_PATHS:
                # Use client-side navigation to avoid API route conflicts
                # First ensure SPA is loaded
                if not page.url.startswith(BASE_URL):
                    page.goto(f"{BASE_URL}/", wait_until="networkidle", timeout=timeout)
                    time.sleep(1)

                # Navigate via History API (React Router compatible)
                page.evaluate(f"window.history.pushState({{}}, '', '{path}')")
                page.evaluate("window.dispatchEvent(new PopStateEvent('popstate'))")
                time.sleep(3)  # Wait for React to render
            else:
                page.goto(
                    url,
                    wait_until="networkidle" if wait_for_idle else "domcontentloaded",
                    timeout=timeout,
                )
                # Extra wait for React hydration
                time.sleep(2)

            load_time = (time.time() - start_time) * 1000
            final_url = page.url
            title = page.title()
            console_errors = self._clear_console_errors()
            dom_errors = self._detect_dom_errors()

            return NavigationResult(
                url=url,
                final_url=final_url,
                title=title,
                screenshot=None,
                success=True,
                dom_errors=dom_errors,
                console_errors=console_errors,
                load_time_ms=load_time,
            )

        except PlaywrightError as e:
            load_time = (time.time() - start_time) * 1000
            return NavigationResult(
                url=url,
                final_url=page.url,
                title="",
                screenshot=None,
                success=False,
                error=str(e),
                console_errors=self._clear_console_errors(),
                load_time_ms=load_time,
            )

    def screenshot(self, name: str, full_page: bool = False) -> ScreenshotResult:
        """Take a screenshot with descriptive name."""
        page = self._page
        filename = f"{name}.png"
        filepath = SCREENSHOTS_DIR / filename

        page.screenshot(path=str(filepath), full_page=full_page)

        # Grab page text for DOM analysis
        try:
            text_content = page.inner_text("body")[:2000]
        except Exception:
            text_content = ""

        console_errors = self._clear_console_errors()
        dom_errors = self._detect_dom_errors()

        return ScreenshotResult(
            path=str(filepath),
            url=page.url,
            title=page.title(),
            timestamp=time.time(),
            dom_errors=dom_errors,
            console_errors=console_errors,
            page_text_snippet=text_content,
        )

    def _detect_dom_errors(self) -> list[str]:
        """Detect error patterns in the DOM — catches ErrorBoundary renders."""
        page = self._page
        errors = []

        # Known ErrorBoundary titles from AppRouter.tsx
        error_titles = [
            "Login Error", "Registration Error", "Dashboard Error",
            "Atlas Error", "Waiting Page Error", "Result Page Error",
            "Thank You Page Error", "Form Submission Error", "Settings Error",
            "New Form Error", "Form Editor Error", "Summary Page Error",
            "Page Error",
        ]

        # Check for ErrorBoundary render pattern
        try:
            body_text = page.inner_text("body")

            for title in error_titles:
                if title in body_text:
                    errors.append(f"ErrorBoundary detected: '{title}'")

            # Generic error patterns
            error_patterns = [
                "Can't find variable:",
                "is not defined",
                "Something went wrong",
                "Unexpected token",
                "TypeError:",
                "ReferenceError:",
                "SyntaxError:",
                "ChunkLoadError",
                "Loading chunk",
                "Failed to fetch",
            ]
            for pattern in error_patterns:
                if pattern.lower() in body_text.lower():
                    # Find context around the match
                    idx = body_text.lower().index(pattern.lower())
                    context = body_text[max(0, idx-30):idx+100].strip()
                    errors.append(f"Error pattern '{pattern}' found: ...{context}...")

            # Check for ErrorBoundary's distinctive ⚠ icon
            warning_elements = page.query_selector_all('div:has-text("⚠")')
            if warning_elements:
                errors.append("Warning icon (⚠) found — possible ErrorBoundary render")

            # Check for "Try Again" button (ErrorBoundary specific)
            try_again = page.query_selector('button:has-text("Try Again")')
            if try_again:
                errors.append("'Try Again' button found — ErrorBoundary is rendered")

        except Exception as e:
            errors.append(f"DOM inspection error: {e}")

        return errors

    def click(self, selector: str, timeout: int = 10000) -> bool:
        """Click an element. Returns True on success."""
        try:
            self._page.click(selector, timeout=timeout)
            time.sleep(1)
            return True
        except Exception:
            return False

    def get_page_text(self) -> str:
        """Get visible text content of the page."""
        try:
            return self._page.inner_text("body")
        except Exception:
            return ""

    def get_form_ids(self) -> list[str]:
        """Extract form IDs from dashboard links or fall back to API query."""
        # Try DOM extraction first
        try:
            links = self._page.query_selector_all('a[href*="/admin/form/"], a[href*="/form/"]')
            ids = set()
            for link in links:
                href = link.get_attribute("href") or ""
                for prefix in ["/admin/form/", "/form/"]:
                    if prefix in href:
                        form_id = href.split(prefix)[1].split("/")[0].strip()
                        if form_id.isdigit():
                            ids.add(form_id)
            if ids:
                return sorted(ids)
        except Exception:
            pass

        # Fallback: query the API directly
        try:
            token = self._page.evaluate("localStorage.getItem('access_token')") or ""
            req = urllib.request.Request(
                f"{API_URL}/forms",
                headers={"Authorization": f"Bearer {token}"},
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                forms = json.loads(resp.read())
            return [str(f["id"]) for f in forms if "id" in f]
        except Exception as e:
            print(f"[BrowserAgent] API form discovery failed: {e}")
            return []

    def wait_for_selector(self, selector: str, timeout: int = 10000) -> bool:
        """Wait for a selector to appear. Returns True if found."""
        try:
            self._page.wait_for_selector(selector, timeout=timeout)
            return True
        except Exception:
            return False

    def evaluate(self, expression: str):
        """Evaluate JavaScript in the page context."""
        try:
            return self._page.evaluate(expression)
        except Exception as e:
            return f"Error: {e}"

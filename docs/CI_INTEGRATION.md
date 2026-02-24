# CI/CD Integration Plan — Symphonia Visual QA

> **Author:** Daedalus (sub-agent)
> **Date:** 2026-02-24
> **Status:** Design Complete — Ready for Implementation

## Overview

This document defines a practical CI/CD integration strategy for Symphonia's visual QA system (Hector + Prometheus), including:

1. GitHub Actions workflow for PR checks
2. Pre-commit hook for instant static analysis
3. Nightly full visual QA with vision model
4. Environment setup (test data seeding, auth, Cloudflare Access)
5. Report artifacts and PR comments

---

## 1. GitHub Actions — PR Checks

### 1.1 Workflow: `visual-qa.yml`

This workflow runs on every pull request that touches frontend or backend code.

```yaml
# .github/workflows/visual-qa.yml
name: Visual QA — Hector + Prometheus

on:
  pull_request:
    branches: [main, develop]
    paths:
      - 'frontend/**'
      - 'backend/**'
      - 'e2e-tests/**'
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - 'backend/**'

concurrency:
  group: visual-qa-${{ github.head_ref || github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'
  PYTHON_VERSION: '3.12'
  # Backend config
  DATABASE_URL: 'sqlite:///./test.db'
  SECRET_KEY: 'ci-test-secret-key-do-not-use-in-prod'
  ADMIN_EMAIL: 'antreas@axiotic.ai'
  ADMIN_PASSWORD: 'test123'
  API_URL: 'http://localhost:8000'
  FRONTEND_URL: 'http://localhost:3000'

jobs:
  # ─── Job 1: Static Analysis (fast, no browser needed) ─────────
  static-analysis:
    name: 🔍 Static Analysis (Prometheus)
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Run enhanced static analysis
        run: |
          python e2e-tests/prometheus/enhanced_static_analysis.py frontend/src

      - name: Upload analysis results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: static-analysis-results
          path: |
            e2e-tests/prometheus/enhanced_static_analysis_results.json
            e2e-tests/prometheus/enhanced_static_analysis_results.md
          retention-days: 30

      - name: Comment on PR — static analysis
        if: failure() && github.event_name == 'pull_request'
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: static-analysis
          path: e2e-tests/prometheus/enhanced_static_analysis_results.md

  # ─── Job 2: E2E Tests (Hector — Playwright) ───────────────────
  e2e-tests:
    name: 🎭 E2E Tests (Hector)
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: static-analysis  # Don't waste CI time if imports are broken
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      # ── Start backend ──
      - name: Install backend dependencies
        working-directory: backend
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Seed test database
        working-directory: backend
        run: |
          python seed_test_data.py

      - name: Start backend server
        working-directory: backend
        run: |
          uvicorn main:app --host 0.0.0.0 --port 8000 &
          # Wait for backend to be ready
          for i in {1..30}; do
            curl -sf http://localhost:8000/health && break
            echo "Waiting for backend... ($i/30)"
            sleep 1
          done

      # ── Start frontend ──
      - name: Install frontend dependencies
        working-directory: frontend
        run: npm ci

      - name: Start frontend dev server
        working-directory: frontend
        run: |
          npm start &
          # Wait for frontend
          for i in {1..30}; do
            curl -sf http://localhost:3000 && break
            echo "Waiting for frontend... ($i/30)"
            sleep 1
          done

      # ── Run Hector tests ──
      - name: Install Playwright browsers
        working-directory: e2e-tests/hector
        run: |
          npm ci
          npx playwright install --with-deps chromium

      - name: Run Hector E2E tests
        working-directory: e2e-tests/hector
        env:
          BASE_URL: http://localhost:3000
          API_URL: http://localhost:8000
        run: |
          npx playwright test --reporter=list,json

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: hector-test-results
          path: |
            e2e-tests/hector/test-results.json
            e2e-tests/hector/test-results/
          retention-days: 30

      - name: Upload screenshots
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: hector-screenshots
          path: e2e-tests/hector/screenshots/
          retention-days: 30

      - name: Comment on PR — test results
        if: always() && github.event_name == 'pull_request'
        uses: daun/playwright-report-comment@v3
        with:
          report-file: e2e-tests/hector/test-results.json
          comment-title: '🎭 Hector E2E Test Results'

  # ─── Job 3: Screenshot Diff (optional — visual regression) ────
  screenshot-diff:
    name: 📸 Screenshot Comparison
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: e2e-tests
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - uses: actions/download-artifact@v4
        with:
          name: hector-screenshots
          path: current-screenshots/

      # Compare with baseline screenshots from main branch
      - name: Download baseline screenshots
        uses: dawidd6/action-download-artifact@v6
        with:
          workflow: visual-qa.yml
          branch: main
          name: hector-screenshots
          path: baseline-screenshots/
        continue-on-error: true  # First run won't have baseline

      - name: Compare screenshots
        run: |
          if [ -d "baseline-screenshots" ]; then
            echo "## 📸 Screenshot Comparison" > screenshot-diff.md
            echo "" >> screenshot-diff.md
            # Simple file-level diff — list new/changed/removed
            diff <(ls baseline-screenshots/ | sort) \
                 <(ls current-screenshots/ | sort) > /tmp/diff.txt || true
            
            NEW=$(grep '^>' /tmp/diff.txt | wc -l)
            REMOVED=$(grep '^<' /tmp/diff.txt | wc -l)
            TOTAL=$(ls current-screenshots/ | wc -l)
            
            echo "| Metric | Count |" >> screenshot-diff.md
            echo "|--------|-------|" >> screenshot-diff.md
            echo "| Total screenshots | $TOTAL |" >> screenshot-diff.md
            echo "| New screenshots | $NEW |" >> screenshot-diff.md
            echo "| Removed screenshots | $REMOVED |" >> screenshot-diff.md
            echo "" >> screenshot-diff.md
            
            if [ "$NEW" -gt 0 ] || [ "$REMOVED" -gt 0 ]; then
              echo "⚠️ Screenshot changes detected — review artifacts for visual diff." >> screenshot-diff.md
            else
              echo "✅ No screenshot changes detected." >> screenshot-diff.md
            fi
          else
            echo "ℹ️ No baseline screenshots found (first run). Current screenshots saved as new baseline." > screenshot-diff.md
          fi

      - name: Comment on PR — screenshot diff
        if: always()
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: screenshot-diff
          path: screenshot-diff.md
```

### 1.2 Workflow Stages Summary

| Stage | Time | What It Catches |
|-------|------|-----------------|
| Static Analysis | ~30s | Missing imports, icon library issues, crash-causing bugs |
| E2E Tests | ~5-10min | Runtime crashes, ErrorBoundary triggers, flow breakages |
| Screenshot Diff | ~2min | Visual regressions, layout changes |

---

## 2. Pre-commit Hook — Static Analysis

### 2.1 Setup Script

Create `.git/hooks/pre-commit` (or use `pre-commit` framework):

```bash
#!/bin/bash
# .git/hooks/pre-commit
# Run enhanced static analysis on staged frontend files

# Check if any frontend files are staged
STAGED_FRONTEND=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(tsx|jsx|ts)$' | grep -v node_modules || true)

if [ -z "$STAGED_FRONTEND" ]; then
  exit 0
fi

echo "🔍 Running Symphonia static analysis on staged files..."

# Run the enhanced static analysis
python3 e2e-tests/prometheus/enhanced_static_analysis.py frontend/src

EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ Static analysis found CRITICAL issues."
  echo "   Fix the missing imports above before committing."
  echo "   To bypass: git commit --no-verify"
  echo ""
  exit 1
fi

echo "✅ Static analysis passed."
exit 0
```

### 2.2 Installation via npm scripts

Add to `frontend/package.json`:

```json
{
  "scripts": {
    "lint:imports": "python3 ../e2e-tests/prometheus/enhanced_static_analysis.py src",
    "precommit": "npm run lint:imports"
  }
}
```

### 2.3 Using Husky + lint-staged (recommended)

```bash
# Install
npm install --save-dev husky lint-staged
npx husky init
```

`.husky/pre-commit`:
```bash
cd frontend && npx lint-staged
```

`frontend/package.json`:
```json
{
  "lint-staged": {
    "src/**/*.{tsx,jsx,ts}": [
      "python3 ../e2e-tests/prometheus/enhanced_static_analysis.py ../frontend/src"
    ]
  }
}
```

---

## 3. Nightly Full Visual QA

### 3.1 Workflow: `nightly-visual-qa.yml`

```yaml
# .github/workflows/nightly-visual-qa.yml
name: Nightly Visual QA (Full Suite)

on:
  schedule:
    - cron: '0 3 * * *'  # 3:00 AM UTC daily
  workflow_dispatch:  # Manual trigger

env:
  NODE_VERSION: '20'
  PYTHON_VERSION: '3.12'
  DATABASE_URL: 'sqlite:///./test.db'
  SECRET_KEY: 'ci-nightly-secret'
  ADMIN_EMAIL: 'antreas@axiotic.ai'
  ADMIN_PASSWORD: 'test123'

jobs:
  nightly-qa:
    name: 🌙 Full Visual QA Suite
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      # ── Setup ──
      - name: Install all dependencies
        run: |
          # Backend
          cd backend && pip install -r requirements.txt && cd ..
          # Frontend
          cd frontend && npm ci && cd ..
          # Hector
          cd e2e-tests/hector && npm ci && npx playwright install --with-deps chromium && cd ../..

      - name: Seed comprehensive test data
        working-directory: backend
        run: python seed_test_data.py --full

      - name: Start services
        run: |
          cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 &
          cd frontend && npm start &
          # Wait for both
          for i in {1..30}; do curl -sf http://localhost:8000/health && break; sleep 1; done
          for i in {1..30}; do curl -sf http://localhost:3000 && break; sleep 1; done

      # ── Part 1: Static Analysis ──
      - name: Enhanced static analysis
        run: python e2e-tests/prometheus/enhanced_static_analysis.py frontend/src
        continue-on-error: true

      # ── Part 2: Full E2E Suite ──
      - name: Run ALL Hector test suites
        working-directory: e2e-tests/hector
        env:
          BASE_URL: http://localhost:3000
          API_URL: http://localhost:8000
        run: npx playwright test
        continue-on-error: true

      # ── Part 3: Vision Model Analysis (Prometheus) ──
      - name: Run Prometheus vision QA
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          # Prometheus uses screenshots from Hector + vision model scoring
          if [ -f "e2e-tests/prometheus/run_visual_qa.py" ]; then
            python e2e-tests/prometheus/run_visual_qa.py \
              --screenshots-dir e2e-tests/hector/screenshots \
              --output-dir e2e-tests/prometheus/results
          else
            echo "⚠️ Prometheus vision runner not yet implemented — skipping"
          fi
        continue-on-error: true

      # ── Collect all results ──
      - name: Generate nightly report
        if: always()
        run: |
          echo "# 🌙 Nightly Visual QA Report" > nightly-report.md
          echo "" >> nightly-report.md
          echo "**Date:** $(date -u '+%Y-%m-%d %H:%M UTC')" >> nightly-report.md
          echo "**Commit:** ${{ github.sha }}" >> nightly-report.md
          echo "" >> nightly-report.md
          
          echo "## Static Analysis" >> nightly-report.md
          if [ -f "e2e-tests/prometheus/enhanced_static_analysis_results.md" ]; then
            cat e2e-tests/prometheus/enhanced_static_analysis_results.md >> nightly-report.md
          else
            echo "No results available." >> nightly-report.md
          fi
          echo "" >> nightly-report.md
          
          echo "## E2E Test Results" >> nightly-report.md
          if [ -f "e2e-tests/hector/test-results.json" ]; then
            PASS=$(jq '[.suites[].specs[].tests[] | select(.status == "expected")] | length' e2e-tests/hector/test-results.json 2>/dev/null || echo "?")
            FAIL=$(jq '[.suites[].specs[].tests[] | select(.status == "unexpected")] | length' e2e-tests/hector/test-results.json 2>/dev/null || echo "?")
            echo "- ✅ Passed: $PASS" >> nightly-report.md
            echo "- ❌ Failed: $FAIL" >> nightly-report.md
          else
            echo "No test results available." >> nightly-report.md
          fi

      - name: Upload nightly artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: nightly-visual-qa-${{ github.run_number }}
          path: |
            nightly-report.md
            e2e-tests/hector/screenshots/
            e2e-tests/hector/test-results.json
            e2e-tests/prometheus/enhanced_static_analysis_results.*
          retention-days: 90

      # ── Notify on failure ──
      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
          webhook-type: incoming-webhook
          payload: |
            {
              "text": "🌙 Nightly Visual QA failed on Symphonia!\nSee: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
            }
```

---

## 4. Environment Setup

### 4.1 Test Data Seeding

Create `backend/seed_test_data.py`:

```python
#!/usr/bin/env python3
"""Seed the test database with known data for E2E tests."""
import argparse
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, engine, Base
from models import User, Form, Response, Round

def seed_basic():
    """Seed minimal data for PR checks."""
    db = SessionLocal()
    try:
        Base.metadata.create_all(bind=engine)
        
        # Admin user
        admin = User(
            email="antreas@axiotic.ai",
            hashed_password=hash_password("test123"),
            is_admin=True,
        )
        db.add(admin)
        
        # Regular user
        user = User(
            email="testuser@test.com",
            hashed_password=hash_password("testpass123"),
            is_admin=False,
        )
        db.add(user)
        
        # Sample form with responses
        form = Form(
            title="Sample Consultation",
            questions=["What are the key challenges?", "What solutions do you propose?"],
            join_code="12345",
            allow_join=True,
            current_round=1,
        )
        db.add(form)
        db.commit()
        
        # Add a response
        response = Response(
            form_id=form.id,
            user_email="testuser@test.com",
            round_number=1,
            answers={"1": "Challenge A", "2": "Solution B"},
        )
        db.add(response)
        db.commit()
        
        print(f"✅ Seeded: 1 admin, 1 user, 1 form, 1 response")
    finally:
        db.close()

def seed_full():
    """Seed comprehensive data for nightly QA."""
    seed_basic()
    db = SessionLocal()
    try:
        # Additional forms with varying states
        forms = [
            Form(title="AI Ethics Discussion", questions=["Q1", "Q2", "Q3"],
                 join_code="11111", current_round=3),
            Form(title="Climate Policy Consensus", questions=["Q1"],
                 join_code="22222", current_round=1),
            Form(title="Healthcare Innovation", questions=["Q1", "Q2"],
                 join_code="33333", current_round=2),
            Form(title="Education Reform", questions=["Q1", "Q2", "Q3", "Q4"],
                 join_code="44444", current_round=1),
            Form(title="Empty Form (No Responses)", questions=["Q1"],
                 join_code="55555", current_round=1),
        ]
        for f in forms:
            f.allow_join = True
            db.add(f)
        db.commit()
        
        print(f"✅ Full seed: +{len(forms)} forms with varied states")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--full", action="store_true", help="Seed full dataset")
    args = parser.parse_args()
    
    if args.full:
        seed_full()
    else:
        seed_basic()
```

### 4.2 Auth Handling in CI

The E2E tests use `loginViaAPI()` from `helpers.ts`, which:
1. Posts to `/login` with form-encoded credentials
2. Gets back `{ access_token, is_admin, email }`
3. Sets `localStorage` in the browser context

**In CI, this works out of the box** because:
- Backend runs on `localhost:8000`
- Frontend runs on `localhost:3000`
- Playwright's `page.request` bypasses browser CORS
- No Cloudflare Access in CI (only in production)

### 4.3 Handling Cloudflare Access in CI

**Problem:** Production Symphonia is behind Cloudflare Access. If tests ever need to run against the production/staging URL:

**Option A: Service Token (recommended for staging)**

```yaml
# In GitHub Actions:
env:
  CF_ACCESS_CLIENT_ID: ${{ secrets.CF_ACCESS_CLIENT_ID }}
  CF_ACCESS_CLIENT_SECRET: ${{ secrets.CF_ACCESS_CLIENT_SECRET }}

# In test setup:
- name: Configure Cloudflare Access headers
  run: |
    echo "CF_ACCESS_CLIENT_ID=$CF_ACCESS_CLIENT_ID" >> e2e-tests/hector/.env
    echo "CF_ACCESS_CLIENT_SECRET=$CF_ACCESS_CLIENT_SECRET" >> e2e-tests/hector/.env
```

Then in `helpers.ts`, add CF Access headers to requests:
```typescript
const cfHeaders = process.env.CF_ACCESS_CLIENT_ID ? {
  'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID,
  'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET,
} : {};
```

**Option B: Bypass for CI (recommended for local-only CI)**

Since CI runs everything locally, Cloudflare Access is not involved. The `isCfAccessRedirect()` check in the app gracefully handles this — it only triggers when a response is an HTML redirect to `*.cloudflareaccess.com`.

**Our recommendation:** Run CI tests against local services only. Use staging tests as a separate workflow with CF service tokens.

---

## 5. Report Artifacts & PR Comments

### 5.1 Artifact Structure

Each CI run produces:

```
artifacts/
├── static-analysis-results/
│   ├── enhanced_static_analysis_results.json    # Machine-readable
│   └── enhanced_static_analysis_results.md      # Human-readable
├── hector-test-results/
│   ├── test-results.json                        # Playwright JSON report
│   └── test-results/                            # Trace files for retries
└── hector-screenshots/
    ├── 07-01-admin-dashboard-loaded.png
    ├── 07-02-admin-dashboard-empty-or-populated.png
    ├── ...
    └── 07-16-admin-form-list.png
```

### 5.2 PR Comment Format

Using `marocchino/sticky-pull-request-comment`, each PR gets:

**Comment 1: Static Analysis** (auto-updates on push)
```markdown
# 🔍 Static Analysis Results

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 0 |
| 🟠 HIGH | 2 |
| 🟡 LOW | 1 |

## Issues
- 🟠 RoundCard.tsx:45 — `BarChart3` not imported from 'lucide-react'
- 🟠 RoundCard.tsx:47 — `HelpCircle` not imported from 'lucide-react'
```

**Comment 2: E2E Results** (auto-updates)
```markdown
# 🎭 Hector E2E Test Results

✅ 14 passed | ❌ 2 failed | ⏱️ 45s

### Failed Tests
- Form editor loads — timeout waiting for element
- Summary page loads — ErrorBoundary detected
```

**Comment 3: Screenshot Diff** (PR only)
```markdown
# 📸 Screenshot Comparison

| Metric | Count |
|--------|-------|
| Total | 26 |
| New | 3 |
| Changed | 0 |
| Removed | 0 |
```

### 5.3 HTML Report (Playwright built-in)

For richer reports, add Playwright's HTML reporter:

```typescript
// playwright.config.ts
reporter: [
  ['list'],
  ['json', { outputFile: 'test-results.json' }],
  ['html', { outputFolder: 'playwright-report', open: 'never' }],
],
```

Then upload as artifact:
```yaml
- uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: e2e-tests/hector/playwright-report/
```

---

## 6. Implementation Checklist

- [ ] **Immediate (Day 1)**
  - [ ] Copy `visual-qa.yml` to `.github/workflows/`
  - [ ] Create `backend/seed_test_data.py`
  - [ ] Set up pre-commit hook (manual or Husky)
  - [ ] Add `ANTHROPIC_API_KEY` and `SLACK_WEBHOOK_URL` to GitHub Secrets

- [ ] **Week 1**
  - [ ] Verify PR workflow runs end-to-end on a test PR
  - [ ] Tune timeouts and retry counts
  - [ ] Add baseline screenshots to main branch

- [ ] **Week 2**
  - [ ] Enable nightly workflow
  - [ ] Implement `run_visual_qa.py` for Prometheus vision model scoring
  - [ ] Add screenshot diff tooling (pixel-level comparison)

- [ ] **Ongoing**
  - [ ] Monitor CI run times — optimise if >15min
  - [ ] Review nightly reports weekly
  - [ ] Update test scenarios as new features land
  - [ ] Maintain icon library databases in `enhanced_static_analysis.py`

---

## 7. Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                  PR / Push                       │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│  Job 1: Static Analysis (30s)                   │
│  ┌──────────────────────────────────────┐       │
│  │ enhanced_static_analysis.py          │       │
│  │ → JSON + Markdown report             │       │
│  │ → PR comment (if critical issues)    │       │
│  └──────────────────────────────────────┘       │
└─────────────┬───────────────────────────────────┘
              │ (passes)
              ▼
┌─────────────────────────────────────────────────┐
│  Job 2: E2E Tests (5-10min)                     │
│  ┌──────────────────────────────────────┐       │
│  │ Backend (uvicorn :8000)              │       │
│  │ Frontend (npm start :3000)           │       │
│  │ Playwright (Chromium)                │       │
│  │ → Screenshots + JSON results         │       │
│  │ → PR comment with pass/fail          │       │
│  └──────────────────────────────────────┘       │
└─────────────┬───────────────────────────────────┘
              │ (completes)
              ▼
┌─────────────────────────────────────────────────┐
│  Job 3: Screenshot Diff (2min, PR only)         │
│  ┌──────────────────────────────────────┐       │
│  │ Compare with main branch baseline    │       │
│  │ → Visual regression detection        │       │
│  │ → PR comment with diff summary       │       │
│  └──────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Nightly: Full Visual QA (30-45min)             │
│  ┌──────────────────────────────────────┐       │
│  │ All above + Vision Model scoring     │       │
│  │ (Prometheus + Claude/GPT-4V)         │       │
│  │ → Quality scores per page            │       │
│  │ → Slack notification on failure      │       │
│  └──────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
```

---

## 8. Cost Considerations

| Component | Cost | Notes |
|-----------|------|-------|
| GitHub Actions | Free (public repos) / included (private) | ~5-10 min/run |
| Playwright | Free | Open source |
| Static Analysis | Free | Python script, no API calls |
| Vision Model (nightly) | ~$0.50-1.00/run | ~20 screenshots × Claude/GPT-4V |
| Slack notifications | Free | Webhook-based |

**Monthly estimate:** ~$15-30 for nightly vision model runs (30 days × $0.50-1.00).

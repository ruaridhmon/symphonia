# E2E Testing Scripts

This directory contains end-to-end testing scripts for the Symphonia platform.

## Available Tests

### 1. Bash Script (test-journey.sh)

A fully automated shell script that tests the complete user journey using curl commands.

**Prerequisites:**
- `curl` installed
- `jq` installed (for JSON parsing)
- Backend running on `http://localhost:8000`

**Usage:**
```bash
# Make sure backend is running first
cd backend
uvicorn main:app --reload

# In another terminal, run the test
cd ..
./scripts/test-journey.sh
```

**What it tests:**
1. ✅ Login as admin (antreas@axiotic.ai / test123)
2. ✅ Create a new form with 2 questions
3. ✅ Submit a response as participant
4. ✅ Generate AI synthesis
5. ✅ View results

**Output:**
- Colored terminal output showing progress
- JSON files saved to `/tmp/` for synthesis review
- Detailed summary at the end

**Cleanup:**
To automatically delete test forms after running, uncomment the cleanup line at the end of the script.

### 2. TypeScript Test (frontend/src/tests/e2e-journey.test.ts)

A TypeScript-based E2E test specification that can be run with testing frameworks like Vitest, Playwright, or Cypress.

**Setup with Vitest:**
```bash
cd frontend
npm install -D vitest @vitest/ui happy-dom

# Add to package.json scripts:
# "test": "vitest",
# "test:ui": "vitest --ui"

# Create vitest.config.ts (see inline instructions in test file)

npm test
```

**What it provides:**
- Type-safe API client wrapper
- Comprehensive test coverage
- Reusable test utilities
- Detailed inline documentation

## Quick Start

For immediate testing without setup:

```bash
./scripts/test-journey.sh
```

For development with type checking and IDE support:

```bash
# Follow TypeScript test setup instructions
cd frontend
npm test
```

## API Endpoints Tested

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/login` | POST | Admin authentication |
| `/create_form` | POST | Form creation |
| `/submit` | POST | Response submission |
| `/forms/{id}/synthesise_committee` | POST | AI synthesis generation |
| `/forms/{id}` | GET | Form retrieval |
| `/form/{id}/responses` | GET | Response listing |
| `/forms/{id}/rounds` | GET | Round data retrieval |
| `/forms/{id}` | DELETE | Cleanup (optional) |

## Troubleshooting

**Backend not running:**
```
✗ Backend is not running at http://localhost:8000
Please start the backend with: cd backend && uvicorn main:app --reload
```

**Missing dependencies:**
```bash
# Install jq (macOS)
brew install jq

# Install jq (Ubuntu)
sudo apt-get install jq
```

**API key not configured:**
The test will still pass with mock synthesis if `OPENROUTER_API_KEY` is not configured in the backend `.env` file.

## Future Enhancements

- [ ] Add Playwright browser automation tests
- [ ] Add multi-user scenarios (separate admin/participant)
- [ ] Test multi-round Delphi workflows
- [ ] Test follow-up questions and comments
- [ ] Performance benchmarking
- [ ] Integration with CI/CD pipeline

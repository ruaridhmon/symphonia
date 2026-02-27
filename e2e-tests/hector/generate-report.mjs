/**
 * Hector Report Generator
 *
 * Reads test-results.json + screenshots directory → generates report.html
 */
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = path.join(import.meta.dirname, 'screenshots');
const RESULTS_FILE = path.join(import.meta.dirname, 'test-results.json');
const REPORT_FILE = path.join(import.meta.dirname, 'report.html');

function generateReport() {
  // Read test results
  let results = null;
  if (fs.existsSync(RESULTS_FILE)) {
    results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
  }

  // Read screenshots
  let screenshots = [];
  if (fs.existsSync(SCREENSHOTS_DIR)) {
    screenshots = fs.readdirSync(SCREENSHOTS_DIR)
      .filter((f) => f.endsWith('.png'))
      .sort();
  }

  // Parse test results
  let testSuites = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;

  if (results?.suites) {
    function extractTests(suite, parentTitle = '') {
      const title = parentTitle ? `${parentTitle} > ${suite.title}` : suite.title;
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          totalTests++;
          const status = test.status || test.results?.[0]?.status || 'unknown';
          if (status === 'expected' || status === 'passed') passedTests++;
          else if (status === 'unexpected' || status === 'failed') failedTests++;
          else if (status === 'skipped') skippedTests++;

          testSuites.push({
            suite: title,
            test: spec.title,
            status,
            duration: test.results?.[0]?.duration || 0,
            error: test.results?.[0]?.error?.message || null,
          });
        }
      }
      for (const child of suite.suites || []) {
        extractTests(child, title);
      }
    }
    for (const suite of results.suites) {
      extractTests(suite);
    }
  }

  const now = new Date().toISOString();
  const statusEmoji = failedTests === 0 ? '✅' : '❌';
  const statusText = failedTests === 0 ? 'ALL TESTS PASSED' : `${failedTests} TEST(S) FAILED`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hector — Symphonia E2E Test Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f0f;
      color: #e0e0e0;
      line-height: 1.6;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; color: #fff; }
    h2 { font-size: 1.5rem; margin: 2rem 0 1rem; color: #fff; border-bottom: 1px solid #333; padding-bottom: 0.5rem; }
    h3 { font-size: 1.1rem; margin: 1.5rem 0 0.5rem; color: #ccc; }
    .subtitle { color: #888; margin-bottom: 2rem; }
    .summary-banner {
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      font-size: 1.2rem;
      font-weight: 600;
    }
    .summary-banner.pass { background: #0a2e0a; border: 1px solid #1a5c1a; color: #4caf50; }
    .summary-banner.fail { background: #2e0a0a; border: 1px solid #5c1a1a; color: #f44336; }
    .stats { display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap; }
    .stat {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 1rem 1.5rem;
      min-width: 120px;
    }
    .stat-value { font-size: 2rem; font-weight: 700; }
    .stat-label { font-size: 0.8rem; text-transform: uppercase; color: #888; }
    .stat.passed .stat-value { color: #4caf50; }
    .stat.failed .stat-value { color: #f44336; }
    .stat.skipped .stat-value { color: #ff9800; }
    .stat.total .stat-value { color: #2196f3; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
    th { text-align: left; padding: 0.75rem; background: #1a1a1a; border-bottom: 2px solid #333; font-size: 0.85rem; text-transform: uppercase; color: #888; }
    td { padding: 0.75rem; border-bottom: 1px solid #222; }
    tr:hover { background: #1a1a1a; }
    .status-pass { color: #4caf50; font-weight: 600; }
    .status-fail { color: #f44336; font-weight: 600; }
    .status-skip { color: #ff9800; }
    .error-msg { font-family: monospace; font-size: 0.8rem; color: #f44336; background: #1a0505; padding: 0.5rem; border-radius: 4px; margin-top: 0.25rem; max-width: 600px; overflow-x: auto; }

    .screenshots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }
    .screenshot-card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      overflow: hidden;
    }
    .screenshot-card img { width: 100%; display: block; cursor: pointer; }
    .screenshot-card img:hover { opacity: 0.9; }
    .screenshot-card .caption { padding: 0.5rem 0.75rem; font-size: 0.85rem; color: #aaa; }
    .fullscreen-overlay {
      display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.9); z-index: 1000; cursor: pointer;
      justify-content: center; align-items: center;
    }
    .fullscreen-overlay img { max-width: 95%; max-height: 95%; object-fit: contain; }
    .fullscreen-overlay.active { display: flex; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🛡️ Hector — Symphonia E2E Test Report</h1>
    <p class="subtitle">Generated: ${now}</p>

    <div class="summary-banner ${failedTests === 0 ? 'pass' : 'fail'}">
      ${statusEmoji} ${statusText}
    </div>

    <div class="stats">
      <div class="stat total"><div class="stat-value">${totalTests}</div><div class="stat-label">Total Tests</div></div>
      <div class="stat passed"><div class="stat-value">${passedTests}</div><div class="stat-label">Passed</div></div>
      <div class="stat failed"><div class="stat-value">${failedTests}</div><div class="stat-label">Failed</div></div>
      <div class="stat skipped"><div class="stat-value">${skippedTests}</div><div class="stat-label">Skipped</div></div>
    </div>

    <h2>Test Results</h2>
    <table>
      <thead>
        <tr><th>Suite</th><th>Test</th><th>Status</th><th>Duration</th></tr>
      </thead>
      <tbody>
        ${testSuites.map((t) => `
        <tr>
          <td>${t.suite}</td>
          <td>
            ${t.test}
            ${t.error ? `<div class="error-msg">${t.error.substring(0, 200)}</div>` : ''}
          </td>
          <td class="${t.status === 'expected' || t.status === 'passed' ? 'status-pass' : t.status === 'skipped' ? 'status-skip' : 'status-fail'}">
            ${t.status === 'expected' || t.status === 'passed' ? '✅ PASS' : t.status === 'skipped' ? '⏭ SKIP' : '❌ FAIL'}
          </td>
          <td>${(t.duration / 1000).toFixed(1)}s</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <h2>Screenshots (${screenshots.length})</h2>
    <div class="screenshots-grid">
      ${screenshots.map((s) => `
      <div class="screenshot-card">
        <img src="screenshots/${s}" alt="${s}" onclick="showFullscreen(this.src)" loading="lazy" />
        <div class="caption">${s.replace('.png', '').replace(/_/g, ' ')}</div>
      </div>`).join('')}
    </div>

    <div class="fullscreen-overlay" id="fullscreen" onclick="this.classList.remove('active')">
      <img id="fullscreen-img" src="" alt="Fullscreen" />
    </div>
  </div>
  <script>
    function showFullscreen(src) {
      document.getElementById('fullscreen-img').src = src;
      document.getElementById('fullscreen').classList.add('active');
    }
  </script>
</body>
</html>`;

  fs.writeFileSync(REPORT_FILE, html);
  console.log(`✅ Report generated: ${REPORT_FILE}`);
  console.log(`   ${totalTests} tests | ${passedTests} passed | ${failedTests} failed | ${skippedTests} skipped`);
  console.log(`   ${screenshots.length} screenshots`);
}

generateReport();

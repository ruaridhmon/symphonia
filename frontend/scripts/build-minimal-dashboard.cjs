const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

execFileSync(
  './node_modules/.bin/esbuild',
  ['src/legacy/minimalDashboard.ts', '--bundle', '--define:import.meta.env={}', '--format=esm', '--target=es2020', '--outfile=dist/minimal-dashboard.js'],
  { stdio: 'inherit' },
);

fs.copyFileSync('src/minimal-dashboard.css', 'dist/minimal-dashboard.css');

const js = fs.readFileSync('dist/minimal-dashboard.js', 'utf8');
if (js.includes('function cleanText(value:') || js.includes('<HTML')) {
  throw new Error('minimal-dashboard.js still contains TypeScript syntax');
}

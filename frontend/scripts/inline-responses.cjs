// Preserve the deployed app and participant-flow patches; version only this reader.
const fs = require('node:fs');
const {parse} = require('@babel/parser');
const {buildSync} = require('esbuild');
let code = fs.readFileSync('dist/assets/SummaryPage-workspace-v4.js', 'utf8');
function replaceOnce(from, to) {
  if (code.split(from).length !== 2) throw Error(`Expected one occurrence: ${from}`);
  code = code.replace(from, to);
}
replaceOnce('function hn({response:s,questions:t,onUpdated:a})', 'function hn({response:s,questions:t,onUpdated:a,roundNumber:responseRoundNumber})');
replaceOnce('renderResponseReading(o.createElement,t,N)', 'renderResponseReading(o.createElement,t,N,responseRoundNumber)');
replaceOnce('/response-workspace.js?v=1', '/response-workspace.js?v=2');
replaceOnce('/response-reading.js?v=1', '/response-reading.js?v=3');
parse(code, {sourceType:'module'});
fs.writeFileSync('dist/assets/SummaryPage-workspace-v5.js', code);
for (const [entry,outfile] of [['responseWorkspace','response-workspace'],['responseReading','response-reading']]) {
  buildSync({entryPoints:[`src/utils/${entry}.ts`], outfile:`dist/${outfile}.js`, bundle:true, format:'esm', target:'es2022'});
}
fs.copyFileSync('src/response-reading.css', 'dist/response-reading.css');
const html = fs.readFileSync('dist/index.html', 'utf8')
  .replace('/assets/SummaryPage-workspace-v4.js', '/assets/SummaryPage-workspace-v5.js')
  .replace('/response-reading.css?v=2', '/response-reading.css?v=3');
fs.writeFileSync('dist/index.html', html);

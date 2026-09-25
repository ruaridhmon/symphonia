// Change only the maintained summary header; retain all deployed participant/API patches.
const fs = require('node:fs');
const {parse} = require('@babel/parser');
const {buildSync} = require('esbuild');
let code = fs.readFileSync('dist/assets/SummaryPage-workspace-v5.js', 'utf8');
const ast = parse(code, {sourceType: 'module'});
let header;
function walk(n) {
  if (!n || typeof n !== 'object') return;
  if (n.type === 'CallExpression' && n.arguments[0]?.value === 'section' && code.slice(n.start, n.end).includes('summary-workspace-select')) header = n;
  for (const [k, value] of Object.entries(n)) {
    if (k === 'loc') continue;
    if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value);
  }
}
walk(ast);
if (!header || !code.slice(header.start, header.end).includes('children:C.title')) throw Error('Expected deployed header shape');
const replacement = 'o.createElement(ConsultationWorkspace,{form:C,rounds:L,responses:M,selectedRoundId:H?.id||null,view:S,onView:zt,onRound:It,onMakeLive:Mt,makingLiveId:St})';
code = code.slice(0, header.start) + replacement + code.slice(header.end);
code = 'import {createConsultationWorkspace} from "/consultation-workspace.js?v=1";const ConsultationWorkspace=createConsultationWorkspace(o);' + code;
code = code.replace('/response-workspace.js?v=2','/response-workspace.js?v=3').replace('/response-reading.js?v=3','/response-reading.js?v=4');
parse(code, {sourceType: 'module'});
fs.writeFileSync('dist/assets/SummaryPage-workspace-v6.js', code);
for (const [entry, outfile] of [['src/utils/consultationWorkspace.ts','consultation-workspace'],['src/legacy/productUI.ts','product-ui'],['src/utils/responseWorkspace.ts','response-workspace'],['src/utils/responseReading.ts','response-reading'],['src/legacy/delphiDemo.ts','delphi-demo']]) {
  buildSync({entryPoints:[entry], outfile:`dist/${outfile}.js`, bundle:true, format:'esm', target:'es2022'});
}
fs.copyFileSync('src/workspace.css','dist/workspace.css');
let html = fs.readFileSync('dist/index.html','utf8').replace('SummaryPage-workspace-v5.js','SummaryPage-workspace-v6.js').replace('/product-ui.js?v=8','/product-ui.js?v=9').replace('/delphi-demo.js?v=4','/delphi-demo.js?v=5');
if (!html.includes('/workspace.css')) html = html.replace('</head>','<link rel="stylesheet" href="/workspace.css?v=1" />\n</head>');
fs.writeFileSync('dist/index.html',html);

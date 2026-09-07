// Preserve the deployed mirror's participant fixes; version only the summary chunk.
const fs = require('node:fs');
const { parse } = require('@babel/parser');
const input = 'dist/assets/SummaryPage-nowaffle-delphi-v2.js';
let code = fs.readFileSync(input, 'utf8');
const ast = parse(code, { sourceType: 'module' });
const edits = [];
function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression' && node.callee?.object?.name === 'e' && node.arguments[0]?.value === 'div') {
    const props = node.arguments[1]?.properties || [];
    const cls = props.find(p => p.key?.name === 'className')?.value?.value;
    const text = code.slice(node.start, node.end);
    let title, sub;
    if (cls === 'card p-4' && text.includes('id:"model-select"')) {
      title = 'Generate synthesis'; sub = 'Model, method and instructions';
    } else if (cls === 'card p-3' && text.includes('Compare Versions')) {
      title = 'Version history'; sub = 'Review drafts and published versions';
    }
    if (title) edits.push({start:node.start,end:node.end,text:`e.jsxs("details",{className:"summary-disclosure",children:[e.jsxs("summary",{children:[e.jsx("span",{children:${JSON.stringify(title)}}),e.jsx("small",{children:${JSON.stringify(sub)}})]}),${text}]})`});
  }
  for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
}
visit(ast);
if (edits.length !== 2) throw new Error(`Expected two panels, found ${edits.length}`);
for (const edit of edits.sort((a,b)=>b.start-a.start)) code = code.slice(0,edit.start)+edit.text+code.slice(edit.end);
parse(code,{sourceType:'module'});
fs.writeFileSync('dist/assets/SummaryPage-nowaffle-delphi-v3.js',code);

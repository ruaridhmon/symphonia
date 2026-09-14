// Replace only the legacy response workspace; retain the app's React, editor and API.
const fs=require('node:fs');const {parse}=require('@babel/parser');const generate=require('@babel/generator').default;const t=require('@babel/types');
const ast=parse(fs.readFileSync('dist/assets/SummaryPage-product-v1.js','utf8'),{sourceType:'module'});
const fn=ast.program.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='Rn');
if(!fn||!generate(fn).code.includes('onResponseDeleted')||!generate(fn).code.includes('rt('))throw Error('Response workspace changed; inspect before patching');
const replacement=parse('function Rn(props){return o.createElement(SharedResponseWorkspace,props);}').program.body[0];Object.assign(fn,replacement);
ast.program.body.unshift(...parse('import {createResponseWorkspace} from "/response-workspace.js?v=1";const SharedResponseWorkspace=createResponseWorkspace(o,hn,rt);',{sourceType:'module'}).program.body);
let calls=0;
function visit(n){if(!n||typeof n!=='object')return;if(n.type==='CallExpression'&&n.arguments?.[0]?.name==='Rn'&&n.arguments[1]?.type==='ObjectExpression'){n.arguments[1].properties.push(t.objectProperty(t.identifier('initialRoundId'),t.optionalMemberExpression(t.identifier('H'),t.identifier('id'),false,true)));calls++;}for(const v of Object.values(n))if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v);}
visit(ast);if(calls!==1)throw Error('Expected one response workspace');
const code=generate(ast,{compact:true,comments:false}).code;parse(code,{sourceType:'module'});fs.writeFileSync('dist/assets/SummaryPage-workspace-v2.js',code);
const path='dist/index.html';let html=fs.readFileSync(path,'utf8').replace('"/assets/SummaryPage-product-v1.js"','"/assets/SummaryPage-workspace-v2.js"');fs.writeFileSync(path,html);

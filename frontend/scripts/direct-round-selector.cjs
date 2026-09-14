const fs=require('node:fs'),{parse}=require('@babel/parser');
const input='dist/assets/SummaryPage-workspace-v3.js';let code=fs.readFileSync(input,'utf8');
const ast=parse(code,{sourceType:'module'});const component=ast.program.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='An');
if(!component||!code.slice(component.start,component.end).includes('onMakeRoundLive'))throw Error('Legacy round selector changed');
code=code.slice(0,component.start)+'function An(props){return o.createElement(DirectRoundSelector,props)}'+code.slice(component.end);
code='import {createRoundSelector} from "/round-selector.js?v=1";const DirectRoundSelector=createRoundSelector(o);'+code;
parse(code,{sourceType:'module'});fs.writeFileSync('dist/assets/SummaryPage-workspace-v4.js',code);
const index=fs.readFileSync('dist/index.html','utf8').replace('SummaryPage-workspace-v3.js','SummaryPage-workspace-v4.js').replace('product.css?v=10','product.css?v=11');fs.writeFileSync('dist/index.html',index);

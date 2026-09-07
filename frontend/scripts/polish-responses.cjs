const fs=require('node:fs');const {parse}=require('@babel/parser');
let code=fs.readFileSync('dist/assets/SummaryPage-nowaffle-delphi-v3.js','utf8');
const marker='function hn({response:s,questions:t,onUpdated:a})';
const start=code.indexOf(marker);if(start<0)throw Error('Expected response component missing');
const pos=code.indexOf('return d?e.jsxs',start);if(pos<0)throw Error('Expected response view switch missing');
code=code.slice(0,pos)+'if(!d)return o.createElement("div",null,!L?o.createElement("button",{type:"button",className:"rr-edit",onClick:Q},"Edit response"):null,renderResponseReading(o.createElement,t,N));'+code.slice(pos);
code='import {renderResponseReading} from "/response-reading.js?v=1";'+code;
parse(code,{sourceType:'module'});
fs.writeFileSync('dist/assets/SummaryPage-responses-v4.js',code);

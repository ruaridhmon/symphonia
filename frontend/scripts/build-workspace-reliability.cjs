const fs=require('node:fs'),{parse}=require('@babel/parser'),{buildSync}=require('esbuild');
buildSync({entryPoints:['src/utils/presenceConnection.ts'],outfile:'dist/presence-connection.js',bundle:true,format:'esm',target:'es2022'});
let presence=fs.readFileSync('dist/assets/usePresence-BfEGXJQP.js','utf8');
const ast=parse(presence,{sourceType:'module'});const hook=ast.program.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='L');
if(!hook)throw Error('Presence hook not found');
presence='import {createPresenceHook} from "/presence-connection.js?v=1";'+presence.slice(0,hook.start)+'const L=createPresenceHook(n,C);'+presence.slice(hook.end);
fs.writeFileSync('dist/assets/usePresence-workspace-v1.js',presence);
let entry=fs.readFileSync('dist/assets/index-product-v1.js','utf8');
const from='throw o instanceof TypeError&&(n||et("csrf_token"))?(U(),new M(0,"Network error — possible session expiry. Redirecting to login.")):new M(0,o instanceof Error?o.message:"Network request failed");';
if(!entry.includes(from))throw Error('Expected network error handler');
entry=entry.replace(from,'throw new M(0,"Connection interrupted. Please try again when you are online.");');
entry=entry.replace('U(),new M(401,"Unexpected HTML response — possible session expiry.")','new M(502,"The server returned an unexpected page. Please try again.")');
parse(entry,{sourceType:'module'});fs.writeFileSync('dist/assets/index-workspace-v1.js',entry);
let html=fs.readFileSync('dist/index.html','utf8');
html=html.replace(/<script type="importmap">(.*?)<\/script>/,(_,json)=>{
 const map=JSON.parse(json);map.imports['/assets/index-HJquNmhn.js']='/assets/index-workspace-v1.js';map.imports['/assets/index-product-v1.js']='/assets/index-workspace-v1.js';map.imports['/assets/usePresence-BfEGXJQP.js']='/assets/usePresence-workspace-v1.js';return '<script type="importmap">'+JSON.stringify(map)+'</script>';
});
html=html.replace('crossorigin src="/assets/index-product-v1.js"','crossorigin src="/assets/index-workspace-v1.js"');fs.writeFileSync('dist/index.html',html);

buildSync({entryPoints:['src/utils/submissionReceipt.ts'],outfile:'dist/submission-receipt.js',bundle:true,format:'esm',target:'es2022'});
let waiting=fs.readFileSync('dist/assets/WaitingPage-GQ0ySdHf.js','utf8');
const waitingAst=parse(waiting,{sourceType:'module'}),waitingFn=waitingAst.program.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='z');
if(!waitingFn)throw Error('Waiting page changed');
waiting='import {createSubmissionReceipt} from "/submission-receipt.js?v=1";import {b as receiptApi} from "./index-HJquNmhn.js";const Receipt=createSubmissionReceipt(l,receiptApi.get);'+waiting.slice(0,waitingFn.start)+'function z(){const navigate=x(),context=u().state||{};g("Response submitted");return l.createElement(Receipt,{navigate,context});}'+waiting.slice(waitingFn.end);
parse(waiting,{sourceType:'module'});fs.writeFileSync('dist/assets/WaitingPage-workspace-v1.js',waiting);
html=fs.readFileSync('dist/index.html','utf8').replace(/<script type="importmap">(.*?)<\/script>/,(_,json)=>{const map=JSON.parse(json);map.imports['/assets/WaitingPage-GQ0ySdHf.js']='/assets/WaitingPage-workspace-v1.js';return '<script type="importmap">'+JSON.stringify(map)+'</script>';});fs.writeFileSync('dist/index.html',html);

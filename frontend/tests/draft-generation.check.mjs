import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {parse} from '@babel/parser';
const code=readFileSync(new URL('../dist/assets/SummaryPage-workspace-v54.js',import.meta.url),'utf8');
function find(node,predicate){if(!node||typeof node!=='object')return; if(predicate(node))return node;for(const value of Object.values(node)){for(const child of Array.isArray(value)?value:[value]){const found=find(child,predicate);if(found)return found;}}}
const generate=find(parse(code,{sourceType:'module'}),n=>n.type==='FunctionDeclaration'&&n.id?.name==='Xe');
test('starts model request immediately without waiting for version history; blocks repeat clicks',()=>{
 let requests=0;
 const state={J:{id:4},ie:'fast-model',n:77,ge:false,le:[],ss:x=>x,Ie:()=>{},Me:v=>{state.ge=v},G:()=>{},W:()=>{},ye:()=>{},de:()=>{},je:()=>{},ue:()=>{},l:()=>{},ys:()=>{throw Error('Generation must not fetch history first')},Pr:()=>{requests++;return new Promise(()=>{})}};
 vm.createContext(state);vm.runInContext(code.slice(generate.start,generate.end),state);
 state.Xe();assert.equal(state.ge,true);assert.equal(requests,1);
 state.Xe();assert.equal(requests,1);
});
test('primary editor receives generation state and disables its button',()=>{
 assert.match(code,/onGenerate:Xe,isGenerating:ge,editor:X/);
 assert.match(code,/onClick:d,disabled:generating,children:generating\?"Generating…":"Generate draft"/);
});

test('finishes as soon as the saved draft arrives, while metadata refresh is pending',async()=>{
 const state={J:{id:4},ie:'fast-model',n:77,ge:false,le:[],ss:x=>x,Ie:()=>{},Me:v=>{state.ge=v},G:()=>{},W:()=>{},ye:()=>{},de:()=>{},je:()=>{},ue:()=>{},l:message=>{throw Error(message)},X:null,R:null,T:null,Q:()=>{},Pr:async()=>({synthesis:'<p>Saved draft</p>',synthesis_json:{}}),ne:()=>new Promise(()=>{}),oe:()=>{throw Error('Redundant history refresh')},ce:()=>{state.ge=false},setTimeout:()=>{}};
 vm.createContext(state);vm.runInContext(code.slice(generate.start,generate.end),state);
 await state.Xe();assert.equal(state.ge,false);
});

test('honors an explicitly selected model on dev while retaining a fast initial default',()=>{
 const node=find(parse(code,{sourceType:'module'}),n=>n.type==='FunctionDeclaration'&&n.id?.name==='ss');
 const state={window:{location:{hostname:'symphonia-dev-488613.web.app'}},os:['fast-default'],Dn:()=>false};
 vm.createContext(state);vm.runInContext(code.slice(node.start,node.end),state);
 assert.equal(state.ss('selected-model'), 'fast-default');
 assert.equal(state.ss('selected-model',true), 'selected-model');
 assert.match(code,/async function Xe\(\)\{const r=J,x=ss\(ie,!0\)/);
});

test('a saved draft refreshes the maintained claim view immediately',async()=>{
 const {JSDOM}=await import('jsdom');
 const dom=new JSDOM('<main><div class="card"><h2>Round 1 synthesis</h2></div></main>',{url:'https://symphonia-dev-488613.web.app/admin/form/77/summary'});
 const context={window:dom.window,document:dom.window.document,location:dom.window.location,MutationObserver:dom.window.MutationObserver,ResizeObserver:class{observe(){}disconnect(){}},setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,console};
 vm.createContext(context);
 let progress=readFileSync(new URL('../dist/delphi-progress.js',import.meta.url),'utf8').replace(/export\s*\{[^}]*\};?\s*$/,'');
 vm.runInContext(progress,context);
 const graph=text=>({version:1,claims:[{id:'claim_1',text,origin:'explicit',sources:[]}],claim_edges:[],flows:[],rejected_flow_count:0});
 context.oldGraph=graph('Old claim');
 vm.runInContext('key="77";lastFetch=Date.now();revision+=1;cache={rounds:[{id:196,round_number:1,questions:["Question"],synthesis_json:{reasoning_graph:oldGraph}}],responses:[]};render();',context);
 assert.match(dom.window.document.body.textContent,/Old claim/);
 dom.window.dispatchEvent(new dom.window.CustomEvent('symphonia:draft-saved',{detail:{formId:77,roundId:196,synthesis:'Saved draft',synthesis_json:{narrative:'Saved draft',reasoning_graph:graph('New claim')}}}));
 assert.match(dom.window.document.body.textContent,/New claim/);
 assert.doesNotMatch(dom.window.document.body.textContent,/Old claim/);
 dom.window.dispatchEvent(new dom.window.CustomEvent('symphonia:draft-error',{detail:{formId:77,message:'Opening claims are fixed once review starts.'}}));
 assert.equal(dom.window.document.querySelector('[role=alert]').textContent,'Opening claims are fixed once review starts.');
 dom.window.dispatchEvent(new dom.window.CustomEvent('symphonia:draft-start'));
 assert.equal(dom.window.document.querySelector('[role=alert]'),null);
 dom.window.close();
});


test('four current models preserve Claude and reject stale stored model IDs', async()=>{
 const {SYNTHESIS_MODELS,normalizeSynthesisModel}=await import('../dist/synthesis-models.js');
 assert.equal(SYNTHESIS_MODELS.length,4);
 assert.equal(new Set(SYNTHESIS_MODELS.map(m=>m.id)).size,4);
 for(const model of SYNTHESIS_MODELS)assert.equal(normalizeSynthesisModel(model.id),model.id);
 assert.equal(normalizeSynthesisModel('openai/gpt-4o'),SYNTHESIS_MODELS[0].id);
 assert.equal(normalizeSynthesisModel('google/gemini-2.5-flash-lite'),SYNTHESIS_MODELS[0].id);
 assert.equal(normalizeSynthesisModel('anthropic/claude-opus-5.5'),'anthropic/claude-opus-5.5');
});

test('maintained publishing commits loaded content without reloading history or the consultation',()=>{
 const ast=parse(code,{sourceType:'module'});
 const node=find(ast,n=>n.type==='VariableDeclarator'&&n.id?.name==='versionPublisher');
 assert.ok(node);
 const published=node.init.arguments[0].properties.find(p=>p.key?.name==='onPublished').value;
 const state={le:[{id:1,is_active:true},{id:2,is_active:false}],selected:null,rounds:[{id:4,synthesis:'Old'}],round:{id:4,synthesis:'Old'},J:{id:4,is_active:false},X:null,n:79,i:()=>{},Ls:fn=>{state.le=fn(state.le)},Ke:id=>{state.selected=id},Q:fn=>{state.rounds=fn(state.rounds)},j:fn=>{state.round=fn(state.round)},z:()=>{},applyPublishedVersion:(r,v)=>r.id===v.round_id?{...r,synthesis:v.synthesis,synthesis_json:v.synthesis_json}:r,window:{dispatchEvent:()=>{}},CustomEvent:class{},ne:()=>{throw Error('Full consultation reload')},oe:()=>{throw Error('History reload')}};
 vm.createContext(state);
 const callback=vm.runInContext('('+code.slice(published.start,published.end)+')',state);
 callback({id:2,round_id:4,version:2,synthesis:'Saved'},true);
 assert.equal(state.selected,2);
 assert.equal(state.le.find(v=>v.id===2).is_active,true);
 assert.equal(state.le.find(v=>v.id===1).is_active,false);
 assert.equal(state.round.synthesis,'Saved');
 assert.equal(state.rounds[0].synthesis,'Saved');
 assert.match(code,/onActivateVersion:Js,publishingVersionId:versionPublisher.pendingId/);
 assert.match(code,/loading:pendingId===u.id,loadingText:"Publishing…",disabled:pendingId!=null/);
});

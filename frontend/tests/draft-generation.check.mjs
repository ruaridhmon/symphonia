import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {parse} from '@babel/parser';
const code=readFileSync(new URL('../dist/assets/SummaryPage-workspace-v47.js',import.meta.url),'utf8');
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

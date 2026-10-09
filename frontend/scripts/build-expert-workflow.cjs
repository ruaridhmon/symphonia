// Build shared logic while keeping all existing app/React/auth and participant patches.
const fs=require('node:fs'),{build,buildSync}=require('esbuild'),{parse}=require('@babel/parser');
const shim={react:'import {r as React} from "/assets/vendor-react-D3EY6NCv.js";export default React;export const {useState,useEffect,useMemo,useRef,useCallback,useId,createElement,Fragment}=React;', 'react/jsx-runtime':'import {j} from "/assets/vendor-markdown-B7eG3c64.js";export const {jsx,jsxs,Fragment}=j;',api:'export {b as api,g as getApiErrorDetail} from "/assets/index-HJquNmhn.js";'};
(async()=>{
const manualShim = {
  react: 'import {r as React} from "/assets/vendor-react-D3EY6NCv.js";export default React;export const {useState,useEffect,useMemo,useRef,useCallback,useLayoutEffect,useContext,useReducer,useId,createElement,createContext,forwardRef,memo,Fragment,Children,cloneElement,isValidElement,Component,PureComponent,useImperativeHandle,useSyncExternalStore,startTransition,useTransition,useDeferredValue,StrictMode,useDebugValue,version,createRef}=React;',
  'react-dom': 'import {b as ReactDOM} from "/assets/vendor-react-D3EY6NCv.js";export default ReactDOM;export const {createPortal,flushSync}=ReactDOM;',
  'react/jsx-runtime': 'import {j} from "/assets/vendor-markdown-B7eG3c64.js";export const {jsx,jsxs,Fragment}=j;',
  api: 'export {b as api,g as getApiErrorDetail} from "/assets/index-HJquNmhn.js";',
};

await build({entryPoints:['src/components/summary/ManualResponseSheet.tsx'],outfile:'dist/manual-response-sheet.js',bundle:true,format:'esm',target:'es2022',minify:true,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','import.meta.env':'{}'},plugins:[{name:'host-singletons',setup(b){
  b.onResolve({filter:/^\/assets\//},args=>({path:args.path,external:true}));
  b.onResolve({filter:/^(react|react\/jsx-runtime|react-dom)$/},args=>({path:args.path,namespace:'host'}));
  b.onResolve({filter:/api\/client$/},()=>({path:'api',namespace:'host'}));
  b.onLoad({filter:/.*/,namespace:'host'},args=>({contents:manualShim[args.path],loader:'js'}));
}}]});

 shim['react-dom']=manualShim['react-dom'];
 await build({entryPoints:['src/components/summary/FinalSynthesisPanel.tsx'],outfile:'dist/final-synthesis.js',bundle:true,format:'esm',target:'es2022',minify:true,jsx:'automatic',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'host',setup(b){b.onResolve({filter:/^\/assets\//},a=>({path:a.path,external:true}));b.onResolve({filter:/^(react|react\/jsx-runtime|react-dom)$/},a=>({path:a.path,namespace:'host'}));b.onResolve({filter:/api\/client$/},()=>({path:'api',namespace:'host'}));b.onLoad({filter:/.*/,namespace:'host'},a=>({contents:shim[a.path],loader:'js'}));}}]});
 for(const [entry,name] of [['src/utils/responseWorkspace.ts','response-workspace'],['src/utils/consultationWorkspace.ts','consultation-workspace'],['src/utils/delphiRoundTwo.ts','claim-review'],['src/legacy/delphiProgress.ts','delphi-progress'],['src/legacy/productUI.ts','product-ui'],['src/legacy/delphiDemo.ts','delphi-demo']])buildSync({entryPoints:[entry],outfile:`dist/${name}.js`,bundle:true,format:'esm',target:'es2022',loader:{'.css':'empty'}});
 await build({entryPoints:['src/components/summary/AISynthesisPanel.tsx'],outfile:'dist/grounded-generation.js',bundle:true,format:'esm',target:'es2022',minify:true,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'host',setup(b){b.onResolve({filter:/^\/assets\//},a=>({path:a.path,external:true}));b.onResolve({filter:/^(react|react\/jsx-runtime)$/},a=>({path:a.path,namespace:'host'}));b.onLoad({filter:/.*/,namespace:'host'},a=>({contents:shim[a.path],loader:'js'}));}}]});
 await build({entryPoints:['src/utils/versionComparison.ts'],outfile:'dist/version-comparison.js',bundle:true,format:'esm',target:'es2022'});
 await build({entryPoints:['src/utils/synthesisModels.ts'],outfile:'dist/synthesis-models.js',bundle:true,format:'esm',target:'es2022'});
 await build({entryPoints:['src/AdminSettings.tsx'],outfile:'dist/assets/AdminSettings-workspace-v1.js',bundle:true,format:'esm',target:'es2022',minify:true,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','import.meta.env':'{}'},plugins:[{name:'settings-host',setup(b){
   b.onResolve({filter:/^\/assets\//},a=>({path:a.path,external:true}));
   b.onResolve({filter:/layouts\/Container$/},()=>({path:'container',namespace:'host'}));
   b.onResolve({filter:/\/components$/},()=>({path:'components',namespace:'host'}));
   b.onResolve({filter:/hooks\/useDocumentTitle$/},()=>({path:'title',namespace:'host'}));
   b.onResolve({filter:/^(react|react\/jsx-runtime)$/},a=>({path:a.path,namespace:'host'}));
   b.onResolve({filter:/api\/client$/},()=>({path:'api',namespace:'host'}));
   b.onResolve({filter:/AuthContext$/},()=>({path:'auth',namespace:'host'}));
   b.onLoad({filter:/.*/,namespace:'host'},a=>({contents:a.path==='container'?'export {C as default} from "/assets/Container-iJHOlK7N.js";':a.path==='components'?'export {L as LoadingButton} from "/assets/LoadingButton-BY3_YyQC.js";export {B as BackLink} from "/assets/BackLink-DhQy02Z6.js";':a.path==='title'?'export {u as useDocumentTitle} from "/assets/useDocumentTitle-CGW9c1LF.js";':a.path==='auth'?'export {a as useAuth} from "/assets/index-HJquNmhn.js";':a.path==='react'?manualShim.react:shim[a.path],loader:'js'}));
 }}]});
 await build({entryPoints:['src/utils/useVersionPublisher.ts'],outfile:'dist/version-publisher.js',bundle:true,format:'esm',target:'es2022',plugins:[{name:'publisher-host',setup(b){b.onResolve({filter:/^react$/},a=>({path:a.path,namespace:'host'}));b.onResolve({filter:/^\/assets\//},a=>({path:a.path,external:true}));b.onLoad({filter:/.*/,namespace:'host'},()=>({contents:shim.react,loader:'js'}));}}]});
 let code=fs.readFileSync('dist/assets/SummaryPage-workspace-v9.js','utf8');
 const oldPublish='async function Js(r){try{await Fr(r),H&&(await oe(H.id)),await ne();}catch(x){l(x.message||"Failed to activate version");}}';
 if(!code.includes(oldPublish))throw Error('Unsupported maintained version publisher');
 code=code.replace(oldPublish,`const versionPublisher=useVersionPublisher({versions:le,roundId:J?.id??null,activate:Fr,onPublished:(version,current)=>{if(current){Ls(prev=>prev.map(v=>({...v,is_active:v.id===version.id})));Ke(version.id);}Q(prev=>prev.map(r=>applyPublishedVersion(r,version)));j(prev=>prev?applyPublishedVersion(prev,version):prev);z(prev=>prev?applyPublishedVersion(prev,version):prev);if(current&&J?.is_active&&X)Ue(version.synthesis||"");window.dispatchEvent(new CustomEvent("symphonia:draft-saved",{detail:{formId:n,roundId:version.round_id,synthesis:version.synthesis||"",synthesis_json:version.synthesis_json}}));i(\`Version \${version.version} published.\`);},onError:l});const Js=versionPublisher.publish;`);
 code=code.replace('onActivateVersion:n,showCompare:l','onActivateVersion:n,publishingVersionId:pendingId,showCompare:l');
 code=code.replace('onClick:()=>n(u.id),className:"w-full",children:["Publish v",u.version]','onClick:()=>n(u.id),loading:pendingId===u.id,loadingText:"Publishing…",disabled:pendingId!=null,className:"w-full",children:["Publish v",u.version]');
 code=code.replace('onActivateVersion:Js,','onActivateVersion:Js,publishingVersionId:versionPublisher.pendingId,');
 code='import {useVersionPublisher,applyPublishedVersion} from "/version-publisher.js?v=1";'+code;

 const previousComparison='u=d.length>=2?d[d.length-2].id:d[0]?.id??null,n=t??(d.length>=1?d[d.length-1].id:null)';
 if(code.split(previousComparison).length!==2)throw Error('Unsupported maintained comparison defaults');
 code=code.replace(previousComparison,'{leftId:u,rightId:n}=versionComparisonDefaults(s,t)');
 code='import {versionComparisonDefaults} from "/version-comparison.js?v=1";'+code;
 const modelTree=parse(code,{sourceType:'module'}).program.body;
 const modelEdits=[];
 for(const statement of modelTree){
   if(statement.type==='VariableDeclaration')for(const decl of statement.declarations){
     if(decl.id.name==='os')modelEdits.push({start:decl.init.start,end:decl.init.end,text:'SYNTHESIS_MODELS.map(model=>model.id)'});
     if(decl.id.name==='ct')modelEdits.push({start:decl.init.start,end:decl.init.end,text:'Object.fromEntries(SYNTHESIS_MODELS.map(model=>[model.id,model.label]))'});
     if(decl.id.name==='kn')modelEdits.push({start:decl.init.start,end:decl.init.end,text:'Object.fromEntries(SYNTHESIS_MODELS.map(model=>[model.id,model.id]))'});
   }
   if(statement.type==='FunctionDeclaration'&&statement.id.name==='Dn')modelEdits.push({start:statement.start,end:statement.end,text:'function Dn(model){return !os.includes(model);}'});
 }
 if(modelEdits.length!==4)throw Error('Unsupported maintained model catalog');
 for(const edit of modelEdits.sort((a,b)=>b.start-a.start))code=code.slice(0,edit.start)+edit.text+code.slice(edit.end);
 code=code.replace('!s||Dn()?os[0]:s','!s||Dn(s)?os[0]:s');

 const generator=parse(code,{sourceType:'module'}).program.body.filter(n=>n.type==='FunctionDeclaration'&&code.slice(n.start,n.end).includes('Thorough analysis'));
 if(generator.length!==1)throw Error('Unsupported maintained generator shape');
 const node=generator[0];
 code=code.slice(0,node.start)+`function ${node.id.name}(props){return o.createElement(GroundedSynthesisGenerator,props);}`+code.slice(node.end);
 const oldRequest='const V=Le.length>0?"question_summaries":g,Y=await Pr(n,r.id,{model:x,strategy:V,n_analysts:ws,mode:"human_only",prompt:V==="question_summaries"?$:V==="custom"?localStorage.getItem("symphonia-custom-synthesis-prompt:"+location.pathname)||"":void 0})';
 if(!code.includes(oldRequest))throw Error('Unsupported maintained generation request');
 code=code.replace(oldRequest,'const V="grounded",Y=await Pr(n,r.id,{model:x,strategy:V,mode:"human_only"});if(typeof window!=="undefined"&&typeof Y.synthesis==="string")window.dispatchEvent(new CustomEvent("symphonia:draft-saved",{detail:{formId:n,roundId:r.id,synthesis:Y.synthesis,synthesis_json:Y.synthesis_json}}))');
 if(!code.includes('function ss(s){return typeof window'))throw Error('Unsupported maintained model selector');
 code=code.replace('function ss(s){return typeof window','function ss(s,explicit=!1){return !explicit&&typeof window');
 code=code.replace('async function Xe(){const r=J,x=ss(ie);','async function Xe(){const r=J,x=ss(ie,!0);');
 const latencyStart='if(!n||!x||!r)return;x!==ie&&Ie(x);let p=!1,h=0;try{h=(await ys(n,r.id)).length;}catch{}Me(!0),G(g==="custom"?"generating":"preparing"),W(g==="custom"?2:0)';
 if(!code.includes(latencyStart))throw Error('Unsupported maintained generation start');
 code=code.replace(latencyStart,'if(ge)return;if(!n||!x||!r){l("The consultation is still loading. Please try again.");return;}x!==ie&&Ie(x);let p=!1,h=le.length;if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("symphonia:draft-start"));Me(!0),G("generating"),W(1)');
 code=code.replace('canGenerate:a=!1,onGenerate:d,editor:u','canGenerate:a=!1,onGenerate:d,isGenerating:generating=!1,editor:u');
 code=code.replace('onClick:d,children:"Generate draft"','onClick:d,disabled:generating,children:generating?"Generating…":"Generate draft"');
 code=code.replaceAll('canGenerate:Ye>0,onGenerate:Xe,editor:X','canGenerate:Ye>0,onGenerate:Xe,isGenerating:ge,editor:X');
 const oldCompletion='await ne(),r&&(await oe(r.id)),G("complete"),W(4),ce(),setTimeout';
 if(!code.includes(oldCompletion))throw Error('Unsupported maintained generation completion');
 code=code.replace(oldCompletion,'G("complete"),W(4),ce(),void ne(),setTimeout');
 code=code.replace('const Y=V.message||"Failed to generate synthesis"','const Y=draftError(V);if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("symphonia:draft-error",{detail:{formId:n,message:Y}}))');
 code=code.replace('e.jsx(Xr,{stage:K,step:ae,totalSteps:Te,visible:ge||K==="complete",elapsedSeconds:$e,estimateSeconds:he})','ge?e.jsx("p",{role:"status",children:"Writing draft…"}):null');
 const errorModule=buildSync({entryPoints:['src/utils/draftError.ts'],bundle:true,format:'esm',write:false}).outputFiles[0].text;
 fs.writeFileSync('dist/draft-error.js',errorModule);
 code='import {SYNTHESIS_MODELS} from "/synthesis-models.js?v=1";'+code;
 code='import {draftError} from "/draft-error.js?v=1";'+code;
 code='import GroundedSynthesisGenerator from "/grounded-generation.js?v=2";'+code;
 const host='const ConsultationWorkspace=createConsultationWorkspace(o,ManualResponseSheet);';
 if(!code.includes(host))throw Error('Unsupported maintained summary shape');
 code='import FinalSynthesisPanel from "/final-synthesis.js?v=25";'+code.replace(host,'const ConsultationWorkspace=createConsultationWorkspace(o,ManualResponseSheet,FinalSynthesisPanel);').replace('/manual-response-sheet.js?v=2','/manual-response-sheet.js?v=7').replace('/consultation-workspace.js?v=2','/consultation-workspace.js?v=36').replace('/response-workspace.js?v=4','/response-workspace.js?v=5');parse(code,{sourceType:'module'});fs.writeFileSync('dist/assets/SummaryPage-workspace-v63.js',code);
 const feedbackHelper=buildSync({entryPoints:['src/utils/delphiFeedback.ts'],bundle:true,format:'iife',globalName:'SymphoniaDelphiFeedback',write:false}).outputFiles[0].text;fs.writeFileSync('dist/delphi-round-two-ui.js',feedbackHelper+'\n'+fs.readFileSync('src/legacy/delphiRoundSetup.js','utf8'));fs.copyFileSync('src/workspace.css','dist/workspace.css');fs.copyFileSync('src/reasoning-flow.css','dist/reasoning-flow.css');
 let html=fs.readFileSync('dist/index.html','utf8').replace(/\/assets\/SummaryPage-workspace-v(?:9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36|37|38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55|56|57|58|59|60|61|62)\.js/,'/assets/SummaryPage-workspace-v63.js').replace(/\/workspace\.css\?v=\d+/,'/workspace.css?v=55').replace(/\/minimal-dashboard\.js\?v=\d+/,'/minimal-dashboard.js?v=15');
 for(const name of ['delphi-progress','product-ui','delphi-demo','delphi-round-two-ui'])html=html.replace(new RegExp(`/${name}\\.js\\?v=[^"']+`,'g'),`/${name}.js?v=${name==='delphi-round-two-ui'?'workflow-10':name==='delphi-progress'?'workflow-30':name==='product-ui'?'workflow-32':'workflow-27'}`);
 html=html.replace('"/assets/AdminSettings-CGsTm0hx.js":"/assets/AdminSettings-workspace-v1.js",','');
 html=html.replace('"imports":{','"imports":{"/assets/AdminSettings-CGsTm0hx.js":"/assets/AdminSettings-workspace-v1.js",');
 html=html.replace(/\/minimal-dashboard\.css\?v=\d+/,'/minimal-dashboard.css?v=14');
 fs.writeFileSync('dist/index.html',html);
})().catch(e=>{console.error(e);process.exitCode=1;});

// Build shared logic while keeping all existing app/React/auth and participant patches.
const fs=require('node:fs'),{build,buildSync}=require('esbuild'),{parse}=require('@babel/parser');
const shim={react:'import {r as React} from "/assets/vendor-react-D3EY6NCv.js";export default React;export const {useState,useEffect,useMemo,useRef,useCallback,useId,createElement,Fragment}=React;', 'react/jsx-runtime':'import {j} from "/assets/vendor-markdown-B7eG3c64.js";export const {jsx,jsxs,Fragment}=j;',api:'export {b as api,g as getApiErrorDetail} from "/assets/index-HJquNmhn.js";'};
(async()=>{
 await build({entryPoints:['src/components/summary/FinalSynthesisPanel.tsx'],outfile:'dist/final-synthesis.js',bundle:true,format:'esm',target:'es2022',minify:true,jsx:'automatic',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'host',setup(b){b.onResolve({filter:/^\/assets\//},a=>({path:a.path,external:true}));b.onResolve({filter:/^(react|react\/jsx-runtime)$/},a=>({path:a.path,namespace:'host'}));b.onResolve({filter:/api\/client$/},()=>({path:'api',namespace:'host'}));b.onLoad({filter:/.*/,namespace:'host'},a=>({contents:shim[a.path],loader:'js'}));}}]});
 for(const [entry,name] of [['src/utils/consultationWorkspace.ts','consultation-workspace'],['src/utils/delphiRoundTwo.ts','claim-review'],['src/legacy/delphiProgress.ts','delphi-progress'],['src/legacy/productUI.ts','product-ui'],['src/legacy/delphiDemo.ts','delphi-demo']])buildSync({entryPoints:[entry],outfile:`dist/${name}.js`,bundle:true,format:'esm',target:'es2022',loader:{'.css':'empty'}});
 let code=fs.readFileSync('dist/assets/SummaryPage-workspace-v9.js','utf8');
 const host='const ConsultationWorkspace=createConsultationWorkspace(o,ManualResponseSheet);';
 if(!code.includes(host))throw Error('Unsupported maintained summary shape');
 code='import FinalSynthesisPanel from "/final-synthesis.js?v=2";'+code.replace(host,'const ConsultationWorkspace=createConsultationWorkspace(o,ManualResponseSheet,FinalSynthesisPanel);').replace('/consultation-workspace.js?v=2','/consultation-workspace.js?v=4');parse(code,{sourceType:'module'});fs.writeFileSync('dist/assets/SummaryPage-workspace-v11.js',code);
 fs.copyFileSync('src/legacy/delphiRoundSetup.js','dist/delphi-round-two-ui.js');fs.copyFileSync('src/workspace.css','dist/workspace.css');fs.copyFileSync('src/reasoning-flow.css','dist/reasoning-flow.css');
 let html=fs.readFileSync('dist/index.html','utf8').replace(/\/assets\/SummaryPage-workspace-v(?:9|10)\.js/,'/assets/SummaryPage-workspace-v11.js').replace('/workspace.css?v=2','/workspace.css?v=3');
 for(const name of ['delphi-progress','product-ui','delphi-demo','delphi-round-two-ui'])html=html.replace(new RegExp(`/${name}\\.js\\?v=[^"']+`,'g'),`/${name}.js?v=workflow-2`);
 fs.writeFileSync('dist/index.html',html);
})().catch(e=>{console.error(e);process.exitCode=1;});

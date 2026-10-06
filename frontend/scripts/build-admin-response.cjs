// Preserve the current app, participant patches and React/auth singletons.
const fs = require('node:fs');
const {build,buildSync} = require('esbuild');
const {parse} = require('@babel/parser');
const shim = {
  react: 'import {r as React} from "/assets/vendor-react-D3EY6NCv.js";export default React;export const {useState,useEffect,useMemo,useRef,useCallback,useLayoutEffect,useContext,useReducer,useId,createElement,createContext,forwardRef,memo,Fragment,Children,cloneElement,isValidElement,Component,PureComponent,useImperativeHandle,useSyncExternalStore,startTransition,useTransition,useDeferredValue,StrictMode,useDebugValue,version,createRef}=React;',
  'react-dom': 'import {b as ReactDOM} from "/assets/vendor-react-D3EY6NCv.js";export default ReactDOM;export const {createPortal,flushSync}=ReactDOM;',
  'react/jsx-runtime': 'import {j} from "/assets/vendor-markdown-B7eG3c64.js";export const {jsx,jsxs,Fragment}=j;',
  api: 'export {b as api,g as getApiErrorDetail} from "/assets/index-HJquNmhn.js";',
};
(async()=>{
await build({entryPoints:['src/components/summary/ManualResponseSheet.tsx'],outfile:'dist/manual-response-sheet.js',bundle:true,format:'esm',target:'es2022',minify:true,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','import.meta.env':'{}'},plugins:[{name:'host-singletons',setup(b){
  b.onResolve({filter:/^\/assets\//},args=>({path:args.path,external:true}));
  b.onResolve({filter:/^(react|react\/jsx-runtime|react-dom)$/},args=>({path:args.path,namespace:'host'}));
  b.onResolve({filter:/api\/client$/},()=>({path:'api',namespace:'host'}));
  b.onLoad({filter:/.*/,namespace:'host'},args=>({contents:shim[args.path],loader:'js'}));
}}]});
for(const [entry,name] of [['src/utils/consultationWorkspace.ts','consultation-workspace'],['src/utils/responseWorkspace.ts','response-workspace'],['src/utils/summaryRoute.ts','summary-route']])buildSync({entryPoints:[entry],outfile:`dist/${name}.js`,bundle:true,format:'esm',target:'es2022'});
let code=fs.readFileSync('dist/assets/SummaryPage-workspace-v7.js','utf8');
const workspace='const ConsultationWorkspace=createConsultationWorkspace(o);';
const props='onMakeLive:Mt,makingLiveId:St}';
if(!code.includes(workspace)||!code.includes(props)||!code.includes('async function Pe()'))throw Error('Unexpected maintained summary shape');
code='import ManualResponseSheet from "/manual-response-sheet.js?v=2";'+code.replace(workspace,'const ConsultationWorkspace=createConsultationWorkspace(o,ManualResponseSheet);').replace(props,'onMakeLive:Mt,makingLiveId:St,onResponseAdded:Pe}').replace('/consultation-workspace.js?v=1','/consultation-workspace.js?v=2').replace('/response-workspace.js?v=3','/response-workspace.js?v=4').replace('/summary-route.js?v=1','/summary-route.js?v=2');
parse(code,{sourceType:'module'});
fs.writeFileSync('dist/assets/SummaryPage-workspace-v9.js',code);
fs.copyFileSync('src/workspace.css','dist/workspace.css');
let html=fs.readFileSync('dist/index.html','utf8').replace(/"\/assets\/SummaryPage-workspace-v[789]\.js"/,'"/assets/SummaryPage-workspace-v9.js"').replace('/workspace.css?v=1','/workspace.css?v=2').replace(/\/minimal-dashboard.js\?v=\d+/,'/minimal-dashboard.js?v=10').replace(/\/minimal-dashboard.css\?v=\d+/,'/minimal-dashboard.css?v=10');
fs.writeFileSync('dist/index.html',html);
})().catch(error=>{console.error(error);process.exitCode=1;});

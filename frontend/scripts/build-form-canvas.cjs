const fs=require('node:fs'),{build}=require('esbuild');
(async()=>{
// The maintained app owns React, Router and auth. Never bundle a second singleton.
const shim={
 'react-dom':'import {b as ReactDOM} from "/assets/vendor-react-D3EY6NCv.js"; export default ReactDOM; export const {createPortal,flushSync}=ReactDOM;',
 react:'import {r as React} from "/assets/vendor-react-D3EY6NCv.js"; export default React; export const {useState,useEffect,useMemo,useRef,useCallback,useLayoutEffect,useContext,useReducer,useId,createElement,createContext,forwardRef,memo,Fragment,Children,cloneElement,isValidElement,Component,PureComponent,useImperativeHandle,useSyncExternalStore,startTransition,useTransition,useDeferredValue,StrictMode,useDebugValue,version,createRef}=React;',
 'react/jsx-runtime':'export {j as default} from "/assets/vendor-markdown-B7eG3c64.js"; import {j} from "/assets/vendor-markdown-B7eG3c64.js"; export const {jsx,jsxs,Fragment}=j;',
 'react-router-dom':'export {u as useNavigate,i as useParams} from "/assets/vendor-react-D3EY6NCv.js";',
 api:'export {b as api,g as getApiErrorDetail} from "/assets/index-HJquNmhn.js";',
};
for(const [entry,output] of [['AdminFormNew','AdminFormNew-canvas-v10'],['FormEditor','FormEditor-canvas-v8']]) await build({entryPoints:[`src/${entry}.tsx`],outfile:`dist/assets/${output}.js`,bundle:true,format:'esm',target:'es2022',minify:true,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','import.meta.env.VITE_API_BASE_URL':'"/api"','import.meta.env.PROD':'false','import.meta.env.DEV':'true'},plugins:[{name:'host-singletons',setup(b){
 b.onResolve({filter:/^\/assets\//},args=>({path:args.path,external:true}));
 b.onResolve({filter:/^(react|react\/jsx-runtime|react-router-dom|react-dom)$/},args=>({path:args.path,namespace:'host'}));
 b.onResolve({filter:/api\/client$/},()=>({path:'api',namespace:'host'}));
 b.onResolve({filter:/LegacyFormEditor$/},()=>({path:'/assets/FormEditor-legacy-v1.js',external:true}));
 b.onResolve({filter:/LegacyAdminFormNew$/},()=>({path:'/assets/AdminFormNew-legacy-v1.js',external:true}));
 b.onLoad({filter:/.*/,namespace:'host'},args=>({contents:shim[args.path],loader:'js'}));
}}]});
fs.copyFileSync('dist/assets/AdminFormNew-C6eEpVHb.js','dist/assets/AdminFormNew-legacy-v1.js');
fs.copyFileSync('dist/assets/FormEditor-DIpaScmC.js','dist/assets/FormEditor-legacy-v1.js');
let html=fs.readFileSync('dist/index.html','utf8').replace(/<script type="importmap">(.*?)<\/script>/,(_,json)=>{const map=JSON.parse(json);map.imports['/assets/AdminFormNew-C6eEpVHb.js']='/assets/AdminFormNew-canvas-v10.js';map.imports['/assets/FormEditor-DIpaScmC.js']='/assets/FormEditor-canvas-v8.js';return '<script type="importmap">'+JSON.stringify(map)+'</script>';});
fs.writeFileSync('dist/index.html',html);
})();

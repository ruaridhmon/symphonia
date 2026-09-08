const fs=require('node:fs');
const {parse}=require('@babel/parser');
const generate=require('@babel/generator').default;
const t=require('@babel/types');
const {execFileSync}=require('node:child_process');
function visit(node, fn) { if(!node||typeof node!=='object')return; for(const k of Object.keys(node)){if(k==='loc')continue; const v=node[k];if(Array.isArray(v))v.forEach(x=>visit(x,fn));else if(v&&typeof v==='object')visit(v,fn);} fn(node); }
function prop(node,key){return node?.properties?.find(p=>p.key?.name===key||p.key?.value===key);}
function replaceFunction(ast,name,body){const fn=ast.program.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);if(!fn)throw Error('Missing '+name);fn.body=parse('function replacement(){'+body+'}').program.body[0].body;}
function emit(ast,path){fs.writeFileSync(path,generate(ast,{compact:true,comments:false}).code);}
execFileSync('./node_modules/.bin/esbuild',['src/utils/productPresentation.ts','--bundle','--format=esm','--outfile=dist/product-presentation.js'],{stdio:'inherit'});
execFileSync('./node_modules/.bin/esbuild',['src/legacy/productUI.ts','--bundle','--format=esm','--outfile=dist/product-ui.js'],{stdio:'inherit'});
fs.copyFileSync('src/product.css','dist/product.css');
let ast=parse(fs.readFileSync('dist/assets/Dashboard-DhbfiNRC.js','utf8'),{sourceType:'module'});
let links=0;
visit(ast,n=>{
 if(n.type!=='CallExpression'||n.callee?.object?.name!=='e')return;
 const props=n.arguments[1]; const href=prop(props,'href');
 if(n.arguments[0]?.value==='a'&&href?.value.type==='TemplateLiteral'&&href.value.quasis[0].value.raw==='/admin/form/'){
   n.arguments[0]=t.identifier('ProductLink');href.key=t.identifier('to');links++;
 }

});
if(links!==4)throw Error(`Unexpected dashboard structure: ${links} links`);
ast.program.body.unshift(...parse('import {L as ProductLink} from "./vendor-react-D3EY6NCv.js";import {renderWorkspaceLoading} from "/product-presentation.js?v=1";',{sourceType:'module'}).program.body);
const dashboard=ast.program.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='Ge');
dashboard.body.body.unshift(...parse('g.useEffect(()=>{void import("./SummaryPage-nowaffle-CaerDev.js").catch(()=>{});},[]);').program.body);
// Dashboard data loading uses a quiet content indicator beneath the existing header.
visit(dashboard,n=>{if(n.type==='CallExpression'&&n.callee?.object?.name==='e'&&n.arguments[0]?.name==='ye'){const replacement=parse('renderWorkspaceLoading(g.createElement,true)').program.body[0].expression;Object.keys(n).forEach(k=>delete n[k]);Object.assign(n,replacement);}});
emit(ast,'dist/assets/Dashboard-classic-v2.js');
ast=parse(fs.readFileSync('dist/assets/SummaryPage-responses-v4.js','utf8'),{sourceType:'module'});
ast.program.body.unshift(...parse('import {renderWorkspaceLoading} from "/product-presentation.js?v=1";',{sourceType:'module'}).program.body);
replaceFunction(ast,'En','return renderWorkspaceLoading(o.createElement);');
emit(ast,'dist/assets/SummaryPage-product-v1.js');
ast=parse(fs.readFileSync('dist/assets/index-HJquNmhn.js','utf8'),{sourceType:'module'});
ast.program.body.unshift(...parse('import {renderWorkspaceLoading} from "/product-presentation.js?v=1";',{sourceType:'module'}).program.body);
replaceFunction(ast,'sr','return renderWorkspaceLoading(h.createElement);');
// Preserve the live region and add scroll reset on actual pathname changes.
const announcer=ast.program.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='Tr');
let resets=0;visit(announcer,n=>{if(n.type==='AssignmentExpression'&&n.left?.object?.name==='t'&&n.left?.property?.name==='current'){
 const original=t.cloneNode(n,true);const replacement=t.sequenceExpression([original,parse('window.scrollTo({top:0,behavior:"instant"})').program.body[0].expression]);Object.keys(n).forEach(k=>delete n[k]);Object.assign(n,replacement);resets++;
}});if(resets!==1)throw Error('Unexpected route announcer');
emit(ast,'dist/assets/index-product-v1.js');
const indexPath='dist/index.html';let html=fs.readFileSync(indexPath,'utf8');
const map={imports:{'/assets/index-HJquNmhn.js':'/assets/index-product-v1.js','/assets/Dashboard-DhbfiNRC.js':'/assets/Dashboard-classic-v2.js','/assets/SummaryPage-nowaffle-CaerDev.js':'/assets/SummaryPage-product-v1.js'}};
html=html.replace(/<script type="importmap">.*?<\/script>/,`<script type="importmap">${JSON.stringify(map)}</script>`).replace('crossorigin src="/assets/index-HJquNmhn.js"','crossorigin src="/assets/index-product-v1.js"');
if(!html.includes('/product.css'))html=html.replace('</head>','<link rel="stylesheet" href="/product.css?v=1" />\n<script type="module" src="/product-ui.js?v=1"></script>\n</head>');
fs.writeFileSync(indexPath,html);

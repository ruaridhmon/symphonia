const fs=require('node:fs'),{buildSync}=require('esbuild');
for(const [src,out] of [['legacy/delphiProgress','delphi-progress'],['legacy/productUI','product-ui'],['legacy/delphiDemo','delphi-demo']]){
 buildSync({entryPoints:[`src/${src}.ts`],outfile:`dist/${out}.js`,bundle:true,format:'esm',target:'es2022',loader:{'.css':'empty'}});
}
fs.copyFileSync('src/reasoning-flow.css','dist/reasoning-flow.css');
let html=fs.readFileSync('dist/index.html','utf8');
if(!html.includes('/reasoning-flow.css'))html=html.replace('</head>','<link rel="stylesheet" href="/reasoning-flow.css?v=1">\n</head>');
for(const name of ['delphi-progress','product-ui','delphi-demo'])html=html.replace(new RegExp(`/${name}\\.js\\?v=[^"']+`,'g'),`/${name}.js?v=reasoning-1`);
fs.writeFileSync('dist/index.html',html);
buildSync({entryPoints:['src/examples/reasoningFixture.ts'],outfile:'public/examples/reasoning-preview.js',bundle:true,format:'esm',target:'es2022'});
for(const ext of ['js','css','html'])fs.copyFileSync(`public/examples/reasoning-preview.${ext}`,`dist/examples/reasoning-preview.${ext}`);

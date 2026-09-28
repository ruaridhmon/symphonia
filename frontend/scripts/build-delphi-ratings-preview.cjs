const fs=require('node:fs');
require('esbuild').buildSync({entryPoints:['src/examples/delphiRatingsPreview.tsx'],bundle:true,format:'esm',outfile:'public/examples/delphi-ratings-preview.js',define:{'process.env.NODE_ENV':'"production"'},minify:true});
for(const ext of ['html','js'])fs.copyFileSync(`public/examples/delphi-ratings-preview.${ext}`,`dist/examples/delphi-ratings-preview.${ext}`);

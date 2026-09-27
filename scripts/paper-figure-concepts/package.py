from pathlib import Path
import shutil,zipfile
from pypdf import PdfWriter
ROOT=Path(__file__).resolve().parents[2];root=ROOT/'frontend/public/evaluation';o=root/'paper-concepts';w=PdfWriter()
for p in [root/'extraction-preview/extraction-map.pdf',*sorted(o.glob('0*.pdf'))]:w.append(str(p))
assert len(w.pages)==6
w.write(str(o/'all-six-figure-concepts.pdf'))
shutil.copy2(ROOT/'scripts/paper-figure-concepts/build.py',o/'build.py')
with zipfile.ZipFile(o/'design-bundle.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in o.iterdir():
  if f.name!='design-bundle.zip':z.write(f,'paper-concepts/'+f.name)
 for f in (root/'extraction-preview').iterdir():z.write(f,'extraction-preview/'+f.name)
 for f in [ROOT/'scripts/extraction-map/build.py',*Path(__file__).parent.glob('*.py')]:z.write(f,str(f.relative_to(ROOT)))
 z.writestr('README.txt','ILLUSTRATIVE DESIGNS ONLY. No experimental results. Seeds and invented distribution parameters are in the scripts. To regenerate from the extracted root: install numpy, matplotlib and pypdf, then run python scripts/extraction-map/build.py and python scripts/paper-figure-concepts/build.py, then python scripts/paper-figure-concepts/disagreement.py. Generated assets are written to frontend/public/evaluation/. The combined PDF concatenates the six vector PDFs in numerical order. No provider APIs are called.\n')
for n in ['index.html','pilot.js','pilot.css','paper-concepts.js']:shutil.copy2(root/n,ROOT/'frontend/dist/evaluation'/n)
shutil.copytree(o,ROOT/'frontend/dist/evaluation/paper-concepts',dirs_exist_ok=True)
print('Packaged six vector figures and mirrored evaluation assets.')

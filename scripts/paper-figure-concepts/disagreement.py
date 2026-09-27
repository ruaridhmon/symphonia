"""Three wave distributions: an explicitly simulated reconstruction design, not results."""
from pathlib import Path
import csv,json
import xml.etree.ElementTree as ET
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'frontend/public/evaluation/paper-concepts'
rng=np.random.default_rng(92743);P='#70529c';T='#388e91';A='#c08355';M='#877e92';INK='#30283d'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'svg.fonttype':'none','pdf.fonttype':42,'axes.spines.top':False,'axes.spines.right':False,'axes.spines.left':False,'axes.edgecolor':'#e6e0ed','text.color':INK,'xtick.color':M})
# Mirrored samples deliberately impose equal means; this is an illustration, not a finding.
half=np.clip(rng.normal(.58,.135,120),.16,.96);source=np.r_[-half,half]
central=np.clip(rng.normal(0,.21,120),-.86,.86);flattened=np.r_[central,-central]
retained=np.clip(half+rng.normal(-.025,.055,120),.10,.96);preserved=np.r_[-retained,retained]
g=np.linspace(-1,1,700);h=.085

def kde(values):
 z=np.zeros_like(g)
 for v in values:
  for r in [v,-2-v,2-v]:z+=np.exp(-.5*((g-r)/h)**2)
 return z/np.trapezoid(z,g)
curves=[kde(v) for v in [source,flattened,preserved]];ymax=max(z.max() for z in curves)*1.22
f=plt.figure(figsize=(10,9.5),facecolor='white')
f.text(.10,.960,'06  /  PRESERVING THE SHAPE OF DISAGREEMENT',fontsize=10,weight='bold',color=P)
f.text(.10,.914,'Does summarisation manufacture consensus?',fontsize=21)
f.text(.10,.870,'ILLUSTRATIVE ONLY  ·  Constructed distributions  ·  No measured platform performance',fontsize=9,color=A)
f.text(.10,.832,'The same average can conceal two opposing views—or an artificial middle.',fontsize=11,color=M)
labels=[('01','Original expert views','Two distinct positions',P),('02','Disagreement flattened','An invented middle',A),('03','Disagreement preserved','Both positions remain visible',T)]
for j,(num,title,subtitle,col) in enumerate(labels):
 bottom=[.626,.400,.174][j];ax=f.add_axes([.12,bottom,.76,.145]);z=curves[j]
 f.text(.10,bottom+.174,num,fontsize=10,color=col,weight='bold');f.text(.145,bottom+.174,title,fontsize=13,color=INK);f.text(.90,bottom+.174,subtitle,fontsize=9,color=col,ha='right')
 # Layered bands make a genuine curve silhouette; shading encodes no extra variable.
 for k in range(60):
  low=z*k/60;high=z*(k+1)/60
  if j==1:ax.fill_between(g,low,high,color=A,alpha=.05+.36*k/60,lw=0,gid="wave-band")
  else:
   ax.fill_between(g,low,high,where=g<=0,color=P,alpha=.045+.33*k/60,lw=0,interpolate=True,gid="wave-band")
   ax.fill_between(g,low,high,where=g>=0,color=T,alpha=.045+.33*k/60,lw=0,interpolate=True,gid="wave-band")
 if j:
  ax.plot(g,curves[0],color='#a69bb6',lw=1.0,ls=(0,(3,3)),alpha=.8,zorder=4)
 if j==1:ax.plot(g,z,color=A,lw=2,zorder=5)
 else:
  ax.plot(g[g<=0],z[g<=0],color=P,lw=2,zorder=5);ax.plot(g[g>=0],z[g>=0],color=T,lw=2,zorder=5)
 vals=[source,flattened,preserved][j]
 colors=[A]*len(vals) if j==1 else [P if v<0 else T for v in vals]
 ax.scatter(vals,np.full(len(vals),-.045*ymax),marker='|',s=12,c=colors,alpha=.22,lw=.6,clip_on=False)
 ax.axvline(0,color='#cec5d9',lw=.8,ls=(0,(2,4)),zorder=0)
 ax.set(xlim=(-1,1),ylim=(-.09*ymax,ymax),yticks=[],xticks=[-1,0,1],xticklabels=['Oppose','Neutral','Support'])
 ax.tick_params(axis='x',length=0,pad=8,labelsize=9)
 if j==0:ax.annotate('Little support for the middle',xy=(0,z[len(g)//2]+.03),xytext=(0,.6*ymax),ha='center',fontsize=9,color=M,arrowprops={'arrowstyle':'-','color':'#b7a9c8','lw':.8})
 if j==1:ax.text(.56,.73*ymax,'The mean is unchanged.\nThe opposing camps disappear.',ha='center',fontsize=9,color=A,linespacing=1.6)
 if j==2:ax.text(0,.52*ymax,'A shorter account,\nwithout merging positions.',ha='center',fontsize=9,color=M,linespacing=1.6)
f.text(.10,.092,'Curve height: position density. Ticks: individual positions. Dashed outlines: original views. Shared scales across all rows.\nEach row contains 240 constructed positions; mirrored samples deliberately give every distribution a mean of zero.',fontsize=8,color='#70667d',linespacing=1.7)
f.text(.10,.025,'DESIGN SIMULATION — NOT RESULTS. Rows 2–3 illustrate positions reconstructed by readers from hypothetical summaries,\nnot distributions directly measured from prose. A real study must collect blinded reader reconstructions. No models or readers were tested.',fontsize=8,color=M,linespacing=1.6)
for ext in ['pdf','png']:f.savefig(OUT/f'06-preserving-disagreement.{ext}',dpi=600)
# Native SVG gradients keep the browser figure compact and fully vector.
for j,ax in enumerate(f.axes):
 for collection in list(ax.collections):
  if collection.get_gid()=='wave-band':collection.remove()
 z=curves[j]
 if j==1:ax.fill_between(g,0,z,color=A,lw=0,gid='wave-fill-amber')
 else:
  ax.fill_between(g,0,z,where=g<=0,color=P,lw=0,interpolate=True,gid=f'wave-fill-purple-{j}')
  ax.fill_between(g,0,z,where=g>=0,color=T,lw=0,interpolate=True,gid=f'wave-fill-teal-{j}')
p=OUT/'06-preserving-disagreement.svg';f.savefig(p);plt.close(f)
ns='http://www.w3.org/2000/svg';ET.register_namespace('',ns);ET.register_namespace('xlink','http://www.w3.org/1999/xlink')
root=ET.fromstring(p.read_text().replace("'DejaVu Sans'","'Arial', sans-serif"));defs=root.find('{'+ns+'}defs')
for name,color in [('purple',P),('teal',T),('amber',A)]:
 grad=ET.SubElement(defs,'{'+ns+'}linearGradient',{'id':'gradient-'+name,'x1':'0','x2':'0','y1':'1','y2':'0'})
 for offset,opacity in [('0','.04'),('1','.38')]:ET.SubElement(grad,'{'+ns+'}stop',{'offset':offset,'stop-color':color,'stop-opacity':opacity})
for group in root.iter('{'+ns+'}g'):
 ident=group.get('id','')
 if ident.startswith('wave-fill-'):
  name=ident.split('-')[2]
  for path in group.iter('{'+ns+'}path'):path.set('style',f'fill: url(#gradient-{name}); stroke: none')
p.write_text('\n'.join(line.rstrip() for line in ET.tostring(root,encoding='unicode').splitlines())+'\n')
with (OUT/'06-preserving-disagreement.csv').open('w') as fp:
 w=csv.DictWriter(fp,fieldnames=['illustration','position_id','position'],lineterminator='\n');w.writeheader()
 for label,vals in zip(['original','flattened_reconstruction','preserved_reconstruction'],[source,flattened,preserved]):
  w.writerows({'illustration':label,'position_id':i+1,'position':float(v)} for i,v in enumerate(vals))
(OUT/'06-design.json').write_text(json.dumps({'status':'ILLUSTRATIVE ONLY; no readers or models evaluated','seed':92743,'positions_per_distribution':240,'mean_construction':'Samples mirrored to impose zero mean in all three distributions, not an experimental finding.','density':'Gaussian KDE with reflection at -1 and 1; bandwidth 0.085; each curve normalized on [-1,1]; identical horizontal and vertical scales. Decorative shading adds no variable; dashed curves are the original reference.','interpretation':'Original expert ratings versus hypothetical blinded-reader reconstructions of the expert-position distribution from summaries. Not reader own opinions, not a distribution directly extracted from prose.','limits':'A toy bimodal scenario, not a claim that every disagreement has two camps. Content of reasons and qualifications requires separate annotation. Ordinal Likert data would require an appropriate discrete display rather than assuming these smooth continuous densities.','new_provider_calls':0},indent=2))
p=OUT/'manifest.json';m=json.loads(p.read_text());m['figures']=[v for v in m['figures'] if v['id']!='06-preserving-disagreement'];m['figures'].append({'id':'06-preserving-disagreement','simulated_rows':720,'seed':92743,'status':'ILLUSTRATIVE WAVE DESIGN ONLY; previous line design retained in archive/'});p.write_text(json.dumps(m,indent=2))
print('Generated three explicitly simulated wave distributions, equal means and common scales.')

"""Aggregate information fate from saved pilot judgments. No simulated data or calls."""
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.path import Path as MPath
from matplotlib.patches import PathPatch
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'frontend/public/evaluation/assistant-extraction'
data=json.loads((OUT/'results.json').read_text());ps=data['panels'];s=data['summary']
P,A,G,INK,MUTED='#7653ad','#c38b4e','#b6afc2','#30263d','#82768f'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':9,'svg.fonttype':'none','pdf.fonttype':42,'text.color':INK,'axes.labelcolor':MUTED,'xtick.color':MUTED,'ytick.color':MUTED})
f=plt.figure(figsize=(11,8),facecolor='white')
f.text(.075,.942,'What survives extraction?',fontsize=23)
f.text(.075,.9,'48 source responses → 192 extracted claims',fontsize=11,color=MUTED)
f.text(.075,.858,'a',fontsize=12,weight='bold');f.text(.1,.86,'Follow the original meaning',fontsize=11)
ax=f.add_axes([.075,.385,.85,.445]);ax.set(xlim=(0,1),ylim=(0,1));ax.axis('off')
# Ribbon height is proportional to focal-claim occurrences at both ends.
# Curvature is diagram layout, not a trajectory through additional measured stages.
N=s['reference_occurrences']; unit=.63/N
full=s['faithful'];partial=s['partial'];omitted=s['omitted_occurrences']
source_top=.88; source_bottom=source_top-.63
left=.16;right=.73
starts=[source_top-full*unit,source_top-(full+partial)*unit,source_bottom]
ends=[.44,.32,.055]
for n,lo,ro,col in zip([full,partial,omitted],starts,ends,[P,A,G]):
 h=n*unit
 verts=[(left,lo),(left+.27,lo),(right-.27,ro),(right,ro),(right,ro+h),(right-.27,ro+h),(left+.27,lo+h),(left,lo+h),(left,lo)]
 path=MPath(verts,[MPath.MOVETO,MPath.CURVE4,MPath.CURVE4,MPath.CURVE4,MPath.LINETO,MPath.CURVE4,MPath.CURVE4,MPath.CURVE4,MPath.CLOSEPOLY])
 patch=PathPatch(path,facecolor='none',edgecolor='none');ax.add_patch(patch)
 # Subtle gradient is clipped to an exact, constant-width ribbon.
 from matplotlib.colors import to_rgba
 rgba=np.zeros((1,400,4));rgba[:,:,:3]=to_rgba(col)[:3];rgba[:,:,3]=np.linspace(.12,.50,400)
 im=ax.imshow(rgba,extent=(left,right,0,1),origin='lower',aspect='auto',zorder=1);im.set_clip_path(patch)
 # Crisp boundaries retain shape in print without a dense mesh of artificial paths.
 for sy,ey in [(lo,ro),(lo+h,ro+h)]:
  edge=MPath([(left,sy),(left+.27,sy),(right-.27,ey),(right,ey)],[MPath.MOVETO,MPath.CURVE4,MPath.CURVE4,MPath.CURVE4])
  ax.add_patch(PathPatch(edge,facecolor='none',edgecolor=col,alpha=.5,lw=.65))
 ax.plot([right,right],[ro,ro+h],color=col,lw=3,solid_capstyle='butt')
 centre=ro+h/2
 ax.text(.77,centre+.036,f'{100*n/N:.1f}%',fontsize=23,color=col,va='center')
 label={full:'Fully preserved',partial:'Partially preserved',omitted:'Omitted'}[n]
 ax.text(.77,centre-.045,label,fontsize=10,color=INK,va='center')
 ax.text(.77,centre-.095,f'{n} / {N}',fontsize=8,color=MUTED,va='center')
ax.plot([left,left],[source_bottom,source_top],color=P,lw=3,alpha=.65)
ax.text(.12,.605,str(N),fontsize=25,ha='right',color=P)
ax.text(.12,.55,'Original focal',fontsize=9,ha='right',color=MUTED)
ax.text(.12,.495,'claim occurrences',fontsize=9,ha='right',color=MUTED)
ax.text(.16,.975,'SOURCE',fontsize=8,color=MUTED)
ax.text(.73,.975,'EXTRACTION OUTCOME',fontsize=8,color=MUTED)
f.text(.075,.372,'Ribbon widths show shares of original focal claims; curves do not imply additional measured stages.',fontsize=8,color=MUTED)
f.text(.075,.309,'b',fontsize=12,weight='bold');f.text(.1,.31,'Does the pattern hold across scenarios?',fontsize=11)
# Scenario-level composition provides variation without presenting claims as independent trials.
b=f.add_axes([.30,.137,.49,.14]);b.set(xlim=(0,100),ylim=(-.6,3.6));b.axis('off')
names=['Inclusive education','Diagnostic screening','Youth justice','School attendance']
for i,(scenario,name) in enumerate(zip(dict.fromkeys(p['scenario'] for p in ps),names)):
 cases=[p for p in ps if p['scenario']==scenario];den=sum(p['reference_count'] for p in cases)
 ns=[sum(p['faithful'] for p in cases),sum(p['partial'] for p in cases),sum(len(p['omitted_ids']) for p in cases)]
 start=0;y=3-i
 for n,col in zip(ns,[P,A,G]):
  w=100*n/den;b.barh(y,w,left=start,height=.23,color=col,alpha=.72);start+=w
 b.text(-3,y,name,ha='right',va='center',fontsize=9)
 b.text(103,y,f'{100*ns[0]/den:.1f}%',ha='left',va='center',fontsize=9,color=P)
 b.text(118,y,f'n = {den}',ha='left',va='center',fontsize=8,color=MUTED)
b.text(0,4.05,'0%',color=MUTED,fontsize=7);b.text(100,4.05,'100%',ha='right',color=MUTED,fontsize=7)
f.text(.075,.102,'Same colour key; each bar partitions one scenario. Labels report fully preserved shares; n = focal-claim occurrences.',fontsize=8,color=MUTED)
f.text(.075,.049,'Synthetic assistant pilot · provisional unblinded self-review · 24 panels nested in four scenarios.\nAll 28 omissions are accounted for by the eight-claim cap. Grouping loss has not been isolated.',fontsize=8,color=MUTED,linespacing=1.5)
for ext in ['svg','pdf','png']:f.savefig(OUT/f'assistant-extraction.{ext}',dpi=600,facecolor='white')
p=OUT/'assistant-extraction.svg';p.write_text('\n'.join(line.rstrip() for line in p.read_text().replace("'DejaVu Sans'","'Arial', sans-serif").splitlines())+'\n')
plt.close(f)

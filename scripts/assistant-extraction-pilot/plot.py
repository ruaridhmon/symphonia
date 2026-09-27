"""Measured extraction pilot. Exact coordinates and claim counts; no model calls."""
import json
from pathlib import Path
from collections import Counter
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'frontend/public/evaluation/assistant-extraction'
data = json.loads((OUT/'results.json').read_text())
ps, s = data['panels'], data['summary']
P, A, G, INK, MUTED = '#7450a6', '#bc884d', '#ded8e7', '#30283b', '#81748d'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':9,'svg.fonttype':'none','pdf.fonttype':42,'axes.edgecolor':'#ded8e7','axes.labelcolor':MUTED,'text.color':INK,'xtick.color':MUTED,'ytick.color':MUTED})
f = plt.figure(figsize=(12,8.5), facecolor='white')
f.text(.075,.949,'Faithfulness does not guarantee coverage',fontsize=20)
f.text(.075,.908,'Assistant extraction pilot   ·   24 panels across four synthetic scenarios',fontsize=10,color=MUTED)
f.text(.075,.838,'a',fontsize=14,weight='bold'); f.text(.1,.839,'Coverage × faithfulness',fontsize=12)
f.text(.56,.838,'b',fontsize=14,weight='bold'); f.text(.585,.839,'Retention across scenarios',fontsize=12)
ax=f.add_axes([.09,.33,.36,.445])
ax.set(xlim=(62,103),ylim=(69,104),xlabel='Coverage (%)',ylabel='Faithfulness (%)')
ax.set_xticks([65,75,85,95,100]);ax.set_yticks([75,80,90,100]);ax.tick_params(length=0,pad=8)
ax.grid(color='#eeeaf3',lw=.65,zorder=0)
for side in ['top','right']:ax.spines[side].set_visible(False)
# Fixed budget loci, clipped by the explicitly cropped axes.
for n in [9,10]:
 ax.plot([62,800/n],[62*n/8,100],color='#d7cbe5',lw=1,ls=(0,(2,3)),zorder=1)
counts=Counter((p['coverage']*100,p['faithfulness']*100) for p in ps)
for (x,y),n in counts.items():
 for extra,alpha in [(850,.018),(460,.035),(180,.055)]:
  ax.scatter(x,y,s=n*48+extra,color=P,alpha=alpha,edgecolor='none',zorder=2)
 ax.scatter(x,y,s=n*62,color=P,alpha=.86,edgecolor='white',lw=1,zorder=3)
 ax.text(x,y,str(n),ha='center',va='center',fontsize=8 if n==1 else 10,color='white',weight='bold',zorder=4)
ax.scatter(100,100,marker='+',s=80,color='#a294b1',lw=1)
ax.text(100,97.3,'Ideal',ha='center',fontsize=8,color=MUTED)
ax.annotate('17 panels: fully supported outputs,\n80–89% source coverage',xy=(88.89,99),xytext=(84,92),fontsize=8,color=P,ha='center',linespacing=1.5,arrowprops={'arrowstyle':'-','color':'#baa6d1','lw':.8})
ax.text(64,71,'Cropped axes · every panel included',fontsize=8,color=MUTED)
# Exact marginal marks: height/length encodes number of panels, no KDE.
top=f.add_axes([.09,.786,.36,.022]); right=f.add_axes([.459,.33,.017,.445])
for x,n in Counter(p['coverage']*100 for p in ps).items():top.vlines(x,0,n,color=P,lw=3,alpha=.4)
for y,n in Counter(p['faithfulness']*100 for p in ps).items():right.hlines(y,0,n,color=P,lw=3,alpha=.4)
top.set(xlim=ax.get_xlim(),ylim=(0,24));right.set(ylim=ax.get_ylim(),xlim=(0,24));top.axis('off');right.axis('off')
f.text(.09,.248,'Coverage: source claims fully preserved / original claims.\nFaithfulness: fully supported claims / extracted claims.',fontsize=8,color=MUTED,linespacing=1.65,va='top')
# Each row is one source panel, with a shared denominator across the three outcomes.
b=f.add_axes([.60,.33,.32,.445]);b.set(xlim=(0,100),ylim=(-1,32))
names=['Inclusive education','Diagnostic screening','Youth justice','School attendance']
for i,p in enumerate(ps):
 group=i//6; y=30-group*8-i%6
 if i%6==0:
  cases=ps[i:i+6]; rate=100*sum(q['faithful'] for q in cases)/sum(q['reference_count'] for q in cases)
  b.text(0,y+1.15,names[group],fontsize=9,color=INK,va='bottom')
  b.text(100,y+1.15,f'{rate:.1f}%',fontsize=9,color=P,ha='right',va='bottom')
 full=100*p['faithful']/p['reference_count'];partial=100*p['partial']/p['reference_count']
 b.plot([0,full],[y,y],color=P,lw=1.2,alpha=.40,solid_capstyle='butt')
 b.plot([full,full+partial],[y,y],color=A,lw=2,solid_capstyle='butt')
 b.plot([full+partial,100],[y,y],color=G,lw=1.2,solid_capstyle='butt')
 b.scatter(full,y,s=12,color=P,zorder=3,edgecolor='white',lw=.4)
 if partial:b.scatter(full+partial,y,s=14,facecolor='white',edgecolor=A,lw=.9,zorder=3)
b.set_xticks([0,25,50,75,100]);b.set_yticks([]);b.set_xlabel('Share of original focal claims (%)',labelpad=10);b.tick_params(length=0,pad=8)
for side in ['top','right','left']:b.spines[side].set_visible(False)
b.set_axisbelow(True);b.grid(axis='x',color='#f0edf4',lw=.6)
f.text(.60,.248,'Six panels per scenario; headings give pooled coverage.\nFilled: fully preserved. Open: including partial preservation.',fontsize=8,color=MUTED,linespacing=1.65,va='top')
# Compact pooled strip keeps the common denominator explicit.
f.text(.075,.184,'c',fontsize=14,weight='bold');f.text(.10,.186,'Source information retained, weakened or omitted',fontsize=11)
c=f.add_axes([.10,.124,.82,.028]);c.set(xlim=(0,220),ylim=(0,1));c.axis('off')
for l,w,col in [(0,182,P),(182,10,A),(192,28,G)]:c.barh(.5,w,left=l,height=.8,color=col)
f.text(.10,.099,'182 fully preserved · 82.7%',color=P,fontsize=9)
f.text(.45,.099,'10 partial · 4.5%',color=A,fontsize=9)
f.text(.72,.099,'28 omitted · 12.7%',color=MUTED,fontsize=9)
f.text(.075,.039,'220 original focal-claim occurrences · 192 extracted claims · provisional unblinded self-review.\nThe eight-claim cap accounts for all 28 omissions. Grouping loss was not separately measured.',fontsize=8,color=MUTED,linespacing=1.6)
for ext in ['svg','pdf','png']:f.savefig(OUT/f'assistant-extraction.{ext}',dpi=600,facecolor='white')
p=OUT/'assistant-extraction.svg';p.write_text('\n'.join(line.rstrip() for line in p.read_text().replace("'DejaVu Sans'","'Arial', sans-serif").splitlines())+'\n')
plt.close(f)

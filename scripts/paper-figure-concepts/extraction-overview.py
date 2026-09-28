"""One composed figure; existing simulations and saved pilot remain distinct."""
from pathlib import Path
import json,csv
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.ticker import PercentFormatter
from matplotlib.patches import FancyArrowPatch
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'frontend/public/evaluation';OUT=BASE/'paper-concepts'
points=json.loads((BASE/'extraction-preview/illustrative-data.json').read_text())['points']
xy=np.array([[p['coverage'],p['faithfulness']] for p in points]);grid=np.linspace(0,1,201);xx,yy=np.meshgrid(grid,grid);z=np.zeros_like(xx);h=.045
for x,y in xy:
 for xr in [x,-x,2-x]:
  for yr in [y,-y,2-y]:z+=np.exp(-((xx-xr)**2+(yy-yr)**2)/(2*h*h))
z/=z.sum();rank=np.sort(z.ravel())[::-1];mass=rank.cumsum();levels=[rank[np.searchsorted(mass,q)] for q in [.9,.5]]
# Explicitly invented grouping transitions. These are not measured or fitted effects.
rng=np.random.default_rng(928501)
after=xy.copy();mode=np.arange(len(xy))%5
for i in range(len(xy)):
 if mode[i] in [1,2]:
  after[i]=np.maximum(.025,xy[i]-[rng.uniform(.055,.16),rng.uniform(.035,.14)])
 elif mode[i]==3:
  after[i]=[max(.025,xy[i,0]-rng.uniform(.01,.05)),min(.99,xy[i,1]+rng.uniform(.03,.12))]
 # Modes 0 and 4 demonstrate equivalent merging with unchanged fidelity.
with (OUT/'grouping-design-pairs.csv').open('w') as fp:
 writer=csv.writer(fp);writer.writerow(['id','status','before_coverage','before_faithfulness','after_coverage','after_faithfulness','constructed_transition'])
 for i,(before,post) in enumerate(zip(xy,after)):
  writer.writerow([points[i]['id'],'SIMULATED DESIGN ONLY',*before,*post,'unchanged' if mode[i] in [0,4] else 'loss' if mode[i] in [1,2] else 'unsupported_content_removed'])
(OUT/'grouping-design.json').write_text(json.dumps({'status':'SIMULATED DESIGN ONLY; no grouping outputs evaluated','seed':928501,'pairs':320,'before_source':'extraction-preview/illustrative-data.json','after_rule':'40% unchanged; 40% constructed loss in both metrics; 20% higher faithfulness with small coverage loss. Effects deliberately chosen, not estimated.','density':'Original before-grouping coordinates only','reference':'Both endpoints use the same original source reference; input extraction is held fixed within each constructed pair.'},indent=2)+'\n')
P='#665394';A='#bd784d';G='#ddd7e5';M='#81778c';INK='#302a39'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'svg.fonttype':'none','pdf.fonttype':42,'axes.spines.top':False,'axes.spines.right':False,'axes.edgecolor':'#b8b2bd','text.color':INK,'xtick.color':M,'ytick.color':M})
f=plt.figure(figsize=(14,10),facecolor='white')
f.text(.075,.962,'From expert responses to a shared claim set',fontsize=22)
f.text(.075,.929,'Round 1 responses',fontsize=10,color=M)
f.text(.36,.929,'Extracted claims',fontsize=10,color=M)
f.text(.69,.929,'Grouped claims for round 2',fontsize=10,color=M)
for start,end in [(.22,.34),(.495,.67)]:
 f.add_artist(FancyArrowPatch((start,.934),(end,.934),transform=f.transFigure,arrowstyle='->',mutation_scale=9,lw=.8,color='#b7a8cb'))
f.text(.075,.891,'a',fontsize=13,weight='bold');f.text(.096,.893,'Before → after grouping',fontsize=11);f.text(.505,.893,'ILLUSTRATIVE',fontsize=8,color=A,ha='right')
ax=f.add_axes([.075,.205,.43,.602]);top=f.add_axes([.075,.850,.43,.03]);right=f.add_axes([.522,.205,.035,.602])
cmap=LinearSegmentedColormap.from_list('ink',['#ffffff','#f5f1fa','#e7ddf1','#c3b0dc','#9b81bd'])
ax.contourf(xx,yy,z,levels=np.linspace(0,z.max(),24),cmap=cmap,zorder=1)
for before,post in zip(xy,after):ax.plot([before[0],post[0]],[before[1],post[1]],color=A,alpha=.16,lw=.6,zorder=2)
ax.scatter(xy[:,0],xy[:,1],s=12,facecolors='white',edgecolors=P,alpha=.35,linewidths=.5,zorder=3)
ax.scatter(after[:,0],after[:,1],s=11,c=A,alpha=.37,linewidths=0,zorder=3)
# Highlight three links to make direction readable without giving each pair an arrowhead.
for target in [(0.84,0.84),(0.52,0.85),(0.84,0.45)]:
 candidates=np.where(mode==1)[0];i=candidates[np.argmin(np.sum((xy[candidates]-target)**2,axis=1))]
 ax.annotate('',xy=after[i],xytext=xy[i],arrowprops={'arrowstyle':'->','color':A,'lw':1.5,'mutation_scale':12},zorder=6)
 ax.scatter(*xy[i],s=35,facecolors='white',edgecolors=P,lw=1,zorder=7)
 ax.scatter(*after[i],s=28,c=A,edgecolors='white',lw=.5,zorder=7)
ax.scatter([],[],s=30,facecolors='white',edgecolors=P,label='Before grouping')
ax.scatter([],[],s=28,c=A,label='After grouping')
ax.legend(loc='lower left',bbox_to_anchor=(.015,.12),frameon=False,fontsize=9,handletextpad=.5,labelspacing=.8)
ax.text(.035,.06,'Linked endpoints = same consultation\nArrows show illustrative grouping changes',fontsize=8,color=M,linespacing=1.5)
cs=ax.contour(xx,yy,z,levels=levels,colors=[P,P],linewidths=[.9,1.5],alpha=.85,zorder=3)
ax.clabel(cs,fmt={levels[0]:'90% density',levels[1]:'50% density'},fontsize=9,inline=True)
ax.scatter([1],[1],s=95,marker='*',c='#b67637',zorder=5,clip_on=False)
ax.annotate('Complete & faithful',xy=(1,1),xytext=(.63,1.045),fontsize=10,color='#725632',arrowprops=dict(arrowstyle='-',color='#b67637'),annotation_clip=False)
ax.text(.035,.955,'Faithful, but incomplete',fontsize=10,color='#746989',va='top');ax.text(.97,.30,'Loss of coverage\nand faithfulness',fontsize=9,color=A,ha='right')
ax.set(xlim=(0,1),ylim=(0,1),xlabel='Coverage of original claims',ylabel='Faithfulness of claims at each stage');ax.set_aspect('equal');ax.xaxis.set_major_formatter(PercentFormatter(1));ax.yaxis.set_major_formatter(PercentFormatter(1));ax.set_xticks(np.linspace(0,1,6));ax.set_yticks(np.linspace(0,1,6))
top.fill_between(grid,z.sum(axis=0),color='#d8d0e7',alpha=.65);top.plot(grid,z.sum(axis=0),c=P,lw=1.2);right.fill_betweenx(grid,0,z.sum(axis=1),color='#d8d0e7',alpha=.65);right.plot(z.sum(axis=1),grid,c=P,lw=1.2)
top.set_xlim(0,1);right.set_ylim(0,1)
for a in [top,right]:a.axis('off')
f.text(.625,.891,'b',fontsize=13,weight='bold');f.text(.646,.893,'How much meaning survives?',fontsize=11)
f.text(.646,.866,'SAVED PILOT · UNBLINDED SELF-REVIEW',fontsize=8,color=P)
b=f.add_axes([.646,.608,.305,.225]);b.set(xlim=(0,100),ylim=(-.4,3.65));b.set_yticks([])
ps=json.loads((BASE/'assistant-extraction/results.json').read_text())['panels'];names=['Inclusive education','Diagnostic screening','Youth justice','School attendance']
for i,name in enumerate(names):
 cases=ps[i*6:i*6+6];den=sum(p['reference_count'] for p in cases);counts=[sum(p['faithful'] for p in cases),sum(p['partial'] for p in cases),sum(len(p['omitted_ids']) for p in cases)];y=3-i
 full,partial=100*np.array(counts[:2])/den
 b.text(0,y+.27,name,fontsize=9.3)
 b.text(100,y+.27,f'{full:.1f}%',ha='right',fontsize=10,color=P,weight='medium')
 b.plot([0,100],[y,y],color='#eeeaf2',lw=3,solid_capstyle='round',zorder=1)
 b.plot([0,full],[y,y],color=P,lw=2.5,solid_capstyle='round',zorder=2)
 b.plot([full,full+partial],[y,y],color=A,lw=2.5,solid_capstyle='round',zorder=3)
 b.scatter(full+partial,y,s=24,facecolors='white',edgecolors=A,lw=1.1,zorder=4)
 b.scatter(full,y,s=35,facecolors=P,edgecolors='white',lw=.8,zorder=5)
 b.scatter(100,y,s=9,color='#cbc3d4',zorder=3)
b.set_xticks([0,25,50,75,100]);b.set_xlabel('Original claims retained (%)',fontsize=9,labelpad=7);b.tick_params(length=0,labelsize=8);b.spines['left'].set_visible(False);b.spines['bottom'].set_color('#ded8e5')
for x,label,col in [(.646,'● Full',P),(.723,'○ + partial',A),(.825,'— Omitted remainder',M)]:f.text(x,.55,label,fontsize=8,color=col)
f.text(.625,.490,'c',fontsize=13,weight='bold');f.text(.646,.492,'Which information is lost?',fontsize=11);f.text(.646,.467,'ILLUSTRATIVE · INFORMATION TYPES',fontsize=8,color=A)
c=f.add_axes([.646,.205,.305,.235]);c.set(xlim=(0,100),ylim=(-.48,3.8));c.set_yticks([]);g=np.linspace(0,100,400)
rows=[r for r in csv.DictReader((OUT/'02-selective-loss.csv').open()) if r['design']=='retention']
# Restore the selective-loss palette and individual observations; jitter changes y only.
point_rng=np.random.default_rng(928502)
for i,(cat,col) in enumerate(zip(['Majority findings','Minority objections','Uncertainty','Conditions / exceptions'],[P,'#398b88',P,A])):
 y=3-i;v=np.array([float(r['retention_pct']) for r in rows if r['category']==cat]);den=sum(np.exp(-.5*((g[:,None]-u[None,:])/4.5)**2).mean(axis=1) for u in [v,-v,200-v])/(4.5*np.sqrt(2*np.pi))
 c.fill_between(g,y+.025,y+.025+den*9,color=col,alpha=.15,lw=0);c.plot(g,y+.025+den*9,color=col,lw=1.1)
 c.scatter(v,y-.12-point_rng.uniform(0,.18,len(v)),s=7,color=col,alpha=.27,linewidths=0,zorder=2)
 lo,med,hi=np.quantile(v,[.25,.5,.75]);c.plot([lo,hi],[y-.19]*2,color=col,lw=2.5,solid_capstyle='round',zorder=3);c.scatter(med,y-.19,s=28,color=col,edgecolor='white',lw=.8,zorder=4);c.text(0,y+.54,cat,fontsize=8.7,color=col)
c.set_xticks([0,25,50,75,100]);c.set_xlabel('Original information retained (%)',fontsize=9,labelpad=7);c.spines['left'].set_visible(False);c.spines['bottom'].set_color('#ded8e5');c.tick_params(length=0,labelsize=8)
f.text(.075,.117,'a  320 explicitly simulated before–after pairs; contours and marginal curves describe BEFORE grouping only. No grouping experiment was run.',fontsize=9,color=M)
f.text(.075,.089,'b  Saved self-reviewed pilot: six panels per scenario.   c  Separate simulated information types; dot and line = median and middle 50%.',fontsize=9,color=M)
f.text(.075,.052,'The paired design holds each extraction fixed and evaluates both endpoints against the same original source. Transitions are invented, not estimated.',fontsize=9,color=P)
f.text(.075,.025,'Unchanged pairs illustrate faithful merging; other pairs illustrate possible losses or removal of unsupported content. Pilot omissions reflect its eight-claim cap.',fontsize=9,color=M)
for ext in ['svg','pdf','png']:f.savefig(OUT/f'extraction-overview.{ext}',dpi=600,facecolor='white')
p=OUT/'extraction-overview.svg';p.write_text('\n'.join(x.rstrip() for x in p.read_text().replace("'DejaVu Sans'","'Arial', sans-serif").splitlines())+'\n')

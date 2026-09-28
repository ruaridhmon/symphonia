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
(OUT/'grouping-design.json').write_text(json.dumps({'status':'SIMULATED DESIGN ONLY; no grouping outputs evaluated','seed':928501,'pairs':320,'before_source':'extraction-preview/illustrative-data.json','after_rule':'40% unchanged; 40% constructed loss in both metrics; 20% higher faithfulness with small coverage loss. Effects deliberately chosen, not estimated.','density':'Separate before and after densities; same bandwidth, density normalisation and marginal scale; purple before, orange after; contours enclose 50% and 90% at each stage','reference':'Both endpoints use the same original source reference; input extraction is held fixed within each constructed pair.'},indent=2)+'\n')
P='#665394';A='#bd784d';G='#ddd7e5';M='#81778c';INK='#302a39'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'svg.fonttype':'none','pdf.fonttype':42,'axes.spines.top':False,'axes.spines.right':False,'axes.edgecolor':'#b8b2bd','text.color':INK,'xtick.color':M,'ytick.color':M})
f=plt.figure(figsize=(12,14),facecolor='white')
f.text(.075,.962,'From expert responses to a shared claim set',fontsize=22)
f.text(.075,.929,'Round 1 responses',fontsize=10,color=M)
f.text(.36,.929,'Extracted claims',fontsize=10,color=M)
f.text(.69,.929,'Grouped claims for round 2',fontsize=10,color=M)
for start,end in [(.22,.34),(.495,.67)]:
 f.add_artist(FancyArrowPatch((start,.934),(end,.934),transform=f.transFigure,arrowstyle='->',mutation_scale=9,lw=.8,color='#b7a8cb'))
f.text(.075,.907,'a',fontsize=13,weight='bold');f.text(.100,.908,'Before → after grouping',fontsize=11);f.text(.435,.883,'ILLUSTRATIVE',fontsize=8,color=A,ha='right')
# Separate stages, with identical bandwidth, scales, colour normalisation and layout.
def stage_density(values):
 density=np.zeros_like(xx)
 for x,y in values:
  for xr in [x,-x,2-x]:
   for yr in [y,-y,2-y]:density+=np.exp(-((xx-xr)**2+(yy-yr)**2)/(2*h*h))
 return density/density.sum()
z_after=stage_density(after)
common_max=max(z.max(),z_after.max())
marginal_max=max(z.sum(axis=0).max(),z.sum(axis=1).max(),z_after.sum(axis=0).max(),z_after.sum(axis=1).max())
cmap=LinearSegmentedColormap.from_list('ink',['#ffffff','#f5f1fa','#e7ddf1','#c3b0dc','#9b81bd'])
orange_map=LinearSegmentedColormap.from_list('copper',['#ffffff','#fcf5ee','#f3dfcc','#dfb48d','#c58853'])
for index,(label,values,density,bottom) in enumerate([('Before grouping',xy,z,.55),('After grouping',after,z_after,.175)]):
 col=P if index==0 else A
 stage_map=cmap if index==0 else orange_map
 ax=f.add_axes([.075,bottom,.36,.29]);top=f.add_axes([.075,bottom+.296,.36,.018]);right=f.add_axes([.448,bottom,.025,.29])
 f.text(.075,bottom+.327,label,fontsize=11,color=col)
 ax.text(.035,.05,'320 simulated consultations',transform=ax.transAxes,fontsize=8,color=M)
 ax.contourf(xx,yy,density,levels=np.linspace(0,common_max,24),cmap=stage_map,zorder=1)
 ax.scatter(values[:,0],values[:,1],s=10,c=col,alpha=.28,linewidths=0,zorder=2)
 ranked=np.sort(density.ravel())[::-1];cumulative=ranked.cumsum();thresholds=[ranked[np.searchsorted(cumulative,q)] for q in [.9,.5]]
 cs=ax.contour(xx,yy,density,levels=thresholds,colors=col,linewidths=[.8,1.3],alpha=.8)
 ax.clabel(cs,fmt={thresholds[0]:'90%',thresholds[1]:'50%'},fontsize=8,inline=True)
 ax.scatter([1],[1],s=55,marker='*',c='#b67637',clip_on=False,zorder=5)
 ax.set(xlim=(0,1),ylim=(0,1));ax.xaxis.set_major_formatter(PercentFormatter(1));ax.yaxis.set_major_formatter(PercentFormatter(1));ax.set_xticks(np.linspace(0,1,6));ax.set_yticks(np.linspace(0,1,6));ax.tick_params(labelsize=8)
 if index==1:ax.set_xlabel('Coverage of original claims',fontsize=10)
 top.fill_between(grid,density.sum(axis=0),color=col,alpha=.18);top.plot(grid,density.sum(axis=0),c=col,lw=1)
 right.fill_betweenx(grid,0,density.sum(axis=1),color=col,alpha=.18);right.plot(density.sum(axis=1),grid,c=col,lw=1)
 top.set(xlim=(0,1),ylim=(0,marginal_max*1.08));right.set(ylim=(0,1),xlim=(0,marginal_max*1.08))
 for margin in [top,right]:margin.axis('off')
f.text(.019,.52,'Faithfulness of claims',rotation=90,va='center',fontsize=10)
f.text(.55,.891,'b',fontsize=13,weight='bold');f.text(.57,.893,'How much meaning survives?',fontsize=11)
f.text(.57,.866,'SAVED PILOT · UNBLINDED SELF-REVIEW',fontsize=8,color=P)
b=f.add_axes([.57,.608,.38,.225]);b.set(xlim=(0,100),ylim=(-.4,3.65));b.set_yticks([])
ps=json.loads((BASE/'assistant-extraction/results.json').read_text())['panels'];names=['Inclusive education','Diagnostic screening','Youth justice','School attendance']
for i,name in enumerate(names):
 cases=ps[i*6:i*6+6];den=sum(p['reference_count'] for p in cases);counts=[sum(p['faithful'] for p in cases),sum(p['partial'] for p in cases),sum(len(p['omitted_ids']) for p in cases)];y=3-i
 full,partial=100*np.array(counts[:2])/den
 b.text(0,y+.27,name,fontsize=9.3)
 b.text(100,y+.27,f'{full:.1f}%',ha='right',fontsize=11,color=P)
 b.text(0,y-.25,f'{counts[0]} of {den} fully preserved',fontsize=7.8,color=M)
 b.plot([0,100],[y,y],color='#e9e5ed',lw=2,solid_capstyle='round',zorder=1)
 b.plot([0,full],[y,y],color=P,lw=2,solid_capstyle='round',zorder=2)
 b.plot([full,full+partial],[y,y],color=A,lw=2,solid_capstyle='round',zorder=3)
 b.scatter(full+partial,y,s=24,facecolors='white',edgecolors=A,lw=1.1,zorder=4)
 b.scatter(full,y,s=35,facecolors=P,edgecolors='white',lw=.8,zorder=5)
 b.scatter(100,y,s=9,color='#cbc3d4',zorder=3)
b.set_xticks([0,50,100]);b.set_xlabel('Original claims retained (%)',fontsize=9,labelpad=7);b.tick_params(length=0,labelsize=8);b.spines['left'].set_visible(False);b.spines['bottom'].set_color('#ded8e5')
for x,label,col in [(.57,'● Full',P),(.67,'○ + partial',A),(.80,'— Omitted remainder',M)]:f.text(x,.55,label,fontsize=8,color=col)
f.text(.55,.490,'c',fontsize=13,weight='bold');f.text(.57,.492,'Which information is lost?',fontsize=11);f.text(.57,.467,'ILLUSTRATIVE · INFORMATION TYPES',fontsize=8,color=A)
c=f.add_axes([.57,.205,.38,.235]);c.set(xlim=(0,100),ylim=(-.48,3.8));c.set_yticks([]);g=np.linspace(0,100,400)
rows=[r for r in csv.DictReader((OUT/'02-selective-loss.csv').open()) if r['design']=='retention']
# Restore the selective-loss palette and individual observations; jitter changes y only.
point_rng=np.random.default_rng(928502)
for i,(cat,col) in enumerate(zip(['Majority findings','Minority objections','Uncertainty','Conditions / exceptions'],[P,'#398b88',P,A])):
 y=3-i;v=np.array([float(r['retention_pct']) for r in rows if r['category']==cat]);den=sum(np.exp(-.5*((g[:,None]-u[None,:])/4.5)**2).mean(axis=1) for u in [v,-v,200-v])/(4.5*np.sqrt(2*np.pi))
 c.fill_between(g,y+.025,y+.025+den*9,color=col,alpha=.15,lw=0);c.plot(g,y+.025+den*9,color=col,lw=1.1)
 c.scatter(v,y-.12-point_rng.uniform(0,.18,len(v)),s=7,color=col,alpha=.27,linewidths=0,zorder=2)
 lo,med,hi=np.quantile(v,[.25,.5,.75]);c.plot([lo,hi],[y-.19]*2,color=col,lw=2.5,solid_capstyle='round',zorder=3);c.scatter(med,y-.19,s=28,color=col,edgecolor='white',lw=.8,zorder=4);c.text(0,y+.54,cat,fontsize=8.7,color=col)
c.set_xticks([0,25,50,75,100]);c.set_xlabel('Original information retained (%)',fontsize=9,labelpad=7);c.spines['left'].set_visible(False);c.spines['bottom'].set_color('#ded8e5');c.tick_params(length=0,labelsize=8)
# Publication-style caption travels with SVG, PDF and PNG exports.
import textwrap
caption=(
 'a, Coverage and faithfulness before grouping (purple) and after grouping (orange), shown for the same 320 simulated consultations. '
 'Coverage measures how much original claim content is retained; faithfulness measures whether the resulting claims preserve the source meaning. '
 'Both maps use identical axes and density normalisation. Contours enclose 50% and 90% of each estimated density; marginal curves show each metric separately. '
 'The grouping changes are constructed illustrations, not measured effects. '
 'b, Saved assistant-pilot retention across four synthetic scenarios (six panels and 55 reference-claim occurrences per scenario). '
 'Purple marks full preservation, amber adds partial preservation, and the pale remainder represents omissions. '
 'Judgments were unblinded self-review; all omissions reflect the eight-claim cap. '
 'c, Illustrative retention distributions for four information types, using a separate 120 simulated cases per type. '
 'Faint points show individual cases; prominent dots and horizontal segments show medians and interquartile ranges, not confidence intervals. '
 'These panels do not establish a measured grouping effect or independently validated platform performance.'
)
f.text(.075,.130,'Figure 1 | Preserving meaning from expert responses to grouped claims.',fontsize=10,weight='bold',color=INK)
f.text(.075,.113,textwrap.fill(caption,width=157),fontsize=8.2,color='#625b6c',va='top',linespacing=1.5)
for ext in ['svg','pdf','png']:f.savefig(OUT/f'extraction-overview.{ext}',dpi=600,facecolor='white')
p=OUT/'extraction-overview.svg';p.write_text('\n'.join(x.rstrip() for x in p.read_text().replace("'DejaVu Sans'","'Arial', sans-serif").splitlines())+'\n')

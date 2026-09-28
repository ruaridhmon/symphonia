"""One composed figure; existing simulations and saved pilot remain distinct."""
from pathlib import Path
import json,csv
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.ticker import PercentFormatter
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'frontend/public/evaluation';OUT=BASE/'paper-concepts'
points=json.loads((BASE/'extraction-preview/illustrative-data.json').read_text())['points']
xy=np.array([[p['coverage'],p['faithfulness']] for p in points]);grid=np.linspace(0,1,201);xx,yy=np.meshgrid(grid,grid);z=np.zeros_like(xx);h=.045
for x,y in xy:
 for xr in [x,-x,2-x]:
  for yr in [y,-y,2-y]:z+=np.exp(-((xx-xr)**2+(yy-yr)**2)/(2*h*h))
z/=z.sum();rank=np.sort(z.ravel())[::-1];mass=rank.cumsum();levels=[rank[np.searchsorted(mass,q)] for q in [.9,.5]]
P='#665394';A='#bd784d';G='#ddd7e5';M='#81778c';INK='#302a39'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'svg.fonttype':'none','pdf.fonttype':42,'axes.spines.top':False,'axes.spines.right':False,'axes.edgecolor':'#b8b2bd','text.color':INK,'xtick.color':M,'ytick.color':M})
f=plt.figure(figsize=(14,10),facecolor='white')
f.text(.075,.962,'From expert responses to a shared claim set',fontsize=22)
f.text(.075,.929,'ROUND 1 → ROUND 2   /   Figure design combining illustrative panels and a provisional pilot',fontsize=10,color=M)
f.text(.075,.891,'a',fontsize=13,weight='bold');f.text(.096,.893,'Overall extraction quality',fontsize=11);f.text(.505,.893,'ILLUSTRATIVE',fontsize=8,color=A,ha='right')
ax=f.add_axes([.075,.205,.43,.602]);top=f.add_axes([.075,.850,.43,.03]);right=f.add_axes([.522,.205,.035,.602])
cmap=LinearSegmentedColormap.from_list('ink',['#ffffff','#f5f1fa','#e7ddf1','#c3b0dc','#9b81bd'])
ax.contourf(xx,yy,z,levels=np.linspace(0,z.max(),24),cmap=cmap,zorder=1)
ax.scatter(xy[:,0],xy[:,1],s=10,c=P,alpha=.23,linewidths=0,zorder=2)
cs=ax.contour(xx,yy,z,levels=levels,colors=[P,P],linewidths=[.9,1.5],alpha=.85,zorder=3)
ax.clabel(cs,fmt={levels[0]:'90% density',levels[1]:'50% density'},fontsize=9,inline=True)
ax.scatter([1],[1],s=95,marker='*',c='#b67637',zorder=5,clip_on=False)
ax.annotate('Complete & faithful',xy=(1,1),xytext=(.63,1.045),fontsize=10,color='#725632',arrowprops=dict(arrowstyle='-',color='#b67637'),annotation_clip=False)
ax.text(.035,.955,'Faithful, but incomplete',fontsize=10,color='#746989',va='top');ax.text(.97,.07,'More unsupported or\naltered extractions',fontsize=10,color='#746989',ha='right')
ax.set(xlim=(0,1),ylim=(0,1),xlabel='Coverage of original claims',ylabel='Faithfulness of extracted claims');ax.set_aspect('equal');ax.xaxis.set_major_formatter(PercentFormatter(1));ax.yaxis.set_major_formatter(PercentFormatter(1));ax.set_xticks(np.linspace(0,1,6));ax.set_yticks(np.linspace(0,1,6))
top.fill_between(grid,z.sum(axis=0),color='#d8d0e7',alpha=.65);top.plot(grid,z.sum(axis=0),c=P,lw=1.2);right.fill_betweenx(grid,0,z.sum(axis=1),color='#d8d0e7',alpha=.65);right.plot(z.sum(axis=1),grid,c=P,lw=1.2)
top.set_xlim(0,1);right.set_ylim(0,1)
for a in [top,right]:a.axis('off')
f.text(.625,.891,'b',fontsize=13,weight='bold');f.text(.646,.893,'How much meaning survives?',fontsize=11)
f.text(.646,.866,'SAVED PILOT · UNBLINDED SELF-REVIEW',fontsize=8,color=P)
b=f.add_axes([.646,.588,.305,.245]);b.set(xlim=(0,100),ylim=(-.5,3.65));b.set_yticks([])
ps=json.loads((BASE/'assistant-extraction/results.json').read_text())['panels'];names=['Inclusive education','Diagnostic screening','Youth justice','School attendance']
for i,name in enumerate(names):
 cases=ps[i*6:i*6+6];den=sum(p['reference_count'] for p in cases);counts=[sum(p['faithful'] for p in cases),sum(p['partial'] for p in cases),sum(len(p['omitted_ids']) for p in cases)];y=3-i;left=0
 b.text(0,y+.25,name,fontsize=9)
 for n,col in zip(counts,[P,A,G]):b.plot([left,left+100*n/den],[y,y],color=col,lw=5,solid_capstyle='butt');left+=100*n/den
 b.text(100,y+.25,f'{100*counts[0]/den:.1f}% fully preserved',ha='right',fontsize=8,color=P)
b.set_xticks([0,25,50,75,100]);b.set_xlabel('Share of original focal claims (%)',fontsize=9,labelpad=7);b.tick_params(length=0,labelsize=8);b.spines['left'].set_visible(False)
for x,label,col in [(.646,'● Fully preserved',P),(.773,'● Partial',A),(.864,'● Omitted',M)]:f.text(x,.525,label,fontsize=8,color=col)
f.text(.625,.468,'c',fontsize=13,weight='bold');f.text(.646,.470,'Which information is lost?',fontsize=11);f.text(.646,.445,'ILLUSTRATIVE · INFORMATION TYPES',fontsize=8,color=A)
c=f.add_axes([.646,.205,.305,.205]);c.set(xlim=(0,100),ylim=(-.35,3.85));c.set_yticks([]);g=np.linspace(0,100,400)
rows=[r for r in csv.DictReader((OUT/'02-selective-loss.csv').open()) if r['design']=='retention']
for i,cat in enumerate(['Majority findings','Minority objections','Uncertainty','Conditions / exceptions']):
 y=3-i;v=np.array([float(r['retention_pct']) for r in rows if r['category']==cat]);den=sum(np.exp(-.5*((g[:,None]-u[None,:])/4.5)**2).mean(axis=1) for u in [v,-v,200-v])/(4.5*np.sqrt(2*np.pi))
 c.fill_between(g,y,y+den*7,color=P,alpha=.13,lw=0);c.plot(g,y+den*7,color=P,lw=1);c.vlines(v,y-.05,y-.015,color=P,alpha=.18,lw=.6)
 lo,med,hi=np.quantile(v,[.25,.5,.75]);c.plot([lo,hi],[y-.13]*2,color=P,lw=2);c.scatter(med,y-.13,s=18,color=P,edgecolor='white',lw=.5,zorder=4);c.text(0,y+.47,cat,fontsize=8)
c.set_xticks([0,25,50,75,100]);c.set_xlabel('Original information retained (%)',fontsize=9,labelpad=7);c.spines['left'].set_visible(False);c.tick_params(length=0,labelsize=8)
f.text(.075,.117,'a  320 simulated consultations; contours show density, not uncertainty.   b  Six panels and 55 focal-claim occurrences per scenario.',fontsize=9,color=M)
f.text(.075,.089,'c  120 separate simulated cases per type; dot and line show median and middle 50%. Panels do not share a measured cohort.',fontsize=9,color=M)
f.text(.075,.050,'Pilot limitation: the eight-claim cap accounts for all 28 omissions; grouping loss was not isolated. Illustrative patterns are not findings.',fontsize=9,color=M)
for ext in ['svg','pdf','png']:f.savefig(OUT/f'extraction-overview.{ext}',dpi=600,facecolor='white')
p=OUT/'extraction-overview.svg';p.write_text('\n'.join(x.rstrip() for x in p.read_text().replace("'DejaVu Sans'","'Arial', sans-serif").splitlines())+'\n')

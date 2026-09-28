"""Compose existing illustrative scores with explicitly separate rating examples. No model calls."""
from pathlib import Path
import csv,json,textwrap
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
R=Path(__file__).resolve().parents[2]; O=R/'frontend/public/evaluation/paper-concepts'
P='#665394'; T='#398b88'; A='#bd784d'; M='#81778c'; INK='#302a39'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':9,'svg.fonttype':'none','pdf.fonttype':42,'axes.spines.top':False,'axes.spines.right':False,'axes.edgecolor':'#c6c0cc','axes.linewidth':.65,'text.color':INK,'axes.labelcolor':INK,'xtick.color':M,'ytick.color':M,'xtick.major.width':.65,'ytick.major.width':.65})
rows=list(csv.DictReader((O/'04-deliberation.csv').open()))
f=plt.figure(figsize=(12,12.5),facecolor='white')
f.text(.075,.956,'Does feedback change minds—or improve judgment?',fontsize=19)
f.text(.075,.920,'ROUND 2 → ROUND 3',fontsize=10,color=P)
f.text(.95,.920,'ILLUSTRATIVE DESIGN · NO MEASURED FEEDBACK EFFECT',fontsize=8,color=A,ha='right')
f.text(.075,.877,'a',weight='bold',fontsize=12);f.text(.098,.878,'How does the shape of opinion change?',fontsize=11)
f.text(.075,.851,'Round 2',color=P,fontsize=9);f.text(.17,.851,'Round 3',color=T,fontsize=9)
examples=[('Persistent disagreement',[8,2,0,2,8],[7,3,0,3,7]),('Convergence',[6,4,0,4,6],[0,2,3,10,5]),('Growing polarisation',[2,5,6,5,2],[7,2,2,2,7])]
example_rows=[]
for i,(title,first,last) in enumerate(examples):
 ax=f.add_axes([.075+i*.31,.669,.255,.139]);x=np.arange(1,6)
 for name,counts,col in [('Round 2',first,P),('Round 3',last,T)]:
  y=np.array(counts)/sum(counts)*100
  ax.fill_between(x,y,color=col,alpha=.09);ax.plot(x,y,color=col,lw=1.4,marker='o',ms=3,markeredgecolor='white',markeredgewidth=.4)
  example_rows +=[dict(example=title,round=name,rating=int(v),count=int(n),status='SIMULATED EXAMPLE; separate from panels b and c') for v,n in zip(x,counts)]
 ax.set(xlim=(1,5),ylim=(0,60),xticks=x,yticks=[0,20,40,60],xlabel='Rating (1–5)');ax.set_title(title,loc='left',fontsize=10,pad=10)
 if i==0:ax.set_ylabel('Participants (%)')
 ax.tick_params(labelsize=8)
f.text(.075,.623,'20 hypothetical participants per example · identical claims and scales · lines connect discrete rating proportions',fontsize=8,color=M)
f.text(.075,.583,'b',weight='bold',fontsize=12);f.text(.098,.584,'Does disagreement decrease?',fontsize=11)
f.text(.695,.583,'c',weight='bold',fontsize=12);f.text(.718,.584,'Does accuracy improve?',fontsize=11)
def cloud(ax,x,y,limx,limy,color,hx,hy):
 gx=np.linspace(*limx,140);gy=np.linspace(*limy,140);xx,yy=np.meshgrid(gx,gy)
 z=sum(np.exp(-.5*(((xx-a)/hx)**2+((yy-b)/hy)**2)) for a,b in zip(x,y));z/=z.sum()
 cmap=LinearSegmentedColormap.from_list('density'+color,['#ffffff',color+'18',color+'70'])
 ax.contourf(xx,yy,z,levels=np.linspace(0,z.max(),18),cmap=cmap)
 ax.scatter(x,y,c=color,s=12,alpha=.35,lw=0)
 rank=np.sort(z.ravel())[::-1];levels=sorted(rank[np.searchsorted(rank.cumsum(),q)] for q in [.5,.9])
 ax.contour(xx,yy,z,levels=levels,colors=color,linewidths=[.7,1.2],alpha=.8)
 ax.set(xlim=limx,ylim=limy);ax.tick_params(labelsize=8)
for i,(arm,col) in enumerate([('No feedback',P),('Peer feedback',T)]):
 subset=[r for r in rows if r['arm']==arm]
 assert len(subset)==100,(arm,len(subset))
 x=np.array([float(r['r2_disagreement_pct']) for r in subset]);y=np.array([float(r['r3_disagreement_pct']) for r in subset])
 ax=f.add_axes([.075+i*.30,.315,.25,.24]);cloud(ax,x,y,(0,100),(0,100),col,6,6)
 ax.plot([0,100],[0,100],color=M,lw=.7,ls=(0,(3,3)))
 ax.set(aspect='equal',xticks=[0,50,100],yticks=[0,50,100],xlabel='Round 2 disagreement (%)')
 if i==0:ax.set_ylabel('Round 3 disagreement (%)')
 ax.set_title(arm,loc='left',fontsize=10,color=col,pad=10)
 ax.text(.04,.91,'More disagreement',transform=ax.transAxes,fontsize=7,color=M)
 ax.text(.96,.05,'Less disagreement',transform=ax.transAxes,fontsize=7,color=M,ha='right')
subset=[r for r in rows if r['arm']=='Peer feedback'];x=np.array([float(r['delta_disagreement_pp']) for r in subset]);y=np.array([float(r['delta_accuracy_pp']) for r in subset])
ax=f.add_axes([.695,.315,.25,.24]);cloud(ax,x,y,(-50,50),(-50,50),T,5,5);ax.set_aspect('equal')
ax.axhline(0,c=M,lw=.7);ax.axvline(0,c=M,lw=.7)
ax.set(xticks=[-50,0,50],yticks=[-50,0,50],xlabel='Change in disagreement (pp)',ylabel='Change in accuracy (pp)');ax.set_title('Peer feedback · factual tasks',loc='left',fontsize=10,color=T,pad=10)
ax.text(.04,.94,'Converge + improve',transform=ax.transAxes,fontsize=7,color=T,va='top');ax.text(.04,.04,'Converge + worsen',transform=ax.transAxes,fontsize=7,color=A)
f.text(.075,.263,'100 simulated consultations per arm · diagonal = no change',fontsize=8,color=M)
f.text(.695,.263,'Same feedback cases as b · pp = percentage points',fontsize=8,color=M)
f.text(.075,.210,'Figure 2 | Distinguishing opinion change, convergence and factual improvement.',fontsize=11,weight='bold')
caption=('a, Three constructed examples show round-two and round-three rating distributions for 20 hypothetical participants per example. Lines join discrete proportions and are not continuous belief densities. These examples illustrate possible patterns; they were not selected from the consultations in b–c. '
'b, Each point represents one simulated consultation, compared before and after feedback or repeat rating without feedback. Points below the diagonal indicate reduced disagreement. Scores are reused from the existing illustrative deliberation dataset (100 cases per arm); they were constructed directly, not calculated from recorded ballots. '
'c, The same simulated feedback cases show changes in disagreement and factual accuracy. Convergence can accompany improvement or worsening; accuracy is meaningful only for questions with assessable answers. Contours in b–c enclose 50% and 90% of each estimated density and are descriptive, not confidence intervals. '
'For a real experiment, randomise consultations to feedback or no feedback, retain identical claims and scales, prespecify the disagreement measure, and compare matched participants while reporting attrition. These simulations demonstrate the figure design and do not establish a causal feedback effect.')
f.text(.075,.184,textwrap.fill(caption,155),fontsize=8.3,color='#514b58',va='top',linespacing=1.55)
with (O/'deliberation-rating-examples.csv').open('w') as fp:
 w=csv.DictWriter(fp,fieldnames=list(example_rows[0]));w.writeheader();w.writerows(example_rows)
(O/'deliberation-overview-provenance.json').write_text(json.dumps({'status':'ILLUSTRATIVE ONLY','a':'Separate constructed five-point rating counts; 20 participants per example per round. No individual transition records.','b_c':'Existing 04-deliberation.csv; constructed scores, not derived from ballots. Panel c uses exactly the peer-feedback cases in b.','model_calls':0},indent=2)+'\n')
for ext in ['svg','pdf','png']:f.savefig(O/f'deliberation-overview.{ext}',dpi=600,facecolor='white')
p=O/'deliberation-overview.svg';p.write_text('\n'.join(l.rstrip() for l in p.read_text().replace("'DejaVu Sans'","'Arial', sans-serif").splitlines())+'\n')

"""Seeded figure-design simulations only. No participant data or model calls."""
from pathlib import Path
import csv,json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap,TwoSlopeNorm
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'frontend/public/evaluation/paper-concepts';OUT.mkdir(exist_ok=True,parents=True)
rng=np.random.default_rng(92741)
P='#6b5296';T='#398b88';A='#bd784d';INK='#302a39';M='#81778c'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'svg.fonttype':'none','pdf.fonttype':42,'axes.spines.top':False,'axes.spines.right':False,'axes.edgecolor':'#dcd6e4','axes.labelcolor':INK,'xtick.color':M,'ytick.color':M,'text.color':INK})
cmap=LinearSegmentedColormap.from_list('violet',['#ffffff','#f4eff9','#dfd2ee','#af94cb','#8062a9'])
meta=[]
def frame(num,tag,title,subtitle):
 f=plt.figure(figsize=(10,9.5),facecolor='white')
 f.text(.10,.956,f'{num:02}  /  {tag}',fontsize=10,weight='bold',color=P)
 f.text(.10,.912,title,fontsize=23)
 f.text(.10,.87,'ILLUSTRATIVE ONLY  ·  Simulated data  ·  No measured platform performance',fontsize=9,color=A)
 f.text(.10,.825,subtitle,fontsize=10,color=M)
 return f

def finish(f,stem,rows,caption,explain):
 f.text(.10,.095,caption,fontsize=10,color='#675d74',linespacing=1.6)
 f.text(.10,.028,'DESIGN SIMULATION — NOT RESULTS. '+explain,fontsize=8,color=M,linespacing=1.5)
 for ext in ['svg','pdf','png']:f.savefig(OUT/f'{stem}.{ext}',dpi=600)
 svg=OUT/f'{stem}.svg';svg.write_text(svg.read_text().replace("'DejaVu Sans'","'Arial', sans-serif"))
 plt.close(f)
 with (OUT/f'{stem}.csv').open('w') as fp:
  w=csv.DictWriter(fp,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
 meta.append({'id':stem,'simulated_rows':len(rows),'status':'ILLUSTRATIVE DESIGN ONLY; no models or participants evaluated'})

def kde(v,g,h):
 return np.exp(-.5*((g[:,None]-v[None,:])/h)**2).mean(axis=1)/(h*np.sqrt(2*np.pi))
def rain(ax,groups,colors,lim,xlabel):
 grid=np.linspace(*lim,400)
 for i,(label,values) in enumerate(groups):
  den=kde(values,grid,(lim[1]-lim[0])*.045);den=den/den.max()*.34
  ax.fill_between(grid,i+.05,i+.05+den,color=colors[i],alpha=.16,lw=0)
  ax.plot(grid,i+.05+den,color=colors[i],lw=1.1)
  ax.scatter(values,i-.11-rng.random(len(values))*.13,s=8,color=colors[i],alpha=.20,lw=0)
  q=np.quantile(values,[.25,.5,.75]);ax.plot(q[[0,2]],[i-.12]*2,color=colors[i],lw=3);ax.scatter(q[1],i-.12,color=colors[i],s=33,edgecolor='white',lw=.7,zorder=4)
 ax.set(xlim=lim,ylim=(-.5,len(groups)-.45),yticks=range(len(groups)),yticklabels=[x[0] for x in groups],xlabel=xlabel)
 ax.spines['left'].set_visible(False);ax.tick_params(axis='y',length=0,pad=12);ax.grid(axis='x',color='#f2eff5',lw=.6);ax.set_axisbelow(True)

def density(ax,x,y,xlim,ylim,hx,hy,color=P):
 gx=np.linspace(*xlim,100);gy=np.linspace(*ylim,100);xx,yy=np.meshgrid(gx,gy)
 z=sum(np.exp(-.5*(((xx-a)/hx)**2+((yy-b)/hy)**2)) for a,b in zip(x,y));z/=z.sum()
 order=np.sort(z.ravel())[::-1];mass=order.cumsum();lev=sorted([order[np.searchsorted(mass,q)] for q in [.9,.5]])
 ax.contourf(xx,yy,z,levels=np.linspace(0,z.max(),18),cmap=cmap,zorder=0)
 ax.scatter(x,y,color=color,alpha=.24,s=10,lw=0,zorder=2)
 ax.contour(xx,yy,z,levels=lev,colors=color,linewidths=[.8,1.3],zorder=3)
 ax.set(xlim=xlim,ylim=ylim)
# 2. Category preservation plus controlled prestige-label swap. Separate simulated designs.
N=120; difficulty=rng.normal(0,8,N);cats=['Majority findings','Minority objections','Uncertainty','Conditions / exceptions']
vals=[np.clip(mu+difficulty+rng.normal(0,sd,N),1,99) for mu,sd in [(86,6),(62,13),(69,10),(57,13)]]
rows=[{'design':'retention','case':i+1,'category':cat,'retention_pct':float(v[i]),'label_swap_effect_pp':''} for cat,v in zip(cats,vals) for i in range(N)]
swap=rng.normal(4,7,N);swap[:18]-=rng.uniform(8,20,18)
rows +=[{'design':'prestige_swap','case':i+1,'category':'identical evidence','retention_pct':'','label_swap_effect_pp':float(v)} for i,v in enumerate(swap)]
f=frame(2,'SELECTIVE LOSS','Whose evidence survives?','A distribution reveals the typical case. Paired perturbations reveal selective treatment.')
a=f.add_axes([.27,.43,.63,.31]);rain(a,list(zip(cats[::-1],vals[::-1])),[A,P,T,P],(0,100),'Focal claims retained (%)');a.text(-.27,1.08,'a  Retention by information type',transform=a.transAxes,fontsize=12)
b=f.add_axes([.27,.205,.63,.12]);rain(b,[('Same evidence,\ndifferent status label',swap)],[P],(-25,25),'Change in retention when labelled higher status (percentage points)');b.axvline(0,color=M,ls=(0,(3,3)),lw=.8);b.text(-.27,1.18,'b  A matched bias test',transform=b.transAxes,fontsize=12)
finish(f,'02-selective-loss',rows,'Top: 120 hypothetical cases per category. Bottom: 120 hypothetical label-swap pairs.\nFine points retain individual cases; bold marks show medians and interquartile ranges.','Curves are descriptive KDEs, not confidence intervals. Category differences alone do not establish bias.\nThe matched test changes only the status label; its effect distribution here is invented for design purposes.')
# 3. Actual-versus-reported stance percentages (fictional counts), plus category error distributions.
N=240;actual=rng.uniform(5,95,N);reported=np.clip(actual+rng.normal(4,9,N)+np.where(actual>65,7,0),0,100)
# Different claim classes are intentionally given different illustrative error mechanisms.
classes=np.array(['Decidable facts','Unresolved claims','Minority warnings']);group=np.arange(N)%3
reported=np.clip(reported+np.where(group==1,8,0)-np.where(group==2,5,0),0,100)
rows=[{'claim':i+1,'type':classes[group[i]],'recorded_agreement_pct':float(actual[i]),'reported_agreement_pct':float(reported[i]),'signed_error_pp':float(reported[i]-actual[i])} for i in range(N)]
f=frame(3,'SUMMARY ACCURACY','Does the summary change the evidence?','An accurate summary sits on the diagonal. Systematic departures reveal distortion.')
a=f.add_axes([.11,.31,.52,.45]);density(a,actual,reported,(0,100),(0,100),6,6);a.plot([0,100],[0,100],color=T,lw=1.2,ls=(0,(4,3)));a.set(xlabel='Recorded agreement (%)',ylabel='Agreement stated in summary (%)');a.set_aspect('equal');a.text(.02,1.06,'a  Agreement fidelity',transform=a.transAxes,fontsize=12);a.text(6,91,'Overstated',color=P,fontsize=9);a.text(68,7,'Understated',color=M,fontsize=9)
b=f.add_axes([.72,.31,.20,.45])
for j,col in enumerate([P,T,A]):
 v=reported[group==j]-actual[group==j];g=np.linspace(-35,55,300);den=kde(v,g,4);den=den/den.max()*.3
 b.fill_betweenx(g,j-den,j+den,color=col,alpha=.15);b.plot(j+den,g,color=col,lw=1)
 b.scatter(j+rng.uniform(-.16,.16,len(v)),v,s=6,color=col,alpha=.24)
 b.scatter(j,np.median(v),color=col,s=30,edgecolor='white',zorder=4)
b.axhline(0,color=T,ls=(0,(4,3)),lw=1);b.set(ylim=(-35,55),xlim=(-.5,2.5),xticks=[0,1,2],xticklabels=['Facts','Unresolved','Warnings'],ylabel='Reported − recorded (percentage points)');b.tick_params(axis='x',labelrotation=45);b.text(-.05,1.06,'b  Error by claim type',transform=b.transAxes,fontsize=12)
finish(f,'03-summary-accuracy',rows,'Each point is one hypothetical rated claim (240 total). The diagonal means exact reporting.\nThe right panel separates error direction and spread, so a mean near zero cannot hide large mistakes.','Contours show 50% / 90% of smoothed illustrative density, not statistical uncertainty.\nAgreement percentages and error patterns are simulated; no actual consultation ratings enter this figure.')
# 4. Feedback/no-feedback panel trajectories, distinct disagreement and factual endpoints.
N=100;d0=rng.uniform(25,72,N);a0=rng.uniform(40,77,N)
rows=[];arms={}
for arm,dd,da in [('No feedback',-2,1),('Peer feedback',-13,5)]:
 d1=np.clip(d0+rng.normal(dd,8,N),0,100);a1=np.clip(a0+rng.normal(da,10,N),0,100);arms[arm]=(d1,a1)
 rows +=[{'panel':i+1,'arm':arm,'r2_disagreement_pct':float(d0[i]),'r3_disagreement_pct':float(d1[i]),'r2_accuracy_pct':float(a0[i]),'r3_accuracy_pct':float(a1[i]),'delta_disagreement_pp':float(d1[i]-d0[i]),'delta_accuracy_pp':float(a1[i]-a0[i])} for i in range(N)]
f=frame(4,'DELIBERATION','Agreement is not the same as accuracy','Separate convergence from correction—and compare against a no-feedback condition.')
for k,(arm,col) in enumerate([('No feedback',M),('Peer feedback',P)]):
 a=f.add_axes([.11+k*.22,.34,.17,.40]);d1,a1=arms[arm]
 for i in range(N):a.plot([0,1],[d0[i],d1[i]],color=col,alpha=.08,lw=.6)
 a.plot([0,1],[d0.mean(),d1.mean()],color=col,lw=2.4,marker='o',ms=5)
 a.set(ylim=(0,100),xlim=(-.15,1.15),xticks=[0,1],xticklabels=['Round 2','Round 3']);a.set_title(arm,fontsize=10,color=col,pad=12)
 if k==0:a.set_ylabel('Disagreement score (%)');a.text(-.05,1.12,'a  Within-panel trajectories',transform=a.transAxes,fontsize=12)
 else:a.set_yticklabels([])
b=f.add_axes([.62,.34,.30,.40]);d1,a1=arms['Peer feedback'];dx=d1-d0;dy=a1-a0
density(b,dx,dy,(-40,20),(-30,35),4,5);b.axvline(0,color='#c4bbcf',lw=.8);b.axhline(0,color='#c4bbcf',lw=.8);b.set(xlabel='Change in disagreement (pp)',ylabel='Change in factual accuracy (pp)');b.text(.0,1.12,'b  What kind of convergence?',transform=b.transAxes,fontsize=12)
b.text(-37,29,'Converge + improve',fontsize=8,color=T);b.text(-37,-26,'Converge + worsen',fontsize=8,color=A)
finish(f,'04-deliberation',rows,'Left: 100 hypothetical paired panels per condition; bold lines show arithmetic means.\nRight: peer-feedback panels can converge while becoming either more or less accurate.','Disagreement and factual-accuracy scores are constructed here, not calculated from recorded ballots.\nActual accuracy requires decidable claims; preferences have no truth score. Contours describe simulated density.')
# 5. Reader decisions: paired case mean loss and confidence/correctness relationship.
N=120;base=rng.beta(2,10,N)*100;ordinary=np.clip(base+rng.normal(13,10,N),0,100);trace=np.clip(base+rng.normal(4,7,N),0,100)
rows=[{'case':i+1,'full_record_loss':float(base[i]),'ordinary_summary_loss':float(ordinary[i]),'traceable_summary_loss':float(trace[i])} for i in range(N)]
f=frame(5,'DECISION CONSEQUENCES','Does information loss change decisions?','The final test is what readers understand and decide—not how persuasive a summary sounds.')
a=f.add_axes([.29,.49,.61,.25]);rain(a,[('Traceable summary',trace),('Ordinary summary',ordinary),('Full evidence',base)],[T,P,M],(0,80),'Decision loss (0 = best under a prespecified rule)');a.text(-.30,1.16,'a  Consequences across cases',transform=a.transAxes,fontsize=12)
b=f.add_axes([.15,.22,.34,.15]);diff=trace-ordinary;g=np.linspace(-45,25,250);den=kde(diff,g,3.5);b.fill_between(g,den,color=T,alpha=.16);b.plot(g,den,color=T,lw=1.4);b.scatter(diff,np.zeros(N)-.004,s=7,alpha=.25,color=T);b.axvline(0,color=M,ls='--',lw=.8);b.set(xlim=(-45,25),yticks=[],xlabel='Traceable − ordinary loss');b.text(0,1.14,'b  Paired difference by case',transform=b.transAxes,fontsize=11)
c=f.add_axes([.64,.22,.27,.15]);confidence=np.arange(10,100,10);calrows=[]
c.plot([0,100],[0,100],color='#bcb1ca',lw=.9,ls='--')
for label,col,offset in [('Ordinary',P,15),('Traceable',T,5)]:
 acc=np.clip(confidence-offset+np.sin(confidence/15)*4,0,100);c.plot(confidence,acc,color=col,lw=1.3,marker='o',ms=3,label=label)
 calrows +=[{'condition':label,'confidence_bin_pct':int(x),'correct_pct':float(y)} for x,y in zip(confidence,acc)]
c.set(xlim=(0,100),ylim=(0,100),xlabel='Confidence (%)',ylabel='Correct decisions (%)');c.legend(frameon=False,fontsize=7,loc='upper left');c.text(0,1.14,'c  Is confidence warranted?',transform=c.transAxes,fontsize=11)
with (OUT/'05-calibration.csv').open('w') as fp:
 w=csv.DictWriter(fp,fieldnames=list(calrows[0]));w.writeheader();w.writerows(calrows)
finish(f,'05-decision-consequences',rows,'Hypothetical reader-study design: 120 cases compared across three evidence presentations.\nPaired differences isolate the comparison; calibration checks whether confidence is deserved.','Case-level losses and calibration curves are entirely constructed. Shifts are design examples, not predicted benefits.\nA real study needs randomized readers, a prespecified decision rule, and reader- and case-aware analysis.')
(OUT/'manifest.json').write_text(json.dumps({'status':'ALL FIGURES ARE SIMULATED DESIGN CONCEPTS, NOT RESULTS','seed':92741,'figures':meta,'simulation':'Gaussian and beta draws with deliberately chosen shifts; parameters are in build.py. KDE bandwidths specified there. No inference, efficacy claims or provider calls.'},indent=2))
print('Generated four new illustrative figures; original extraction map reused unchanged.')

"""Independent illustrative trajectories. Never duplicates or modifies saved respondents."""
import csv,json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'frontend/public/evaluation/paper-concepts';out.mkdir(exist_ok=True)
name='illustrative-opinion-confidence';rng=np.random.default_rng(290928);n=100
panels=[('Moving towards agreement','#be8855',3.1,3.7,.65,.1),('Moving towards disagreement','#638fae',3.0,2.3,.65,-.25),('Stable opposing camps','#9675ae',3,3,.95,.55),('Positions becoming closer','#5d978e',3,3.4,.25,.3),('Growing polarisation','#be8855',3,3,.95,.5),('Opinion stable, certainty rising','#638fae',3.5,3.5,.85,.9),('Opinion stable, certainty falling','#9675ae',3.5,3.5,.85,-1.0),('Reconsidering with uncertainty','#5d978e',3.5,2.9,.35,-.5)]
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':9,'axes.spines.top':False,'axes.spines.right':False,'svg.fonttype':'none','pdf.fonttype':42})
fig,axes=plt.subplots(2,8,figsize=(17,8.8),gridspec_kw={'hspace':.5,'wspace':.15});fig.subplots_adjust(left=.10,right=.985,top=.79,bottom=.23)
rows=[]
for col,(title,color,m0,m1,retention,confidence_shift) in enumerate(panels):
 latent=rng.normal(m0,1.12,n)
 if col in [2,4]:latent=3+rng.choice([-1,1],n)*(1.45 if col==2 else .6)+rng.normal(0,.45,n)
 before=np.clip(np.rint(latent),1,5).astype(int)
 after_latent=m1+retention*(latent-m0)+rng.normal(0,.6,n)
 if col==4:after_latent=3+np.sign(latent-3)*1.6+rng.normal(0,.4,n)
 after=np.clip(np.rint(after_latent),1,5).astype(int)
 if col in [5,6]:after=before.copy()
 c0=np.clip(np.rint(rng.normal(3.0+.2*abs(before-3),.85,n)),1,5).astype(int)
 c1=np.clip(np.rint(c0+confidence_shift+rng.normal(0,.65,n)),1,5).astype(int)
 for p in range(n):
  for r in range(2):rows.append(dict(panel=col+1,pattern=title,participant=f'illustrative-{col+1}-{p+1:03}',round=r+2,opinion=int([before,after][r][p]),confidence=int([c0,c1][r][p]),provenance='Independent constructed illustration; not platform responses'))
 # The same participant offset is used in both rows and rounds; y-jitter is display only.
 xj=rng.uniform(-.12,.12,n);yj=rng.uniform(-.12,.12,(n,2))
 for row,matrix in enumerate([np.column_stack([before,after]),np.column_stack([c0,c1])]):
  ax=axes[row,col]
  for p in range(n):
   ax.plot(np.array([0,1])+xj[p],matrix[p]+yj[p],color=color,alpha=.09,lw=.55,zorder=1)
  for r in range(2):ax.scatter(r+xj,matrix[:,r]+yj[:,r],s=8,color=color,alpha=.34,linewidths=0,zorder=2)
  mean=matrix.mean(axis=0)
  ax.plot([0,1],mean,color='white',lw=5,zorder=3)
  ax.plot([0,1],mean,color=color,lw=2.2,zorder=4)
  ax.set_xlim(-.24,1.24);ax.set_ylim(.7,5.3);ax.set_xticks([0,1],['Round 2','Round 3']);ax.set_yticks(range(1,6));ax.tick_params(length=0,pad=6,labelsize=8)
  ax.set_yticklabels((['Strongly\ndisagree','Disagree','Neither','Agree','Strongly\nagree'] if row==0 else ['Not at all','Slightly','Moderately','Very','Extremely']) if col==0 else [])
  ax.grid(axis='y',color='#edf0f2',lw=.55);ax.set_axisbelow(True)
  for spine in ax.spines.values():spine.set_color('#d9dee4');spine.set_linewidth(.6)
  if row==0:
   import textwrap
   ax.set_title('\n'.join(textwrap.wrap(title,21)),fontsize=9,pad=16,color='#343c48')
  ax.text(.5,-.19,f'{int((matrix[:,0]!=matrix[:,1]).sum())}% changed',ha='center',transform=ax.transAxes,fontsize=8,color='#737c88')
fig.text(.035,.956,'The movement behind the average',fontsize=22,color='#252d37')
fig.text(.035,.915,'ILLUSTRATIVE DESIGN   /   100 independently simulated participants per panel · 800 in total',fontsize=10,color='#737c88')
fig.text(.035,.794,'a',fontsize=15,weight='bold');fig.text(.018,.67,'Opinion',rotation=90,fontsize=11,va='center')
fig.text(.035,.451,'b',fontsize=15,weight='bold');fig.text(.018,.33,'Confidence',rotation=90,fontsize=11,va='center')
fig.text(.10,.155,'Faint paths: individual participants     •     Bold lines: mean coded rating     •     Matching columns: the same people and claim',fontsize=9,color='#535e6b')
fig.text(.10,.105,'Eight hypothetical patterns demonstrate how changes in opinion and self-reported confidence can differ. Each thin line links one simulated participant\n'
 'across rounds; darker areas arise where paths overlap. Opinion and confidence use separate five-category scales. Small point offsets reveal overlap only;\n'
 'source ratings are integers. Bold trends are arithmetic means of category codes 1–5, not accuracy measures or confidence intervals. All movements are\n'
 'constructed to illustrate the design. These are not additional platform submissions, resampled pilot participants, or evidence of a feedback effect.',fontsize=8.5,color='#69717c',va='top',linespacing=1.6)
for ext in ['svg','pdf','png']:fig.savefig(out/f'{name}.{ext}',dpi=600,facecolor='white')
with (out/f'{name}.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
(out/f'{name}-provenance.json').write_text(json.dumps({'seed':290928,'participants_per_panel':100,'panels':8,'total_independent_simulated_participants':800,'source':'scripts/plot-illustrative-trajectories.py','status':'Entirely illustrative, independent of saved dev survey fixtures','scale':'Ordinal categories encoded 1–5; means descriptive only','display_jitter':'Horizontal +/-0.12, vertical +/-0.12; not added to source data','calls_or_platform_writes':0},indent=2))
print('Generated',len(rows),'illustrative participant-round records')

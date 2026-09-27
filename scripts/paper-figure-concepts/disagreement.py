"""Standalone sixth design; simulations only. Leaves previous figures untouched."""
from pathlib import Path
import json,csv
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'frontend/public/evaluation/paper-concepts'
rng=np.random.default_rng(92742);P='#6b5296';T='#398b88';A='#bd784d';M='#81778c';INK='#302a39'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':9,'svg.fonttype':'none','pdf.fonttype':42,'axes.spines.top':False,'axes.spines.right':False,'axes.edgecolor':'#dcd6e4','axes.labelcolor':INK,'xtick.color':M,'ytick.color':M,'text.color':INK})
f=plt.figure(figsize=(10,9.5),facecolor='white')
f.text(.10,.956,'06  /  PRESERVING DISAGREEMENT',fontsize=10,weight='bold',color=P)
f.text(.10,.913,'Shorter text. The same disagreement?',fontsize=23)
f.text(.10,.871,'ILLUSTRATIVE ONLY  ·  Simulated data  ·  No measured platform performance',fontsize=9,color=A)
f.text(.10,.826,'Preserve the objection, its reason and its conditions—not just the number of dissenters.',fontsize=10,color=M)
x=np.array([.10,.20,.35,.50,.70,1.0]);N=100;rows=[]
a=f.add_axes([.11,.48,.43,.28]);b=f.add_axes([.68,.48,.24,.28])
for label,col,shape in [('Majority arguments',P,1.9),('Minority objections',T,1.1),('Conditional positions',A,.75)]:
 thresholds=rng.beta(.65,shape,(N,12));valid=rng.random((N,12))>.045
 values=np.array([((thresholds<=v)&valid).mean(axis=1)*100 for v in x]).T
 for i in range(0,N,5):a.plot(x*100,values[i],color=col,alpha=.065,lw=.7)
 lo,med,hi=np.quantile(values,[.25,.5,.75],axis=0)
 a.fill_between(x*100,lo,hi,color=col,alpha=.10,lw=0);a.plot(x*100,med,color=col,lw=2,marker='o',ms=3,label=label)
 for i in range(N):
  for j,v in enumerate(x):rows.append({'panel':'retention','case':i+1,'category_or_method':label,'summary_length_pct':v*100,'retention_pct':values[i,j],'false_consensus':''})
a.set(xlim=(8,102),ylim=(0,103),xlabel='Summary length (% of source words)',ylabel='Distinct arguments faithfully retained (%)');a.set_xticks([10,35,70,100]);a.grid(axis='y',color='#f0edf4',lw=.6);a.legend(frameon=False,fontsize=8,loc='lower right');a.text(0,1.08,'a  Does the substance survive?',transform=a.transAxes,fontsize=11)
# Binary case labels at each budget; paired latent random numbers per case.
u=rng.random(N)
for label,col,scale in [('Ordinary summary',P,.40),('Explicit dissent',T,.15)]:
 probs=.01+scale*(1-x)**1.5
 values=u[:,None]<probs[None,:]
 b.plot(x*100,values.mean(axis=0)*100,color=col,lw=2,marker='o',ms=3,label=label)
 for i in range(N):
  for j,v in enumerate(x):rows.append({'panel':'false_consensus','case':i+1,'category_or_method':label,'summary_length_pct':v*100,'retention_pct':'','false_consensus':int(values[i,j])})
b.set(xlim=(8,102),ylim=(0,50),xlabel='Summary length (%)',ylabel='Summaries implying false consensus (%)');b.set_xticks([10,50,100]);b.grid(axis='y',color='#f0edf4',lw=.6);b.legend(frameon=False,fontsize=7,loc='upper right');b.text(0,1.08,'b  Is disagreement erased?',transform=b.transAxes,fontsize=11)
f.text(.11,.404,'c  Trace the reason—not only the stance',fontsize=11)
# Entirely authored trace, not a source quotation or scored experiment.
c=f.add_axes([.10,.185,.82,.185]);c.set(xlim=(0,1),ylim=(0,1));c.axis('off')
cols=[.00,.345,.69];w=.30
heads=['EXPERT INPUT','EXTRACTED CLAIMS','FAITHFUL SUMMARY']
texts=[[
('Support',P,'“The programme improves\noverall literacy.”'),
('Objection',T,'“I oppose universal rollout:\nit may harm anxious pupils.”')],
[('Benefit',P,'Overall literacy improves.'),('Dissent + reason',T,'Universal rollout is opposed\nbecause an anxious subgroup\nmay be harmed.')],
[('Both positions',P,'Literacy improves; possible harm\nto anxious pupils remains.'),('Reason retained',T,'One expert opposes universal\nrollout because of this risk.')]]
for xp,head,blocks in zip(cols,heads,texts):
 c.add_patch(FancyBboxPatch((xp,.01),w,.98,boxstyle='round,pad=0.008,rounding_size=0.025',facecolor='#fbf9fc',edgecolor='#e8e0ee',lw=.7))
 c.text(xp+.02,.89,head,fontsize=7.5,color=M,weight='bold')
 for yp,(label,col,txt) in zip([.73,.40],blocks):
  c.text(xp+.02,yp,label,fontsize=8,color=col,weight='bold');c.text(xp+.02,yp-.09,txt,fontsize=8,color=INK,va='top',linespacing=1.5)
for xp in [.314,.659]:c.annotate('',xy=(xp+.02,.52),xytext=(xp-.006,.52),arrowprops={'arrowstyle':'->','color':'#b7a7c9','lw':1.2})
f.text(.11,.145,'A stance-only summary—“There is support and disagreement”—loses the reason and the subgroup.',fontsize=9,color=A)
f.text(.10,.092,'100 hypothetical cases at six budgets; faint paths show 20 per category. Bands: IQR; bold lines: medians (a), rates (b).\nFalse consensus means implying shared agreement despite unresolved source disagreement; both methods are hypothetical.',fontsize=8,color='#675d74',linespacing=1.6)
f.text(.10,.027,'DESIGN SIMULATION — NOT RESULTS. Category differences and method benefits are constructed, not measured.\nPanel c is an authored example. A real test needs independently annotated reasons, conditions and blinded summary judgments.',fontsize=8,color=M,linespacing=1.5)
for ext in ['svg','pdf','png']:f.savefig(OUT/f'06-preserving-disagreement.{ext}',dpi=600)
p=OUT/'06-preserving-disagreement.svg';p.write_text(p.read_text().replace("'DejaVu Sans'","'Arial', sans-serif"));plt.close(f)
with (OUT/'06-preserving-disagreement.csv').open('w') as fp:
 wri=csv.DictWriter(fp,fieldnames=list(rows[0]));wri.writeheader();wri.writerows(rows)
(OUT/'06-design.json').write_text(json.dumps({'status':'ILLUSTRATIVE ONLY','seed':92742,'cases':N,'word_budgets':x.tolist(),'retention':'12 hypothetical arguments per category per case; beta thresholds with 4.5% structural omissions; nested retention across budgets.','false_consensus':'Paired uniform latent values and invented length-dependent probabilities; proportions across 100 hypothetical cases; no uncertainty inference.','example':'Authored vignette, not a quote from an actual consultation.','new_provider_calls':0},indent=2))
p=OUT/'manifest.json';m=json.loads(p.read_text());m['figures']=[v for v in m['figures'] if v['id']!='06-preserving-disagreement'];m['figures'].append({'id':'06-preserving-disagreement','simulated_rows':len(rows),'seed':92742,'status':'ILLUSTRATIVE ONLY; see 06-design.json and disagreement.py'});p.write_text(json.dumps(m,indent=2))
print('Sixth illustrative figure generated without modifying previous figures.')

"""Scenario-level retention companion using unchanged saved pilot judgments."""
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'frontend/public/evaluation/assistant-extraction'
ps=json.loads((OUT/'results.json').read_text())['panels']
P,A,G,M='#6b5296','#bd784d','#ddd7e5','#81778c'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'svg.fonttype':'none','pdf.fonttype':42,'text.color':'#302a39','axes.edgecolor':'#dcd6e4','xtick.color':M})
f=plt.figure(figsize=(6.5,9.5),facecolor='white')
f.text(.12,.94,'How much is retained?',fontsize=18)
f.text(.12,.9,'SAVED ASSISTANT PILOT · PROVISIONAL SELF-REVIEW',fontsize=8,color=P)
f.text(.12,.853,'Six panels pooled within each scenario.',fontsize=10,color=M)
a=f.add_axes([.14,.20,.77,.59]);a.set(xlim=(0,100),ylim=(-.45,3.85));a.set_yticks([])
names=['Inclusive education','Diagnostic screening','Youth justice','School attendance'];aggregate=[]
for i,name in enumerate(names):
 cases=ps[i*6:i*6+6];den=sum(p['reference_count'] for p in cases)
 counts=[sum(p['faithful'] for p in cases),sum(p['partial'] for p in cases),sum(len(p['omitted_ids']) for p in cases)]
 assert sum(counts)==den
 shares=[100*n/den for n in counts];y=3-i;left=0
 a.text(0,y+.53,name,fontsize=11)
 for v,col in zip(shares,[P,A,G]):
  if v:a.plot([left,left+v],[y+.13,y+.13],color=col,lw=5,solid_capstyle='butt')
  left+=v
 for x,v,col in zip([0,50,100],shares,[P,A,M]):a.text(x,y-.14,f'{v:.1f}%',ha='left' if x==0 else 'right' if x==100 else 'center',fontsize=10,color=col)
 aggregate.append({'scenario':cases[0]['scenario'],'name':name,'panels':6,'reference_occurrences':den,'fully_preserved':counts[0],'partial':counts[1],'omitted':counts[2]})
a.set_xticks([0,25,50,75,100]);a.set_xlabel('Share of original focal claims (%)',labelpad=12);a.tick_params(length=0,pad=8)
for side in ['top','right','left']:a.spines[side].set_visible(False)
f.text(.14,.105,'Fully preserved',color=P,fontsize=9);f.text(.49,.105,'Partial',color=A,fontsize=9);f.text(.79,.105,'Omitted',color=M,fontsize=9)
f.text(.12,.026,'55 focal-claim occurrences per scenario; 220 in total.\nThe eight-claim cap accounts for all 28 omissions.\nNot an independent validation or a grouping-loss experiment.',fontsize=8,color=M,linespacing=1.5)
for ext in ['svg','pdf','png']:f.savefig(OUT/f'retention-summary.{ext}',dpi=600,facecolor='white')
p=OUT/'retention-summary.svg';p.write_text('\n'.join(x.rstrip() for x in p.read_text().replace("'DejaVu Sans'","'Arial', sans-serif").splitlines())+'\n')
(OUT/'retention-summary.json').write_text(json.dumps({'status':'Saved assistant pilot; provisional unblinded self-review','scenarios':aggregate},indent=2)+'\n')

"""Render measured assistant-pilot counts only. No simulated points or API calls."""
import json
from pathlib import Path
from collections import Counter
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import PercentFormatter
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'frontend/public/evaluation/assistant-extraction'
data=json.loads((OUT/'results.json').read_text());ps=data['panels'];s=data['summary']
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':9,'svg.fonttype':'none','pdf.fonttype':42,'axes.edgecolor':'#ded9e8','axes.labelcolor':'#50485e','text.color':'#292235','xtick.color':'#82778f','ytick.color':'#82778f'})
purple='#7050a1';light='#e6def1'; ink='#32273f';amber='#b37a41'
f=plt.figure(figsize=(11.8,8.3),facecolor='white')
f.text(.075,.953,'Information retained under a fixed extraction budget',fontsize=19,weight='medium',color=ink)
f.text(.075,.916,'24 two-response panels  ·  4 synthetic scenarios  ·  192 assistant-authored extractions',fontsize=10,color='#746881')
ax=f.add_axes([.09,.35,.47,.49]);top=f.add_axes([.09,.853,.47,.025]);right=f.add_axes([.572,.35,.024,.49])
for a in [ax]:
 a.set(xlim=(-3,105),ylim=(-3,105),xlabel='Focal claims faithfully retained (%)',ylabel='Extracted claims faithfully preserved (%)')
 a.set_xticks([0,25,50,75,100]);a.set_yticks([0,25,50,75,100]);a.grid(color='#f0edf4',lw=.65,zorder=0)
 for side in ['top','right']:a.spines[side].set_visible(False)
# Fixed-denominator tracks are constraints, not fitted regression curves.
for n in [9,10]:
 ax.plot([0,800/n],[0,100],color='#d6ccdf',lw=1,ls=(0,(2,3)),zorder=1)
 ax.scatter([800/n],[100],s=450,facecolor='none',edgecolor='#c9badc',lw=.8,zorder=2)
counts=Counter((p['coverage']*100,p['faithfulness']*100) for p in ps)
for (x,y),n in sorted(counts.items(),key=lambda x:x[1],reverse=True):
 ax.scatter(x,y,s=100+n*75,facecolor=purple,alpha=.045,edgecolor='none',zorder=3)
 ax.scatter(x,y,s=n*62,facecolor=purple,alpha=.78,edgecolor='white',lw=.8,zorder=4)
 ax.text(x,y,str(n),ha='center',va='center',fontsize=8,color='white',weight='bold',zorder=5)
ax.scatter([100],[100],marker='+',color='#8f859b',s=65,lw=1,zorder=6)
ax.text(4,92,'a',weight='bold',fontsize=13)
ax.text(4,64,'Every marker is measured.\nArea and numeral show the number\nof panels at exactly that coordinate.',fontsize=9,color='#72647f',linespacing=1.6)
ax.text(4,8,'Dotted tracks: 9 or 10 focal claims per panel.\nOpen rings: maximum coverage with 8 outputs.',fontsize=8,color='#91839d',linespacing=1.7)
ax.annotate('100% support does not mean\n100% of the source was retained.',xy=(88.89,100),xytext=(27,111),textcoords='data',fontsize=8,color=purple,arrowprops={'arrowstyle':'-','color':'#b6a3cc','connectionstyle':'arc3,rad=-.15'},annotation_clip=False)
# Exact marginal counts. No smoothing or displacement is introduced.
for x,n in Counter(round(p['coverage']*100,6) for p in ps).items():top.vlines(x,0,n,color=purple,lw=3,alpha=.55)
top.set_xlim(ax.get_xlim());top.set_ylim(0,24);top.axis('off')
for y,n in Counter(p['faithfulness']*100 for p in ps).items():right.hlines(y,0,n,color=purple,lw=3,alpha=.55)
right.set_ylim(ax.get_ylim());right.set_xlim(0,24);right.axis('off')
# A compact, fully enumerated panel view preserves all 24 observations.
b=f.add_axes([.68,.35,.245,.49]);b.set_xlim(55,102);b.set_ylim(-.7,24.7)
colors=['#65418e','#8260a6','#a18abc','#bfb0d1']
for k,(world,color) in enumerate(zip(dict.fromkeys(p['scenario'] for p in ps),colors)):
 group=[p for p in ps if p['scenario']==world]
 for j,p in enumerate(group):
  y=23-(k*6+j)
  b.plot([100*p['coverage'],100*p['budget_ceiling']],[y,y],color='#d1c3e0',lw=2)
  b.scatter([100*p['budget_ceiling']],[y],s=32,facecolor='white',edgecolor='#b9a7ca',lw=.8,zorder=2)
  b.scatter([100*p['coverage']],[y],s=23,color=color,zorder=3)
 b.text(54,23-k*6-2.5,group[0]['title'].replace(' ','\n',1),ha='right',va='center',fontsize=8,color=color)
 if k<3:b.axhline(17.5-k*6,color='#f1edf5',lw=1)
b.set_xticks([60,80,100]);b.set_yticks([]);b.set_xlabel('Coverage (%)',fontsize=9)
for side in ['top','right','left']:b.spines[side].set_visible(False)
b.text(55,26.5,'b   All 24 panels',fontsize=11,weight='medium')
f.text(.68,.292,'● Strict review    ○ Partial labels accepted',fontsize=8,color='#7c698f')
# Transparent decomposition, counts are occurrences across panels.
f.text(.09,.235,'182',fontsize=26,color=purple);f.text(.175,.24,'faithfully retained\nunder strict review',fontsize=9,color='#6f647a',linespacing=1.5)
f.text(.385,.235,'10',fontsize=26,color=amber);f.text(.44,.24,'partial preservations\nqualifier or stance loss',fontsize=9,color='#6f647a',linespacing=1.5)
f.text(.68,.235,'28',fontsize=26,color='#9d91ad');f.text(.735,.24,'omitted focal claims\n8-output budget ceiling',fontsize=9,color='#6f647a',linespacing=1.5)
f.text(.09,.155,'READOUT',fontsize=8,color=purple,weight='bold')
f.text(.09,.125,'82.7% pooled strict coverage; 94.8% strict faithfulness. Accepting all ten partial labels gives 87.3% and 100%.',fontsize=10,color=ink)
f.text(.09,.055,'Unblinded assistant self-review, with source IDs visible. Panels share four synthetic scenarios; they are not independent studies.\nThese are saved assistant outputs, not calls to Symphonia’s extractor. No new OpenRouter calls. Endpoints are label sensitivity, not confidence intervals.',fontsize=8,color='#887b93',linespacing=1.65)
for ext in ['svg','pdf','png']:f.savefig(OUT/f'assistant-extraction.{ext}',dpi=600,facecolor='white')
plt.close(f)

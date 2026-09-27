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
f=plt.figure(figsize=(11.8,9.8),facecolor='white')
f.text(.075,.953,'Where does meaning disappear?',fontsize=19,weight='medium',color=ink)
f.text(.075,.916,'24 two-response panels  ·  4 synthetic scenarios  ·  192 assistant-authored extractions',fontsize=10,color='#746881')
ax=f.add_axes([.09,.445,.43,.385]);top=f.add_axes([.09,.845,.43,.022]);right=f.add_axes([.53,.445,.02,.385])
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
ax.text(4,64,'Each marker comes from saved outputs.\nArea and numeral count panels\nwith the same provisional scores.',fontsize=9,color='#72647f',linespacing=1.6)
ax.text(4,8,'Dotted tracks: 9 or 10 focal claims per panel.\nOpen rings: maximum coverage with 8 outputs.',fontsize=8,color='#91839d',linespacing=1.7)
ax.annotate('100% support does not mean\n100% of the source was retained.',xy=(88.89,100),xytext=(27,111),textcoords='data',fontsize=8,color=purple,arrowprops={'arrowstyle':'-','color':'#b6a3cc','connectionstyle':'arc3,rad=-.15'},annotation_clip=False)
# Exact marginal counts. No smoothing or displacement is introduced.
for x,n in Counter(round(p['coverage']*100,6) for p in ps).items():top.vlines(x,0,n,color=purple,lw=3,alpha=.55)
top.set_xlim(ax.get_xlim());top.set_ylim(0,24);top.axis('off')
for y,n in Counter(p['faithfulness']*100 for p in ps).items():right.hlines(y,0,n,color=purple,lw=3,alpha=.55)
right.set_ylim(ax.get_ylim());right.set_xlim(0,24);right.axis('off')
# Stage trajectories use measured extraction labels only. Source = denominator, not a score.
b=f.add_axes([.66,.445,.275,.385]);b.set(xlim=(-.15,2.2),ylim=(0,106))
b.axvspan(1.6,2.2,color='#f7f5f9',zorder=0)
for p in ps:
 b.plot([0,1],[100,100*p['coverage']],color=purple,lw=.8,alpha=.15,zorder=1)
for v,n in Counter(round(p['coverage']*100,8) for p in ps).items():
 b.scatter(1,v,s=28+n*11,color=purple,alpha=.5,edgecolor='white',lw=.7,zorder=3)
b.plot([0,1],[100,100*s['pooled_coverage']],color=purple,lw=2.7,zorder=4)
b.scatter([0,1],[100,100*s['pooled_coverage']],s=45,color=purple,edgecolor='white',zorder=5)
b.text(1.1,100*s['pooled_coverage']-8,'82.7%',fontsize=10,color=purple)
b.text(1.9,62,'Grouping',ha='center',fontsize=10,color='#81758e')
b.text(1.9,50,'Not yet\nmeasured',ha='center',fontsize=9,color='#81758e',linespacing=1.6)
b.set_xticks([0,1,1.9],['Original\ncontributions','Extracted\nclaims','Grouped\nclaims']);b.set_yticks([0,25,50,75,100]);b.set_ylabel('Original focal claims fully preserved (%)',labelpad=7)
b.tick_params(axis='x',length=0,pad=10,labelsize=8);b.grid(axis='y',color='#f0edf4',lw=.7)
for side in ['top','right']:b.spines[side].set_visible(False)
b.text(-.13,1.11,'b   Follow the meaning through the stages',transform=b.transAxes,fontsize=10)
b.text(0,-.23,'24 thin paths; larger dots = more panels.\nBold: pooled retention; source = reference.\nGrouping remains unmeasured.',transform=b.transAxes,fontsize=8,color='#81758e',linespacing=1.6)
# A common denominator makes partial and absent claims explicit, without scoring them equally.
c=f.add_axes([.09,.205,.845,.067]);c.set(xlim=(0,220),ylim=(0,1));c.axis('off')
for left,width,col,label in [(0,182,purple,'182 fully preserved'),(182,10,amber,'10'),(192,28,'#d5ccdF','28 omitted')]:
 c.plot([left,left+width],[.5,.5],lw=23,color=col,solid_capstyle='butt')
 c.text(left+width/2,.5,label,ha='center',va='center',fontsize=9,color='white' if left<192 else '#5e526b')
c.annotate('10 partially preserved',xy=(187,.58),xytext=(170,1.43),ha='right',fontsize=9,color=amber,arrowprops={'arrowstyle':'-','color':amber,'lw':.8},annotation_clip=False)
f.text(.09,.315,'c   What happened to the 220 original focal-claim occurrences?',fontsize=11)
f.text(.09,.181,'82.7% fully preserved   +   4.5% partially preserved   +   12.7% omitted  (rounding applies)',fontsize=9,color='#6f647a')
f.text(.09,.133,'Partial = the main point survives, but a consequential qualification or stance changes. Omitted = no extracted counterpart.\nThe eight-claim cap accounts for the 28 omissions. Grouping fidelity and losses by argument type have not been scored.',fontsize=9,color='#6f647a',linespacing=1.6)
f.text(.09,.055,'PROVISIONAL SELF-REVIEW. Four synthetic scenarios, 24 two-response panels, one assistant conversation; visible reference IDs.\nSaved outputs may already merge respondents; grouping loss has not been isolated. These are not Symphonia model calls.',fontsize=8,color='#887b93',linespacing=1.65)
for ext in ['svg','pdf','png']:f.savefig(OUT/f'assistant-extraction.{ext}',dpi=600,facecolor='white')
p=OUT/'assistant-extraction.svg';p.write_text('\n'.join(line.rstrip() for line in p.read_text().replace("'DejaVu Sans'","'Arial', sans-serif").splitlines())+'\n')
plt.close(f)

"""Paired ordinal trajectories from the authored fixtures saved as dev forms 29–32."""
import csv, json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'scripts/fixtures/new-dev-surveys.json').read_text())
out=ROOT/'frontend/public/evaluation/paper-concepts';out.mkdir(exist_ok=True)
name='opinion-confidence-trajectories'
votes=['Strongly disagree','Disagree','Neither agree nor disagree','Agree','Strongly agree']
conf=['Not at all confident','Slightly confident','Moderately confident','Very confident','Extremely confident']
colors=['#c88a51','#5a8baa','#9770aa','#5d9882']
titles=['Clinical override','Tell patients about AI','Disclosed AI assistance','Explain reasoning orally','Voluntary relocation','Property-value priority','Phones away in lessons','Medical / access exceptions']
topics=['AI triage','University assessment','Coastal futures','School phones']
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':9,'axes.spines.top':False,'axes.spines.right':False,'svg.fonttype':'none','pdf.fonttype':42})
fig,axes=plt.subplots(2,8,figsize=(17,8.8),gridspec_kw={'hspace':.52,'wspace':.16})
fig.subplots_adjust(left=.105,right=.985,top=.80,bottom=.20)
records=[]
for si,s in enumerate(data['scenarios']):
 for ci in range(4):
  for p in s['people']:
   for rnd in [2,3]:
    records.append({'form_id':29+si,'scenario':s['id'],'participant':p['id'],'claim_number':ci+1,'claim':s['claims'][ci],'round':rnd,'opinion':p[f'round{rnd}']['votes'][ci],'confidence':p[f'round{rnd}']['confidence'][ci],'shown_in_figure':ci<2})
 for ci in range(2):
  col=2*si+ci
  for row,(field,levels) in enumerate([('votes',votes),('confidence',conf)]):
   ax=axes[row,col];c=colors[si]
   matrix=np.array([[levels.index(p[f'round{rnd}'][field][ci])+1 for rnd in [2,3]] for p in s['people']])
   # Fixed horizontal offset separates coincident people; ratings themselves are never jittered.
   offsets=np.linspace(-.09,.09,len(matrix))
   for k,vals in enumerate(matrix):
    xs=np.array([0,1])+offsets[k]
    ax.plot(xs,vals,color=c,alpha=.25,lw=.8,zorder=2)
    ax.scatter(xs,vals,s=18,color=c,alpha=.65,edgecolors='white',linewidths=.4,zorder=3)
   med=np.median(matrix,axis=0)
   ax.plot([0,1],med,color='white',lw=5.5,zorder=4)
   ax.plot([0,1],med,color=c,lw=2.3,zorder=5)
   ax.set_xlim(-.24,1.24);ax.set_ylim(.65,5.35)
   ax.set_xticks([0,1],['Round 2','Round 3']);ax.set_yticks(range(1,6))
   ax.set_yticklabels((['Strongly\ndisagree','Disagree','Neither','Agree','Strongly\nagree'] if row==0 else ['Not at all','Slightly','Moderately','Very','Extremely']) if col==0 else [])
   ax.grid(axis='y',color='#edf0f2',lw=.6);ax.set_axisbelow(True)
   ax.tick_params(length=0,labelsize=8,pad=5)
   for spine in ax.spines.values():spine.set_color('#d7dce1');spine.set_linewidth(.6)
   if row==0:ax.set_title(titles[col],fontsize=9,pad=10,wrap=True)
   changed=int((matrix[:,0]!=matrix[:,1]).sum())
   ax.text(.5,-.19,f'{changed}/6 changed',ha='center',transform=ax.transAxes,color='#6c7480',fontsize=8)
 for row in [0,1]:
  ax=axes[row,2*si];other=axes[row,2*si+1]
  if row==0:
   pos=ax.get_position();right=other.get_position().x1
   fig.text((pos.x0+right)/2,.866,topics[si],ha='center',fontsize=11,color=colors[si],weight='medium')
fig.text(.035,.954,'Opinion and confidence can move differently',fontsize=21,weight='medium',color='#242a33')
fig.text(.035,.914,'Round 2 → Round 3   /   Four authored consultations · six fictional participants each',fontsize=10,color='#69717c')
fig.text(.035,.805,'a',fontsize=15,weight='bold');fig.text(.019,.675,'Opinion',rotation=90,fontsize=11,va='center')
fig.text(.035,.445,'b',fontsize=15,weight='bold');fig.text(.019,.325,'Confidence',rotation=90,fontsize=11,va='center')
fig.text(.105,.14,'Thin lines: the same participant     •     Bold line: panel median     •     Exact ordinal scores; horizontal offsets reveal overlap',fontsize=9,color='#525b67')
caption=('Paired changes in opinion (a) and confidence (b) for the first two claims in each consultation. Each column follows the same six fictional participants;\n'
         'rows share participants and claims. Confidence is certainty in one’s own rating, not factual accuracy. Bold lines are descriptive medians; no uncertainty\n'
         'intervals or feedback effects are inferred. All responses and changes were authored for the completed platform simulations, not observed in a human study.\n'
         'The downloadable source table includes exact claim wording and all four claims per consultation. No participants or trajectories have been added for appearance.')
fig.text(.105,.10,caption,fontsize=8.5,color='#69717c',va='top',linespacing=1.6)
for ext in ['svg','pdf','png']:fig.savefig(out/f'{name}.{ext}',dpi=600,facecolor='white')
with (out/f'{name}.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=records[0].keys());w.writeheader();w.writerows(records)
(out/f'{name}-provenance.json').write_text(json.dumps({'source':'scripts/fixtures/new-dev-surveys.json','forms':[29,30,31,32],'status':'Authored simulations saved via normal dev APIs; not empirical participant evidence','selection':'First two claims in fixture order from each consultation','participants_per_consultation':6,'plotted_claims':8,'plotted_paired_trajectories_per_row':48,'bold_line':'Median on five ordered categories; midpoint medians may fall between categories','jitter':'Horizontal only, same participant offset at both rounds','model_calls':0},indent=2))
print(out/name)

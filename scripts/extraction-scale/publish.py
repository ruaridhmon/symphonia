import json,csv,shutil,zipfile
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[2];RUN=ROOT/'backend/artefacts/extraction-scale-20260930';OUT=ROOT/'frontend/public/evaluation/scaled-extraction';OUT.mkdir(parents=True,exist_ok=True)
rows=[];details=[];issues=[];comparisons=[]
for p in sorted(RUN.glob('v2-*-input.json')):
 d=json.loads(p.read_text());base=d['id']
 if not all((RUN/f'{base}-{s}-judge.json').exists() for s in ['extract','group']):continue
 pair=[]
 for stage in ['extract','group']:
  o=json.loads((RUN/f'{base}-{stage}.json').read_text())['output'];j=json.loads((RUN/f'{base}-{stage}-judge.json').read_text())['output'];ids={c['id'] for c in o['claims']}
  valid=sorted(a['id'] for a in j['atoms'])==sorted(a['id'] for a in d['reference']) and sorted(c['id'] for c in j['claims'])==sorted(ids) and all(a['status'] in ['retained','partial','lost'] and set(a.get('evidence_ids',[]))<=ids for a in j['atoms']) and all(c['status'] in ['faithful','altered','unsupported'] for c in j['claims'])
  if not valid:issues.append(dict(panel=base,stage=stage,error='Invalid judgment schema'));break
  for a in j['atoms']:a['quote']=' '.join(c['text'] for eid in a['evidence_ids'] for c in o['claims'] if c['id']==eid)
  r=dict(id=base,topic=d['topic'],size=d['size'],replicate=d['replicate'],stage=stage,coverage=sum(a['status']=='retained' for a in j['atoms'])/len(j['atoms']),faithfulness=sum(a['status']=='faithful' for a in j['claims'])/len(j['claims']))
  for cat in ['position','qualification','quantity','minority','uncertainty']:
   aid={a['id'] for a in d['reference'] if a['category']==cat};aa=[a for a in j['atoms'] if a['id'] in aid];r[cat]=sum(a['status']=='retained' for a in aa)/len(aa) if aa else None
  pair.append((r,dict(input=d,stage=stage,output=o,audit=j)))
 if len(pair)==2:
  for r,d in pair:rows.append(r);details.append(d)
assert rows,'No valid completed pairs'
ledger=json.loads((RUN/'ledger.json').read_text());cost=sum(e.get('usage',{}).get('cost',0) or 0 for e in ledger);uncertain=sum(e['reserve'] for e in ledger if e.get('usage',{}).get('cost') is None);design=json.loads((RUN/'design.json').read_text())
summary=dict(completed_pairs=len(rows)//2,planned_pairs=120,calls=len(ledger),provider_reported_usd=cost,cumulative_usd=cost+1.0353532,unconfirmed_call_reservation_usd=uncertain+.0114488,independent_source_panels=len({r['id'].rsplit('-n',1)[0] for r in rows}),limitations=design['limitations']+['Cheaper evaluator failed controls; stronger evaluator passed eight basic checks. This is not independent human validation.','Incomplete and failed panels are excluded from plotted scores and reported in completion records.','Input generation and earlier malformed-response attempts also count toward the displayed spending.','Source snippets with only a terminal punctuation mismatch were trimmed to exact substrings; originals remain recorded.'],stage_means={s:{k:float(np.mean([r[k] for r in rows if r['stage']==s])) for k in ['coverage','faithfulness']} for s in ['extract','group']})
summary['failed_source_panels']=len(json.loads((RUN/'errors.json').read_text())) if (RUN/'errors.json').exists() else 0
for name,data in [('summary',summary),('audit',details),('validation',dict(schema_issues=issues,semantic_validation='Provisional model judgments; eight authored control checks passed'))]:(OUT/f'{name}.json').write_text(json.dumps(data,indent=2))
shutil.copy2(Path(__file__).parent/'review-notes.json',OUT/'review-notes.json')
for name in ['design.json','ledger.json','calibration.json','strong-calibration.json','errors.json','completion.json']:
 if (RUN/name).exists():shutil.copy2(RUN/name,OUT/name)
if not (OUT/'completion.json').exists():(OUT/'completion.json').write_text(json.dumps({'status':'Run in progress; only completed pairs shown'}))
with (OUT/'scores.csv').open('w') as f:w=csv.DictWriter(f,fieldnames=rows[0]);w.writeheader();w.writerows(rows)
# Match the approved extraction overview layout using measured observations only.
from matplotlib.ticker import PercentFormatter
from matplotlib.patches import FancyArrowPatch
import textwrap
P='#665394';A='#bd784d';M='#81778c';INK='#302a39'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'svg.fonttype':'none','pdf.fonttype':42,'axes.spines.top':False,'axes.spines.right':False,'axes.edgecolor':'#c4becb','axes.linewidth':.65,'xtick.major.width':.65,'ytick.major.width':.65,'text.color':INK,'xtick.color':M,'ytick.color':M})
fig=plt.figure(figsize=(12,14.4),facecolor='white')
fig.text(.075,.962,'From expert responses to a shared claim set',fontsize=19)
for x,t in [(.075,'Round 1 responses'),(.36,'Extracted claims'),(.69,'Grouped claims for round 2')]:fig.text(x,.929,t,fontsize=10,color=M)
for a,b in [(.22,.34),(.495,.67)]:fig.add_artist(FancyArrowPatch((a,.934),(b,.934),transform=fig.transFigure,arrowstyle='->',mutation_scale=9,lw=.8,color='#b7a8cb'))
fig.text(.075,.907,'Extraction and grouping',fontsize=11)
fig.text(.075,.893,'MEASURED · MODEL-JUDGED SYNTHETIC INPUTS',fontsize=7.5,color=M)
for k,(stage,bottom) in enumerate([('extract',.545),('group',.175)]):
 col=[P,A][k];rr=[r for r in rows if r['stage']==stage];ax=fig.add_axes([.075,bottom,.36,.30]);top=fig.add_axes([.075,bottom+.306,.36,.018]);right=fig.add_axes([.448,bottom,.025,.30]);fig.text(.075,bottom+.335,['A   Before grouping','B   After grouping'][k],fontsize=11,color=col)
 coords={}
 for r in rr:coords[(r['coverage'],r['faithfulness'])]=coords.get((r['coverage'],r['faithfulness']),0)+1

 if len(rr)>=30 and len(coords)>=6 and np.linalg.matrix_rank(np.array(list(coords))-np.mean(list(coords),axis=0))==2:
  from matplotlib.colors import LinearSegmentedColormap
  grid=np.linspace(0,1,201);xx,yy=np.meshgrid(grid,grid);z=np.zeros_like(xx);h=.035
  for r in rr:
   for xr in [r['coverage'],-r['coverage'],2-r['coverage']]:
    for yr in [r['faithfulness'],-r['faithfulness'],2-r['faithfulness']]:z+=np.exp(-((xx-xr)**2+(yy-yr)**2)/(2*h*h))
  z/=z.sum();ranks=np.sort(z.ravel())[::-1];cum=ranks.cumsum();levels=sorted(set(ranks[np.searchsorted(cum,q)] for q in [.90,.50]))
  cmap=LinearSegmentedColormap.from_list('observed'+stage,['#ffffff',col]);ax.contourf(xx,yy,z,levels=np.linspace(0,z.max(),24),cmap=cmap,alpha=.18,zorder=0)
  cs=ax.contour(xx,yy,z,levels=levels,colors=col,linewidths=[.8,1.2],alpha=.7,zorder=1);ax.clabel(cs,fmt={levels[0]:'90%',levels[-1]:'50%'},fontsize=7)
 for (x,y),n in coords.items():
  ax.scatter(x,y,s=25+18*n,color=col,alpha=.22,linewidths=0,clip_on=False,zorder=2);ax.scatter(x,y,s=10,color=col,alpha=.85,linewidths=0,clip_on=False,zorder=3)
  if n>1:ax.annotate(f'×{n}',(x,y),xytext=(-6,-14),textcoords='offset points',fontsize=8,color=col,ha='right')
 if len(coords)==1 and (1.0,1.0) in coords:
  ax.text(.06,.56,f'{len(rr)} / {len(rr)} panels scored 100%'+chr(10)+'This benchmark does not resolve'+chr(10)+'extraction errors.',transform=ax.transAxes,fontsize=10,color=M,linespacing=1.6)
 ax.scatter([1],[1],s=24,marker='D',facecolors='white',edgecolors=col,lw=.8,clip_on=False,zorder=5)
 ax.set(xlim=(0,1),ylim=(0,1),aspect='equal');ax.xaxis.set_major_formatter(PercentFormatter(1));ax.yaxis.set_major_formatter(PercentFormatter(1));ax.set_xticks(np.linspace(0,1,6));ax.set_yticks(np.linspace(0,1,6));ax.tick_params(labelsize=8)
 ax.text(.035,.05,f'{len(rr)} paired panels · ×n counts overlap',transform=ax.transAxes,fontsize=7.5,color=M)
 if k==1:ax.set_xlabel('Coverage of original meaning',fontsize=10)
 # Exact marginal frequencies, not a smoothed density from a handful of panels.
 for metric,margin in [('coverage',top),('faithfulness',right)]:
  vals,counts=np.unique([r[metric] for r in rr],return_counts=True)
  if metric=='coverage':margin.vlines(vals,0,counts,color=col,lw=2,alpha=.5);margin.set(xlim=(0,1),ylim=(0,len(rr)+1))
  else:margin.hlines(vals,0,counts,color=col,lw=2,alpha=.5);margin.set(ylim=(0,1),xlim=(0,len(rr)+1))
  margin.axis('off')
fig.text(.019,.52,'Faithfulness of claims',rotation=90,va='center',fontsize=10)
fig.text(.55,.907,'C',fontsize=13,weight='bold');fig.text(.577,.908,'How much meaning survives?',fontsize=11);fig.text(.57,.880,'AFTER GROUPING · FULL AND PARTIAL RETENTION',fontsize=7.5,color=P)
b=fig.add_axes([.57,.585,.38,.26]);b.set(xlim=(0,100),ylim=(-.5,9.7));b.set_yticks([])
names=list(dict.fromkeys(d['input']['topic'] for d in details))
short={'AI referral triage':'AI referral triage','AI in university assessment':'University assessment','Coastal relocation':'Coastal relocation','School smartphones':'School smartphones','Urban transport':'Urban transport','Home energy retrofit':'Home energy retrofit'}
for i,name in enumerate(names):
 aa=[a for d in details if d['stage']=='group' and d['input']['topic']==name for a in d['audit']['atoms']];den=len(aa);full=sum(a['status']=='retained' for a in aa)/den*100;partial=sum(a['status']=='partial' for a in aa)/den*100;y=9-i
 b.text(0,y+.26,short.get(name,name),fontsize=7.5);b.text(100,y+.26,f'{full:.1f}%',ha='right',fontsize=9,color=P)
 b.plot([0,100],[y,y],color='#e9e5ed',lw=2,solid_capstyle='round');b.plot([0,full],[y,y],color=P,lw=2,solid_capstyle='round');b.plot([full,full+partial],[y,y],color=A,lw=2);b.scatter(full+partial,y,s=24,facecolor='white',edgecolor=A,lw=1,clip_on=False);b.scatter(full,y,s=30,color=P,edgecolor='white',lw=.6,zorder=4,clip_on=False)
b.set_xticks([0,25,50,75,100]);b.set_xlabel('Reference meanings retained (%)',fontsize=10,labelpad=8);b.tick_params(length=0,labelsize=8);b.spines['left'].set_visible(False)
for x,t,c in [(.57,'● Full',P),(.67,'○ + partial',A),(.80,'— Omitted remainder',M)]:fig.text(x,.55,t,fontsize=8,color=c)
fig.text(.55,.509,'D',fontsize=13,weight='bold');fig.text(.577,.510,'Which information is lost?',fontsize=11);fig.text(.57,.487,'AFTER GROUPING · INFORMATION TYPES',fontsize=8,color=A)
c=fig.add_axes([.57,.175,.38,.275]);c.set(xlim=(0,100),ylim=(-.55,4.7));c.set_yticks([]);rng=np.random.default_rng(928502)
for i,(cat,label,col) in enumerate(zip(['position','minority','uncertainty','qualification','quantity'],['Positions','Minority concerns','Uncertainty','Conditions / exceptions','Numbers'],[P,'#398b88',P,A,'#64859c'])):
 v=np.array([r[cat]*100 for r in rows if r['stage']=='group' and r[cat] is not None]);y=4-i;c.text(0,y+.38,label,fontsize=8.7,color=col)
 if not len(v):c.text(0,y,'Not represented in reference labels',fontsize=7,color=M);continue
 c.scatter(v,y-.10-rng.uniform(0,.20,len(v)),s=15,color=col,alpha=.3,linewidths=0,clip_on=False);lo,med,hi=np.quantile(v,[.25,.5,.75]);c.plot([lo,hi],[y-.19]*2,color=col,lw=2.5,solid_capstyle='round');c.scatter(med,y-.19,s=28,color=col,edgecolor='white',lw=.8,clip_on=False);c.text(100,y+.38,f'n = {len(v)}',ha='right',fontsize=7,color=M)
c.set_xticks([0,25,50,75,100]);c.set_xlabel('Original information retained (%)',fontsize=10,labelpad=8);c.spines['left'].set_visible(False);c.tick_params(length=0,labelsize=8)
caption=('A–B, Exact coverage and faithfulness scores from '+str(len(rows)//2)+' paired synthetic panels; purple is extraction and copper is grouping. Marginal ticks show empirical frequencies. Coincident panels are counted, not displaced; density contours are used only when at least 30 panels and six distinct coordinates are available. C, Full and partial retention after grouping, pooled over reference occurrences in the available nested sizes for each topic. D, Individual panel retention by reference category; dots and lines show medians and interquartile ranges, not confidence intervals. Vertical jitter separates observations without changing scores. Density estimates, where shown, use reflected Gaussian smoothing with a fixed 3.5-percentage-point bandwidth. Sources and references were model-authored and frozen before extraction; judgments are provisional and not human validated. Similar meanings from different speakers may be counted separately. Grouping is capped at eight statements. This is a benchmark of prompts, not the deployed platform pipeline; no causal size effect is established.')
fig.text(.075,.130,'Figure 1 | Preserving meaning from expert responses to grouped claims.',fontsize=10,weight='bold');fig.text(.075,.113,textwrap.fill(caption,width=157),fontsize=8.2,color='#514b58',va='top',linespacing=1.5)
for ext in ['svg','pdf','png']:fig.savefig(OUT/f'extraction-results.{ext}',dpi=600)
with zipfile.ZipFile(OUT/'run-record.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in RUN.glob('*.json'):z.write(p,'run/'+p.name)
 for p in Path(__file__).parent.glob('*'):
  if p.is_file():z.write(p,'code/'+p.name)
print(json.dumps(summary,indent=2))

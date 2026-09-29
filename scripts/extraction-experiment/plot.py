import json,csv,shutil
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[2];RUN=ROOT/'backend/artefacts/extraction-experiment-20260929';OUT=ROOT/'frontend/public/evaluation/measured-extraction';OUT.mkdir(parents=True,exist_ok=True)
rows=[];details=[]
reviews=json.loads((ROOT/'scripts/extraction-experiment/quote-reviews.json').read_text())
for p in sorted(RUN.glob('*-input.json')):
 d=json.loads(p.read_text());base=d['id']
 if not all((RUN/(base+'-'+s+'-judge.json')).exists() for s in ['extract','group']):continue
 for stage in ['extract','group']:
  j=json.loads((RUN/(base+'-'+stage+'-judge.json')).read_text())['output'];o=json.loads((RUN/(base+'-'+stage+'.json')).read_text())['output']
  for atom in j['atoms']:
   review=reviews.get(base+'/'+stage+'/'+atom['id'])
   if review:
    atom['original_judge_quote']=atom['quote'];atom['quote']=next(c['text'] for c in o['claims'] if c['id']==review['output_claim']);atom['quote_review']=review['decision']
  faithful=sum(x['status']=='faithful' for x in j['claims']);retained=sum(x['status']=='retained' for x in j['atoms']);partial=sum(x['status']=='partial' for x in j['atoms'])
  row=dict(id=base,topic=d['topic'],size=d['size'],replicate=d['replicate'],stage=stage,coverage=retained/len(j['atoms']),faithfulness=faithful/len(j['claims']) if j['claims'] else 0,partial=partial/len(j['atoms']),output_claims=len(j['claims']),source_atoms=len(j['atoms']))
  for cat in ['position','qualification','quantity','minority','uncertainty']:
   ids={x['id'] for x in d['reference'] if x['category']==cat};a=[x for x in j['atoms'] if x['id'] in ids];row[cat]=sum(x['status']=='retained' for x in a)/len(a) if a else None
  rows.append(row);details.append({'input':d,'stage':stage,'output':o,'audit':j})
assert rows,'No completed paired panels'
ledger=json.loads((RUN/'ledger.json').read_text());cost=sum(x.get('usage',{}).get('cost',0) or 0 for x in ledger)
summary={'completed_pairs':len(rows)//2,'planned_pairs':36,'provider_reported_usd':cost,'reserved_usd':sum(x['reserved_usd'] for x in ledger),'calls':len(ledger),'status':'Real model calls on controlled synthetic responses; provisional model-judged assessment','limitations':['Templated source paragraphs with repeated propositions; not natural expert responses','Sizes nested within topic and replicate','Extraction and grouping use a benchmark prompt, not the deployed platform synthesis pipeline','Separate model judge is not a human-validated gold standard','Eight-claim grouping cap is a designed compression constraint, not an isolated causal estimate','Panel size changes repetition and sometimes the source proposition set; size effects are descriptive, not isolated causal effects']}
summary['stage_means']={stage:{key:float(np.mean([r[key] for r in rows if r['stage']==stage])) for key in ['coverage','faithfulness','partial','output_claims']} for stage in ['extract','group']}
summary['size_means']={str(n):{stage:float(np.mean([r['coverage'] for r in rows if r['stage']==stage and r['size']==n])) for stage in ['extract','group']} for n in [4,8,16]}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2));(OUT/'audit.json').write_text(json.dumps(details,indent=2));shutil.copy2(RUN/'design.json',OUT/'design.json')
with (OUT/'scores.csv').open('w') as f:w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':9,'svg.fonttype':'none','pdf.fonttype':42,'axes.spines.top':False,'axes.spines.right':False,'axes.edgecolor':'#d9d5df'})
fig=plt.figure(figsize=(12,10));gs=fig.add_gridspec(2,2,left=.1,right=.95,top=.81,bottom=.23,hspace=.42,wspace=.42)
colors=['#71579d','#bd8155'];stages=['extract','group'];markers={4:'o',8:'s',16:'^'}
for k,stage in enumerate(stages):
 ax=fig.add_subplot(gs[k,0]);rr=[r for r in rows if r['stage']==stage]
 # Exact values: duplicate positions are represented by scaled markers and counts, never jittered scores.
 coords={}
 for x in rr:coords[(x['coverage'],x['faithfulness'])]=coords.get((x['coverage'],x['faithfulness']),0)+1
 for (x,y),n in coords.items():
  ax.scatter(x,y,s=40+24*n,marker='o',c=colors[k],alpha=.35,edgecolors='white',clip_on=False)
  ax.annotate(str(n) if n>1 else '',(x,y),ha='center',va='center',fontsize=8,color='#423649')
 ax.set(xlim=(0,1.04),ylim=(0,1.04),xlabel='Original meaning fully retained',ylabel='Output claims faithful to source');ax.set_xticks([0,.25,.5,.75,1],['0%','25%','50%','75%','100%']);ax.set_yticks([0,.25,.5,.75,1],['0%','25%','50%','75%','100%']);ax.set_aspect('equal');ax.grid(alpha=.12);ax.set_title(('a  Extracted claims' if k==0 else 'b  After grouping · maximum 8 claims'),loc='left',pad=14,color=colors[k])
ax=fig.add_subplot(gs[0,1]);rng=np.random.default_rng(42)
for si,size in enumerate([4,8,16]):
 for k,stage in enumerate(stages):
  r=[x for x in rows if x['size']==size and x['stage']==stage];v=[x['coverage']*100 for x in r];x=si+(-.13 if k==0 else .13);ax.scatter(x+rng.uniform(-.045,.045,len(v)),v,s=18,color=colors[k],alpha=.5);ax.plot([x-.09,x+.09],[np.mean(v)]*2,color=colors[k],lw=2)
ax.set_title('c  Does panel size change retention?',loc='left',pad=14);ax.set_xticks(range(3),['4','8','16']);ax.set(xlabel='Participants per panel',ylabel='Full retention (%)',ylim=(-3,105));ax.grid(axis='y',alpha=.12)
ax=fig.add_subplot(gs[1,1]);cats=['position','qualification','quantity','minority','uncertainty']
for i,cat in enumerate(cats):
 vals=[]
 for k,stage in enumerate(stages):
  v=[r[cat]*100 for r in rows if r['stage']==stage and r[cat] is not None];m=np.mean(v);vals.append(m);ax.scatter(v,np.full(len(v),i+(-.1 if k==0 else .1))+rng.uniform(-.035,.035,len(v)),s=12,color=colors[k],alpha=.18);ax.scatter(m,i+(-.1 if k==0 else .1),s=40,color=colors[k],edgecolors='white',zorder=3)
 ax.plot(vals,[i-.1,i+.1],color='#c8c2cc',lw=1)
ax.set_yticks(range(5),['Positions','Qualifications','Quantities / interpretation','Minority safeguards','Uncertainty']);ax.invert_yaxis();ax.set(xlim=(-3,105),xlabel='Full retention (%)');ax.set_title('d  Which information survives?',loc='left',pad=14);ax.grid(axis='x',alpha=.12)
fig.text(.08,.945,'From expert responses to a shared claim set',fontsize=19)
fig.text(.08,.90,f'{len(rows)//2} completed paired panels · six topics · 4, 8 and 16 participants · real OpenRouter calls',fontsize=10,color='#68717d')
fig.text(.08,.863,'Purple: extracted claims     ·     Copper: grouped claims     ·     Dots: completed panels; larger markers count overlap',fontsize=9,color='#68717d')
fig.text(.08,.15,'Controlled synthetic benchmark · provisional model-judged results',fontsize=11)
fig.text(.08,.115,'Coverage is the fraction of unique source propositions fully preserved; partial preservation does not receive full credit. Faithfulness is the fraction\nof output claims judged fully supported. Sizes are nested within topic and replicate. Panels c–d show individual panels and unweighted means,\nnot confidence intervals. A separate model judges each stage against original source text. These are benchmark prompts, not a test of the deployed\nSymphonia extraction pipeline. Templated inputs and the eight-claim grouping cap limit generalisation. Full inputs, outputs and audits are downloadable.',fontsize=8,color='#68717d',linespacing=1.6,va='top')
for ext in ['svg','pdf','png']:fig.savefig(OUT/('extraction-results.'+ext),dpi=600,facecolor='white')
print(json.dumps(summary))

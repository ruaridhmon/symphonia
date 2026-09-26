"""Read saved v7 runs only. No network, model invocation or synthetic result generation."""
import csv, hashlib, json, re, argparse
from pathlib import Path
from collections import defaultdict, Counter
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
parser=argparse.ArgumentParser()
parser.add_argument('--evidence',type=Path,help='Downloaded evidence.json; otherwise read repository archives')
parser.add_argument('--out',type=Path)
args=parser.parse_args()
ROOT=Path(__file__).resolve().parents[2]
OUT=args.out or ROOT/'frontend/public/evaluation/integrity'
OUT.mkdir(parents=True,exist_ok=True)
BASE=ROOT/'backend/artefacts/evaluation/synthetic-20260926/results'
FILES={'structured':'b0ac9f0ffdcc8c34d458f5281b7ed85f3f739266cc34f9c487d670f42a07e5ce.json','symphonia':'42b6012e893d037817e2b7ab711bec4e07223eb74728cb3b0e3b93d820f9ada3.json'}
raw=json.loads(args.evidence.read_text()) if args.evidence else {k:json.loads((BASE/f).read_text()) for k,f in FILES.items()}
order=['support','oppose','insufficient_evidence']
rows=[]; coverage=[]
for method,d in raw.items():
 s=d['stage_outputs']; mapping=s['alignment']['mapping']; votes=defaultdict(dict)
 for person in s['round2_received']:
  for a in person['answers']:
   gold=mapping.get(a['claim_id'])
   if gold and a['stance'] is not None:
    old=votes[gold].get(person['participant_id'])
    assert old is None or old==a['stance'], 'Conflicting duplicate mapped ballots'
    votes[gold][person['participant_id']]=a['stance']
 coverage.append(dict(method=method,reference_claims=len(d['reference']),display_claims=len(s['extraction']['claims']),accepted_display_claims=len(mapping),unique_reference_claims=len(votes)))
 if method=='structured':
  for a in s['feedback']['audit']:
   ids=set(re.findall(r'\bC\d+\b',a['text'])); assert len(ids)==1
   cid=ids.pop(); count=Counter(votes[cid].values()); actual=[count[v] for v in order]
   rows.append(dict(claim=cid,actual=actual,reported=a['counts'],delta=[b-a for a,b in zip(actual,a['counts'])],quote=a['text'],voters=votes[cid]))
# Compare final output to the actual third-round ballots, not the earlier round.
d=raw['structured']; votes3=defaultdict(dict)
for person in d['stage_outputs']['round3_received']:
 for a in person['answers']:
  cid=d['stage_outputs']['alignment']['mapping'].get(a['claim_id'])
  if cid and a['stance'] is not None:
   old=votes3[cid].get(person['participant_id']); assert old is None or old==a['stance']
   votes3[cid][person['participant_id']]=a['stance']
for a in d['output']['audit']:
 ids=set(re.findall(r'\bC\d+\b',a['text'])); assert len(ids)==1
 cid=ids.pop(); row=next(r for r in rows if r['claim']==cid)
 count=Counter(votes3[cid].values()); row['final_actual']=[count[v] for v in order]; row['final_reported']=a['counts']
 row['final_delta']=[b-a for a,b in zip(row['final_actual'],a['counts'])]
rows.sort(key=lambda r:int(r['claim'][1:]))
assert len(rows)==15 and all(sum(r['actual'])==8 for r in rows)
s=raw['symphonia']['stage_outputs']; missing=[]
for c in s['extraction']['claims']:
 ballots=[a for p in s['round2_received'] for a in p['answers'] if a['claim_id']==c['id']]
 counts=Counter(a['stance'] for a in ballots)
 missing.append(dict(id=c['id'],text=c['text'],counts=[counts[v] for v in order],missing=counts[None],final_quote=raw['symphonia']['output']['audit'][int(c['id'][1:])-1]['text']))
assert len(missing)==7 and sum(r['missing'] for r in missing)==32
summary={'scope':'Retrospective audit of two archived v7 engineering runs on ONE shared synthetic scenario; eight replayed participants. Not a new model experiment, independent replication, or a live product audit.', 'count_mismatches':sum(r['actual']!=r['reported'] for r in rows),'count_rows':len(rows),'final_count_mismatches':sum(r['final_actual']!=r['final_reported'] for r in rows),'unaccounted_ballots':sum(sum(r['actual'])-sum(r['reported']) for r in rows),'coverage':coverage,'missing_ballots':32,'display_ballots':56,'provenance':[{'method':k,'run_id':d['run_id'],'file':args.evidence.name if args.evidence else FILES[k],'sha256':hashlib.sha256(args.evidence.read_bytes() if args.evidence else (BASE/FILES[k]).read_bytes()).hexdigest()} for k,d in raw.items()]}
(OUT/'audit.json').write_text(json.dumps({'summary':summary,'count_rows':rows,'missingness':missing},indent=2))
# Publish only the evidence fields required to reproduce the analysis; no request credentials.
(OUT/'evidence.json').write_text(json.dumps({k:{'run_id':d['run_id'],'reference':d['reference'],'stage_outputs':{field:d['stage_outputs'][field] for field in ['extraction','alignment','feedback','round2_received','round3_received']},'output':d['output']} for k,d in raw.items()},indent=2))
with (OUT/'source-data.csv').open('w') as f:
 w=csv.writer(f);w.writerow(['method','claim','category','recorded','reported','missing'])
 for r in rows:
  for i,v in enumerate(order):
   w.writerow(['structured_feedback',r['claim'],v,r['actual'][i],r['reported'][i],0])
   w.writerow(['structured_final',r['claim'],v,r['final_actual'][i],r['final_reported'][i],0])
 for r in missing:
  for i,v in enumerate(order):w.writerow(['symphonia',r['id'],v,r['counts'][i],'',r['missing'] if i==0 else ''])
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False,'svg.fonttype':'none','axes.titleweight':'bold'})
colors=['#197b75','#bf6245','#b6c4c7','#e4e9e8']
def save(fig,name):
 fig.savefig(OUT/(name+'.svg'),bbox_inches='tight'); svg=OUT/(name+'.svg'); svg.write_text(svg.read_text().replace("'DejaVu Sans'","'Arial', sans-serif"));fig.savefig(OUT/(name+'.pdf'),bbox_inches='tight');fig.savefig(OUT/(name+'.png'),dpi=600,bbox_inches='tight');plt.close(fig)
fig,axes=plt.subplots(1,2,figsize=(10,6),sharey=True)
for ax,key,title in zip(axes,['delta','final_delta'],['Intermediate feedback · 12 / 15 differ','Final summary · 2 / 15 differ']):
 delta=np.array([r[key] for r in rows]); ax.imshow(delta,cmap='RdBu',vmin=-3,vmax=3,aspect='auto')
 ax.set_xticks(range(3),['Support','Oppose','Insufficient\nevidence']);ax.set_yticks(range(15),[r['claim'] for r in rows]);ax.set_title(title,loc='left',fontsize=11,pad=12)
 for y in range(15):
  for x in range(3):ax.text(x,y,f"{delta[y,x]:+d}" if delta[y,x] else '0',ha='center',va='center',color='white' if abs(delta[y,x])>=2 else '#183434')
fig.suptitle('A  ·  Does the summary preserve every recorded vote?',x=.02,ha='left',fontweight='bold');fig.tight_layout()
fig.text(.02,-.08,'Cell value = reported minus recorded participants (blue: overcount; red: undercount).\n15 claims in ONE scenario; 8 recorded ballots per claim. Each output compared with its own input round.\nStructured baseline. Repeated mapped claims deduplicated by participant and reference ID.',fontsize=9,color='#4c6262');save(fig,'01-vote-fidelity')
fig,axes=plt.subplots(1,2,figsize=(10,4.5));
for ax,c in zip(axes,coverage):
 vals=[c['reference_claims'],c['unique_reference_claims']];ax.barh([1,0],vals,color=['#b6c4c7','#197b75'],height=.45);ax.set_yticks([1,0],['Reference claims','Admitted to replay']);ax.set_xlim(0,17);ax.set_xticks([0,5,10,15]);ax.set_xlabel('Unique reference claim IDs');ax.set_title('Structured baseline' if c['method']=='structured' else 'Symphonia benchmark adapter',loc='left',fontsize=11)
 for y,n in zip([1,0],vals):ax.text(n+.3,y,str(n),va='center')
fig.suptitle('B  ·  The alignment gate changes what can be rated',x=.02,ha='left',fontweight='bold');fig.tight_layout();fig.text(.02,-.09,'Same synthetic scenario, two archived workflows. Display outputs: 60 claims (structured), 7 (adapter).\nAccepted display IDs: 40 and 3. These are gate outputs, not independently adjudicated semantic recall.\nExtraction, conversion and alignment all contribute; the gate itself can reject valid matches.',fontsize=9,color='#4c6262');save(fig,'02-claim-coverage')
fig,ax=plt.subplots(figsize=(9,4.8));left=np.zeros(7)
for j,label in enumerate(['Support','Oppose','Insufficient evidence','Missing / rejected']):
 vals=[r['counts'][j] if j<3 else r['missing'] for r in missing];ax.barh(range(7),vals,left=left,color=colors[j],label=label,height=.6,edgecolor='white');left+=vals
ax.set_yticks(range(7),[r['id'] for r in missing]);ax.invert_yaxis();ax.set_xticks(range(9));ax.set_xlabel('Replayed participants per displayed claim');ax.set_title('C  ·  Missing ballots are not a panel opinion',loc='left',pad=20);ax.legend(loc='upper center',bbox_to_anchor=(.5,-.17),ncol=2,frameon=False)
fig.text(.12,-.24,'Symphonia benchmark adapter · 32 of 56 ballot slots contain no rating after alignment rejection.\nD1, D2, D4 and D7 have zero valid ratings; uncertainty is a separate, explicitly recorded stance.',fontsize=9,color='#4c6262');save(fig,'03-missingness')
print(json.dumps(summary,indent=2))

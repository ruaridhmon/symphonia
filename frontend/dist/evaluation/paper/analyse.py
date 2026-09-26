"""Offline reanalysis. Usage: python analyse.py --evidence evidence.json --out results"""
import argparse,collections,csv,hashlib,json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
p=argparse.ArgumentParser();p.add_argument('--evidence',type=Path,required=True);p.add_argument('--out',type=Path,required=True);args=p.parse_args();args.out.mkdir(parents=True,exist_ok=True)
d=json.loads(args.evidence.read_text());ids=d['mapping']['ids'];
material_hash=hashlib.sha256(json.dumps(d['material'],sort_keys=True).encode()).hexdigest()
assert all(r['original_material_sha256']==material_hash for r in d['runs'])
eligible={r['run_id'] for r in d['inventory'] if '/v8/identical_transcript/8/500/' in r['run_id'] and r['status']=='complete' and r['method'] in ['direct','structured','staged','reference_fed']}
assert eligible=={r['run_id'] for r in d['runs']} and len(eligible)==8
stances=['support','oppose','insufficient_evidence']
# Reconstruct truth for count reporting from the actual transcript supplied to models.
votes=collections.defaultdict(dict)
for person in d['material']['rounds']['3']:
 for a in person['answers']:
  assert person['participant_id'] not in votes[a['claim_id']]
  votes[a['claim_id']][person['participant_id']]=a['stance']
actual={c:[sum(v==s for v in votes[c].values()) for s in stances] for c in ids};assert all(sum(v)==8 for v in actual.values())
rows=[];summary=[]
methods=['direct','structured','staged','reference_fed'];labels={'direct':'Direct','structured':'Structured','staged':'Staged','reference_fed':'Exact-table control'}
for run in sorted(d['runs'],key=lambda r:(methods.index(r['method']),r['repeat'])):
 assert len(run['output']['audit'])==15
 assert {r['id']:r['counts'] for r in run['reference']}==actual
 rr=[]
 for cid,a in zip(ids,run['output']['audit']):
  v=a['counts'];assert isinstance(v,list) and len(v)==3 and all(isinstance(n,int) and n>=0 for n in v)
  row=dict(run_id=run['run_id'],method=run['method'],repeat=run['repeat'],claim=cid,recorded=actual[cid],reported=v,mismatch=v!=actual[cid],l1=sum(abs(x-y) for x,y in zip(v,actual[cid])),support_delta=v[0]-actual[cid][0],quote=a['text']);rows.append(row);rr.append(row)
 summary.append(dict(method=run['method'],repeat=run['repeat'],mismatches=sum(r['mismatch'] for r in rr),count_l1=sum(r['l1'] for r in rr),threshold_flips=[sum((r['reported'][0]>=k)!=(r['recorded'][0]>=k) for r in rr) for k in range(1,9)]))
result={'scope':'One scenario; one shared 8-person transcript; four methods; two generation repeats per method. Retrospective, not preregistered. Repeats and claims are not independent scenarios.','source_sha256':hashlib.sha256(args.evidence.read_bytes()).hexdigest(),'summary':summary,'rows':rows,'inventory_counts':dict(collections.Counter(r['status'] for r in d['inventory']))}
(args.out/'analysis.json').write_text(json.dumps(result,indent=2))
with (args.out/'source-data.csv').open('w') as f:
 w=csv.writer(f);w.writerow(['method','repeat','claim','category','recorded','reported','delta'])
 for r in rows:
  for i,s in enumerate(stances):w.writerow([r['method'],r['repeat'],r['claim'],s,r['recorded'][i],r['reported'][i],r['reported'][i]-r['recorded'][i]])
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False,'svg.fonttype':'none','axes.titleweight':'bold'})
def save(fig,name):
 for ext in ['svg','pdf','png']:fig.savefig(args.out/(name+'.'+ext),bbox_inches='tight',dpi=600)
 f=args.out/(name+'.svg');f.write_text(f.read_text().replace("'DejaVu Sans'","'Arial', sans-serif"));plt.close(fig)
fig,axes=plt.subplots(1,2,figsize=(11,5),gridspec_kw={'width_ratios':[1,1.65]})
for i,m in enumerate(methods):
 vals=[r['mismatches'] for r in summary if r['method']==m];axes[0].scatter([i-.08,i+.08],vals,c=['#197b75','#bf6245'],s=60,zorder=3);axes[0].plot([i-.08,i+.08],vals,color='#b6c4c7');
axes[0].set_xticks(range(4),['Direct','Structured','Staged','Exact-table\ncontrol'],rotation=25,ha='right');axes[0].set_ylim(-.5,15.5);axes[0].set_yticks([0,5,10,15]);axes[0].set_ylabel('Claims with incorrect count vectors / 15');axes[0].set_title('a  Errors in both generation repeats',loc='left',fontsize=11)
matrix=np.array([[r['l1'] for r in rows if r['method']==s['method'] and r['repeat']==s['repeat']] for s in summary]);im=axes[1].imshow(matrix,cmap='YlOrBr',vmin=0,vmax=max(1,matrix.max()),aspect='auto');axes[1].set_yticks(range(8),[labels[r['method']]+' '+str(r['repeat']+1) for r in summary],fontsize=9);axes[1].set_xticks(range(15),ids,rotation=90);axes[1].set_title('b  The same claims recur as error hotspots',loc='left',fontsize=11)
for y in range(8):
 for x in range(15):axes[1].text(x,y,str(matrix[y,x]),ha='center',va='center',fontsize=8,color='white' if matrix[y,x]>matrix.max()*.65 else '#333')
fig.tight_layout();fig.text(.02,-.15,'ONE scenario · same transcript · 8 replayed participants · 2 generation repeats per method\nPanel a: teal = repeat 1, rust = repeat 2. Panel b: sum of absolute errors across the three stance counts.\nExact-table control receives privileged reference counts; it is a diagnostic control, not an equally informed competitor.',fontsize=9,color='#526767');save(fig,'04-controlled-comparison')
fig,axes=plt.subplots(2,2,figsize=(10,6),sharex=True,sharey=True)
for ax,m in zip(axes.flat,methods):
 pair=[r for r in summary if r['method']==m]
 for j,r in enumerate(pair):ax.plot(range(1,9),r['threshold_flips'],marker='o' if j==0 else 'x',ls='-' if j==0 else '--',color=['#197b75','#bf6245'][j],label='Repeat '+str(j+1),markersize=6)
 ax.set_ylim(-.15,3.2);ax.set_yticks([0,1,2,3]);ax.set_xticks(range(1,9),[f'{k}/8' for k in range(1,9)]);ax.set_title(labels[m],loc='left',fontsize=11);ax.legend(fontsize=8,frameon=False)
for ax in axes[:,0]:ax.set_ylabel('Changed flags / 15 claims')
for ax in axes[1,:]:ax.set_xlabel('Support threshold')
fig.suptitle('Count errors can change a threshold-based flag',x=.02,ha='left',fontweight='bold');fig.tight_layout();fig.text(.02,-.12,'Derived sensitivity analysis, NOT observed human decisions or causal decision loss.\nFor each threshold k, compare support ≥ k in recorded and reported counts. All eight thresholds shown.\nNo threshold is endorsed as the consultation protocol. Both repeats are drawn; coincident curves overlap.',fontsize=9,color='#526767');save(fig,'05-threshold-sensitivity')
fig,ax=plt.subplots(figsize=(9,3.4));counts=result['inventory_counts'];states=['complete','failed','scheduled'];values=[counts.get(s,0) for s in states];ax.barh(range(3),values,color=['#197b75','#bf6245','#b6c4c7']);ax.set_yticks(range(3),['Completed','Failed','Scheduled only']);ax.invert_yaxis();ax.set_xlim(0,max(values)+4);ax.set_xlabel('Run records in the downloaded archive snapshot');ax.set_title('Report the missing experiments, too',loc='left');
for i,v in enumerate(values):ax.text(v+.3,i,str(v),va='center')
fig.tight_layout();fig.text(.02,-.18,'43 records in this snapshot, not a final billing ledger. Eight eligible completed v8 transcript runs\nenter the matched comparison; other versions, tracks and panel sizes are excluded, not pooled.\nScheduled records have no measured outcome. Failed product runs prevent a balanced platform comparison.',fontsize=9,color='#526767');save(fig,'06-archive-accounting')
print(json.dumps(summary,indent=2))

import json,csv,hashlib,re
from pathlib import Path
from collections import Counter
from review import MAPS,PARTIAL,RUBRIC
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'frontend/public/evaluation/assistant-extraction'
panels=json.loads((OUT/'inputs.json').read_text()); outputs={}
for f in sorted(Path(__file__).parent.glob('outputs-*.json')): outputs.update(json.loads(f.read_text()))
assert set(outputs)=={p['id'] for p in panels}
records=[]
for p in panels:
 ident=p['id']; domain=ident.split('-')[1];idx=int(ident[-2:])-1
 claims=outputs[ident]; maps=MAPS[domain][idx]
 assert len(claims)==len(maps)==8 and len(set(maps))==8
 assert len(' '.join(claims).split())<=200
 ann=[]
 for i,(claim,c) in enumerate(zip(claims,maps),1):
  ref=f'C{c}'; assert ref in p['reference_ids']
  failure=PARTIAL.get((ident,i))
  # References point to original, unmodified source paragraphs, not generated evidence.
  ids=re.findall(r'P\d\d',claim)
  if 'Both' in claim or not ids: ids=[q['id'] for q in p['people']]
  assert all(any(q['id']==s for q in p['people']) for s in ids)
  ann.append({'index':i,'text':claim,'reference_id':ref,'source_people':list(dict.fromkeys(ids)),
   'judgment':'partial' if failure else 'faithful','issue':failure[0] if failure else None,
   'rationale':failure[1] if failure else 'Assistant review judged the source position and its consequential qualifications preserved under the published rubric. This positive label is provisional, not independently adjudicated.'})
 good=[a['reference_id'] for a in ann if a['judgment']=='faithful']; r=len(p['reference_ids']);g=len(good)
 records.append({**p,'extractions':ann,'word_count':len(' '.join(claims).split()),'faithful':g,'partial':8-g,'unsupported':0,'reference_count':r,
 'coverage':g/r,'faithfulness':g/8,'budget_ceiling':8/r,'relaxed_coverage':8/r,'relaxed_faithfulness':1,
 'omitted_ids':[c for c in p['reference_ids'] if c not in [f'C{c}' for c in maps]],
 'partial_ids':[a['reference_id'] for a in ann if a['judgment']=='partial']})
summary={'panels':len(records),'scenarios':4,'source_responses':48,'extracted_claims':192,'faithful':sum(p['faithful'] for p in records),'partial':sum(p['partial'] for p in records),'unsupported':0,'reference_occurrences':sum(p['reference_count'] for p in records),'omitted_occurrences':sum(len(p['omitted_ids']) for p in records),'new_openrouter_calls':0,'issue_counts':dict(Counter(v[0] for v in PARTIAL.values())),'outputs_sha256':hashlib.sha256(json.dumps(outputs,sort_keys=True).encode()).hexdigest()}
summary['pooled_coverage']=summary['faithful']/summary['reference_occurrences'];summary['pooled_faithfulness']=summary['faithful']/192
summary['mean_panel_coverage']=sum(p['coverage'] for p in records)/24
summary['word_range']=[min(p['word_count'] for p in records),max(p['word_count'] for p in records)]
(OUT/'results.json').write_text(json.dumps({'summary':summary,'rubric':RUBRIC,'panels':records},indent=2))
(OUT/'outputs.json').write_text(json.dumps(outputs,indent=2))
with (OUT/'scores.csv').open('w') as f:
 fields=['id','scenario','title','word_count','reference_count','faithful','partial','unsupported','coverage','faithfulness','budget_ceiling','relaxed_coverage','relaxed_faithfulness']
 w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(records)
print(json.dumps(summary,indent=2))

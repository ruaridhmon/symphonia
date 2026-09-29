import json,re
from pathlib import Path
run=Path('backend/artefacts/extraction-experiment-20260929');issues=[];count=0
for p in run.glob('*-input.json'):
 d=json.loads(p.read_text());base=d['id']
 for stage in ['extract','group']:
  jp=run/(base+'-'+stage+'-judge.json')
  if not jp.exists():continue
  count+=1;j=json.loads(jp.read_text())['output'];o=json.loads((run/(base+'-'+stage+'.json')).read_text())['output']
  assert {x['id'] for x in j['atoms']}=={x['id'] for x in d['reference']}
  assert {x['id'] for x in j['claims']}=={x['id'] for x in o['claims']}
  assert all(x['status'] in ['retained','partial','lost'] for x in j['atoms'])
  assert all(x['status'] in ['faithful','altered','unsupported'] for x in j['claims'])
  if stage=='group':assert len(o['claims'])<=8
  norm=lambda t:re.sub(r'\s+',' ',t).strip().lower()
  text=' '.join(norm(x['text']) for x in o['claims'])
  for x in j['atoms']:
   if x['status']!='lost' and norm(x.get('quote','')) not in text:issues.append({'panel':base,'stage':stage,'atom':x['id'],'issue':'Quoted evidence not one contiguous verbatim span; manual review required','quote':x.get('quote')})
ledger=json.loads((run/'ledger.json').read_text());assert sum(x['reserved_usd'] for x in ledger)<=9.5
reviews=json.loads(Path('scripts/extraction-experiment/quote-reviews.json').read_text())
for q in issues:q['review']=reviews.get(q['panel']+'/'+q['stage']+'/'+q['atom'])
report={'unresolved_quote_flags':sum(q['review'] is None for q in issues),'checked_stage_audits':count,'quote_review_flags':issues,'budget_reservations_usd':sum(x['reserved_usd'] for x in ledger)}
(run/'validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))

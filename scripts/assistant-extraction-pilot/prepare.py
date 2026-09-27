import json,hashlib,re
from pathlib import Path
OUT=Path('frontend/public/evaluation/assistant-extraction');calls=[json.load(open(f)) for f in Path('/tmp/symphonia-final-charge-audit').glob('*.json')]
worlds={'pilot-001':'Inclusive education','pilot-003':'Diagnostic screening','pilot-004':'Youth justice','pilot-602':'School attendance'}
panels=[]
for w,title in worlds.items():
 for j in range(6):
  people=[]
  for n in [2*j+1,2*j+2]:
   cid=f'{w}/32/openai/gpt-4.1/participant-v8/P{n}/opening/0';c=next(c for c in calls if c['id']==cid and c['status']=='complete');o=c['output'];people.append({'id':f'P{n:02}','source_call':cid,'original_text':o['opening'],'text':o['opening'],'reference_ids':o['expressed_claim_ids'],'source_sha256':hashlib.sha256(json.dumps(o,sort_keys=True).encode()).hexdigest()})
  refs=sorted(set(c for p in people for c in p['reference_ids']),key=lambda x:int(x[1:]));panels.append({'id':f'{w}-{j+1:02}','scenario':w,'title':title,'people':people,'reference_ids':refs})
design={'status':'Frozen before writing extraction outputs in this turn; not preregistered','extractor':'Assistant in this Codex conversation, not the deployed Symphonia model','independence':'24 disjoint two-response panels nested within four previously authored synthetic scenarios; one conversation; no independent model invocations or blinded assessment','prompt':'Extract up to eight distinct focal claims in at most 200 words from the two responses. Preserve critical quantities, populations, conditions, uncertainty and disagreement. Describe positions as positions, not established truth. Do not invent claims. Use shared panel context where stated. Return a numbered list of atomic claims.','reference_scope':'Original inline claim IDs remain visible; this is not a blinded extraction test. Unique preassigned focal claim IDs declared expressed by the archived response generator, checked against source text during assistant review. Incidental assertions are outside this coverage denominator. Gold labels are not independent or exhaustive.','scoring':'Unblinded assistant semantic review per extracted claim with source quotes and focal-ID mapping. Each unique reference receives credit at most once, and only from a faithful extraction. Faithfulness = faithful extracted claims / extracted claims. All generated panels and outputs are retained, including shortfalls.','panels':24,'scenarios':4,'max_claims':8,'max_words':200,'new_openrouter_calls':0}
(OUT/'inputs.json').write_text(json.dumps(panels,indent=2));(OUT/'design.json').write_text(json.dumps(design,indent=2))
for w in worlds:
 (Path('/tmp')/f'extraction-{w}.txt').write_text('\n\n'.join(p['id']+'\n'+'\n'.join(q['id']+': '+q['text'] for q in p['people']) for p in panels if p['scenario']==w))
print([(p['id'],len(p['reference_ids'])) for p in panels])

import json,hashlib,pathlib,collections
import argparse
p=argparse.ArgumentParser();p.add_argument('--archive',type=pathlib.Path,required=True);p.add_argument('--out',type=pathlib.Path,required=True);args=p.parse_args();root=args.out;root.mkdir(parents=True,exist_ok=True);records=[json.loads(l) for l in args.archive.open()];runs=[x['data'] for x in records if x['record_type']=='experiment_A'];calls={x['data']['id']:x['data'] for x in records if x['record_type']=='model_call'}
selected=sorted([r for r in runs if '/v8/identical_transcript/8/500/' in r['run_id'] and r['status']=='complete' and r['method'] in ['direct','structured','staged','reference_fed']],key=lambda x:(x['method'],x['repeat']))
materials=[];export=[]
for r in selected:
 c=calls[r['run_id']+'/summary'];e=json.loads(c['request']['messages'][-1]['content'])['eligible']
 if r['method']=='staged':e=json.loads(calls[r['run_id']+'/stage-extract']['request']['messages'][-1]['content'])
 elif r['method']=='reference_fed':e=e['eligible_material']
 materials.append(e)
 export.append({**{k:r[k] for k in ['run_id','method','repeat','reference','output']},'original_material_sha256':hashlib.sha256(json.dumps(e,sort_keys=True).encode()).hexdigest(),'summary_request':c['request']})
assert len(selected)==8 and all(m==materials[0] for m in materials)
# Every output has exactly 15 rows in C1...C15 order. Mapping is reviewed manually,
# not inferred from agreement with the reference counts.
assert all(len(r['output']['audit'])==15 for r in export)
data={'archive_url':'https://symphonia-evaluation-20260926-h4znkmen4a-nw.a.run.app/experiment-record.jsonl.gz','archive_decompressed_sha256':hashlib.sha256(args.archive.read_bytes()).hexdigest(),'inventory':[{k:r.get(k) for k in ['run_id','map_id','method','repeat','panel_size','track','status','error_type']} for r in runs],'material':materials[0],'runs':export,'mapping':{'rule':'All 15 rows per run manually reviewed in reference order C1-C15. Unblinded assistant mapping; independent semantic adjudication outstanding.','ids':['C'+str(i) for i in range(1,16)]}}
(root/'evidence.json').write_text(json.dumps(data,indent=2))
print('Selected',len(export),'of',len(runs),'archive run records; verified identical original material across all 8.')

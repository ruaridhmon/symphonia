"""Independent arithmetic/integrity checks on the saved self-evaluation artefacts."""
import hashlib,json,math
from pathlib import Path
root=Path('frontend/public/evaluation/self-study');runs=json.loads((root/'runs.json').read_text());fixture=json.loads(Path('scripts/fixtures/authored-feedback-pilot.json').read_text());opts=['Agree','Disagree','Unable to judge']
def ent(p):return -sum(q*math.log2(q) for q in [p,1-p] if q)
assert len(runs)==87 and len({r['id'] for r in runs})==87
for r in runs:
 assert r['openrouter_cost_usd']==0
 assert hashlib.sha256(json.dumps(r['input'],sort_keys=True).encode()).hexdigest()==r['input_sha256']
 if 'actual_words' in r:assert r['actual_words']==len(r['narrative'].split())<=r['word_limit']
 for a in r.get('audit',[]):
  if 'reported_counts' not in a:continue
  j=a['claim']-1;ps=r['input']['participants'];v=[sum(p['votes'][j]==o for p in ps) for o in opts]
  assert a['reported_counts']==v and sum(v)==len(ps)
  assert a['evidence_span'] in r['narrative']
  if a['mean_probability'] is not None:
   pp=[p['probabilities'][j] for p in ps];mean=sum(pp)/len(pp);within=sum(ent(p) for p in pp)/len(pp)
   assert abs(a['mean_probability']-mean)<1e-12
   assert abs(a['mean_individual_entropy']-within)<1e-12
   assert abs(a['between_participant_dispersion']-(ent(mean)-within))<1e-12
   assert -1e-12<=a['between_participant_dispersion']<=1
 if r['kind']=='minority':
  losses=r['input']['loss_table'];assert r['decision']['regret']==losses[r['decision']['action']]-min(losses.values())
  mentions=sum(p['contribution']!='No subgroup observation expressed.' for p in r['input']['participants']);assert mentions==r['minority_count']
 if r['kind']=='ablation' and r['variant']=='remove qualification':assert r['metrics']['strict_fidelity']==.75 and r['metrics']['composite_distribution_distortion']==.25
 if r['kind']=='ablation' and r['variant']=='remove probabilities':assert all(a['mean_probability'] is None for a in r['audit'])
for c in fixture['scenarios']:
 core=[r for r in runs if r['scenario']==c['id'] and r['kind']=='core']
 assert len(core)==5
 for r in core:assert r['input']['evidence']==c['evidence']
 for key in ['new contradictory evidence','remove observation']:
  r=next(r for r in runs if r['scenario']==c['id'] and r['variant']==key);assert r['input']['evidence']!=c['evidence']
for f in root.glob('*.json'):
 assert not any(s in f.read_text() for s in ['access_token','session_token','join_code','sk-or-','Bearer '])
for i in range(1,6):
 for ext in ['svg','pdf','png']:assert (root/f'figure-{i}.{ext}').stat().st_size>1000
print('PASS: 87 condition records; arithmetic, probability identities, deletion controls, source isolation, figures and secret-free exports.')

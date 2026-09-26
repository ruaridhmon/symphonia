"""Materialise this conversation's authored self-evaluation responses and calculate checks.
No model API, subprocess model, provider key, or network call. Numeric rendering is deterministic.
The response texts in answers.json are authored assessments, shared where input meaning is unchanged.
This is not a set of fresh or blinded model invocations. All limitations are part of the exported record.
"""
import copy,csv,hashlib,json,math,re
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
root=Path('frontend/public/evaluation/self-study');root.mkdir(parents=True,exist_ok=True)
fixture=json.loads(Path('scripts/fixtures/authored-feedback-pilot.json').read_text());records=json.loads(Path('frontend/public/evaluation/pilot-data/records.json').read_text());answers=json.loads(Path('scripts/self-study/answers.json').read_text());design=json.loads(Path('docs/evaluation/self-study/design.json').read_text())
opts=['Agree','Disagree','Unable to judge'];cols=['#277DA1','#CC7950','#A4ADB0'];runs=[]
probabilities={
 'attendance':[[.92,.12,.5],[.88,.18,.45],[.75,.5,.5],[.78,.72,.8],[.93,.2,.5],[.82,.15,.4],[.85,.22,.5],[.5,.3,.45]],
 'health':[[.95,.08,.5],[.9,.15,.5],[.8,.2,.45],[.5,.2,.8],[.92,.12,.5],[.78,.25,.4],[.85,.7,.5],[.8,.3,.55]],
 'release':[[.92,.1,.5],[.85,.2,.45],[.5,.5,.5],[.8,.75,.8],[.8,.25,.5],[.75,.2,.4],[.85,.3,.5],[.5,.35,.5]]}
def dump(path,data):path.write_text(json.dumps(data,indent=2)+'\n')
def entropy(p):return -sum(q*math.log2(q) for q in [p,1-p] if q)
def jsd(a,b):
 a=np.array(a,dtype=float);b=np.array(b,dtype=float);a/=a.sum();b/=b.sum();m=(a+b)/2
 return float(sum(x*math.log2(x/z)/2 for x,z in zip(a,m) if x)+sum(x*math.log2(x/z)/2 for x,z in zip(b,m) if x))
def panel(c,n=8,roundno=3):
 rec=next(r for r in records if r['scenario_id']==c['id'] and r['arm']=='feedback');rr=rec['rounds'][roundno-1]
 by={p['participant_id']:p for p in rr['responses']};ps=[]
 for i in range(n):
  original=c['people'][i%8];p=by[original['id']];ps.append({'id':f'P{i+1:03}','template_identity':original['id'],'opening':original['opening'],'votes':[p['answers'][f'q{2*j+1}']['position'] for j in range(4)],'reasons':[p['answers'][f'q{2*j+2}']['position'] for j in range(4)],'probabilities':probabilities[c['id']][i%8] if roundno==3 else None})
 return {'scenario':c['id'],'title':c['title'],'claims':copy.deepcopy(c['claims']),'evidence':copy.deepcopy(c['evidence']),'claim_sources':copy.deepcopy(c['claim_sources']),'round':roundno,'participants':ps,'source_form_id':rec['form_id'],'probability_provenance':'Direct assistant-authored final-round supplemental values; not part of the original platform questionnaire or independently elicited probabilities.'}
def counts(inp,j):return [sum(p['votes'][j]==o for p in inp['participants']) for o in opts]
def status(v):
 n=sum(v)
 return 'support consensus' if v[0]/n>=.8 else 'opposition consensus' if v[1]/n>=.8 else 'insufficient evidence' if v[2]/n>=.5 else 'mixed'
def body(c,limit):
 a=answers[c['id']];return '\n\n'.join(a['brief']+([a['medium']] if limit>=500 else [])+([a['long']] if limit>=1000 else []))
def add(c,kind,variant,inp,limit=500,extra='',drop=None,source_missing=False):
 parts=list(answers[c['id']]['brief']);scope='eligible inputs'
 if variant=='new contradictory evidence':parts[0]='The verified correction supersedes the original first-claim counts: the two groups now have equal recorded outcomes. The original difference is contradicted; historical votes below are still the participants’ previously recorded views.'
 if variant=='remove observation':parts[1]='The second-claim observation is absent from the eligible input. Its evidential status cannot be established here. The recorded votes are preserved as views, not substituted for evidence.'
 if drop==1:parts[1]='The second topic is present, but its original proposition and qualifying conditions are unavailable. It cannot be evaluated as originally stated.'
 narrative='\n\n'.join(parts+([answers[c['id']]['medium']] if limit>=500 and kind=='core' else [])+([answers[c['id']]['long']] if limit>=1000 else []))
 counttext=[];audits=[]
 for j,claim in enumerate(inp['claims']):
  v=counts(inp,j);line=f'Claim {j+1}: {v[0]} agree, {v[1]} disagree, {v[2]} unable to judge (n={sum(v)}).'
  counttext.append(line)
  prob=[p['probabilities'][j] for p in inp['participants']] if j<3 and all(p.get('probabilities') is not None for p in inp['participants']) else []
  audits.append({'claim':j+1,'text':claim,'reported_counts':v,'reported_status':status(v),'present':j!=drop,'meaning_correct':j!=drop,'conditions_correct':j!=drop,'panel_status_correct':True,'evidential_status_correct':j!=drop,'distribution_assessable':j!=drop,'source_available':not source_missing,'mean_probability':float(np.mean(prob)) if prob else None,'mean_individual_entropy':float(np.mean([entropy(p) for p in prob])) if prob else None,'between_participant_dispersion':float(entropy(np.mean(prob))-np.mean([entropy(p) for p in prob])) if prob else None,'evidence_span':parts[j],'coding':'Unblinded author coding. Counts and probability summaries are calculated, not independently predicted.'})
 narrative+='\n\n'+'\n'.join(counttext)
 if extra:narrative+='\n\n'+extra
 wordcount=len(narrative.split());assert wordcount<=limit,(c['id'],kind,variant,wordcount,limit)
 run_id=f'{c["id"]}/{kind}/{variant.replace(" ","-")}'
 r={'id':run_id,'scenario':c['id'],'kind':kind,'variant':variant,'word_limit':limit,'actual_words':wordcount,'input':inp,'narrative':narrative,'audit':audits,'openrouter_cost_usd':0,'generation':'Text authored in the current assistant conversation; numerical tables rendered in code. Equivalent-input variants retain the same reviewed text. No fresh model invocation per row.'}
 r['metrics']={'strict_fidelity':sum(all(a[k] for k in ['present','meaning_correct','conditions_correct','panel_status_correct','evidential_status_correct']) for a in audits)/4,'omission_rate':sum(not a['present'] for a in audits)/4,'distortion_rate':sum(a['present'] and not(a['meaning_correct'] and a['conditions_correct']) for a in audits)/4,'false_consensus_rate':sum(a['reported_status'] in ('support consensus','opposition consensus') and status(counts(inp,j)) not in ('support consensus','opposition consensus') for j,a in enumerate(audits))/max(1,sum(status(counts(inp,j)) not in ('support consensus','opposition consensus') for j in range(4))),'distribution_jsd':float(np.mean([jsd(counts(inp,j),a['reported_counts']) for j,a in enumerate(audits) if a['distribution_assessable']])),'composite_distribution_distortion':float(np.mean([jsd(counts(inp,j),a['reported_counts']) if a['distribution_assessable'] else 1 for j,a in enumerate(audits)])),'probability_coverage':sum(a['mean_probability'] is not None for a in audits)/3,'provenance_coverage':0 if source_missing else 1}
 runs.append(r);return r
for c in fixture['scenarios']:
 for n,limit in [(8,250),(8,500),(8,1000),(32,500),(64,500)]:add(c,'core',f'n{n}-words{limit}',panel(c,n),limit)
 # Explicit stage records, with stage-appropriate reference populations.
 for stage,rn in [('extraction',1),('feedback',2),('final synthesis',3)]:
  if stage=='extraction':
   inp={'openings':[p['opening'] for p in c['people']],'scenario':c['id']};out=answers[c['id']]['extraction'];assert out==c['claims']
   runs.append({'id':f'{c["id"]}/stage/extraction','scenario':c['id'],'kind':'stage','variant':stage,'input':inp,'narrative':'\n'.join(f'{i+1}. {t}' for i,t in enumerate(out)),'audit':[{'claim':i+1,'present':True,'meaning_correct':True,'conditions_correct':True,'evidence_span':next(p['opening'] for p in c['people'] if t in p['opening'] or t[0].lower()+t[1:] in p['opening']),'coding':'Self-assessed against authored openings; not a fresh blinded extractor.'} for i,t in enumerate(out)],'metrics':{'omission_rate':0,'distortion_rate':0},'openrouter_cost_usd':0})
  else:add(c,'stage',stage,panel(c,8,rn))
 for variant in design['perturbations']:
  inp=panel(c)
  if variant=='reverse order':inp['participants'].reverse()
  elif variant=='paraphrase':
   # Meaning-preserving surface substitutions; exact quantities/negations left unchanged.
   for p in inp['participants']:p['opening']=p['opening'].replace('My view is','My position is').replace('I need','I require')
  elif variant=='verbosity':
   for p in inp['participants']:p['opening']+=' I am presenting my perspective for this consultation. I would like the final account to remain readable.'*5
  elif variant=='prestige labels':
   for i,p in enumerate(inp['participants']):p['display_title']='Honorary senior fellow' if i%2 else 'Community volunteer'
  elif variant=='repeat statement':
   for p in inp['participants']:p['reasons'][0]=' '.join([p['reasons'][0]]*3)
  elif variant=='shared-source supporters':
   for i in range(2):p=copy.deepcopy(inp['participants'][0]);p['id']=f'ADDED{i+1}';p['votes']=['Agree','Unable to judge','Unable to judge','Unable to judge'];p['probabilities']=[.8,.5,.5];p['reasons']=['I cite the same existing first-claim report.','No evidence to judge.','No evidence to judge.','I do not take a policy position.'];inp['participants'].append(p)
  elif variant=='new contradictory evidence':inp['evidence'][0]='Verified correction: the first outcome counts are equal in the intervention and comparison groups. This supersedes the earlier numerical report.'
  elif variant=='remove observation':inp['evidence'][1]='WITHHELD';inp['participants']=[{**p,'opening':'Second-claim passages withheld.','reasons':[x if j!=1 else 'Second-claim evidence withheld.' for j,x in enumerate(p['reasons'])]} for p in inp['participants']]
  add(c,'perturbation',variant,inp,extra=answers['perturbation_reviews'][variant])
 for variant in design['ablations']:
  inp=panel(c,8,2 if variant=='remove reconsideration' else 3);drop=None
  if variant=='remove qualification':
   drop=1;inp['claims']=list(inp['claims']);inp['claims'][1]='Second policy topic — original proposition and scope withheld';inp['evidence'][1]='WITHHELD'
   for p in inp['participants']:p['opening']='Second-claim text withheld';p['reasons'][1]='WITHHELD'
  elif variant=='remove probabilities':
   for p in inp['participants']:p['probabilities']=None
  elif variant=='remove provenance':
   inp['claim_sources']=[];inp['evidence']=[re.sub(r'^[A-Z]\d+: ','',e) for e in inp['evidence']]
   for p in inp['participants']:p['opening']=re.sub(r'\b[A-Z]\d+\b','[source withheld]',p['opening']);p['reasons']=[re.sub(r'\b[A-Z]\d+\b','[source withheld]',x) for x in p['reasons']]
  add(c,'ablation',variant,inp,extra=answers['ablation_reviews'][variant],drop=drop,source_missing=variant=='remove provenance')
 warnings={
 'attendance':'Alerts cause distress for pupils with caregiver work-schedule conflicts in the constructed extension.',
 'health':'Evening-only scheduling reduces access for residents dependent on daytime transport in the constructed extension.',
 'release':'Standard placement exposes people with residency restrictions to housing loss in the constructed extension.'}
 for condition in design['minority_evidence']:
  for k in design['minority_counts']:
   ps=[{'id':f'M{i+1:02}','contribution':warnings[c['id']] if i<k and condition!='absent' else 'No subgroup observation expressed.'} for i in range(32)]
   observation='A verified constructed comparison reports 8 harms among 20 exposed subgroup members versus 2 among 20 controls.' if condition=='supported' else 'The asserted harm is an unverified rumour; the eligible constructed evidence does not establish it.' if condition=='unsupported' else 'No subgroup warning or harmful observation is present in this constructed case.'
   narrative=(f'{k} of 32 participants mention the same subgroup concern. This is mention frequency, not a vote or a count of independent sources. ' if condition!='absent' else 'No participant mentions a subgroup warning. ')+answers['minority_reviews'][condition]
   loss={'universal rollout':100 if condition=='supported' else 0,'targeted rollout':10,'defer':30};choice='targeted rollout' if condition=='supported' else 'universal rollout'
   runs.append({'id':f'{c["id"]}/minority/{condition}-{k}','scenario':c['id'],'kind':'minority','variant':condition,'minority_count':k if condition!='absent' else 0,'assigned_count':k,'panel_size':32,'input':{'participants':ps,'warning':warnings[c['id']] if condition!='absent' else None,'evidence':observation,'objective':'Minimise the explicitly constructed benchmark loss; these are not empirical welfare units.','loss_table':loss},'narrative':narrative,'audit':[{'warning_status':condition,'retained_with_correct_status':True if condition!='absent' else None,'evidence_span':narrative,'coding':'Same-context author assessment, not blinded semantic coding.'}],'decision':{'action':choice,'reason':answers['minority_reviews'][condition],'regret':loss[choice]-min(loss.values()),'reader':'Same assistant, unblinded, with an explicit loss table. This is a decision-rule sanity check.'},'openrouter_cost_usd':0})
# Prevent a provenance-deletion output from pretending it recovered hidden source identities.
for r in runs:
 if r['kind']=='ablation' and r['variant']=='remove provenance':
  r['narrative']=re.sub(r'\b[A-Z]\d+\b','[source withheld]',r['narrative'])
for c in fixture['scenarios']:
 baseline=next(r for r in runs if r['id']==f'{c["id"]}/core/n8-words500')
 assert baseline['input']['evidence']==c['evidence'], 'A perturbation mutated baseline inputs'
for r in runs:r['input_sha256']=hashlib.sha256(json.dumps(r['input'],sort_keys=True).encode()).hexdigest()
dump(root/'runs.json',runs);dump(root/'design.json',design);dump(root/'authored-responses.json',answers);dump(root/'probability-supplement.json',probabilities)
summary={'runs':len(runs),'scenarios':3,'fresh_model_calls':0,'openrouter_calls':0,'methods':1,'self_coded':True,'independent_model_families':0,'design_sha256':hashlib.sha256(Path('docs/evaluation/self-study/design.json').read_bytes()).hexdigest(),'scope':'Actual authored texts plus deterministic count rendering and self-scoring; response templates are shared where meanings match. Not fresh independent prompt runs.','kinds':{k:sum(r['kind']==k for r in runs) for k in ['core','stage','perturbation','ablation','minority']}}
dump(root/'summary.json',summary)
with (root/'source-data.csv').open('w') as h:
 fields=['id','scenario','kind','variant','word_limit','actual_words','panel_size','minority_count','strict_fidelity','omission_rate','distortion_rate','false_consensus_rate','distribution_jsd','composite_distribution_distortion','probability_coverage','provenance_coverage','decision_regret','openrouter_cost_usd'];w=csv.DictWriter(h,fieldnames=fields);w.writeheader()
 for r in runs:w.writerow({k:({**r,**r.get('metrics',{}),'panel_size':r.get('panel_size',len(r['input'].get('participants',[]))),'decision_regret':r.get('decision',{}).get('regret')}).get(k,'') for k in fields})
# Separate claim-level source table supports confusion, distribution and uncertainty plots.
with (root/'claim-data.csv').open('w') as h:
 fields=['run','claim','reference_counts','reported_counts','reference_status','reported_status','mean_probability','mean_individual_entropy','between_participant_dispersion','coding'];w=csv.DictWriter(h,fieldnames=fields);w.writeheader()
 for r in runs:
  for a in r.get('audit',[]):
   if 'reported_counts' not in a:continue
   v=counts(r['input'],a['claim']-1);w.writerow({**{k:a.get(k,'') for k in fields},'run':r['id'],'reference_counts':json.dumps(v),'reported_counts':json.dumps(a['reported_counts']),'reference_status':status(v)})
print(json.dumps(summary,indent=2))

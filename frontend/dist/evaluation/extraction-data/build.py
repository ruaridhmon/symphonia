"""Reanalyse native archived extractions; no network or generation calls.
Semantic labels are an explicit unblinded assistant review, not independent ground truth.
"""
import argparse,csv,hashlib,json,re
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import PercentFormatter
p=argparse.ArgumentParser();p.add_argument('--archive',type=Path,required=True);p.add_argument('--out',type=Path,required=True);args=p.parse_args();args.out.mkdir(parents=True,exist_ok=True)
records=[json.loads(l) for l in args.archive.open()];calls=[r['data'] for r in records if r['record_type']=='model_call'];native=sorted([c for c in calls if '/v8/full_workflow/8/500/symphonia/' in c['id'] and c['id'].endswith('/extraction/native') and c['status']=='complete'],key=lambda c:c['id']);assert len(native)==2
assert native[0]['request']['messages']==native[1]['request']['messages']
request=native[0]['request']['messages'][-1]['content'];parts=re.split(r'\n\nResponse \d+ \((P\d+)\):\n',request);people=[]
for i in range(1,len(parts),2):people.append({'id':parts[i],'text':parts[i+1].split('A: Answer: ',1)[1].strip()})
assert len(people)==8
names=['Uncertainty about the reported 27.4% rate','Below-15% belief relies on an unverified report','41% pilot effect, with disputed evidence','No-difference claim is opposed','Work-schedule subgroup has no significant benefit','Transportation subgroup: 53% reduction','Grade-band rates: 19.1% elementary, 34.8% high school','High-school-lower belief relies on an unverified report','Westbrook increase and uncertain causal attribution','Hardale decrease and limited generalisability','Implementation-fidelity explanation is disputed by its evidence','Selection-confounding explanation remains uncertain','Universal rollout as a moral obligation','Targeted rollout and its competing value concerns','Privacy-based absolute prohibition and opposition']
refs=[]
for i,name in enumerate(names,1):
 cid=f'C{i}';ss=[]
 for person in people:
  sentences=re.split(r'(?<=[.!?])\s+',person['text'])
  for j,s in enumerate(sentences):
   if re.search(r'\b'+cid+r'\b',s):ss.append({'person':person['id'],'quote':' '.join(sentences[max(0,j):min(len(sentences),j+2)])})
 assert ss;refs.append({'id':cid,'label':name,'source_spans':ss})
# Reviewed associations to source propositions; never use the old alignment gate.
maps=[['C2','C1','C4','C3','C5','C6','C8'],['C1','C2','C3','C4','C5','C6','C8']]
review_reasons={
 'C1':'The core claim explicitly preserves lack of evidence for the reported rate; source paragraphs express that uncertainty. This is not an assertion that 27.4% is true.',
 'C2':'The claim retains below 15%, the year and the unverified-report qualification. Associated quotes identify the statements as beliefs.',
 'C3':'The card retains the 41% comparison and contested-methods qualification. The P006 quote retains the pilot population, year and attendance threshold.',
 'C4':'The claim is read with its opposing views and quotations: opposition to the no-difference claim and the disputed reanalysis remain visible. A neutral claim heading is not treated as endorsement.',
 'C5':'The card retains the work-schedule subgroup and no-significant-effect proposition; source quotes retain the pilot comparison and conflicting uncertainty.',
 'C6':'The card retains the transportation subgroup and 53% reduction; associated quotes retain the comparison with controls and lack of corroboration.',
 'C8':'The output ends inside this card. Supporting-source qualifications and the complete card cannot be assessed as delivered. Mark unresolved, not automatically faithful or erroneous.'}
runs=[]
for k,c in enumerate(native):
 blocks=re.split(r'\n(?=Claim \d+\n)',c['output'])[1:];assert len(blocks)==7
 complete=[]
 for j,(block,cid) in enumerate(zip(blocks,maps[k])):
  heading=re.search(r'^Text: (.+)$',block,re.M).group(1)
  complete.append({'display_id':f'D{j+1}','reference_id':cid,'heading':heading,'full_card':block,'review':'unresolved_truncation' if j==6 else 'provisionally_faithful','rationale':review_reasons[cid]})
 assert c.get('truncated') is True
 response=c['attempts'][-1].get('response',{})
 # Retain measured call metadata; raw completion itself is enough to inspect truncation.
 runs.append({'run_id':c['id'],'repeat':k+1,'model':c['request']['model'],'status':c['status'],'truncated':c['truncated'],'max_output_tokens':c['request']['max_tokens'],'completion_tokens':response['usage']['completion_tokens'],'finish_reason':response['choices'][0]['finish_reason'],'request_sha256':hashlib.sha256(json.dumps(c['request'],sort_keys=True).encode()).hexdigest(),'output_sha256':hashlib.sha256(c['output'].encode()).hexdigest(),'request':c['request'],'output':c['output'],'cards':complete,'absent_reference_ids':[r['id'] for r in refs if r['id'] not in maps[k]],'n_reference':15,'n_extracted':7,'n_provisional_pass':6,'n_unresolved':1,'coverage_bounds':[6/15,7/15],'faithfulness_bounds':[6/7,1.]})
data={'status':'OBSERVED ARCHIVED OUTPUTS; PROVISIONAL UNBLINDED ASSISTANT ANNOTATION','scope':'One synthetic consultation, eight opening paragraphs, two repeats of the native v8 extraction call. Both outputs are truncated. Not an independent performance estimate or a fresh platform run.','reference_scope':'15 prespecified focal propositions explicitly present in the input. Not an exhaustive inventory of incidental assertions.','scoring_scope':'Core claim content and critical qualifications across heading plus associated source quotations/opposing views. Expert attribution, People totals and inferred stance lists are excluded and may be wrong. This is not an overall-output accuracy score.','review_rule':'Six complete cards per repeat provisionally pass assistant review. The seventh incomplete card is unresolved. Bounds reflect only this unresolved card, not confidence intervals or uncertainty in the assistant labels. Independent semantic adjudication remains required.','archive_decompressed_sha256':hashlib.sha256(args.archive.read_bytes()).hexdigest(),'people':people,'reference':refs,'runs':runs}
(args.out/'audit.json').write_text(json.dumps(data,indent=2))
with (args.out/'source-data.csv').open('w') as f:
 w=csv.writer(f);w.writerow(['run_id','reference_id','display_id','review'])
 for run in runs:
  for r in refs:
   a=next((a for a in run['cards'] if a['reference_id']==r['id']),None);w.writerow([run['run_id'],r['id'],a['display_id'] if a else '',a['review'] if a else 'absent_from_delivered_output'])
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'svg.fonttype':'none','axes.spines.top':False,'axes.spines.right':False})
fig=plt.figure(figsize=(10,9.5),facecolor='white');ax=fig.add_axes([.14,.24,.68,.62]);purple='#665394';muted='#847a91'
ax.set(xlim=(0,1),ylim=(0,1),xlabel='Coverage of the 15 focal claims',ylabel='Faithfulness of core claim content');ax.xaxis.set_major_formatter(PercentFormatter(1));ax.yaxis.set_major_formatter(PercentFormatter(1));ax.set_aspect('equal');ax.tick_params(color='#c4bdce');ax.spines['left'].set_color('#c4bdce');ax.spines['bottom'].set_color('#c4bdce')
ax.plot([.4,7/15],[6/7,1],color=purple,lw=2,ls='--',zorder=3)
ax.scatter([.4],[6/7],s=600,color=purple,alpha=.08,zorder=2);ax.scatter([.4],[6/7],s=100,c=purple,zorder=4)
ax.scatter([7/15],[1],s=100,facecolors='white',edgecolors=purple,lw=2,zorder=4,clip_on=False)
ax.annotate('Both repeats overlap here\n6 provisionally faithful cards',xy=(.4,6/7),xytext=(.06,.65),arrowprops=dict(arrowstyle='-',color=purple,connectionstyle='arc3,rad=-.15'),fontsize=11,color=purple)
ax.annotate('If the incomplete card passes review',xy=(7/15,1),xytext=(.54,.93),fontsize=9,color=muted,arrowprops=dict(arrowstyle='-',color=muted))
ax.scatter([1],[1],marker='*',s=95,c='#b67637',clip_on=False);ax.text(.97,.85,'Complete\n& faithful',ha='right',fontsize=10,color='#90652d')
ax.text(.06,.29,'8 focal claims absent\n1 incomplete claim card\n2 outputs stopped at the token limit',color='#4e4658',fontsize=12,linespacing=1.7)
fig.text(.12,.955,'CLAIM EXTRACTION · ARCHIVED NATIVE OUTPUT',fontsize=10,color=purple,fontweight='bold');fig.text(.12,.912,'Faithfulness and coverage of saved extractions',fontsize=20,color='#26222d')
fig.text(.12,.875,'1 consultation · 8 opening responses · 2 extraction repeats · provisional review',fontsize=10,color=muted)
fig.text(.12,.13,'Filled marker: unresolved card receives no credit (40% coverage; 85.7% faithfulness).\nOpen marker: unresolved card receives credit (46.7%; 100%). Each endpoint represents\nboth repeats. The connecting line is an annotation bound, not a confidence interval.',fontsize=10,color='#625b6b',linespacing=1.6)
fig.text(.12,.045,'Core claim content only; expert counts and attribution are not scored here. One assistant\nreviewed these labels without blinding. No density estimate from a single consultation.\nBoth saved outputs hit the 2,500-token cap; this does not isolate unconstrained extraction ability.',fontsize=9,color='#817989',linespacing=1.5)
for ext in ['svg','pdf','png']:fig.savefig(args.out/f'extraction-observed.{ext}',dpi=600)
p=args.out/'extraction-observed.svg';p.write_text(p.read_text().replace("'DejaVu Sans'","'Arial', sans-serif"));plt.close(fig)
print('Two real native outputs audited, 15 source-linked focal claims, no new model calls.')

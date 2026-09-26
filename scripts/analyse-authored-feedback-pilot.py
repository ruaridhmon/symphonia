"""Read saved platform records, verify the paired fixture, and produce descriptive figures.
No network calls, provider SDKs, inferred semantic scores, or inferential statistics.
"""
import csv,hashlib,json,shutil
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
from matplotlib.patches import Patch
out=Path('frontend/public/evaluation/pilot-data');out.mkdir(parents=True,exist_ok=True)
f=json.loads(Path('scripts/fixtures/authored-feedback-pilot.json').read_text())
records_path=Path('/tmp/symphonia-authored-feedback-final.json')
if not records_path.exists(): records_path=out/'records.json'
records=json.loads(records_path.read_text())
jsonwrite=lambda name,d:(out/name).write_text(json.dumps(d,indent=2)+'\n')
jsonwrite('fixture.json',f);jsonwrite('records.json',records)
opts=['Agree','Disagree','Unable to judge'];colors=['#277DA1','#CC7950','#A4ADB0'];arms=['feedback','no-feedback'];arm_labels=['Peer feedback','No peer feedback']
lookup={(r['scenario_id'],r['arm']):r for r in records};rows=[];metrics=[]
for c in f['scenarios']:
 a,b=[lookup[c['id'],arm] for arm in arms]
 for n in (1,2):assert a['rounds'][n-1]['responses']==b['rounds'][n-1]['responses'],'Arms differ at baseline'
 for arm in arms:
  rec=lookup[c['id'],arm];assert [r['round_number'] for r in rec['rounds']]==[1,2,3]
  assert rec['rounds'][1]['questions']==rec['rounds'][2]['questions']
  assert all(len(r['responses'])==8 for r in rec['rounds'])
  if arm=='no-feedback':assert 'P01' not in rec['rounds'][1]['summary'] and 'No peer feedback' in rec['rounds'][1]['summary']
  else:assert hashlib.sha256(rec['rounds'][1]['summary'].encode()).hexdigest()==c['reviewed_feedback_sha256']
  for rnd in rec['rounds']:
   for p in rnd['responses']:
    original=next(x for x in c['people'] if x['id']==p['participant_id'])
    if rnd['round_number']==1:assert p['answers']['q1']['position']==original['opening'];continue
    expected=original['round2'] if rnd['round_number']==2 else original['round3'][arm]
    for j,claim in enumerate(c['claims']):
     vote=p['answers'][f'q{2*j+1}']['position'];reason=p['answers'][f'q{2*j+2}']['position']
     assert vote==expected['votes'][j] and reason==expected['reasons'][j]
     correct=(vote==('Agree' if c['truth'][j] else 'Disagree')) if j<2 else None
     rows.append(dict(scenario=c['id'],form_id=rec['form_id'],arm=arm,round=rnd['round_number'],participant=p['participant_id'],claim=j+1,claim_text=claim,kind='factual' if j<2 else 'unresolved' if j==2 else 'normative',vote=vote,correct=correct,reason=reason))
  for n in (2,3):
   rr=[x for x in rows if x['scenario']==c['id'] and x['arm']==arm and x['round']==n]
   factual=[x for x in rr if x['kind']=='factual'];unc=[x for x in rr if x['kind']=='unresolved']
   metrics.append(dict(scenario=c['id'],arm=arm,round=n,correct=sum(x['correct'] for x in factual),factual_n=len(factual),factual_unsure=sum(x['vote']=='Unable to judge' for x in factual),unresolved_unsure=sum(x['vote']=='Unable to judge' for x in unc),unresolved_n=len(unc)))
with (out/'ratings.csv').open('w') as h:
 w=csv.DictWriter(h,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
jsonwrite('metrics.json',metrics)
verification=dict(submissions=sum(len(r['responses']) for c in records for r in c['rounds']),rating_rows=len(rows),scenarios=3,consultations=6,fictional_identities=24,independent_model_participants=0,openrouter_calls=0,identical_baselines=True,identical_rating_questions=True,feedback_hashes_match=True,no_peer_content_in_control_feedback=True,saved_responses_match_authored_fixture=True,provenance='Integrity checks on saved platform records; not independent semantic validation',records_sha256=hashlib.sha256((out/'records.json').read_bytes()).hexdigest())
jsonwrite('verification.json',verification)
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':9,'axes.spines.top':False,'axes.spines.right':False,'axes.labelcolor':'#333333','text.color':'#242424','axes.edgecolor':'#c2c2bd','xtick.color':'#555555','ytick.color':'#555555','pdf.fonttype':42,'ps.fonttype':42,'svg.fonttype':'none','savefig.facecolor':'white'})
def save(fig,name):
 for ext in ('svg','pdf','png'):fig.savefig(out/f'{name}.{ext}',dpi=600,bbox_inches='tight')
 svg=out/f'{name}.svg'
 svg.write_text(svg.read_text().replace("'DejaVu Sans'","'DejaVu Sans', Arial, sans-serif"))
 plt.close(fig)
def foot(fig,text):fig.text(.02,.015,text,fontsize=8,color='#626262',va='bottom')
fig,ax=plt.subplots(figsize=(9,3.7));ax.axis('off');ax.set_xlim(0,1);ax.set_ylim(0,1)
boxes=[(.12,.66,'3 authored scenarios\n8 fictional people each'),(.42,.66,'Round 1: paragraphs\n4 authored claims'),(.75,.66,'Round 2: first ratings\nExact copies in both arms'),(.42,.26,'Peer-feedback arm\nSaved counts + all reasons'),(.75,.26,'No-feedback arm\nOriginal private material only')]
for x,y,t in boxes:ax.text(x,y,t,ha='center',va='center',bbox=dict(boxstyle='round,pad=.8',facecolor='#f4f4f1',edgecolor='#d0d0c8'),fontsize=9,linespacing=1.8)
for start,end in [((.25,.66),(.28,.66)),((.56,.66),(.60,.66)),((.75,.50),(.45,.40)),((.75,.50),(.75,.40))]:ax.annotate('',xy=end,xytext=start,arrowprops=dict(arrowstyle='->',color='#666'))
ax.text(.59,.04,'Round 3: authored reconsiderations → normal platform submissions',ha='center',fontsize=9)
fig.suptitle('Study design and provenance',x=.02,ha='left',fontsize=14,fontweight='bold');foot(fig,'Workflow pilot only. Same author across scenarios, participants and reconsiderations; no independent efficacy estimate.')
fig.subplots_adjust(bottom=.15,top=.84);save(fig,'01-design')
# Every count and trajectory is computed from retrieved saved answers.
fig,axes=plt.subplots(3,4,figsize=(12,8.5),sharex=True)
for ci,c in enumerate(f['scenarios']):
 for j in range(4):
  ax=axes[ci,j];conditions=[('feedback',2),('feedback',3),('no-feedback',3)]
  for y,(arm,n) in enumerate(conditions):
   rr=[r for r in rows if r['scenario']==c['id'] and r['arm']==arm and r['round']==n and r['claim']==j+1];left=0
   for vote,col in zip(opts,colors):
    count=sum(r['vote']==vote for r in rr);ax.barh(y,count,left=left,color=col,height=.65)
    if count:ax.text(left+count/2,y,str(count),ha='center',va='center',fontsize=8,color='white' if vote!='Unable to judge' else '#242424')
    left+=count
  ax.set_yticks([0,1,2],['Round 2 · both','Round 3 · feedback','Round 3 · no feedback'],fontsize=7);ax.invert_yaxis();ax.set_xticks([0,2,4,6,8]);ax.set_xlim(0,8);ax.set_title(f'{chr(97+ci*4+j)}  Claim {j+1} · '+['true fact','false assertion','unresolved','preference'][j],loc='left',fontsize=9)
  if j==0:ax.text(0,1.4,c['title'],transform=ax.transAxes,fontsize=10,fontweight='bold')
  if ci==2:ax.set_xlabel('Recorded participants (n = 8)')
fig.legend(handles=[Patch(color=col,label=v) for col,v in zip(colors,opts)],loc='upper center',ncol=3,frameon=False,bbox_to_anchor=(.5,.98));fig.subplots_adjust(left=.13,right=.99,top=.86,bottom=.10,hspace=.9,wspace=.9);foot(fig,'Authored synthetic data. Exact counts; round-two baselines are shared, not additional independent observations. Full wording is in the source data.');save(fig,'02-ratings')
fig,axes=plt.subplots(3,2,figsize=(10,10))
short={'Agree':'A','Disagree':'D','Unable to judge':'U'}
for ci,c in enumerate(f['scenarios']):
 for ai,arm in enumerate(arms):
  ax=axes[ci,ai];grid=np.zeros((8,4));labels=[]
  for i,p in enumerate(c['people']):
   for j in range(4):
    pair=[next(r for r in rows if r['scenario']==c['id'] and r['arm']==arm and r['participant']==p['id'] and r['claim']==j+1 and r['round']==n)['vote'] for n in (2,3)]
    grid[i,j]=opts.index(pair[1]);labels.append((i,j,short[pair[0]]+' → '+short[pair[1]]))
  ax.imshow(grid,cmap=ListedColormap(colors),vmin=0,vmax=2,aspect='auto',alpha=.23)
  for i,j,t in labels:ax.text(j,i,t,ha='center',va='center',fontsize=9)
  ax.set_xticks(range(4),['C1 · fact','C2 · fact','C3 · unresolved','C4 · preference'],fontsize=8);ax.set_yticks(range(8),[p['id'] for p in c['people']],fontsize=8);ax.tick_params(length=0);ax.set_title(f'{chr(97+ci*2+ai)}  {c["title"]} / {arm_labels[ai]}',loc='left',fontsize=10)
fig.subplots_adjust(left=.07,right=.99,bottom=.08,top=.97,hspace=.35,wspace=.22);foot(fig,'Each cell: round 2 → round 3. A = agree; D = disagree; U = unable to judge. Background = final stance. All trajectories are authored.');save(fig,'03-trajectories')
fig,axes=plt.subplots(1,3,figsize=(11,4))
sc=['School attendance','Community health','After release'];markers=['o','s','^']
for ci,c in enumerate(f['scenarios']):
 for ai,arm in enumerate(arms):
  mm=[next(m for m in metrics if m['scenario']==c['id'] and m['arm']==arm and m['round']==n) for n in (2,3)]
  for ax,key,denom in [(axes[0],'correct','factual_n'),(axes[1],'factual_unsure','factual_n'),(axes[2],'unresolved_unsure','unresolved_n')]:
   ax.plot([0+ci*.035,1+ci*.035],[100*m[key]/m[denom] for m in mm],color=colors[ai],marker=markers[ci],linestyle='-' if ai==0 else '--',alpha=.8,linewidth=1.4,markersize=5)
for i,(ax,title) in enumerate(zip(axes,['Factual correctness','Factual answers: unable to judge','Unresolved claim: unable to judge'])):
 ax.set_title(f'{chr(97+i)}  {title}',loc='left',fontsize=10);ax.set_xticks([.035,1.035],['Round 2','Round 3']);ax.set_ylim(-3,105);ax.set_yticks([0,25,50,75,100]);ax.set_ylabel('Recorded ratings (%)');ax.grid(axis='y',alpha=.18);ax.set_xlim(-.12,1.2)
handles=[plt.Line2D([0],[0],color=colors[i],linestyle='-' if i==0 else '--',label=arm_labels[i]) for i in range(2)]+[plt.Line2D([0],[0],color='#666',marker=markers[i],linestyle='',label=sc[i]) for i in range(3)]
fig.legend(handles=handles,loc='lower center',bbox_to_anchor=(.5,.09),ncol=3,frameon=False,fontsize=8);fig.subplots_adjust(left=.07,right=.99,bottom=.35,top=.88,wspace=.4);foot(fig,'Authored trajectories, not estimated feedback effects. Per scenario/arm/round: 16 factual ratings and 8 unresolved-claim ratings. No inferential intervals.');save(fig,'04-factual')
(out/'methods.md').write_text('''# Authored feedback workflow pilot

Three constructed scenarios; eight fictional identities per scenario; two cloned arms; three rounds; four claims. All text and reconsiderations were authored by the same Codex assistant. Claims and feedback were saved using the normal dev consultation APIs. Platform model generation was never invoked. OpenRouter usage for this pilot is zero.

## Provenance and analysis
The export is retrieved from saved platform responses. The analysis checks paired baseline identity, eight responses per round, identical round-two/three questions, exact submitted text and feedback hashes. CSV rows identify the scenario, live form, arm, round, participant and claim. Feedback consists of exact counts and all authored explanations; the control receives only an instruction to revisit its own material. The author cannot be blinded to the other arm; this is not an independent experiment.

The first two propositions are decidable against constructed evidence. Correctness includes all 16 factual ratings per scenario/arm/round in the denominator. Unable-to-judge ratings are reported separately. The third proposition is unresolved and has no truth score. The fourth is normative and has no truth score. No p-values, confidence intervals, causal effects or independent semantic fidelity scores are reported. The source scenarios and trajectories were intentionally authored rather than independently sampled.

## Scope
This verifies a stored product workflow and provides inspectable descriptive figures. It does not evaluate platform AI extraction, model-generated synthesis or autonomous participant reconsideration. Manual claim traceability is available but cannot establish extraction performance. It cannot support a claim of superiority, human behaviour, decision benefit or publication readiness. Existing paid results are archived separately.

## Reproduction
Run scripts/analyse-authored-feedback-pilot.py on the saved final export to regenerate all figures. Vector SVG/PDF and 600 dpi PNG are provided. Do not rerun the seeding scripts against another environment or start paid models without fresh user authorization. Review three-round integrity and source-data mappings before interpreting the figures.
''')
print(json.dumps(verification,indent=2))

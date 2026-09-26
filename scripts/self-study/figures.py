"""Plot source records. Every panel is descriptive; no invented uncertainty bars."""
import json,math
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Patch
root=Path('frontend/public/evaluation/self-study');runs=json.loads((root/'runs.json').read_text());cases=['attendance','health','release'];names=['School attendance','Community health','After release'];colors=['#277DA1','#CC7950','#587D63'];markers=['o','s','^']
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':9,'axes.spines.top':False,'axes.spines.right':False,'axes.edgecolor':'#b8b8b2','axes.labelcolor':'#333','text.color':'#242424','xtick.color':'#555','ytick.color':'#555','pdf.fonttype':42,'svg.fonttype':'none'})
def select(c,kind,variant):return next(r for r in runs if r['scenario']==c and r['kind']==kind and r['variant']==variant)
def baseline(c):return select(c,'core','n8-words500')
def decorate(ax,title,xlabel='',ylabel=''):
 ax.set_title(title,loc='left',fontsize=10,fontweight='bold',pad=13);ax.set_xlabel(xlabel);ax.set_ylabel(ylabel);ax.grid(axis='y',color='#ddd',linewidth=.5);ax.set_axisbelow(True)
def save(fig,name,note):
 fig.text(.015,.012,note,fontsize=8,color='#666',va='bottom')
 for ext in ['svg','pdf','png']:fig.savefig(root/f'{name}.{ext}',dpi=600,bbox_inches='tight')
 svg=root/f'{name}.svg';svg.write_text(svg.read_text().replace("'DejaVu Sans'","'DejaVu Sans', Arial, sans-serif"));plt.close(fig)
def legend(fig):fig.legend(handles=[plt.Line2D([0],[0],color=colors[i],marker=markers[i],label=n) for i,n in enumerate(names)],loc='lower center',bbox_to_anchor=(.5,.08),ncol=3,frameon=False,fontsize=8)
# Figure 1: stage errors, not sums of dependent errors.
fig,axs=plt.subplots(1,3,figsize=(11,4.1),gridspec_kw={'width_ratios':[1.15,1,1]})
axs[0].axis('off');axs[0].set_title('a  The evaluated path',loc='left',fontsize=10,fontweight='bold')
for y,t in zip([.82,.5,.18],['Authored paragraphs → four claims','Saved round-two ratings → feedback','Saved round-three ratings → summary']):
 axs[0].text(.5,y,t,ha='center',va='center',fontsize=8,bbox=dict(boxstyle='round,pad=.6',facecolor='#f3f3ef',edgecolor='#d3d3cd'))
for ax,key,title in [(axs[1],'omission_rate','b  Omitted claims'),(axs[2],'distortion_rate','c  Distorted retained claims')]:
 for i,c in enumerate(cases):ax.plot(np.arange(3)+(i-1)*.035,[select(c,'stage',s)['metrics'][key]*100 for s in ['extraction','feedback','final synthesis']],marker=markers[i],color=colors[i],linewidth=1,label=names[i])
 ax.set_xticks(range(3),['Extraction','Feedback','Final'],fontsize=8);ax.set_ylim(-3,100);ax.set_yticks([0,25,50,75,100]);decorate(ax,title,ylabel='Self-coded claims (%)');ax.text(.06,.7,'0 of 4 in every stage/scenario\nSelf-assessed; not blinded',transform=ax.transAxes,fontsize=8)
fig.subplots_adjust(left=.04,right=.99,bottom=.29,top=.84,wspace=.5);legend(fig);save(fig,'figure-1','One assistant method; 3 authored scenarios × 4 claims. Zero errors are self-coded, not independently validated. Stage rates are not additive.')
# Figure 2: caps are not achieved word counts; the plot explicitly shows both.
fig,axs=plt.subplots(2,2,figsize=(10,7.7))
for i,c in enumerate(cases):
 rr=[select(c,'core',f'n8-words{n}') for n in [250,500,1000]]
 axs[0,0].plot([250,500,1000],[r['metrics']['composite_distribution_distortion'] for r in rr],marker=markers[i],color=colors[i],alpha=.8)
 axs[0,1].plot([250,500,1000],[r['actual_words'] for r in rr],marker=markers[i],color=colors[i])
 rr=[select(c,'core',f'n{n}-words500') for n in [8,32,64]]
 axs[1,0].plot([8,32,64],[r['metrics']['strict_fidelity']*100 for r in rr],marker=markers[i],color=colors[i]);axs[1,1].plot([8,32,64],[r['metrics']['false_consensus_rate']*100 for r in rr],marker=markers[i],color=colors[i])
for ax in axs[0]:ax.set_xticks([250,500,1000])
for ax in axs[1]:ax.set_xticks([8,32,64])
decorate(axs[0,0],'a  Reported distribution error','Maximum summary words','Composite distribution distortion');axs[0,0].set_ylim(-.03,1);axs[0,0].text(.05,.7,'Counts are rendered exactly in code.\nThis is a numerical integrity check.',transform=axs[0,0].transAxes,fontsize=8)
decorate(axs[0,1],'b  Actual output lengths','Maximum summary words','Words, including count sentences');axs[0,1].plot([250,500,1000],[250,500,1000],ls=':',color='#aaa',label='Word limit');axs[0,1].set_ylim(0,1050)
decorate(axs[1,0],'c  Strict claim fidelity','Records in panel','Self-coded fidelity (%)');axs[1,0].set_ylim(-3,105)
decorate(axs[1,1],'d  False consensus','Records in panel','Self-coded false consensus (%)');axs[1,1].set_ylim(-3,100)
fig.subplots_adjust(left=.08,right=.98,top=.95,bottom=.2,hspace=.55,wspace=.4);legend(fig);save(fig,'figure-2','Four claims fit the shortest cap: no compression failure observed. n=32/64 tile eight records; they are not additional independent experts. No CIs.')
# Figure 3: reference vs reported, confusion and explicit probability supplement.
fig,axs=plt.subplots(2,2,figsize=(10,8));statuses=['support consensus','opposition consensus','insufficient evidence','mixed'];matrix=np.zeros((4,4),int)
def status(v):
 p=np.array(v)/sum(v)
 return statuses[0] if p[0]>=.8 else statuses[1] if p[1]>=.8 else statuses[2] if p[2]>=.5 else statuses[3]
for i,c in enumerate(cases):
 r=baseline(c)
 for a in r['audit']:
  j=a['claim']-1;reference=[sum(p['votes'][j]==o for p in r['input']['participants']) for o in ['Agree','Disagree','Unable to judge']]
  x=reference[0]/8;y=a['reported_counts'][0]/8;axs[0,0].scatter(x,y,color=colors[i],marker=markers[i],s=40,alpha=.65)
  matrix[statuses.index(status(reference)),statuses.index(a['reported_status'])]+=1
  if j<3:axs[1,0].scatter(a['mean_individual_entropy'],a['between_participant_dispersion'],color=colors[i],marker=markers[i],s=40)
axs[0,0].plot([0,1],[0,1],color='#aaa',ls=':');axs[0,0].set_xlim(-.04,1.04);axs[0,0].set_ylim(-.04,1.04);decorate(axs[0,0],'a  Support proportions','Saved reference proportion','Reported proportion')
axs[0,1].imshow(matrix,cmap='Blues',vmin=0,vmax=max(matrix.max(),1));short=['Support','Opposition','Uncertain','Mixed'];axs[0,1].set_xticks(range(4),short,fontsize=8);axs[0,1].set_yticks(range(4),short,fontsize=8)
for i in range(4):
 for j in range(4):axs[0,1].text(j,i,str(matrix[i,j]),ha='center',va='center',color='white' if matrix[i,j]>matrix.max()/2 else '#333')
decorate(axs[0,1],'b  Status confusion (12 claims)','Reported status','Reference status');axs[0,1].grid(False)
decorate(axs[1,0],'c  Uncertainty versus dispersion','Mean individual entropy (bits)','Between-person dispersion (bits)');axs[1,0].set_xlim(0,1.05);axs[1,0].set_ylim(0,1)
pp=[];yy=[]
for c in cases:
 for p in baseline(c)['input']['participants']:
  pp.extend(p['probabilities'][:2]);yy.extend([1,0])
bins=[]
for lo in np.arange(0,1,.1):
 ids=[i for i,p in enumerate(pp) if min(int(p*10),9)==round(lo*10)]
 if ids:bins.append((float(np.mean([pp[i] for i in ids])),float(np.mean([yy[i] for i in ids])),len(ids)))
assert sum(n for _,_,n in bins)==48
for bi,(x,y,n) in enumerate(bins):axs[1,1].scatter(x,y,s=n*9,color='#277DA1');axs[1,1].annotate(f'n={n}',(x,y),xytext=(0,-15 if y>.5 else 6+12*(bi%2)),textcoords='offset points',ha='center',fontsize=7)
axs[1,1].plot([0,1],[0,1],ls=':',color='#aaa');axs[1,1].set_xlim(-.03,1.03);axs[1,1].set_ylim(-.05,1.05);decorate(axs[1,1],'d  Authored probability calibration','Mean probability in fixed 0.1 bins','Fraction true in constructed world')
fig.subplots_adjust(left=.09,right=.98,top=.95,bottom=.19,hspace=.55,wspace=.4);legend(fig);save(fig,'figure-3','a/b use computed count rendering (agreement by construction). c/d use a directly authored probability supplement, not elicited human/model estimates.')
# Figure 4: easy transparent sanity check, no disguised reader test.
fig,axs=plt.subplots(1,2,figsize=(10,4.5));x=[1,4,8]
for i,condition in enumerate(['supported','unsupported']):
 vals=[]
 for k in x:
  rr=[r for r in runs if r['kind']=='minority' and r['variant']==condition and r['assigned_count']==k];vals.append(100*np.mean([r['audit'][0]['retained_with_correct_status'] for r in rr]))
 axs[0].plot(x,vals,color=colors[i],marker=['o','s'][i],label=condition.title(),linestyle=['-','--'][i])
axs[0].set_xticks(x,['1 / 32\n3.1%','4 / 32\n12.5%','8 / 32\n25%']);axs[0].set_ylim(-3,105);decorate(axs[0],'a  Warning retained with its status','Participants mentioning the warning','Self-coded fidelity (%)');axs[0].legend(frameon=False,fontsize=8);axs[0].text(.03,.5,'Absent warning: fidelity not applicable.\nMention frequency is not agreement.',transform=axs[0].transAxes,fontsize=8)
for i,condition in enumerate(['supported','unsupported','absent']):
 rr=[r for r in runs if r['kind']=='minority' and r['variant']==condition];axs[1].scatter(np.full(len(rr),i)+np.linspace(-.1,.1,len(rr)),[r['decision']['regret'] for r in rr],color=colors[i],s=22,alpha=.7)
axs[1].set_xticks(range(3),['Supported','Unsupported','Absent']);axs[1].set_ylim(-3,105);decorate(axs[1],'b  Constructed decision regret','Warning condition','Excess loss (benchmark units)');axs[1].text(.04,.7,'All decisions follow the explicit loss table.\nThis is an unblinded sanity check,\nnot an independent reader experiment.',transform=axs[1].transAxes,fontsize=8)
fig.subplots_adjust(left=.08,right=.98,top=.9,bottom=.23,wspace=.4);save(fig,'figure-4','Three policy framings of the same loss rule; 32 records each. Absent-warning cases have zero mentions regardless of assigned slot. No empirical welfare claim.')
# Figure 5: distinguish response checks from missing-input controls.
fig,axs=plt.subplots(2,2,figsize=(11,8.3));pert=json.loads((root/'design.json').read_text())['perturbations'];abl=json.loads((root/'design.json').read_text())['ablations']
for i,c in enumerate(cases):
 deltas=[100*(select(c,'perturbation',p)['metrics']['strict_fidelity']-baseline(c)['metrics']['strict_fidelity']) for p in pert];axs[0,0].scatter(deltas,np.arange(len(pert))+(i-1)*.12,marker=markers[i],color=colors[i],s=25)
axs[0,0].axvline(0,color='#aaa',ls=':');axs[0,0].set_yticks(range(len(pert)),pert,fontsize=8);axs[0,0].invert_yaxis();axs[0,0].set_xlim(-100,10);decorate(axs[0,0],'a  Reviewed input changes','Change in self-coded fidelity (pp)')
mat=[]
for a in abl:
 rr=[select(c,'ablation',a) for c in cases];mat.append([np.mean([r['metrics'][k] for r in rr]) for k in ['strict_fidelity','probability_coverage','provenance_coverage']])
axs[0,1].imshow(mat,cmap='Blues',vmin=0,vmax=1,aspect='auto');axs[0,1].set_yticks(range(4),['No qualification','No probabilities','No provenance','No reconsideration'],fontsize=8);axs[0,1].set_xticks(range(3),['Claim fidelity','Probability\navailable','Provenance\navailable'],fontsize=8)
for i in range(4):
 for j in range(3):axs[0,1].text(j,i,f'{mat[i][j]*100:.0f}%',ha='center',va='center',color='white' if mat[i][j]>.5 else '#333')
decorate(axs[0,1],'b  Information-deletion controls');axs[0,1].grid(False)
for i,c in enumerate(cases):axs[1,0].scatter(0,baseline(c)['metrics']['strict_fidelity']*100,color=colors[i],marker=markers[i],s=60,alpha=.6)
axs[1,0].set_xlim(-.01,.1);axs[1,0].set_ylim(-3,105);decorate(axs[1,0],'c  Recorded provider cost','OpenRouter cost (USD)','Self-coded fidelity (%)');axs[1,0].text(.1,.35,'All points: $0 OpenRouter.\nCodex account cost and latency\nwere not measured.',transform=axs[1,0].transAxes,fontsize=8)
axs[1,1].axis('off');axs[1,1].set_title('d  Replication and scope',loc='left',fontsize=10,fontweight='bold');axs[1,1].text(0,.85,'One assistant conversation.\nNo independent model-family replication.\nNo provider-model comparison.\n\nEquivalent inputs reuse reviewed text;\ncounts are calculated, not predicted.\nThese are consistency and availability checks,\nnot model-robustness effect estimates.',va='top',fontsize=10,linespacing=1.8)
fig.subplots_adjust(left=.2,right=.98,top=.94,bottom=.18,hspace=.7,wspace=.75);legend(fig);save(fig,'figure-5','Self-review and deterministic rendering; no new provider calls. Ablations delete information, not deployed Symphonia code. No model-family effects claimed.')
print('Five multi-panel figures exported as SVG, PDF and 600 dpi PNG.')

"""Publish measured figures, coverage, provenance and a browsable synthetic report."""
import argparse,collections,gzip,json,math,shutil,statistics,time
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from .scoring import mean,holm,paired_map_bootstrap
COLORS={'direct':'#7795ac','structured':'#487f78','staged':'#b18c4b','symphonia':'#6957a8','reference_fed':'#536d48'}
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False,'axes.titleweight':'bold','figure.facecolor':'white','axes.labelcolor':'#343b46','text.color':'#222d3c','svg.fonttype':'none'})

def load(root,folder):return [json.loads(p.read_text()) for p in sorted((root/folder).glob('*.json'))] if (root/folder).exists() else []

def finite(values):return [x for x in values if x is not None and math.isfinite(x)]

def clustered(records,metric):
    per=collections.defaultdict(list)
    for r in records:
        value=r['scores']['surfaces']['narrative']['metrics'].get(metric)
        if value is not None:per[r['map_id']].append(value)
    return mean(mean(v) for v in per.values())

def save(fig,out,name):
    fig.tight_layout(pad=2);fig.savefig(out/(name+'.svg'),bbox_inches='tight');fig.savefig(out/(name+'.png'),dpi=160,bbox_inches='tight');plt.close(fig)

def figure_calibration(data,out):
    fig,axes=plt.subplots(1,2,figsize=(11,4));names=[m['model'].split('/')[1] for m in data['models']]
    for ax,key,title,threshold in zip(axes,['sensitivity','false_positive_rate'],['Known error detection','False positives on faithful edits'],[.9,.05]):
        values=[m[key] for m in data['models']];ax.barh(names,values,color=['#487f78' if m['accepted'] else '#a56545' for m in data['models']]);[ax.text(max(.015,v-.02),i,f'{v:.0%}',va='center',ha='right' if v>.2 else 'left',color='white' if v>.2 else '#343b46',fontsize=10) for i,v in enumerate(values)];ax.axvline(threshold,color='#9e3434',ls='--',label=f'Acceptance boundary {threshold:.0%}');ax.set(xlim=(0,1),title=title,xlabel='Fraction of 100 cases');ax.legend(fontsize=8,loc='lower right')
    save(fig,out,'evaluator-validation')

def figures(records,out):
    completed=[r for r in records if r['status']=='complete'];phase='main' if any(r['phase']=='main' for r in completed) else 'pilot';rows=[r for r in completed if r['phase']==phase]
    if not rows:return []
    produced=[]
    workflow=[r for r in rows if r['track']=='full_workflow' and r['variant']=='baseline']
    if workflow:
        fig,axes=plt.subplots(1,2,figsize=(12,4))
        for method,color in COLORS.items():
            rs=[r for r in workflow if r['method']==method]
            if not rs:continue
            for ax,metric in zip(axes,['omission_rate','meaning_error_rate']):
                values=[]
                for stage in ('extraction','feedback','final'):
                    per=collections.defaultdict(list)
                    for r in rs:
                        scores=r['scores'] if stage=='final' else r['stage_scores'].get(stage)
                        if scores:per[r['map_id']].append(scores['surfaces']['narrative']['metrics'][metric])
                    values.append(mean(mean(v) for v in per.values()))
                ax.plot(['Extraction','Feedback','Final'],values,'o-',label=method,color=color)
                ax.set(ylabel=metric.replace('_',' '),ylim=(-.03,1.03));ax.grid(axis='y',alpha=.15)
        axes[0].set_title('Information loss by first observed stage');axes[1].set_title('Meaning and qualification distortion');axes[1].legend(fontsize=8)
        fig.suptitle(phase.title()+' · independent input → claims → fixed ratings → feedback → reconsideration → synthesis',fontsize=10)
        save(fig,out,'figure-1');produced.append('figure-1')
    rs=[r for r in rows if r['track']=='identical_transcript' and r['variant']=='baseline']
    if rs:
        fig,axes=plt.subplots(1,3,figsize=(14,4))
        for method,color in COLORS.items():
            for ax,field,metric in zip(axes,['words','panel_size','panel_size'],['composite_distortion','critical_claim_strict_fidelity','false_consensus_rate']):
                groups=collections.defaultdict(list)
                for r in rs:
                    if r['method']==method and (r['panel_size']==32 if field=='words' else r['words']==500):groups[r[field]].append(r)
                xs=sorted(groups);ys=[clustered(groups[x],metric) for x in xs]
                if xs:ax.plot(xs,ys,'o-',label=method,color=color)
                ax.set(xlabel='Narrative word limit' if field=='words' else 'Participants',ylabel=metric.replace('_',' '),ylim=(-.03,1.03));ax.grid(alpha=.15)
        axes[0].set_title('Compression');axes[1].set_title('Consequential claim fidelity');axes[2].set_title('False consensus');axes[2].legend(fontsize=8)
        save(fig,out,'figure-2');produced.append('figure-2')
        fig,axes=plt.subplots(1,3,figsize=(14,4));confusion=np.zeros((3,4),dtype=int);xs=[];ys=[];hs=[];ds=[]
        for r in rs:
            if r['method']!='symphonia' or r['repeat']!=0 or r['words']!=500 or r['panel_size']!=32:continue
            for c in r['scores']['surfaces']['narrative']['claims']:
                a=c['actual_counts'];b=c['reported_counts']
                if sum(a) and b and sum(b):xs.append(a[0]/sum(a));ys.append(b[0]/sum(b))
                labels=[None,'support','oppose'];ai=labels.index(c['reference_direction']);bi=3 if not c['present'] else labels.index(c['direction']);confusion[ai,bi]+=1
            for c in r['reference']:
                if c['uncertainty']['individual_entropy'] is not None:hs.append(c['uncertainty']['individual_entropy']);ds.append(c['uncertainty']['between_participant_dispersion'])
        axes[0].scatter(xs,ys,s=15,alpha=.45,color=COLORS['symphonia']);axes[0].plot([0,1],[0,1],color='#888',ls='--');axes[0].set(xlabel='Reference support fraction',ylabel='Narrative reported support',title=f'Numeric reporting ({len(xs)} assessable claims)')
        axes[1].imshow(confusion,cmap='Blues');axes[1].set(xticks=range(4),xticklabels=['Neither','Support','Oppose','Omitted'],yticks=range(3),yticklabels=['Neither','Support','Oppose'],xlabel='Narrative',ylabel='Reference',title='Claim status confusion')
        for i in range(3):
            for j in range(4):axes[1].text(j,i,str(confusion[i,j]),ha='center',va='center',fontsize=9)
        axes[2].scatter(hs,ds,s=15,alpha=.4,color=COLORS['symphonia']);axes[2].set(xlabel='Mean individual entropy (bits)',ylabel='Between-person dispersion (bits)',title='Uncertainty versus disagreement')
        save(fig,out,'figure-3');produced.append('figure-3')
    minority=[r for r in rows if r['variant'].startswith('minority_')]
    if minority:
        fig,axes=plt.subplots(1,2,figsize=(11,4))
        variants=['minority_one','minority_eighth','minority_quarter']
        for method,color in COLORS.items():
            groups=[[r for r in minority if r['method']==method and r['variant']==v] for v in variants]
            if not any(groups):continue
            axes[0].plot(range(3),[clustered(g,'critical_claim_strict_fidelity') if g else None for g in groups],'o-',label=method,color=color)
            vals=[mean(d['regret'] for r in g for d in r['decisions']) for g in groups]
            axes[1].plot(range(3),vals,'o-',label=method,color=color)
        for ax in axes:ax.set_xticks(range(3),['1 participant','12.5%','25%']);ax.legend(fontsize=8)
        axes[0].set(title='Consequential minority fidelity',ylabel='Strict narrative fidelity',ylim=(-.03,1.03));axes[1].set(title='Decision consequences',ylabel='Regret (constructed loss units)')
        save(fig,out,'figure-4');produced.append('figure-4')
    robust=[r for r in rows if r['variant'] not in ('baseline','replication')]
    if robust:
        fig,axes=plt.subplots(1,2,figsize=(13,5));variants=sorted({r['variant'] for r in robust})
        for method,color in COLORS.items():
            vals=[]
            for v in variants:
                per=[]
                for r in robust:
                    if r['method']!=method or r['variant']!=v:continue
                    baseline=[b for b in rs if b['map_id']==r['map_id'] and b['method']==method and b['panel_size']==32 and b['words']==500]
                    if baseline:per.append(r['scores']['surfaces']['narrative']['metrics']['critical_claim_strict_fidelity']-clustered(baseline,'critical_claim_strict_fidelity'))
                vals.append(mean(per))
            if any(v is not None for v in vals):axes[0].plot(vals,range(len(variants)),'o',color=color,label=method)
        axes[0].set(yticks=range(len(variants)),yticklabels=[v.replace('_',' ') for v in variants],xlabel='Change in fidelity',title='Paired perturbation effects');axes[0].axvline(0,color='#aaa',ls='--');axes[0].legend(fontsize=8)
        reps=[r for r in rows if r['variant']=='replication']
        for i,model in enumerate(sorted({r['model'] for r in rows})):
            v=[r for r in (rs+reps) if r['model']==model]
            for j,m in enumerate(('structured','symphonia')):
                g=[r for r in v if r['method']==m];value=clustered(g,'critical_claim_strict_fidelity') if g else None
                if value is not None:axes[1].bar(i+(j-.5)*.3,value,width=.3,color=COLORS[m],label=m if i==0 else None)
        axes[1].set(xticks=range(len({r['model'] for r in rows})),xticklabels=[m.split('/')[1] for m in sorted({r['model'] for r in rows})],ylabel='Critical narrative fidelity',title='Summariser family replication');axes[1].legend(fontsize=8)
        save(fig,out,'figure-5');produced.append('figure-5')
    return produced

def analyses(records):
    phase='main' if any(r['phase']=='main' for r in records) else 'pilot'
    core=[r for r in records if r['phase']==phase and r['track']=='identical_transcript' and r['variant']=='baseline' and r['panel_size']==32 and r['words']==500]
    summary={};pvals=[];keys=[]
    for metric in ('critical_claim_strict_fidelity','false_consensus_rate'):
        rows=[{'map_id':r['map_id'],'policy_setting':r['policy_setting'],'method':r['method'],'value':r['scores']['surfaces']['narrative']['metrics'][metric]} for r in core if r['status']=='complete']
        rows=[r for r in rows if r['value'] is not None]
        try:
            result=paired_map_bootstrap(rows,'symphonia','structured','value')
            arms=collections.defaultdict(lambda:collections.defaultdict(list))
            for r in rows:arms[r['map_id']][r['method']].append(r['value'])
            delta=np.array([mean(a['symphonia'])-mean(a['structured']) for a in arms.values() if a.get('symphonia') and a.get('structured')])
            rng=np.random.default_rng(260926);stats=np.abs((rng.choice([-1,1],size=(20000,len(delta)))*delta).mean(axis=1))
            p=(1+np.sum(stats>=abs(delta.mean())-1e-12))/20001
            result['p_raw']=float(p);result['phase']=phase;pvals.append(p);keys.append(metric);summary[metric]=result
        except ValueError as exc:summary[metric]={'unavailable':str(exc)}
    for key,p in zip(keys,holm(pvals)):summary[key]['p_holm']=p
    conservative=[]
    for r in core:
        if r['method'] in ('symphonia','structured'):
            value=r['scores']['surfaces']['narrative']['metrics']['critical_claim_strict_fidelity'] if r['status']=='complete' else 0
            conservative.append({'map_id':r['map_id'],'policy_setting':r['policy_setting'],'method':r['method'],'value':value})
    try:summary['conservative_failed_fidelity']=paired_map_bootstrap(conservative,'symphonia','structured','value')
    except ValueError as exc:summary['conservative_failed_fidelity']={'unavailable':str(exc)}
    return summary

def build(root,out):
    root=Path(root);out=Path(out);out.mkdir(parents=True,exist_ok=True)
    records=load(root,'results');calls=load(root,'calls');worlds=load(root,'reference');panels=load(root,'participants');interactions=load(root,'interactive')
    calibration=json.loads((root/'calibration/results.json').read_text()) if (root/'calibration/results.json').exists() else None
    state=json.loads((root/'status.json').read_text()) if (root/'status.json').exists() else {'stage':'pilot_preparation','updated_at':time.time()}
    costs=sum(c.get('cost_usd',0) or 0 for c in calls)
    data={'title':'Symphonia synthetic evaluation','updated_at':time.time(),'status':state,'synthetic':True,'cost_usd':costs,'model_calls':len(calls),'failed_model_calls':sum(c['status']=='failed' for c in calls),
          'worlds_generated':len(worlds),'validated_panels':sum(p['validated'] for p in panels),'completed_runs':sum(r['status']=='complete' for r in records),'failed_runs':sum(r['status']=='failed' for r in records),
          'scheduled_runs':len(records),'interactive_panels':len(interactions),'calibration':{**calibration,'models':[{k:v for k,v in m.items() if k!='labels'} for m in calibration['models']]} if calibration else None,
          'figures':figures(records,out),'analyses':analyses(records),'scenarios':[{'id':w['map_id'],'setting':w['policy_setting'],'question':w['policy_question'],'claims':len(w['claims']),'phase':w['phase']} for w in worlds],
          'runs':[{k:r.get(k) for k in ('run_id','map_id','policy_setting','phase','method','model','panel_size','words','repeat','track','variant','status','error')} | {'metrics':r.get('scores',{}).get('surfaces',{}).get('narrative',{}).get('metrics',{})} for r in records],
          'limitations':['All participants and worlds are synthetic; this does not establish human expert behaviour.',
                        'The implemented custom product path caps native synthesis at 12 claims and 2,500 output tokens; a common export adapter is scored separately from native intermediate output.',
                        'Claim correction is not a separately switchable component in the current fixed three-round product. No claim-correction ablation is claimed.',
                        'Generated maps are structurally checked; accepted participant panels additionally require two-model semantic validation.',
                        'Unfinished experiments have no result. Failed and rejected attempts remain in the downloadable record.'],
          'coverage':[{'name':name,'status':status} for name,status in [('Evaluator validation','passed' if calibration and calibration['accepted'] else 'not yet passed'),('12 validated pilot scenarios','complete' if len({p['map_id'] for p in panels if p['validated']})>=12 else 'in progress'),('Experiment A','complete' if state['stage']=='experiments_finished_analysis_pending' else 'in progress' if records else 'not run'),('Experiment B','run' if interactions else 'not run'),('Main study','started' if any(w['phase']=='main' for w in worlds) else 'not frozen'),('Robustness','run' if any(r['variant']!='baseline' for r in records) else 'not run'),('Component ablations','not run'),('Matched decision conditions','not run'),('Processing-budget comparison','not run'),('Larger-claim stress test','not run')]]}
    if calibration:figure_calibration(calibration,out)
    (out/'data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2,allow_nan=False)+'\n')
    # Complete synthetic evidence; request logs exclude HTTP authentication headers.
    with gzip.open(out/'experiment-record.jsonl.gz','wt') as f:
        for group,items in [('model_call',calls),('reference',worlds),('participant_panel',panels),('experiment_A',records),('experiment_B',interactions)]:
            for item in items:f.write(json.dumps({'record_type':group,'data':item},ensure_ascii=False)+'\n')
    if calibration:(out/'evaluator-validation.json').write_text(json.dumps(calibration,indent=2)+'\n')
    return data

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--out',required=True);a=p.parse_args();d=build(a.root,a.out);print(json.dumps({k:d[k] for k in ('completed_runs','failed_runs','model_calls','cost_usd')}))

"""Secondary semantic relation diagnostic, independent of primary fidelity."""
from .schemas import obj,array,STRING
SCHEMA=obj({'relations':array(obj({'from_id':STRING,'to_id':STRING,'relation':{'type':'string','enum':['contradiction','qualification','different_scope']},'reason':STRING}))})
PROMPT='Identify only explicit semantic links among the supplied propositions. Contradiction requires incompatible propositions with the SAME population, conditions and timeframe; different populations or times are different_scope. Qualification means one explicitly limits the applicability of another. Return JSON {relations:[{from_id,to_id,relation,reason}]}, at most 20 distinct links and at most 20 words per reason. Do not assume agreement means shared evidence. No stylistic links.'

def relations(client,run_id,reference,output,judges):
    source=[{'id':r['id'],'text':r['text']} for r in reference]
    audit=output.get('audit',[])
    def one(model):
        try:
            # Reference edges are computed without viewing the tested output.
            gold=client.call(run_id+'/relations/reference/'+model,model,PROMPT,{'claims':source},max_tokens=2200,schema=SCHEMA)
            reported=client.call(run_id+'/relations/output/'+model,model,PROMPT+' The proposition IDs are alignment anchors only. Count a link as reported only when the narrative or audit actually communicates it. Mere presence of two claims is not a communicated relationship.',{'alignment_anchors':source,'narrative':output.get('narrative',''),'audit':audit},max_tokens=2200,schema=SCHEMA)
            def edges(value):return {tuple(sorted([r['from_id'],r['to_id']]))+(r['relation'],) for r in value['relations'] if r['from_id']!=r['to_id'] and {r['from_id'],r['to_id']}<=set(x['id'] for x in source)}
            return {'model':model,'status':'complete','reference':gold,'reported':reported,'expected_edges':sorted(edges(gold)),'reported_edges':sorted(edges(reported))}
        except Exception as exc:return {'model':model,'status':'failed','error':str(exc)[:300]}
    labels=client.parallel(one,judges);valid=[l for l in labels if l['status']=='complete']
    if len(valid)!=3:return {'status':'incomplete','evaluators':labels}
    def consensus(key):
        all_edges={tuple(edge) for label in valid for edge in label[key]}
        return {edge for edge in all_edges if sum(list(edge) in label[key] or edge in label[key] for label in valid)>=2}
    expected=consensus('expected_edges');reported=consensus('reported_edges')
    return {'status':'complete','evaluators':labels,'expected':sorted(expected),'reported':sorted(reported),'recall':len(expected&reported)/len(expected) if expected else None,'precision':len(expected&reported)/len(reported) if reported else None}

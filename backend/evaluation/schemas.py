"""Transport schemas prevent formatting failures without changing model judgments."""
def obj(properties):return {'type':'object','properties':properties,'required':list(properties),'additionalProperties':False}
def array(items):return {'type':'array','items':items}
STRING={'type':'string'}
OPENING=obj({'opening':STRING,'expressed_claim_ids':array(STRING)})
ANSWER=obj({'claim_id':STRING,'stance':{'type':'string','enum':['support','oppose','insufficient_evidence']},'confidence':{'type':'number'},'reason':STRING,'source_ids':array(STRING),'probability':{'type':['number','null']}})
JUDGMENTS=obj({'round2':array(ANSWER),'round3':array(ANSWER)})
VALIDATION=obj({'participants':array(obj({'participant_id':STRING,'valid':{'type':['boolean','null']},'expressed_claim_ids':array(STRING),'invented_evidence':array(STRING),'assignment_errors':array(STRING),'ambiguous_fields':array(STRING)}))})
NULL_NUMBER={'type':['number','null']}
COUNTS={'type':['array','null'],'items':{'type':'number'}}
SURFACE=obj({**{k:{'type':['boolean','null']} for k in ('present','meaning_correct','conditions_correct','panel_status_correct','evidential_status_correct')},'span':STRING,'counts':COUNTS,'direction':{'anyOf':[{'type':'string','enum':['support','oppose']},{'type':'null'}]},'unanimous':{'type':'boolean'},'uncertainty_label':{'type':'string','enum':['uncertainty','disagreement','both','neither']}})
SCORES=obj({'claims':array(obj({'id':STRING,'narrative':SURFACE,'audit':SURFACE})),'unsupported_assertions':array(obj({'surface':STRING,'text':STRING,'reason':STRING}))})
AUDIT=obj({'text':STRING,'counts':COUNTS,'conditions':STRING,'evidential_status':STRING,'source_ids':array(STRING),'mean_probability':NULL_NUMBER,'mean_individual_entropy':NULL_NUMBER,'between_participant_dispersion':NULL_NUMBER})
SUMMARY=obj({'narrative':STRING,'audit':array(AUDIT)})
ALIGNMENT=obj({'alignments':array(obj({'display_id':STRING,'reference_ids':array(STRING),'relation':{'type':'string','enum':['exact','split','merge','changed','new']},'reason':STRING}))})
DECISION=obj({'action':{'type':'string','enum':['universal_rollout','targeted_rollout','defer']},'justification':STRING,'decoded_facts':obj({k:{'type':['boolean','null']} for k in ('reliable_subgroup_harm','benefit_supported','warning_only_unsupported')})})
def scoring_schema(ids):
    schema=obj({'claims':obj({cid:obj({'narrative':{'$ref':'#/$defs/surface'},'audit':{'$ref':'#/$defs/surface'}}) for cid in ids}),'unsupported_assertions':array(obj({'surface':STRING,'text':STRING,'reason':STRING}))})
    wire_surface=obj({**{k:{'type':'string','enum':['yes','no','unclear']} for k in ('present','meaning_correct','conditions_correct','panel_status_correct','evidential_status_correct')},'span':STRING,'counts':array({'type':'number'}),'direction':{'type':'string','enum':['support','oppose','none']},'unanimous':{'type':'boolean'},'uncertainty_label':{'type':'string','enum':['uncertainty','disagreement','both','neither']}})
    schema['$defs']={'surface':wire_surface}
    return schema

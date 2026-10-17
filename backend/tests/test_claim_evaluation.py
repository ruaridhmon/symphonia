import copy
import unittest
from core.claim_evaluation import validate_reference, validate_audit, prompt


class ClaimEvaluationTests(unittest.TestCase):
    def setUp(self):
        self.sources = [{'response_id':'1','text':'Support this only if staffing is maintained.'}]
        self.ref = {'units':[{'id':'U1','text':'Support conditional on staffing','stance':'support','sources':[{'response_id':'1','quote':'only if staffing is maintained'}],'uncertainty':False,'conditional':True}], 'contrasts':[]}

    def test_exact_sources_required(self):
        validate_reference(self.ref,self.sources)
        bad=copy.deepcopy(self.ref);bad['units'][0]['sources'][0]['quote']='invented'
        with self.assertRaises(ValueError):validate_reference(bad,self.sources)

    def test_duplicate_respondents_do_not_inflate_prevalence(self):
        bad=copy.deepcopy(self.ref);bad['units'][0]['sources']*=2
        with self.assertRaises(ValueError):validate_reference(bad,self.sources)

    def test_missing_or_invented_audit_ids_rejected(self):
        claims=[{'id':'C1','text':'Support'}]
        audit={'units':[{'id':'U1','status':'partial','output_ids':['C1']}],'contrasts':[], 'output_atoms':[{'id':'O1','parent_claim_id':'C1','status':'altered'}]}
        validate_audit(audit,self.ref,claims)
        bad=copy.deepcopy(audit);bad['units']=[]
        with self.assertRaises(ValueError):validate_audit(bad,self.ref,claims)
        bad=copy.deepcopy(audit);bad['units'][0]['output_ids']=['fake']
        with self.assertRaises(ValueError):validate_audit(bad,self.ref,claims)

    def test_no_output_leakage_to_reference(self):
        messages=prompt('reference',self.sources,'Question',claims=[{'id':'SECRET_CANDIDATE'}])
        self.assertNotIn('SECRET_CANDIDATE',str(messages))

    def test_unknown_task_rejected(self):
        with self.assertRaises(ValueError):prompt('arbitrary',self.sources,'Q')

    def test_source_flags_must_be_booleans(self):
        bad=copy.deepcopy(self.ref);bad['units'][0]['conditional']='true'
        with self.assertRaises(ValueError):validate_reference(bad,self.sources)


if __name__=='__main__':unittest.main()

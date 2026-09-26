import copy,unittest
from .scoring import panel_status,uncertainty,js_divergence,paired_map_bootstrap
from .calibration import cases
from .methods import replay,clean_reference
from .reference import packet

class ProtocolTests(unittest.TestCase):
    def test_known_corruptions_are_real_and_preserving_pairs_are_distinct(self):
        material=cases()
        self.assertEqual(len(material),200)
        self.assertEqual(len({c['id'] for c in material}),200)
        for c in material:
            self.assertNotEqual(c['candidate'],c['reference'])
            if c['corrupted'] and c['expected_type']=='source':
                self.assertEqual(c['expected_claim'],'C1')
                self.assertIn(' and S',c['candidate'].split('C2:')[0])

    def test_gold_fields_never_reach_reference_fed_method(self):
        rows=clean_reference([{'id':'C1','truth':1,'critical':True,'uncertainty':{'brier':.2,'mean_probability':.4}}])
        self.assertNotIn('truth',rows[0]);self.assertNotIn('critical',rows[0]);self.assertNotIn('brier',rows[0]['uncertainty'])

    def test_changed_claim_never_receives_reference_ballot(self):
        p={'people':[{'participant_id':'P1','realised':{'round2':[{'claim_id':'C1','stance':'support','confidence':95,'reason':'source','source_ids':['S1'],'probability':.9}]}}]}
        rows=replay(p,[{'id':'D1','text':'Changed condition'},{'id':'D2','text':'Actual proposition'}],{'D2':'C1'},2)
        self.assertIsNone(rows[0]['answers'][0]['stance'])
        self.assertEqual(rows[0]['answers'][0]['reason'],'cannot evaluate as stated')
        self.assertEqual(rows[0]['answers'][1]['stance'],'support')

    def test_consequential_source_cannot_leak_through_other_claim(self):
        w={'map_id':'test','policy_question':'Q','sources':[{'id':'S1','text':'private warning','quality':'reliable'}],
           'claims':[{'id':f'C{i}','text':'claim','type':'factual','truth':1,'conditions':'c','features':['consequential_minority'] if i==1 else ['supported'],'source_ids':['S1'],'evidential_status':'supported'} for i in range(1,16)]}
        packets=[packet(w,8,i) for i in range(8)]
        informed=[p for p in packets if any(c['id']=='C1' and c['round2_stance']=='support' for c in p['assigned'])]
        self.assertEqual(len(informed),1)
        for p in packets:
            if p not in informed:self.assertEqual(p['private_evidence'],[])

    def test_uncertainty_not_confidence_or_disagreement(self):
        a,b=uncertainty([.5,.5]),uncertainty([0,1])
        self.assertEqual(a['mean_probability'],b['mean_probability'])
        self.assertEqual(a['individual_entropy'],1);self.assertEqual(b['between_participant_dispersion'],1)
        self.assertEqual(js_divergence([1,0,0],[0,1,0]),1)
        self.assertIsNone(panel_status([7,0,0],10)['direction'])

if __name__=='__main__':unittest.main()

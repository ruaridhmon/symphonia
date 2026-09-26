import unittest
from scoring import (panel_status, js_divergence, distortion, uncertainty,
                     fidelity_bounds, regret, holm, paired_map_bootstrap)


class ProtocolScores(unittest.TestCase):
    def test_consensus_uses_uncertain_and_requires_coverage(self):
        self.assertEqual(panel_status([8, 0, 2], 10)['direction'], 'support')
        self.assertIsNone(panel_status([7, 0, 3], 10)['direction'])
        self.assertIsNone(panel_status([7, 0, 0], 10)['direction'])
        result = panel_status([2, 2, 4], 8)
        self.assertTrue(result['insufficient_evidence'])
        self.assertTrue(result['substantive_disagreement'])

    def test_js_is_divergence_and_missing_is_not_zero(self):
        self.assertEqual(js_divergence([1, 0, 0], [0, 1, 0]), 1)
        self.assertEqual(js_divergence([1, 1, 0], [2, 2, 0]), 0)
        result = distortion([{'present': False, 'actual': [1, 0, 0], 'reported': None}])
        self.assertIsNone(result['js_divergence'])
        self.assertEqual(result['composite_distortion'], 1)

    def test_uncertainty_and_polarisation_are_distinct(self):
        uncertain, polarised = uncertainty([0.5, 0.5]), uncertainty([0, 1])
        self.assertEqual(uncertain['mean_probability'], polarised['mean_probability'])
        self.assertEqual(uncertain['individual_entropy'], 1)
        self.assertEqual(polarised['individual_entropy'], 0)
        self.assertEqual(polarised['between_participant_dispersion'], 1)
        self.assertIsNone(uncertain['brier'])
        self.assertEqual(uncertainty([0, 1], truth=1)['brier'], 0.5)

    def test_disputed_labels_do_not_get_forced_agreement(self):
        labels = dict(present=True, meaning_correct=True, conditions_correct=None,
                      panel_status_correct=True, evidential_status_correct=True)
        self.assertEqual(fidelity_bounds(labels), {'lower': 0, 'upper': 1, 'disputed': True})
        labels['present'] = False
        self.assertEqual(fidelity_bounds(labels)['upper'], 0)

    def test_losses_and_multiple_testing(self):
        self.assertEqual(regret('universal', {'universal':100,'targeted':10,'defer':30}), 90)
        self.assertEqual(holm([0.04, 0.01]), [0.04, 0.02])

    def test_bootstrap_averages_repeats_before_equal_map_weight(self):
        rows = []
        for map_id, repeats, value in [('a', 10, 1), ('b', 1, 0)]:
            for method in ('symphonia', 'structured'):
                for _ in range(repeats):
                    rows.append(dict(map_id=map_id, policy_setting='school', method=method,
                                     score=value if method=='symphonia' else 0))
        result = paired_map_bootstrap(rows, 'symphonia', 'structured', 'score')
        self.assertEqual(result['effect'], 0.5)
        self.assertEqual(result['maps'], 2)
        with self.assertRaises(ValueError):
            paired_map_bootstrap(rows[:-1], 'symphonia', 'structured', 'score')


if __name__ == '__main__':
    unittest.main()

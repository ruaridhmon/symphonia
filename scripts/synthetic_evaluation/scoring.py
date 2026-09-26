"""Deterministic protocol scores. Semantic labels must come from blinded judges.

No model calls, fabricated observations, or conversion of confidence to probability.
Undefined metrics return None, rather than a misleading zero.
"""
import math
import random
import statistics
from collections import defaultdict


def mean(values):
    values = list(values)
    return statistics.fmean(values) if values else None


def distribution(counts):
    if len(counts) != 3 or any(not math.isfinite(x) or x < 0 for x in counts):
        raise ValueError('Expected nonnegative support, oppose, insufficient counts')
    total = sum(counts)
    return [x / total for x in counts] if total else None


def panel_status(counts, panel_size, threshold=0.8, coverage=0.8):
    p = distribution(counts)
    if panel_size <= 0 or sum(counts) > panel_size or any(int(x) != x for x in counts):
        raise ValueError('Counts must be integer responses within the panel size')
    if not 0.5 < threshold <= 1 or not 0 <= coverage <= 1:
        raise ValueError('Invalid threshold')
    n = sum(counts)
    eligible = n / panel_size >= coverage
    return {
        'valid': n, 'missing': panel_size - n, 'coverage': n / panel_size,
        'direction': ('support' if p[0] >= threshold else
                      'oppose' if p[1] >= threshold else None) if p and eligible else None,
        'insufficient_evidence': bool(p and p[2] >= 0.5),
        'substantive_disagreement': bool(p and p[0] >= 0.25 and p[1] >= 0.25),
    }


def js_divergence(actual, reported):
    p, q = distribution(actual), distribution(reported)
    if p is None or q is None:
        return None
    midpoint = [(a + b) / 2 for a, b in zip(p, q)]
    def kl(a):
        return sum(x * math.log2(x / m) for x, m in zip(a, midpoint) if x)
    return (kl(p) + kl(q)) / 2


def distortion(claims, penalty=1.0):
    """Each row: present, actual counts, reported counts or None.

    Narrative and audit rows must be scored in separate calls.
    """
    if not 0 <= penalty <= 1:
        raise ValueError('Invalid missingness penalty')
    values = []
    composite = []
    for c in claims:
        value = (js_divergence(c['actual'], c['reported'])
                 if c['present'] and c.get('reported') is not None else None)
        if value is not None:
            values.append(value)
        composite.append(penalty if value is None else value)
    return {'js_divergence': mean(values),
            'assessable_fraction': len(values) / len(composite) if composite else None,
            'composite_distortion': mean(composite), 'missingness_penalty': penalty}


FIDELITY_FIELDS = ('present', 'meaning_correct', 'conditions_correct',
                   'panel_status_correct', 'evidential_status_correct')


def fidelity_bounds(labels):
    """Use None for disputed semantic fields; report conservative bounds."""
    if any(k not in labels for k in FIDELITY_FIELDS):
        raise ValueError('All five fidelity labels are required')
    values = [labels[k] for k in FIDELITY_FIELDS]
    if any(v is not None and type(v) is not bool for v in values):
        raise ValueError('Labels must be bool or None')
    return {'lower': int(all(v is True for v in values)),
            'upper': int(all(v is not False for v in values)),
            'disputed': any(v is None for v in values)}


def entropy(p):
    if not math.isfinite(p) or not 0 <= p <= 1:
        raise ValueError('Probability must be in [0,1]')
    return -sum(x * math.log2(x) for x in (p, 1-p) if x)


def uncertainty(probabilities, truth=None):
    probabilities = list(probabilities)
    if truth is not None and truth not in (0, 1):
        raise ValueError('Only defined binary empirical truth is scoreable')
    entropies = [entropy(p) for p in probabilities]
    if not probabilities:
        return {'n': 0, 'mean_probability': None, 'individual_entropy': None,
                'between_participant_dispersion': None, 'brier': None}
    p, h = mean(probabilities), mean(entropies)
    return {'n': len(probabilities), 'mean_probability': p, 'individual_entropy': h,
            'between_participant_dispersion': max(0.0, entropy(p)-h),
            'brier': mean((x-truth)**2 for x in probabilities) if truth is not None else None}


def regret(action, losses):
    if not losses or action not in losses or any(not math.isfinite(v) for v in losses.values()):
        raise ValueError('Decision must have prespecified finite losses')
    return losses[action] - min(losses.values())


def holm(p_values):
    if any(not math.isfinite(p) or not 0 <= p <= 1 for p in p_values):
        raise ValueError('Invalid p value')
    order = sorted(range(len(p_values)), key=lambda i: p_values[i])
    adjusted = [0.0] * len(order)
    previous = 0.0
    for rank, i in enumerate(order):
        previous = max(previous, min(1.0, (len(order)-rank)*p_values[i]))
        adjusted[i] = previous
    return adjusted


def paired_map_bootstrap(rows, method, comparator, metric, resamples=2000, seed=260926):
    """One condition per call. Average repeats, then resample paired whole maps.

    Rows must explicitly contain a score for every scheduled repeat (including
    the selected failure policy). Never silently drop failed or unpaired maps.
    The caller must select narrative vs audit and successful vs conservative.
    """
    cells = defaultdict(lambda: defaultdict(list))
    map_settings = {}
    for row in rows:
        if row['method'] not in (method, comparator):
            continue
        scenario, setting = row['map_id'], row['policy_setting']
        if scenario in map_settings and map_settings[scenario] != setting:
            raise ValueError('Map assigned to multiple policy settings')
        map_settings[scenario] = setting
        value = row[metric]
        if value is None or not math.isfinite(value):
            raise ValueError('Explicit failure/missingness policy required')
        cells[(setting, scenario)][row['method']].append(value)
    strata = defaultdict(list)
    for (setting, scenario), arms in cells.items():
        if method not in arms or comparator not in arms:
            raise ValueError(f'Unpaired map: {scenario}')
        strata[setting].append(mean(arms[method])-mean(arms[comparator]))
    if not strata or any(len(values) < 2 for values in strata.values()):
        raise ValueError('At least two independent maps per represented stratum required')
    rng = random.Random(seed)
    samples = sorted(mean(rng.choice(values) for values in strata.values() for _ in values)
                     for _ in range(resamples))
    def quantile(p):
        index = (len(samples)-1)*p
        lower = int(index)
        upper = min(lower+1, len(samples)-1)
        return samples[lower] + (samples[upper]-samples[lower])*(index-lower)
    return {'effect': mean(v for values in strata.values() for v in values),
            'ci95': [quantile(0.025), quantile(0.975)], 'maps': len(cells),
            'resamples': resamples, 'seed': seed}

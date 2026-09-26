"""Scenario-clustered estimates; claims never act as independent replicates."""
from collections import defaultdict
import numpy as np
from .scoring import mean

def interval(rows,value,seed=260926):
    bymap=defaultdict(list);settings={}
    for row in rows:
        v=value(row)
        if v is not None and np.isfinite(v):bymap[row['map_id']].append(v);settings[row['map_id']]=row['policy_setting']
    if not bymap:return None,None,None
    estimates={key:mean(values) for key,values in bymap.items()};point=mean(estimates.values())
    if len(estimates)<2:return point,None,None
    strata=defaultdict(list)
    for key,v in estimates.items():strata[settings[key]].append(v)
    rng=np.random.default_rng(seed);samples=np.zeros(2000)
    for values in strata.values():samples+=rng.choice(values,size=(2000,len(values)),replace=True).sum(axis=1)
    bounds=np.quantile(samples/len(estimates),[.025,.975])
    return point,float(bounds[0]),float(bounds[1])

def metric(row,key):return row['scores']['surfaces']['narrative']['metrics'].get(key)

def plot_ci(ax,x,estimates,**kwargs):
    valid=[(a,b) for a,b in zip(x,estimates) if b[0] is not None]
    if not valid:return
    xs=[a for a,b in valid];ys=[b[0] for a,b in valid]
    ax.plot(xs,ys,'o-',**kwargs)
    bounded=[(a,b) for a,b in valid if b[1] is not None]
    if bounded:
        xs=[a for a,b in bounded];ys=[b[0] for a,b in bounded]
        ax.errorbar(xs,ys,yerr=[[max(0,b[0]-b[1]) for a,b in bounded],[max(0,b[2]-b[0]) for a,b in bounded]],fmt='none',color=kwargs.get('color'),capsize=3)

def paired(rows,variant,key,baseline='baseline'):
    grouped=defaultdict(lambda:defaultdict(list));meta={}
    for r in rows:
        if r['variant'] not in (variant,baseline):continue
        group=(r['map_id'],r['method']);grouped[group][r['variant']].append(r);meta[group]=r
    out=[]
    for group,arms in grouped.items():
        if not arms.get(variant) or not arms.get(baseline):continue
        a=[metric(r,key) for r in arms[variant]];b=[metric(r,key) for r in arms[baseline]]
        a=[v for v in a if v is not None];b=[v for v in b if v is not None]
        if a and b:out.append({**meta[group],'difference':mean(a)-mean(b)})
    return out

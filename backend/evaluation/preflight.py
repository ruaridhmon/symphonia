import argparse,json
from .client import Store,Client
from .calibration import run
p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--bucket');a=p.parse_args()
c=Client(Store(a.root,a.bucket),limit=800,workers=8)
models=['openai/gpt-4.1','anthropic/claude-sonnet-4.6','google/gemini-2.5-flash']
r=run(c,models)
print(json.dumps({'accepted':r['accepted'],'models':[{k:v for k,v in m.items() if k!='labels'} for m in r['models']],'cost_usd':c.spent}),flush=True)

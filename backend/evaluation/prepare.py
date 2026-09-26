import argparse,json
from .client import Client,Store
from .reference import accepted_world,panel
p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--bucket');p.add_argument('--worlds-only',action='store_true');a=p.parse_args()
c=Client(Store(a.root,a.bucket),limit=800,workers=8)
worlds=c.parallel(lambda i:accepted_world(c,'pilot',i),range(12))
print('Validated generated worlds:',len(worlds),flush=True)
if not a.worlds_only:
 for w in worlds:
  for n in (8,32):
   result=panel(c,w,n)
   print(w['map_id'],n,'validated',result['validated'],'recorded cost',round(c.spent,2),flush=True)

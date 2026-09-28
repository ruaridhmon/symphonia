"""Companion design using existing illustrative category-retention data, not new results."""
import csv,json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'frontend/public/evaluation/paper-concepts'
rows=[r for r in csv.DictReader((OUT/'02-selective-loss.csv').open()) if r['design']=='retention']
P='#6b5296';A='#bd784d';M='#81778c'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'svg.fonttype':'none','pdf.fonttype':42,'text.color':'#302a39','axes.edgecolor':'#dcd6e4','xtick.color':M,'ytick.color':M})
f=plt.figure(figsize=(6.5,9.5),facecolor='white')
f.text(.12,.94,'Which information survives?',fontsize=18)
f.text(.12,.9,'ILLUSTRATIVE · NOT EXPERIMENTAL RESULTS',fontsize=8,color=A)
f.text(.12,.853,'Group by information type, across consultations.',fontsize=10,color=M)
a=f.add_axes([.14,.20,.77,.59]);a.set(xlim=(0,100),ylim=(-.45,3.85))
grid=np.linspace(0,100,501)
cats=['Majority findings','Minority objections','Uncertainty','Conditions / exceptions']
for i,cat in enumerate(cats):
 y=3-i;v=np.array([float(r['retention_pct']) for r in rows if r['category']==cat]);h=4.5
 # Reflected KDE respects the bounded percentage scale. Area is normalized per group.
 den=sum(np.exp(-.5*((grid[:,None]-u[None,:])/h)**2).mean(axis=1) for u in [v,-v,200-v])/(h*np.sqrt(2*np.pi))
 height=den*7
 a.fill_between(grid,y,y+height,color=P,alpha=.13,lw=0)
 a.plot(grid,y+height,color=P,lw=1.1)
 a.vlines(v,y-.055,y-.018,color=P,alpha=.20,lw=.7)
 lo,med,hi=np.quantile(v,[.25,.5,.75])
 a.plot([lo,hi],[y-.13,y-.13],color=P,lw=2.1)
 a.scatter(med,y-.13,s=36,color=P,edgecolor='white',lw=.7,zorder=4)
 a.text(0,y+.53,cat,fontsize=11)
a.set_xticks([0,25,50,75,100]);a.set_yticks([]);a.set_xlabel('Original information retained (%)',labelpad=12)
for side in ['top','right','left']:a.spines[side].set_visible(False)
a.tick_params(length=0,pad=8)
f.text(.14,.105,'Soft curves: variation across hypothetical consultations.\nDot and short line: median and middle 50%, not uncertainty.',fontsize=8,color=M,linespacing=1.6,va='top')
f.text(.12,.026,'120 simulated cases per type, reused from the selective-loss concept.\nThese are not the 320 cases in the adjacent map or the saved pilot.\nCategory differences are constructed; they do not establish bias.',fontsize=8,color=M,linespacing=1.5)
for ext in ['svg','pdf','png']:f.savefig(OUT/f'extraction-companion.{ext}',dpi=600,facecolor='white')
p=OUT/'extraction-companion.svg';p.write_text('\n'.join(x.rstrip() for x in p.read_text().replace("'DejaVu Sans'","'Arial', sans-serif").splitlines())+'\n')
(OUT/'extraction-companion.json').write_text(json.dumps({'status':'ILLUSTRATIVE ONLY','source':'02-selective-loss.csv','filter':'design == retention','cases_per_type':120,'map_data_are_separate':True,'kde_bandwidth_percentage_points':4.5,'summary':'median and interquartile range; not confidence intervals'},indent=2)+'\n')

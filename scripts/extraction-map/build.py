"""Figure design preview only. Generates illustrative coordinates, never model results."""
from pathlib import Path
import csv,json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.ticker import PercentFormatter
OUT=Path(__file__).resolve().parents[2]/'frontend/public/evaluation/extraction-preview';OUT.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(413)
# Deliberately constructed distribution to demonstrate visual hierarchy.
a=rng.multivariate_normal([.82,.86],[[.004,.0015],[.0015,.004]],210)
b=rng.multivariate_normal([.48,.82],[[.009,.001],[.001,.004]],60)
c=rng.multivariate_normal([.79,.47],[[.004,.001],[.001,.009]],50)
xy=np.vstack([a,b,c]);xy=np.clip(xy,.04,.985)
# Make coordinates compatible with actual precision/recall denominators.
points=[]
for i,(x,y) in enumerate(xy):
 retained=int(round(x*100));outputs=int(round(retained/y));points.append(dict(id=f'ILLUSTRATION-{i+1:03}',reference_claims=100,faithfully_retained=retained,extracted_claims=outputs,faithfully_supported=retained,coverage=retained/100,faithfulness=retained/outputs))
xy=np.array([[p['coverage'],p['faithfulness']] for p in points])
grid=np.linspace(0,1,201);xx,yy=np.meshgrid(grid,grid);z=np.zeros_like(xx);h=.045
# Reflected Gaussian density at boundaries, normalized inside the plotting domain.
for x,y in xy:
 for xr in [x,-x,2-x]:
  for yr in [y,-y,2-y]:z+=np.exp(-((xx-xr)**2+(yy-yr)**2)/(2*h*h))
z/=z.sum();rank=np.sort(z.ravel())[::-1];mass=np.cumsum(rank)
levels=[rank[np.searchsorted(mass,q)] for q in [.9,.5]]
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'svg.fonttype':'none','axes.spines.top':False,'axes.spines.right':False})
fig=plt.figure(figsize=(10,9.5),facecolor='white');gs=fig.add_gridspec(2,2,width_ratios=[7,1],height_ratios=[1,7],left=.12,right=.94,bottom=.24,top=.83,wspace=.055,hspace=.055)
ax=fig.add_subplot(gs[1,0]);top=fig.add_subplot(gs[0,0],sharex=ax);right=fig.add_subplot(gs[1,1],sharey=ax)
purple='#665394';light='#d8d0e7';cmap=LinearSegmentedColormap.from_list('ink',['#ffffff','#f5f1fa','#e7ddf1','#c3b0dc','#9b81bd'])
ax.contourf(xx,yy,z,levels=np.linspace(0,z.max(),24),cmap=cmap,zorder=1)
ax.scatter(xy[:,0],xy[:,1],s=10,c=purple,alpha=.23,linewidths=0,zorder=2)
cs=ax.contour(xx,yy,z,levels=levels,colors=[purple,purple],linewidths=[.9,1.5],alpha=.85,zorder=3)
ax.clabel(cs,fmt={levels[0]:'90% density',levels[1]:'50% density'},fontsize=9,inline=True)
ax.scatter([1],[1],s=95,marker='*',c='#b67637',zorder=5,clip_on=False)
ax.annotate('Complete & faithful',xy=(1,1),xytext=(.63,1.045),fontsize=10,color='#725632',arrowprops=dict(arrowstyle='-',color='#b67637'),annotation_clip=False)
ax.text(.035,.955,'Faithful, but incomplete',fontsize=10,color='#746989',va='top');ax.text(.97,.07,'More unsupported or\naltered extractions',fontsize=10,color='#746989',ha='right')
ax.set(xlim=(0,1),ylim=(0,1),xlabel='Coverage of original claims',ylabel='Faithfulness of extracted claims');ax.xaxis.set_major_formatter(PercentFormatter(1));ax.yaxis.set_major_formatter(PercentFormatter(1));ax.set_xticks(np.linspace(0,1,6));ax.set_yticks(np.linspace(0,1,6));ax.spines['left'].set_color('#b8b2bd');ax.spines['bottom'].set_color('#b8b2bd');ax.tick_params(color='#b8b2bd');ax.set_aspect('equal')
top.fill_between(grid,z.sum(axis=0),color=light,alpha=.65);top.plot(grid,z.sum(axis=0),c=purple,lw=1.2);right.fill_betweenx(grid,0,z.sum(axis=1),color=light,alpha=.65);right.plot(z.sum(axis=1),grid,c=purple,lw=1.2)
for a in [top,right]:a.axis('off')
fig.canvas.draw();pos=ax.get_position()
top.set_position([pos.x0,pos.y1+.045,pos.width,.08])
right.set_position([pos.x1+.025,pos.y0,.075,pos.height])
fig.text(.12,.955,'CLAIM EXTRACTION',fontsize=10,fontweight='bold',color=purple,ha='left');fig.text(.12,.917,'How much survives—and how faithfully?',fontsize=23,fontweight='normal',ha='left',color='#26222d')
fig.text(.12,.875,'DESIGN PREVIEW  ·  320 simulated points  ·  Not measured Symphonia performance',fontsize=10,color='#8b4e34',ha='left')
fig.text(.12,.10,'One dot represents one hypothetical consultation. Faint dots show individual variation;\nshading and contours show concentration; marginal curves show each axis separately.',fontsize=10,color='#625b6b',linespacing=1.6)
fig.text(.12,.035,'Contours enclose 50% and 90% of the smoothed illustrative density, not confidence intervals.\nAll coordinates are generated solely to preview the figure design. No models were evaluated.',fontsize=9,color='#817989',linespacing=1.6)
for ext in ['svg','pdf','png']:fig.savefig(OUT/f'extraction-map.{ext}',dpi=600)
p=OUT/'extraction-map.svg';p.write_text(p.read_text().replace("'DejaVu Sans'","'Arial', sans-serif"));plt.close(fig)
(OUT/'illustrative-data.json').write_text(json.dumps({'status':'SIMULATED DESIGN PREVIEW — NOT EXPERIMENTAL RESULTS','seed':413,'bandwidth':h,'points':points},indent=2))
with (OUT/'illustrative-data.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=list(points[0]));w.writeheader();w.writerows(points)
print('Generated explicitly simulated extraction figure preview; no model calls.')

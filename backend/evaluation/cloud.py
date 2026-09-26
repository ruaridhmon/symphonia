"""Cloud Run job entrypoint, with durable checkpoints and periodic report exports."""
import argparse,os,threading,time,concurrent.futures,json
from pathlib import Path
from google.cloud import storage
from .client import Store,Client
from .study import run,status
from .report import build
p=argparse.ArgumentParser();p.add_argument('--phase',choices=['prepare','pilot','all'],default='pilot');p.add_argument('--spend-cap',type=float,default=800);a=p.parse_args()
root=Path('/data/synthetic-20260926');root.mkdir(parents=True,exist_ok=True)
bucket_name='symphonia-dev-488613-evaluations';bucket=storage.Client().bucket(bucket_name)
for blob in bucket.list_blobs(prefix=root.name+'/'):
    relative=blob.name.removeprefix(root.name+'/')
    if not relative or relative.startswith(('report/','live-report/')) or '..' in Path(relative).parts:continue
    target=root/relative;target.parent.mkdir(parents=True,exist_ok=True);blob.download_to_filename(target)
store=Store(root,bucket_name);client=Client(store,a.spend_cap,workers=12)
report_folder=os.environ.get('EVALUATION_REPORT_FOLDER','report')
if os.environ.get('EVALUATION_AWAIT_PREPARED')=='1':client.status_name='analysis-status.json'
stop=threading.Event();lock=threading.Lock()
def publish():
    with lock:
        # Merge new immutable call records from the concurrently preparing job.
        def download(blob):
            target=root/blob.name.removeprefix(root.name+'/')
            if not target.exists():
                data=blob.download_as_bytes()
                if not target.exists():
                    target.parent.mkdir(parents=True,exist_ok=True)
                    temporary=target.with_suffix('.download');temporary.write_bytes(data);temporary.replace(target)
        if os.environ.get('EVALUATION_AWAIT_PREPARED')=='1':
            with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:list(pool.map(download,bucket.list_blobs(prefix=root.name+'/calls/')))
        output=root/report_folder;build(root,output)
        for path in output.iterdir():
            if path.is_file():bucket.blob(root.name+'/'+report_folder+'/'+path.name).upload_from_filename(path)
def publishing():
    while not stop.wait(90):
        try:publish()
        except Exception as exc:print('Report export error:',type(exc).__name__,flush=True)
thread=threading.Thread(target=publishing,daemon=True);thread.start()
try:run(client,a.phase)
except Exception as exc:
    status(client,'stopped',error_type=type(exc).__name__,error=str(exc)[:600]);raise
finally:
    stop.set();publish()

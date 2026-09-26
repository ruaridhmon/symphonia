"""Read-only public server for explicitly synthetic dev evaluation artifacts."""
import http.server,os,re
from google.cloud import storage
BUCKET=os.environ.get('EVALUATION_BUCKET','symphonia-dev-488613-evaluations')
PREFIX=os.environ.get('EVALUATION_PREFIX','synthetic-20260926')+'/'+os.environ.get('EVALUATION_REPORT_FOLDER','report')+'/'
client=storage.Client()
class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        path=self.path.split('?',1)[0].lstrip('/')
        if path=='health':self.send_response(200);self.end_headers();self.wfile.write(b'OK');return
        if not re.fullmatch(r'(data\.json|evaluator-validation\.(json|svg|png)|figure-[1-5]\.(svg|png)|experiment-record\.jsonl\.gz)',path):
            self.send_error(404);return
        blob=client.bucket(BUCKET).blob(PREFIX+path)
        try:body=blob.download_as_bytes()
        except Exception:self.send_error(404,'Artifact is not available yet');return
        mime='application/json' if path.endswith('.json') else 'image/svg+xml' if path.endswith('.svg') else 'image/png' if path.endswith('.png') else 'application/gzip'
        self.send_response(200);self.send_header('Content-Type',mime);self.send_header('Cache-Control','no-store')
        self.send_header('Access-Control-Allow-Origin','https://symphonia-dev-488613.web.app')
        self.send_header('X-Content-Type-Options','nosniff');self.send_header('Content-Length',str(len(body)))
        if path.endswith('.gz'):self.send_header('Content-Disposition','attachment; filename="experiment-record.jsonl.gz"')
        self.end_headers();self.wfile.write(body)
http.server.ThreadingHTTPServer(('0.0.0.0',int(os.environ.get('PORT','8080'))),Handler).serve_forever()

"""Run a real three-round API simulation against an explicitly isolated SQLite DB.

Usage (from backend): DATABASE_URL=sqlite:////tmp/symphonia-workspace-qa.db \
  SYNTHESIS_MODE=mock RATE_LIMIT_ENABLED=false PYTHONPATH=. python ../scripts/seed-workspace-qa.py
All people and statements are fictional. No email or model requests are made.
"""
import os
from pathlib import Path
if not os.environ.get('DATABASE_URL', '').startswith('sqlite:////tmp/symphonia-'):
    raise SystemExit('Use a dedicated /tmp/symphonia- SQLite database for this simulation.')
os.environ['SYNTHESIS_MODE'] = 'mock'
os.environ['RATE_LIMIT_ENABLED'] = 'false'
os.environ['ADMIN_EMAIL'] = 'workspace-qa@example.com'
os.environ['ADMIN_PASSWORD'] = 'workspace-qa-local-only'
from fastapi.testclient import TestClient
from main import app
from tests.test_research_ai_simulation import test_full_authenticated_simulation
with TestClient(app) as client:
    login = client.post('/login', data={'username':os.environ['ADMIN_EMAIL'],'password':os.environ['ADMIN_PASSWORD']})
    assert login.status_code == 200, login.status_code
    # Each bearer header represents a distinct fictional browser session.
    # Do not let TestClient's shared cookie jar replace that identity.
    def isolated_identity(request):
        if 'authorization' in request.headers:
            request.headers.pop('cookie', None)
    client.event_hooks['request'].append(isolated_identity)
    test_full_authenticated_simulation(client, {'Authorization':f'Bearer {login.json()["access_token"]}'})
print('Verified: 8 fictional participants, 3 rounds, 24 submissions, published feedback, stable claims and preserved identities.')

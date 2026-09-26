# Synthetic evaluation

Execution is in pilot engineering. The live record, rather than this README, reports measured completion and failures: https://symphonia-dev-488613.web.app/evaluation/ . No main-study conclusion is established.

The supplied protocol is extracted in `protocol.txt`. `specification.json` records model roles and planned conditions. The main specification must be frozen from validated pilot variation before any main cases are generated.

## Deployment and records

The read-only report service is `symphonia-evaluation-20260926` in dev project `symphonia-dev-488613`. It serves only synthetic report artifacts from the private bucket `symphonia-dev-488613-evaluations`. The Cloud Run worker uses `backend/evaluation/cloud.py`, checkpoints model calls and results, and publishes reports periodically. Model credentials are outside the repository and absent from request archives. The original tracked `.env` remains unchanged.

The website preserves the existing committed dist mirror and import map. Only the evaluation page and a dev-only footer link are added. The production site is not a deployment target.

## Scientific status

Three evaluator families passed the revised 200-item templated calibration. Earlier calibration and transport-debugging calls are retained. This calibration is a limited engineering check, not proof of evaluator validity on arbitrary outputs. Pilot versions and failed cells remain distinguishable in run IDs.

The Symphonia arm executes the frozen native product prompt and formatting helpers from source commit `04e74c167c74998bd4071b02d6390abeb610240f`. The benchmark additionally instruments explicit insufficient-evidence ratings, probabilities, source identifiers and a common narrative/audit adapter. It is not an end-to-end test of ordinary live consultation API submissions. The native 12-claim extraction cap is retained. Unsupported component ablations must not be described as native-product features.

Open work includes validated pilot completion, full robustness and matched decision cases, protocol-complete figures, pilot-based sample planning, frozen main execution, and final interpretation. The website reports unavailable results rather than substituting demonstration values. Do not interpret an executed job as a completed study.

## Validation

Run `python3 -m unittest discover -s scripts/synthetic_evaluation -p 'test_*.py'` and `PYTHONPATH=backend python3 -m unittest evaluation.test_protocol`. Report generation requires numpy and matplotlib; the cloud worker additionally requires google-cloud-storage. Build the separate evaluation image with `backend/evaluation/cloudbuild.yaml`.

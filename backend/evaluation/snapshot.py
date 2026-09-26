"""Freeze the exact dev implementation used by the experiment, without secrets."""
import ast,json,subprocess,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[2]
source=(root/'backend/core/routes.py').read_text();tree=ast.parse(source)
names=['_stringify_custom_synthesis_answer','_question_label_for_custom_synthesis','_format_custom_synthesis_material','_format_custom_claim_list']
functions={n.name:ast.get_source_segment(source,n) for n in tree.body if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef)) and n.name in names}
prompt=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='CUSTOM_SYNTHESIS_BASELINE_PROMPT' for t in n.targets))
front={p:(root/p).read_text() for p in ['frontend/src/utils/delphiRoundTwo.ts','frontend/src/utils/delphiPlanning.ts']}
data={'commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'baseline_prompt':prompt,'functions':functions,'frontend_sources':front,'native_max_tokens':2500,'native_temperature':0.2,'native_claim_cap':12,'workflow':'custom synthesis -> actual numbered claim extraction -> fixed questionnaire -> exact recorded feedback -> same-claim reconsideration -> custom synthesis','output_adapter':'A common JSON narrative/audit export is measured separately from native synthesis; no gold data is available to the adapter.'}
(root/'backend/evaluation/platform_snapshot.json').write_text(json.dumps(data,indent=2)+'\n')

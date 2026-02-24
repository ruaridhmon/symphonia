# Prompt Flow Reference

Quick reference for understanding which prompts are used in the TTD pipeline.

---

## Pipeline Overview

```
┌─────────────────┐
│ Expert Responses│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Stage 1: Graph Extraction (TTD)     │
├─────────────────────────────────────┤
│ 1. extraction_single.mustache (×N)  │  ← Map: Extract from each expert
│ 2. resolution.mustache              │  ← Reduce: Find cross-expert edges
│ 3. gap_identify.mustache (×S steps) │  ← Denoise: Find gaps
│ 4. gap_resolve.mustache (×S steps)  │  ← Denoise: Fill gaps
│ 5. Fitness evaluation (×6 dims)     │  ← Evaluate each draft
│ 6. NSGA-II selection + merge        │  ← Select best candidates
└────────┬────────────────────────────┘
         │
         ▼
    ArgumentationGraph
         │
         ▼
┌─────────────────────────────────────┐
│ Stage 2: Synthesis Generation (TTD) │
├─────────────────────────────────────┤
│ 1. draft.mustache (×N)              │  ← Generate initial synthesis
│ 2. gap_identify.mustache (×S steps) │  ← Denoise: Find gaps
│ 3. gap_resolve.mustache (×S steps)  │  ← Denoise: Fill gaps
│ 4. Fitness evaluation (×6 dims)     │  ← Evaluate each draft
│ 5. NSGA-II selection + merge        │  ← Select best candidates
└────────┬────────────────────────────┘
         │
         ▼
       Synthesis
         │
         ▼
┌─────────────────────────────────────┐
│ Stage 3: Narrative Generation (TTD) │
├─────────────────────────────────────┤
│ 1. draft.mustache (×N)              │  ← Generate initial narrative
│ 2. narrative_critique.mustache (×S) │  ← Denoise: Identify issues
│ 3. narrative_refine.mustache (×S)   │  ← Denoise: Rewrite
│ 4. Fitness evaluation (×6 dims)     │  ← Evaluate each draft
│ 5. narrative_final_merge.mustache   │  ← Merge best candidates
└────────┬────────────────────────────┘
         │
         ▼
    Final Narrative
```

---

## Stage 1: Graph Extraction

### 1.1 Draft Generation (Map-Reduce)

**extraction_single.mustache**
- **When**: For each expert response during initial draft generation
- **File**: `graph_tasks.py:GraphDraftGenerator._a_extract_single_expert()`
- **Context**:
  - `question` (string)
  - `expert_id` (string)
  - `response` (string): Full prose response
- **Output**: XML graph with nodes and edges from single expert
- **Parallelization**: All experts extracted in parallel

**resolution.mustache**
- **When**: After merging individual graphs, to find cross-expert relationships
- **File**: `graph_tasks.py:GraphDraftGenerator._resolve_relationships()`
- **Context**:
  - `question` (string)
  - `claims` (list): Each with `node_id`, `text`, `sources`
- **Output**: XML with cross-expert edges and merge instructions
- **Runs**: Once per initial draft

---

### 1.2 Denoising Loop (TTD Refinement)

**gap_identify.mustache**
- **When**: Each denoising step to identify what's missing
- **File**: `graph_tasks.py:GraphDenoiser.identify()`
- **Context**:
  - `draft` (dict): Formatted graph with nodes/edges
  - `fitness_feedback` (string, optional): From fitness evaluation
- **Output**: YAML list of gaps with retrieval queries
- **Runs**: S times per trajectory (S = n_denoise_steps)

**gap_resolve.mustache**
- **When**: Each denoising step to fill identified gaps
- **File**: `graph_tasks.py:GraphDenoiser.resolve()`
- **Context**:
  - `draft` (dict): Current graph
  - `gaps` (list): From gap_identify
  - `retrieved` (list): Retrieved content with `source_id`, `source_type`, `content`
  - `fitness_feedback` (string, optional)
- **Output**: YAML with complete refined graph (nodes + edges)
- **Runs**: S times per trajectory

---

### 1.3 Fitness Evaluation

All six prompts use identical context structure:

**Context** (all dimensions):
```python
{
    "question": str,
    "draft": formatted_graph,  # with nodes, edges
    "responses": formatted_responses  # list of expert responses
}
```

**Prompts**:
1. `fitness_evaluation/groundedness.mustache` (HARD CONSTRAINT)
2. `fitness_evaluation/coverage.mustache`
3. `fitness_evaluation/atomicity.mustache`
4. `fitness_evaluation/non_redundancy.mustache`
5. `fitness_evaluation/relation_coherence.mustache`
6. `fitness_evaluation/dissent_preservation.mustache`

**File**: `fitness.py:LLMFitnessEvaluator._evaluate_single_dimension()`

**Output**: YAML with `dimension`, `band`, `score`, `rationale`, `suggestions`

**Parallelization**: All 6 dimensions evaluated in parallel

---

## Stage 2: Synthesis Generation

### 2.1 Draft Generation

**draft.mustache**
- **When**: Initial synthesis generation from expert responses
- **File**: `synthesis_tasks.py:SynthesisDraftGenerator.generate()`
- **Context**:
  - `question` (string)
  - `responses` (list): Formatted expert responses
  - `response_count` (int)
- **Output**: XML synthesis with claims, agreements, disagreements, uncertainties
- **Parallelization**: N drafts generated in parallel

---

### 2.2 Denoising Loop

**gap_identify.mustache**
- **When**: Each denoising step
- **File**: `synthesis_tasks.py:SynthesisDenoiser.identify()`
- **Context**:
  - `draft` (dict): Formatted synthesis
  - `fitness_feedback` (string, optional)
- **Output**: YAML list of gaps with queries
- **Runs**: S times per trajectory

**gap_resolve.mustache**
- **When**: Each denoising step
- **File**: `synthesis_tasks.py:SynthesisDenoiser.resolve()`
- **Context**:
  - `draft` (dict): Current synthesis
  - `gaps` (list)
  - `retrieved` (list)
  - `fitness_feedback` (string, optional)
- **Output**: YAML with complete refined synthesis
- **Runs**: S times per trajectory

---

### 2.3 Fitness Evaluation

**Context** (all dimensions):
```python
{
    "question": str,
    "draft": formatted_synthesis,
    "responses": formatted_responses  # Or formatted synthesis for Stage 3
}
```

**Prompts**:
1. `fitness_evaluation/completeness.mustache`
2. `fitness_evaluation/dissent_visibility.mustache`
3. `fitness_evaluation/faithfulness.mustache` ⚠️ (expects `graph_nodes` but not provided)
4. `fitness_evaluation/neutrality.mustache`
5. `fitness_evaluation/structural_clarity.mustache`
6. `fitness_evaluation/traceability.mustache`

**File**: `fitness.py:LLMFitnessEvaluator._evaluate_single_dimension()`

**Parallelization**: All 6 dimensions evaluated in parallel

---

## Stage 3: Narrative Generation

### 3.1 Draft Generation

**draft.mustache**
- **When**: Initial narrative generation from synthesis
- **File**: `narrative_tasks.py:NarrativeDraftGenerator.generate()`
- **Context**:
  - `question` (string)
  - `synthesis` (dict): Formatted synthesis with claims, agreements, etc.
- **Output**: Plain text narrative (300-500 words)
- **Parallelization**: N drafts generated in parallel

---

### 3.2 Denoising Loop (Different from Stages 1-2)

**narrative_critique.mustache**
- **When**: Each denoising step to identify narrative issues
- **File**: `narrative_tasks.py:NarrativeDenoiser.identify()`
- **Context**:
  - `narrative` (string): Current draft narrative
  - `synthesis` (dict): Source synthesis (ground truth)
  - `fitness_feedback` (string, optional)
- **Output**: XML list of gaps (hallucinations, omissions, bias)
- **Runs**: S times per trajectory
- **Note**: No retrieval in narrative stage; gaps checked against fixed synthesis

**narrative_refine.mustache**
- **When**: Each denoising step to rewrite narrative
- **File**: `narrative_tasks.py:NarrativeDenoiser.resolve()`
- **Context**:
  - `narrative` (string): Current draft
  - `critique` (string): Formatted list of gaps
  - `synthesis` (dict): Source synthesis
  - `fitness_feedback` (string, optional)
- **Output**: Plain text rewritten narrative
- **Runs**: S times per trajectory

---

### 3.3 Final Merge

**narrative_final_merge.mustache**
- **When**: After NSGA-II selection, to merge best narratives
- **File**: `narrative_tasks.py:NarrativeMerger.merge()`
- **Context**:
  - `narratives` (list of strings): Multiple narrative candidates
- **Output**: Single merged narrative

---

### 3.4 Fitness Evaluation

**Context** (all dimensions):
```python
{
    "question": str,
    "draft": narrative_string,  # Plain text, not structured
    "responses": [formatted_synthesis]  # Synthesis, not expert responses
}
```

**Prompts**: Same as Stage 2 (reused)
1. `fitness_evaluation/completeness.mustache`
2. `fitness_evaluation/dissent_visibility.mustache`
3. `fitness_evaluation/faithfulness.mustache`
4. `fitness_evaluation/neutrality.mustache`
5. `fitness_evaluation/structural_clarity.mustache`
6. `fitness_evaluation/traceability.mustache`

**File**: `fitness.py:LLMFitnessEvaluator._evaluate_single_dimension()`

**Parallelization**: All 6 dimensions evaluated in parallel

---

## Prompt File Locations

```
prompts/
├── diffusion/
│   └── v1/
│       ├── graph/
│       │   ├── extraction_single.mustache     [ACTIVE]
│       │   ├── resolution.mustache            [ACTIVE]
│       │   ├── gap_identify.mustache          [ACTIVE - newly implemented]
│       │   ├── gap_resolve.mustache           [ACTIVE - newly implemented]
│       │   ├── fitness_evaluation/
│       │   │   ├── groundedness.mustache      [ACTIVE]
│       │   │   ├── coverage.mustache          [ACTIVE]
│       │   │   ├── atomicity.mustache         [ACTIVE]
│       │   │   ├── non_redundancy.mustache    [ACTIVE]
│       │   │   ├── relation_coherence.mustache[ACTIVE]
│       │   │   └── dissent_preservation.mustache [ACTIVE]
│       │   ├── draft.mustache                 [UNUSED - documented]
│       │   ├── draft_prose.mustache           [UNUSED - documented]
│       │   └── merge.mustache                 [UNUSED - documented]
│       │
│       ├── synthesis/
│       │   ├── draft.mustache                 [ACTIVE]
│       │   ├── gap_identify.mustache          [ACTIVE - newly implemented]
│       │   ├── gap_resolve.mustache           [ACTIVE - newly implemented]
│       │   ├── fitness_evaluation/
│       │   │   ├── completeness.mustache      [ACTIVE]
│       │   │   ├── dissent_visibility.mustache[ACTIVE]
│       │   │   ├── faithfulness.mustache      [ACTIVE - context issue noted]
│       │   │   ├── neutrality.mustache        [ACTIVE]
│       │   │   ├── structural_clarity.mustache[ACTIVE]
│       │   │   └── traceability.mustache      [ACTIVE]
│       │   ├── draft_prose.mustache           [UNUSED - documented]
│       │   ├── merge.mustache                 [UNUSED - documented]
│       │   └── narrative_merge.mustache       [UNCLEAR - needs clarification]
│       │
│       └── narrative/
│           ├── draft.mustache                 [ACTIVE]
│           ├── narrative_critique.mustache    [ACTIVE]
│           ├── narrative_refine.mustache      [ACTIVE]
│           ├── narrative_final_merge.mustache [ACTIVE - fixed template bug]
│           └── fitness_evaluation/
│               ├── completeness.mustache      [ACTIVE - reused from synthesis]
│               ├── dissent_visibility.mustache[ACTIVE - reused from synthesis]
│               ├── faithfulness.mustache      [ACTIVE - reused from synthesis]
│               ├── neutrality.mustache        [ACTIVE - reused from synthesis]
│               ├── structural_clarity.mustache[ACTIVE - reused from synthesis]
│               └── traceability.mustache      [ACTIVE - reused from synthesis]
│
└── summarise/
    └── v1/
        └── main.mustache                      [LEGACY - not used in TTD]
```

---

## Key Design Patterns

### 1. Map-Reduce for Graph Extraction
- **Map**: Extract from each expert independently (`extraction_single.mustache`)
- **Reduce**: Merge and resolve cross-expert relationships (`resolution.mustache`)
- **Why**: Parallelization + better handling of per-expert context

### 2. Fitness-Guided Denoising
- Each denoising step includes optional fitness feedback
- LLM uses feedback to prioritize which gaps to address
- Evolutionary pressure toward higher fitness

### 3. Fallback Mechanisms
- All LLM-based denoising has heuristic fallback
- Parse failures don't crash the pipeline
- Logged for monitoring and debugging

### 4. Shared Fitness Templates
- Synthesis and Narrative stages reuse the same fitness templates
- Different `draft` types (structured vs. string)
- Same evaluation dimensions apply to both

---

## Context Formatting Utilities

All located in `summarise/template_utils.py`:

```python
format_expert_response(response) -> dict
format_expert_responses(responses) -> list[dict]
format_graph_for_template(graph) -> dict
format_synthesis_for_template(synthesis) -> dict
format_claim(claim) -> dict
format_graph_node(node) -> dict
format_graph_edge(edge) -> dict
format_source_reference(ref) -> dict
```

---

## TTD Configuration

Controlled by `TTDConfig` in `runner.py`:

```python
TTDConfig(
    n_initial_drafts=3,        # N parallel candidates
    n_denoise_steps=5,         # S denoising iterations
    retrieval_top_k=5,         # Results per query
    use_fitness_feedback=True, # Include fitness in prompts
    use_nsga2_selection=True,  # Pareto selection
    randomize_sampling=True,   # Evolutionary diversity
)
```

---

## Performance Characteristics

### LLM Calls per Stage

**Stage 1 (Graph)**:
- Draft generation: N × (E + 1) calls (E = num experts, 1 = resolution)
- Denoising: N × S × 2 calls (identify + resolve per step)
- Fitness: N × (S + 1) × 6 calls (6 dimensions)
- **Total**: ~N × (E + 1 + 2S + 6S + 6) calls

**Stage 2 (Synthesis)**:
- Draft generation: N calls
- Denoising: N × S × 2 calls
- Fitness: N × (S + 1) × 6 calls
- **Total**: ~N × (1 + 2S + 6S + 6) calls

**Stage 3 (Narrative)**:
- Draft generation: N calls
- Denoising: N × S × 2 calls
- Fitness: N × (S + 1) × 6 calls
- Final merge: 1 call
- **Total**: ~N × (1 + 2S + 6S + 6) + 1 calls

**Example** (N=3, S=5, E=12):
- Stage 1: ~270 calls
- Stage 2: ~147 calls
- Stage 3: ~148 calls
- **Total**: ~565 LLM calls

**Optimization Opportunities**:
- Reduce S (fewer denoising steps)
- Reduce N (fewer parallel candidates)
- Skip fitness on early steps
- Cache results where appropriate

---

**For detailed audit and fixes, see `PROMPT_AUDIT.md` and `PROMPT_FIXES_APPLIED.md`**



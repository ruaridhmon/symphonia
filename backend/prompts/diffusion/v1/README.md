# Diffusion Prompts v1

Version: `v1.3` (Agentic Pipeline)

## Purpose

Prompt templates for the Test-Time Diffusion (TTD) pipeline. These templates
implement an **agentic pipeline** with dedicated prompts for each step:
1. **Fitness Evaluation** - dimension-specific LLM-as-judge assessment
2. **Gap Identification** - identify gaps AND generate retrieval queries
3. **Gap Resolution** - synthesize retrieved content into draft

## Architecture: Multi-Prompt Fitness Evaluation

Fitness evaluation uses **separate prompts for each dimension** rather than a single combined prompt:

**Benefits**:
- Each dimension evaluated independently with dedicated focus
- Enables parallel LLM calls (6 concurrent evaluations)
- Clearer prompts with less cognitive load per evaluation
- Easier to iterate and improve individual dimensions
- Better evolutionary framing ("communicate with future generations")

**Process**:
1. For each dimension, render its specific prompt template
2. Call LLM to evaluate just that dimension
3. Parse YAML output for that dimension
4. Assemble all 6 dimension scores into a complete `FitnessEvaluation`
5. Generate unified feedback document for next generation

---

## File Structure

```
prompts/diffusion/v1/
├── graph/
│   ├── draft.mustache              # Initial extraction of claims/evidence/relations
│   ├── gap_identify.mustache       # Identify gaps and generate queries
│   ├── gap_resolve.mustache        # Synthesize retrieved content into graph
│   ├── merge.mustache              # Merge multiple graph candidates
│   └── fitness_evaluation/
│       ├── groundedness.mustache   # Claim-to-evidence anchoring (HARD CONSTRAINT)
│       ├── coverage.mustache       # Proportional source representation
│       ├── atomicity.mustache      # Single-proposition claims
│       ├── non_redundancy.mustache # Semantic distinctness
│       ├── relation_coherence.mustache # Edge justification and typing
│       └── dissent_preservation.mustache # Explicit conflict representation
│
└── synthesis/
    ├── draft.mustache              # Initial synthesis from graph/responses
    ├── gap_identify.mustache       # Identify gaps and generate queries
    ├── gap_resolve.mustache        # Synthesize retrieved content into synthesis
    ├── merge.mustache              # Merge multiple synthesis candidates
    └── fitness_evaluation/
        ├── faithfulness.mustache   # Source accuracy (HARD CONSTRAINT)
        ├── structural_clarity.mustache # Logical organization
        ├── dissent_visibility.mustache # Disagreement prominence
        ├── neutrality.mustache     # Absence of advocacy
        ├── traceability.mustache   # Citation completeness
        └── completeness.mustache   # Question/source coverage
```

---

## Evolutionary Framing

All fitness evaluation prompts frame the assessment as part of an **evolutionary optimization process**:

> "You are one fitness evaluator in a multi-objective evolutionary system.
> Your feedback will guide the next generation of candidate [graphs/syntheses].
> Think of this as communicating with future iterations..."

This framing helps the LLM understand:
- Its role is to provide actionable feedback, not just scores
- The draft will evolve based on this feedback
- Specificity and concrete suggestions are crucial
- It's part of a multi-objective optimization (other dimensions assessed separately)

---

## Using PromptRenderer

Templates are rendered using `PromptRenderer` with the chevron library (full Mustache spec support):

```python
from pathlib import Path
from consensus.summarise.prompts import PromptRenderer
from consensus.summarise.template_utils import (
    format_expert_responses,
    format_graph_for_template,
)

# Create renderer for a specific template
renderer = PromptRenderer.from_template_name(
    Path("prompts/diffusion/v1/graph"),
    "gap_identify.mustache",
)

# Render with context - domain objects must be formatted to dicts
prompt = renderer.render(
    question="What is the impact?",
    responses=format_expert_responses(expert_responses),
    draft=format_graph_for_template(current_graph),
    fitness_feedback=feedback_doc,
)
```

**Key points:**
- Use `format_*` helpers from `template_utils` to convert domain objects to dicts
- Templates use full Mustache syntax: `{{var}}`, `{{#section}}`, `{{^inverted}}`, `{{>partial}}`
- Partials are auto-loaded from `partials/` subdirectory if it exists
- HTML special chars are escaped by default; use `{{{var}}}` for unescaped content

---

## Template Variables

### Common Variables
| Variable | Type | Description |
|----------|------|-------------|
| `question` | string | The question being addressed |
| `responses` | array | Expert responses |

### Graph-Specific Variables
| Variable | Type | Description |
|----------|------|-------------|
| `current_graph` | object | Current graph state (for denoising) |
| `gaps` | array | Identified gaps to address |
| `retrieved_context` | array | Retrieved content for refinement |
| `fitness_feedback` | string | Assembled feedback from fitness evaluation |

### Synthesis-Specific Variables
| Variable | Type | Description |
|----------|------|-------------|
| `graph` | object | Argumentation graph to synthesise from |
| `current_synthesis` | object | Current synthesis state |
| `graph_nodes` | array | Graph nodes (for reference during evaluation) |
| `graph_edges` | array | Graph edges (for reference during evaluation) |
| `fitness_feedback` | string | Assembled feedback from fitness evaluation |

### Gap Identification Variables
| Variable | Type | Description |
|----------|------|-------------|
| `draft` | object | Current graph or synthesis being analyzed |
| `draft.nodes` | array | Graph nodes (for gap_identify_graph) |
| `draft.edges` | array | Graph edges (for gap_identify_graph) |
| `draft.claims` | array | Synthesis claims (for gap_identify_synthesis) |
| `fitness_feedback` | string | Feedback from fitness evaluation (optional) |

### Gap Resolution Variables
| Variable | Type | Description |
|----------|------|-------------|
| `draft` | object | Current graph or synthesis to refine |
| `gaps` | array | Identified gaps with descriptions and queries |
| `gaps[].description` | string | What is missing or weak |
| `gaps[].query` | string | Query that was used to retrieve content |
| `retrieved` | array | Retrieved content for gap resolution |
| `retrieved[].content` | string | Text content retrieved |
| `retrieved[].source_id` | string | Source identifier |
| `retrieved[].source_type` | string | "graph" or "response" |
| `fitness_feedback` | string | Feedback from fitness evaluation (optional) |

### Judge-Specific Variables
| Variable | Type | Description |
|----------|------|-------------|
| `draft` | object | Graph or synthesis being evaluated |
| `draft.nodes` | array | Graph nodes (for judge_graph_* prompts) |
| `draft.edges` | array | Graph edges (for judge_graph_* prompts) |
| `draft.claims` | array | Synthesis claims (for judge_synthesis_* prompts) |

---

## Fitness Evaluation Rubrics

Each dimension uses a **9-band criterion-referenced rubric** (inspired by IELTS writing assessment) converted to a 1-5 output scale:

| Band Range | Output Score | Quality Level |
|------------|--------------|---------------|
| 9, 8 | 5 | Exceptional |
| 7, 6 | 4 | Good |
| 5 | 3 | Acceptable |
| 4, 3 | 2 | Below Standard |
| 2, 1 | 1 | Inadequate |

### Graph Evaluation Dimensions

| Dimension | Description | Hard Constraint? |
|-----------|-------------|------------------|
| **Groundedness** | Every claim anchored to verbatim source evidence | **Yes** (must score ≥4) |
| **Coverage** | Proportional representation of all source content | No |
| **Atomicity** | Each claim is a single indivisible proposition | No |
| **Non-Redundancy** | Claims are semantically distinct | No |
| **Relation Coherence** | Edges are justified and correctly typed | No |
| **Dissent Preservation** | Conflicts and minority views are explicit | No |

### Synthesis Evaluation Dimensions

| Dimension | Description | Hard Constraint? |
|-----------|-------------|------------------|
| **Faithfulness** | No novel claims; source material accurately represented | **Yes** (must score ≥4) |
| **Structural Clarity** | Logical organisation into coherent sections | No |
| **Dissent Visibility** | Disagreements prominently and fairly represented | No |
| **Neutrality** | No evaluative language, advocacy, or recommendations | No |
| **Traceability** | Every statement cites specific source_ids | No |
| **Completeness** | All question aspects and sources are covered | No |

---

## Output Format (Per Dimension)

Each dimension prompt outputs:

```yaml
dimension: <dimension_name>
band: <1-9>          # Internal 9-band assessment
score: <1-5>         # Converted output score
rationale: |
  <Multi-line detailed explanation>
suggestions:
  - "<Actionable improvement with specific IDs>"
  - "<Another concrete suggestion>"
# ... dimension-specific additional fields (e.g., critical_issues, exemplars, etc.)
```

---

## Assembled Feedback Document

After evaluating all dimensions, the system assembles them into a unified **Evolutionary Feedback Document** passed to the next denoising iteration:

```markdown
# Fitness Evaluation for Next Generation

This evaluation was performed as part of an evolutionary optimization process...

## Fitness Score Summary

| Dimension | Score | Status |
|-----------|-------|--------|
| Groundedness | 4/5 | ✓ Good |
| Coverage | 3/5 | ⚠️  Needs Work |
...

## Priority Improvements (Score ≤ 3)

### 1. Coverage (Score: 3/5)

**Assessment**: Source r1_s03 is underrepresented...

**Actionable Steps**:
- Add claims from r1_s03 addressing topic X
- Balance representation across all sources

## Strengths to Preserve

- **Groundedness** (4/5): All claims have supporting evidence...

---

## Evolutionary Guidance

This feedback represents one generation in an iterative refinement process...
```

---

## Version History

- **v1.4** (current): Chevron-based rendering with flexible context
  - PromptRenderer now uses chevron for full Mustache spec support
  - Flexible `**context` API - no fixed parameters
  - Added template_utils.py with `format_*` helpers for domain objects
  - Added template variable extraction and validation

- **v1.3**: Agentic pipeline with separated gap identification and resolution
  - Added `gap_identify_graph.mustache` and `gap_identify_synthesis.mustache`
  - Added `gap_resolve_graph.mustache` and `gap_resolve_synthesis.mustache`
  - GapIdentifier now generates both gap descriptions AND retrieval queries
  - GapResolver synthesizes retrieved content with gap context
  - Deprecated combined `*_denoise.mustache` templates

- **v1.2**: Multi-prompt architecture with evolutionary framing
  - Separated each dimension into its own prompt
  - Added evolutionary framing for better LLM guidance
  - Enhanced feedback assembly into unified document

- **v1.1**: Enhanced rubrics with 9-band IELTS-style criterion-referenced assessment

- **v1** (initial): Basic TTD prompts with gap identification and refinement

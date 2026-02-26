---
project_name: "Symphonia: Distributed Expert Synthesis for Scientific Consensus"
status: "planning" # planning | active | on-hold | completed | archived
lead: "Ruaridh Mon-Williams"
start_date: "2026-01-29"
created_date: "2026-01-29"
last_updated_date: "2026-01-29"
target_end_date: "YYYY-MM-DD"
finished_date: "YYYY-MM-DD"
tags: [scientific-consensus, distributed-cognition, expert-systems, llm-synthesis, delphi-method, policy, collective-intelligence]
related_projects: ["make_reviews_great_again"]
repository: ""
participants: [Ruaridh Mon-Williams, Antreas]
pillars: [ai-flywheels]
---

# Project: Symphonia — Distributed Expert Synthesis for Scientific Consensus

## Synopsis & Goals

**Problem Statement:** Policymakers require scientific evidence for effective decision-making, but existing approaches to capturing scientific opinion collapse diverse reasoning into simplified outputs. Current methods face fundamental limitations:

- **Expert Advisory Groups** provide scientific opinions but are subject to selection biases, meaning important evidence may be missed
- **Science Advisory Councils (SACs)** mitigate selection bias by selecting scientists who represent wider domains, but are constrained by the work involved in requesting and collating opinions
- **Roundtables** generate evidence from diverse individuals with lived experience, but are expensive, also subject to selection biases, and constrained by capture/reporting overhead
- **Combining methods** (SACs + Roundtables) would be most powerful, but such synthesis is currently challenging

**Core Question:** How can technological advances help provide a *scientific opinion* rather than the *opinion of a scientist*?

**Proposed Solution:** Treat experts as nodes in a distributed information system, combining structured inputs with LLM-assisted synthesis to maximize clarity and support better decision-making. This lightweight alternative is based on principles from **distributed cognition** and **information theory**.

## Methodology & Approach

### Conceptual Framework

SAC members are treated as **computational nodes in a distributed inference system**:
- Each member contributes partial knowledge via a **structured template** (ensuring signal alignment via same input format)
- An **LLM acts as a synthesis layer**: combining, reconciling, and mapping views
- The SAC cycles through reviews via the **Delphi methodology** to create feedback loops that stabilize shared understanding

### Protocol Design

**Phase 1: Independent Structured Input Collection**
- Experts submit structured inputs independently (reduces bias, preserves diverse reasoning)
- Input template captures:
  - Position on answer to the question
  - Evidence base
  - Confidence level (with justification)
  - Known counterarguments
  - Relevant known publications
  - Names of relevant experts

**Phase 2: LLM Synthesis**
- LLM synthesizes inputs to:
  - Identify agreement areas
  - Clarify uncertainty
  - Reduce coordination cost
- Crucially: LLM does **not** make judgments—it organizes and reconciles

**Phase 3: Expert Review & Revision**
- SAC reviews and revises synthesis
- Ensures output reflects collective human reasoning
- SAC can readily expand the pool of contributing experts

**Phase 4: Delphi Iteration**
- Repeat synthesis-review cycles until convergence
- Track changes and reasoning paths across iterations

### Output Artefact

The result is a **transparent, high-signal artefact** optimized for:
- **Clarity**: Structured presentation of consensus and divergence
- **Accountability**: Traceable reasoning paths
- **Updateability**: Version-controlled for future evidence integration

The arrangement allows the SAC to mirror an **efficient distributed system**: parallel, robust, and fault-tolerant.

## Technical Advantages

### Information-Theoretic Properties
- **Preserves useful disagreement**: Doesn't collapse diversity into false consensus
- **Reduces epistemic entropy**: Structured inputs enable cleaner information aggregation
- **Increases information gain vs averaging**: Disagreement is diagnostic, not noise

### Error Correction
- **Disagreement is diagnostic**: Structured dissent reveals blind spots
- **Improves accuracy**: Explicit counterarguments surface weak points

### Scalability & Updateability
- **Lightweight**: Low overhead per expert
- **Modular**: New experts can be added without restructuring
- **Version-controlled**: New evidence integrates cleanly
- **Traceable**: Full audit trail of reasoning evolution

## Key Technologies / Resources

- LLM-assisted synthesis and reconciliation
- Structured input templates (signal alignment)
- Delphi consensus methodology
- Distributed cognition principles
- Version control for epistemic artefacts

## Current Standing & Next Steps

**Status:** Planning phase

- [ ] Select a pilot scientific question posed by a policy team (e.g., "What are the drivers of the current SEN crisis?")
- [ ] Design structured input template for expert contributions
- [ ] Implement LLM synthesis pipeline (consensus areas, divergence points, uncertainties)
- [ ] Build inline comment/feedback system for expert review
- [ ] Develop Delphi iteration protocol
- [ ] Define metrics for synthesis quality and convergence
- [ ] Recruit pilot SAC panel (target: 12 members)
- [ ] Run first complete cycle and evaluate

## Quick Links
- [Paper Draft](./paper.tex)

## Tasks

### Now
- TODO: [2026-01-29] Define pilot scientific question with policy team
- TODO: [2026-01-29] Design structured input template (position, evidence, confidence, counterarguments, references, expert nominations)
- TODO: [2026-01-29] Specify LLM synthesis prompt architecture

### Next
- TODO: [2026-01-29] Implement first synthesis prototype
- TODO: [2026-01-29] Design expert review interface with inline commenting
- TODO: [2026-01-29] Define convergence criteria for Delphi iterations

### Later
- TODO: [2026-01-29] Recruit pilot SAC panel
- TODO: [2026-01-29] Run end-to-end pilot with real policy question
- TODO: [2026-01-29] Evaluate against traditional SAC/Roundtable methods

## Milestones

- **M0 — Protocol locked**: Input template, synthesis prompts, and iteration rules specified
- **M1 — Prototype ready**: End-to-end pipeline runs on synthetic inputs
- **M2 — Pilot complete**: First real SAC question processed through full Delphi cycle
- **M3 — Evaluation**: Quantitative and qualitative comparison with traditional methods
- **M4 — Paper-ready**: Results, protocol documentation, and scalability analysis complete

## Research Context

This project aligns with **AI Flywheels** and complements `make_reviews_great_again` by applying similar multi-agent deliberation principles to scientific policy advice rather than peer review. Both projects explore how structured LLM-mediated synthesis can improve collective human reasoning at scale.

### Relation to Existing Work

| Aspect | Traditional SAC | Symphonia |
|--------|-----------------|-----------|
| Input format | Unstructured discussion | Structured templates |
| Synthesis | Human-mediated, labor-intensive | LLM-assisted, scalable |
| Disagreement | Often collapsed | Explicitly preserved |
| Traceability | Meeting notes | Full version history |
| Scalability | Limited by coordination cost | Modular, low marginal cost |
| Updateability | New reports required | Incremental integration |

## Figure Prompts (Nano Banana)

- "Distributed network of expert nodes feeding structured inputs into a central LLM synthesis layer, with feedback arrows representing Delphi iterations; clean vector style."
- "Timeline showing structured input → synthesis → review → revision cycles converging to a final consensus artefact with tracked confidence levels."
- "Comparison diagram: traditional SAC (linear, bottlenecked) vs Symphonia (parallel, distributed, with explicit divergence tracking)."

## Original Proposal

*Author: Ruaridh Mon-Williams, 29.06.25*

> Test this method. If effective, it forms the foundation for a scalable system of collaborative, high-trust scientific reporting methodologies and can support collective decision making.

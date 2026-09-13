// src/demos/research-ai-results.json
var research_ai_results_default = {
  fixture: {
    title: "How should UK university research teams use AI?",
    synthetic: true,
    method: "Scripted LLM-authored roleplay, run through an isolated authenticated application workflow. No live participants or empirical findings.",
    protocol: {
      panel_size: 8,
      rounds: 3,
      threshold: 0.8,
      minimum_responses: 8,
      stopping_rule: "Stop after round 3; report unresolved claims.",
      uncertainty_in_denominator: true
    },
    claims: [
      "Any AI-generated result used to support a research conclusion must have reproducible code and a named human reviewer.",
      "AI may run reversible computational tests without prior human approval when the team has agreed a budget and scope.",
      "At least 20% of a research team\u2019s AI computing budget should be reserved for exploratory hypotheses with a low initial probability of success.",
      "Every prompt, intermediate output and dataset used by research AI must be released publicly."
    ],
    question: "How should UK university research teams use AI to accelerate discovery while keeping findings reliable?",
    short_labels: [
      "Human review",
      "Bounded autonomy",
      "Exploration reserve",
      "Universal release"
    ],
    narratives: [
      "Eight fictional roles bring different priorities: reliable findings, research freedom, fair access and responsible use of resources. Four claims are extracted from their opening views and then kept unchanged.",
      "The first ratings show broad support for human review, mixed views on autonomous tests, a 4\u20134 split on the exploration reserve and early support for full disclosure.",
      "All eight support reproducible analysis with human review. Six support bounded autonomy; one disagrees and one still needs information. The 20% exploration reserve remains split 4\u20134. Seven reject universal release after considering confidentiality and the value of a focused reproducibility package."
    ],
    experts: [
      {
        id: "expert-1",
        role: "Computational biologist",
        proposal: "I want AI to generate and test hypotheses quickly. Published findings need code that another researcher can run and a named person responsible for checking it. Bounded computational experiments could run without individual approval. I support protected resources for unusual ideas. Full public records sound useful, though patient-derived data require care.",
        round2: {
          votes: [
            "Agree",
            "Agree",
            "Agree",
            "Agree"
          ],
          comments: [
            "Runnable code and a named reviewer make responsibility clear.",
            "A budget and a sandbox make these tests reversible in practice.",
            "Unusual biological hypotheses lose out when only near-term success is rewarded.",
            "Full traces seem the simplest way to make the workflow inspectable."
          ]
        },
        round3: {
          votes: [
            "Agree",
            "Agree",
            "Agree",
            "Disagree"
          ],
          comments: [
            "The engineer\u2019s point persuaded me to specify rerunning the analysis as part of review. I still agree.",
            "I still agree: enforce the agreed scope rather than seeking permission for each run.",
            "I retain support. Without a protected share, plausible short-term ideas consume everything.",
            "The governance specialist\u2019s example changed my view: an auditable record need not mean public release of protected data."
          ]
        }
      },
      {
        id: "expert-2",
        role: "Laboratory principal investigator",
        proposal: "AI can search broadly, but a senior researcher must own any conclusion. I initially want human approval before each experiment because a flawed objective can waste resources. I would protect some budget for exploratory hypotheses. Full release of all intermediate material may bury the important evidence.",
        round2: {
          votes: [
            "Agree",
            "Disagree",
            "Agree",
            "Disagree"
          ],
          comments: [
            "I need someone in the team to own each conclusion.",
            "I worry that a cheap computation can still push the project towards the wrong target.",
            "Exploration needs protection from immediate delivery pressure.",
            "Publishing every intermediate output adds noise and may expose unpublished work."
          ]
        },
        round3: {
          votes: [
            "Agree",
            "Agree",
            "Agree",
            "Disagree"
          ],
          comments: [
            "I retain support; the reviewer should have the relevant expertise and time.",
            "I changed from disagreement after the engineer distinguished bounded computation from wet-lab experiments. The agreed scope is the key safeguard.",
            "I still support the reserve, even though its opportunity cost remains real.",
            "I retain disagreement. A useful reproducibility package is different from publishing every abandoned intermediate output."
          ]
        }
      },
      {
        id: "expert-3",
        role: "Research software engineer",
        proposal: "Reproducible code matters more than polished explanations. I support sandboxed tests with spending limits and explicit scope. A mandatory 20% reserve seems inflexible across projects. I initially favour publishing all prompts and outputs so others can reconstruct the workflow.",
        round2: {
          votes: [
            "Agree",
            "Agree",
            "Disagree",
            "Agree"
          ],
          comments: [
            "Review must include rerunning the code, not just reading a generated report.",
            "I can enforce scope and spending limits in the execution environment.",
            "Infrastructure-heavy projects need flexibility; 20% is not always sensible.",
            "A complete trace would let me debug failures that selected reports omit."
          ]
        },
        round3: {
          votes: [
            "Agree",
            "Agree",
            "Disagree",
            "Disagree"
          ],
          comments: [
            "I still agree. A runnable workflow and a recorded review are concrete checks.",
            "I retain support for tests with enforced limits and recorded execution.",
            "I remain opposed to 20% for every team. The panel has not resolved differences in infrastructure needs.",
            "The confidentiality arguments changed my view. Complete internal logging can coexist with selective, justified public release."
          ]
        }
      },
      {
        id: "expert-4",
        role: "Doctoral researcher",
        proposal: "AI could let junior researchers explore ideas they cannot currently afford to test. I support a protected exploration budget and bounded autonomous tests. I worry a named reviewer requirement could create a sign-off bottleneck. I initially favour full disclosure of the process for equal access.",
        round2: {
          votes: [
            "Unable to judge \u2014 need more information",
            "Agree",
            "Agree",
            "Agree"
          ],
          comments: [
            "Who is qualified to review, and how much time will they have? I need more detail.",
            "Independent runs would let junior researchers test ideas without waiting for every meeting.",
            "Protected resources would help people with unconventional ideas.",
            "Universal release seems fairer than leaving access to the best-funded groups."
          ]
        },
        round3: {
          votes: [
            "Agree",
            "Agree",
            "Agree",
            "Agree"
          ],
          comments: [
            "I moved from uncertainty to agreement after the panel clarified that review should be resourced and specific to the analysis.",
            "I still support autonomy within the agreed scope; it does not remove accountability.",
            "I retain support because junior researchers otherwise struggle to protect speculative work.",
            "I still support public release as written. I recognise the restrictions raised, but think this policy should limit which datasets are used in the first place."
          ]
        }
      },
      {
        id: "expert-5",
        role: "Research integrity officer",
        proposal: "People must remain accountable for claims, with runnable analysis and documented checks. I am cautious about unapproved automated tests and want clear stopping rules. A fixed exploration percentage could reward activity over quality. Full public traces could help auditability but may reveal material that should remain confidential.",
        round2: {
          votes: [
            "Agree",
            "Disagree",
            "Disagree",
            "Agree"
          ],
          comments: [
            "The reviewer needs to check whether the conclusion follows from the analysis.",
            "I would require prior approval because scope boundaries can be ambiguous.",
            "A fixed reserve could fund poor hypotheses simply to meet a target.",
            "I favour complete records for accountability, while recognising confidentiality concerns."
          ]
        },
        round3: {
          votes: [
            "Agree",
            "Agree",
            "Disagree",
            "Disagree"
          ],
          comments: [
            "I retain support, with documented checks rather than a ceremonial sign-off.",
            "I changed my view: explicit scope and a budget are advance human approval of the class of tests. Out-of-scope work would still need review.",
            "I remain opposed. Good exploration should be funded on its merits rather than by a fixed fraction.",
            "I changed to disagreement. Mandatory publication could conflict with confidentiality without improving the reliability of the final conclusion."
          ]
        }
      },
      {
        id: "expert-6",
        role: "Data governance specialist",
        proposal: "Privacy and access conditions need to follow data through every AI step. A human reviewer should check the analysis and data handling. I cannot judge bounded autonomy without knowing how the boundaries are enforced. I oppose mandatory public release of every dataset and a fixed budget percentage.",
        round2: {
          votes: [
            "Agree",
            "Unable to judge \u2014 need more information",
            "Disagree",
            "Disagree"
          ],
          comments: [
            "Responsibility must include checking whether data use stays within its permissions.",
            "The statement does not tell me how scope and budget limits will be enforced.",
            "Sensitive-data projects may need to spend more on controlled infrastructure.",
            "Some datasets cannot be made public; the word every makes this unacceptable."
          ]
        },
        round3: {
          votes: [
            "Agree",
            "Unable to judge \u2014 need more information",
            "Disagree",
            "Disagree"
          ],
          comments: [
            "I still agree, provided reviewers check access conditions as well as numerical results.",
            "I remain unable to judge: enforceable boundaries depend on the actual data and execution environment.",
            "I retain disagreement; the same reserve is not appropriate for every project.",
            "I remain opposed. Public release of every dataset is incompatible with the restricted-data cases I raised."
          ]
        }
      },
      {
        id: "expert-7",
        role: "Research funding manager",
        proposal: "I want evidence that AI improves useful discovery, not simply the number of tests. Reproducibility and review should be funded. I support bounded computation but oppose a blanket exploration reserve when teams have different bottlenecks. I initially support full release as a condition of public funding.",
        round2: {
          votes: [
            "Agree",
            "Agree",
            "Disagree",
            "Agree"
          ],
          comments: [
            "Funders should expect analysis that others can reproduce and a responsible reviewer.",
            "A bounded test is different from spending money on a wet-lab experiment.",
            "Project-specific budgets are more defensible than one fixed percentage.",
            "Public funding should normally produce openly inspectable work."
          ]
        },
        round3: {
          votes: [
            "Agree",
            "Agree",
            "Disagree",
            "Disagree"
          ],
          comments: [
            "I retain support for a reproducible analysis and an accountable reviewer.",
            "I still agree because the proposal is limited to reversible computation within agreed resources.",
            "I remain opposed to the fixed percentage. The disagreement is about allocation rules, not whether exploration has value.",
            "I changed my view after distinguishing open outputs from unrestricted data release. Auditability does not require every input to be public."
          ]
        }
      },
      {
        id: "expert-8",
        role: "Reproducibility researcher",
        proposal: "Independent teams should be able to reproduce the analysis behind a result. I support human review but initially need clearer requirements for the reviewer. I am unsure whether autonomous tests can avoid subtle data leakage. I favour a protected exploration budget. I initially support publishing every trace, though volume could be a problem.",
        round2: {
          votes: [
            "Unable to judge \u2014 need more information",
            "Unable to judge \u2014 need more information",
            "Agree",
            "Agree"
          ],
          comments: [
            "A named reviewer alone is not enough; I want the check itself documented.",
            "I cannot tell whether a reversible test can still contaminate later evaluation.",
            "Replication and unconventional hypotheses need room even when immediate success is unlikely.",
            "Complete traces might expose selective reporting, so I initially support release."
          ]
        },
        round3: {
          votes: [
            "Agree",
            "Disagree",
            "Agree",
            "Disagree"
          ],
          comments: [
            "I moved to agreement after reviewing the software engineer\u2019s practical description of rerunning code and recording checks.",
            "I moved from uncertainty to disagreement. A bounded run can still leak evaluation data into future model choices; the statement does not address that risk.",
            "I retain support. The funding manager\u2019s flexibility argument does not solve the persistent neglect of unusual ideas.",
            "I changed to disagreement. Releasing a clear reproducibility package is more useful than an indiscriminate archive of sensitive or misleading intermediate material."
          ]
        }
      }
    ]
  },
  rounds: [
    {
      id: 1,
      round_number: 1,
      synthesis: "<p>Scripted synthetic panel. Eight fictional experts; no empirical evidence. Threshold 80%; stop after three rounds.</p><p>Claim 1: <strong>Any AI-generated result used to support a research conclusion must have reproducible code and a named human reviewer.</strong></p><p>Candidate claim extracted from the proposals; not yet rated.</p><p>Claim 2: <strong>AI may run reversible computational tests without prior human approval when the team has agreed a budget and scope.</strong></p><p>Candidate claim extracted from the proposals; not yet rated.</p><p>Claim 3: <strong>At least 20% of a research team\u2019s AI computing budget should be reserved for exploratory hypotheses with a low initial probability of success.</strong></p><p>Candidate claim extracted from the proposals; not yet rated.</p><p>Claim 4: <strong>Every prompt, intermediate output and dataset used by research AI must be released publicly.</strong></p><p>Candidate claim extracted from the proposals; not yet rated.</p>",
      synthesis_published: true,
      synthesis_json: {},
      is_active: false,
      questions: [
        {
          label: "How should UK university research teams use AI to accelerate discovery while keeping findings reliable?",
          requireEvidence: true,
          requireCounterarguments: true,
          requireConfidence: true,
          questionId: "proposal",
          sectionTitle: null,
          helpText: null,
          groupPrompt: null,
          optional: false,
          conditionalOnQuestionId: null,
          conditionalOnOption: null,
          inputType: "textarea",
          options: null,
          allowUnsure: null,
          maxSelections: null,
          minValue: null,
          maxValue: null,
          minLabel: null,
          midLabel: null,
          maxLabel: null,
          importedFromQuestionnaire: null,
          fieldType: null,
          rows: null,
          placeholder: null
        }
      ],
      context_settings: {
        synthesis_published: true
      },
      convergence_score: null,
      response_count: 8,
      draft_count: 0
    },
    {
      id: 2,
      round_number: 2,
      synthesis: "<p>Scripted synthetic panel. Eight fictional experts; no empirical evidence. Threshold 80%; stop after three rounds.</p><p>Claim 1: <strong>Any AI-generated result used to support a research conclusion must have reproducible code and a named human reviewer.</strong></p><p>Computational biologist \u2014 Agree: Runnable code and a named reviewer make responsibility clear.</p><p>Laboratory principal investigator \u2014 Agree: I need someone in the team to own each conclusion.</p><p>Research software engineer \u2014 Agree: Review must include rerunning the code, not just reading a generated report.</p><p>Doctoral researcher \u2014 Unable to judge \u2014 need more information: Who is qualified to review, and how much time will they have? I need more detail.</p><p>Research integrity officer \u2014 Agree: The reviewer needs to check whether the conclusion follows from the analysis.</p><p>Data governance specialist \u2014 Agree: Responsibility must include checking whether data use stays within its permissions.</p><p>Research funding manager \u2014 Agree: Funders should expect analysis that others can reproduce and a responsible reviewer.</p><p>Reproducibility researcher \u2014 Unable to judge \u2014 need more information: A named reviewer alone is not enough; I want the check itself documented.</p><p>Claim 2: <strong>AI may run reversible computational tests without prior human approval when the team has agreed a budget and scope.</strong></p><p>Computational biologist \u2014 Agree: A budget and a sandbox make these tests reversible in practice.</p><p>Laboratory principal investigator \u2014 Disagree: I worry that a cheap computation can still push the project towards the wrong target.</p><p>Research software engineer \u2014 Agree: I can enforce scope and spending limits in the execution environment.</p><p>Doctoral researcher \u2014 Agree: Independent runs would let junior researchers test ideas without waiting for every meeting.</p><p>Research integrity officer \u2014 Disagree: I would require prior approval because scope boundaries can be ambiguous.</p><p>Data governance specialist \u2014 Unable to judge \u2014 need more information: The statement does not tell me how scope and budget limits will be enforced.</p><p>Research funding manager \u2014 Agree: A bounded test is different from spending money on a wet-lab experiment.</p><p>Reproducibility researcher \u2014 Unable to judge \u2014 need more information: I cannot tell whether a reversible test can still contaminate later evaluation.</p><p>Claim 3: <strong>At least 20% of a research team\u2019s AI computing budget should be reserved for exploratory hypotheses with a low initial probability of success.</strong></p><p>Computational biologist \u2014 Agree: Unusual biological hypotheses lose out when only near-term success is rewarded.</p><p>Laboratory principal investigator \u2014 Agree: Exploration needs protection from immediate delivery pressure.</p><p>Research software engineer \u2014 Disagree: Infrastructure-heavy projects need flexibility; 20% is not always sensible.</p><p>Doctoral researcher \u2014 Agree: Protected resources would help people with unconventional ideas.</p><p>Research integrity officer \u2014 Disagree: A fixed reserve could fund poor hypotheses simply to meet a target.</p><p>Data governance specialist \u2014 Disagree: Sensitive-data projects may need to spend more on controlled infrastructure.</p><p>Research funding manager \u2014 Disagree: Project-specific budgets are more defensible than one fixed percentage.</p><p>Reproducibility researcher \u2014 Agree: Replication and unconventional hypotheses need room even when immediate success is unlikely.</p><p>Claim 4: <strong>Every prompt, intermediate output and dataset used by research AI must be released publicly.</strong></p><p>Computational biologist \u2014 Agree: Full traces seem the simplest way to make the workflow inspectable.</p><p>Laboratory principal investigator \u2014 Disagree: Publishing every intermediate output adds noise and may expose unpublished work.</p><p>Research software engineer \u2014 Agree: A complete trace would let me debug failures that selected reports omit.</p><p>Doctoral researcher \u2014 Agree: Universal release seems fairer than leaving access to the best-funded groups.</p><p>Research integrity officer \u2014 Agree: I favour complete records for accountability, while recognising confidentiality concerns.</p><p>Data governance specialist \u2014 Disagree: Some datasets cannot be made public; the word every makes this unacceptable.</p><p>Research funding manager \u2014 Agree: Public funding should normally produce openly inspectable work.</p><p>Reproducibility researcher \u2014 Agree: Complete traces might expose selective reporting, so I initially support release.</p>",
      synthesis_published: true,
      synthesis_json: {},
      is_active: false,
      questions: [
        {
          questionId: "claim_1_response",
          sectionTitle: "Claim 1: Any AI-generated result used to support a research conclusion must have reproducible code and a named human reviewer.",
          label: "Your response",
          inputType: "single_select",
          options: [
            "Strongly agree",
            "Agree",
            "Neither agree nor disagree",
            "Disagree",
            "Strongly disagree",
            "Unable to judge \u2014 need more information"
          ],
          optional: false
        },
        {
          questionId: "claim_1_comment",
          sectionTitle: "Claim 1: Any AI-generated result used to support a research conclusion must have reproducible code and a named human reviewer.",
          label: "Explain your position",
          inputType: "textarea",
          optional: true
        },
        {
          questionId: "claim_2_response",
          sectionTitle: "Claim 2: AI may run reversible computational tests without prior human approval when the team has agreed a budget and scope.",
          label: "Your response",
          inputType: "single_select",
          options: [
            "Strongly agree",
            "Agree",
            "Neither agree nor disagree",
            "Disagree",
            "Strongly disagree",
            "Unable to judge \u2014 need more information"
          ],
          optional: false
        },
        {
          questionId: "claim_2_comment",
          sectionTitle: "Claim 2: AI may run reversible computational tests without prior human approval when the team has agreed a budget and scope.",
          label: "Explain your position",
          inputType: "textarea",
          optional: true
        },
        {
          questionId: "claim_3_response",
          sectionTitle: "Claim 3: At least 20% of a research team\u2019s AI computing budget should be reserved for exploratory hypotheses with a low initial probability of success.",
          label: "Your response",
          inputType: "single_select",
          options: [
            "Strongly agree",
            "Agree",
            "Neither agree nor disagree",
            "Disagree",
            "Strongly disagree",
            "Unable to judge \u2014 need more information"
          ],
          optional: false
        },
        {
          questionId: "claim_3_comment",
          sectionTitle: "Claim 3: At least 20% of a research team\u2019s AI computing budget should be reserved for exploratory hypotheses with a low initial probability of success.",
          label: "Explain your position",
          inputType: "textarea",
          optional: true
        },
        {
          questionId: "claim_4_response",
          sectionTitle: "Claim 4: Every prompt, intermediate output and dataset used by research AI must be released publicly.",
          label: "Your response",
          inputType: "single_select",
          options: [
            "Strongly agree",
            "Agree",
            "Neither agree nor disagree",
            "Disagree",
            "Strongly disagree",
            "Unable to judge \u2014 need more information"
          ],
          optional: false
        },
        {
          questionId: "claim_4_comment",
          sectionTitle: "Claim 4: Every prompt, intermediate output and dataset used by research AI must be released publicly.",
          label: "Explain your position",
          inputType: "textarea",
          optional: true
        }
      ],
      context_settings: {
        synthesis_published: true
      },
      convergence_score: null,
      response_count: 8,
      draft_count: 0
    },
    {
      id: 3,
      round_number: 3,
      synthesis: "<p>Scripted synthetic panel. Eight fictional experts; no empirical evidence. Threshold 80%; stop after three rounds.</p><p>Claim 1: <strong>Any AI-generated result used to support a research conclusion must have reproducible code and a named human reviewer.</strong></p><p>Computational biologist \u2014 Agree: The engineer\u2019s point persuaded me to specify rerunning the analysis as part of review. I still agree.</p><p>Laboratory principal investigator \u2014 Agree: I retain support; the reviewer should have the relevant expertise and time.</p><p>Research software engineer \u2014 Agree: I still agree. A runnable workflow and a recorded review are concrete checks.</p><p>Doctoral researcher \u2014 Agree: I moved from uncertainty to agreement after the panel clarified that review should be resourced and specific to the analysis.</p><p>Research integrity officer \u2014 Agree: I retain support, with documented checks rather than a ceremonial sign-off.</p><p>Data governance specialist \u2014 Agree: I still agree, provided reviewers check access conditions as well as numerical results.</p><p>Research funding manager \u2014 Agree: I retain support for a reproducible analysis and an accountable reviewer.</p><p>Reproducibility researcher \u2014 Agree: I moved to agreement after reviewing the software engineer\u2019s practical description of rerunning code and recording checks.</p><p>Claim 2: <strong>AI may run reversible computational tests without prior human approval when the team has agreed a budget and scope.</strong></p><p>Computational biologist \u2014 Agree: I still agree: enforce the agreed scope rather than seeking permission for each run.</p><p>Laboratory principal investigator \u2014 Agree: I changed from disagreement after the engineer distinguished bounded computation from wet-lab experiments. The agreed scope is the key safeguard.</p><p>Research software engineer \u2014 Agree: I retain support for tests with enforced limits and recorded execution.</p><p>Doctoral researcher \u2014 Agree: I still support autonomy within the agreed scope; it does not remove accountability.</p><p>Research integrity officer \u2014 Agree: I changed my view: explicit scope and a budget are advance human approval of the class of tests. Out-of-scope work would still need review.</p><p>Data governance specialist \u2014 Unable to judge \u2014 need more information: I remain unable to judge: enforceable boundaries depend on the actual data and execution environment.</p><p>Research funding manager \u2014 Agree: I still agree because the proposal is limited to reversible computation within agreed resources.</p><p>Reproducibility researcher \u2014 Disagree: I moved from uncertainty to disagreement. A bounded run can still leak evaluation data into future model choices; the statement does not address that risk.</p><p>Claim 3: <strong>At least 20% of a research team\u2019s AI computing budget should be reserved for exploratory hypotheses with a low initial probability of success.</strong></p><p>Computational biologist \u2014 Agree: I retain support. Without a protected share, plausible short-term ideas consume everything.</p><p>Laboratory principal investigator \u2014 Agree: I still support the reserve, even though its opportunity cost remains real.</p><p>Research software engineer \u2014 Disagree: I remain opposed to 20% for every team. The panel has not resolved differences in infrastructure needs.</p><p>Doctoral researcher \u2014 Agree: I retain support because junior researchers otherwise struggle to protect speculative work.</p><p>Research integrity officer \u2014 Disagree: I remain opposed. Good exploration should be funded on its merits rather than by a fixed fraction.</p><p>Data governance specialist \u2014 Disagree: I retain disagreement; the same reserve is not appropriate for every project.</p><p>Research funding manager \u2014 Disagree: I remain opposed to the fixed percentage. The disagreement is about allocation rules, not whether exploration has value.</p><p>Reproducibility researcher \u2014 Agree: I retain support. The funding manager\u2019s flexibility argument does not solve the persistent neglect of unusual ideas.</p><p>Claim 4: <strong>Every prompt, intermediate output and dataset used by research AI must be released publicly.</strong></p><p>Computational biologist \u2014 Disagree: The governance specialist\u2019s example changed my view: an auditable record need not mean public release of protected data.</p><p>Laboratory principal investigator \u2014 Disagree: I retain disagreement. A useful reproducibility package is different from publishing every abandoned intermediate output.</p><p>Research software engineer \u2014 Disagree: The confidentiality arguments changed my view. Complete internal logging can coexist with selective, justified public release.</p><p>Doctoral researcher \u2014 Agree: I still support public release as written. I recognise the restrictions raised, but think this policy should limit which datasets are used in the first place.</p><p>Research integrity officer \u2014 Disagree: I changed to disagreement. Mandatory publication could conflict with confidentiality without improving the reliability of the final conclusion.</p><p>Data governance specialist \u2014 Disagree: I remain opposed. Public release of every dataset is incompatible with the restricted-data cases I raised.</p><p>Research funding manager \u2014 Disagree: I changed my view after distinguishing open outputs from unrestricted data release. Auditability does not require every input to be public.</p><p>Reproducibility researcher \u2014 Disagree: I changed to disagreement. Releasing a clear reproducibility package is more useful than an indiscriminate archive of sensitive or misleading intermediate material.</p>",
      synthesis_published: true,
      synthesis_json: {},
      is_active: true,
      questions: [
        {
          questionId: "claim_1_response",
          sectionTitle: "Claim 1: Any AI-generated result used to support a research conclusion must have reproducible code and a named human reviewer.",
          label: "Your response",
          inputType: "single_select",
          options: [
            "Strongly agree",
            "Agree",
            "Neither agree nor disagree",
            "Disagree",
            "Strongly disagree",
            "Unable to judge \u2014 need more information"
          ],
          optional: false
        },
        {
          questionId: "claim_1_comment",
          sectionTitle: "Claim 1: Any AI-generated result used to support a research conclusion must have reproducible code and a named human reviewer.",
          label: "Explain your position",
          inputType: "textarea",
          optional: true
        },
        {
          questionId: "claim_2_response",
          sectionTitle: "Claim 2: AI may run reversible computational tests without prior human approval when the team has agreed a budget and scope.",
          label: "Your response",
          inputType: "single_select",
          options: [
            "Strongly agree",
            "Agree",
            "Neither agree nor disagree",
            "Disagree",
            "Strongly disagree",
            "Unable to judge \u2014 need more information"
          ],
          optional: false
        },
        {
          questionId: "claim_2_comment",
          sectionTitle: "Claim 2: AI may run reversible computational tests without prior human approval when the team has agreed a budget and scope.",
          label: "Explain your position",
          inputType: "textarea",
          optional: true
        },
        {
          questionId: "claim_3_response",
          sectionTitle: "Claim 3: At least 20% of a research team\u2019s AI computing budget should be reserved for exploratory hypotheses with a low initial probability of success.",
          label: "Your response",
          inputType: "single_select",
          options: [
            "Strongly agree",
            "Agree",
            "Neither agree nor disagree",
            "Disagree",
            "Strongly disagree",
            "Unable to judge \u2014 need more information"
          ],
          optional: false
        },
        {
          questionId: "claim_3_comment",
          sectionTitle: "Claim 3: At least 20% of a research team\u2019s AI computing budget should be reserved for exploratory hypotheses with a low initial probability of success.",
          label: "Explain your position",
          inputType: "textarea",
          optional: true
        },
        {
          questionId: "claim_4_response",
          sectionTitle: "Claim 4: Every prompt, intermediate output and dataset used by research AI must be released publicly.",
          label: "Your response",
          inputType: "single_select",
          options: [
            "Strongly agree",
            "Agree",
            "Neither agree nor disagree",
            "Disagree",
            "Strongly disagree",
            "Unable to judge \u2014 need more information"
          ],
          optional: false
        },
        {
          questionId: "claim_4_comment",
          sectionTitle: "Claim 4: Every prompt, intermediate output and dataset used by research AI must be released publicly.",
          label: "Explain your position",
          inputType: "textarea",
          optional: true
        }
      ],
      context_settings: {
        synthesis_published: true
      },
      convergence_score: null,
      response_count: 8,
      draft_count: 0
    }
  ],
  responses: [
    {
      id: 1,
      round_number: 1,
      synthesis: "<p>Scripted synthetic panel. Eight fictional experts; no empirical evidence. Threshold 80%; stop after three rounds.</p><p>Claim 1: <strong>Any AI-generated result used to support a research conclusion must have reproducible code and a named human reviewer.</strong></p><p>Candidate claim extracted from the proposals; not yet rated.</p><p>Claim 2: <strong>AI may run reversible computational tests without prior human approval when the team has agreed a budget and scope.</strong></p><p>Candidate claim extracted from the proposals; not yet rated.</p><p>Claim 3: <strong>At least 20% of a research team\u2019s AI computing budget should be reserved for exploratory hypotheses with a low initial probability of success.</strong></p><p>Candidate claim extracted from the proposals; not yet rated.</p><p>Claim 4: <strong>Every prompt, intermediate output and dataset used by research AI must be released publicly.</strong></p><p>Candidate claim extracted from the proposals; not yet rated.</p>",
      synthesis_published: true,
      is_active: false,
      responses: [
        {
          id: 1,
          answers: {
            q1: {
              position: "I want AI to generate and test hypotheses quickly. Published findings need code that another researcher can run and a named person responsible for checking it. Bounded computational experiments could run without individual approval. I support protected resources for unusual ideas. Full public records sound useful, though patient-derived data require care."
            }
          },
          email: "synthetic-expert-1",
          timestamp: "2026-09-07T18:16:42.019958",
          version: 1
        },
        {
          id: 2,
          answers: {
            q1: {
              position: "AI can search broadly, but a senior researcher must own any conclusion. I initially want human approval before each experiment because a flawed objective can waste resources. I would protect some budget for exploratory hypotheses. Full release of all intermediate material may bury the important evidence."
            }
          },
          email: "synthetic-expert-2",
          timestamp: "2026-09-07T18:16:42.031741",
          version: 1
        },
        {
          id: 3,
          answers: {
            q1: {
              position: "Reproducible code matters more than polished explanations. I support sandboxed tests with spending limits and explicit scope. A mandatory 20% reserve seems inflexible across projects. I initially favour publishing all prompts and outputs so others can reconstruct the workflow."
            }
          },
          email: "synthetic-expert-3",
          timestamp: "2026-09-07T18:16:42.039633",
          version: 1
        },
        {
          id: 4,
          answers: {
            q1: {
              position: "AI could let junior researchers explore ideas they cannot currently afford to test. I support a protected exploration budget and bounded autonomous tests. I worry a named reviewer requirement could create a sign-off bottleneck. I initially favour full disclosure of the process for equal access."
            }
          },
          email: "synthetic-expert-4",
          timestamp: "2026-09-07T18:16:42.048004",
          version: 1
        },
        {
          id: 5,
          answers: {
            q1: {
              position: "People must remain accountable for claims, with runnable analysis and documented checks. I am cautious about unapproved automated tests and want clear stopping rules. A fixed exploration percentage could reward activity over quality. Full public traces could help auditability but may reveal material that should remain confidential."
            }
          },
          email: "synthetic-expert-5",
          timestamp: "2026-09-07T18:16:42.057903",
          version: 1
        },
        {
          id: 6,
          answers: {
            q1: {
              position: "Privacy and access conditions need to follow data through every AI step. A human reviewer should check the analysis and data handling. I cannot judge bounded autonomy without knowing how the boundaries are enforced. I oppose mandatory public release of every dataset and a fixed budget percentage."
            }
          },
          email: "synthetic-expert-6",
          timestamp: "2026-09-07T18:16:42.065822",
          version: 1
        },
        {
          id: 7,
          answers: {
            q1: {
              position: "I want evidence that AI improves useful discovery, not simply the number of tests. Reproducibility and review should be funded. I support bounded computation but oppose a blanket exploration reserve when teams have different bottlenecks. I initially support full release as a condition of public funding."
            }
          },
          email: "synthetic-expert-7",
          timestamp: "2026-09-07T18:16:42.073133",
          version: 1
        },
        {
          id: 8,
          answers: {
            q1: {
              position: "Independent teams should be able to reproduce the analysis behind a result. I support human review but initially need clearer requirements for the reviewer. I am unsure whether autonomous tests can avoid subtle data leakage. I favour a protected exploration budget. I initially support publishing every trace, though volume could be a problem."
            }
          },
          email: "synthetic-expert-8",
          timestamp: "2026-09-07T18:16:42.081603",
          version: 1
        }
      ]
    },
    {
      id: 2,
      round_number: 2,
      synthesis: "<p>Scripted synthetic panel. Eight fictional experts; no empirical evidence. Threshold 80%; stop after three rounds.</p><p>Claim 1: <strong>Any AI-generated result used to support a research conclusion must have reproducible code and a named human reviewer.</strong></p><p>Computational biologist \u2014 Agree: Runnable code and a named reviewer make responsibility clear.</p><p>Laboratory principal investigator \u2014 Agree: I need someone in the team to own each conclusion.</p><p>Research software engineer \u2014 Agree: Review must include rerunning the code, not just reading a generated report.</p><p>Doctoral researcher \u2014 Unable to judge \u2014 need more information: Who is qualified to review, and how much time will they have? I need more detail.</p><p>Research integrity officer \u2014 Agree: The reviewer needs to check whether the conclusion follows from the analysis.</p><p>Data governance specialist \u2014 Agree: Responsibility must include checking whether data use stays within its permissions.</p><p>Research funding manager \u2014 Agree: Funders should expect analysis that others can reproduce and a responsible reviewer.</p><p>Reproducibility researcher \u2014 Unable to judge \u2014 need more information: A named reviewer alone is not enough; I want the check itself documented.</p><p>Claim 2: <strong>AI may run reversible computational tests without prior human approval when the team has agreed a budget and scope.</strong></p><p>Computational biologist \u2014 Agree: A budget and a sandbox make these tests reversible in practice.</p><p>Laboratory principal investigator \u2014 Disagree: I worry that a cheap computation can still push the project towards the wrong target.</p><p>Research software engineer \u2014 Agree: I can enforce scope and spending limits in the execution environment.</p><p>Doctoral researcher \u2014 Agree: Independent runs would let junior researchers test ideas without waiting for every meeting.</p><p>Research integrity officer \u2014 Disagree: I would require prior approval because scope boundaries can be ambiguous.</p><p>Data governance specialist \u2014 Unable to judge \u2014 need more information: The statement does not tell me how scope and budget limits will be enforced.</p><p>Research funding manager \u2014 Agree: A bounded test is different from spending money on a wet-lab experiment.</p><p>Reproducibility researcher \u2014 Unable to judge \u2014 need more information: I cannot tell whether a reversible test can still contaminate later evaluation.</p><p>Claim 3: <strong>At least 20% of a research team\u2019s AI computing budget should be reserved for exploratory hypotheses with a low initial probability of success.</strong></p><p>Computational biologist \u2014 Agree: Unusual biological hypotheses lose out when only near-term success is rewarded.</p><p>Laboratory principal investigator \u2014 Agree: Exploration needs protection from immediate delivery pressure.</p><p>Research software engineer \u2014 Disagree: Infrastructure-heavy projects need flexibility; 20% is not always sensible.</p><p>Doctoral researcher \u2014 Agree: Protected resources would help people with unconventional ideas.</p><p>Research integrity officer \u2014 Disagree: A fixed reserve could fund poor hypotheses simply to meet a target.</p><p>Data governance specialist \u2014 Disagree: Sensitive-data projects may need to spend more on controlled infrastructure.</p><p>Research funding manager \u2014 Disagree: Project-specific budgets are more defensible than one fixed percentage.</p><p>Reproducibility researcher \u2014 Agree: Replication and unconventional hypotheses need room even when immediate success is unlikely.</p><p>Claim 4: <strong>Every prompt, intermediate output and dataset used by research AI must be released publicly.</strong></p><p>Computational biologist \u2014 Agree: Full traces seem the simplest way to make the workflow inspectable.</p><p>Laboratory principal investigator \u2014 Disagree: Publishing every intermediate output adds noise and may expose unpublished work.</p><p>Research software engineer \u2014 Agree: A complete trace would let me debug failures that selected reports omit.</p><p>Doctoral researcher \u2014 Agree: Universal release seems fairer than leaving access to the best-funded groups.</p><p>Research integrity officer \u2014 Agree: I favour complete records for accountability, while recognising confidentiality concerns.</p><p>Data governance specialist \u2014 Disagree: Some datasets cannot be made public; the word every makes this unacceptable.</p><p>Research funding manager \u2014 Agree: Public funding should normally produce openly inspectable work.</p><p>Reproducibility researcher \u2014 Agree: Complete traces might expose selective reporting, so I initially support release.</p>",
      synthesis_published: true,
      is_active: false,
      responses: [
        {
          id: 9,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "Runnable code and a named reviewer make responsibility clear."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "A budget and a sandbox make these tests reversible in practice."
            },
            q5: {
              position: "Agree"
            },
            q6: {
              position: "Unusual biological hypotheses lose out when only near-term success is rewarded."
            },
            q7: {
              position: "Agree"
            },
            q8: {
              position: "Full traces seem the simplest way to make the workflow inspectable."
            }
          },
          email: "synthetic-expert-1",
          timestamp: "2026-09-07T18:16:42.145226",
          version: 1
        },
        {
          id: 10,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "I need someone in the team to own each conclusion."
            },
            q3: {
              position: "Disagree"
            },
            q4: {
              position: "I worry that a cheap computation can still push the project towards the wrong target."
            },
            q5: {
              position: "Agree"
            },
            q6: {
              position: "Exploration needs protection from immediate delivery pressure."
            },
            q7: {
              position: "Disagree"
            },
            q8: {
              position: "Publishing every intermediate output adds noise and may expose unpublished work."
            }
          },
          email: "synthetic-expert-2",
          timestamp: "2026-09-07T18:16:42.176335",
          version: 1
        },
        {
          id: 11,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "Review must include rerunning the code, not just reading a generated report."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "I can enforce scope and spending limits in the execution environment."
            },
            q5: {
              position: "Disagree"
            },
            q6: {
              position: "Infrastructure-heavy projects need flexibility; 20% is not always sensible."
            },
            q7: {
              position: "Agree"
            },
            q8: {
              position: "A complete trace would let me debug failures that selected reports omit."
            }
          },
          email: "synthetic-expert-3",
          timestamp: "2026-09-07T18:16:42.186174",
          version: 1
        },
        {
          id: 12,
          answers: {
            q1: {
              position: "Unable to judge \u2014 need more information"
            },
            q2: {
              position: "Who is qualified to review, and how much time will they have? I need more detail."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "Independent runs would let junior researchers test ideas without waiting for every meeting."
            },
            q5: {
              position: "Agree"
            },
            q6: {
              position: "Protected resources would help people with unconventional ideas."
            },
            q7: {
              position: "Agree"
            },
            q8: {
              position: "Universal release seems fairer than leaving access to the best-funded groups."
            }
          },
          email: "synthetic-expert-4",
          timestamp: "2026-09-07T18:16:42.207128",
          version: 1
        },
        {
          id: 13,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "The reviewer needs to check whether the conclusion follows from the analysis."
            },
            q3: {
              position: "Disagree"
            },
            q4: {
              position: "I would require prior approval because scope boundaries can be ambiguous."
            },
            q5: {
              position: "Disagree"
            },
            q6: {
              position: "A fixed reserve could fund poor hypotheses simply to meet a target."
            },
            q7: {
              position: "Agree"
            },
            q8: {
              position: "I favour complete records for accountability, while recognising confidentiality concerns."
            }
          },
          email: "synthetic-expert-5",
          timestamp: "2026-09-07T18:16:42.213716",
          version: 1
        },
        {
          id: 14,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "Responsibility must include checking whether data use stays within its permissions."
            },
            q3: {
              position: "Unable to judge \u2014 need more information"
            },
            q4: {
              position: "The statement does not tell me how scope and budget limits will be enforced."
            },
            q5: {
              position: "Disagree"
            },
            q6: {
              position: "Sensitive-data projects may need to spend more on controlled infrastructure."
            },
            q7: {
              position: "Disagree"
            },
            q8: {
              position: "Some datasets cannot be made public; the word every makes this unacceptable."
            }
          },
          email: "synthetic-expert-6",
          timestamp: "2026-09-07T18:16:42.220801",
          version: 1
        },
        {
          id: 15,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "Funders should expect analysis that others can reproduce and a responsible reviewer."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "A bounded test is different from spending money on a wet-lab experiment."
            },
            q5: {
              position: "Disagree"
            },
            q6: {
              position: "Project-specific budgets are more defensible than one fixed percentage."
            },
            q7: {
              position: "Agree"
            },
            q8: {
              position: "Public funding should normally produce openly inspectable work."
            }
          },
          email: "synthetic-expert-7",
          timestamp: "2026-09-07T18:16:42.227723",
          version: 1
        },
        {
          id: 16,
          answers: {
            q1: {
              position: "Unable to judge \u2014 need more information"
            },
            q2: {
              position: "A named reviewer alone is not enough; I want the check itself documented."
            },
            q3: {
              position: "Unable to judge \u2014 need more information"
            },
            q4: {
              position: "I cannot tell whether a reversible test can still contaminate later evaluation."
            },
            q5: {
              position: "Agree"
            },
            q6: {
              position: "Replication and unconventional hypotheses need room even when immediate success is unlikely."
            },
            q7: {
              position: "Agree"
            },
            q8: {
              position: "Complete traces might expose selective reporting, so I initially support release."
            }
          },
          email: "synthetic-expert-8",
          timestamp: "2026-09-07T18:16:42.234313",
          version: 1
        }
      ]
    },
    {
      id: 3,
      round_number: 3,
      synthesis: "<p>Scripted synthetic panel. Eight fictional experts; no empirical evidence. Threshold 80%; stop after three rounds.</p><p>Claim 1: <strong>Any AI-generated result used to support a research conclusion must have reproducible code and a named human reviewer.</strong></p><p>Computational biologist \u2014 Agree: The engineer\u2019s point persuaded me to specify rerunning the analysis as part of review. I still agree.</p><p>Laboratory principal investigator \u2014 Agree: I retain support; the reviewer should have the relevant expertise and time.</p><p>Research software engineer \u2014 Agree: I still agree. A runnable workflow and a recorded review are concrete checks.</p><p>Doctoral researcher \u2014 Agree: I moved from uncertainty to agreement after the panel clarified that review should be resourced and specific to the analysis.</p><p>Research integrity officer \u2014 Agree: I retain support, with documented checks rather than a ceremonial sign-off.</p><p>Data governance specialist \u2014 Agree: I still agree, provided reviewers check access conditions as well as numerical results.</p><p>Research funding manager \u2014 Agree: I retain support for a reproducible analysis and an accountable reviewer.</p><p>Reproducibility researcher \u2014 Agree: I moved to agreement after reviewing the software engineer\u2019s practical description of rerunning code and recording checks.</p><p>Claim 2: <strong>AI may run reversible computational tests without prior human approval when the team has agreed a budget and scope.</strong></p><p>Computational biologist \u2014 Agree: I still agree: enforce the agreed scope rather than seeking permission for each run.</p><p>Laboratory principal investigator \u2014 Agree: I changed from disagreement after the engineer distinguished bounded computation from wet-lab experiments. The agreed scope is the key safeguard.</p><p>Research software engineer \u2014 Agree: I retain support for tests with enforced limits and recorded execution.</p><p>Doctoral researcher \u2014 Agree: I still support autonomy within the agreed scope; it does not remove accountability.</p><p>Research integrity officer \u2014 Agree: I changed my view: explicit scope and a budget are advance human approval of the class of tests. Out-of-scope work would still need review.</p><p>Data governance specialist \u2014 Unable to judge \u2014 need more information: I remain unable to judge: enforceable boundaries depend on the actual data and execution environment.</p><p>Research funding manager \u2014 Agree: I still agree because the proposal is limited to reversible computation within agreed resources.</p><p>Reproducibility researcher \u2014 Disagree: I moved from uncertainty to disagreement. A bounded run can still leak evaluation data into future model choices; the statement does not address that risk.</p><p>Claim 3: <strong>At least 20% of a research team\u2019s AI computing budget should be reserved for exploratory hypotheses with a low initial probability of success.</strong></p><p>Computational biologist \u2014 Agree: I retain support. Without a protected share, plausible short-term ideas consume everything.</p><p>Laboratory principal investigator \u2014 Agree: I still support the reserve, even though its opportunity cost remains real.</p><p>Research software engineer \u2014 Disagree: I remain opposed to 20% for every team. The panel has not resolved differences in infrastructure needs.</p><p>Doctoral researcher \u2014 Agree: I retain support because junior researchers otherwise struggle to protect speculative work.</p><p>Research integrity officer \u2014 Disagree: I remain opposed. Good exploration should be funded on its merits rather than by a fixed fraction.</p><p>Data governance specialist \u2014 Disagree: I retain disagreement; the same reserve is not appropriate for every project.</p><p>Research funding manager \u2014 Disagree: I remain opposed to the fixed percentage. The disagreement is about allocation rules, not whether exploration has value.</p><p>Reproducibility researcher \u2014 Agree: I retain support. The funding manager\u2019s flexibility argument does not solve the persistent neglect of unusual ideas.</p><p>Claim 4: <strong>Every prompt, intermediate output and dataset used by research AI must be released publicly.</strong></p><p>Computational biologist \u2014 Disagree: The governance specialist\u2019s example changed my view: an auditable record need not mean public release of protected data.</p><p>Laboratory principal investigator \u2014 Disagree: I retain disagreement. A useful reproducibility package is different from publishing every abandoned intermediate output.</p><p>Research software engineer \u2014 Disagree: The confidentiality arguments changed my view. Complete internal logging can coexist with selective, justified public release.</p><p>Doctoral researcher \u2014 Agree: I still support public release as written. I recognise the restrictions raised, but think this policy should limit which datasets are used in the first place.</p><p>Research integrity officer \u2014 Disagree: I changed to disagreement. Mandatory publication could conflict with confidentiality without improving the reliability of the final conclusion.</p><p>Data governance specialist \u2014 Disagree: I remain opposed. Public release of every dataset is incompatible with the restricted-data cases I raised.</p><p>Research funding manager \u2014 Disagree: I changed my view after distinguishing open outputs from unrestricted data release. Auditability does not require every input to be public.</p><p>Reproducibility researcher \u2014 Disagree: I changed to disagreement. Releasing a clear reproducibility package is more useful than an indiscriminate archive of sensitive or misleading intermediate material.</p>",
      synthesis_published: true,
      is_active: true,
      responses: [
        {
          id: 17,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "The engineer\u2019s point persuaded me to specify rerunning the analysis as part of review. I still agree."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "I still agree: enforce the agreed scope rather than seeking permission for each run."
            },
            q5: {
              position: "Agree"
            },
            q6: {
              position: "I retain support. Without a protected share, plausible short-term ideas consume everything."
            },
            q7: {
              position: "Disagree"
            },
            q8: {
              position: "The governance specialist\u2019s example changed my view: an auditable record need not mean public release of protected data."
            }
          },
          email: "synthetic-expert-1",
          timestamp: "2026-09-07T18:16:42.284984",
          version: 1
        },
        {
          id: 18,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "I retain support; the reviewer should have the relevant expertise and time."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "I changed from disagreement after the engineer distinguished bounded computation from wet-lab experiments. The agreed scope is the key safeguard."
            },
            q5: {
              position: "Agree"
            },
            q6: {
              position: "I still support the reserve, even though its opportunity cost remains real."
            },
            q7: {
              position: "Disagree"
            },
            q8: {
              position: "I retain disagreement. A useful reproducibility package is different from publishing every abandoned intermediate output."
            }
          },
          email: "synthetic-expert-2",
          timestamp: "2026-09-07T18:16:42.291922",
          version: 1
        },
        {
          id: 19,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "I still agree. A runnable workflow and a recorded review are concrete checks."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "I retain support for tests with enforced limits and recorded execution."
            },
            q5: {
              position: "Disagree"
            },
            q6: {
              position: "I remain opposed to 20% for every team. The panel has not resolved differences in infrastructure needs."
            },
            q7: {
              position: "Disagree"
            },
            q8: {
              position: "The confidentiality arguments changed my view. Complete internal logging can coexist with selective, justified public release."
            }
          },
          email: "synthetic-expert-3",
          timestamp: "2026-09-07T18:16:42.298244",
          version: 1
        },
        {
          id: 20,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "I moved from uncertainty to agreement after the panel clarified that review should be resourced and specific to the analysis."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "I still support autonomy within the agreed scope; it does not remove accountability."
            },
            q5: {
              position: "Agree"
            },
            q6: {
              position: "I retain support because junior researchers otherwise struggle to protect speculative work."
            },
            q7: {
              position: "Agree"
            },
            q8: {
              position: "I still support public release as written. I recognise the restrictions raised, but think this policy should limit which datasets are used in the first place."
            }
          },
          email: "synthetic-expert-4",
          timestamp: "2026-09-07T18:16:42.305721",
          version: 1
        },
        {
          id: 21,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "I retain support, with documented checks rather than a ceremonial sign-off."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "I changed my view: explicit scope and a budget are advance human approval of the class of tests. Out-of-scope work would still need review."
            },
            q5: {
              position: "Disagree"
            },
            q6: {
              position: "I remain opposed. Good exploration should be funded on its merits rather than by a fixed fraction."
            },
            q7: {
              position: "Disagree"
            },
            q8: {
              position: "I changed to disagreement. Mandatory publication could conflict with confidentiality without improving the reliability of the final conclusion."
            }
          },
          email: "synthetic-expert-5",
          timestamp: "2026-09-07T18:16:42.317902",
          version: 1
        },
        {
          id: 22,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "I still agree, provided reviewers check access conditions as well as numerical results."
            },
            q3: {
              position: "Unable to judge \u2014 need more information"
            },
            q4: {
              position: "I remain unable to judge: enforceable boundaries depend on the actual data and execution environment."
            },
            q5: {
              position: "Disagree"
            },
            q6: {
              position: "I retain disagreement; the same reserve is not appropriate for every project."
            },
            q7: {
              position: "Disagree"
            },
            q8: {
              position: "I remain opposed. Public release of every dataset is incompatible with the restricted-data cases I raised."
            }
          },
          email: "synthetic-expert-6",
          timestamp: "2026-09-07T18:16:42.329713",
          version: 1
        },
        {
          id: 23,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "I retain support for a reproducible analysis and an accountable reviewer."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "I still agree because the proposal is limited to reversible computation within agreed resources."
            },
            q5: {
              position: "Disagree"
            },
            q6: {
              position: "I remain opposed to the fixed percentage. The disagreement is about allocation rules, not whether exploration has value."
            },
            q7: {
              position: "Disagree"
            },
            q8: {
              position: "I changed my view after distinguishing open outputs from unrestricted data release. Auditability does not require every input to be public."
            }
          },
          email: "synthetic-expert-7",
          timestamp: "2026-09-07T18:16:42.338130",
          version: 1
        },
        {
          id: 24,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "I moved to agreement after reviewing the software engineer\u2019s practical description of rerunning code and recording checks."
            },
            q3: {
              position: "Disagree"
            },
            q4: {
              position: "I moved from uncertainty to disagreement. A bounded run can still leak evaluation data into future model choices; the statement does not address that risk."
            },
            q5: {
              position: "Agree"
            },
            q6: {
              position: "I retain support. The funding manager\u2019s flexibility argument does not solve the persistent neglect of unusual ideas."
            },
            q7: {
              position: "Disagree"
            },
            q8: {
              position: "I changed to disagreement. Releasing a clear reproducibility package is more useful than an indiscriminate archive of sensitive or misleading intermediate material."
            }
          },
          email: "synthetic-expert-8",
          timestamp: "2026-09-07T18:16:42.352778",
          version: 1
        }
      ]
    }
  ]
};

// src/utils/answers.ts
function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function stringifyAnswerScalar(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return String(value);
  return "";
}
function coerceAnswerPosition(value) {
  const scalar = stringifyAnswerScalar(value);
  if (scalar) return scalar;
  if (Array.isArray(value)) {
    return value.map((item) => coerceAnswerPosition(item).trim()).filter(Boolean).join("\n");
  }
  if (!isRecord(value)) return "";
  for (const key of ["position", "value", "answer", "selected", "selectedScore", "score"]) {
    if (key in value) {
      const next = coerceAnswerPosition(value[key]);
      if (next.trim()) return next;
    }
  }
  return "";
}

// src/utils/delphiProgress.ts
var stanceLabels = ["Agree", "Disagree", "Neutral", "Unable to judge", "Unrecognised", "Not answered"];
function stance(value) {
  const v = value.trim().toLowerCase();
  if (["strongly agree", "agree"].includes(v)) return 0;
  if (["strongly disagree", "disagree"].includes(v)) return 1;
  if (["neither agree nor disagree", "neutral"].includes(v)) return 2;
  if (["unable to judge \u2014 need more information", "don't know / unsure", "unsure", "uncertain"].includes(v)) return 3;
  return v ? 4 : 5;
}
function ratingQuestion(q) {
  return typeof q === "object" && q !== null && ["likert", "single_select"].includes(String(q.inputType)) && Array.isArray(q.options) && q.options.some((o) => stance(String(o)) === 0) && q.options.some((o) => stance(String(o)) === 1);
}
function wording(q) {
  return `${String(q.sectionTitle || "").trim()}|${String(q.label || "").trim()}`;
}
function counts(q, index, responses) {
  const result = [0, 0, 0, 0, 0, 0];
  for (const r of responses?.responses || []) {
    const answer = r.answers[`q${index + 1}`] ?? r.answers[String(q.questionId)];
    result[stance(coerceAnswerPosition(answer))]++;
  }
  return result;
}
function ratingProgress(round, rounds, responses) {
  const current = responses.find((r) => r.id === round.id);
  const previous2 = rounds.find((r) => r.round_number === round.round_number - 1);
  const previousResponses = responses.find((r) => r.id === previous2?.id);
  return round.questions.flatMap((q, index) => {
    if (!ratingQuestion(q)) return [];
    const priorIndex = previous2?.questions.findIndex((p) => ratingQuestion(p) && !!q.questionId && p.questionId === q.questionId && wording(p) === wording(q) && JSON.stringify(p.options) === JSON.stringify(q.options)) ?? -1;
    const votes = counts(q, index, current);
    const prior = priorIndex >= 0 && previousResponses ? counts(previous2.questions[priorIndex], priorIndex, previousResponses) : null;
    const answered = votes.slice(0, 5).reduce((a, b) => a + b, 0);
    const priorAnswered = prior?.slice(0, 5).reduce((a, b) => a + b, 0) || 0;
    const percent = answered ? 100 * votes[0] / answered : null;
    const history = rounds.filter((r) => r.round_number <= round.round_number).sort((a, b) => a.round_number - b.round_number).flatMap((r) => {
      const i = r.questions.findIndex((p) => ratingQuestion(p) && !!q.questionId && p.questionId === q.questionId && wording(p) === wording(q) && JSON.stringify(p.options) === JSON.stringify(q.options));
      const data = responses.find((x) => x.id === r.id);
      if (i < 0 || !data) return [];
      const v = counts(r.questions[i], i, data);
      const n = v.slice(0, 5).reduce((a, b) => a + b, 0);
      return [{ round: r.round_number, votes: v, n, percent: n ? 100 * v[0] / n : null }];
    });
    const commentIndex = round.questions.findIndex((p) => typeof p === "object" && p !== null && p.sectionTitle === q.sectionTitle && !!q.sectionTitle && /comment|clarification|justify|what led|explain your position/i.test(String(p.label)));
    const stableEmails = (rs) => {
      const map = /* @__PURE__ */ new Map();
      const duplicate = /* @__PURE__ */ new Set();
      for (const r of rs?.responses || []) if (r.email) {
        if (map.has(r.email)) duplicate.add(r.email);
        map.set(r.email, r);
      }
      duplicate.forEach((e) => map.delete(e));
      return map;
    };
    const oldByIdentity = stableEmails(previousResponses);
    const newByIdentity = stableEmails(current);
    let matched = 0, changed = 0;
    const evidence = (current?.responses || []).map((r, i) => {
      const position = coerceAnswerPosition(r.answers[`q${index + 1}`] ?? r.answers[String(q.questionId)]);
      const old = priorIndex >= 0 && r.email && newByIdentity.has(r.email) ? oldByIdentity.get(r.email) : void 0;
      const before = old ? coerceAnswerPosition(old.answers[`q${priorIndex + 1}`] ?? old.answers[String(q.questionId)]) : "";
      const comparable = !!old && stance(before) < 4 && stance(position) < 4;
      if (comparable) {
        matched++;
        if (stance(before) !== stance(position)) changed++;
      }
      const commentQuestion = round.questions[commentIndex];
      const comment = commentIndex >= 0 ? coerceAnswerPosition(r.answers[`q${commentIndex + 1}`] ?? r.answers[String(typeof commentQuestion === "object" ? commentQuestion.questionId : "")]) : "";
      return { participant: `Response ${i + 1}`, position, group: stance(position), comment, before: comparable ? before : null, changed: comparable && stance(before) !== stance(position) };
    });
    return [{
      history,
      evidence,
      matched,
      changed,
      key: String(q.questionId || index),
      label: String(q.sectionTitle || q.label),
      votes,
      answered,
      percent,
      previousRound: previous2?.round_number,
      delta: percent !== null && prior && priorAnswered ? percent - 100 * prior[0] / priorAnswered : null,
      previousAnswered: priorAnswered
    }];
  });
}
function synthesisProvenanceNote(round, rounds) {
  if (!round?.synthesis?.trim()) return null;
  if (round.response_count === 0) return `No responses have been submitted in Round ${round.round_number}. This text is background or a draft, not a result from this round.`;
  const previous2 = rounds.find((r) => r.round_number === round.round_number - 1);
  if (previous2?.synthesis?.trim() === round.synthesis.trim()) return `This text matches Round ${previous2.round_number}. Review it against this round\u2019s responses before treating it as an updated result.`;
  return null;
}

// src/utils/delphiPlanning.ts
function buildFixedDelphiRound(round, rounds, responses) {
  if (round.round_number !== 2 || rounds.some((r) => r.round_number >= 3)) throw new Error("This Delphi has three rounds. No further rating round is available.");
  const baseline = rounds.find((r) => r.round_number === 2) || round;
  const rows = ratingProgress(baseline, rounds, responses);
  if (!rows.length) throw new Error("No recorded claim questionnaire is available.");
  return baseline.questions.map((q) => {
    if (typeof q === "string") return q;
    const row = rows.find((r) => r.key === String(q.questionId));
    if (row) return { ...q, groupPrompt: [`Round 2: ${row.votes[0]} agree, ${row.votes[1]} disagree, ${row.votes[2]} neutral, ${row.votes[3]} unable to judge; ${row.answered} answered.`, "Review the other participants\u2019 reasoning, then rate this same claim again. You do not need to change your mind.", ...row.evidence.filter((e) => e.comment).map((e) => `${e.position}: ${e.comment}`)].join("\n") };
    if (/comment|clarification|justify|what led|explain your position/i.test(String(q.label))) return { ...q, label: "Explain your position", placeholder: "Why do you agree or disagree? Share the reasoning or evidence behind your answer." };
    return { ...q };
  });
}

// src/utils/renderDelphiPlanner.ts
var el = (tag, text = "") => {
  const n = document.createElement(tag);
  n.textContent = text;
  return n;
};
function renderDelphiPlanner(root, round, rounds, responses, publish) {
  const box = el("div");
  box.className = "di-planner";
  root.append(box);
  if (round.round_number >= 3) {
    box.append(el("strong", "Round 3 of 3 \xB7 Final ratings"), el("p", "The same claims were rated in rounds 2 and 3. Compare the positions and justifications above; unresolved disagreement remains part of the result."));
    return;
  }
  if (round.round_number !== 2) return;
  const detail = el("details");
  detail.append(el("summary", "Preview round 3 \xB7 Final ratings"), el("p", "All claims, wording and rating options stay unchanged. Participants review the previous opinions, rate each claim again and explain their reasoning."));
  box.append(detail);
  try {
    const questions = buildFixedDelphiRound(round, rounds.filter((r) => r.round_number <= 2), responses);
    questions.filter((q) => typeof q === "object" && Array.isArray(q.options)).forEach((q) => {
      if (typeof q === "string") return;
      const item = el("details");
      item.append(el("summary", String(q.sectionTitle || q.label)), el("p", String(q.groupPrompt)), el("p", q.options.join(" \xB7 ")), el("p", "Explain your position \u2014 why do you agree or disagree? Share the reasoning or evidence behind your answer."));
      detail.append(item);
    });
    if (publish && !rounds.some((r) => r.round_number >= 3)) {
      const open = el("button", "Open round 3");
      open.type = "button";
      open.onclick = async () => {
        open.disabled = true;
        try {
          await publish(questions);
        } catch (e) {
          detail.append(el("p", e.message));
          open.disabled = false;
        }
      };
      detail.append(open);
    } else detail.append(el("p", rounds.some((r) => r.round_number >= 3) ? "Round 3 already exists." : "Simulation preview only."));
  } catch (e) {
    detail.append(el("p", e.message));
  }
}

// src/utils/renderDelphiInsights.ts
var colors = ["#137c70", "#b34d60", "#94a3b8", "#c28a2a", "#8b5fbf", "#e2e8f0"];
var node = (tag, text = "", cls = "") => {
  const n = document.createElement(tag);
  n.textContent = text;
  n.className = cls;
  return n;
};
var button = (label, run) => {
  const b = node("button", label);
  b.type = "button";
  b.onclick = run;
  return b;
};
function category(row) {
  if (!row.answered) return "Awaiting ratings";
  if (row.votes[0] / row.answered >= 0.8) return "Mostly agree";
  if (row.votes[1] / row.answered >= 0.8) return "Mostly disagree";
  if ((row.votes[2] + row.votes[3] + row.votes[4]) / row.answered >= 0.5) return "Uncertain";
  if (row.votes[0] / row.answered > 0.5) return "Leaning agree";
  if (row.votes[1] / row.answered > 0.5) return "Leaning disagree";
  return "Divided";
}
function renderDelphiInsights(root, round, rounds, responses, refresh, publish) {
  const rows = ratingProgress(round, rounds, responses);
  const priorOpen = new Set(Array.from(root.querySelectorAll("details[open]")).map((d) => d.dataset.key));
  const filter = root.dataset.filter || "All claims";
  const existingPlanner = root.dataset.plannerRound === String(round.id) ? root.querySelector(".di-planner") : null;
  root.dataset.plannerRound = String(round.id);
  root.replaceChildren();
  root.className = "card delphi-insights";
  root.dataset.claimLabels = JSON.stringify(rows.map((r) => r.label.replace(/^Claim\s+\d+:\s*/i, "").replace(/\s+/g, " ").trim()));
  const head = node("div", "", "di-heading");
  head.append(node("div", "THE PANEL\u2019S VIEW", "di-eyebrow"));
  const title = node("div", "", "di-title");
  title.append(node("h2", "Where views stand"));
  if (refresh) title.append(button("Refresh", refresh));
  head.append(title);
  root.append(head);
  const ordered = [...rounds].filter((r) => r.round_number <= round.round_number).sort((a, b) => a.round_number - b.round_number);
  const actual = responses.find((r) => r.id === round.id)?.responses.length;
  const intro = node("p", `Round ${round.round_number} \xB7 ${actual ?? "\u2014"} responses${rows.length ? ` \xB7 ${rows.length} claims` : ""}`, "di-subtitle");
  root.append(intro);
  const note = synthesisProvenanceNote(round, rounds);
  if (note) root.append(node("p", note, "di-warning"));
  if (!rows.length) {
    root.append(node("p", actual === 0 ? "No responses yet for this round. Responses will appear here as participants submit them." : round.round_number === 1 ? "This round gathers independent views. Extract claims from the responses before setting up the rating round." : "There are no comparable claim ratings in this round. Review the written responses or synthesis below.", "di-empty"));
    return;
  }
  const cats = ["Mostly agree", "Leaning agree", "Divided", "Leaning disagree", "Mostly disagree", "Uncertain"];
  const filters = node("div", "", "di-filters");
  filters.setAttribute("role", "group");
  filters.setAttribute("aria-label", "Filter claims");
  ["All claims", ...cats].forEach((label) => {
    const count = label === "All claims" ? rows.length : rows.filter((r) => category(r) === label).length;
    if (!count && label !== filter) return;
    const b = button(label, () => {
      root.dataset.filter = label;
      renderDelphiInsights(root, round, rounds, responses, refresh, publish);
    });
    b.append(node("span", String(count), "di-filter-count"));
    b.setAttribute("aria-pressed", String(filter === label));
    filters.append(b);
  });
  root.append(filters);
  const list = node("div", "", "di-claims");
  const columns = node("div", "", "di-column-head");
  columns.setAttribute("aria-hidden", "true");
  columns.append(node("span", "Claim"), node("span", "Recorded agreement"));
  list.append(columns);
  const selected = rows.filter((r) => filter === "All claims" || category(r) === filter);
  if (!selected.length) list.append(node("p", "No claims in this group.", "di-empty"));
  selected.forEach((row) => {
    const article = node("article", "", "di-claim");
    article.dataset.key = row.key;
    article.dataset.openExcerpts = JSON.stringify([...priorOpen].filter((k) => k?.startsWith(`${row.key}:excerpt:`)));
    const heading = node("div", "", "di-claim-top");
    const left = node("div", "", "di-claim-copy");
    const number = node("span", String(rows.indexOf(row) + 1).padStart(2, "0"), "di-claim-number");
    number.setAttribute("aria-label", `Claim ${rows.indexOf(row) + 1}`);
    left.append(number, node("h3", row.label.replace(/^Claim\s+\d+:\s*/i, "")));
    heading.append(left);
    const rating = node("div", "", "di-rating");
    rating.setAttribute("aria-label", category(row));
    const score = node("div", "", "di-score");
    score.append(node("strong", row.percent === null ? "\u2014" : `${Math.round(row.percent)}%`), node("span", row.percent === null ? "No ratings" : "agree"));
    rating.append(score);
    heading.append(rating);
    article.append(heading);
    const bar = node("div", "", "di-bar");
    bar.setAttribute("aria-hidden", "true");
    row.votes.slice(0, 5).forEach((n, i) => {
      if (n && row.answered) {
        const part = node("span");
        part.style.width = `${n / row.answered * 100}%`;
        part.style.background = colors[i];
        bar.append(part);
      }
    });
    rating.append(bar);
    const legend = node("div", "", "di-legend");
    row.votes.forEach((n, i) => {
      if (n || i < 2) {
        const item = node("span", `${n} ${stanceLabels[i].toLowerCase()}`);
        const dot = node("i");
        dot.style.background = colors[i];
        item.prepend(dot);
        legend.append(item);
      }
    });
    rating.append(legend);
    if (row.history.filter((h) => h.n > 0).length > 1) {
      const previous2 = row.history.filter((h) => h.n > 0).at(-2);
      const trend = node("div", "", "di-trend");
      if (row.delta !== null) {
        const change = Math.round(row.delta);
        trend.append(node("span", change === 0 ? "No change" : `${change > 0 ? "+" : "\u2212"}${Math.abs(change)} pp`, "di-change"), node("span", `since R${previous2.round}`));
        trend.title = `Agreement: Round ${previous2.round} ${Math.round(previous2.percent)}% \u2192 Round ${round.round_number} ${Math.round(row.percent)}%. Change in percentage points.`;
      }
      rating.append(trend);
    }
    const detail = document.createElement("details");
    detail.className = "di-reasons";
    detail.dataset.key = row.key;
    detail.open = priorOpen.has(row.key);
    const summary = node("summary", "Expert responses & history");
    detail.append(summary);
    detail.append(node("p", row.history.map((h) => `Round ${h.round}: ${h.n ? Math.round(h.percent) + "% agree" : "No ratings"} (${h.n} answered)`).join(" \xB7 ")));
    if (row.matched) detail.append(node("p", `${row.changed} of ${row.matched} returning respondents changed position group since Round ${row.previousRound}.`, "di-movement"));
    const question = round.questions.find((q) => typeof q === "object" && String(q.questionId) === row.key);
    if (question?.parentClaimId) {
      article.prepend(node("p", `Related proposal \xB7 introduced in Round ${question.introducedRound || round.round_number}`, "di-eyebrow"));
      detail.append(node("p", `Original claim: ${question.parentClaimText || question.parentClaimId}`), node("p", `Reason for this proposal: ${question.claimRationale || "Not recorded"}`));
    }
    const evidence = row.evidence.filter((e) => e.comment || e.changed);
    if (!evidence.length) detail.append(node("p", "No separate comments were recorded for this claim. Original responses remain available in the Responses view."));
    [0, 1, 2, 3, 4, 5].forEach((group) => {
      const subset = evidence.filter((e) => e.group === group);
      if (!subset.length) return;
      const section = node("section");
      section.append(node("h4", `${stanceLabels[group]} \xB7 ${subset.length}`));
      subset.forEach((e) => {
        const block = node("blockquote");
        block.append(node("div", `${e.participant} \xB7 ${e.position || "Not answered"}`, "di-attribution"));
        if (e.changed) block.append(node("p", `${e.before} \u2192 ${e.position}`, "di-shift"));
        block.append(node("p", e.comment || "No reason supplied."));
        section.append(block);
      });
      detail.append(section);
    });
    article.append(detail);
    list.append(article);
  });
  root.append(list);
  const archived = node("details", "", "di-method");
  archived.append(node("summary", "Earlier claims not rated in this round"));
  const seen = new Set(rows.map((r) => r.key));
  [...ordered].reverse().filter((r) => r.id !== round.id).forEach((r) => ratingProgress(r, rounds, responses).forEach((row) => {
    if (seen.has(row.key)) return;
    seen.add(row.key);
    archived.append(node("p", `${row.label} \u2014 last rated Round ${r.round_number}: ${row.percent === null ? "no ratings" : Math.round(row.percent) + "% agree"} (${row.answered} answered). Not re-rated; no current-round result.`));
  }));
  if (archived.childElementCount > 1) root.append(archived);
  if (existingPlanner) root.append(existingPlanner);
  else if (round.is_active || !refresh) renderDelphiPlanner(root, round, rounds, responses, publish);
  const methods = document.createElement("details");
  methods.className = "di-method";
  methods.dataset.key = "method";
  methods.open = priorOpen.has("method");
  methods.append(node("summary", "How to read these results"));
  methods.append(node("p", "These are recorded ratings, not AI-inferred agreement. \u201CLeaning\u201D means a majority below 80%; \u201CDivided\u201D means neither side has a majority (unless uncertainty dominates). \u201CMostly\u201D means at least 80% of answered ratings; it is a descriptive display band, not a substitute for the study\u2019s declared consensus rule. Neutral, unsure and unrecognised answers remain in the denominator; missing answers are shown separately."));
  methods.append(node("p", "Round comparisons require identical claim identifiers, wording and scales. Movement counts compare position groups for unambiguously matched returning respondents; changing intensity within agree or disagree is not counted. Response numbers identify rows within this round only. Comments are original submitted words."));
  methods.append(node("p", ordered.map((r) => `Round ${r.round_number}: ${responses.find((x) => x.id === r.id)?.responses.length ?? r.response_count ?? "\u2014"} responses`).join(" \xB7 ")));
  methods.append(node("p", "Agreement can coexist with conditional support. Changes in panel composition can change percentages. A synthetic demonstration illustrates the process; it does not establish scientific validity."));
  root.append(methods);
}

// src/utils/unifiedClaims.ts
var claimText = (s) => s.replace(/^\s*Claim\s+\d+:\s*/i, "").replace(/\s+/g, " ").trim();
var previous = /* @__PURE__ */ new WeakMap();
var excerptId = 0;
function unifyClaims(main2) {
  const preview2 = main2.querySelector(".claim-evidence-preview");
  const card = preview2?.closest(".card");
  if (!preview2 || !card) return;
  const progress = main2.querySelector("#delphi-recorded-progress");
  const first = progress?.querySelector(".di-claim") || null;
  const signatureKey = (card.querySelector(".ProseMirror")?.innerHTML || preview2.innerHTML) + String(preview2.hidden) + (progress?.dataset.signature || "") + (progress?.dataset.filter || "") + Array.from(card.querySelectorAll("button")).filter((b) => !b.closest(".unified-actions")).map((b) => b.textContent + String(b.disabled)).join("|");
  const last = previous.get(main2);
  if (last?.preview === preview2 && last.first === first && last.signature === signatureKey) return;
  previous.set(main2, { preview: preview2, first, signature: signatureKey });
  const source2 = Array.from(preview2.querySelectorAll(".claim-evidence-claim"));
  const labels = JSON.parse(progress?.dataset.claimLabels || "[]");
  const matched = source2.filter((c) => labels.filter((l) => l === claimText(c.querySelector(".claim-evidence-claim-heading strong")?.textContent || "")).length === 1);
  const allMatched = source2.length > 0 && matched.length === source2.length;
  const editing = preview2.hidden;
  card.classList.toggle("unified-synthesis", allMatched);
  card.classList.toggle("unified-editing", editing);
  for (const item of source2) item.classList.toggle("unified-matched", matched.includes(item));
  const carry = Array.from(card.querySelectorAll("p,div")).find((p) => !p.closest(".unified-actions") && (p.textContent || "").length < 350 && p.textContent?.includes("carried forward"))?.textContent || "";
  for (const target of progress?.querySelectorAll(".di-claim") || []) {
    const label = claimText(target.querySelector("h3")?.textContent || "");
    const candidates = matched.filter((c) => claimText(c.querySelector(".claim-evidence-claim-heading strong")?.textContent || "") === label);
    const existing = target.querySelector(".unified-excerpts");
    if (candidates.length !== 1) {
      existing?.remove();
      continue;
    }
    const groups = Array.from(candidates[0].querySelectorAll(":scope > details"));
    const signature2 = carry + groups.map((g) => g.innerHTML).join("");
    if (existing?.dataset.signature === signature2) continue;
    const openKeys = new Set(existing ? Array.from(existing.querySelectorAll("details[open]")).map((d) => d.dataset.key) : JSON.parse(target.dataset.openExcerpts || "[]"));
    existing?.remove();
    target.classList.add("unified-claim-card");
    target.querySelector(".unified-claim-heading")?.remove();
    const detail = document.createElement("div");
    detail.className = "unified-excerpts";
    detail.dataset.signature = signature2;
    const note = document.createElement("p");
    note.className = "unified-provenance";
    note.textContent = carry || "Original excerpts from the saved synthesis; counts above are recorded ratings.";
    if (carry) note.dataset.carried = "true";
    detail.append(note);
    const controls = document.createElement("div");
    controls.className = "unified-excerpt-controls";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Original excerpts");
    const caption = document.createElement("span");
    caption.className = "unified-excerpt-label";
    caption.textContent = "Excerpts";
    controls.append(caption);
    if (groups.length) detail.append(controls);
    groups.forEach((g, i) => {
      const clone = g.cloneNode(true);
      clone.dataset.key = `${target.dataset.key}:excerpt:${i}`;
      clone.open = openKeys.has(clone.dataset.key);
      clone.removeAttribute("id");
      clone.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
      const summary = clone.querySelector("summary");
      if (summary) {
        const label2 = summary.querySelector("span:not(.claim-evidence-count)");
        if (label2) label2.textContent = (label2.textContent || "").replace(/original excerpts/i, "excerpts");
        for (const n of Array.from(summary.childNodes)) if (n.nodeType === Node.TEXT_NODE) n.textContent = (n.textContent || "").replace(/original excerpts/i, "excerpts");
        const button2 = document.createElement("button");
        button2.type = "button";
        button2.className = "unified-excerpt-button";
        const name = summary.querySelector("span:not(.claim-evidence-count)")?.textContent || summary.textContent || "Original excerpts";
        const count = summary.querySelector(".claim-evidence-count")?.textContent;
        button2.append(document.createTextNode(name.replace(/\s+(original\s+)?excerpts.*$/i, "").trim()));
        if (count) {
          const n = document.createElement("span");
          n.textContent = count;
          n.className = "unified-excerpt-total";
          button2.append(n);
        }
        clone.id = `claim-excerpts-${++excerptId}`;
        button2.id = `${clone.id}-control`;
        button2.setAttribute("aria-controls", clone.id);
        button2.setAttribute("aria-label", `${name}${count ? " \xB7 " + count : ""}`);
        clone.setAttribute("aria-labelledby", button2.id);
        const sync = () => button2.setAttribute("aria-expanded", String(clone.open));
        sync();
        clone.addEventListener("toggle", sync);
        button2.onclick = () => {
          const open = !clone.open;
          detail.querySelectorAll("details").forEach((d) => {
            d.open = false;
            const control = controls.querySelector(`[aria-controls="${d.id}"]`);
            control?.setAttribute("aria-expanded", "false");
          });
          clone.open = open;
          sync();
        };
        controls.append(button2);
        summary.hidden = true;
      }
      detail.append(clone);
    });
    target.append(detail);
    target.querySelector(".di-reasons")?.remove();
  }
  const originals = Array.from(card.querySelectorAll("button")).filter((b) => !b.closest(".unified-actions") && /^(Hide from survey|Publish to survey|Save|Revert|Expand all|Collapse all|Edit synthesis text|Preview evidence)$/.test(b.textContent?.trim() || ""));
  if (!originals.length) return;
  originals.forEach((b) => b.classList.add("unified-original-action"));
  let menu = main2.querySelector(".unified-actions");
  if (!menu) {
    menu = document.createElement("details");
    menu.className = "unified-actions";
    const summary = document.createElement("summary");
    summary.textContent = "Synthesis actions";
    menu.append(summary, document.createElement("div"));
  }
  const host = allMatched && progress ? progress.querySelector(".di-heading") : card.firstElementChild;
  if (host && menu.parentElement !== host) host.append(menu);
  const status = Array.from(card.querySelectorAll("p,div")).filter((p) => !p.closest(".unified-actions") && (p.textContent || "").length < 350).map((p) => p.textContent || "").find((t) => t.includes("All changes saved") || t.includes("unsaved")) || "";
  const signature = originals.map((b) => `${b.textContent}:${b.disabled}`).join("|") + status;
  if (menu.dataset.signature !== signature) {
    menu.dataset.signature = signature;
    const items = menu.lastElementChild;
    items.replaceChildren();
    if (status) {
      const note = document.createElement("p");
      note.textContent = status;
      items.append(note);
    }
    originals.filter((b) => !b.disabled || !["Save", "Revert"].includes(b.textContent?.trim() || "")).forEach((original) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = original.textContent;
      b.disabled = original.disabled;
      b.onclick = () => {
        menu.open = false;
        const label = original.textContent?.trim();
        if (label === "Expand all" || label === "Collapse all") progress?.querySelectorAll(".di-reasons,.unified-excerpts details").forEach((d) => d.open = label === "Expand all");
        original.click();
        if (label === "Edit synthesis text") {
          card.classList.add("unified-editing");
          card.scrollIntoView({ block: "start" });
        }
      };
      items.append(b);
    });
  }
}

// src/examples/claimLayoutEntry.ts
var main = document.querySelector("main");
var el2 = (tag, text = "", cls = "") => {
  const n = document.createElement(tag);
  n.textContent = text;
  n.className = cls;
  return n;
};
var results = el2("section");
results.id = "delphi-recorded-progress";
main.append(results);
var source = el2("section", "", "card");
var preview = el2("div", "", "claim-evidence-preview");
source.append(preview);
main.append(source);
research_ai_results_default.fixture.claims.forEach((claim, index) => {
  const article = el2("article", "", "claim-evidence-claim");
  const title = el2("div", "", "claim-evidence-claim-heading");
  title.append(el2("strong", claim));
  article.append(title);
  for (const [label, vote] of [["Supporting", "Agree"], ["Opposing", "Disagree"], ["Uncertain", "Unable"]]) {
    const experts = research_ai_results_default.fixture.experts.filter((e) => e.round3.votes[index].startsWith(vote));
    if (!experts.length) continue;
    const group = el2("details", "", "claim-evidence-group");
    const summary = el2("summary");
    summary.append(el2("span", `${label} original excerpts`), el2("span", String(experts.length), "claim-evidence-count"));
    group.append(summary);
    const cards = el2("div", "", "claim-evidence-cards");
    experts.forEach((e) => {
      const card = el2("div", "", "claim-evidence-card");
      card.append(el2("p", e.role, "claim-evidence-expert"), el2("blockquote", e.round3.comments[index], "claim-evidence-quote"));
      cards.append(card);
    });
    group.append(cards);
    article.append(group);
  }
  preview.append(article);
});
renderDelphiInsights(results, research_ai_results_default.rounds[2], research_ai_results_default.rounds, research_ai_results_default.responses);
unifyClaims(main);
new MutationObserver(() => unifyClaims(main)).observe(results, { childList: true, subtree: true });

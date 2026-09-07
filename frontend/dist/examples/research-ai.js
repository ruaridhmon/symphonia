// src/demos/public-ai-results.json
var public_ai_results_default = {
  fixture: {
    title: "Who decides? AI in UK public services",
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
      "People must be able to request a human review of an AI decision affecting their access to a public service.",
      "Low-risk administrative tasks may be completed by AI without prior human sign-off.",
      "At least half of any verified financial savings from AI should be reinvested in frontline staffing.",
      "Every AI model used in a public service must publish its full source code and model weights."
    ],
    experts: [
      {
        id: "expert-1",
        role: "Council service lead",
        proposal: "I want shorter queues without an unaccountable service. A human appeal should exist for decisions about access. Routine appointment allocation might run automatically, with a route to correct errors. Staff should share in the savings, although an inflexible percentage could limit other improvements. Publishing model code seems an attractive transparency requirement, but I need to understand procurement and security implications.",
        round2: {
          votes: [
            "Agree",
            "Agree",
            "Agree",
            "Agree"
          ],
          comments: [
            "Appeals should cover decisions affecting service access; routine bookings should not need prior review.",
            "A reversible booking is a useful bounded test.",
            "Frontline capacity is the visible service bottleneck, so I support the earmark.",
            "I initially support full release as a simple accountability rule."
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
            "I retain support. Review must be accessible and able to correct the original outcome.",
            "I retain support for reversible administration, excluding eligibility and enforcement.",
            "I retain support: staff capacity is the bottleneck I would address first.",
            "I change to disagree. The engineer distinguishes public accountability from universal weights release; independent inspection could be required without excluding every closed model."
          ]
        }
      },
      {
        id: "expert-2",
        role: "AI engineer",
        proposal: "Allow bounded administrative automation with logging, reversibility and escalation. A human appeal matters for consequential decisions, but a review for every trivial automated event may consume the benefits. I oppose a fixed staffing earmark: use verified savings where they do most good. Full release of every model is too absolute; independent access and public evaluation reports can offer other forms of scrutiny.",
        round2: {
          votes: [
            "Disagree",
            "Agree",
            "Disagree",
            "Disagree"
          ],
          comments: [
            "As written, I worry that human review could be demanded for trivial administrative actions and swamp staff.",
            "Allow automation with logs, reversibility and escalation.",
            "An automatic staffing earmark might prevent investment in better accessibility or infrastructure.",
            "Full release is not the only scrutiny mechanism; independent inspection and published evaluation may suffice."
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
            "I change to agree after the panel separates access decisions from routine automation. An appeal after an access decision is not a requirement for prior sign-off on every booking.",
            "I retain support for bounded, logged and reversible tasks.",
            "I retain opposition. Ring-fencing inputs is different from improving outcomes.",
            "I retain opposition to every. Public evaluations and independent inspection are a less absolute alternative."
          ]
        }
      },
      {
        id: "expert-3",
        role: "Disability advocate",
        proposal: "Access must include people who cannot navigate a digital complaint. Guarantee a human review and accessible routes to request it. I am wary of calling something low-risk when errors accumulate for disabled people. Reinvest savings in frontline staff who can help. Open source sounds desirable, but I cannot judge whether weights disclosure is necessary for accountability.",
        round2: {
          votes: [
            "Agree",
            "Disagree",
            "Agree",
            "Unable to judge \u2014 need more information"
          ],
          comments: [
            "The route to human review must work by phone and with assistance.",
            "Repeated small errors may disproportionately harm disabled users, so I oppose without boundaries.",
            "People need trained staff to resolve access problems.",
            "I need to know what full release adds beyond independent inspection."
          ]
        },
        round3: {
          votes: [
            "Agree",
            "Unable to judge \u2014 need more information",
            "Agree",
            "Disagree"
          ],
          comments: [
            "I retain support, conditional on an assisted and offline route.",
            "I move from disagree to unable to judge. Reversibility addresses part of my concern, but I still need evidence on cumulative accessibility errors.",
            "I retain support for staffing that makes appeals accessible.",
            "I move from unsure to disagree with the universal rule. A code release does not itself make an inaccessible service contestable; require independent scrutiny and accessible explanations."
          ]
        }
      },
      {
        id: "expert-4",
        role: "Public-service union representative",
        proposal: "Technology should augment staff and retain human accountability. I want appeals, human checks before automated actions, and at least half of verified savings reinvested in frontline staffing. Without an earmark, service improvement can become a euphemism for job cuts. I initially favour publishing code and weights because commercial secrecy should not prevent scrutiny.",
        round2: {
          votes: [
            "Agree",
            "Disagree",
            "Agree",
            "Agree"
          ],
          comments: [
            "An accountable person must be available to reconsider an access decision.",
            "I oppose removing sign-off while low-risk remains vague.",
            "A protected share makes the promise to augment people credible.",
            "Code and weights should be open so staff are not asked to trust a black box."
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
            "I retain support: a review must be meaningful, not a rubber stamp.",
            "I change to agree for reversible administrative work. The caseworker separates booking from benefit eligibility, and I still oppose autonomous eligibility decisions.",
            "I retain support. My unresolved disagreement with the economist is about commitment to staff, not the arithmetic of savings.",
            "I change to disagree with the absolute wording. Staff need enforceable inspection and audit rights; universal public release is not the only way to secure them."
          ]
        }
      },
      {
        id: "expert-5",
        role: "Public finance economist",
        proposal: "Consider the opportunity cost of safeguards as well as their benefits. I support an appeal on access decisions and automation of reversible administrative work. A compulsory fifty-percent staffing earmark may stop spending on whichever service need is most urgent. I favour openness as a default and initially support full code and weights release, but would reconsider if the rule excluded useful auditable options.",
        round2: {
          votes: [
            "Agree",
            "Agree",
            "Disagree",
            "Agree"
          ],
          comments: [
            "Appeal is a proportionate protection for decisions affecting access.",
            "Reversible administrative automation can be assessed separately from eligibility.",
            "Spend savings on the greatest unmet need, not a preselected input.",
            "I support the release rule initially because it makes inspection possible."
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
            "I retain support for an appeal on access decisions.",
            "I retain support, with measured errors and reversal.",
            "I retain opposition. The union values a credible staffing commitment; I value flexibility to address whichever need is greatest. That trade-off remains unresolved.",
            "I change to disagree. The engineer has identified a feasible alternative\u2014independent inspection plus published evaluation\u2014so I no longer require every model to be fully released."
          ]
        }
      },
      {
        id: "expert-6",
        role: "Civil liberties researcher",
        proposal: "Public accountability requires contestability, reasons and independent scrutiny. Human appeal is essential. Automation of administrative work may hide rights-impacting decisions behind apparently routine categories, so low-risk needs a defensible definition. Staffing earmarks are not the same as rights protection. I support full code and weights disclosure because opaque suppliers can concentrate power.",
        round2: {
          votes: [
            "Agree",
            "Disagree",
            "Disagree",
            "Agree"
          ],
          comments: [
            "People must be able to contest an administrative judgment affecting them.",
            "The boundary between administration and access is porous; I retain opposition.",
            "Budget earmarking does not guarantee accountability.",
            "Full disclosure limits supplier power and permits independent scrutiny."
          ]
        },
        round3: {
          votes: [
            "Agree",
            "Disagree",
            "Disagree",
            "Agree"
          ],
          comments: [
            "I retain support. Review needs independence from the original automated process.",
            "I retain disagreement. Administrative routing can determine practical access even when it is nominally reversible.",
            "I retain opposition: funding rules are no substitute for rights and scrutiny.",
            "I retain support. My concern is concentration of power: auditor access can depend on contracts, whereas public disclosure permits wider challenge. This remains a substantive minority view."
          ]
        }
      },
      {
        id: "expert-7",
        role: "Rural community organiser",
        proposal: "Rural residents need working phone and in-person routes as well as apps. Human appeal should be available. I cannot judge unattended administration without a clear boundary and a fallback when connectivity fails. Reinvest in frontline people. I initially support open code and weights as a way for communities to inspect services rather than depending on vendor promises.",
        round2: {
          votes: [
            "Agree",
            "Unable to judge \u2014 need more information",
            "Agree",
            "Agree"
          ],
          comments: [
            "Appeals must include an offline route.",
            "I cannot judge until a failed automated action can be reversed locally.",
            "Rural service capacity needs protected investment.",
            "Open release could let communities examine systems themselves."
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
            "I retain support with phone and face-to-face routes.",
            "I change from unsure to agree with locally reversible tasks and an offline fallback. I would oppose removing those conditions.",
            "I retain support: without a protected share, sparse communities could lose more service capacity.",
            "I change to disagree. The accessibility argument persuades me that usable accountability matters more than universal weights release; I still want public reporting."
          ]
        }
      },
      {
        id: "expert-8",
        role: "Frontline caseworker",
        proposal: "I see useful tools for letters and booking, but someone must own mistakes. Human appeal might help, though it could just shift the queue unless there are staff to act. I oppose unattended administrative decisions until we define what counts as reversible. Reinvest savings in people. I oppose mandatory publication of every model: clear explanations and independent audit could matter more to the service user.",
        round2: {
          votes: [
            "Unable to judge \u2014 need more information",
            "Agree",
            "Disagree",
            "Disagree"
          ],
          comments: [
            "Without staff or a review deadline I cannot tell whether the appeal is meaningful.",
            "I support tightly reversible tasks with a named owner.",
            "I favour capacity but oppose fixing the share before knowing service needs.",
            "Users need a useful explanation and a route to correction; model weights alone provide neither."
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
            "I change from unsure to agree with the principle. The disability advocate clarifies that a usable human route is a design requirement; staffing and deadlines remain implementation conditions.",
            "I retain support for reversible booking and correspondence, not eligibility or enforcement.",
            "I retain opposition to a fixed share, while supporting adequate frontline capacity.",
            "I retain opposition: explain the decision, provide correction, and allow independent inspection."
          ]
        }
      }
    ]
  },
  rounds: [
    {
      id: 1,
      round_number: 1,
      synthesis: "<p>Scripted synthetic panel. Eight fictional experts; no empirical evidence. Threshold 80%; stop after three rounds.</p><p>Claim 1: <strong>People must be able to request a human review of an AI decision affecting their access to a public service.</strong></p><p>Candidate claim extracted from the proposals; not yet rated.</p><p>Claim 2: <strong>Low-risk administrative tasks may be completed by AI without prior human sign-off.</strong></p><p>Candidate claim extracted from the proposals; not yet rated.</p><p>Claim 3: <strong>At least half of any verified financial savings from AI should be reinvested in frontline staffing.</strong></p><p>Candidate claim extracted from the proposals; not yet rated.</p><p>Claim 4: <strong>Every AI model used in a public service must publish its full source code and model weights.</strong></p><p>Candidate claim extracted from the proposals; not yet rated.</p>",
      synthesis_published: true,
      synthesis_json: {},
      is_active: false,
      questions: [
        {
          label: "Where should humans stay in control?",
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
      synthesis: "<p>Scripted synthetic panel. Eight fictional experts; no empirical evidence. Threshold 80%; stop after three rounds.</p><p>Claim 1: <strong>People must be able to request a human review of an AI decision affecting their access to a public service.</strong></p><p>Council service lead \u2014 Agree: Appeals should cover decisions affecting service access; routine bookings should not need prior review.</p><p>AI engineer \u2014 Disagree: As written, I worry that human review could be demanded for trivial administrative actions and swamp staff.</p><p>Disability advocate \u2014 Agree: The route to human review must work by phone and with assistance.</p><p>Public-service union representative \u2014 Agree: An accountable person must be available to reconsider an access decision.</p><p>Public finance economist \u2014 Agree: Appeal is a proportionate protection for decisions affecting access.</p><p>Civil liberties researcher \u2014 Agree: People must be able to contest an administrative judgment affecting them.</p><p>Rural community organiser \u2014 Agree: Appeals must include an offline route.</p><p>Frontline caseworker \u2014 Unable to judge \u2014 need more information: Without staff or a review deadline I cannot tell whether the appeal is meaningful.</p><p>Claim 2: <strong>Low-risk administrative tasks may be completed by AI without prior human sign-off.</strong></p><p>Council service lead \u2014 Agree: A reversible booking is a useful bounded test.</p><p>AI engineer \u2014 Agree: Allow automation with logs, reversibility and escalation.</p><p>Disability advocate \u2014 Disagree: Repeated small errors may disproportionately harm disabled users, so I oppose without boundaries.</p><p>Public-service union representative \u2014 Disagree: I oppose removing sign-off while low-risk remains vague.</p><p>Public finance economist \u2014 Agree: Reversible administrative automation can be assessed separately from eligibility.</p><p>Civil liberties researcher \u2014 Disagree: The boundary between administration and access is porous; I retain opposition.</p><p>Rural community organiser \u2014 Unable to judge \u2014 need more information: I cannot judge until a failed automated action can be reversed locally.</p><p>Frontline caseworker \u2014 Agree: I support tightly reversible tasks with a named owner.</p><p>Claim 3: <strong>At least half of any verified financial savings from AI should be reinvested in frontline staffing.</strong></p><p>Council service lead \u2014 Agree: Frontline capacity is the visible service bottleneck, so I support the earmark.</p><p>AI engineer \u2014 Disagree: An automatic staffing earmark might prevent investment in better accessibility or infrastructure.</p><p>Disability advocate \u2014 Agree: People need trained staff to resolve access problems.</p><p>Public-service union representative \u2014 Agree: A protected share makes the promise to augment people credible.</p><p>Public finance economist \u2014 Disagree: Spend savings on the greatest unmet need, not a preselected input.</p><p>Civil liberties researcher \u2014 Disagree: Budget earmarking does not guarantee accountability.</p><p>Rural community organiser \u2014 Agree: Rural service capacity needs protected investment.</p><p>Frontline caseworker \u2014 Disagree: I favour capacity but oppose fixing the share before knowing service needs.</p><p>Claim 4: <strong>Every AI model used in a public service must publish its full source code and model weights.</strong></p><p>Council service lead \u2014 Agree: I initially support full release as a simple accountability rule.</p><p>AI engineer \u2014 Disagree: Full release is not the only scrutiny mechanism; independent inspection and published evaluation may suffice.</p><p>Disability advocate \u2014 Unable to judge \u2014 need more information: I need to know what full release adds beyond independent inspection.</p><p>Public-service union representative \u2014 Agree: Code and weights should be open so staff are not asked to trust a black box.</p><p>Public finance economist \u2014 Agree: I support the release rule initially because it makes inspection possible.</p><p>Civil liberties researcher \u2014 Agree: Full disclosure limits supplier power and permits independent scrutiny.</p><p>Rural community organiser \u2014 Agree: Open release could let communities examine systems themselves.</p><p>Frontline caseworker \u2014 Disagree: Users need a useful explanation and a route to correction; model weights alone provide neither.</p>",
      synthesis_published: true,
      synthesis_json: {},
      is_active: false,
      questions: [
        {
          questionId: "claim_1_response",
          sectionTitle: "Claim 1: People must be able to request a human review of an AI decision affecting their access to a public service.",
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
          sectionTitle: "Claim 1: People must be able to request a human review of an AI decision affecting their access to a public service.",
          label: "Comments or clarification",
          inputType: "textarea",
          optional: true
        },
        {
          questionId: "claim_2_response",
          sectionTitle: "Claim 2: Low-risk administrative tasks may be completed by AI without prior human sign-off.",
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
          sectionTitle: "Claim 2: Low-risk administrative tasks may be completed by AI without prior human sign-off.",
          label: "Comments or clarification",
          inputType: "textarea",
          optional: true
        },
        {
          questionId: "claim_3_response",
          sectionTitle: "Claim 3: At least half of any verified financial savings from AI should be reinvested in frontline staffing.",
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
          sectionTitle: "Claim 3: At least half of any verified financial savings from AI should be reinvested in frontline staffing.",
          label: "Comments or clarification",
          inputType: "textarea",
          optional: true
        },
        {
          questionId: "claim_4_response",
          sectionTitle: "Claim 4: Every AI model used in a public service must publish its full source code and model weights.",
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
          sectionTitle: "Claim 4: Every AI model used in a public service must publish its full source code and model weights.",
          label: "Comments or clarification",
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
      synthesis: "<p>Scripted synthetic panel. Eight fictional experts; no empirical evidence. Threshold 80%; stop after three rounds.</p><p>Claim 1: <strong>People must be able to request a human review of an AI decision affecting their access to a public service.</strong></p><p>Council service lead \u2014 Agree: I retain support. Review must be accessible and able to correct the original outcome.</p><p>AI engineer \u2014 Agree: I change to agree after the panel separates access decisions from routine automation. An appeal after an access decision is not a requirement for prior sign-off on every booking.</p><p>Disability advocate \u2014 Agree: I retain support, conditional on an assisted and offline route.</p><p>Public-service union representative \u2014 Agree: I retain support: a review must be meaningful, not a rubber stamp.</p><p>Public finance economist \u2014 Agree: I retain support for an appeal on access decisions.</p><p>Civil liberties researcher \u2014 Agree: I retain support. Review needs independence from the original automated process.</p><p>Rural community organiser \u2014 Agree: I retain support with phone and face-to-face routes.</p><p>Frontline caseworker \u2014 Agree: I change from unsure to agree with the principle. The disability advocate clarifies that a usable human route is a design requirement; staffing and deadlines remain implementation conditions.</p><p>Claim 2: <strong>Low-risk administrative tasks may be completed by AI without prior human sign-off.</strong></p><p>Council service lead \u2014 Agree: I retain support for reversible administration, excluding eligibility and enforcement.</p><p>AI engineer \u2014 Agree: I retain support for bounded, logged and reversible tasks.</p><p>Disability advocate \u2014 Unable to judge \u2014 need more information: I move from disagree to unable to judge. Reversibility addresses part of my concern, but I still need evidence on cumulative accessibility errors.</p><p>Public-service union representative \u2014 Agree: I change to agree for reversible administrative work. The caseworker separates booking from benefit eligibility, and I still oppose autonomous eligibility decisions.</p><p>Public finance economist \u2014 Agree: I retain support, with measured errors and reversal.</p><p>Civil liberties researcher \u2014 Disagree: I retain disagreement. Administrative routing can determine practical access even when it is nominally reversible.</p><p>Rural community organiser \u2014 Agree: I change from unsure to agree with locally reversible tasks and an offline fallback. I would oppose removing those conditions.</p><p>Frontline caseworker \u2014 Agree: I retain support for reversible booking and correspondence, not eligibility or enforcement.</p><p>Claim 3: <strong>At least half of any verified financial savings from AI should be reinvested in frontline staffing.</strong></p><p>Council service lead \u2014 Agree: I retain support: staff capacity is the bottleneck I would address first.</p><p>AI engineer \u2014 Disagree: I retain opposition. Ring-fencing inputs is different from improving outcomes.</p><p>Disability advocate \u2014 Agree: I retain support for staffing that makes appeals accessible.</p><p>Public-service union representative \u2014 Agree: I retain support. My unresolved disagreement with the economist is about commitment to staff, not the arithmetic of savings.</p><p>Public finance economist \u2014 Disagree: I retain opposition. The union values a credible staffing commitment; I value flexibility to address whichever need is greatest. That trade-off remains unresolved.</p><p>Civil liberties researcher \u2014 Disagree: I retain opposition: funding rules are no substitute for rights and scrutiny.</p><p>Rural community organiser \u2014 Agree: I retain support: without a protected share, sparse communities could lose more service capacity.</p><p>Frontline caseworker \u2014 Disagree: I retain opposition to a fixed share, while supporting adequate frontline capacity.</p><p>Claim 4: <strong>Every AI model used in a public service must publish its full source code and model weights.</strong></p><p>Council service lead \u2014 Disagree: I change to disagree. The engineer distinguishes public accountability from universal weights release; independent inspection could be required without excluding every closed model.</p><p>AI engineer \u2014 Disagree: I retain opposition to every. Public evaluations and independent inspection are a less absolute alternative.</p><p>Disability advocate \u2014 Disagree: I move from unsure to disagree with the universal rule. A code release does not itself make an inaccessible service contestable; require independent scrutiny and accessible explanations.</p><p>Public-service union representative \u2014 Disagree: I change to disagree with the absolute wording. Staff need enforceable inspection and audit rights; universal public release is not the only way to secure them.</p><p>Public finance economist \u2014 Disagree: I change to disagree. The engineer has identified a feasible alternative\u2014independent inspection plus published evaluation\u2014so I no longer require every model to be fully released.</p><p>Civil liberties researcher \u2014 Agree: I retain support. My concern is concentration of power: auditor access can depend on contracts, whereas public disclosure permits wider challenge. This remains a substantive minority view.</p><p>Rural community organiser \u2014 Disagree: I change to disagree. The accessibility argument persuades me that usable accountability matters more than universal weights release; I still want public reporting.</p><p>Frontline caseworker \u2014 Disagree: I retain opposition: explain the decision, provide correction, and allow independent inspection.</p>",
      synthesis_published: true,
      synthesis_json: {},
      is_active: true,
      questions: [
        {
          questionId: "claim_1_response",
          sectionTitle: "Claim 1: People must be able to request a human review of an AI decision affecting their access to a public service.",
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
          sectionTitle: "Claim 1: People must be able to request a human review of an AI decision affecting their access to a public service.",
          label: "Comments or clarification",
          inputType: "textarea",
          optional: true
        },
        {
          questionId: "claim_2_response",
          sectionTitle: "Claim 2: Low-risk administrative tasks may be completed by AI without prior human sign-off.",
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
          sectionTitle: "Claim 2: Low-risk administrative tasks may be completed by AI without prior human sign-off.",
          label: "Comments or clarification",
          inputType: "textarea",
          optional: true
        },
        {
          questionId: "claim_3_response",
          sectionTitle: "Claim 3: At least half of any verified financial savings from AI should be reinvested in frontline staffing.",
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
          sectionTitle: "Claim 3: At least half of any verified financial savings from AI should be reinvested in frontline staffing.",
          label: "Comments or clarification",
          inputType: "textarea",
          optional: true
        },
        {
          questionId: "claim_4_response",
          sectionTitle: "Claim 4: Every AI model used in a public service must publish its full source code and model weights.",
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
          sectionTitle: "Claim 4: Every AI model used in a public service must publish its full source code and model weights.",
          label: "Comments or clarification",
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
      synthesis: "<p>Scripted synthetic panel. Eight fictional experts; no empirical evidence. Threshold 80%; stop after three rounds.</p><p>Claim 1: <strong>People must be able to request a human review of an AI decision affecting their access to a public service.</strong></p><p>Candidate claim extracted from the proposals; not yet rated.</p><p>Claim 2: <strong>Low-risk administrative tasks may be completed by AI without prior human sign-off.</strong></p><p>Candidate claim extracted from the proposals; not yet rated.</p><p>Claim 3: <strong>At least half of any verified financial savings from AI should be reinvested in frontline staffing.</strong></p><p>Candidate claim extracted from the proposals; not yet rated.</p><p>Claim 4: <strong>Every AI model used in a public service must publish its full source code and model weights.</strong></p><p>Candidate claim extracted from the proposals; not yet rated.</p>",
      synthesis_published: true,
      is_active: false,
      responses: [
        {
          id: 1,
          answers: {
            q1: {
              position: "I want shorter queues without an unaccountable service. A human appeal should exist for decisions about access. Routine appointment allocation might run automatically, with a route to correct errors. Staff should share in the savings, although an inflexible percentage could limit other improvements. Publishing model code seems an attractive transparency requirement, but I need to understand procurement and security implications."
            }
          },
          email: "synthetic-expert-1",
          timestamp: "2026-09-07T16:16:09.109216",
          version: 1
        },
        {
          id: 2,
          answers: {
            q1: {
              position: "Allow bounded administrative automation with logging, reversibility and escalation. A human appeal matters for consequential decisions, but a review for every trivial automated event may consume the benefits. I oppose a fixed staffing earmark: use verified savings where they do most good. Full release of every model is too absolute; independent access and public evaluation reports can offer other forms of scrutiny."
            }
          },
          email: "synthetic-expert-2",
          timestamp: "2026-09-07T16:16:09.118835",
          version: 1
        },
        {
          id: 3,
          answers: {
            q1: {
              position: "Access must include people who cannot navigate a digital complaint. Guarantee a human review and accessible routes to request it. I am wary of calling something low-risk when errors accumulate for disabled people. Reinvest savings in frontline staff who can help. Open source sounds desirable, but I cannot judge whether weights disclosure is necessary for accountability."
            }
          },
          email: "synthetic-expert-3",
          timestamp: "2026-09-07T16:16:09.134303",
          version: 1
        },
        {
          id: 4,
          answers: {
            q1: {
              position: "Technology should augment staff and retain human accountability. I want appeals, human checks before automated actions, and at least half of verified savings reinvested in frontline staffing. Without an earmark, service improvement can become a euphemism for job cuts. I initially favour publishing code and weights because commercial secrecy should not prevent scrutiny."
            }
          },
          email: "synthetic-expert-4",
          timestamp: "2026-09-07T16:16:09.142746",
          version: 1
        },
        {
          id: 5,
          answers: {
            q1: {
              position: "Consider the opportunity cost of safeguards as well as their benefits. I support an appeal on access decisions and automation of reversible administrative work. A compulsory fifty-percent staffing earmark may stop spending on whichever service need is most urgent. I favour openness as a default and initially support full code and weights release, but would reconsider if the rule excluded useful auditable options."
            }
          },
          email: "synthetic-expert-5",
          timestamp: "2026-09-07T16:16:09.154234",
          version: 1
        },
        {
          id: 6,
          answers: {
            q1: {
              position: "Public accountability requires contestability, reasons and independent scrutiny. Human appeal is essential. Automation of administrative work may hide rights-impacting decisions behind apparently routine categories, so low-risk needs a defensible definition. Staffing earmarks are not the same as rights protection. I support full code and weights disclosure because opaque suppliers can concentrate power."
            }
          },
          email: "synthetic-expert-6",
          timestamp: "2026-09-07T16:16:09.164596",
          version: 1
        },
        {
          id: 7,
          answers: {
            q1: {
              position: "Rural residents need working phone and in-person routes as well as apps. Human appeal should be available. I cannot judge unattended administration without a clear boundary and a fallback when connectivity fails. Reinvest in frontline people. I initially support open code and weights as a way for communities to inspect services rather than depending on vendor promises."
            }
          },
          email: "synthetic-expert-7",
          timestamp: "2026-09-07T16:16:09.176122",
          version: 1
        },
        {
          id: 8,
          answers: {
            q1: {
              position: "I see useful tools for letters and booking, but someone must own mistakes. Human appeal might help, though it could just shift the queue unless there are staff to act. I oppose unattended administrative decisions until we define what counts as reversible. Reinvest savings in people. I oppose mandatory publication of every model: clear explanations and independent audit could matter more to the service user."
            }
          },
          email: "synthetic-expert-8",
          timestamp: "2026-09-07T16:16:09.184543",
          version: 1
        }
      ]
    },
    {
      id: 2,
      round_number: 2,
      synthesis: "<p>Scripted synthetic panel. Eight fictional experts; no empirical evidence. Threshold 80%; stop after three rounds.</p><p>Claim 1: <strong>People must be able to request a human review of an AI decision affecting their access to a public service.</strong></p><p>Council service lead \u2014 Agree: Appeals should cover decisions affecting service access; routine bookings should not need prior review.</p><p>AI engineer \u2014 Disagree: As written, I worry that human review could be demanded for trivial administrative actions and swamp staff.</p><p>Disability advocate \u2014 Agree: The route to human review must work by phone and with assistance.</p><p>Public-service union representative \u2014 Agree: An accountable person must be available to reconsider an access decision.</p><p>Public finance economist \u2014 Agree: Appeal is a proportionate protection for decisions affecting access.</p><p>Civil liberties researcher \u2014 Agree: People must be able to contest an administrative judgment affecting them.</p><p>Rural community organiser \u2014 Agree: Appeals must include an offline route.</p><p>Frontline caseworker \u2014 Unable to judge \u2014 need more information: Without staff or a review deadline I cannot tell whether the appeal is meaningful.</p><p>Claim 2: <strong>Low-risk administrative tasks may be completed by AI without prior human sign-off.</strong></p><p>Council service lead \u2014 Agree: A reversible booking is a useful bounded test.</p><p>AI engineer \u2014 Agree: Allow automation with logs, reversibility and escalation.</p><p>Disability advocate \u2014 Disagree: Repeated small errors may disproportionately harm disabled users, so I oppose without boundaries.</p><p>Public-service union representative \u2014 Disagree: I oppose removing sign-off while low-risk remains vague.</p><p>Public finance economist \u2014 Agree: Reversible administrative automation can be assessed separately from eligibility.</p><p>Civil liberties researcher \u2014 Disagree: The boundary between administration and access is porous; I retain opposition.</p><p>Rural community organiser \u2014 Unable to judge \u2014 need more information: I cannot judge until a failed automated action can be reversed locally.</p><p>Frontline caseworker \u2014 Agree: I support tightly reversible tasks with a named owner.</p><p>Claim 3: <strong>At least half of any verified financial savings from AI should be reinvested in frontline staffing.</strong></p><p>Council service lead \u2014 Agree: Frontline capacity is the visible service bottleneck, so I support the earmark.</p><p>AI engineer \u2014 Disagree: An automatic staffing earmark might prevent investment in better accessibility or infrastructure.</p><p>Disability advocate \u2014 Agree: People need trained staff to resolve access problems.</p><p>Public-service union representative \u2014 Agree: A protected share makes the promise to augment people credible.</p><p>Public finance economist \u2014 Disagree: Spend savings on the greatest unmet need, not a preselected input.</p><p>Civil liberties researcher \u2014 Disagree: Budget earmarking does not guarantee accountability.</p><p>Rural community organiser \u2014 Agree: Rural service capacity needs protected investment.</p><p>Frontline caseworker \u2014 Disagree: I favour capacity but oppose fixing the share before knowing service needs.</p><p>Claim 4: <strong>Every AI model used in a public service must publish its full source code and model weights.</strong></p><p>Council service lead \u2014 Agree: I initially support full release as a simple accountability rule.</p><p>AI engineer \u2014 Disagree: Full release is not the only scrutiny mechanism; independent inspection and published evaluation may suffice.</p><p>Disability advocate \u2014 Unable to judge \u2014 need more information: I need to know what full release adds beyond independent inspection.</p><p>Public-service union representative \u2014 Agree: Code and weights should be open so staff are not asked to trust a black box.</p><p>Public finance economist \u2014 Agree: I support the release rule initially because it makes inspection possible.</p><p>Civil liberties researcher \u2014 Agree: Full disclosure limits supplier power and permits independent scrutiny.</p><p>Rural community organiser \u2014 Agree: Open release could let communities examine systems themselves.</p><p>Frontline caseworker \u2014 Disagree: Users need a useful explanation and a route to correction; model weights alone provide neither.</p>",
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
              position: "Appeals should cover decisions affecting service access; routine bookings should not need prior review."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "A reversible booking is a useful bounded test."
            },
            q5: {
              position: "Agree"
            },
            q6: {
              position: "Frontline capacity is the visible service bottleneck, so I support the earmark."
            },
            q7: {
              position: "Agree"
            },
            q8: {
              position: "I initially support full release as a simple accountability rule."
            }
          },
          email: "synthetic-expert-1",
          timestamp: "2026-09-07T16:16:09.249040",
          version: 1
        },
        {
          id: 10,
          answers: {
            q1: {
              position: "Disagree"
            },
            q2: {
              position: "As written, I worry that human review could be demanded for trivial administrative actions and swamp staff."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "Allow automation with logs, reversibility and escalation."
            },
            q5: {
              position: "Disagree"
            },
            q6: {
              position: "An automatic staffing earmark might prevent investment in better accessibility or infrastructure."
            },
            q7: {
              position: "Disagree"
            },
            q8: {
              position: "Full release is not the only scrutiny mechanism; independent inspection and published evaluation may suffice."
            }
          },
          email: "synthetic-expert-2",
          timestamp: "2026-09-07T16:16:09.260418",
          version: 1
        },
        {
          id: 11,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "The route to human review must work by phone and with assistance."
            },
            q3: {
              position: "Disagree"
            },
            q4: {
              position: "Repeated small errors may disproportionately harm disabled users, so I oppose without boundaries."
            },
            q5: {
              position: "Agree"
            },
            q6: {
              position: "People need trained staff to resolve access problems."
            },
            q7: {
              position: "Unable to judge \u2014 need more information"
            },
            q8: {
              position: "I need to know what full release adds beyond independent inspection."
            }
          },
          email: "synthetic-expert-3",
          timestamp: "2026-09-07T16:16:09.274948",
          version: 1
        },
        {
          id: 12,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "An accountable person must be available to reconsider an access decision."
            },
            q3: {
              position: "Disagree"
            },
            q4: {
              position: "I oppose removing sign-off while low-risk remains vague."
            },
            q5: {
              position: "Agree"
            },
            q6: {
              position: "A protected share makes the promise to augment people credible."
            },
            q7: {
              position: "Agree"
            },
            q8: {
              position: "Code and weights should be open so staff are not asked to trust a black box."
            }
          },
          email: "synthetic-expert-4",
          timestamp: "2026-09-07T16:16:09.290245",
          version: 1
        },
        {
          id: 13,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "Appeal is a proportionate protection for decisions affecting access."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "Reversible administrative automation can be assessed separately from eligibility."
            },
            q5: {
              position: "Disagree"
            },
            q6: {
              position: "Spend savings on the greatest unmet need, not a preselected input."
            },
            q7: {
              position: "Agree"
            },
            q8: {
              position: "I support the release rule initially because it makes inspection possible."
            }
          },
          email: "synthetic-expert-5",
          timestamp: "2026-09-07T16:16:09.298613",
          version: 1
        },
        {
          id: 14,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "People must be able to contest an administrative judgment affecting them."
            },
            q3: {
              position: "Disagree"
            },
            q4: {
              position: "The boundary between administration and access is porous; I retain opposition."
            },
            q5: {
              position: "Disagree"
            },
            q6: {
              position: "Budget earmarking does not guarantee accountability."
            },
            q7: {
              position: "Agree"
            },
            q8: {
              position: "Full disclosure limits supplier power and permits independent scrutiny."
            }
          },
          email: "synthetic-expert-6",
          timestamp: "2026-09-07T16:16:09.307348",
          version: 1
        },
        {
          id: 15,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "Appeals must include an offline route."
            },
            q3: {
              position: "Unable to judge \u2014 need more information"
            },
            q4: {
              position: "I cannot judge until a failed automated action can be reversed locally."
            },
            q5: {
              position: "Agree"
            },
            q6: {
              position: "Rural service capacity needs protected investment."
            },
            q7: {
              position: "Agree"
            },
            q8: {
              position: "Open release could let communities examine systems themselves."
            }
          },
          email: "synthetic-expert-7",
          timestamp: "2026-09-07T16:16:09.319849",
          version: 1
        },
        {
          id: 16,
          answers: {
            q1: {
              position: "Unable to judge \u2014 need more information"
            },
            q2: {
              position: "Without staff or a review deadline I cannot tell whether the appeal is meaningful."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "I support tightly reversible tasks with a named owner."
            },
            q5: {
              position: "Disagree"
            },
            q6: {
              position: "I favour capacity but oppose fixing the share before knowing service needs."
            },
            q7: {
              position: "Disagree"
            },
            q8: {
              position: "Users need a useful explanation and a route to correction; model weights alone provide neither."
            }
          },
          email: "synthetic-expert-8",
          timestamp: "2026-09-07T16:16:09.338657",
          version: 1
        }
      ]
    },
    {
      id: 3,
      round_number: 3,
      synthesis: "<p>Scripted synthetic panel. Eight fictional experts; no empirical evidence. Threshold 80%; stop after three rounds.</p><p>Claim 1: <strong>People must be able to request a human review of an AI decision affecting their access to a public service.</strong></p><p>Council service lead \u2014 Agree: I retain support. Review must be accessible and able to correct the original outcome.</p><p>AI engineer \u2014 Agree: I change to agree after the panel separates access decisions from routine automation. An appeal after an access decision is not a requirement for prior sign-off on every booking.</p><p>Disability advocate \u2014 Agree: I retain support, conditional on an assisted and offline route.</p><p>Public-service union representative \u2014 Agree: I retain support: a review must be meaningful, not a rubber stamp.</p><p>Public finance economist \u2014 Agree: I retain support for an appeal on access decisions.</p><p>Civil liberties researcher \u2014 Agree: I retain support. Review needs independence from the original automated process.</p><p>Rural community organiser \u2014 Agree: I retain support with phone and face-to-face routes.</p><p>Frontline caseworker \u2014 Agree: I change from unsure to agree with the principle. The disability advocate clarifies that a usable human route is a design requirement; staffing and deadlines remain implementation conditions.</p><p>Claim 2: <strong>Low-risk administrative tasks may be completed by AI without prior human sign-off.</strong></p><p>Council service lead \u2014 Agree: I retain support for reversible administration, excluding eligibility and enforcement.</p><p>AI engineer \u2014 Agree: I retain support for bounded, logged and reversible tasks.</p><p>Disability advocate \u2014 Unable to judge \u2014 need more information: I move from disagree to unable to judge. Reversibility addresses part of my concern, but I still need evidence on cumulative accessibility errors.</p><p>Public-service union representative \u2014 Agree: I change to agree for reversible administrative work. The caseworker separates booking from benefit eligibility, and I still oppose autonomous eligibility decisions.</p><p>Public finance economist \u2014 Agree: I retain support, with measured errors and reversal.</p><p>Civil liberties researcher \u2014 Disagree: I retain disagreement. Administrative routing can determine practical access even when it is nominally reversible.</p><p>Rural community organiser \u2014 Agree: I change from unsure to agree with locally reversible tasks and an offline fallback. I would oppose removing those conditions.</p><p>Frontline caseworker \u2014 Agree: I retain support for reversible booking and correspondence, not eligibility or enforcement.</p><p>Claim 3: <strong>At least half of any verified financial savings from AI should be reinvested in frontline staffing.</strong></p><p>Council service lead \u2014 Agree: I retain support: staff capacity is the bottleneck I would address first.</p><p>AI engineer \u2014 Disagree: I retain opposition. Ring-fencing inputs is different from improving outcomes.</p><p>Disability advocate \u2014 Agree: I retain support for staffing that makes appeals accessible.</p><p>Public-service union representative \u2014 Agree: I retain support. My unresolved disagreement with the economist is about commitment to staff, not the arithmetic of savings.</p><p>Public finance economist \u2014 Disagree: I retain opposition. The union values a credible staffing commitment; I value flexibility to address whichever need is greatest. That trade-off remains unresolved.</p><p>Civil liberties researcher \u2014 Disagree: I retain opposition: funding rules are no substitute for rights and scrutiny.</p><p>Rural community organiser \u2014 Agree: I retain support: without a protected share, sparse communities could lose more service capacity.</p><p>Frontline caseworker \u2014 Disagree: I retain opposition to a fixed share, while supporting adequate frontline capacity.</p><p>Claim 4: <strong>Every AI model used in a public service must publish its full source code and model weights.</strong></p><p>Council service lead \u2014 Disagree: I change to disagree. The engineer distinguishes public accountability from universal weights release; independent inspection could be required without excluding every closed model.</p><p>AI engineer \u2014 Disagree: I retain opposition to every. Public evaluations and independent inspection are a less absolute alternative.</p><p>Disability advocate \u2014 Disagree: I move from unsure to disagree with the universal rule. A code release does not itself make an inaccessible service contestable; require independent scrutiny and accessible explanations.</p><p>Public-service union representative \u2014 Disagree: I change to disagree with the absolute wording. Staff need enforceable inspection and audit rights; universal public release is not the only way to secure them.</p><p>Public finance economist \u2014 Disagree: I change to disagree. The engineer has identified a feasible alternative\u2014independent inspection plus published evaluation\u2014so I no longer require every model to be fully released.</p><p>Civil liberties researcher \u2014 Agree: I retain support. My concern is concentration of power: auditor access can depend on contracts, whereas public disclosure permits wider challenge. This remains a substantive minority view.</p><p>Rural community organiser \u2014 Disagree: I change to disagree. The accessibility argument persuades me that usable accountability matters more than universal weights release; I still want public reporting.</p><p>Frontline caseworker \u2014 Disagree: I retain opposition: explain the decision, provide correction, and allow independent inspection.</p>",
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
              position: "I retain support. Review must be accessible and able to correct the original outcome."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "I retain support for reversible administration, excluding eligibility and enforcement."
            },
            q5: {
              position: "Agree"
            },
            q6: {
              position: "I retain support: staff capacity is the bottleneck I would address first."
            },
            q7: {
              position: "Disagree"
            },
            q8: {
              position: "I change to disagree. The engineer distinguishes public accountability from universal weights release; independent inspection could be required without excluding every closed model."
            }
          },
          email: "synthetic-expert-1",
          timestamp: "2026-09-07T16:16:09.399075",
          version: 1
        },
        {
          id: 18,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "I change to agree after the panel separates access decisions from routine automation. An appeal after an access decision is not a requirement for prior sign-off on every booking."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "I retain support for bounded, logged and reversible tasks."
            },
            q5: {
              position: "Disagree"
            },
            q6: {
              position: "I retain opposition. Ring-fencing inputs is different from improving outcomes."
            },
            q7: {
              position: "Disagree"
            },
            q8: {
              position: "I retain opposition to every. Public evaluations and independent inspection are a less absolute alternative."
            }
          },
          email: "synthetic-expert-2",
          timestamp: "2026-09-07T16:16:09.414207",
          version: 1
        },
        {
          id: 19,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "I retain support, conditional on an assisted and offline route."
            },
            q3: {
              position: "Unable to judge \u2014 need more information"
            },
            q4: {
              position: "I move from disagree to unable to judge. Reversibility addresses part of my concern, but I still need evidence on cumulative accessibility errors."
            },
            q5: {
              position: "Agree"
            },
            q6: {
              position: "I retain support for staffing that makes appeals accessible."
            },
            q7: {
              position: "Disagree"
            },
            q8: {
              position: "I move from unsure to disagree with the universal rule. A code release does not itself make an inaccessible service contestable; require independent scrutiny and accessible explanations."
            }
          },
          email: "synthetic-expert-3",
          timestamp: "2026-09-07T16:16:09.424763",
          version: 1
        },
        {
          id: 20,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "I retain support: a review must be meaningful, not a rubber stamp."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "I change to agree for reversible administrative work. The caseworker separates booking from benefit eligibility, and I still oppose autonomous eligibility decisions."
            },
            q5: {
              position: "Agree"
            },
            q6: {
              position: "I retain support. My unresolved disagreement with the economist is about commitment to staff, not the arithmetic of savings."
            },
            q7: {
              position: "Disagree"
            },
            q8: {
              position: "I change to disagree with the absolute wording. Staff need enforceable inspection and audit rights; universal public release is not the only way to secure them."
            }
          },
          email: "synthetic-expert-4",
          timestamp: "2026-09-07T16:16:09.437885",
          version: 1
        },
        {
          id: 21,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "I retain support for an appeal on access decisions."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "I retain support, with measured errors and reversal."
            },
            q5: {
              position: "Disagree"
            },
            q6: {
              position: "I retain opposition. The union values a credible staffing commitment; I value flexibility to address whichever need is greatest. That trade-off remains unresolved."
            },
            q7: {
              position: "Disagree"
            },
            q8: {
              position: "I change to disagree. The engineer has identified a feasible alternative\u2014independent inspection plus published evaluation\u2014so I no longer require every model to be fully released."
            }
          },
          email: "synthetic-expert-5",
          timestamp: "2026-09-07T16:16:09.449360",
          version: 1
        },
        {
          id: 22,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "I retain support. Review needs independence from the original automated process."
            },
            q3: {
              position: "Disagree"
            },
            q4: {
              position: "I retain disagreement. Administrative routing can determine practical access even when it is nominally reversible."
            },
            q5: {
              position: "Disagree"
            },
            q6: {
              position: "I retain opposition: funding rules are no substitute for rights and scrutiny."
            },
            q7: {
              position: "Agree"
            },
            q8: {
              position: "I retain support. My concern is concentration of power: auditor access can depend on contracts, whereas public disclosure permits wider challenge. This remains a substantive minority view."
            }
          },
          email: "synthetic-expert-6",
          timestamp: "2026-09-07T16:16:09.463921",
          version: 1
        },
        {
          id: 23,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "I retain support with phone and face-to-face routes."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "I change from unsure to agree with locally reversible tasks and an offline fallback. I would oppose removing those conditions."
            },
            q5: {
              position: "Agree"
            },
            q6: {
              position: "I retain support: without a protected share, sparse communities could lose more service capacity."
            },
            q7: {
              position: "Disagree"
            },
            q8: {
              position: "I change to disagree. The accessibility argument persuades me that usable accountability matters more than universal weights release; I still want public reporting."
            }
          },
          email: "synthetic-expert-7",
          timestamp: "2026-09-07T16:16:09.476148",
          version: 1
        },
        {
          id: 24,
          answers: {
            q1: {
              position: "Agree"
            },
            q2: {
              position: "I change from unsure to agree with the principle. The disability advocate clarifies that a usable human route is a design requirement; staffing and deadlines remain implementation conditions."
            },
            q3: {
              position: "Agree"
            },
            q4: {
              position: "I retain support for reversible booking and correspondence, not eligibility or enforcement."
            },
            q5: {
              position: "Disagree"
            },
            q6: {
              position: "I retain opposition to a fixed share, while supporting adequate frontline capacity."
            },
            q7: {
              position: "Disagree"
            },
            q8: {
              position: "I retain opposition: explain the decision, provide correction, and allow independent inspection."
            }
          },
          email: "synthetic-expert-8",
          timestamp: "2026-09-07T16:16:09.487638",
          version: 1
        }
      ]
    }
  ]
};

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
  const previous = rounds.find((r) => r.round_number === round.round_number - 1);
  const previousResponses = responses.find((r) => r.id === previous?.id);
  return round.questions.flatMap((q, index) => {
    if (!ratingQuestion(q)) return [];
    const priorIndex = previous?.questions.findIndex((p) => ratingQuestion(p) && !!q.questionId && p.questionId === q.questionId && wording(p) === wording(q) && JSON.stringify(p.options) === JSON.stringify(q.options)) ?? -1;
    const votes = counts(q, index, current);
    const prior = priorIndex >= 0 && previousResponses ? counts(previous.questions[priorIndex], priorIndex, previousResponses) : null;
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
      previousRound: previous?.round_number,
      delta: percent !== null && prior && priorAnswered ? percent - 100 * prior[0] / priorAnswered : null,
      previousAnswered: priorAnswered
    }];
  });
}
function synthesisProvenanceNote(round, rounds) {
  if (!round?.synthesis?.trim()) return null;
  if (round.response_count === 0) return `No responses have been submitted in Round ${round.round_number}. This text is background or a draft, not a result from this round.`;
  const previous = rounds.find((r) => r.round_number === round.round_number - 1);
  if (previous?.synthesis?.trim() === round.synthesis.trim()) return `This text matches Round ${previous.round_number}. Review it against this round\u2019s responses before treating it as an updated result.`;
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
function renderDelphiPlanner(root2, round, rounds, responses, publish) {
  const box = el("div");
  box.className = "di-planner";
  root2.append(box);
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
function renderDelphiInsights(root2, round, rounds, responses, refresh, publish) {
  const rows = ratingProgress(round, rounds, responses);
  const priorOpen = new Set(Array.from(root2.querySelectorAll("details[open]")).map((d) => d.dataset.key));
  const filter = root2.dataset.filter || "All claims";
  const existingPlanner = root2.dataset.plannerRound === String(round.id) ? root2.querySelector(".di-planner") : null;
  root2.dataset.plannerRound = String(round.id);
  root2.replaceChildren();
  root2.className = "card delphi-insights";
  const head = node("div", "", "di-heading");
  head.append(node("div", "THE PANEL\u2019S VIEW", "di-eyebrow"));
  const title = node("div", "", "di-title");
  title.append(node("h2", "Where views stand"));
  if (refresh) title.append(button("Refresh", refresh));
  head.append(title);
  root2.append(head);
  const ordered = [...rounds].filter((r) => r.round_number <= round.round_number).sort((a, b) => a.round_number - b.round_number);
  const actual = responses.find((r) => r.id === round.id)?.responses.length;
  const intro = node("p", `Round ${round.round_number} \xB7 ${actual ?? "\u2014"} responses${rows.length ? ` \xB7 ${rows.length} claims` : ""}`, "di-subtitle");
  root2.append(intro);
  const note = synthesisProvenanceNote(round, rounds);
  if (note) root2.append(node("p", note, "di-warning"));
  if (!rows.length) {
    root2.append(node("p", "Ideas first. This round gathers independent proposals; the next round lets the panel rate the resulting claims.", "di-empty"));
    return;
  }
  const cats = ["Mostly agree", "Leaning agree", "Divided", "Leaning disagree", "Mostly disagree", "Uncertain"];
  const overview = node("div", "", "di-overview");
  cats.forEach((label) => {
    const item = node("div");
    item.append(node("strong", String(rows.filter((r) => category(r) === label).length)), node("span", label));
    overview.append(item);
  });
  root2.append(overview);
  const filters = node("div", "", "di-filters");
  filters.setAttribute("role", "group");
  filters.setAttribute("aria-label", "Filter claims");
  ["All claims", ...cats].forEach((label) => {
    const b = button(label, () => {
      root2.dataset.filter = label;
      renderDelphiInsights(root2, round, rounds, responses, refresh, publish);
    });
    b.setAttribute("aria-pressed", String(filter === label));
    filters.append(b);
  });
  root2.append(filters);
  const list = node("div", "", "di-claims");
  const selected2 = rows.filter((r) => filter === "All claims" || category(r) === filter);
  if (!selected2.length) list.append(node("p", "No claims in this group.", "di-empty"));
  selected2.forEach((row) => {
    const article = node("article", "", "di-claim");
    const heading = node("div", "", "di-claim-top");
    const left = node("div");
    left.append(node("span", category(row), "di-status " + category(row).toLowerCase().replaceAll(" ", "-")), node("h3", row.label.replace(/^Claim\s+\d+:\s*/i, "")));
    heading.append(left);
    const score = node("div", "", "di-score");
    score.append(node("strong", row.percent === null ? "\u2014" : `${Math.round(row.percent)}%`), node("span", "agree"));
    heading.append(score);
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
    article.append(bar);
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
    article.append(legend);
    if (row.history.filter((h) => h.n > 0).length > 1) {
      const trend = node("div", "", "di-trend");
      trend.append(node("span", "Agreement:"));
      row.history.filter((h) => h.n > 0).slice(-2).forEach((h, i) => {
        if (i) trend.append(node("span", "\u2192", "di-arrow"));
        trend.append(node("span", `R${h.round} ${Math.round(h.percent)}%`));
      });
      if (row.delta !== null) trend.append(node("strong", row.delta === 0 ? "Unchanged" : `${row.delta > 0 ? "+" : ""}${Math.round(row.delta)} points`));
      article.append(trend);
    }
    if (row.matched) article.append(node("p", `${row.changed} of ${row.matched} returning respondents changed position group since Round ${row.previousRound}.`, "di-movement"));
    const detail = document.createElement("details");
    detail.className = "di-reasons";
    detail.dataset.key = row.key;
    detail.open = priorOpen.has(row.key);
    const summary = node("summary", "Reasons & history");
    detail.append(summary);
    detail.append(node("p", row.history.map((h) => `Round ${h.round}: ${h.n ? Math.round(h.percent) + "% agree" : "No ratings"} (${h.n} answered)`).join(" \xB7 ")));
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
  root2.append(list);
  const archived = node("details", "", "di-method");
  archived.append(node("summary", "Earlier claims not rated in this round"));
  const seen = new Set(rows.map((r) => r.key));
  [...ordered].reverse().filter((r) => r.id !== round.id).forEach((r) => ratingProgress(r, rounds, responses).forEach((row) => {
    if (seen.has(row.key)) return;
    seen.add(row.key);
    archived.append(node("p", `${row.label} \u2014 last rated Round ${r.round_number}: ${row.percent === null ? "no ratings" : Math.round(row.percent) + "% agree"} (${row.answered} answered). Not re-rated; no current-round result.`));
  }));
  if (archived.childElementCount > 1) root2.append(archived);
  if (existingPlanner) root2.append(existingPlanner);
  else if (round.is_active || !refresh) renderDelphiPlanner(root2, round, rounds, responses, publish);
  const methods = document.createElement("details");
  methods.className = "di-method";
  methods.dataset.key = "method";
  methods.open = priorOpen.has("method");
  methods.append(node("summary", "How to read these results"));
  methods.append(node("p", "These are recorded ratings, not AI-inferred agreement. \u201CLeaning\u201D means a majority below 80%; \u201CDivided\u201D means neither side has a majority (unless uncertainty dominates). \u201CMostly\u201D means at least 80% of answered ratings; it is a descriptive display band, not a substitute for the study\u2019s declared consensus rule. Neutral, unsure and unrecognised answers remain in the denominator; missing answers are shown separately."));
  methods.append(node("p", "Round comparisons require identical claim identifiers, wording and scales. Movement counts compare position groups for unambiguously matched returning respondents; changing intensity within agree or disagree is not counted. Response numbers identify rows within this round only. Comments are original submitted words."));
  methods.append(node("p", ordered.map((r) => `Round ${r.round_number}: ${responses.find((x) => x.id === r.id)?.responses.length ?? r.response_count ?? "\u2014"} responses`).join(" \xB7 ")));
  methods.append(node("p", "Agreement can coexist with conditional support. Changes in panel composition can change percentages. A synthetic demonstration illustrates the process; it does not establish scientific validity."));
  root2.append(methods);
}

// src/legacy/delphiDemo.ts
var example = public_ai_results_default;
var el2 = (tag, text = "", cls = "") => {
  const n = document.createElement(tag);
  n.textContent = text;
  n.className = cls;
  return n;
};
var btn = (text, fn) => {
  const n = el2("button", text);
  n.type = "button";
  n.onclick = fn;
  return n;
};
var selected = 3;
function draw(root2) {
  root2.replaceChildren();
  const top = el2("div", "", "demo-topline");
  top.append(el2("span", "SYNTHETIC DELPHI \xB7 8 FICTIONAL EXPERTS", "di-eyebrow"));
  const standalone = location.pathname.startsWith("/examples/");
  const back = el2("a", standalone ? "Dashboard" : "Back to consultation");
  back.href = standalone ? "/" : location.pathname;
  top.append(back);
  root2.append(top);
  root2.append(el2("h2", example.fixture.title, "demo-title"));
  root2.append(el2("p", "1. Share ideas \xB7 2. Rate the claims \xB7 3. Review and rate again. The claims stay the same; the reasoning can develop.", "demo-deck"));
  const provenance = el2("details", "", "demo-protocol");
  provenance.append(el2("summary", "About this simulation"));
  provenance.append(el2("p", example.fixture.method + " The 24 submissions were processed by an isolated test instance of the application. This is a saved demonstration, separate from live consultation responses."));
  provenance.append(el2("p", "Protocol: eight returning participants; 80% agreement or disagreement, with uncertainty included; all eight responses required. Stop after three rounds and report unresolved claims. Claims stay unchanged between rating rounds."));
  root2.append(provenance);
  const nav = el2("nav", "", "demo-rounds");
  nav.setAttribute("aria-label", "Simulation rounds");
  const label = el2("label", "Viewing round ");
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Simulation round");
  example.rounds.forEach((r) => {
    const o = document.createElement("option");
    o.value = String(r.round_number);
    o.textContent = `Round ${r.round_number} \xB7 ${["Share ideas", "Rate the claims", "Review and rate again"][r.round_number - 1] || "Review"}`;
    o.selected = selected === r.round_number;
    select.append(o);
  });
  select.onchange = () => {
    selected = Number(select.value);
    draw(root2);
  };
  label.append(select);
  nav.append(label);
  root2.append(nav);
  const narrative = el2("div", "", "demo-narrative");
  if (selected === 1) {
    narrative.append(el2("h3", "Different starting points"), el2("p", "Eight roles bring different priorities: capacity, fairness, worker protection, fiscal flexibility and public accountability. Four candidate claims are distilled from their proposals; no agreement percentage is inferred from these paragraphs."));
  }
  if (selected === 2) {
    narrative.append(el2("h3", "The first ratings reveal the fault lines"), el2("p", "Human appeals have broad support. The staffing earmark splits the panel evenly. Five respondents favour universal model disclosure, while others question whether it is the right route to accountability."));
  }
  if (selected === 3) {
    narrative.append(el2("h3", "Common ground, with questions still open"), el2("p", "All eight support human appeal; seven reject universal model disclosure. Routine automation gains support but remains below the threshold. The staffing earmark stays split 4\u20134: protecting staff versus keeping budgets flexible."));
  }
  if (example.fixture.narratives) {
    narrative.replaceChildren(el2("h3", ["Independent starting points", "Where opinions differ", "What the panel learned"][selected - 1]), el2("p", example.fixture.narratives[selected - 1]));
  }
  root2.append(narrative);
  if (selected === 3) {
    const matrix = el2("details", "", "demo-matrix");
    matrix.append(el2("summary", "See the eight perspectives side by side"));
    const table = el2("table");
    table.append(el2("caption", "Round 2 \u2192 Round 3. Fictional roles; original claims unchanged."));
    const head = el2("tr");
    ["Perspective", ...example.fixture.short_labels || ["Human appeal", "Routine automation", "Staffing earmark", "Full model release"]].forEach((t) => {
      const th = el2("th", t);
      th.setAttribute("scope", "col");
      head.append(th);
    });
    const thead = el2("thead");
    thead.append(head);
    table.append(thead);
    const tbody = el2("tbody");
    example.fixture.experts.forEach((e) => {
      const row = el2("tr");
      const label2 = el2("th", e.role);
      label2.setAttribute("scope", "row");
      row.append(label2);
      e.round3.votes.forEach((v, i) => {
        const short = (x) => x.startsWith("Unable") ? "Unsure" : x;
        const before = e.round2.votes[i];
        const cell = el2("td", before === v ? short(v) : `${short(before)} \u2192 ${short(v)}`);
        if (before !== v) cell.className = "demo-vote-changed";
        row.append(cell);
      });
      tbody.append(row);
    });
    table.append(tbody);
    const scroll = el2("div", "", "demo-table-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("role", "region");
    scroll.setAttribute("aria-label", "Perspective ratings, scroll horizontally on small screens");
    scroll.append(table);
    matrix.append(scroll);
    root2.append(matrix);
  }
  if (selected === 1) {
    const proposals = el2("div", "", "demo-proposals");
    example.fixture.experts.forEach((e, i) => {
      const d = el2("details");
      d.append(el2("summary", `Perspective ${i + 1} \xB7 ${e.role}`), el2("p", e.proposal));
      proposals.append(d);
    });
    root2.append(proposals);
    const claims = el2("section", "", "demo-candidates");
    claims.append(el2("h3", "Four claims for the next round"));
    example.fixture.claims.forEach((c, i) => claims.append(el2("p", `${i + 1}. ${c}`)));
    root2.append(claims);
  } else {
    const results = el2("section");
    results.setAttribute("aria-label", "Synthetic Delphi results");
    renderDelphiInsights(results, example.rounds[selected - 1], example.rounds, example.responses);
    root2.append(results);
  }
  const footer = el2("div", "", "demo-footer");
  if (selected > 1) footer.append(btn("Previous round", () => {
    selected--;
    draw(root2);
  }));
  if (selected < 3) footer.append(btn("Continue to next round", () => {
    selected++;
    draw(root2);
  }));
  root2.append(footer);
}
function mountResearchExample(root2) {
  example = research_ai_results_default;
  selected = 3;
  draw(root2);
}
function sync() {
  if (location.pathname.startsWith("/examples/")) return;
  if (new URLSearchParams(location.search).get("demo") === "research-ai") {
    location.replace("/examples/research-ai.html");
    return;
  }
  for (const [id, label] of [["toggle-public-share", "Public share link"], ["toggle-consent-step", "Consent step"]]) {
    const control = document.getElementById(id);
    if (control && !control.getAttribute("aria-label")) control.setAttribute("aria-label", label);
  }
  const main = document.querySelector("main");
  const isSummary = /^\/admin\/form\/\d+\/summary\/?$/.test(location.pathname) && !!main?.querySelector("#summary-workspace-select");
  if (isSummary && main) {
    for (const label of main.querySelectorAll("aside span")) if (label.childElementCount === 0 && label.textContent === "Participants") label.textContent = "Responses";
    for (const analysis of main.querySelectorAll(".structured-synthesis")) {
      const values = Array.from(analysis.querySelectorAll(".structured-stat-value"));
      const empty = values.length === 4 && values.every((v) => v.textContent?.trim() === "0") && !analysis.querySelector(".structured-section-header");
      analysis.classList.toggle("di-empty-analysis", empty);
      const existing = analysis.querySelector(".di-analysis-empty");
      if (empty && !existing) analysis.prepend(el2("p", "No structured analysis items are available for this synthesis. See recorded participant ratings in the Synthesis view.", "di-analysis-empty"));
      if (!empty) existing?.remove();
    }
  }
  const demoKey = new URLSearchParams(location.search).get("demo");
  const requested = demoKey === "public-ai" || demoKey === "research-ai";
  example = demoKey === "research-ai" ? research_ai_results_default : public_ai_results_default;
  const active = isSummary && requested;
  document.body.classList.toggle("delphi-demo-active", active);
  let root2 = document.getElementById("delphi-demo-workspace");
  if (!active || root2?.dataset.example !== demoKey) {
    root2?.remove();
    root2 = null;
  }
  if (active && main && !root2) {
    root2 = el2("section", "", "demo-workspace");
    root2.id = "delphi-demo-workspace";
    root2.dataset.example = demoKey || "";
    selected = 3;
    const grid = main.querySelector(":scope > div > .grid");
    if (grid) {
      grid.before(root2);
      draw(root2);
    }
  }
  const researchRoute = /^\/admin\/form\/18(?:\/summary)?\/?$/.test(location.pathname);
  if (!researchRoute || requested) document.getElementById("research-example-link")?.remove();
  if (researchRoute && !requested && main && !document.getElementById("research-example-link")) {
    const link = el2("a", "Explore the completed synthetic example \u2192", "demo-dashboard-link");
    link.id = "research-example-link";
    link.href = "/examples/research-ai.html";
    main.prepend(link);
  }
  const dashboard = location.pathname === "/" && Array.from(main?.querySelectorAll("h1") || []).some((h) => h.textContent === "Consultations");
  if (!dashboard) document.getElementById("delphi-demo-link")?.remove();
  if (dashboard && !document.getElementById("delphi-demo-link")) {
    const link = el2("a", "", "demo-dashboard-link");
    link.id = "delphi-demo-link";
    link.href = "/examples/research-ai.html";
    link.append(el2("strong", "Example: AI in university research"), el2("span", "8 fictional experts \xB7 3 rounds \xB7 explore the completed example \u2192"));
    main.prepend(link);
  }
}
var timer;
new MutationObserver(() => {
  clearTimeout(timer);
  timer = setTimeout(sync, 100);
}).observe(document.body, { childList: true, subtree: true });
window.addEventListener("popstate", sync);
sync();

// src/examples/researchEntry.ts
var root = document.getElementById("research-example");
if (root) mountResearchExample(root);

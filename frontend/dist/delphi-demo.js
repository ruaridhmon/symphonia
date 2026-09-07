// frontend/src/demos/public-ai-results.json
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

// frontend/src/utils/answers.ts
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

// frontend/src/utils/delphiProgress.ts
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
    const commentIndex = round.questions.findIndex((p) => typeof p === "object" && p !== null && p.sectionTitle === q.sectionTitle && !!q.sectionTitle && /comment|clarification/i.test(String(p.label)));
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

// frontend/src/utils/renderDelphiInsights.ts
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
  return "Divided";
}
function renderDelphiInsights(root, round, rounds, responses, refresh) {
  const rows = ratingProgress(round, rounds, responses);
  const priorOpen = new Set(Array.from(root.querySelectorAll("details[open]")).map((d) => d.dataset.key));
  const filter = root.dataset.filter || "All claims";
  root.replaceChildren();
  root.className = "card delphi-insights";
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
    root.append(node("p", "Ideas first. This round gathers independent proposals; the next round lets the panel rate the resulting claims.", "di-empty"));
    return;
  }
  const cats = ["Mostly agree", "Mostly disagree", "Divided", "Uncertain"];
  const overview = node("div", "", "di-overview");
  cats.forEach((label) => {
    const item = node("div");
    item.append(node("strong", String(rows.filter((r) => category(r) === label).length)), node("span", label));
    overview.append(item);
  });
  root.append(overview);
  const filters = node("div", "", "di-filters");
  filters.setAttribute("role", "group");
  filters.setAttribute("aria-label", "Filter claims");
  ["All claims", ...cats].forEach((label) => {
    const b = button(label, () => {
      root.dataset.filter = label;
      renderDelphiInsights(root, round, rounds, responses, refresh);
    });
    b.setAttribute("aria-pressed", String(filter === label));
    filters.append(b);
  });
  root.append(filters);
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
      row.history.filter((h) => h.n > 0).forEach((h, i) => {
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
    const summary = node("summary", "Read reasons & changes");
    detail.append(summary);
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
  const methods = document.createElement("details");
  methods.className = "di-method";
  methods.dataset.key = "method";
  methods.open = priorOpen.has("method");
  methods.append(node("summary", "How to read these results"));
  methods.append(node("p", "These are recorded ratings, not AI-inferred agreement. \u201CMostly\u201D means at least 80% of answered ratings; it is a descriptive display band, not a substitute for the study\u2019s declared consensus rule. Neutral, unsure and unrecognised answers remain in the denominator; missing answers are shown separately."));
  methods.append(node("p", "Round comparisons require identical claim identifiers, wording and scales. Movement counts compare position groups for unambiguously matched returning respondents; changing intensity within agree or disagree is not counted. Response numbers identify rows within this round only. Comments are original submitted words."));
  methods.append(node("p", ordered.map((r) => `Round ${r.round_number}: ${responses.find((x) => x.id === r.id)?.responses.length ?? r.response_count ?? "\u2014"} responses`).join(" \xB7 ")));
  methods.append(node("p", "Agreement can coexist with conditional support. Changes in panel composition can change percentages. A synthetic demonstration illustrates the process; it does not establish scientific validity."));
  root.append(methods);
}

// frontend/src/legacy/delphiDemo.ts
var example = public_ai_results_default;
var el = (tag, text = "", cls = "") => {
  const n = document.createElement(tag);
  n.textContent = text;
  n.className = cls;
  return n;
};
var btn = (text, fn) => {
  const n = el("button", text);
  n.type = "button";
  n.onclick = fn;
  return n;
};
var selected = 3;
function draw(root) {
  root.replaceChildren();
  const top = el("div", "", "demo-topline");
  top.append(el("span", "SYNTHETIC DELPHI \xB7 8 FICTIONAL EXPERTS", "di-eyebrow"));
  const back = el("a", "Back to consultation");
  back.href = location.pathname;
  top.append(back);
  root.append(top);
  root.append(el("h2", "Can a panel find common ground without losing its disagreements?", "demo-title"));
  root.append(el("p", "Explore three rounds on AI in UK public services. Follow the judgments, inspect the reasons, and see where the panel remains divided.", "demo-deck"));
  const provenance = el("details", "", "demo-protocol");
  provenance.append(el("summary", "About this simulation"));
  provenance.append(el("p", example.fixture.method + " The 24 submissions were processed by an isolated test instance of the application. This is a saved demonstration, separate from live consultation responses."));
  provenance.append(el("p", "Protocol: eight returning participants; 80% agreement or disagreement, with uncertainty included; all eight responses required. Stop after three rounds and report unresolved claims. Claims stay unchanged between rating rounds."));
  root.append(provenance);
  const nav = el("nav", "", "demo-rounds");
  nav.setAttribute("aria-label", "Simulation rounds");
  ["1 \xB7 Independent ideas", "2 \xB7 First ratings", "3 \xB7 Reconsideration"].forEach((label, i) => {
    const b = btn(label, () => {
      selected = i + 1;
      draw(root);
    });
    b.setAttribute("aria-current", selected === i + 1 ? "step" : "false");
    nav.append(b);
  });
  root.append(nav);
  const narrative = el("div", "", "demo-narrative");
  if (selected === 1) {
    narrative.append(el("h3", "Different starting points"), el("p", "Eight roles bring different priorities: capacity, fairness, worker protection, fiscal flexibility and public accountability. Four candidate claims are distilled from their proposals; no agreement percentage is inferred from these paragraphs."));
  }
  if (selected === 2) {
    narrative.append(el("h3", "The first ratings reveal the fault lines"), el("p", "Human appeals have broad support. The staffing earmark splits the panel evenly. Five respondents favour universal model disclosure, while others question whether it is the right route to accountability."));
  }
  if (selected === 3) {
    narrative.append(el("h3", "Common ground, with questions still open"), el("p", "All eight support human appeal; seven reject universal model disclosure. Routine automation gains support but remains below the threshold. The staffing earmark stays split 4\u20134: protecting staff versus keeping budgets flexible."));
    const proposed = el("details", "", "demo-proposal");
    proposed.append(el("summary", "A new proposal to test next"), el("p", "Require independent model inspection, public evaluation reports and accessible explanations, with justified exceptions to public release of weights."), el("p", "Proposed from the discussion, not rated. It must receive a new claim identifier and a fresh baseline; the rejected claim\u2019s votes cannot be transferred to it."));
    narrative.append(proposed);
  }
  root.append(narrative);
  if (selected === 3) {
    const matrix = el("details", "", "demo-matrix");
    matrix.append(el("summary", "See the eight perspectives side by side"));
    const table = el("table");
    table.append(el("caption", "Round 2 \u2192 Round 3. Fictional roles; original claims unchanged."));
    const head = el("tr");
    ["Perspective", "Human appeal", "Routine automation", "Staffing earmark", "Full model release"].forEach((t) => {
      const th = el("th", t);
      th.setAttribute("scope", "col");
      head.append(th);
    });
    const thead = el("thead");
    thead.append(head);
    table.append(thead);
    const tbody = el("tbody");
    example.fixture.experts.forEach((e) => {
      const row = el("tr");
      const label = el("th", e.role);
      label.setAttribute("scope", "row");
      row.append(label);
      e.round3.votes.forEach((v, i) => {
        const short = (x) => x.startsWith("Unable") ? "Unsure" : x;
        const before = e.round2.votes[i];
        const cell = el("td", before === v ? short(v) : `${short(before)} \u2192 ${short(v)}`);
        if (before !== v) cell.className = "demo-vote-changed";
        row.append(cell);
      });
      tbody.append(row);
    });
    table.append(tbody);
    const scroll = el("div", "", "demo-table-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("role", "region");
    scroll.setAttribute("aria-label", "Perspective ratings, scroll horizontally on small screens");
    scroll.append(table);
    matrix.append(scroll);
    root.append(matrix);
  }
  if (selected === 1) {
    const proposals = el("div", "", "demo-proposals");
    example.fixture.experts.forEach((e, i) => {
      const d = el("details");
      d.append(el("summary", `Perspective ${i + 1} \xB7 ${e.role}`), el("p", e.proposal));
      proposals.append(d);
    });
    root.append(proposals);
    const claims = el("section", "", "demo-candidates");
    claims.append(el("h3", "Four claims for the next round"));
    example.fixture.claims.forEach((c, i) => claims.append(el("p", `${i + 1}. ${c}`)));
    root.append(claims);
  } else {
    const results = el("section");
    results.setAttribute("aria-label", "Synthetic Delphi results");
    renderDelphiInsights(results, example.rounds[selected - 1], example.rounds, example.responses);
    root.append(results);
  }
  const footer = el("div", "", "demo-footer");
  if (selected > 1) footer.append(btn("Previous round", () => {
    selected--;
    draw(root);
  }));
  if (selected < 3) footer.append(btn("Continue to next round", () => {
    selected++;
    draw(root);
  }));
  root.append(footer);
}
function sync() {
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
      if (empty && !existing) analysis.prepend(el("p", "No structured analysis items are available for this synthesis. See recorded participant ratings in the Synthesis view.", "di-analysis-empty"));
      if (!empty) existing?.remove();
    }
  }
  const requested = new URLSearchParams(location.search).get("demo") === "public-ai";
  const active = isSummary && requested;
  document.body.classList.toggle("delphi-demo-active", active);
  let root = document.getElementById("delphi-demo-workspace");
  if (!active) {
    root?.remove();
    root = null;
  }
  if (active && main && !root) {
    root = el("section", "", "demo-workspace");
    root.id = "delphi-demo-workspace";
    const grid = main.querySelector(":scope > div > .grid");
    if (grid) {
      grid.before(root);
      draw(root);
    }
  }
  const dashboard = location.pathname === "/" && Array.from(main?.querySelectorAll("h1") || []).some((h) => h.textContent === "Consultations");
  if (!dashboard) document.getElementById("delphi-demo-link")?.remove();
  if (dashboard && !document.getElementById("delphi-demo-link")) {
    const link = el("a", "", "demo-dashboard-link");
    link.id = "delphi-demo-link";
    link.href = "/admin/form/17/summary?demo=public-ai";
    link.append(el("strong", "Explore a Delphi in action"), el("span", "8 fictional experts \xB7 3 rounds \xB7 see what changes and what stays divided \u2192"));
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

const examples=[
  {
    "topic": "AI in coursework",
    "role": "University educator",
    "sentences": [
      "We should allow students to use AI in coursework if they disclose it.",
      "They’ll use these tools in employment anyway.",
      "An oral examination would let us check that they understand what they submitted."
    ],
    "lanes": [
      [
        "Why allow AI?",
        [
          {
            "text": "Students will use AI at work.",
            "source": 1,
            "kind": "premise",
            "condition": null,
            "question": null
          },
          {
            "text": "Assessment should prepare students for workplace practices.",
            "source": null,
            "kind": "inferred",
            "condition": null,
            "question": "Should assessment reflect the tools used in employment?"
          },
          {
            "text": "Allow AI in coursework.",
            "source": 0,
            "kind": "recommendation",
            "condition": "Only if its use is disclosed",
            "question": null
          }
        ]
      ],
      [
        "How would understanding be checked?",
        [
          {
            "text": "Written work alone may not demonstrate understanding.",
            "source": null,
            "kind": "inferred",
            "condition": null,
            "question": "Is this why you propose an oral examination?"
          },
          {
            "text": "An oral examination would reliably reveal understanding.",
            "source": null,
            "kind": "inferred",
            "condition": null,
            "question": "When would this check be reliable and accessible?"
          },
          {
            "text": "Use an oral examination to check understanding.",
            "source": 2,
            "kind": "recommendation",
            "condition": null,
            "question": null
          }
        ]
      ]
    ]
  },
  {
    "topic": "Coastal relocation",
    "role": "Coastal planning specialist",
    "sentences": [
      "Our village road flooded three times last winter, but that does not tell us exactly when homes will become unsafe.",
      "I would offer voluntary relocation grants now, provided tenants receive support too.",
      "We should keep maintaining the sea wall while people decide."
    ],
    "lanes": [
      [
        "From repeated flooding to an early option",
        [
          {
            "text": "The village road flooded three times last winter.",
            "source": 0,
            "kind": "premise",
            "condition": null,
            "question": null
          },
          {
            "text": "Waiting for certainty could leave too little time to relocate.",
            "source": null,
            "kind": "inferred",
            "condition": null,
            "question": "Is the risk of waiting your reason for offering grants now?"
          },
          {
            "text": "Offer voluntary relocation grants now.",
            "source": 1,
            "kind": "recommendation",
            "condition": "Support tenants as well",
            "question": null
          }
        ]
      ],
      [
        "What must remain uncertain?",
        [
          {
            "text": "The timing of unsafe homes remains uncertain.",
            "source": 0,
            "kind": "premise",
            "condition": null,
            "question": null
          },
          {
            "text": "Protection is still needed during a voluntary transition.",
            "source": null,
            "kind": "inferred",
            "condition": null,
            "question": "Is temporary protection the intended role of continued maintenance?"
          },
          {
            "text": "Maintain the sea wall while people decide.",
            "source": 2,
            "kind": "recommendation",
            "condition": null,
            "question": null
          }
        ]
      ]
    ]
  },
  {
    "topic": "Home energy retrofit",
    "role": "Housing adviser",
    "sentences": [
      "Tenants tell us their homes are cold, but many landlords will not invest while tenants receive the bill savings.",
      "I favour retrofit grants tied to rent protection for five years.",
      "A grant alone could leave tenants paying more rent for an improvement they did not choose."
    ],
    "lanes": [
      [
        "Why subsidise the work?",
        [
          {
            "text": "Landlords and tenants face different incentives to retrofit.",
            "source": 0,
            "kind": "premise",
            "condition": null,
            "question": null
          },
          {
            "text": "A grant would be sufficient to change landlords’ investment decisions.",
            "source": null,
            "kind": "inferred",
            "condition": null,
            "question": "Would grants overcome the other barriers to investment?"
          },
          {
            "text": "Offer retrofit grants.",
            "source": 1,
            "kind": "recommendation",
            "condition": "Tie grants to five years of rent protection",
            "question": null
          }
        ]
      ],
      [
        "Why protect rent?",
        [
          {
            "text": "A grant alone could be followed by higher rents.",
            "source": 2,
            "kind": "premise",
            "condition": null,
            "question": null
          },
          {
            "text": "Tenants should share the benefit without being priced out.",
            "source": null,
            "kind": "inferred",
            "condition": null,
            "question": "Is preventing displacement the aim of your rent condition?"
          },
          {
            "text": "Require rent protection for five years.",
            "source": 1,
            "kind": "recommendation",
            "condition": null,
            "question": null
          }
        ]
      ]
    ]
  },
  {
    "topic": "Clinical AI triage",
    "role": "Primary-care clinician",
    "sentences": [
      "An AI triage tool could shorten the queue, although we have not tested it with patients who describe symptoms through an interpreter.",
      "I would pilot it only with a clinician reviewing every urgent recommendation.",
      "Patients must still be able to request a person."
    ],
    "lanes": [
      [
        "A possible benefit with a safeguard",
        [
          {
            "text": "AI triage could shorten the queue.",
            "source": 0,
            "kind": "premise",
            "condition": "A possibility, not a demonstrated result",
            "question": null
          },
          {
            "text": "Clinician review would catch important urgent-triage errors.",
            "source": null,
            "kind": "inferred",
            "condition": null,
            "question": "Which errors would this review detect, and which could it miss?"
          },
          {
            "text": "Pilot AI triage.",
            "source": 1,
            "kind": "recommendation",
            "condition": "A clinician reviews every urgent recommendation",
            "question": null
          }
        ]
      ],
      [
        "Who could be left out?",
        [
          {
            "text": "Interpreter-mediated symptom descriptions have not been tested.",
            "source": 0,
            "kind": "premise",
            "condition": null,
            "question": null
          },
          {
            "text": "A human route could help patients whom the tool serves poorly.",
            "source": null,
            "kind": "inferred",
            "condition": null,
            "question": "Is unequal performance part of the reason for a human alternative?"
          },
          {
            "text": "Keep a route to request a person.",
            "source": 2,
            "kind": "recommendation",
            "condition": null,
            "question": null
          }
        ]
      ]
    ]
  },
  {
    "topic": "School smartphones",
    "role": "Secondary-school teacher",
    "sentences": [
      "Lessons are repeatedly interrupted by phone notifications.",
      "I support putting phones away during lessons, not banning them for the whole school day.",
      "Some pupils use them to manage a medical condition, so those pupils need an exception."
    ],
    "lanes": [
      [
        "How far should the restriction go?",
        [
          {
            "text": "Phone notifications repeatedly interrupt lessons.",
            "source": 0,
            "kind": "premise",
            "condition": null,
            "question": null
          },
          {
            "text": "Putting phones away would reduce these interruptions.",
            "source": null,
            "kind": "inferred",
            "condition": null,
            "question": "What evidence would show that storage reduces disruption?"
          },
          {
            "text": "Put phones away during lessons.",
            "source": 1,
            "kind": "recommendation",
            "condition": "Not a whole-school-day ban",
            "question": null
          }
        ]
      ],
      [
        "An explicit exception",
        [
          {
            "text": "Some pupils use phones to manage a medical condition.",
            "source": 2,
            "kind": "premise",
            "condition": null,
            "question": null
          },
          {
            "text": "Medical access should take priority over a uniform rule.",
            "source": null,
            "kind": "inferred",
            "condition": null,
            "question": "Is this the principle behind the exception?"
          },
          {
            "text": "Allow an exception for those pupils.",
            "source": 2,
            "kind": "recommendation",
            "condition": "For medical-condition management",
            "question": null
          }
        ]
      ]
    ]
  },
  {
    "topic": "Youth justice",
    "role": "Youth support practitioner",
    "sentences": [
      "Missed appointments are often recorded as disengagement, but several young people I work with cannot afford the bus.",
      "Before escalating a missed appointment, we should offer transport support and another appointment.",
      "That does not mean ignoring a serious immediate risk."
    ],
    "lanes": [
      [
        "What does a missed appointment mean?",
        [
          {
            "text": "Several young people cannot afford transport to appointments.",
            "source": 0,
            "kind": "premise",
            "condition": "An observation about this practitioner’s clients",
            "question": null
          },
          {
            "text": "Some missed appointments reflect access barriers rather than unwillingness.",
            "source": null,
            "kind": "inferred",
            "condition": null,
            "question": "How would you distinguish an access barrier from other reasons?"
          },
          {
            "text": "Offer transport support and another appointment before escalation.",
            "source": 1,
            "kind": "recommendation",
            "condition": null,
            "question": null
          }
        ]
      ],
      [
        "Where does the recommendation stop?",
        [
          {
            "text": "A serious immediate risk must not be ignored.",
            "source": 2,
            "kind": "premise",
            "condition": null,
            "question": null
          },
          {
            "text": "Immediate-risk cases need a separate response from routine absence.",
            "source": null,
            "kind": "inferred",
            "condition": null,
            "question": "Which risk threshold would trigger that separate response?"
          },
          {
            "text": "Apply the supportive response to missed appointments.",
            "source": 1,
            "kind": "recommendation",
            "condition": "Do not let this override a serious immediate risk",
            "question": null
          }
        ]
      ]
    ]
  }
];

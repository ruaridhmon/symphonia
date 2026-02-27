#!/usr/bin/env python3
"""
Seed realistic government consultation data for Symphonia demo.
Creates expert responses on AI policy, education, and digital transformation.
"""

import sys
import os

# ── Safety guard: prevent accidental execution ──
if os.environ.get("ALLOW_DB_RESET") != "yes-i-know-what-im-doing":
    print("ERROR: This script destroys all production data.")
    print("Set ALLOW_DB_RESET=yes-i-know-what-im-doing to proceed.")
    sys.exit(1)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import json
import uuid

from core.models import FormModel, RoundModel, Response, User
from core.db import SessionLocal
from core.auth import get_password_hash

# Expert personas
EXPERTS = [
    {
        "email": "prof.chen@oxford.ac.uk",
        "name": "Prof. Sarah Chen",
        "role": "AI Ethics, Oxford University",
    },
    {
        "email": "m.okonkwo@cabinet-office.gov.uk",
        "name": "Dr. Michael Okonkwo",
        "role": "Chief Digital Officer, Cabinet Office",
    },
    {
        "email": "j.mueller@fraunhofer.de",
        "name": "Dr. Julia Müller",
        "role": "Director, Fraunhofer Institute for AI",
    },
    {
        "email": "r.patel@tuc.org.uk",
        "name": "Rajesh Patel",
        "role": "Head of Digital Policy, TUC",
    },
    {
        "email": "a.bergstrom@oecd.org",
        "name": "Anna Bergström",
        "role": "Senior Policy Analyst, OECD",
    },
    {
        "email": "d.thompson@deepmind.com",
        "name": "David Thompson",
        "role": "Policy Director, DeepMind",
    },
    {
        "email": "l.santos@unesco.org",
        "name": "Dr. Lucia Santos",
        "role": "AI & Education Specialist, UNESCO",
    },
    {
        "email": "k.yamamoto@meti.go.jp",
        "name": "Kenji Yamamoto",
        "role": "Digital Strategy Advisor, Japan METI",
    },
    {
        "email": "e.oduya@worldbank.org",
        "name": "Dr. Emmanuel Oduya",
        "role": "Digital Development, World Bank",
    },
    {
        "email": "s.williams@ada-lovelace.org",
        "name": "Dr. Sophie Williams",
        "role": "Research Director, Ada Lovelace Institute",
    },
]

CONSULTATIONS = [
    {
        "title": "AI in Education: Risks, Opportunities & Safeguards",
        "questions": [
            {
                "id": "q1",
                "type": "textarea",
                "label": "What are the primary opportunities AI presents for improving educational outcomes in the UK?",
                "required": True,
            },
            {
                "id": "q2",
                "type": "textarea",
                "label": "What risks does AI pose to students, teachers, and the integrity of education?",
                "required": True,
            },
            {
                "id": "q3",
                "type": "textarea",
                "label": "What safeguards should government mandate for AI systems used in schools?",
                "required": True,
            },
            {
                "id": "q4",
                "type": "select",
                "label": "Should AI tutoring systems be permitted in state schools?",
                "options": [
                    "Yes, with light regulation",
                    "Yes, with strict oversight",
                    "Only for specific subjects",
                    "No, too risky at this stage",
                ],
                "required": True,
            },
        ],
        "responses": [
            {
                "expert": "prof.chen@oxford.ac.uk",
                "answers": {
                    "q1": "AI offers genuinely transformative potential for personalised learning at scale. Adaptive systems can identify knowledge gaps in real-time and adjust content difficulty—something impossible for a single teacher managing 30 students. The evidence from Carnegie Learning's maths platform shows 30% improvement in outcomes. However, we must be careful not to over-promise; the technology works best as teacher augmentation, not replacement.",
                    "q2": "The risks are substantial and under-discussed. First, algorithmic bias: systems trained on historical data may perpetuate achievement gaps along socioeconomic and racial lines. Second, data privacy: children's learning patterns are extraordinarily sensitive data. Third, deskilling: if teachers become dependent on AI recommendations, we lose pedagogical expertise. Finally, the 'black box' problem—we often can't explain why an AI made a particular assessment.",
                    "q3": "I recommend a tiered approach. For low-stakes applications (practice exercises, administrative tasks), light-touch registration suffices. For high-stakes use (assessment, placement decisions, identifying students at risk), we need mandatory algorithmic impact assessments, human oversight requirements, and appeal mechanisms. The EU AI Act's classification system offers a sensible template.",
                    "q4": "Yes, with strict oversight",
                },
            },
            {
                "expert": "m.okonkwo@cabinet-office.gov.uk",
                "answers": {
                    "q1": "From a delivery perspective, AI can address three critical challenges: teacher workload (automated marking could save 5+ hours weekly), SEND support (adaptive tools for diverse learning needs), and geographic inequality (quality tutoring available regardless of postcode). The DfE's Oak National Academy pilot showed promising results for catch-up learning.",
                    "q2": "My primary concern is procurement and vendor lock-in. Schools lack technical capacity to evaluate AI systems, creating dependency on large EdTech vendors. We're also seeing 'teaching to the algorithm'—educators optimising for metrics that may not reflect genuine learning. The cheating and academic integrity question is substantial but solvable.",
                    "q3": "Three essentials: mandatory data localisation (student data must remain in UK jurisdiction), interoperability requirements (no proprietary lock-in), and a public register of approved systems similar to the Crown Commercial Service framework. We should also fund LEA-level technical advisory capacity.",
                    "q4": "Yes, with strict oversight",
                },
            },
            {
                "expert": "r.patel@tuc.org.uk",
                "answers": {
                    "q1": "We support technology that genuinely reduces teacher workload and improves working conditions. AI marking assistance and administrative automation could help address the recruitment crisis—42% of teachers leave within 5 years, often citing workload. But the savings must translate to better conditions, not staff cuts.",
                    "q2": "Our members report serious concerns about surveillance creep. AI monitoring of student 'engagement' often extends to monitoring teachers. We've documented cases where algorithmic systems effectively create performance management by the back door. There's also the quality of work issue: teaching is relational, and AI cannot replicate the mentorship and pastoral care that define excellent education.",
                    "q3": "Any AI deployment must go through proper workplace consultation. Staff and unions must have meaningful input on system selection, implementation, and ongoing review. We need explicit prohibition on using AI outputs for teacher performance management without consent. And crucially, protected time for teachers to develop AI literacy.",
                    "q4": "Only for specific subjects",
                },
            },
            {
                "expert": "l.santos@unesco.org",
                "answers": {
                    "q1": "Internationally, we see AI's greatest promise in addressing the global teacher shortage—UNESCO estimates 69 million teachers needed by 2030. Intelligent tutoring systems can extend quality instruction to underserved communities. Language learning applications are particularly mature. However, the UK context is different; the opportunity is more about quality enhancement than basic access.",
                    "q2": "The homogenisation risk concerns me deeply. If a handful of AI systems shape how millions learn, we risk narrowing intellectual diversity and cultural perspectives. There's also the exacerbation of the digital divide—AI-powered education requires infrastructure and devices that disadvantaged students may lack at home.",
                    "q3": "UNESCO's AI Ethics Recommendation (2021) provides a framework: human oversight, transparency, inclusion, and sustainability. The UK should require that any AI system used in assessment can explain its reasoning in terms educators and parents can understand. Cross-border data transfer restrictions are essential for student privacy.",
                    "q4": "Yes, with strict oversight",
                },
            },
            {
                "expert": "d.thompson@deepmind.com",
                "answers": {
                    "q1": "The technical capabilities are advancing rapidly. Large language models can now provide Socratic tutoring that adapts to student responses, explain concepts multiple ways, and identify misconceptions with reasonable accuracy. Our research suggests AI tutors can approach the 'two sigma' effect of one-on-one human tutoring for well-defined subjects like mathematics.",
                    "q2": "I'll be direct: current AI systems are not reliable enough for high-stakes educational decisions. They hallucinate, they have biases we don't fully understand, and they can be gamed. We should be honest that the technology is immature for assessment purposes. The reputational risk to the sector from a high-profile failure is substantial.",
                    "q3": "Mandatory red-teaming before deployment—adversarial testing specifically for educational contexts. Required disclosure of training data sources and model limitations. Real-time monitoring with automatic escalation when outputs fall outside expected parameters. And a clear liability framework when systems cause harm.",
                    "q4": "Yes, with strict oversight",
                },
            },
            {
                "expert": "s.williams@ada-lovelace.org",
                "answers": {
                    "q1": "The evidence base for AI in education is thinner than vendors suggest. Rigorous RCTs are rare; most studies are short-term and conducted by researchers with conflicts of interest. That said, the potential for reducing administrative burden is real and could meaningfully improve teacher retention. We should focus investment there rather than on speculative learning gains.",
                    "q2": "The normalisation of surveillance is my chief concern. Students growing up with constant AI monitoring may develop distorted relationships with privacy, autonomy, and independent thinking. There are also equity concerns: well-resourced schools will implement AI thoughtfully while under-resourced schools may deploy it as a cost-cutting measure with inadequate oversight.",
                    "q3": "Children deserve stronger protections than adults. I propose: prohibition on emotional recognition and biometric monitoring in schools; mandatory data minimisation (collect only what's necessary); automatic deletion after defined periods; student and parent rights to access, correct, and delete data; and independent audits of any system making consequential decisions.",
                    "q4": "Only for specific subjects",
                },
            },
        ],
    },
    {
        "title": "National AI Strategy: Priorities for 2025-2030",
        "questions": [
            {
                "id": "q1",
                "type": "textarea",
                "label": "What should be the UK's top 3 strategic priorities for AI development and adoption?",
                "required": True,
            },
            {
                "id": "q2",
                "type": "textarea",
                "label": "How should government balance innovation promotion with risk mitigation?",
                "required": True,
            },
            {
                "id": "q3",
                "type": "textarea",
                "label": "What role should public investment play versus private sector leadership?",
                "required": True,
            },
            {
                "id": "q4",
                "type": "select",
                "label": "Which sector should receive priority focus for AI transformation?",
                "options": [
                    "Healthcare (NHS)",
                    "Education",
                    "Climate & Energy",
                    "Defence & Security",
                    "Public Administration",
                ],
                "required": True,
            },
        ],
        "responses": [
            {
                "expert": "j.mueller@fraunhofer.de",
                "answers": {
                    "q1": "First, sovereign compute infrastructure—the UK cannot depend entirely on US hyperscalers for strategic AI capabilities. Second, applied research translation: Britain excels at fundamental research but struggles to commercialise. Third, skills pipeline: expand AI master's programmes and create apprenticeship pathways. Germany's approach through Fraunhofer demonstrates how applied research institutes can bridge academia and industry.",
                    "q2": "The German model of 'regulated innovation' works: clear rules provide certainty that actually accelerates investment. Uncertainty is the enemy of R&D spending. The UK's post-Brexit regulatory flexibility is an opportunity to create a 'third way' between heavy-handed EU regulation and American laissez-faire, but only if you move quickly and coherently.",
                    "q3": "Public investment should focus on pre-competitive research and infrastructure that benefits the entire ecosystem—compute clusters, datasets, testing facilities. Don't try to pick winners in applications. The private sector is better positioned to identify market opportunities. ARIA's model is promising but needs significantly more funding to achieve critical mass.",
                    "q4": "Healthcare (NHS)",
                },
            },
            {
                "expert": "a.bergstrom@oecd.org",
                "answers": {
                    "q1": "Based on OECD analysis of 40 national strategies: First, trustworthy AI frameworks that enable cross-border data flows and model deployment—fragmentation is the main barrier to scaling. Second, public sector adoption as a demand driver and exemplar. Third, inclusive growth: explicit policies ensuring AI benefits are broadly shared, not concentrated in London and the South East.",
                    "q2": "The false dichotomy of 'innovation vs. safety' frustrates me. Countries with strong governance frameworks—Singapore, Canada—are outperforming on both dimensions. Clear rules reduce compliance costs and attract investment. The UK's sector-specific approach through existing regulators is sensible but needs coordination to avoid gaps and overlaps.",
                    "q3": "International evidence suggests optimal public investment is 0.1-0.2% of GDP for AI-specific initiatives, alongside broader R&D spending. The UK is below this. Public investment should crowd in private capital, not substitute for it. Co-investment models with milestone-based funding work better than grants.",
                    "q4": "Public Administration",
                },
            },
            {
                "expert": "k.yamamoto@meti.go.jp",
                "answers": {
                    "q1": "Japan's experience offers lessons. Priority one: human capital—we face severe shortages despite excellent universities because industry compensation lags Silicon Valley. Priority two: sectoral digitisation as AI foundation—AI is useless without quality data, and British SMEs lag on basic digital adoption. Priority three: international standards leadership—shape the rules rather than follow them.",
                    "q2": "We favour agile governance: start with principles-based guidance, monitor deployment outcomes, and legislate only where clear harms emerge. Heavy ex-ante regulation on a fast-moving technology tends to lock in current paradigms. The Japanese 'Social Principles of Human-Centric AI' (2019) provides flexibility while establishing guardrails.",
                    "q3": "Public investment should focus on areas market failures are clearest: fundamental research (industry underinvests), safety research (negative externalities), and public benefit applications with no commercial model. Government should also be a sophisticated customer—procurement requirements can drive innovation more effectively than grants.",
                    "q4": "Healthcare (NHS)",
                },
            },
            {
                "expert": "e.oduya@worldbank.org",
                "answers": {
                    "q1": "The UK should leverage its position as an AI leader to shape global governance, particularly for developing countries who will be most affected by AI-driven economic shifts. Priorities: First, ethical AI export—don't just sell systems, help build governance capacity. Second, international research partnerships beyond the usual suspects. Third, leadership on AI and sustainable development goals.",
                    "q2": "Risk frameworks must account for differential impacts. An AI system that works adequately for affluent populations may fail badly for marginalised groups. The UK's equality impact assessment tradition should be extended to algorithmic systems. Proportionality is key: a chatbot needs different oversight than a criminal justice algorithm.",
                    "q3": "Public investment signals commitment and de-risks private investment. The UK's AI Safety Institute is an excellent example—it addresses a global public good that no single company would fund adequately. Similar logic applies to AI for climate modelling, pandemic preparedness, and scientific research infrastructure.",
                    "q4": "Climate & Energy",
                },
            },
            {
                "expert": "d.thompson@deepmind.com",
                "answers": {
                    "q1": "Frontier AI safety must be priority one—the UK's early leadership through the Safety Institute is a genuine competitive advantage. Priority two: compute access for academic researchers, who are increasingly locked out of frontier research. Priority three: clear, predictable regulatory frameworks that don't require expensive legal interpretation.",
                    "q2": "The framing should be 'safe innovation' not 'innovation vs. safety'. Racing to deploy unreliable systems damages the entire sector. Voluntary commitments from frontier labs are necessary but insufficient; they need regulatory backstops. The Bletchley Declaration was a good start but needs implementation mechanisms.",
                    "q3": "Private sector will fund applied research and deployment. Public investment should target: safety research (alignment, interpretability), compute infrastructure (so startups aren't dependent on Big Tech), and evaluation infrastructure (benchmarks, red-teaming capacity). The UK AI Safety Institute needs 10x its current resources.",
                    "q4": "Defence & Security",
                },
            },
        ],
    },
    {
        "title": "Workforce Transition: Preparing for AI-Driven Economic Change",
        "questions": [
            {
                "id": "q1",
                "type": "textarea",
                "label": "Which occupations and sectors face the greatest disruption from AI automation?",
                "required": True,
            },
            {
                "id": "q2",
                "type": "textarea",
                "label": "What retraining and skills programmes should government prioritise?",
                "required": True,
            },
            {
                "id": "q3",
                "type": "textarea",
                "label": "How should social safety nets adapt to support affected workers?",
                "required": True,
            },
            {
                "id": "q4",
                "type": "select",
                "label": "What is the appropriate timescale for major workforce transition policies?",
                "options": [
                    "Immediate (within 2 years)",
                    "Medium-term (2-5 years)",
                    "Long-term (5-10 years)",
                    "Transition is overstated",
                ],
                "required": True,
            },
        ],
        "responses": [
            {
                "expert": "r.patel@tuc.org.uk",
                "answers": {
                    "q1": "Our analysis identifies administrative and clerical roles at highest risk—2.7 million jobs. Customer service, data entry, and basic legal and financial services face significant displacement. But the framing of 'disruption' obscures that many roles will be degraded rather than eliminated: deskilled, surveilled, and intensified. Warehouse work shows this pattern clearly.",
                    "q2": "The track record of government retraining is poor—most programmes achieve minimal wage gains for participants. What works: paid training leave (as in France), sectoral training funds with employer contributions, and union involvement in programme design. Generic 'digital skills' courses are largely useless; training must be occupation-specific and lead to recognised credentials.",
                    "q3": "Unemployment insurance needs fundamental reform. Current JSA is inadequate and punitive. We propose: earnings-related benefits (as in Germany), longer duration for older workers, removal of conditionality during retraining periods, and portable benefits for gig economy workers. The Nordic 'flexicurity' model demonstrates that strong safety nets and dynamic labour markets are compatible.",
                    "q4": "Immediate (within 2 years)",
                },
            },
            {
                "expert": "a.bergstrom@oecd.org",
                "answers": {
                    "q1": "OECD research suggests 14% of UK jobs are highly automatable; another 32% will be substantially transformed. But aggregate figures obscure crucial variation: impacts concentrate in specific regions, demographics, and firm types. Young workers in routine roles, older workers in declining sectors, and workers in areas with weak labour markets face compounded risks.",
                    "q2": "Evidence-based policy requires better labour market intelligence—we often don't know which skills will be valuable. Priorities: modular credentialing systems that allow incremental upskilling, recognition of prior learning, and career guidance integrated with benefit systems. Singapore's SkillsFuture programme offers useful lessons on individual learning accounts.",
                    "q3": "Three reforms: First, in-work benefits that smooth transitions rather than creating cliff-edges. Second, active labour market programmes with actual funding (UK spends 0.2% of GDP vs. OECD average of 0.5%). Third, place-based policies for left-behind regions—national programmes often fail to account for local labour market conditions.",
                    "q4": "Medium-term (2-5 years)",
                },
            },
            {
                "expert": "prof.chen@oxford.ac.uk",
                "answers": {
                    "q1": "The discourse focuses excessively on job destruction versus creation. The more profound impact may be on job quality and power dynamics. AI enables unprecedented monitoring, algorithmic management, and erosion of worker autonomy. 'Augmentation' often means humans serving AI systems rather than the reverse. Professional occupations that assumed immunity—radiologists, lawyers, analysts—now face genuine uncertainty.",
                    "q2": "Technical training alone is insufficient. Workers need skills in human-AI collaboration, critical evaluation of AI outputs, and the 'human' skills that remain distinctive: complex problem-solving, creativity, emotional intelligence, ethical judgment. Liberal arts education, often dismissed as impractical, becomes more relevant. Adult education funding has been decimated and must be restored.",
                    "q3": "We need to decouple basic security from employment. AI productivity gains could fund expanded public services and reduced working hours. The 'good jobs' strategy assumes sufficient good jobs will exist—this is increasingly uncertain. Pilot programmes for universal basic services (housing, transport, care) deserve serious consideration alongside basic income experiments.",
                    "q4": "Medium-term (2-5 years)",
                },
            },
            {
                "expert": "k.yamamoto@meti.go.jp",
                "answers": {
                    "q1": "Japan's experience with robotics offers perspective. Manufacturing job losses were real but slower than predicted; humans proved more adaptable than expected. Today, customer-facing roles face higher disruption from LLMs than factory work from robots. Financial services, legal, and healthcare administration are particularly exposed in developed economies.",
                    "q2": "Japan's approach emphasises employer-led training with government subsidy and coordination. Companies that commit to retraining receive tax benefits and preferential procurement treatment. This creates alignment: firms invest in their workforce rather than discarding workers. Lifetime employment culture, often criticised, provides stability during technological transitions.",
                    "q3": "Japan's challenge is demographic decline, not unemployment. We are deploying AI to address labour shortages rather than displacing workers. The UK's situation differs, but automation combined with immigration restrictions could create similar dynamics. Social policy should support labour mobility between sectors rather than protecting declining industries.",
                    "q4": "Long-term (5-10 years)",
                },
            },
            {
                "expert": "s.williams@ada-lovelace.org",
                "answers": {
                    "q1": "We should be humble about predictions—historical forecasting of automation impacts has been consistently wrong in both directions. What we can say: impacts will be unevenly distributed, and those already disadvantaged will bear disproportionate costs without intervention. Gig economy workers and those in informal employment are particularly vulnerable as they lack traditional protections.",
                    "q2": "Before designing programmes, we need honest evaluation of what works. The evidence for most retraining interventions is weak. What does work: long-term sector partnerships (not short courses), wraparound support (childcare, transport, income), and programmes designed with worker input. Digital skills training should emphasise critical AI literacy, not just tool proficiency.",
                    "q3": "The current system assumes stable employment relationships that are increasingly fictional. Reforms needed: portable benefits that follow workers across employers and employment types; removal of status distinctions between employees, workers, and self-employed; and proactive outreach rather than waiting for people to fall into crisis before offering support.",
                    "q4": "Medium-term (2-5 years)",
                },
            },
        ],
    },
    {
        "title": "AI in Public Services: NHS Implementation Framework",
        "questions": [
            {
                "id": "q1",
                "type": "textarea",
                "label": "What are the most promising applications of AI for NHS service delivery?",
                "required": True,
            },
            {
                "id": "q2",
                "type": "textarea",
                "label": "What governance frameworks are needed for clinical AI deployment?",
                "required": True,
            },
            {
                "id": "q3",
                "type": "textarea",
                "label": "How should patient data be handled for AI development while protecting privacy?",
                "required": True,
            },
            {
                "id": "q4",
                "type": "select",
                "label": "Should AI diagnostic tools be permitted to operate without human oversight in specific contexts?",
                "options": [
                    "Yes, for low-risk screening",
                    "Yes, with automatic escalation protocols",
                    "No, always require clinician review",
                    "Needs more research before deciding",
                ],
                "required": True,
            },
        ],
        "responses": [
            {
                "expert": "m.okonkwo@cabinet-office.gov.uk",
                "answers": {
                    "q1": "From an efficiency perspective: administrative automation offers the clearest wins—appointment scheduling, referral management, coding and billing. These applications are lower risk and address genuine pain points. Clinical decision support for diagnostics is promising but requires more careful implementation. The backlog crisis makes AI triage and prioritisation particularly valuable.",
                    "q2": "MHRA's software as medical device framework provides a foundation but needs enhancement for AI-specific risks. Key additions: requirements for ongoing monitoring post-deployment (AI systems drift), clear liability allocation between NHS trusts and vendors, and mandatory incident reporting with root cause analysis. Procurement frameworks should require algorithmic impact assessments.",
                    "q3": "The Federated Data Platform concept is sound: keep data within NHS control while enabling research access. Practical challenges: data quality varies enormously across trusts, consent mechanisms need updating for AI use cases, and we need sustainable funding models that don't create perverse incentives to commercialise patient data. Palantir contract concerns were foreseeable and avoidable.",
                    "q4": "Yes, with automatic escalation protocols",
                },
            },
            {
                "expert": "j.mueller@fraunhofer.de",
                "answers": {
                    "q1": "Germany's experience: imaging AI (radiology, pathology, dermatology) has the strongest evidence base and clearest implementation pathway. Ambient clinical documentation—AI scribes—could transform GP workload but raises significant privacy questions. Predictive deterioration in hospital settings (early warning scores) shows real promise for reducing preventable deaths.",
                    "q2": "The CE marking framework is insufficient for AI medical devices; it's designed for static products, not learning systems. We recommend: conformity assessment that includes algorithmic audit, post-market surveillance with mandatory performance reporting, and harmonised standards for validation datasets. International coordination is essential—fragmented national approaches help no one.",
                    "q3": "Privacy-preserving techniques—federated learning, differential privacy, synthetic data—are mature enough for production use. The NHS should require these approaches by default and permit centralised data only where technically necessary. This protects patients while enabling research. The technical capacity exists; the barrier is institutional, not technological.",
                    "q4": "Yes, for low-risk screening",
                },
            },
            {
                "expert": "prof.chen@oxford.ac.uk",
                "answers": {
                    "q1": "I'm concerned about premature enthusiasm. Most medical AI has been validated only on narrow populations; performance degrades dramatically on patients who differ from training data. The promising applications are mundane: workflow optimisation, documentation, scheduling. High-profile clinical applications (diagnosis, treatment recommendation) require far more validation than they typically receive.",
                    "q2": "Clinical AI should meet the same evidentiary standards as pharmaceuticals—randomised controlled trials demonstrating patient benefit, not just technical accuracy. Current approval pathways are far too permissive. We also need mandatory reporting of AI-related incidents through existing patient safety mechanisms, with analysis published for the whole system to learn.",
                    "q3": "Patient trust is the NHS's greatest asset and easily squandered. The care.data debacle demonstrated public sensitivity to data sharing. Governance must include meaningful patient representation—not just information campaigns, but genuine co-decision-making. Opt-out should remain the default, with opt-in for commercial data access.",
                    "q4": "No, always require clinician review",
                },
            },
            {
                "expert": "d.thompson@deepmind.com",
                "answers": {
                    "q1": "Our work on acute kidney injury prediction (Streams) and retinal disease detection demonstrated what's possible: AI identifying conditions hours or days before clinicians, enabling earlier intervention. Protein structure prediction (AlphaFold) shows AI's potential for research acceleration. Near-term: triage and prioritisation for diagnostic imaging backlogs.",
                    "q2": "Three pillars: prospective clinical validation (not just retrospective accuracy), continuous monitoring in deployment (model performance degrades), and clear accountability when things go wrong. We support MHRA's strengthened approach but note that enforcement capacity is limited. The NHS AI Lab's work on procurement standards is valuable.",
                    "q3": "Streams data access was handled poorly—we've learned from that. Best practice: clear data processing agreements, purpose limitation, automatic deletion after research concludes, and transparency about commercial relationships. Synthetic data and federated approaches should be default where technically feasible. Patient benefit must be demonstrable, not theoretical.",
                    "q4": "Yes, with automatic escalation protocols",
                },
            },
            {
                "expert": "l.santos@unesco.org",
                "answers": {
                    "q1": "International perspective: AI's greatest potential in health systems is addressing access gaps in under-resourced settings. For the NHS, the value proposition is different: improving efficiency to do more with constrained resources. Diagnostic support in primary care, where GP capacity is most stretched, deserves priority.",
                    "q2": "WHO's guidance on AI in health emphasises: human oversight, transparency in algorithmic design, data privacy, and equity across population groups. The UK should ensure validation on diverse populations—many systems are trained predominantly on white patients. Algorithmic bias in health can literally be life-threatening.",
                    "q3": "International data sharing for health AI development raises complex questions about sovereignty and benefit-sharing. The NHS dataset is globally valuable; any access arrangements should ensure benefits return to UK patients and the public health system. The current commercial model—private companies capturing value from public data—requires reconsideration.",
                    "q4": "Needs more research before deciding",
                },
            },
            {
                "expert": "e.oduya@worldbank.org",
                "answers": {
                    "q1": "From a health systems perspective: AI should target the greatest disease burden and health inequalities. In the UK, this suggests focus on cardiovascular disease, cancer screening, and mental health—areas with long wait times and significant variation in care quality. Population health management and prevention deserve more attention than acute care applications.",
                    "q2": "Health systems in developing countries often deploy AI with minimal governance; they can't afford the UK's luxury of extensive frameworks. But this creates testing grounds—systems validated elsewhere may be deployed in the NHS without appropriate local validation. Import requirements should mandate UK-relevant testing for any AI originating internationally.",
                    "q3": "The global health community is concerned about data colonialism—wealthy countries extracting data from lower-income populations for AI development without benefit-sharing. The NHS should model responsible data governance that other health systems can emulate. Leadership here is a form of soft power.",
                    "q4": "Needs more research before deciding",
                },
            },
        ],
    },
]


def seed_database():
    db = SessionLocal()

    try:
        # Create expert users
        created_users = {}
        for expert in EXPERTS:
            existing = db.query(User).filter(User.email == expert["email"]).first()
            if existing:
                created_users[expert["email"]] = existing
            else:
                user = User(
                    email=expert["email"],
                    hashed_password=get_password_hash("expert123"),
                    is_admin=False,
                )
                db.add(user)
                db.flush()
                created_users[expert["email"]] = user

        db.commit()
        print(f"✓ Created/found {len(created_users)} expert users")

        # Create consultations
        for consultation in CONSULTATIONS:
            # Check if form exists
            existing = (
                db.query(FormModel)
                .filter(FormModel.title == consultation["title"])
                .first()
            )
            if existing:
                print(f"  → Skipping '{consultation['title']}' (exists)")
                continue

            # Create form
            form = FormModel(
                title=consultation["title"],
                questions=consultation["questions"],
                join_code=str(uuid.uuid4())[:8],
                allow_join=True,
            )
            db.add(form)
            db.flush()

            # Create round
            round_obj = RoundModel(form_id=form.id, round_number=1)
            db.add(round_obj)
            db.flush()

            # Add responses
            for i, resp_data in enumerate(consultation["responses"]):
                user = created_users.get(resp_data["expert"])
                if not user:
                    continue

                response = Response(
                    user_id=user.id,
                    form_id=form.id,
                    round_id=round_obj.id,
                    answers=json.dumps(resp_data["answers"]),
                )
                db.add(response)

            db.commit()
            print(
                f"✓ Created '{consultation['title']}' with {len(consultation['responses'])} responses"
            )

        print("\n✅ Government consultation data seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()

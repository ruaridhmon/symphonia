"""Authored, non-independent workflow fixture. No provider SDKs or network calls."""
import json
from pathlib import Path
cases=[
 dict(id='attendance',title='School attendance alerts',question='Should a fictional school district expand its attendance-alert programme?',
 evidence=[
 'A1: In a randomised fictional pilot, 60 of 100 alerted pupils and 40 of 100 control pupils returned to regular attendance over one term. This is a 20 percentage-point difference, not proof about every subgroup.',
 'A2: Among pupils with caregiver work-schedule conflicts, 10 of 25 alerted pupils and 10 of 25 controls returned to regular attendance. This small subgroup showed no observed benefit; it does not prove zero effect.',
 'A3: The pilot measured attendance only. It collected no attainment outcomes and followed nobody beyond one term.'
 ],claims=[
 'In this one-term pilot, the attendance recovery rate was 20 percentage points higher in the alert group than in the control group.',
 'The pilot demonstrated an attendance benefit for pupils with caregiver work-schedule conflicts.',
 'The alerts improve attainment over two years.',
 'The district should prioritise a targeted expansion over immediate universal rollout.'
 ],truth=[True,False,None,None],claim_sources=['A1','A2','A3','Values'],
 pro='Targeting may avoid spending on groups without demonstrated benefit.',con='Universal access is fairer and may avoid eligibility barriers.',
 correction=['The shared A1 counts are 60/100 versus 40/100: a 20 percentage-point difference.','The shared A2 subgroup counts are 10/25 in each group; benefit was not demonstrated.','A3 says attainment and two-year outcomes were never measured.']),
 dict(id='health',title='Community health appointments',question='Should a fictional town expand evening preventive-health appointments?',
 evidence=[
 'H1: In a fictional randomised invitation study, 90 of 150 residents offered evening appointments attended, versus 75 of 150 offered daytime appointments. The attendance difference was 10 percentage points.',
 'H2: The evening group cost 18000 benchmark units for 90 attendees; daytime cost 12000 for 75 attendees. Cost per attendee was 200 versus 160 units. These are programme costs, not a full cost-effectiveness analysis.',
 'H3: The study measured attendance and delivery costs. It did not measure hospital admissions or long-term health benefits.'
 ],claims=[
 'Evening invitations increased observed attendance by 10 percentage points in this study.',
 'The evening programme had a lower delivery cost per attendee than the daytime programme.',
 'Evening appointments reduce hospital admissions over the next year.',
 'The town should fund evening access despite its higher delivery cost per attendee.'
 ],truth=[True,False,None,None],claim_sources=['H1','H2','H3','Values'],
 pro='Flexible access deserves funding even when delivery is more expensive.',con='A fixed budget should prioritise the lower-cost service until health benefits are known.',
 correction=['H1 reports 90/150 versus 75/150, which is a 10 percentage-point attendance difference.','H2 gives 18000/90 = 200, versus 12000/75 = 160 units per attendee.','H3 contains no hospital-admission outcome.']),
 dict(id='release',title='Support after release',question='Should a fictional region expand a housing-and-employment support programme after release?',
 evidence=[
 'R1: A fictional non-randomised cohort recorded stable housing at six months for 36 of 60 programme participants and 24 of 60 comparison participants. Participants volunteered and baseline housing readiness differed.',
 'R2: The employment report includes only 30 of the 60 programme participants and only 45 of the 60 comparison participants. Twenty programme respondents and twenty-five comparison respondents reported employment; missing outcomes are unknown.',
 'R3: No reconviction outcome was collected. The observational design cannot establish a causal programme effect.'
 ],claims=[
 'Recorded stable housing at six months was 20 percentage points higher in the programme cohort than in the comparison cohort.',
 'The employment report establishes a higher employment rate across all programme participants than across all comparison participants.',
 'The programme reduces reconviction over two years.',
 'The region should offer a limited expansion while commissioning a stronger evaluation.'
 ],truth=[True,False,None,None],claim_sources=['R1','R2','R3','Values'],
 pro='A bounded expansion can provide support while improving the evidence.',con='Expansion should wait because selection and missing outcomes undermine the case.',
 correction=['R1 gives 36/60 versus 24/60: an observed 20 percentage-point difference, not a causal estimate.','R2 omits 30 programme outcomes and 15 comparison outcomes; full-cohort employment rates are not established.','R3 says reconviction was not measured.'])]
# Explicit authored patterns, not sampled estimates or fitted effects. Each scenario differs.
starts=[
 [['Agree','Disagree','Unable to judge','Agree'],['Agree','Agree','Agree','Agree'],['Unable to judge','Unable to judge','Unable to judge','Disagree'],['Disagree','Agree','Agree','Agree'],['Agree','Unable to judge','Unable to judge','Disagree'],['Unable to judge','Disagree','Agree','Agree'],['Agree','Agree','Unable to judge','Disagree'],['Unable to judge','Unable to judge','Agree','Agree']],
 [['Agree','Disagree','Unable to judge','Agree'],['Agree','Unable to judge','Agree','Disagree'],['Disagree','Agree','Unable to judge','Agree'],['Unable to judge','Agree','Agree','Disagree'],['Agree','Disagree','Unable to judge','Agree'],['Unable to judge','Unable to judge','Agree','Disagree'],['Disagree','Agree','Unable to judge','Agree'],['Agree','Unable to judge','Unable to judge','Disagree']],
 [['Agree','Disagree','Unable to judge','Agree'],['Disagree','Agree','Agree','Agree'],['Unable to judge','Unable to judge','Unable to judge','Disagree'],['Agree','Agree','Agree','Agree'],['Unable to judge','Disagree','Unable to judge','Disagree'],['Agree','Unable to judge','Agree','Agree'],['Disagree','Agree','Unable to judge','Disagree'],['Unable to judge','Unable to judge','Agree','Agree']]]
roles=['Quantitative reviewer','Service practitioner','Community advocate','Programme manager','Budget analyst','Frontline worker','Access advocate','Evidence reviewer']
for ci,c in enumerate(cases):
 people=[]
 for i,votes in enumerate(starts[ci]):
  # Everyone sees their assigned packet; only the first reviewer initially has all evidence.
  packet=list(c['evidence']) if i==0 else ([c['evidence'][0]] if i in (1,4) else [c['evidence'][1]] if i==5 else [c['evidence'][2]] if i in (2,6) else [])
  reasons=[]
  for j,v in enumerate(votes):
   if j==3:r=c['pro'] if v=='Agree' else c['con']
   elif v=='Unable to judge':r='My packet does not establish this proposition; I need the relevant outcome counts and follow-up.'
   elif (j==0 and v=='Agree' and i in (0,1,4)) or (j==1 and v=='Disagree' and i in (0,5)) or (j==2 and v=='Unable to judge'):r=c['correction'][j]
   else:r=('I currently lean toward this proposition based on an unverified expectation, not direct outcome data.' if v=='Agree' else 'I doubt this proposition, but I do not have direct data to settle it.')
   reasons.append(r)
  opening=' '.join(f'On whether {c["claims"][j][0].lower()+c["claims"][j][1:]} My view is {votes[j].lower()}. {reasons[j]}' for j in range(4))
  people.append(dict(id=f'P{i+1:02}',name=f'Participant {i+1}',role=roles[i],private_evidence=packet,opening=opening,round2=dict(votes=votes,reasons=reasons)))
 c['people']=people
 c['extraction_audit']=[dict(claim=j+1,origin='Authored from the eight openings; not platform AI extraction',source_participants=[p['id'] for p in people],meaning='Preserved by construction; requires independent review',qualification=c['claim_sources'][j]) for j in range(4)]
fixture=dict(version=1,provenance='Authored by the assistant in this Codex conversation. No independent participant models or evaluators. No OpenRouter calls.',purpose='Platform workflow pilot; not a causal efficacy study',scenarios=cases)
Path('scripts/fixtures/authored-feedback-pilot.json').write_text(json.dumps(fixture,indent=2)+'\n')

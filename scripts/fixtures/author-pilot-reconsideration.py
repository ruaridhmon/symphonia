"""Authored reconsiderations after reviewing the saved platform round-two feedback.
This is a scenario fixture, not independently sampled participants or causal evidence.
"""
import json,hashlib
from pathlib import Path
p=Path('scripts/fixtures/authored-feedback-pilot.json');f=json.loads(p.read_text())
saved=json.loads(Path('/tmp/symphonia-authored-feedback-initial.json').read_text())
# Explicitly chosen illustrative trajectories: corrected beliefs, unresolved uncertainty,
# retained mistakes and persistent value disagreements. No optimisation or model calls.
feedback_votes=[
 [['Agree','Disagree','Unable to judge','Agree'],['Agree','Disagree','Unable to judge','Agree'],['Agree','Unable to judge','Unable to judge','Disagree'],['Agree','Agree','Agree','Agree'],['Agree','Disagree','Unable to judge','Disagree'],['Agree','Disagree','Unable to judge','Agree'],['Agree','Disagree','Unable to judge','Disagree'],['Unable to judge','Disagree','Unable to judge','Agree']],
 [['Agree','Disagree','Unable to judge','Agree'],['Agree','Disagree','Unable to judge','Disagree'],['Agree','Disagree','Unable to judge','Agree'],['Unable to judge','Disagree','Agree','Disagree'],['Agree','Disagree','Unable to judge','Agree'],['Agree','Disagree','Unable to judge','Disagree'],['Agree','Agree','Unable to judge','Agree'],['Agree','Disagree','Unable to judge','Disagree']],
 [['Agree','Disagree','Unable to judge','Agree'],['Agree','Disagree','Unable to judge','Agree'],['Unable to judge','Unable to judge','Unable to judge','Disagree'],['Agree','Agree','Agree','Agree'],['Agree','Disagree','Unable to judge','Disagree'],['Agree','Disagree','Unable to judge','Agree'],['Agree','Disagree','Unable to judge','Disagree'],['Unable to judge','Disagree','Unable to judge','Agree']]]
for ci,c in enumerate(f['scenarios']):
 record=next(r for r in saved if r['scenario_id']==c['id'] and r['arm']=='feedback')
 feedback=record['rounds'][1]['summary'];c['reviewed_feedback_sha256']=hashlib.sha256(feedback.encode()).hexdigest()
 for i,person in enumerate(c['people']):
  initial=person['round2'];v=feedback_votes[ci][i];reasons=[]
  for j,new in enumerate(v):
   old=initial['votes'][j]
   if j==3:reason=initial['reasons'][j]+' The other participants prioritise different values; their ratings do not settle this choice.'
   elif new=='Unable to judge':reason=('The peer discussion gives no measured outcome for this claim. I withdraw my unsupported expectation.' if old!='Unable to judge' else 'I remain unable to judge; the peer statements do not resolve the evidence gap to my satisfaction.')
   elif (j==0 and new=='Agree') or (j==1 and new=='Disagree'):
    reason=('I retain my rating. ' if old==new else 'I revise my rating after reading P01’s explanation in the saved feedback. ')+c['correction'][j]
   else:reason='I retain my earlier expectation despite P01’s contrary explanation. I have no new supporting evidence; this remaining belief is not evidence of effectiveness.'
   reasons.append(reason)
  nv=list(initial['votes']);nr=[r+' On reconsideration, my original packet supplies no additional basis for a change.' for r in initial['reasons']]
  # A self-review change based only on evidence actually in that participant's packet.
  if ci==1 and i==5:nv[1]='Disagree';nr[1]='On rereading my original H2 packet, 18000/90 is 200 and 12000/75 is 160; evening delivery is more expensive per attendee.'
  if ci==2 and i==1:nv[0]='Agree';nr[0]='On rereading my original R1 packet, 36/60 minus 24/60 is 20 percentage points. I correct my earlier arithmetic doubt; this remains an association.'
  person['round3']={'feedback':{'votes':v,'reasons':reasons},'no-feedback':{'votes':nv,'reasons':nr}}
f['reconsideration_provenance']='Assistant-authored after reading saved round-two feedback. No separate model agents; no causal inference is valid. No-feedback responses use only the original private packets.'
p.write_text(json.dumps(f,indent=2)+'\n')

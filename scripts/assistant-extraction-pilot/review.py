"""Explicit assistant adjudications, authored after all 192 outputs were frozen.
No model/API calls. This file records judgments; it does not infer semantic scores.
"""
MAPS={
'001':[[1,2,3,4,5,6,7,9],[9,10,7,8,11,6,12,13],[3,2,1,15,14,13,5,6],[6,7,9,8,5,10,11,12],[13,14,10,11,15,12,1,3],[1,2,5,3,4,8,7,9]],
'003':[[5,6,2,4,1,3,9,8],[11,12,9,4,10,14,15,13],[14,3,1,2,13,15,5,4],[5,7,4,8,9,11,12,10],[11,10,12,13,14,15,1,3],[1,3,2,5,6,4,7,8]],
'004':[[1,2,3,4,6,9,8,7],[10,7,11,13,12,8,14,15],[1,2,3,4,13,14,15,6],[9,5,4,7,8,6,12,11],[15,10,14,13,12,11,1,3],[13,1,5,3,4,6,8,9]],
'602':[[1,2,3,4,5,6,8,9],[11,12,14,7,9,10,15,13],[1,2,3,13,14,15,4,9],[4,5,6,7,8,9,11,12],[14,11,12,13,15,10,1,3],[1,2,3,4,5,6,8,9]]}
# Conservative strict-preservation judgments. These are contestable assistant labels,
# published with a relaxed sensitivity analysis, not independent ground truth.
PARTIAL={
('pilot-001-03',1):('population','Both source responses restrict the neurotypical finding to ages 8–12. The extracted claim drops the age restriction in a scenario also discussing secondary pupils.'),
('pilot-001-03',2):('outcome','The source outcome is anxiety-related school-refusal incidents. The extraction shortens this to school refusal, losing the cause-specific outcome.'),
('pilot-001-04',1):('outcome','The source reports anxiety-related school refusal. The extraction states school refusal; an anxiety-disorder population does not itself preserve the cause-specific outcome.'),
('pilot-001-06',2):('outcome','The source reports anxiety-related school-refusal incidents. The extraction omits anxiety-related, broadening the outcome.'),
('pilot-001-06',4):('population','P11 explicitly restricts the neurotypical finding to ages 8–12. The extraction drops the age restriction.'),
('pilot-003-01',6):('population','The source benefit applies to Heliox-7-positive adults. The extraction omits the screen-positive population and states only early treatment reduces events.'),
('pilot-003-03',2):('population','Both sources condition LVX-2 benefit on a positive Heliox-7 screen. The extracted treatment claim retains age and duration but loses the positive-screen condition.'),
('pilot-004-04',1):('duration','P07 explicitly reports twelve-month re-offending. The extracted quantitative claim omits the observation period.'),
('pilot-004-04',3):('population','The source harmful conduct-disorder subgroup is aged 10–14. The extraction omits the age restriction in a panel also discussing ages 15–17.'),
('pilot-004-06',7):('stance','P12 states insufficient evidence for the universal ineffectiveness inference, with methodological criticisms. The extraction recasts this as rejects. Conservative scoring treats that as a shift from uncertainty to opposition; relaxed scoring accepts the methodological paraphrase.')}
RUBRIC={
'unit':'One focal proposition, potentially with multiple attributed positions. Shared scenario and intervention context may be carried by the panel. A proposition receives at most one coverage credit.',
'faithful':'Core proposition, attributed stance, evidential status and explicitly stated consequential subgroup, outcome or time restriction are preserved. Faithfulness is to the input, not external truth. A qualitative finding need not reproduce every statistic, citation or measurement instrument.',
'partial':'Core proposition remains traceable but a consequential restriction is lost or an uncertain stance is sharpened. Scores zero under the strict rule. Full source paragraphs are published to permit challenge.',
'unsupported':'No supporting focal proposition or contradiction of its core meaning. None judged in this assistant review.',
'limits':'Rubric operationalized after output generation; single unblinded self-review, visible reference IDs, no independent adjudication. Positive judgments can also be wrong. Relaxed endpoints are annotation sensitivity, not confidence intervals.',
'relaxed':'Counts all partial judgments as retained. This deliberately exposes the influence of the ten strict labels. It is not another experiment.'}

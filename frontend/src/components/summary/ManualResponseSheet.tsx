import { useEffect, useRef, useState } from 'react';
import { api, getApiErrorDetail } from '../../api/client';
import { getForm, type FormDetail } from '../../api/forms';
import type { Form, Round } from '../../types/summary';
import { emptyStructuredResponse, type StructuredResponse } from '../../types/structured-input';
import { normalizeAnswerRecord } from '../../utils/answers';
import { normalizeQuestion, isTypedSurveyQuestion } from '../../utils/questions';
import { isRichFillableDocumentTemplate } from '../../utils/documentTemplate';
import { validateQuestionResponses, validateDocumentTemplateResponses } from '../../utils/responseValidation';
import SurveyQuestionInput from '../SurveyQuestionInput';
import StructuredInput from '../StructuredInput';
import DocumentTemplateResponse from '../DocumentTemplateResponse';

export type ManualResponseProps = { form: Form; round: Round; onClose: () => void; onSaved: () => void | Promise<void> };

/** Uses the participant controls, but records a separate, explicitly attributed offline entry. */
export default function ManualResponseSheet({ form, round, onClose, onSaved }: ManualResponseProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const requestId = useRef(crypto.randomUUID());
  const mounted = useRef(true);
  const [details, setDetails] = useState<FormDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [answers, setAnswers] = useState<Record<string, StructuredResponse>>({});
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState<string | null>(null);
  const questions = round.questions;
  const dirty = !!name.trim() || Object.values(answers).some(a => a.position.trim() || a.evidence.trim());
  const template = details?.document_template;
  const update = (key: string, value: StructuredResponse) => { setAnswers(old => ({ ...old, [key]: value })); setError(''); setMissing(null); };
  const close = () => { if (!saving && (!dirty || window.confirm('Discard this unsaved response?'))) onClose(); };
  useEffect(() => {
    mounted.current = true;
    dialog.current?.showModal(); nameInput.current?.focus();
    getForm(form.id).then(data => { if (mounted.current) setDetails(data); }).catch(err => { if (mounted.current) setLoadError(getApiErrorDetail(err) || 'Could not load the form. Close this sheet and try again.'); });
    return () => { mounted.current = false; };
  }, [form.id]);

  async function save() {
    if (saving || !details) return;
    if (!name.trim()) { setError('Enter the respondent’s name.'); nameInput.current?.focus(); return; }
    const validation = template && !isRichFillableDocumentTemplate(template)
      ? validateDocumentTemplateResponses(template, answers) : validateQuestionResponses(questions, answers);
    if (!validation.ok) { setError(validation.message); setMissing(validation.key); return; }
    if (details.consent_required && !consent) { setError('Confirm the respondent’s consent before saving.'); return; }
    setSaving(true); setError('');
    try {
      await api.post(`/forms/${form.id}/rounds/${round.id}/responses`, {
        participant_name: name.trim(), answers: normalizeAnswerRecord(answers),
        expected_questions: questions, request_id: requestId.current, consent_confirmed: consent,
      });
      if (mounted.current) { await onSaved(); onClose(); }
    } catch (err) {
      if (mounted.current) setError(getApiErrorDetail(err) || 'Could not save this response. Your entry is still here; try again.');
    } finally { if (mounted.current) setSaving(false); }
  }
  const configs = questions.map(normalizeQuestion);
  const visible = (index: number) => {
    const q = configs[index]; const allowed = q.conditionalOnOptions?.length ? q.conditionalOnOptions : q.conditionalOnOption ? [q.conditionalOnOption] : [];
    if (!q.conditionalOnQuestionId || !allowed.length) return true;
    const parent = configs.findIndex(c => c.questionId === q.conditionalOnQuestionId);
    return parent >= 0 && allowed.some(option => (answers[`q${parent + 1}`]?.position || '').split('\n').includes(option));
  };
  return <dialog ref={dialog} className="manual-response-sheet" aria-labelledby="manual-response-title" data-dirty={dirty ? 'true' : 'false'} onCancel={event => { event.preventDefault(); close(); }}>
    <div className="manual-response-heading"><div><h2 id="manual-response-title">Add response</h2><p>Round {round.round_number} · {form.title}</p></div><button type="button" aria-label="Close add response" onClick={close} disabled={saving}>×</button></div>
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <div className="manual-response-content">
        <p className="manual-response-note">Record answers received outside Symphonia. Each entry creates a separate respondent and is labelled “Recorded by admin”.</p>
        <label className="manual-response-name">Respondent name<input ref={nameInput} value={name} onChange={e => setName(e.target.value)} maxLength={160} autoComplete="off" disabled={saving} /></label>
        {loadError ? <p role="alert">{loadError}</p> : !details ? <p role="status">Loading form…</p> : template ? <DocumentTemplateResponse template={template} questions={questions} answers={answers} onChange={update} readOnly={saving} highlightedQuestionKey={missing} /> : configs.map((question, index) => {
          const key = `q${index + 1}`; if (!visible(index)) return null;
          return <section key={key} className={`manual-response-question ${missing === key ? 'manual-response-missing' : ''}`}>
            {question.sectionTitle && question.sectionTitle !== configs[index - 1]?.sectionTitle ? <h3>{question.sectionTitle}</h3> : null}
            {question.groupPrompt && question.groupPrompt !== configs[index - 1]?.groupPrompt ? <p className="manual-response-feedback">{question.groupPrompt}</p> : null}
            <h4>{question.label}<span>{question.optional ? ' · Optional' : ''}</span></h4>
            {isTypedSurveyQuestion(question) ? <SurveyQuestionInput question={question} value={answers[key] || emptyStructuredResponse()} onChange={value => update(key, value)} readOnly={saving} /> : <StructuredInput questionIndex={index} formId={form.id} value={answers[key] || emptyStructuredResponse()} onChange={value => update(key, value)} showEvidence={question.requireEvidence} showConfidence={question.requireConfidence} showCounterarguments={question.requireCounterarguments} persistDraft={false} readOnly={saving} />}
          </section>;
        })}
        {details?.consent_required ? <label className="manual-response-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={saving} />I confirm the respondent gave the consent required for this consultation.</label> : null}
        {error ? <p role="alert" className="manual-response-error">{error}</p> : null}
      </div>
      <div className="manual-response-footer"><button type="button" onClick={close} disabled={saving}>Cancel</button><button type="submit" disabled={saving || !details} className="cw-primary">{saving ? 'Saving…' : 'Save response'}</button></div>
    </form>
  </dialog>;
}

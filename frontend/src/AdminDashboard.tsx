import { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';
import { useAuth } from './AuthContext';
import Container from './layouts/Container';

/**
 * Admin dashboard — create forms, view/manage existing forms.
 *
 * Rendered inside PageLayout via Dashboard component.
 */
export default function AdminDashboard() {
  const { token } = useAuth();
  const [forms, setForms] = useState([]);
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newQuestions, setNewQuestions] = useState(['']);

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE_URL}/forms`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(d => setForms(Array.isArray(d) ? d : []));
    }
  }, [token]);

  const createForm = async () => {
    const res = await fetch(`${API_BASE_URL}/create_form`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: newFormTitle,
        questions: newQuestions.filter(q => q.trim() !== ''),
        allow_join: true,
        join_code: String(Math.floor(10000 + Math.random() * 90000)),
      }),
    });
    if (!res.ok) {
      alert(`Save failed: ${res.status}`);
      return;
    }

    const created = await res.json();
    setForms(prev => [...prev, created]);
    setNewFormTitle('');
    setNewQuestions(['']);
  };

  return (
    <section className="flex-1 py-6 sm:py-8">
      <Container size="lg">
        {/* ── Create form card ── */}
        <div
          className="rounded-lg p-4 sm:p-6 mb-6 sm:mb-8"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--card-shadow, none)',
          }}
        >
          <h2
            className="text-xl font-semibold mb-4"
            style={{ color: 'var(--foreground)' }}
          >
            Create a New Form
          </h2>
          <input
            type="text"
            placeholder="Form title"
            value={newFormTitle}
            onChange={e => setNewFormTitle(e.target.value)}
            className="w-full rounded-lg px-3 py-2 mb-4"
            style={{
              border: '1px solid var(--input)',
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
            }}
          />
          {newQuestions.map((q, i) => (
            <input
              key={i}
              type="text"
              placeholder={`Question ${i + 1}`}
              value={q}
              onChange={e => {
                const updated = [...newQuestions];
                updated[i] = e.target.value;
                setNewQuestions(updated);
              }}
              className="w-full rounded-lg px-3 py-2 mb-2"
              style={{
                border: '1px solid var(--input)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
            />
          ))}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-3">
            <button
              type="button"
              onClick={() => setNewQuestions([...newQuestions, ''])}
              className="text-sm"
              style={{ color: 'var(--accent)' }}
            >
              + Add question
            </button>
            <button
              type="button"
              onClick={createForm}
              className="px-4 py-2 rounded-lg font-medium"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-foreground)',
              }}
            >
              Save Form
            </button>
          </div>
        </div>

        {/* ── Existing forms table ── */}
        {forms.length > 0 && (
          <div
            className="rounded-lg p-4 sm:p-6"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--card-shadow, none)',
            }}
          >
            <h2
              className="text-lg font-semibold mb-4"
              style={{ color: 'var(--foreground)' }}
            >
              Existing Forms
            </h2>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr
                    style={{
                      backgroundColor: 'var(--muted)',
                      color: 'var(--muted-foreground)',
                    }}
                  >
                    <th className="p-3 font-medium">Form Title</th>
                    <th className="p-3 font-medium">Join Code</th>
                    <th className="p-3 font-medium">Participants</th>
                    <th className="p-3 font-medium">Current Round</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {forms.map((f: any) => (
                    <tr
                      key={f.id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td
                        className="p-3 font-medium"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {f.title}
                      </td>
                      <td className="p-3">
                        <code
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: 'var(--muted)',
                            color: 'var(--foreground)',
                          }}
                        >
                          {f.join_code}
                        </code>
                      </td>
                      <td className="p-3">{f.participant_count}</td>
                      <td className="p-3">{f.current_round}</td>
                      <td className="p-3 text-right space-x-4">
                        <a
                          href={`/admin/form/${f.id}`}
                          style={{ color: 'var(--accent)' }}
                        >
                          Edit
                        </a>
                        <a
                          href={`/admin/form/${f.id}/summary`}
                          style={{ color: 'var(--accent)' }}
                        >
                          Summary
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden space-y-3">
              {forms.map((f: any) => (
                <div
                  key={f.id}
                  className="rounded-lg p-4"
                  style={{
                    backgroundColor: 'var(--muted)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    className="font-medium mb-2"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {f.title}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-3"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    <span>
                      Code:{' '}
                      <code
                        className="px-1.5 py-0.5 rounded text-xs"
                        style={{
                          backgroundColor: 'var(--card)',
                          color: 'var(--foreground)',
                        }}
                      >
                        {f.join_code}
                      </code>
                    </span>
                    <span>Participants: {f.participant_count}</span>
                    <span>Round: {f.current_round}</span>
                  </div>
                  <div className="flex gap-4">
                    <a
                      href={`/admin/form/${f.id}`}
                      className="text-sm"
                      style={{ color: 'var(--accent)' }}
                    >
                      Edit
                    </a>
                    <a
                      href={`/admin/form/${f.id}/summary`}
                      className="text-sm"
                      style={{ color: 'var(--accent)' }}
                    >
                      Summary
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}

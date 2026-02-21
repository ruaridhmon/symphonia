import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map } from 'lucide-react';
import { API_BASE_URL } from './config';

interface TestForm {
  id: number;
  title: string;
}

export default function Atlas() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<TestForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    seedAndFetch();
  }, []);

  const seedAndFetch = async () => {
    // Always seed first to ensure data exists
    try {
      await fetch(`${API_BASE_URL}/atlas/seed`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {}
    
    // Then fetch forms
    try {
      const res = await fetch(`${API_BASE_URL}/forms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setForms(await res.json());
      }
    } catch (e) {}
    setLoading(false);
  };

  const goTo = (path: string) => {
    navigate(path);
  };

  const setView = (isAdmin: boolean) => {
    localStorage.setItem('is_admin', isAdmin ? 'true' : 'false');
  };

  // Find form IDs
  const freshForm = forms.find(f => f.title.includes('Fresh'));
  const withResponses = forms.find(f => f.title.includes('Responses'));
  const multiRound = forms.find(f => f.title.includes('Multi-Round'));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="flex flex-col items-center gap-4 animate-fade-up">
          <div className="spinner" />
          <div className="text-xl">Loading Atlas...</div>
        </div>
      </div>
    );
  }

  const states = [
    {
      category: '🔐 Auth States',
      items: [
        { label: 'Login Page', action: () => { localStorage.clear(); goTo('/login'); } },
        { label: 'Register Page', action: () => { localStorage.clear(); goTo('/register'); } },
      ]
    },
    {
      category: '👑 Admin Views',
      items: [
        { label: 'Admin Dashboard', action: () => { setView(true); goTo('/'); window.location.reload(); } },
        { label: 'Create New Form', action: () => { setView(true); goTo('/admin/form/new'); } },
        ...(freshForm ? [{ label: 'Summary: Empty Form', action: () => { setView(true); goTo(`/admin/form/${freshForm.id}/summary`); } }] : []),
        ...(withResponses ? [{ label: 'Summary: With Responses', action: () => { setView(true); goTo(`/admin/form/${withResponses.id}/summary`); } }] : []),
        ...(multiRound ? [{ label: 'Summary: Multi-Round', action: () => { setView(true); goTo(`/admin/form/${multiRound.id}/summary`); } }] : []),
      ]
    },
    {
      category: '👤 User Views', 
      items: [
        { label: 'User Dashboard', action: () => { setView(false); goTo('/'); window.location.reload(); } },
        ...(freshForm ? [{ label: 'Submit: Fresh Form', action: () => { setView(false); goTo(`/form/${freshForm.id}`); } }] : []),
        ...(withResponses ? [{ label: 'Submit: Form with Responses', action: () => { setView(false); goTo(`/form/${withResponses.id}`); } }] : []),
      ]
    },
    {
      category: '📄 Result States',
      items: [
        { label: 'Thank You Page', action: () => goTo('/thank-you') },
        { label: 'Waiting Room', action: () => goTo('/waiting') },
        { label: 'Results Page', action: () => goTo('/result') },
      ]
    },
  ];

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Map size={28} style={{ color: 'var(--accent)' }} /> UX Atlas</h1>
        <p className="mb-8 opacity-60">Click any button to jump to that state</p>

        {states.map((section, sectionIdx) => (
          <div key={section.category} className="mb-8 animate-fade-up" style={{ animationDelay: `${sectionIdx * 80}ms` }}>
            <h2 className="text-lg font-semibold mb-3 opacity-80">{section.category}</h2>
            <div className="grid gap-2 stagger-list">
              {section.items.map((item, i) => (
                <button
                  key={i}
                  onClick={item.action}
                  className="w-full text-left px-4 py-3 rounded-lg border hover-lift btn-press"
                  style={{ 
                    backgroundColor: 'var(--card)', 
                    borderColor: 'var(--border)',
                  }}
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="float-right opacity-40">→</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-8 pt-4 border-t text-sm opacity-50" style={{ borderColor: 'var(--border)' }}>
          {forms.length} test forms loaded
        </div>
      </div>
    </div>
  );
}

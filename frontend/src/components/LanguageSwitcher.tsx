import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'el', label: 'Ελληνικά' },
  // Add more languages here as translations are added:
  // { code: 'de', label: 'Deutsch' },
  // { code: 'fr', label: 'Français' },
  // { code: 'es', label: 'Español' },
] as const;

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  // Don't render if only one language is available (but keep component ready)
  if (LANGUAGES.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      <Globe
        size={14}
        style={{ color: 'var(--muted-foreground)', flexShrink: 0 }}
        aria-hidden="true"
      />
      <select
        value={i18n.language}
        onChange={handleChange}
        aria-label={t('language.label')}
        className="text-sm rounded-md px-2 py-1"
        style={{
          backgroundColor: 'var(--card)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
          cursor: 'pointer',
        }}
      >
        {LANGUAGES.map(lang => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}

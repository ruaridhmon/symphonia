import RichDocumentEditor from './RichDocumentEditor';
import LoadingButton from './LoadingButton';

type Props = {
  title: string;
  description?: string;
  consentText: string;
  consentDocument?: string | null;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  onContinue: () => void;
  loading?: boolean;
  continueLabel?: string;
  error?: string | null;
  disabled?: boolean;
  hideAction?: boolean;
};

export default function ConsentGate({
  title,
  description,
  consentText,
  consentDocument,
  checked,
  onCheckedChange,
  onContinue,
  loading = false,
  continueLabel = 'Continue',
  error = null,
  disabled = false,
  hideAction = false,
}: Props) {
  return (
    <div className="card-lg p-6 sm:p-8 space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {description}
          </p>
        ) : null}
      </div>

      {consentDocument ? (
        <RichDocumentEditor value={consentDocument} readOnly minHeight="16rem" />
      ) : null}

      <div
        className="rounded-xl p-4"
        style={{
          border: '1px solid var(--border)',
          backgroundColor: 'var(--background)',
        }}
      >
        <p className="text-sm leading-6 whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>
          {consentText}
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-xl p-4" style={{ border: '1px solid var(--border)' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="mt-1"
        />
        <span className="text-sm leading-6" style={{ color: 'var(--foreground)' }}>
          I have read the information above and agree to continue.
        </span>
      </label>

      {error ? (
        <p className="text-sm text-center" style={{ color: 'var(--destructive)' }}>
          {error}
        </p>
      ) : null}

      {hideAction ? null : (
        <LoadingButton
          variant="accent"
          size="md"
          className="w-full"
          loading={loading}
          disabled={disabled || !checked}
          onClick={onContinue}
        >
          {continueLabel}
        </LoadingButton>
      )}
    </div>
  );
}

export function ToggleSwitch({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none"
      style={{
        width: 40,
        height: 22,
        backgroundColor: checked ? 'var(--accent)' : 'var(--input)',
        cursor: 'pointer',
        border: 'none',
        padding: 0,
      }}
    >
      <span
        className="block rounded-full shadow-sm transition-transform duration-200"
        style={{
          width: 18,
          height: 18,
          marginTop: 2,
          marginLeft: checked ? 20 : 2,
          backgroundColor: '#fff',
        }}
      />
    </button>
  );
}

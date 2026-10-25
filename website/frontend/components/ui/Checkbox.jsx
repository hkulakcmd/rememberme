'use client';

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-field border border-line bg-white px-4 py-3 transition hover:border-brand-200 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-200">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

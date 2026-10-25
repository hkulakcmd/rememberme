'use client';

import { useId, useMemo, useState } from 'react';

import { Input } from '@/components/ui/Input';

export function TimezoneField({
  value,
  onChange,
  zones,
  detected,
  error,
}) {
  const listId = useId();
  const [query, setQuery] = useState('');

  const options = useMemo(() => {
    const term = query.trim().toLowerCase();
    const source = term
      ? zones.filter((zone) => zone.toLowerCase().includes(term))
      : zones;
    const unique = new Set([value, ...source].filter(Boolean));
    return [...unique].slice(0, 50);
  }, [query, value, zones]);

  return (
    <div>
      <Input
        label="Strefa czasowa"
        name="timezone"
        list={listId}
        autoComplete="off"
        value={value}
        onFocus={() => setQuery('')}
        onChange={(event) => {
          onChange(event.target.value);
          setQuery(event.target.value);
        }}
        error={error}
        hint="Używana do dzisiejszej daty, sortowania i godziny przypomnień. Zacznij pisać, aby zawęzić listę."
        required
      />
      <datalist id={listId}>
        {options.map((zone) => (
          <option key={zone} value={zone} />
        ))}
      </datalist>
      {detected && detected !== value ? (
        <button
          type="button"
          onClick={() => onChange(detected)}
          className="mt-2 inline-flex min-h-11 items-center rounded-full px-3 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
        >
          Użyj strefy przeglądarki: {detected}
        </button>
      ) : null}
    </div>
  );
}

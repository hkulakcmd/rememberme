'use client';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import {
  formatAge,
  formatBirthdayDate,
  formatRelativeDays,
} from '@/lib/dates';

export function BirthdayCard({ birthday, onEdit, onDelete }) {
  const fullName = `${birthday.first_name} ${birthday.last_name}`.trim();
  const isToday = birthday.days_until === 0;
  const ageLabel = birthday.age !== null ? formatAge(birthday.age) : '';

  return (
    <li className="min-w-0 rounded-card border border-line bg-white p-4 shadow-card transition hover:border-brand-200 sm:p-5">
      <div className="flex items-start gap-3">
        <Avatar name={fullName} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className="min-w-0 truncate font-display text-base font-semibold text-ink"
              title={fullName}
            >
              {fullName}
            </h2>
            {isToday ? <Badge tone="today">Dziś</Badge> : null}
          </div>

          <p className="mt-0.5 text-sm text-muted">
            {formatBirthdayDate(
              birthday.birth_month,
              birthday.birth_day,
              birthday.birth_year
            )}
            {ageLabel ? ` · ${ageLabel}` : ''}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {birthday.relationship ? (
              <Badge tone="lavender">{birthday.relationship}</Badge>
            ) : null}
            {!isToday ? (
              <span className="text-xs font-semibold text-brand-700">
                {formatRelativeDays(birthday.days_until)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(birthday)}
            aria-label={`Edytuj urodziny: ${fullName}`}
            title="Edytuj"
            className="grid h-11 w-11 place-items-center rounded-full text-muted transition hover:bg-lavender-50 hover:text-lavender-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender-200"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onDelete(birthday)}
            aria-label={`Usuń urodziny: ${fullName}`}
            title="Usuń"
            className="grid h-11 w-11 place-items-center rounded-full text-muted transition hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v5M14 11v5" />
            </svg>
          </button>
        </div>
      </div>
    </li>
  );
}

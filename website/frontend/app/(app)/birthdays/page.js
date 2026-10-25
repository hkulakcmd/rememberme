import { Suspense } from 'react';

import { BirthdaysView } from '@/components/birthdays/BirthdaysView';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';

export const metadata = {
  title: 'Urodziny',
};

function BirthdaysFallback() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Urodziny"
        description="Wszystkie osoby, o których chcesz pamiętać."
      />
      <Skeleton className="h-28 w-full rounded-card" />
      <div className="space-y-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-24 w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}

export default function BirthdaysPage() {
  return (
    <Suspense fallback={<BirthdaysFallback />}>
      <BirthdaysView />
    </Suspense>
  );
}

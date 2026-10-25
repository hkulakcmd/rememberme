import { Suspense } from 'react';

import { PasswordResetConfirmForm } from '@/components/auth/PasswordResetConfirmForm';
import { AuthCard } from '@/components/layout/AuthCard';

export const metadata = {
  title: 'Nowe hasło',
};

function FormSkeleton() {
  return <div className="h-72 animate-pulse rounded-field bg-canvas" />;
}

export default function PasswordResetConfirmPage() {
  return (
    <AuthCard
      title="Ustaw nowe hasło"
      subtitle="Wybierz hasło, którego nie używasz nigdzie indziej."
    >
      <Suspense fallback={<FormSkeleton />}>
        <PasswordResetConfirmForm />
      </Suspense>
    </AuthCard>
  );
}

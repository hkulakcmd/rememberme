import { Suspense } from 'react';

import { GuestRedirect } from '@/components/auth/GuestRedirect';
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthCard } from '@/components/layout/AuthCard';

export const metadata = {
  title: 'Zaloguj się',
};

function FormSkeleton() {
  return <div className="h-72 animate-pulse rounded-field bg-canvas" />;
}

export default function LoginPage() {
  return (
    <AuthCard
      title="Witaj ponownie"
      subtitle="Zaloguj się, aby zobaczyć, czyje urodziny są już blisko."
    >
      <GuestRedirect />
      <Suspense fallback={<FormSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}

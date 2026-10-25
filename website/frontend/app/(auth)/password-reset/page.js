import { PasswordResetForm } from '@/components/auth/PasswordResetForm';
import { AuthCard } from '@/components/layout/AuthCard';

export const metadata = {
  title: 'Reset hasła',
};

export default function PasswordResetPage() {
  return (
    <AuthCard
      title="Reset hasła"
      subtitle="Podaj adres e-mail powiązany z kontem. Wyślemy link do ustawienia nowego hasła."
    >
      <PasswordResetForm />
    </AuthCard>
  );
}

import { GuestRedirect } from '@/components/auth/GuestRedirect';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { AuthCard } from '@/components/layout/AuthCard';

export const metadata = {
  title: 'Utwórz konto',
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="Zacznij pamiętać"
      subtitle="Utwórz konto w mniej niż minutę. Resztą zajmiemy się my."
    >
      <GuestRedirect />
      <RegisterForm />
    </AuthCard>
  );
}

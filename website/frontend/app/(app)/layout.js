import { AuthGate } from '@/components/layout/AuthGate';
import { AppShell } from '@/components/layout/AppShell';

export default function AppLayout({ children }) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}

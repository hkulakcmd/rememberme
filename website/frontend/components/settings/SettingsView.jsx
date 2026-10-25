'use client';

import { PageHeader } from '@/components/layout/PageHeader';

import { InstallCard } from '@/components/pwa/InstallCard';
import { PushSettings } from '@/components/pwa/PushSettings';

import { NotificationForm } from './NotificationForm';
import { ProfileForm } from './ProfileForm';
import { SecuritySection } from './SecuritySection';

export function SettingsView() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Ustawienia"
        description="Twoje konto i preferencje w jednym miejscu."
      />
      <ProfileForm />
      <div className="grid gap-5 xl:grid-cols-2">
        <InstallCard />
        <PushSettings />
        <NotificationForm />
        <SecuritySection />
      </div>
    </div>
  );
}

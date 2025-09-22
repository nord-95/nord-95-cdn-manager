'use client';

import { useServiceWorker } from '@/hooks/useServiceWorker';
import { PWAInstaller } from './PWAInstaller';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useServiceWorker();

  return (
    <>
      {children}
      <PWAInstaller />
    </>
  );
}

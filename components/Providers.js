'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from '@/components/ui/sonner';

export default function Providers({ children, session }) {
  return (
    <SessionProvider session={session}>
      {children}
      <Toaster position="bottom-center" richColors closeButton />
    </SessionProvider>
  );
}

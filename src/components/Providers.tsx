'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { set, get, del } from 'idb-keyval';
import { ReactNode, useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth';

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 1000 * 60 * 60 * 24, // 24 hours (formerly cacheTime)
      },
    },
  }));

  const [persister, setPersister] = useState<any>(null);

  useEffect(() => {
    // Only create persister on the client side
    const p = createAsyncStoragePersister({
      storage: {
        getItem: async (key) => {
          const value = await get(key);
          return value || null;
        },
        setItem: async (key, value) => {
          await set(key, value);
        },
        removeItem: async (key) => {
          await del(key);
        },
      },
    });
    setPersister(p);
  }, []);

  if (!persister) {
    // Render with standard provider while mounting on client
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </QueryClientProvider>
    );
  }


  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <AuthProvider>
        {children}
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}

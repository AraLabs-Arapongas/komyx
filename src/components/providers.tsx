'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { PrivacidadeProvider } from '@/components/privacidade'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }))
  return (
    <QueryClientProvider client={client}>
      <PrivacidadeProvider>
        {children}
        <Toaster position="top-center" />
      </PrivacidadeProvider>
    </QueryClientProvider>
  )
}

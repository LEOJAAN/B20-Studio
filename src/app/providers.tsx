'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, getDefaultConfig, lightTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';

import { Attribution } from 'ox/erc8021';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const DATA_SUFFIX = Attribution.toDataSuffix({ codes: ['bc_3f0os9q8'] });

const config = getDefaultConfig({
  appName: 'B20 Studio',
  projectId: projectId as string,
  chains: [base],
  ssr: true, // Enable Server Side Rendering support
  dataSuffix: DATA_SUFFIX,
});

export function Providers({ children }: { children: ReactNode }) {
  // Create a QueryClient instance on client side
  const [queryClient] = useState(() => new QueryClient());

  // Fail clearly at runtime if the WalletConnect project ID is missing
  if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
    throw new Error("CRITICAL: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not configured. Please add it to your environment variables.");
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: '#3b82f6', // Tailwind blue-500
            accentColorForeground: 'white',
            borderRadius: 'medium',
          })}
          initialChain={base}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}


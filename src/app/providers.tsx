'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, getDefaultConfig, lightTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';

// RainbowKit configuration
// For MVP/testing, we configure with baseSepolia and base
const config = getDefaultConfig({
  appName: 'B20 Studio',
  projectId: 'a587425ce3b44cd5a0c6d6c3816afb8e', // Generic WalletConnect Project ID placeholder
  chains: [baseSepolia, base],
  ssr: true, // Enable Server Side Rendering support
});

export function Providers({ children }: { children: ReactNode }) {
  // Create a QueryClient instance on client side
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: '#3b82f6', // Tailwind blue-500
            accentColorForeground: 'white',
            borderRadius: 'medium',
          })}
          initialChain={baseSepolia}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { ShieldAlert, Terminal, AlertTriangle, Layers, LayoutDashboard, Rocket } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const isBaseSepolia = chainId === baseSepolia.id;
  const isBaseMainnet = chainId === base.id;
  const isSupported = isBaseSepolia || isBaseMainnet;

  return (
    <>
      {/* Global Warning Banner for Base Mainnet */}
      {isConnected && isBaseMainnet && (
        <div className="bg-amber-500 text-slate-900 text-xs md:text-sm py-2 px-4 font-medium flex items-center justify-center gap-2 border-b border-amber-600 shadow-sm animate-pulse">
          <AlertTriangle className="size-4 shrink-0" />
          <span><strong>Mainnet Mode Active:</strong> You are using real funds and real ETH for transaction gas fees. Proceed with caution.</span>
        </div>
      )}

      {/* Wrong Network Banner */}
      {isConnected && !isSupported && (
        <div className="bg-rose-500 text-white text-xs md:text-sm py-2 px-4 font-medium flex items-center justify-center gap-2 border-b border-rose-600 shadow-sm">
          <ShieldAlert className="size-4 shrink-0" />
          <span>You are connected to an unsupported network.</span>
          <button
            onClick={() => switchChain({ chainId: baseSepolia.id })}
            className="ml-2 bg-white text-rose-600 hover:bg-rose-50 text-[11px] font-bold py-1 px-3.5 rounded transition"
          >
            Switch to Base Sepolia
          </button>
        </div>
      )}

      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Layers className="size-5" />
              </div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                B20 Studio
              </span>
            </Link>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  pathname === '/'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Rocket className="size-4" />
                  Launchpad
                </span>
              </Link>
              <Link
                href="/dashboard"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  pathname === '/dashboard'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </span>
              </Link>
            </nav>
          </div>

          {/* Web3 Connections */}
          <div className="flex items-center gap-4">
            {/* Custom Network Switcher */}
            {isConnected && isSupported && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => switchChain({ chainId: baseSepolia.id })}
                  className={`px-2.5 py-1 rounded-md transition ${
                    isBaseSepolia
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Sepolia
                </button>
                <button
                  onClick={() => switchChain({ chainId: base.id })}
                  className={`px-2.5 py-1 rounded-md transition ${
                    isBaseMainnet
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Mainnet
                </button>
              </div>
            )}

            {/* Custom Badge to show Network status */}
            {isConnected && isSupported && (
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                  isBaseSepolia
                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                }`}
              >
                <span className={`size-1.5 rounded-full ${isBaseSepolia ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                {isBaseSepolia ? 'Base Sepolia' : 'Base Mainnet'}
              </span>
            )}

            {/* RainbowKit Connect Button */}
            <ConnectButton
              showBalance={false}
              chainStatus="none"
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
          </div>
        </div>
      </header>
    </>
  );
}

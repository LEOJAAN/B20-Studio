'use client';

import Navbar from '../components/Navbar';
import LaunchWizard from '../components/LaunchWizard';
import { Rocket, ShieldCheck, Flame, Layers, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-12 sm:pt-20 sm:pb-16 lg:pt-24 lg:pb-20">
        {/* Visual Gradients */}
        <div className="absolute inset-0 -z-10 radial-glow" />
        <div className="absolute top-0 right-0 -z-10 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 -z-10 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-600 text-xs font-bold uppercase tracking-wider animate-float">
            <Rocket className="size-3.5" />
            <span>Next-Generation Token Standard</span>
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-black tracking-tight text-slate-900 sm:text-6xl lg:text-7xl leading-[1.1]">
            Create and Manage <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Native B20 Tokens
            </span>{" "}
            on Base
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed">
            Deploy Meme Coins, Stablecoins, and Security Tokens directly at the Base node-precompile level. Experience native security, 50% cheaper transaction gas, and custom compliance frameworks.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a
              href="#launchpad"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition shadow-lg shadow-blue-500/20 text-sm flex items-center justify-center gap-2"
            >
              Get Started <ArrowRight className="size-4" />
            </a>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-3 px-8 rounded-xl transition text-sm flex items-center justify-center gap-2"
            >
              Manage Assets
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-12 border-t border-slate-200/50 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600 mb-4">
                <Flame className="size-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">50% Gas Reductions</h3>
              <p className="mt-2 text-xs md:text-sm text-slate-500 leading-relaxed">
                By executing as precompiled Rust code within the Base client, B20 transfers bypass EVM interpreter overhead, saving massive gas fees.
              </p>
            </div>

            <div className="flex flex-col items-center sm:items-start text-center sm:text-left p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 mb-4">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Native Access Controls</h3>
              <p className="mt-2 text-xs md:text-sm text-slate-500 leading-relaxed">
                Roles like Minter, Burner, and Pauser are validated natively, eliminating smart contract audit vulnerability vectors.
              </p>
            </div>

            <div className="flex flex-col items-center sm:items-start text-center sm:text-left p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="p-3 rounded-xl bg-violet-50 text-violet-600 mb-4">
                <Layers className="size-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Compliance & Policies</h3>
              <p className="mt-2 text-xs md:text-sm text-slate-500 leading-relaxed">
                Enforce transfer restrictions natively. Integrate with standard lockups, allowlists, or blocklists at the node level.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Launchpad Section */}
      <section id="launchpad" className="py-16 sm:py-20 border-t border-slate-200/50 bg-slate-50/30">
        <div className="mx-auto max-w-7xl">
          <LaunchWizard />
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} B20 Studio. Built natively for the Base network.</p>
        </div>
      </footer>
    </div>
  );
}

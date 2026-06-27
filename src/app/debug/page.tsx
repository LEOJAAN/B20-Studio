'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { B20_FACTORY_ADDRESS, B20_FACTORY_ABI } from '../../lib/b20Abi';
import Navbar from '../../components/Navbar';
import { Terminal, Copy, Check, ChevronRight, AlertTriangle, ShieldCheck, Cpu, RefreshCw, FileCode } from 'lucide-react';
import Link from 'next/link';

export default function DebugPage() {
  const { isConnected, address: userAddress, chain } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const [snapshot, setSnapshot] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showRawRevert, setShowRawRevert] = useState(false);

  // Security gate - only allow in development
  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (!isDev) return;

    const loadSnapshot = () => {
      const raw = localStorage.getItem('b20_debug_snapshot');
      if (raw) {
        try {
          setSnapshot(JSON.parse(raw));
        } catch (e) {
          console.error('Failed to parse debug snapshot:', e);
        }
      }
    };

    loadSnapshot();
    // Add event listener to reload if storage changes
    window.addEventListener('storage', loadSnapshot);
    return () => window.removeEventListener('storage', loadSnapshot);
  }, [isDev]);

  if (!isDev) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-800 p-4">
        <div className="text-center space-y-4 max-w-md bg-white border border-slate-200 p-8 rounded-2xl shadow-sm">
          <div className="mx-auto size-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertTriangle className="size-6 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Access Denied</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Debug page is disabled in production.
          </p>
        </div>
      </div>
    );
  }

  // Get active RPC Url safely
  const rpcUrl = publicClient?.chain?.rpcUrls?.default?.http?.[0] || 'Unknown / Not Connected';

  // Format dynamic fields
  const activeSalt = snapshot?.salt || 'None / Pending';
  const activeEncodedParams = snapshot?.encodedParams || 'None / Pending';
  const activeEncodedInitCalls = snapshot?.encodedInitCalls || [];
  const activeSimResult = snapshot?.simulationResult ? JSON.stringify(snapshot.simulationResult, null, 2) : 'None';
  const activeGasEstimate = snapshot?.gasEstimate || 'None';
  const activeTxHash = snapshot?.deployTxHash || 'None';
  const activeReceiptStatus = snapshot?.receiptStatus || 'None';
  const activeDecodedLogs = snapshot?.decodedLogs ? JSON.stringify(snapshot.decodedLogs, null, 2) : 'None';
  const activeStep = snapshot?.currentStep ? `Step ${snapshot.currentStep}` : 'None';
  const activeRecentErrors = snapshot?.recentErrors || 'None';
  const activeRawRevert = snapshot?.rawRevertData || 'None';
  const activeRecentSimData = snapshot?.recentSimulationData ? JSON.stringify(snapshot.recentSimulationData, null, 2) : 'None';

  // Copy Debug Report Handler
  const handleCopyReport = () => {
    // Construct raw report text
    const rawReport = `
=== B20 STUDIO DEVELOPER DEBUG REPORT ===
Generated: ${new Date().toISOString()}

[Environment Details]
NODE_ENV: ${process.env.NODE_ENV}
Wallet Address: ${userAddress || 'Not Connected'}
Connected Chain: ${chain?.name || 'Not Connected'}
Chain ID: ${chainId}
RPC URL: ${rpcUrl}
Factory Address: ${B20_FACTORY_ADDRESS}

[Latest Deployment Snapshot]
Current Salt: ${activeSalt}
Encoded Params: ${activeEncodedParams}
Encoded initCalls:
${activeEncodedInitCalls.map((c: string, idx: number) => `  ${idx + 1}: ${c}`).join('\n') || '  None'}

[Simulation & Execution Details]
Simulation Result: ${activeSimResult}
Gas Estimate: ${activeGasEstimate}
Transaction Hash: ${activeTxHash}
Receipt Status: ${activeReceiptStatus}
Decoded Logs: ${activeDecodedLogs}
Current Deployment Status: ${activeStep}

[Errors & Diagnostic Logs]
Recent Errors: ${activeRecentErrors}
Raw Revert Data: ${activeRawRevert}
Recent Simulation Data: ${activeRecentSimData}
==========================================
    `.trim();

    // Mask sensitive values
    let maskedReport = rawReport;

    // Mask private keys: any 64-char hex string not part of known factory/hashes, or secret patterns
    maskedReport = maskedReport.replace(/\b[0-9a-fA-F]{64}\b/g, (match) => {
      // Keep transaction hashes unchanged in logs if they match activeTxHash
      if (activeTxHash && activeTxHash.toLowerCase().includes(match.toLowerCase())) {
        return match;
      }
      return '[MASKED_KEY]';
    });

    // Mask Infura/Alchemy credentials in RPC URL
    maskedReport = maskedReport.replace(/(http[s]?:\/\/[^\/]+\/v3\/)([a-zA-Z0-9]{32})/g, '$1[MASKED_API_KEY]');
    maskedReport = maskedReport.replace(/(http[s]?:\/\/[^\/]+\/rpc\/v2\/)([a-zA-Z0-9_-]+)/g, '$1[MASKED_API_KEY]');

    // Copy to clipboard
    navigator.clipboard.writeText(maskedReport);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">
              <Cpu className="size-3.5" />
              <span>Developer Panel</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Developer Debug Console</h1>
            <p className="text-sm text-slate-500 mt-1">Real-time parameters, simulation responses, and logs for diagnosing node-precompile deployments.</p>
          </div>

          <button
            onClick={handleCopyReport}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 cursor-pointer"
          >
            {isCopied ? (
              <>
                <Check className="size-4 animate-bounce" /> Debug Report Copied!
              </>
            ) : (
              <>
                <Copy className="size-4" /> Copy Debug Report
              </>
            )}
          </button>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 1: Wallet & Node environment */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="size-4 text-blue-600" /> Active Web3 Environment
            </h3>

            <div className="text-xs space-y-3 font-mono">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Wallet Address</span>
                <span className="text-slate-800 font-bold break-all">{userAddress || 'Not Connected'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Connected Chain</span>
                <span className="text-slate-800 font-bold">{chain?.name || 'Not Connected'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Chain ID</span>
                <span className="text-slate-800 font-bold">{chainId}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">RPC URL</span>
                <span className="text-slate-800 font-bold break-all">{rpcUrl}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Factory Address</span>
                <span className="text-slate-800 font-bold break-all">{B20_FACTORY_ADDRESS}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Active Deploy States */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileCode className="size-4 text-indigo-600" /> Latest Deployment State
            </h3>

            <div className="text-xs space-y-3 font-mono">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Salt Parameter</span>
                <span className="text-slate-800 font-bold break-all">{activeSalt}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Deployment Step</span>
                <span className="text-slate-800 font-bold">{activeStep}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Gas Estimate</span>
                <span className="text-slate-800 font-bold">{activeGasEstimate}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Transaction Hash</span>
                <span className="text-slate-800 font-bold break-all">{activeTxHash}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Receipt Status</span>
                <span className={`font-bold uppercase ${
                  activeReceiptStatus === 'success' 
                    ? 'text-emerald-600' 
                    : activeReceiptStatus === 'reverted' 
                      ? 'text-rose-600' 
                      : 'text-slate-500'
                }`}>{activeReceiptStatus}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Codes & Payloads */}
        <div className="space-y-6">
          {/* Encoded Params & InitCalls */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Payload Encoding Diagnostics</h3>
            
            <div className="text-xs space-y-3 font-mono">
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">encodedParams (Hex)</span>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 break-all overflow-x-auto select-all max-h-32 text-slate-700">
                  {activeEncodedParams}
                </div>
              </div>

              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">encodedInitCalls (Array)</span>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5 overflow-x-auto max-h-40">
                  {activeEncodedInitCalls.length > 0 ? (
                    activeEncodedInitCalls.map((call: string, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-slate-400 select-none">{idx + 1}:</span>
                        <span className="text-slate-700 break-all select-all">{call}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">No initialization calls configured.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Simulation & Log Details */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Simulation & Decoded Event Logs</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Simulation Result Payload</span>
                <pre className="bg-slate-50 border border-slate-100 rounded-xl p-3 overflow-auto max-h-52 text-slate-700 text-[11px]">
                  {activeSimResult}
                </pre>
              </div>

              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Decoded B20Created Logs</span>
                <pre className="bg-slate-50 border border-slate-100 rounded-xl p-3 overflow-auto max-h-52 text-slate-700 text-[11px]">
                  {activeDecodedLogs}
                </pre>
              </div>
            </div>
          </div>

          {/* Errors, Revert reasons, and Raw data */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Diagnostic Errors & Reverts</h3>
              <button
                onClick={() => setShowRawRevert(!showRawRevert)}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase transition outline-none cursor-pointer"
              >
                {showRawRevert ? 'Hide Raw Details' : 'Show Raw Details'}
              </button>
            </div>

            <div className="text-xs space-y-3 font-mono">
              <div>
                <span className="block text-[10px] text-rose-400 font-bold uppercase tracking-wider mb-1">Recent Errors</span>
                <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 text-rose-700 break-all select-all">
                  {activeRecentErrors}
                </div>
              </div>

              {showRawRevert && (
                <>
                  <div>
                    <span className="block text-[10px] text-rose-450 font-bold uppercase tracking-wider mb-1">Raw Revert / Exception Stack</span>
                    <pre className="bg-rose-50/30 border border-rose-100/50 rounded-xl p-3 overflow-auto max-h-52 text-rose-800 text-[11px] whitespace-pre-wrap select-all">
                      {activeRawRevert}
                    </pre>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Recent Simulation Data (JSON)</span>
                    <pre className="bg-slate-50 border border-slate-100 rounded-xl p-3 overflow-auto max-h-52 text-slate-700 text-[11px] select-all">
                      {activeRecentSimData}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} B20 Studio. Developer Debug Portal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

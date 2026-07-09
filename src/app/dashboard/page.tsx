'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { base } from 'wagmi/chains';
import { isAddress, formatUnits } from 'viem';
import Navbar from '../../components/Navbar';
import DashboardForms from '../../components/DashboardForms';
import { useB20Details } from '../../hooks/useB20';
import { B20Variant, TokenMetadata, B20TxLog } from '../../types';
import { 
  Plus, Search, ExternalLink, Copy, 
  Clock, Coins, Sparkles, Building2, ChevronRight, RefreshCw, Trash2, Layers
} from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const { isConnected, address: userAddress } = useAccount();
  const chainId = useChainId();
  const currentNetwork = 'mainnet';

  // State
  const [tokens, setTokens] = useState<TokenMetadata[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenMetadata | null>(null);
  const [importAddress, setImportAddress] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [txLogs, setTxLogs] = useState<B20TxLog[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Hook details query for the selected token
  const { 
    details, 
    isLoading: isDetailsLoading, 
    refetch: refetchDetails 
  } = useB20Details(selectedToken?.address as `0x${string}`, userAddress);

  // Load tokens and logs from localStorage
  useEffect(() => {
    loadLocalData();
  }, []);

  const loadLocalData = () => {
    const localTokens = localStorage.getItem('b20_tokens');
    const localLogs = localStorage.getItem('b20_tx_logs');
    
    if (localTokens) {
      const parsedTokens: TokenMetadata[] = JSON.parse(localTokens);
      setTokens(parsedTokens);
      
      // Auto-select first token if available
      if (parsedTokens.length > 0 && !selectedToken) {
        setSelectedToken(parsedTokens[0]);
      }
    }
    
    if (localLogs) {
      setTxLogs(JSON.parse(localLogs));
    }
  };

  // Import B20 Token Address directly
  const handleImportToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    setImportSuccess(null);
    if (!importAddress || !isAddress(importAddress)) {
      setImportError('Please enter a valid contract address.');
      return;
    }

    // Check if token already exists in list
    const tokenExists = tokens.some(t => {
      const addrMatch = t.address.toLowerCase() === importAddress.toLowerCase();
      if (!addrMatch) return false;
      const isMainnetMatch = (t.network === 'mainnet' || t.network === 'base');
      return isMainnetMatch;
    });
    if (tokenExists) {
      setImportError('Token is already imported.');
      return;
    }

    setIsImporting(true);
    try {
      // Create a temporary mock metadata entry first. 
      // The useB20Details hook will query the actual on-chain state when selected.
      const rawImport: TokenMetadata = {
        address: importAddress,
        name: `Imported Token (${importAddress.substring(0, 6)})`,
        symbol: 'B20',
        decimals: 18, // Default, will update
        variant: B20Variant.ASSET, // Default, will update
        network: currentNetwork,
        totalSupply: '0',
        supplyCap: 'Unlimited',
        createdAt: Date.now()
      };

      const updated = [...tokens, rawImport];
      setTokens(updated);
      localStorage.setItem('b20_tokens', JSON.stringify(updated));
      setSelectedToken(rawImport);
      setImportAddress('');
      setImportSuccess('Token address registered. Connecting to Base nodes to resolve contract parameters...');
    } catch (err) {
      console.error(err);
      setImportError('Failed to register token.');
    } finally {
      setIsImporting(false);
    }
  };

  // Sync the metadata in localStorage with the real on-chain details once loaded
  useEffect(() => {
    if (details && selectedToken) {
      // Decode raw blockchain supply values to human-readable format
      let formattedTotalSupply = '0';
      try {
        formattedTotalSupply = formatUnits(BigInt(details.totalSupply), details.decimals);
      } catch (e) {
        console.error('Error formatting total supply', e);
      }

      const maxUint128 = '340282366920938463463374607431768211455';
      const maxUint256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
      
      const isCapUnlimited = (
        details.supplyCap === '0' || 
        details.supplyCap === maxUint128 || 
        details.supplyCap === maxUint256 ||
        details.supplyCap === 'Unlimited'
      );
      
      let formattedSupplyCap = 'Unlimited';
      if (!isCapUnlimited) {
        try {
          formattedSupplyCap = formatUnits(BigInt(details.supplyCap), details.decimals);
        } catch (e) {
          console.error('Error formatting supply cap', e);
        }
      }

      const needsUpdate = 
        selectedToken.name !== details.name ||
        selectedToken.symbol !== details.symbol ||
        selectedToken.decimals !== details.decimals ||
        selectedToken.totalSupply !== formattedTotalSupply ||
        selectedToken.supplyCap !== formattedSupplyCap;

      if (needsUpdate) {
        const updatedTokens = tokens.map(t => {
          if (t.address.toLowerCase() === selectedToken.address.toLowerCase() && t.network === selectedToken.network) {
            return {
              ...t,
              name: details.name || t.name,
              symbol: details.symbol || t.symbol,
              decimals: details.decimals,
              totalSupply: formattedTotalSupply,
              supplyCap: formattedSupplyCap,
              variant: details.currency !== undefined ? B20Variant.STABLECOIN : B20Variant.ASSET,
              currency: details.currency
            };
          }
          return t;
        });

        setTokens(updatedTokens);
        localStorage.setItem('b20_tokens', JSON.stringify(updatedTokens));
        
        // Update selectedToken state
        const found = updatedTokens.find(t => t.address.toLowerCase() === selectedToken.address.toLowerCase());
        if (found) {
          setSelectedToken(found);
        }
      }
    }
  }, [details]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getExplorerUrl = (addressOrTx: string, type: 'address' | 'tx' = 'address') => {
    const baseUri = 'https://basescan.org';
    return `${baseUri}/${type}/${addressOrTx}`;
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear your local transaction log history?')) {
      localStorage.removeItem('b20_tx_logs');
      setTxLogs([]);
    }
  };

  const activeTokens = tokens.filter(t => t.network === 'mainnet' || t.network === 'base');

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isConnected ? (
          /* WALLET NOT CONNECTED STATE */
          <div className="text-center py-20 bg-white border border-slate-200/80 rounded-2xl p-8 max-w-xl mx-auto shadow-sm space-y-6 animate-fadeIn">
            <div className="size-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Coins className="size-8" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">B20 Asset Dashboard</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              Connect your Web3 wallet to manage deployed B20 tokens, mint new supply, update pause gates, or modify security registry parameters.
            </p>
            <div className="pt-2" />
          </div>
        ) : (
          /* DASHBOARD INTERFACE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT PANE - Token List & Import (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Asset List */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                    <Layers className="size-4 text-blue-600" />
                    My B20 Tokens
                  </h3>
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-500 uppercase tracking-wider">
                    Mainnet
                  </span>
                </div>

                {activeTokens.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 space-y-3">
                    <p className="text-xs font-semibold">No tokens registered on this network.</p>
                    <Link
                      href="/#launchpad"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-bold"
                    >
                      Deploy B20 Token <ChevronRight className="size-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {activeTokens.map((t) => {
                      const isSelected = selectedToken?.address.toLowerCase() === t.address.toLowerCase();
                      const isStable = t.variant === B20Variant.STABLECOIN;
                      
                      return (
                        <div
                          key={t.address}
                          onClick={() => setSelectedToken(t)}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition text-left ${
                            isSelected
                              ? 'bg-blue-50/50 border-blue-500/50 shadow-sm'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`size-10 rounded-full flex items-center justify-center shrink-0 border ${
                            isSelected ? 'bg-white border-blue-100' : 'bg-slate-50 border-slate-100'
                          }`}>
                            {t.logoUrl ? (
                              <img src={t.logoUrl} alt="Logo" className="size-full rounded-full object-cover" />
                            ) : isStable ? (
                              <Coins className="size-5 text-blue-600" />
                            ) : t.name.toLowerCase().includes('security') ? (
                              <Building2 className="size-5 text-indigo-600" />
                            ) : (
                              <Sparkles className="size-5 text-amber-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate leading-snug">{t.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.symbol}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 font-bold text-slate-500 uppercase tracking-wide">
                                {isStable ? 'Stable' : 'Asset'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Import Token Form */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Import Existing B20</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Enter a deterministic address deployed on Base Mainnet.</p>
                </div>

                <form onSubmit={handleImportToken} className="space-y-3">
                  <div className="relative">
                    <Search className="size-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="0xB20..."
                      value={importAddress}
                      onChange={(e) => setImportAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl pl-9 pr-4 py-2.5 text-xs transition outline-none font-mono"
                    />
                  </div>
                  {importError && (
                    <div className="text-xs bg-rose-50 border border-rose-200 text-rose-600 rounded-xl p-3 flex justify-between items-center w-full">
                      <span>{importError}</span>
                      <button type="button" onClick={() => setImportError(null)} className="text-[10px] text-rose-500 font-bold hover:text-rose-700">Clear</button>
                    </div>
                  )}
                  {importSuccess && (
                    <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl p-3 flex justify-between items-center w-full">
                      <span>{importSuccess}</span>
                      <button type="button" onClick={() => setImportSuccess(null)} className="text-[10px] text-emerald-500 font-bold hover:text-emerald-700">Clear</button>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={isImporting || !importAddress}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-slate-200"
                  >
                    {isImporting ? <RefreshCw className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                    Register Token Address
                  </button>
                </form>
              </div>

              {/* Transaction Logs */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Clock className="size-4 text-slate-500" />
                    Transaction Logs
                  </h4>
                  {txLogs.length > 0 && (
                    <button 
                      onClick={clearHistory}
                      className="text-slate-400 hover:text-rose-500 p-1"
                      title="Clear logs"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>

                {txLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No recent local transactions logged.</p>
                ) : (
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {txLogs.map((log, idx) => {
                      const logExplorer = `https://basescan.org/tx/${log.hash}`;
                      
                      return (
                        <div key={idx} className="text-xs border-b border-slate-100 pb-2.5 last:border-0 last:pb-0 flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-700 block leading-tight">{log.action}</span>
                            <span className="text-[10px] text-slate-400 block">
                              {new Date(log.timestamp).toLocaleTimeString()} · Mainnet
                            </span>
                          </div>
                          <a 
                            href={logExplorer}
                            target="_blank" 
                            rel="noreferrer"
                            className="text-blue-500 hover:underline shrink-0 p-1"
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT PANE - Detailed Token Console (8 cols) */}
            <div className="lg:col-span-8">
              {!selectedToken ? (
                /* NO TOKEN SELECTED SCREEN */
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-sm space-y-4 min-h-[400px] flex flex-col items-center justify-center animate-fadeIn">
                  <Coins className="size-12 text-slate-300" />
                  <h3 className="text-lg font-bold text-slate-700">No Asset Selected</h3>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    Select a token from the left panel to review its supply statistics, control feature pauses, or assign access role privileges.
                  </p>
                </div>
              ) : (
                /* DETAILED CONSOLE */
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Token Details Info Header Card */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                      <div className="flex items-center gap-4">
                        <div className="size-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                          {selectedToken.logoUrl ? (
                            <img src={selectedToken.logoUrl} alt="Logo" className="size-full rounded-full object-cover shadow-inner" />
                          ) : selectedToken.variant === B20Variant.STABLECOIN ? (
                            <Coins className="size-7 text-blue-600" />
                          ) : selectedToken.name.toLowerCase().includes('security') ? (
                            <Building2 className="size-7 text-indigo-600" />
                          ) : (
                            <Sparkles className="size-7 text-amber-500" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{selectedToken.name}</h2>
                            <button
                              onClick={() => copyToClipboard(selectedToken.address)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                              title="Copy contract address"
                            >
                              {isCopied ? <span className="text-[9px] text-emerald-500 font-bold">Copied!</span> : <Copy className="size-3.5" />}
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs font-mono text-slate-500 break-all">{selectedToken.address}</code>
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border bg-emerald-50 text-emerald-600 border-emerald-200">
                          Base Mainnet
                        </span>
                        
                        <a
                          href={getExplorerUrl(selectedToken.address)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                        >
                          Basescan <ExternalLink className="size-3" />
                        </a>
                      </div>
                    </div>

                    {isDetailsLoading ? (
                      <div className="py-8 flex items-center justify-center gap-2 text-slate-500 text-sm font-semibold">
                        <RefreshCw className="size-4 animate-spin text-blue-500" />
                        <span>Syncing parameters with Base node client...</span>
                      </div>
                    ) : (
                      /* Live parameter stats grid */
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Circulating Supply</span>
                          <span className="text-base font-black text-slate-800">
                            {details 
                              ? (() => {
                                  try {
                                    const formatted = formatUnits(BigInt(details.totalSupply), details.decimals);
                                    return parseFloat(formatted).toLocaleString(undefined, { maximumFractionDigits: 6 });
                                  } catch (e) {
                                    return '0';
                                  }
                                })()
                              : (() => {
                                  const parsed = parseFloat(selectedToken.totalSupply);
                                  return isNaN(parsed) ? selectedToken.totalSupply : parsed.toLocaleString(undefined, { maximumFractionDigits: 6 });
                                })()
                            }
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">{selectedToken.symbol}</span>
                        </div>

                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supply Cap</span>
                          <span className="text-base font-black text-slate-800">
                            {details 
                              ? (() => {
                                  const maxUint128 = '340282366920938463463374607431768211455';
                                  const maxUint256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
                                  const isCapUnlimited = (
                                    details.supplyCap === '0' || 
                                    details.supplyCap === maxUint128 || 
                                    details.supplyCap === maxUint256 ||
                                    details.supplyCap === 'Unlimited'
                                  );
                                  if (isCapUnlimited) return 'Unlimited';
                                  try {
                                    const formatted = formatUnits(BigInt(details.supplyCap), details.decimals);
                                    return parseFloat(formatted).toLocaleString(undefined, { maximumFractionDigits: 6 });
                                  } catch (e) {
                                    return 'Unlimited';
                                  }
                                })()
                              : (() => {
                                  if (selectedToken.supplyCap === 'Unlimited') return 'Unlimited';
                                  const parsed = parseFloat(selectedToken.supplyCap);
                                  return isNaN(parsed) ? selectedToken.supplyCap : parsed.toLocaleString(undefined, { maximumFractionDigits: 6 });
                                })()
                            }
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">{selectedToken.symbol}</span>
                        </div>

                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Decimals</span>
                          <span className="text-base font-black text-slate-800">{details?.decimals ?? selectedToken.decimals}</span>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Precision</span>
                        </div>

                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Token Type</span>
                          <span className="text-base font-black text-slate-800">
                            {details?.currency !== undefined ? 'STABLECOIN' : 'ASSET'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase truncate block">
                            {details?.currency ? `Pegged: ${details.currency}` : details?.multiplier ? `Mult: ${details.multiplier}` : 'Base Native'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Token Management Operations Panel */}
                  <DashboardForms
                    tokenAddress={selectedToken.address as `0x${string}`}
                    decimals={details?.decimals ?? selectedToken.decimals}
                    isAsset={selectedToken.variant === B20Variant.ASSET}
                    userRoles={details?.user ?? null}
                    pausedState={details?.isPaused ?? { transfer: false, mint: false, burn: false }}
                    refetchDetails={refetchDetails}
                  />

                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

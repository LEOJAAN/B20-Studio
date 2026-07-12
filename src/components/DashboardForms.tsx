'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useChainId, useWaitForTransactionReceipt } from 'wagmi';
import { base } from 'wagmi/chains';
import { parseUnits, formatUnits, isAddress } from 'viem';
import { 
  ShieldAlert, Loader2, Plus, Flame, Pause, Play, 
  UserPlus, UserMinus, ShieldAlert as AlertIcon, Info, CheckCircle2, Copy 
} from 'lucide-react';
import { useB20TokenActions } from '../hooks/useB20';
import { 
  DEFAULT_ADMIN_ROLE, MINT_ROLE, BURN_ROLE, 
  PAUSE_ROLE, UNPAUSE_ROLE, METADATA_ROLE, OPERATOR_ROLE 
} from '../lib/b20Abi';
import { NetworkType } from '../types';

interface DashboardFormsProps {
  tokenAddress: `0x${string}`;
  decimals: number;
  isAsset: boolean;
  userRoles: {
    isAdmin: boolean;
    isMinter: boolean;
    isBurner: boolean;
    isPauser: boolean;
    isUnpauser: boolean;
    isMetadataAdmin: boolean;
  } | null;
  pausedState: {
    transfer: boolean;
    mint: boolean;
    burn: boolean;
  };
  refetchDetails: () => void;
}

export default function DashboardForms({
  tokenAddress,
  decimals,
  isAsset,
  userRoles,
  pausedState,
  refetchDetails
}: DashboardFormsProps) {
  const { isConnected, address: userAddress } = useAccount();
  const chainId = useChainId();
  const isMainnet = chainId === base.id;
  const network: NetworkType = 'base';

  // Token Actions Hook
  const {
    mint, burn, pauseFeatures, unpauseFeatures,
    grantRole, revokeRole, renounceLastAdmin, updateSupplyCap,
    isPending: isTxPending, error: txError, txHash
  } = useB20TokenActions(tokenAddress);

  // WaitForTransactionReceipt to trigger refetch
  const { data: receipt, isLoading: isTxWaiting, error: receiptError } = useWaitForTransactionReceipt({
    hash: txHash
  });

  const isTxSuccess = receipt?.status === 'success';
  const isTxFailed = (!!txHash && receipt?.status === 'reverted') || !!receiptError;

  // Action forms state
  const [mintAmount, setMintAmount] = useState('');
  const [mintRecipient, setMintRecipient] = useState('');
  
  const [burnAmount, setBurnAmount] = useState('');
  
  const [roleInput, setRoleInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'minter' | 'burner' | 'pauser' | 'unpauser' | 'metadata' | 'operator'>('minter');
  
  const [supplyCapInput, setSupplyCapInput] = useState('');

  const [activeTab, setActiveTab] = useState<'mint' | 'burn' | 'pause' | 'roles' | 'config'>('mint');
  const [copiedRole, setCopiedRole] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Clear validation error when changing tabs
  useEffect(() => {
    setValidationError(null);
  }, [activeTab]);

  // Trigger refetch once a transaction completes successfully
  useEffect(() => {
    if (isTxSuccess) {
      refetchDetails();
      
      // Log transaction to local storage history
      const actionName = 
        activeTab === 'mint' ? 'Mint Supply' :
        activeTab === 'burn' ? 'Burn Tokens' :
        activeTab === 'pause' ? 'Update Pause Status' :
        activeTab === 'roles' ? 'Modify Role Holder' : 'Configure Parameters';

      const txLog = {
        hash: txHash,
        action: actionName,
        network,
        timestamp: Date.now(),
        tokenAddress
      };
      
      const existingLogs = localStorage.getItem('b20_tx_logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.unshift(txLog);
      localStorage.setItem('b20_tx_logs', JSON.stringify(logs));

      // Clear input fields
      setMintAmount('');
      setMintRecipient('');
      setBurnAmount('');
      setRoleInput('');
      setSupplyCapInput('');
    }
  }, [isTxSuccess]);

  // Role hash mapper
  const getRoleHash = (roleType: string) => {
    switch (roleType) {
      case 'admin': return DEFAULT_ADMIN_ROLE;
      case 'minter': return MINT_ROLE;
      case 'burner': return BURN_ROLE;
      case 'pauser': return PAUSE_ROLE;
      case 'unpauser': return UNPAUSE_ROLE;
      case 'metadata': return METADATA_ROLE;
      case 'operator': return OPERATOR_ROLE;
      default: return DEFAULT_ADMIN_ROLE;
    }
  };

  const copyRoleHash = (roleHash: string, roleName: string) => {
    navigator.clipboard.writeText(roleHash);
    setCopiedRole(roleName);
    setTimeout(() => setCopiedRole(null), 2000);
  };

  // Submit Handlers
  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!mintAmount || !mintRecipient) return;
    if (!isAddress(mintRecipient)) {
      setValidationError('Invalid recipient address.');
      return;
    }
    
    if (isMainnet) {
      const confirm = window.confirm('WARNING: You are on Base Mainnet. Minting will issue real tokens. Proceed?');
      if (!confirm) return;
    }

    try {
      const rawAmount = parseUnits(mintAmount, decimals);
      await mint(mintRecipient, rawAmount);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!burnAmount) return;

    if (isMainnet) {
      const confirm = window.confirm('WARNING: You are on Base Mainnet. Burning is permanent and destroys real tokens. Proceed?');
      if (!confirm) return;
    }

    try {
      const rawAmount = parseUnits(burnAmount, decimals);
      await burn(rawAmount);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePauseToggle = async (feature: number, currentStatus: boolean) => {
    if (isMainnet) {
      const confirm = window.confirm(`WARNING: You are on Base Mainnet. This will ${currentStatus ? 'unpause' : 'pause'} B20 token transfers/actions. Proceed?`);
      if (!confirm) return;
    }

    try {
      if (currentStatus) {
        // Unpause
        await unpauseFeatures([feature]);
      } else {
        // Pause
        await pauseFeatures([feature]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRoleAction = async (action: 'grant' | 'revoke') => {
    setValidationError(null);
    if (!roleInput) return;
    if (!isAddress(roleInput)) {
      setValidationError('Invalid account address.');
      return;
    }

    if (isMainnet) {
      const confirm = window.confirm(`WARNING: You are on Base Mainnet. This will alter role holdings for the token. Proceed?`);
      if (!confirm) return;
    }

    const roleHash = getRoleHash(selectedRole);
    try {
      if (action === 'grant') {
        await grantRole(roleHash, roleInput);
      } else {
        await revokeRole(roleHash, roleInput);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenounceAdmin = async () => {
    const confirmText1 = "Are you absolutely sure you want to renounce admin? This is irreversible.";
    const confirmText2 = "This will transition the B20 token to an admin-less state. Any DEFAULT_ADMIN_ROLE permissions will be lost forever. Type 'RENOUNCE' to confirm.";
    
    if (window.confirm(confirmText1)) {
      const typed = window.prompt(confirmText2);
      if (typed === 'RENOUNCE') {
        try {
          await renounceLastAdmin();
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  const handleUpdateSupplyCap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplyCapInput) return;

    if (isMainnet) {
      const confirm = window.confirm('WARNING: You are on Base Mainnet. This will alter the token supply ceiling. Proceed?');
      if (!confirm) return;
    }

    try {
      const rawCap = parseUnits(supplyCapInput, decimals);
      await updateSupplyCap(rawCap);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200/80 bg-slate-50/50">
        {[
          { id: 'mint', label: 'Mint', icon: Plus },
          { id: 'burn', label: 'Burn', icon: Flame },
          { id: 'pause', label: 'Pause Controls', icon: Pause },
          { id: 'roles', label: 'Role Manager', icon: UserPlus },
          { id: 'config', label: 'Settings', icon: AlertIcon }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 px-4 font-bold text-xs md:text-sm border-b-2 flex items-center justify-center gap-1.5 transition ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="size-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main warning status bar for transaction states */}
      {(isTxPending || isTxWaiting) && (
        <div className="bg-blue-50 border-b border-blue-100 text-blue-700 py-2.5 px-4 text-xs font-semibold flex items-center gap-2">
          <Loader2 className="size-3.5 animate-spin" />
          <span>{isTxPending ? 'Awaiting wallet confirmation...' : 'Confirming onchain...'}</span>
          {txHash && (
            <a 
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank" 
            rel="noreferrer" 
            className="ml-auto underline hover:text-blue-900"
          >
            View Tx
          </a>
          )}
        </div>
      )}

      {validationError && (
        <div className="bg-rose-50 border-b border-rose-100 text-rose-600 py-3 px-4 text-xs flex justify-between items-center">
          <div>
            <strong>Validation Error:</strong> {validationError}
          </div>
          <button onClick={() => setValidationError(null)} className="text-[10px] text-rose-500 font-bold hover:text-rose-700">Clear</button>
        </div>
      )}

      {txError && (
        <div className="bg-rose-50 border-b border-rose-100 text-rose-600 py-3 px-4 text-xs">
          <strong>Transaction Error:</strong> {txError.message.substring(0, 100)}...
        </div>
      )}

      {isTxSuccess && (
        <div className="bg-emerald-50 border-b border-emerald-100 text-emerald-700 py-2.5 px-4 text-xs font-semibold flex items-center gap-1.5">
          <CheckCircle2 className="size-4 text-emerald-500" />
          <span>Transaction succeeded onchain!</span>
        </div>
      )}

      {isTxFailed && (
        <div className="bg-rose-50 border-b border-rose-100 text-rose-600 py-2.5 px-4 text-xs font-semibold flex items-center gap-1.5">
          <ShieldAlert className="size-4 text-rose-500" />
          <span>Transaction reverted or failed onchain. No changes were made.</span>
        </div>
      )}

      {/* Mainnet Active Info Box */}
      {isMainnet && (
        <div className="m-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3.5 text-xs flex gap-2">
          <Info className="size-4 shrink-0 mt-0.5" />
          <div>
            <strong>Mainnet Warnings:</strong> The actions below call precompiles directly on Base Mainnet. Always check the addresses and balances before signing!
          </div>
        </div>
      )}

      <div className="p-6">
        {/* TAB: MINT */}
        {activeTab === 'mint' && (
          <form onSubmit={handleMint} className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Mint New Supply</h4>
              <p className="text-xs text-slate-500 mt-1">Issue new tokens directly to a recipient address. Gated by MINT_ROLE.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Mint Amount</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  disabled={!userRoles?.isMinter}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Recipient Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={mintRecipient}
                  onChange={(e) => setMintRecipient(e.target.value)}
                  disabled={!userRoles?.isMinter}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition outline-none disabled:opacity-50 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!userRoles?.isMinter || isTxPending || isTxWaiting || !mintAmount || !mintRecipient}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs sm:text-sm transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/10 flex items-center gap-1.5"
            >
              <Plus className="size-4" />
              {userRoles?.isMinter ? 'Mint Tokens' : 'MINT_ROLE Required'}
            </button>
          </form>
        )}

        {/* TAB: BURN */}
        {activeTab === 'burn' && (
          <form onSubmit={handleBurn} className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Burn Supply</h4>
              <p className="text-xs text-slate-500 mt-1">Permanently destroy B20 tokens from your current wallet balance. Gated by BURN_ROLE.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Amount to Burn</label>
              <input
                type="number"
                placeholder="e.g. 1000"
                value={burnAmount}
                onChange={(e) => setBurnAmount(e.target.value)}
                disabled={!userRoles?.isBurner}
                className="w-full sm:max-w-md bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition outline-none disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={!userRoles?.isBurner || isTxPending || isTxWaiting || !burnAmount}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs sm:text-sm transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-rose-500/10 flex items-center gap-1.5"
            >
              <Flame className="size-4" />
              {userRoles?.isBurner ? 'Burn Tokens' : 'BURN_ROLE Required'}
            </button>
          </form>
        )}

        {/* TAB: PAUSE CONTROLS */}
        {activeTab === 'pause' && (
          <div className="space-y-5">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Granular Pause Controls</h4>
              <p className="text-xs text-slate-500 mt-1">B20 allows pausing individual feature sets (Transfer, Mint, Burn). Gated by PAUSE_ROLE & UNPAUSE_ROLE.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Feature 0: TRANSFER */}
              <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between bg-slate-50/20">
                <div>
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-500 block">Transfer Status</span>
                  <span className={`text-sm font-black ${pausedState.transfer ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {pausedState.transfer ? 'Paused' : 'Active'}
                  </span>
                </div>
                <button
                  onClick={() => handlePauseToggle(0, pausedState.transfer)}
                  disabled={pausedState.transfer ? !userRoles?.isUnpauser : !userRoles?.isPauser || isTxPending || isTxWaiting}
                  className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${
                    pausedState.transfer
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50'
                      : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 disabled:opacity-50'
                  }`}
                >
                  {pausedState.transfer ? <Play className="size-4" /> : <Pause className="size-4" />}
                  {pausedState.transfer ? 'Resume' : 'Halt'}
                </button>
              </div>

              {/* Feature 1: MINT */}
              <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between bg-slate-50/20">
                <div>
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-500 block">Minting Status</span>
                  <span className={`text-sm font-black ${pausedState.mint ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {pausedState.mint ? 'Paused' : 'Active'}
                  </span>
                </div>
                <button
                  onClick={() => handlePauseToggle(1, pausedState.mint)}
                  disabled={pausedState.mint ? !userRoles?.isUnpauser : !userRoles?.isPauser || isTxPending || isTxWaiting}
                  className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${
                    pausedState.mint
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                      : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                  }`}
                >
                  {pausedState.mint ? <Play className="size-4" /> : <Pause className="size-4" />}
                  {pausedState.mint ? 'Resume' : 'Halt'}
                </button>
              </div>

              {/* Feature 2: BURN */}
              <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between bg-slate-50/20">
                <div>
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-500 block">Burning Status</span>
                  <span className={`text-sm font-black ${pausedState.burn ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {pausedState.burn ? 'Paused' : 'Active'}
                  </span>
                </div>
                <button
                  onClick={() => handlePauseToggle(2, pausedState.burn)}
                  disabled={pausedState.burn ? !userRoles?.isUnpauser : !userRoles?.isPauser || isTxPending || isTxWaiting}
                  className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${
                    pausedState.burn
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                      : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                  }`}
                >
                  {pausedState.burn ? <Play className="size-4" /> : <Pause className="size-4" />}
                  {pausedState.burn ? 'Resume' : 'Halt'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ROLE MANAGER */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Role Manager</h4>
              <p className="text-xs text-slate-500 mt-1">Grant or Revoke token access rights to accounts. Gated by DEFAULT_ADMIN_ROLE.</p>
            </div>

            {/* Role hashes reference */}
            <details className="text-xs bg-slate-50 border border-slate-200/50 rounded-xl p-3">
              <summary className="font-bold text-slate-600 cursor-pointer select-none">View Role Hashes (keccak256)</summary>
              <div className="mt-2 space-y-2 font-mono text-[10px] break-all border-t border-slate-200/50 pt-2">
                {[
                  { name: 'DEFAULT_ADMIN_ROLE', hash: DEFAULT_ADMIN_ROLE },
                  { name: 'MINT_ROLE', hash: MINT_ROLE },
                  { name: 'BURN_ROLE', hash: BURN_ROLE },
                  { name: 'PAUSE_ROLE', hash: PAUSE_ROLE },
                  { name: 'UNPAUSE_ROLE', hash: UNPAUSE_ROLE },
                  { name: 'METADATA_ROLE', hash: METADATA_ROLE },
                  ...(isAsset ? [{ name: 'OPERATOR_ROLE', hash: OPERATOR_ROLE }] : [])
                ].map(r => (
                  <div key={r.name} className="flex items-center justify-between gap-2 py-0.5 border-b border-slate-100 last:border-0">
                    <span><strong>{r.name}:</strong> {r.hash.substring(0, 16)}...</span>
                    <button 
                      onClick={() => copyRoleHash(r.hash, r.name)}
                      className="text-blue-500 hover:underline shrink-0"
                    >
                      {copiedRole === r.name ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                ))}
              </div>
            </details>

            {/* Grant / Revoke form */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Target Account Address</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    disabled={!userRoles?.isAdmin}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition outline-none disabled:opacity-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Select Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as any)}
                    disabled={!userRoles?.isAdmin}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition outline-none disabled:opacity-50"
                  >
                    <option value="admin">DEFAULT_ADMIN_ROLE (Admin)</option>
                    <option value="minter">MINT_ROLE (Minter)</option>
                    <option value="burner">BURN_ROLE (Burner)</option>
                    <option value="pauser">PAUSE_ROLE (Pauser)</option>
                    <option value="unpauser">UNPAUSE_ROLE (Unpauser)</option>
                    <option value="metadata">METADATA_ROLE (Metadata Manager)</option>
                    {isAsset && <option value="operator">OPERATOR_ROLE (Operator)</option>}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleRoleAction('grant')}
                  disabled={!userRoles?.isAdmin || isTxPending || isTxWaiting || !roleInput}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs sm:text-sm transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                >
                  <UserPlus className="size-4" /> Grant Role
                </button>
                <button
                  onClick={() => handleRoleAction('revoke')}
                  disabled={!userRoles?.isAdmin || isTxPending || isTxWaiting || !roleInput}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold py-2.5 px-6 rounded-xl text-xs sm:text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <UserMinus className="size-4" /> Revoke Role
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: SETTINGS & RENOUNCE */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Advanced Config & Safety</h4>
              <p className="text-xs text-slate-500 mt-1">Configure supply ceilings or permanently transition to a zero-admin model.</p>
            </div>

            {/* Update Supply Cap Form */}
            <form onSubmit={handleUpdateSupplyCap} className="space-y-3 pb-6 border-b border-slate-200/50">
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Update Supply Cap</h5>
                <p className="text-[11px] text-slate-500">Lower or raise the maximum token supply. Gated by DEFAULT_ADMIN_ROLE.</p>
              </div>
              
              <div className="flex gap-3 max-w-md">
                <input
                  type="number"
                  placeholder="e.g. 2000000000"
                  value={supplyCapInput}
                  onChange={(e) => setSupplyCapInput(e.target.value)}
                  disabled={!userRoles?.isAdmin}
                  className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!userRoles?.isAdmin || isTxPending || isTxWaiting || !supplyCapInput}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition disabled:opacity-50"
                >
                  Update Cap
                </button>
              </div>
            </form>

            {/* Admin Renunciation Warning */}
            <div className="space-y-4">
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-rose-500">Renounce Last Admin</h5>
                <p className="text-[11px] text-slate-500">Permanently transition this token to an admin-less structure. This is completely irreversible.</p>
              </div>

              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs space-y-3">
                <div className="flex gap-2 font-bold text-rose-700">
                  <AlertIcon className="size-4 shrink-0" />
                  <span>CRITICAL WARNING</span>
                </div>
                <p>
                  Renouncing the last admin removes the ability to grant or revoke roles, change supply caps, or update transfer policies forever. Existing roles (Minter, Burner, Pauser) will continue to function on their own, but no new role holders can ever be added.
                </p>
                <button
                  type="button"
                  onClick={handleRenounceAdmin}
                  disabled={!userRoles?.isAdmin || isTxPending || isTxWaiting}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition disabled:opacity-50"
                >
                  {userRoles?.isAdmin ? 'Renounce Last Admin' : 'Admin Role Required'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

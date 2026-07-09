'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useChainId, useWaitForTransactionReceipt, useReadContract, useSimulateContract, useWriteContract, usePublicClient, useBalance } from 'wagmi';
import { base } from 'wagmi/chains';
import { parseUnits, keccak256, toHex, zeroAddress, parseEventLogs, isAddress, encodeFunctionData } from 'viem';
import { 
  Coins, Building2, ShieldAlert, Globe, X as TwitterIcon, Send, 
  FileText, CheckCircle2, Loader2, ChevronRight, ChevronLeft, 
  FileCode, ShieldCheck, Upload, Sparkles, Copy, ExternalLink, RefreshCw 
} from 'lucide-react';
import { 
  encodeAssetParams, encodeStablecoinParams, 
  encodeGrantRole, encodeMint, encodeUpdateSupplyCap 
} from '../lib/b20Encoder';
import { B20_FACTORY_ADDRESS, B20_FACTORY_ABI, MINT_ROLE, BURN_ROLE, PAUSE_ROLE, UNPAUSE_ROLE, METADATA_ROLE } from '../lib/b20Abi';
import { B20Variant, NetworkType, TokenMetadata } from '../types';

export default function LaunchWizard() {
  const { isConnected, address: userAddress } = useAccount();
  const chainId = useChainId();
  const currentNetwork: NetworkType = 'mainnet';

  // State
  const [step, setStep] = useState(1);
  const [tokenType, setTokenType] = useState<'meme' | 'stable' | 'security'>('meme');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [dragging, setDragging] = useState(false);
  
  // Form Fields
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [initialSupply, setInitialSupply] = useState('1000000000');
  const [decimals, setDecimals] = useState(18); // Default 18 for meme/security
  
  // Meme Specific
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [telegram, setTelegram] = useState('');
  
  // Stablecoin Specific
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [stableIssuer, setStableIssuer] = useState('');
  
  // Security Specific
  const [securityIssuer, setSecurityIssuer] = useState('');
  const [supplyCap, setSupplyCap] = useState('1000000000');
  const [complianceNotes, setComplianceNotes] = useState('');

  // Deploy Transaction states
  const [salt, setSalt] = useState<`0x${string}`>(() => keccak256(toHex(Math.random().toString() + Date.now().toString())));
  const [deployTxHash, setDeployTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [savedDeployedAddress, setSavedDeployedAddress] = useState<`0x${string}` | undefined>(undefined);
  const [isCopied, setIsCopied] = useState(false);
  const [acknowledgedMainnet, setAcknowledgedMainnet] = useState(false);

  // Pre-calculate/Encode parameters for preview
  const [encodedParams, setEncodedParams] = useState<`0x${string}`>('0x');
  const [encodedInitCalls, setEncodedInitCalls] = useState<`0x${string}`[]>([]);

  // Hook calls
  const publicClient = usePublicClient();
  const [simulatedDeployedAddress, setSimulatedDeployedAddress] = useState<`0x${string}` | undefined>(undefined);
  const [manualImportAddress, setManualImportAddress] = useState('');

  const { data: simulateResult, error: simulateError } = useSimulateContract({
    address: B20_FACTORY_ADDRESS,
    abi: B20_FACTORY_ABI,
    functionName: 'createB20',
    args: [
      tokenType === 'stable' ? B20Variant.STABLECOIN : B20Variant.ASSET,
      salt,
      encodedParams,
      encodedInitCalls
    ],
    query: {
      enabled: isConnected && !!userAddress && !!salt && salt !== '0x' && encodedParams !== '0x'
    }
  });

  const { writeContractAsync, error: deployError, isPending: isDeploying, reset: resetDeploy } = useWriteContract();

  // Custom status and error states
  const [localDeployError, setLocalDeployError] = useState<any | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [rpcStatus, setRpcStatus] = useState<'Healthy' | 'Unavailable' | 'Pending'>('Pending');
  const [factoryStatus, setFactoryStatus] = useState<'Reachable' | 'Unavailable' | 'Pending'>('Pending');

  const { data: balanceData } = useBalance({ address: userAddress });

  const isB20Enabled = process.env.NEXT_PUBLIC_B20_ENABLED === 'true';
  const isWalletConnected = isConnected;
  const isBaseMainnet = chainId === base.id;
  const isEthBalanceAvailable = !!balanceData && balanceData.value > 0n;
  const isParamsValid = !!name && !!symbol && (
    tokenType === 'meme' ? (!!initialSupply && parseFloat(initialSupply) >= 0) :
    tokenType === 'stable' ? (!!currencyCode && !!initialSupply && parseFloat(initialSupply) >= 0) :
    tokenType === 'security' ? (!!supplyCap && parseFloat(supplyCap) >= 0 && !!initialSupply && parseFloat(initialSupply) >= 0) : false
  ) && encodedParams !== '0x';
  const isSimulationPassed = !!simulateResult;

  const allOtherItemsValid = isWalletConnected && isBaseMainnet && isEthBalanceAvailable && isParamsValid && isSimulationPassed;
  const canDeploy = isB20Enabled && allOtherItemsValid;

  useEffect(() => {
    let active = true;
    
    const checkStatus = async () => {
      if (!publicClient) {
        if (active) {
          setRpcStatus('Unavailable');
          setFactoryStatus('Unavailable');
        }
        return;
      }

      try {
        // Test RPC health
        await publicClient.getBlockNumber();
        if (active) setRpcStatus('Healthy');

        // Test Factory contract reachability
        try {
          // Calling isB20(address) with zeroAddress is a safe read-only call
          await publicClient.readContract({
            address: B20_FACTORY_ADDRESS,
            abi: B20_FACTORY_ABI,
            functionName: 'isB20',
            args: [zeroAddress]
          });
          if (active) setFactoryStatus('Reachable');
        } catch (contractErr) {
          console.warn('B20 Factory contract is not reachable:', contractErr);
          if (active) setFactoryStatus('Unavailable');
        }
      } catch (rpcErr) {
        console.error('RPC connection test failed:', rpcErr);
        if (active) {
          setRpcStatus('Unavailable');
          setFactoryStatus('Unavailable');
        }
      }
    };

    setRpcStatus('Pending');
    setFactoryStatus('Pending');
    checkStatus();

    // Check again every 10 seconds to keep it updated in real-time
    const interval = setInterval(checkStatus, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [publicClient]);

  // Helper to extract technical error details
  const getErrorDetails = () => {
    const activeErr = localDeployError || deployError;
    if (!activeErr) return { revertSignature: 'None', rawError: 'None', calldata: 'None', txHash: undefined };

    let revertSignature = 'Unknown / None';
    let rawError = activeErr?.message || String(activeErr);
    
    // Parse signature / reason from error object or raw text
    if (activeErr && typeof activeErr.walk === 'function') {
      const walked = activeErr.walk();
      if (walked) {
        if (walked.signature) {
          revertSignature = walked.signature;
        } else if (walked.data) {
          revertSignature = walked.data;
        }
        if (walked.message) {
          rawError = walked.message;
        }
      }
    }

    // Try regex matching in message string as fallback
    if (revertSignature === 'Unknown / None' && activeErr?.message) {
      const reasonMatch = activeErr.message.match(/reverted with reason:\s*(.+)/i) ||
                          activeErr.message.match(/revert:\s*(.+)/i) ||
                          activeErr.message.match(/reverted with the following reason:\s*(.+)/i);
      if (reasonMatch) {
        revertSignature = reasonMatch[1] || reasonMatch[0];
      }
    }

    // Generate/fetch calldata
    let calldata = '0x';
    try {
      calldata = encodeFunctionData({
        abi: B20_FACTORY_ABI,
        functionName: 'createB20',
        args: [
          tokenType === 'stable' ? B20Variant.STABLECOIN : B20Variant.ASSET,
          salt,
          encodedParams,
          encodedInitCalls
        ]
      });
    } catch (err: any) {
      console.error('Failed to encode calldata for display:', err);
      calldata = 'Error encoding calldata: ' + (err?.message || err);
    }

    return {
      revertSignature,
      rawError,
      calldata,
      txHash: deployTxHash
    };
  };

  const errorDetails = getErrorDetails();

  const { 
    data: receipt, 
    isLoading: isWaitingForReceipt, 
    isSuccess: isReceiptSuccess, 
    refetch: refetchReceipt,
    error: receiptError
  } = useWaitForTransactionReceipt({
    hash: deployTxHash
  });

  // Save debug snapshot to localStorage for Developer Debug Panel
  useEffect(() => {
    try {
      const debugSnapshot = {
        salt,
        encodedParams,
        encodedInitCalls,
        simulationResult: simulateResult ? {
          request: simulateResult.request ? 'ready' : 'null',
          result: simulateResult.result
        } : null,
        gasEstimate: simulateResult?.request?.gas ? simulateResult.request.gas.toString() : 'None',
        deployTxHash,
        receiptStatus: receipt?.status,
        decodedLogs: receipt ? parseEventLogs({
          abi: B20_FACTORY_ABI,
          eventName: 'B20Created',
          logs: receipt.logs
        }).map(l => ({
          eventName: l.eventName,
          args: {
            token: l.args.token,
            name: l.args.name,
            symbol: l.args.symbol,
            decimals: l.args.decimals
          }
        })) : null,
        currentStep: step,
        recentErrors: localDeployError?.message || deployError?.message || simulateError?.message || null,
        rawRevertData: localDeployError ? String(localDeployError) : deployError ? String(deployError) : null,
        recentSimulationData: simulateResult ? JSON.stringify(simulateResult.result) : null,
        timestamp: Date.now()
      };
      localStorage.setItem('b20_debug_snapshot', JSON.stringify(debugSnapshot));
    } catch (err) {
      console.warn('Failed to save debug snapshot:', err);
    }
  }, [salt, encodedParams, encodedInitCalls, simulateResult, deployTxHash, receipt, step, localDeployError, deployError, simulateError]);

  useEffect(() => {
    if (!userAddress) return;

    try {
      let paramsHex: `0x${string}` = '0x';
      const initCalls: `0x${string}`[] = [];

      // 1. Setup default roles for the deployer so they can manage the token
      initCalls.push(encodeGrantRole(MINT_ROLE, userAddress));
      initCalls.push(encodeGrantRole(BURN_ROLE, userAddress));
      initCalls.push(encodeGrantRole(PAUSE_ROLE, userAddress));
      initCalls.push(encodeGrantRole(UNPAUSE_ROLE, userAddress));
      initCalls.push(encodeGrantRole(METADATA_ROLE, userAddress));

      if (tokenType === 'meme') {
        paramsHex = encodeAssetParams(name || 'My Meme Coin', symbol || 'MEME', userAddress, decimals);
        // Mint initial supply to deployer
        if (initialSupply && parseFloat(initialSupply) > 0) {
          const rawAmount = parseUnits(initialSupply, decimals);
          initCalls.push(encodeMint(userAddress, rawAmount));
        }
      } else if (tokenType === 'stable') {
        paramsHex = encodeStablecoinParams(name || 'My Stablecoin', symbol || 'MUSD', userAddress, currencyCode || 'USD');
        // Stablecoin decimals is hardcoded to 6
        if (initialSupply && parseFloat(initialSupply) > 0) {
          const rawAmount = parseUnits(initialSupply, 6);
          initCalls.push(encodeMint(userAddress, rawAmount));
        }
      } else if (tokenType === 'security') {
        paramsHex = encodeAssetParams(name || 'My Security Token', symbol || 'SEC', userAddress, decimals);
        // Set Supply Cap
        if (supplyCap && parseFloat(supplyCap) > 0) {
          const rawCap = parseUnits(supplyCap, decimals);
          initCalls.push(encodeUpdateSupplyCap(rawCap));
        }
        // Mint initial supply
        if (initialSupply && parseFloat(initialSupply) > 0) {
          const rawAmount = parseUnits(initialSupply, decimals);
          initCalls.push(encodeMint(userAddress, rawAmount));
        }
      }

      setEncodedParams(paramsHex);
      setEncodedInitCalls(initCalls);
    } catch (e) {
      console.error('Encoding error: ', e);
    }
  }, [name, symbol, initialSupply, decimals, currencyCode, supplyCap, tokenType, userAddress]);

  // Restore pending deployment on load / refresh
  useEffect(() => {
    const pending = localStorage.getItem('b20_pending_deployment');
    if (pending) {
      try {
        const data = JSON.parse(pending);
        // Only restore if the network matches
        if (data.network === currentNetwork) {
          console.log("Restoring pending deployment:", data);
          setSalt(data.salt);
          setTokenType(data.tokenType);
          setName(data.name);
          setSymbol(data.symbol);
          setDecimals(data.decimals);
          setInitialSupply(data.initialSupply);
          setSupplyCap(data.supplyCap);
          setCurrencyCode(data.currencyCode);
          setLogoPreview(data.logoPreview || '');
          setDescription(data.description || '');
          setWebsite(data.website || '');
          setTwitter(data.twitter || '');
          setTelegram(data.telegram || '');
          setComplianceNotes(data.complianceNotes || '');
          setDeployTxHash(data.txHash);
          if (data.predictedTokenAddress) {
            setSimulatedDeployedAddress(data.predictedTokenAddress);
          }
          setStep(4); // Go straight to wait screen
        }
      } catch (err) {
        console.error("Failed to restore pending deployment", err);
      }
    }
  }, [currentNetwork]);

  // Handle Logo Upload File
  const handleLogoFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setLogoPreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLogoFile(e.dataTransfer.files[0]);
    }
  };

  // Submit Deploy transaction
  const handleDeploy = async () => {
    setLocalDeployError(null);
    setShowTechDetails(false);
    setValidationError(null);
    if (chainId === base.id && !acknowledgedMainnet) {
      setValidationError("Please acknowledge that you are deploying on Base Mainnet using real funds.");
      return;
    }

    try {
      let request = simulateResult?.request;
      let tokenAddress = simulateResult?.result;

      // Fallback direct simulation if result is not in hook state
      if (!request || !tokenAddress) {
        console.log("Hook simulation state not ready. Running direct simulation via publicClient...");
        if (!publicClient) {
          throw new Error("RPC publicClient is not available. Please verify network connection.");
        }
        
        const simResult = await publicClient.simulateContract({
          address: B20_FACTORY_ADDRESS,
          abi: B20_FACTORY_ABI,
          functionName: 'createB20',
          args: [
            tokenType === 'stable' ? B20Variant.STABLECOIN : B20Variant.ASSET,
            salt,
            encodedParams,
            encodedInitCalls
          ],
          account: userAddress
        });
        
        request = simResult.request;
        tokenAddress = simResult.result;
      }

      if (!request || !tokenAddress || !isAddress(tokenAddress)) {
        throw new Error("Could not simulate the transaction or resolve the predicted token address.");
      }

      console.log("Deploying contract with predicted token address:", tokenAddress);
      
      const tx = await writeContractAsync(request);
      if (tx) {
        setDeployTxHash(tx);
        setSimulatedDeployedAddress(tokenAddress);
        
        // Save to pending deployment
        const pendingData = {
          txHash: tx,
          salt,
          tokenType,
          name,
          symbol,
          decimals,
          initialSupply,
          supplyCap,
          currencyCode,
          logoPreview,
          description,
          website,
          twitter,
          telegram,
          complianceNotes,
          network: currentNetwork,
          predictedTokenAddress: tokenAddress
        };
        localStorage.setItem('b20_pending_deployment', JSON.stringify(pendingData));
        console.log("Pending deployment saved to localStorage:", pendingData);
        
        setStep(4);
      }
    } catch (e: any) {
      console.error('Deployment simulation/execution failed', e);
      setLocalDeployError(e);
      setStep(4);
    }
  };

  const handleManualImport = () => {
    setValidationError(null);
    if (!manualImportAddress || !isAddress(manualImportAddress)) {
      setValidationError("Please enter a valid contract address.");
      return;
    }

    const addr = manualImportAddress as `0x${string}`;
    const newToken: TokenMetadata = {
      address: addr,
      name: name || (tokenType === 'meme' ? 'My Meme Coin' : tokenType === 'stable' ? 'My Stablecoin' : 'My Security Token'),
      symbol: symbol || (tokenType === 'meme' ? 'MEME' : tokenType === 'stable' ? 'MUSD' : 'SEC'),
      decimals: tokenType === 'stable' ? 6 : decimals,
      variant: tokenType === 'stable' ? B20Variant.STABLECOIN : B20Variant.ASSET,
      network: currentNetwork,
      totalSupply: initialSupply || '0',
      supplyCap: tokenType === 'security' ? (supplyCap || 'Unlimited') : 'Unlimited',
      currency: tokenType === 'stable' ? currencyCode : undefined,
      description: tokenType === 'meme' ? description : undefined,
      website: tokenType === 'meme' ? website : undefined,
      twitter: tokenType === 'meme' ? twitter : undefined,
      telegram: tokenType === 'meme' ? telegram : undefined,
      logoUrl: logoPreview || undefined,
      createdAt: Date.now()
    };

    // Retrieve existing tokens
    const existing = localStorage.getItem('b20_tokens');
    const tokens: TokenMetadata[] = existing ? JSON.parse(existing) : [];
    
    // Prevent duplicates
    if (!tokens.some(t => t.address.toLowerCase() === addr.toLowerCase() && t.network === currentNetwork)) {
      tokens.push(newToken);
      localStorage.setItem('b20_tokens', JSON.stringify(tokens));
      console.log("Token saved manually:", newToken);
    }

    // Add to transaction logs
    const txLog = {
      hash: deployTxHash || '0x0000000000000000000000000000000000000000000000000000000000000000',
      action: 'Deploy B20 Token (Manual Import)',
      network: currentNetwork,
      timestamp: Date.now(),
      tokenAddress: addr,
      tokenSymbol: newToken.symbol
    };
    const existingLogs = localStorage.getItem('b20_tx_logs');
    const logsList = existingLogs ? JSON.parse(existingLogs) : [];
    if (deployTxHash && !logsList.some((l: any) => l.hash.toLowerCase() === deployTxHash.toLowerCase())) {
      logsList.unshift(txLog);
      localStorage.setItem('b20_tx_logs', JSON.stringify(logsList));
    } else if (!deployTxHash) {
      logsList.unshift(txLog);
      localStorage.setItem('b20_tx_logs', JSON.stringify(logsList));
    }

    // Set deployed address for success page UI
    setSavedDeployedAddress(addr);

    // Clear pending deployment
    localStorage.removeItem('b20_pending_deployment');

    // Advance to step 5
    setStep(5);
  };

  // Listen for receipt success
  useEffect(() => {
    if (receipt) {
      console.log("Deployment Receipt retrieved:", receipt);
      console.log("simulated address:", simulatedDeployedAddress);
      console.log("transaction hash:", deployTxHash);
      console.log("receipt status:", receipt.status);
      
      if (receipt.status === 'success') {
        console.log("Transaction was successful!");
        
        // Priority 1: Address from receipt logs/events
        let extractedDeployedAddress: `0x${string}` | undefined;
        try {
          const logs = parseEventLogs({
            abi: B20_FACTORY_ABI,
            eventName: 'B20Created',
            logs: receipt.logs
          });
          console.log("Parsed B20Created event logs:", logs);
          if (logs && logs.length > 0) {
            extractedDeployedAddress = logs[0].args.token;
            console.log("extracted deployed address:", extractedDeployedAddress);
          }
        } catch (err) {
          console.error("Failed to parse event logs", err);
        }

        // Priority 2: Address returned by simulation
        let addr = extractedDeployedAddress;
        if (!addr || !isAddress(addr)) {
          addr = simulatedDeployedAddress;
        }

        // Try getting simulation address from localStorage if state is empty
        if (!addr || !isAddress(addr)) {
          const pending = localStorage.getItem('b20_pending_deployment');
          if (pending) {
            try {
              const data = JSON.parse(pending);
              if (data.predictedTokenAddress && isAddress(data.predictedTokenAddress)) {
                addr = data.predictedTokenAddress;
              }
            } catch (err) {
              console.error("Failed to parse predictedTokenAddress from localStorage", err);
            }
          }
        }

        console.log("saved dashboard address:", addr);

        // Validate predictedTokenAddress with isAddress before saving
        if (addr && isAddress(addr) && deployTxHash) {
          const newToken: TokenMetadata = {
            address: addr,
            name: name || (tokenType === 'meme' ? 'My Meme Coin' : tokenType === 'stable' ? 'My Stablecoin' : 'My Security Token'),
            symbol: symbol || (tokenType === 'meme' ? 'MEME' : tokenType === 'stable' ? 'MUSD' : 'SEC'),
            decimals: tokenType === 'stable' ? 6 : decimals,
            variant: tokenType === 'stable' ? B20Variant.STABLECOIN : B20Variant.ASSET,
            network: currentNetwork,
            totalSupply: initialSupply || '0',
            supplyCap: tokenType === 'security' ? (supplyCap || 'Unlimited') : 'Unlimited',
            currency: tokenType === 'stable' ? currencyCode : undefined,
            description: tokenType === 'meme' ? description : undefined,
            website: tokenType === 'meme' ? website : undefined,
            twitter: tokenType === 'meme' ? twitter : undefined,
            telegram: tokenType === 'meme' ? telegram : undefined,
            logoUrl: logoPreview || undefined,
            createdAt: Date.now()
          };

          // Retrieve existing tokens
          const existing = localStorage.getItem('b20_tokens');
          const tokens: TokenMetadata[] = existing ? JSON.parse(existing) : [];
          
          // Prevent duplicates
          if (!tokens.some(t => t.address.toLowerCase() === addr.toLowerCase() && t.network === currentNetwork)) {
            tokens.push(newToken);
            localStorage.setItem('b20_tokens', JSON.stringify(tokens));
            console.log("Token saved to localStorage b20_tokens:", newToken);
          }

          // Add to transaction logs
          const txLog = {
            hash: deployTxHash,
            action: 'Deploy B20 Token',
            network: currentNetwork,
            timestamp: Date.now(),
            tokenAddress: addr,
            tokenSymbol: newToken.symbol
          };
          const existingLogs = localStorage.getItem('b20_tx_logs');
          const logsList = existingLogs ? JSON.parse(existingLogs) : [];
          if (!logsList.some((l: any) => l.hash.toLowerCase() === deployTxHash.toLowerCase())) {
            logsList.unshift(txLog);
            localStorage.setItem('b20_tx_logs', JSON.stringify(logsList));
            console.log("Transaction log saved to localStorage b20_tx_logs:", txLog);
          }

          // Set deployed address for success page UI
          setSavedDeployedAddress(addr);

          // Clear pending deployment
          localStorage.removeItem('b20_pending_deployment');
          console.log("Pending deployment cleared from localStorage");

          // Advance to step 5
          setStep(5);
        } else {
          console.error("Transaction was successful but deployed address could not be resolved or was invalid.", addr);
        }
      } else if (receipt.status === 'reverted') {
        console.error("Transaction reverted!");
        setLocalDeployError(new Error("The deployment transaction reverted on-chain. Please check your setup parameters and try again."));
      }
    }
  }, [receipt, simulatedDeployedAddress, deployTxHash]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getExplorerUrl = (addressOrTx: string, type: 'address' | 'tx' = 'address') => {
    const baseUri = 'https://basescan.org';
    return `${baseUri}/${type}/${addressOrTx}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      {/* Network Status Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <Globe className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Network Status</h3>
            <p className="text-[11px] text-slate-400">Real-time status of B20 precompile node integration</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider font-semibold">Network</span>
            <span className="block text-xs font-bold text-slate-700 mt-1">
              {chainId === base.id ? 'Base Mainnet' : 'Unknown Network'}
            </span>
          </div>
          
          <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider font-semibold">Factory Contract</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold mt-1 ${
              factoryStatus === 'Reachable' ? 'text-emerald-600' : factoryStatus === 'Pending' ? 'text-amber-600' : 'text-rose-600'
            }`}>
              <span className={`size-1.5 rounded-full ${
                factoryStatus === 'Reachable' ? 'bg-emerald-500 animate-pulse' : factoryStatus === 'Pending' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
              }`} />
              {factoryStatus}
            </span>
          </div>
          
          <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider font-semibold">Wallet</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold mt-1 ${isConnected ? 'text-emerald-600' : 'text-rose-600'}`}>
              <span className={`size-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {isConnected ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          
          <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider font-semibold">RPC Status</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold mt-1 ${
              rpcStatus === 'Healthy' ? 'text-emerald-600' : rpcStatus === 'Pending' ? 'text-amber-600' : 'text-rose-600'
            }`}>
              <span className={`size-1.5 rounded-full ${
                rpcStatus === 'Healthy' ? 'bg-emerald-500 animate-pulse' : rpcStatus === 'Pending' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
              }`} />
              {rpcStatus}
            </span>
          </div>
          
          <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl flex flex-col justify-between">
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider font-semibold">B20 Activation</span>
            <div className="mt-1 flex flex-col gap-1 items-start">
              <span className="text-[10px] text-slate-500 font-semibold">
                {isB20Enabled ? 'B20 Activation' : 'Waiting for Official Activation'}
              </span>
              <span className={`inline-flex items-center text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded select-none mt-0.5 ${
                isB20Enabled 
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                  : 'bg-amber-50 border border-amber-200 text-amber-700 animate-pulse'
              }`}>
                {isB20Enabled ? 'B20 Activation Enabled' : 'Waiting for Base B20 Activation'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="mb-10 max-w-xl mx-auto">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4, 5].map((s) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center">
                <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  step === s 
                    ? 'bg-blue-600 text-white ring-4 ring-blue-500/20' 
                    : step > s 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-200 text-slate-500'
                }`}>
                  {step > s ? <CheckCircle2 className="size-5" /> : s}
                </div>
                <span className="text-[10px] mt-2 font-semibold text-slate-500 hidden sm:block">
                  {s === 1 && 'Token Type'}
                  {s === 2 && 'Information'}
                  {s === 3 && 'Calldata Preview'}
                  {s === 4 && 'Wallet Confirm'}
                  {s === 5 && 'Success'}
                </span>
              </div>
              {s < 5 && (
                <div className={`flex-1 h-0.5 mx-2 transition ${step > s ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* STEP 1: CHOOSE TOKEN TYPE */}
      {step === 1 && (
        <div className="space-y-8 animate-fadeIn">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Create your B20 Token on Base
            </h2>
            <p className="mt-3 text-slate-500">
              Select the variant that fits your asset profile. Native precompiled architecture offers cheaper execution and native roles.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* MEME COIN */}
            <div 
              onClick={() => { setTokenType('meme'); setDecimals(18); setStep(2); }}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-500/50 hover:scale-[1.01] transition-all"
            >
              {/* Premium Visual Image */}
              <div className="h-44 w-full rounded-xl overflow-hidden mb-6 bg-slate-100 relative">
                <img 
                  src="/logos/meme_card.bmp" 
                  alt="Meme Coin Creator Card" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&q=80&w=400';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent flex items-end p-4">
                  <div className="flex items-center gap-2 text-white">
                    <div className="p-1.5 rounded-lg bg-blue-600/90 backdrop-blur-sm">
                      <Sparkles className="size-4 text-amber-300" />
                    </div>
                    <span className="font-bold text-sm">ASSET Variant</span>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Meme Coin Creator</h3>
              <p className="mt-2 text-sm text-slate-500">Fast launch community assets. Customizable branding, description, socials, and 18 decimals by default.</p>
              <ul className="mt-4 space-y-2 text-xs font-semibold text-slate-600">
                <li className="flex items-center gap-2">✓ Fast Launch</li>
                <li className="flex items-center gap-2">✓ Community Tokens</li>
                <li className="flex items-center gap-2">✓ Custom Branding</li>
              </ul>
            </div>

            {/* STABLECOIN */}
            <div 
              onClick={() => { setTokenType('stable'); setDecimals(6); setStep(2); }}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-500/50 hover:scale-[1.01] transition-all"
            >
              <div className="h-44 w-full rounded-xl overflow-hidden mb-6 bg-slate-100 relative">
                <img 
                  src="/logos/stable_card.bmp" 
                  alt="Stablecoin Creator Card" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?auto=format&fit=crop&q=80&w=400';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent flex items-end p-4">
                  <div className="flex items-center gap-2 text-white">
                    <div className="p-1.5 rounded-lg bg-blue-600/90 backdrop-blur-sm">
                      <Coins className="size-4" />
                    </div>
                    <span className="font-bold text-sm">STABLECOIN Variant</span>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Stablecoin Creator</h3>
              <p className="mt-2 text-sm text-slate-500">Fiat-pegged assets. Hardwired 6 decimals, immutable ISO currency code, roles, and compliance gating.</p>
              <ul className="mt-4 space-y-2 text-xs font-semibold text-slate-600">
                <li className="flex items-center gap-2">✓ Fixed Supply Options</li>
                <li className="flex items-center gap-2">✓ 6 Decimal Support</li>
                <li className="flex items-center gap-2">✓ Payment-Ready Assets</li>
              </ul>
            </div>

            {/* SECURITY TOKEN */}
            <div 
              onClick={() => { setTokenType('security'); setDecimals(18); setStep(2); }}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-500/50 hover:scale-[1.01] transition-all"
            >
              <div className="h-44 w-full rounded-xl overflow-hidden mb-6 bg-slate-100 relative">
                <img 
                  src="/logos/security_card.bmp" 
                  alt="Security Token Creator Card" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent flex items-end p-4">
                  <div className="flex items-center gap-2 text-white">
                    <div className="p-1.5 rounded-lg bg-blue-600/90 backdrop-blur-sm">
                      <Building2 className="size-4" />
                    </div>
                    <span className="font-bold text-sm">ASSET Variant</span>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Security Token Creator</h3>
              <p className="mt-2 text-sm text-slate-500">Regulated assets and equities. Fully-gated transfers via PolicyRegistry allowlist, supply caps, freeze-and-seize.</p>
              <ul className="mt-4 space-y-2 text-xs font-semibold text-slate-600">
                <li className="flex items-center gap-2">✓ Supply Caps</li>
                <li className="flex items-center gap-2">✓ Role Controls</li>
                <li className="flex items-center gap-2">✓ Compliance-Ready Architecture</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: FILL INFORMATION & LIVE PREVIEW */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
          {/* Form Content - 7 cols */}
          <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {tokenType === 'meme' && 'Meme Coin Specifications'}
                  {tokenType === 'stable' && 'Stablecoin Specifications'}
                  {tokenType === 'security' && 'Security Token Specifications'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Configure your B20 token properties and initial parameters.</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                {tokenType}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Token Name</label>
                <input
                  type="text"
                  placeholder="e.g. Base Dog"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Symbol</label>
                <input
                  type="text"
                  placeholder="e.g. BDOG"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Initial Supply</label>
                <input
                  type="number"
                  placeholder="e.g. 1000000000"
                  value={initialSupply}
                  onChange={(e) => setInitialSupply(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition outline-none"
                />
              </div>
              {tokenType === 'stable' ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Currency Code (A-Z)</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. USD"
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Decimals (6 - 18)</label>
                  <input
                    type="number"
                    min={6}
                    max={18}
                    value={decimals}
                    onChange={(e) => setDecimals(Math.max(6, Math.min(18, parseInt(e.target.value) || 18)))}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition outline-none"
                  />
                </div>
              )}
            </div>

            {/* Stable / Security specific Issuer names */}
            {tokenType !== 'meme' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Issuer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Coinbase LLC"
                  value={tokenType === 'stable' ? stableIssuer : securityIssuer}
                  onChange={(e) => tokenType === 'stable' ? setStableIssuer(e.target.value) : setSecurityIssuer(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition outline-none"
                />
              </div>
            )}

            {/* Security Cap */}
            {tokenType === 'security' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Supply Cap</label>
                <input
                  type="number"
                  placeholder="e.g. 2000000000"
                  value={supplyCap}
                  onChange={(e) => setSupplyCap(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition outline-none"
                />
              </div>
            )}

            {/* Logo drag & drop upload */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Token Logo</label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                  dragging 
                    ? 'border-blue-500 bg-blue-50/50' 
                    : logoPreview 
                      ? 'border-slate-200 bg-slate-50/20' 
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                }`}
              >
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={(e) => e.target.files && handleLogoFile(e.target.files[0])}
                  className="hidden"
                />
                <label htmlFor="logo-upload" className="cursor-pointer block">
                  {logoPreview ? (
                    <div className="flex items-center justify-center gap-3">
                      <img src={logoPreview} alt="Logo preview" className="size-12 rounded-full object-cover border border-slate-200" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-800">Logo Uploaded</p>
                        <p className="text-[10px] text-slate-500">Click or drag to change image</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="size-6 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">Drag & drop logo, or click to upload</p>
                      <p className="text-[10px] text-slate-400">PNG, JPG or WebP (architected for future IPFS support)</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Meme Socials */}
            {tokenType === 'meme' && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Branding & Socials (Off-chain metadata)</h4>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Describe your meme token purpose and community goals..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition outline-none resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Website</label>
                    <div className="relative">
                      <Globe className="size-4 absolute left-3 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="https://..."
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl pl-9 pr-4 py-2.5 text-sm transition outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Twitter / X</label>
                    <div className="relative">
                      <TwitterIcon className="size-4 absolute left-3 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Username"
                        value={twitter}
                        onChange={(e) => setTwitter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl pl-9 pr-4 py-2.5 text-sm transition outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Telegram</label>
                    <div className="relative">
                      <Send className="size-4 absolute left-3 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="t.me/..."
                        value={telegram}
                        onChange={(e) => setTelegram(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl pl-9 pr-4 py-2.5 text-sm transition outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Compliance Notes */}
            {tokenType === 'security' && (
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Compliance Notes</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Reg D 506(c) offering. Gated transfers restricted to verified accredited investors only."
                  value={complianceNotes}
                  onChange={(e) => setComplianceNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm transition outline-none resize-none"
                />
              </div>
            )}

            {validationError && (
              <div className="text-xs bg-rose-50 border border-rose-200 text-rose-600 rounded-xl p-3 flex justify-between items-center w-full">
                <span>{validationError}</span>
                <button type="button" onClick={() => setValidationError(null)} className="text-[10px] text-rose-500 font-bold hover:text-rose-700">Clear</button>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => { setValidationError(null); setStep(1); }}
                className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm font-semibold py-2 px-4 rounded-xl transition"
              >
                <ChevronLeft className="size-4" /> Back
              </button>
              <button
                onClick={() => {
                  setValidationError(null);
                  if (!name || !symbol) {
                    setValidationError('Please fill in Name and Symbol.');
                    return;
                  }
                  setStep(3);
                }}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 px-6 rounded-xl transition shadow-md shadow-blue-500/10"
              >
                Continue <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {/* Live Preview Card - 5 cols */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-100 rounded-2xl p-6 border border-slate-200/50 flex flex-col justify-between min-h-[300px]">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Live Token Card Preview</h4>
                <div className="glass-card border border-white/60 rounded-2xl p-6 shadow-xl relative overflow-hidden bg-gradient-to-br from-white/95 to-slate-50/70">
                  {/* Subtle decorative background gradient */}
                  <div className="absolute -right-8 -bottom-8 size-32 rounded-full bg-blue-500/5 blur-2xl" />
                  <div className="absolute -left-8 -top-8 size-32 rounded-full bg-indigo-500/5 blur-2xl" />
                  
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="size-14 rounded-full object-cover border border-slate-200/60 shadow-inner" />
                      ) : (
                        <div className="size-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                          {tokenType === 'meme' ? <Sparkles className="size-6 text-amber-500" /> : tokenType === 'stable' ? <Coins className="size-6" /> : <Building2 className="size-6" />}
                        </div>
                      )}
                      <div>
                        <h4 className="text-lg font-black text-slate-800 tracking-tight leading-tight">{name || 'Token Name'}</h4>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{symbol || 'SYMBOL'}</span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border bg-white/90 shadow-sm text-slate-600 border-slate-200/50">
                      B20 {tokenType === 'stable' ? 'Stablecoin' : 'Asset'}
                    </span>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-y-4 gap-x-2 border-t border-slate-100/80 pt-4">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Initial Supply</span>
                      <span className="text-sm font-extrabold text-slate-700">{parseFloat(initialSupply || '0').toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Decimals</span>
                      <span className="text-sm font-extrabold text-slate-700">{tokenType === 'stable' ? 6 : decimals}</span>
                    </div>
                    {tokenType === 'stable' && currencyCode && (
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Peg Currency</span>
                        <span className="text-sm font-extrabold text-slate-700">{currencyCode}</span>
                      </div>
                    )}
                    {tokenType === 'security' && (
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supply Cap</span>
                        <span className="text-sm font-extrabold text-slate-700">{parseFloat(supplyCap || '0').toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tips for B20 */}
              <div className="mt-6 text-xs text-slate-500 space-y-2.5">
                <h5 className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Precompile Architectural Properties</h5>
                <p>🚀 <strong>Cheaper Gas:</strong> Since B20 runs as native precompiled Rust code, transfers consume up to 50% less gas compared to standard ERC20 smart contracts.</p>
                <p>🔒 <strong>Uncompromised Security:</strong> Employs native access control mechanisms built directly into the Base node execution client, eliminating smart contract audit risks.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: TRANSACTION PREVIEW / CALLDATA PREVIEW */}
      {step === 3 && (
        <div className="max-w-3xl mx-auto bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm animate-fadeIn">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Transaction Preview / Calldata Preview</h3>
            <p className="text-sm text-slate-500 mt-1">Review the raw payload and state settings to be dispatched to the B20 Factory.</p>
          </div>

          {/* Calldata Breakdown Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <FileCode className="size-4 text-blue-600" />
              Contract Call Configuration
            </h4>
            <div className="text-xs grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b border-slate-200/50">
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Target Factory</span>
                <code className="text-slate-800 font-mono break-all">{B20_FACTORY_ADDRESS}</code>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Method</span>
                <code className="text-blue-600 font-semibold font-mono">createB20(...)</code>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Variant Type</span>
                <code className="text-slate-800 font-semibold">{tokenType === 'stable' ? 'STABLECOIN (0x01)' : 'ASSET (0x00)'}</code>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Salt</span>
                <code className="text-slate-800 font-mono break-all">{salt.substring(0, 14)}...</code>
              </div>
            </div>

            {/* Deconstructed Params */}
            <div className="text-xs space-y-2">
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Deconstructed parameters (encodedParams)</span>
              <div className="bg-white border border-slate-200/50 rounded-lg p-3 font-mono space-y-1.5">
                <p><span className="text-slate-500">version:</span> 1</p>
                <p><span className="text-slate-500">name:</span> "{name}"</p>
                <p><span className="text-slate-500">symbol:</span> "{symbol}"</p>
                <p><span className="text-slate-500">initialAdmin:</span> {userAddress}</p>
                {tokenType === 'stable' ? (
                  <p><span className="text-slate-500">currency:</span> "{currencyCode}"</p>
                ) : (
                  <p><span className="text-slate-500">decimals:</span> {decimals}</p>
                )}
              </div>
            </div>

            {/* Deconstructed InitCalls */}
            <div className="text-xs space-y-2">
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Atomic Setup Calls (initCalls)</span>
              <div className="bg-white border border-slate-200/50 rounded-lg p-3 font-mono space-y-2">
                <p className="text-indigo-600 font-bold">// Atomic role bindings (gated by DEFAULT_ADMIN_ROLE)</p>
                <p className="pl-3">1. grantRole(MINT_ROLE, {userAddress?.substring(0, 8)}...)</p>
                <p className="pl-3">2. grantRole(BURN_ROLE, {userAddress?.substring(0, 8)}...)</p>
                <p className="pl-3">3. grantRole(PAUSE_ROLE, {userAddress?.substring(0, 8)}...)</p>
                <p className="pl-3">4. grantRole(UNPAUSE_ROLE, {userAddress?.substring(0, 8)}...)</p>
                <p className="pl-3">5. grantRole(METADATA_ROLE, {userAddress?.substring(0, 8)}...)</p>
                
                {tokenType === 'security' && (
                  <>
                    <p className="text-indigo-600 font-bold">// Set immutable cap</p>
                    <p className="pl-3">6. updateSupplyCap({parseFloat(supplyCap).toLocaleString()})</p>
                  </>
                )}
                
                {parseFloat(initialSupply) > 0 && (
                  <>
                    <p className="text-indigo-600 font-bold">// Mint initial supply to creator</p>
                    <p className="pl-3">
                      {tokenType === 'security' ? '7' : '6'}. mint({userAddress?.substring(0, 8)}..., {parseFloat(initialSupply).toLocaleString()})
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mainnet Warning Check */}
          {currentNetwork === 'mainnet' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                <ShieldAlert className="size-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Base Mainnet Deployment Safety</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    You are launching on Base Mainnet. This transaction will consume real gas fees, and deployed B20 contract tokens are permanent and live on the public blockchain.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none pl-7">
                <input
                  type="checkbox"
                  checked={acknowledgedMainnet}
                  onChange={(e) => setAcknowledgedMainnet(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-4"
                />
                Acknowledge real mainnet deployment fees and funds.
              </label>
            </div>
          )}

          {/* Production Readiness Checklist */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-3.5 text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-blue-600" /> Production Readiness Checklist
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span>{isWalletConnected ? '✅' : '❌'}</span>
                <span className={isWalletConnected ? 'text-slate-700 font-semibold' : 'text-slate-400'}>Wallet Connected</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span>{isBaseMainnet ? '✅' : '❌'}</span>
                <span className={isBaseMainnet ? 'text-slate-700 font-semibold' : 'text-slate-400'}>Base Mainnet</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span>{isEthBalanceAvailable ? '✅' : '❌'}</span>
                <span className={isEthBalanceAvailable ? 'text-slate-700 font-semibold' : 'text-slate-400'}>ETH Balance Available</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span>{isParamsValid ? '✅' : '❌'}</span>
                <span className={isParamsValid ? 'text-slate-700 font-semibold' : 'text-slate-400'}>Parameters Valid</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span>{isSimulationPassed ? '✅' : '❌'}</span>
                <span className={isSimulationPassed ? 'text-slate-700 font-semibold' : 'text-slate-400'}>Simulation Passed</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span>{isB20Enabled ? '✅' : '🟡'}</span>
                <span className={isB20Enabled ? 'text-slate-700 font-semibold' : 'text-amber-600 font-semibold animate-pulse'}>
                  {isB20Enabled ? 'B20 Activation Enabled' : 'B20 Activation Pending'}
                </span>
              </div>
            </div>

            {!isB20Enabled && (
              <div className="mt-2 text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2.5 font-medium">
                Waiting for official Base B20 activation.
              </div>
            )}
            {validationError && (
              <div className="text-xs bg-rose-50 border border-rose-200 text-rose-600 rounded-xl p-3.5 flex justify-between items-center mt-4">
                <span>{validationError}</span>
                <button type="button" onClick={() => setValidationError(null)} className="text-[10px] text-rose-500 font-bold hover:text-rose-700">Clear</button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              onClick={() => { setValidationError(null); setStep(2); }}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm font-semibold py-2 px-4 rounded-xl transition"
            >
              <ChevronLeft className="size-4" /> Edit Details
            </button>
            <button
              onClick={handleDeploy}
              disabled={isDeploying || (currentNetwork === 'mainnet' && !acknowledgedMainnet) || !canDeploy}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 px-6 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/10"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Confirming...
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" /> Confirm & Launch
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: WALLET CONFIRMATION / LOADING RECEIPT */}
      {step === 4 && (
        <div className="max-w-md mx-auto bg-white border border-slate-200/80 rounded-2xl p-8 text-center space-y-6 shadow-sm animate-fadeIn">
          <div className="relative flex justify-center">
            <div className="size-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 animate-pulse">
              <Loader2 className="size-10 animate-spin" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">Deploying B20 Precompile</h3>
            <p className="text-sm text-slate-500 px-4">
              {isWaitingForReceipt 
                ? 'Your deployment transaction was sent. Waiting for block confirmation on Base...' 
                : 'Confirm the transaction in your connected wallet. Do not close this page.'}
            </p>
          </div>

          {deployTxHash && (
            <div className="space-y-4">
              <div className="text-xs bg-slate-50 border border-slate-200/50 rounded-xl p-3 font-mono break-all text-slate-600">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Transaction Hash</span>
                {deployTxHash}
              </div>
              <button
                type="button"
                onClick={() => {
                  console.log("Manual refresh requested for deployment status");
                  refetchReceipt();
                }}
                disabled={isWaitingForReceipt}
                className="flex items-center justify-center gap-1.5 mx-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition border border-slate-200 disabled:opacity-55"
              >
                <RefreshCw className="size-3.5" />
                Refresh Deployment Status
              </button>
            </div>
          )}

          {(deployError || localDeployError) && (() => {
            const activeErr = localDeployError || deployError;
            const isUserRejection = activeErr?.message?.toLowerCase().includes('user rejected') ||
                                    activeErr?.message?.toLowerCase().includes('user denied') ||
                                    activeErr?.code === 4001;
            
            const errorTitle = isUserRejection ? "Transaction Rejected" : "Deployment unavailable";
            const errorDescription = isUserRejection 
              ? "The transaction was rejected in your wallet. Please try again." 
              : "The Base B20 deployment endpoint is currently unavailable. This usually means the B20 activation has not yet been enabled on Base Mainnet. Please wait for the official announcement and try again.";
            
            return (
              <div className="text-xs bg-rose-50 border border-rose-200 text-rose-600 rounded-xl p-5 text-left space-y-3">
                <p className="font-bold text-sm text-rose-800">{errorTitle}</p>
                <p className="mt-1 text-rose-700 leading-relaxed">{errorDescription}</p>
                
                {/* Show Technical Details Accordion */}
                <div className="mt-3 border-t border-rose-200/50 pt-2.5">
                  <button
                    type="button"
                    onClick={() => setShowTechDetails(!showTechDetails)}
                    className="flex items-center gap-1 font-bold text-[11px] text-rose-700 hover:text-rose-900 transition outline-none cursor-pointer"
                  >
                    <span>{showTechDetails ? '▼' : '▶'}</span> Show Technical Details
                  </button>
                  {showTechDetails && (
                    <div className="mt-2 p-3 bg-white border border-rose-200/30 rounded-lg space-y-2 font-mono text-[10px] text-rose-800 break-all max-h-60 overflow-y-auto">
                      <div>
                        <span className="font-bold block text-rose-900 mb-0.5">revert signature:</span>
                        <code className="bg-slate-50 px-1 py-0.5 rounded border border-slate-100">{errorDetails.revertSignature}</code>
                      </div>
                      <div>
                        <span className="font-bold block text-rose-900 mb-0.5">raw error:</span>
                        <code className="bg-slate-50 px-1 py-0.5 rounded border border-slate-100 block max-h-24 overflow-y-auto whitespace-pre-wrap">{errorDetails.rawError}</code>
                      </div>
                      <div>
                        <span className="font-bold block text-rose-900 mb-0.5">calldata:</span>
                        <code className="bg-slate-50 px-1 py-0.5 rounded border border-slate-100 block max-h-24 overflow-y-auto">{errorDetails.calldata}</code>
                      </div>
                      <div>
                        <span className="font-bold block text-rose-900 mb-0.5">tx hash (if available):</span>
                        <code className="bg-slate-50 px-1 py-0.5 rounded border border-slate-100">{errorDetails.txHash || 'Not available'}</code>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-start">
                  <button
                    type="button"
                    onClick={() => {
                      setLocalDeployError(null);
                      if (typeof resetDeploy === 'function') {
                        resetDeploy();
                      }
                      setStep(3);
                    }}
                    className="bg-white hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold py-1.5 px-4 rounded-xl text-[11px] transition cursor-pointer"
                  >
                    Go Back & Retry
                  </button>
                </div>
              </div>
            );
          })()}
          {/* Manual import fallback */}
          <div className="pt-6 border-t border-slate-100 text-left space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Manual Import Fallback</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              If the transaction succeeded but the app is stuck in the loading loop, you can paste the contract address manually to register it and proceed to the success step.
            </p>
            {validationError && (
              <div className="text-xs bg-rose-50 border border-rose-200 text-rose-600 rounded-xl p-3 flex justify-between items-center mb-2 text-left w-full font-sans">
                <span>{validationError}</span>
                <button type="button" onClick={() => setValidationError(null)} className="text-[10px] text-rose-500 font-bold hover:text-rose-700">Clear</button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="0x..."
                value={manualImportAddress}
                onChange={(e) => setManualImportAddress(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-xs transition outline-none font-mono"
              />
              <button
                type="button"
                onClick={handleManualImport}
                disabled={!manualImportAddress || !isAddress(manualImportAddress)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                Register Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: SUCCESS SCREEN */}
      {step === 5 && (
        <div className="max-w-xl mx-auto bg-white border border-slate-200/80 rounded-2xl p-8 text-center space-y-6 shadow-md animate-fadeIn">
          <div className="flex justify-center">
            <div className="size-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="size-10" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Token Launched Successfully!</h3>
            <p className="text-sm text-slate-500">
              Your native B20 token is now initialized and live on <strong>Base Mainnet</strong>.
            </p>
          </div>

          {/* Token Address display */}
          {savedDeployedAddress && (
            <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-4 space-y-3">
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Deterministic Token Address</span>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <code className="text-sm font-bold font-mono text-slate-800 break-all">{savedDeployedAddress}</code>
                  <button
                    onClick={() => copyToClipboard(savedDeployedAddress)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                    title="Copy address"
                  >
                    {isCopied ? <span className="text-[10px] text-emerald-500 font-bold">Copied!</span> : <Copy className="size-3.5" />}
                  </button>
                </div>
              </div>

              {/* Block Explorer Links */}
              <div className="flex items-center justify-center gap-4 text-xs font-bold pt-2 border-t border-slate-200/30">
                <a
                  href={getExplorerUrl(savedDeployedAddress)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  View on Explorer <ExternalLink className="size-3" />
                </a>
                {deployTxHash && (
                  <a
                    href={getExplorerUrl(deployTxHash, 'tx')}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-800 hover:underline"
                  >
                    Transaction Details <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={() => {
                setDeployTxHash(undefined);
                setSavedDeployedAddress(undefined);
                setName('');
                setSymbol('');
                setInitialSupply('1000000000');
                setLogoPreview('');
                setDescription('');
                setWebsite('');
                setTwitter('');
                setTelegram('');
                setTokenType('meme');
                setSalt(keccak256(toHex(Math.random().toString() + Date.now().toString())));
                setStep(1);
              }}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold py-2.5 px-6 rounded-xl transition"
            >
              Launch Another Token
            </button>
            <a
              href="/dashboard"
              className="w-full sm:w-auto text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 px-6 rounded-xl transition shadow-md shadow-blue-500/10"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

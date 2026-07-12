import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt, useAccount, usePublicClient, useConnectorClient } from 'wagmi';
import { useState } from 'react';
import { B20_FACTORY_ADDRESS, B20_FACTORY_ABI, B20_TOKEN_ABI, DEFAULT_ADMIN_ROLE, MINT_ROLE, BURN_ROLE, PAUSE_ROLE, UNPAUSE_ROLE, METADATA_ROLE, OPERATOR_ROLE } from '../lib/b20Abi';
import { B20Variant, NetworkType } from '../types';
import { parseEventLogs, zeroAddress } from 'viem';
import { sendTransaction } from 'viem/actions';

export const BUILDER_CODE_SUFFIX = "62635f3366306f733971380b0080218021802180218021802180218021";

/**
 * Appends the Base Builder Code suffix to a transaction request object.
 * Clones the request object to avoid mutation.
 */
export function appendBuilderSuffix<T>(request: T): T {
  if (!request || typeof (request as any).data !== 'string' || !(request as any).data.startsWith('0x')) {
    return request;
  }
  if ((request as any).data.endsWith(BUILDER_CODE_SUFFIX)) {
    return request;
  }
  return {
    ...request,
    data: `${(request as any).data}${BUILDER_CODE_SUFFIX}` as `0x${string}`
  };
}

/**
 * Hook to interact with the B20 Factory
 */
export function useB20Factory() {
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [isPending, setIsPending] = useState(false);
  const [localError, setLocalError] = useState<Error | null>(null);

  const publicClient = usePublicClient();
  const { address: userAddress } = useAccount();
  const { data: walletClient } = useConnectorClient();

  return {
    deployB20: async (
      variant: B20Variant,
      salt: `0x${string}`,
      params: `0x${string}`,
      initCalls: `0x${string}`[]
    ) => {
      setLocalError(null);
      setIsPending(true);
      try {
        if (!publicClient) {
          throw new Error("RPC client is not available. Please verify network connection.");
        }
        if (!userAddress) {
          throw new Error("Wallet is not connected. Please connect your wallet.");
        }
        if (!walletClient) {
          throw new Error("Wallet client is not ready. Please verify connection.");
        }

        const { request } = await publicClient.simulateContract({
          address: B20_FACTORY_ADDRESS,
          abi: B20_FACTORY_ABI,
          functionName: 'createB20',
          args: [variant, salt, params, initCalls],
          account: userAddress
        });

        const requestClone = appendBuilderSuffix(request);

        console.log("[Attribution Audit] deployB20 original request.data ending:", (request as any).data?.slice(-60));
        console.log("[Attribution Audit] deployB20 requestClone.data ending:", (requestClone as any).data?.slice(-60));
        console.log("[Attribution Audit] deployB20 ends with suffix:", (requestClone as any).data?.endsWith(BUILDER_CODE_SUFFIX));

        const tx = await sendTransaction(walletClient as any, {
          account: requestClone.account,
          chain: walletClient.chain,
          to: (requestClone as any).address,
          data: (requestClone as any).data,
          value: (requestClone as any).value,
          gas: (requestClone as any).gas
        });

        setTxHash(tx);
        return tx;
      } catch (err: any) {
        console.error("Simulation/execution failed for deployB20:", err);
        setLocalError(err);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    txHash,
    error: localError,
    isPending
  };
}

/**
 * Hook to retrieve deployed token details from a transaction receipt
 */
export function useB20DeploymentReceipt(txHash?: `0x${string}`) {
  const { data: receipt, isLoading, isSuccess, error } = useWaitForTransactionReceipt({
    hash: txHash
  });

  let deployedAddress: `0x${string}` | undefined;
  if (receipt && isSuccess) {
    try {
      const logs = parseEventLogs({
        abi: B20_FACTORY_ABI,
        eventName: 'B20Created',
        logs: receipt.logs
      });
      if (logs && logs.length > 0) {
        deployedAddress = logs[0].args.token;
      }
    } catch (e) {
      console.error('Failed to parse B20Created event', e);
    }
  }

  return {
    receipt,
    isLoading,
    isSuccess,
    error,
    deployedAddress
  };
}

/**
 * Hook to read all details of a B20 token address
 */
export function useB20Details(tokenAddress?: `0x${string}`, userAddress?: `0x${string}`) {
  const isEnabled = !!tokenAddress && tokenAddress !== zeroAddress;

  const baseContract = {
    address: tokenAddress,
    abi: B20_TOKEN_ABI
  } as const;

  // Perform a multicall to query name, symbol, decimals, totalSupply, supplyCap, and user balance
  const { data, refetch, isLoading, isError } = useReadContracts({
    contracts: [
      { ...baseContract, functionName: 'name' },
      { ...baseContract, functionName: 'symbol' },
      { ...baseContract, functionName: 'decimals' },
      { ...baseContract, functionName: 'totalSupply' },
      { ...baseContract, functionName: 'supplyCap' },
      { ...baseContract, functionName: 'currency' }, // only works for STABLECOIN, returns error for ASSET
      { ...baseContract, functionName: 'multiplier' }, // only works for ASSET
      { ...baseContract, functionName: 'contractURI' },
      ...(userAddress
        ? [
            { ...baseContract, functionName: 'balanceOf', args: [userAddress] },
            { ...baseContract, functionName: 'hasRole', args: [DEFAULT_ADMIN_ROLE, userAddress] },
            { ...baseContract, functionName: 'hasRole', args: [MINT_ROLE, userAddress] },
            { ...baseContract, functionName: 'hasRole', args: [BURN_ROLE, userAddress] },
            { ...baseContract, functionName: 'hasRole', args: [PAUSE_ROLE, userAddress] },
            { ...baseContract, functionName: 'hasRole', args: [UNPAUSE_ROLE, userAddress] },
            { ...baseContract, functionName: 'hasRole', args: [METADATA_ROLE, userAddress] }
          ]
        : [])
    ],
    query: {
      enabled: isEnabled
    }
  });

  // Query pausable states (TRANSFER, MINT, BURN features represented as 0, 1, 2)
  const pausedFeaturesResult = useReadContracts({
    contracts: [
      { ...baseContract, functionName: 'isPaused', args: [0] }, // TRANSFER
      { ...baseContract, functionName: 'isPaused', args: [1] }, // MINT
      { ...baseContract, functionName: 'isPaused', args: [2] }  // BURN
    ],
    query: {
      enabled: isEnabled
    }
  });

  if (!isEnabled || !data) {
    return { isLoading: isEnabled ? (isLoading || pausedFeaturesResult.isLoading) : false, isError, details: null, refetch };
  }

  const [
    nameResult,
    symbolResult,
    decimalsResult,
    totalSupplyResult,
    supplyCapResult,
    currencyResult,
    multiplierResult,
    contractUriResult,
    ...userResults
  ] = data;

  const currency = currencyResult?.status === 'success' ? (currencyResult.result as string) : undefined;
  const multiplier = multiplierResult?.status === 'success' ? (multiplierResult.result as bigint) : undefined;

  const [pausedTransfer, pausedMint, pausedBurn] = pausedFeaturesResult.data || [];

  return {
    isLoading: isLoading || pausedFeaturesResult.isLoading,
    isError,
    refetch: () => {
      refetch();
      pausedFeaturesResult.refetch();
    },
    details: {
      name: nameResult?.status === 'success' ? (nameResult.result as string) : '',
      symbol: symbolResult?.status === 'success' ? (symbolResult.result as string) : '',
      decimals: decimalsResult?.status === 'success' ? (decimalsResult.result as number) : 18,
      totalSupply: totalSupplyResult?.status === 'success' ? (totalSupplyResult.result as bigint).toString() : '0',
      supplyCap: supplyCapResult?.status === 'success' ? (supplyCapResult.result as bigint).toString() : '0',
      currency,
      multiplier: multiplier ? multiplier.toString() : undefined,
      contractURI: contractUriResult?.status === 'success' ? (contractUriResult.result as string) : '',
      isPaused: {
        transfer: pausedTransfer?.status === 'success' ? (pausedTransfer.result as boolean) : false,
        mint: pausedMint?.status === 'success' ? (pausedMint.result as boolean) : false,
        burn: pausedBurn?.status === 'success' ? (pausedBurn.result as boolean) : false
      },
      user: userAddress && userResults.length >= 7 ? {
        balance: userResults[0]?.status === 'success' ? (userResults[0].result as bigint).toString() : '0',
        isAdmin: userResults[1]?.status === 'success' ? (userResults[1].result as boolean) : false,
        isMinter: userResults[2]?.status === 'success' ? (userResults[2].result as boolean) : false,
        isBurner: userResults[3]?.status === 'success' ? (userResults[3].result as boolean) : false,
        isPauser: userResults[4]?.status === 'success' ? (userResults[4].result as boolean) : false,
        isUnpauser: userResults[5]?.status === 'success' ? (userResults[5].result as boolean) : false,
        isMetadataAdmin: userResults[6]?.status === 'success' ? (userResults[6].result as boolean) : false
      } : null
    }
  };
}

/**
 * Hook to write transactions directly to a B20 Token
 */
export function useB20TokenActions(tokenAddress: `0x${string}`) {
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [isSimulating, setIsSimulating] = useState(false);
  const [localError, setLocalError] = useState<Error | null>(null);

  const publicClient = usePublicClient();
  const { address: userAddress } = useAccount();
  const { data: walletClient } = useConnectorClient();

  const writeAction = async (functionName: string, args: any[]) => {
    setLocalError(null);
    setIsSimulating(true);

    try {
      if (!publicClient) {
        throw new Error("RPC client is not available. Please verify network connection.");
      }
      if (!userAddress) {
        throw new Error("Wallet is not connected. Please connect your wallet.");
      }
      if (!walletClient) {
        throw new Error("Wallet client is not ready. Please verify connection.");
      }

      // 1. Simulate contract call
      const { request } = await publicClient.simulateContract({
        address: tokenAddress,
        abi: B20_TOKEN_ABI,
        functionName: functionName as any,
        args: args as any,
        account: userAddress
      });

      // 2. Write contract using simulated request cloned with builder suffix
      const requestClone = appendBuilderSuffix(request);

      console.log(`[Attribution Audit] ${functionName} original request.data ending:`, (request as any).data?.slice(-60));
      console.log(`[Attribution Audit] ${functionName} requestClone.data ending:`, (requestClone as any).data?.slice(-60));
      console.log(`[Attribution Audit] ${functionName} ends with suffix:`, (requestClone as any).data?.endsWith(BUILDER_CODE_SUFFIX));

      const tx = await sendTransaction(walletClient as any, {
        account: requestClone.account,
        chain: walletClient.chain,
        to: (requestClone as any).address,
        data: (requestClone as any).data,
        value: (requestClone as any).value,
        gas: (requestClone as any).gas
      });

      setTxHash(tx);
      return tx;
    } catch (err: any) {
      console.error(`Simulation/execution failed for ${functionName}:`, err);
      setLocalError(err);
      throw err;
    } finally {
      setIsSimulating(false);
    }
  };

  return {
    mint: async (to: string, amount: bigint) => writeAction('mint', [to, amount]),
    burn: async (amount: bigint) => writeAction('burn', [amount]),
    pauseFeatures: async (features: number[]) => writeAction('pause', [features]),
    unpauseFeatures: async (features: number[]) => writeAction('unpause', [features]),
    grantRole: async (role: string, account: string) => writeAction('grantRole', [role, account]),
    revokeRole: async (role: string, account: string) => writeAction('revokeRole', [role, account]),
    renounceLastAdmin: async () => writeAction('renounceLastAdmin', []),
    updateSupplyCap: async (newCap: bigint) => writeAction('updateSupplyCap', [newCap]),
    txHash,
    error: localError,
    isPending: isSimulating
  };
}

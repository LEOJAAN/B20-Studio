import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { B20_FACTORY_ADDRESS, B20_FACTORY_ABI, B20_TOKEN_ABI, DEFAULT_ADMIN_ROLE, MINT_ROLE, BURN_ROLE, PAUSE_ROLE, UNPAUSE_ROLE, METADATA_ROLE, OPERATOR_ROLE } from '../lib/b20Abi';
import { B20Variant, NetworkType } from '../types';
import { parseEventLogs, zeroAddress } from 'viem';

/**
 * Hook to interact with the B20 Factory
 */
export function useB20Factory() {
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract();

  return {
    deployB20: async (
      variant: B20Variant,
      salt: `0x${string}`,
      params: `0x${string}`,
      initCalls: `0x${string}`[]
    ) => {
      return writeContractAsync({
        address: B20_FACTORY_ADDRESS,
        abi: B20_FACTORY_ABI,
        functionName: 'createB20',
        args: [variant, salt, params, initCalls]
      });
    },
    txHash: hash,
    error,
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
  const { writeContractAsync, data: hash, error, isPending } = useWriteContract();

  const writeAction = async (functionName: string, args: any[]) => {
    return writeContractAsync({
      address: tokenAddress,
      abi: B20_TOKEN_ABI,
      functionName: functionName as any,
      args: args as any
    });
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
    txHash: hash,
    error,
    isPending
  };
}

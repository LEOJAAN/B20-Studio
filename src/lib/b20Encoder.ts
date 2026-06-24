import { encodeAbiParameters, encodeFunctionData, keccak256, toHex } from 'viem';
import { B20_TOKEN_ABI } from './b20Abi';

/**
 * Encodes the params tuple for an Asset variant (version 1)
 */
export function encodeAssetParams(
  name: string,
  symbol: string,
  admin: string,
  decimals: number
): `0x${string}` {
  return encodeAbiParameters(
    [
      {
        type: 'tuple',
        components: [
          { name: 'version', type: 'uint8' },
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
          { name: 'initialAdmin', type: 'address' },
          { name: 'decimals', type: 'uint8' }
        ]
      }
    ],
    [{ version: 1, name, symbol, initialAdmin: admin as `0x${string}`, decimals }]
  );
}

/**
 * Encodes the params tuple for a Stablecoin variant (version 1)
 */
export function encodeStablecoinParams(
  name: string,
  symbol: string,
  admin: string,
  currency: string
): `0x${string}` {
  return encodeAbiParameters(
    [
      {
        type: 'tuple',
        components: [
          { name: 'version', type: 'uint8' },
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
          { name: 'initialAdmin', type: 'address' },
          { name: 'currency', type: 'string' }
        ]
      }
    ],
    [{ version: 1, name, symbol, initialAdmin: admin as `0x${string}`, currency: currency.toUpperCase() }]
  );
}

// initCalls helper encoders
export function encodeGrantRole(roleHash: string, account: string): `0x${string}` {
  return encodeFunctionData({
    abi: B20_TOKEN_ABI,
    functionName: 'grantRole',
    args: [roleHash as `0x${string}`, account as `0x${string}`]
  });
}

export function encodeUpdateSupplyCap(newCap: bigint): `0x${string}` {
  return encodeFunctionData({
    abi: B20_TOKEN_ABI,
    functionName: 'updateSupplyCap',
    args: [newCap]
  });
}

export function encodeUpdateContractURI(newURI: string): `0x${string}` {
  return encodeFunctionData({
    abi: B20_TOKEN_ABI,
    functionName: 'updateContractURI',
    args: [newURI]
  });
}

export function encodeUpdatePolicy(policyScopeHash: string, newPolicyId: bigint): `0x${string}` {
  return encodeFunctionData({
    abi: B20_TOKEN_ABI,
    functionName: 'updatePolicy',
    args: [policyScopeHash as `0x${string}`, newPolicyId]
  });
}

export function encodeMint(to: string, amount: bigint): `0x${string}` {
  return encodeFunctionData({
    abi: B20_TOKEN_ABI,
    functionName: 'mint',
    args: [to as `0x${string}`, amount]
  });
}

export function encodeBatchMint(recipients: string[], amounts: bigint[]): `0x${string}` {
  return encodeFunctionData({
    abi: B20_TOKEN_ABI,
    functionName: 'batchMint',
    args: [recipients.map(r => r as `0x${string}`), amounts]
  });
}

export function encodeUpdateMultiplier(newMultiplier: bigint): `0x${string}` {
  return encodeFunctionData({
    abi: B20_TOKEN_ABI,
    functionName: 'updateMultiplier',
    args: [newMultiplier]
  });
}

export function encodeUpdateExtraMetadata(key: string, value: string): `0x${string}` {
  return encodeFunctionData({
    abi: B20_TOKEN_ABI,
    functionName: 'updateExtraMetadata',
    args: [key, value]
  });
}

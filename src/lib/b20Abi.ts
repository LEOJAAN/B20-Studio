import { keccak256, toHex } from 'viem';

// Precompile Addresses
export const B20_FACTORY_ADDRESS = '0xB20f000000000000000000000000000000000000';
export const ACTIVATION_REGISTRY_ADDRESS = '0x8453000000000000000000000000000000000001';
export const POLICY_REGISTRY_ADDRESS = '0x8453000000000000000000000000000000000002';

// Role Hashes
export const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const MINT_ROLE = keccak256(toHex('MINT_ROLE'));
export const BURN_ROLE = keccak256(toHex('BURN_ROLE'));
export const BURN_BLOCKED_ROLE = keccak256(toHex('BURN_BLOCKED_ROLE'));
export const PAUSE_ROLE = keccak256(toHex('PAUSE_ROLE'));
export const UNPAUSE_ROLE = keccak256(toHex('UNPAUSE_ROLE'));
export const METADATA_ROLE = keccak256(toHex('METADATA_ROLE'));
export const OPERATOR_ROLE = keccak256(toHex('OPERATOR_ROLE'));

// Policy Scopes
export const TRANSFER_SENDER_POLICY = keccak256(toHex('TRANSFER_SENDER_POLICY'));
export const TRANSFER_RECEIVER_POLICY = keccak256(toHex('TRANSFER_RECEIVER_POLICY'));
export const TRANSFER_EXECUTOR_POLICY = keccak256(toHex('TRANSFER_EXECUTOR_POLICY'));
export const MINT_RECEIVER_POLICY = keccak256(toHex('MINT_RECEIVER_POLICY'));

// Built-in Policy Sentinels
export const ALWAYS_ALLOW_POLICY = 0n;
// ALWAYS_BLOCK ID is (uint64(ALLOWLIST) << 56) | 1. 
// In B20 specs: ALLOWLIST is 1, so ALWAYS_BLOCK is (1 << 56) | 1 = 72057594037927937n.
export const ALWAYS_BLOCK_POLICY = 72057594037927937n;

// B20 Factory ABI
export const B20_FACTORY_ABI = [
  {
    type: 'function',
    name: 'createB20',
    inputs: [
      { name: 'variant', type: 'uint8' },
      { name: 'salt', type: 'bytes32' },
      { name: 'params', type: 'bytes' },
      { name: 'initCalls', type: 'bytes[]' }
    ],
    outputs: [{ name: 'token', type: 'address' }],
    stateMutability: 'payable'
  },
  {
    type: 'function',
    name: 'getB20Address',
    inputs: [
      { name: 'variant', type: 'uint8' },
      { name: 'sender', type: 'address' },
      { name: 'salt', type: 'bytes32' }
    ],
    outputs: [{ type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'isB20',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'isB20Initialized',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'event',
    name: 'B20Created',
    inputs: [
      { name: 'token', type: 'address', indexed: true },
      { name: 'variant', type: 'uint8', indexed: true },
      { name: 'name', type: 'string', indexed: false },
      { name: 'symbol', type: 'string', indexed: false },
      { name: 'decimals', type: 'uint8', indexed: false },
      { name: 'variantEventParams', type: 'bytes', indexed: false }
    ],
    anonymous: false
  }
] as const;

// Standard B20 Token ABI
export const B20_TOKEN_ABI = [
  // ERC-20 Metadata
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [{ type: 'string' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ type: 'string' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  // ERC-20 Actions
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'transferFrom',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable'
  },
  // B20 Mint/Burn
  {
    type: 'function',
    name: 'mint',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'mintWithMemo',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'memo', type: 'bytes32' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'burn',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'burnBlocked',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  // B20 Roles
  {
    type: 'function',
    name: 'hasRole',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' }
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'grantRole',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'revokeRole',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'renounceRole',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'callerConfirmation', type: 'address' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'renounceLastAdmin',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  // B20 Granular Pause
  {
    type: 'function',
    name: 'pausedFeatures',
    inputs: [],
    outputs: [{ type: 'uint8[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'isPaused',
    inputs: [{ name: 'feature', type: 'uint8' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'pause',
    inputs: [{ name: 'features', type: 'uint8[]' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'unpause',
    inputs: [{ name: 'features', type: 'uint8[]' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  // B20 Supply Cap
  {
    type: 'function',
    name: 'supplyCap',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'updateSupplyCap',
    inputs: [{ name: 'newCap', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  // B20 Policies
  {
    type: 'function',
    name: 'policyId',
    inputs: [{ name: 'policyScope', type: 'bytes32' }],
    outputs: [{ type: 'uint64' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'updatePolicy',
    inputs: [
      { name: 'policyScope', type: 'bytes32' },
      { name: 'newPolicyId', type: 'uint64' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  // B20 Metadata updates
  {
    type: 'function',
    name: 'updateName',
    inputs: [{ name: 'newName', type: 'string' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'updateSymbol',
    inputs: [{ name: 'newSymbol', type: 'string' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'updateContractURI',
    inputs: [{ name: 'newURI', type: 'string' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'contractURI',
    inputs: [],
    outputs: [{ type: 'string' }],
    stateMutability: 'view'
  },
  // Variant: STABLECOIN
  {
    type: 'function',
    name: 'currency',
    inputs: [],
    outputs: [{ type: 'string' }],
    stateMutability: 'view'
  },
  // Variant: ASSET
  {
    type: 'function',
    name: 'multiplier',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'updateMultiplier',
    inputs: [{ name: 'newMultiplier', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'updateExtraMetadata',
    inputs: [
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'extraMetadata',
    inputs: [{ name: 'key', type: 'string' }],
    outputs: [{ type: 'string' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'batchMint',
    inputs: [
      { name: 'recipients', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const;

// Policy Registry ABI
export const POLICY_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'createPolicy',
    inputs: [
      { name: 'admin', type: 'address' },
      { name: 'policyType', type: 'uint8' }
    ],
    outputs: [{ name: 'policyId', type: 'uint64' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'createPolicyWithAccounts',
    inputs: [
      { name: 'admin', type: 'address' },
      { name: 'policyType', type: 'uint8' },
      { name: 'accounts', type: 'address[]' }
    ],
    outputs: [{ name: 'policyId', type: 'uint64' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'isAuthorized',
    inputs: [
      { name: 'policyId', type: 'uint64' },
      { name: 'account', type: 'address' }
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'policyExists',
    inputs: [{ name: 'policyId', type: 'uint64' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'policyAdmin',
    inputs: [{ name: 'policyId', type: 'uint64' }],
    outputs: [{ type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'updateBlocklist',
    inputs: [
      { name: 'policyId', type: 'uint64' },
      { name: 'blocked', type: 'bool' },
      { name: 'accounts', type: 'address[]' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'updateAllowlist',
    inputs: [
      { name: 'policyId', type: 'uint64' },
      { name: 'allowed', type: 'bool' },
      { name: 'accounts', type: 'address[]' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const;

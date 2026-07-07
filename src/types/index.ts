export enum B20Variant {
  ASSET = 0,
  STABLECOIN = 1
}

export enum PausableFeature {
  TRANSFER = 0,
  MINT = 1,
  BURN = 2
}

export type NetworkType = 'base' | 'mainnet';

export interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  variant: B20Variant;
  network: NetworkType;
  totalSupply: string;
  supplyCap: string;
  initialSupply?: string;
  issuerName?: string;
  currency?: string;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  logoUrl?: string; // base64 string for MVP
  createdAt: number;
}

export interface B20TxLog {
  hash: string;
  action: string;
  network: NetworkType;
  timestamp: number;
  tokenAddress?: string;
  tokenSymbol?: string;
}

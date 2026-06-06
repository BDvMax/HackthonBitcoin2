export interface XpubEntry {
  id: string;
  label: string;
  xpub: string;
  fingerprint: string;
  derivationPath: string;
  isValid: boolean;
}

export interface TimelockConfig {
  enabled: boolean;
  type: "relative" | "absolute";
  blocks: number; // BIP68 relativo o BIP65 absoluto
}

export interface VaultConfig {
  totalDevices: number;      // M
  requiredApprovals: number; // N
  keys: XpubEntry[];
  timelock: TimelockConfig;
  network: "mainnet" | "testnet";
}

export type SetupStep = 1 | 2 | 3 | 4;
export type VaultScreen = "home" | "setup" | "success";
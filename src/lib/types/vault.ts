export interface XpubEntry {
  id: string;
  label: string;
  xpub: string;
  fingerprint: string;
  derivationPath: string;
  isValid: boolean;
  deviceType?: "mobile" | "laptop" | "trezor" | "coldcard" | "ledger";
  deviceType?: "mobile" | "laptop" | "trezor"; // ← Hacerlo opcional con ?
}

// En /lib/types/vault.ts

export interface TimelockConfig {
  enabled: boolean;
  type: "relative" | "absolute";
  blocks: number; // para relative
  timestamp?: number; // para absolute (opcional)
  recoveryMode: "current-keys" | "recovery-key" | "trusted-person"; // ← Agrega esta propiedad
  recoveryApprovals: number; // ← Agrega esta propiedad
  trustedKey: XpubEntry | null; // ← Agrega esta propiedad
}

export interface VaultConfig {
  vaultType: VaultType;
  totalDevices: number;      // M
  requiredApprovals: number; // N
  keys: XpubEntry[];
  timelock: TimelockConfig;
  network: "mainnet" | "testnet" |"signet" | "testnet4";
}

export type VaultType = "single" | "multi";

export type SetupStep = 0 | 1 | 2 | 3 | 4;
export type VaultScreen = "home" | "setup" | "success";
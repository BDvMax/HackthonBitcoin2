export interface XpubEntry {
  id: string;
  label: string;
  xpub: string;
  fingerprint: string;
  derivationPath: string;
  isValid: boolean;
  deviceType?: "mobile" | "laptop" | "trezor" | "coldcard" | "ledger";
}

export interface TimelockConfig {
  enabled: boolean;
  type: "relative" | "absolute";
  blocks: number;
  // Nueva lógica de recuperación
  recoveryMode?: "current-keys" | "trusted-person" | null;
  recoveryApprovals: number;      // para current-keys: cuántas firmas en ruta recovery
  trustedKey: XpubEntry | null;   // para trusted-person
}

export interface VaultConfig {
  totalDevices: number;
  requiredApprovals: number;
  keys: XpubEntry[];
  timelock: TimelockConfig;
  network: "mainnet" | "testnet" | "signet" | "testnet4";
}

export type SetupStep = 0 | 1 | 2 | 3 | 4;
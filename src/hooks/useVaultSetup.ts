import { useState } from "react";
import type { VaultConfig, SetupStep } from "@/lib/types/vault";

const DEFAULT_CONFIG: VaultConfig = {
  totalDevices: 3,
  requiredApprovals: 2,
  keys: [],
  timelock: {
    enabled: false,
    type: "relative",
    blocks: 25920,
    recoveryMode: "current-keys",
    recoveryApprovals: 1,
    trustedKey: null,
  },
  network: "testnet",
};

export function useVaultSetup() {
  const [step, setStep] = useState<SetupStep>(1);
  const [config, setConfig] = useState<VaultConfig>(DEFAULT_CONFIG);

  const updateConfig = (partial: Partial<VaultConfig>) =>
    setConfig((prev) => ({ ...prev, ...partial }));

  const canAdvance: Record<SetupStep, boolean> = {
    1: config.requiredApprovals <= config.totalDevices,
    2: config.keys.filter((k) => k.isValid).length === config.totalDevices,
    3: !config.timelock.enabled || (
      !!config.timelock.recoveryMode && (
        config.timelock.recoveryMode === "current-keys" ||
        !!config.timelock.trustedKey?.isValid
      )
    ),
    4: true,
  };

  return { step, setStep, config, updateConfig, canAdvance };
}
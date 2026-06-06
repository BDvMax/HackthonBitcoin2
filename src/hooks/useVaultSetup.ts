import { useState } from "react";
import type { VaultConfig, SetupStep, VaultScreen } from "@/lib/types/vault";

const DEFAULT_CONFIG: VaultConfig = {
  totalDevices: 3,
  requiredApprovals: 2,
  keys: [],
  timelock: { enabled: false, type: "relative", blocks: 1008 },
  network: "testnet", // "mainnet"
};

export function useVaultSetup() {
  const [screen, setScreen] = useState<VaultScreen>("home");
  const [step, setStep] = useState<SetupStep>(1);
  const [config, setConfig] = useState<VaultConfig>(DEFAULT_CONFIG);

  const updateConfig = (partial: Partial<VaultConfig>) =>
    setConfig((prev) => ({ ...prev, ...partial }));

  const canAdvance: Record<SetupStep, boolean> = {
    1: config.requiredApprovals <= config.totalDevices,
    2: config.keys.filter((k) => k.isValid).length === config.totalDevices,
    3: true,
    4: true,
  };

  const startSetup = () => {
    setScreen("setup");
    setStep(1);
    setConfig(DEFAULT_CONFIG);
  };

  const completeVault = () => {
    setScreen("success");
  };

  const reset = () => {
    setScreen("home");
    setStep(1);
    setConfig(DEFAULT_CONFIG);
  };

  return { screen, setScreen, step, setStep, config, updateConfig, canAdvance, startSetup, completeVault, reset };
}
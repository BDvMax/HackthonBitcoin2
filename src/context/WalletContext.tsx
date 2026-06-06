"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { VaultConfig, SetupStep } from "@/lib/types/vault";

const DEFAULT_CONFIG: VaultConfig = {
  totalDevices: 3,
  requiredApprovals: 2,
  keys: [],
  timelock: {
    enabled: true,
    type: "relative",
    blocks: 25920,
    recoveryMode: null,
    recoveryApprovals: 1,
    trustedKey: null,
  },
  network: "testnet",
};

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export interface HelpContent {
  title: string;
  text: string;
  x?: number;
  y?: number;
}

interface WalletState {
  step: SetupStep;
  setStep: (step: SetupStep | ((prev: SetupStep) => SetupStep)) => void;
  config: VaultConfig;
  updateConfig: (patch: Partial<VaultConfig>) => void;
  canAdvance: Record<SetupStep, boolean>;
  generateDescriptor: () => string;
  deriveAddresses: () => string[];
  experienceLevel: ExperienceLevel;
  setExperienceLevel: (level: ExperienceLevel) => void;
  activeHelp: HelpContent | null;
  setActiveHelp: (help: HelpContent | null) => void;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<SetupStep>(0);
  const [config, setConfig] = useState<VaultConfig>(DEFAULT_CONFIG);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("intermediate");
  const [activeHelp, setActiveHelp] = useState<HelpContent | null>(null);

  const updateConfig = (patch: Partial<VaultConfig>) =>
    setConfig((prev) => ({ ...prev, ...patch }));

  const canAdvance: Record<SetupStep, boolean> = {
    0: true,
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

  // Funciones mockeadas preparadas para BDK o bitcoinerlab
  const generateDescriptor = () => {
    // TODO: Reemplazar por implementación real
    return `wsh(sortedmulti(${config.requiredApprovals},...))`; 
  };

  const deriveAddresses = () => {
    // TODO: Reemplazar por derivación real BIP32
    return ["tb1q...", "tb1q..."];
  };

  return (
    <WalletContext.Provider value={{ step, setStep, config, updateConfig, canAdvance, generateDescriptor, deriveAddresses, experienceLevel, setExperienceLevel, activeHelp, setActiveHelp }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};

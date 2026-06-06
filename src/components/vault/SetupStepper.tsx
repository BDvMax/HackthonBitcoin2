"use client";

import { useState } from "react";
import { useVaultSetup } from "@/hooks/useVaultSetup";
import { StepIndicator } from "./ui/StepIndicator";
import { Step1Devices } from "./steps/Step1Devices";
import { Step2Keys } from "./steps/Step2Keys";
import { Step3Recovery } from "./steps/Step3Recovery";
import { Step4Export } from "./steps/Step4Export";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { isDevMode, toggleDevMode } from "@/lib/dev-mode";

const STEPS = [
  { id: 1, label: "Dispositivos" },
  { id: 2, label: "Llaves" },
  { id: 3, label: "Recuperación" },
  { id: 4, label: "Exportar" },
] as const;

export function SetupStepper() {
  const { step, setStep, config, updateConfig, canAdvance } = useVaultSetup();
  const [devClicks, setDevClicks] = useState(0);
  const devMode = isDevMode();

  const handleLogoClick = () => {
    const next = devClicks + 1;
    setDevClicks(next);
    if (next >= 5) toggleDevMode();
  };

  const stepContent = {
    1: <Step1Devices config={config} onChange={updateConfig} />,
    2: <Step2Keys config={config} onChange={updateConfig} />,
    3: <Step3Recovery config={config} onChange={updateConfig} />,
    4: <Step4Export config={config} />,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div
          className="inline-flex items-center gap-2 mb-2 cursor-default select-none"
          onClick={handleLogoClick}
        >
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-xs tracking-[0.3em] uppercase text-zinc-500 font-mono">
            Bóveda Segura
          </span>
          {devMode && (
            <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              DEV
            </span>
          )}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Configura tu bóveda
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Protege tu Bitcoin con múltiples dispositivos
        </p>
      </div>

      <StepIndicator steps={STEPS} currentStep={step} />

      {/* Card */}
      <div className="w-full max-w-2xl mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
        {stepContent[step]}
      </div>

      {/* Navegación */}
      <div className="w-full max-w-2xl mt-4 flex justify-between">
        <Button
          variant="ghost"
          className="text-zinc-500 hover:text-white"
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as any) : s))}
          disabled={step === 1}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
        </Button>

        {step < 4 && (
          <Button
            className="bg-orange-500 hover:bg-orange-400 text-black font-semibold"
            onClick={() => setStep((s) => ((s + 1) as any))}
            disabled={!canAdvance[step]}
          >
            Continuar <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Dev mode toggle visible solo en dev */}
      {devMode && (
        <button
          onClick={toggleDevMode}
          className="mt-6 text-xs text-amber-600 hover:text-amber-400 transition-colors font-mono"
        >
          ✕ Desactivar modo desarrollador
        </button>
      )}
    </div>
  );
}
"use client";

import { useVaultSetup } from "@/hooks/useVaultSetup";
import { StepIndicator } from "./ui/StepIndicator";
import { Step1Devices } from "./steps/Step1Devices";
import { Step2Keys } from "./steps/Step2Keys";
import { Step3Recovery } from "./steps/Step3Recovery";
import { Step4Export } from "./steps/Step4Export";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";

const STEPS = [
  { id: 1, label: "Dispositivos" },
  { id: 2, label: "Llaves" },
  { id: 3, label: "Recuperación" },
  { id: 4, label: "Exportar" },
] as const;

export function SetupStepper() {
  const { step, setStep, config, updateConfig, canAdvance } = useVaultSetup();

  const stepContent = {
    1: <Step1Devices config={config} onChange={updateConfig} />,
    2: <Step2Keys config={config} onChange={updateConfig} />,
    3: <Step3Recovery config={config} onChange={updateConfig} />,
    4: <Step4Export config={config} />,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-4">
      {/* Logo / título */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-xs tracking-[0.3em] uppercase text-zinc-500 font-mono">
            Bóveda Segura
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Configura tu bóveda
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Protege tu Bitcoin con múltiples dispositivos
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator steps={STEPS} currentStep={step} />

      {/* Card principal */}
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

        {step < 4 ? (
          <Button
            className="bg-orange-500 hover:bg-orange-400 text-black font-semibold"
            onClick={() => setStep((s) => ((s + 1) as any))}
            disabled={!canAdvance[step]}
          >
            Continuar <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
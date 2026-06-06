"use client";

import { useVaultSetup } from "@/hooks/useVaultSetup";
import { StepIndicator } from "./ui/StepIndicator";
import { Step1Devices } from "./steps/Step1Devices";
import { Step2Keys } from "./steps/Step2Keys";
import { Step3Recovery } from "./steps/Step3Recovery";
import { Step4Export } from "./steps/Step4Export";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Lock, CheckCircle } from "lucide-react";

const STEPS = [
  { id: 1, label: "Dispositivos" },
  { id: 2, label: "Llaves" },
  { id: 3, label: "Recuperación" },
  { id: 4, label: "Exportar" },
] as const;

export function SetupStepper() {
  const { screen, step, setStep, config, updateConfig, canAdvance, startSetup, completeVault, reset } = useVaultSetup();

  const stepContent = {
    1: <Step1Devices config={config} onChange={updateConfig} />,
    2: <Step2Keys config={config} onChange={updateConfig} />,
    3: <Step3Recovery config={config} onChange={updateConfig} />,
    4: <Step4Export config={config} />,
  };

  // Pantalla inicial
  if (screen === "home") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-4 py-8 sm:py-0">
        <div className="text-center space-y-6 sm:space-y-8 max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-orange-500/10 border border-orange-500/30">
            <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-orange-400" />
          </div>
          
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3 sm:mb-4">
              Bóveda Segura
            </h1>
            <p className="text-base sm:text-lg text-zinc-400">
              Protege tu Bitcoin con una configuración multisig. Configura múltiples dispositivos para máxima seguridad.
            </p>
          </div>

          <Button
            onClick={startSetup}
            className="w-full bg-orange-500 hover:bg-orange-400 text-black font-semibold h-11 sm:h-12 px-6 sm:px-8 text-base sm:text-lg"
          >
            Abrir Bóveda
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
          </Button>

          <p className="text-xs text-zinc-600">
            Necesitarás al menos 2 dispositivos para continuar
          </p>
        </div>
      </div>
    );
  }

  // Pantalla de éxito
  if (screen === "success") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-8 max-w-md">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
            <CheckCircle className="w-12 h-12 text-emerald-400 animate-pulse" />
          </div>
          
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              ¡Bóveda Configurada!
            </h1>
            <p className="text-sm text-zinc-400">
              Tu bóveda multisig está lista. Descargaste el kit de recuperación y tus dispositivos están vinculados correctamente.
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2 text-left">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm">
                Configuración: <span className="font-mono font-bold">{config.requiredApprovals}-de-{config.totalDevices}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm">
                Red: <span className="font-mono font-bold">{config.network === "mainnet" ? "Bitcoin" : "Testnet"}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm">
                Dispositivos: <span className="font-mono font-bold">{config.keys.filter(k => k.isValid).length} vinculados</span>
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={reset}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold h-10"
            >
              Crear otra bóveda
            </Button>
            <p className="text-xs text-zinc-600">
              Guarda tu kit de recuperación en lugares seguros
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de configuración (setup)
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-4 py-6 sm:py-0">
      {/* Logo / título */}
      <div className="mb-6 sm:mb-10 text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-zinc-500 font-mono">
            Bóveda Segura
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
          Configura tu bóveda
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Protege tu Bitcoin con múltiples dispositivos
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator steps={STEPS} currentStep={step} />

      {/* Card principal */}
      <div className="w-full max-w-2xl mt-6 sm:mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-8 shadow-2xl">
        {stepContent[step]}
      </div>

      {/* Navegación */}
      <div className="w-full max-w-2xl mt-4 flex gap-2 sm:gap-4 justify-between">
        <Button
          variant="ghost"
          className="text-xs sm:text-sm text-zinc-500 hover:text-white px-2 sm:px-4 h-9 sm:h-10"
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as any) : s))}
          disabled={step === 1}
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Atrás</span>
        </Button>

        {step < 4 ? (
          <Button
            className="flex-1 bg-orange-500 hover:bg-orange-400 text-black font-semibold text-xs sm:text-sm h-9 sm:h-10"
            onClick={() => setStep((s) => ((s + 1) as any))}
            disabled={!canAdvance[step]}
          >
            Continuar <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
          </Button>
        ) : (
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm h-9 sm:h-10"
            onClick={completeVault}
          >
            Finalizar <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
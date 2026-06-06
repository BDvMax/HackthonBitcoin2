"use client";

import { useState } from "react";
import { useWallet, WalletProvider } from "@/context/WalletContext";
import { StepIndicator } from "./ui/StepIndicator";
import { Step1Devices } from "./steps/Step1Devices";
import { Step2Keys } from "./steps/Step2Keys";
import { Step3Recovery } from "./steps/Step3Recovery";
import { Step4Export } from "./steps/Step4Export";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Smartphone, Laptop, Lock, Unlock, Shield, HelpCircle, CheckCircle2, Circle, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Dispositivos" },
  { id: 2, label: "Llaves" },
  { id: 3, label: "Recuperación" },
  { id: 4, label: "Exportar" },
] as const;

function SetupStepperContent() {
  const { step, setStep, config, updateConfig, canAdvance, experienceLevel, setExperienceLevel, activeHelp, setActiveHelp } = useWallet();
  const [showWelcome, setShowWelcome] = useState(true);

  const stepContent = {
    1: <Step1Devices config={config} onChange={updateConfig} />,
    2: <Step2Keys config={config} onChange={updateConfig} />,
    3: <Step3Recovery config={config} onChange={updateConfig} />,
    4: <Step4Export config={config} />,
  };

  // Pantalla Inicial: Splash/Welcome
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-[#090b14] via-[#0d1122] to-[#0c0f1c] text-white flex flex-col items-center justify-center px-4 py-8 transition-all duration-500 ease-in-out">
        <div className="max-w-xl w-full text-center space-y-6 animate-scaleIn">
          <div className="inline-flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#6366f1] animate-pulse" />
            <span className="text-xs tracking-[0.4em] uppercase text-zinc-400 font-mono">
              Bóveda Segura
            </span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Autocustodia Bitcoin Simple
          </h1>
          <p className="text-base text-zinc-400 max-w-md mx-auto leading-relaxed">
            Diseña un plan de seguridad robusto y duradero para proteger tus ahorros de forma guiada, interactiva y paso a paso.
          </p>
          <div className="pt-4">
            <Button
              className="bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold h-14 px-8 text-base rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-[0_0_20px_rgba(99,102,241,0.25)]"
              onClick={() => setShowWelcome(false)}
            >
              Comenzar Setup
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Paso 0: Selector de Nivel
  if (step === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-[#090b14] via-[#0d1122] to-[#0c0f1c] text-white flex flex-col items-center justify-center px-4 py-8 transition-all duration-500 ease-in-out">
        <div className="max-w-xl w-full text-center mb-8 animate-scaleIn">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            ¿Cuál es tu nivel de experiencia?
          </h1>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-[#1e2640] bg-[#121626]/80 backdrop-blur-md p-6 shadow-2xl space-y-4 animate-slideUp">
          <div className="grid grid-cols-1 gap-3">
            {/* Beginner */}
            <button
              onClick={() => setExperienceLevel("beginner")}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-300 group",
                experienceLevel === "beginner"
                  ? "bg-[#6366f1]/10 border-[#6366f1]/80 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                  : "bg-[#181d33]/50 border-[#1f2642] hover:border-[#2f3a63] hover:bg-[#1a2038]"
              )}
            >
              <div className="space-y-0.5">
                <span className="font-bold text-base text-white block group-hover:text-[#818cf8] transition-colors">
                  Básico
                </span>
                <span className="text-xs text-zinc-400 block">
                  Explicaciones sencillas y cotidianas.
                </span>
              </div>
            </button>

            {/* Intermediate */}
            <button
              onClick={() => setExperienceLevel("intermediate")}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-300 group",
                experienceLevel === "intermediate"
                  ? "bg-[#6366f1]/10 border-[#6366f1]/80 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                  : "bg-[#181d33]/50 border-[#1f2642] hover:border-[#2f3a63] hover:bg-[#1a2038]"
              )}
            >
              <div className="space-y-0.5">
                <span className="font-bold text-base text-white block group-hover:text-[#818cf8] transition-colors">
                  Intermedio
                </span>
                <span className="text-xs text-zinc-400 block">
                  Ayuda visual interactiva con popups.
                </span>
              </div>
            </button>

            {/* Advanced */}
            <button
              onClick={() => setExperienceLevel("advanced")}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-300 group",
                experienceLevel === "advanced"
                  ? "bg-[#6366f1]/10 border-[#6366f1]/80 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                  : "bg-[#181d33]/50 border-[#1f2642] hover:border-[#2f3a63] hover:bg-[#1a2038]"
              )}
            >
              <div className="space-y-0.5">
                <span className="font-bold text-base text-white block group-hover:text-[#818cf8] transition-colors">
                  Técnico
                </span>
                <span className="text-xs text-zinc-400 block">
                  Terminología avanzada de Bitcoin.
                </span>
              </div>
            </button>
          </div>

          <Button
            className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold h-12 text-sm rounded-xl mt-2 transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
            onClick={() => setStep(1)}
          >
            Iniciar Configuración
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#090b14] via-[#0d1122] to-[#0c0f1c] text-white flex flex-col items-center justify-start px-4 py-10 transition-all duration-500 ease-in-out">
      {/* Header */}
      <div className="mb-8 text-center animate-scaleIn">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-[#6366f1]" />
          <span className="text-xs tracking-[0.3em] uppercase text-zinc-400 font-mono">
            Bóveda Segura
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Configuración Asistida
        </h1>
      </div>

      {/* Step indicator */}
      <div className="mb-8 animate-scaleIn">
        <StepIndicator steps={STEPS} currentStep={step} />
      </div>

      {/* Layout de dos columnas */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Columna Principal */}
        <div className="lg:col-span-2 flex flex-col space-y-4 animate-scaleIn">
          <div className="w-full rounded-2xl border border-[#1e2640] bg-[#121626]/80 backdrop-blur-md p-6 md:p-8 shadow-2xl min-h-[400px] flex flex-col justify-between transition-all duration-300">
            {/* Animación del paso */}
            <div key={step} className="animate-scaleIn">
              {stepContent[step]}
            </div>

            {/* Navegación */}
            <div className="mt-8 pt-6 border-t border-[#1b223a] flex justify-between">
              <Button
                variant="ghost"
                className="text-zinc-400 hover:text-white transition-colors"
                onClick={() => setStep((s) => (s > 0 ? ((s - 1) as any) : s))}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
              </Button>

              {step < 4 ? (
                <Button
                  className="bg-[#6366f1] hover:bg-[#4f46e5] text-white font-semibold transition-all shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                  onClick={() => setStep((s) => ((s + 1) as any))}
                  disabled={!canAdvance[step]}
                >
                  Continuar <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Columna del Mapa de Progreso */}
        <div className="w-full rounded-2xl border border-[#1e2640] bg-[#121626]/80 backdrop-blur-md p-6 flex flex-col space-y-5 shadow-2xl animate-scaleIn animate-slideUp">
          <div>
            <h3 className="text-xs font-bold tracking-widest text-zinc-455 uppercase font-mono mb-4 flex items-center justify-between">
              <span>Progreso de Bóveda</span>
              <span className="text-[#818cf8] text-[10px] bg-[#6366f1]/10 px-2 py-0.5 rounded border border-[#6366f1]/20 font-mono">
                Paso {step}/4
              </span>
            </h3>

            <div className="space-y-4">
              {/* Selector de Nivel interactivo en caliente */}
              <div className="bg-[#181d33]/50 p-3 rounded-xl border border-[#1f2642]">
                <span className="text-[10px] uppercase text-zinc-455 font-mono font-bold block mb-2">
                  Nivel de Ayuda
                </span>
                <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  {(["beginner", "intermediate", "advanced"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setExperienceLevel(lvl)}
                      className={cn(
                        "text-[10px] py-1 rounded transition-all duration-300 capitalize font-medium",
                        experienceLevel === lvl
                          ? "bg-[#6366f1] text-white font-bold shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      )}
                    >
                      {lvl === "beginner" ? "Básico" : lvl === "intermediate" ? "Edu" : "Pro"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Esquema de quórum */}
              <div className="p-3 bg-[#181d33]/50 border border-[#1f2642] rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-zinc-455 uppercase font-mono">Quórum</span>
                  <span className="text-xs text-[#818cf8] font-mono font-bold">
                    {config.requiredApprovals} de {config.totalDevices}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 leading-relaxed">
                  Necesitas {config.requiredApprovals} firmas para autorizar retiros.
                </div>
              </div>

              {/* Estado de las Llaves */}
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-455 uppercase font-mono font-bold block">
                  Dispositivos
                </span>
                <div className="space-y-1.5">
                  {Array.from({ length: config.totalDevices }).map((_, index) => {
                    const key = config.keys[index];
                    const isLoaded = !!key && key.isValid;
                    const deviceType = key?.deviceType || (index === 0 ? "mobile" : "laptop");

                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all duration-350",
                          isLoaded
                            ? "border-[#1e2640] bg-[#181d33]/30"
                            : "border-dashed border-zinc-800 bg-transparent opacity-50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400 font-mono text-[10px] flex items-center gap-1.5">
                            {deviceType === "mobile" ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
                          </span>
                          <span className="text-zinc-200 font-medium truncate max-w-[120px]">
                            {key?.label || `Dispositivo ${index + 1}`}
                          </span>
                        </div>
                        <span className="text-[10px] shrink-0">
                          {isLoaded ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-zinc-700" />
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Seguro de Recuperación */}
              <div className="p-3 bg-[#181d33]/50 border border-[#1f2642] rounded-xl space-y-1.5">
                <span className="text-[10px] text-zinc-455 uppercase font-mono block">Seguro de Recuperación</span>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-350">
                    {config.timelock.enabled ? (
                      config.timelock.recoveryMode === "current-keys" ? (
                        <span>Auto-recuperación</span>
                      ) : (
                        <span>Persona de confianza</span>
                      )
                    ) : (
                      "Inactivo"
                    )}
                  </span>
                  <span className="text-[#818cf8] shrink-0">
                    {config.timelock.enabled ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 text-zinc-650" />}
                  </span>
                </div>
              </div>

              {/* Panel de Ayuda Contextual en el Espacio del Mapa de Progreso */}
              {activeHelp && (
                <div className="p-4 bg-[#0d101d] border border-[#1e2640] rounded-xl space-y-2 animate-slideUp">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-[#818cf8] uppercase tracking-wider font-mono">
                      Ayuda: {activeHelp.title}
                    </h4>
                    <button
                      onClick={() => setActiveHelp(null)}
                      className="text-zinc-500 hover:text-white p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {activeHelp.text}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SetupStepper() {
  return (
    <WalletProvider>
      <SetupStepperContent />
    </WalletProvider>
  );
}
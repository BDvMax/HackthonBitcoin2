"use client";

import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useWallet, WalletProvider } from "@/context/WalletContext";
import { StepIndicator } from "./ui/StepIndicator";
import { Step1Devices } from "./steps/Step1Devices";
import { Step2Keys } from "./steps/Step2Keys";
import { Step3Recovery } from "./steps/Step3Recovery";
import { Step4Export } from "./steps/Step4Export";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Smartphone, Laptop, Lock, Unlock, HelpCircle, CheckCircle2, Circle, X, Plus, FileText, UploadCloud, Check, ClipboardPaste } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SetupStep, VaultConfig } from "@/lib/types/vault";

const STEPS = [
  { id: 1, label: "Dispositivos" },
  { id: 2, label: "Llaves" },
  { id: 3, label: "Recuperación" },
  { id: 4, label: "Exportar" },
] as const;

function SetupStepperContent() {
  const { step, setStep, config, updateConfig, canAdvance, experienceLevel, setExperienceLevel, activeHelp, setActiveHelp } = useWallet();
  const [showWelcome, setShowWelcome] = useState(true);
  const [importPanel, setImportPanel] = useState<"descriptor" | null>(null);
  const [descriptorDraft, setDescriptorDraft] = useState("");
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepContent: Record<Exclude<SetupStep, 0>, ReactNode> = {
    1: <Step1Devices config={config} onChange={updateConfig} />,
    2: <Step2Keys config={config} onChange={updateConfig} />,
    3: <Step3Recovery config={config} onChange={updateConfig} />,
    4: <Step4Export config={config} />,
  };

  const applyImportedConfig = (candidate: Partial<VaultConfig>) => {
    if (
      typeof candidate.totalDevices !== "number" ||
      typeof candidate.requiredApprovals !== "number" ||
      !Array.isArray(candidate.keys) ||
      !candidate.timelock ||
      (candidate.network !== "mainnet" && candidate.network !== "testnet")
    ) {
      throw new Error("El archivo no parece ser un kit de recuperacion valido.");
    }

    updateConfig({
      totalDevices: candidate.totalDevices,
      requiredApprovals: candidate.requiredApprovals,
      keys: candidate.keys,
      timelock: candidate.timelock,
      network: candidate.network,
    });
    setStep(4);
    setShowWelcome(false);
    setImportMessage({ type: "success", text: "Kit cargado. Revisa el resumen antes de usarlo." });
  };

  const handleKitFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as Partial<VaultConfig>;
      applyImportedConfig(parsed);
    } catch (error) {
      setImportMessage({
        type: "error",
        text: error instanceof Error ? error.message : "No se pudo leer el archivo.",
      });
    } finally {
      event.target.value = "";
    }
  };

  const handleDescriptorImport = () => {
    const clean = descriptorDraft.trim();
    const looksLikeDescriptor = /^wsh\(.+\)(#[a-z0-9]{8})?$/i.test(clean);

    if (!looksLikeDescriptor) {
      setImportMessage({
        type: "error",
        text: "Pega un descriptor que empiece con wsh(...) y, si aplica, su checksum.",
      });
      return;
    }

    const blob = new Blob([
      JSON.stringify({ descriptor: clean, importedAt: new Date().toISOString() }, null, 2),
    ], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `descriptor-importado-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setImportMessage({ type: "success", text: "Descriptor validado y guardado como respaldo JSON." });
    setImportPanel(null);
    setDescriptorDraft("");
  };

  const goBack = () => {
    setStep((current) => (current > 1 ? ((current - 1) as SetupStep) : 0));
  };

  const goNext = () => {
    setStep((current) => (current < 4 ? ((current + 1) as SetupStep) : current));
  };

  // Pantalla Inicial: Splash/Welcome
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-[#070913] bg-[linear-gradient(to_right,#1f293715_1px,transparent_1px),linear-gradient(to_bottom,#1f293715_1px,transparent_1px)] bg-[size:3rem_3rem] text-white flex flex-col items-center justify-center px-4 py-8 transition-all duration-500 ease-in-out relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#6366f1]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-md w-full flex flex-col items-center space-y-6 sm:space-y-8 animate-scaleIn relative z-10">
          {/* Top Lock Icon */}
          <div className="w-14 h-14 rounded-2xl bg-[#6366f1]/10 border border-[#6366f1]/30 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.15)] relative">
            <Lock className="w-6 h-6 text-[#818cf8]" />
          </div>

          {/* Heading */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
              Bitcoin Vault
            </h1>
            <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500 font-mono font-bold">
              AUTOCUSTODIA · MULTISIG · TIMELOCK
            </p>
          </div>

          {/* Options List */}
          <div className="w-full space-y-3 pt-2">
            {/* Opción 1: Nueva Bóveda */}
            <button
              onClick={() => setShowWelcome(false)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-[#1e2640] bg-[#121626]/80 backdrop-blur-md text-left transition-all duration-300 hover:border-[#6366f1]/60 hover:bg-[#181d33]/80 group shadow-lg"
            >
              <div className="w-10 h-10 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center text-[#818cf8] shrink-0 group-hover:bg-[#6366f1] group-hover:text-white transition-all duration-300">
                <Plus className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white block">
                    Nueva Bóveda
                  </span>
                  <span className="text-[8px] bg-[#6366f1]/20 text-[#818cf8] border border-[#6366f1]/30 px-1.5 py-0.5 rounded font-mono uppercase font-bold">
                    NUEVO
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 block mt-0.5 truncate">
                  Configurar multisig · importar xpubs · generar ...
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-550 shrink-0 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Separator */}
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-[10px] font-mono text-zinc-650 uppercase">o continuar con</span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>

            {/* Opción 2: Abrir Bóveda */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-[#1e2640]/50 bg-[#121626]/40 backdrop-blur-sm text-left transition-all duration-300 hover:border-zinc-700 hover:bg-[#181d33]/50 group"
            >
              <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shrink-0 group-hover:text-zinc-300 transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-zinc-300 block group-hover:text-white transition-colors">
                  Abrir Bóveda
                </span>
                <span className="text-[10px] text-zinc-500 block mt-0.5 truncate">
                  Cargar kit de recuperación · archivo .json
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0 group-hover:translate-x-1 transition-transform" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleKitFile}
              className="hidden"
            />

            {/* Opción 3: Importar Descriptor */}
            <button
              onClick={() => {
                setImportPanel((current) => current === "descriptor" ? null : "descriptor");
                setImportMessage(null);
              }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-[#1e2640]/50 bg-[#121626]/40 backdrop-blur-sm text-left transition-all duration-300 hover:border-zinc-700 hover:bg-[#181d33]/50 group"
            >
              <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shrink-0 group-hover:text-zinc-300 transition-colors">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-zinc-300 block group-hover:text-white transition-colors">
                  Importar Descriptor
                </span>
                <span className="text-[10px] text-zinc-500 block mt-0.5 truncate">
                  Pegar descriptor BIP380 · compatible con Sparro...
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0 group-hover:translate-x-1 transition-transform" />
            </button>

            {importPanel === "descriptor" && (
              <div className="rounded-xl border border-[#2c3558] bg-[#0d101d]/80 p-4 space-y-3 animate-slideUp">
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-mono font-bold">
                  Descriptor externo
                </label>
                <textarea
                  value={descriptorDraft}
                  onChange={(event) => setDescriptorDraft(event.target.value)}
                  rows={4}
                  spellCheck={false}
                  placeholder="wsh(sortedmulti(...))#checksum"
                  className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-[#6366f1]/70"
                />
                <button
                  onClick={handleDescriptorImport}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#6366f1] px-3 py-2 text-xs font-bold text-white hover:bg-[#4f46e5]"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  Validar y respaldar descriptor
                </button>
              </div>
            )}

            {importMessage && (
              <div
                className={cn(
                  "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed",
                  importMessage.type === "success"
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : "border-red-500/20 bg-red-500/10 text-red-300"
                )}
              >
                {importMessage.type === "success" ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                <span>{importMessage.text}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 text-center">
            <span className="text-[9px] font-mono text-zinc-600 tracking-widest uppercase">
              BITCOIN · SIGNET / TESTNET4 · MAINNET
            </span>
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
    <div className="min-h-screen bg-gradient-to-tr from-[#090b14] via-[#0d1122] to-[#0c0f1c] text-white flex flex-col items-center justify-start px-3 py-6 sm:px-4 sm:py-10 transition-all duration-500 ease-in-out">
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
      <div className="mb-6 w-full overflow-x-auto pb-2 animate-scaleIn sm:mb-8">
        <StepIndicator steps={STEPS} currentStep={step} />
      </div>

      {/* Layout de dos columnas */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Columna Principal */}
        <div className="lg:col-span-2 flex flex-col space-y-4 animate-scaleIn">
          <div className="w-full rounded-2xl border border-[#1e2640] bg-[#121626]/80 backdrop-blur-md p-4 sm:p-6 md:p-8 shadow-2xl min-h-[400px] flex flex-col justify-between transition-all duration-300">
            {/* Animación del paso */}
            <div key={step} className="animate-scaleIn">
              {step > 0 ? stepContent[step] : null}
            </div>

            {/* Navegación */}
            <div className="mt-8 pt-6 border-t border-[#1b223a] flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button
                variant="ghost"
                className="w-full text-zinc-400 hover:text-white transition-colors sm:w-auto"
                onClick={goBack}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
              </Button>

              {step < 4 ? (
                <Button
                  className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-semibold transition-all shadow-[0_0_15px_rgba(99,102,241,0.15)] sm:w-auto"
                  onClick={goNext}
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
              <div className="p-4 bg-[#0d101d]/60 border border-[#1e2640] rounded-xl space-y-2 min-h-[110px] flex flex-col justify-center transition-all duration-300">
                {activeHelp ? (
                  <div className="animate-scaleIn space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[10px] text-[#818cf8] uppercase tracking-wider font-mono">
                        {activeHelp.title}
                      </h4>
                      <button
                        onClick={() => setActiveHelp(null)}
                        className="text-zinc-500 hover:text-white p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {activeHelp.text}
                    </p>
                  </div>
                ) : (
                  <div className="text-[11px] text-zinc-500 text-center py-1 leading-relaxed">
                    Presiona los términos en <span className="text-[#a5b4fc] bg-[#312e81]/30 px-1 rounded font-semibold">violeta</span> o el icono <HelpCircle className="inline-block w-3.5 h-3.5 mx-0.5 text-zinc-400" /> para ver ayuda interactiva en este espacio.
                  </div>
                )}
              </div>
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

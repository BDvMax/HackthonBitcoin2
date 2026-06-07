"use client";

import { useRef, useState, useEffect, type ChangeEvent, type ReactNode } from "react";
import { useWallet, WalletProvider } from "@/context/WalletContext";
import { StepIndicator } from "./ui/StepIndicator";
import { Step1Devices } from "./steps/Step1Devices";
import { Step2Keys } from "./steps/Step2Keys";
import { Step3Recovery } from "./steps/Step3Recovery";
import { Step4Export } from "./steps/Step4Export";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Smartphone, Laptop, Lock, Unlock, HelpCircle, CheckCircle2, Circle, X, Plus, FileText, UploadCloud, Check, ClipboardPaste, AlertTriangle, Settings, User, GraduationCap, Terminal, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SetupStep, TimelockConfig, VaultConfig, XpubEntry } from "@/lib/types/vault";
import { WalletView } from "./WalletView";
import { blocksToHuman } from "@/lib/bitcoin/timelock";
import { useSoundEffects } from "@/hooks/useSoundEffects";
const STEPS = [
  { id: 1, label: "Dispositivos" },
  { id: 2, label: "Llaves" },
  { id: 3, label: "Recuperación" },
  { id: 4, label: "Exportar" },
] as const;

type ImportedVaultFile = Partial<VaultConfig> & {
  descriptor?: string;
};

const DEFAULT_TIMELOCK: TimelockConfig = {
  enabled: true,
  type: "relative",
  blocks: 25920,
  recoveryMode: "current-keys",
  recoveryApprovals: 1,
  trustedKey: null,
};

function SetupStepperContent() {
  const { step, setStep, config, updateConfig, canAdvance, experienceLevel, setExperienceLevel, activeHelp, setActiveHelp } = useWallet();
  const { playSuccess, playClick, playError, playToggle } = useSoundEffects();
  const [showWelcome, setShowWelcome] = useState(true);
  const [showWallet, setShowWallet] = useState(false);
  const [importPanel, setImportPanel] = useState<"descriptor" | null>(null);
  const [descriptorDraft, setDescriptorDraft] = useState("");
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [simPopupPos, setSimPopupPos] = useState<{ x: number; y: number } | null>(null);
  const [lostDevices, setLostDevices] = useState(0);
  const remainingDevices = config.totalDevices - lostDevices;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [highestStep, setHighestStep] = useState<number>(0);
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showBeginnerSummary, setShowBeginnerSummary] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (step > 0 && !showWallet) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [step, showWallet]);

  useEffect(() => {
    if (step > highestStep) {
      setHighestStep(step);
    }
  }, [step, highestStep]);

  const handleStepClick = (target: number) => {
    if (target <= highestStep) {
      playClick();
      setStep(target as SetupStep);
    }
  };

  const stepContent: Record<Exclude<SetupStep, 0>, ReactNode> = {
    1: <Step1Devices config={config} onChange={updateConfig} />,
    2: <Step2Keys config={config} onChange={updateConfig} />,
    3: <Step3Recovery config={config} onChange={updateConfig} />,
    4: <Step4Export config={config} />,
  };

  const inferRequiredApprovals = (candidate: ImportedVaultFile) => {
    if (typeof candidate.requiredApprovals === "number") return candidate.requiredApprovals;
    const match = candidate.descriptor?.match(/sortedmulti\((\d+),/i);
    if (match) return Number(match[1]);
    return 2;
  };

  const normalizeKeys = (keys: ImportedVaultFile["keys"]): XpubEntry[] => {
    if (!Array.isArray(keys)) return [];
    return keys.map((key, index) => ({
      id: key.id || (crypto.randomUUID ? crypto.randomUUID() : `imported-${Date.now()}-${index}`),
      label: key.label || `Dispositivo ${index + 1}`,
      xpub: key.xpub || "",
      fingerprint: key.fingerprint || "",
      derivationPath: key.derivationPath || "m/48'/1'/0'/2'",
      isValid: typeof key.isValid === "boolean" ? key.isValid : Boolean(key.xpub),
      deviceType: key.deviceType || (index === 0 ? "mobile" : "laptop"),
    }));
  };

  const normalizeTimelock = (timelock: ImportedVaultFile["timelock"]): TimelockConfig | null => {
    if (!timelock || typeof timelock !== "object") return null;
    const recoveryMode =
      timelock.recoveryMode === "trusted-person" ? "trusted-person" : "current-keys";
    return {
      ...DEFAULT_TIMELOCK,
      ...timelock,
      enabled: Boolean(timelock.enabled),
      type: timelock.type === "absolute" ? "absolute" : "relative",
      blocks: typeof timelock.blocks === "number" && timelock.blocks > 0
        ? timelock.blocks
        : DEFAULT_TIMELOCK.blocks,
      recoveryMode,
      recoveryApprovals: typeof timelock.recoveryApprovals === "number" && timelock.recoveryApprovals > 0
        ? timelock.recoveryApprovals
        : DEFAULT_TIMELOCK.recoveryApprovals,
      trustedKey: timelock.trustedKey ? normalizeKeys([timelock.trustedKey])[0] : null,
    };
  };

  const applyImportedConfig = (candidate: ImportedVaultFile) => {
    const importedKeys = normalizeKeys(candidate.keys);
    const timelock = normalizeTimelock(candidate.timelock);
    const VALID_NETWORKS = ["mainnet", "testnet", "signet", "testnet4"] as const;
    const network = VALID_NETWORKS.includes(candidate.network as any)
      ? candidate.network as VaultConfig["network"]
      : "testnet";
    const totalDevices = typeof candidate.totalDevices === "number"
      ? candidate.totalDevices
      : importedKeys.length;
    const requiredApprovals = inferRequiredApprovals(candidate);

    if (!timelock || importedKeys.length === 0 || totalDevices === 0) {
      throw new Error("El JSON no contiene una boveda completa. Usa el archivo descargado desde 'Descargar Archivo de Respaldo'.");
    }

    updateConfig({
      totalDevices,
      requiredApprovals: Math.min(requiredApprovals, totalDevices),
      keys: importedKeys,
      timelock,
      network,
    });
    setStep(4);
    setShowWelcome(false);
    setImportMessage({ type: "success", text: "Kit cargado. Revisa el resumen antes de usarlo." });
  };

  const processFile = async (file: File) => {
    try {
      const text = (await file.text()).replace(/^\uFEFF/, "").trim();
      if (!text) {
        throw new Error("El archivo JSON esta vacio. Selecciona el respaldo descargado desde la app.");
      }
      const parsed = JSON.parse(text) as ImportedVaultFile;
      applyImportedConfig(parsed);
    } catch (error) {
      const message =
        error instanceof SyntaxError
          ? "No pude leer ese JSON. Parece estar incompleto o no tiene formato JSON valido."
          : error instanceof Error
            ? error.message
            : "No se pudo leer el archivo.";
      setImportMessage({ type: "error", text: message });
    }
  };

  const handleKitFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
    event.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".json")) {
      processFile(file);
    } else if (file) {
      setImportMessage({ type: "error", text: "Solo se aceptan archivos .json" });
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

  const isStep3Complete = () => {
    if (!config.timelock.enabled) return true;
    if (config.vaultType === 'single') return !!config.timelock.trustedKey?.isValid;
    return !!config.timelock.recoveryMode && (config.timelock.recoveryMode === 'current-keys' || !!config.timelock.trustedKey?.isValid);
  };

  const goNext = () => {
    if (step === 3 && !isStep3Complete()) {
      playError();
      setShowSkipWarning(true);
      return;
    }
    if (step < 4) {
      playSuccess();
      setStep((step + 1) as SetupStep);
    }
  };

  const forceSkipAndNext = () => {
    updateConfig({
      timelock: {
        ...config.timelock,
        enabled: true,
        blocks: 25920, // 6 meses
        recoveryMode: "current-keys",
        recoveryApprovals: 1
      }
    });
    setShowSkipWarning(false);
    playSuccess();
    setStep(4);
  };

  const finalizeVault = () => {
    if (experienceLevel === "beginner" && !showBeginnerSummary) {
      setShowBeginnerSummary(true);
      return;
    }
    setShowBeginnerSummary(false);
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowWallet(true);
    }, 2500);
  };

  const goBack = () => {
    if (step > 0) {
      playClick();
      setStep((step - 1) as SetupStep);
    }
  };

  if (showWallet) {
    return (
      <WalletView
        config={config}
        onBack={() => setShowWallet(false)}
      />
    );
  }

  // Pantalla Inicial: Splash/Welcome
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-[#070913] text-white flex flex-col items-center justify-center px-4 py-12 transition-all duration-500 ease-in-out relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 40v-5h5v-5h5v-5h5v-5h5V0H0v20h5v5h5v5h5v5h5v5z' fill='none' stroke='%23818cf8' stroke-opacity='0.1' stroke-width='1'/%3E%3C/svg%3E")` }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c14] via-transparent to-[#0a0c14] pointer-events-none"></div>
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#6366f1]/5 rounded-none-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-[#818cf8]/5 rounded-none-full blur-[120px] pointer-events-none" />

        <div className="max-w-2xl w-full flex flex-col items-center space-y-8 animate-scaleIn relative z-10">
          {/* Top Branding */}
          <div className="flex flex-col items-center space-y-4">
            <div className="text-center space-y-2 mt-4 mb-2">
              <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter text-white font-sans bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 drop-shadow-2xl">
                Kukul Vault
              </h1>
              <p className="text-xs sm:text-sm tracking-[0.6em] uppercase text-[#818cf8] font-mono font-bold">
                AUTOCUSTODIA · MULTISIG · TIMELOCK
              </p>
            </div>
          </div>

          {/* Main Dashboard Panel */}
          <div className="w-full space-y-6 relative z-10 pt-4">

            {/* Main Primary CTA */}
            <button
              onClick={() => {
                playSuccess();
                setShowWelcome(false);
              }}
              className="w-full flex flex-col sm:flex-row items-center gap-5 p-6 rounded-none-none border border-[#6366f1]/40 bg-[#121626] text-left transition-all duration-300 hover:border-[#6366f1] hover:bg-[#181d33] group"
            >
              <div className="w-14 h-14 rounded-none-none bg-[#6366f1]/10 border border-[#6366f1]/25 flex items-center justify-center text-[#818cf8] shrink-0 group-hover:bg-[#6366f1] group-hover:text-white transition-all duration-300">
                <Plus className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="font-extrabold text-xl text-white block tracking-wide">
                    Crear Nueva Bóveda
                  </span>
                  <span className="self-center sm:self-auto text-[10px] bg-[#6366f1]/20 text-[#a5b4fc] border border-[#6366f1]/30 px-2 py-0.5 rounded-none-full font-mono uppercase font-bold tracking-wider">
                    Recomendado
                  </span>
                </div>
                <span className="text-sm text-zinc-400 block mt-1 leading-relaxed">
                  Configura tu esquema multifirma personalizado paso a paso, importa tus llaves públicas (xpubs) y establece un seguro de inactividad.
                </span>
              </div>
              <ArrowRight className="w-6 h-6 text-[#818cf8] shrink-0 group-hover:translate-x-2 transition-transform duration-300" />
            </button>

            {/* Separator */}
            <div className="flex items-center gap-4 py-2">
              <div className="h-[1px] flex-1 bg-zinc-800/80" />
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Otras Herramientas de Recuperación</span>
              <div className="h-[1px] flex-1 bg-zinc-800/80" />
            </div>

            {/* Grid of Sub-Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Cargar Respaldo */}
              <button
                onClick={() => {
                  playClick();
                  fileInputRef.current?.click();
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-none-none border text-left transition-all duration-300 group",
                  isDragging ? "border-[#6366f1] bg-[#6366f1]/20 scale-105 shadow-[0_0_20px_rgba(99,102,241,0.2)]" : "border-[#1e2640]/80 bg-[#121626]/40 backdrop-blur-sm hover:border-zinc-700 hover:bg-[#181d33]/50"
                )}
              >
                <div className="w-10 h-10 rounded-none-none bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 group-hover:bg-[#1c223a] group-hover:text-white group-hover:border-[#6366f1]/30 transition-all duration-300">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-zinc-300 block group-hover:text-white transition-colors">
                    Cargar Respaldo JSON
                  </span>
                  <span className="text-xs text-zinc-500 block mt-0.5 truncate">
                    Kit de recuperación kukulvault.json
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-650 shrink-0 group-hover:translate-x-1 transition-transform" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleKitFile}
                className="hidden"
              />

              {/* Importar Descriptor */}
              <button
                onClick={() => {
                  playToggle();
                  setImportPanel((current) => current === "descriptor" ? null : "descriptor");
                  setImportMessage(null);
                }}
                className="flex items-center gap-4 p-4 rounded-none-none border border-[#1e2640]/80 bg-[#121626]/40 backdrop-blur-sm text-left transition-all duration-300 hover:border-zinc-700 hover:bg-[#181d33]/50 group"
              >
                <div className="w-10 h-10 rounded-none-none bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 group-hover:bg-[#1c223a] group-hover:text-white group-hover:border-[#6366f1]/30 transition-all duration-300">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-zinc-300 block group-hover:text-white transition-colors">
                    Importar Descriptor
                  </span>
                  <span className="text-xs text-zinc-500 block mt-0.5 truncate">
                    BIP380 compatible (Sparrow/etc)
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-650 shrink-0 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {importPanel === "descriptor" && (
              <div className="rounded-none-none border border-[#2c3558] bg-[#0d101d]/90 p-4 space-y-3 animate-slideUp">
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-mono font-bold">
                  Descriptor externo
                </label>
                <textarea
                  value={descriptorDraft}
                  onChange={(event) => setDescriptorDraft(event.target.value)}
                  rows={4}
                  spellCheck={false}
                  placeholder="wsh(sortedmulti(...))#checksum"
                  className="w-full resize-none rounded-none-none border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-[#6366f1]/70"
                />
                <button
                  onClick={handleDescriptorImport}
                  className="w-full flex items-center justify-center gap-2 rounded-none-none bg-[#6366f1] px-3 py-2 text-xs font-bold text-white hover:bg-[#4f46e5] shadow-lg shadow-[#6366f1]/25"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  Validar y respaldar descriptor
                </button>
              </div>
            )}

            {importMessage && (
              <div
                className={cn(
                  "flex items-start gap-2 rounded-none-none border px-3 py-2 text-xs leading-relaxed",
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
          <div className="pt-2 text-center">
            <span className="text-xs sm:text-sm font-mono text-zinc-500 tracking-widest uppercase font-bold block">
              Soporte nativo para multisig con timelocks en Bitcoin
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Paso 0: Selector de Nivel
  if (step === 0) {
    return (
      <div className="min-h-screen relative bg-[#070913] text-white flex flex-col items-center justify-center px-4 py-8 transition-all duration-500 ease-in-out">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 40v-5h5v-5h5v-5h5v-5h5V0H0v20h5v5h5v5h5v5h5v5z' fill='none' stroke='%23818cf8' stroke-opacity='0.1' stroke-width='1'/%3E%3C/svg%3E")` }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c14] via-transparent to-[#0a0c14] pointer-events-none"></div>

        {/* Botón volver */}
        <button
          onClick={() => {
            playClick();
            setShowWelcome(true);
          }}
          className="absolute top-6 left-6 z-20 flex items-center gap-2 px-3 py-2 rounded-none-none border border-zinc-800 bg-[#121626]/80 hover:bg-[#181d33] hover:border-[#6366f1]/55 text-zinc-400 hover:text-white transition-all text-xs font-mono font-bold uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          Inicio
        </button>
        
        <div className="max-w-2xl w-full text-center mb-8 animate-scaleIn relative z-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl leading-tight">
            ¿Cuál es tu nivel de experiencia?
          </h1>
        </div>

        <div className="w-full max-w-2xl space-y-8 animate-slideUp relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Principiante */}
            <button
              onClick={() => {
                playToggle();
                setExperienceLevel("beginner");
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-5 p-6 rounded-none-none border text-center transition-all duration-300 group aspect-square",
                experienceLevel === "beginner"
                  ? "bg-[#121626]/95 backdrop-blur-md border-[#6366f1]/80 shadow-[0_0_20px_rgba(99,102,241,0.25)] scale-105"
                  : "bg-[#0a0c14]/90 backdrop-blur-md border-[#1f2642] hover:border-[#2f3a63] hover:bg-[#121626]/95 hover:scale-105"
              )}
            >
              <div className="w-16 h-16 rounded-none-full bg-[#6366f1]/10 flex items-center justify-center shrink-0 border border-[#6366f1]/20 group-hover:bg-[#6366f1]/20 transition-colors">
                <User className={cn("w-8 h-8", experienceLevel === "beginner" ? "text-[#818cf8]" : "text-zinc-500 group-hover:text-[#818cf8]")} />
              </div>
              <div className="space-y-2">
                <span className="font-bold text-xl text-white block group-hover:text-[#818cf8] transition-colors">
                  Principiante
                </span>
                <span className="text-sm text-zinc-400 block leading-relaxed px-2">
                  Recomendado si eres nuevo en Bitcoin. Explicaciones sencillas paso a paso, sin tecnicismos complejos y con guías visuales interactivas.
                </span>
              </div>
            </button>

            {/* Técnico */}
            <button
              onClick={() => {
                playToggle();
                setExperienceLevel("advanced");
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-5 p-6 rounded-none-none border text-center transition-all duration-300 group aspect-square",
                experienceLevel === "advanced"
                  ? "bg-[#121626]/95 backdrop-blur-md border-[#6366f1]/80 shadow-[0_0_20px_rgba(99,102,241,0.25)] scale-105"
                  : "bg-[#0a0c14]/90 backdrop-blur-md border-[#1f2642] hover:border-[#2f3a63] hover:bg-[#121626]/95 hover:scale-105"
              )}
            >
              <div className="w-16 h-16 rounded-none-full bg-[#6366f1]/10 flex items-center justify-center shrink-0 border border-[#6366f1]/20 group-hover:bg-[#6366f1]/20 transition-colors">
                <Terminal className={cn("w-8 h-8", experienceLevel === "advanced" ? "text-[#818cf8]" : "text-zinc-500 group-hover:text-[#818cf8]")} />
              </div>
              <div className="space-y-2">
                <span className="font-bold text-xl text-white block group-hover:text-[#818cf8] transition-colors">
                  Técnico
                </span>
                <span className="text-sm text-zinc-400 block leading-relaxed px-2">
                  Recomendado para expertos. Utiliza términos nativos de Bitcoin y configuraciones técnicas directas sin explicaciones introductorias.
                </span>
              </div>
            </button>
          </div>

          {/* Términos y condiciones */}
          <label 
            className={cn(
              "flex items-start gap-4 p-4 rounded-none border-2 cursor-pointer transition-all duration-200",
              termsAccepted ? "border-[#6366f1] bg-[#6366f1]/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]" : "border-[#1e2640] bg-[#121626] hover:border-[#6366f1]/50"
            )}
          >
            <div className="relative flex items-center justify-center shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  try { playToggle(); } catch(err) {}
                  setTermsAccepted(e.target.checked);
                }}
                className="w-5 h-5 cursor-pointer appearance-none rounded border-2 border-zinc-650 bg-zinc-900 checked:bg-[#6366f1] checked:border-[#6366f1] transition-colors"
              />
              {termsAccepted && <Check className="absolute w-3.5 h-3.5 text-white pointer-events-none" />}
            </div>
            <span className={cn(
              "text-xs leading-relaxed select-none transition-colors text-left",
              termsAccepted ? "text-white font-medium" : "text-zinc-400 font-normal"
            )}>
              Acepto los términos y condiciones de seguridad. Entiendo que Kukul Vault es una aplicación de autocustodia local; <strong className="text-[#818cf8]">no almacenamos, guardamos ni transmitimos ninguna semilla, clave privada ni información de tu bóveda</strong> en ningún servidor. Todo se procesa de forma 100% privada dentro de tu propio navegador.
            </span>
          </label>

          <Button
            className="w-full bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-zinc-800/50 disabled:text-zinc-550 disabled:border-zinc-800 disabled:cursor-not-allowed disabled:shadow-none text-white font-bold h-14 text-base rounded-none-none mt-2 transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
            onClick={() => setStep(1)}
            disabled={!termsAccepted}
          >
            Iniciar Configuración
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-[#070913] text-white flex flex-col items-center justify-start px-3 py-6 sm:px-4 sm:py-10 transition-all duration-500 ease-in-out relative overflow-clip">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 40v-5h5v-5h5v-5h5v-5h5V0H0v20h5v5h5v5h5v5h5v5z' fill='none' stroke='%23818cf8' stroke-opacity='0.1' stroke-width='1'/%3E%3C/svg%3E")` }}></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c14] via-transparent to-[#0a0c14] pointer-events-none"></div>
      
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#6366f1]/5 rounded-none-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-[#818cf8]/5 rounded-none-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="mb-8 flex items-center justify-center gap-4 animate-scaleIn relative z-10 w-full max-w-6xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-none-full bg-[#6366f1]" />
            <span className="text-xs tracking-[0.3em] uppercase text-zinc-400 font-mono font-bold">
              Kukul Vault
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Configuración Asistida
          </h1>
        </div>
      </div>

      {/* Step indicator */}
      <div className="mb-6 w-full overflow-x-auto pb-2 animate-scaleIn sm:mb-8 relative z-10">
        <StepIndicator 
          steps={STEPS} 
          currentStep={step} 
          highestStepReached={highestStep}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Outer Layout container with lateral Back button */}
      <div className="w-full max-w-7xl flex gap-6 items-start relative z-10">
        {/* Lateral Floating Back Button */}
        <div className="hidden md:flex w-16 shrink-0 pt-2">
          {step > 0 && (
            <button
              onClick={goBack}
              className="w-12 h-12 rounded-full border border-[#1e2640] bg-[#121626]/80 hover:bg-[#6366f1]/20 hover:border-[#6366f1]/50 text-zinc-400 hover:text-[#818cf8] transition-all flex items-center justify-center shadow-lg group relative"
              title="Atrás"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <div className="absolute -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] uppercase font-bold text-[#818cf8] tracking-widest whitespace-nowrap">
                Regresar
              </div>
            </button>
          )}
        </div>

        <div className="flex-1 w-full">
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Columna Principal */}
            <div className="lg:col-span-2 flex flex-col space-y-4 animate-scaleIn">
              <div className="w-full rounded-none-none glass-card p-4 sm:p-6 md:p-8 shadow-2xl min-h-[420px] flex flex-col justify-between transition-all duration-300">
                <div key={step} className="animate-scaleIn">
                  {step > 0 ? stepContent[step] : null}
                </div>

                {/* Navegación */}
                <div className="mt-8 pt-6 border-t border-zinc-800/80 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  {step < 4 ? (
                    <Button
                      className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold transition-all shadow-[0_0_15px_rgba(99,102,241,0.15)] sm:w-auto h-12 px-6 text-base"
                      onClick={goNext}
                      disabled={!canAdvance[step]}
                    >
                      Continuar <ArrowRight className="w-4.5 h-4.5 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold transition-all sm:w-auto h-14 px-10 text-lg shadow-[0_0_20px_rgba(99,102,241,0.25)] relative overflow-hidden group"
                      onClick={finalizeVault}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <span className="flex items-center gap-3">
                          <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          <span className="animate-pulse">Cifrando Bóveda...</span>
                        </span>
                      ) : (
                        <span className="flex items-center">
                          Finalizar y Ver Bóveda
                          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </span>
                      )}
                      {!isGenerating && <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />}
                    </Button>
                  )}
                </div>
              </div>
            </div>

        {/* Columna del Mapa de Progreso */}
        <div className="w-full rounded-none-none glass-card p-6 flex flex-col space-y-5 shadow-2xl animate-scaleIn animate-slideUp lg:sticky lg:top-8">
          <div>
            <h3 className="text-sm font-bold tracking-widest text-zinc-350 uppercase font-mono mb-4 flex items-center justify-between">
              <span>Progreso de Bóveda</span>
              <span className="text-[#818cf8] text-xs bg-[#6366f1]/10 px-2.5 py-0.5 rounded-none border border-[#6366f1]/20 font-mono">
                Paso {step}/4
              </span>
            </h3>

            <div className="space-y-4">
              {/* Nivel de Ayuda (Solo lectura) */}
              <div className="bg-[#181d33]/50 p-3.5 rounded-none-none border border-[#1f2642] flex justify-between items-center text-sm">
                <span className="text-xs uppercase text-zinc-400 font-mono font-bold">
                  Nivel de Detalle
                </span>
                <span className="text-xs bg-[#6366f1]/20 text-[#a5b4fc] border border-[#6366f1]/30 px-2.5 py-1 rounded-none-none font-bold capitalize">
                  {experienceLevel === "beginner" ? "Principiante" : "Técnico"}
                </span>
              </div>

              {/* Esquema de quórum */}
              <div className="p-3.5 bg-[#181d33]/50 border border-[#1f2642] rounded-none-none space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-400 uppercase font-mono font-bold">Quórum</span>
                  <span className="text-sm text-[#818cf8] font-mono font-bold">
                    {config.requiredApprovals} de {config.totalDevices}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 leading-relaxed">
                  Necesitas {config.requiredApprovals} firmas para autorizar retiros.
                </div>
              </div>

              {/* Estado de las Llaves */}
              <div className="space-y-2">
                <span className="text-xs text-zinc-400 uppercase font-mono font-bold block">
                  Dispositivos
                </span>
                {config.totalDevices >= 6 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    {Array.from({ length: config.totalDevices }).map((_, index) => {
                      const key = config.keys[index];
                      const isLoaded = !!key && key.isValid;
                      const deviceType = key?.deviceType || (index === 0 ? "mobile" : "laptop");

                      return (
                        <div
                          key={index}
                          title={key?.label || `Dispositivo ${index + 1}`}
                          className={cn(
                            "aspect-square flex items-center justify-center rounded-lg border transition-all duration-350 relative group",
                            isLoaded
                              ? "border-emerald-800/40 bg-emerald-950/20"
                              : "border-dashed border-zinc-800 bg-transparent opacity-50"
                          )}
                        >
                          <span className={cn("font-mono", isLoaded ? "text-emerald-400" : "text-zinc-500")}>
                            {deviceType === "mobile" ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                          </span>
                          {isLoaded && (
                            <div className="absolute -top-1.5 -right-1.5 bg-[#070913] rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {Array.from({ length: config.totalDevices }).map((_, index) => {
                      const key = config.keys[index];
                      const isLoaded = !!key && key.isValid;
                      const deviceType = key?.deviceType || (index === 0 ? "mobile" : "laptop");

                      return (
                        <div
                          key={index}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-none-none border text-sm transition-all duration-350",
                            isLoaded
                              ? "border-[#1e2640] bg-[#181d33]/30"
                              : "border-dashed border-zinc-800 bg-transparent opacity-50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-400 font-mono text-xs flex items-center gap-1.5">
                              {deviceType === "mobile" ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                            </span>
                            <span className="text-zinc-200 font-semibold truncate max-w-[130px]">
                              {key?.label || `Dispositivo ${index + 1}`}
                            </span>
                          </div>
                          <span className="text-xs shrink-0">
                            {isLoaded ? (
                              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                            ) : (
                              <Circle className="w-4.5 h-4.5 text-zinc-700" />
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Seguro de Recuperación */}
              <div className="p-3.5 bg-[#181d33]/50 border border-[#1f2642] rounded-none-none space-y-1.5">
                <span className="text-xs text-zinc-400 uppercase font-mono font-bold block">Seguro de Recuperación</span>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-300 font-medium">
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
                    {config.timelock.enabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4 text-zinc-650" />}
                  </span>
                </div>
              </div>

              {/* Simulador de Crisis */}
              {config.timelock.enabled && (
                <div className="p-3.5 bg-[#181227]/40 border border-[#6366f1]/20 rounded-none-none space-y-3 transition-all duration-300">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#a5b4fc]">
                    <AlertTriangle className="w-4 h-4 text-[#818cf8]" />
                    <span>Simulador de Crisis</span>
                  </div>
                  
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Simula la pérdida de dispositivos para probar la seguridad:
                  </p>
                  
                  <div className="space-y-2">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Dispositivos perdidos:</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {Array.from({ length: config.totalDevices + 1 }).map((_, n) => (
                        <button
                          key={n}
                          onClick={() => {
                            playToggle();
                            setLostDevices(n);
                          }}
                          className={cn(
                            "w-7 h-7 rounded-none-none border text-xs font-bold transition-all duration-300",
                            lostDevices === n
                              ? "border-[#6366f1] bg-[#6366f1]/20 text-[#818cf8] shadow-[0_0_8px_rgba(99,102,241,0.2)]"
                              : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-[#6366f1]/50 hover:text-zinc-300"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-none-none bg-[#0a0c14] p-3 border border-zinc-800/80">
                    <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono mb-1.5">Diagnóstico de Bóveda</div>
                    {remainingDevices >= config.requiredApprovals ? (
                      <div className="text-xs text-emerald-400 flex items-start gap-1.5 font-medium leading-relaxed">
                        <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400 mt-0.5" />
                        <span>Fondos seguros. Aún tienes {remainingDevices} firmas.</span>
                      </div>
                    ) : (
                      <div className="text-xs text-[#a5b4fc] flex items-start gap-1.5 font-medium leading-relaxed">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#818cf8] mt-0.5" />
                        <span>
                          Recuperación activa tras esperar {blocksToHuman(config.timelock.blocks)}.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  </div>
</div>

      {/* Floating Tooltip Popup */}
      {activeHelp && (
        <>
          <div
            style={{
              position: "fixed",
              left: `${activeHelp.x ?? 100}px`,
              top: `${activeHelp.y ?? 100}px`,
              transform: "translate(-50%, -108%)",
              zIndex: 9999,
            }}
            className="p-4 bg-[#0a0c14] border-l-4 border-l-[#6366f1] border-y border-r border-[#1e2640] rounded-none-none shadow-[0_10px_40px_rgba(99,102,241,0.15)] space-y-2.5 max-w-xs animate-scaleIn pointer-events-none"
          >
            <div className="flex items-center justify-between border-b border-[#1e2640] pb-2 gap-6">
              <span className="font-mono text-sm text-[#818cf8] font-bold">
                {activeHelp.title}
              </span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed font-sans">
              {activeHelp.text}
            </p>
          </div>
        </>
      )}

      {/* Modal Advertencia Saltar Configuración */}
      {showSkipWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#070913]/80 backdrop-blur-sm animate-scaleIn">
          <div className="max-w-md w-full mx-4 rounded-none border border-[#6366f1]/30 bg-[#0a0c14] shadow-[0_0_30px_rgba(99,102,241,0.15)] p-6 space-y-5">
            <div className="w-12 h-12 rounded-full bg-[#6366f1]/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-[#818cf8]" />
            </div>
            <div>
              <h3 className="text-white font-extrabold text-xl tracking-tight">Seguro Incompleto</h3>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                Activaste el seguro de emergencia pero no terminaste de configurarlo. 
                Si omites este paso ahora, aplicaremos una configuración de seguridad estándar: 
                <strong className="text-[#818cf8] font-semibold"> Bloqueo de 6 meses y auto-recuperación con 1 firma.</strong>
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSkipWarning(false)}
                className="flex-1 py-3 border border-[#1e2640] bg-[#121626] text-zinc-300 font-bold hover:bg-[#181d33] hover:text-white transition-colors"
              >
                Volver a configurar
              </button>
              <button
                onClick={forceSkipAndNext}
                className="flex-1 py-3 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold transition-colors shadow-[0_0_15px_rgba(99,102,241,0.2)]"
              >
                Omitir y Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Resumen Principiante */}
      {showBeginnerSummary && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#070913]/90 backdrop-blur-md animate-scaleIn">
          <div className="max-w-lg w-full mx-4 rounded-none border border-[#6366f1]/20 bg-[#0a0c14] shadow-[0_0_50px_rgba(99,102,241,0.1)] p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#6366f1]/10 flex items-center justify-center shrink-0 mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#818cf8]" />
              </div>
              <h2 className="text-2xl font-black text-white">¡Bóveda Lista!</h2>
              <p className="text-zinc-400 text-sm">Resumen de tu nueva protección criptográfica</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-4 items-start p-4 bg-[#121626]/50 border border-[#1e2640]">
                <Shield className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-white font-bold">La Puerta Principal</div>
                  <div className="text-sm text-zinc-400 mt-1">
                    Tu bóveda consta de {config.totalDevices} llaves. Para mover fondos, siempre necesitarás autorizar con al menos {config.requiredApprovals} de ellas.
                  </div>
                </div>
              </div>
              
              {config.timelock.enabled && (
                <div className="flex gap-4 items-start p-4 bg-[#121626]/50 border border-[#1e2640]">
                  <HelpCircle className="w-6 h-6 text-[#818cf8] shrink-0" />
                  <div>
                    <div className="text-white font-bold">El Seguro de Emergencia</div>
                    <div className="text-sm text-zinc-400 mt-1">
                      Si pierdes llaves, tras {blocksToHuman(config.timelock.blocks)} de inactividad, los fondos podrán recuperarse mediante tu ruta secundaria ({config.timelock.recoveryMode === "trusted-person" ? "Persona de confianza" : "Auto-recuperación"}).
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={finalizeVault}
              className="w-full h-14 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold text-lg flex items-center justify-center shadow-lg transition-all"
            >
              Entendido, Entrar a mi Bóveda
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export function SetupStepper() {
  return (
    <WalletProvider>
      <SetupStepperContent />
    </WalletProvider>
  );
}
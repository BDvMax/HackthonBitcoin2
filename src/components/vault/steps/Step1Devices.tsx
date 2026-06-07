"use client";

import type { VaultConfig } from "@/lib/types/vault";
import { useWallet } from "@/context/WalletContext";
import { cn } from "@/lib/utils";
import { Term } from "@/components/ui/Term";
import { Shield, Lock, Plus, Minus } from "lucide-react";

interface Props {
  config: VaultConfig;
  onChange: (p: Partial<VaultConfig>) => void;
}

export function Step1Devices({ config, onChange }: Props) {
  const { totalDevices, requiredApprovals, network, vaultType } = config;
  const { experienceLevel } = useWallet();

  const NETWORK_OPTIONS = [
    { id: "mainnet",  name: "Mainnet",   desc: "Red Principal (Fondos Reales)" },
    { id: "testnet4", name: "Testnet 4", desc: "Nueva Red de Prueba (BIP94)" },
    { id: "signet",   name: "Signet",    desc: "Red de Firmas (Estable/Rápida)" },
    { id: "testnet",  name: "Testnet 3", desc: "Red de Prueba Heredada" },
  ] as const;

  const isMulti = vaultType === "multi";

  const setTotal = (n: number) => {
    const clamped = Math.max(2, Math.min(15, n));
    onChange({
      totalDevices: clamped,
      requiredApprovals: Math.min(requiredApprovals, clamped),
    });
  };

  const setApprovals = (n: number) => {
    const clamped = Math.max(1, Math.min(totalDevices, n));
    onChange({ requiredApprovals: clamped });
  };

  // FIX: al cambiar a "single" se resetean totalDevices y requiredApprovals a 1
  // para que el sidebar quede sincronizado.
  const handleVaultTypeChange = (type: "single" | "multi") => {
    if (type === "single") {
      onChange({
        vaultType: "single",
        totalDevices: 1,
        requiredApprovals: 1,
        // Limpiar llaves para que el usuario no arrastre llaves multisig
        keys: [],
      });
    } else {
      const newTotal = Math.max(totalDevices, 2);
      const newApprovals = Math.max(1, Math.min(requiredApprovals, newTotal - 1));
      onChange({
        vaultType: "multi",
        totalDevices: newTotal,
        requiredApprovals: newApprovals,
        keys: [],
      });
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white">
          {experienceLevel === "beginner"
            ? "Elige el tipo de bóveda"
            : "¿Cómo estructurarás tu bóveda?"}
        </h2>
        <p className="text-base text-zinc-400 mt-3 leading-relaxed">
          {experienceLevel === "beginner"
            ? "Elige si quieres una llave única o una bóveda con múltiples firmantes."
            : "Define el tipo de bóveda, la red de Bitcoin y la estructura del quórum."}
        </p>
      </div>

      {/* Selector de tipo de bóveda */}
      <div className="space-y-3">
        <label className="text-xs uppercase tracking-widest text-zinc-400 font-mono font-bold">
          Tipo de Bóveda
        </label>
        <div className="grid grid-cols-2 gap-3">
          {/* Single Sig */}
          <button
            onClick={() => handleVaultTypeChange("single")}
            className={cn(
              "p-4 rounded-xl border text-left transition-all duration-300 flex flex-col gap-2",
              !isMulti
                ? "border-[#6366f1] bg-[#6366f1]/5 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60"
            )}
          >
            <div className="flex items-center gap-2">
              <Shield className={cn("w-4 h-4 shrink-0", !isMulti ? "text-[#818cf8]" : "text-zinc-600")} />
              <span className={cn("text-[10px] font-mono uppercase tracking-wider", !isMulti ? "text-[#818cf8]" : "text-zinc-500")}>
                Single Sig
              </span>
            </div>
            <span className={cn("text-base font-bold leading-snug", !isMulti ? "text-white" : "text-zinc-400")}>
              Una sola firma
            </span>
            <span className="text-[11px] text-zinc-500 leading-snug">
              BIP84 (P2WPKH) · Más simple
            </span>
          </button>

          {/* Multi Sig */}
          <button
            onClick={() => handleVaultTypeChange("multi")}
            className={cn(
              "p-4 rounded-xl border text-left transition-all duration-300 flex flex-col gap-2",
              isMulti
                ? "border-[#6366f1] bg-[#6366f1]/5 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60"
            )}
          >
            <div className="flex items-center gap-2">
              <Lock className={cn("w-4 h-4 shrink-0", isMulti ? "text-[#818cf8]" : "text-zinc-600")} />
              <span className={cn("text-[10px] font-mono uppercase tracking-wider", isMulti ? "text-[#818cf8]" : "text-zinc-500")}>
                Multi Sig
              </span>
            </div>
            <span className={cn("text-base font-bold leading-snug", isMulti ? "text-white" : "text-zinc-400")}>
              Múltiples firmas
            </span>
            <span className="text-[11px] text-zinc-500 leading-snug">
              BIP48 (P2WSH) · Mayor seguridad
            </span>
          </button>
        </div>
      </div>

      {/* Configuración Multi Sig */}
      {isMulti && (
        <div className="space-y-6 border border-[#1e2640] bg-[#0d1120]/60 rounded-xl p-5 animate-fadeIn">
          {/* Total de dispositivos */}
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-widest text-zinc-400 font-mono font-bold block">
              {experienceLevel === "beginner" ? "Total de Llaves / Dispositivos" : "Total de Dispositivos"}
            </label>
            <div className="flex items-center gap-5">
              <button
                onClick={() => setTotal(totalDevices - 1)}
                disabled={totalDevices <= 2}
                className={cn(
                  "w-10 h-10 rounded-lg border flex items-center justify-center transition-all duration-200",
                  totalDevices <= 2
                    ? "border-zinc-800 bg-zinc-900/40 text-zinc-700 cursor-not-allowed"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-[#6366f1] hover:text-[#818cf8]"
                )}
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center gap-0.5 min-w-[3rem]">
                <span className="text-4xl font-extrabold text-white leading-none">{totalDevices}</span>
                <span className="text-[10px] text-zinc-500 font-mono">dispositivos</span>
              </div>

              <button
                onClick={() => setTotal(totalDevices + 1)}
                disabled={totalDevices >= 15}
                className={cn(
                  "w-10 h-10 rounded-lg border flex items-center justify-center transition-all duration-200",
                  totalDevices >= 15
                    ? "border-zinc-800 bg-zinc-900/40 text-zinc-700 cursor-not-allowed"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-[#6366f1] hover:text-[#818cf8]"
                )}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Firmas requeridas */}
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-widest text-zinc-400 font-mono font-bold block">
              <Term name="approvals" />
            </label>
            <div className="flex items-center gap-5">
              <button
                onClick={() => setApprovals(requiredApprovals - 1)}
                disabled={requiredApprovals <= 1}
                className={cn(
                  "w-10 h-10 rounded-lg border flex items-center justify-center transition-all duration-200",
                  requiredApprovals <= 1
                    ? "border-zinc-800 bg-zinc-900/40 text-zinc-700 cursor-not-allowed"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-[#6366f1] hover:text-[#818cf8]"
                )}
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center gap-0.5 min-w-[3rem]">
                <span className="text-4xl font-extrabold text-[#818cf8] leading-none">{requiredApprovals}</span>
                <span className="text-[10px] text-zinc-500 font-mono">firmantes</span>
              </div>

              <button
                onClick={() => setApprovals(requiredApprovals + 1)}
                disabled={requiredApprovals >= totalDevices}
                className={cn(
                  "w-10 h-10 rounded-lg border flex items-center justify-center transition-all duration-200",
                  requiredApprovals >= totalDevices
                    ? "border-zinc-800 bg-zinc-900/40 text-zinc-700 cursor-not-allowed"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-[#6366f1] hover:text-[#818cf8]"
                )}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Resumen visual */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 flex items-center justify-between">
            <div className="text-sm text-zinc-400">Esquema de Seguridad</div>
            <div className="text-base font-mono font-bold">
              <span className="text-[#818cf8] text-xl">{requiredApprovals}</span>
              <span className="text-zinc-500 font-normal"> de </span>
              <span className="text-white text-xl">{totalDevices}</span>
              <span className="text-zinc-500 ml-2 font-normal text-sm">firmas requeridas</span>
            </div>
          </div>
        </div>
      )}

      {/* Selector de Red */}
      <div className="space-y-3">
        <label className="text-xs uppercase tracking-widest text-zinc-400 font-mono font-bold">
          Red de Bitcoin
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {NETWORK_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onChange({ network: opt.id })}
              className={cn(
                "p-3 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between h-20",
                network === opt.id
                  ? "border-[#6366f1] bg-[#6366f1]/5 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60"
              )}
            >
              <span className={cn("text-sm font-bold", network === opt.id ? "text-[#818cf8]" : "text-white")}>
                {opt.name}
              </span>
              <span className="text-[10px] text-zinc-400 mt-1 block leading-normal">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
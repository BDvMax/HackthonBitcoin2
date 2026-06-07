"use client";

import { useState } from "react";
import type { VaultConfig } from "@/lib/types/vault";
import { useWallet } from "@/context/WalletContext";
import { cn } from "@/lib/utils";
import { Term } from "@/components/ui/Term";
import { Shield, Lock, Plus, Minus, Globe, Bitcoin, FlaskConical, ChevronDown } from "lucide-react";

interface Props {
  config: VaultConfig;
  onChange: (p: Partial<VaultConfig>) => void;
}

export function Step1Devices({ config, onChange }: Props) {
  const { totalDevices, requiredApprovals, network, vaultType } = config;
  const { experienceLevel } = useWallet();
  const [showComparison, setShowComparison] = useState(false);

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
        
        {experienceLevel === "beginner" && (
          <div className="mt-6 mb-4">
            <button
              onClick={() => {
                if (typeof window !== "undefined") (window as any).__playClick?.();
                setShowComparison?.(!showComparison);
              }}
              type="button"
              className="flex items-center gap-2 text-xs font-mono font-bold text-[#818cf8] hover:text-[#a5b4fc] transition-colors uppercase tracking-wider bg-[#121626] border border-[#1e2640] px-3 py-2 rounded-none"
            >
              <Shield className="w-3.5 h-3.5" />
              {showComparison ? "Ocultar tipos de bóveda" : "Comparar tipos de bóveda"}
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", showComparison && "rotate-180")} />
            </button>

            {showComparison && (
              <div className="mt-3 border border-[#1e2640] rounded-none overflow-hidden bg-transparent animate-fadeIn">
                <div className="px-4 py-2 border-b border-[#1e2640] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#818cf8]" />
                  <span className="text-xs font-bold text-[#818cf8] uppercase tracking-wider">Tipos de Bóveda</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#1e2640]">
                  <div className="p-4 space-y-2 hover:bg-zinc-900/30 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-white" />
                      <strong className="text-sm text-white">Single Sig</strong>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Equivalente a la <strong>llave de tu casa</strong>. 
                      Solo necesitas 1 llave para entrar.
                      Ideal para montos pequeños o uso diario.
                    </p>
                  </div>
                  <div className="p-4 space-y-2 hover:bg-zinc-900/30 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-4 h-4 text-[#818cf8]" />
                      <strong className="text-sm text-[#818cf8]">Multi Sing</strong>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Multi Sing: es lo equivalente a tener una bóveda que tiene más de una llave y que podemos configurar abrir la bóveda con un mínimo de llaves.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {/* Single Sig */}
          <button
            onClick={() => {
              if (typeof window !== "undefined") (window as any).__playClick?.();
              handleVaultTypeChange("single");
            }}
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
            onClick={() => {
              if (typeof window !== "undefined") (window as any).__playClick?.();
              handleVaultTypeChange("multi");
            }}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Total de dispositivos */}
            <div className="space-y-3 flex flex-col items-center">
              <label className="text-xs uppercase tracking-widest text-zinc-400 font-mono font-bold block text-center">
                {experienceLevel === "beginner" ? "Total de Llaves / Dispositivos" : "Total de Dispositivos"}
              </label>
              <div className="flex items-center gap-5 justify-center">
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
                  <span className="text-[10px] text-zinc-500 font-mono text-center">dispositivos</span>
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
            <div className="space-y-3 flex flex-col items-center">
              <label className="text-xs uppercase tracking-widest text-zinc-400 font-mono font-bold block text-center">
                <Term name="approvals" />
              </label>
              <div className="flex items-center gap-5 justify-center">
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
                  <span className="text-[10px] text-zinc-500 font-mono text-center">firmantes</span>
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
        <label className="text-xs uppercase tracking-widest text-zinc-400 font-mono font-bold mb-2 block">
          Red de Bitcoin
        </label>
        
        {experienceLevel === "beginner" && (
          <div className="bg-[#121626]/80 border border-[#1e2640] p-4 rounded-xl flex items-start gap-3 mb-4">
            <Globe className="w-6 h-6 text-[#818cf8] shrink-0" />
            <p className="text-sm text-zinc-300 leading-relaxed">
              Elige si quieres operar con dinero real (<strong className="text-emerald-400">Mainnet</strong>) o hacer pruebas con dinero ficticio sin valor (<strong className="text-[#818cf8]">Testnet / Signet</strong>).
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {NETWORK_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                if (typeof window !== "undefined") (window as any).__playClick?.();
                onChange({ network: opt.id });
              }}
              className={cn(
                "p-3 rounded-xl border text-left transition-all duration-300 flex items-center justify-between h-20",
                network === opt.id
                  ? "border-[#6366f1] bg-[#6366f1]/5 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60"
              )}
            >
              <div className="flex flex-col justify-center">
                <span className={cn("text-sm font-bold flex items-center gap-2", network === opt.id ? "text-[#818cf8]" : "text-white")}>
                  {opt.id === "mainnet" ? <Bitcoin className="w-5 h-5 text-emerald-400" /> : <FlaskConical className="w-5 h-5 text-[#818cf8]" />} {opt.name}
                </span>
                <span className="text-[10px] text-zinc-400 mt-1 block leading-normal">{opt.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
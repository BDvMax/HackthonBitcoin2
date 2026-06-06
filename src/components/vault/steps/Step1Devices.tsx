"use client";

import type { VaultConfig } from "@/lib/types/vault";
import { useWallet } from "@/context/WalletContext";
import { cn } from "@/lib/utils";
import { Term } from "@/components/ui/Term";
import { Check } from "lucide-react";

interface Props {
  config: VaultConfig;
  onChange: (p: Partial<VaultConfig>) => void;
}

const DEVICE_OPTIONS = [2, 3, 4, 5];

export function Step1Devices({ config, onChange }: Props) {
  const { totalDevices, requiredApprovals, network } = config;
  const { experienceLevel } = useWallet();

  const NETWORK_OPTIONS = [
    { id: "mainnet", name: "Mainnet", desc: "Red Principal (Fondos Reales)" },
    { id: "testnet4", name: "Testnet 4", desc: "Nueva Red de Prueba (BIP94)" },
    { id: "signet", name: "Signet", desc: "Red de Firmas (Estable/Rápida)" },
    { id: "testnet", name: "Testnet 3", desc: "Red de Prueba Heredada" },
  ] as const;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">
          {experienceLevel === "beginner" ? "Elige las reglas de tu caja fuerte" : "¿Cómo estructurarás tu bóveda?"}
        </h2>
        <p className="text-sm text-zinc-400 mt-2">
          {experienceLevel === "beginner"
            ? "Elige el número de llaves totales, cuántas necesitas para retirar tus monedas y la red de Bitcoin."
            : "Define la red de Bitcoin y la estructura de tu quórum multifirma (M de N)."}
        </p>
      </div>

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
                  ? "border-[#6366f1] bg-[#6366f1]/5 text-[#818cf8] shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                  : "border-zinc-850 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/60"
              )}
            >
              <span className={cn("text-sm font-bold", network === opt.id ? "text-[#818cf8]" : "text-white")}>
                {opt.name}
              </span>
              <span className="text-[10px] text-zinc-400 mt-1 block leading-normal">
                {opt.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Selector total de dispositivos */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest text-zinc-400 font-mono font-bold">
          {experienceLevel === "beginner" ? "Total de Llaves / Dispositivos" : "Total de Dispositivos"}
        </label>
        <div className="flex gap-2">
          {DEVICE_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() =>
                onChange({
                  totalDevices: n,
                  requiredApprovals: Math.min(requiredApprovals, n),
                })
              }
              className={cn(
                "w-12 h-12 rounded-xl border text-base font-bold transition-all duration-300",
                totalDevices === n
                  ? "border-[#6366f1] bg-[#6366f1]/10 text-[#818cf8] font-extrabold shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                  : "border-zinc-850 bg-zinc-900/40 text-zinc-500 hover:border-zinc-700"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de aprobaciones requeridas */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest text-zinc-400 font-mono font-bold">
          <Term name="approvals" />
        </label>
        <div className="flex gap-2">
          {Array.from({ length: totalDevices }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => onChange({ requiredApprovals: n })}
              className={cn(
                "w-12 h-12 rounded-xl border text-base font-bold transition-all duration-300",
                requiredApprovals === n
                  ? "border-[#6366f1] bg-[#6366f1]/10 text-[#818cf8] font-extrabold shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                  : "border-zinc-850 bg-zinc-900/40 text-zinc-500 hover:border-zinc-700"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen visual */}
      <div className="rounded-xl border border-zinc-850 bg-zinc-900/20 p-4 flex items-center justify-between">
        <div className="text-sm text-zinc-400">
          Esquema de Seguridad
        </div>
        <div className="text-sm font-mono font-bold">
          <span className="text-[#818cf8] text-base">{requiredApprovals}</span>
          <span className="text-zinc-500 font-normal"> de </span>
          <span className="text-white text-base">{totalDevices}</span>
          <span className="text-zinc-500 ml-2 font-normal">firmas requeridas</span>
        </div>
      </div>

      {/* Recomendación */}
      {totalDevices === 3 && requiredApprovals === 2 && (
        <div className="text-sm text-emerald-400 flex items-center gap-2 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
          <Check className="w-4 h-4 shrink-0" />
          <span>Configuración recomendada: Puedes perder 1 dispositivo y conservar tus fondos.</span>
        </div>
      )}
    </div>
  );
}
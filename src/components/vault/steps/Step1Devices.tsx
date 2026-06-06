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
  const { totalDevices, requiredApprovals } = config;
  const { experienceLevel } = useWallet();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white">
          {experienceLevel === "beginner" ? "Elige las reglas de tu caja fuerte" : "¿Cuántos dispositivos vincularás?"}
        </h2>
        <p className="text-base text-zinc-400 mt-3 leading-relaxed">
          {experienceLevel === "beginner"
            ? "Elige el número de llaves totales y cuántas necesitas para retirar tus monedas."
            : "Define la estructura multifirma del quórum principal (M de N)."}
        </p>
      </div>

      {/* Selector total de dispositivos */}
      <div className="space-y-3">
        <label className="text-sm uppercase tracking-widest text-zinc-400 font-mono font-bold block">
          {experienceLevel === "beginner" ? "Total de Llaves / Dispositivos" : "Total de Dispositivos"}
        </label>
        <div className="flex gap-3">
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
                "w-16 h-16 rounded-none-none border text-lg font-bold transition-all duration-300",
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
      <div className="space-y-3">
        <label className="text-sm uppercase tracking-widest text-zinc-400 font-mono font-bold block">
          <Term name="approvals" />
        </label>
        <div className="flex gap-3">
          {Array.from({ length: totalDevices }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => onChange({ requiredApprovals: n })}
              className={cn(
                "w-16 h-16 rounded-none-none border text-lg font-bold transition-all duration-300",
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
      <div className="rounded-none-none border border-zinc-850 bg-zinc-900/20 p-5 flex items-center justify-between">
        <div className="text-base text-zinc-450">
          Esquema de Seguridad
        </div>
        <div className="text-base font-mono font-bold">
          <span className="text-[#818cf8] text-lg">{requiredApprovals}</span>
          <span className="text-zinc-500 font-normal"> de </span>
          <span className="text-white text-lg">{totalDevices}</span>
          <span className="text-zinc-500 ml-2 font-normal">firmas requeridas</span>
        </div>
      </div>
    </div>
  );
}
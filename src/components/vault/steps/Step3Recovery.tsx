"use client";

import type { VaultConfig, TimelockConfig } from "@/lib/types/vault";
import { blocksToHuman } from "@/lib/bitcoin/timelock";
import { cn } from "@/lib/utils";
import { Shield, Clock, ChevronRight } from "lucide-react";

interface Props {
  config: VaultConfig;
  onChange: (p: Partial<VaultConfig>) => void;
}

const PRESETS = [
  { label: "3 meses",  blocks: 12960 },
  { label: "6 meses",  blocks: 25920 },
  { label: "1 año",    blocks: 52560 },
  { label: "2 años",   blocks: 105120 },
];

export function Step3Recovery({ config, onChange }: Props) {
  const { timelock } = config;

  const update = (patch: Partial<TimelockConfig>) =>
    onChange({ timelock: { ...timelock, ...patch } });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold">Plan de Recuperación por Inactividad</h2>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Opcional. Permite recuperar fondos con menos llaves si no hay actividad durante un período.
        </p>
      </div>

      {/* Toggle */}
      <div
        onClick={() => update({ enabled: !timelock.enabled })}
        className={cn(
          "flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-all",
          timelock.enabled
            ? "border-orange-500/40 bg-orange-500/5"
            : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center",
            timelock.enabled ? "bg-orange-500/20" : "bg-zinc-800"
          )}>
            <Shield className={cn("w-4 h-4", timelock.enabled ? "text-orange-400" : "text-zinc-500")} />
          </div>
          <div>
            <div className="text-sm font-medium">Activar plan de recuperación</div>
            <div className="text-xs text-zinc-500">Timelock {timelock.type === "relative" ? "relativo BIP68" : "absoluto BIP65"}</div>
          </div>
        </div>
        <div className={cn(
          "w-10 h-6 rounded-full transition-all relative",
          timelock.enabled ? "bg-orange-500" : "bg-zinc-700"
        )}>
          <div className={cn(
            "w-4 h-4 rounded-full bg-white absolute top-1 transition-all",
            timelock.enabled ? "left-5" : "left-1"
          )} />
        </div>
      </div>

      {timelock.enabled && (
        <>
          {/* Tipo de timelock */}
          <div className="grid grid-cols-2 gap-3">
            {(["relative", "absolute"] as const).map((t) => (
              <button
                key={t}
                onClick={() => update({ type: t })}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all",
                  timelock.type === t
                    ? "border-orange-500/40 bg-orange-500/5"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                )}
              >
                <Clock className={cn("w-4 h-4 mb-2", timelock.type === t ? "text-orange-400" : "text-zinc-500")} />
                <div className="text-sm font-medium">
                  {t === "relative" ? "Relativo" : "Absoluto"}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {t === "relative" ? "Desde última tx" : "Altura de bloque fija"}
                </div>
              </button>
            ))}
          </div>

          {/* Presets */}
          <div>
            <label className="text-xs uppercase tracking-widest text-zinc-500 font-mono">
              Período de inactividad
            </label>
            <div className="flex gap-2 mt-3 flex-wrap">
              {PRESETS.map((p) => (
                <button
                  key={p.blocks}
                  onClick={() => update({ blocks: p.blocks })}
                  className={cn(
                    "px-4 py-2 rounded-lg border text-sm transition-all",
                    timelock.blocks === p.blocks
                      ? "border-orange-500 bg-orange-500/10 text-orange-400"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slider fino */}
          <div>
            <div className="flex justify-between text-xs text-zinc-500 mb-2">
              <span>Bloques: <span className="font-mono text-zinc-300">{timelock.blocks.toLocaleString()}</span></span>
              <span className="text-orange-400">{blocksToHuman(timelock.blocks)}</span>
            </div>
            <input
              type="range"
              min={1008}
              max={105120}
              step={1008}
              value={timelock.blocks}
              onChange={(e) => update({ blocks: Number(e.target.value) })}
              className="w-full accent-orange-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-700 mt-1 font-mono">
              <span>1 semana</span><span>2 años</span>
            </div>
          </div>

          {/* Resumen */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
            <div className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Resumen del plan</div>
            <div className="flex items-start gap-2 text-sm">
              <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
              <span className="text-zinc-300">
                Si tu bóveda no realiza ninguna transacción durante{" "}
                <span className="text-white font-medium">{blocksToHuman(timelock.blocks)}</span>,
                se habilitará una ruta de recuperación alternativa usando{" "}
                <span className="text-white font-medium">{config.requiredApprovals} de {config.totalDevices} llaves</span>.
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
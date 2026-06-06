import type { VaultConfig } from "@/lib/types/vault";
import { cn } from "@/lib/utils";

interface Props {
  config: VaultConfig;
  onChange: (p: Partial<VaultConfig>) => void;
}

const DEVICE_OPTIONS = [2, 3, 4, 5];

export function Step1Devices({ config, onChange }: Props) {
  const { totalDevices, requiredApprovals } = config;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold">¿Cuántos dispositivos vincularás?</h2>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Cada dispositivo (hardware wallet, papel, móvil) guarda una llave única.
        </p>
      </div>

      {/* Selector total de dispositivos */}
      <div>
        <label className="text-[9px] sm:text-xs uppercase tracking-widest text-zinc-500 font-mono">
          Total de Dispositivos
        </label>
        <div className="flex gap-2 sm:gap-3 mt-3 flex-wrap">
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
                "flex-1 min-w-12 h-12 sm:h-14 rounded-xl border text-base sm:text-lg font-bold transition-all",
                totalDevices === n
                  ? "border-orange-500 bg-orange-500/10 text-orange-400"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de aprobaciones requeridas */}
      <div>
        <label className="text-[9px] sm:text-xs uppercase tracking-widest text-zinc-500 font-mono">
          Aprobaciones Necesarias para gastar
        </label>
        <div className="flex gap-2 sm:gap-3 mt-3 flex-wrap">
          {Array.from({ length: totalDevices }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => onChange({ requiredApprovals: n })}
              className={cn(
                "flex-1 min-w-12 h-12 sm:h-14 rounded-xl border text-base sm:text-lg font-bold transition-all",
                requiredApprovals === n
                  ? "border-orange-500 bg-orange-500/10 text-orange-400"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen visual */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <div className="text-xs sm:text-sm text-zinc-400">
          Configuración seleccionada
        </div>
        <div className="text-xs sm:text-sm font-mono">
          <span className="text-orange-400 font-bold text-base sm:text-lg">{requiredApprovals}</span>
          <span className="text-zinc-500"> de </span>
          <span className="text-white font-bold text-base sm:text-lg">{totalDevices}</span>
          <span className="text-zinc-500 ml-2">dispositivos</span>
        </div>
      </div>

      {/* Recomendación */}
      {totalDevices === 3 && requiredApprovals === 2 && (
        <p className="text-[11px] sm:text-xs text-emerald-500 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
          Configuración 2-de-3 recomendada: balance óptimo entre seguridad y redundancia.
        </p>
      )}
    </div>
  );
}
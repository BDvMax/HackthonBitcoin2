"use client";
// parsed
import { useState, useCallback } from "react";
import type { VaultConfig, XpubEntry } from "@/lib/types/vault";
import {
  parseXpub,
  validateDerivationPath,
  truncateXpub,
  STANDARD_PATHS,
  TESTNET_PATHS, // Para testear con testnet
} from "@/lib/bitcoin/xpub";
import { cn } from "@/lib/utils";
import { Check, AlertCircle, ChevronDown, Trash2, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  config: VaultConfig;
  onChange: (p: Partial<VaultConfig>) => void;
}

const EMPTY_KEY = (index: number): XpubEntry => ({
  id: crypto.randomUUID(),
  label: `Dispositivo ${index + 1}`,
  xpub: "",
  fingerprint: "",
  derivationPath: "m/48'/0'/0'/2'",
  isValid: false,
});

export function Step2Keys({ config, onChange }: Props) {
  const { totalDevices, keys, network } = config;

  // Inicializa slots vacíos si hacen falta
  const entries: XpubEntry[] = Array.from({ length: totalDevices }, (_, i) =>
    keys[i] ?? EMPTY_KEY(i)
  );

  const [showPathDropdown, setShowPathDropdown] = useState<string | null>(null);

  const updateEntry = useCallback(
    (id: string, patch: Partial<XpubEntry>) => {
      const updated = entries.map((e) => (e.id === id ? { ...e, ...patch } : e));
      onChange({ keys: updated });
    },
    [entries, onChange]
  );

  const handleXpubChange = (id: string, raw: string) => {
    const parsed = parseXpub(raw, network);
    updateEntry(id, {
      xpub: raw,
      fingerprint: parsed.fingerprint,
      isValid: parsed.isValid && validateDerivationPath(
        entries.find((e) => e.id === id)?.derivationPath ?? ""
      ),
      ...(parsed.error ? {} : {}),
    });
  };

  const handlePathChange = (id: string, path: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    const valid = parseXpub(entry.xpub, network).isValid && validateDerivationPath(path);
    updateEntry(id, { derivationPath: path, isValid: valid });
    setShowPathDropdown(null);
  };

  const validCount = entries.filter((e) => e.isValid).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold">Vincula tus dispositivos</h2>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Importa la llave pública extendida (XPUB/ZPUB) de cada dispositivo.
        </p>
      </div>

      {/* Progreso */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex-1 h-1 sm:h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${(validCount / totalDevices) * 100}%` }}
          />
        </div>
        <span className="text-[10px] sm:text-xs font-mono text-zinc-400 shrink-0">
          {validCount}/{totalDevices}
        </span>
      </div>

      {/* Tarjetas de dispositivo */}
      <div className="space-y-3 sm:space-y-4">
        {entries.map((entry, i) => (
          <DeviceKeyCard
            key={entry.id}
            entry={entry}
            index={i}
            network={network}
            showPathDropdown={showPathDropdown === entry.id}
            onToggleDropdown={() =>
              setShowPathDropdown((prev) =>
                prev === entry.id ? null : entry.id
              )
            }
            onXpubChange={(v) => handleXpubChange(entry.id, v)}
            onPathChange={(p) => handlePathChange(entry.id, p)}
            onLabelChange={(l) => updateEntry(entry.id, { label: l })}
            onClear={() =>
              onChange({
                keys: entries.map((e) =>
                  e.id === entry.id ? EMPTY_KEY(i) : e
                ),
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Subcomponente tarjeta ─────────────────────────────────────────────── */

interface CardProps {
  entry: XpubEntry;
  index: number;
  network: "mainnet" | "testnet";
  showPathDropdown: boolean;
  onToggleDropdown: () => void;
  onXpubChange: (v: string) => void;
  onPathChange: (p: string) => void;
  onLabelChange: (l: string) => void;
  onClear: () => void;
}

function DeviceKeyCard({
  entry, index, showPathDropdown, network, //cambios para el tesnet
  onToggleDropdown, onXpubChange, onPathChange, onLabelChange, onClear,
}: CardProps) {
  const hasXpub = entry.xpub.length > 0;
  const hasError = hasXpub && !entry.isValid;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3 transition-all",
        entry.isValid
          ? "border-emerald-800/60 bg-emerald-950/20"
          : hasError
          ? "border-red-800/60 bg-red-950/10"
          : "border-zinc-800 bg-zinc-900/50"
      )}
    >
      {/* Fila superior: índice + label + estado */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className={cn(
            "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 text-sm sm:text-base",
            entry.isValid ? "bg-emerald-500/20" : "bg-zinc-800"
          )}
        >
          {entry.isValid ? (
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
          ) : (
            <HardDrive className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-500" />
          )}
        </div>
        <input
          className="flex-1 bg-transparent text-xs sm:text-sm font-medium text-white placeholder:text-zinc-600 outline-none"
          value={entry.label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder={`Dispositivo ${index + 1}`}
        />
        {hasXpub && (
          <button onClick={onClear} className="text-zinc-600 hover:text-red-400 transition-colors shrink-0">
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        )}
      </div>

      {/* XPUB textarea */}
      <textarea
        rows={2}
        spellCheck={false}
        className={cn(
          "w-full rounded-lg border px-3 py-2 text-xs font-mono bg-zinc-950 text-zinc-300",
          "placeholder:text-zinc-700 outline-none resize-none transition-colors",
          hasError
            ? "border-red-700 focus:border-red-500"
            : entry.isValid
            ? "border-emerald-800 focus:border-emerald-600"
            : "border-zinc-800 focus:border-orange-500/60"
        )}
        value={entry.xpub}
        onChange={(e) => onXpubChange(e.target.value)}
        placeholder="xpub6... o zpub..."
      />

      {/* Error message */}
      {hasError && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          XPUB no válido — verifica que sea para la red correcta
        </p>
      )}

      {/* Fila inferior: fingerprint + derivation path */}
      <div className="flex items-center gap-3">
        {/* Fingerprint (readonly) */}
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono">
            Fingerprint
          </label>
          <div className="mt-1 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400 h-7 flex items-center">
            {entry.fingerprint || (
              <span className="text-zinc-700">——————</span>
            )}
          </div>
        </div>

        {/* Derivation path selector */}
        <div className="flex-1 relative">
          <label className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono">
            Ruta de Derivación
          </label>
          <button
            onClick={onToggleDropdown}
            className={cn(
              "mt-1 w-full px-2 py-1 rounded-md border text-xs font-mono text-left",
              "flex items-center justify-between h-7 transition-colors",
              showPathDropdown
                ? "border-orange-500/60 bg-zinc-900 text-orange-400"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
            )}
          >
            <span className="truncate">{entry.derivationPath || "Seleccionar"}</span>
            <ChevronDown className="w-3 h-3 shrink-0 ml-1" />
          </button>

          {showPathDropdown && (
            <div className="absolute z-50 top-full mt-1 left-0 w-64 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
              {Object.entries(network === "testnet" ? TESTNET_PATHS : STANDARD_PATHS).map(([label, path]) => ( // Cambios para tesnet
                <button
                  key={path}
                  onClick={() => onPathChange(path)}
                  className="w-full px-4 py-3 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0"
                >
                  <div className="text-xs font-medium text-zinc-300">{label}</div>
                  <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{path}</div>
                </button>
              ))}
              {/* Path personalizado */}
              <div className="px-3 py-2 border-t border-zinc-800">
                <input
                  className="w-full bg-transparent text-xs font-mono text-zinc-400 outline-none placeholder:text-zinc-700"
                  placeholder="m/48'/0'/0'/2' personalizado"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onPathChange(e.currentTarget.value);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Badge válido */}
      {entry.isValid && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
          {truncateXpub(entry.xpub)} · Profundidad {
            parseXpub(entry.xpub).depth
          }
        </div>
      )}
    </div>
  );
}
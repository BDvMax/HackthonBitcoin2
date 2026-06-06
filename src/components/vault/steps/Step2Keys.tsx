"use client";

import { useState, useCallback, useRef } from "react";
import type { VaultConfig, XpubEntry } from "@/lib/types/vault";
import {
  parseXpub,
  validateDerivationPath,
  truncateXpub,
  STANDARD_PATHS,
} from "@/lib/bitcoin/xpub";
import { parseSparrowFile } from "@/lib/bitcoin/sparrow";
import { cn } from "@/lib/utils";
import { Check, AlertCircle, ChevronDown, Trash2, HardDrive, Upload } from "lucide-react";

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
  const [showPathDropdown, setShowPathDropdown] = useState<string | null>(null);
  const [importError, setImportError] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const entries: XpubEntry[] = Array.from({ length: totalDevices }, (_, i) =>
    keys[i] ?? EMPTY_KEY(i)
  );

  const updateEntry = useCallback(
    (id: string, patch: Partial<XpubEntry>) => {
      const updated = entries.map((e) => (e.id === id ? { ...e, ...patch } : e));
      onChange({ keys: updated });
    },
    [entries, onChange]
  );

  const handleXpubChange = (id: string, raw: string) => {
    const parsed = parseXpub(raw, network);
    const entry = entries.find((e) => e.id === id);
    const validPath = validateDerivationPath(entry?.derivationPath ?? "");
    updateEntry(id, {
      xpub: raw,
      fingerprint: parsed.fingerprint,
      isValid: parsed.isValid && validPath,
    });
  };

  const handlePathChange = (id: string, path: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    const valid = parseXpub(entry.xpub, network).isValid && validateDerivationPath(path);
    updateEntry(id, { derivationPath: path, isValid: valid });
    setShowPathDropdown(null);
  };

  const handleSparrowImport = (file: File) => {
    setImportError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseSparrowFile(content);

      if (result.error) {
        setImportError(result.error);
        return;
      }

      if (result.keys.length === 0) {
        setImportError("No se encontraron llaves en el archivo");
        return;
      }

      const newTotal = result.totalDevices ?? totalDevices;
      const merged = Array.from({ length: newTotal }, (_, i) =>
        result.keys[i]
          ? { ...result.keys[i], id: entries[i]?.id ?? crypto.randomUUID() }
          : entries[i] ?? EMPTY_KEY(i)
      );

      onChange({
        keys: merged,
        totalDevices: newTotal,
        ...(result.requiredApprovals && { requiredApprovals: result.requiredApprovals }),
      });
    };
    reader.readAsText(file);
  };

  const validCount = entries.filter((e) => e.isValid).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Vincula tus dispositivos</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Importa la llave pública extendida (XPUB/ZPUB) de cada dispositivo.
        </p>
      </div>

      {/* Import Sparrow */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleSparrowImport(file);
        }}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "flex items-center gap-3 rounded-xl border border-dashed border-zinc-700",
          "bg-zinc-900/30 px-4 py-3 cursor-pointer hover:border-orange-500/40",
          "hover:bg-orange-500/5 transition-all group"
        )}
      >
        <Upload className="w-4 h-4 text-zinc-600 group-hover:text-orange-400 transition-colors shrink-0" />
        <div>
          <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
            Importar configuración desde Sparrow
          </span>
          <p className="text-xs text-zinc-600 mt-0.5">
            Arrastra wallet.json o descriptor.txt · Autocompleta todas las tarjetas
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleSparrowImport(file);
            e.target.value = "";
          }}
        />
      </div>

      {importError && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {importError}
        </p>
      )}

      {/* Progreso */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${(validCount / totalDevices) * 100}%` }}
          />
        </div>
        <span className="text-xs font-mono text-zinc-400">
          {validCount}/{totalDevices} verificados
        </span>
      </div>

      {/* Tarjetas */}
      <div className="space-y-4">
        {entries.map((entry, i) => (
          <DeviceKeyCard
            key={entry.id}
            entry={entry}
            index={i}
            network={network}
            showPathDropdown={showPathDropdown === entry.id}
            onToggleDropdown={() =>
              setShowPathDropdown((prev) => (prev === entry.id ? null : entry.id))
            }
            onXpubChange={(v) => handleXpubChange(entry.id, v)}
            onPathChange={(p) => handlePathChange(entry.id, p)}
            onLabelChange={(l) => updateEntry(entry.id, { label: l })}
            onClear={() =>
              onChange({ keys: entries.map((e) => (e.id === entry.id ? EMPTY_KEY(i) : e)) })
            }
          />
        ))}
      </div>
    </div>
  );
}

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
  entry, index, network, showPathDropdown,
  onToggleDropdown, onXpubChange, onPathChange, onLabelChange, onClear,
}: CardProps) {
  const hasXpub = entry.xpub.length > 0;
  const hasError = hasXpub && !entry.isValid;

  return (
    <div className={cn(
      "rounded-xl border p-4 space-y-3 transition-all",
      entry.isValid
        ? "border-emerald-800/60 bg-emerald-950/20"
        : hasError
        ? "border-red-800/60 bg-red-950/10"
        : "border-zinc-800 bg-zinc-900/50"
    )}>
      {/* Fila superior */}
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          entry.isValid ? "bg-emerald-500/20" : "bg-zinc-800"
        )}>
          {entry.isValid
            ? <Check className="w-4 h-4 text-emerald-400" />
            : <HardDrive className="w-4 h-4 text-zinc-500" />
          }
        </div>
        <input
          className="flex-1 bg-transparent text-sm font-medium text-white placeholder:text-zinc-600 outline-none"
          value={entry.label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder={`Dispositivo ${index + 1}`}
        />
        {hasXpub && (
          <button onClick={onClear} className="text-zinc-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* XPUB */}
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

      {hasError && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          XPUB no válido — verifica que sea para la red correcta
        </p>
      )}

      {/* Fingerprint + path */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono">
            Fingerprint
          </label>
          <div className="mt-1 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400 h-7 flex items-center">
            {entry.fingerprint || <span className="text-zinc-700">——————</span>}
          </div>
        </div>

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
              {Object.entries(STANDARD_PATHS).map(([label, path]) => (
                <button
                  key={path}
                  onClick={() => onPathChange(path)}
                  className="w-full px-4 py-3 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0"
                >
                  <div className="text-xs font-medium text-zinc-300">{label}</div>
                  <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{path}</div>
                </button>
              ))}
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
          {truncateXpub(entry.xpub)} · Profundidad {parseXpub(entry.xpub).depth}
        </div>
      )}
    </div>
  );
}
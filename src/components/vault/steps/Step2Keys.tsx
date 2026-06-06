"use client";

import { useState, useCallback } from "react";
import type { VaultConfig, XpubEntry } from "@/lib/types/vault";
import { useWallet } from "@/context/WalletContext";
import {
  parseXpub,
  validateDerivationPath,
  truncateXpub,
  STANDARD_PATHS,
  TESTNET_PATHS,
} from "@/lib/bitcoin/xpub";
import { cn } from "@/lib/utils";
import { AlertCircle, ChevronDown, Trash2, Smartphone, Laptop, Settings, Sparkles, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Term } from "@/components/ui/Term";

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
  deviceType: "laptop",
});

const TEST_KEYS = [
  {
    xpub: "tpubD6NzVbkrYhZ4XvtwtJAAVNFzGVq1K889Na8wnLddjVFgRmTXroMotMvMNmL2ddAXoEMcSox9Jr5uzqu8vvGPMq8UfQ9xXpVZKRwadPJWVZD",
    fingerprint: "00000000",
    derivationPath: "m/48'/1'/0'/2'"
  },
  {
    xpub: "tpubD6NzVbkrYhZ4Xq2ArdoixK1nWTiY7jmXA5nYPCosK7mAE5YThnejXwa7wE1pmMzFBc75Rm55EAFdcwXnCmWiNafeBtYy1MRnczRUcWjpK3Z",
    fingerprint: "00000000",
    derivationPath: "m/48'/1'/0'/2'"
  },
  {
    xpub: "tpubD6NzVbkrYhZ4XyJPQdsbmficgimFGSZa1a331bRtdNyqKecyFDXaHSSeFmDqNWMNT186NsZ1r3juvSkHWXRPU5jSBr8orMuDt7Rpo2ocCsQ",
    fingerprint: "00000000",
    derivationPath: "m/48'/1'/0'/2'"
  }
];

export function Step2Keys({ config, onChange }: Props) {
  const { totalDevices, keys, network } = config;
  const { experienceLevel } = useWallet();

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
    });
  };

  const handlePathChange = (id: string, path: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    const valid = parseXpub(entry.xpub, network).isValid && validateDerivationPath(path);
    updateEntry(id, { derivationPath: path, isValid: valid });
    setShowPathDropdown(null);
  };

  const loadTestKey = (id: string, index: number) => {
    const testKey = TEST_KEYS[index % TEST_KEYS.length];
    const parsed = parseXpub(testKey.xpub, network);
    updateEntry(id, {
      xpub: testKey.xpub,
      fingerprint: parsed.fingerprint || testKey.fingerprint,
      derivationPath: testKey.derivationPath,
      isValid: parsed.isValid
    });
  };

  const validCount = entries.filter((e) => e.isValid).length;

  return (
    <div className="space-y-6 transition-all duration-300">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">
          {experienceLevel === "beginner" ? "Registra tus dispositivos" : "Vincula tus llaves criptográficas"}
        </h2>
        <p className="text-sm text-zinc-400 mt-2">
          {experienceLevel === "beginner" ? (
            "Conecta tus llaves. Pega el código de lectura de cada dispositivo para continuar."
          ) : (
            <span>
              Importa la <Term name="xpub" /> de cada dispositivo para tu bóveda multisig.
            </span>
          )}
        </p>
      </div>

      {/* Progreso */}
      <div className="flex items-center gap-3 bg-zinc-900/20 p-3 rounded-xl border border-zinc-900">
        <div className="flex-1 h-2 rounded-full bg-zinc-850 overflow-hidden">
          <div
            className="h-full bg-[#6366f1] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(validCount / totalDevices) * 100}%` }}
          />
        </div>
        <span className="text-xs font-mono text-zinc-400 font-bold shrink-0">
          {validCount} de {totalDevices} listos
        </span>
      </div>

      {/* Tarjetas de dispositivo */}
      <div className="space-y-4">
        {entries.map((entry, i) => (
          <DeviceKeyCard
            key={entry.id}
            entry={entry}
            index={i}
            network={network}
            experienceLevel={experienceLevel}
            showPathDropdown={showPathDropdown === entry.id}
            onToggleDropdown={() =>
              setShowPathDropdown((prev) =>
                prev === entry.id ? null : entry.id
              )
            }
            onXpubChange={(v) => handleXpubChange(entry.id, v)}
            onPathChange={(p) => handlePathChange(entry.id, p)}
            onLabelChange={(l) => updateEntry(entry.id, { label: l })}
            onTypeChange={(t) => updateEntry(entry.id, { deviceType: t, label: t === "mobile" ? "Billetera Celular" : "Billetera Laptop" })}
            onClear={() =>
              onChange({
                keys: entries.map((e) =>
                  e.id === entry.id ? EMPTY_KEY(i) : e
                ),
              })
            }
            onLoadTestKey={() => loadTestKey(entry.id, i)}
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
  experienceLevel: "beginner" | "intermediate" | "advanced";
  showPathDropdown: boolean;
  onToggleDropdown: () => void;
  onXpubChange: (v: string) => void;
  onPathChange: (p: string) => void;
  onLabelChange: (l: string) => void;
  onTypeChange: (t: "mobile" | "laptop") => void;
  onClear: () => void;
  onLoadTestKey: () => void;
}

function DeviceKeyCard({
  entry, index, showPathDropdown, network, experienceLevel,
  onToggleDropdown, onXpubChange, onPathChange, onLabelChange, onTypeChange, onClear, onLoadTestKey
}: CardProps) {
  const [showAdvanced, setShowAdvanced] = useState(experienceLevel !== "beginner");
  const [showHelp, setShowHelp] = useState(false);
  const hasXpub = entry.xpub.length > 0;
  const hasError = hasXpub && !entry.isValid;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border flex flex-col md:flex-row items-stretch transition-all duration-300 ease-in-out",
        entry.isValid
          ? "border-emerald-800/40 bg-emerald-950/5"
          : hasError
          ? "border-red-800/40 bg-red-950/5"
          : "border-[#1e2640] bg-[#121626]/40"
      )}
    >
      {/* Contenido Principal (Lado Izquierdo) */}
      <div className="flex-1 p-4 space-y-3">
        {/* Fila superior: dispositivo selector + label */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => onTypeChange("mobile")}
              className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300", entry.deviceType === "mobile" ? "bg-[#6366f1] text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300")}
              title="Billetera Celular"
            >
              <Smartphone className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => onTypeChange("laptop")}
              className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300", entry.deviceType === "laptop" ? "bg-[#6366f1] text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300")}
              title="Billetera Laptop"
            >
              <Laptop className="w-4.5 h-4.5" />
            </button>
          </div>

          <input
            className="flex-1 bg-transparent text-base font-semibold text-white placeholder:text-zinc-700 outline-none ml-2 border-b border-transparent hover:border-zinc-850 focus:border-[#6366f1]/50 py-0.5 transition-all duration-200"
            value={entry.label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder={entry.deviceType === "mobile" ? "Billetera Celular" : "Billetera Laptop"}
          />

          <div className="flex items-center gap-2">
            {!hasXpub && (
              <button
                onClick={onLoadTestKey}
                className="text-xs text-zinc-300 hover:text-white flex items-center gap-1 bg-[#1c223a] px-2.5 py-1.5 rounded-lg border border-[#2c3558] transition-all duration-300 font-medium"
                title="Cargar una llave válida ficticia de prueba"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#818cf8]" />
                Prueba
              </button>
            )}
            {hasXpub && (
              <button onClick={onClear} className="text-zinc-500 hover:text-red-400 p-1.5 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Input de Llave */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-zinc-400 uppercase tracking-wider font-mono font-bold">
              <Term name="xpub" />
            </label>
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className={cn("text-zinc-500 hover:text-[#818cf8] transition-colors p-0.5 rounded", showHelp && "text-[#818cf8]")}
              title="¿Cómo obtengo esta llave?"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          <textarea
            rows={2}
            spellCheck={false}
            className={cn(
              "w-full rounded-lg border px-3 py-2 text-xs font-mono bg-zinc-950 text-zinc-350",
              "placeholder:text-zinc-700 outline-none resize-none transition-all duration-300",
              hasError
                ? "border-red-750 focus:border-red-500"
                : entry.isValid
                ? "border-emerald-850 focus:border-emerald-600"
                : "border-zinc-850 focus:border-[#6366f1]/60"
            )}
            value={entry.xpub}
            onChange={(e) => onXpubChange(e.target.value)}
            placeholder={experienceLevel === "beginner" ? "Pega el código de tu dispositivo aquí..." : "xpub6... o zpub..."}
          />
        </div>

        {/* Mensaje de error */}
        {hasError && (
          <p className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Código no válido. Asegúrate de copiarlo completo.
          </p>
        )}

        {/* Detalles avanzados */}
        {experienceLevel === "beginner" ? (
          <div className="pt-1">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-500" />
              {showAdvanced ? "Ocultar ajustes técnicos" : "Ajustes técnicos de la llave"}
            </button>
          </div>
        ) : null}

        {showAdvanced && (
          <div className="flex gap-4 pt-2 border-t border-[#1b223a] transition-all duration-300">
            {/* Fingerprint */}
            <div className="flex-1">
              <span className="text-xs uppercase tracking-wider text-zinc-500 font-mono block mb-1">
                <Term name="fingerprint" />
              </span>
              <div className="px-2 py-1 rounded bg-zinc-950 border border-zinc-850 text-xs font-mono text-zinc-400 h-8 flex items-center">
                {entry.fingerprint || <span className="text-zinc-800">--------</span>}
              </div>
            </div>

            {/* Derivation Path */}
            <div className="flex-1 relative">
              <span className="text-xs uppercase tracking-wider text-zinc-500 font-mono block mb-1">
                <Term name="derivation" />
              </span>
              <button
                onClick={onToggleDropdown}
                className={cn(
                  "w-full px-2 py-1 rounded border text-xs font-mono text-left",
                  "flex items-center justify-between h-8 transition-all duration-300 bg-zinc-950",
                  showPathDropdown
                    ? "border-[#6366f1]/60 text-[#818cf8]"
                    : "border-zinc-850 text-zinc-400 hover:border-zinc-700"
                )}
              >
                <span className="truncate">{entry.derivationPath}</span>
                <ChevronDown className="w-3 h-3 shrink-0 ml-1" />
              </button>

              {showPathDropdown && (
                <div className="absolute z-50 bottom-full mb-1 left-0 w-full rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden transition-all duration-300">
                  {Object.entries(network === "testnet" ? TESTNET_PATHS : STANDARD_PATHS).map(([label, path]) => (
                    <button
                      key={path}
                      onClick={() => onPathChange(path)}
                      className="w-full px-3 py-2 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-850 last:border-0"
                    >
                      <div className="text-xs font-bold text-zinc-300">{label}</div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{path}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Badge válido */}
        {entry.isValid && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span>Listo · {truncateXpub(entry.xpub)}</span>
          </div>
        )}
      </div>

      {/* Panel de Ayuda Desplegable Lateral (Costado Derecho) */}
      {showHelp && (
        <div className="w-full md:w-60 border-t md:border-t-0 md:border-l border-[#1e2640] bg-[#0d101d] p-4 flex flex-col justify-between animate-slideLeft transition-all duration-300 shrink-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-[#818cf8]">Instrucciones</h4>
              <button onClick={() => setShowHelp(false)} className="text-zinc-500 hover:text-white p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {entry.deviceType === "mobile" ? (
                "Abre tu app (ej: BlueWallet) → Ajustes → Mostrar Llave Pública (XPUB) y pégala aquí."
              ) : (
                "Abre tu software (ej: Sparrow) → Configuración → Wallet Info → copia la XPUB y pégala aquí."
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
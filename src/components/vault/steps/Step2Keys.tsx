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
import { AlertCircle, ChevronDown, Trash2, Smartphone, Laptop, Settings, Sparkles, HelpCircle, Cpu } from "lucide-react";
import { Term } from "@/components/ui/Term";
import { useSoundEffects } from "@/hooks/useSoundEffects";

interface Props {
  config: VaultConfig;
  onChange: (p: Partial<VaultConfig>) => void;
}

const EMPTY_KEY = (index: number): XpubEntry => ({
  id: crypto.randomUUID(),
  label: "",
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
  const { playClick, playSuccess, playError } = useSoundEffects();

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
    playSuccess();
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
        <h2 className="text-3xl font-extrabold text-white">
          {experienceLevel === "beginner" ? "Registra tus dispositivos" : "Vincula tus llaves criptográficas"}
        </h2>
        <p className="text-base text-zinc-400 mt-3 leading-relaxed">
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
      <div className="flex items-center gap-3 bg-zinc-900/20 p-3 rounded-none-none border border-zinc-900">
        <div className="flex-1 h-2.5 rounded-none-full bg-zinc-850 overflow-hidden">
          <div
            className="h-full bg-[#6366f1] rounded-none-full transition-all duration-500 ease-out"
            style={{ width: `${(validCount / totalDevices) * 100}%` }}
          />
        </div>
        <span className="text-sm font-mono text-zinc-400 font-bold shrink-0">
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
            onToggleDropdown={() => {
              playClick();
              setShowPathDropdown((prev) =>
                prev === entry.id ? null : entry.id
              );
            }}
            onXpubChange={(v) => handleXpubChange(entry.id, v)}
            onPathChange={(p) => handlePathChange(entry.id, p)}
            onLabelChange={(l) => updateEntry(entry.id, { label: l })}
            onTypeChange={(t) => updateEntry(entry.id, { deviceType: t })}
            onClear={() => {
              playError();
              updateEntry(entry.id, EMPTY_KEY(i));
            }}
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
  onTypeChange: (t: "mobile" | "laptop" | "trezor") => void;
  onClear: () => void;
  onLoadTestKey: () => void;
}

function DeviceKeyCard({
  entry, showPathDropdown, network, experienceLevel,
  onToggleDropdown, onXpubChange, onPathChange, onLabelChange, onTypeChange, onClear, onLoadTestKey
}: CardProps) {
  const { setActiveHelp, activeHelp } = useWallet();
  const [showAdvanced, setShowAdvanced] = useState(experienceLevel !== "beginner");
  const hasXpub = entry.xpub.length > 0;
  const hasError = hasXpub && !entry.isValid;

  const helpTitle = `Ayuda: ${entry.label || "Identificar Dispositivo"}`;
  const isHelpActive = activeHelp?.title === helpTitle;

  const handleHelpEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const text = entry.deviceType === "mobile"
      ? "Abre tu app en el teléfono (ej: BlueWallet). Ve a Ajustes, luego selecciona Mostrar Llave Pública (XPUB) y copia el código completo para pegarlo aquí."
      : entry.deviceType === "trezor"
      ? "Abre Trezor Suite. Ve a las configuraciones de tu cuenta, selecciona 'Mostrar llaves públicas' (XPUB) y cópialo."
      : entry.deviceType === "coldcard"
      ? "En tu Coldcard, ve a Advanced > MicroSD Card > Export Wallet > Electrum Wallet. Esto guardará un archivo JSON con tu XPUB."
      : "Copia la llave pública extendida (XPUB/ZPUB) desde el software de tu billetera o directamente desde tu dispositivo.";

    setActiveHelp({
      title: helpTitle,
      text,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleHelpLeave = () => {
    setActiveHelp(null);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-none-none border flex flex-col md:flex-row items-stretch transition-all duration-300 ease-in-out",
        entry.isValid
          ? "border-emerald-805/40 bg-emerald-955/5"
          : hasError
          ? "border-red-805/40 bg-red-955/5"
          : "border-[#1e2640] bg-[#121626]/40"
      )}
    >
      {/* Contenido Principal */}
      <div className="flex-1 p-6 space-y-4">
        {/* Fila superior: dispositivo selector + label */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => onTypeChange("mobile")}
              className={cn("w-11 h-11 rounded-none-none flex items-center justify-center transition-all duration-300 border", entry.deviceType === "mobile" ? "bg-[#6366f1] text-white border-transparent" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300")}
              title="Billetera Celular"
            >
              <Smartphone className="w-5.5 h-5.5" />
            </button>
            <button
              onClick={() => onTypeChange("laptop")}
              className={cn("w-11 h-11 rounded-none-none flex items-center justify-center transition-all duration-300 border", entry.deviceType === "laptop" ? "bg-[#6366f1] text-white border-transparent" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300")}
              title="Billetera Laptop"
            >
              <Laptop className="w-5.5 h-5.5" />
            </button>
            <button
              onClick={() => onTypeChange("trezor")}
              className={cn("w-11 h-11 rounded-none-none flex items-center justify-center transition-all duration-300 border", entry.deviceType === "trezor" ? "bg-[#6366f1] text-white border-transparent" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300")}
              title="Trezor Hardware"
            >
              <Cpu className="w-5.5 h-5.5" />
            </button>
          </div>

          <input
            className="min-w-0 flex-1 bg-transparent text-lg font-bold text-white placeholder:text-zinc-600 outline-none sm:ml-2 border-b border-transparent hover:border-zinc-800 focus:border-[#6366f1]/50 py-0.5 transition-all duration-200"
            value={entry.label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder={
              entry.deviceType === "mobile"
                ? "Identificar llave (ej. Mi Celular)"
                : entry.deviceType === "trezor"
                ? "Identificar llave (ej. Mi Trezor)"
                : "Identificar llave (ej. Mi Laptop)"
            }
          />

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {!hasXpub && (
              <button
                onClick={onLoadTestKey}
                className="text-sm text-zinc-300 hover:text-white flex items-center gap-1.5 bg-[#1c223a] px-3 py-2 rounded-none-none border border-[#2c3558] transition-all duration-300 font-semibold"
                title="Cargar una llave de prueba"
              >
                <Sparkles className="w-4 h-4 text-[#818cf8]" />
                Prueba
              </button>
            )}
            {hasXpub && (
              <button onClick={onClear} className="text-zinc-500 hover:text-red-400 p-2 transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Input de Llave */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <label className="text-sm text-zinc-400 uppercase tracking-wider font-mono font-bold block">
              <Term name="xpub" />
            </label>
            <button
              type="button"
              onMouseEnter={handleHelpEnter}
              onMouseLeave={handleHelpLeave}
              className={cn("text-zinc-500 hover:text-[#818cf8] transition-colors p-0.5 rounded-none", isHelpActive && "text-[#818cf8]")}
              title="¿Cómo obtengo esta llave?"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>

          <textarea
            rows={3}
            spellCheck={false}
            className={cn(
              "w-full rounded-none-none border px-4 py-2.5 text-sm font-mono bg-zinc-950 text-zinc-300",
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
          <p className="flex items-center gap-1.5 text-sm text-red-400 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Código no válido. Asegúrate de copiarlo completo.
          </p>
        )}

        {/* Detalles avanzados */}
        {experienceLevel === "beginner" ? (
          <div className="pt-1">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-zinc-455 hover:text-zinc-200 flex items-center gap-1 transition-colors font-medium"
            >
              <Settings className="w-4 h-4 text-zinc-500" />
              {showAdvanced ? "Ocultar ajustes técnicos" : "Ajustes técnicos de la llave"}
            </button>
          </div>
        ) : null}

        {showAdvanced && (
          <div className="grid grid-cols-1 gap-4 pt-3 border-t border-[#1b223a] transition-all duration-300 sm:grid-cols-2">
            {/* Fingerprint */}
            <div className="flex-1">
              <span className="text-xs uppercase tracking-wider text-zinc-550 font-mono block mb-1 font-bold">
                <Term name="fingerprint" />
              </span>
              <div className="px-3 py-1.5 rounded-none bg-zinc-950 border border-zinc-850 text-sm font-mono text-zinc-400 h-10 flex items-center">
                {entry.fingerprint || <span className="text-zinc-805">--------</span>}
              </div>
            </div>

            {/* Derivation Path */}
            <div className="flex-1 relative">
              <span className="text-xs uppercase tracking-wider text-zinc-550 font-mono block mb-1 font-bold">
                <Term name="derivation" />
              </span>
              <button
                onClick={onToggleDropdown}
                className={cn(
                  "w-full px-3 py-1.5 rounded-none border text-sm font-mono text-left",
                  "flex items-center justify-between h-10 transition-all duration-300 bg-zinc-950",
                  showPathDropdown
                    ? "border-[#6366f1]/60 text-[#818cf8]"
                    : "border-zinc-855 text-zinc-400 hover:border-zinc-700"
                )}
              >
                <span className="truncate">{entry.derivationPath}</span>
                <ChevronDown className="w-4 h-4 shrink-0 ml-1" />
              </button>

              {showPathDropdown && (
                <div className="absolute z-50 bottom-full mb-1 left-0 w-full rounded-none-none border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden transition-all duration-300">
                  {Object.entries(network === "testnet" ? TESTNET_PATHS : STANDARD_PATHS).map(([label, path]) => (
                    <button
                      key={path}
                      onClick={() => onPathChange(path)}
                      className="w-full px-3 py-2 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-855 last:border-0"
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
          <div className="flex items-center gap-1.5 text-sm text-emerald-400 font-semibold">
            <span>Listo · {truncateXpub(entry.xpub)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

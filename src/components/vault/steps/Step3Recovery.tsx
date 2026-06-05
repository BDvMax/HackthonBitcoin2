"use client";

import { useState } from "react";
import type { VaultConfig, TimelockConfig, XpubEntry } from "@/lib/types/vault";
import { blocksToHuman } from "@/lib/bitcoin/timelock";
import { parseXpub, validateDerivationPath, STANDARD_PATHS } from "@/lib/bitcoin/xpub";
import { cn } from "@/lib/utils";
import {
  Shield, Users, UserPlus, ChevronDown,
  AlertCircle, Check, HardDrive, AlertTriangle, Info,
} from "lucide-react";

interface Props {
  config: VaultConfig;
  onChange: (p: Partial<VaultConfig>) => void;
}

const PERIOD_PRESETS = [
  { label: "3 meses", blocks: 12960  },
  { label: "6 meses", blocks: 25920  },
  { label: "1 año",   blocks: 52560  },
  { label: "2 años",  blocks: 105120 },
];

const EMPTY_TRUSTED_KEY = (): XpubEntry => ({
  id: crypto.randomUUID(),
  label: "Persona de confianza",
  xpub: "",
  fingerprint: "",
  derivationPath: "m/48'/0'/0'/2'",
  isValid: false,
});

export function Step3Recovery({ config, onChange }: Props) {
  const { timelock, requiredApprovals, totalDevices } = config;
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = (patch: Partial<TimelockConfig>) =>
    onChange({ timelock: { ...timelock, ...patch } });

  const maxRecoveryApprovals = Math.max(1, requiredApprovals - 1);
  const sliderHasRange = maxRecoveryApprovals > 1;
  // El paso 3 está completo si eligieron modo
  const step3Complete =
    timelock.recoveryMode === "current-keys" ||
    (timelock.recoveryMode === "trusted-person" && !!timelock.trustedKey?.isValid);

  const handleTrustedXpub = (raw: string) => {
    const parsed = parseXpub(raw, config.network);
    const currentPath = timelock.trustedKey?.derivationPath ?? "m/48'/0'/0'/2'";
    update({
      trustedKey: {
        ...(timelock.trustedKey ?? EMPTY_TRUSTED_KEY()),
        xpub: raw,
        fingerprint: parsed.fingerprint,
        isValid: parsed.isValid && validateDerivationPath(currentPath),
      },
    });
  };

  const handleTrustedPath = (path: string) => {
    if (!timelock.trustedKey) return;
    const valid =
      parseXpub(timelock.trustedKey.xpub, config.network).isValid &&
      validateDerivationPath(path);
    update({ trustedKey: { ...timelock.trustedKey, derivationPath: path, isValid: valid } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Plan de Recuperación</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Define qué pasa con tus fondos si tu bóveda lleva mucho tiempo sin actividad.
        </p>
      </div>

      {/* Toggle principal */}
      <button
        onClick={() => update({ enabled: !timelock.enabled })}
        className={cn(
          "w-full flex items-center justify-between rounded-xl border p-4 transition-all text-left",
          timelock.enabled
            ? "border-orange-500/40 bg-orange-500/5"
            : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            timelock.enabled ? "bg-orange-500/20" : "bg-zinc-800"
          )}>
            <Shield className={cn("w-4 h-4", timelock.enabled ? "text-orange-400" : "text-zinc-500")} />
          </div>
          <div>
            <div className="text-sm font-medium">Activar plan de recuperación</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Opcional · Recomendado para almacenamiento a largo plazo
            </div>
          </div>
        </div>
        <div className={cn(
          "w-10 h-6 rounded-full transition-all relative shrink-0",
          timelock.enabled ? "bg-orange-500" : "bg-zinc-700"
        )}>
          <div className={cn(
            "w-4 h-4 rounded-full bg-white absolute top-1 transition-all duration-200",
            timelock.enabled ? "left-5" : "left-1"
          )} />
        </div>
      </button>

      {timelock.enabled && (
        <div className="space-y-5">

          {/* PASO 1 — Período */}
          <Section index={1} title="¿Cuánto tiempo de inactividad activa el plan?">
            <div className="flex gap-2 flex-wrap">
              {PERIOD_PRESETS.map((p) => (
                <button
                  key={p.blocks}
                  onClick={() => update({ blocks: p.blocks })}
                  className={cn(
                    "px-4 py-2 rounded-lg border text-sm transition-all",
                    timelock.blocks === p.blocks
                      ? "border-orange-500 bg-orange-500/10 text-orange-400 font-medium"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-600 mt-2 font-mono">
              {timelock.blocks.toLocaleString()} bloques ·{" "}
              <span className="text-zinc-400">{blocksToHuman(timelock.blocks)}</span>
            </p>
          </Section>

          {/* PASO 2 — Quién */}
          <Section index={2} title="¿Quién puede recuperar los fondos después de ese tiempo?">
            <div className="grid grid-cols-2 gap-3">
              <ModeCard
                active={timelock.recoveryMode === "current-keys"}
                onClick={() => update({ recoveryMode: "current-keys", trustedKey: null })}
                icon={<Users className="w-5 h-5" />}
                title="Mis dispositivos actuales"
                description="Con menos firmas requeridas"
              />
              <ModeCard
                active={timelock.recoveryMode === "trusted-person"}
                onClick={() => update({
                  recoveryMode: "trusted-person",
                  trustedKey: timelock.trustedKey ?? EMPTY_TRUSTED_KEY(),
                })}
                icon={<UserPlus className="w-5 h-5" />}
                title="Persona de confianza"
                description="Abogado, familiar, heredero"
              />
            </div>

            {/* FIX 1: aviso si no han elegido nada aún */}
            {!timelock.recoveryMode && (
              <p className="flex items-center gap-1.5 text-xs text-amber-400 mt-2">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Elige una opción para continuar
              </p>
            )}
          </Section>

          {/* PASO 3 — Config específica */}
          {timelock.recoveryMode === "current-keys" && (
            <Section index={3} title="¿Cuántas firmas se necesitarán para recuperar?">
              {/* FIX 2: slider condicional */}
              {sliderHasRange ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Firmas de recuperación</span>
                    <span className="font-mono text-orange-400 font-bold text-lg">
                      {timelock.recoveryApprovals}
                      <span className="text-zinc-600 text-sm font-normal"> de {totalDevices}</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={maxRecoveryApprovals}
                    step={1}
                    value={timelock.recoveryApprovals}
                    onChange={(e) => update({ recoveryApprovals: Number(e.target.value) })}
                    className="w-full accent-orange-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-700 font-mono">
                    <span>1 firma</span>
                    <span>{maxRecoveryApprovals} firmas</span>
                  </div>
                </div>
              ) : (
                // Texto estático cuando solo hay una opción posible
                <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                    <span className="text-orange-400 font-bold font-mono">1</span>
                  </div>
                  <div className="text-sm text-zinc-300">
                    Con <span className="text-white font-medium">cualquiera de tus {totalDevices} dispositivos</span> podrás
                    recuperar los fondos tras el período de inactividad.
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-400 mt-3">
                Hoy necesitas{" "}
                <span className="text-white font-medium">{requiredApprovals} firmas</span>.
                Tras <span className="text-white">{blocksToHuman(timelock.blocks)}</span> de
                inactividad, solo necesitarás{" "}
                <span className="text-orange-400 font-medium">
                  {sliderHasRange ? timelock.recoveryApprovals : 1} firma
                  {(sliderHasRange ? timelock.recoveryApprovals : 1) > 1 ? "s" : ""}
                </span>.
              </div>
            </Section>
          )}

          {timelock.recoveryMode === "trusted-person" && (
            <Section index={3} title="Llave de la persona de confianza">
              <TrustedKeyInput
                entry={timelock.trustedKey}
                network={config.network}
                onXpubChange={handleTrustedXpub}
                onPathChange={handleTrustedPath}
                onLabelChange={(label) =>
                  update({ trustedKey: { ...timelock.trustedKey!, label } })
                }
              />
              {timelock.trustedKey?.isValid && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-400 mt-2">
                  Tras <span className="text-white">{blocksToHuman(timelock.blocks)}</span> de
                  inactividad,{" "}
                  <span className="text-orange-400 font-medium">
                    {timelock.trustedKey.label}
                  </span>{" "}
                  podrá mover los fondos por su cuenta.
                </div>
              )}
            </Section>
          )}

          {/* Configuración avanzada */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <ChevronDown className={cn(
              "w-3.5 h-3.5 transition-transform duration-200",
              showAdvanced && "rotate-180"
            )} />
            Configuración avanzada
          </button>

          {showAdvanced && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-4">
              {/* FIX 3: tipo timelock con warning en absoluto */}
              <div>
                <label className="text-xs uppercase tracking-widest text-zinc-600 font-mono">
                  Tipo de timelock
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(["relative", "absolute"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => update({ type: t })}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-xs text-left transition-all",
                        timelock.type === t
                          ? "border-orange-500/40 bg-orange-500/5 text-orange-400"
                          : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      )}
                    >
                      <div className="font-medium">
                        {t === "relative" ? "Relativo" : "Absoluto"}
                      </div>
                      <div className="text-zinc-600 mt-0.5">
                        {t === "relative" ? "BIP68 · desde última tx" : "BIP65 · altura fija"}
                      </div>
                    </button>
                  ))}
                </div>

                {timelock.type === "absolute" && (
                  <div className="flex gap-2 mt-3 rounded-lg border border-amber-800/40 bg-amber-950/20 p-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300/80 leading-relaxed">
                      <span className="font-medium text-amber-300">Advertencia:</span> Un timelock
                      absoluto expira en una altura de bloque fija y no se puede renovar sin gastar
                      primero. Si no actúas antes de esa altura, la ruta de recuperación quedará
                      permanentemente activa. Usa relativo salvo que sepas exactamente lo que haces.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-zinc-600 font-mono">
                  Bloques exactos
                </label>
                <input
                  type="number"
                  min={1008}
                  max={105120}
                  value={timelock.blocks}
                  onChange={(e) => update({ blocks: Number(e.target.value) })}
                  className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-mono text-zinc-300 outline-none focus:border-orange-500/60 transition-colors"
                />
              </div>
            </div>
          )}

          {/* FIX 1: indicador de completitud al fondo */}
          {!step3Complete && timelock.recoveryMode && (
            <p className="flex items-center gap-1.5 text-xs text-amber-400">
              <Info className="w-3.5 h-3.5 shrink-0" />
              {timelock.recoveryMode === "trusted-person"
                ? "Añade el XPUB de tu persona de confianza para continuar"
                : "Selecciona quién puede recuperar los fondos"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Subcomponentes ─────────────────────────────────────────────────────── */

function Section({ index, title, children }: {
  index: number; title: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-mono text-zinc-400">{index}</span>
        </div>
        <span className="text-sm font-medium text-zinc-200">{title}</span>
      </div>
      <div className="pl-7">{children}</div>
    </div>
  );
}

function ModeCard({ active, onClick, icon, title, description }: {
  active: boolean; onClick: () => void;
  icon: React.ReactNode; title: string; description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-all space-y-2 w-full",
        active
          ? "border-orange-500/40 bg-orange-500/5"
          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center",
        active ? "bg-orange-500/20 text-orange-400" : "bg-zinc-800 text-zinc-500"
      )}>
        {icon}
      </div>
      <div>
        <div className={cn("text-sm font-medium", active ? "text-white" : "text-zinc-300")}>
          {title}
        </div>
        <div className="text-xs text-zinc-500 mt-0.5">{description}</div>
      </div>
      {active && (
        <div className="flex items-center gap-1 text-[10px] text-orange-400 font-mono">
          <Check className="w-3 h-3" /> Seleccionado
        </div>
      )}
    </button>
  );
}

function TrustedKeyInput({ entry, network, onXpubChange, onPathChange, onLabelChange }: {
  entry: XpubEntry | null;
  network: "mainnet" | "testnet";
  onXpubChange: (v: string) => void;
  onPathChange: (p: string) => void;
  onLabelChange: (l: string) => void;
}) {
  const [showPathMenu, setShowPathMenu] = useState(false);
  const hasXpub = (entry?.xpub ?? "").length > 0;
  const hasError = hasXpub && !entry?.isValid;

  return (
    <div className={cn(
      "rounded-xl border p-4 space-y-3 transition-all",
      entry?.isValid
        ? "border-emerald-800/60 bg-emerald-950/20"
        : hasError
        ? "border-red-800/60 bg-red-950/10"
        : "border-zinc-800 bg-zinc-900/50"
    )}>
      <div className="flex items-center gap-2">
        <HardDrive className="w-4 h-4 text-zinc-500 shrink-0" />
        <input
          className="flex-1 bg-transparent text-sm font-medium text-white placeholder:text-zinc-600 outline-none"
          value={entry?.label ?? ""}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="Ej: Abogado, Cónyuge, Hermano..."
        />
        {entry?.isValid && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
      </div>

      <p className="text-xs text-zinc-600 leading-relaxed">
        Pide a tu contacto que exporte su XPUB desde su wallet
        (Sparrow → Wallet Info → XPUB).
      </p>

      <textarea
        rows={2}
        spellCheck={false}
        className={cn(
          "w-full rounded-lg border px-3 py-2 text-xs font-mono bg-zinc-950 text-zinc-300",
          "placeholder:text-zinc-700 outline-none resize-none transition-colors",
          hasError
            ? "border-red-700 focus:border-red-500"
            : entry?.isValid
            ? "border-emerald-800 focus:border-emerald-600"
            : "border-zinc-800 focus:border-orange-500/60"
        )}
        value={entry?.xpub ?? ""}
        onChange={(e) => onXpubChange(e.target.value)}
        placeholder="xpub6... o zpub..."
      />

      {hasError && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          XPUB no válido — verifica que sea para la red correcta
        </p>
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono">
            Fingerprint
          </label>
          <div className="mt-1 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400 h-7 flex items-center">
            {entry?.fingerprint || <span className="text-zinc-700">——————</span>}
          </div>
        </div>
        <div className="flex-1 relative">
          <label className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono">
            Ruta de derivación
          </label>
          <button
            onClick={() => setShowPathMenu((v) => !v)}
            className="mt-1 w-full px-2 py-1 rounded-md border border-zinc-800 bg-zinc-900 text-xs font-mono text-zinc-400 flex items-center justify-between h-7 hover:border-zinc-700 transition-colors"
          >
            <span className="truncate">{entry?.derivationPath ?? "Seleccionar"}</span>
            <ChevronDown className="w-3 h-3 shrink-0 ml-1" />
          </button>
          {showPathMenu && (
            <div className="absolute z-50 top-full mt-1 left-0 w-64 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
              {Object.entries(STANDARD_PATHS).map(([label, path]) => (
                <button
                  key={path}
                  onClick={() => { onPathChange(path); setShowPathMenu(false); }}
                  className="w-full px-4 py-3 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0"
                >
                  <div className="text-xs font-medium text-zinc-300">{label}</div>
                  <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{path}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
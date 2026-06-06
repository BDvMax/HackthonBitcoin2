"use client";

import { useState } from "react";
import type { VaultConfig, TimelockConfig, XpubEntry } from "@/lib/types/vault";
import { useWallet } from "@/context/WalletContext";
import { blocksToHuman } from "@/lib/bitcoin/timelock";
import { parseXpub, validateDerivationPath, STANDARD_PATHS } from "@/lib/bitcoin/xpub";
import { cn } from "@/lib/utils";
import {
  Shield, Users, UserPlus, ChevronDown,
  AlertTriangle, Info, Check, HardDrive, AlertCircle, Sparkles, Settings, HelpCircle, X
} from "lucide-react";
import { Term } from "@/components/ui/Term";

interface Props {
  config: VaultConfig;
  onChange: (p: Partial<VaultConfig>) => void;
}

const PERIOD_PRESETS = [
  { label: "3 meses", blocks: 12960  },
  { label: "6 meses", blocks: 25920  },
  { label: "1 año",   blocks: 52560  },
  { label: "15 meses", blocks: 64800 },
];

const EMPTY_TRUSTED_KEY = (): XpubEntry => ({
  id: crypto.randomUUID(),
  label: "Persona de confianza",
  xpub: "",
  fingerprint: "",
  derivationPath: "m/48'/0'/0'/2'",
  isValid: false,
});

const TEST_RECOVERY_KEY = {
  xpub: "tpubD6NzVbkrYhZ4Xh8kPocUiZaRzhSUZnW3fwhCWJiR6C2EfZkHptfsGan9PC7vfF7QbyW7PLAVYrrhoEZQWPbqdwQEehCyEmkSfQ7n2pbXCTw",
  fingerprint: "00000000",
  derivationPath: "m/48'/1'/0'/2'"
};

export function Step3Recovery({ config, onChange }: Props) {
  const { timelock, requiredApprovals, totalDevices } = config;
  const { experienceLevel } = useWallet();
  const [showAdvanced, setShowAdvanced] = useState(experienceLevel === "advanced");

  const update = (patch: Partial<TimelockConfig>) =>
    onChange({ timelock: { ...timelock, ...patch } });

  const maxRecoveryApprovals = Math.max(1, requiredApprovals - 1);
  const sliderHasRange = maxRecoveryApprovals > 1;

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

  const loadTestRecoveryKey = () => {
    const parsed = parseXpub(TEST_RECOVERY_KEY.xpub, config.network);
    update({
      trustedKey: {
        ...(timelock.trustedKey ?? EMPTY_TRUSTED_KEY()),
        xpub: TEST_RECOVERY_KEY.xpub,
        fingerprint: parsed.fingerprint || TEST_RECOVERY_KEY.fingerprint,
        derivationPath: TEST_RECOVERY_KEY.derivationPath,
        isValid: parsed.isValid,
      }
    });
  };

  return (
    <div className="space-y-6 transition-all duration-300">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">
          {experienceLevel === "beginner" ? "Seguro de Emergencia" : "Plan de Recuperación Criptográfica"}
        </h2>
        <p className="text-sm text-zinc-400 mt-2">
          {experienceLevel === "beginner"
            ? "Recupera tus fondos fácilmente si pierdes algún dispositivo."
            : "Define rutas alternativas sujetas a un candado de tiempo."}
        </p>
      </div>

      {/* Toggle principal */}
      <button
        onClick={() => update({ enabled: !timelock.enabled })}
        className={cn(
          "w-full flex items-center justify-between rounded-xl border p-4 transition-all duration-300 text-left",
          timelock.enabled
            ? "border-[#6366f1]/40 bg-[#6366f1]/5"
            : "border-[#1e2640] bg-[#121626]/40 hover:border-zinc-700"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300",
            timelock.enabled ? "bg-[#6366f1] text-white border-transparent" : "bg-[#181d33]/50 border-[#1f2642] text-zinc-500"
          )}>
            <Shield className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-base font-semibold text-white">
              {experienceLevel === "beginner" ? "Activar seguro de emergencia" : "Habilitar Candado de Tiempo (Timelock)"}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {experienceLevel === "beginner"
                ? "Te protege ante pérdidas de dispositivos por inactividad"
                : "Añade condiciones de contingencia basadas en BIP68/BIP65"}
            </div>
          </div>
        </div>
        <div className={cn(
          "w-10 h-6 rounded-full transition-all duration-300 relative shrink-0",
          timelock.enabled ? "bg-[#6366f1]" : "bg-zinc-850"
        )}>
          <div className={cn(
            "w-4 h-4 rounded-full bg-white absolute top-1 transition-all duration-300",
            timelock.enabled ? "left-5" : "left-1"
          )} />
        </div>
      </button>

      {timelock.enabled && (
        <div className="space-y-5">
          {/* PASO 1 — Período */}
          <Section index={1} title={experienceLevel === "beginner" ? "¿Tras cuánto tiempo de inactividad se activa?" : "Período de Bloqueo Temporal"}>
            <div className="flex gap-2 flex-wrap">
              {PERIOD_PRESETS.map((p) => (
                <button
                  key={p.blocks}
                  onClick={() => update({ blocks: p.blocks })}
                  className={cn(
                    "px-4 py-2 rounded-lg border text-xs transition-all duration-300",
                    timelock.blocks === p.blocks
                      ? "border-[#6366f1] bg-[#6366f1]/10 text-[#818cf8] font-bold"
                      : "border-zinc-850 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-2 font-mono">
              Equivale a <span className="font-mono text-zinc-300 font-bold">{timelock.blocks.toLocaleString()}</span> bloques ({blocksToHuman(timelock.blocks)}).
            </p>
          </Section>

          {/* PASO 2 — Quién */}
          <Section index={2} title={experienceLevel === "beginner" ? "¿Quién podrá rescatar los fondos?" : "Destinatario de la Ruta de Recuperación"}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ModeCard
                active={timelock.recoveryMode === "current-keys"}
                onClick={() => update({ recoveryMode: "current-keys", trustedKey: null })}
                icon={<Users className="w-5 h-5" />}
                title={experienceLevel === "beginner" ? "Yo mismo con menos dispositivos" : "Mis llaves con menor quórum"}
                description={experienceLevel === "beginner" ? "Por si pierdes llaves principales." : "Gasta con menos firmas."}
              />
              <ModeCard
                active={timelock.recoveryMode === "trusted-person"}
                onClick={() => update({
                  recoveryMode: "trusted-person",
                  trustedKey: timelock.trustedKey ?? EMPTY_TRUSTED_KEY(),
                })}
                icon={<UserPlus className="w-5 h-5" />}
                title={experienceLevel === "beginner" ? "Un contacto de confianza" : "Clave de un tercero de confianza"}
                description={experienceLevel === "beginner" ? "Familiar, abogado, heredero." : "Asigna una clave externa."}
              />
            </div>

            {!timelock.recoveryMode && (
              <p className="flex items-center gap-1.5 text-xs text-amber-400 mt-2">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Elige un método de recuperación para continuar.
              </p>
            )}
          </Section>

          {/* PASO 3 — Config específica */}
          {timelock.recoveryMode === "current-keys" && (
            <Section index={3} title={experienceLevel === "beginner" ? "¿Cuántos de tus dispositivos se requerirán entonces?" : "Nuevo quórum de firmas"}>
              {sliderHasRange ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Firmas necesarias:</span>
                    <span className="font-mono text-[#818cf8] font-bold text-lg">
                      {timelock.recoveryApprovals}
                      <span className="text-zinc-650 text-sm font-normal"> de {totalDevices}</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={maxRecoveryApprovals}
                    step={1}
                    value={timelock.recoveryApprovals}
                    onChange={(e) => update({ recoveryApprovals: Number(e.target.value) })}
                    className="w-full accent-[#6366f1]"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#121626]/40 p-4">
                  <div className="w-8 h-8 rounded-lg bg-[#6366f1]/10 flex items-center justify-center shrink-0 border border-[#6366f1]/20">
                    <span className="text-[#818cf8] font-bold font-mono">1</span>
                  </div>
                  <div className="text-sm text-zinc-300">
                    Con <span className="text-white font-semibold">cualquiera de tus {totalDevices} dispositivos</span> podrás recuperar todo.
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-zinc-855 bg-zinc-900/20 px-3 py-2 text-sm text-zinc-455 mt-3 leading-relaxed">
                Normalmente necesitas <span className="text-white font-semibold">{requiredApprovals} firmas</span>. Tras {blocksToHuman(timelock.blocks)} de inactividad, tu bóveda se flexibilizará y te permitirá retirar con solo <span className="text-[#818cf8] font-semibold">{sliderHasRange ? timelock.recoveryApprovals : 1} firma(s)</span>.
              </div>
            </Section>
          )}

          {timelock.recoveryMode === "trusted-person" && (
            <Section index={3} title={experienceLevel === "beginner" ? "Registrar al contacto de confianza" : "Llave del tercero autorizado"}>
              <TrustedKeyInput
                entry={timelock.trustedKey}
                network={config.network}
                experienceLevel={experienceLevel}
                onXpubChange={handleTrustedXpub}
                onPathChange={handleTrustedPath}
                onLoadTestKey={loadTestRecoveryKey}
                onLabelChange={(label) =>
                  update({ trustedKey: { ...timelock.trustedKey!, label } })
                }
              />
              {timelock.trustedKey?.isValid && (
                <div className="rounded-lg border border-zinc-855 bg-zinc-900/20 px-3 py-2 text-sm text-zinc-455 mt-2 leading-relaxed">
                  Tras {blocksToHuman(timelock.blocks)} de inactividad, la persona registrada como <span className="text-[#818cf8] font-semibold">{timelock.trustedKey.label}</span> podrá reclamar los fondos de forma autónoma.
                </div>
              )}
            </Section>
          )}

          {/* Configuración avanzada */}
          {experienceLevel !== "beginner" && (
            <div>
              <button
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 transition-transform duration-200",
                  showAdvanced && "rotate-180"
                )} />
                Configuración de Parámetros de Cadena
              </button>

              {showAdvanced && (
                <div className="rounded-xl border border-zinc-800 bg-[#121626]/20 p-4 space-y-4 mt-3 transition-all duration-300">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-zinc-400 font-mono font-bold">
                      Tipo de Bloqueo (BIP)
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {(["relative", "absolute"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => update({ type: t })}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-xs text-left transition-all duration-300",
                            timelock.type === t
                              ? "border-[#6366f1] bg-[#6366f1]/5 text-[#818cf8]"
                              : "border-zinc-850 text-zinc-550 hover:border-zinc-700"
                          )}
                        >
                          <div className="font-semibold">
                            {t === "relative" ? "Relativo (Recomendado)" : "Absoluto"}
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            {t === "relative" ? "BIP68 · Desde la última transacción" : "BIP65 · Altura de bloque estática"}
                          </div>
                        </button>
                      ))}
                    </div>

                    {timelock.type === "absolute" && (
                      <div className="flex gap-2 mt-3 rounded-lg border border-amber-800/40 bg-amber-950/20 p-3">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-300/80 leading-relaxed">
                          <span className="font-bold">Advertencia:</span> El timelock absoluto expira a un bloque específico de la cadena de bloques. Si no se retiran las monedas antes, la ruta de emergencia se activa automáticamente.
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-widest text-zinc-400 font-mono font-bold">
                      Altura / Bloques exactos
                    </label>
                    <input
                      type="number"
                      min={1008}
                      max={timelock.type === "relative" ? 65535 : 1000000}
                      value={timelock.blocks}
                      onChange={(e) => update({ blocks: Number(e.target.value) })}
                      className="mt-2 w-full rounded-lg border border-zinc-850 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-300 outline-none focus:border-[#6366f1]/60 transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Simulador de Crisis */}
          {step3Complete && (
            <CrisisSimulator config={config} />
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Subcomponentes ─────────────────────────────────────────────────────── */

function CrisisSimulator({ config }: { config: VaultConfig }) {
  const [lostDevices, setLostDevices] = useState<number>(0);
  const { experienceLevel } = useWallet();

  const remainingDevices = config.totalDevices - lostDevices;
  const canSpendNow = remainingDevices >= config.requiredApprovals;

  return (
    <div className="mt-8 rounded-xl border border-zinc-800 bg-[#121626]/40 p-5 space-y-4 transition-all duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2 text-white">
          <AlertTriangle className="w-4.5 h-4.5 text-[#818cf8]" />
          {experienceLevel === "beginner" ? "Simulador de Pérdidas" : "Simulador de Crisis"}
        </h3>
        <span className="text-xs uppercase tracking-widest text-zinc-650 font-mono font-bold">Simulación</span>
      </div>

      <p className="text-sm text-zinc-450 leading-relaxed">
        Prueba la resiliencia de tu diseño perdiendo dispositivos:
      </p>

      <div className="flex flex-col sm:flex-row gap-4 items-stretch">
        <div className="flex-1">
          <label className="text-xs uppercase tracking-widest text-zinc-550 font-mono block mb-2">
            Dispositivos perdidos
          </label>
          <div className="flex gap-2">
            {[0, 1, 2, 3].filter(n => n <= config.totalDevices).map(n => (
              <button
                key={n}
                onClick={() => setLostDevices(n)}
                className={cn(
                  "w-10 h-10 rounded-lg border text-sm font-bold transition-all duration-300",
                  lostDevices === n
                    ? "border-[#6366f1] bg-[#6366f1]/10 text-[#818cf8] shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                    : "border-[#1e2640] bg-zinc-900 text-zinc-550 hover:border-zinc-700 hover:text-zinc-300"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 rounded-lg border border-zinc-850 bg-zinc-900/20 p-3 flex flex-col justify-center">
          <div className="text-xs uppercase tracking-widest text-zinc-500 font-mono mb-1">
            Resultado
          </div>
          {canSpendNow ? (
            <div className="text-sm text-emerald-400 flex items-start gap-1.5 font-medium transition-colors">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Tus fondos están seguros con tus {remainingDevices} firmas restantes.</span>
            </div>
          ) : (
            <div className="text-sm text-orange-400 flex items-start gap-1.5 font-medium transition-colors">
              <AlertTriangle className="w-4 h-4 shrink-0 text-orange-400" />
              <span>
                Usa el seguro tras esperar {blocksToHuman(config.timelock.blocks)}.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ index, title, children }: {
  index: number; title: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-[#181d33]/60 border border-[#1f2642] flex items-center justify-center shrink-0">
          <span className="text-xs font-mono text-zinc-400 font-bold">{index}</span>
        </div>
        <span className="text-base font-semibold text-zinc-200">{title}</span>
      </div>
      <div className="pl-8">{children}</div>
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
        "rounded-xl border p-4 text-left transition-all duration-300 space-y-2 w-full",
        active
          ? "border-[#6366f1] bg-[#6366f1]/5"
          : "border-[#1e2640] bg-[#121626]/40 hover:border-zinc-700"
      )}
    >
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center border transition-all duration-300",
        active ? "bg-[#6366f1] text-white border-transparent" : "bg-zinc-900 border-[#1e2640] text-zinc-500"
      )}>
        {icon}
      </div>
      <div>
        <div className={cn("text-sm font-bold transition-colors", active ? "text-white" : "text-zinc-350")}>
          {title}
        </div>
        <div className="text-xs text-zinc-500 mt-0.5">{description}</div>
      </div>
    </button>
  );
}

function TrustedKeyInput({ entry, network, experienceLevel, onXpubChange, onPathChange, onLabelChange, onLoadTestKey }: {
  entry: XpubEntry | null;
  network: "mainnet" | "testnet";
  experienceLevel: "beginner" | "intermediate" | "advanced";
  onXpubChange: (v: string) => void;
  onPathChange: (p: string) => void;
  onLabelChange: (l: string) => void;
  onLoadTestKey: () => void;
}) {
  const { setActiveHelp, activeHelp } = useWallet();
  const [showPathMenu, setShowPathMenu] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(experienceLevel !== "beginner");
  const hasXpub = (entry?.xpub ?? "").length > 0;
  const hasError = hasXpub && !entry?.isValid;

  const helpTitle = `Ayuda: ${entry?.label || "Contacto de Confianza"}`;
  const isHelpActive = activeHelp?.title === helpTitle;

  const handleHelpClick = () => {
    if (isHelpActive) {
      setActiveHelp(null);
    } else {
      setActiveHelp({
        title: helpTitle,
        text: "Pide a tu contacto de confianza que abra su billetera Bitcoin (ej: BlueWallet o Sparrow), vaya a la sección de exportar su Llave Pública Extendida (XPUB / ZPUB) y te comparta el código completo para pegarlo aquí."
      });
    }
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border flex flex-col md:flex-row items-stretch transition-all duration-300",
      entry?.isValid
        ? "border-emerald-800/60 bg-emerald-950/20"
        : hasError
        ? "border-red-800/60 bg-red-950/10"
        : "border-[#1e2640] bg-[#121626]/40"
    )}>
      <div className="flex-1 p-4 space-y-3">
        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-2 flex-1">
            <HardDrive className="w-4.5 h-4.5 text-zinc-500 shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm font-bold text-white placeholder:text-zinc-750 outline-none"
              value={entry?.label ?? ""}
              onChange={(e) => onLabelChange(e.target.value)}
              placeholder={experienceLevel === "beginner" ? "Ej: Mamá, Hermano, Abogado..." : "Nombre del Contacto..."}
            />
          </div>
          <div className="flex items-center gap-2">
            {!hasXpub && (
              <button
                onClick={onLoadTestKey}
                className="text-xs text-zinc-300 hover:text-white flex items-center gap-1 bg-[#1c223a] px-2.5 py-1.5 rounded-lg border border-[#2c3558] transition-colors font-medium"
                title="Cargar clave de prueba válida"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#818cf8]" />
                Prueba
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <label className="text-xs uppercase tracking-wider text-zinc-500 font-mono font-bold">
              <Term name="xpub" />
            </label>
            <button
              type="button"
              onClick={handleHelpClick}
              className={cn("text-zinc-500 hover:text-[#818cf8] transition-colors p-0.5 rounded", isHelpActive && "text-[#818cf8]")}
              title="¿Cómo obtengo esta llave?"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          <textarea
            rows={2}
            spellCheck={false}
            className={cn(
              "w-full rounded-lg border px-3 py-2 text-xs font-mono bg-zinc-950 text-zinc-300",
              "placeholder:text-zinc-755 outline-none resize-none transition-all duration-300",
              hasError
                ? "border-red-755 focus:border-red-500"
                : entry?.isValid
                ? "border-emerald-855 focus:border-emerald-600"
                : "border-zinc-855 focus:border-[#6366f1]/60"
            )}
            value={entry?.xpub ?? ""}
            onChange={(e) => onXpubChange(e.target.value)}
            placeholder={experienceLevel === "beginner" ? "Pega el código largo de tu contacto aquí..." : "xpub6... o zpub..."}
          />
        </div>

        {hasError && (
          <p className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Clave no válida. Verifica el formato.
          </p>
        )}

        {experienceLevel === "beginner" ? (
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 mt-1 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-500" />
            {showAdvanced ? "Ocultar detalles técnicos" : "Detalles técnicos de la llave"}
          </button>
        ) : null}

        {showAdvanced && (
          <div className="flex gap-3 pt-2 border-t border-zinc-900 transition-all duration-300">
            <div className="flex-1">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-mono font-bold">
                <Term name="fingerprint" />
              </label>
              <div className="mt-1 px-2 py-1 rounded bg-zinc-950 border border-zinc-850 text-xs font-mono text-zinc-400 h-7 flex items-center">
                {entry?.fingerprint || <span className="text-zinc-800">--------</span>}
              </div>
            </div>
            <div className="flex-1 relative">
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-mono font-bold">
                <Term name="derivation" />
              </label>
              <button
                onClick={() => setShowPathMenu((v) => !v)}
                className="mt-1 w-full px-2 py-1 rounded border border-zinc-855 bg-zinc-955 text-xs font-mono text-zinc-400 flex items-center justify-between h-7 hover:border-zinc-700 transition-colors"
              >
                <span className="truncate">{entry?.derivationPath ?? "m/48'/0'/0'/2'"}</span>
                <ChevronDown className="w-3 h-3 shrink-0 ml-1" />
              </button>
              {showPathMenu && (
                <div className="absolute z-50 bottom-full mb-1 left-0 w-full rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden transition-all duration-300">
                  {Object.entries(STANDARD_PATHS).map(([label, path]) => (
                    <button
                      key={path}
                      onClick={() => { onPathChange(path); setShowPathMenu(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-zinc-850 transition-colors border-b border-zinc-855 last:border-0"
                    >
                      <div className="text-xs font-bold text-zinc-350">{label}</div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{path}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
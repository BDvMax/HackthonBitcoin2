"use client";

import { useState } from "react";
import type { VaultConfig, TimelockConfig, XpubEntry } from "@/lib/types/vault";
import { useWallet } from "@/context/WalletContext";
import { blocksToHuman } from "@/lib/bitcoin/timelock";
import { parseXpub, validateDerivationPath, STANDARD_PATHS } from "@/lib/bitcoin/xpub";
import { cn } from "@/lib/utils";
import {
  Shield, Users, UserPlus, ChevronDown,
  AlertTriangle, Info, Check, HardDrive, AlertCircle, Sparkles, Settings, HelpCircle, X, Calendar
} from "lucide-react";
import { Term } from "@/components/ui/Term";
import { useSoundEffects } from "@/hooks/useSoundEffects";

interface Props {
  config: VaultConfig;
  onChange: (p: Partial<VaultConfig>) => void;
}

const PERIOD_PRESETS = [
  { label: "3 meses", amount: 3, unit: "months" as const, blocks: 12960 },
  { label: "6 meses", amount: 6, unit: "months" as const, blocks: 25920 },
  { label: "1 año",   amount: 12, unit: "months" as const, blocks: 52560 },
];

function amountToBlocks(amount: number, unit: "months" | "years"): number {
  if (unit === "years") return Math.round(amount * 12 * 30.44 * 144);
  return Math.round(amount * 30.44 * 144);
}

function unlockDate(amount: number, unit: "months" | "years"): string {
  const d = new Date();
  if (unit === "years") d.setFullYear(d.getFullYear() + amount);
  else d.setMonth(d.getMonth() + amount);
  return d.toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

const EMPTY_TRUSTED_KEY = (): XpubEntry => ({
  id: crypto.randomUUID(),
  label: "",
  xpub: "",
  fingerprint: "",
  derivationPath: "m/48'/0'/0'/2'",
  isValid: false,
});

const TEST_RECOVERY_KEY = {
  xpub: "tpubD6NzVbkrYhZ4Xh8kPocUiZaRzhSUZnW3fwhCWJiR6C2EfZkHptfsGan9PC7vfF7QbyW7PLAVYrrhoEZQWPbqdwQEehCyEmkSfQ7n2pbXCTw",
  fingerprint: "00000000",
  derivationPath: "m/48'/1'/0'/2'",
};

export function Step3Recovery({ config, onChange }: Props) {
  const { timelock, requiredApprovals, totalDevices } = config;
  const { experienceLevel } = useWallet();
  const { playClick, playSuccess, playError, playToggle } = useSoundEffects();

  // Single Sig: 1-de-1, no tiene sentido auto-recuperación
  const isSingleSig = config.vaultType === "single" || requiredApprovals === 1;

  const [showAdvanced, setShowAdvanced] = useState(experienceLevel === "advanced");
  const [customPeriod, setCustomPeriod] = useState(false);
  const [customAmount, setCustomAmount] = useState(6);
  const [customUnit, setCustomUnit] = useState<"months" | "years">("months");

  // Sin preselección inicial a menos que ya exista un modo de recuperación seleccionado
  const [selectedPreset, setSelectedPreset] = useState<number | null>(
    timelock.recoveryMode ? (PERIOD_PRESETS.find((p) => p.blocks === timelock.blocks)?.blocks ?? null) : null
  );

  const [maxVisibleStep, setMaxVisibleStep] = useState<number>(
    timelock.recoveryMode ? 3 : 1
  );

  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const update = (patch: Partial<TimelockConfig>) => {
    const nextType = patch.type !== undefined ? patch.type : timelock.type;
    let nextBlocks = patch.blocks !== undefined ? patch.blocks : timelock.blocks;
    if (nextType === "relative") {
      nextBlocks = Math.max(1, Math.min(65535, nextBlocks));
    } else {
      nextBlocks = Math.max(500000, nextBlocks);
    }
    onChange({ timelock: { ...timelock, ...patch, blocks: nextBlocks } });
  };

  const handleActivate = () => {
    playSuccess();
    if (isSingleSig) {
      // Single Sig: forzar trusted-person inmediatamente pero borrar el resto
      onChange({
        timelock: {
          enabled: true,
          type: "relative",
          blocks: 0, // Se usará para forzar que el usuario elija
          recoveryMode: "trusted-person",
          trustedKey: null,
          recoveryApprovals: 1
        }
      });
      setSelectedPreset(null);
      setCustomPeriod(false);
      setMaxVisibleStep(1);
    } else {
      // Multisig: borrar todo para que no haya preselección
      onChange({
        timelock: {
          enabled: true,
          type: "relative",
          blocks: 0, // Sin preselección real de bloques
          // @ts-ignore - Forzamos undefined/null para que no haya nada preseleccionado
          recoveryMode: null,
          trustedKey: null,
          recoveryApprovals: Math.max(1, requiredApprovals - 1)
        }
      });
      setMaxVisibleStep(1);
      setSelectedPreset(null);
      setCustomPeriod(false);
    }
  };

  const handleDeactivate = () => {
    update({ enabled: false });
    setShowDeactivateConfirm(false);
  };

  const maxRecoveryApprovals = Math.max(1, requiredApprovals - 1);
  const sliderHasRange = maxRecoveryApprovals > 1;

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
      },
    });
  };

  // ── Helpers de UI para el selector de período ────────────────────────────
  const PeriodSelector = ({ onConfirm }: { onConfirm: () => void }) => (
    <div className="space-y-4">
      <div className="flex gap-2.5 flex-wrap">
        {PERIOD_PRESETS.map((p) => (
          <button
            key={p.blocks}
            onClick={() => {
              playToggle();
              update({ blocks: p.blocks });
              setCustomPeriod(false);
              setSelectedPreset(p.blocks);
              onConfirm();
            }}
            className={cn(
              "px-5 py-2.5 rounded-none border text-sm transition-all duration-300 font-semibold",
              selectedPreset === p.blocks && !customPeriod
                ? "border-[#6366f1] bg-[#6366f1]/10 text-[#818cf8] font-bold"
                : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => { playToggle(); setCustomPeriod(true); setSelectedPreset(null); }}
          className={cn(
            "px-5 py-2.5 rounded-none border text-sm transition-all duration-300 font-semibold",
            customPeriod
              ? "border-[#6366f1] bg-[#6366f1]/10 text-[#818cf8] font-bold"
              : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
          )}
        >
          Personalizado...
        </button>
      </div>

      {customPeriod && (
        <div className="bg-[#0e1120] p-5 rounded-none border border-[#1e2640] space-y-4 animate-slideUp">
          <div className="flex items-center gap-2 text-xs uppercase text-[#818cf8] font-mono font-bold">
            <Calendar className="w-3.5 h-3.5" />
            Definir período personalizado
          </div>
          <div className="flex gap-3 items-center">
            <input
              type="number"
              min={1}
              max={customUnit === "years" ? 1 : 14}
              value={customAmount}
              onChange={(e) => {
                let val = Math.max(1, Number(e.target.value));
                if (customUnit === "years" && val > 1) val = 1;
                if (customUnit === "months" && val > 14) val = 14;
                setCustomAmount(val);
                update({ blocks: amountToBlocks(val, customUnit) });
              }}
              className="w-24 rounded-none border border-zinc-800 bg-[#121626] px-3 py-2.5 text-sm font-mono text-zinc-200 outline-none focus:border-[#6366f1]/60 text-center"
            />
            <select
              value={customUnit}
              onChange={(e) => {
                const newUnit = e.target.value as "months" | "years";
                setCustomUnit(newUnit);
                let val = customAmount;
                if (newUnit === "years" && val > 1) val = 1;
                if (newUnit === "months" && val > 14) val = 14;
                setCustomAmount(val);
                update({ blocks: amountToBlocks(val, newUnit) });
              }}
              className="rounded-none border border-zinc-800 bg-[#121626] text-zinc-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-[#6366f1]/60 cursor-pointer"
            >
              <option value="months">Meses</option>
              <option value="years">Años</option>
            </select>
          </div>
          <div className="flex items-start gap-3 rounded-none border border-[#6366f1]/20 bg-[#6366f1]/5 p-3">
            <Calendar className="w-4 h-4 text-[#818cf8] shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mb-0.5">Fecha estimada de desbloqueo</div>
              <div className="text-sm text-[#a5b4fc] font-semibold capitalize">{unlockDate(customAmount, customUnit)}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">≈ {timelock.blocks.toLocaleString()} bloques Bitcoin</div>
            </div>
          </div>
        </div>
      )}

      {selectedPreset !== null && !customPeriod && (
        <div className="flex items-start gap-3 rounded-none border border-[#6366f1]/20 bg-[#6366f1]/5 p-3">
          <Calendar className="w-4 h-4 text-[#818cf8] shrink-0 mt-0.5" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mb-0.5">Fecha estimada de desbloqueo</div>
            <div className="text-sm text-[#a5b4fc] font-semibold capitalize">
              {unlockDate(
                PERIOD_PRESETS.find((p) => p.blocks === selectedPreset)?.amount ?? 6,
                PERIOD_PRESETS.find((p) => p.blocks === selectedPreset)?.unit ?? "months"
              )}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">≈ {timelock.blocks.toLocaleString()} bloques Bitcoin</div>
          </div>
        </div>
      )}

      <p className="text-sm text-zinc-450 font-mono">
        Equivale a <span className="font-mono text-zinc-300 font-bold">{timelock.blocks.toLocaleString()}</span> bloques ({blocksToHuman(timelock.blocks)}).
      </p>

      {customPeriod && (
        <button
          onClick={onConfirm}
          className="mt-4 px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-bold rounded-none transition-colors shadow-md"
        >
          Confirmar Período personalizado →
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-8 transition-all duration-300">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white">
          {experienceLevel === "beginner" ? "Seguro de Emergencia" : "Plan de Recuperación Criptográfica"}
        </h2>
        <p className="text-base text-zinc-400 mt-3 leading-relaxed">
          {experienceLevel === "beginner"
            ? "Recupera tus fondos fácilmente si pierdes algún dispositivo."
            : "Define rutas alternativas sujetas a un candado de tiempo."}
        </p>
      </div>

      {/* Modal confirmación desactivación */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-[#070913]/60 backdrop-blur-[2px] animate-scaleIn">
          <div className="max-w-[260px] w-full mx-4 rounded-none border border-[#6366f1]/20 bg-[#0a0c14] shadow-2xl p-5 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#6366f1]/10 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-[#818cf8]" />
            </div>
            <div>
              <h3 className="text-white font-extrabold text-lg tracking-tight">ADVERTENCIA</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Desactivar el seguro significa que{" "}
                <strong className="text-[#a5b4fc]">perderás tus fondos</strong> si extravías{" "}
                {requiredApprovals} o más dispositivos.
              </p>
            </div>
            <div className="flex gap-3 pt-2 justify-center">
              <button
                onClick={handleDeactivate}
                className="w-12 h-12 rounded-none border border-red-500/20 bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-all"
                title="Desactivar Seguro"
              >
                <X className="w-6 h-6" />
              </button>
              <button
                onClick={() => setShowDeactivateConfirm(false)}
                className="w-12 h-12 rounded-none border border-[#6366f1]/40 bg-[#6366f1]/20 text-[#818cf8] flex items-center justify-center hover:bg-[#6366f1]/30 transition-all"
                title="Mantener Seguro"
              >
                <Check className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle principal */}
      <button
        onClick={() => {
          if (timelock.enabled) {
            playError();
            setShowDeactivateConfirm(true);
          } else {
            handleActivate();
          }
        }}
        className={cn(
          "w-full flex items-center justify-between rounded-none border p-5 transition-all duration-300 text-left",
          timelock.enabled
            ? "border-[#6366f1]/40 bg-[#6366f1]/5"
            : "border-red-500/20 bg-red-950/5 hover:border-red-500/40"
        )}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-11 h-11 rounded-none flex items-center justify-center shrink-0 border transition-all duration-300",
            timelock.enabled
              ? "bg-[#6366f1] text-white border-transparent"
              : "bg-red-950 border-red-900/50 text-red-400"
          )}>
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">
              {experienceLevel === "beginner"
                ? "Activar seguro de emergencia"
                : "Habilitar Candado de Tiempo (Timelock)"}
            </div>
            <div className="text-sm text-zinc-400 mt-1 leading-relaxed">
              {experienceLevel === "beginner"
                ? "Te protege ante pérdidas de dispositivos por inactividad"
                : "Añade condiciones de contingencia basadas en BIP68/BIP65"}
            </div>
          </div>
        </div>
        <div className={cn(
          "w-12 h-7 rounded-full transition-all duration-300 relative shrink-0",
          timelock.enabled ? "bg-[#6366f1]" : "bg-zinc-700"
        )}>
          <div className={cn(
            "w-5 h-5 rounded-full bg-white absolute top-1 transition-all duration-300",
            timelock.enabled ? "left-6" : "left-1"
          )} />
        </div>
      </button>

      {/* Estado desactivado */}
      {!timelock.enabled && (
        <div className="rounded-none border border-red-500/30 bg-red-950/20 p-5 flex gap-4 items-start animate-slideUp">
          <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-red-400 font-bold text-base">Seguro desactivado</h4>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Sin seguro, perderás el acceso si pierdes {requiredApprovals} o más dispositivos de forma permanente.
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          FLUJO SINGLE SIG — período + XPUB en sección unificada
          ══════════════════════════════════════════════════════ */}
      {timelock.enabled && isSingleSig && (
        <div className="space-y-6 animate-slideUp">
          <div className="rounded-none border border-[#1e2640] bg-[#0d1120]/60 p-6 space-y-6">

            {/* Aviso explicativo */}
            <div className="flex items-start gap-3 rounded-none border border-[#6366f1]/20 bg-[#6366f1]/5 p-4">
              <Info className="w-4 h-4 text-[#818cf8] shrink-0 mt-0.5" />
              <p className="text-sm text-zinc-300 leading-relaxed">
                Con Single Sig, si pierdes tu dispositivo no podrás recuperar los fondos por tu cuenta. Tras el período de inactividad, <span className="text-[#a5b4fc] font-semibold">la persona de confianza que registres</span> podrá reclamarlos.
              </p>
            </div>

            {/* Período */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-zinc-200 uppercase tracking-wider font-mono">
                {experienceLevel === "beginner" ? "¿Tras cuánto tiempo de inactividad se activa?" : "Período de Bloqueo Temporal"}
              </p>
              <PeriodSelector onConfirm={() => {}} />
            </div>

            {/* Divider */}
            <div className="border-t border-[#1e2640]" />

            {/* XPUB de persona de confianza — siempre visible */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-zinc-200 uppercase tracking-wider font-mono">
                {experienceLevel === "beginner"
                  ? "Llave Pública de tu persona de confianza"
                  : "XPUB del tercero autorizado"}
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {experienceLevel === "beginner"
                  ? "Pide a tu familiar, abogado o persona de confianza que te comparta su Llave Pública (XPUB) de su billetera Bitcoin."
                  : "Importa la xpub del tercero que tendrá acceso a la ruta de recuperación tras el timelock."}
              </p>
              <TrustedKeyInput
                entry={timelock.trustedKey}
                network={config.network}
                experienceLevel={experienceLevel}
                onXpubChange={handleTrustedXpub}
                onPathChange={handleTrustedPath}
                onLabelChange={(label) =>
                  update({ trustedKey: { ...timelock.trustedKey!, label } })
                }
                onLoadTestKey={loadTestRecoveryKey}
                onFingerprintChange={(f) =>        // ← agregar esto
                  update({ trustedKey: { ...timelock.trustedKey!, fingerprint: f } })
                }
              />
              {timelock.trustedKey?.isValid && (
                <div className="flex items-center gap-2 text-sm text-emerald-400 font-semibold mt-2">
                  <Check className="w-4 h-4" />
                  <span>
                    Listo · Tras {blocksToHuman(timelock.blocks)} de inactividad,{" "}
                    <span className="text-emerald-300">
                      {timelock.trustedKey.label || "tu persona de confianza"}
                    </span>{" "}
                    podrá reclamar los fondos.
                  </span>
                </div>
              )}
              {/* Advertencia si falta el XPUB */}
              {!timelock.trustedKey?.isValid && (
                <div className="flex items-start gap-2 rounded-none border border-amber-800/40 bg-amber-950/20 px-3 py-2.5 text-xs text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>Debes registrar la llave de tu persona de confianza para completar el seguro.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          FLUJO MULTI SIG — pasos numerados
          ══════════════════════════════════════════════════════ */}
      {timelock.enabled && !isSingleSig && (
        <div className="space-y-6">

          {/* PASO 1 — Período */}
          <Section
            index={1}
            title={experienceLevel === "beginner"
              ? "¿Tras cuánto tiempo de inactividad se activa?"
              : "Período de Bloqueo Temporal"}
          >
            <PeriodSelector
              onConfirm={() => {
                playSuccess();
                setMaxVisibleStep((prev) => Math.max(prev, 2));
              }}
            />
          </Section>

          {/* PASO 2 — Modo */}
          {maxVisibleStep >= 2 && (
            <div className="animate-slideUp">
              <Section
                index={2}
                title={experienceLevel === "beginner"
                  ? "¿Quién podrá rescatar los fondos?"
                  : "Destinatario de la Ruta de Recuperación"}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ModeCard
                    active={timelock.recoveryMode === "current-keys"}
                    onClick={() => {
                      playToggle();
                      update({ recoveryMode: "current-keys", trustedKey: null });
                      setMaxVisibleStep((prev) => Math.max(prev, 3));
                    }}
                    icon={<Users className="w-6 h-6" />}
                    title={experienceLevel === "beginner"
                      ? "Yo mismo con menos dispositivos"
                      : "Mis llaves con menor quórum"}
                    description={experienceLevel === "beginner"
                      ? "Por si pierdes alguna llave principal."
                      : "Gasta con menos firmas."}
                  />
                  <ModeCard
                    active={timelock.recoveryMode === "trusted-person"}
                    onClick={() => {
                      playToggle();
                      update({
                        recoveryMode: "trusted-person",
                        trustedKey: timelock.trustedKey ?? EMPTY_TRUSTED_KEY(),
                      });
                      setMaxVisibleStep((prev) => Math.max(prev, 3));
                    }}
                    icon={<UserPlus className="w-6 h-6" />}
                    title={experienceLevel === "beginner"
                      ? "Un contacto de confianza"
                      : "Clave de un tercero de confianza"}
                    description={experienceLevel === "beginner"
                      ? "Familiar, abogado, heredero."
                      : "Asigna una clave externa."}
                  />
                </div>

                {!timelock.recoveryMode && (
                  <p className="flex items-center gap-1.5 text-sm text-amber-400 mt-3 font-medium">
                    <Info className="w-4 h-4 shrink-0" />
                    Elige un método de recuperación para continuar.
                  </p>
                )}
              </Section>
            </div>
          )}

          {/* PASO 3A — Auto-recuperación (current-keys) */}
          {maxVisibleStep >= 3 && timelock.recoveryMode === "current-keys" && (
            <div className="animate-slideUp">
              <Section
                index={3}
                title={experienceLevel === "beginner"
                  ? "¿Cuántos de tus dispositivos se requerirán?"
                  : "Nuevo quórum de firmas"}
              >
                {sliderHasRange ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-base">
                      <span className="text-zinc-400">Firmas necesarias:</span>
                      <span className="font-mono text-[#818cf8] font-bold text-xl">
                        {timelock.recoveryApprovals}
                        <span className="text-zinc-500 text-base font-normal"> de {totalDevices}</span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={maxRecoveryApprovals}
                      step={1}
                      value={timelock.recoveryApprovals}
                      onChange={(e) => update({ recoveryApprovals: Number(e.target.value) })}
                      className="w-full accent-[#6366f1] h-2"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-4 rounded-none border border-zinc-800 bg-[#121626]/40 p-5">
                    <div className="w-10 h-10 rounded-none bg-[#6366f1]/10 flex items-center justify-center shrink-0 border border-[#6366f1]/20">
                      <span className="text-[#818cf8] font-bold font-mono text-base">1</span>
                    </div>
                    <div className="text-base text-zinc-300 leading-relaxed">
                      Con <span className="text-white font-semibold">cualquiera de tus {totalDevices} dispositivos</span> podrás recuperar todo.
                    </div>
                  </div>
                )}
                <div className="rounded-none border border-zinc-800 bg-zinc-900/20 px-4 py-3 text-sm text-zinc-400 mt-4 leading-relaxed">
                  Normalmente necesitas <span className="text-white font-semibold">{requiredApprovals} firmas</span>. Tras {blocksToHuman(timelock.blocks)} de inactividad, podrás retirar con solo{" "}
                  <span className="text-[#818cf8] font-semibold">
                    {sliderHasRange ? timelock.recoveryApprovals : 1} firma(s)
                  </span>.
                </div>
              </Section>
            </div>
          )}

          {/* PASO 3B — Persona de confianza (trusted-person) */}
          {maxVisibleStep >= 3 && timelock.recoveryMode === "trusted-person" && (
            <div className="animate-slideUp">
              <Section
                index={3}
                title={experienceLevel === "beginner"
                  ? "Registrar al contacto de confianza"
                  : "Llave del tercero autorizado"}
              >
                <TrustedKeyInput
                  entry={timelock.trustedKey}
                  network={config.network}
                  experienceLevel={experienceLevel}
                  onXpubChange={handleTrustedXpub}
                  onPathChange={handleTrustedPath}
                  onLabelChange={(label) =>
                    update({ trustedKey: { ...timelock.trustedKey!, label } })
                  }
                  onLoadTestKey={loadTestRecoveryKey}
                />
                {timelock.trustedKey?.isValid && (
                  <div className="rounded-none border border-zinc-800 bg-zinc-900/20 px-4 py-3 text-sm text-zinc-400 mt-3 leading-relaxed">
                    Tras {blocksToHuman(timelock.blocks)} de inactividad,{" "}
                    <span className="text-[#818cf8] font-semibold">
                      {timelock.trustedKey.label || "tu persona de confianza"}
                    </span>{" "}
                    podrá reclamar los fondos de forma autónoma.
                  </div>
                )}
              </Section>
            </div>
          )}

          {/* Configuración avanzada */}
          {maxVisibleStep >= 2 && experienceLevel !== "beginner" && (
            <div className="space-y-3 animate-slideUp">
              <button
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors font-semibold"
              >
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", showAdvanced && "rotate-180")} />
                Configuración de Parámetros de Cadena
              </button>

              {showAdvanced && (
                <div className="rounded-none border border-zinc-800 bg-[#121626]/20 p-5 space-y-5 transition-all duration-300">
                  <div className="space-y-2">
                    <label className="text-sm uppercase tracking-widest text-zinc-400 font-mono font-bold block">
                      Tipo de Bloqueo (BIP)
                    </label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {(["relative", "absolute"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => update({ type: t })}
                          className={cn(
                            "rounded-none border px-4 py-3 text-left transition-all duration-300",
                            timelock.type === t
                              ? "border-[#6366f1] bg-[#6366f1]/5 text-[#818cf8]"
                              : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                          )}
                        >
                          <div className="font-bold text-sm">
                            {t === "relative" ? "Relativo (Recomendado)" : "Absoluto"}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1 leading-normal">
                            {t === "relative" ? "BIP68 · Desde la última transacción" : "BIP65 · Altura de bloque estática"}
                          </div>
                        </button>
                      ))}
                    </div>
                    {timelock.type === "absolute" && (
                      <div className="flex gap-3 mt-3 rounded-none border border-amber-800/40 bg-amber-950/20 p-4">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-300 leading-relaxed">
                          <span className="font-bold">Advertencia:</span> El timelock absoluto expira a un bloque específico. Si no se retiran las monedas antes, la ruta de emergencia se activa automáticamente.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm uppercase tracking-widest text-zinc-400 font-mono font-bold block">
                      Altura / Bloques exactos
                    </label>
                    <input
                      type="number"
                      min={1008}
                      max={timelock.type === "relative" ? 65535 : 1000000}
                      value={timelock.blocks}
                      onChange={(e) => update({ blocks: Number(e.target.value) })}
                      className="mt-2 w-full rounded-none border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-mono text-zinc-300 outline-none focus:border-[#6366f1]/60 transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Subcomponentes ──────────────────────────────────────────────────────────── */

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
        "rounded-none border p-4 text-left transition-all duration-300 space-y-2 w-full",
        active
          ? "border-[#6366f1] bg-[#6366f1]/5"
          : "border-[#1e2640] bg-[#121626]/40 hover:border-zinc-700"
      )}
    >
      <div className={cn(
        "w-9 h-9 rounded-none flex items-center justify-center border transition-all duration-300",
        active ? "bg-[#6366f1] text-white border-transparent" : "bg-zinc-900 border-[#1e2640] text-zinc-500"
      )}>
        {icon}
      </div>
      <div>
        <div className={cn("text-sm font-bold transition-colors", active ? "text-white" : "text-zinc-300")}>
          {title}
        </div>
        <div className="text-xs text-zinc-500 mt-0.5">{description}</div>
      </div>
    </button>
  );
}

function TrustedKeyInput({ entry, network, experienceLevel, onXpubChange, onPathChange, onLabelChange, onLoadTestKey, onFingerprintChange }: {
  entry: XpubEntry | null;
  network: "mainnet" | "testnet" | "signet" | "testnet4";
  experienceLevel: "beginner" | "intermediate" | "advanced";
  onXpubChange: (v: string) => void;
  onPathChange: (p: string) => void;
  onLabelChange: (l: string) => void;
  onLoadTestKey: () => void;
  onFingerprintChange?: (f: string) => void;
}) {
  const { setActiveHelp, activeHelp } = useWallet();
  const [showPathMenu, setShowPathMenu] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(experienceLevel !== "beginner");
  const hasXpub = (entry?.xpub ?? "").length > 0;
  const hasError = hasXpub && !entry?.isValid;

  const helpTitle = `Ayuda: ${entry?.label || "Contacto de Confianza"}`;
  const isHelpActive = activeHelp?.title === helpTitle;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-none border flex flex-col items-stretch transition-all duration-300",
      entry?.isValid
        ? "border-emerald-800/60 bg-emerald-950/5"
        : hasError
        ? "border-red-800/60 bg-red-950/5"
        : "border-[#1e2640] bg-[#121626]/40"
    )}>
      <div className="flex-1 p-4 space-y-3">
        {/* Label + test button */}
        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-2 flex-1">
            <HardDrive className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm font-bold text-white placeholder:text-zinc-700 outline-none"
              value={entry?.label ?? ""}
              onChange={(e) => onLabelChange(e.target.value)}
              placeholder={experienceLevel === "beginner" ? "Ej: Mamá, Hermano, Abogado..." : "Nombre del Contacto..."}
            />
          </div>
        </div>

        {/* XPUB input */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <label className="text-xs uppercase tracking-wider text-zinc-500 font-mono font-bold">
              <Term name="xpub" />
            </label>
            <button
              type="button"
              onMouseEnter={(e) =>
                setActiveHelp({
                  title: helpTitle,
                  text: "Pide a tu contacto que abra su billetera Bitcoin, vaya a exportar su Llave Pública Extendida (XPUB) y te comparta el código completo.",
                  x: e.clientX,
                  y: e.clientY,
                })
              }
              onMouseLeave={() => setActiveHelp(null)}
              className={cn("text-zinc-500 hover:text-[#818cf8] transition-colors p-0.5", isHelpActive && "text-[#818cf8]")}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          <textarea
            rows={2}
            spellCheck={false}
            className={cn(
              "w-full rounded-none border px-3 py-2 text-xs font-mono bg-zinc-950 text-zinc-300",
              "placeholder:text-zinc-700 outline-none resize-none transition-all duration-300",
              hasError
                ? "border-red-500 focus:border-red-500"
                : entry?.isValid
                ? "border-emerald-600 focus:border-emerald-600"
                : "border-zinc-800 focus:border-[#6366f1]/60"
            )}
            value={entry?.xpub ?? ""}
            onChange={(e) => onXpubChange(e.target.value)}
            placeholder={experienceLevel === "beginner"
              ? "Pega el código largo de tu contacto aquí..."
              : "xpub6... o zpub..."}
          />
        </div>

        {hasError && (
          <p className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Clave no válida. Verifica el formato.
          </p>
        )}

        {experienceLevel === "beginner" && (
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 mt-1 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-500" />
            {showAdvanced ? "Ocultar detalles técnicos" : "Detalles técnicos de la llave"}
          </button>
        )}

        {showAdvanced && (
  <div className="grid grid-cols-1 gap-3 pt-2 border-t border-zinc-900 sm:grid-cols-2">
    {/* Fingerprint editable */}
    <div>
      <label className="text-xs uppercase tracking-wider text-zinc-500 font-mono font-bold">
        <Term name="fingerprint" />
      </label>
      <input
        type="text"
        maxLength={8}
        spellCheck={false}
        placeholder="--------"
        value={entry?.fingerprint ?? ""}
        onChange={(e) => onFingerprintChange?.(e.target.value.toLowerCase())}
        className="mt-1 w-full px-2 py-1 rounded-none bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-400 h-7 outline-none focus:border-[#6366f1]/60 transition-colors placeholder:text-zinc-700"
      />
    </div>

    {/* Derivation Path: input libre + dropdown de rutas estándar */}
    <div className="relative">
      <label className="text-xs uppercase tracking-wider text-zinc-500 font-mono font-bold">
        <Term name="derivation" />
      </label>
      <div className="flex gap-1 mt-1">
        <input
          type="text"
          spellCheck={false}
          value={entry?.derivationPath ?? "m/48'/0'/0'/2'"}
          onChange={(e) => onPathChange(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1 rounded-none border border-zinc-800 bg-zinc-950 text-xs font-mono text-zinc-400 h-7 outline-none focus:border-[#6366f1]/60 transition-colors"
          placeholder="m/48'/0'/0'/2'"
        />
        <button
          onClick={() => setShowPathMenu((v) => !v)}
          className="px-1.5 h-7 rounded-none border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition-colors shrink-0"
          title="Rutas estándar"
        >
          <ChevronDown className={cn("w-3 h-3 text-zinc-400 transition-transform duration-200", showPathMenu && "rotate-180")} />
        </button>
      </div>
      {showPathMenu && (
        <div className="absolute z-50 bottom-full mb-1 left-0 w-full rounded-none border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
          {Object.entries(STANDARD_PATHS).map(([label, path]) => (
            <button
              key={path}
              onClick={() => { onPathChange(path); setShowPathMenu(false); }}
              className="w-full px-3 py-2 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0"
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
      </div>
    </div>
  );
}
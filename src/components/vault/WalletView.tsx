"use client";

import { useState } from "react";
import type { VaultConfig } from "@/lib/types/vault";
import { useWalletData, type WalletTransaction, type WalletUtxo, type AddressInfo } from "@/hooks/useWalletData";
import { blocksToHuman } from "@/lib/bitcoin/timelock";
import { truncateXpub } from "@/lib/bitcoin/xpub";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, RefreshCw, Copy, Check,
  ArrowDownLeft, ArrowUpRight, RefreshCcw,
  ExternalLink, Hash, Layers, Key, Lock, Clock,
  ChevronDown, ChevronRight, Wifi, WifiOff,
} from "lucide-react";

function satsToBTC(sats: number, decimals = 8): string {
  return (sats / 1e8).toFixed(decimals);
}
function timeAgo(unixTs: number): string {
  const diff = Math.floor(Date.now() / 1000 - unixTs);
  if (diff < 60)    return "hace un momento";
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}
function shortDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
function explorerUrl(network: string, txid: string): string {
  if (network === "mainnet") return `https://blockstream.info/tx/${txid}`;
  if (network === "signet")  return `https://mutinynet.com/tx/${txid}`;
  return `https://mempool.space/testnet4/tx/${txid}`;
}

type Tab = "resumen" | "transacciones" | "utxos" | "direcciones" | "llaves" | "descriptor";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "resumen",       label: "Resumen",       icon: <Layers        className="w-3.5 h-3.5" /> },
  { id: "transacciones", label: "Transacciones", icon: <RefreshCcw    className="w-3.5 h-3.5" /> },
  { id: "utxos",         label: "UTXOs",         icon: <Hash          className="w-3.5 h-3.5" /> },
  { id: "direcciones",   label: "Direcciones",   icon: <ArrowDownLeft className="w-3.5 h-3.5" /> },
  { id: "llaves",        label: "Llaves",        icon: <Key           className="w-3.5 h-3.5" /> },
  { id: "descriptor",    label: "Descriptor",    icon: <Lock          className="w-3.5 h-3.5" /> },
];

export function WalletView({ config, onBack }: { config: VaultConfig; onBack: () => void }) {
  const { data, stage, progress, progressLabel, error, refresh } = useWalletData(config);
  const [tab, setTab]           = useState<Tab>("resumen");
  const [copied, setCopied]     = useState<string | null>(null);
  const [expandedTx, setExpanded] = useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const validKeys = config.keys.filter(k => k.isValid);
  const networkLabel = config.network === "mainnet" ? "Mainnet" : config.network === "signet" ? "Signet" : "Testnet4";
  const isLoading = stage === "deriving" || stage === "scanning" || stage === "idle";

  // ── Cargando ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070913] text-white flex flex-col">
        <div className="border-b border-[#1e2640] px-4 py-3 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <span className="text-xs font-mono text-zinc-600">{networkLabel}</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          <div className="w-12 h-12 rounded-2xl bg-[#6366f1]/10 border border-[#6366f1]/30 flex items-center justify-center">
            <Lock className="w-5 h-5 text-[#818cf8]" />
          </div>
          <div className="w-full max-w-xs space-y-3 text-center">
            <p className="text-sm font-semibold text-white">{progressLabel}</p>
            <div className="w-full h-1.5 bg-[#1e2640] rounded-full overflow-hidden">
              <div className="h-full bg-[#6366f1] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[10px] font-mono text-zinc-600">{progress}% · Conectando a {networkLabel}...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (stage === "error" || error) {
    return (
      <div className="min-h-screen bg-[#070913] text-white flex flex-col">
        <div className="border-b border-[#1e2640] px-4 py-3">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-sm w-full rounded-2xl border border-red-800/40 bg-red-950/20 p-6 space-y-4 text-center">
            <WifiOff className="w-8 h-8 text-red-400 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-red-300">Error de conexión</p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{error}</p>
            </div>
            <button onClick={refresh} className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-semibold transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#070913] bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:3rem_3rem] text-white">

      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-[#1e2640] bg-[#070913]/90 backdrop-blur-md px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /><span className="hidden sm:inline">Setup</span>
            </button>
            <div className="w-px h-4 bg-zinc-800" />
            <div className="w-7 h-7 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/30 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5 text-[#818cf8]" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">Bóveda Multisig</p>
              <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{config.requiredApprovals}-de-{config.totalDevices} · {networkLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.lastUpdated && (
              <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-zinc-600 font-mono">
                <Wifi className="w-3 h-3 text-emerald-600" />{timeAgo(data.lastUpdated.getTime() / 1000)}
              </span>
            )}
            <button onClick={refresh} className="w-7 h-7 rounded-lg border border-[#1e2640] bg-[#121626]/60 flex items-center justify-center hover:border-zinc-700 transition-colors" title="Actualizar">
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Balance */}
        <div className="rounded-2xl border border-[#1e2640] bg-[#121626]/80 backdrop-blur-md p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono mb-2">Balance total</p>
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-5xl font-extrabold tracking-tight font-mono">{satsToBTC(data.totalBalance, 6)}</span>
            <span className="text-xl text-zinc-500 font-mono">BTC</span>
          </div>
          <div className="flex flex-wrap gap-4">
            {data.confirmedBalance > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-zinc-400 font-mono">{satsToBTC(data.confirmedBalance)} confirmado</span>
              </div>
            )}
            {data.unconfirmedBalance > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs text-zinc-400 font-mono">{satsToBTC(data.unconfirmedBalance)} pendiente</span>
              </div>
            )}
            {data.totalBalance === 0 && (
              <span className="text-xs text-zinc-600 font-mono">Sin fondos — envía Bitcoin a una dirección de abajo</span>
            )}
          </div>
          {config.timelock.enabled && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#6366f1]/20 bg-[#6366f1]/5">
              <Clock className="w-3 h-3 text-[#818cf8]" />
              <span className="text-[10px] text-[#a5b4fc] font-mono">Recuperación en {blocksToHuman(config.timelock.blocks)} de inactividad</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 p-1 rounded-xl bg-[#121626] border border-[#1e2640] overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 py-2 px-3 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap",
                tab === t.id ? "bg-[#1e2640] text-white" : "text-zinc-500 hover:text-zinc-300",
              )}>
              {t.icon}<span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── RESUMEN ── */}
        {tab === "resumen" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Transacciones", value: data.transactions.length.toString(), sub: `${data.transactions.filter(t => !t.confirmed).length} pendiente(s)` },
                { label: "UTXOs",         value: data.utxos.length.toString(),         sub: `${data.utxos.filter(u => u.confirmed).length} confirmado(s)` },
                { label: "Quórum",        value: `${config.requiredApprovals}/${config.totalDevices}`, sub: "firmas requeridas" },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-[#1e2640] bg-[#121626]/60 p-3 text-center">
                  <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-mono">{s.label}</p>
                  <p className="text-xl font-bold mt-1">{s.value}</p>
                  <p className="text-[9px] text-zinc-600 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Próxima dirección de recibo */}
            {(() => {
              const next = data.addresses.find(a => !a.hasActivity);
              return next ? (
                <div className="rounded-xl border border-[#1e2640] bg-[#121626]/60 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Dirección de recibo</span>
                    <span className="text-[9px] font-mono text-zinc-700">índice {next.index}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="flex-1 text-xs font-mono text-zinc-300 break-all">{next.address}</p>
                    <button onClick={() => copy(next.address, "recv")} className="text-zinc-600 hover:text-[#818cf8] shrink-0">
                      {copied === "recv" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Actividad reciente */}
            {data.transactions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Actividad reciente</span>
                  <button onClick={() => setTab("transacciones")} className="text-[10px] text-[#818cf8] hover:underline">Ver todo →</button>
                </div>
                {data.transactions.slice(0, 3).map(tx => (
                  <TxRow key={tx.txid} tx={tx} network={config.network} compact />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TRANSACCIONES ── */}
        {tab === "transacciones" && (
          <div className="space-y-2">
            {data.transactions.length === 0 ? (
              <EmptyState icon={<RefreshCcw className="w-6 h-6 text-zinc-700" />} title="Sin transacciones" desc="Envía Bitcoin a una de tus direcciones para comenzar." />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-zinc-500">{data.transactions.length} transacción(es)</p>
                  {data.tipHeight > 0 && <p className="text-[10px] font-mono text-zinc-700">bloque actual #{data.tipHeight.toLocaleString()}</p>}
                </div>
                {data.transactions.map(tx => (
                  <TxRow key={tx.txid} tx={tx} network={config.network}
                    expanded={expandedTx === tx.txid}
                    onToggle={() => setExpanded(expandedTx === tx.txid ? null : tx.txid)}
                    onCopy={copy} copied={copied}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* ── UTXOs ── */}
        {tab === "utxos" && (
          <div className="space-y-3">
            {data.utxos.length === 0 ? (
              <EmptyState icon={<Hash className="w-6 h-6 text-zinc-700" />} title="Sin UTXOs" desc="No hay salidas no gastadas en esta bóveda todavía." />
            ) : (
              <>
                <p className="text-xs text-zinc-500 mb-1">{data.utxos.length} UTXO(s) · {satsToBTC(data.totalBalance)} BTC total</p>
                {data.utxos.map(u => <UtxoCard key={`${u.txid}:${u.vout}`} utxo={u} network={config.network} onCopy={copy} copied={copied} />)}
              </>
            )}
          </div>
        )}

        {/* ── DIRECCIONES ── */}
        {tab === "direcciones" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-zinc-500">Gap limit 20 · ruta externa m/0/*</p>
              <p className="text-[10px] font-mono text-zinc-700">{data.addresses.filter(a => a.hasActivity).length} con actividad</p>
            </div>
            {data.addresses.map(a => <AddrRow key={a.index} addr={a} onCopy={copy} copied={copied} />)}
          </div>
        )}

        {/* ── LLAVES ── */}
        {tab === "llaves" && (
          <div className="space-y-3">
            {validKeys.map((key, i) => (
              <div key={key.id} className="rounded-xl border border-[#1e2640] bg-[#121626]/60 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center shrink-0">
                    <Key className="w-4 h-4 text-[#818cf8]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{key.label}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">{i < config.requiredApprovals ? "✓ Requerida para firma" : "Opcional (redundancia)"}</p>
                  </div>
                  {i < config.requiredApprovals && (
                    <span className="text-[9px] font-mono text-[#818cf8] bg-[#6366f1]/10 border border-[#6366f1]/20 rounded px-1.5 py-0.5">QUÓRUM</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <IRow label="Fingerprint" value={key.fingerprint} />
                  <IRow label="Derivación"  value={key.derivationPath} />
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono w-24 shrink-0 pt-0.5">XPUB</span>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-zinc-400 text-[11px] truncate">{truncateXpub(key.xpub, 14, 8)}</span>
                      <button onClick={() => copy(key.xpub, `xpub-${key.id}`)} className="text-zinc-600 hover:text-[#818cf8] shrink-0">
                        {copied === `xpub-${key.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {config.timelock.enabled && (
              <div className="rounded-xl border border-[#6366f1]/20 bg-[#6366f1]/5 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#818cf8]" />
                  <span className="text-sm font-semibold text-[#a5b4fc]">Ruta de recuperación (timelock)</span>
                </div>
                <IRow label="Tipo"    value={config.timelock.type === "relative" ? "Relativo BIP68" : "Absoluto BIP65"} />
                <IRow label="Período" value={`${config.timelock.blocks.toLocaleString()} bloques · ${blocksToHuman(config.timelock.blocks)}`} />
                <IRow label="Script"  value={config.timelock.type === "relative" ? `older(${config.timelock.blocks})` : `after(${config.timelock.blocks})`} />
              </div>
            )}
          </div>
        )}

        {/* ── DESCRIPTOR ── */}
        {tab === "descriptor" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#1e2640] bg-[#0a0d1a] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Descriptor BIP380</span>
                <button onClick={() => copy(data.descriptor, "descriptor")} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
                  {copied === "descriptor" ? <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copiado</span></> : <><Copy className="w-3.5 h-3.5" />Copiar</>}
                </button>
              </div>
              <p className="text-[11px] font-mono text-zinc-400 break-all leading-relaxed select-all cursor-text">{data.descriptor}</p>
            </div>
            <div className="rounded-xl border border-[#1e2640] bg-[#121626]/60 p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Anatomía</p>
              <DItem label="Script"   value="wsh( )"  desc="P2WSH — Pay-to-Witness-Script-Hash" />
              <DItem label="Multisig" value={`sortedmulti(${config.requiredApprovals},...)`} desc={`${config.requiredApprovals}-de-${validKeys.length} llaves`} />
              {config.timelock.enabled && (
                <DItem label="Timelock" value={config.timelock.type === "relative" ? `older(${config.timelock.blocks})` : `after(${config.timelock.blocks})`} desc={blocksToHuman(config.timelock.blocks)} />
              )}
              <DItem label="Checksum" value={data.descriptor.split("#")[1] ?? "—"} desc="8 caracteres BIP380" />
            </div>
            <p className="flex items-start gap-2 text-[11px] text-zinc-600 px-1">
              <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
              Importa este descriptor en Sparrow, Liana o cualquier wallet BIP380 para ver el balance real.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Subcomponentes ─────────────────────────────────────────────────────────

function TxRow({ tx, network, compact=false, expanded, onToggle, onCopy, copied }: {
  tx: WalletTransaction; network: string; compact?: boolean;
  expanded?: boolean; onToggle?: () => void;
  onCopy?: (t: string, k: string) => void; copied?: string | null;
}) {
  const recv = tx.direction === "received";
  const self = tx.direction === "self";
  return (
    <div className={cn("rounded-xl border bg-[#121626]/60 overflow-hidden", tx.confirmed ? "border-[#1e2640]" : "border-amber-900/30")}>
      <div className={cn("flex items-center gap-3 px-4 py-3", !compact && "cursor-pointer hover:bg-[#1a2038]/40 transition-colors")} onClick={onToggle}>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          recv ? "bg-emerald-950/40 text-emerald-400" : self ? "bg-zinc-800 text-zinc-400" : "bg-red-950/40 text-red-400")}>
          {recv ? <ArrowDownLeft className="w-4 h-4" /> : self ? <RefreshCcw className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-semibold", recv ? "text-emerald-300" : self ? "text-zinc-400" : "text-red-300")}>
              {recv ? "Recibido" : self ? "Interno" : "Enviado"}
            </span>
            {!tx.confirmed && <span className="text-[9px] font-mono bg-amber-950/40 text-amber-400 border border-amber-900/40 px-1.5 py-0.5 rounded">PENDIENTE</span>}
          </div>
          <p className="text-[10px] font-mono text-zinc-600 truncate mt-0.5">
            {tx.blockTime ? timeAgo(tx.blockTime) : "Sin confirmar"} · {tx.txid.slice(0, 10)}...
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={cn("text-sm font-bold font-mono", recv ? "text-emerald-300" : self ? "text-zinc-400" : "text-red-300")}>
            {recv ? "+" : self ? "" : "−"}{satsToBTC(tx.amount, 6)}
          </p>
          <p className="text-[9px] text-zinc-600 font-mono">{tx.amount.toLocaleString()} sats</p>
        </div>
        {!compact && <ChevronDown className={cn("w-4 h-4 text-zinc-700 shrink-0 transition-transform", expanded && "rotate-180")} />}
      </div>
      {!compact && expanded && (
        <div className="border-t border-[#1e2640] px-4 py-3 space-y-2 bg-[#0a0d1a]/60">
          <div className="flex items-start gap-3">
            <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono w-24 shrink-0 pt-0.5">TXID</span>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono text-zinc-300 text-xs truncate">{tx.txid}</span>
              {onCopy && (
                <button onClick={() => onCopy(tx.txid, `tx-${tx.txid}`)} className="text-zinc-600 hover:text-[#818cf8] shrink-0">
                  {copied === `tx-${tx.txid}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>
          {tx.blockHeight && <IRow label="Bloque"     value={`#${tx.blockHeight.toLocaleString()}`} />}
          {tx.blockTime   && <IRow label="Fecha"      value={shortDate(tx.blockTime)} />}
          {tx.fee > 0     && <IRow label="Comisión"   value={`${tx.fee.toLocaleString()} sats`} />}
          {tx.address     && <IRow label="Contraparte" value={tx.address} />}
          <a href={explorerUrl(network, tx.txid)} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[10px] text-[#818cf8] hover:underline mt-1">
            <ExternalLink className="w-3 h-3" /> Ver en explorador
          </a>
        </div>
      )}
    </div>
  );
}

function UtxoCard({ utxo, network, onCopy, copied }: { utxo: WalletUtxo; network: string; onCopy: (t: string, k: string) => void; copied: string | null }) {
  const k = `${utxo.txid}:${utxo.vout}`;
  return (
    <div className="rounded-xl border border-[#1e2640] bg-[#121626]/60 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full mt-0.5", utxo.confirmed ? "bg-emerald-500" : "bg-amber-500 animate-pulse")} />
          <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded", utxo.confirmed ? "bg-emerald-950/40 text-emerald-400" : "bg-amber-950/40 text-amber-400")}>
            {utxo.confirmed ? `${utxo.confirmations} confirmaciones` : "Sin confirmar"}
          </span>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono font-bold">{satsToBTC(utxo.value)} BTC</p>
          <p className="text-[10px] text-zinc-600 font-mono">{utxo.value.toLocaleString()} sats</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-start gap-3">
          <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono w-16 shrink-0 pt-0.5">TXID</span>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-mono text-zinc-400 text-[11px] truncate">{utxo.txid.slice(0,20)}...{utxo.txid.slice(-8)}</span>
            <button onClick={() => onCopy(utxo.txid, `u-${k}`)} className="text-zinc-600 hover:text-[#818cf8] shrink-0">
              {copied === `u-${k}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
        <IRow label="VOUT"  value={utxo.vout.toString()} />
        <IRow label="Dir."  value={`${utxo.address.slice(0,20)}...${utxo.address.slice(-8)}`} />
        {utxo.blockTime && <IRow label="Tiempo" value={timeAgo(utxo.blockTime)} />}
      </div>
      <a href={explorerUrl(network, utxo.txid)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] text-[#818cf8] hover:underline">
        <ExternalLink className="w-3 h-3" /> Ver transacción
      </a>
    </div>
  );
}

function AddrRow({ addr, onCopy, copied }: { addr: AddressInfo; onCopy: (t: string, k: string) => void; copied: string | null }) {
  const k = `a-${addr.index}`;
  const balance = addr.utxos.reduce((acc, u) => acc + u.value, 0);
  return (
    <div className={cn("rounded-xl border p-3 flex items-center gap-3",
      addr.hasActivity ? "border-[#1e2640] bg-[#121626]/80" : "border-[#1a1e2e]/40 bg-transparent opacity-60")}>
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-mono font-bold",
        balance > 0 ? "bg-[#6366f1]/15 text-[#818cf8]" : addr.hasActivity ? "bg-zinc-800 text-zinc-500" : "bg-zinc-900/50 text-zinc-700")}>
        {addr.index}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono text-zinc-300 truncate">{addr.address}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] text-zinc-600 font-mono">{addr.path}</span>
          {balance > 0 && <span className="text-[9px] font-mono text-[#818cf8]">{satsToBTC(balance, 6)} BTC</span>}
          {addr.txCount > 0 && balance === 0 && <span className="text-[9px] text-zinc-600">{addr.txCount} tx · vacía</span>}
          {!addr.hasActivity && <span className="text-[9px] text-emerald-700">← disponible</span>}
        </div>
      </div>
      <button onClick={() => onCopy(addr.address, k)} className="text-zinc-700 hover:text-[#818cf8] shrink-0">
        {copied === k ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function IRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono w-24 shrink-0 pt-0.5">{label}</span>
      <span className="text-xs font-mono text-zinc-300 break-all">{value}</span>
    </div>
  );
}

function DItem({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono w-20 shrink-0 pt-0.5">{label}</span>
      <div>
        <span className="text-xs font-mono text-[#a5b4fc]">{value}</span>
        <p className="text-[10px] text-zinc-600 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="text-center py-16 space-y-3">
      <div className="flex justify-center">{icon}</div>
      <p className="text-sm font-semibold text-zinc-500">{title}</p>
      <p className="text-xs text-zinc-700 max-w-xs mx-auto">{desc}</p>
    </div>
  );
}
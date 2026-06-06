"use client";

import { useState, useEffect } from "react";
import type { VaultConfig } from "@/lib/types/vault";
import { generateDescriptor, descriptorWithChecksum } from "@/lib/bitcoin/descriptor";
import { deriveWshAddresses, type DerivedAddress } from "@/lib/bitcoin/address";
import { exportRecoveryPDF, exportDescriptorTxt } from "@/lib/bitcoin/export-pdf";
import { cn } from "@/lib/utils";
import {
  Download, Copy, Check, AlertTriangle,
  Eye, ChevronDown, FileText, FileJson,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { config: VaultConfig; }

export function Step4Export({ config }: Props) {
  const [descriptor, setDescriptor] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [addresses, setAddresses] = useState<DerivedAddress[]>([]);
  const [showAddresses, setShowAddresses] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = generateDescriptor(config);
      const withChecksum = descriptorWithChecksum(raw);
      setDescriptor(withChecksum);
      setError("");

      const validKeys = config.keys
        .filter((k) => k.isValid)
        .map((k) => ({ xpub: k.xpub, derivationPath: k.derivationPath }));

      const addrs = deriveWshAddresses(validKeys, config.requiredApprovals, config.network, 5);
      setAddresses(addrs);
    } catch (e: any) {
      setError(e.message);
      setAddresses([]);
    }
  }, [config]);

  const copy = async () => {
    await navigator.clipboard.writeText(descriptor);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJSON = () => {
    const payload = JSON.stringify({
      descriptor,
      network: config.network,
      keys: config.keys.map((k) => ({
        label: k.label,
        fingerprint: k.fingerprint,
        derivationPath: k.derivationPath,
        xpub: k.xpub,
      })),
      timelock: config.timelock,
      createdAt: new Date().toISOString(),
    }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boveda-kit-recuperacion-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    setPdfLoading(true);
    try { await exportRecoveryPDF(config); }
    finally { setPdfLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Kit de Recuperación</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Guarda este archivo en al menos 2 ubicaciones seguras. Sin él no podrás recuperar tu bóveda.
        </p>
      </div>

      {error ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-800/60 bg-red-950/20 p-4">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : (
        <>
          {/* Descriptor */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-zinc-500 font-mono">
                Descriptor BIP380
              </span>
              <button
                onClick={copy}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                {copied ? (
                  <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copiado</span></>
                ) : (
                  <><Copy className="w-3.5 h-3.5" />Copiar</>
                )}
              </button>
            </div>
            <p className="text-xs font-mono text-zinc-400 break-all leading-relaxed">
              {descriptor}
            </p>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Configuración", value: `${config.requiredApprovals}-de-${config.totalDevices}` },
              { label: "Red",           value: config.network === "mainnet" ? "Bitcoin" : "Testnet" },
              { label: "Recuperación",  value: config.timelock.enabled ? "Activada" : "Sin timelock" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-center">
                <div className="text-xs text-zinc-500">{item.label}</div>
                <div className="text-sm font-semibold mt-1">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Advertencia */}
          <div className="flex gap-3 rounded-xl border border-amber-800/40 bg-amber-950/20 p-4">
            <Eye className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300/80 leading-relaxed">
              Este archivo no contiene llaves privadas. Compártelo con tu wallet (Sparrow, Liana)
              para importar la bóveda. Aun así, revela tu configuración multisig — guárdalo con discreción.
            </p>
          </div>

          {/* Direcciones derivadas */}
          {addresses.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950">
              <button
                onClick={() => setShowAddresses((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Ver direcciones de recibo derivadas
                </span>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  showAddresses && "rotate-180"
                )} />
              </button>
              {showAddresses && (
                <div className="border-t border-zinc-800 divide-y divide-zinc-800/60">
                  {addresses.map((a) => (
                    <div key={a.index} className="flex items-center justify-between px-4 py-2.5 gap-4">
                      <span className="text-[10px] font-mono text-zinc-600 shrink-0">{a.path}</span>
                      <span className="text-xs font-mono text-zinc-300 truncate">{a.address}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(a.address)}
                        className="text-zinc-600 hover:text-orange-400 transition-colors shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Descarga */}
          <div className="space-y-2">
            <Button
              onClick={downloadPDF}
              disabled={pdfLoading}
              className="w-full bg-orange-500 hover:bg-orange-400 text-black font-semibold h-12 text-base"
            >
              {pdfLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Generando PDF...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Descargar Kit de Recuperación (PDF)
                </span>
              )}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={downloadJSON}
                className="border-zinc-700 bg-transparent text-zinc-400 hover:text-white hover:border-zinc-500 h-10 text-sm"
              >
                <FileJson className="w-4 h-4 mr-2" /> JSON
              </Button>
              <Button
                variant="outline"
                onClick={() => exportDescriptorTxt(config)}
                className="border-zinc-700 bg-transparent text-zinc-400 hover:text-white hover:border-zinc-500 h-10 text-sm"
              >
                <FileText className="w-4 h-4 mr-2" /> TXT
              </Button>
            </div>
            <p className="text-center text-xs text-zinc-600">
              PDF recomendado · imprime y guarda en lugar físico seguro
            </p>
          </div>
        </>
      )}
    </div>
  );
}
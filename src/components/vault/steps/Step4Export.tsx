"use client";

import { useMemo, useState } from "react";
import type { VaultConfig } from "@/lib/types/vault";
import { useWallet } from "@/context/WalletContext";
import { generateDescriptor, descriptorWithChecksum } from "@/lib/bitcoin/descriptor";
import { deriveWshAddresses, type DerivedAddress } from "@/lib/bitcoin/address";
import { cn } from "@/lib/utils";
import { Download, Copy, Check, AlertTriangle, Eye, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";

interface Props { config: VaultConfig; }

export function Step4Export({ config }: Props) {
  const { experienceLevel } = useWallet();
  const [copied, setCopied] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<number | null>(null);
  const [showAddresses, setShowAddresses] = useState(false);

  const exportData = useMemo<{
    descriptor: string;
    addresses: DerivedAddress[];
    error: string;
  }>(() => {
    try {
      const raw = generateDescriptor(config);
      const withChecksum = descriptorWithChecksum(raw);

      const validKeys = config.keys
        .filter((k) => k.isValid)
        .map((k) => ({ xpub: k.xpub, derivationPath: k.derivationPath }));

      const addrs = deriveWshAddresses(
        validKeys,
        config.requiredApprovals,
        config.network,
        5
      );
      return { descriptor: withChecksum, addresses: addrs, error: "" };
    } catch (error: unknown) {
      return {
        descriptor: "",
        addresses: [],
        error: error instanceof Error ? error.message : "No se pudo generar el descriptor.",
      };
    }
  }, [config]);

  const { descriptor, addresses, error } = exportData;

  const copy = async () => {
    await navigator.clipboard.writeText(descriptor);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAddress = async (addr: string, index: number) => {
    await navigator.clipboard.writeText(addr);
    setCopiedAddress(index);
    setTimeout(() => setCopiedAddress(null), 1500);
  };

  const download = () => {
    const payload = JSON.stringify(
      {
        descriptor,
        totalDevices: config.totalDevices,
        requiredApprovals: config.requiredApprovals,
        network: config.network,
        keys: config.keys,
        timelock: config.timelock,
        createdAt: new Date().toISOString(),
      },
      null,
      2
    );

    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boveda-kit-recuperacion-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">
          {experienceLevel === "beginner" ? "Guarda tu copia de seguridad" : "Kit de Recuperación y Respaldo"}
        </h2>
        <p className="text-sm text-zinc-400 mt-2">
          {experienceLevel === "beginner"
            ? "Descarga y guarda este archivo en un lugar seguro. Sin él no podrás recuperar el acceso a tus fondos."
            : "Exporta la configuración descrita en lenguaje descriptor estándar y guarda el archivo JSON."}
        </p>
      </div>

      {error ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-800/60 bg-red-950/20 p-4">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : (
        <>
          {/* Descriptor box */}
          <div className="rounded-xl border border-[#1e2640] bg-[#121626]/40 p-6 flex flex-col items-center space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <QRCode value={descriptor} size={192} className="w-48 h-48" />
            </div>
            
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-zinc-400 font-mono font-bold">
                  {experienceLevel === "beginner" ? "Código de Registro de Bóveda" : "Descriptor BIP380"}
                </span>
                <button
                  onClick={copy}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar código
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs font-mono text-zinc-350 break-all bg-zinc-950 p-3 rounded-lg border border-[#1e2640] leading-relaxed max-h-24 overflow-y-auto">
                {descriptor}
              </p>
            </div>
          </div>

          {/* Resumen de configuración */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Regla", value: `${config.requiredApprovals} de ${config.totalDevices}` },
              { label: "Red", value: config.network === "mainnet" ? "Bitcoin" : "Testnet" },
              { label: "Seguro", value: config.timelock.enabled ? "Activo" : "Inactivo" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[#1e2640] bg-[#181d33]/20 p-3 text-center"
              >
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">{item.label}</div>
                <div className="text-xs font-semibold mt-1 text-white">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Advertencia de seguridad */}
          <div className="flex gap-3 rounded-xl border border-[#1e2640] bg-[#121626]/20 p-4">
            <Eye className="w-5 h-5 text-[#818cf8] shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-400 leading-relaxed">
              {experienceLevel === "beginner"
                ? "Este archivo NO contiene contraseñas ni llaves para gastar. Sirve para ver tu saldo y registrar la bóveda en aplicaciones compatibles. Guárdalo con cuidado."
                : "El descriptor no contiene claves privadas, pero detalla el quórum y claves públicas de la bóveda. Mantén este archivo en secreto para proteger tu privacidad."}
            </p>
          </div>

          {/* Direcciones derivadas */}
          {addresses.length > 0 && (
            <div className="rounded-xl border border-[#1e2640] bg-zinc-950/40">
              <button
                onClick={() => setShowAddresses((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#818cf8]" />
                  Ver direcciones de depósito generadas
                </span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    showAddresses && "rotate-180"
                  )}
                />
              </button>

              {showAddresses && (
                <div className="border-t border-[#1e2640] divide-y divide-zinc-900">
                  {addresses.map((a) => (
                    <div
                      key={a.index}
                      className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4"
                    >
                      <span className="text-[9px] font-mono text-zinc-600 shrink-0">
                        {a.path}
                      </span>
                      <span className="text-xs font-mono text-zinc-350 truncate">
                        {a.address}
                      </span>
                      <button
                        onClick={() => copyAddress(a.address, a.index)}
                        className="justify-self-start text-zinc-400 hover:text-[#818cf8] transition-colors shrink-0 text-xs sm:justify-self-end"
                      >
                        {copiedAddress === a.index ? "Copiada" : "Copiar"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CTA */}
          <Button
            onClick={download}
            className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-semibold h-12 text-sm shadow-[0_0_15px_rgba(99,102,241,0.15)]"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar Archivo de Respaldo
          </Button>
        </>
      )}
    </div>
  );
}

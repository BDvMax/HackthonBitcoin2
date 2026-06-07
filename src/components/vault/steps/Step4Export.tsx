"use client";

import { useMemo, useState } from "react";
import type { VaultConfig } from "@/lib/types/vault";
import { useWallet } from "@/context/WalletContext";
import { generateDescriptor, descriptorWithChecksum } from "@/lib/bitcoin/descriptor";
import { deriveWshAddresses, type DerivedAddress } from "@/lib/bitcoin/address";
import { blocksToHuman } from "@/lib/bitcoin/timelock";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Copy, Download, ChevronDown, Eye, Maximize2, X, FileText, Share2, Lock, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCodeGenerator from "qrcode";


function getMempoolApi(network: string): string {
  switch (network) {
    case "mainnet":
      return "https://mempool.space/api";

    case "testnet":
      return "https://mempool.space/testnet/api";

    case "signet":
      return "https://mempool.space/signet/api";

    case "testnet4":
      return "https://mempool.space/testnet4/api";

    default:
      return "https://mempool.space/api";
  }
}

function getMempoolExplorer(network: string): string {
  switch (network) {
    case "mainnet":
      return "https://mempool.space";

    case "testnet":
      return "https://mempool.space/testnet";

    case "signet":
      return "https://mempool.space/signet";

    case "testnet4":
      return "https://mempool.space/testnet4";

    default:
      return "https://mempool.space";
  }
}

interface Props {
  config: VaultConfig;
}


interface Props { config: VaultConfig; }

export function Step4Export({ config }: Props) {
  const { experienceLevel } = useWallet();
  const [copied, setCopied] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<number | null>(null);
  const [showAddresses, setShowAddresses] = useState(true);
  const [showFullscreenQR, setShowFullscreenQR] = useState(false);
  const [showAdvancedText, setShowAdvancedText] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pdfPassword, setPdfPassword] = useState("");
  const [showPasswordText, setShowPasswordText] = useState(false);

  // States for blockchain explorer
  const [loadingAddressInfo, setLoadingAddressInfo] = useState(false);
  const [addressInfoData, setAddressInfoData] = useState<any | null>(null);
  const [addressInfoError, setAddressInfoError] = useState<string | null>(null);
  const [selectedExplorerAddr, setSelectedExplorerAddr] = useState<string>("");

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
        5,
        0
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

  const checkOnChainInfo = async (addr: string) => {
    setLoadingAddressInfo(true);
    setAddressInfoError(null);
    setSelectedExplorerAddr(addr);
    try {
      const baseUrl = getMempoolApi(config.network);
      const res = await fetch(`${baseUrl}/address/${addr}`);
      if (!res.ok) throw new Error("Error al consultar el explorador público.");
      const data = await res.json();
      setAddressInfoData(data);
    } catch (err: any) {
      setAddressInfoError(err.message || "Error de red.");
      setAddressInfoData(null);
    } finally {
      setLoadingAddressInfo(false);
    }
  };

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

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Kukul Vault Descriptor",
          text: exportData.descriptor,
        });
      } catch (err) {
        console.log("User cancelled share or it failed", err);
      }
    } else {
      console.log("Web Share API no soportada");
    }
  };

  const downloadPdf = async (password?: string) => {
    const doc = new jsPDF(password ? {
      encryption: {
        userPassword: password,
        ownerPassword: password,
        userPermissions: ["print", "copy"]
      }
    } : undefined);
    const brandColor: [number, number, number] = [99, 102, 241]; // #6366f1
    const darkBg: [number, number, number] = [10, 12, 20]; // #0a0c14
    const lightText: [number, number, number] = [240, 240, 240];
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Header
    doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.text("KUKUL VAULT", 14, 20);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    doc.text("Reporte de Respaldo y Kit de Recuperación Oficial", 14, 30);

    // 2. Summary Info
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Detalles de Configuración de la Bóveda", 14, 52);

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(`Fecha de Creación: ${new Date().toLocaleDateString()}`, 14, 60);
    doc.text(`Esquema Multifirma: ${config.requiredApprovals} de ${config.totalDevices} firmas`, 14, 66);
    doc.text(`Red de Bitcoin: ${config.network.toUpperCase()}`, 14, 72);
    doc.text(`Seguro de Emergencia (Timelock): ${config.timelock.enabled ? "Activado" : "Desactivado"}`, 14, 78);
    if (config.timelock.enabled) {
      doc.text(`Tiempo de Bloqueo: ~ ${blocksToHuman(config.timelock.blocks)} (${config.timelock.blocks} bloques)`, 14, 84);
      const modeText = config.timelock.recoveryMode === "current-keys" 
        ? `Llaves propias (Quórum reducido a ${config.timelock.recoveryApprovals} firma/s)` 
        : `Persona de confianza (${config.timelock.trustedKey?.label || "Llave Externa"})`;
      doc.text(`Esquema de Recuperación: ${modeText}`, 14, 90);
    }

    // 3. QR Code
    try {
      const qrDataUrl = await QRCodeGenerator.toDataURL(descriptor, {
        width: 150,
        margin: 1,
        color: { dark: '#000000FF', light: '#FFFFFFFF' }
      });
      doc.addImage(qrDataUrl, "PNG", pageWidth - 65, 45, 50, 50);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("Escanea para importar en Wallet", pageWidth - 61, 98);
    } catch (err) {
      console.error("Error generating QR for PDF", err);
    }

    // 4. Descriptor String Box
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Descriptor Público BIP380 con Checksum", 14, 106);

    doc.setFillColor(245, 245, 250);
    doc.rect(14, 110, pageWidth - 28, 28, "F");

    doc.setFontSize(7.5);
    doc.setFont("courier", "normal");
    doc.setTextColor(40, 40, 40);
    const splitDescriptor = doc.splitTextToSize(descriptor, pageWidth - 32);
    doc.text(splitDescriptor, 16, 116);

    // 5. Table of Keys
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Registro de Dispositivos y Llaves Públicas (Xpubs)", 14, 148);

    const keysData = config.keys.map((k, i) => [
      `#${i + 1}`,
      k.label || `Llave ${i + 1}`,
      k.deviceType || "Desconocido",
      k.fingerprint || "N/A",
      k.derivationPath || "N/A",
      k.xpub || "N/A"
    ]);

    autoTable(doc, {
      startY: 152,
      head: [["ID", "Nombre", "Dispositivo", "Huella (FP)", "Ruta Deriv.", "Xpub Completo"]],
      body: keysData,
      headStyles: { fillColor: brandColor, textColor: 255 },
      styles: { fontSize: 7, cellPadding: 2.5, overflow: "linebreak" },
      columnStyles: {
        5: { font: "courier", fontSize: 5.5, cellWidth: 80 }
      },
      alternateRowStyles: { fillColor: [248, 248, 252] },
    });

    // 6. Footer
    doc.setDrawColor(200, 200, 200);
    doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("Documento generado por Kukul Vault. Mantenga este documento en un lugar seguro y privado.", 14, pageHeight - 12);
    doc.text("Este archivo es crítico para la recuperación de sus fondos en caso de emergencia.", 14, pageHeight - 8);

    // 7. Page 2: Addresses and Instructions
    doc.addPage();
    doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.text("KUKUL VAULT", 14, 20);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    doc.text("Direcciones e Instrucciones de Recuperación", 14, 30);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Instrucciones de Restauración", 14, 52);

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, 56, pageWidth - 14, 56);

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);

    const instructions = [
      "1. Mantenga este documento en un lugar seguro y analógico. El 'Descriptor BIP380' (en la página 1) es todo lo que necesita para restaurar su bóveda en cualquier software de Bitcoin compatible (Sparrow Wallet, Liana, etc.).",
      "2. Necesitará usar sus dispositivos físicos de hardware para firmar y autorizar cualquier transacción.",
      "3. Si activó el Seguro de Emergencia (Timelock), en caso de pérdida de llaves, debe esperar el tiempo de bloqueo definido para poder gastar/recuperar los fondos utilizando un quórum de firmas reducido o una llave de confianza.",
      "4. Puede depositar fondos en cualquiera de las direcciones mostradas a continuación. Son direcciones nativas de contrato P2WSH multifirma exclusivas de su configuración."
    ];

    let currentY = 62;
    instructions.forEach((text) => {
      const lines = doc.splitTextToSize(text, pageWidth - 28);
      doc.text(lines, 14, currentY);
      currentY += lines.length * 4.5 + 3;
    });

    currentY += 4;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Direcciones de Depósito Derivadas (Primeras 5)", 14, currentY);

    currentY += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, currentY, pageWidth - 14, currentY);
    currentY += 6;

    const addressesData = addresses.map((a) => [a.path, a.address]);

    autoTable(doc, {
      startY: currentY,
      head: [["Ruta de Derivación", "Dirección de Recibo"]],
      body: addressesData,
      headStyles: { fillColor: brandColor, textColor: 255 },
      styles: { fontSize: 8.5, cellPadding: 3, font: "courier" },
      alternateRowStyles: { fillColor: [248, 248, 252] },
    });

    doc.setDrawColor(200, 200, 200);
    doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("Documento generado por Kukul Vault. Mantenga este documento en un lugar seguro y privado.", 14, pageHeight - 12);
    doc.text("Este archivo es crítico para la recuperación de sus fondos en caso de emergencia.", 14, pageHeight - 8);

    doc.save(`kukul-vault-respaldo-${Date.now()}.pdf`);
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
        <div className="flex items-center gap-3 rounded-none-none border border-red-800/60 bg-red-950/20 p-4">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : (
        <>
          {/* Descriptor box */}
          <div className="rounded-none-none border border-[#1e2640] bg-[#121626]/40 p-6 flex flex-col items-center space-y-6 relative">
            <div
              className="bg-white p-6 rounded-none w-full shadow-sm relative flex justify-center items-center"
            >
              <QRCode value={descriptor} className="w-full max-w-[400px] h-auto" />
            </div>

            <div className="w-full space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-zinc-400 font-mono font-bold">
                  {experienceLevel === "beginner" ? "Código de Seguridad de Bóveda" : "Descriptor BIP380"}
                </span>
                <button
                  onClick={copy}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-none-none border border-[#6366f1]/40 bg-[#6366f1]/10 text-[#818cf8] text-xs font-bold hover:bg-[#6366f1]/20 hover:text-white transition-all shadow-sm"
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
              <div className="flex items-center justify-between mt-4">
                {experienceLevel === "beginner" ? (
                  <button
                    onClick={() => setShowAdvancedText((v) => !v)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 font-medium underline underline-offset-2 flex items-center gap-1"
                  >
                    {showAdvancedText ? "Ocultar código avanzado" : "Mostrar código avanzado"}
                  </button>
                ) : (
                  <span />
                )}
              </div>
              {(experienceLevel !== "beginner" || showAdvancedText) && (
                <p className="text-xs font-mono text-zinc-350 break-all bg-zinc-950 p-3 rounded-none-none border border-[#1e2640] leading-relaxed max-h-24 overflow-y-auto">
                  {descriptor}
                </p>
              )}
            </div>
          </div>

          {/* Resumen de configuración */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: experienceLevel === "beginner" ? "Regla de firmas" : "Regla", value: `${config.requiredApprovals} de ${config.totalDevices}` },

              { label: "Red", value: config.network},

              { label: "Seguro", value: config.timelock.enabled ? `Activo (${blocksToHuman(config.timelock.blocks)})` : "Inactivo" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-none-none border border-[#1e2640] bg-[#181d33]/20 p-3 text-center"
              >
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">{item.label}</div>
                <div className="text-xs font-semibold mt-1 text-white">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Advertencia de seguridad */}
          <div className="flex gap-3 rounded-none-none border border-[#1e2640] bg-[#121626]/20 p-4">
            <Eye className="w-5 h-5 text-[#818cf8] shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-400 leading-relaxed">
              {experienceLevel === "beginner"
                ? "Este archivo NO contiene contraseñas ni llaves para gastar. Sirve para ver tu saldo y registrar la bóveda en aplicaciones compatibles. Guárdalo con cuidado."
                : "El descriptor no contiene claves privadas, pero detalla el quórum y claves públicas de la bóveda. Mantén este archivo en secreto para proteger tu privacidad."}
            </p>
          </div>

          {/* Direcciones derivadas */}
          {addresses.length > 0 && (
            <div className="rounded-none-none border border-[#1e2640] bg-zinc-950/40">
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
                      <div className="flex gap-3 justify-self-start sm:justify-self-end shrink-0 items-center">
                        <button
                          onClick={() => checkOnChainInfo(a.address)}
                          className="text-[#818cf8] hover:text-white transition-colors text-xs font-semibold"
                        >
                          Consultar
                        </button>
                        <span className="text-zinc-800 text-xs">|</span>
                        <button
                          onClick={() => copyAddress(a.address, a.index)}
                          className="text-zinc-450 hover:text-[#818cf8] transition-colors text-xs"
                        >
                          {copiedAddress === a.index ? "Copiada" : "Copiar"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Blockchain Info Explorer Panel */}
          {selectedExplorerAddr && (
            <div className="rounded-none-none border border-[#1e2640] bg-[#121626]/20 p-5 space-y-4 animate-slideUp">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="text-xs uppercase tracking-widest text-[#818cf8] font-mono font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Estado en Blockchain (Mempool.space)
                </span>
                <div className="flex items-center gap-4">
                  <a
                    href={`${getMempoolExplorer(config.network)}/address/${selectedExplorerAddr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#818cf8] hover:text-white text-xs font-semibold underline underline-offset-2 flex items-center gap-1"
                  >
                    <Share2 className="w-3 h-3" />
                    Historial Completo
                  </a>
                  <button
                    onClick={() => setSelectedExplorerAddr("")}
                    className="text-zinc-500 hover:text-white text-xs font-semibold"
                  >
                    Cerrar
                  </button>
                </div>
              </div>

              <div className="text-xs font-mono break-all text-zinc-350 bg-zinc-950 p-2.5 border border-zinc-900 leading-relaxed">
                <span className="text-zinc-550">Dirección consultada:</span> {selectedExplorerAddr}
              </div>

              {loadingAddressInfo ? (
                <div className="flex items-center gap-2.5 py-6 justify-center">
                  <div className="w-4 h-4 border-2 border-[#6366f1] border-t-transparent animate-spin" />
                  <span className="text-xs text-zinc-400 font-mono">Consultando API en tiempo real...</span>
                </div>
              ) : addressInfoError ? (
                <div className="text-xs text-red-400 p-3 bg-red-950/20 border border-red-800/40">
                  {addressInfoError}
                </div>
              ) : addressInfoData ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2">
                  <div className="p-3.5 bg-[#070913]/80 border border-zinc-900 text-center">
                    <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Balance</div>
                    <div className="text-xs font-bold font-mono mt-1 text-white">
                      {(addressInfoData.chain_stats.funded_txo_sum - addressInfoData.chain_stats.spent_txo_sum) / 100000000} BTC
                    </div>
                  </div>
                  <div className="p-3.5 bg-[#070913]/80 border border-zinc-900 text-center">
                    <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Recibido Total</div>
                    <div className="text-xs font-bold font-mono mt-1 text-white">
                      {addressInfoData.chain_stats.funded_txo_sum / 100000000} BTC
                    </div>
                  </div>
                  <div className="p-3.5 bg-[#070913]/80 border border-zinc-900 text-center">
                    <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Confirmadas</div>
                    <div className="text-xs font-bold font-mono mt-1 text-white">
                      {addressInfoData.chain_stats.tx_count} txs
                    </div>
                  </div>
                  <div className="p-3.5 bg-[#070913]/80 border border-zinc-900 text-center">
                    <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">En Mempool (Pendientes)</div>
                    <div className="text-xs font-bold font-mono mt-1 text-[#818cf8]">
                      {addressInfoData.mempool_stats.tx_count} txs
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Seccion de Descargas */}
          <div className="mt-8 border-t border-zinc-800/80 pt-6">
            <h3 className="text-xl font-bold text-white mb-2 font-mono text-center">Descargas</h3>
            <div className="w-full border-t-2 border-dashed border-zinc-700 mb-6 mt-4"></div>

            <div className="flex gap-3 flex-col sm:flex-row flex-wrap">
              <Button
                onClick={download}
                className="flex-1 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-semibold h-12 text-sm shadow-[0_0_15px_rgba(99,102,241,0.15)] min-w-[150px] rounded-none"
              >
                <Download className="w-4 h-4 mr-2" />
                JSON
              </Button>
              <Button
                onClick={() => {
                  setPdfPassword("");
                  setShowPasswordText(false);
                  setShowPasswordModal(true);
                }}
                className="flex-1 bg-transparent border border-[#6366f1] text-[#818cf8] hover:bg-[#6366f1]/10 font-semibold h-12 text-sm min-w-[150px] rounded-none"
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button
                onClick={shareNative}
                className="flex-1 bg-transparent border border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-semibold h-12 text-sm min-w-[150px] rounded-none"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Compartir Texto
              </Button>
            </div>
          </div>
        </>
      )}
      {/* Fullscreen QR Modal */}
      {showFullscreenQR && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#070913] animate-scaleIn"
          onClick={() => setShowFullscreenQR(false)}
        >
          <button
            className="absolute top-6 right-6 text-zinc-400 hover:text-white transition-colors bg-zinc-900/50 p-3 rounded-none hover:bg-zinc-800"
            onClick={() => setShowFullscreenQR(false)}
          >
            <X className="w-8 h-8" />
          </button>

          <div
            className="w-full h-full flex items-center justify-center p-8 sm:p-12 md:p-24"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-white p-6 sm:p-12 shadow-[0_0_50px_rgba(99,102,241,0.2)] rounded-none w-full max-w-4xl aspect-square flex items-center justify-center">
              <QRCode
                value={descriptor}
                size={1024}
                level="L"
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}
      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0c0f1d] border border-[#1e2640] p-6 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#6366f1]/15 border border-[#6366f1]/30 flex items-center justify-center text-[#818cf8]">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Proteger Respaldo PDF</h3>
                  <p className="text-xs text-zinc-400">Opcional: Asigna una contraseña para encriptar tu archivo PDF.</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-350 block">Contraseña del PDF</label>
                <div className="relative">
                  <input
                    type={showPasswordText ? "text" : "password"}
                    value={pdfPassword}
                    onChange={(e) => setPdfPassword(e.target.value)}
                    placeholder="Escribe una contraseña segura..."
                    className="w-full bg-[#070913] border border-[#1e2640] px-3.5 py-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-[#6366f1] pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-550 hover:text-zinc-350"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal">
                  * Si asignas una contraseña, se te solicitará cada vez que intentes abrir el archivo PDF para ver el descriptor o las direcciones.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={() => {
                  downloadPdf(pdfPassword);
                  setShowPasswordModal(false);
                }}
                disabled={!pdfPassword}
                className="flex-1 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-semibold text-xs h-10 rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Descargar Protegido
              </Button>
              <Button
                onClick={() => {
                  downloadPdf();
                  setShowPasswordModal(false);
                }}
                className="flex-1 bg-transparent border border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-semibold text-xs h-10 rounded-none"
              >
                Descargar sin contraseña
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

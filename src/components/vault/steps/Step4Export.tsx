"use client";

import { useMemo, useState } from "react";
import type { VaultConfig } from "@/lib/types/vault";
import { useWallet } from "@/context/WalletContext";
import { generateDescriptor, descriptorWithChecksum } from "@/lib/bitcoin/descriptor";
import { deriveWshAddresses, type DerivedAddress } from "@/lib/bitcoin/address";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Copy, Download, ChevronDown, ChevronUp, Eye, Maximize2, X, FileText, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCodeGenerator from "qrcode";

interface Props { config: VaultConfig; }

export function Step4Export({ config }: Props) {
  const { experienceLevel } = useWallet();
  const [copied, setCopied] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<number | null>(null);
  const [showAddresses, setShowAddresses] = useState(true);
  const [showFullscreenQR, setShowFullscreenQR] = useState(false);

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

  const downloadPdf = async () => {
    const doc = new jsPDF();
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
    doc.text("Reporte de Respaldo y Recuperación", 14, 30);

    // 2. Summary Info
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Detalles de Configuración", 14, 55);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(`Fecha de Creación: ${new Date().toLocaleDateString()}`, 14, 65);
    doc.text(`Esquema Multifirma: ${config.requiredApprovals} de ${config.totalDevices}`, 14, 72);
    doc.text(`Red: ${config.network === "mainnet" ? "Bitcoin Mainnet" : "Bitcoin Testnet"}`, 14, 79);
    doc.text(`Seguro de Emergencia: ${config.timelock.enabled ? "Activado" : "Desactivado"}`, 14, 86);
    if (config.timelock.enabled) {
      doc.text(`Tiempo de Bloqueo: ~ ${Math.round(config.timelock.blocks / 1008)} semanas`, 14, 93);
    }

    // 3. QR Code
    try {
      const qrDataUrl = await QRCodeGenerator.toDataURL(descriptor, { 
        width: 150, 
        margin: 1, 
        color: { dark: '#000000FF', light: '#FFFFFFFF' } 
      });
      doc.addImage(qrDataUrl, "PNG", pageWidth - 65, 45, 50, 50);
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("Escanea el Descriptor", pageWidth - 56, 98);
    } catch (err) {
      console.error("Error generating QR for PDF", err);
    }

    // 4. Descriptor String Box
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Descriptor BIP380", 14, 110);

    doc.setFillColor(245, 245, 250);
    doc.rect(14, 115, pageWidth - 28, 25, "F");

    doc.setFontSize(9);
    doc.setFont("courier", "normal");
    doc.setTextColor(40, 40, 40);
    const splitDescriptor = doc.splitTextToSize(descriptor, pageWidth - 32);
    doc.text(splitDescriptor, 16, 122);

    // 5. Table of Keys
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Registro de Dispositivos (Llaves Públicas)", 14, 150);

    const keysData = config.keys.map((k, i) => [
      `#${i + 1}`,
      k.label || `Llave ${i + 1}`,
      k.deviceType || "mobile",
      k.xpub ? k.xpub.substring(0, 30) + "..." : "N/A"
    ]);

    autoTable(doc, {
      startY: 155,
      head: [["ID", "Nombre", "Tipo", "Xpub (Parcial)"]],
      body: keysData,
      headStyles: { fillColor: brandColor, textColor: 255 },
      styles: { fontSize: 9, cellPadding: 4 },
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

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Instrucciones de Restauración", 14, 55);

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, 60, pageWidth - 14, 60);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    
    const instructions = [
      "1. Mantenga este documento en un lugar seguro. El 'Descriptor BIP380' (en la página 1) es todo lo que necesita para restaurar su bóveda en cualquier software compatible con Bitcoin.",
      "2. Necesitará usar sus dispositivos de hardware para firmar y autorizar cualquier retiro.",
      "3. Si activó el Seguro de Emergencia (Timelock), en caso de pérdida, debe esperar el tiempo de bloqueo definido para recuperar los fondos con menos firmas.",
      "4. Puede depositar fondos en cualquiera de las direcciones mostradas a continuación. Son direcciones de contrato exclusivas de su bóveda."
    ];
    
    let currentY = 68;
    instructions.forEach((text) => {
      const lines = doc.splitTextToSize(text, pageWidth - 28);
      doc.text(lines, 14, currentY);
      currentY += lines.length * 5 + 4;
    });

    currentY += 5;
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Direcciones de Depósito", 14, currentY);
    
    currentY += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, currentY, pageWidth - 14, currentY);
    currentY += 8;

    const addressesData = addresses.map((a) => [a.path, a.address]);
    
    autoTable(doc, {
      startY: currentY,
      head: [["Derivación", "Dirección"]],
      body: addressesData,
      headStyles: { fillColor: brandColor, textColor: 255 },
      styles: { fontSize: 9, cellPadding: 4, font: "courier" },
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
              className="bg-white p-4 rounded-none-none shadow-sm relative group cursor-pointer"
              onClick={() => setShowFullscreenQR(true)}
            >
              <QRCode value={descriptor} size={192} className="w-48 h-48 transition-opacity group-hover:opacity-80" />
              <button 
                className="absolute bottom-2 right-2 bg-zinc-900/80 p-1.5 rounded-none-none text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                onClick={(e) => { e.stopPropagation(); setShowFullscreenQR(true); }}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-zinc-400 font-mono font-bold">
                  {experienceLevel === "beginner" ? "Código de Registro de Bóveda" : "Descriptor BIP380"}
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
              <p className="text-xs font-mono text-zinc-350 break-all bg-zinc-950 p-3 rounded-none-none border border-[#1e2640] leading-relaxed max-h-24 overflow-y-auto">
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

          {/* Seccion de Descargas */}
          <div className="mt-8 border-t border-zinc-800/80 pt-6">
            <h3 className="text-xl font-bold text-white mb-2 font-mono">Descargas</h3>
            <div className="w-full h-px bg-zinc-800 mb-6"></div>
            
            <div className="flex gap-3 flex-col sm:flex-row flex-wrap">
              <Button
                onClick={download}
                className="flex-1 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-semibold h-12 text-sm shadow-[0_0_15px_rgba(99,102,241,0.15)] min-w-[150px] rounded-none"
              >
                <Download className="w-4 h-4 mr-2" />
                JSON
              </Button>
              <Button
                onClick={downloadPdf}
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
    </div>
  );
}

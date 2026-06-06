import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { VaultConfig } from "@/lib/types/vault";
import { generateDescriptor, descriptorWithChecksum } from "./descriptor";
import { blocksToHuman } from "./timelock";

export async function exportRecoveryPDF(config: VaultConfig): Promise<void> {
  const descriptor = descriptorWithChecksum(generateDescriptor(config));
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const margin = 20;
  const contentW = W - margin * 2;
  let y = margin;

  // ── Helpers ──────────────────────────────────────────────────────────────
  const line = (dy = 6) => { y += dy; };
  const hRule = (color = "#e5e7eb") => {
    doc.setDrawColor(color);
    doc.line(margin, y, W - margin, y);
    line(5);
  };

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor("#0a0a0a");
  doc.rect(0, 0, W, 40, "F");
  doc.setTextColor("#ffffff");
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Bóveda Segura", margin, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#f97316");
  doc.text("Kit de Recuperación · Documento Confidencial", margin, 26);
  doc.setTextColor("#71717a");
  doc.text(`Generado: ${new Date().toLocaleDateString("es-MX", { dateStyle: "long" })}`, margin, 33);
  y = 50;

  // ── Instrucciones principales ─────────────────────────────────────────────
  doc.setFillColor("#fff7ed");
  doc.setDrawColor("#fed7aa");
  doc.roundedRect(margin, y, contentW, 28, 3, 3, "FD");
  doc.setTextColor("#9a3412");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("📋  ¿Cómo usar este documento?", margin + 5, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#7c2d12");
  const instructions = [
    "1. Guarda este papel en un lugar seguro (caja fuerte, notario, sobre sellado).",
    "2. Si pierdes tus dispositivos, escanea el código QR con Sparrow Wallet o Liana.",
    "3. Nunca compartas este documento digitalmente — solo en papel físico.",
  ];
  instructions.forEach((txt, i) => doc.text(txt, margin + 5, y + 15 + i * 5));
  line(36);

  // ── Configuración ─────────────────────────────────────────────────────────
  doc.setTextColor("#111827");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Configuración de la Bóveda", margin, y);
  line(7);

  const configRows = [
    ["Tipo",          `${config.requiredApprovals}-de-${config.totalDevices} multisig (P2WSH)`],
    ["Red",           config.network === "mainnet" ? "Bitcoin Mainnet" : "Testnet"],
    ["Recuperación",  config.timelock.enabled
      ? `Activa · ${blocksToHuman(config.timelock.blocks)} de inactividad`
      : "Sin timelock"],
  ];

  doc.setFontSize(9);
  configRows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor("#374151");
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#111827");
    doc.text(value, margin + 35, y);
    line(6);
  });
  line(3);
  hRule();

  // ── Llaves ────────────────────────────────────────────────────────────────
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor("#111827");
  doc.text("Dispositivos Vinculados", margin, y);
  line(7);

  config.keys.filter((k) => k.isValid).forEach((key, i) => {
    doc.setFillColor(i % 2 === 0 ? "#f9fafb" : "#ffffff");
    doc.rect(margin, y - 4, contentW, 22, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor("#374151");
    doc.text(`${i + 1}. ${key.label}`, margin + 2, y + 1);

    doc.setFont("helvetica", "normal");
    doc.setTextColor("#6b7280");
    doc.text(`Fingerprint: ${key.fingerprint}   Ruta: ${key.derivationPath}`, margin + 2, y + 6);

    doc.setFontSize(7);
    doc.setTextColor("#374151");
    doc.setFont("courier", "normal");
    const xpubLines = doc.splitTextToSize(key.xpub, contentW - 4);
    doc.text(xpubLines.slice(0, 2), margin + 2, y + 12);
    line(24);
  });

  hRule();

  // ── QR Code ───────────────────────────────────────────────────────────────
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor("#111827");
  doc.text("Código QR del Descriptor", margin, y);
  line(4);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#6b7280");
  doc.text("Escanea este código con Sparrow Wallet → File → Import Wallet → Descriptor", margin, y);
  line(6);

  // Genera QR como data URL
  const qrDataUrl = await QRCode.toDataURL(descriptor, {
    width: 300,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });

  const qrSize = 65;
  const qrX = W / 2 - qrSize / 2;

  // Borde del QR
  doc.setDrawColor("#e5e7eb");
  doc.setFillColor("#ffffff");
  doc.roundedRect(qrX - 3, y - 2, qrSize + 6, qrSize + 6, 3, 3, "FD");
  doc.addImage(qrDataUrl, "PNG", qrX, y, qrSize, qrSize);
  line(qrSize + 10);

  // ── Descriptor texto ──────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor("#374151");
  doc.text("Descriptor BIP380 (texto):", margin, y);
  line(5);

  doc.setFillColor("#f3f4f6");
  const descLines = doc.splitTextToSize(descriptor, contentW - 6);
  const descH = descLines.length * 4 + 6;
  doc.roundedRect(margin, y - 2, contentW, descH, 2, 2, "F");
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.setTextColor("#111827");
  doc.text(descLines, margin + 3, y + 3);
  line(descH + 5);

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFillColor("#0a0a0a");
  doc.rect(0, 282, W, 15, "F");
  doc.setTextColor("#52525b");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Bóveda Segura · Este documento no contiene llaves privadas", margin, 289);
  doc.text("boveda-segura.app", W - margin, 289, { align: "right" });

  doc.save(`boveda-kit-recuperacion-${Date.now()}.pdf`);
}

export function exportDescriptorTxt(config: VaultConfig): void {
  const descriptor = descriptorWithChecksum(generateDescriptor(config));
  const content = [
    "=== BÓVEDA SEGURA — KIT DE RECUPERACIÓN ===",
    `Fecha: ${new Date().toISOString()}`,
    `Red: ${config.network}`,
    `Configuración: ${config.requiredApprovals}-de-${config.totalDevices}`,
    "",
    "--- DESCRIPTOR BIP380 ---",
    descriptor,
    "",
    "--- DISPOSITIVOS ---",
    ...config.keys.filter((k) => k.isValid).map(
      (k, i) => `[${i + 1}] ${k.label}\n    Fingerprint: ${k.fingerprint}\n    Ruta: ${k.derivationPath}\n    XPUB: ${k.xpub}`
    ),
    "",
    "Importa este descriptor en Sparrow Wallet → File → Import Wallet → Descriptor",
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `boveda-descriptor-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
import type { XpubEntry } from "@/lib/types/vault";

// Estructura del wallet.json de Sparrow
interface SparrowKeystore {
  xpub: string;
  derivation: string;
  master_fingerprint: string;
  label?: string;
}

interface SparrowWallet {
  keystores?: SparrowKeystore[];
  descriptor?: string;
  name?: string;
}

export interface SparrowImportResult {
  keys: XpubEntry[];
  requiredApprovals?: number;
  totalDevices?: number;
  error?: string;
}

export function parseSparrowFile(content: string): SparrowImportResult {
  // Intenta JSON primero (wallet.json de Sparrow)
  try {
    const json: SparrowWallet = JSON.parse(content);

    if (json.keystores && Array.isArray(json.keystores)) {
      const keys: XpubEntry[] = json.keystores.map((ks, i) => ({
        id: crypto.randomUUID(),
        label: ks.label ?? `Dispositivo ${i + 1}`,
        xpub: ks.xpub ?? "",
        fingerprint: (ks.master_fingerprint ?? "").toUpperCase(),
        derivationPath: ks.derivation ?? "m/48'/0'/0'/2'",
        isValid: !!ks.xpub,
      }));
      return { keys };
    }

    // Formato OutputDescriptor de Sparrow (campo descriptor)
    if (json.descriptor) {
      return parseDescriptorString(json.descriptor);
    }

    return { keys: [], error: "Formato de archivo Sparrow no reconocido" };
  } catch {
    // No es JSON — intenta como descriptor de texto plano
    return parseDescriptorString(content.trim());
  }
}

function parseDescriptorString(descriptor: string): SparrowImportResult {
  // Extrae xpubs del descriptor: [fingerprint/path]xpub...
  const keyRegex = /\[([0-9a-fA-F]{8})\/([^\]]+)\](xpub[a-zA-Z0-9]+|zpub[a-zA-Z0-9]+)/g;
  const keys: XpubEntry[] = [];
  let match;

  while ((match = keyRegex.exec(descriptor)) !== null) {
    keys.push({
      id: crypto.randomUUID(),
      label: `Dispositivo ${keys.length + 1}`,
      xpub: match[3],
      fingerprint: match[1].toUpperCase(),
      derivationPath: `m/${match[2]}`,
      isValid: true,
    });
  }

  if (keys.length === 0) {
    return { keys: [], error: "No se encontraron llaves en el descriptor" };
  }

  // Extrae N de sortedmulti(N,...)
  const multiMatch = descriptor.match(/sortedmulti\((\d+),/);
  const requiredApprovals = multiMatch ? parseInt(multiMatch[1]) : undefined;

  return { keys, requiredApprovals, totalDevices: keys.length };
}
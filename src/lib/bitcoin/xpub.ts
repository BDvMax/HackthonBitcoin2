import * as bitcoin from "bitcoinjs-lib";
import { BIP32Factory } from "bip32";
import * as ecc from "tiny-secp256k1";

const bip32 = BIP32Factory(ecc);

export const SIGNET_NETWORK = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'tb',
  bip32: {
    public: 0x043587cf,
    private: 0x04358394,
  },
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef,
};

export function getBitcoinNetwork(network: "mainnet" | "testnet" | "signet" | "testnet4") {
  switch (network) {
    case "mainnet":  return bitcoin.networks.bitcoin;
    case "testnet":
    case "testnet4": return bitcoin.networks.testnet;
    case "signet":   return SIGNET_NETWORK;
    default:         return bitcoin.networks.bitcoin;
  }
}

// ── Prefijos de red esperados ────────────────────────────────────────────────
const MAINNET_PREFIXES = ["xpub", "xprv", "zpub", "zprv", "Zpub", "Zprv"];
const TESTNET_PREFIXES = ["tpub", "tprv", "upub", "uprv", "Upub", "Uprv"];

export function detectKeyNetwork(raw: string): "mainnet" | "testnet" | "unknown" {
  const prefix = raw.trim().slice(0, 4);
  if (MAINNET_PREFIXES.some((p) => raw.trim().startsWith(p))) return "mainnet";
  if (TESTNET_PREFIXES.some((p) => raw.trim().startsWith(p))) return "testnet";
  return "unknown";
}

export function isKeyCompatibleWithNetwork(
  raw: string,
  network: "mainnet" | "testnet" | "signet" | "testnet4"
): boolean {
  const keyNet = detectKeyNetwork(raw);
  if (keyNet === "unknown") return false;
  if (network === "mainnet") return keyNet === "mainnet";
  return keyNet === "testnet";
}

// ── Ruta por defecto según red y tipo de bóveda ──────────────────────────────
export function getDefaultDerivationPath(
  network: "mainnet" | "testnet" | "signet" | "testnet4",
  vaultType: "single" | "multi"
): string {
  const coin = network === "mainnet" ? "0" : "1";
  if (vaultType === "single") return `m/84'/${coin}'/0'`;
  return `m/48'/${coin}'/0'/2'`;
}

export interface ParsedXpub {
  xpub: string;
  fingerprint: string;
  derivationPath: string;
  depth: number;
  isValid: boolean;
  networkMismatch?: boolean;
  error?: string;
}

// ── Rutas multisig ───────────────────────────────────────────────────────────
export const STANDARD_PATHS: Record<string, string> = {
  "P2WSH (Nativo SegWit)":    "m/48'/0'/0'/2'",
  "P2SH-P2WSH (Compatible)":  "m/48'/0'/0'/1'",
  "P2SH (Legacy)":             "m/45'",
};

export const TESTNET_PATHS: Record<string, string> = {
  "P2WSH (Nativo SegWit)":    "m/48'/1'/0'/2'",
  "P2SH-P2WSH (Compatible)":  "m/48'/1'/0'/1'",
};

// ── Rutas single sig ─────────────────────────────────────────────────────────
export const STANDARD_SINGLE_PATHS: Record<string, string> = {
  "P2WPKH (Nativo SegWit)":   "m/84'/0'/0'",
  "P2SH-P2WPKH (Compatible)": "m/49'/0'/0'",
  "P2PKH (Legacy)":            "m/44'/0'/0'",
};

export const TESTNET_SINGLE_PATHS: Record<string, string> = {
  "P2WPKH (Nativo SegWit)":   "m/84'/1'/0'",
  "P2SH-P2WPKH (Compatible)": "m/49'/1'/0'",
  "P2PKH (Legacy)":            "m/44'/1'/0'",
};

export function parseXpub(
  raw: string,
  network: "mainnet" | "testnet" | "signet" | "testnet4" = "mainnet"
): ParsedXpub {
  const trimmed = raw.trim();

  if (!isKeyCompatibleWithNetwork(trimmed, network)) {
    const keyNet = detectKeyNetwork(trimmed);
    return {
      xpub: trimmed,
      fingerprint: "",
      derivationPath: "",
      depth: 0,
      isValid: false,
      networkMismatch: keyNet !== "unknown",
      error: keyNet !== "unknown"
        ? `Esta llave es de ${keyNet === "mainnet" ? "Mainnet" : "Testnet"} pero tu bóveda usa ${network}`
        : "Formato de llave no reconocido",
    };
  }

  try {
    const net = getBitcoinNetwork(network);
    const node = bip32.fromBase58(trimmed, net);
    const fp = node.parentFingerprint.toString(16).padStart(8, "0").toUpperCase();

    return {
      xpub: trimmed,
      fingerprint: fp,
      derivationPath: "",
      depth: node.depth,
      isValid: true,
    };
  } catch (e: unknown) {
    return {
      xpub: trimmed,
      fingerprint: "",
      derivationPath: "",
      depth: 0,
      isValid: false,
      error: e instanceof Error ? e.message : "XPUB inválido",
    };
  }
}

export function validateDerivationPath(path: string): boolean {
  return /^m(\/\d+[h']?)*$/.test(path.trim());
}

export function truncateXpub(xpub: string, head = 8, tail = 6): string {
  if (xpub.length <= head + tail) return xpub;
  return `${xpub.slice(0, head)}...${xpub.slice(-tail)}`;
}
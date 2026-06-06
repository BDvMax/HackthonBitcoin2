import * as bitcoin from "bitcoinjs-lib";
import { BIP32Factory } from "bip32";
import * as ecc from "tiny-secp256k1";

const bip32 = BIP32Factory(ecc);
// inputValue
export interface ParsedXpub {
  xpub: string;
  fingerprint: string;       // 4 bytes hex del master key parent
  derivationPath: string;    // ej: m/48'/0'/0'/2'
  depth: number;
  isValid: boolean;
  error?: string;
}

// Paths estándar para multisig (BIP48 nativo segwit = type 2)
export const STANDARD_PATHS: Record<string, string> = {
  "P2WSH (Nativo SegWit)":  "m/48'/0'/0'/2'",
  "P2SH-P2WSH (Compatible)": "m/48'/0'/0'/1'",
  "P2SH (Legacy)":           "m/45'",
};

export const TESTNET_PATHS: Record<string, string> = {
  "P2WSH (Nativo SegWit)":  "m/48'/1'/0'/2'",
  "P2SH-P2WSH (Compatible)": "m/48'/1'/0'/1'",
};

export function parseXpub(
  raw: string,
  network: "mainnet" | "testnet" = "mainnet"
): ParsedXpub {
  const net = network === "testnet"
    ? bitcoin.networks.testnet
    : bitcoin.networks.bitcoin;

  try {
    const node = bip32.fromBase58(raw.trim(), net);

    // fingerprint del parent (primeros 4 bytes en hex)
    const fp = node.parentFingerprint.toString(16).padStart(8, "0").toUpperCase();

    return {
      xpub: raw.trim(),
      fingerprint: fp,
      derivationPath: "",   // el usuario lo provee; validamos formato aparte
      depth: node.depth,
      isValid: true,
    };
  } catch (e: unknown) {
    return {
      xpub: raw.trim(),
      fingerprint: "",
      derivationPath: "",
      depth: 0,
      isValid: false,
      error: e instanceof Error ? e.message : "XPUB inválido",
    };
  }
}

// Valida formato de path: m/48'/0'/0'/2' o m/45'
export function validateDerivationPath(path: string): boolean {
  return /^m(\/\d+'?)*$/.test(path.trim());
}

// Shortform para UI: "xpub6ABC...XYZ"
export function truncateXpub(xpub: string, head = 8, tail = 6): string {
  if (xpub.length <= head + tail) return xpub;
  return `${xpub.slice(0, head)}...${xpub.slice(-tail)}`;
}

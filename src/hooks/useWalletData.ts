"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { VaultConfig } from "@/lib/types/vault";
import { generateDescriptor, descriptorWithChecksum } from "@/lib/bitcoin/descriptor";
import { deriveWshAddresses, type DerivedAddress } from "@/lib/bitcoin/address";

// ── Tipos de la API Esplora ──────────────────────────────────────────────────

export interface EsploraUtxo {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
  value: number; // satoshis
}

export interface EsploraVin {
  txid: string;
  vout: number;
  prevout: {
    scriptpubkey_address: string;
    value: number;
  } | null;
  is_coinbase: boolean;
}

export interface EsploraVout {
  scriptpubkey_address?: string;
  value: number;
}

export interface EsploraTransaction {
  txid: string;
  version: number;
  locktime: number;
  vin: EsploraVin[];
  vout: EsploraVout[];
  size: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

// ── Tipos internos ───────────────────────────────────────────────────────────

export interface WalletUtxo {
  txid: string;
  vout: number;
  value: number;
  address: string;
  confirmed: boolean;
  blockHeight?: number;
  blockTime?: number;
  confirmations?: number;
}

export type TxDirection = "received" | "sent" | "self";

export interface WalletTransaction {
  txid: string;
  direction: TxDirection;
  amount: number;       // satoshis, positivo = recibido, negativo = enviado
  fee: number;
  confirmed: boolean;
  blockHeight?: number;
  blockTime?: number;
  address?: string;     // contraparte principal
}

export interface AddressInfo extends DerivedAddress {
  utxos: EsploraUtxo[];
  txCount: number;
  hasActivity: boolean;
}

export interface WalletData {
  descriptor: string;
  addresses: AddressInfo[];
  utxos: WalletUtxo[];
  transactions: WalletTransaction[];
  confirmedBalance: number;
  unconfirmedBalance: number;
  totalBalance: number;
  lastUpdated: Date | null;
  tipHeight: number;
}

export type LoadingStage =
  | "idle"
  | "deriving"
  | "scanning"
  | "done"
  | "error";

export interface WalletState {
  data: WalletData | null;
  stage: LoadingStage;
  progress: number;       // 0-100
  progressLabel: string;
  error: string | null;
}

// ── Endpoints por red ────────────────────────────────────────────────────────

function esploraBase(network: string): string {
  switch (network) {
    case "mainnet":  return "https://blockstream.info/api";
    case "signet":   return "https://mutinynet.com/api";
    case "testnet4": return "https://mempool.space/testnet4/api";
    case "testnet":
    default:         return "https://blockstream.info/testnet/api";
  }
}

// ── Fetch con timeout y reintentos ───────────────────────────────────────────

async function fetchJson<T>(url: string, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw new Error("Max retries exceeded");
}

// ── Lógica de scan por gap limit ─────────────────────────────────────────────

const GAP_LIMIT = 20;

async function scanAddresses(
  base: string,
  addresses: DerivedAddress[],
  onProgress: (label: string, pct: number) => void
): Promise<AddressInfo[]> {
  const results: AddressInfo[] = [];
  let consecutiveEmpty = 0;

  for (let i = 0; i < addresses.length; i++) {
    if (consecutiveEmpty >= GAP_LIMIT) break;

    const addr = addresses[i];
    onProgress(`Escaneando dirección ${i + 1}/${addresses.length}`, 20 + (i / addresses.length) * 60);

    try {
      const [utxos, txs] = await Promise.all([
        fetchJson<EsploraUtxo[]>(`${base}/address/${addr.address}/utxo`),
        fetchJson<EsploraTransaction[]>(`${base}/address/${addr.address}/txs`),
      ]);

      const hasActivity = utxos.length > 0 || txs.length > 0;

      results.push({
        ...addr,
        utxos,
        txCount: txs.length,
        hasActivity,
      });

      consecutiveEmpty = hasActivity ? 0 : consecutiveEmpty + 1;
    } catch {
      results.push({ ...addr, utxos: [], txCount: 0, hasActivity: false });
      consecutiveEmpty++;
    }
  }

  return results;
}

// ── Procesar UTXOs ───────────────────────────────────────────────────────────

function buildUtxos(addressInfos: AddressInfo[], tipHeight: number): WalletUtxo[] {
  const utxos: WalletUtxo[] = [];

  for (const info of addressInfos) {
    for (const u of info.utxos) {
      utxos.push({
        txid: u.txid,
        vout: u.vout,
        value: u.value,
        address: info.address,
        confirmed: u.status.confirmed,
        blockHeight: u.status.block_height,
        blockTime: u.status.block_time,
        confirmations: u.status.block_height
          ? tipHeight - u.status.block_height + 1
          : 0,
      });
    }
  }

  return utxos.sort((a, b) => {
    if (a.confirmed !== b.confirmed) return a.confirmed ? -1 : 1;
    return (b.blockHeight ?? 0) - (a.blockHeight ?? 0);
  });
}

// ── Procesar transacciones ───────────────────────────────────────────────────

async function fetchAllTransactions(
  base: string,
  addressInfos: AddressInfo[],
  ownAddresses: Set<string>,
  onProgress: (label: string, pct: number) => void
): Promise<WalletTransaction[]> {
  const seen = new Set<string>();
  const txMap = new Map<string, WalletTransaction>();

  const active = addressInfos.filter(a => a.hasActivity);

  for (let i = 0; i < active.length; i++) {
    const info = active[i];
    onProgress(`Cargando historial ${i + 1}/${active.length}`, 80 + (i / Math.max(active.length, 1)) * 15);

    try {
      const txs = await fetchJson<EsploraTransaction[]>(`${base}/address/${info.address}/txs`);

      for (const tx of txs) {
        if (seen.has(tx.txid)) continue;
        seen.add(tx.txid);

        // Calcular flujo neto para esta wallet
        let received = 0;
        let spent = 0;

        for (const vout of tx.vout) {
          if (vout.scriptpubkey_address && ownAddresses.has(vout.scriptpubkey_address)) {
            received += vout.value;
          }
        }

        for (const vin of tx.vin) {
          if (vin.prevout?.scriptpubkey_address && ownAddresses.has(vin.prevout.scriptpubkey_address)) {
            spent += vin.prevout.value;
          }
        }

        const net = received - spent;
        const direction: TxDirection =
          net > 0 ? "received" : net < 0 ? "sent" : "self";

        // Contraparte: primera dirección externa relevante
        let counterpart: string | undefined;
        if (direction === "sent") {
          for (const vout of tx.vout) {
            if (vout.scriptpubkey_address && !ownAddresses.has(vout.scriptpubkey_address)) {
              counterpart = vout.scriptpubkey_address;
              break;
            }
          }
        } else if (direction === "received") {
          for (const vin of tx.vin) {
            if (vin.prevout?.scriptpubkey_address) {
              counterpart = vin.prevout.scriptpubkey_address;
              break;
            }
          }
        }

        txMap.set(tx.txid, {
          txid: tx.txid,
          direction,
          amount: Math.abs(net),
          fee: tx.fee,
          confirmed: tx.status.confirmed,
          blockHeight: tx.status.block_height,
          blockTime: tx.status.block_time,
          address: counterpart,
        });
      }
    } catch {
      // silencio: la dirección puede no tener historial
    }
  }

  return Array.from(txMap.values()).sort((a, b) => {
    if (a.confirmed !== b.confirmed) return a.confirmed ? -1 : 1;
    return (b.blockHeight ?? 0) - (a.blockHeight ?? 0);
  });
}

// ── Hook principal ───────────────────────────────────────────────────────────

const EMPTY_DATA: WalletData = {
  descriptor: "",
  addresses: [],
  utxos: [],
  transactions: [],
  confirmedBalance: 0,
  unconfirmedBalance: 0,
  totalBalance: 0,
  lastUpdated: null,
  tipHeight: 0,
};

export function useWalletData(config: VaultConfig) {
  const [state, setState] = useState<WalletState>({
    data: null,
    stage: "idle",
    progress: 0,
    progressLabel: "",
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    // Cancelar scan anterior si hay uno en curso
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState({ data: null, stage: "deriving", progress: 5, progressLabel: "Generando descriptor...", error: null });

    const base = esploraBase(config.network);

    try {
      // 1. Descriptor
      const raw = generateDescriptor(config);
      const descriptor = descriptorWithChecksum(raw);

      setState(s => ({ ...s, progress: 10, progressLabel: "Derivando direcciones..." }));

      // 2. Derivar 30 direcciones (gap limit real)
      const validKeys = config.keys
        .filter(k => k.isValid)
        .map(k => ({ xpub: k.xpub, derivationPath: k.derivationPath }));

      const derived = deriveWshAddresses(validKeys, config.requiredApprovals, config.network, 30);

      setState(s => ({ ...s, stage: "scanning", progress: 20, progressLabel: "Consultando red..." }));

      // 3. Obtener tip height
      let tipHeight = 0;
      try {
        tipHeight = await fetchJson<number>(`${base}/blocks/tip/height`);
      } catch { /* no crítico */ }

      // 4. Scan de direcciones con gap limit
      const onProgress = (label: string, pct: number) => {
        setState(s => ({ ...s, progress: Math.round(pct), progressLabel: label }));
      };

      const addressInfos = await scanAddresses(base, derived, onProgress);

      // 5. Set de direcciones propias para clasificar txs
      const ownAddresses = new Set(addressInfos.map(a => a.address));

      // 6. Transacciones
      setState(s => ({ ...s, progress: 80, progressLabel: "Cargando historial..." }));
      const transactions = await fetchAllTransactions(base, addressInfos, ownAddresses, onProgress);

      // 7. UTXOs consolidados
      const utxos = buildUtxos(addressInfos, tipHeight);

      // 8. Balances
      const confirmedBalance = utxos.filter(u => u.confirmed).reduce((a, u) => a + u.value, 0);
      const unconfirmedBalance = utxos.filter(u => !u.confirmed).reduce((a, u) => a + u.value, 0);

      setState({
        data: {
          descriptor,
          addresses: addressInfos,
          utxos,
          transactions,
          confirmedBalance,
          unconfirmedBalance,
          totalBalance: confirmedBalance + unconfirmedBalance,
          lastUpdated: new Date(),
          tipHeight,
        },
        stage: "done",
        progress: 100,
        progressLabel: "Sincronizado",
        error: null,
      });

    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setState(s => ({
        ...s,
        data: { ...EMPTY_DATA, descriptor: "" },
        stage: "error",
        error: err?.message ?? "Error al conectar con la red Bitcoin",
      }));
    }
  }, [config]);

  useEffect(() => {
    load();
    return () => { abortRef.current?.abort(); };
  }, [load]);

  return { ...state, refresh: load };
}
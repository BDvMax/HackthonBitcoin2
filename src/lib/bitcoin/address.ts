// lib/bitcoin/address.ts
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import BIP32Factory from "bip32";
import { getBitcoinNetwork } from "./xpub";

const bip32 = BIP32Factory(ecc);

export interface DerivedAddress {
  address: string;
  index: number;
  path: string;
}

interface KeyForDerivation {
  xpub: string;
  derivationPath: string;
  fingerprint?: string;
}

/**
 * Deriva la clave pública en un índice dado a partir de un xpub.
 * Soporta tanto /0/* (receive) como /1/* (change).
 */
function derivePublicKey(
  xpub: string,
  change: number,
  index: number,
  network: bitcoin.Network
): Buffer {
  const node = bip32.fromBase58(xpub, network);
  const child = node.derive(change).derive(index);
  return Buffer.from(child.publicKey);
}

/**
 * Construye un script P2WSH sortedmulti manualmente:
 * ordena las pubkeys lexicográficamente (como hace sortedmulti).
 */
function buildSortedMultiP2WSH(
  pubkeys: Buffer[],
  requiredApprovals: number,
  network: bitcoin.Network
): string {
  // sortedmulti ordena las claves lexicográficamente
  const sorted = [...pubkeys].sort(Buffer.compare);

  const redeemScript = bitcoin.script.compile([
    bitcoin.script.number.encode(requiredApprovals),
    ...sorted,
    bitcoin.script.number.encode(sorted.length),
    bitcoin.opcodes.OP_CHECKMULTISIG,
  ]);

  const p2wsh = bitcoin.payments.p2wsh({
    redeem: { output: redeemScript, network },
    network,
  });

  if (!p2wsh.address) throw new Error("No se pudo generar dirección P2WSH");
  return p2wsh.address;
}

/**
 * Deriva direcciones P2WSH sortedmulti reales.
 * Compatible con Sparrow y descriptores wsh(sortedmulti(...)).
 */
export function deriveWshAddresses(
  keys: KeyForDerivation[],
  requiredApprovals: number,
  network: "mainnet" | "testnet" | "signet" | "testnet4",
  count = 5,
  change = 0
): DerivedAddress[] {
  const net = getBitcoinNetwork(network);
  const addresses: DerivedAddress[] = [];

  for (let index = 0; index < count; index++) {
    try {
      const pubkeys = keys.map((k) => derivePublicKey(k.xpub, change, index, net));
      const address = buildSortedMultiP2WSH(pubkeys, requiredApprovals, net);
      addresses.push({
        address,
        index,
        path: `.../${change}/${index}`,
      });
    } catch (err) {
      console.error(`Error al derivar dirección en índice ${index}:`, err);
    }
  }

  return addresses;
}

import * as bitcoin from "bitcoinjs-lib";
import { BIP32Factory } from "bip32";
import * as ecc from "tiny-secp256k1";

const bip32 = BIP32Factory(ecc);

export interface DerivedAddress {
  address: string;
  index: number;
  path: string; // ej: .../0/0
}

interface KeyForDerivation {
  xpub: string;
  derivationPath: string;
}

/**
 * Deriva direcciones P2WSH sortedmulti desde XPUBs crudos.
 * Equivale a evaluar wsh(sortedmulti(N, xpub/0/index, ...))
 */
export function deriveWshAddresses(
  keys: KeyForDerivation[],
  requiredApprovals: number,
  network: "mainnet" | "testnet",
  count = 5,
  change = 0 // 0 = recibo, 1 = cambio
): DerivedAddress[] {
  const net =
    network === "testnet" ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;

  const addresses: DerivedAddress[] = [];

  for (let index = 0; index < count; index++) {
    // Deriva la pubkey de cada xpub en /change/index
    const pubkeys = keys
      .map((k) => {
        const node = bip32.fromBase58(k.xpub.trim(), net);
        return node.derive(change).derive(index).publicKey;
      })
      // sortedmulti: ordena lexicográficamente los pubkeys
      .sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));


    const p2wsh = bitcoin.payments.p2wsh({
      redeem: bitcoin.payments.p2ms({
        m: requiredApprovals,
        pubkeys,
        network: net,
      }),
      network: net,
    });

    if (!p2wsh.address) continue;

    addresses.push({
      address: p2wsh.address,
      index,
      path: `.../${change}/${index}`,
    });
  }

  return addresses;
}
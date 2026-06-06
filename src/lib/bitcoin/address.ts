import * as bitcoin from "bitcoinjs-lib";
import * as secp256k1 from "@bitcoinerlab/secp256k1";
import { DescriptorsFactory } from "@bitcoinerlab/descriptors";

const { Output } = DescriptorsFactory(secp256k1);

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
 * Deriva direcciones P2WSH reales a partir del descriptor BIP380/Miniscript.
 */
export function deriveWshAddresses(
  keys: KeyForDerivation[],
  requiredApprovals: number,
  network: "mainnet" | "testnet",
  count = 5,
  change = 0, // 0 = recibo, 1 = cambio
  descriptorStr?: string
): DerivedAddress[] {
  const net =
    network === "testnet" ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;

  const addresses: DerivedAddress[] = [];

  // Si no se pasa un descriptorStr, construimos uno simple por compatibilidad
  let baseDesc = descriptorStr ? descriptorStr.split("#")[0] : "";
  if (!baseDesc && keys.length >= 2) {
    const keyExprs = keys.map((k) => {
      const path =
        k.derivationPath === "m"
          ? ""
          : k.derivationPath.replace(/^m\//, "");

      return `[00000000${path ? `/${path}` : ""}]${k.xpub}/0/*`;
    });
    baseDesc = `wsh(sortedmulti(${requiredApprovals},${keyExprs.join(",")}))`;
  }

  if (!baseDesc) return [];

  // Ajustar la ruta si es de cambio
  if (change === 1) {
    baseDesc = baseDesc.replace(/\/0\/\*/g, "/1/*");
  }

  for (let index = 0; index < count; index++) {
    try {
      const output = new Output({
        descriptor: baseDesc,
        index,
        network: net,
      });

      const address = output.getAddress();
      if (address) {
        addresses.push({
          address,
          index,
          path: `.../${change}/${index}`,
        });
      }
    } catch (err) {
      console.error(`Error al derivar dirección en índice ${index}:`, err);
    }
  }

  return addresses;
}
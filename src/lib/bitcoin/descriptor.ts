import type { VaultConfig } from "@/lib/types/vault";
import { timelockDescriptorFragment } from "./timelock";

// Genera descriptor WSH multisig con timelock opcional
export function generateDescriptor(config: VaultConfig): string {
  const { requiredApprovals, keys } = config;

  const validKeys = keys.filter((k) => k.isValid);

  if (validKeys.length < 2) {
    throw new Error("Se requieren al menos 2 llaves válidas");
  }

  if (requiredApprovals > validKeys.length) {
    throw new Error("Aprobaciones > llaves disponibles");
  }

  const keyExprs = validKeys.map((k) => {
    const path =
      k.derivationPath === "m"
        ? ""
        : k.derivationPath.replace(/^m\//, "").replace(/'/g, "h");
//                                          ↑ convierte ' → h

    return `[${k.fingerprint}${path ? `/${path}` : ""}]${k.xpub}/0/*`;
  });

  const multisig = `sortedmulti(${requiredApprovals},${keyExprs.join(",")})`;
  let inner = multisig;

  if (config.timelock.enabled) {
    const tlFrag = timelockDescriptorFragment(config.timelock);

    let recoveryBranch = "";
    if (config.timelock.recoveryMode === "current-keys") {
      // Usar las mismas llaves pero con menor umbral y con un índice de derivación diferente (/1/*)
      // Esto es OBLIGATORIO en Miniscript para evitar claves públicas duplicadas en ramas OR.
      const recApprovals = config.timelock.recoveryApprovals || 1;
      
      const recKeyExprs = validKeys.map((k) => {
        const path = k.derivationPath === "m" ? "" : k.derivationPath.replace(/^m\//, "");
        return `[${k.fingerprint}${path ? `/${path}` : ""}]${k.xpub}/1/*`;
      });

      if (recApprovals < requiredApprovals) {
        recoveryBranch = `and_v(v:multi(${recApprovals},${recKeyExprs.join(",")}),${tlFrag})`;
      }
    } else if (config.timelock.recoveryMode === "trusted-person" && config.timelock.trustedKey) {
      // Usar la llave de la persona de confianza
      const tk = config.timelock.trustedKey;
      const path = tk.derivationPath === "m" ? "" : tk.derivationPath.replace(/^m\//, "");
      const tkExpr = `[${tk.fingerprint}${path ? `/${path}` : ""}]${tk.xpub}/0/*`;
      recoveryBranch = `and_v(v:pk(${tkExpr}),${tlFrag})`;
    }

    if (recoveryBranch) {
      inner = `or_d(${multisig},${recoveryBranch})`;
    }
  }

  return `wsh(${inner})`;
}

// Añade checksum al descriptor
export function descriptorWithChecksum(descriptor: string): string {
  return `${descriptor}#${computeChecksum(descriptor)}`;
}

function computeChecksum(desc: string): string {
  const INPUT_CHARSET =
    "0123456789()[],'/*abcdefgh@:$%{}IJKLMNOPQRSTUVWXYZ&+-.;<=>?!^_|~ijklmnopqrstuvwxyzABCDEFGH`#\"\\ ";

  const CHECKSUM_CHARSET =
    "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

  let c = 1n;
  let cls = 0;
  let clscount = 0;

  for (const ch of desc) {
    const pos = INPUT_CHARSET.indexOf(ch);

    if (pos === -1) {
      throw new Error(`Carácter inválido para checksum: '${ch}'`);
    }

    c = polymod(c, BigInt(pos & 31));

    cls = cls * 3 + (pos >> 5);

    clscount++;

    if (clscount === 3) {
      c = polymod(c, BigInt(cls));
      cls = 0;
      clscount = 0;
    }
  }

  if (clscount > 0) {
    c = polymod(c, BigInt(cls));
  }

  for (let i = 0; i < 8; i++) {
    c = polymod(c, 0n);
  }

  c ^= 1n;

  let result = "";

  for (let i = 0; i < 8; i++) {
    result +=
      CHECKSUM_CHARSET[
        Number((c >> BigInt(5 * (7 - i))) & 31n)
      ];
  }

  return result;
}

function polymod(c: bigint, val: bigint): bigint {
  const GEN = [
    0xf5dee51989n,
    0xa9fdca3312n,
    0x1bab10e32dn,
    0x3706b1677an,
    0x644d626ffdn,
  ];

  const b = c >> 35n;

  let res = ((c & 0x7ffffffffn) << 5n) ^ val;

  for (let i = 0; i < 5; i++) {
    if (((b >> BigInt(i)) & 1n) !== 0n) {
      res ^= GEN[i];
    }
  }

  return res;
}
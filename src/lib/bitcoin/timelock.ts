export interface TimelockParams {
  type: "relative" | "absolute";
  blocks: number;
}

// BIP68: relative timelock (sequence field) — máx 65535 bloques
export function encodeRelativeTimelock(blocks: number): number {
  if (blocks < 1 || blocks > 65535) throw new Error("Rango BIP68: 1–65535");
  return blocks & 0xffff;
}

// BIP65: absolute timelock (nLockTime) — altura de bloque
export function encodeAbsoluteTimelock(height: number): number {
  if (height < 500000) throw new Error("Usa altura > 500000 para evitar ambigüedad con timestamps");
  return height;
}

export function timelockDescriptorFragment({ type, blocks }: TimelockParams): string {
  if (type === "relative") return `older(${encodeRelativeTimelock(blocks)})`;
  return `after(${encodeAbsoluteTimelock(blocks)})`;
}

// Estimación humana (~10 min/bloque)
export function blocksToHuman(blocks: number): string {
  const minutes = blocks * 10;
  if (minutes < 60) return `~${minutes} minutos`;
  if (minutes < 1440) return `~${Math.round(minutes / 60)} horas`;
  if (minutes < 10080) return `~${Math.round(minutes / 1440)} días`;
  return `~${Math.round(minutes / 10080)} semanas`;
}
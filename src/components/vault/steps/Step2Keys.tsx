"use client";

import { useState, useCallback } from "react";
import type { VaultConfig, XpubEntry } from "@/lib/types/vault";
import { useWallet } from "@/context/WalletContext";
import {
  parseXpub,
  validateDerivationPath,
  truncateXpub,
  STANDARD_PATHS,
  TESTNET_PATHS,
  STANDARD_SINGLE_PATHS,
  TESTNET_SINGLE_PATHS,
  getBitcoinNetwork,
  getDefaultDerivationPath,
  detectKeyNetwork,
  isKeyCompatibleWithNetwork,
} from "@/lib/bitcoin/xpub";
import { cn } from "@/lib/utils";
import {
  AlertCircle, ChevronDown, Trash2, Smartphone, Laptop, Settings,
  Sparkles, HelpCircle, Cpu, KeyRound, Eye, EyeOff, Copy, Check,
  RefreshCw, ChevronRight, Lock, GitBranch, Hash, ArrowDown,
  ShieldCheck, X, AlertTriangle,
} from "lucide-react";
import { Term } from "@/components/ui/Term";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import * as bitcoin from "bitcoinjs-lib";
import { BIP32Factory } from "bip32";
import * as ecc from "tiny-secp256k1";

const bip32 = BIP32Factory(ecc);

// ── BIP39 wordlist ────────────────────────────────────────────────────────────

import { wordlists } from "bip39";

const BIP39_WORDLIST = wordlists.english;

interface GeneratedKeyData {
  mnemonic: string;
  xprv: string;
  xpub: string;
  fingerprint: string;
  derivationPath: string;
  network: string;
}

interface Props {
  config: VaultConfig;
  onChange: (p: Partial<VaultConfig>) => void;
}

const EMPTY_KEY = (
  _index: number,
  network: "mainnet" | "testnet" | "signet" | "testnet4" = "testnet",
  vaultType: "single" | "multi" = "multi"
): XpubEntry => ({
  id: crypto.randomUUID(),
  label: "",
  xpub: "",
  fingerprint: "",
  derivationPath: getDefaultDerivationPath(network, vaultType),
  isValid: false,
  deviceType: "laptop",
});

const TEST_KEYS = [
  { xpub: "tpubD6NzVbkrYhZ4XvtwtJAAVNFzGVq1K889Na8wnLddjVFgRmTXroMotMvMNmL2ddAXoEMcSox9Jr5uzqu8vvGPMq8UfQ9xXpVZKRwadPJWVZD", fingerprint: "00000000", derivationPath: "m/48'/1'/0'/2'" },
  { xpub: "tpubD6NzVbkrYhZ4Xq2ArdoixK1nWTiY7jmXA5nYPCosK7mAE5YThnejXwa7wE1pmMzFBc75Rm55EAFdcwXnCmWiNafeBtYy1MRnczRUcWjpK3Z", fingerprint: "00000000", derivationPath: "m/48'/1'/0'/2'" },
  { xpub: "tpubD6NzVbkrYhZ4XyJPQdsbmficgimFGSZa1a331bRtdNyqKecyFDXaHSSeFmDqNWMNT186NsZ1r3juvSkHWXRPU5jSBr8orMuDt7Rpo2ocCsQ", fingerprint: "00000000", derivationPath: "m/48'/1'/0'/2'" },
];

function hexToBin(hex: string): string {
  return hex.split("").map((h) => parseInt(h, 16).toString(2).padStart(4, "0")).join("");
}

async function sha256Hex(hex: string): Promise<string> {
  const bytes = new Uint8Array(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function entropyToMnemonic(entropyHex: string): Promise<string> {
  const checkHex = await sha256Hex(entropyHex);
  const bits = hexToBin(entropyHex) + hexToBin(checkHex).slice(0, entropyHex.length / 2 / 4);
  const words: string[] = [];
  for (let i = 0; i < bits.length; i += 11) {
    words.push(BIP39_WORDLIST[parseInt(bits.slice(i, i + 11), 2)]);
  }
  return words.join(" ");
}

async function mnemonicToSeed(mnemonic: string, passphrase = ""): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(mnemonic.normalize("NFKD")), { name: "PBKDF2" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(("mnemonic" + passphrase).normalize("NFKD")), iterations: 2048, hash: "SHA-512" },
    key, 512
  );
  return new Uint8Array(bits);
}

function deriveKeys(
  seedBytes: Uint8Array,
  network: "mainnet" | "testnet" | "signet" | "testnet4",
  vaultType: "single" | "multi"
): { xprv: string; xpub: string; fingerprint: string; derivationPath: string } {
  const net = getBitcoinNetwork(network);
  const root = bip32.fromSeed(Buffer.from(seedBytes), net);
  const masterFp = Array.from(root.fingerprint).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  const pathSegments = getDefaultDerivationPath(network, vaultType);
  const accountNode = root.derivePath(pathSegments);
  return {
    xprv: accountNode.toBase58(),
    xpub: accountNode.neutered().toBase58(),
    fingerprint: masterFp,
    derivationPath: pathSegments,
  };
}

// ── Helpers para mensajes de error ───────────────────────────────────────────

function getXpubErrorMessage(
  xpub: string,
  network: "mainnet" | "testnet" | "signet" | "testnet4",
  vaultType: "single" | "multi",
  derivationPath: string
): string | null {
  if (!xpub) return null;

  // 1. Incompatibilidad de red
  if (!isKeyCompatibleWithNetwork(xpub, network)) {
    const keyNet = detectKeyNetwork(xpub);
    if (keyNet !== "unknown") {
      const keyNetLabel = keyNet === "mainnet" ? "Mainnet" : "Testnet";
      const vaultNetLabel = network === "mainnet" ? "Mainnet" : network;
      return `Esta llave es de ${keyNetLabel}, pero tu bóveda usa ${vaultNetLabel}. Cambia la red en el Paso 1 o usa una llave compatible.`;
    }
    return "Formato de llave no reconocido.";
  }

  // 2. Incompatibilidad de ruta con vaultType
  if (vaultType === "single" && derivationPath.startsWith("m/48'")) {
    return "Ruta incompatible con Single Sig. Esta llave usa m/48' (multisig). Necesitas una llave con ruta m/84'.";
  }
  if (vaultType === "multi" && !derivationPath.startsWith("m/48'")) {
    return `Ruta incompatible con Multisig. Se esperaba m/48' pero se encontró ${derivationPath}. Cambia la ruta o usa una llave multisig.`;
  }

  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// Step2Keys
// ══════════════════════════════════════════════════════════════════════════════

export function Step2Keys({ config, onChange }: Props) {
  const { totalDevices, keys, network, vaultType } = config;
  const { experienceLevel } = useWallet();
  const { playClick, playSuccess, playError, playToggle } = useSoundEffects();

  const [keygenOpen, setKeygenOpen] = useState(false);
  const [keygenWordCount, setKeygenWordCount] = useState<12 | 24>(24);
  const [keygenPassphrase, setKeygenPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<GeneratedKeyData | null>(null);
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [keygenStep, setKeygenStep] = useState<"generate" | "result">("generate");
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [seedBackedUp, setSeedBackedUp] = useState(false);

  const slotCount = vaultType === "single" ? 1 : totalDevices;

  const entries: XpubEntry[] = Array.from({ length: slotCount }, (_, i) =>
    keys[i] ?? EMPTY_KEY(i, network, vaultType)
  );

  const [showPathDropdown, setShowPathDropdown] = useState<string | null>(null);

  const updateEntry = useCallback(
    (id: string, patch: Partial<XpubEntry>) => {
      const updated = entries.map((e) => (e.id === id ? { ...e, ...patch } : e));
      onChange({ keys: updated });
    },
    [entries, onChange]
  );

  // FIX 1: validateKeyEntry ahora verifica compatibilidad de red PRIMERO
  // antes de considerar la llave como válida
  const validateKeyEntry = useCallback(
    (xpub: string, fingerprint: string, path: string) => {
      if (!xpub) return false;
      // Red incompatible → inválida (bloquea el avance)
      if (!isKeyCompatibleWithNetwork(xpub, network)) return false;
      const parsed = parseXpub(xpub, network);
      if (!parsed.isValid || parsed.networkMismatch) return false;
      if (!validateDerivationPath(path)) return false;
      if (!/^[0-9A-Fa-f]{8}$/.test(fingerprint.trim())) return false;
      // Ruta incompatible con tipo de bóveda → inválida
      if (vaultType === "single" && path.startsWith("m/48'")) return false;
      if (vaultType === "multi" && !path.startsWith("m/48'")) return false;
      return true;
    },
    [network, vaultType]
  );

  const handleXpubChange = (id: string, raw: string) => {
    const cleaned = raw.trim().replace(/\s+/g, "");
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    const parsed = parseXpub(cleaned, network);
    const fp = parsed.fingerprint || entry.fingerprint || "";
    updateEntry(id, {
      xpub: cleaned,
      fingerprint: fp,
      isValid: validateKeyEntry(cleaned, fp, entry.derivationPath),
    });
  };

  const handleFingerprintChange = (id: string, fp: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    updateEntry(id, { fingerprint: fp, isValid: validateKeyEntry(entry.xpub, fp, entry.derivationPath) });
  };

  const handlePathChange = (id: string, path: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    updateEntry(id, { derivationPath: path, isValid: validateKeyEntry(entry.xpub, entry.fingerprint, path) });
  };

  const loadTestKey = (id: string, index: number) => {
    playSuccess();
    const testKey = TEST_KEYS[index % TEST_KEYS.length];
    const parsed = parseXpub(testKey.xpub, network);
    updateEntry(id, {
      xpub: testKey.xpub,
      fingerprint: testKey.fingerprint,
      derivationPath: testKey.derivationPath,
      isValid: validateKeyEntry(testKey.xpub, testKey.fingerprint, testKey.derivationPath),
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    playClick();
    try {
      const bytes = keygenWordCount === 24 ? 32 : 16;
      const entropy = new Uint8Array(bytes);
      crypto.getRandomValues(entropy);
      const entropyHex = Array.from(entropy).map((b) => b.toString(16).padStart(2, "0")).join("");
      const mnemonicStr = await entropyToMnemonic(entropyHex);
      const wordList = mnemonicStr.split(" ");
      const seedBytes = await mnemonicToSeed(mnemonicStr, keygenPassphrase);
      const { xprv, xpub, fingerprint, derivationPath } = deriveKeys(seedBytes, network, vaultType ?? "multi");
      setMnemonic(wordList);
      setGeneratedKey({ mnemonic: mnemonicStr, xprv, xpub, fingerprint, derivationPath, network });
      setKeygenStep("result");
      playSuccess();
    } catch (err) {
      console.error("Error generando claves:", err);
      playError();
    } finally {
      setGenerating(false);
    }
  };

  const handleUseKey = (targetId?: string) => {
    if (!generatedKey) return;
    let resolvedId = targetId;
    if (!resolvedId) {
      const firstEmpty = entries.findIndex((e) => !e.xpub || !e.xpub.trim());
      resolvedId = firstEmpty >= 0 ? entries[firstEmpty].id : entries[entries.length - 1].id;
    }
    updateEntry(resolvedId, {
      xpub: generatedKey.xpub,
      fingerprint: generatedKey.fingerprint,
      derivationPath: generatedKey.derivationPath,
      isValid: validateKeyEntry(generatedKey.xpub, generatedKey.fingerprint, generatedKey.derivationPath),
      label: `Llave generada (${network})`,
    });
    playSuccess();
    setKeygenStep("generate");
    setGeneratedKey(null);
    setMnemonic([]);
    setShowMnemonic(false);
    setShowWarningModal(false);
    setSeedBackedUp(false);
  };

  const handleCloseKeygen = () => {
    setKeygenOpen(false);
    setKeygenStep("generate");
    setGeneratedKey(null);
    setMnemonic([]);
    setShowMnemonic(false);
    setShowWarningModal(false);
    setSeedBackedUp(false);
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const validCount = entries.filter((e) => e.isValid).length;

  return (
    <div className="space-y-6 transition-all duration-300">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white">
          {vaultType === "single"
            ? "Vincula tu llave"
            : experienceLevel === "beginner"
            ? "Registra tus dispositivos"
            : "Vincula tus llaves criptográficas"}
        </h2>
        <p className="text-base text-zinc-400 mt-3 leading-relaxed">
          {vaultType === "single" ? (
            <span>Pega la <Term name="xpub" /> de tu dispositivo para configurar tu bóveda single sig.</span>
          ) : experienceLevel === "beginner" ? (
            "Conecta tus llaves. Pega el código de lectura de cada dispositivo para continuar."
          ) : (
            <span>Importa la <Term name="xpub" /> de cada dispositivo para tu bóveda multisig.</span>
          )}
        </p>
      </div>

      {/* Generador BIP39 */}
      <div className={cn(
        "rounded-xl overflow-hidden transition-all duration-300",
        keygenOpen ? "border-[#6366f1] shadow-[0_0_20px_rgba(99,102,241,0.15)] bg-[#121626]" : "border border-[#6366f1]/50 bg-[#6366f1]/5 hover:bg-[#6366f1]/10 hover:border-[#6366f1]/80"
      )}>
        <button
          onClick={() => { playClick(); setKeygenOpen((v) => !v); }}
          className="w-full flex items-center justify-between px-5 py-5 transition-colors relative group"
        >
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-full bg-[#6366f1] flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)] group-hover:scale-110 transition-transform">
              <KeyRound className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="text-lg font-extrabold text-white">Generar nueva llave</p>
              <p className="text-sm text-zinc-300 mt-0.5">
                {experienceLevel === "beginner" ? "Crea una llave segura si aún no tienes una." : "Crea una semilla HD y deriva xpub/xprv."}
              </p>
            </div>
          </div>
          <ChevronRight className={cn("w-6 h-6 text-[#818cf8] transition-transform duration-300 relative z-10", keygenOpen && "rotate-90")} />
        </button>

        {keygenOpen && (
          <div className="border-t border-[#6366f1]/30">
            {keygenStep === "generate" && (
              <div className="p-5 space-y-6">
                
                {experienceLevel === "beginner" && (
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 bg-[#0a0c14] border border-[#1e2640] rounded-lg p-4 animate-slideUp" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
                      <div className="w-8 h-8 rounded-full bg-[#6366f1]/20 text-[#818cf8] flex items-center justify-center font-bold mb-2">1</div>
                      <p className="text-xs text-zinc-300">Selecciona el nivel de seguridad (palabras).</p>
                    </div>
                    <div className="flex-1 bg-[#0a0c14] border border-[#1e2640] rounded-lg p-4 animate-slideUp" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                      <div className="w-8 h-8 rounded-full bg-[#6366f1]/20 text-[#818cf8] flex items-center justify-center font-bold mb-2">2</div>
                      <p className="text-xs text-zinc-300">Anota las palabras generadas en un papel.</p>
                    </div>
                    <div className="flex-1 bg-[#0a0c14] border border-[#1e2640] rounded-lg p-4 animate-slideUp" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
                      <div className="w-8 h-8 rounded-full bg-[#6366f1]/20 text-[#818cf8] flex items-center justify-center font-bold mb-2">3</div>
                      <p className="text-xs text-zinc-300">Guarda la llave secreta en lugar seguro.</p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-500 font-mono font-bold mb-3">
                    {experienceLevel === "beginner" ? "Nivel de Seguridad" : "Longitud de semilla"}
                  </p>
                  <div className="flex gap-3">
                    {([12, 24] as const).map((n) => (
                      <button
                        key={n}
                        onClick={() => setKeygenWordCount(n)}
                        className={cn(
                          "flex-1 py-3 text-sm font-bold border rounded-none transition-all duration-200",
                          keygenWordCount === n
                            ? "border-[#6366f1] bg-[#6366f1]/10 text-white"
                            : "border-[#1e2640] bg-[#0d1120] text-zinc-400 hover:border-zinc-700"
                        )}
                      >
                        {n} palabras
                        <span className="block text-[10px] font-normal text-zinc-500 mt-0.5">
                          {n === 12 ? "128 bits" : "256 bits — recomendado"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {experienceLevel !== "beginner" && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-zinc-500 font-mono font-bold mb-2">
                      Passphrase BIP39 <span className="text-zinc-600 normal-case">(opcional)</span>
                    </p>
                    <div className="relative">
                      <input
                        type={showPassphrase ? "text" : "password"}
                        value={keygenPassphrase}
                        onChange={(e) => setKeygenPassphrase(e.target.value)}
                        placeholder="Dejar vacío si no se usa…"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-3 py-2.5 pr-10 text-sm font-mono text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-[#6366f1]/50 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassphrase((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                      >
                        {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#6366f1]/5 border border-[#6366f1]/20 rounded-none">
                  <GitBranch className="w-4 h-4 text-[#818cf8] shrink-0" />
                  <p className="text-xs text-zinc-400">
                    Red: <span className="text-white font-semibold">{network}</span>
                    {" · "}
                    Ruta: <span className="text-white font-semibold font-mono">{getDefaultDerivationPath(network, vaultType ?? "multi")}</span>
                  </p>
                </div>

                <div className="flex flex-col items-center gap-0 py-2">
                  {[
                    { icon: <Hash className="w-4 h-4" />, label: experienceLevel === "beginner" ? "Generación aleatoria segura" : "Entropía aleatoria", sub: `${keygenWordCount === 24 ? 256 : 128} bits` },
                    { icon: <ArrowDown className="w-3 h-3" />, label: null, sub: null },
                    { icon: <GitBranch className="w-4 h-4" />, label: experienceLevel === "beginner" ? "Palabras secretas" : "Semilla BIP39", sub: `${keygenWordCount} palabras` },
                    { icon: <ArrowDown className="w-3 h-3" />, label: null, sub: null },
                    { icon: <Lock className="w-4 h-4" />, label: network === "mainnet" ? "xprv" : "tprv", sub: experienceLevel === "beginner" ? "Llave secreta principal (Nunca compartir)" : "Clave privada maestra" },
                    { icon: <ArrowDown className="w-3 h-3" />, label: null, sub: null },
                    { icon: <GitBranch className="w-4 h-4" />, label: network === "mainnet" ? "xpub" : "tpub", sub: experienceLevel === "beginner" ? "Llave pública para esta bóveda" : "Clave pública maestra" },
                  ].map((item, idx) =>
                    item.label ? (
                      <div key={idx} className="flex items-center gap-3 w-full max-w-xs px-4 py-2.5 bg-[#0d1120] border border-[#1e2640] rounded-none">
                        <span className="text-[#818cf8]">{item.icon}</span>
                        <div>
                          <p className="text-xs font-bold text-white font-mono">{item.label}</p>
                          <p className="text-[10px] text-zinc-500">{item.sub}</p>
                        </div>
                      </div>
                    ) : (
                      <div key={idx} className="flex justify-center py-0.5 text-zinc-700">{item.icon}</div>
                    )
                  )}
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full py-3 bg-[#6366f1] hover:bg-[#4f52d9] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-none transition-colors flex items-center justify-center gap-2"
                >
                  {generating ? <><RefreshCw className="w-4 h-4 animate-spin" />Generando…</> : <><Sparkles className="w-4 h-4" />Generar semilla ahora</>}
                </button>
              </div>
            )}

            {keygenStep === "result" && generatedKey && (
              <div className="p-5 space-y-6">
                <div className="flex gap-3 p-4 bg-[#121626]/80 border border-[#6366f1]/40 rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-[#818cf8] shrink-0 mt-0.5" />
                  <div className="text-sm text-zinc-300 leading-relaxed">
                    <strong className="block text-white mb-1">Guarda tu semilla en papel ahora.</strong>
                    Nunca la compartas. Nunca la guardes en formato digital o en la nube.
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wider text-zinc-500 font-mono font-bold">
                      {experienceLevel === "beginner" ? `Palabras Secretas · ${keygenWordCount} palabras` : `Semilla BIP39 · ${keygenWordCount} palabras`}
                    </p>
                    <div className="flex items-center gap-2">
                      {showMnemonic && (
                        <button onClick={() => setShowMnemonic(false)} className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors">
                          <EyeOff className="w-3.5 h-3.5" />
                          Ocultar
                        </button>
                      )}
                      <button onClick={() => copyToClipboard(generatedKey.mnemonic, "mnemonic")} className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors">
                        {copiedField === "mnemonic" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="relative border border-[#1e2640] rounded-none bg-[#0d1120] p-4">
                    <div className={cn("grid grid-cols-3 sm:grid-cols-4 gap-2 transition-all duration-300", !showMnemonic && "blur-md select-none pointer-events-none opacity-20")}>
                      {mnemonic.map((word, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-none px-2 py-1.5">
                          <span className="text-[9px] text-zinc-600 w-4 text-right shrink-0">{i + 1}</span>
                          <span className="text-xs text-[#818cf8] font-mono font-semibold">{word}</span>
                        </div>
                      ))}
                    </div>
                    
                    {!showMnemonic && !showWarningModal && (
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <button
                          onClick={() => setShowWarningModal(true)}
                          className="px-5 py-2.5 bg-[#121626] border border-[#6366f1]/40 hover:bg-[#6366f1]/20 text-white font-bold text-sm shadow-[0_0_20px_rgba(99,102,241,0.1)] flex items-center gap-2 rounded-none transition-all hover:scale-105"
                        >
                          <Eye className="w-4 h-4 text-[#818cf8]" /> Mostrar Palabras
                        </button>
                      </div>
                    )}

                    {!showMnemonic && showWarningModal && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#0a0c14]/90 backdrop-blur-sm p-4 text-center">
                        <AlertTriangle className="w-6 h-6 text-[#818cf8] mb-2" />
                        <h4 className="text-white font-bold text-sm mb-1">Información Privada</h4>
                        <p className="text-xs text-zinc-400 max-w-[250px] mb-4">
                          Cualquiera con estas palabras puede acceder a tus fondos. Asegúrate de estar a solas.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowWarningModal(false)}
                            className="px-4 py-2 border border-[#1e2640] bg-[#121626] text-white text-xs font-bold hover:bg-[#181d33] transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => {
                              playSuccess();
                              setShowWarningModal(false);
                              setShowMnemonic(true);
                            }}
                            className="px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-bold transition-colors"
                          >
                            Mostrar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <KeyResultField label={experienceLevel === "beginner" ? "fingerprint (identificador único de llave)" : "Fingerprint (master)"} value={generatedKey.fingerprint} field="fingerprint" copiedField={copiedField} onCopy={copyToClipboard} accent tooltip="Huella digital corta de la llave maestra. Sirve para identificar esta semilla sin revelar el secreto. Solo para lectura." />
                  <KeyResultField label={network === "mainnet" ? "xprv (clave privada maestra)" : "tprv (clave privada maestra)"} value={generatedKey.xprv} field="xprv" copiedField={copiedField} onCopy={copyToClipboard} secret tooltip="¡CUIDADO! Nunca compartas la clave privada (xprv). Quien la posea tendrá control total e inmediato sobre tus fondos." />
                  <KeyResultField label={network === "mainnet" ? "xpub (clave pública)" : "tpub (clave pública)"} value={generatedKey.xpub} field="xpub" copiedField={copiedField} onCopy={copyToClipboard} />
                  <div className="flex items-center justify-between px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-none group">
                    <div className="flex items-center gap-1.5 relative">
                      <span className="text-[10px] text-zinc-500 font-mono uppercase">Ruta de derivación</span>
                      <div className="flex items-center justify-center">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500/80 cursor-help" />
                        <div className="pointer-events-none absolute bottom-full mb-2 left-0 w-[220px] opacity-0 group-hover:opacity-100 transition-opacity bg-amber-950 border border-amber-900/50 text-amber-200 text-xs p-2.5 rounded shadow-2xl z-50">
                          <strong className="block mb-1 text-amber-400">Ruta de Derivación:</strong>
                          Es el "mapa" técnico que dice cómo calcular las direcciones a partir de tu semilla. Mantén el valor por defecto si eres principiante.
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-[#818cf8] font-mono font-semibold">{generatedKey.derivationPath}</span>
                  </div>
                </div>

                {/* Layer 8 Error Prevention Checkbox */}
                <label 
                  className={cn(
                    "flex items-start gap-4 p-5 mt-5 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]",
                    seedBackedUp ? "border-[#6366f1] bg-[#6366f1]/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]" : "border-[#1e2640] bg-[#121626] hover:border-[#6366f1]/50"
                  )}
                >
                  <div className="relative flex items-center justify-center shrink-0">
                    <input
                      type="checkbox"
                      checked={seedBackedUp}
                      onChange={(e) => {
                        try { playToggle(); } catch(err) {}
                        setSeedBackedUp(e.target.checked);
                      }}
                      className="w-7 h-7 cursor-pointer appearance-none rounded border-2 border-zinc-600 bg-zinc-900 checked:bg-[#6366f1] checked:border-[#6366f1] transition-colors"
                    />
                    {seedBackedUp && <Check className="absolute w-5 h-5 text-white pointer-events-none" />}
                  </div>
                  <span className={cn(
                    "text-xs sm:text-sm leading-relaxed select-none transition-colors",
                    seedBackedUp ? "text-white font-medium" : "text-zinc-400 font-normal"
                  )}>
                    Confirmo que he respaldado estas palabras en un <strong className="text-[#818cf8]">lugar físico seguro (papel, placa de metal, etc.)</strong> y no en medios digitales. Entiendo que si las pierdo, perderé acceso a mis fondos.
                  </span>
                </label>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => handleUseKey()}
                    disabled={!seedBackedUp}
                    className="w-full py-3 bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-zinc-800/50 disabled:text-zinc-500 disabled:border-zinc-800 disabled:cursor-not-allowed border border-[#6366f1]/20 shadow-[0_0_15px_rgba(99,102,241,0.15)] text-white text-sm font-bold rounded-none transition-all flex items-center justify-center gap-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                    Usar esta llave en el siguiente espacio vacío
                  </button>

                  {slotCount > 1 && (
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(slotCount, 4)}, 1fr)` }}>
                      {entries.map((e, i) => (
                        <button
                          key={e.id}
                          onClick={() => handleUseKey(e.id)}
                          disabled={!seedBackedUp}
                          className={cn(
                            "py-2 text-xs font-bold border rounded-none transition-all duration-200 flex flex-col items-center gap-0.5",
                            !seedBackedUp
                              ? "border-zinc-800 bg-zinc-900/50 text-zinc-600 cursor-not-allowed"
                              : e.isValid
                              ? "border-emerald-800/40 bg-emerald-950/20 text-emerald-400"
                              : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-[#6366f1] hover:text-[#818cf8]"
                          )}
                        >
                          <span>Espacio {i + 1}</span>
                          {e.isValid && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setKeygenStep("generate"); setGeneratedKey(null); setMnemonic([]); setShowMnemonic(false); setSeedBackedUp(false); }}
                      className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-sm font-bold rounded-none transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />Crear otra llave
                    </button>
                    <button
                      onClick={handleCloseKeygen}
                      className="flex-none px-4 py-3 bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-400 text-sm font-bold rounded-none transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progreso */}
      <div className="flex items-center gap-3 bg-zinc-900/20 p-3 rounded-none border border-zinc-900">
        <div className="flex-1 h-2.5 rounded-none bg-zinc-850 overflow-hidden">
          <div
            className="h-full bg-[#6366f1] rounded-none transition-all duration-500 ease-out"
            style={{ width: `${(validCount / slotCount) * 100}%` }}
          />
        </div>
        <span className="text-sm font-mono text-zinc-400 font-bold shrink-0">{validCount} de {slotCount} listos</span>
      </div>

      {/* Tarjetas */}
      <div className="space-y-4">
        {entries.map((entry, i) => (
          <DeviceKeyCard
            key={entry.id}
            entry={entry}
            index={i}
            network={network}
            vaultType={vaultType}
            experienceLevel={experienceLevel}
            showPathDropdown={showPathDropdown === entry.id}
            onToggleDropdown={() => { playClick(); setShowPathDropdown((prev) => (prev === entry.id ? null : entry.id)); }}
            onXpubChange={(v) => handleXpubChange(entry.id, v)}
            onPathChange={(p) => handlePathChange(entry.id, p)}
            onFingerprintChange={(f) => handleFingerprintChange(entry.id, f)}
            onLabelChange={(l) => updateEntry(entry.id, { label: l })}
            onTypeChange={(t) => updateEntry(entry.id, { deviceType: t })}
            onClear={() => { playError(); updateEntry(entry.id, EMPTY_KEY(i, network, vaultType)); }}
            onLoadTestKey={() => loadTestKey(entry.id, i)}
          />
        ))}
      </div>

    </div>
  );
}

// ── KeyResultField ────────────────────────────────────────────────────────────

function KeyResultField({ label, value, field, copiedField, onCopy, secret = false, accent = false, tooltip }: {
  label: string; value: string; field: string; copiedField: string | null;
  onCopy: (v: string, f: string) => void; secret?: boolean; accent?: boolean; tooltip?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const display = secret && !revealed ? "•".repeat(Math.min(value.length, 32)) : value;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between group">
        <div className="flex items-center gap-1.5 relative">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">{label}</span>
          {tooltip && (
            <div className="flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500/80 cursor-help" />
              <div className="pointer-events-none absolute bottom-full mb-2 left-0 w-[220px] opacity-0 group-hover:opacity-100 transition-opacity bg-amber-950 border border-amber-900/50 text-amber-200 text-xs p-2.5 rounded shadow-2xl z-50">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {secret && (
            <button onClick={() => setRevealed((v) => !v)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
              {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
          <button onClick={() => onCopy(value, field)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
            {copiedField === field ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      <div
        className={cn(
          "w-full px-3 py-2 bg-zinc-950 border rounded-none text-xs font-mono break-all cursor-pointer hover:border-zinc-600 transition-colors",
          accent ? "border-amber-900/40 text-amber-400" : "border-zinc-800 text-zinc-300"
        )}
        onClick={() => onCopy(value, field)}
      >
        {display}
      </div>
    </div>
  );
}

// ── DeviceKeyCard ─────────────────────────────────────────────────────────────

interface CardProps {
  entry: XpubEntry;
  index: number;
  network: "mainnet" | "testnet" | "signet" | "testnet4";
  vaultType: "single" | "multi";
  experienceLevel: "beginner" | "intermediate" | "advanced";
  showPathDropdown: boolean;
  onToggleDropdown: () => void;
  onXpubChange: (v: string) => void;
  onPathChange: (p: string) => void;
  onFingerprintChange: (f: string) => void;
  onLabelChange: (l: string) => void;
  onTypeChange: (t: "mobile" | "laptop" | "trezor") => void;
  onClear: () => void;
  onLoadTestKey: () => void;
}

function DeviceKeyCard({
  entry, network, vaultType, experienceLevel, showPathDropdown,
  onToggleDropdown, onXpubChange, onPathChange, onFingerprintChange,
  onLabelChange, onTypeChange, onClear, onLoadTestKey,
}: CardProps) {
  const { setActiveHelp, activeHelp } = useWallet();
  const [showAdvanced, setShowAdvanced] = useState(experienceLevel !== "beginner");
  const hasXpub = entry.xpub.length > 0;

  const errorMessage = hasXpub && !entry.isValid
    ? getXpubErrorMessage(entry.xpub, network, vaultType, entry.derivationPath)
    : null;

  const hasNetworkMismatch = hasXpub && !isKeyCompatibleWithNetwork(entry.xpub, network);

  const helpTitle = `Ayuda: ${entry.label || "Identificar Dispositivo"}`;
  const isHelpActive = activeHelp?.title === helpTitle;

  const handleHelpEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const text =
      entry.deviceType === "mobile"
        ? "Abre tu app en el teléfono (ej: BlueWallet). Ve a Ajustes, luego selecciona Mostrar Llave Pública (XPUB) y copia el código completo para pegarlo aquí."
        : entry.deviceType === "trezor"
        ? "Abre Trezor Suite. Ve a las configuraciones de tu cuenta, selecciona 'Mostrar llaves públicas' (XPUB) y cópialo."
        : "Copia la llave pública extendida (XPUB/ZPUB) desde el software de tu billetera o directamente desde tu dispositivo.";
    setActiveHelp({ title: helpTitle, text, x: e.clientX, y: e.clientY });
  };

  // Seleccionar el objeto de rutas correcto según vaultType y red.
  // Cada objeto ya contiene solo las rutas del tipo apropiado.
  const isTestnet = network === "testnet" || network === "testnet4" || network === "signet";
  const filteredPaths = Object.entries(
    vaultType === "single"
      ? (isTestnet ? TESTNET_SINGLE_PATHS : STANDARD_SINGLE_PATHS)
      : (isTestnet ? TESTNET_PATHS : STANDARD_PATHS)
  );

  return (
    <div className={cn(
      "relative overflow-hidden rounded-none border flex flex-col md:flex-row items-stretch transition-all duration-300 ease-in-out",
      entry.isValid
        ? "border-emerald-800/40 bg-emerald-950/5"
        : hasNetworkMismatch
        ? "border-red-800/40 bg-red-950/5"
        : hasXpub && !entry.isValid
        ? "border-red-800/40 bg-red-950/5"
        : "border-[#1e2640] bg-[#121626]/40"
    )}>
      <div className="flex-1 p-6 space-y-4">
        {/* Fila superior */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 shrink-0">
            {(["mobile", "laptop", "trezor"] as const).map((type) => (
              <button
                key={type}
                onClick={() => onTypeChange(type)}
                className={cn(
                  "w-11 h-11 rounded-none flex items-center justify-center transition-all duration-300 border",
                  entry.deviceType === type
                    ? "bg-[#6366f1] text-white border-transparent"
                    : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                )}
                title={type === "mobile" ? "Billetera Celular" : type === "laptop" ? "Billetera Laptop" : "Trezor Hardware"}
              >
                {type === "mobile" ? <Smartphone className="w-5 h-5" /> : type === "laptop" ? <Laptop className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
              </button>
            ))}
          </div>

          <input
            className="min-w-0 flex-1 bg-transparent text-lg font-bold text-white placeholder:text-zinc-600 outline-none sm:ml-2 border-b border-transparent hover:border-zinc-800 focus:border-[#6366f1]/50 py-0.5 transition-all duration-200"
            value={entry.label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder={
              entry.deviceType === "mobile" ? "Identificar llave (ej. Mi Celular)"
              : entry.deviceType === "trezor" ? "Identificar llave (ej. Mi Trezor)"
              : "Identificar llave (ej. Mi Laptop)"
            }
          />

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {!hasXpub && (
              <button
                onClick={onLoadTestKey}
                className="text-sm text-zinc-300 hover:text-white flex items-center gap-1.5 bg-[#1c223a] px-3 py-2 rounded-none border border-[#2c3558] transition-all duration-300 font-semibold"
              >
                <Sparkles className="w-4 h-4 text-[#818cf8]" />
                Prueba
              </button>
            )}
            {hasXpub && (
              <button onClick={onClear} className="text-zinc-500 hover:text-red-400 p-2 transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Input xpub */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <label className="text-sm text-zinc-400 uppercase tracking-wider font-mono font-bold block">
              <Term name="xpub" />
            </label>
            <button
              type="button"
              onMouseEnter={handleHelpEnter}
              onMouseLeave={() => setActiveHelp(null)}
              className={cn("text-zinc-500 hover:text-[#818cf8] transition-colors p-0.5 rounded-none", isHelpActive && "text-[#818cf8]")}
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
          <textarea
            rows={3}
            spellCheck={false}
            className={cn(
              "w-full rounded-none border px-4 py-2.5 text-sm font-mono bg-zinc-950 text-zinc-300",
              "placeholder:text-zinc-700 outline-none resize-none transition-all duration-300",
              hasNetworkMismatch
                ? "border-amber-700/60 focus:border-amber-500"
                : hasXpub && !entry.isValid
                ? "border-red-700/60 focus:border-red-500"
                : entry.isValid
                ? "border-emerald-800/50 focus:border-emerald-600"
                : "border-zinc-800 focus:border-[#6366f1]/60"
            )}
            value={entry.xpub}
            onChange={(e) => onXpubChange(e.target.value)}
            placeholder={experienceLevel === "beginner" ? "Pega el código de tu dispositivo aquí..." : "xpub6… o zpub…"}
          />
        </div>

        {/* Mensaje de error específico */}
        {errorMessage && (
          <div className={cn(
            "flex items-start gap-2 px-3 py-2.5 rounded-none border text-xs leading-relaxed",
            hasNetworkMismatch
              ? "border-amber-800/40 bg-amber-950/20 text-amber-300"
              : "border-red-800/40 bg-red-950/20 text-red-300"
          )}>
            {hasNetworkMismatch
              ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            }
            <span>{errorMessage}</span>
          </div>
        )}

        {experienceLevel === "beginner" && (
          <div className="pt-1">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-zinc-455 hover:text-zinc-200 flex items-center gap-1 transition-colors font-medium"
            >
              <Settings className="w-4 h-4 text-zinc-500" />
              {showAdvanced ? "Ocultar ajustes técnicos" : "Ajustes técnicos de la llave"}
            </button>
          </div>
        )}

        {showAdvanced && (
          <div className="grid grid-cols-1 gap-4 pt-3 border-t border-[#1b223a] sm:grid-cols-2">
            <div>
              <span className="text-xs uppercase tracking-wider text-zinc-550 font-mono block mb-1 font-bold">
                <Term name="fingerprint" />
              </span>
              <input
                type="text"
                maxLength={8}
                value={entry.fingerprint}
                onChange={(e) => onFingerprintChange(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, ""))}
                placeholder="E.g. 1961D712"
                className={cn(
                  "w-full px-2 py-1 rounded bg-zinc-950 border text-xs font-mono text-zinc-300 h-8 focus:outline-none transition-all duration-300",
                  /^[0-9A-Fa-f]{8}$/.test(entry.fingerprint)
                    ? "border-zinc-800 focus:border-[#6366f1]/60"
                    : "border-red-900/50 focus:border-red-650"
                )}
              />
            </div>

            <div className="relative">
              <span className="text-xs uppercase tracking-wider text-zinc-550 font-mono block mb-1 font-bold">
                <Term name="derivation" />
              </span>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={entry.derivationPath}
                  onChange={(e) => onPathChange(e.target.value)}
                  placeholder={getDefaultDerivationPath(network, vaultType)}
                  className={cn(
                    "w-full pl-2 pr-8 py-1 rounded bg-zinc-950 border text-xs font-mono text-zinc-300 h-8 focus:outline-none transition-all duration-300",
                    validateDerivationPath(entry.derivationPath)
                      ? "border-zinc-800 focus:border-[#6366f1]/60"
                      : "border-red-900/50 focus:border-red-650"
                  )}
                />
                <button
                  type="button"
                  onClick={onToggleDropdown}
                  className="absolute right-0 top-0 h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-zinc-350 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {showPathDropdown && (
                <div className="absolute z-50 bottom-full mb-1 left-0 w-full rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
                  {filteredPaths.map(([label, path]) => {
                    let explanation = "Formato estándar de derivación.";
                    if (path.includes("2'")) explanation = "Recomendado. Formato moderno (Native SegWit). Comisiones más bajas.";
                    else if (path.includes("1'") && path.startsWith("m/48'")) explanation = "Formato intermedio (Compatible). Usa esto si tu dispositivo viejo tiene problemas.";
                    else if (path.includes("49'")) explanation = "Formato intermedio (Compatible SegWit). Usa esto si tu dispositivo viejo tiene problemas.";
                    else if (path.includes("44'")) explanation = "Formato obsoleto (Legacy). Solo para dispositivos muy antiguos. Comisiones altas.";
                    
                    return (
                      <button
                        key={path}
                        onClick={() => { onPathChange(path); onToggleDropdown(); }}
                        className="w-full px-3 py-2 text-left hover:bg-[#6366f1]/10 transition-colors border-b border-zinc-800 last:border-0 group"
                      >
                        <div className="flex justify-between items-center mb-0.5">
                          <div className="text-xs font-bold text-zinc-300 group-hover:text-[#818cf8] transition-colors">{label}</div>
                          <div className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded">{path}</div>
                        </div>
                        {experienceLevel === "beginner" && (
                          <div className="text-[10px] text-zinc-400 mt-1 leading-tight">{explanation}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {entry.isValid && (
          <div className="flex items-center gap-1.5 text-sm text-emerald-400 font-semibold">
            <Check className="w-4 h-4" />
            <span>Listo · {truncateXpub(entry.xpub)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
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
const BIP39_WORDLIST = `abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual adapt add addict address adjust admit adult advance advice aerobic affair afford afraid again age agent agree ahead aim air airport aisle alarm album alcohol alert alien all alley allow almost alone alpha already also alter always amateur amazing among amount amused analyst anchor ancient anger angle angry animal ankle announce annual answer antenna antique anxiety any apart apology appear apple approve april arch arctic area arena argue arm armed armor army around arrange arrest arrive arrow art artefact artist artwork ask aspect assault asset assist assume asthma athlete atom attack attend attitude attract auction audit august aunt autumn average avocado avoid awake aware away awesome awful awkward axis baby bachelor bacon badge bag balance balcony ball bamboo banana banner bar barely bargain barrel base basic basket battle beach bean beauty because become beef before begin behave behind believe below belt bench benefit best betray better between beyond bicycle bid bike bind biology bird birth bitter black blade blame blanket blast bleak bless blind blood blossom blouse blue blur blush board boat body boil bomb bone book boost border boring borrow boss bottom bounce box boy bracket brain brand brave breeze brick bridge brief bright bring brisk broccoli broken bronze broom brother brown brush bubble buddy budget buffalo build bulb bulk bullet bundle bunker burden burger burst bus business busy butter buyer buzz cabbage cabin cable cactus cage cake call calm camera camp can canal cancel candy cannon canvas canyon capable capital captain car carbon card cargo carpet carry cart case cash castle casual cat catalog catch category cattle caught cause caution cave ceiling celery cement census century cereal certain chair chaos chapter charge chase chat cheap check cheese chef cherry chest chicken chief child chimney choice choose chronic chuckle chunk cinnamon circle citizen city civil claim clap clarify claw clay clean clerk clever click client cliff climb clinic clip clock clog close cloth cloud clown club clump cluster clutch coach coast coconut code coffee coil coin collect color column combine come comfort comic common company concert conduct confirm congress connect consider control convince cook cool copper copy coral core corn correct cost cotton couch country couple course cousin cover coyote crack cradle craft cram crane crash crater crawl crazy cream credit creek crew cricket crime crisp critic cross crouch crowd crucial cruel cruise crumble crunch crush cry crystal cube culture cup cupboard curious current curtain curve cushion custom cute cycle dad damage damp dance danger daring dash daughter dawn day deal debate debris decade december decide decline decorate decrease deer defense define defy degree delay deliver demand demise denial dentist deny depart depend deposit depth deputy derive describe desert design desk despair destroy detail detect develop device devote diagram dial diamond diary dice diesel diet differ digital dignity dilemma dinner dinosaur direct dirt disagree discover disease dish dismiss disorder display distance divert divide divorce dizzy doctor document dog doll dolphin domain donate donkey donor door dose double dove draft dragon drama drastic draw dream dress drift drill drink drip drive drop drum dry duck dumb dune during dust dutch duty dwarf dynamic eager eagle early earn earth easily east easy echo ecology edge edit educate effort egg eight either elbow elder electric elegant element elephant elevator elite else embark embody embrace emerge emotion employ empower empty enable enact endless endorse enemy engage engine enhance enjoy enlist enough enrich enroll ensure enter entire entry envelope episode equal equip erase erode erosion error erupt escape essay essence estate eternal ethics evidence evil evoke evolve exact example excess exchange excite exclude exercise exhaust exhibit exile exist exit exotic expand expect experience expose express extend extra eye fable face faculty fade faint faith fall false fame family famous fan fancy fantasy far fashion fat fatal father fatigue fault favorite feature february federal fee feed feel feet fellow felt fence festival fetch fever few fiber fiction field figure file film filter final find fine finger finish fire firm first fiscal fish fit fitness fix flag flame flash flat flavor flee flight flip float flock floor flower fluid flush fly foam focus fog foil follow food foot force forest forget fork fortune forum forward fossil foster found fox fragile frame frequent fresh friend fringe frog front frost frown frozen fruit fuel fun funny furnace fury future gadget gain galaxy gallery game gap garbage garden garlic garment gas gasp gate gather gauge gaze general genius genre gentle genuine gesture ghost girl ginger giraffe girl give glacier glance glare glass glide glimpse globe gloom glory glove glow glue goat goddess gold good goose gorilla gospel gossip govern gown grab grace grain grant grape grasp grass gravity great green grid grief grit grocery group grow grunt guard guide guilt guitar gun gym habit hair half hamster hand happy harbor harsh hat have hawk hazard head health heart heavy hedgehog height hello helmet help hen hero hidden high hill hint hip hire history hobby hockey hold hole holiday hollow home honey hood hope horn hospital host hour hover hub huge human humble humor hundred hungry hunt hurdle hurry hurt husband hybrid ice icon ignore ill illegal image imitate immense immune impact impose improve impulse inbox income increase index indicate indoor industry infant inflict inform inhale inject inner innocent input inquiry insane insect inside inspire install intact interest into invest invite involve iron island isolate issue item ivory jacket jaguar jar jazz jealous jeans jelly jewel job join journey joy judge juice jump jungle junior junk just kangaroo keen keep ketchup key kick kid kingdom kiss kit kitchen kite kitten kiwi knee knife knock know lab ladder lady lake lamp language laptop large later laugh laundry lava law lawn lawsuit layer lazy leader learn leave lecture left leg legal legend leisure lemon lend length lens leopard lesson letter level liar liberty library license life lift light like limb limit link lion liquid list little live lizard load loan lobster local lock logic lonely long loop lottery loud lounge love loyal lucky luggage lumber lunar lunch luxury lyrics machine mad magic magnet maid main major make mammal mango mansion manual maple marble march margin marine market marriage mask master match maze meadow mean medal media melody melt member memory mention menu mercy merge merit merry mesh message metal method middle midnight milk million mimic mind minimum minor minute miracle miss mixed mixture mobile model modify mom monitor monkey monster month moon moral more morning mosquito mother motion mound mouse move movie much muffin mule multiply muscle museum mushroom music must mutual myself mystery naive name napkin narrow nasty nature near neck need negative neglect neither nephew nerve nest network news next nice night noble noise nominee noodle normal north notable note nothing notice novel now nuclear number nurse nut oak obey object oblige obscure observe obtain ocean october odor off offer office often oil okay old olive olympic omit once onion open oppose option orange orbit orchard order ordinary organ orient original orphan ostrich other outdoor outside oval over own oyster ozone pact paddle page pair palace palm panda panel panic panther paper parade parent park parrot party pass patch path patrol pause pave payment peace peanut peasant pelican pen penalty pencil people pepper perfect permit person pet phone photo phrase physical piano picnic picture piece pig pigeon pill pilot pink pioneer pipe pistol pitch pizza place planet plastic plate play please pledge pluck plug plunge poem poet point polar pole police pond pony popular portion position possible post potato poverty powder power practice praise predict prefer prepare present pretty prevent price pride primary print priority prison private prize problem process produce profit program project promote proof property prosper protect proud provide public pudding pull pulp pulse pumpkin punish pupil purchase purity push put puzzle pyramid quality quantum quarter question quick quit quiz quote rabbit raccoon race rack radar radio rage rail rain raise rally ramp ranch random range rapid rare rate rather raven reach ready real reason rebel rebuild recall receive recipe record recycle reduce reflect reform refuse region regret regular reject relax release relief rely remain remember remind remove render renew rent reopen repair repeat replace report require rescue resemble resist resource response result retire retreat return reunion reveal review reward rhythm ribbon rice rich ride rifle right rigid ring riot ripple risk ritual rival river road roast robot robust rocket romance roof rookie rotate rough round route royal rubber rude rug rule run runway rural sad saddle sadness safe sail salad salmon salon salt salute same sample sand satisfy satoshi sauce sausage save say scale scan scare scatter scene scheme school science scissors scorpion scout scrap screen script scrub sea search season seat second secret section security seed seek segment select sell seminar senior sense sentence series service session settle setup seven shadow shaft shallow share shed shell sheriff shield shift shine ship shiver shock shoe shoot shop short shoulder shove shrimp shrug shuffle shy siege sight signal silent silk silly silver similar simple since sing siren sister situate six size sketch skill skin skirt skull slab slam sleep slender slice slide slight slim slogan slot slow slush small smart smile smoke smooth snack snake snap sniff snow soap soccer social sock soda soft solar soldier solid solution solve someone song soon sorry soul sound soup source south space spare spatial spawn speak special speed sphere spice spider spike spin spirit split spoil sponsor spoon spray spread spring spy square squeeze squirrel stable stadium staff stage stairs stamp stand start state stay steak steel stem step stereo stick still sting stock stomach stone stop store stream street strike strong struggle student stuff stumble style subject submit subway success such sudden suffer sugar suggest suit summer sun sunny sunset super supply supreme sure surface surge surprise sustain swallow swamp swap swear sweet swift swim swing switch sword symbol symptom syrup table tackle tag tail talent tamper tank tape target task tattoo taxi teach team tell ten tenant tennis tent term test text thank that theme then theory there they thing this thought three thrive throw thumb thunder ticket tilt timber time tiny tip tired title toast tobacco today toggle toilet token tomato tomorrow tone tongue tonight tool tooth top topple torch tornado tortoise toss total tourist toward tower town toy track trade traffic tragic train transfer trap trash travel tray treat tree trend trial tribe trick trigger trim trip trophy trouble truck truly trumpet trust truth tube tuition tumble tuna tunnel turkey turn turtle twelve twenty twice twin twist two type typical ugly umbrella unable unaware uncle uncover under undo unfair unfold unhappy uniform unique universe unknown unlock until unusual unveil update upgrade uphold upon upper upset urban usable used useful useless usual utility vacant vacuum vague valid valley valve van vanish vapor various vast vault vehicle velvet vendor venture verb verify version very vest viable vibrant vicious victory video view village vintage violin virtual virus visa visit visual vital vivid vocal voice void volcano volume vote voyage wage wagon wait walk wall walnut want warfare warm warrior wash wasp waste water wave way wealth weapon wear weasel web wedding weekend weird welcome well west wet what wheat wheel when where whip whisper wide width wife wild will win window wine wing wink winner winter wire wisdom wise wish witness wolf woman wonder wood wool word world worry worth wrap wreck wrestle wrist write wrong yard year yellow yield you young youth zebra zero zone zoo`.split(" ");

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

// FIX: ahora también valida incompatibilidad de ruta con vaultType
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
  const { playClick, playSuccess, playError } = useSoundEffects();

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

  // FIX: ahora valida también compatibilidad de ruta con vaultType
  const validateKeyEntry = useCallback(
    (xpub: string, fingerprint: string, path: string) => {
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
  };

  const handleCloseKeygen = () => {
    setKeygenOpen(false);
    setKeygenStep("generate");
    setGeneratedKey(null);
    setMnemonic([]);
    setShowMnemonic(false);
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
      <div className="border border-[#1e2640] bg-[#0d1120]/60 rounded-none overflow-hidden">
        <button
          onClick={() => { playClick(); setKeygenOpen((v) => !v); }}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#141928]/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-none bg-[#6366f1]/15 border border-[#6366f1]/30 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-[#818cf8]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">Generar nueva llave BIP39</p>
              <p className="text-xs text-zinc-500 mt-0.5">Crea una semilla HD y deriva xpub/xprv para importar en tu dispositivo</p>
            </div>
          </div>
          <ChevronRight className={cn("w-5 h-5 text-zinc-500 transition-transform duration-200", keygenOpen && "rotate-90")} />
        </button>

        {keygenOpen && (
          <div className="border-t border-[#1e2640]">
            {keygenStep === "generate" && (
              <div className="p-5 space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-500 font-mono font-bold mb-3">Longitud de semilla</p>
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
                    { icon: <Hash className="w-4 h-4" />, label: "Entropía aleatoria", sub: `${keygenWordCount === 24 ? 256 : 128} bits` },
                    { icon: <ArrowDown className="w-3 h-3" />, label: null, sub: null },
                    { icon: <GitBranch className="w-4 h-4" />, label: "Semilla BIP39", sub: `${keygenWordCount} palabras` },
                    { icon: <ArrowDown className="w-3 h-3" />, label: null, sub: null },
                    { icon: <Lock className="w-4 h-4" />, label: network === "mainnet" ? "xprv" : "tprv", sub: "Clave privada maestra" },
                    { icon: <ArrowDown className="w-3 h-3" />, label: null, sub: null },
                    { icon: <GitBranch className="w-4 h-4" />, label: network === "mainnet" ? "xpub" : "tpub", sub: "Clave pública maestra" },
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
              <div className="p-5 space-y-5">
                <div className="flex gap-3 p-4 bg-amber-950/30 border border-amber-800/40 rounded-none">
                  <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-300 leading-relaxed">
                    <strong className="block text-amber-200 mb-0.5">Guarda tu semilla en papel ahora.</strong>
                    Nunca la compartas. Nunca la guardes en formato digital.
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wider text-zinc-500 font-mono font-bold">Semilla BIP39 · {keygenWordCount} palabras</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowMnemonic((v) => !v)} className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors">
                        {showMnemonic ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showMnemonic ? "Ocultar" : "Mostrar"}
                      </button>
                      <button onClick={() => copyToClipboard(generatedKey.mnemonic, "mnemonic")} className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors">
                        {copiedField === "mnemonic" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className={cn("grid grid-cols-4 gap-1.5 transition-all duration-300", !showMnemonic && "blur-sm select-none pointer-events-none")}>
                    {mnemonic.map((word, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-none px-2 py-1.5">
                        <span className="text-[9px] text-zinc-600 w-4 text-right shrink-0">{i + 1}</span>
                        <span className="text-xs text-[#818cf8] font-mono font-semibold">{word}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <KeyResultField label="Fingerprint (master)" value={generatedKey.fingerprint} field="fingerprint" copiedField={copiedField} onCopy={copyToClipboard} accent />
                  <KeyResultField label={network === "mainnet" ? "xprv (clave privada maestra)" : "tprv (clave privada maestra)"} value={generatedKey.xprv} field="xprv" copiedField={copiedField} onCopy={copyToClipboard} secret />
                  <KeyResultField label={network === "mainnet" ? "xpub (clave pública)" : "tpub (clave pública)"} value={generatedKey.xpub} field="xpub" copiedField={copiedField} onCopy={copyToClipboard} />
                  <div className="flex items-center justify-between px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-none">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase">Ruta de derivación</span>
                    <span className="text-xs text-[#818cf8] font-mono font-semibold">{generatedKey.derivationPath}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => handleUseKey()}
                    className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold rounded-none transition-colors flex items-center justify-center gap-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                    Usar esta xpub en el siguiente slot vacío
                  </button>

                  {slotCount > 1 && (
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(slotCount, 4)}, 1fr)` }}>
                      {entries.map((e, i) => (
                        <button
                          key={e.id}
                          onClick={() => handleUseKey(e.id)}
                          className={cn(
                            "py-2 text-xs font-bold border rounded-none transition-all duration-200 flex flex-col items-center gap-0.5",
                            e.isValid
                              ? "border-emerald-800/40 bg-emerald-950/20 text-emerald-400"
                              : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-[#6366f1] hover:text-[#818cf8]"
                          )}
                        >
                          <span>Slot {i + 1}</span>
                          {e.isValid && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setKeygenStep("generate"); setGeneratedKey(null); setMnemonic([]); setShowMnemonic(false); }}
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

function KeyResultField({ label, value, field, copiedField, onCopy, secret = false, accent = false }: {
  label: string; value: string; field: string; copiedField: string | null;
  onCopy: (v: string, f: string) => void; secret?: boolean; accent?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const display = secret && !revealed ? "•".repeat(Math.min(value.length, 32)) : value;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">{label}</span>
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

  return (
    <div className={cn(
      "relative overflow-hidden rounded-none border flex flex-col md:flex-row items-stretch transition-all duration-300 ease-in-out",
      entry.isValid
        ? "border-emerald-800/40 bg-emerald-950/5"
        : hasNetworkMismatch
        ? "border-amber-800/40 bg-amber-950/5"
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
                  {Object.entries(
                    network === "testnet" || network === "testnet4" || network === "signet"
                      ? TESTNET_PATHS
                      : STANDARD_PATHS
                  ).map(([label, path]) => (
                    <button
                      key={path}
                      onClick={() => { onPathChange(path); onToggleDropdown(); }}
                      className="w-full px-3 py-2 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0"
                    >
                      <div className="text-xs font-bold text-zinc-300">{label}</div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{path}</div>
                    </button>
                  ))}
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
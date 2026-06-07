import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { CelestialBackdrop } from "./CelestialBackdrop";
import { RevealText } from "./RevealText";
import styles from "./landing.module.css";

const signals = ["Varias firmas", "Plan de recuperacion", "Bitcoin bajo tu control"];
const essentials = [
  {
    icon: ShieldCheck,
    title: "Protege contra perdidas comunes",
    text: "Kukul Vault ayuda a que perder un dispositivo no signifique perder acceso a tus Bitcoin.",
  },
  {
    icon: Clock3,
    title: "Reduce decisiones improvisadas",
    text: "La boveda queda pensada antes de una emergencia, con reglas que puedes entender y guardar.",
  },
  {
    icon: KeyRound,
    title: "Mantiene el control contigo",
    text: "La app no custodia tus fondos. Te ayuda a organizar tu seguridad sin entregar tus llaves privadas.",
  },
];
const workflow = [
  {
    icon: ShieldCheck,
    title: "Crea una boveda",
    text: "Define cuantos dispositivos participan y el esquema de firmas que quieres usar.",
  },
  {
    icon: KeyRound,
    title: "Agrega tus llaves",
    text: "Importa las llaves publicas de tus wallets para construir la configuracion multifirma.",
  },
  {
    icon: Clock3,
    title: "Prepara recuperacion",
    text: "Configura timelock, descriptor y respaldo para volver a entrar si algo falla.",
  },
];
const architecture = [
  {
    figure: "FIG 0.2",
    title: "Multisig 2 de 3",
    text: "Divide el control entre varias llaves y exige un quorum para mover fondos.",
    visual: "keys",
  },
  {
    figure: "FIG 0.3",
    title: "Timelock de emergencia",
    text: "Prepara una ruta temporal para recuperar acceso si una llave queda fuera de alcance.",
    visual: "recovery",
  },
  {
    figure: "FIG 0.4",
    title: "Descriptor exportable",
    text: "Conserva la informacion tecnica necesaria para reconstruir la boveda cuando haga falta.",
    visual: "backup",
  },
];
const creators = ["Guillermo", "Maximo", "Emiliano", "Rafael"];

function ArchitectureVisual({ type }: { type: string }) {
  if (type === "keys") {
    return (
      <svg viewBox="0 0 360 260" role="img" aria-label="Multisig dos de tres">
        <path className={styles.isoGlow} d="M178 80 244 116v73l-66 37-66-37v-73z" />
        <path d="M178 80 244 116v73l-66 37-66-37v-73z" />
        <path d="M112 116 178 153l66-37M178 153v73" />
        <circle cx="178" cy="155" r="24" />
        <path d="M168 155h20M178 145v20" />
        <circle cx="82" cy="58" r="26" />
        <circle cx="178" cy="36" r="26" />
        <circle cx="274" cy="58" r="26" />
        <path d="M68 58h28M82 44v28M164 36h28M178 22v28M260 58h28M274 44v28" />
        <path className={styles.trace} d="M102 68 151 116M178 62v71M254 68 205 116" />
        <path className={styles.trace} d="M142 204h72M156 218h44" />
      </svg>
    );
  }

  if (type === "recovery") {
    return (
      <svg viewBox="0 0 360 260" role="img" aria-label="Timelock de emergencia">
        <path className={styles.isoGlow} d="M70 176h220l30 28H100z" />
        <path d="M70 176h220l30 28H100z" />
        <path d="M100 204v22h220v-22M70 176v22l30 28" />
        <circle cx="178" cy="95" r="52" />
        <path d="M178 62v35l25 18" />
        <path d="M126 95h-38M270 95h-38" />
        <path d="M88 95v81M270 95v81" />
        <path d="M110 176v-30M134 176v-42M158 176v-28M202 176v-46M226 176v-34M250 176v-48" />
        <path className={styles.trace} d="M96 156h164M108 143h140M122 130h110" />
        <path className={styles.trace} d="M178 35v-18M156 41l-8-16M200 41l8-16" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 360 260" role="img" aria-label="Descriptor exportable">
      <path className={styles.isoGlow} d="M105 34h132l38 38v156H105z" />
      <path d="M105 34h132l38 38v156H105z" />
      <path d="M237 34v38h38" />
      <path d="M132 82h76M132 108h112M132 134h92M132 160h116" />
      <path d="M132 188h44M192 188h56" />
      <path d="M82 66h34M82 108h34M82 150h34M82 192h34" />
      <path d="M275 98h28M275 142h28M275 186h28" />
      <path className={styles.trace} d="M82 66 132 82M82 108h50M82 150h50M82 192l50-4" />
      <path className={styles.trace} d="M248 108h55M248 160l55 26" />
      <path d="m197 205 14 12 28-34" />
    </svg>
  );
}

export const metadata = {
  title: "Kukul Vault | Landing",
  description: "Landing profesional para Kukul Vault, autocustodia multifirma nativa de Bitcoin.",
};

export default function LandingPage() {
  return (
    <main className={styles.shell}>
      <div className={styles.backdrop}>
        <CelestialBackdrop className={styles.celestial} />
        <div className={styles.vignette} aria-hidden="true" />
      </div>

      <nav className={styles.nav} aria-label="Principal">
        <div className={styles.navInner}>
          <Link href="#inicio" className={styles.brand} aria-label="Kukul Vault landing">
            <Image
              src="/kukul-emblem-vertical.png"
              alt=""
              width={96}
              height={96}
              className={styles.brandLogo}
            />
            <span>Kukul Vault</span>
          </Link>
          <div className={styles.navLinks}>
            <a href="#seguridad">Seguridad</a>
            <a href="#arquitectura">Arquitectura</a>
            <a href="#cta">Lanzar</a>
            <Link href="/">App</Link>
          </div>
          <Link href="/" className={styles.navCta}>
            <span>Abrir app</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      <section id="inicio" className={styles.hero}>
        <div className={styles.heroText}>
          <div className={styles.kicker}>
            <Sparkles size={16} />
            <RevealText as="span" text="Guarda Bitcoin con mas calma" />
          </div>

          <RevealText
            as="h1"
            className={styles.heroTitle}
            text="Autocustodia Bitcoin sin caos."
          />

          <RevealText
            as="p"
            className={styles.copy}
            text="Kukul Vault convierte multifirma, timelocks y respaldos en una experiencia clara para proteger tus fondos sin entregar tus llaves."
          />
        </div>

        <div className={styles.actions}>
          <Link href="/" className={styles.primaryCta}>
            <ShieldCheck size={18} />
            <RevealText as="span" text="Crear mi boveda" />
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className={styles.signals} aria-label="Caracteristicas principales">
          {signals.map((signal) => (
            <span key={signal}>
              <RevealText as="span" text={signal} />
            </span>
          ))}
        </div>

        <div className={styles.productFrame} aria-label="Resumen de Kukul Vault">
          <div className={styles.frameSidebar}>
            <Image
              src="/kukul-emblem-vertical.png"
              alt=""
              width={1024}
              height={1536}
              priority
              className={styles.logo}
            />
            <RevealText as="span" text="Boveda personal" />
            <RevealText as="strong" text="Sin custodio" />
          </div>
          <div className={styles.frameMain}>
            {essentials.map((item) => {
              const Icon = item.icon;
              return (
                <article className={styles.frameCard} key={item.title}>
                  <Icon size={20} />
                  <div>
                    <RevealText as="h3" text={item.title} />
                    <RevealText as="p" text={item.text} />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="arquitectura" className={styles.architectureSection} aria-label="Arquitectura de seguridad">
        {architecture.map((item) => (
          <article className={styles.architectureItem} key={item.title}>
            <RevealText as="span" text={item.figure} />
            <div className={styles.architectureVisual}>
              <ArchitectureVisual type={item.visual} />
            </div>
            <div className={styles.architectureCopy}>
              <RevealText as="h3" text={item.title} />
              <RevealText as="p" text={item.text} />
            </div>
          </article>
        ))}
      </section>

      <section id="seguridad" className={styles.infoSection}>
        <div className={styles.sectionCopy}>
          <RevealText
            as="h2"
            className={styles.sectionTitle}
            text="Un flujo claro desde la primera llave hasta el respaldo final."
          />
        </div>
        <div className={styles.cards}>
          {workflow.map((item) => {
            const Icon = item.icon;
            return (
              <article className={styles.card} key={item.title}>
                <Icon size={22} />
                <RevealText as="h3" text={item.title} />
                <RevealText as="p" text={item.text} />
              </article>
            );
          })}
        </div>
      </section>

      <section id="cta" className={styles.finalCta}>
        <RevealText
          as="h2"
          className={styles.ctaTitle}
          text="Tu boveda Bitcoin, lista para usarse."
        />
        <div className={styles.ctaActions}>
          <Link href="/" className={styles.primaryCta}>
            <RevealText as="span" text="Abrir Kukul Vault" />
            <ArrowRight size={18} />
          </Link>
          <a
            href="https://github.com/BDvMax/HackthonBitcoin2"
            className={styles.ghostCta}
            target="_blank"
            rel="noreferrer"
          >
            <RevealText as="span" text="Ver repositorio" />
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <Image
            src="/kukul-emblem-vertical.png"
            alt=""
            width={96}
            height={96}
            className={styles.footerLogo}
          />
        </div>
        <div className={styles.footerCreators} aria-label="Creadores del proyecto">
          {creators.map((creator) => (
            <span key={creator}>{creator}</span>
          ))}
        </div>
        <a
          href="https://github.com/BDvMax/HackthonBitcoin2"
          className={styles.githubLink}
          target="_blank"
          rel="noreferrer"
          aria-label="Repositorio de Kukul Vault en GitHub"
        >
          <Image src="/GitHub_light.svg" alt="" width={28} height={28} />
          <span>BDvMax/HackthonBitcoin2</span>
        </a>
      </footer>
    </main>
  );
}

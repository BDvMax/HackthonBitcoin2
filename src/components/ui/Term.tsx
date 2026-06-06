"use client";

import React from "react";
import { useWallet } from "@/context/WalletContext";
import { EduTooltip } from "./EduTooltip";

interface TermProps {
  name: "xpub" | "fingerprint" | "derivation" | "timelock" | "approvals";
  className?: string;
}

const TERM_DATA = {
  xpub: {
    beginner: {
      text: "Llave de Lectura",
      tooltip: null
    },
    intermediate: {
      text: "Llave de Lectura (XPUB)",
      tooltip: "XPUB (Llave Pública Extendida): Permite que la app vea tus fondos y reciba depósitos, pero NO puede gastarlos. Es 100% seguro compartirla."
    },
    advanced: {
      text: "XPUB / ZPUB",
      tooltip: null
    }
  },
  fingerprint: {
    beginner: {
      text: "Identificador Único",
      tooltip: null
    },
    intermediate: {
      text: "Huella Digital (Fingerprint)",
      tooltip: "Fingerprint: Un código de 8 caracteres que sirve de 'cédula de identidad' para tu billetera física. Ejemplo: 7a3f89e2."
    },
    advanced: {
      text: "Master Key Fingerprint",
      tooltip: null
    }
  },
  derivation: {
    beginner: {
      text: "Código de Dirección",
      tooltip: null
    },
    intermediate: {
      text: "Ruta de la Llave (Derivation Path)",
      tooltip: "Ruta de Derivación: Indica el camino exacto dentro del chip de tu dispositivo donde se encuentra esta llave específica. Ejemplo: m/48'/0'/0'/2'."
    },
    advanced: {
      text: "Derivation Path",
      tooltip: null
    }
  },
  timelock: {
    beginner: {
      text: "Seguro de Retraso de Tiempo",
      tooltip: null
    },
    intermediate: {
      text: "Bloqueo de Emergencia (Timelock)",
      tooltip: "Timelock (BIP68): Un seguro temporal de Bitcoin. Si pierdes tus llaves primarias, el sistema te permite recuperar fondos usando menos firmas tras esperar este plazo en bloques. Ejemplo: 25,920 bloques (~180 días)."
    },
    advanced: {
      text: "BIP68 Relative Timelock",
      tooltip: null
    }
  },
  approvals: {
    beginner: {
      text: "Aprobadores Necesarios",
      tooltip: null
    },
    intermediate: {
      text: "Firmas Necesarias (Quórum)",
      tooltip: "Quórum: El número mínimo de llaves necesarias para gastar los fondos (M de N). Por ejemplo: necesitas 2 firmas de un total de 3 llaves."
    },
    advanced: {
      text: "M of N Multisig Quorum",
      tooltip: null
    }
  }
};

export function Term({ name, className }: TermProps) {
  const { experienceLevel } = useWallet();
  const data = TERM_DATA[name];

  if (!data) return <span>{name}</span>;

  const current = data[experienceLevel] || data["intermediate"];

  if (experienceLevel === "intermediate" && current.tooltip) {
    return (
      <EduTooltip content={current.tooltip} className={className}>
        {current.text}
      </EduTooltip>
    );
  }

  return <span className={className}>{current.text}</span>;
}

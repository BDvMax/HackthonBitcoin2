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
      text: "Llave de Lectura (XPUB)",
      tooltip: "Permite ver fondos y recibir, sin poder gastarlos. Seguro de compartir."
    },
    intermediate: {
      text: "Llave de Lectura (XPUB)",
      tooltip: "Permite ver fondos y recibir, sin poder gastarlos. Seguro de compartir."
    },
    advanced: {
      text: "XPUB / ZPUB",
      tooltip: null
    }
  },
  fingerprint: {
    beginner: {
      text: "Huella Digital (Fingerprint)",
      tooltip: "Código de 8 caracteres que identifica unívocamente a tu dispositivo físico."
    },
    intermediate: {
      text: "Huella Digital (Fingerprint)",
      tooltip: "Código de 8 caracteres que identifica unívocamente a tu dispositivo físico."
    },
    advanced: {
      text: "Master Key Fingerprint",
      tooltip: null
    }
  },
  derivation: {
    beginner: {
      text: "Ruta de la Llave (Derivation Path)",
      tooltip: "Ubicación exacta de la llave dentro del chip del dispositivo."
    },
    intermediate: {
      text: "Ruta de la Llave (Derivation Path)",
      tooltip: "Ubicación exacta de la llave dentro del chip del dispositivo."
    },
    advanced: {
      text: "Derivation Path",
      tooltip: null
    }
  },
  timelock: {
    beginner: {
      text: "Bloqueo de Emergencia (Timelock)",
      tooltip: "Seguro (BIP68) que te permite gastar con menos firmas tras un plazo de inactividad."
    },
    intermediate: {
      text: "Bloqueo de Emergencia (Timelock)",
      tooltip: "Seguro (BIP68) que te permite gastar con menos firmas tras un plazo de inactividad."
    },
    advanced: {
      text: "BIP68 Relative Timelock",
      tooltip: null
    }
  },
  approvals: {
    beginner: {
      text: "Firmas Necesarias (Quórum)",
      tooltip: "Mínimo de firmas requeridas en conjunto para autorizar un gasto."
    },
    intermediate: {
      text: "Firmas Necesarias (Quórum)",
      tooltip: "Mínimo de firmas requeridas en conjunto para autorizar un gasto."
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

  const current = data[experienceLevel] ?? data["intermediate"];

  if ((experienceLevel === "beginner" || experienceLevel === "intermediate") && current.tooltip) {
    return (
      <EduTooltip content={current.tooltip} className={className}>
        {current.text}
      </EduTooltip>
    );
  }

  return <span className={className}>{current.text}</span>;
}
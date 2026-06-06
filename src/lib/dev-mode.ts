// Activa con ?dev=true en la URL o 5 clicks en el logo
export function isDevMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("dev") === "true"
    || localStorage.getItem("boveda_dev") === "true";
}

export function toggleDevMode(): boolean {
  const next = !isDevMode();
  localStorage.setItem("boveda_dev", String(next));
  window.location.reload();
  return next;
}

export const DEV_PRESETS = [
  { label: "10 min",  blocks: 1   },
  { label: "1 hora",  blocks: 6   },
  { label: "6 horas", blocks: 36  },
  { label: "1 día",   blocks: 144 },
];

export const PROD_PRESETS = [
  { label: "3 meses", blocks: 12960  },
  { label: "6 meses", blocks: 25920  },
  { label: "1 año",   blocks: 52560  },
  { label: "2 años",  blocks: 105120 },
];
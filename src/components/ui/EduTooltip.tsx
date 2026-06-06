"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useWallet } from "@/context/WalletContext";

interface EduTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}

export function EduTooltip({ children, content, className }: EduTooltipProps) {
  const { setActiveHelp, activeHelp } = useWallet();

  const handleInteract = (e: React.MouseEvent<HTMLSpanElement>) => {
    setActiveHelp({
      title: children?.toString() || "Vocabulario",
      text: content?.toString() || "",
      x: e.clientX,
      y: e.clientY,
    });
  };

  const isCurrentHelp = activeHelp?.title === children?.toString();

  return (
    <span
      className={cn("relative inline-block cursor-help", className)}
      onMouseEnter={handleInteract}
      onMouseLeave={() => setActiveHelp(null)}
      onClick={handleInteract}
    >
      <span
        className={cn(
          "underline decoration-dotted decoration-[#818cf8]/80 decoration-2 underline-offset-4 font-bold transition-all duration-300",
          isCurrentHelp
            ? "text-[#a5b4fc] bg-[#6366f1]/10 px-1 rounded-sm decoration-solid"
            : "text-[#818cf8] hover:text-[#a5b4fc] hover:bg-[#312e81]/10 px-1 rounded-sm"
        )}
      >
        {children}
      </span>
    </span>
  );
}

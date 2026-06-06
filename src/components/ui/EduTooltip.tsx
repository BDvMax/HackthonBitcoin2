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

  const handleInteract = () => {
    setActiveHelp({
      title: children?.toString() || "Vocabulario",
      text: content?.toString() || "",
    });
  };

  const isCurrentHelp = activeHelp?.title === children?.toString();

  return (
    <span
      className={cn("relative inline-block cursor-help", className)}
      onMouseEnter={handleInteract}
      onClick={handleInteract}
    >
      <span
        className={cn(
          "px-1.5 py-0.5 rounded-md font-semibold transition-all duration-300",
          isCurrentHelp
            ? "text-white bg-[#6366f1] border border-[#818cf8]"
            : "text-[#a5b4fc] bg-[#312e81]/30 border border-[#4338ca]/60 hover:bg-[#312e81]/50 hover:text-white"
        )}
      >
        {children}
      </span>
    </span>
  );
}

"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface EduTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}

export function EduTooltip({ children, content, className }: EduTooltipProps) {
  return (
    <span className={cn("relative inline-block group/tooltip cursor-help", className)}>
      <span className="underline decoration-dotted decoration-[#818cf8]/80 decoration-2 underline-offset-4 font-bold transition-all duration-300 text-[#818cf8] hover:text-[#a5b4fc] hover:bg-[#312e81]/10 px-1 rounded-sm">
        {children}
      </span>

      <span className="pointer-events-none absolute z-[9999] bottom-[calc(100%+8px)] left-0 w-56
        opacity-0 group-hover/tooltip:opacity-100
        translate-y-1 group-hover/tooltip:translate-y-0
        transition-all duration-150 ease-out">
        <span className="block bg-[#0a0c14] border-l-[6px] border-l-[#6366f1] border-y border-r border-[#1e2640] rounded-sm shadow-[0_10px_40px_rgba(99,102,241,0.2)] px-3 py-2.5">
          <span className="block text-xs text-zinc-300 leading-relaxed font-sans font-normal normal-case tracking-normal">
            {content}
          </span>
        </span>
        <span className="block w-2.5 h-2.5 bg-[#0a0c14] border-l border-b border-[#1e2640] rotate-[-45deg] ml-3 -mt-[6px]" />
      </span>
    </span>
  );
}
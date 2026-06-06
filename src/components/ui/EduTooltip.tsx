"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface EduTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}

export function EduTooltip({ children, content, className }: EduTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span
      className={cn("relative inline-block", className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <span className="text-[#a5b4fc] bg-[#312e81]/40 border border-[#4338ca]/80 px-1.5 py-0.5 rounded-md cursor-help font-semibold transition-all duration-300 hover:bg-[#312e81]/60">
        {children}
      </span>
      
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl text-xs text-zinc-300 font-sans normal-case leading-relaxed pointer-events-none">
          {content}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-zinc-700"></div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 border-[3px] border-transparent border-t-zinc-900"></div>
        </div>
      )}
    </span>
  );
}

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSoundEffects } from "@/hooks/useSoundEffects";

interface Step { id: number; label: string; }
interface Props { 
  steps: readonly Step[]; 
  currentStep: number; 
  highestStepReached?: number;
  onStepClick?: (step: number) => void;
}

export function StepIndicator({ steps, currentStep, highestStepReached, onStepClick }: Props) {
  const { playClick } = useSoundEffects();
  return (
    <div className="mx-auto flex min-w-max items-center justify-center gap-0">
      {steps.map((s, i) => {
        const done = s.id < currentStep;
        const active = s.id === currentStep;
        const canClick = highestStepReached ? s.id <= highestStepReached : false;
        
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <button
                onClick={() => {
                  if (canClick && onStepClick) {
                    playClick();
                    onStepClick(s.id);
                  }
                }}
                disabled={!canClick}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-mono font-bold transition-all",
                  done && "bg-[#6366f1] text-white",
                  active && "bg-zinc-800 border-2 border-[#6366f1] text-[#818cf8]",
                  !done && !active && "bg-zinc-900 border border-zinc-700 text-zinc-650",
                  canClick && !active && "hover:border-[#6366f1]/50 hover:bg-zinc-800 cursor-pointer",
                  !canClick && "cursor-not-allowed opacity-50"
                )}
              >
                {done ? <Check className="w-5 h-5" /> : s.id}
              </button>
              <span
                className={cn(
                  "mt-2 text-sm font-semibold tracking-wide",
                  active ? "text-[#818cf8]" : "text-zinc-550"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-8 h-px mb-5 mx-1 transition-all sm:w-16",
                  done ? "bg-[#6366f1]" : "bg-zinc-800"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

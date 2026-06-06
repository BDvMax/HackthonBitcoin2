import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step { id: number; label: string; }
interface Props { steps: readonly Step[]; currentStep: number; }

export function StepIndicator({ steps, currentStep }: Props) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const done = s.id < currentStep;
        const active = s.id === currentStep;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all",
                  done && "bg-[#6366f1] text-white",
                  active && "bg-zinc-800 border-2 border-[#6366f1] text-[#818cf8]",
                  !done && !active && "bg-zinc-900 border border-zinc-700 text-zinc-650"
                )}
              >
                {done ? <Check className="w-4 h-4" /> : s.id}
              </div>
              <span
                className={cn(
                  "mt-1.5 text-xs tracking-wide",
                  active ? "text-[#818cf8]" : "text-zinc-550"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-16 h-px mb-4 mx-1 transition-all",
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
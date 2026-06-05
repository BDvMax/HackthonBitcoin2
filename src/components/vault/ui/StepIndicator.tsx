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
                  done && "bg-orange-500 text-black",
                  active && "bg-zinc-800 border-2 border-orange-500 text-orange-400",
                  !done && !active && "bg-zinc-900 border border-zinc-700 text-zinc-600"
                )}
              >
                {done ? <Check className="w-4 h-4" /> : s.id}
              </div>
              <span
                className={cn(
                  "mt-1.5 text-[10px] tracking-wide",
                  active ? "text-orange-400" : "text-zinc-600"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-16 h-px mb-4 mx-1 transition-all",
                  done ? "bg-orange-500" : "bg-zinc-800"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
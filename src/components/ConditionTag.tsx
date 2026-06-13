import { X } from "lucide-react";
import type { NlpRecognizedCondition } from "@shared/types";

interface ConditionTagProps {
  condition: NlpRecognizedCondition;
  onRemove: () => void;
}

const colorMap: Record<string, string> = {
  date: "bg-accent-500/15 text-accent-400 border-accent-500/30",
  scanCount: "bg-warning-500/15 text-warning-500 border-warning-500/30",
  type: "bg-brand-500/15 text-brand-300 border-brand-500/30",
  enabled: "bg-success-500/15 text-success-500 border-success-500/30",
  sort: "bg-dark-700 text-dark-300 border-dark-600",
  keyword: "bg-brand-500/15 text-brand-300 border-brand-500/30",
};

export function ConditionTag({ condition, onRemove }: ConditionTagProps) {
  const color = colorMap[condition.field] || "bg-dark-700 text-dark-300 border-dark-600";

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${color} animate-fade-up`}>
      <span className="text-dark-400">{condition.label}:</span>
      <span>{condition.value}</span>
      <button onClick={onRemove} className="ml-0.5 hover:text-white transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

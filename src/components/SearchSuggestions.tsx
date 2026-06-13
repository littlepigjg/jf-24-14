import { Sparkles, Zap, ArrowRight } from "lucide-react";

interface SuggestionItem {
  text: string;
  desc: string;
}

const SUGGESTION_EXAMPLES: SuggestionItem[] = [
  { text: "上周创建的动态码", desc: "按时间+类型筛选" },
  { text: "扫码数超过100的已启用二维码", desc: "按扫码量+状态筛选" },
  { text: "最近7天的热门二维码", desc: "按时间+热度筛选" },
  { text: "本月创建的静态码按扫码次数降序", desc: "组合条件+排序" },
  { text: "冷门二维码", desc: "语义化快捷筛选" },
  { text: "已停用的静态码", desc: "按状态+类型筛选" },
];

interface SearchSuggestionsProps {
  onSelect: (text: string) => void;
}

export function SearchSuggestions({ onSelect }: SearchSuggestionsProps) {
  return (
    <div className="absolute z-30 top-full mt-2 left-0 right-0 card p-4 shadow-glow animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-brand-400" />
        <span className="text-sm font-medium text-white">试试这些搜索</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SUGGESTION_EXAMPLES.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s.text)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-dark-900/60 border border-dark-700 hover:border-brand-500/40 hover:bg-dark-800/80 transition-all text-left group"
          >
            <span className="text-brand-400 group-hover:text-brand-300 flex-shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-dark-200 group-hover:text-white truncate">{s.text}</p>
              <p className="text-xs text-dark-500">{s.desc}</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-dark-600 group-hover:text-brand-400 ml-auto flex-shrink-0 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}

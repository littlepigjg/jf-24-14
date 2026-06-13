import { forwardRef } from "react";
import { Sparkles, Search, X } from "lucide-react";

interface SmartSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onFocus?: () => void;
  placeholder?: string;
}

export const SmartSearchInput = forwardRef<HTMLInputElement, SmartSearchInputProps>(
  function SmartSearchInput(
    { value, onChange, onSearch, onClear, onFocus, placeholder },
    ref
  ) {
    return (
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Sparkles className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
          <input
            ref={ref}
            type="text"
            placeholder={placeholder || "用自然语言搜索，如：上周创建的扫码数超过100的动态码..."}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            onFocus={onFocus}
            className="input pl-9 pr-10 bg-dark-900/80 border-brand-500/30 focus:border-brand-500 focus:ring-brand-500/40"
          />
          {value && (
            <button
              onClick={onClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={onSearch}
          disabled={!value.trim()}
          className="btn-primary px-5 disabled:opacity-40"
        >
          <Search className="w-4 h-4" />
          添加条件
        </button>
      </div>
    );
  }
);

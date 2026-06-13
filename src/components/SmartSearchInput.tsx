import { forwardRef } from "react";
import { Sparkles, Search, X, Loader2 } from "lucide-react";

interface SmartSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onFocus?: () => void;
  placeholder?: string;
  isLoading?: boolean;
  buttonText?: string;
}

export const SmartSearchInput = forwardRef<HTMLInputElement, SmartSearchInputProps>(
  function SmartSearchInput(
    { value, onChange, onSearch, onClear, onFocus, placeholder, isLoading, buttonText },
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
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isLoading) {
                e.preventDefault();
                onSearch();
              }
            }}
            onFocus={onFocus}
            disabled={isLoading}
            className="input pl-9 pr-10 bg-dark-900/80 border-brand-500/30 focus:border-brand-500 focus:ring-brand-500/40 disabled:opacity-60"
          />
          {value && !isLoading && (
            <button
              onClick={onClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {isLoading && (
            <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 animate-spin" />
          )}
        </div>
        <button
          onClick={onSearch}
          disabled={!value.trim() || isLoading}
          className="btn-primary px-5 disabled:opacity-40 min-w-[100px] justify-center"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              解析中
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              {buttonText || "添加条件"}
            </>
          )}
        </button>
      </div>
    );
  }
);

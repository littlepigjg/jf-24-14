import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  PlusCircle,
  Filter,
  Sparkles,
  Clock,
  Trash2 as EraseIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  mergeQueries,
  removeConditionFromQuery,
  isQueryEmpty,
  structuredQueryToConditions,
  generateRelatedSuggestions,
} from "@/lib/queryUtils";
import { SmartSearchInput } from "@/components/SmartSearchInput";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import { ConditionTag } from "@/components/ConditionTag";
import { QrCodeTable } from "@/components/QrCodeTable";
import type { QrCode, PagedResult, NlpStructuredQuery, NlpParseResult } from "@shared/types";

const mockList: PagedResult<QrCode> = {
  items: Array.from({ length: 8 }, (_, i) => ({
    id: `qr-${i + 1}`,
    name: `示例二维码 ${i + 1}`,
    type: i % 2 === 0 ? "dynamic" : "static",
    targetUrl: `https://example.com/page/${i + 1}`,
    shortCode: `sh${1000 + i}`,
    size: 256,
    foreground: "#0F172A",
    background: "#FFFFFF",
    errorLevel: "M",
    enabled: i !== 6,
    scanCount: Math.floor(Math.random() * 5000),
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - i * 43200000).toISOString(),
  })),
  total: 128,
  page: 1,
  pageSize: 10,
};

export default function QrCodeList() {
  const [data, setData] = useState<PagedResult<QrCode>>(mockList);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [enabledFilter, setEnabledFilter] = useState<string>("all");

  const [smartInput, setSmartInput] = useState("");
  const [confirmedQuery, setConfirmedQuery] = useState<NlpStructuredQuery>({});
  const [previewParse, setPreviewParse] = useState<NlpParseResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const smartInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const isSmartMode = !isQueryEmpty(confirmedQuery);
  const confirmedConditions = structuredQueryToConditions(confirmedQuery);
  const relatedSuggestions = generateRelatedSuggestions(confirmedQuery);

  const fetchWithQuery = useCallback(
    (query: NlpStructuredQuery, currentPage: number) => {
      setLoading(true);
      const params: Record<string, unknown> = { page: currentPage, pageSize: 10 };

      if (query.keyword) params.keyword = query.keyword;
      if (query.type) params.type = query.type;
      if (query.enabled !== undefined) params.enabled = query.enabled;
      if (query.scanCountMin !== undefined) params.scanCountMin = query.scanCountMin;
      if (query.scanCountMax !== undefined) params.scanCountMax = query.scanCountMax;
      if (query.dateFrom) params.dateFrom = query.dateFrom;
      if (query.dateTo) params.dateTo = query.dateTo;
      if (query.sortBy) params.sortBy = query.sortBy;
      if (query.sortOrder) params.sortOrder = query.sortOrder;

      if (!isSmartMode) {
        if (keyword) params.keyword = keyword;
        if (typeFilter !== "all") params.type = typeFilter;
        if (enabledFilter !== "all") params.enabled = enabledFilter === "active";
      }

      api
        .listQrCodes(params as any)
        .then(setData)
        .catch(() => setData({ ...mockList, page: currentPage }))
        .finally(() => setLoading(false));
    },
    [keyword, typeFilter, enabledFilter, isSmartMode]
  );

  useEffect(() => {
    fetchWithQuery(confirmedQuery, page);
  }, [page, confirmedQuery, fetchWithQuery]);

  useEffect(() => {
    if (!isSmartMode) {
      setPage(1);
    }
  }, [typeFilter, enabledFilter, isSmartMode]);

  const handleSmartInputChange = (value: string) => {
    setSmartInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setPreviewParse(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      api
        .parseNlpQuery(value)
        .then(setPreviewParse)
        .catch(() => {});
    }, 300);
  };

  const handleAddCondition = () => {
    if (!smartInput.trim()) return;
    if (!previewParse || previewParse.recognized.length === 0) return;

    const merged = mergeQueries(confirmedQuery, previewParse.query);
    setConfirmedQuery(merged);
    setSmartInput("");
    setPreviewParse(null);
    setPage(1);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = async (text: string) => {
    setShowSuggestions(false);
    try {
      const parseResult = await api.parseNlpQuery(text);
      const merged = mergeQueries(confirmedQuery, parseResult.query);
      setConfirmedQuery(merged);
      setSmartInput("");
      setPreviewParse(null);
      setPage(1);
    } catch {
      // ignore
    }
  };

  const handleRemoveCondition = (field: string) => {
    const updated = removeConditionFromQuery(confirmedQuery, field);
    setConfirmedQuery(updated);
    setPage(1);
  };

  const clearAllConditions = () => {
    setConfirmedQuery({});
    setSmartInput("");
    setPreviewParse(null);
    setShowSuggestions(false);
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此二维码？")) return;
    try {
      await api.deleteQrCode(id);
      fetchWithQuery(confirmedQuery, page);
    } catch {
      fetchWithQuery(confirmedQuery, page);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.toggleQrCodeEnabled(id);
      fetchWithQuery(confirmedQuery, page);
    } catch {
      fetchWithQuery(confirmedQuery, page);
    }
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      const blob = await api.downloadQrCode(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("下载失败");
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        smartInputRef.current &&
        !smartInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePlainSearch = () => {
    setPage(1);
    fetchWithQuery(confirmedQuery, 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">二维码列表</h1>
          <p className="text-dark-400 mt-1 text-sm">共 {data.total} 个二维码</p>
        </div>
        <Link to="/qrcodes/new" className="btn-primary">
          <PlusCircle className="w-4 h-4" />
          新建二维码
        </Link>
      </div>

      <div className="card p-4 space-y-3">
        <div className="relative" ref={suggestionsRef}>
          <SmartSearchInput
            ref={smartInputRef}
            value={smartInput}
            onChange={handleSmartInputChange}
            onSearch={handleAddCondition}
            onClear={() => setSmartInput("")}
            onFocus={() => {
              if (!smartInput && confirmedConditions.length === 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder="输入条件后回车添加，可多次叠加。如：上周创建的、扫码数超过100..."
          />

          {showSuggestions && !smartInput && confirmedConditions.length === 0 && (
            <SearchSuggestions onSelect={handleSuggestionClick} />
          )}

          {previewParse && previewParse.recognized.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-xs text-dark-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                预览（回车添加）:
              </span>
              {previewParse.recognized.map((c, i) => (
                <ConditionTag
                  key={i}
                  condition={c}
                  onRemove={() => {}}
                />
              ))}
            </div>
          )}
        </div>

        {confirmedConditions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 py-2 px-3 bg-dark-900/40 rounded-lg border border-dark-700">
            <span className="text-xs text-dark-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              已添加条件:
            </span>
            {confirmedConditions.map((c, i) => (
              <ConditionTag
                key={i}
                condition={c}
                onRemove={() => handleRemoveCondition(c.field)}
              />
            ))}
            <button
              onClick={clearAllConditions}
              className="ml-auto text-xs text-dark-400 hover:text-danger-400 flex items-center gap-1 transition-colors"
            >
              <EraseIcon className="w-3 h-3" />
              清除全部
            </button>
          </div>
        )}

        <div className="divider" />

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="text"
              placeholder="普通搜索名称、URL、短码..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePlainSearch()}
              className="input pl-9"
              disabled={isSmartMode}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-dark-500" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
              }}
              className="input w-auto"
              disabled={isSmartMode}
            >
              <option value="all">全部类型</option>
              <option value="static">静态码</option>
              <option value="dynamic">动态码</option>
            </select>
            <select
              value={enabledFilter}
              onChange={(e) => {
                setEnabledFilter(e.target.value);
              }}
              className="input w-auto"
              disabled={isSmartMode}
            >
              <option value="all">全部状态</option>
              <option value="active">已启用</option>
              <option value="inactive">已停用</option>
            </select>
            {isSmartMode && (
              <span className="text-xs text-brand-400 flex items-center gap-1 ml-1">
                <Sparkles className="w-3 h-3" />
                智能模式
              </span>
            )}
          </div>
        </div>

        {isSmartMode && relatedSuggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-dark-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              再加点条件:
            </span>
            {relatedSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(s)}
                className="text-xs px-2.5 py-1 rounded-md bg-dark-900/60 border border-dark-700 text-dark-300 hover:text-brand-300 hover:border-brand-500/40 transition-all"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <QrCodeTable
        data={data}
        loading={loading}
        page={page}
        onPageChange={setPage}
        onDelete={handleDelete}
        onToggle={handleToggle}
        onDownload={handleDownload}
        isSmartMode={isSmartMode}
      />
    </div>
  );
}

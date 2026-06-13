import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  PlusCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit3,
  BarChart3,
  Download,
  Trash2,
  Power,
  QrCode as QrIcon,
  Sparkles,
  X,
  Clock,
  Zap,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import type { QrCode, PagedResult, NlpParseResult, NlpRecognizedCondition } from "@shared/types";

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

const SUGGESTION_EXAMPLES = [
  { icon: <Zap className="w-3.5 h-3.5" />, text: "上周创建的动态码", desc: "按时间+类型筛选" },
  { icon: <Zap className="w-3.5 h-3.5" />, text: "扫码数超过100的已启用二维码", desc: "按扫码量+状态筛选" },
  { icon: <Zap className="w-3.5 h-3.5" />, text: "最近7天的热门二维码", desc: "按时间+热度筛选" },
  { icon: <Zap className="w-3.5 h-3.5" />, text: "本月创建的静态码按扫码次数降序", desc: "组合条件+排序" },
  { icon: <Zap className="w-3.5 h-3.5" />, text: "冷门二维码", desc: "语义化快捷筛选" },
  { icon: <Zap className="w-3.5 h-3.5" />, text: "已停用的静态码", desc: "按状态+类型筛选" },
];

function ConditionTag({ condition, onRemove }: { condition: NlpRecognizedCondition; onRemove: () => void }) {
  const colorMap: Record<string, string> = {
    date: "bg-accent-500/15 text-accent-400 border-accent-500/30",
    scanCount: "bg-warning-500/15 text-warning-500 border-warning-500/30",
    type: "bg-brand-500/15 text-brand-300 border-brand-500/30",
    enabled: "bg-success-500/15 text-success-500 border-success-500/30",
    sort: "bg-dark-700 text-dark-300 border-dark-600",
    keyword: "bg-brand-500/15 text-brand-300 border-brand-500/30",
  };
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

export default function QrCodeList() {
  const [data, setData] = useState<PagedResult<QrCode>>(mockList);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [enabledFilter, setEnabledFilter] = useState<string>("all");

  const [smartQuery, setSmartQuery] = useState("");
  const [parseResult, setParseResult] = useState<NlpParseResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSmartMode, setIsSmartMode] = useState(false);
  const smartInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchData = useCallback(() => {
    setLoading(true);
    const params: Record<string, unknown> = { page, pageSize: 10 };
    if (keyword) params.keyword = keyword;
    if (typeFilter !== "all") params.type = typeFilter;
    if (enabledFilter !== "all") params.enabled = enabledFilter === "active";
    api
      .listQrCodes(params)
      .then(setData)
      .catch(() => setData({ ...mockList, page }))
      .finally(() => setLoading(false));
  }, [page, keyword, typeFilter, enabledFilter]);

  const fetchSmartData = useCallback(() => {
    setLoading(true);
    api
      .smartSearch({ q: smartQuery, page, pageSize: 10 })
      .then((result) => {
        setData({ items: result.items, total: result.total, page: result.page, pageSize: result.pageSize });
        setParseResult(result.parseResult);
      })
      .catch(() => setData({ ...mockList, page }))
      .finally(() => setLoading(false));
  }, [smartQuery, page]);

  useEffect(() => {
    if (isSmartMode && smartQuery) {
      fetchSmartData();
    } else {
      fetchData();
    }
  }, [page]);

  useEffect(() => {
    if (!isSmartMode) {
      fetchData();
    }
  }, [typeFilter, enabledFilter]);

  const handleSmartInputChange = (value: string) => {
    setSmartQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setParseResult(null);
      setIsSmartMode(false);
      setPage(1);
      fetchData();
      return;
    }
    debounceRef.current = setTimeout(() => {
      api
        .parseNlpQuery(value)
        .then(setParseResult)
        .catch(() => {});
    }, 300);
  };

  const handleSmartSearch = () => {
    if (!smartQuery.trim()) return;
    setIsSmartMode(true);
    setPage(1);
    setLoading(true);
    api
      .smartSearch({ q: smartQuery, page: 1, pageSize: 10 })
      .then((result) => {
        setData({ items: result.items, total: result.total, page: result.page, pageSize: result.pageSize });
        setParseResult(result.parseResult);
        setShowSuggestions(false);
      })
      .catch(() => setData({ ...mockList, page: 1 }))
      .finally(() => setLoading(false));
  };

  const handleSuggestionClick = (text: string) => {
    setSmartQuery(text);
    setIsSmartMode(true);
    setPage(1);
    setShowSuggestions(false);
    setLoading(true);
    api
      .smartSearch({ q: text, page: 1, pageSize: 10 })
      .then((result) => {
        setData({ items: result.items, total: result.total, page: result.page, pageSize: result.pageSize });
        setParseResult(result.parseResult);
      })
      .catch(() => setData({ ...mockList, page: 1 }))
      .finally(() => setLoading(false));
  };

  const handleRemoveCondition = (field: string) => {
    if (!parseResult) return;
    const newQuery = smartQuery;
    const condition = parseResult.recognized.find((c) => c.field === field);
    if (condition) {
      const cleaned = smartQuery.replace(condition.matched, "").replace(/\s+/g, " ").trim();
      setSmartQuery(cleaned);
      if (!cleaned) {
        setIsSmartMode(false);
        setParseResult(null);
        setPage(1);
        fetchData();
      } else {
        handleSmartSearch();
      }
    }
  };

  const clearSmartSearch = () => {
    setSmartQuery("");
    setParseResult(null);
    setIsSmartMode(false);
    setShowSuggestions(false);
    setPage(1);
    fetchData();
  };

  const totalPages = Math.ceil(data.total / data.pageSize);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此二维码？")) return;
    try {
      await api.deleteQrCode(id);
      if (isSmartMode) fetchSmartData();
      else fetchData();
    } catch {
      if (isSmartMode) fetchSmartData();
      else fetchData();
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.toggleQrCodeEnabled(id);
      if (isSmartMode) fetchSmartData();
      else fetchData();
    } catch {
      if (isSmartMode) fetchSmartData();
      else fetchData();
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
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Sparkles className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
              <input
                ref={smartInputRef}
                type="text"
                placeholder="用自然语言搜索，如：上周创建的扫码数超过100的动态码..."
                value={smartQuery}
                onChange={(e) => handleSmartInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSmartSearch()}
                onFocus={() => {
                  if (!smartQuery) setShowSuggestions(true);
                }}
                className="input pl-9 pr-10 bg-dark-900/80 border-brand-500/30 focus:border-brand-500 focus:ring-brand-500/40"
              />
              {smartQuery && (
                <button
                  onClick={clearSmartSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={handleSmartSearch}
              disabled={!smartQuery.trim()}
              className="btn-primary px-5 disabled:opacity-40"
            >
              <Search className="w-4 h-4" />
              智能搜索
            </button>
          </div>

          {showSuggestions && !smartQuery && (
            <div className="absolute z-30 top-full mt-2 left-0 right-0 card p-4 shadow-glow animate-fade-up">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-medium text-white">试试这些搜索</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTION_EXAMPLES.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s.text)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-dark-900/60 border border-dark-700 hover:border-brand-500/40 hover:bg-dark-800/80 transition-all text-left group"
                  >
                    <span className="text-brand-400 group-hover:text-brand-300 flex-shrink-0">{s.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-dark-200 group-hover:text-white truncate">{s.text}</p>
                      <p className="text-xs text-dark-500">{s.desc}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-dark-600 group-hover:text-brand-400 ml-auto flex-shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {parseResult && parseResult.recognized.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-xs text-dark-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                识别条件:
              </span>
              {parseResult.recognized.map((c, i) => (
                <ConditionTag key={i} condition={c} onRemove={() => handleRemoveCondition(c.field)} />
              ))}
            </div>
          )}
        </div>

        <div className="divider" />

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="text"
              placeholder="普通搜索名称、URL、短码..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(1), fetchData())}
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
                setPage(1);
                fetchData();
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
                setPage(1);
                fetchData();
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

        {parseResult && parseResult.suggestions.length > 0 && isSmartMode && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-dark-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              相关搜索:
            </span>
            {parseResult.suggestions.slice(0, 4).map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(s)}
                className="text-xs px-2.5 py-1 rounded-md bg-dark-900/60 border border-dark-700 text-dark-300 hover:text-brand-300 hover:border-brand-500/40 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-900/60">
              <tr>
                <th className="table-head">二维码</th>
                <th className="table-head">类型</th>
                <th className="table-head">目标URL / 短码</th>
                <th className="table-head">扫码次数</th>
                <th className="table-head">状态</th>
                <th className="table-head">创建时间</th>
                <th className="table-head text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="table-cell text-center py-12 text-dark-500">
                    加载中...
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-cell text-center py-12 text-dark-500">
                    <QrIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>暂无数据</p>
                    {isSmartMode && (
                      <p className="text-xs text-dark-600 mt-1">试试修改搜索条件或清除智能搜索</p>
                    )}
                  </td>
                </tr>
              ) : (
                data.items.map((qr) => (
                  <tr key={qr.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white p-1 flex-shrink-0 border border-dark-700">
                          <QrIcon className="w-full h-full text-dark-900" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate max-w-[200px]">{qr.name}</p>
                          <p className="text-xs text-dark-500">ID: {qr.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      {qr.type === "dynamic" ? (
                        <span className="tag-blue">动态码</span>
                      ) : (
                        <span className="tag-gray">静态码</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <p className="text-xs text-dark-300 truncate max-w-[260px]" title={qr.targetUrl}>
                        {qr.targetUrl}
                      </p>
                      <p className="text-xs text-brand-400 mt-0.5">/{qr.shortCode}</p>
                    </td>
                    <td className="table-cell">
                      <span className="font-semibold text-white">{qr.scanCount.toLocaleString()}</span>
                    </td>
                    <td className="table-cell">
                      {qr.enabled ? (
                        <span className="tag-green">已启用</span>
                      ) : (
                        <span className="tag-red">已停用</span>
                      )}
                    </td>
                    <td className="table-cell text-dark-400 text-xs">
                      {new Date(qr.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="btn-ghost p-1.5"
                          title="下载"
                          onClick={() => handleDownload(qr.id, qr.name)}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/qrcodes/${qr.id}/stats`}
                          className="btn-ghost p-1.5"
                          title="数据统计"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/qrcodes/${qr.id}/edit`}
                          className="btn-ghost p-1.5"
                          title="编辑"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>
                        <button
                          className="btn-ghost p-1.5"
                          title={qr.enabled ? "停用" : "启用"}
                          onClick={() => handleToggle(qr.id)}
                        >
                          <Power className={`w-4 h-4 ${qr.enabled ? "text-success-500" : "text-dark-500"}`} />
                        </button>
                        <button
                          className="btn-ghost p-1.5 hover:text-danger-500"
                          title="删除"
                          onClick={() => handleDelete(qr.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-4 border-t border-dark-700 flex-wrap gap-4">
          <p className="text-sm text-dark-400">
            第 {(page - 1) * data.pageSize + 1} - {Math.min(page * data.pageSize, data.total)} 条，
            共 {data.total} 条
            {isSmartMode && <span className="text-brand-400 ml-2">（智能搜索结果）</span>}
          </p>
          <div className="flex items-center gap-1">
            <button
              className="btn-secondary px-2.5 py-1.5 disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pNum = i + 1;
              if (totalPages > 5) {
                if (page > 3) pNum = page - 2 + i;
                if (page > totalPages - 2) pNum = totalPages - 4 + i;
              }
              if (pNum < 1 || pNum > totalPages) return null;
              return (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    pNum === page
                      ? "bg-brand-gradient text-white shadow-glow-sm"
                      : "bg-dark-700 text-dark-300 hover:bg-dark-600"
                  }`}
                >
                  {pNum}
                </button>
              );
            })}
            <button
              className="btn-secondary px-2.5 py-1.5 disabled:opacity-40"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

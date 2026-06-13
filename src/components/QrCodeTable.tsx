import { Link } from "react-router-dom";
import {
  Edit3,
  BarChart3,
  Download,
  Trash2,
  Power,
  QrCode as QrIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { QrCode, PagedResult } from "@shared/types";

interface QrCodeTableProps {
  data: PagedResult<QrCode>;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onDownload: (id: string, name: string) => void;
  isSmartMode?: boolean;
}

export function QrCodeTable({
  data,
  loading,
  page,
  onPageChange,
  onDelete,
  onToggle,
  onDownload,
  isSmartMode,
}: QrCodeTableProps) {
  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
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
                        onClick={() => onDownload(qr.id, qr.name)}
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
                        onClick={() => onToggle(qr.id)}
                      >
                        <Power className={`w-4 h-4 ${qr.enabled ? "text-success-500" : "text-dark-500"}`} />
                      </button>
                      <button
                        className="btn-ghost p-1.5 hover:text-danger-500"
                        title="删除"
                        onClick={() => onDelete(qr.id)}
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
            onClick={() => onPageChange(Math.max(1, page - 1))}
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
                onClick={() => onPageChange(pNum)}
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
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

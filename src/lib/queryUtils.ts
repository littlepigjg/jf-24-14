import type { NlpStructuredQuery, NlpRecognizedCondition } from "@shared/types";

export function mergeQueries(
  base: NlpStructuredQuery,
  addition: NlpStructuredQuery
): NlpStructuredQuery {
  const result: NlpStructuredQuery = { ...base };

  if (addition.keyword !== undefined) {
    result.keyword = addition.keyword;
  }
  if (addition.type !== undefined) {
    result.type = addition.type;
  }
  if (addition.enabled !== undefined) {
    result.enabled = addition.enabled;
  }
  if (addition.scanCountMin !== undefined) {
    result.scanCountMin = addition.scanCountMin;
  }
  if (addition.scanCountMax !== undefined) {
    result.scanCountMax = addition.scanCountMax;
  }
  if (addition.dateFrom !== undefined) {
    result.dateFrom = addition.dateFrom;
  }
  if (addition.dateTo !== undefined) {
    result.dateTo = addition.dateTo;
  }
  if (addition.sortBy !== undefined) {
    result.sortBy = addition.sortBy;
  }
  if (addition.sortOrder !== undefined) {
    result.sortOrder = addition.sortOrder;
  }

  return result;
}

export function removeConditionFromQuery(
  query: NlpStructuredQuery,
  field: string
): NlpStructuredQuery {
  const result = { ...query };
  switch (field) {
    case "keyword":
      delete result.keyword;
      break;
    case "type":
      delete result.type;
      break;
    case "enabled":
      delete result.enabled;
      break;
    case "scanCount":
      delete result.scanCountMin;
      delete result.scanCountMax;
      break;
    case "date":
      delete result.dateFrom;
      delete result.dateTo;
      break;
    case "sort":
      delete result.sortBy;
      delete result.sortOrder;
      break;
  }
  return result;
}

export function isQueryEmpty(query: NlpStructuredQuery): boolean {
  return (
    query.keyword === undefined &&
    query.type === undefined &&
    query.enabled === undefined &&
    query.scanCountMin === undefined &&
    query.scanCountMax === undefined &&
    query.dateFrom === undefined &&
    query.dateTo === undefined &&
    query.sortBy === undefined
  );
}

export function structuredQueryToConditions(
  query: NlpStructuredQuery
): NlpRecognizedCondition[] {
  const conditions: NlpRecognizedCondition[] = [];

  if (query.keyword) {
    conditions.push({
      field: "keyword",
      label: "关键词",
      value: query.keyword,
      matched: query.keyword,
    });
  }

  if (query.type) {
    conditions.push({
      field: "type",
      label: "类型",
      value: query.type === "dynamic" ? "动态码" : "静态码",
      matched: query.type,
    });
  }

  if (query.enabled !== undefined) {
    conditions.push({
      field: "enabled",
      label: "状态",
      value: query.enabled ? "已启用" : "已停用",
      matched: String(query.enabled),
    });
  }

  if (query.scanCountMin !== undefined || query.scanCountMax !== undefined) {
    const parts: string[] = [];
    if (query.scanCountMin !== undefined) parts.push(`≥${query.scanCountMin}`);
    if (query.scanCountMax !== undefined) parts.push(`≤${query.scanCountMax}`);
    conditions.push({
      field: "scanCount",
      label: "扫码次数",
      value: parts.join(" 且 "),
      matched: "scanCount",
    });
  }

  if (query.dateFrom || query.dateTo) {
    let value = "";
    if (query.dateFrom && query.dateTo) {
      const from = new Date(query.dateFrom).toLocaleDateString("zh-CN");
      const to = new Date(query.dateTo).toLocaleDateString("zh-CN");
      value = `${from} 至 ${to}`;
    } else if (query.dateFrom) {
      const from = new Date(query.dateFrom).toLocaleDateString("zh-CN");
      value = `${from} 之后`;
    } else if (query.dateTo) {
      const to = new Date(query.dateTo).toLocaleDateString("zh-CN");
      value = `${to} 之前`;
    }
    conditions.push({
      field: "date",
      label: "创建时间",
      value,
      matched: "date",
    });
  }

  if (query.sortBy) {
    const sortLabels: Record<string, string> = {
      createdAt: "创建时间",
      scanCount: "扫码次数",
      name: "名称",
    };
    const orderLabel = query.sortOrder === "asc" ? "升序" : "降序";
    conditions.push({
      field: "sort",
      label: "排序",
      value: `${sortLabels[query.sortBy] || query.sortBy} ${orderLabel}`,
      matched: "sort",
    });
  }

  return conditions;
}

export function generateRelatedSuggestions(
  query: NlpStructuredQuery
): string[] {
  const suggestions: string[] = [];

  if (!query.type) {
    suggestions.push("动态码");
    suggestions.push("静态码");
  }
  if (query.enabled === undefined) {
    suggestions.push("已启用");
    suggestions.push("已停用");
  }
  if (query.scanCountMin === undefined && query.scanCountMax === undefined) {
    suggestions.push("扫码数超过100");
    suggestions.push("热门二维码");
  }
  if (!query.dateFrom && !query.dateTo) {
    suggestions.push("上周创建的");
    suggestions.push("最近7天");
    suggestions.push("本月创建的");
  }
  if (!query.sortBy) {
    suggestions.push("按扫码次数从高到低");
    suggestions.push("最新创建");
  }

  return suggestions.slice(0, 4);
}

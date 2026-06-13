import { describe, it, expect } from "vitest";
import {
  mergeQueries,
  removeConditionFromQuery,
  isQueryEmpty,
  structuredQueryToConditions,
  generateRelatedSuggestions,
} from "@/lib/queryUtils";
import type { NlpStructuredQuery } from "@shared/types";

describe("mergeQueries", () => {
  it("should merge empty base with addition", () => {
    const base: NlpStructuredQuery = {};
    const addition: NlpStructuredQuery = { type: "dynamic" };
    const result = mergeQueries(base, addition);
    expect(result.type).toBe("dynamic");
  });

  it("should merge addition into non-empty base, keeping base fields when not overridden", () => {
    const base: NlpStructuredQuery = { type: "dynamic", scanCountMin: 50 };
    const addition: NlpStructuredQuery = { dateFrom: "2024-01-01" };
    const result = mergeQueries(base, addition);
    expect(result.type).toBe("dynamic");
    expect(result.scanCountMin).toBe(50);
    expect(result.dateFrom).toBe("2024-01-01");
  });

  it("should override base field when addition provides same field", () => {
    const base: NlpStructuredQuery = { type: "dynamic", scanCountMin: 50 };
    const addition: NlpStructuredQuery = { type: "static" };
    const result = mergeQueries(base, addition);
    expect(result.type).toBe("static");
    expect(result.scanCountMin).toBe(50);
  });

  it("should not mutate base or addition", () => {
    const base: NlpStructuredQuery = { type: "dynamic" };
    const addition: NlpStructuredQuery = { enabled: true };
    const result = mergeQueries(base, addition);
    expect(base.enabled).toBeUndefined();
    expect(addition.type).toBeUndefined();
    expect(result.type).toBe("dynamic");
    expect(result.enabled).toBe(true);
  });

  it("should merge multiple fields at once", () => {
    const base: NlpStructuredQuery = { type: "dynamic", dateFrom: "2024-01-01" };
    const addition: NlpStructuredQuery = { scanCountMin: 100, enabled: true, sortBy: "scanCount", sortOrder: "desc" };
    const result = mergeQueries(base, addition);
    expect(result).toEqual({
      type: "dynamic",
      dateFrom: "2024-01-01",
      scanCountMin: 100,
      enabled: true,
      sortBy: "scanCount",
      sortOrder: "desc",
    });
  });

  it("should handle sequential merges accumulating all conditions", () => {
    let query: NlpStructuredQuery = {};
    query = mergeQueries(query, { dateFrom: "2024-01-01", dateTo: "2024-01-31" });
    query = mergeQueries(query, { type: "dynamic" });
    query = mergeQueries(query, { scanCountMin: 100 });
    query = mergeQueries(query, { enabled: true });
    expect(query.dateFrom).toBe("2024-01-01");
    expect(query.dateTo).toBe("2024-01-31");
    expect(query.type).toBe("dynamic");
    expect(query.scanCountMin).toBe(100);
    expect(query.enabled).toBe(true);
  });
});

describe("removeConditionFromQuery", () => {
  it("should remove type field", () => {
    const query: NlpStructuredQuery = { type: "dynamic", scanCountMin: 100 };
    const result = removeConditionFromQuery(query, "type");
    expect(result.type).toBeUndefined();
    expect(result.scanCountMin).toBe(100);
  });

  it("should remove enabled field", () => {
    const query: NlpStructuredQuery = { enabled: true, keyword: "test" };
    const result = removeConditionFromQuery(query, "enabled");
    expect(result.enabled).toBeUndefined();
    expect(result.keyword).toBe("test");
  });

  it("should remove both scanCountMin and scanCountMax when field is scanCount", () => {
    const query: NlpStructuredQuery = { scanCountMin: 50, scanCountMax: 200, type: "static" };
    const result = removeConditionFromQuery(query, "scanCount");
    expect(result.scanCountMin).toBeUndefined();
    expect(result.scanCountMax).toBeUndefined();
    expect(result.type).toBe("static");
  });

  it("should remove both dateFrom and dateTo when field is date", () => {
    const query: NlpStructuredQuery = { dateFrom: "2024-01-01", dateTo: "2024-12-31", enabled: false };
    const result = removeConditionFromQuery(query, "date");
    expect(result.dateFrom).toBeUndefined();
    expect(result.dateTo).toBeUndefined();
    expect(result.enabled).toBe(false);
  });

  it("should remove sortBy and sortOrder when field is sort", () => {
    const query: NlpStructuredQuery = { sortBy: "scanCount", sortOrder: "desc", keyword: "test" };
    const result = removeConditionFromQuery(query, "sort");
    expect(result.sortBy).toBeUndefined();
    expect(result.sortOrder).toBeUndefined();
    expect(result.keyword).toBe("test");
  });

  it("should not mutate original query", () => {
    const query: NlpStructuredQuery = { type: "dynamic" };
    const result = removeConditionFromQuery(query, "type");
    expect(query.type).toBe("dynamic");
    expect(result.type).toBeUndefined();
  });
});

describe("isQueryEmpty", () => {
  it("should return true for empty query", () => {
    expect(isQueryEmpty({})).toBe(true);
  });

  it("should return false when type is set", () => {
    expect(isQueryEmpty({ type: "dynamic" })).toBe(false);
  });

  it("should return false when enabled is set", () => {
    expect(isQueryEmpty({ enabled: true })).toBe(false);
  });

  it("should return false when scanCountMin is set", () => {
    expect(isQueryEmpty({ scanCountMin: 10 })).toBe(false);
  });

  it("should return false when dateFrom is set", () => {
    expect(isQueryEmpty({ dateFrom: "2024-01-01" })).toBe(false);
  });

  it("should return true when only sortBy is undefined", () => {
    expect(isQueryEmpty({ sortBy: undefined })).toBe(true);
  });

  it("should return false when sortBy is set", () => {
    expect(isQueryEmpty({ sortBy: "createdAt" })).toBe(false);
  });
});

describe("structuredQueryToConditions", () => {
  it("should return empty array for empty query", () => {
    expect(structuredQueryToConditions({})).toEqual([]);
  });

  it("should produce keyword condition", () => {
    const conditions = structuredQueryToConditions({ keyword: "测试" });
    expect(conditions).toHaveLength(1);
    expect(conditions[0].field).toBe("keyword");
    expect(conditions[0].value).toBe("测试");
  });

  it("should produce type condition with Chinese label", () => {
    const conditions = structuredQueryToConditions({ type: "dynamic" });
    expect(conditions).toHaveLength(1);
    expect(conditions[0].field).toBe("type");
    expect(conditions[0].value).toBe("动态码");
  });

  it("should produce enabled condition", () => {
    expect(structuredQueryToConditions({ enabled: true })[0].value).toBe("已启用");
    expect(structuredQueryToConditions({ enabled: false })[0].value).toBe("已停用");
  });

  it("should produce scanCount condition with range", () => {
    const conditions = structuredQueryToConditions({ scanCountMin: 50, scanCountMax: 200 });
    expect(conditions).toHaveLength(1);
    expect(conditions[0].field).toBe("scanCount");
    expect(conditions[0].value).toBe("≥50 且 ≤200");
  });

  it("should produce scanCount condition with only min", () => {
    const conditions = structuredQueryToConditions({ scanCountMin: 100 });
    expect(conditions[0].value).toBe("≥100");
  });

  it("should produce date condition with range", () => {
    const conditions = structuredQueryToConditions({ dateFrom: "2024-01-01T00:00:00.000Z", dateTo: "2024-01-31T23:59:59.999Z" });
    expect(conditions).toHaveLength(1);
    expect(conditions[0].field).toBe("date");
    expect(conditions[0].value).toContain("至");
  });

  it("should produce sort condition", () => {
    const conditions = structuredQueryToConditions({ sortBy: "scanCount", sortOrder: "desc" });
    expect(conditions).toHaveLength(1);
    expect(conditions[0].field).toBe("sort");
    expect(conditions[0].value).toBe("扫码次数 降序");
  });

  it("should produce all condition types for full query", () => {
    const conditions = structuredQueryToConditions({
      keyword: "测试",
      type: "dynamic",
      enabled: true,
      scanCountMin: 100,
      dateFrom: "2024-01-01T00:00:00.000Z",
      dateTo: "2024-12-31T23:59:59.999Z",
      sortBy: "createdAt",
      sortOrder: "asc",
    });
    expect(conditions).toHaveLength(6);
    const fields = conditions.map((c) => c.field);
    expect(fields).toContain("keyword");
    expect(fields).toContain("type");
    expect(fields).toContain("enabled");
    expect(fields).toContain("scanCount");
    expect(fields).toContain("date");
    expect(fields).toContain("sort");
  });
});

describe("generateRelatedSuggestions", () => {
  it("should return suggestions for empty query", () => {
    const suggestions = generateRelatedSuggestions({});
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions).toContain("动态码");
    expect(suggestions).toContain("静态码");
  });

  it("should not suggest type when type is already set", () => {
    const suggestions = generateRelatedSuggestions({ type: "dynamic" });
    expect(suggestions).not.toContain("动态码");
    expect(suggestions).not.toContain("静态码");
  });

  it("should not suggest enabled when enabled is already set", () => {
    const suggestions = generateRelatedSuggestions({ enabled: true });
    expect(suggestions).not.toContain("已启用");
    expect(suggestions).not.toContain("已停用");
  });

  it("should not suggest scan count when scanCountMin is set", () => {
    const suggestions = generateRelatedSuggestions({ scanCountMin: 100 });
    expect(suggestions).not.toContain("扫码数超过100");
    expect(suggestions).not.toContain("热门二维码");
  });

  it("should not suggest date when dateFrom is set", () => {
    const suggestions = generateRelatedSuggestions({ dateFrom: "2024-01-01" });
    expect(suggestions).not.toContain("上周创建的");
    expect(suggestions).not.toContain("最近7天");
  });

  it("should not suggest sort when sortBy is set", () => {
    const suggestions = generateRelatedSuggestions({ sortBy: "scanCount" });
    expect(suggestions).not.toContain("按扫码次数从高到低");
  });

  it("should return at most 4 suggestions", () => {
    const suggestions = generateRelatedSuggestions({});
    expect(suggestions.length).toBeLessThanOrEqual(4);
  });
});

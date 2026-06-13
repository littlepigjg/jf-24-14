import { describe, it, expect } from "vitest";
import { parseNlpQuery } from "../../../api/services/NlpQueryParser.js";

describe("parseNlpQuery - date parsing", () => {
  it("should parse 今天", () => {
    const result = parseNlpQuery("今天创建的");
    expect(result.query.dateFrom).toBeDefined();
    expect(result.query.dateTo).toBeDefined();
    expect(result.recognized.some((c) => c.field === "date")).toBe(true);
  });

  it("should parse 昨天", () => {
    const result = parseNlpQuery("昨天创建的");
    expect(result.query.dateFrom).toBeDefined();
    expect(result.query.dateTo).toBeDefined();
  });

  it("should parse 上周", () => {
    const result = parseNlpQuery("上周创建的");
    expect(result.query.dateFrom).toBeDefined();
    expect(result.query.dateTo).toBeDefined();
    const from = new Date(result.query.dateFrom!);
    const to = new Date(result.query.dateTo!);
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(7);
  });

  it("should parse 本月", () => {
    const result = parseNlpQuery("本月创建的");
    expect(result.query.dateFrom).toBeDefined();
    const from = new Date(result.query.dateFrom!);
    expect(from.getDate()).toBe(1);
  });

  it("should parse 近7天", () => {
    const result = parseNlpQuery("近7天创建的");
    expect(result.query.dateFrom).toBeDefined();
  });

  it("should parse 最近30天", () => {
    const result = parseNlpQuery("最近30天");
    expect(result.query.dateFrom).toBeDefined();
  });

  it("should parse 近3个月", () => {
    const result = parseNlpQuery("近3个月创建的");
    expect(result.query.dateFrom).toBeDefined();
  });

  it("should not set date fields for non-date text", () => {
    const result = parseNlpQuery("动态码");
    expect(result.query.dateFrom).toBeUndefined();
    expect(result.query.dateTo).toBeUndefined();
  });
});

describe("parseNlpQuery - scan count parsing", () => {
  it("should parse 扫码数超过100", () => {
    const result = parseNlpQuery("扫码数超过100");
    expect(result.query.scanCountMin).toBe(101);
    expect(result.query.scanCountMax).toBeUndefined();
    expect(result.recognized.some((c) => c.field === "scanCount")).toBe(true);
  });

  it("should parse 扫码次数大于50", () => {
    const result = parseNlpQuery("扫码次数大于50");
    expect(result.query.scanCountMin).toBe(51);
  });

  it("should parse 扫码数少于100", () => {
    const result = parseNlpQuery("扫码数少于100");
    expect(result.query.scanCountMax).toBe(99);
  });

  it("should parse 扫码次数在50到200之间", () => {
    const result = parseNlpQuery("扫码次数在50到200之间");
    expect(result.query.scanCountMin).toBe(50);
    expect(result.query.scanCountMax).toBe(200);
  });

  it("should parse 热门二维码", () => {
    const result = parseNlpQuery("热门二维码");
    expect(result.query.scanCountMin).toBe(100);
  });

  it("should parse 冷门二维码", () => {
    const result = parseNlpQuery("冷门二维码");
    expect(result.query.scanCountMax).toBe(0);
  });

  it("should parse 扫码数100以上", () => {
    const result = parseNlpQuery("扫码数100以上");
    expect(result.query.scanCountMin).toBe(100);
  });

  it("should parse 扫码数50以下", () => {
    const result = parseNlpQuery("扫码数50以下");
    expect(result.query.scanCountMax).toBe(50);
  });
});

describe("parseNlpQuery - type parsing", () => {
  it("should parse 动态码", () => {
    const result = parseNlpQuery("动态码");
    expect(result.query.type).toBe("dynamic");
  });

  it("should parse 静态码", () => {
    const result = parseNlpQuery("静态码");
    expect(result.query.type).toBe("static");
  });

  it("should parse 活码 as dynamic", () => {
    const result = parseNlpQuery("活码");
    expect(result.query.type).toBe("dynamic");
  });

  it("should parse 死码 as static", () => {
    const result = parseNlpQuery("死码");
    expect(result.query.type).toBe("static");
  });
});

describe("parseNlpQuery - enabled parsing", () => {
  it("should parse 已启用", () => {
    const result = parseNlpQuery("已启用的");
    expect(result.query.enabled).toBe(true);
  });

  it("should parse 已停用", () => {
    const result = parseNlpQuery("已停用的");
    expect(result.query.enabled).toBe(false);
  });

  it("should parse 已禁用 as disabled", () => {
    const result = parseNlpQuery("已禁用的");
    expect(result.query.enabled).toBe(false);
  });

  it("should parse 未启用 as disabled", () => {
    const result = parseNlpQuery("未启用的");
    expect(result.query.enabled).toBe(false);
  });
});

describe("parseNlpQuery - sort parsing", () => {
  it("should parse 按扫码次数降序", () => {
    const result = parseNlpQuery("按扫码次数降序");
    expect(result.query.sortBy).toBe("scanCount");
    expect(result.query.sortOrder).toBe("desc");
  });

  it("should parse 最新创建", () => {
    const result = parseNlpQuery("最新创建");
    expect(result.query.sortBy).toBe("createdAt");
    expect(result.query.sortOrder).toBe("desc");
  });

  it("should parse 最早创建", () => {
    const result = parseNlpQuery("最早创建");
    expect(result.query.sortBy).toBe("createdAt");
    expect(result.query.sortOrder).toBe("asc");
  });

  it("should parse 扫码最多", () => {
    const result = parseNlpQuery("扫码最多");
    expect(result.query.sortBy).toBe("scanCount");
    expect(result.query.sortOrder).toBe("desc");
  });
});

describe("parseNlpQuery - compound queries", () => {
  it("should parse 上周创建且扫码数超过100的动态码", () => {
    const result = parseNlpQuery("上周创建且扫码数超过100的动态码");
    expect(result.query.dateFrom).toBeDefined();
    expect(result.query.dateTo).toBeDefined();
    expect(result.query.scanCountMin).toBe(101);
    expect(result.query.type).toBe("dynamic");
    expect(result.recognized.length).toBeGreaterThanOrEqual(3);
  });

  it("should parse 本月创建的已启用静态码按扫码次数降序", () => {
    const result = parseNlpQuery("本月创建的已启用静态码按扫码次数降序");
    expect(result.query.dateFrom).toBeDefined();
    expect(result.query.enabled).toBe(true);
    expect(result.query.type).toBe("static");
    expect(result.query.sortBy).toBe("scanCount");
    expect(result.query.sortOrder).toBe("desc");
  });

  it("should parse 最近7天扫码数超过100的动态码", () => {
    const result = parseNlpQuery("最近7天扫码数超过100的动态码");
    expect(result.query.dateFrom).toBeDefined();
    expect(result.query.scanCountMin).toBe(101);
    expect(result.query.type).toBe("dynamic");
  });
});

describe("parseNlpQuery - suggestions", () => {
  it("should return suggestions for empty input", () => {
    const result = parseNlpQuery("");
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("should not suggest type when type is already parsed", () => {
    const result = parseNlpQuery("动态码");
    expect(result.suggestions).not.toContain("动态码");
    expect(result.suggestions).not.toContain("静态码");
  });

  it("should not suggest scan count when scanCountMin is already parsed", () => {
    const result = parseNlpQuery("扫码数超过100");
    expect(result.suggestions).not.toContain("扫码数超过100");
    expect(result.suggestions).not.toContain("热门二维码");
  });
});

describe("parseNlpQuery - keyword extraction", () => {
  it("should extract unrecognized text as keyword", () => {
    const result = parseNlpQuery("营销活动的二维码");
    expect(result.query.keyword).toBeDefined();
  });

  it("should not include functional words in keyword", () => {
    const result = parseNlpQuery("找出的动态码");
    expect(result.query.keyword).toBeUndefined();
  });
});

describe("parseNlpQuery - edge cases", () => {
  it("should return empty query for empty string", () => {
    const result = parseNlpQuery("");
    expect(result.query).toEqual({});
    expect(result.recognized).toEqual([]);
  });

  it("should return empty query for whitespace only", () => {
    const result = parseNlpQuery("   ");
    expect(result.query).toEqual({});
  });
});

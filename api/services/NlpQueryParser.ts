export interface NlpStructuredQuery {
  keyword?: string
  type?: 'static' | 'dynamic'
  enabled?: boolean
  scanCountMin?: number
  scanCountMax?: number
  dateFrom?: string
  dateTo?: string
  sortBy?: 'createdAt' | 'scanCount' | 'name'
  sortOrder?: 'asc' | 'desc'
}

export interface NlpParseResult {
  query: NlpStructuredQuery
  recognized: NlpRecognizedCondition[]
  suggestions: string[]
}

export interface NlpRecognizedCondition {
  field: string
  label: string
  value: string
  matched: string
}

function resolveRelativeDate(text: string): { from?: Date; to?: Date } | null {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const patterns: { regex: RegExp; resolve: () => { from?: Date; to?: Date } }[] = [
    {
      regex: /今天/,
      resolve: () => ({ from: today, to: new Date(today.getTime() + 86400000) }),
    },
    {
      regex: /昨天/,
      resolve: () => ({ from: new Date(today.getTime() - 86400000), to: today }),
    },
    {
      regex: /前天/,
      resolve: () => ({ from: new Date(today.getTime() - 2 * 86400000), to: new Date(today.getTime() - 86400000) }),
    },
    {
      regex: /本周|这周|这个星期/,
      resolve: () => {
        const day = today.getDay() || 7
        const monday = new Date(today.getTime() - (day - 1) * 86400000)
        return { from: monday, to: new Date(today.getTime() + 86400000) }
      },
    },
    {
      regex: /上周|上个星期|上一周/,
      resolve: () => {
        const day = today.getDay() || 7
        const thisMonday = new Date(today.getTime() - (day - 1) * 86400000)
        const lastMonday = new Date(thisMonday.getTime() - 7 * 86400000)
        return { from: lastMonday, to: thisMonday }
      },
    },
    {
      regex: /本月|这个月/,
      resolve: () => {
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        return { from: firstOfMonth, to: new Date(today.getTime() + 86400000) }
      },
    },
    {
      regex: /上月|上个月/,
      resolve: () => {
        const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return { from: firstOfLastMonth, to: firstOfThisMonth }
      },
    },
    {
      regex: /近(\d+)天|最近(\d+)天|过去(\d+)天/,
      resolve: () => {
        const days = parseInt(
          (text.match(/近(\d+)天|最近(\d+)天|过去(\d+)天/) || [])[1] ||
          (text.match(/近(\d+)天|最近(\d+)天|过去(\d+)天/) || [])[2] ||
          (text.match(/近(\d+)天|最近(\d+)天|过去(\d+)天/) || [])[3] || '7',
          10,
        )
        return { from: new Date(today.getTime() - days * 86400000), to: new Date(today.getTime() + 86400000) }
      },
    },
    {
      regex: /近(\d+)周|最近(\d+)周/,
      resolve: () => {
        const weeks = parseInt(
          (text.match(/近(\d+)周|最近(\d+)周/) || [])[1] ||
          (text.match(/近(\d+)周|最近(\d+)周/) || [])[2] || '1',
          10,
        )
        return { from: new Date(today.getTime() - weeks * 7 * 86400000), to: new Date(today.getTime() + 86400000) }
      },
    },
    {
      regex: /近(\d+)个月|最近(\d+)个月/,
      resolve: () => {
        const months = parseInt(
          (text.match(/近(\d+)个月|最近(\d+)个月/) || [])[1] ||
          (text.match(/近(\d+)个月|最近(\d+)个月/) || [])[2] || '1',
          10,
        )
        const from = new Date(now.getFullYear(), now.getMonth() - months, now.getDate())
        return { from, to: new Date(today.getTime() + 86400000) }
      },
    },
  ]

  for (const { regex, resolve } of patterns) {
    if (regex.test(text)) {
      return resolve()
    }
  }
  return null
}

function parseNumberFromChinese(text: string): number | null {
  const direct = parseInt(text, 10)
  if (!isNaN(direct)) return direct

  const chineseNumMap: Record<string, number> = {
    '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4,
    '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '百': 100, '千': 1000, '万': 10000,
  }

  if (/^[零一二两三四五六七八九十百千万]+$/.test(text)) {
    let result = 0
    let current = 0
    for (const char of text) {
      const val = chineseNumMap[char]
      if (val === undefined) continue
      if (val >= 10) {
        if (current === 0) current = 1
        if (val >= 10000) {
          result = (result + current * val)
          current = 0
        } else {
          current *= val
          result += current
          current = 0
        }
      } else {
        current = val
      }
    }
    return result + current
  }

  return null
}

function extractScanCountCondition(
  text: string,
): { min?: number; max?: number; matched: string } | null {
  const patterns: { regex: RegExp; extract: (m: RegExpMatchArray) => { min?: number; max?: number } }[] = [
    {
      regex: /扫码[数次数]*[超过大于]([零一二两三四五六七八九十百千万\d]+)(?:次|个)?/,
      extract: (m) => {
        const n = parseNumberFromChinese(m[1])
        return n !== null ? { min: n + 1 } : {}
      },
    },
    {
      regex: /扫码[数次数]*[不超]?[少小于]([零一二两三四五六七八九十百千万\d]+)(?:次|个)?/,
      extract: (m) => {
        const n = parseNumberFromChinese(m[1])
        return n !== null ? { max: n - 1 } : {}
      },
    },
    {
      regex: /扫码[数次数]*等于([零一二两三四五六七八九十百千万\d]+)(?:次|个)?/,
      extract: (m) => {
        const n = parseNumberFromChinese(m[1])
        return n !== null ? { min: n, max: n } : {}
      },
    },
    {
      regex: /扫码[数次数]*在([零一二两三四五六七八九十百千万\d]+)到([零一二两三四五六七八九十百千万\d]+)之间/,
      extract: (m) => {
        const lo = parseNumberFromChinese(m[1])
        const hi = parseNumberFromChinese(m[2])
        return lo !== null && hi !== null ? { min: lo, max: hi } : {}
      },
    },
    {
      regex: /扫码[数次数]*[在达]([零一二两三四五六七八九十百千万\d]+)以上/,
      extract: (m) => {
        const n = parseNumberFromChinese(m[1])
        return n !== null ? { min: n } : {}
      },
    },
    {
      regex: /扫码[数次数]*[在达]([零一二两三四五六七八九十百千万\d]+)以下/,
      extract: (m) => {
        const n = parseNumberFromChinese(m[1])
        return n !== null ? { max: n } : {}
      },
    },
    {
      regex: /热门|热门码|热门二维码|最热门/,
      extract: () => ({ min: 100 }),
    },
    {
      regex: /高扫码|高流量/,
      extract: () => ({ min: 50 }),
    },
    {
      regex: /冷门|无人扫码|零扫码|没有扫码/,
      extract: () => ({ max: 0 }),
    },
    {
      regex: /低扫码|少扫码/,
      extract: () => ({ max: 10 }),
    },
  ]

  for (const { regex, extract } of patterns) {
    const match = text.match(regex)
    if (match) {
      const result = extract(match)
      if (result.min !== undefined || result.max !== undefined) {
        return { ...result, matched: match[0] }
      }
    }
  }
  return null
}

function extractTypeCondition(text: string): { type: 'static' | 'dynamic'; matched: string } | null {
  const dynamicKeywords = ['动态码', '动态二维码', '动态的', '活码', '可修改的']
  const staticKeywords = ['静态码', '静态二维码', '静态的', '死码']

  for (const kw of dynamicKeywords) {
    if (text.includes(kw)) return { type: 'dynamic', matched: kw }
  }
  for (const kw of staticKeywords) {
    if (text.includes(kw)) return { type: 'static', matched: kw }
  }
  return null
}

function extractEnabledCondition(text: string): { enabled: boolean; matched: string } | null {
  const enabledKeywords = ['已启用', '启用中', '激活', '激活的', '生效的', '在用', '正常使用']
  const disabledKeywords = ['已停用', '停用中', '已禁用', '禁用中', '未启用', '失效的', '关闭的']

  for (const kw of enabledKeywords) {
    if (text.includes(kw)) return { enabled: true, matched: kw }
  }
  for (const kw of disabledKeywords) {
    if (text.includes(kw)) return { enabled: false, matched: kw }
  }
  return null
}

function extractSortCondition(text: string): { sortBy: 'createdAt' | 'scanCount' | 'name'; sortOrder: 'asc' | 'desc'; matched: string } | null {
  const patterns: { regex: RegExp; sortBy: 'createdAt' | 'scanCount' | 'name'; sortOrder: 'asc' | 'desc' }[] = [
    { regex: /按扫码[数次数]*(?:从高到低|降序|从多到少|倒序)/, sortBy: 'scanCount', sortOrder: 'desc' },
    { regex: /按扫码[数次数]*(?:从低到高|升序|从少到多|正序)/, sortBy: 'scanCount', sortOrder: 'asc' },
    { regex: /按创建时间(?:从新到旧|降序|最新|最近的)/, sortBy: 'createdAt', sortOrder: 'desc' },
    { regex: /按创建时间(?:从旧到新|升序|最早的)/, sortBy: 'createdAt', sortOrder: 'asc' },
    { regex: /按名称(?:排序|升序)/, sortBy: 'name', sortOrder: 'asc' },
    { regex: /最新创建|最新添加|最近创建|最近添加/, sortBy: 'createdAt', sortOrder: 'desc' },
    { regex: /最早创建|最早添加/, sortBy: 'createdAt', sortOrder: 'asc' },
    { regex: /扫码最多|扫码最高/, sortBy: 'scanCount', sortOrder: 'desc' },
    { regex: /扫码最少|扫码最低/, sortBy: 'scanCount', sortOrder: 'asc' },
  ]

  for (const { regex, sortBy, sortOrder } of patterns) {
    const match = text.match(regex)
    if (match) {
      return { sortBy, sortOrder, matched: match[0] }
    }
  }
  return null
}

function extractKeywordFromRemainder(text: string, recognizedMatches: string[]): string | undefined {
  let remaining = text
  for (const m of recognizedMatches) {
    remaining = remaining.replace(m, ' ')
  }
  remaining = remaining
    .replace(/[的且并和与了着过是]',?/g, ' ')
    .replace(/[找出查找搜索显示列出获取查看给我有没有]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const stopwords = new Set([
    '的', '且', '并', '和', '与', '了', '着', '过', '是', '中', '在',
    '有', '把', '被', '从', '到', '把', '给', '让', '向', '对',
    '找出', '查找', '搜索', '显示', '列出', '获取', '查看', '给我', '有没有',
    '所有', '全部', '那些', '这些', '这个', '那个', '哪些',
  ])

  const words = remaining.split(/\s+/).filter((w) => w.length > 0 && !stopwords.has(w))
  return words.length > 0 ? words.join(' ') : undefined
}

function generateSuggestions(text: string, result: NlpStructuredQuery): string[] {
  const suggestions: string[] = []

  if (!result.type) {
    suggestions.push('动态码')
    suggestions.push('静态码')
  }
  if (result.enabled === undefined) {
    suggestions.push('已启用')
    suggestions.push('已停用')
  }
  if (result.scanCountMin === undefined && result.scanCountMax === undefined) {
    suggestions.push('扫码数超过100')
    suggestions.push('热门二维码')
  }
  if (!result.dateFrom && !result.dateTo) {
    suggestions.push('上周创建的')
    suggestions.push('最近7天')
    suggestions.push('本月创建的')
  }
  if (!result.sortBy) {
    suggestions.push('按扫码次数从高到低')
    suggestions.push('最新创建')
  }

  if (text.length === 0) {
    return suggestions.slice(0, 6)
  }

  const enhanced: string[] = []
  if (result.type && !result.scanCountMin) {
    enhanced.push(`${result.type === 'dynamic' ? '动态码' : '静态码'}扫码数超过50`)
  }
  if (result.type && !result.dateFrom) {
    enhanced.push(`上周创建的${result.type === 'dynamic' ? '动态码' : '静态码'}`)
  }
  if (result.scanCountMin !== undefined && !result.type) {
    enhanced.push(`扫码数超过${result.scanCountMin}的动态码`)
  }
  if (result.dateFrom && !result.type) {
    enhanced.push('动态码')
  }

  return [...enhanced, ...suggestions].slice(0, 6)
}

export function parseNlpQuery(text: string): NlpParseResult {
  const trimmed = text.trim()
  const query: NlpStructuredQuery = {}
  const recognized: NlpRecognizedCondition[] = []
  const matchedParts: string[] = []

  if (!trimmed) {
    return { query, recognized, suggestions: generateSuggestions('', query) }
  }

  const dateResult = resolveRelativeDate(trimmed)
  if (dateResult) {
    if (dateResult.from) query.dateFrom = dateResult.from.toISOString()
    if (dateResult.to) query.dateTo = dateResult.to.toISOString()

    const dateMatch = trimmed.match(/(今天|昨天|前天|本周|这周|这个星期|上周|上个星期|上一周|本月|这个月|上月|上个月|近\d+天|最近\d+天|过去\d+天|近\d+周|最近\d+周|近\d+个月|最近\d+个月)/)
    if (dateMatch) {
      matchedParts.push(dateMatch[0])
      recognized.push({
        field: 'date',
        label: '创建时间',
        value: dateMatch[0],
        matched: dateMatch[0],
      })
    }
  }

  const scanResult = extractScanCountCondition(trimmed)
  if (scanResult) {
    if (scanResult.min !== undefined) query.scanCountMin = scanResult.min
    if (scanResult.max !== undefined) query.scanCountMax = scanResult.max
    matchedParts.push(scanResult.matched)
    const label = []
    if (scanResult.min !== undefined) label.push(`≥${scanResult.min}`)
    if (scanResult.max !== undefined) label.push(`≤${scanResult.max}`)
    recognized.push({
      field: 'scanCount',
      label: '扫码次数',
      value: label.join(' 且 '),
      matched: scanResult.matched,
    })
  }

  const typeResult = extractTypeCondition(trimmed)
  if (typeResult) {
    query.type = typeResult.type
    matchedParts.push(typeResult.matched)
    recognized.push({
      field: 'type',
      label: '类型',
      value: typeResult.type === 'dynamic' ? '动态码' : '静态码',
      matched: typeResult.matched,
    })
  }

  const enabledResult = extractEnabledCondition(trimmed)
  if (enabledResult) {
    query.enabled = enabledResult.enabled
    matchedParts.push(enabledResult.matched)
    recognized.push({
      field: 'enabled',
      label: '状态',
      value: enabledResult.enabled ? '已启用' : '已停用',
      matched: enabledResult.matched,
    })
  }

  const sortResult = extractSortCondition(trimmed)
  if (sortResult) {
    query.sortBy = sortResult.sortBy
    query.sortOrder = sortResult.sortOrder
    matchedParts.push(sortResult.matched)
    recognized.push({
      field: 'sort',
      label: '排序',
      value: `${sortResult.sortBy === 'scanCount' ? '扫码次数' : sortResult.sortBy === 'createdAt' ? '创建时间' : '名称'} ${sortResult.sortOrder === 'desc' ? '降序' : '升序'}`,
      matched: sortResult.matched,
    })
  }

  const keyword = extractKeywordFromRemainder(trimmed, matchedParts)
  if (keyword && keyword.length > 0) {
    query.keyword = keyword
    recognized.push({
      field: 'keyword',
      label: '关键词',
      value: keyword,
      matched: keyword,
    })
  }

  const suggestions = generateSuggestions(trimmed, query)

  return { query, recognized, suggestions }
}

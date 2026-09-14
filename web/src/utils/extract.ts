import type { HealthRestriction, HistoryItem, Profile, Severity } from '../types'

// 常见忌口 / 过敏关键词（用于从会话文本里抽取用户主动提及的限制）
const TABOO_KEYWORDS = [
  '花生', '海鲜', '虾', '蟹', '贝类', '乳制品', '牛奶', '鸡蛋', '麸质',
  '小麦', '辛辣', '酒精', '芒果', '坚果', '大豆', '芝麻',
]
const DISEASE_KEYWORDS = [
  '高血压', '糖尿病', '高血脂', '高尿酸', '痛风', '肾病', '冠心病',
  '心脏病', '甲亢', '哮喘', '脂肪肝',
]
const DRUG_KEYWORDS = ['华法林', '阿司匹林', '他汀', '降压药', '降糖药']

export interface ExtractedInfo {
  restrictions: HealthRestriction[]
  notes: string[]
}

// 从一段会话里抽取「用户明确提到的健康限制/忌口」和「软件分析出的关键信息」
export function extractFromConversation(item: HistoryItem): ExtractedInfo {
  const text = item.turns.map((t) => t.text).join(' ')
  const restrictions: HealthRestriction[] = []
  const seen = new Set<string>()

  const add = (kw: string, type: HealthRestriction['type'], severity: Severity) => {
    if (!seen.has(kw)) {
      seen.add(kw)
      restrictions.push({ type, item: kw, severity })
    }
  }

  for (const kw of TABOO_KEYWORDS) if (text.includes(kw)) add(kw, 'taboo', 'medium')
  for (const kw of DISEASE_KEYWORDS) if (text.includes(kw)) add(kw, 'disease', 'high')
  for (const kw of DRUG_KEYWORDS) if (text.includes(kw)) add(kw, 'drug', 'high')

  const riskItems = item.turns.flatMap((t) => t.response?.risk?.items ?? [])
  const nutritionRisks = item.turns.flatMap(
    (t) => t.response?.result?.nutrition?.riskItems ?? [],
  )
  const notes = Array.from(new Set([...riskItems, ...nutritionRisks]))
    .filter(Boolean)
    .map((s) => `需注意：${s}`)

  return { restrictions, notes }
}

export function hasExtractableContent(item: HistoryItem): boolean {
  const { restrictions, notes } = extractFromConversation(item)
  return restrictions.length > 0 || notes.length > 0
}

// 仅返回「档案中尚未记录」的新信息；无档案则全部视为新信息
export function newInfoFrom(item: HistoryItem, profile: Profile | null): ExtractedInfo {
  const { restrictions, notes } = extractFromConversation(item)
  if (!profile) return { restrictions, notes }
  const existingRestrictions = new Set(profile.healthRestrictions.map((r) => r.item))
  const existingNotes = new Set(profile.notes ?? [])
  return {
    restrictions: restrictions.filter((r) => !existingRestrictions.has(r.item)),
    notes: notes.filter((n) => !existingNotes.has(n)),
  }
}

export function hasNewInfo(item: HistoryItem, profile: Profile | null): boolean {
  const info = newInfoFrom(item, profile)
  return info.restrictions.length > 0 || info.notes.length > 0
}

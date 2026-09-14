import type { DifyResponse } from './types'

// 通用工具

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function fmtTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function clock(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function dayLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const yest = new Date(now)
  yest.setDate(now.getDate() - 1)
  if (sameDay(d, now)) return '今天'
  if (sameDay(d, yest)) return '昨天'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '凌晨好'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export function groupByDay<T>(
  items: T[],
  getIso: (item: T) => string,
): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = []
  for (const item of items) {
    const label = dayLabel(getIso(item))
    const g = groups.find((x) => x.label === label)
    if (g) g.items.push(item)
    else groups.push({ label, items: [item] })
  }
  return groups
}

export function copyText(text: string): void {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => legacyCopy(text))
  } else {
    legacyCopy(text)
  }
}

function legacyCopy(text: string): void {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

// 把一条结构化回答压成可引用的一段文字
export function responseText(response: DifyResponse): string {
  if (response.blocked) return response.risk?.message ?? '已拦截'
  const r = response.result
  if (!r) return ''
  const items: string[] = []
  if (r.dishes?.length) {
    items.push(...r.dishes.map((d) => (d.suitable ? d.name : `${d.name}（不建议）`)))
  } else if (r.ingredients?.length) {
    items.push(...r.ingredients.map((i) => i.name))
  } else if (r.nutrition?.ingredients?.length) {
    items.push(...r.nutrition.ingredients)
  }
  const advice = r.advice?.filter(Boolean) ?? []
  return [...items, ...advice].join('；') || r.title
}

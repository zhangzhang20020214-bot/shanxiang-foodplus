import type { AdviceLevel, DifyResponse, Result } from './types'

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

// 单次最多携带的图片数
export const MAX_IMAGES = 4
// 压缩后长边上限。手机原图长边可达 4000px、单张 3–4MB，
// 一次传 4 张就是十几 MB，Dify 侧会直接超时，所以在入口处统一压掉。
const IMAGE_MAX_EDGE = 1280

export function compressImage(
  dataUrl: string,
  maxEdge = IMAGE_MAX_EDGE,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
      if (scale === 1) {
        resolve(dataUrl)
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    // 解码失败就原样返回：宁可传张大图，也不要让用户丢图
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// advice 归一化：同时吃下「纯字符串」和「带 level 的对象」两种写法，
// 让模型新旧输出都能渲染，不会因为有历史记录而白屏
export function normalizeAdvice(
  advice: Result['advice'],
): { text: string; level: AdviceLevel }[] {
  return (advice ?? [])
    .map((a) =>
      typeof a === 'string'
        ? { text: a, level: 'normal' as const }
        : { text: a?.text ?? '', level: a?.level ?? ('normal' as const) },
    )
    .filter((a) => a.text.trim().length > 0)
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
  const advice = normalizeAdvice(r.advice).map((a) => a.text)
  return [...items, ...advice].join('；') || r.title
}

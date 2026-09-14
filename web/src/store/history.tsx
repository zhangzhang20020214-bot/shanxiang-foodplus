import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  DifyResponse,
  HistoryItem,
  HistoryTurn,
  Mode,
  Profile,
} from '../types'
import { MODE_LABEL } from '../types'
import { hasExtractableContent } from '../utils/extract'
import { uid, nowIso } from '../utils'

const HISTORY_KEY = 'foodplus.history'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function makeSummary(mode: Mode, text: string): string {
  const t = (text || '').trim()
  if (t) return t.length > 20 ? t.slice(0, 20) + '…' : t
  return `[${MODE_LABEL[mode]}] 图片分析`
}

// 迁移旧格式（单条 request/response）为多轮对话
function migrate(item: any): HistoryItem {
  if (item && Array.isArray(item.turns)) {
    return {
      ...item,
      turns: item.turns.map((t: any) => ({ ...t, id: t.id ?? uid() })),
    }
  }
  return {
    id: item?.id ?? uid(),
    summary: item?.summary ?? '',
    time: item?.time ?? nowIso(),
    profileId: item?.request?.profile?.id,
    // 旧格式（单条）视为已处理，避免迁移后集中弹出保存提醒
    offered: true,
    turns: [
      {
        id: uid(),
        mode: item?.mode ?? 'dish',
        text: item?.request?.input?.text ?? '',
        images: item?.request?.input?.images ?? [],
        response: item?.response,
      },
    ],
  }
}

interface HistoryContextValue {
  history: HistoryItem[]
  selected: HistoryItem | null
  appendTurn: (entry: {
    profile: Profile
    mode: Mode
    text: string
    images: string[]
    response: DifyResponse
    quote?: string
  }) => string
  setSelected: (item: HistoryItem | null) => void
  deleteTurn: (turnId: string) => void
  deleteItem: (id: string) => void
  clearHistory: () => void
  resetConversation: () => void
  continueConversation: (id: string) => void
  pendingOffer: HistoryItem | null
  markOffered: (id: string) => void
}

const HistoryContext = createContext<HistoryContextValue | null>(null)

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryItem[]>(() =>
    load<any[]>(HISTORY_KEY, []).map(migrate),
  )
  const [selected, setSelected] = useState<HistoryItem | null>(null)
  // 当前会话对话 id（仅内存，刷新即视为结束）；null 表示下一次 append 新建对话
  const [currentId, setCurrentId] = useState<string | null>(null)
  // appendTurn 在 await 之后才执行，那时闭包捕获的 currentId 已经过期，
  // 会把手上的消息追加进「上一个」会话。用 ref 保证读到的永远是最新值。
  const currentIdRef = useRef<string | null>(null)

  const applyCurrentId = (id: string | null) => {
    currentIdRef.current = id
    setCurrentId(id)
  }

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  }, [history])

  const appendTurn = ({
    profile,
    mode,
    text,
    images,
    response,
    quote,
  }: {
    profile: Profile
    mode: Mode
    text: string
    images: string[]
    response: DifyResponse
    quote?: string
  }): string => {
    const turnId = uid()
    const turn: HistoryTurn = { id: turnId, mode, text, images, response, quote }
    let targetId = currentIdRef.current
    if (!targetId) {
      targetId = uid()
      applyCurrentId(targetId)
    }

    setHistory((prev) => {
      const existing = prev.find((h) => h.id === targetId)
      if (existing) {
        return [
          {
            ...existing,
            time: nowIso(),
            profileId: profile.id,
            // 追加新内容后，该会话结束时应重新询问是否保存
            offered: false,
            turns: [...existing.turns, turn],
          },
          ...prev.filter((h) => h.id !== targetId),
        ]
      }
      return [
        {
          id: targetId,
          summary: makeSummary(mode, text),
          time: nowIso(),
          profileId: profile.id,
          turns: [turn],
        },
        ...prev,
      ]
    })
    return turnId
  }

  const resetConversation = () => applyCurrentId(null)

  const continueConversation = (id: string) => applyCurrentId(id)

  const deleteItem = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id))
    setSelected((prev) => (prev && prev.id === id ? null : prev))
    if (currentIdRef.current === id) applyCurrentId(null)
  }

  const deleteTurn = (turnId: string) => {
    // 定位该轮次所属会话（轮次 id 全局唯一）
    const owner = history.find((h) => h.turns.some((t) => t.id === turnId))
    const remaining = owner ? owner.turns.filter((t) => t.id !== turnId) : []

    setHistory((prev) =>
      prev
        .map((h) => ({ ...h, turns: h.turns.filter((t) => t.id !== turnId) }))
        .filter((h) => h.turns.length > 0),
    )

    if (owner) {
      // 当前会话被删空 → 结束当前会话
      if (owner.id === currentIdRef.current && remaining.length === 0) {
        applyCurrentId(null)
      }
      // 同步选中的历史会话（删除其中被撤掉的轮次）
      if (selected && owner.id === selected.id) {
        setSelected(remaining.length === 0 ? null : { ...selected, turns: remaining })
      }
    }
  }

  const clearHistory = () => {
    setHistory([])
    applyCurrentId(null)
  }

  const markOffered = (id: string) => {
    setHistory((prev) => prev.map((h) => (h.id === id ? { ...h, offered: true } : h)))
  }

  // 待提醒保存的「上一次会话」：最近一段已结束、未处理且能抽取出关键信息的对话
  const lastEnded = history.find((h) => h.id !== currentId)
  const pendingOffer =
    lastEnded && !lastEnded.offered && hasExtractableContent(lastEnded)
      ? lastEnded
      : null

  return (
    <HistoryContext.Provider
      value={{
        history,
        selected,
        pendingOffer,
        appendTurn,
        setSelected,
        deleteTurn,
        deleteItem,
        clearHistory,
        resetConversation,
        continueConversation,
        markOffered,
      }}
    >
      {children}
    </HistoryContext.Provider>
  )
}

export function useHistory(): HistoryContextValue {
  const ctx = useContext(HistoryContext)
  if (!ctx) throw new Error('useHistory 必须在 HistoryProvider 内使用')
  return ctx
}

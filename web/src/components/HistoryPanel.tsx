import { useEffect, useState } from 'react'
import { useHistory } from '../store/history'
import { useProfiles } from '../store/profiles'
import { useNav } from '../store/nav'
import type { HistoryItem } from '../types'
import { MODE_COLOR, MODE_ICON } from '../types'
import { clock, groupByDay } from '../utils'

const WIDE_QUERY = '(min-width: 768px)'

// 宽屏：侧栏参与布局，挤压主内容，不遮挡、不阻塞交互
// 窄屏：宽度不够，只能做成覆盖式抽屉
function useIsWide() {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(WIDE_QUERY).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY)
    const onChange = () => setWide(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return wide
}

export default function HistoryPanel({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const {
    history,
    selected,
    setSelected,
    clearHistory,
    deleteItem,
    resetConversation,
  } = useHistory()
  const { profiles, deleteProfile, setSessionProfile } = useProfiles()
  const { navigate, newChat } = useNav()

  const [confirmItem, setConfirmItem] = useState<HistoryItem | null>(null)
  const [deleteProfileToo, setDeleteProfileToo] = useState(false)
  const wide = useIsWide()

  // 选中记录 / 新建对话后：窄屏收起抽屉，宽屏保持展开（不打断连续操作）
  const closeOnNarrow = () => {
    if (!wide) onClose()
  }

  const groups = groupByDay(history, (h) => h.time)

  // 该历史记录当时使用的档案，若仍存在于档案库则算「关联档案」
  const linkedProfile = confirmItem
    ? profiles.find((p) => p.id === confirmItem.profileId)
    : null

  const confirmDelete = () => {
    if (!confirmItem) return
    if (deleteProfileToo && linkedProfile) deleteProfile(linkedProfile.id)
    deleteItem(confirmItem.id)
    setConfirmItem(null)
    setDeleteProfileToo(false)
  }

  const content = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-3">
        <button
          onClick={() => navigate({ name: 'home' })}
          className="flex items-center gap-2 rounded-lg px-1 py-0.5 text-left"
          title="返回首页"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-base font-bold text-white">
            膳
          </span>
          <span className="text-base font-extrabold text-emerald-700">膳享+</span>
        </button>
        <div className="flex-1" />
        {/* 宽屏没有遮罩可点，必须给一个显式的收起入口 */}
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="收起历史记录"
          title="收起"
        >
          ✕
        </button>
      </div>

      <div className="px-3 py-3">
        <button
          onClick={() => {
            newChat()
            resetConversation()
            setSessionProfile(null)
            closeOnNarrow()
          }}
          className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          ＋ 新建对话
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-2">
        {history.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-slate-400">
            暂无历史记录
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.label}>
              <div className="px-2.5 pb-1.5 pt-3 text-xs text-slate-400">
                {g.label}
              </div>
              {g.items.map((h) => {
                const active = selected?.id === h.id
                const mode = h.turns[0]?.mode ?? 'dish'
                return (
                  <div key={h.id} className="group relative mb-1">
                    <button
                      onClick={() => {
                        setSelected(h)
                        navigate({ name: 'home' })
                        closeOnNarrow()
                      }}
                      className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                        active
                          ? 'border border-emerald-200 bg-emerald-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 pr-5">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs ${MODE_COLOR[mode]}`}
                        >
                          {MODE_ICON[mode]}
                        </span>
                        <span className="truncate text-sm font-semibold text-slate-700">
                          {h.summary}
                        </span>
                      </div>
                      <div className="mt-1 pl-8 text-xs text-slate-400">
                        {h.turns.length} 轮 · {clock(h.time)}
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setDeleteProfileToo(false)
                        setConfirmItem(h)
                      }}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-sm text-slate-300 transition hover:bg-white hover:text-red-500"
                      aria-label="删除记录"
                      title="删除"
                    >
                      🗑
                    </button>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {history.length > 0 && (
        <button
          onClick={clearHistory}
          className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 transition hover:text-red-500"
        >
          <span>🗑</span> 清空历史
        </button>
      )}
    </div>
  )

  return (
    <>
      {open &&
        (wide ? (
          // 宽屏：在 flex 布局里占一列，主内容自动让位，两边都能正常操作
          <aside className="h-full w-72 shrink-0 border-r border-slate-200">
            {content}
          </aside>
        ) : (
          // 窄屏：宽度不够，做成覆盖式抽屉
          <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />
            <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
              {content}
            </div>
          </div>
        ))}

      {confirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setConfirmItem(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="text-sm font-bold text-slate-800">
              删除这条对话记录？
            </div>
            {linkedProfile && (
              <div className="mt-1.5 text-xs text-slate-500">
                本次分析使用了健康档案「{linkedProfile.name}」。
              </div>
            )}
            {linkedProfile && (
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={deleteProfileToo}
                  onChange={(e) => setDeleteProfileToo(e.target.checked)}
                  className="h-4 w-4 accent-emerald-600"
                />
                同时删除关联的健康档案
              </label>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmItem(null)}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

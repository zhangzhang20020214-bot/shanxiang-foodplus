import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { useProfiles } from '../store/profiles'
import { useHistory } from '../store/history'
import { useNav } from '../store/nav'
import { analyze } from '../services/dify'
import type { DifyResponse, Mode, Profile } from '../types'
import FeatureGrid from '../components/FeatureGrid'
import ChatInput from '../components/ChatInput'
import ResultCard from '../components/ResultCard'
import SavePreviousBanner from '../components/SavePreviousBanner'
import CameraModal from '../components/CameraModal'
import MessageMenu from '../components/MessageMenu'
import QuickQuestions, {
  buildQuickProfile,
  type QuickAnswers,
} from '../components/QuickQuestions'
import { copyText, greeting, responseText } from '../utils'
import { hasNewInfo } from '../utils/extract'

interface Turn {
  id: string
  mode: Mode
  text: string
  images: string[]
  response: DifyResponse
  quote?: string
}

interface PendingInput {
  text: string
  images: string[]
  quote?: string
}

export default function Home() {
  const { currentProfile, sessionProfile, setSessionProfile } = useProfiles()
  const { appendTurn, selected, setSelected, pendingOffer, deleteTurn, continueConversation } = useHistory()
  const { navigate, chatKey } = useNav()
  const [activeMode, setActiveMode] = useState<Mode | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingInput, setPendingInput] = useState<PendingInput | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [quote, setQuote] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ turnId: string; x: number; y: number } | null>(null)
  const longPressTimer = useRef<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTurns([])
    setSelected(null)
    setPendingInput(null)
  }, [chatKey, setSelected])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns.length, pendingInput, loading])

  const doAnalyze = async (
    profile: Profile,
    text: string,
    images: string[],
    quote?: string,
  ) => {
    setLoading(true)
    // 未选择功能时兜底：有图片按「拍餐盘」，纯文字按「搜菜品」
    const mode: Mode =
      activeMode ?? (images.length > 0 && !text.trim() ? 'plate' : 'dish')
    const request = { profile, mode, input: { text, images } }
    try {
      const response = await analyze(request)
      const turnId = appendTurn({ profile, mode, text, images, response, quote })
      setTurns((prev) => [...prev, { id: turnId, mode, text, images, response, quote }])
    } catch (e) {
      console.error(e)
      alert('分析失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = (text: string, images: string[]) => {
    if (loading) return
    setSelected(null)
    const q = quote ?? undefined
    setQuote(null)
    if (currentProfile) {
      doAnalyze(currentProfile, text, images, q)
    } else if (sessionProfile) {
      // 本次对话已答过问卷，复用临时档案，不再重复询问
      doAnalyze(sessionProfile, text, images, q)
    } else {
      // 无档案且本次对话首次提问：先记住输入，弹出补充问卷
      setPendingInput({ text, images, quote: q })
    }
  }

  const handleQuickSubmit = (answers: QuickAnswers) => {
    if (!pendingInput) return
    const profile = buildQuickProfile(answers)
    setSessionProfile(profile)
    setPendingInput(null)
    doAnalyze(profile, pendingInput.text, pendingInput.images, pendingInput.quote)
  }

  const handleQuickSkip = () => {
    if (!pendingInput) return
    const profile = buildQuickProfile({ taboos: [], stages: [], diseases: [] })
    setSessionProfile(profile)
    setPendingInput(null)
    doAnalyze(profile, pendingInput.text, pendingInput.images, pendingInput.quote)
  }

  const handleSelectMode = (m: Mode) => {
    // 「搜菜品」进入菜品搜索页；其余入口直接拉起相机拍摄
    if (m === 'dish') {
      navigate({ name: 'dish' })
      return
    }
    setActiveMode(m)
    setCameraOpen(true)
  }

  const handleDeleteTurn = (turnId: string) => {
    setTurns((prev) => prev.filter((t) => t.id !== turnId))
    deleteTurn(turnId)
  }

  const handleContinueConversation = () => {
    if (!selected) return
    const id = selected.id
    const resumed = selected.turns.map((t) => ({ ...t }))
    continueConversation(id)
    setTurns(resumed)
    setSelected(null)
  }

  const startLongPress = (e: TouchEvent<HTMLDivElement>, turnId: string) => {
    const touch = e.touches[0]
    longPressTimer.current = window.setTimeout(() => {
      setMenu({ turnId, x: touch.clientX, y: touch.clientY })
    }, 500)
  }
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const menuTurn = menu
    ? turns.find((t) => t.id === menu.turnId) ??
      selected?.turns.find((t) => t.id === menu.turnId)
    : undefined

  const offer =
    pendingOffer && hasNewInfo(pendingOffer, currentProfile) ? pendingOffer : null

  const showGreeting = turns.length === 0 && !selected && !pendingInput

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 p-4">
          {offer && <SavePreviousBanner item={offer} />}

          {/* 无档案提示行 */}
          {!currentProfile && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <span>💡</span>
              <span className="min-w-0 flex-1">
                未设置健康档案，创建档案可获更精准推荐
              </span>
              <button
                onClick={() => navigate({ name: 'profiles' })}
                className="shrink-0 font-medium text-emerald-600 hover:underline"
              >
                去创建 ›
              </button>
            </div>
          )}

          {showGreeting && (
            <div>
              <div className="text-lg font-bold text-slate-800">
                {greeting()}，👋
              </div>
              <div className="mt-0.5 text-sm text-slate-400">
                拍张照、说句话，看看这餐适不适合你
              </div>
            </div>
          )}

          <FeatureGrid active={activeMode} onSelect={handleSelectMode} />

          {selected && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <span className="text-xs text-slate-500">
                  正在查看历史对话（{selected.turns.length} 轮）
                </span>
                <button
                  onClick={handleContinueConversation}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700"
                >
                  继续这段对话
                </button>
              </div>
              {selected.turns.map((t) => (
                <div
                  key={t.id}
                  className="space-y-3"
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setMenu({ turnId: t.id, x: e.clientX, y: e.clientY })
                  }}
                  onTouchStart={(e) => startLongPress(e, t.id)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                >
                  <UserBubble text={t.text} images={t.images} quote={t.quote} />
                  <ResultCard response={t.response} />
                </div>
              ))}
            </div>
          )}

          {!selected && turns.map((t) => (
            <div
              key={t.id}
              className="space-y-3"
              onContextMenu={(e) => {
                e.preventDefault()
                setMenu({ turnId: t.id, x: e.clientX, y: e.clientY })
              }}
              onTouchStart={(e) => startLongPress(e, t.id)}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
            >
              <UserBubble text={t.text} images={t.images} quote={t.quote} />
              <ResultCard response={t.response} />
            </div>
          ))}

          {/* 无档案首次提问：问卷紧跟最新一条消息之后 */}
          {pendingInput && (
            <div className="space-y-3">
              <UserBubble
                text={pendingInput.text}
                images={pendingInput.images}
                quote={pendingInput.quote}
              />
              <QuickQuestions
                onSubmit={handleQuickSubmit}
                onSkip={handleQuickSkip}
              />
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              正在分析，请稍候…
            </div>
          )}

          <div ref={bottomRef} />

          {menu && menuTurn && (
            <MessageMenu
              x={menu.x}
              y={menu.y}
              onClose={() => setMenu(null)}
              actions={[
                ...(menuTurn.text.trim()
                  ? [
                      {
                        label: '复制文本',
                        onClick: () => copyText(menuTurn.text),
                      },
                    ]
                  : []),
                {
                  label: '引用',
                  onClick: () => {
                    // 从历史对话引用时，先把该历史会话重新设为当前对话
                    if (selected && selected.turns.some((t) => t.id === menuTurn.id)) {
                      handleContinueConversation()
                    }
                    // 引用内容单独显示为输入框上方的引用块，不写入文本框
                    const q = responseText(menuTurn.response)
                    if (q) setQuote(q)
                  },
                },
                {
                  label: '删除本条',
                  danger: true,
                  onClick: () => handleDeleteTurn(menuTurn.id),
                },
              ]}
            />
          )}
        </div>
      </div>

      <ChatInput
        loading={loading}
        text={inputText}
        onTextChange={setInputText}
        onSend={handleSend}
        onCamera={() => setCameraOpen(true)}
        quote={quote}
        onClearQuote={() => setQuote(null)}
      />

      <CameraModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(dataUrl) => {
          setCameraOpen(false)
          handleSend('', [dataUrl])
        }}
      />
    </div>
  )
}

function UserBubble({
  text,
  images,
  quote,
}: {
  text: string
  images: string[]
  quote?: string
}) {
  if (!text && images.length === 0 && !quote) return null
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-2xl rounded-br-md bg-emerald-600 px-3.5 py-2.5 text-sm text-white">
        {quote && (
          <div className="mb-2 border-l-2 border-white/40 pl-2 text-xs text-white/80">
            {quote}
          </div>
        )}
        {images.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                className="h-16 w-16 rounded-lg object-cover"
                alt=""
              />
            ))}
          </div>
        )}
        {text}
      </div>
    </div>
  )
}

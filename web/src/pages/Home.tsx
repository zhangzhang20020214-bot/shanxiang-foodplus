import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent,
} from 'react'
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
import ImagePreview from '../components/ImagePreview'
import QuickQuestions, {
  buildQuickProfile,
  type QuickAnswers,
} from '../components/QuickQuestions'
import { MAX_IMAGES, copyText, greeting, responseText } from '../utils'
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

// 右键 / 长按的四个事件处理，直接展开到对应的那一半气泡上
interface MenuHandlers {
  onContextMenu: (e: ReactMouseEvent) => void
  onTouchStart: (e: TouchEvent<HTMLDivElement>) => void
  onTouchEnd: () => void
  onTouchMove: () => void
}

export default function Home() {
  const { currentProfile, sessionProfile, setSessionProfile } = useProfiles()
  const { appendTurn, selected, setSelected, pendingOffer, deleteTurn, continueConversation } = useHistory()
  const { navigate, chatKey } = useNav()
  const [activeMode, setActiveMode] = useState<Mode | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingInput, setPendingInput] = useState<PendingInput | null>(null)
  // 正在分析中的那条用户消息：先乐观渲染出来，避免用户以为没发出去
  const [pending, setPending] = useState<PendingInput | null>(null)
  // 分析失败时的错误信息（保留消息气泡，改为内联提示 + 重试）
  const [failed, setFailed] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  // 从输入框的 📷 进来时意图已明确，跳过「拍照/相册」选择直接进相机
  const [cameraSkipChooser, setCameraSkipChooser] = useState(false)
  const [inputText, setInputText] = useState('')
  // 附件条提升到这一层：拍照 / 相册 / 快捷入口三条路径都汇到这里，
  // 用户能看见自己攒了哪几张，再决定什么时候发
  const [inputImages, setInputImages] = useState<string[]>([])
  const [quote, setQuote] = useState<string | null>(null)
  // kind 区分是点在自己的提问上还是点在这条回答上，两者菜单项不同
  const [menu, setMenu] = useState<{
    turnId: string
    kind: 'user' | 'result'
    x: number
    y: number
  } | null>(null)
  const longPressTimer = useRef<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  // 当前请求的中断句柄：用户点「停止」时用它 cancel 掉 fetch
  const abortRef = useRef<AbortController | null>(null)
  // Dify 会话 id：靠它维持多轮记忆，用户反驳/追问时模型才「记得」自己刚说过什么
  const conversationIdRef = useRef<string | null>(null)

  useEffect(() => {
    setTurns([])
    setSelected(null)
    setPendingInput(null)
    setPending(null)
    setFailed(null)
    setInputImages([])
    // 换了一段对话就得换一个 Dify 会话，否则会把上下文串到一起
    conversationIdRef.current = null
  }, [chatKey, setSelected])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns.length, pendingInput, pending, loading])

  const doAnalyze = async (
    profile: Profile,
    text: string,
    images: string[],
    quote?: string,
  ) => {
    setLoading(true)
    setPending({ text, images, quote })
    setFailed(null)
    // 未选择功能时兜底：有图片按「拍餐盘」，纯文字按「搜菜品」。
    // 但如果这一轮是在追问/反驳上一轮（没重新选功能、也没带新图），
    // 就沿用上一轮的模式，否则「拍冰箱」之后的追问会被当成搜菜品。
    const followUp = !activeMode && images.length === 0 && turns.length > 0
    let mode: Mode = 'dish'
    if (activeMode) mode = activeMode
    else if (followUp) mode = turns[turns.length - 1].mode
    else if (images.length > 0 && !text.trim()) mode = 'plate'
    const request = { profile, mode, input: { text, images } }
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const { response, conversationId } = await analyze(request, {
        signal: controller.signal,
        // 带上会话 id，用户反驳/追问时模型才记得自己刚才答了什么
        conversationId: conversationIdRef.current,
      })
      if (conversationId) conversationIdRef.current = conversationId
      const turnId = appendTurn({ profile, mode, text, images, response, quote })
      // 与 setPending(null) 在同一批次里提交，气泡无缝转成正式消息，不会闪一下
      setTurns((prev) => [...prev, { id: turnId, mode, text, images, response, quote }])
      setPending(null)
    } catch (e) {
      // 用户主动停止不算失败：不弹红框，把内容退回输入框让他接着改
      if (e instanceof DOMException && e.name === 'AbortError') {
        setPending(null)
        setInputText((prev) => prev || text)
        setInputImages((prev) => (prev.length ? prev : images))
        return
      }
      console.error(e)
      // 不再用 alert 打断，也不清空气泡——保留用户输入，就地提示并可重试
      setFailed(e instanceof Error ? e.message : '分析失败，请重试')
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setLoading(false)
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
  }

  const handleRetry = () => {
    if (!pending || loading) return
    const profile = currentProfile ?? sessionProfile
    if (!profile) return
    doAnalyze(profile, pending.text, pending.images, pending.quote)
  }

  const handleSend = (text: string, images: string[]) => {
    if (loading) return
    // 正在翻看历史会话时直接接管续聊，不再需要「继续这段对话」这一步
    resumeSelected()
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
    // 快捷入口只表明「要分析冰箱/餐盘」，图片来源还没定，先让用户选
    setCameraSkipChooser(false)
    setCameraOpen(true)
  }

  const handleDeleteTurn = (turnId: string) => {
    setTurns((prev) => prev.filter((t) => t.id !== turnId))
    deleteTurn(turnId)
  }

  // 接管正在翻看的历史会话：设为当前会话并把已有轮次搬到主视图，
  // 之后用户直接输入就会接在这条记录后面，无需额外点「继续」
  const resumeSelected = () => {
    if (!selected) return
    continueConversation(selected.id)
    setTurns(selected.turns.map((t) => ({ ...t })))
    setSelected(null)
  }

  const startLongPress = (
    e: TouchEvent<HTMLDivElement>,
    turnId: string,
    kind: 'user' | 'result',
  ) => {
    const touch = e.touches[0]
    longPressTimer.current = window.setTimeout(() => {
      setMenu({ turnId, kind, x: touch.clientX, y: touch.clientY })
    }, 500)
  }
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // 自己的提问和回答各自挂右键/长按，菜单项不一样，所以分开注册
  const userMenuHandlers = (turnId: string) => ({
    onContextMenu: (e: ReactMouseEvent) => {
      e.preventDefault()
      setMenu({ turnId, kind: 'user' as const, x: e.clientX, y: e.clientY })
    },
    onTouchStart: (e: TouchEvent<HTMLDivElement>) =>
      startLongPress(e, turnId, 'user'),
    onTouchEnd: cancelLongPress,
    onTouchMove: cancelLongPress,
  })

  const resultMenuHandlers = (turnId: string) => ({
    onContextMenu: (e: ReactMouseEvent) => {
      e.preventDefault()
      setMenu({ turnId, kind: 'result' as const, x: e.clientX, y: e.clientY })
    },
    onTouchStart: (e: TouchEvent<HTMLDivElement>) =>
      startLongPress(e, turnId, 'result'),
    onTouchEnd: cancelLongPress,
    onTouchMove: cancelLongPress,
  })

  const menuTurn = menu
    ? turns.find((t) => t.id === menu.turnId) ??
      selected?.turns.find((t) => t.id === menu.turnId)
    : undefined

  // 「撤回并重新编辑」：把这条提问的内容搬回输入框，再从记录里删掉
  const retractTurn = (turnId: string) => {
    const t = turns.find((x) => x.id === turnId) ?? selected?.turns.find((x) => x.id === turnId)
    if (!t) return
    setInputText(t.text)
    setInputImages(t.images ?? [])
    handleDeleteTurn(turnId)
  }

  const offer =
    pendingOffer && hasNewInfo(pendingOffer, currentProfile) ? pendingOffer : null

  const showGreeting = turns.length === 0 && !selected && !pendingInput && !pending

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
            <div className="space-y-4">
              {selected.turns.map((t) => (
                <TurnBlock
                  key={t.id}
                  turn={t}
                  userMenu={userMenuHandlers(t.id)}
                  resultMenu={resultMenuHandlers(t.id)}
                />
              ))}
            </div>
          )}

          {!selected &&
            turns.map((t) => (
              <TurnBlock
                key={t.id}
                turn={t}
                userMenu={userMenuHandlers(t.id)}
                resultMenu={resultMenuHandlers(t.id)}
              />
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

          {/* 分析中 / 失败：始终带着用户那条消息一起展示，消息不会「消失」 */}
          {pending && (
            <div className="space-y-3">
              <UserBubble
                text={pending.text}
                images={pending.images}
                quote={pending.quote}
              />
              {failed ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div className="text-sm font-semibold text-red-600">
                    分析失败，消息未发出
                  </div>
                  <div className="mt-1 break-all text-xs leading-relaxed text-red-500/80">
                    {failed}
                  </div>
                  <button
                    onClick={handleRetry}
                    disabled={loading}
                    className="mt-3 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    重试
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                  <span className="flex-1">正在分析，请稍候…</span>
                  {/* 生成/等待过程中用户随时可以喊停，内容退回输入框，不算失败 */}
                  <button
                    onClick={handleStop}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    停止
                  </button>
                </div>
              )}
            </div>
          )}

          <div ref={bottomRef} />

          {menu && menuTurn && (
            <MessageMenu
              x={menu.x}
              y={menu.y}
              onClose={() => setMenu(null)}
              actions={
                menu.kind === 'user'
                  ? [
                      ...(menuTurn.text.trim()
                        ? [
                            {
                              label: '复制文本',
                              onClick: () => copyText(menuTurn.text),
                            },
                          ]
                        : []),
                      {
                        label: '撤回并重新编辑',
                        onClick: () => retractTurn(menuTurn.id),
                      },
                      {
                        label: '删除本条',
                        danger: true,
                        onClick: () => handleDeleteTurn(menuTurn.id),
                      },
                    ]
                  : [
                      {
                        label: '引用',
                        onClick: () => {
                          // 从历史对话引用时，先把该历史会话接管为当前对话
                          if (
                            selected &&
                            selected.turns.some((t) => t.id === menuTurn.id)
                          ) {
                            resumeSelected()
                          }
                          // 引用内容单独显示为输入框上方的引用块，不写入文本框
                          const q = responseText(menuTurn.response)
                          if (q) setQuote(q)
                        },
                      },
                      {
                        label: '复制本条回答',
                        onClick: () =>
                          copyText(responseText(menuTurn.response) || ''),
                      },
                      {
                        label: '删除本条',
                        danger: true,
                        onClick: () => handleDeleteTurn(menuTurn.id),
                      },
                    ]
              }
            />
          )}
        </div>
      </div>

      <ChatInput
        loading={loading}
        text={inputText}
        onTextChange={setInputText}
        onSend={handleSend}
        images={inputImages}
        onImagesChange={setInputImages}
        onCamera={() => {
          setCameraSkipChooser(true)
          setCameraOpen(true)
        }}
        quote={quote}
        onClearQuote={() => setQuote(null)}
      />

      <CameraModal
        open={cameraOpen}
        skipChooser={cameraSkipChooser}
        onClose={() => setCameraOpen(false)}
        onCapture={(imgs) => {
          setCameraOpen(false)
          // 不立即发送：并进附件条，用户可继续补拍或先写句话再发
          setInputImages((prev) => [...prev, ...imgs].slice(0, MAX_IMAGES))
        }}
      />
    </div>
  )
}

// 一轮对话 = 用户的提问 + Agent 的回答。
// 右键/长按分别挂在自己那半边上：点提问出「撤回/删除」，点回答出「引用/复制/删除」。
function TurnBlock({
  turn,
  userMenu,
  resultMenu,
}: {
  turn: Turn
  userMenu: MenuHandlers
  resultMenu: MenuHandlers
}) {
  return (
    <div className="space-y-3">
      <div {...userMenu}>
        <UserBubble text={turn.text} images={turn.images} quote={turn.quote} />
      </div>
      <div {...resultMenu}>
        <ResultCard response={turn.response} />
      </div>
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
            {/* 上传后点开可查大图，确认拍清楚了、也确认自己没传错 */}
            {images.map((img, i) => (
              <ImagePreview
                key={i}
                src={img}
                alt={`已上传第 ${i + 1} 张`}
                className="h-20 w-20 rounded-lg object-cover"
              />
            ))}
          </div>
        )}
        {text}
      </div>
    </div>
  )
}

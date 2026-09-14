import { useMemo, useState } from 'react'
import { useProfiles } from '../store/profiles'
import { useHistory } from '../store/history'
import { analyze } from '../services/dify'
import type { DifyRequest, DifyResponse, Profile } from '../types'
import ResultCard from '../components/ResultCard'
import QuickQuestions, {
  buildQuickProfile,
  type QuickAnswers,
} from '../components/QuickQuestions'
import { SearchIcon } from '../components/icons'

const POPULAR = [
  '番茄炒蛋',
  '清蒸鲈鱼',
  '西兰花炒虾仁',
  '宫保鸡丁',
  '蒜蓉空心菜',
  '紫菜蛋花汤',
  '红烧鸡腿',
  '麻婆豆腐',
  '冬瓜排骨汤',
  '香菇青菜',
  '清炒时蔬',
  '香煎三文鱼',
]

export default function DishSearch() {
  const { currentProfile, sessionProfile, setSessionProfile } = useProfiles()
  const { history, appendTurn } = useHistory()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<DifyResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [pendingDish, setPendingDish] = useState<string | null>(null)

  const chips = useMemo(() => {
    const cap = (t: string) => (t.length > 20 ? t.slice(0, 20) + '…' : t)
    const past = history
      .flatMap((h) => h.turns.map((t) => t.text.trim()))
      .filter(Boolean)
    const unique = [...new Set(past)].map(cap).slice(0, 6)
    return unique.length ? [...unique, ...POPULAR].slice(0, 12) : POPULAR
  }, [history])

  const hasTaste = history.some((h) => h.turns.some((t) => t.text.trim()))

  const analyzeDish = async (name: string, profile: Profile) => {
    setLoading(true)
    const request: DifyRequest = {
      profile,
      mode: 'dish',
      input: { text: name, images: [] },
    }
    try {
      const response = await analyze(request)
      appendTurn({ profile, mode: 'dish', text: name, images: [], response })
      setResult(response)
    } catch (e) {
      console.error(e)
      alert('分析失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const search = (name: string) => {
    const n = name.trim()
    if (!n || loading) return
    if (currentProfile) {
      analyzeDish(n, currentProfile)
    } else if (sessionProfile) {
      analyzeDish(n, sessionProfile)
    } else {
      setPendingDish(n)
    }
  }

  const handleQuickSubmit = (answers: QuickAnswers) => {
    if (!pendingDish) return
    const profile = buildQuickProfile(answers)
    setSessionProfile(profile)
    setPendingDish(null)
    analyzeDish(pendingDish, profile)
  }

  const handleQuickSkip = () => {
    if (!pendingDish) return
    const profile = buildQuickProfile({ taboos: [], stages: [], diseases: [] })
    setSessionProfile(profile)
    setPendingDish(null)
    analyzeDish(pendingDish, profile)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        {/* 搜索框 */}
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 pl-4">
          <SearchIcon className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                search(query)
                setQuery('')
              }
            }}
            placeholder="搜菜品，如：红烧肉"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-slate-400"
          />
          <button
            onClick={() => {
              search(query)
              setQuery('')
            }}
            className="shrink-0 rounded-xl bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            搜索
          </button>
        </div>

        {/* 猜你想吃 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-1 text-sm font-bold text-slate-800">猜你想吃</div>
          <div className="mb-3 text-xs text-slate-400">
            {hasTaste ? '根据你的口味推荐' : '新用户？先看看大家爱吃的'}
          </div>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c}
                onClick={() => search(c)}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* 无档案提示 */}
        {!currentProfile && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <span>💡</span>
            <span className="min-w-0 flex-1">
              未设置健康档案，创建档案可获更精准推荐
            </span>
          </div>
        )}

        {/* 无档案：点击菜名后弹出补充问卷 */}
        {pendingDish && (
          <QuickQuestions onSubmit={handleQuickSubmit} onSkip={handleQuickSkip} />
        )}

        {loading && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            正在生成做法，请稍候…
          </div>
        )}

        {result && !pendingDish && (
          <div className="space-y-3">
            <ResultCard response={result} />
          </div>
        )}
      </div>
    </div>
  )
}

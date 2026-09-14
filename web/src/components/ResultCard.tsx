import type { DifyResponse } from '../types'
import { MODE_LABEL, SEVERITY_LABEL } from '../types'
import { useNav } from '../store/nav'
import { normalizeAdvice } from '../utils'

const NUM = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']

export default function ResultCard({ response }: { response: DifyResponse }) {
  const { navigate } = useNav()

  if (response.blocked) {
    const risk = response.risk
    return (
      <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl">
            🚫
          </span>
          <div>
            <div className="text-base font-bold text-red-600">
              已拦截 · 高危风险
            </div>
            <div className="text-xs text-slate-400">
              前置硬规则触发，未进入生成
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-white p-3 text-sm leading-relaxed text-slate-800">
          {risk?.message}
        </div>

        {risk && (
          <div className="mt-3 flex flex-wrap gap-2">
            {risk.items.map((it) => (
              <span
                key={it}
                className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-600"
              >
                冲突项：{it}
              </span>
            ))}
            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-600">
              严重程度：{SEVERITY_LABEL[risk.level]}
            </span>
          </div>
        )}

        <div className="mt-3 rounded-lg bg-white/60 px-3 py-2 text-xs leading-relaxed text-slate-500">
          ⚠ 本提示基于档案中的过敏 / 禁忌信息自动触发，不构成医疗诊断。严重过敏史请遵医嘱。
        </div>

        <button
          onClick={() => navigate({ name: 'profiles' })}
          className="mt-3 w-full rounded-xl border border-red-200 bg-white py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          修改档案
        </button>
      </div>
    )
  }

  const r = response.result
  if (!r) return null

  // Agent 在无关模式下会返回空对象 {}，必须判内容而非判存在，
  // 否则 Object.entries(undefined) 会抛错导致整页白屏
  const nut = r.nutrition
  const hasNutrition =
    (nut?.ingredients?.length ?? 0) > 0 ||
    Object.keys(nut?.labels ?? {}).length > 0 ||
    (nut?.riskItems?.length ?? 0) > 0

  const advice = normalizeAdvice(r.advice)
  // 有 key/warn 级建议时才改标题措辞，普通建议保持原样
  const hasEmphasis = advice.some((a) => a.level !== 'normal')
  const allSuitable = (r.dishes?.length ?? 0) > 0 && r.dishes!.every((d) => d.suitable)

  return (
    <div className="space-y-3">
      {/* 一句话结论：由 Agent 按本次答案提炼，是用户最先该看的东西 */}
      {r.highlight && (
        <div className="flex items-start gap-2.5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/80 p-4">
          <span className="text-lg leading-none">🎯</span>
          <div className="text-sm font-semibold leading-relaxed text-emerald-900">
            {r.highlight}
          </div>
        </div>
      )}
      {r.ingredients && r.ingredients.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
            <span>🥦</span> 识别到的食材
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
              {MODE_LABEL[r.mode]}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {r.ingredients.map((it) => (
              <span
                key={it.name}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600"
              >
                {it.name} · {it.category}
              </span>
            ))}
          </div>
        </div>
      )}

      {r.dishes && r.dishes.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
            <span>🍽</span> {r.title || '推荐'}
            {allSuitable ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                全部适合当前档案
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                含慎选项
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            {r.dishes.map((d, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">
                    {d.name}
                  </span>
                  {d.suitable ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      推荐
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                      慎选
                    </span>
                  )}
                </div>
                {d.reason && (
                  <div className="mt-1.5 text-xs text-slate-500">{d.reason}</div>
                )}
                {d.recipe && d.recipe.length > 0 && (
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    {d.recipe.map((s, j) => (
                      <div key={j}>
                        <span className="font-semibold text-emerald-700">
                          {NUM[j] ?? `${j + 1}.`}
                        </span>{' '}
                        {s}
                      </div>
                    ))}
                  </div>
                )}
                {d.healthModification && (
                  <div className="mt-1.5 text-xs text-slate-600">
                    <span className="font-semibold text-emerald-700">
                      健康改良：
                    </span>
                    {d.healthModification}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {nut && hasNutrition && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
            <span>🏷</span> 营养标签
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600">
              {MODE_LABEL[r.mode]}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(nut.ingredients ?? []).map((it) => (
              <span
                key={it}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
              >
                {it}
              </span>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {Object.entries(nut.labels ?? {}).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-50 p-2.5 text-center">
                <div className="text-xs text-slate-400">{k}</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-700">
                  {v}
                </div>
              </div>
            ))}
          </div>
          {nut.riskItems && nut.riskItems.length > 0 && (
            <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⚠ 风险项：{nut.riskItems.join('、')}
            </div>
          )}
        </div>
      )}

      {advice.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2.5 text-sm font-bold text-slate-800">
            {hasEmphasis ? '🎯 关键建议' : '💡 进食建议'}
          </div>
          <ul className="space-y-1 text-sm leading-relaxed">
            {advice.map((a, i) => (
              <li
                key={i}
                className={`flex gap-2 rounded-lg px-2 py-1.5 ${
                  a.level === 'warn'
                    ? 'bg-red-50 font-medium text-red-700'
                    : a.level === 'key'
                      ? 'bg-emerald-50 font-semibold text-emerald-900'
                      : 'text-slate-600'
                }`}
              >
                <span className="shrink-0">
                  {a.level === 'warn' ? '⚠' : a.level === 'key' ? '●' : '✓'}
                </span>
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.disclaimer && (
        <div className="rounded-lg bg-slate-200/60 px-3 py-2.5 text-xs leading-relaxed text-slate-500">
          ⚠ {r.disclaimer}
        </div>
      )}
    </div>
  )
}

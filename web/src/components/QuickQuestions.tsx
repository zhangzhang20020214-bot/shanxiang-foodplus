import { useState } from 'react'
import type {
  HealthRestriction,
  Profile,
  Severity,
  SpecialStage,
} from '../types'
import { STAGE_LABEL } from '../types'
import { nowIso, uid } from '../utils'

const TABOOS = ['花生', '海鲜', '乳制品', '蛋类', '麸质', '辛辣', '酒精']
const STAGES: SpecialStage[] = ['pregnancy', 'elderly', 'child', 'recovery']
const DISEASES = ['高血压', '糖尿病', '高血脂', '痛风', '肾病', '冠心病']

export interface QuickAnswers {
  taboos: string[]
  stages: SpecialStage[]
  diseases: string[]
  notes?: string[]
}

// 用问卷答案拼一个「临时档案」，仅用于本次分析，不写入档案库
export function buildQuickProfile(answers: QuickAnswers): Profile {
  const restrictions: HealthRestriction[] = [
    ...answers.taboos.map((item) => ({
      type: 'taboo' as const,
      item,
      severity: 'medium' as Severity,
    })),
    ...answers.diseases.map((item) => ({
      type: 'disease' as const,
      item,
      severity: 'medium' as Severity,
    })),
  ]
  return {
    id: uid(),
    name: '临时档案',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    basicInfo: { age: 0, gender: 'other', heightCm: 0, weightKg: 0 },
    specialStage: answers.stages,
    healthGoals: [],
    specialNutrition: [],
    dietaryPreferences: [],
    healthRestrictions: restrictions,
    ...(answers.notes && answers.notes.length ? { notes: answers.notes } : {}),
  }
}

interface GroupState<T extends string> {
  selected: T[]
  custom: string
  none: boolean
  toggleNone: () => void
  toggleOption: (v: T) => void
  changeCustom: (v: string) => void
}

function useSelectGroup<T extends string>(initial: T[] = []): GroupState<T> {
  const [selected, setSelected] = useState<T[]>(initial)
  const [custom, setCustom] = useState('')
  const [none, setNone] = useState(false)

  const toggleNone = () => {
    if (!none) {
      setSelected([])
      setCustom('')
    }
    setNone(!none)
  }
  const toggleOption = (v: T) => {
    setNone(false)
    setSelected((list) =>
      list.includes(v) ? list.filter((x) => x !== v) : [...list, v],
    )
  }
  const changeCustom = (v: string) => {
    setNone(false)
    setCustom(v)
  }

  return { selected, custom, none, toggleNone, toggleOption, changeCustom }
}

export default function QuickQuestions({
  onSubmit,
  onSkip,
}: {
  onSubmit: (a: QuickAnswers) => void
  onSkip: () => void
}) {
  const taboo = useSelectGroup<string>()
  const stage = useSelectGroup<SpecialStage>()
  const disease = useSelectGroup<string>()
  const [customOther, setCustomOther] = useState('')

  const submit = () => {
    const notes = [
      taboo.custom.trim() ? `忌口：${taboo.custom.trim()}` : '',
      stage.custom.trim() ? `特殊阶段：${stage.custom.trim()}` : '',
      disease.custom.trim() ? `慢性病：${disease.custom.trim()}` : '',
      customOther.trim() ? `其他：${customOther.trim()}` : '',
    ].filter(Boolean)

    onSubmit({
      taboos: taboo.none ? [] : taboo.selected,
      stages: stage.none ? [] : stage.selected,
      diseases: disease.none ? [] : disease.selected,
      notes,
    })
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-4">
      <div className="mb-1 text-sm font-bold text-slate-800">
        👋 补充一点信息，让建议更贴合你
      </div>
      <div className="mb-3 text-xs text-slate-400">
        均可跳过，不影响分析；创建健康档案可获更精准推荐。
      </div>

      <SelectGroup
        label="是否有忌口 / 过敏？"
        options={TABOOS}
        group={taboo}
        customPlaceholder="其他忌口，如：芒果（可选）"
      />

      <SelectGroup
        label="是否处于特殊阶段？"
        options={STAGES}
        group={stage}
        labelMap={STAGE_LABEL}
        customPlaceholder="其他特殊阶段，如：哺乳期（可选）"
      />

      <SelectGroup
        label="是否有慢性病？"
        options={DISEASES}
        group={disease}
        customPlaceholder="其他慢性病，如：甲亢（可选）"
      />

      <div className="mb-3">
        <div className="mb-1.5 text-xs font-semibold text-slate-500">
          其他情况（可选）
        </div>
        <input
          value={customOther}
          onChange={(e) => setCustomOther(e.target.value)}
          placeholder="其他需要说明的情况，如：术后恢复、正在服药等"
          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none transition focus:border-emerald-400"
        />
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={submit}
          className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          开始分析
        </button>
        <button
          onClick={onSkip}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
        >
          跳过
        </button>
      </div>
    </div>
  )
}

function SelectGroup<T extends string>({
  label,
  options,
  group,
  customPlaceholder,
  labelMap,
}: {
  label: string
  options: T[]
  group: GroupState<T>
  customPlaceholder: string
  labelMap?: Record<T, string>
}) {
  const { selected, custom, none, toggleNone, toggleOption, changeCustom } = group
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-xs font-semibold text-slate-500">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={toggleNone}
          className={`rounded-full px-3 py-1 text-xs transition ${
            none
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          无
        </button>
        {options.map((o) => {
          const on = selected.includes(o)
          const text = labelMap ? labelMap[o] : o
          return (
            <button
              key={o}
              onClick={() => toggleOption(o)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                on
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              } ${none ? 'pointer-events-none opacity-40' : ''}`}
            >
              {text}
            </button>
          )
        })}
      </div>
      <input
        value={custom}
        onChange={(e) => changeCustom(e.target.value)}
        placeholder={customPlaceholder}
        className={`mt-2 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none transition focus:border-emerald-400 ${
          none ? 'pointer-events-none opacity-40' : ''
        }`}
      />
    </div>
  )
}

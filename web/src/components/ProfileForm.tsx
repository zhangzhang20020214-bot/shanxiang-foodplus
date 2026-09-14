import { useState, type ReactNode } from 'react'
import type {
  Gender,
  HealthGoal,
  HealthRestriction,
  Profile,
  RestrictionType,
  Severity,
  SpecialStage,
} from '../types'
import {
  GOAL_LABEL,
  RESTRICTION_TYPE_LABEL,
  SEVERITY_LABEL,
  STAGE_LABEL,
} from '../types'
import type { ProfileInput } from '../store/profiles'

const STAGES: SpecialStage[] = ['pregnancy', 'elderly', 'child', 'recovery']
const GOALS: HealthGoal[] = [
  'sugar_control',
  'oil_control',
  'salt_control',
  'balanced',
  'body_management',
]
const RESTRICTION_TYPES: RestrictionType[] = ['allergy', 'disease', 'drug', 'taboo']
const SEVERITIES: Severity[] = ['high', 'medium', 'low']
const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'other', label: '其他' },
]

const TYPE_BADGE: Record<RestrictionType, string> = {
  allergy: 'bg-red-100 text-red-600',
  disease: 'bg-amber-100 text-amber-700',
  drug: 'bg-blue-100 text-blue-600',
  taboo: 'bg-violet-100 text-violet-600',
}

const SEV_BADGE: Record<Severity, string> = {
  high: 'bg-red-100 text-red-600',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-500',
}

// 从 notes 里反解出「其他」自由文本（用于编辑回填）
function extractNote(notes: string[] | undefined, prefix: string): string {
  return notes?.find((n) => n.startsWith(prefix))?.slice(prefix.length) ?? ''
}

interface Props {
  initial?: Profile
  onSubmit: (input: ProfileInput) => void
  onCancel: () => void
}

export default function ProfileForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [age, setAge] = useState(initial ? String(initial.basicInfo.age) : '')
  const [gender, setGender] = useState<Gender>(initial?.basicInfo.gender ?? 'male')
  const [heightCm, setHeightCm] = useState(
    initial ? String(initial.basicInfo.heightCm) : '',
  )
  const [weightKg, setWeightKg] = useState(
    initial ? String(initial.basicInfo.weightKg) : '',
  )
  const [stages, setStages] = useState<SpecialStage[]>(initial?.specialStage ?? [])
  const [stageNone, setStageNone] = useState(false)
  const [stageCustom, setStageCustom] = useState(
    extractNote(initial?.notes, '特殊阶段：'),
  )
  const [goals, setGoals] = useState<HealthGoal[]>(initial?.healthGoals ?? [])
  const [goalNone, setGoalNone] = useState(false)
  const [goalCustom, setGoalCustom] = useState(
    extractNote(initial?.notes, '健康目标：'),
  )
  const [nutrition, setNutrition] = useState<string[]>(initial?.specialNutrition ?? [])
  const [preferences, setPreferences] = useState<string[]>(
    initial?.dietaryPreferences ?? [],
  )
  const [restrictions, setRestrictions] = useState<HealthRestriction[]>(
    initial?.healthRestrictions ?? [],
  )

  const toggle = <T,>(list: T[], setList: (v: T[]) => void, value: T) =>
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value])

  const toggleStage = (s: SpecialStage) => {
    setStageNone(false)
    toggle(stages, setStages, s)
  }
  const toggleGoal = (g: HealthGoal) => {
    setGoalNone(false)
    toggle(goals, setGoals, g)
  }
  const toggleStageNone = () => {
    if (!stageNone) {
      setStages([])
      setStageCustom('')
    }
    setStageNone(!stageNone)
  }
  const toggleGoalNone = () => {
    if (!goalNone) {
      setGoals([])
      setGoalCustom('')
    }
    setGoalNone(!goalNone)
  }

  const submit = () => {
    if (!name.trim()) {
      alert('请填写档案名称')
      return
    }
    // 「其他」自由文本并入 notes，同时保留档案里其它已有的备注
    const keptNotes = (initial?.notes ?? []).filter(
      (n) => !n.startsWith('特殊阶段：') && !n.startsWith('健康目标：'),
    )
    const notes = [
      stageCustom.trim() ? `特殊阶段：${stageCustom.trim()}` : '',
      goalCustom.trim() ? `健康目标：${goalCustom.trim()}` : '',
      ...keptNotes,
    ].filter(Boolean)
    onSubmit({
      name: name.trim(),
      basicInfo: {
        age: Number(age) || 0,
        gender,
        heightCm: Number(heightCm) || 0,
        weightKg: Number(weightKg) || 0,
      },
      specialStage: stageNone ? [] : stages,
      healthGoals: goalNone ? [] : goals,
      specialNutrition: nutrition,
      dietaryPreferences: preferences,
      healthRestrictions: restrictions,
      ...(notes.length ? { notes } : {}),
    })
  }

  const addRestriction = () =>
    setRestrictions((prev) => [
      ...prev,
      { type: 'allergy', item: '', severity: 'high' },
    ])

  const updateRestriction = (i: number, patch: Partial<HealthRestriction>) =>
    setRestrictions((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    )

  return (
    <div className="space-y-3">
      {/* 档案昵称 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <label className="mb-1.5 block text-xs font-semibold text-slate-500">
          档案昵称
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="如：爸爸的档案"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:bg-white"
        />
      </div>

      {/* ① 基础信息 */}
      <Section num="①" title="基础信息">
        <div className="grid grid-cols-2 gap-3">
          <Field label="年龄">
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="岁"
              className={inputCls}
            />
          </Field>
          <Field label="性别">
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className={inputCls}
            >
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="身高 cm">
            <input
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="cm"
              className={inputCls}
            />
          </Field>
          <Field label="体重 kg">
            <input
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="kg"
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      {/* ② 特殊阶段 */}
      <Section num="②" title="特殊阶段（可多选）">
        <SelectGroup
          options={STAGES}
          selected={stages}
          onToggle={toggleStage}
          label={STAGE_LABEL}
          none={stageNone}
          onToggleNone={toggleStageNone}
          custom={stageCustom}
          onChangeCustom={(v) => {
            setStageNone(false)
            setStageCustom(v)
          }}
          customPlaceholder="其他特殊阶段，如：哺乳期（可选）"
        />
      </Section>

      {/* ③ 健康目标 */}
      <Section num="③" title="健康目标（可多选）">
        <SelectGroup
          options={GOALS}
          selected={goals}
          onToggle={toggleGoal}
          label={GOAL_LABEL}
          none={goalNone}
          onToggleNone={toggleGoalNone}
          custom={goalCustom}
          onChangeCustom={(v) => {
            setGoalNone(false)
            setGoalCustom(v)
          }}
          customPlaceholder="其他健康目标，如：增肌（可选）"
        />
      </Section>

      {/* ④ 特殊营养 / ⑤ 饮食偏好 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Section num="④" title="特殊营养">
          <TagInput
            tags={nutrition}
            onAdd={(t) => setNutrition((p) => [...p, t])}
            onRemove={(t) => setNutrition((p) => p.filter((x) => x !== t))}
            placeholder="如：钙"
          />
        </Section>
        <Section num="⑤" title="饮食偏好">
          <TagInput
            tags={preferences}
            onAdd={(t) => setPreferences((p) => [...p, t])}
            onRemove={(t) => setPreferences((p) => p.filter((x) => x !== t))}
            placeholder="如：清淡"
          />
        </Section>
      </div>

      {/* ⑥ 健康限制 / 禁忌 */}
      <Section num="⑥" title="健康限制 / 禁忌" danger>
        {restrictions.length === 0 && (
          <p className="mb-2 text-xs text-slate-400">
            可留空；点「添加限制」补充过敏、疾病、用药、禁忌等
          </p>
        )}
        {restrictions.map((r, i) => (
          <div
            key={i}
            className={`mb-2 rounded-xl border p-2.5 ${
              r.severity === 'high'
                ? 'border-red-200 bg-red-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <select
                value={r.type}
                onChange={(e) =>
                  updateRestriction(i, { type: e.target.value as RestrictionType })
                }
                className={`rounded-lg px-2 py-1.5 text-xs font-medium outline-none ${TYPE_BADGE[r.type]}`}
              >
                {RESTRICTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {RESTRICTION_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
              <input
                value={r.item}
                onChange={(e) => updateRestriction(i, { item: e.target.value })}
                placeholder="如：花生"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-red-300"
              />
              <select
                value={r.severity}
                onChange={(e) =>
                  updateRestriction(i, { severity: e.target.value as Severity })
                }
                className={`rounded-lg px-2 py-1.5 text-xs font-medium outline-none ${SEV_BADGE[r.severity]}`}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {SEVERITY_LABEL[s]}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  setRestrictions((p) => p.filter((_, idx) => idx !== i))
                }
                className="text-slate-300 transition hover:text-red-500"
                aria-label="删除限制"
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={addRestriction}
          className="mt-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
        >
          ＋ 添加限制
        </button>
      </Section>

      {/* 操作 */}
      <div className="flex gap-2 pb-2">
        <button
          onClick={submit}
          className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          保存
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50"
        >
          取消
        </button>
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400'

function Section({
  num,
  title,
  danger,
  children,
}: {
  num: string
  title: string
  danger?: boolean
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3
        className={`mb-3 text-sm font-bold ${danger ? 'text-red-600' : 'text-emerald-700'}`}
      >
        {num} {title}
      </h3>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-400">{label}</label>
      {children}
    </div>
  )
}

function SelectGroup<T extends string>({
  options,
  selected,
  onToggle,
  label,
  none,
  onToggleNone,
  custom,
  onChangeCustom,
  customPlaceholder,
}: {
  options: T[]
  selected: T[]
  onToggle: (v: T) => void
  label: Record<T, string>
  none: boolean
  onToggleNone: () => void
  custom: string
  onChangeCustom: (v: string) => void
  customPlaceholder: string
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onToggleNone}
          className={`rounded-full px-3.5 py-1.5 text-sm transition ${
            none
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          无
        </button>
        {options.map((o) => {
          const on = selected.includes(o)
          return (
            <button
              key={o}
              onClick={() => onToggle(o)}
              className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                on
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              } ${none ? 'pointer-events-none opacity-40' : ''}`}
            >
              {label[o]}
            </button>
          )
        })}
      </div>
      <input
        value={custom}
        onChange={(e) => onChangeCustom(e.target.value)}
        placeholder={customPlaceholder}
        className={`mt-2 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none transition focus:border-emerald-400 ${
          none ? 'pointer-events-none opacity-40' : ''
        }`}
      />
    </div>
  )
}

function TagInput({
  tags,
  onAdd,
  onRemove,
  placeholder,
}: {
  tags: string[]
  onAdd: (t: string) => void
  onRemove: (t: string) => void
  placeholder?: string
}) {
  const [v, setV] = useState('')
  const add = () => {
    const t = v.trim()
    if (t && !tags.includes(t)) onAdd(t)
    setV('')
  }
  return (
    <div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700"
            >
              {t}
              <button
                onClick={() => onRemove(t)}
                className="text-emerald-400 transition hover:text-red-500"
                aria-label={`移除 ${t}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 flex gap-1.5">
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none transition focus:border-emerald-400"
        />
        <button
          onClick={add}
          className="shrink-0 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
        >
          ＋ 添加
        </button>
      </div>
      {tags.length === 0 && (
        <p className="mt-1.5 text-xs text-slate-400">
          可留空；输入内容后点「添加」或按回车加入
        </p>
      )}
    </div>
  )
}

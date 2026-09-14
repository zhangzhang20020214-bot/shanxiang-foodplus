import type { Profile } from '../types'
import { GENDER_LABEL, GOAL_LABEL, STAGE_LABEL } from '../types'

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-pink-500',
  'bg-blue-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
]

interface Props {
  profile: Profile
  active: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function ProfileCard({
  profile,
  active,
  onSelect,
  onEdit,
  onDelete,
}: Props) {
  const b = profile.basicInfo
  const tags = [
    ...profile.healthGoals.map((g) => GOAL_LABEL[g]),
    ...profile.specialStage.map((s) => STAGE_LABEL[s]),
    ...profile.healthRestrictions.map((r) =>
      r.type === 'allergy' ? `${r.item}过敏` : r.item,
    ),
  ]
  const avatarColor =
    AVATAR_COLORS[(profile.name.charCodeAt(0) || 0) % AVATAR_COLORS.length]

  return (
    <div
      onClick={onSelect}
      className={`w-full cursor-pointer rounded-2xl border-2 p-4 transition ${
        active
          ? 'border-emerald-500 bg-emerald-50'
          : 'border-slate-200 bg-white hover:border-emerald-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor}`}
        >
          {profile.name.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-slate-800">
              {profile.name}
            </span>
            {active && (
              <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">
                当前使用中
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            {b.age || '—'} 岁 · {GENDER_LABEL[b.gender]} · {b.heightCm || '—'}cm
            / {b.weightKg || '—'}kg
          </div>
        </div>
        {active && <span className="shrink-0 text-xl text-emerald-600">✓</span>}
      </div>

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div
        className="mt-3 flex gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onEdit}
          className="flex-1 rounded-xl border border-slate-200 bg-white py-1.5 text-xs text-slate-600 transition hover:bg-slate-50"
        >
          编辑
        </button>
        <button
          onClick={() => {
            if (window.confirm(`确认删除档案「${profile.name}」？`)) onDelete()
          }}
          className="flex-1 rounded-xl border border-red-200 bg-white py-1.5 text-xs text-red-500 transition hover:bg-red-50"
        >
          删除
        </button>
      </div>
    </div>
  )
}

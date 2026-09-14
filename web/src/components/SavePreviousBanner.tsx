import type { HistoryItem } from '../types'
import { RESTRICTION_TYPE_LABEL } from '../types'
import { useHistory } from '../store/history'
import { useProfiles, type ProfileInput } from '../store/profiles'
import { newInfoFrom } from '../utils/extract'

export default function SavePreviousBanner({ item }: { item: HistoryItem }) {
  const { markOffered } = useHistory()
  const { currentProfile, addProfile, updateProfile } = useProfiles()
  const info = newInfoFrom(item, currentProfile)

  const dismiss = () => markOffered(item.id)

  const save = () => {
    if (currentProfile) {
      const patch: Partial<ProfileInput> = {}
      if (info.restrictions.length)
        patch.healthRestrictions = [...currentProfile.healthRestrictions, ...info.restrictions]
      if (info.notes.length)
        patch.notes = [...(currentProfile.notes ?? []), ...info.notes]
      if (Object.keys(patch).length) updateProfile(currentProfile.id, patch)
    } else {
      addProfile({
        name: '我的档案',
        basicInfo: { age: 0, gender: 'other', heightCm: 0, weightKg: 0 },
        specialStage: [],
        healthGoals: [],
        specialNutrition: [],
        dietaryPreferences: [],
        healthRestrictions: info.restrictions,
        ...(info.notes.length ? { notes: info.notes } : {}),
      })
    }
    dismiss()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={dismiss} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="text-base font-bold text-slate-800">
          保存上次会话的健康信息？
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
          从上次对话中识别到以下信息，可保存到你的健康档案：
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {info.restrictions.map((r) => (
            <span
              key={r.type + r.item}
              className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
            >
              {RESTRICTION_TYPE_LABEL[r.type]} · {r.item}
            </span>
          ))}
          {info.notes.map((n) => (
            <span
              key={n}
              className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
            >
              {n}
            </span>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={dismiss}
            className="rounded-lg px-3.5 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
          >
            忽略
          </button>
          <button
            onClick={save}
            className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            保存到档案
          </button>
        </div>
      </div>
    </div>
  )
}

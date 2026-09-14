import { useProfiles } from '../store/profiles'
import { useNav } from '../store/nav'
import ProfileCard from '../components/ProfileCard'

export default function Profiles() {
  const { profiles, currentProfile, setCurrentProfileId, deleteProfile } =
    useProfiles()
  const { navigate } = useNav()

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">健康档案</h2>
          <button
            onClick={() => navigate({ name: 'profileEdit', id: 'new' })}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            ＋ 新建
          </button>
        </div>
        <p className="mb-4 text-xs text-slate-400">
          共 {profiles.length} 份档案 · 切换后全局生效
        </p>

        {profiles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
            暂无档案，点击右上角「＋ 新建」创建第一份
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map((p) => (
              <ProfileCard
                key={p.id}
                profile={p}
                active={p.id === currentProfile?.id}
                onSelect={() => setCurrentProfileId(p.id)}
                onEdit={() => navigate({ name: 'profileEdit', id: p.id })}
                onDelete={() => deleteProfile(p.id)}
              />
            ))}
            <button
              onClick={() => navigate({ name: 'profileEdit', id: 'new' })}
              className="flex w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 py-4 text-sm text-slate-400 transition hover:border-emerald-400 hover:text-emerald-600"
            >
              ＋ 为家人 / 朋友新建档案
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

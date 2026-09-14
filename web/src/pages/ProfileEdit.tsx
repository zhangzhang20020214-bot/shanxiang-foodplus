import { useProfiles, type ProfileInput } from '../store/profiles'
import { useNav } from '../store/nav'
import ProfileForm from '../components/ProfileForm'

export default function ProfileEdit({ id }: { id: string }) {
  const { profiles, addProfile, updateProfile } = useProfiles()
  const { navigate } = useNav()
  const existing = id === 'new' ? undefined : profiles.find((p) => p.id === id)

  const handleSubmit = (input: ProfileInput) => {
    if (existing) updateProfile(existing.id, input)
    else addProfile(input)
    navigate({ name: 'profiles' })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl p-4">
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => navigate({ name: 'profiles' })}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
            aria-label="返回"
          >
            ←
          </button>
          <h2 className="text-lg font-bold text-slate-800">
            {existing ? '编辑档案' : '新建档案'}
          </h2>
        </div>
        <ProfileForm
          initial={existing}
          onSubmit={handleSubmit}
          onCancel={() => navigate({ name: 'profiles' })}
        />
      </div>
    </div>
  )
}

import { useProfiles } from '../store/profiles'
import { useNav } from '../store/nav'
import { GearIcon, UserIcon } from './icons'

export default function TopBar({
  onToggleHistory,
}: {
  onToggleHistory: () => void
}) {
  const { currentProfile } = useProfiles()
  const { view, navigate } = useNav()

  const isHome = view.name === 'home'
  const onProfiles = view.name === 'profiles'
  const onMe = view.name === 'me'

  const goHome = () => navigate({ name: 'home' })

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:px-4">
      {isHome ? (
        <button
          onClick={onToggleHistory}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          aria-label="展开或收起历史记录"
          title="历史记录"
        >
          ☰
        </button>
      ) : (
        <button
          onClick={goHome}
          className="flex h-9 shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 text-slate-600 transition hover:bg-slate-200"
          aria-label="返回首页"
          title="返回首页"
        >
          <span>←</span>
          <span className="text-sm">首页</span>
        </button>
      )}

      <button onClick={goHome} className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-base font-bold text-white">
          膳
        </span>
        <span className="text-base font-extrabold text-emerald-700">膳享+</span>
      </button>

      <div className="flex-1" />

      {/* 当前档案 pill：点击进入档案，再点返回首页 */}
      <button
        onClick={() => navigate(onProfiles ? { name: 'home' } : { name: 'profiles' })}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
          onProfiles
            ? 'border-emerald-500 bg-emerald-600 text-white'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        }`}
        title={onProfiles ? '返回首页' : '切换健康档案'}
      >
        <UserIcon className="h-4 w-4" />
        <span className="max-w-[160px] truncate">
          {onProfiles
            ? '健康档案'
            : `当前档案：${currentProfile ? currentProfile.name : '未设置'}`}
        </span>
        <span className="text-[10px]">{onProfiles ? '▴' : '▾'}</span>
      </button>

      {/* 设置：点击进入，再点返回首页 */}
      <button
        onClick={() => navigate(onMe ? { name: 'home' } : { name: 'me' })}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
          onMe
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
        aria-label="设置"
        title={onMe ? '返回首页' : '个人中心'}
      >
        <GearIcon className="h-5 w-5" />
      </button>
    </header>
  )
}

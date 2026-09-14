import { useProfiles } from '../store/profiles'
import { useNav } from '../store/nav'

export default function Me() {
  const { profiles, currentProfile } = useProfiles()
  const { navigate } = useNav()

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-5 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-xl font-bold">
              膳
            </span>
            <div>
              <div className="text-base font-bold">膳享+ 用户</div>
              <div className="mt-0.5 text-xs opacity-80">
                已绑定 {profiles.length} 份健康档案
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <Row icon="📝" label="昵称" value="膳享+ 用户" />
          <Row
            icon="👤"
            label="默认档案"
            value={currentProfile?.name ?? '未设置'}
            onClick={() => navigate({ name: 'profiles' })}
          />
          <Row icon="🔔" label="通知偏好" value="已开启" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <Row icon="📜" label="用户协议" />
          <Row icon="ℹ️" label="关于膳享+" value="v1.0.0" />
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 text-sm font-bold text-amber-800">
            ⚠ 免责声明
          </div>
          <div className="space-y-1 text-xs leading-relaxed text-amber-900/70">
            <p>
              1. 膳享+ 提供的所有饮食建议均基于您填写的健康档案与公开膳食指南，仅供日常饮食参考，
              <b>不构成任何医疗诊断、治疗方案或用药建议</b>。
            </p>
            <p>
              2.
              如您正在接受疾病治疗、处于特殊生理阶段（孕期 / 术后康复等），或有严重过敏史，请在使用前咨询专业医生或注册营养师。
            </p>
            <p>
              3.
              图像识别结果可能存在误差，请结合实际食物判断；系统不对因使用本建议而产生的任何后果承担责任。
            </p>
            <p>
              4.
              您的健康档案仅存储于本设备浏览器本地，我们不会上传或用于其他用途。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({
  icon,
  label,
  value,
  onClick,
}: {
  icon: string
  label: string
  value?: string
  onClick?: () => void
}) {
  const cls =
    'flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3.5 text-left last:border-0'
  const inner = (
    <>
      <span className="text-base">{icon}</span>
      <span className="text-sm text-slate-700">{label}</span>
      <span className="flex-1" />
      <span className="text-xs text-slate-400">{value ?? '›'}</span>
    </>
  )
  return onClick ? (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  )
}

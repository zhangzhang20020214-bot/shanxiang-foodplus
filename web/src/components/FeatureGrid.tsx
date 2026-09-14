import type { Mode } from '../types'
import { MODE_COLOR, MODE_DESC, MODE_ICON, MODE_LABEL } from '../types'

const MODES: Mode[] = ['fridge', 'plate', 'dish', 'menu', 'ingredient']

export default function FeatureGrid({
  active,
  onSelect,
}: {
  active: Mode | null
  onSelect: (m: Mode) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {MODES.map((m) => {
        const selected = active === m
        return (
          <button
            key={m}
            onClick={() => onSelect(m)}
            className={`flex flex-col items-center rounded-xl border p-4 text-center transition ${
              m === 'ingredient' ? 'col-span-2 sm:col-span-1' : ''
            } ${
              selected
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-200 bg-white hover:border-emerald-300'
            }`}
          >
            <span
              className={`mb-2 flex h-11 w-11 items-center justify-center rounded-xl text-2xl ${MODE_COLOR[m]}`}
            >
              {MODE_ICON[m]}
            </span>
            <span className="text-sm font-semibold text-slate-800">
              {MODE_LABEL[m]}
            </span>
            <span className="mt-1 text-xs text-slate-400">{MODE_DESC[m]}</span>
          </button>
        )
      })}
    </div>
  )
}

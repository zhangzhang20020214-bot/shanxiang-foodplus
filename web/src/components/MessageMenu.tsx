import { useEffect, useRef, type CSSProperties } from 'react'

export interface MenuAction {
  label: string
  danger?: boolean
  onClick: () => void
}

export default function MessageMenu({
  x,
  y,
  actions,
  onClose,
}: {
  x: number
  y: number
  actions: MenuAction[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const style: CSSProperties = {
    left: Math.min(x, window.innerWidth - 160),
    top: Math.min(y, window.innerHeight - actions.length * 40 - 16),
  }

  return (
    <div
      ref={ref}
      style={style}
      className="fixed z-50 min-w-[140px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
    >
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={() => {
            a.onClick()
            onClose()
          }}
          className={`flex w-full items-center px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
            a.danger ? 'text-red-600' : 'text-slate-700'
          }`}
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}

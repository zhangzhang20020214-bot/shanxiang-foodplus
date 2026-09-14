import { useEffect, useState } from 'react'

// 缩略图 + 点击放大。
// 用户拍完/传完必须能自己确认「拍清楚了没」，否则只能盲发。
export default function ImagePreview({
  src,
  className = 'h-14 w-14 rounded-lg object-cover',
  alt = '图片',
}: {
  src: string
  className?: string
  alt?: string
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block cursor-zoom-in"
        aria-label="查看大图"
        title="点击看大图"
      >
        <img src={src} className={className} alt={alt} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-label="图片预览"
        >
          <img
            src={src}
            className="max-h-full max-w-full rounded-lg object-contain"
            alt={alt}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg text-white transition hover:bg-white/30"
            aria-label="关闭预览"
          >
            ✕
          </button>
          <div className="pointer-events-none absolute bottom-5 left-0 right-0 text-center text-xs text-white/50">
            点击空白处或按 Esc 关闭
          </div>
        </div>
      )}
    </>
  )
}

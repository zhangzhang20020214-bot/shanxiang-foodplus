import { useEffect, useRef, useState } from 'react'
import { CameraIcon, ImageIcon } from './icons'

// 点击「拍冰箱 / 拍餐盘 / 看菜单 / 读配料」等快捷入口时，直接拉起相机；
// 也支持从相册读取图片作为兜底
export default function CameraModal({
  open,
  onCapture,
  onClose,
}: {
  open: boolean
  onCapture: (dataUrl: string) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError(null)

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => {})
        }
      } catch {
        if (!cancelled) {
          setError('无法访问相机，请检查权限，或改用「相册」读取图片')
        }
      }
    }

    start()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [open])

  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    onCapture(canvas.toDataURL('image/jpeg', 0.9))
  }

  const onGalleryFile = (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => onCapture(String(reader.result))
    reader.readAsDataURL(f)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-black">
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            onGalleryFile(e.target.files)
            e.target.value = ''
          }}
        />
        {error ? (
          <div className="p-6 text-center text-sm text-white">{error}</div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full bg-black"
          />
        )}
        <div className="flex items-center justify-center gap-3 p-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-white/20 px-4 py-2 text-sm text-white transition hover:bg-white/30"
          >
            取消
          </button>
          <button
            onClick={() => galleryRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-sm text-white transition hover:bg-white/30"
          >
            <ImageIcon className="h-4 w-4" /> 相册
          </button>
          <button
            onClick={capture}
            disabled={!!error}
            className="flex items-center gap-1.5 rounded-xl bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:opacity-40"
          >
            <CameraIcon className="h-4 w-4" /> 拍照
          </button>
        </div>
      </div>
    </div>
  )
}

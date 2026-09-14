import { useEffect, useRef, useState } from 'react'
import { CameraIcon, ImageIcon } from './icons'
import ImagePreview from './ImagePreview'
import { MAX_IMAGES, compressImage, readAsDataUrl } from '../utils'

// 图片来源选择 + 连续拍摄 + 多选相册。
//
// 两个刻意的设计：
// 1) 弹窗打开时不申请摄像头权限——用户可能只想从相册选图，
//    提前弹权限框既没用又容易被误拒。只有进了拍照界面才 getUserMedia。
// 2) 拍完不立即返回，先攒进缩略图条，用户可以继续拍、删掉重拍，最后点「完成」。
//    拍冰箱/看菜单/读配料常常一张拍不全。
//
// skipChooser：从输入框的 📷 按钮进来时意图已明确，直接进相机不再问。
export default function CameraModal({
  open,
  skipChooser = false,
  onCapture,
  onClose,
}: {
  open: boolean
  skipChooser?: boolean
  onCapture: (dataUrls: string[]) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [view, setView] = useState<'choose' | 'camera'>('choose')
  const [shots, setShots] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // 每次打开时重置
  useEffect(() => {
    if (!open) return
    setError(null)
    setShots([])
    setView(skipChooser ? 'camera' : 'choose')
  }, [open, skipChooser])

  // 只在真正进入拍照界面时才申请摄像头；离开该界面立即释放
  useEffect(() => {
    if (!open || view !== 'camera') return
    let cancelled = false

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
  }, [open, view])

  // 直接按目标尺寸绘制到 canvas，比先拍全尺寸再压缩省一次内存拷贝
  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    setShots((prev) => [...prev, canvas.toDataURL('image/jpeg', 0.85)])
  }

  const onGalleryFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const room = MAX_IMAGES - shots.length
    if (room <= 0) return
    const picked = Array.from(files).slice(0, room)
    const raw = await Promise.all(picked.map(readAsDataUrl))
    const compressed = await Promise.all(raw.map((d) => compressImage(d)))
    setView('camera')
    setShots((prev) => [...prev, ...compressed])
  }

  if (!open) return null

  const full = shots.length >= MAX_IMAGES

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      {/* 相册选择在两种视图下都要可用（相机不可用时是唯一的兜底路径） */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          onGalleryFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {view === 'choose' ? (
        <div className="w-full max-w-sm rounded-2xl bg-white p-5">
          <div className="mb-4 text-center text-sm font-semibold text-slate-800">
            选择图片
          </div>

          {/* 拍照是默认动作，做成主按钮 */}
          <button
            onClick={() => setView('camera')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <CameraIcon className="h-5 w-5" /> 拍照
          </button>

          {/* 相册是次要路径，弱化但保持可见（相机不可用时也靠它兜底） */}
          <button
            onClick={() => galleryRef.current?.click()}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            <ImageIcon className="h-4 w-4" /> 从相册选择
          </button>

          <button
            onClick={onClose}
            className="mt-2.5 w-full rounded-xl py-2.5 text-sm text-slate-400 transition hover:bg-slate-100"
          >
            取消
          </button>
        </div>
      ) : (
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-black">
          {error ? (
            <div className="p-8 text-center text-sm text-white">{error}</div>
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full bg-black"
            />
          )}

          {shots.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-1 pt-3">
              {shots.map((s, i) => (
                <div key={i} className="relative shrink-0">
                  {/* 拍完立刻能点开确认拍清楚没，不用等发出去再看 */}
                  <ImagePreview
                    src={s}
                    alt={`第 ${i + 1} 张`}
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                  <button
                    onClick={() => setShots((p) => p.filter((_, j) => j !== i))}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs leading-none text-white"
                    aria-label="移除这张"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 p-4">
            <button
              onClick={() => setView('choose')}
              className="rounded-xl bg-white/20 px-4 py-2 text-sm text-white transition hover:bg-white/30"
            >
              返回
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => galleryRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-sm text-white transition hover:bg-white/30"
              >
                <ImageIcon className="h-4 w-4" /> 相册
              </button>
              <button
                onClick={capture}
                disabled={!!error || full}
                className="flex items-center gap-1.5 rounded-xl bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:opacity-40"
              >
                <CameraIcon className="h-4 w-4" /> 拍照
              </button>
            </div>
          </div>

          {full && (
            <div className="px-4 pb-3 text-center text-xs text-white/60">
              最多 {MAX_IMAGES} 张，可删除后重拍
            </div>
          )}

          {shots.length > 0 && (
            <button
              onClick={() => onCapture(shots)}
              className="w-full bg-emerald-600 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              完成（{shots.length} 张）
            </button>
          )}
        </div>
      )}
    </div>
  )
}

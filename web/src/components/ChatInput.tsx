import { useRef, useState } from 'react'
import { CameraIcon, ImageIcon, MicIcon, SendIcon } from './icons'

interface Props {
  loading: boolean
  text: string
  onTextChange: (v: string) => void
  onSend: (text: string, images: string[]) => void
  onCamera?: () => void
  // 引用块（豆包/GPT 式，悬浮于输入框上方，可单独关闭）
  quote?: string | null
  onClearQuote?: () => void
}

export default function ChatInput({
  loading,
  text,
  onTextChange,
  onSend,
  onCamera,
  quote,
  onClearQuote,
}: Props) {
  const [images, setImages] = useState<string[]>([])
  const [listening, setListening] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const recRef = useRef<any>(null)

  // 仅浏览器原生支持语音识别（Chrome/Edge）时显示语音按钮
  const speechSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const submit = () => {
    if (loading) return
    if (!text.trim() && images.length === 0) return
    onSend(text.trim(), images)
    onTextChange('')
    setImages([])
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files)
      .slice(0, 4)
      .forEach((f) => {
        const reader = new FileReader()
        reader.onload = () => setImages((prev) => [...prev, String(reader.result)])
        reader.readAsDataURL(f)
      })
  }

  const toggleVoice = () => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    if (listening) {
      recRef.current?.stop()
      return
    }
    const rec = new SR()
    rec.lang = 'zh-CN'
    rec.interimResults = false
    rec.continuous = false
    rec.onresult = (e: any) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? ''
      if (transcript) {
        onTextChange(text ? text + ' ' + transcript : transcript)
      }
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  return (
    <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
      <div className="mx-auto max-w-[720px]">
        {quote && (
          <div className="mb-2 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="shrink-0 text-xs font-medium text-emerald-600">
              引用
            </span>
            <span className="min-w-0 flex-1 text-xs leading-relaxed text-slate-600">
              {quote}
            </span>
            <button
              onClick={onClearQuote}
              className="shrink-0 text-slate-400 transition hover:text-slate-600"
              aria-label="取消引用"
              title="取消引用"
            >
              ✕
            </button>
          </div>
        )}
        {images.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                className="h-14 w-14 rounded-lg object-cover"
                alt="上传预览"
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1.5 pl-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={
              listening
                ? '正在聆听，请说话…'
                : '直接输入你想分析的食物、菜品或问题，也可拍照 / 上传图片…'
            }
            rows={1}
            className="max-h-32 min-h-[32px] flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-slate-400"
          />
          {speechSupported && (
            <button
              onClick={toggleVoice}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                listening
                  ? 'border-red-200 bg-red-50 text-red-500'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
              aria-label="语音输入"
              title={listening ? '停止' : '语音输入'}
            >
              <MicIcon className={`h-5 w-5 ${listening ? 'animate-pulse' : ''}`} />
            </button>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            aria-label="上传图片"
            title="上传图片"
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => onCamera?.()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            aria-label="拍照"
            title="拍照"
          >
            <CameraIcon className="h-5 w-5" />
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-50"
            aria-label="发送"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

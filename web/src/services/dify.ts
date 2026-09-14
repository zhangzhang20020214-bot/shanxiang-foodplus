import type { DifyRequest, DifyResponse } from '../types'
import { mockAnalyze } from '../mock/mockDify'

// ===== 分析服务配置 =====
// 浏览器**不直连 Dify、也不持有密钥**。
// 所有请求打到同源的 /api/dify/*，由服务端那一层注入 Authorization：
//   本地开发  → vite.config.ts 的 server.proxy
//   线上部署  → api/dify/[...path].ts（Vercel Edge Function）
// 这样密钥只存在于服务端环境变量里，构建产物中搜不到。
//
// 想跑纯静态版本（没有服务端函数时）就把 VITE_USE_MOCK 设为 'true'，
// 全部走 src/mock/mockDify.ts 的本地假数据。
const PROXY = (import.meta.env.VITE_DIFY_PROXY ?? '/api/dify').trim().replace(/\/$/, '')

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// Dify 要求上传文件与发起对话使用同一个 user，否则会报 Invalid upload file id
const USER_ID = 'foodplus-web'

export interface AnalyzeOptions {
  /** 用户点「停止」时用它中断请求 */
  signal?: AbortSignal
  /** 上一轮返回的会话 id；Dify 靠它维持多轮记忆 */
  conversationId?: string | null
}

export interface AnalyzeResult {
  response: DifyResponse
  conversationId: string | null
}

export async function analyze(
  request: DifyRequest,
  opts: AnalyzeOptions = {},
): Promise<AnalyzeResult> {
  if (USE_MOCK) {
    await delay(600, opts.signal)
    return { response: mockAnalyze(request), conversationId: opts.conversationId ?? null }
  }
  return realAnalyze(request, opts)
}

async function realAnalyze(
  request: DifyRequest,
  { signal, conversationId }: AnalyzeOptions,
): Promise<AnalyzeResult> {
  // 图片必须先上传换成 file id。Dify 的 /chat-messages 不支持 base64，
  // 只认 local_file（配合 /files/upload）或 remote_url（公网可访问地址）。
  const uploadIds = await Promise.all(
    request.input.images.map((d) => uploadImage(d, signal)),
  )

  const res = await fetch(`${PROXY}/chat-messages`, {
    method: 'POST',
    // 不带 Authorization：密钥由服务端代理注入，浏览器里根本没有它
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      inputs: {},
      // 图片不进 query：把 base64 塞进正文会让模型「看」不到图（它读到的是字符），
      // 同时按 token 计费，一张图就是几万 token。图片只走下面的 files 通道。
      // 但 images 清空后，Agent 从 JSON 里就看不出「这轮到底带没带图」，
      // 会误判成「没收到图片」。所以额外给一个 imageCount 作为权威计数。
      query: JSON.stringify({
        ...request,
        input: { ...request.input, images: [], imageCount: uploadIds.length },
      }),
      response_mode: 'blocking',
      user: USER_ID,
      conversation_id: conversationId || undefined,
      files: uploadIds.map((id) => ({
        type: 'image',
        transfer_method: 'local_file',
        upload_file_id: id,
      })),
    }),
  })

  if (!res.ok) {
    throw new Error(await describeFailure(res, '分析'))
  }

  const data = await res.json()
  // 工作流「直接回复」节点输出的是最终 JSON 字符串，落在 answer 字段
  return {
    response: parseAnswer(data.answer ?? data.outputs?.text ?? ''),
    conversationId: data.conversation_id ?? null,
  }
}

async function uploadImage(dataUrl: string, signal?: AbortSignal): Promise<string> {
  const { blob, filename } = dataUrlToBlob(dataUrl)
  const form = new FormData()
  form.append('file', blob, filename)
  form.append('user', USER_ID)

  const res = await fetch(`${PROXY}/files/upload`, {
    method: 'POST',
    // 不设 Content-Type：multipart 的 boundary 由浏览器生成，
    // 手写会覆盖掉它，服务端就解析不出文件了
    body: form,
    signal,
  })
  if (!res.ok) {
    throw new Error(await describeFailure(res, '图片上传'))
  }
  const data = await res.json()
  if (!data?.id) throw new Error('图片上传失败：接口未返回 file id')
  return data.id
}

/**
 * 把失败翻译成「看得懂、能照做」的一句话。
 * 部署漏配环境变量、静态托管缺服务端函数，这两种情况现场最容易懵，
 * 所以单独识别出来直接给出下一步动作。
 */
async function describeFailure(res: Response, what: string): Promise<string> {
  const raw = await res.text().catch(() => '')
  // 静待态托管站点上 /api/* 通常回 HTML 404，此时 raw 是一整页 HTML，截断即可
  let detail = raw.slice(0, 200)
  try {
    const j = JSON.parse(raw)
    if (j?.message) detail = [j.message, j.detail].filter(Boolean).join(' ')
  } catch {
    /* 不是 JSON，用原文 */
  }

  if (res.status === 404 || res.status === 405) {
    return `${what}失败：找不到分析服务（${res.status}）。若这是纯静态托管，请把环境变量 VITE_USE_MOCK 设为 true 重新构建；否则检查 api/dify 是否已部署。`
  }
  if (res.status === 500 && detail.includes('DIFY_APIKEY')) {
    return `${what}失败：服务端未配置 DIFY_APIKEY，请在托管平台的 Environment Variables 里添加后重新部署。`
  }
  return `${what}失败：${res.status} ${detail}`
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; filename: string } {
  const [meta, b64] = dataUrl.split(',')
  const mime = /:(.*?);/.exec(meta)?.[1] ?? 'image/jpeg'
  const binary = atob(b64 ?? '')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  return { blob: new Blob([bytes], { type: mime }), filename: `photo.${ext}` }
}

// 容错解析：Dify 的 LLM 有时会带 markdown 围栏或前后废话，这里兜一层底
function parseAnswer(raw: string): DifyResponse {
  let s = (raw || '').trim()
  if (s.startsWith('```')) {
    s = s.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '').trim()
  }
  try {
    return JSON.parse(s) as DifyResponse
  } catch {
    const m = s.match(/\{[\s\S]*\}/)
    if (m) {
      try {
        return JSON.parse(m[0]) as DifyResponse
      } catch {
        /* 落空，走下面统一报错 */
      }
    }
    throw new Error('Dify 返回内容不是合法 JSON，请检查代码节点的输出')
  }
}

// 可中断的延时，让 mock 模式下「停止」按钮同样有效
function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

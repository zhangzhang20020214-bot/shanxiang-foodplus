// Dify 反向代理（Vercel Edge Function）
//
// 存在的唯一理由：**密钥不能进浏览器**。
// Vite 会把所有 `VITE_` 前缀的变量原样内联进 dist/assets/*.js，
// 只要部署上去，任何人打开 F12 搜 `app-` 就能拿到 key 刷你的额度。
// 所以 key 只存在服务端环境变量里（不带 VITE_ 前缀），由这一层注入。
//
// 前端调用：/api/dify/chat-messages  →  https://api.dify.ai/v1/chat-messages
//          /api/dify/files/upload   →  https://api.dify.ai/v1/files/upload

export const config = { runtime: 'edge' }

const UPSTREAM = (process.env.DIFY_BASEURL || 'https://api.dify.ai/v1').replace(/\/$/, '')

// 白名单：只放通这两个端点。
// 不加白名单的话，这个函数就是一个任何人都能调用的开放代理，
// 别人可以拿它跑任意 Dify 接口、把你的额度刷光。
const ALLOWED = new Set(['/chat-messages', '/files/upload', '/messages'])

// 单次请求体上限（图片已在浏览器压到 1280px，正常远小于此值）
const MAX_BODY = 12 * 1024 * 1024

function fail(status: number, message: string, detail?: string) {
  return new Response(JSON.stringify({ error: message, detail }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

export default async function handler(req: Request): Promise<Response> {
  const key = process.env.DIFY_APIKEY
  if (!key) {
    // 部署了但忘了配环境变量时，给一句能直接照做的提示，别让前端拿到一个 500 猜半天
    return fail(
      500,
      'server_misconfigured',
      '服务端缺少 DIFY_APIKEY。请在 Vercel 项目的 Settings → Environment Variables 里添加它（不要加 VITE_ 前缀），然后重新部署。',
    )
  }

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api\/dify/, '')

  if (!ALLOWED.has(path)) {
    return fail(403, 'path_not_allowed', `只允许访问：${[...ALLOWED].join(', ')}`)
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${key}` }
  let body: ArrayBuffer | undefined

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const raw = await req.arrayBuffer()
    if (raw.byteLength > MAX_BODY) {
      return fail(413, 'payload_too_large', `请求体超过 ${MAX_BODY / 1024 / 1024}MB`)
    }
    body = raw
    // 必须原样透传 Content-Type：/files/upload 是 multipart，
    // 边界字符串藏在 Content-Type 里，丢了它上游解析不出文件
    const ct = req.headers.get('content-type')
    if (ct) headers['Content-Type'] = ct
  }

  let upstream: Response
  try {
    upstream = await fetch(`${UPSTREAM}${path}${url.search}`, {
      method: req.method,
      headers,
      body,
    })
  } catch (e) {
    return fail(502, 'upstream_unreachable', e instanceof Error ? e.message : String(e))
  }

  // 同样原样回传：Dify 的错误详情是 JSON，前端要靠它显示具体原因
  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
    },
  })
}

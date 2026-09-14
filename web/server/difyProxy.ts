// Dify 反向代理的共用逻辑，由 api/dify/ 下的两个路由文件调用。
//
// 存在的唯一理由：**密钥不能进浏览器**。
// Vite 会把所有 `VITE_` 前缀的变量原样内联进 dist/assets/*.js，
// 只要部署上去，任何人打开 F12 搜 `app-` 就能拿到 key 刷你的额度。
// 所以 key 只存在服务端环境变量里（不带 VITE_ 前缀），由这一层注入。
//
// 为什么不用 api/dify/[...path].ts 一个文件搞定：
// Vercel 的 api 目录（非 Next.js 项目）**不支持 catch-all 路由**，
// `[...path]` 会被当成字面量路径，多段路径直接 404。
// 所以拆成两个明确的端点，宁可多一个文件也不要路由玄学。

const UPSTREAM = (process.env.DIFY_BASEURL || 'https://api.dify.ai/v1').replace(/\/$/, '')

// 单次请求体上限（图片已在浏览器压到 1280px，正常远小于此值）
const MAX_BODY = 12 * 1024 * 1024

// 允许转发的路径白名单。不加白名单的话，这个函数就是一个任何人都能调用的
// 开放代理，别人可以拿它跑任意 Dify 接口、把你的额度刷光。
export const ALLOWED = new Set(['/chat-messages', '/files/upload', '/messages'])

/**
 * 清理密钥里粘贴时最容易带进来的脏东西。
 *
 * 托管平台的环境变量输入框**不会**帮你 trim：从 .env 整行复制会带上
 * `DIFY_APIKEY=` 前缀，手抖还会带引号或末尾换行。这些都会原样拼进
 * Authorization 头，Dify 那边只会回一句 `401 Access token is invalid` ——
 * 明明密钥是对的，却长得像密钥失效，极难排查。所以在这里统一洗一遍。
 */
export function normalizeKey(raw: string | undefined): string {
  return (raw ?? '')
    .trim()
    .replace(/^DIFY_APIKEY\s*=\s*/, '')
    .replace(/^["']|["']$/g, '')
    .trim()
}

function fail(status: number, message: string, detail?: string) {
  return new Response(JSON.stringify({ error: message, detail }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

/**
 * 把请求原样转发到 Dify 并注入密钥。
 * @param req  原始 Request
 * @param path 上游路径，如 '/chat-messages'（必须是 ALLOWED 里的值）
 */
export async function proxyToDify(req: Request, path: string): Promise<Response> {
  if (!ALLOWED.has(path)) {
    return fail(403, 'path_not_allowed', `只允许访问：${[...ALLOWED].join(', ')}`)
  }

  const key = normalizeKey(process.env.DIFY_APIKEY)
  if (!key) {
    // 部署了但忘了配环境变量时，给一句能直接照做的提示，
    // 别让前端拿到一个 500 猜半天
    return fail(
      500,
      'server_misconfigured',
      '服务端缺少 DIFY_APIKEY。请在托管平台的 Environment Variables 里添加它（不要加 VITE_ 前缀），然后重新部署。',
    )
  }

  // Dify 的应用密钥一律以 app- 开头。值明显不对时在这里就拦下来，
  // 直接说清楚哪里不对——放过去只会变成 Dify 那句"Access token is invalid"。
  // 注意只报长度、不回显内容：这句话会出现在浏览器里。
  if (!key.startsWith('app-')) {
    return fail(
      500,
      'server_misconfigured',
      `服务端的 DIFY_APIKEY 不是 Dify 应用密钥：应以 app- 开头，当前值长 ${key.length} 个字符。` +
        '常见原因是从 .env 里整行复制（把 DIFY_APIKEY= 也粘进去了）、或者值被引号/换行包住。' +
        '请到托管平台的 Environment Variables 里改正后**重新部署**（改环境变量不会自动触发重新部署）。',
    )
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

  const search = new URL(req.url).search

  let upstream: Response
  try {
    upstream = await fetch(`${UPSTREAM}${path}${search}`, {
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
      'Content-Type':
        upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
    },
  })
}

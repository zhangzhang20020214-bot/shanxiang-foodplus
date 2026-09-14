// Dify 反向代理的共用逻辑，由 api/dify/ 下的两个路由文件调用。
//
// 存在的唯一理由：**密钥不能进浏览器**。
// Vite 会把所有 `VITE_` 前缀的变量原样内联进 dist/assets/*.js，
// 只要部署上去，任何人打开 F12 搜 `app-` 就能拿到 key 刷你的额度。
// 所以 key 只存在服务端环境变量里（不带 VITE_ 前缀），由这一层注入。
//
// 为什么跑 Node 运行时，而不是 Edge：
// 一次分析实测要 18~20 秒（知识库检索 + LLM 生成一大段结构化 JSON），
// 而 Vercel 的 Edge Function 硬性要求「25 秒内必须开始返回响应」——
// Hobby / Pro / Enterprise 一视同仁，升套餐也不放宽。线上实测就是
// 25.5 秒被 FUNCTION_INVOCATION_TIMEOUT 掐断。Node 运行时（Fluid Compute）
// 在 Hobby 上就有 300 秒，宽裕得多。代价是这里得写 Node 风格的 (req, res)，
// 不再有 Web 标准的 Request / Response。
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

// 下面两个接口只声明真正用到的成员。
// 这么写是为了不引入 @types/node —— 这个项目其余部分都是浏览器代码，
// 为了 100 行的代理给全仓库装一份 Node 类型不划算。
export interface NodeRequest extends AsyncIterable<Uint8Array> {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>
  /** @vercel/node 有时已经替我们把 body 读掉了，这里兜一手（见 readBody） */
  body?: unknown
  /** 提前回响应前排空剩余请求体，见 proxyToDify 里 payload_too_large 那段 */
  resume?(): void
}

export interface NodeResponse {
  statusCode: number
  setHeader(name: string, value: string): void
  end(chunk?: Uint8Array | string): void
}

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

/**
 * 把请求原样转发到 Dify 并注入密钥。
 * @param req  原始 Node 请求
 * @param res  原始 Node 响应
 * @param path 上游路径，如 '/chat-messages'（必须是 ALLOWED 里的值）
 */
export async function proxyToDify(
  req: NodeRequest,
  res: NodeResponse,
  path: string,
): Promise<void> {
  if (!ALLOWED.has(path)) {
    return sendJson(res, 403, {
      error: 'path_not_allowed',
      detail: `只允许访问：${[...ALLOWED].join(', ')}`,
    })
  }

  const key = normalizeKey(process.env.DIFY_APIKEY)
  if (!key) {
    // 部署了但忘了配环境变量时，给一句能直接照做的提示，
    // 别让前端拿到一个 500 猜半天
    return sendJson(res, 500, {
      error: 'server_misconfigured',
      detail:
        '服务端缺少 DIFY_APIKEY。请在托管平台的 Environment Variables 里添加它（不要加 VITE_ 前缀），然后重新部署。',
    })
  }

  // Dify 的应用密钥一律以 app- 开头。值明显不对时在这里就拦下来，
  // 直接说清楚哪里不对——放过去只会变成 Dify 那句"Access token is invalid"。
  // 注意只报长度、不回显内容：这句话会出现在浏览器里。
  if (!key.startsWith('app-')) {
    return sendJson(res, 500, {
      error: 'server_misconfigured',
      detail:
        `服务端的 DIFY_APIKEY 不是 Dify 应用密钥：应以 app- 开头，当前值长 ${key.length} 个字符。` +
        '常见原因是从 .env 里整行复制（把 DIFY_APIKEY= 也粘进去了）、或者值被引号/换行包住。' +
        '请到托管平台的 Environment Variables 里改正后**重新部署**（改环境变量不会自动触发重新部署）。',
    })
  }

  const method = (req.method || 'GET').toUpperCase()
  const headers: Record<string, string> = { Authorization: `Bearer ${key}` }
  let body: Uint8Array | undefined

  if (method !== 'GET' && method !== 'HEAD') {
    let raw: Uint8Array | undefined
    try {
      raw = await readBody(req)
    } catch (e) {
      if (e instanceof BodyTooLarge) {
        // 请求体没读完就回响应，Node 会把连接直接重置，客户端只看到 network error。
        // 先把剩下的字节排空，让 413 能正常送达。
        req.resume?.()
        return sendJson(res, 413, {
          error: 'payload_too_large',
          detail: `请求体超过 ${MAX_BODY / 1024 / 1024}MB`,
        })
      }
      throw e
    }
    body = raw
    // 必须原样透传 Content-Type：/files/upload 是 multipart，
    // 边界字符串藏在 Content-Type 里，丢了它上游解析不出文件
    const ct = firstHeader(req, 'content-type')
    if (ct) headers['Content-Type'] = ct
  }

  let upstream: Response
  try {
    upstream = await fetch(`${UPSTREAM}${path}${searchOf(req)}`, {
      method,
      headers,
      body,
    })
  } catch (e) {
    return sendJson(res, 502, {
      error: 'upstream_unreachable',
      detail: e instanceof Error ? e.message : String(e),
    })
  }

  // 同样原样回传：Dify 的错误详情是 JSON，前端要靠它显示具体原因
  res.statusCode = upstream.status
  res.setHeader(
    'Content-Type',
    upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
  )
  res.end(new Uint8Array(await upstream.arrayBuffer()))
}

class BodyTooLarge extends Error {}

/**
 * 读出原始请求体。
 *
 * 这里有个坑：@vercel/node 有可能已经替我们把 body 读走并解析进 `req.body`，
 * 那种情况下流已经是空的了。如果还是老老实实去读流，会得到一个空请求体 ——
 * 表现就是 multipart 上传永远失败，且看不出为什么。所以两条路都走。
 */
async function readBody(req: NodeRequest): Promise<Uint8Array | undefined> {
  const pre = req.body
  if (pre !== undefined && pre !== null) {
    if (pre instanceof Uint8Array) return pre
    if (typeof pre === 'string') return new TextEncoder().encode(pre)
    // 被解析成对象了：重新序列化。JSON 语义不变，上游不关心键的顺序
    return new TextEncoder().encode(JSON.stringify(pre))
  }

  const chunks: Uint8Array[] = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY) throw new BodyTooLarge()
    chunks.push(chunk)
  }
  if (!chunks.length) return undefined

  const out = new Uint8Array(size)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

function firstHeader(req: NodeRequest, name: string): string | undefined {
  // Node 会把收到的请求头名统一转小写
  const v = req.headers[name]
  return Array.isArray(v) ? v[0] : v
}

function searchOf(req: NodeRequest): string {
  const url = req.url || ''
  const i = url.indexOf('?')
  return i === -1 ? '' : url.slice(i)
}

function sendJson(res: NodeResponse, status: number, payload: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(new TextEncoder().encode(JSON.stringify(payload)))
}

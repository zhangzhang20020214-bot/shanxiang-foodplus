import type { DifyRequest, DifyResponse } from '../types'
import { mockAnalyze } from '../mock/mockDify'

// ===== 真实 Dify 接口配置 =====
// 切换到真实接口时：填入下面的地址和 key，并删除 USE_MOCK 或设为 false。
const DIFY = {
  baseUrl: '', // 例如 'https://api.dify.ai/v1' 或自部署地址（不含结尾 /）
  apiKey: '', // 应用 API key：Dify 应用 → API 访问 → 创建密钥
}
const USE_MOCK = true

export async function analyze(request: DifyRequest): Promise<DifyResponse> {
  if (!USE_MOCK && DIFY.baseUrl && DIFY.apiKey) {
    return realAnalyze(request)
  }
  // 模拟网络延迟，贴近真实体验
  await new Promise((r) => setTimeout(r, 600))
  return mockAnalyze(request)
}

async function realAnalyze(request: DifyRequest): Promise<DifyResponse> {
  // 对话型 / Agent 应用：POST /chat-messages
  const res = await fetch(`${DIFY.baseUrl}/chat-messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DIFY.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {},
      query: JSON.stringify(request),
      response_mode: 'blocking',
      user: 'foodplus-web',
    }),
  })
  if (!res.ok) {
    throw new Error(`Dify 接口调用失败：${res.status}`)
  }
  const data = await res.json()
  // 你的工作流「直接回复」节点输出的是最终 JSON 字符串，落在 answer 字段
  const raw = data.answer ?? data.outputs?.text ?? '{}'
  return JSON.parse(raw)
}

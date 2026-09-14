// POST /api/dify/chat-messages  →  https://api.dify.ai/v1/chat-messages
// 多轮对话与图片分析的主入口。密钥由服务端注入，浏览器侧不持有。
import { proxyToDify } from '../../server/difyProxy'

export const config = { runtime: 'edge' }

export default function handler(req: Request): Promise<Response> {
  return proxyToDify(req, '/chat-messages')
}

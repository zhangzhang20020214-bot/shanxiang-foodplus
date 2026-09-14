// POST /api/dify/files/upload  →  https://api.dify.ai/v1/files/upload
// 图片先在这里换成 upload_file_id，再随 chat-messages 的 files 字段发出。
// 注意透传 multipart 的 Content-Type（含 boundary），否则上游解析不出文件。
import { proxyToDify } from '../../../server/difyProxy'

export const config = { runtime: 'edge' }

export default function handler(req: Request): Promise<Response> {
  return proxyToDify(req, '/files/upload')
}

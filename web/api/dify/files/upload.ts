// POST /api/dify/files/upload  →  https://api.dify.ai/v1/files/upload
// 图片先在这里换成 upload_file_id，再随 chat-messages 的 files 字段发出。
// 注意透传 multipart 的 Content-Type（含 boundary），否则上游解析不出文件。
//
// ⚠️ `.js` 后缀不能省，原因见 chat-messages.ts 顶部的说明（ESM + Vercel 不打包）。
import { proxyToDify, type NodeRequest, type NodeResponse } from '../../../server/difyProxy.js'

// 与 chat-messages 同理，见那边的注释：Edge 的 25 秒硬上限撑不住。
// 上传本身很快，但走同一条链路，保持配置一致省得以后踩坑。
export const config = { maxDuration: 60 }

export default function handler(req: NodeRequest, res: NodeResponse): Promise<void> {
  return proxyToDify(req, res, '/files/upload')
}

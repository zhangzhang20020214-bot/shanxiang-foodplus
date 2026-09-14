// 【临时诊断】只多了一件事：import api/ 目录外面的 server/difyProxy。
// 用来判断 Node 构建器能不能跟着跨目录的相对导入走。诊断完就删。
import { ALLOWED, type NodeRequest, type NodeResponse } from '../server/difyProxy'

export default function handler(_req: NodeRequest, res: NodeResponse): void {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ probe: 'ping-import ok', allowedCount: ALLOWED.size }))
}

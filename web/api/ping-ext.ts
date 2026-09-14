// 【临时诊断】测「跨目录 + 显式 .js 扩展名」。
// 200 → 跨目录没问题，只要补上扩展名即可；500 → 跨目录本身就不行。
import { ALLOWED } from '../server/difyProxy.js'

export default function handler(_req: any, res: any): void {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ probe: 'ping-ext ok', allowedCount: ALLOWED.size }))
}

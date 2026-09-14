// 【临时诊断】只测一件事：import 同一个目录下的模块（仍然不带扩展名）。
// 200 → 扩展名不是问题，那就是跨目录的问题；500 → 是不带扩展名的问题。
import { INNER } from './_inner'

export default function handler(_req: any, res: any): void {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ probe: 'ping-inner ok', INNER }))
}

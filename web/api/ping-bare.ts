// 【临时诊断】最小 Node 运行时函数：不带任何 import、不带 config。
// 用来判断「Node 运行时 + ESM 工程」这个组合本身能不能跑起来。
// 诊断完就删。
export default function handler(_req: any, res: any): void {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end('{"probe":"ping-bare ok"}')
}

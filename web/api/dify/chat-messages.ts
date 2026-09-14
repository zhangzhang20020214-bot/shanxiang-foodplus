// POST /api/dify/chat-messages  →  https://api.dify.ai/v1/chat-messages
// 多轮对话与图片分析的主入口。密钥由服务端注入，浏览器侧不持有。
//
// ⚠️ 这个 `.js` 后缀不能省，也别"顺手清理掉"。
// package.json 里是 "type": "module"，ESM 规定相对导入必须带文件扩展名。
// Vercel 的 Node 构建器逐文件转译、不做打包，所以运行时是按字面路径解析的：
// 写成 '../../server/difyProxy' 会让函数在加载阶段就崩（FUNCTION_INVOCATION_FAILED，
// 0.7 秒即返回，看起来像部署坏了，其实只是少四个字符）。
// 源码是 .ts，但这里要写编译产物的名字 .js —— esbuild/tsc 都认这个映射。
import { proxyToDify, type NodeRequest, type NodeResponse } from '../../server/difyProxy.js'

// 时长上限，单位秒。默认走 Node 运行时（不写 runtime 就是这个）。
//
// 为什么不写 `runtime: 'edge'`：Edge Function 硬性要求「25 秒内开始返回响应」，
// 而一次分析实测要 18~20 秒，加上冷启动就顶破了 —— 线上实测 25.5 秒被
// FUNCTION_INVOCATION_TIMEOUT 掐断。这个 25 秒是 Edge 的硬限制，升套餐也不放宽。
//
// 60 这个值在两种情况下都合法：未启用 Fluid Compute 的 Hobby（上限 60）、
// 以及已启用的（上限 300）。写大了反而可能因为超出套餐上限而部署失败。
export const config = { maxDuration: 60 }

export default function handler(req: NodeRequest, res: NodeResponse): Promise<void> {
  return proxyToDify(req, res, '/chat-messages')
}

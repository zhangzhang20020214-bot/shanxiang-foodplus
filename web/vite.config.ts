import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// 白名单直接复用服务端那份，避免两处各写一份、改一处忘一处
import { ALLOWED, normalizeKey } from './server/difyProxy'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 第三个参数传 '' 表示**不加前缀**读取全部变量。
  // 默认只读 VITE_ 前缀的，而密钥恰恰不能用 VITE_ —— 那样会被内联进浏览器包。
  const env = loadEnv(mode, process.cwd(), '')
  // 和线上用同一个清洗函数，避免「本地能跑、部署就 401」
  const apiKey = normalizeKey(env.DIFY_APIKEY)
  const upstream = (env.DIFY_BASEURL || 'https://api.dify.ai/v1').replace(/\/$/, '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'dify-proxy-allowlist',
        // 本地 dev 代理会给你代注入密钥，所以不能什么都转发 ——
        // 否则你机器上任何程序（甚至一个网页）往 localhost 发请求都能借你的 key。
        // 白名单复用 server/difyProxy.ts 那一份，让 dev 与生产行为完全相同。
        configureServer(server) {
          server.middlewares.use('/api/dify', (req, res, next) => {
            const path = (req.url || '').split('?')[0]
            if (ALLOWED.has(path)) return next()
            res.statusCode = 403
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(
              JSON.stringify({
                error: 'path_not_allowed',
                detail: `只允许访问：${[...ALLOWED].join(', ')}`,
              }),
            )
          })
        },
      },
    ],
    server: {
      // 本地开发走和线上同一条路径：前端只请求 /api/dify/*，
      // 由这里转发到 Dify 并注入密钥。这样 dev 和生产的调用方式完全一致，
      // 也避免「本地把密钥打进包里、上线才发现」这类问题。
      proxy: {
        '/api/dify': {
          target: upstream,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/dify/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (apiKey) proxyReq.setHeader('Authorization', `Bearer ${apiKey}`)
            })
          },
        },
      },
    },
  }
})

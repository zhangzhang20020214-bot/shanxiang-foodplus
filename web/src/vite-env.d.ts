/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * 分析服务前缀。默认 `/api/dify`，由服务端代理转发到 Dify 并注入密钥。
   * 这里刻意不放 Dify 地址和密钥 —— 任何 `VITE_` 变量都会被编译进浏览器包，
   * 部署后任何人打开 F12 就能读到。
   */
  readonly VITE_DIFY_PROXY?: string
  /**
   * 设为 'true' 时使用本地假数据（src/mock/mockDify.ts），不发起任何网络请求。
   * 纯静态托管（如 GitHub Pages，没有服务端函数）时用它。
   */
  readonly VITE_USE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

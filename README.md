# 膳享+ FoodPlus

一个**结合个人健康档案的饮食决策 Web App**：拍一张冰箱 / 餐盘 / 菜单 / 配料表，或直接输入菜名，
结合你自己的健康档案（过敏、慢病、孕期、控糖控盐等）和**国家卫健委成人食养指南**知识库，
给出安全、可执行、合规的个性化饮食建议。

> ⚠️ 本项目不是医疗器械，不做诊断、不开处方、不承诺疗效。所有建议仅供参考。

- **在线体验**：_（部署后把链接填在这里）_
- **产品设计文档**：[`PRD/foodplus_mvp_prd.md`](PRD/foodplus_mvp_prd.md)
- **Agent 提示词**：[`PRD/dify_agent_prompt.md`](PRD/dify_agent_prompt.md)

---

## 它能做什么

| 功能 | 输入 | 输出 |
|------|------|------|
| 拍冰箱 | 冰箱照片 | 识别到的食材清单 + 能做的菜（含做法与健康改良） |
| 拍餐盘 | 餐盘照片 | 菜品识别 + 进食顺序、分量、风险提示 |
| 搜菜品 | 菜名文本 | 做法步骤 + 针对你档案的健康改良方案 |
| 看菜单 | 菜单照片 | 全部菜品适配度 + 推荐点单组合 |
| 读配料 | 配料表照片 | 配料与营养标签识别 + 风险项标注 |

## 几个花了心思的交互细节

这些是设计和实现时反复调过的地方，也是比较希望听到反馈的部分：

- **重点自己浮出来**：Agent 除了给出结构化结论，还会额外产出 `highlight`（一句话结论）和
  带分级（`key` / `warn` / `normal`）的 `advice`。前端据此把最重要的一条置顶为醒目卡片、
  把风险项标红，而不是所有建议一个样地平铺 —— 避免"每条都是重点 = 没有重点"。
- **消息不会凭空消失**：发出消息后立刻乐观渲染出用户气泡，分析期间它一直可见。
  之前只显示一个加载动画，用户会怀疑自己是不是没发出去。
- **随时能喊停**：分析中提供「停止」按钮，中断后把刚发出的文字和图片**退回输入框**
  （视为主动取消，不报错、不落历史），而不是让用户干等。
- **图片先看清楚再发**：拍照 / 相册选完先进附件条，可继续补拍、逐张删除、点击放大确认，
  最后再决定什么时候发。一张照片常拍不全信息，所以支持多图（最多 4 张）。
- **相册和相机分开**：只有用户真的点了「拍照」才申请摄像头权限，想走相册时不会被要权限。
- **反驳要重新答**：多轮对话会回传 `conversation_id`，用户说"不对，这是红烧肉"时 Agent
  会承认修正并**重新给一份完整回答**，而不是空洞地回一句"您输入的文本不对"。
- **历史记录不挡路**：宽屏下历史侧栏以 `aside` 参与布局、推开内容而不加遮罩（类似豆包），
  窄屏才变成带遮罩的抽屉；任何断点都能自由开合。

## 技术栈

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · Dify（Chatflow + 自建知识库）

前端只负责：采集输入（图片 / 文本 / 语音）、渲染结果、管理档案、交互流转。
所有饮食判断都在 Dify Agent 里完成，前端不做任何业务判断。

## 本地运行

```bash
cd web
npm install
cp .env.example .env.local     # 然后填入你自己的 Dify 配置
npm run dev
```

`.env.local` 需要两项：

```env
DIFY_BASEURL=https://api.dify.ai/v1
DIFY_APIKEY=app-你的密钥
```

> **这两个变量刻意不带 `VITE_` 前缀。** Vite 会把所有 `VITE_` 变量原样编译进浏览器包，
> 部署后任何人打开 F12 就能读到密钥。所以密钥只存在于服务端：
> 本地由 `vite.config.ts` 的 dev 代理注入，线上由 `api/dify/[...path].ts` 注入。

**没有 Dify 配置也能跑**：在 `.env.local` 里加 `VITE_USE_MOCK=true`，
应用会走 `src/mock/mockDify.ts` 的本地假数据，不发起任何网络请求，方便单纯看 UI 和交互。

## 项目结构

```
web/
├── api/dify/[...path].ts     # 生产环境代理（Vercel Edge Function），注入密钥
├── src/
│   ├── pages/                # Home 首页 / DishSearch 菜品搜索 / Profiles 档案 / Me 我的
│   ├── components/           # 输入框、拍照弹窗、结果卡片、历史抽屉、图片预览…
│   ├── services/dify.ts      # 唯一的接口层，所有功能入口复用
│   ├── store/                # 档案、历史、导航状态（localStorage 持久化）
│   └── mock/mockDify.ts      # 离线假数据
PRD/                          # 产品需求文档 + Agent 提示词
knowledge-base/               # 食养指南知识库语料（Dify 检索用）
```

## 部署

生产环境用 Vercel（前端静态资源 + Serverless 代理函数）：

1. 在 Vercel 导入本仓库，**Root Directory 设为 `web`**
2. 在 Settings → Environment Variables 添加 `DIFY_APIKEY`（同样**不要**加 `VITE_` 前缀）
3. 部署。`web/api/dify/[...path].ts` 会被自动识别为 Serverless 函数

部署后可用下面这条命令自查密钥有没有泄漏 —— 正常应该搜不到任何东西：

```bash
grep -rE 'app-[A-Za-z0-9]{20,}' web/dist/assets/ || echo "✅ 构建产物中无密钥"
```

## 已知限制

- **语音输入**依赖浏览器原生 `SpeechRecognition`，目前仅 Chrome / Edge 支持，其他浏览器会自动隐藏该按钮
- **摄像头**需要 HTTPS 或 localhost，且用户需授权；相机不可用时会引导改用相册
- **多轮图片**：Dify 存在已知问题（[issue #24683](https://github.com/langgenius/dify/issues/24683)），
  多轮对话中新上传的图片可能不刷新 `sys.files`，表现为第二张图不生效
- 档案与历史记录存于浏览器 `localStorage`，换设备不同步（MVP 阶段有意为之）

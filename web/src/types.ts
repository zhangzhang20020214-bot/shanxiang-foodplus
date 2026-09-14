// 数据模型（对应 PRD 3.2.2 / 3.5.3 契约）

export type Gender = 'male' | 'female' | 'other'

export type SpecialStage = 'pregnancy' | 'elderly' | 'child' | 'recovery'

export type HealthGoal =
  | 'sugar_control'
  | 'oil_control'
  | 'salt_control'
  | 'balanced'
  | 'body_management'

export type RestrictionType = 'allergy' | 'disease' | 'drug' | 'taboo'
export type Severity = 'high' | 'medium' | 'low'

export interface HealthRestriction {
  type: RestrictionType
  item: string
  severity: Severity
}

export interface Profile {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  basicInfo: {
    age: number
    gender: Gender
    heightCm: number
    weightKg: number
  }
  specialStage: SpecialStage[]
  healthGoals: HealthGoal[]
  specialNutrition: string[]
  dietaryPreferences: string[]
  healthRestrictions: HealthRestriction[]
  notes?: string[]
}

// 五大功能入口
export type Mode = 'fridge' | 'plate' | 'dish' | 'menu' | 'ingredient'

// 前端 → Agent 请求（PRD 3.5.2）
export interface DifyRequest {
  profile: Profile
  mode: Mode
  input: {
    text: string
    images: string[]
  }
}

// Agent → 前端 结构化返回（PRD 3.5.3）
export type RiskLevel = 'high' | 'medium' | 'low'

export interface Risk {
  level: RiskLevel
  message: string
  items: string[]
}

export interface Dish {
  name: string
  reason: string
  recipe: string[]
  healthModification: string
  suitable: boolean
}

export interface Ingredient {
  name: string
  category: string
  note: string
}

// 字段全部可选：Agent 在无关模式下会返回空对象 {} 或省略字段
export interface Nutrition {
  ingredients?: string[]
  labels?: Record<string, string>
  riskItems?: string[]
}

// 建议分级：key 关键（高亮）/ warn 风险（红色警示）/ normal 普通
export type AdviceLevel = 'key' | 'warn' | 'normal'

export interface AdviceItem {
  text: string
  level?: AdviceLevel
}

export interface Result {
  mode: Mode
  title: string
  /** 一句话结论，前端置顶渲染成醒目卡片；由 Agent 按本次答案自行提炼 */
  highlight?: string
  ingredients?: Ingredient[]
  dishes?: Dish[]
  nutrition?: Nutrition
  /** 兼容两种写法：纯字符串数组，或带 level 的对象数组 */
  advice?: (string | AdviceItem)[]
  disclaimer: string
}

export interface DifyResponse {
  blocked: boolean
  risk?: Risk
  result?: Result
}

// 历史记录（一次对话 = 一个 HistoryItem，内含多轮 HistoryTurn）
export interface HistoryTurn {
  id: string
  mode: Mode
  text: string
  images: string[]
  response: DifyResponse
  // 用户引用某条回答后发出的消息，附带的引用原文
  quote?: string
}

export interface HistoryItem {
  id: string
  summary: string
  time: string
  profileId?: string
  offered?: boolean
  turns: HistoryTurn[]
}

export const DISCLAIMER =
  '本建议仅供参考，不构成医疗诊断或治疗意见。如有健康问题请咨询专业医生。'

// 中文标签映射（用于界面展示）
export const MODE_LABEL: Record<Mode, string> = {
  fridge: '拍冰箱',
  plate: '拍餐盘',
  dish: '搜菜品',
  menu: '看菜单',
  ingredient: '读配料',
}

export const GOAL_LABEL: Record<HealthGoal, string> = {
  sugar_control: '控糖',
  oil_control: '控油',
  salt_control: '控盐',
  balanced: '均衡饮食',
  body_management: '身材管理',
}

export const STAGE_LABEL: Record<SpecialStage, string> = {
  pregnancy: '孕期',
  elderly: '老人',
  child: '儿童',
  recovery: '康复',
}

export const RESTRICTION_TYPE_LABEL: Record<RestrictionType, string> = {
  allergy: '过敏',
  disease: '疾病',
  drug: '用药',
  taboo: '禁忌',
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  high: '高危',
  medium: '中危',
  low: '低危',
}

export const GENDER_LABEL: Record<Gender, string> = {
  male: '男',
  female: '女',
  other: '其他',
}

export const MODE_ICON: Record<Mode, string> = {
  fridge: '🧊',
  plate: '🍽️',
  dish: '🔍',
  menu: '📋',
  ingredient: '🏷️',
}

export const MODE_DESC: Record<Mode, string> = {
  fridge: '识别食材推荐餐食',
  plate: '识别菜品给建议',
  dish: '做法与健康改良',
  menu: '推荐菜品组合',
  ingredient: '配料表 / 营养标签识别',
}

export const MODE_COLOR: Record<Mode, string> = {
  fridge: 'bg-emerald-50 text-emerald-700',
  plate: 'bg-blue-50 text-blue-600',
  dish: 'bg-amber-50 text-amber-600',
  menu: 'bg-amber-100 text-amber-700',
  ingredient: 'bg-violet-100 text-violet-600',
}

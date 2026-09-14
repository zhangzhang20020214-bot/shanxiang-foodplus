import type { DifyRequest, DifyResponse, Dish, Ingredient } from '../types'
import { DISCLAIMER } from '../types'

// 模拟 Dify Agent 返回（结构与真实结构化 JSON 完全一致）
export function mockAnalyze(request: DifyRequest): DifyResponse {
  const { profile, mode, input } = request
  const text = (input.text || '').trim()

  // 模拟「前置硬规则拦截」：高危过敏/禁忌/用药命中 → blocked
  const high = profile.healthRestrictions.filter(
    (r) =>
      r.severity === 'high' && ['allergy', 'taboo', 'drug'].includes(r.type),
  )
  const hit = high.filter((r) => r.item && text.includes(r.item))
  if (hit.length > 0) {
    return {
      blocked: true,
      risk: {
        level: 'high',
        message: `检测到高危食材/成分「${hit.map((h) => h.item).join('、')}」，与档案健康限制冲突，已拦截。`,
        items: hit.map((h) => h.item),
      },
    }
  }

  switch (mode) {
    case 'fridge':
      return fridge(text)
    case 'plate':
      return plate(text)
    case 'dish':
      return dish(text)
    case 'menu':
      return menu(text)
    case 'ingredient':
      return ingredient(text)
    default:
      return {
        blocked: false,
        result: { mode, title: '未识别', advice: [], disclaimer: DISCLAIMER },
      }
  }
}

function fridge(text: string): DifyResponse {
  const ingredients: Ingredient[] = [
    { name: '鸡蛋', category: '蛋白质', note: '优质蛋白' },
    { name: '西红柿', category: '蔬菜', note: '富含维C' },
    { name: '青椒', category: '蔬菜', note: '' },
  ]
  const dishes: Dish[] = [
    {
      name: '番茄炒蛋',
      reason: '少油快炒，蛋白质与蔬菜搭配，符合清淡饮食',
      recipe: ['鸡蛋打散', '热锅少油炒蛋盛出', '下西红柿翻炒出汁', '合炒调味'],
      healthModification: '用不粘锅少油，盐减半',
      suitable: true,
    },
    {
      name: '青椒炒蛋',
      reason: '低脂高蛋白，做法简单',
      recipe: ['鸡蛋打散', '青椒切丝', '少油同炒'],
      healthModification: '青椒去籽减辣',
      suitable: true,
    },
  ]
  return {
    blocked: false,
    result: {
      mode: 'fridge',
      title: '推荐餐食建议',
      highlight: '现有食材够做两菜，蛋白质和蔬菜都齐，重点是控盐',
      ingredients,
      dishes,
      advice: [
        { text: '主食再配半碗杂粮饭，升糖更平稳', level: 'key' },
        { text: '控盐目标下，本餐总盐量建议控制在 3g 以内', level: 'warn' },
        { text: '蛋类提供优质蛋白，与蔬菜比例合适', level: 'normal' },
      ],
      disclaimer: DISCLAIMER,
    },
  }
}

function plate(text: string): DifyResponse {
  const dishes: Dish[] = [
    {
      name: '红烧肉',
      reason: '肥肉与油脂偏高，建议浅尝',
      recipe: [],
      healthModification: '去皮、去肥肉，只吃瘦肉部分',
      suitable: false,
    },
    {
      name: '清炒时蔬',
      reason: '清淡少油，适合',
      recipe: [],
      healthModification: '',
      suitable: true,
    },
    {
      name: '白米饭',
      reason: '精制碳水，注意份量',
      recipe: [],
      healthModification: '减少到小半碗',
      suitable: true,
    },
  ]
  return {
    blocked: false,
    result: {
      mode: 'plate',
      title: '进食建议',
      highlight: '这餐油盐偏高，红烧肉浅尝即可，主食减到小半碗',
      dishes,
      advice: [
        { text: '进食顺序：先蔬菜 → 再肉 → 最后主食', level: 'key' },
        { text: '红烧肉去皮去肥肉，最多吃 1～2 块', level: 'warn' },
        { text: '本餐油盐偏高，主食减量', level: 'warn' },
        { text: '清炒时蔬清淡少油，可以正常吃', level: 'normal' },
      ],
      disclaimer: DISCLAIMER,
    },
  }
}

function dish(text: string): DifyResponse {
  const name = text || '清炒西兰花'
  const dishes: Dish[] = [
    {
      name,
      reason: '低脂高纤维，适合健康饮食',
      recipe: ['西兰花切小朵焯水', '蒜末爆香', '大火快炒', '少盐调味'],
      healthModification: '用橄榄油替代，盐减 30%；可搭配虾仁增蛋白',
      suitable: true,
    },
  ]
  return {
    blocked: false,
    result: {
      mode: 'dish',
      title: '做法与健康改良',
      highlight: '西兰花本身很适合你，关键在少油快炒和减盐',
      dishes,
      advice: [
        { text: '用橄榄油替代、盐减 30%，这是最大的健康改良点', level: 'key' },
        { text: '焯水时间不宜过长，否则维生素 C 流失', level: 'normal' },
      ],
      disclaimer: DISCLAIMER,
    },
  }
}

function menu(text: string): DifyResponse {
  const dishes: Dish[] = [
    {
      name: '清蒸鲈鱼',
      reason: '高蛋白低脂，蒸制少油',
      recipe: [],
      healthModification: '',
      suitable: true,
    },
    {
      name: '蒜蓉蒸虾',
      reason: '优质蛋白，蒜蓉提味减盐',
      recipe: [],
      healthModification: '',
      suitable: true,
    },
    {
      name: '上汤娃娃菜',
      reason: '蔬菜清淡',
      recipe: [],
      healthModification: '',
      suitable: true,
    },
    {
      name: '水煮牛肉',
      reason: '麻辣重油重盐，不建议',
      recipe: [],
      healthModification: '如需食用，选清汤版并去油',
      suitable: false,
    },
  ]
  return {
    blocked: false,
    result: {
      mode: 'menu',
      title: '菜单推荐组合',
      highlight: '推荐「清蒸鲈鱼 + 上汤娃娃菜 + 半碗米饭」，避开重油重辣的菜',
      dishes,
      advice: [
        { text: '推荐组合：清蒸鲈鱼 + 上汤娃娃菜 + 半碗米饭', level: 'key' },
        { text: '水煮牛肉麻辣重油重盐，不建议', level: 'warn' },
      ],
      disclaimer: DISCLAIMER,
    },
  }
}

function ingredient(text: string): DifyResponse {
  return {
    blocked: false,
    result: {
      mode: 'ingredient',
      title: '配料评估',
      highlight: '每 100mL 含糖 9.5g，控糖目标下不建议喝',
      nutrition: {
        ingredients: ['水', '白砂糖', '浓缩果汁', '柠檬酸'],
        labels: { 热量: '180kJ/100mL', 糖: '9.5g/100mL', 钠: '12mg/100mL' },
        riskItems: ['白砂糖', '浓缩果汁'],
      },
      advice: [
        { text: '含糖量偏高，控糖目标下不建议饮用', level: 'warn' },
        { text: '替代选择：无糖茶饮或白水', level: 'key' },
      ],
      disclaimer: DISCLAIMER,
    },
  }
}

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
      ingredients,
      dishes,
      advice: [
        '本餐以蛋类提供优质蛋白，搭配足量蔬菜',
        '建议主食再搭配半碗杂粮饭',
        '少油少盐，控盐目标下盐量不超过 3g',
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
      dishes,
      advice: [
        '建议进食顺序：先蔬菜 → 再肉 → 最后主食',
        '红烧肉去皮去肥肉，只吃 1～2 块',
        '本餐油盐偏高，主食减量',
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
      dishes,
      advice: ['少油快炒保留营养', '焯水时间不宜过长以免营养流失'],
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
      dishes,
      advice: ['推荐：清蒸鲈鱼 + 上汤娃娃菜 + 半碗米饭', '避免水煮牛肉等重油重辣菜'],
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
      nutrition: {
        ingredients: ['水', '白砂糖', '浓缩果汁', '柠檬酸'],
        labels: { 热量: '180kJ/100mL', 糖: '9.5g/100mL', 钠: '12mg/100mL' },
        riskItems: ['白砂糖', '浓缩果汁'],
      },
      advice: [
        '含糖量偏高，控糖目标下不建议饮用',
        '可选择的替代：无糖茶饮或白水',
      ],
      disclaimer: DISCLAIMER,
    },
  }
}

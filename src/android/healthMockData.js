import { createAndroidRecentDays, validateHealthRecord } from './healthData'

// Preview-only records live in a separate key. Never mix them into real storage.
export const HEALTH_MOCK_ENABLED = true
export const HEALTH_MOCK_KEY = 'android-health-mock-records-v1'

export function createHealthMockRecords(now = new Date()) {
  const days = createAndroidRecentDays(7, now).reverse()
  const weights = [68.8, 68.5, 68.7, 68.3, 68.4, 68.1, 68.2]
  const water = [1.5, 1.9, 1.6, 2.2, 1.8, 2.4, 2.0]
  const minutes = [20, 35, 25, 50, 30, 45, 40]
  const activities = ['散步', '慢跑', '瑜伽', '骑行', '力量训练', '快走', '慢跑和拉伸']
  const meals = [
    ['早餐：鸡蛋、牛奶、全麦面包', '午餐：米饭、番茄炒蛋、青菜', '晚餐：牛肉面、黄瓜'],
    ['早餐：小米粥、包子', '午餐：鸡胸肉、杂粮饭、西兰花', '晚餐：虾仁炒饭、紫菜汤'],
    ['早餐：酸奶、燕麦、香蕉', '午餐：土豆炖牛肉、米饭', '晚餐：蒸鱼、青菜、红薯'],
    ['早餐：豆浆、鸡蛋饼', '午餐：番茄鸡肉意面', '晚餐：冬瓜汤、米饭、炒菌菇'],
    ['早餐：牛奶、玉米、鸡蛋', '午餐：香菇鸡腿饭', '晚餐：水饺、凉拌黄瓜'],
    ['早餐：全麦三明治、酸奶', '午餐：清蒸鱼、米饭、西兰花', '晚餐：蔬菜鸡肉沙拉、南瓜汤'],
    ['早餐：燕麦粥、鸡蛋、苹果', '午餐：牛肉、杂粮饭、炒青菜', '晚餐：虾仁豆腐、米饭、菌菇汤']
  ]
  const records = []
  days.forEach((day, index) => {
    const add = (type, time, value, text = '') => records.push({
      id: `mock-health-${day.key}-${type}-${time}`,
      type, time: `${day.key}T${time}`, text, mock: true,
      ...(type === 'food' ? {} : { value })
    })
    ;['08:30', '11:00', '14:30', '18:00'].forEach(time => add('water', time, water[index] / 4))
    add('weight', '07:10', Number((weights[index] - 0.2).toFixed(1)))
    add('weight', '20:30', Number((weights[index] + 0.2).toFixed(1)))
    add('exercise', '17:30', minutes[index], activities[index])
    ;['07:40', '12:10', '18:40'].forEach((time, meal) => add('food', time, undefined, meals[index][meal]))
  })
  return records
}

export function readHealthMockRecords(storage = localStorage) {
  if (!HEALTH_MOCK_ENABLED) return []
  const raw = storage.getItem(HEALTH_MOCK_KEY)
  const records = raw === null ? createHealthMockRecords() : JSON.parse(raw)
  if (!Array.isArray(records)) throw new Error('模拟记录格式异常')
  records.forEach(record => {
    validateHealthRecord(record)
    if (record.mock !== true || !record.id?.startsWith('mock-health-')) throw new Error('模拟记录标记异常')
  })
  if (raw === null) storage.setItem(HEALTH_MOCK_KEY, JSON.stringify(records))
  return records
}

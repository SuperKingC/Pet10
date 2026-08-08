/**
 * 塔罗牌库 v1：22 张大阿卡纳，纯前端、零图片资源。
 * 牌面由 CSS/SVG 绘制（罗马数字 + 象征符号 + 牌名）。
 * 随机源使用 crypto.getRandomValues，正逆位 50/50。
 */

export type TarotCategory = 'overall' | 'love' | 'study' | 'pet'
export type TarotSpreadKey = 'single' | 'triple'

export interface TarotCard {
  id: number
  numeral: string
  name: string
  symbol: string
  keywords: [string, string, string]
  upright: string
  reversed: string
}

export interface DrawnCard {
  card: TarotCard
  reversed: boolean
  /** 牌位含义（单牌：核心指引；三牌阵：过去/现在/未来） */
  position: string
}

export interface TarotReading {
  category: TarotCategory
  spread: TarotSpreadKey
  drawn: DrawnCard[]
  cardTexts: string[]
  closing: string
  createdAt: string
}

export const QUESTION_CATEGORIES: Array<{ key: TarotCategory; label: string; description: string; icon: string }> = [
  { key: 'overall', label: '今日总运', description: '今天整体的能量与方向', icon: '🌞' },
  { key: 'love', label: '感情友谊', description: '关系里的讯号与温度', icon: '💞' },
  { key: 'study', label: '学业事业', description: '目标、行动与收获', icon: '📚' },
  { key: 'pet', label: '宠物运', description: '小多利想对你说的话', icon: '🐾' }
]

export const SPREADS: Array<{ key: TarotSpreadKey; label: string; description: string; count: number }> = [
  { key: 'single', label: '单牌速占卜', description: '一张牌，快速获得今日指引', count: 1 },
  { key: 'triple', label: '三牌阵', description: '过去 · 现在 · 未来', count: 3 }
]

export const MAJOR_ARCANA: TarotCard[] = [
  { id: 0, numeral: '0', name: '愚者', symbol: '🎒', keywords: ['出发', '天真', '可能性'], upright: '新的开始正在招手，带着好奇心大胆迈步。', reversed: '冲动和鲁莽可能让你绕路，先看清脚下。' },
  { id: 1, numeral: 'I', name: '魔术师', symbol: '✨', keywords: ['创造', '行动', '资源'], upright: '你已备齐所有工具，现在就是把想法变现实的时候。', reversed: '能量分散，专注一件事才能发挥实力。' },
  { id: 2, numeral: 'II', name: '女祭司', symbol: '🌙', keywords: ['直觉', '静观', '内在'], upright: '答案藏在安静里，相信你的第一感。', reversed: '忽略内心声音太久，该留一段独处时间。' },
  { id: 3, numeral: 'III', name: '皇后', symbol: '🌷', keywords: ['滋养', '丰盛', '温柔'], upright: '被照顾与照顾他人的能量同在，好好享受生活。', reversed: '过度付出或过度依赖，找回自己的节奏。' },
  { id: 4, numeral: 'IV', name: '皇帝', symbol: '🏛️', keywords: ['秩序', '掌控', '责任'], upright: '建立规则与结构，你的稳重是最大底牌。', reversed: '控制欲过强会推开人，学着放手。' },
  { id: 5, numeral: 'V', name: '教皇', symbol: '🗝️', keywords: ['传承', '指引', '共识'], upright: '向前辈或经验求教，传统方法此刻有效。', reversed: '不必盲从权威，走自己的路也没关系。' },
  { id: 6, numeral: 'VI', name: '恋人', symbol: '💞', keywords: ['选择', '契合', '沟通'], upright: '关系升温，真诚的表达会带来美好回应。', reversed: '价值观出现分歧，先弄清楚自己真正要什么。' },
  { id: 7, numeral: 'VII', name: '战车', symbol: '🛡️', keywords: ['前进', '意志', '胜利'], upright: '朝着目标全速前进，你能驾驭眼前的挑战。', reversed: '方向摇摆不定，先稳住内心再踩油门。' },
  { id: 8, numeral: 'VIII', name: '力量', symbol: '🦁', keywords: ['勇气', '耐心', '柔韧'], upright: '以柔克刚，你的耐心正在悄悄改变局面。', reversed: '自我怀疑在消耗你，记得你比想象中勇敢。' },
  { id: 9, numeral: 'IX', name: '隐士', symbol: '🏮', keywords: ['内省', '沉淀', '智慧'], upright: '退一步整理思绪，孤独里藏着答案。', reversed: '封闭太久会迷失，试着打开一扇窗。' },
  { id: 10, numeral: 'X', name: '命运之轮', symbol: '🎡', keywords: ['转机', '周期', '机遇'], upright: '齿轮开始转动，顺势而为会有惊喜。', reversed: '暂时的低谷是蓄力期，别对抗变化。' },
  { id: 11, numeral: 'XI', name: '正义', symbol: '⚖️', keywords: ['平衡', '真相', '决定'], upright: '公平的裁决将至，诚实面对自己与他人。', reversed: '天平失衡，留意偏见与逃避责任。' },
  { id: 12, numeral: 'XII', name: '倒吊人', symbol: '🙃', keywords: ['换位', '等待', '领悟'], upright: '换个角度看问题，停滞其实是孕育。', reversed: '无谓的牺牲没有意义，是时候解绑自己。' },
  { id: 13, numeral: 'XIII', name: '死神', symbol: '🦋', keywords: ['结束', '蜕变', '新生'], upright: '旧的篇章合上，蜕变之后是更轻盈的自己。', reversed: '紧抓不放只会更痛，允许告别发生。' },
  { id: 14, numeral: 'XIV', name: '节制', symbol: '🫗', keywords: ['调和', '适度', '融合'], upright: '慢火细炖，平衡与耐心会带来好结果。', reversed: '极端与急躁在捣乱，先稳住作息与情绪。' },
  { id: 15, numeral: 'XV', name: '恶魔', symbol: '⛓️', keywords: ['诱惑', '执念', '束缚'], upright: '看清让你上瘾或焦虑的东西，链子其实很松。', reversed: '你正在挣脱束缚，继续保持清醒。' },
  { id: 16, numeral: 'XVI', name: '高塔', symbol: '⚡', keywords: ['突变', '觉醒', '重建'], upright: '突如其来的变动打碎幻象，废墟上能盖更好的房子。', reversed: '内心的地震已经发生，慢慢重建秩序。' },
  { id: 17, numeral: 'XVII', name: '星星', symbol: '🌟', keywords: ['希望', '疗愈', '愿景'], upright: '雨过天晴，愿望正在被宇宙悄悄听见。', reversed: '暂时看不到光，但星星仍在云后。' },
  { id: 18, numeral: 'XVIII', name: '月亮', symbol: '🌕', keywords: ['朦胧', '直觉', '不安'], upright: '局面尚有迷雾，留意梦境与直觉的提示。', reversed: '误会正在消散，真相浮出水面。' },
  { id: 19, numeral: 'XIX', name: '太阳', symbol: '☀️', keywords: ['喜悦', '成功', '活力'], upright: '阳光普照的一天，尽情发光就对了。', reversed: '快乐打了点折扣，先照顾好自己的小情绪。' },
  { id: 20, numeral: 'XX', name: '审判', symbol: '📯', keywords: ['复盘', '召唤', '释怀'], upright: '回顾与和解的时刻，你会听见新的召唤。', reversed: '别被过去的评分困住，你已不是当时的你。' },
  { id: 21, numeral: 'XXI', name: '世界', symbol: '🌍', keywords: ['圆满', '达成', '旅程'], upright: '一个阶段圆满完成，庆祝并准备下一段旅程。', reversed: '还差最后一块拼图，别在终点前停步。' }
]

const CATEGORY_LABEL: Record<TarotCategory, string> = {
  overall: '今日总运',
  love: '感情友谊',
  study: '学业事业',
  pet: '宠物运'
}

const CATEGORY_OPENING: Record<TarotCategory, string> = {
  overall: '牌面指向今天的整体能量——',
  love: '关于感情与友谊，牌想告诉你——',
  study: '在学业与事业的路上，牌说——',
  pet: '小多利竖起耳朵听完了占卜，它想告诉你——'
}

const CATEGORY_CLOSING: Record<TarotCategory, string[]> = {
  overall: [
    '今天的牌已经翻完，无论正逆，能量都在你手里。',
    '占卜只是路标，脚步依然由你决定。祝你今天顺顺的。',
    '把这张牌放在心里，今天遇到选择时会想起它。'
  ],
  love: [
    '关系里的答案常常不在牌里，而在你开口的勇气里。',
    '愿今天的你被温柔以待，也温柔待人。',
    '牌说完了，剩下的故事由你们一起写。'
  ],
  study: [
    '牌可以指路，但每步都算数的还是你自己。',
    '把这张牌的能量带进今天的计划里吧。',
    '结果未定之前，一切皆有可能，加油。'
  ],
  pet: [
    '汪！小多利说完啦，它现在要趴在你脚边陪你。',
    '小多利表示：无论牌怎么说，它永远站你这边。',
    '占卜结束，小多利摇了摇尾巴，好像很满意这个答案。'
  ]
}

/** crypto 级随机数（[0,1)），无 crypto 时退化为 Math.random */
export function secureRandom(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buffer = new Uint32Array(1)
    crypto.getRandomValues(buffer)
    return buffer[0] / 0x100000000
  }
  return Math.random()
}

/** 洗牌并抽取 N 张（不重复），正逆位 50/50 */
export function drawCards(spread: TarotSpreadKey, count?: number): DrawnCard[] {
  const spreadDef = SPREADS.find((item) => item.key === spread) ?? SPREADS[0]
  const drawCount = count ?? spreadDef.count
  const positions = spread === 'triple' ? ['过去', '现在', '未来'] : ['核心指引']
  const pool = [...MAJOR_ARCANA]
  // Fisher-Yates 洗牌
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(secureRandom() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, drawCount).map((card, index) => ({
    card,
    reversed: secureRandom() < 0.5,
    position: positions[index] ?? positions[0]
  }))
}

/** 单张牌解读：牌位 + 正逆位释义 + 问题联结句 */
export function interpretCard(drawn: DrawnCard, category: TarotCategory): string {
  const meaning = drawn.reversed ? drawn.card.reversed : drawn.card.upright
  const direction = drawn.reversed ? '逆位' : '正位'
  return `${CATEGORY_OPENING[category]}「${drawn.card.name}」（${direction}）落在「${drawn.position}」的位置：${meaning}`
}

/** 整体结语（确定性取句，避免随机抖动） */
export function buildClosing(drawn: DrawnCard[], category: TarotCategory): string {
  const closings = CATEGORY_CLOSING[category]
  const seed = drawn.reduce((acc, item) => acc + item.card.id + (item.reversed ? 13 : 0), 0)
  return closings[seed % closings.length]
}

/** 生成完整解读 */
export function createReading(category: TarotCategory, spread: TarotSpreadKey): TarotReading {
  const drawn = drawCards(spread)
  return {
    category,
    spread,
    drawn,
    cardTexts: drawn.map((item) => interpretCard(item, category)),
    closing: buildClosing(drawn, category),
    createdAt: new Date().toISOString()
  }
}

/** 生成分享到聊天室的卡片式文本 */
export function buildShareText(reading: TarotReading): string {
  const categoryLabel = QUESTION_CATEGORIES.find((item) => item.key === reading.category)?.label ?? '占卜'
  const cards = reading.drawn
    .map((item) => `${item.card.symbol} ${item.card.name}（${item.reversed ? '逆位' : '正位'} · ${item.position}）`)
    .join('  ')
  return `🔮 我刚做了「${categoryLabel}」塔罗占卜：${cards}。${reading.closing}`
}

export { CATEGORY_LABEL }

// ---------- 本地历史记录（localStorage） ----------
const HISTORY_KEY = 'pet10_tarot_history'

export function listReadingHistory(): TarotReading[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? '[]') as TarotReading[]
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function saveReading(reading: TarotReading): void {
  const history = [reading, ...listReadingHistory()].slice(0, 30)
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

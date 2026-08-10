/**
 * 塔罗牌库 v1：22 张大阿卡纳，纯前端、零图片资源。
 * 牌面由 CSS/SVG 绘制（罗马数字 + 象征符号 + 牌名）。
 * 随机源使用 crypto.getRandomValues，正逆位 50/50。
 */

export type TarotCategory = 'overall' | 'love' | 'study' | 'pet'
export type TarotSpreadKey = 'single' | 'triple' | 'relationship' | 'decision'

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

export const EXTRA_SPREADS: Array<{ key: TarotSpreadKey; label: string; description: string; count: number }> = [
  { key: 'relationship', label: '关系三牌阵', description: '我 · 对方 · 关系走向', count: 3 },
  { key: 'decision', label: '决定五牌阵', description: '现状 · 选项 · 风险 · 资源 · 建议', count: 5 }
]

SPREADS.push(...EXTRA_SPREADS)

export const QUESTION_PROMPTS: Record<TarotCategory, string[]> = {
  overall: ['我现在最需要看清的是什么？', '未来一个月最值得把握的机会是什么？', '我该如何找回自己的能量？', '今天宇宙想提醒我什么？', '我正在忽略哪一个重要信号？', '下一步怎样走会更顺利？'],
  love: ['Ta 现在对我是什么想法？', '我们这段关系下一步会怎样？', '我该如何改善这段关系？', '这段缘分真正的课题是什么？', '我何时适合主动表达心意？', '我在感情里最需要放下什么？'],
  study: ['我该不该接受这个机会？', '怎样做才能突破目前的瓶颈？', '我最适合投入哪一个方向？', '这次选择的隐藏风险是什么？', '如何让努力更快看到结果？', '我现在最需要培养的能力是什么？'],
  pet: ['小多利最近最想对我说什么？', '我怎样才能更懂小多利？', '小多利需要我做出的改变是什么？', '我们之间的默契正在发生什么变化？', '今天适合和小多利一起做什么？', '小多利眼中的我是怎样的？']
}

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
  const positions = spread === 'triple' ? ['过去', '现在', '未来'] : spread === 'relationship' ? ['我', '对方', '关系走向'] : spread === 'decision' ? ['现状', '选项', '风险', '资源', '建议'] : ['核心指引']
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

import type { MiniappTarotSpread } from './tarotSpreads'

export interface TarotCard {
  id: number
  numeral: string
  name: string
  symbol: string
  keywords: [string, string, string]
  upright: string
  reversed: string
}

export interface TarotCandidate {
  card: TarotCard
  reversed: boolean
}

export interface DrawnTarotCard extends TarotCandidate {
  position: string
}

export const MAJOR_ARCANA: TarotCard[] = [
  { id: 0, numeral: '0', name: '愚者', symbol: '🎒', keywords: ['出发', '天真', '可能性'], upright: '新的开始正在招手，带着好奇心大胆迈步。', reversed: '冲动和鲁莽可能让你绕路，先看清脚下。' },
  { id: 1, numeral: 'I', name: '魔术师', symbol: '✨', keywords: ['创造', '行动', '资源'], upright: '你已备齐所有工具，现在就是把想法变现实的时候。', reversed: '能量分散，专注一件事才能发挥实力。' },
  { id: 2, numeral: 'II', name: '女祭司', symbol: '🌙', keywords: ['直觉', '静观', '内在'], upright: '答案藏在安静里，相信你的第一感。', reversed: '忽略内心声音太久，该留一段独处时间。' },
  { id: 3, numeral: 'III', name: '皇后', symbol: '🌷', keywords: ['滋养', '丰盛', '温柔'], upright: '被照顾与照顾他人的能量同在，好好享受生活。', reversed: '过度付出或过度依赖，找回自己的节奏。' },
  { id: 4, numeral: 'IV', name: '皇帝', symbol: '🏛️', keywords: ['秩序', '掌控', '责任'], upright: '建立规则与结构，你的稳重是最大底牌。', reversed: '控制欲过强会推开人，学着放手。' },
  { id: 5, numeral: 'V', name: '教皇', symbol: '🗝️', keywords: ['传承', '指引', '共识'], upright: '向经验求教，成熟的方法此刻有效。', reversed: '不必盲从权威，走自己的路也没关系。' },
  { id: 6, numeral: 'VI', name: '恋人', symbol: '💞', keywords: ['选择', '契合', '沟通'], upright: '真诚的表达会带来更清晰的回应。', reversed: '价值观出现分歧，先弄清自己真正要什么。' },
  { id: 7, numeral: 'VII', name: '战车', symbol: '🛡️', keywords: ['前进', '意志', '胜利'], upright: '朝着目标前进，你能驾驭眼前的挑战。', reversed: '方向不一致时，先停下来重新校准。' },
  { id: 8, numeral: 'VIII', name: '力量', symbol: '🦁', keywords: ['勇气', '温柔', '自律'], upright: '真正的力量来自温柔而坚定的自持。', reversed: '别用逞强掩盖疲惫，先照顾内在需要。' },
  { id: 9, numeral: 'IX', name: '隐者', symbol: '🏮', keywords: ['独处', '探索', '智慧'], upright: '暂时离开喧嚣，独处会带来答案。', reversed: '封闭太久会失去连接，适时寻求支持。' },
  { id: 10, numeral: 'X', name: '命运之轮', symbol: '🎡', keywords: ['转折', '周期', '机遇'], upright: '周期正在转动，顺势把握新的窗口。', reversed: '变化暂时受阻，先处理重复出现的旧模式。' },
  { id: 11, numeral: 'XI', name: '正义', symbol: '⚖️', keywords: ['公平', '事实', '因果'], upright: '回到事实与边界，清晰判断会带来平衡。', reversed: '偏见或信息缺失正在影响判断。' },
  { id: 12, numeral: 'XII', name: '倒吊人', symbol: '🙃', keywords: ['换位', '等待', '领悟'], upright: '换个角度看问题，停滞也可能在孕育。', reversed: '无谓的牺牲没有意义，是时候解绑自己。' },
  { id: 13, numeral: 'XIII', name: '死神', symbol: '🦋', keywords: ['结束', '蜕变', '新生'], upright: '旧的篇章合上，蜕变之后是新的空间。', reversed: '紧抓不放只会更痛，允许告别发生。' },
  { id: 14, numeral: 'XIV', name: '节制', symbol: '🫗', keywords: ['调和', '适度', '融合'], upright: '平衡与耐心会带来稳定结果。', reversed: '极端与急躁在捣乱，先稳住节奏。' },
  { id: 15, numeral: 'XV', name: '恶魔', symbol: '⛓️', keywords: ['诱惑', '执念', '束缚'], upright: '看清让你上瘾或焦虑的东西，链子其实很松。', reversed: '你正在挣脱束缚，继续保持清醒。' },
  { id: 16, numeral: 'XVI', name: '高塔', symbol: '⚡', keywords: ['突变', '觉醒', '重建'], upright: '变动打碎幻象，也腾出了重建空间。', reversed: '内在震荡已经发生，慢慢重建秩序。' },
  { id: 17, numeral: 'XVII', name: '星星', symbol: '🌟', keywords: ['希望', '疗愈', '愿景'], upright: '雨过天晴，希望正在重新出现。', reversed: '暂时看不到光，但方向仍值得守护。' },
  { id: 18, numeral: 'XVIII', name: '月亮', symbol: '🌕', keywords: ['朦胧', '直觉', '不安'], upright: '局面仍有迷雾，留意直觉与隐藏信息。', reversed: '误会正在消散，真相逐渐浮出水面。' },
  { id: 19, numeral: 'XIX', name: '太阳', symbol: '☀️', keywords: ['喜悦', '成功', '活力'], upright: '清晰与活力回归，允许自己大胆发光。', reversed: '快乐打了折扣，先照顾好真实情绪。' },
  { id: 20, numeral: 'XX', name: '审判', symbol: '📯', keywords: ['复盘', '召唤', '释怀'], upright: '回顾与和解之后，你会听见新的召唤。', reversed: '别被过去的评分困住，你已不是当时的你。' },
  { id: 21, numeral: 'XXI', name: '世界', symbol: '🌍', keywords: ['圆满', '达成', '旅程'], upright: '一个阶段圆满完成，准备进入下一段旅程。', reversed: '还差最后一块拼图，别在终点前停步。' },
]

export function positionsForSpread(spread: MiniappTarotSpread): string[] {
  if (spread === 'triple') return ['过去', '现在', '未来']
  if (spread === 'relationship') return ['我', '对方', '关系走向']
  if (spread === 'decision') return ['现状', '选项', '风险', '资源', '建议']
  return ['核心指引']
}

function defaultRandom(): number {
  return Math.random()
}

export function createTarotCandidates(
  count = 10,
  random: () => number = defaultRandom,
): TarotCandidate[] {
  const pool = [...MAJOR_ARCANA]
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[pool[index], pool[target]] = [pool[target], pool[index]]
  }
  return pool.slice(0, Math.max(0, Math.min(count, pool.length))).map((card) => ({
    card,
    reversed: random() < 0.5,
  }))
}

export function materializeDrawnCards(
  candidates: TarotCandidate[],
  picked: number[],
  spread: MiniappTarotSpread,
): DrawnTarotCard[] {
  const positions = positionsForSpread(spread)
  return picked.map((candidateIndex, order) => ({
    ...candidates[candidateIndex],
    position: positions[order] ?? positions[0],
  }))
}

import type { DrawnTarotCard } from './tarotCards'
import type { MiniappTarotSpread } from './tarotSpreads'

export interface TarotCardAnalysis {
  positionRole: string
  symbolism: string
  orientation: string
  questionConnection: string
  realWorldPattern: string
  action: string
  caution: string
}

export interface TarotReading {
  question: string
  spread: MiniappTarotSpread
  drawn: DrawnTarotCard[]
  summary: string
  synthesis: string
  cardAnalyses: TarotCardAnalysis[]
  closing: string
  next24Hours: string
  next7Days: string
  misreadings: string[]
  createdAt: string
}

function positionRole(position: string): string {
  const roles: Record<string, string> = {
    过去: '过去：指出形成当前局面的经验与惯性。',
    现在: '现在：描述当下最需要看清的核心能量。',
    未来: '未来：展示沿当前方向继续行动的趋势。',
    我: '我：看见你在关系中的需求、边界与投入。',
    对方: '对方：理解对方呈现出的立场与节奏。',
    关系走向: '关系走向：观察双方互动继续发展时的趋势。',
    现状: '现状：先确认决定发生的真实背景。',
    选项: '选项：看见当前选择能提供的机会。',
    风险: '风险：辨认容易忽略的代价与盲点。',
    资源: '资源：盘点你已经拥有的支持与能力。',
    建议: '建议：把复杂问题收束为可执行的一步。',
    核心指引: '核心指引：聚焦眼下最值得练习的一件事。',
  }
  return roles[position] ?? `「${position}」：揭示这部分经验在问题中的作用。`
}

function buildCardAnalysis(drawn: DrawnTarotCard, question: string): TarotCardAnalysis {
  const [first, second, third] = drawn.card.keywords
  const meaning = drawn.reversed ? drawn.card.reversed : drawn.card.upright
  return {
    positionRole: positionRole(drawn.position),
    symbolism: `「${drawn.card.name}」围绕${first}、${second}与${third}展开，提醒你观察这些力量如何进入现实。`,
    orientation: `${drawn.reversed ? '逆位' : '正位'}不是好坏判断，而是在提示：${meaning}`,
    questionConnection: `放回问题“${question}”，这张牌在追问：你是否愿意围绕“${first}”重新确认真正想守住的方向？`,
    realWorldPattern: drawn.reversed
      ? `现实中可能表现为节奏失衡、信息不足，或把“${second}”推得太急。`
      : `现实中可能表现为一个可利用的机会、一次坦诚沟通，或把“${second}”落实到日程。`,
    action: `未来 24 小时内，完成一件与“${first}”有关且十五分钟内能结束的小事。`,
    caution: drawn.reversed
      ? `不要把逆位理解成失败；放慢速度，核对事实，给“${third}”留出修正空间。`
      : `不要把正位当作保证；保持“${third}”的弹性，用现实反馈校正下一步。`,
  }
}

export function buildTarotReading(
  question: string,
  spread: MiniappTarotSpread,
  drawn: DrawnTarotCard[],
  createdAt = new Date().toISOString(),
): TarotReading {
  const safeQuestion = question.trim() || '我现在最需要看清与落实的是什么？'
  const cardAnalyses = drawn.map((item) => buildCardAnalysis(item, safeQuestion))
  const keywords = drawn.map((item) => item.card.keywords[0])
  return {
    question: safeQuestion,
    spread,
    drawn,
    summary: `围绕“${safeQuestion}”，先从「${drawn[0]?.card.name ?? '当下'}」提示的现实行动开始，而不是急于寻找唯一答案。`,
    synthesis: drawn.length === 1
      ? '这次阅读由一张核心牌集中回应问题，重点是把提醒落实为具体行动。'
      : `牌阵从${keywords.join('、')}构成一条连续线索：先辨认现状，再选择可执行的调整。`,
    cardAnalyses,
    closing: '塔罗提供的是观察角度，不是固定命运；你仍然拥有选择与调整的主动权。',
    next24Hours: cardAnalyses[0]?.action ?? '把问题写成一句可执行的话，再完成最小的一步。',
    next7Days: `未来 7 天观察“${keywords.join('、')}”是否在日程、关系或情绪中反复出现，记录事实后再调整判断。`,
    misreadings: cardAnalyses.map((item) => item.caution).slice(0, 3),
    createdAt,
  }
}

export function buildShareText(reading: TarotReading): string {
  const cards = reading.drawn
    .map((item) => `${item.card.symbol} ${item.card.name}（${item.reversed ? '逆位' : '正位'} · ${item.position}）`)
    .join('  ')
  return `🔮 我刚完成塔罗占卜：${cards}。${reading.closing}`
}

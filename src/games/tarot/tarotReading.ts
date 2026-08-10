import {
  QUESTION_CATEGORIES,
  QUESTION_PROMPTS,
  drawCards,
  type DrawnCard,
  type TarotCategory,
  type TarotSpreadKey
} from './tarotDeck'

export interface TarotReading {
  question: string
  category: TarotCategory
  spread: TarotSpreadKey
  drawn: DrawnCard[]
  cardTexts: string[]
  closing: string
  summary: string
  synthesis: string
  advice: string[]
  cautions: string[]
  cardAnalyses: TarotCardAnalysis[]
  next24Hours: string
  next7Days: string
  misreadings: string[]
  createdAt: string
}

export interface TarotCardAnalysis {
  positionRole: string
  symbolism: string
  orientation: string
  questionConnection: string
  realWorldPattern: string
  action: string
  caution: string
}

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

export function interpretCard(drawn: DrawnCard, category: TarotCategory): string {
  const meaning = drawn.reversed ? drawn.card.reversed : drawn.card.upright
  const direction = drawn.reversed ? '逆位' : '正位'
  const positionPurpose: Record<string, string> = {
    '我': '它映照你此刻的真实感受与行为模式。',
    '对方': '它描述关系中可观察到的态度与倾向，而不是对他人内心的确定判断。',
    '关系走向': '它呈现双方维持当前互动方式时可能发展的趋势。',
    '风险': '它指出目前容易忽略的代价或阻碍。',
    '资源': '它提示你已经拥有、可以主动调用的支持。',
    '建议': '它给出此刻最值得落实的方向。'
  }
  return `${CATEGORY_OPENING[category]}「${drawn.card.name}」（${direction}）落在「${drawn.position}」的位置：${meaning}${positionPurpose[drawn.position] ?? ''}`
}

export function buildClosing(drawn: DrawnCard[], category: TarotCategory): string {
  const closings = CATEGORY_CLOSING[category]
  const seed = drawn.reduce((acc, item) => acc + item.card.id + (item.reversed ? 13 : 0), 0)
  return closings[seed % closings.length]
}

export function buildSummary(drawn: DrawnCard[], category: TarotCategory): string {
  const lead = drawn[0]
  const meaning = lead ? (lead.reversed ? lead.card.reversed : lead.card.upright) : '先让自己安静下来，答案会逐渐清晰。'
  return `${CATEGORY_LABEL[category]}的核心牌是「${lead?.card.name ?? '未知'}」，它提醒你：${meaning}`
}

export function buildAdvice(drawn: DrawnCard[]): string[] {
  const first = drawn[0]
  return first ? [`围绕“${first.card.keywords[0]}”做一个今天能完成的小行动`, '给自己留出复盘和调整的空间'] : ['先把问题写清楚，再做决定']
}

export function buildCautions(drawn: DrawnCard[]): string[] {
  return drawn.filter((item) => item.reversed).map((item) => `留意「${item.card.name}」逆位带来的拖延或误读`).slice(0, 2)
}

export function buildSynthesis(drawn: DrawnCard[]): string {
  if (drawn.length < 2) return '这次阅读由一张核心牌集中回应问题，重点在于把牌的提醒落实为一个具体行动。'
  const reversedCount = drawn.filter((item) => item.reversed).length
  if (reversedCount > drawn.length / 2) return '牌阵中逆位能量较多，当前阻力更可能来自迟疑、误读或尚未整理好的内在冲突。先校准判断，再推动外部变化。'
  if (reversedCount === 0) return '牌阵整体方向较为一致，想法与外部条件正在形成呼应。保持主动，同时用现实反馈校正下一步。'
  return '牌阵同时出现推进与阻滞的信号，说明事情并非单一答案。先处理最明显的阻碍，再利用已经成熟的条件向前推进。'
}

function positionRole(position: string): string {
  return ({
    '过去': '过去：说明形成当前局面的背景、惯性或尚未消化的经验。',
    '现在': '现在：指出此刻最值得如实面对的条件与选择。',
    '未来': '未来：展示维持当前方式时较可能展开的趋势，而非固定命运。',
    '核心指引': '核心指引：把复杂问题收束到眼下最值得练习的一件事。'
  } as Record<string, string>)[position] ?? `「${position}」牌位：揭示这部分经验在问题中的作用。`
}

export function buildCardAnalysis(drawn: DrawnCard, question: string): TarotCardAnalysis {
  const direction = drawn.reversed ? '逆位' : '正位'
  const meaning = drawn.reversed ? drawn.card.reversed : drawn.card.upright
  const [first, second, third] = drawn.card.keywords
  return {
    positionRole: positionRole(drawn.position),
    symbolism: `「${drawn.card.name}」的象征核心是${first}、${second}与${third}；它邀请你先看见这些力量在现实中的具体形态。`,
    orientation: `${direction}并不等于好坏判断。此刻它提示：${meaning}`,
    questionConnection: `放回你的问题“${question}”，这张牌更像在追问：你是否愿意围绕“${first}”重新确认真正想守住的方向？`,
    realWorldPattern: drawn.reversed ? `现实中可能表现为节奏失衡、信息不足或把${second}推得太急；先辨认哪里出现了消耗。` : `现实中可能表现为一个可利用的机会、一次需要坦诚沟通的时刻，或把${second}落实到日程的行动。`,
    action: `在未来 24 小时内，做一件与“${first}”有关、十五分钟内能完成的小事，并记录完成后的感受与现实反馈。`,
    caution: drawn.reversed ? `避免把逆位解读成失败。它更像提醒你放慢、核对事实，并给“${third}”留出修正空间。` : `避免把顺位当作保证。保持“${third}”的弹性，用实际反馈而不是想象校正下一步。`
  }
}

export function buildProfessionalReading(question: string, spread: TarotSpreadKey, selectedCards?: DrawnCard[]): TarotReading {
  const drawn = selectedCards ?? drawCards(spread)
  const safeQuestion = question.trim() || '我现在最需要看清与落实的是什么？'
  const category: TarotCategory = 'overall'
  const cardAnalyses = drawn.map((item) => buildCardAnalysis(item, safeQuestion))
  return {
    question: safeQuestion,
    category,
    spread,
    drawn,
    cardTexts: drawn.map((item) => interpretCard(item, category)),
    closing: buildClosing(drawn, category),
    summary: `围绕“${safeQuestion}”，牌面建议你先从「${drawn[0]?.card.name ?? '当下'}」所提示的现实行动开始，而不是急于寻找唯一答案。`,
    synthesis: buildSynthesis(drawn),
    advice: cardAnalyses.map((item) => item.action).slice(0, 2),
    cautions: cardAnalyses.map((item) => item.caution).slice(0, 2),
    cardAnalyses,
    next24Hours: cardAnalyses[0]?.action ?? '把问题写成一句可执行的话，再完成其中最小的一步。',
    next7Days: `未来 7 天观察“${drawn.map((item) => item.card.keywords[0]).join('、')}”是否在你的日程、关系或情绪中反复出现；记录事实后再调整判断。`,
    misreadings: cardAnalyses.map((item) => item.caution).slice(0, 3),
    createdAt: new Date().toISOString()
  }
}

export function createReading(category: TarotCategory, spread: TarotSpreadKey): TarotReading {
  return buildProfessionalReading(QUESTION_PROMPTS[category][0], spread)
}

export function buildShareText(reading: TarotReading): string {
  const categoryLabel = QUESTION_CATEGORIES.find((item) => item.key === reading.category)?.label ?? '占卜'
  const cards = reading.drawn
    .map((item) => `${item.card.symbol} ${item.card.name}（${item.reversed ? '逆位' : '正位'} · ${item.position}）`)
    .join('  ')
  return `🔮 我刚做了「${categoryLabel}」塔罗占卜：${cards}。${reading.closing}`
}

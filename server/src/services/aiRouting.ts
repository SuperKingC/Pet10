export type AiRouteMode = 'direct' | 'clarify' | 'search'
export type AiRouteCategory = 'casual' | 'price' | 'game' | 'professional' | 'current'

interface AiRouteBase {
  question: string
  freshnessRequired: boolean
}

export type AiRouteDecision =
  | AiRouteBase & {
    mode: 'direct'
    category: 'casual'
  }
  | AiRouteBase & {
    mode: 'clarify'
    category: Exclude<AiRouteCategory, 'casual'>
    clarification: string
  }
  | AiRouteBase & {
    mode: 'search'
    category: Exclude<AiRouteCategory, 'casual'>
    searchQueries: string[]
  }

const PRICE_PATTERN = /多少钱|价格|报价|售价|价位|预算|便宜吗|贵不贵/
const GAME_PATTERN = /游戏|赛季|阵容|出装|攻略|棋子|上分|版本|碰碰棋|蛋仔派对/
const CURRENT_PATTERN = /现在|当前|最新|近期|今天|本月|今年|截至|S\d+\b/i
const PROFESSIONAL_PATTERN = /规范|标准|法规|参数|配置|兼容|怎么执行|专业|原理|行业|技术/
const CASUAL_PATTERN = /累|难过|开心|想你|早安|晚安|吃饭|睡觉|陪我|无聊|哈哈|谢谢/

function cleanQuestion(question: string): string {
  return question.replace(/\s+/g, ' ').trim()
}

function hasEnoughPriceDetails(question: string): boolean {
  const genericProductOnly = /^一个(相机|手机|电脑|耳机|镜头)/
  const hasProduct = /相机|手机|电脑|耳机|镜头|显卡|汽车/.test(question)
  const hasModel = /[A-Za-z]{1,}[\s-]*[A-Za-z0-9]{1,}/.test(question)
  return !genericProductOnly.test(question) && (hasProduct || hasModel)
}

/** 每类问题生成两条差异化检索视角：一条对准主问题，一条补对比/细节，提升证据覆盖面 */
function buildQueries(question: string, category: Exclude<AiRouteCategory, 'casual'>): string[] {
  const angles: Record<Exclude<AiRouteCategory, 'casual'>, [string, string]> = {
    price: ['当前价格 全新 中国', '评测 优缺点 对比'],
    game: ['当前版本 主流阵容 攻略', '版本更新 胜率 推荐'],
    professional: ['最新资料 详细说明', '原理 对比 注意事项'],
    current: ['最新进展 详细情况', '时间线 背景 说明']
  }
  const [primary, secondary] = angles[category]
  return [`${question} ${primary}`, `${question} ${secondary}`]
}

export function routeAiQuestion(rawQuestion: string): AiRouteDecision {
  const question = cleanQuestion(rawQuestion)
  const hasPrice = PRICE_PATTERN.test(question)
  const hasGame = GAME_PATTERN.test(question)
  const hasCurrent = CURRENT_PATTERN.test(question)
  const hasProfessional = PROFESSIONAL_PATTERN.test(question)

  if (CASUAL_PATTERN.test(question) && !hasPrice && !hasGame && !hasProfessional) {
    return {
      mode: 'direct',
      category: 'casual',
      question,
      freshnessRequired: false
    }
  }

  if (hasPrice) {
    if (!hasEnoughPriceDetails(question)) {
      return {
        mode: 'clarify',
        category: 'price',
        question,
        clarification: '你想看哪个品牌或型号？如果还没想好，也可以告诉我预算和主要用途。',
        freshnessRequired: true
      }
    }
    return {
      mode: 'search',
      category: 'price',
      question,
      searchQueries: buildQueries(question, 'price'),
      freshnessRequired: true
    }
  }

  if (hasGame) {
    return {
      mode: 'search',
      category: 'game',
      question,
      searchQueries: buildQueries(question, 'game'),
      freshnessRequired: true
    }
  }

  if (hasProfessional) {
    return {
      mode: 'search',
      category: 'professional',
      question,
      searchQueries: buildQueries(question, 'professional'),
      freshnessRequired: true
    }
  }

  if (hasCurrent) {
    return {
      mode: 'search',
      category: 'current',
      question,
      searchQueries: buildQueries(question, 'current'),
      freshnessRequired: true
    }
  }

  return {
    mode: 'direct',
    category: 'casual',
    question,
    freshnessRequired: false
  }
}

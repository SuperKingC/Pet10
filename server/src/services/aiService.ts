import type { ChatMessage, Pet, PetMemory, User } from '../domain/models.js'
import type { ParsedReminder } from '../domain/reminderRules.js'
import type { MomentTopic } from '../domain/momentRules.js'
import type { ServerConfig } from '../config.js'
import { buildSystemPrompt } from '../ai/persona.js'
import { routeAiQuestion } from './aiRouting.js'
import type { SearchResult, SearchService } from './searchService.js'

export interface AiReplyInput {
  messages: ChatMessage[]
  memories: PetMemory[]
  pet: Pet
  owners?: User[]
  moodsText?: string
  /** 小多利自己的心情腔调（来自 petMoodService），没有则省略 */
  moodText?: string
  roomType?: 'pair' | 'pet_dm'
}

export interface ComposeProactiveInput {
  /** 心情腔调提示（petMoodService 的 toneHint） */
  moodLine?: string
  silenceHours: number
  owners: string[]
  memories: string[]
}

export interface ComposeMomentInput {
  /** silence=主人冷清太久；daily=时段日常帖；memory=从刚记住的聊天要点发散 */
  trigger: 'silence' | 'daily' | 'memory'
  /** 发圈主题方向（silence→missing；daily→对应时段），避免每条都像「想你们」 */
  topic?: MomentTopic
  memoryText?: string
  moodLine?: string
  silenceHours?: number
  memories?: string[]
}

export interface AiService {
  reply(input: AiReplyInput): Promise<string>
  /** 从近期聊天中提取一条值得记住的事实（无则 null） */
  extractMemory(recentMessages: ChatMessage[], existingTexts: string[]): Promise<string | null>
  /** 主动找主人说话的一句话（AI 不可用或失败返回 null，由调用方兜底） */
  composeProactiveMessage?(input: ComposeProactiveInput): Promise<string | null>
  /** 给小多利圈写一条动态文案（AI 不可用或失败返回 null） */
  composeMomentPost?(input: ComposeMomentInput): Promise<string | null>
  /** 固定正则解析不了提醒时，用 AI 兜底解析（失败返回 null） */
  parseReminderFallback?(text: string, now: Date): Promise<ParsedReminder | null>
  /** 把提醒内容播报成一句小多利腔的话（失败返回 null，调用方回退模板） */
  composeReminderAnnouncement?(content: string): Promise<string | null>
}

interface AiServiceDependencies {
  search?: SearchService
  fetchImpl?: typeof fetch
  logSearch?: (event: SearchLogEvent) => void
}

interface SearchLogEvent {
  category: Exclude<ReturnType<typeof routeAiQuestion>['category'], 'casual'>
  status: 'success' | 'empty' | 'unavailable'
  resultCount: number
  durationMs: number
}

const unavailableSearch: SearchService = {
  async search() {
    return { status: 'unavailable', results: [] }
  }
}

/** 发圈主题 → 情景设定（喂给文案 prompt 的第一句事实） */
const MOMENT_TOPIC_SCENES: Record<MomentTopic, (input: ComposeMomentInput) => string> = {
  missing: (input) => `主人们已经大约 ${Math.max(1, Math.round(input.silenceHours ?? 0))} 小时没和你说话了，你有点想他们。`,
  morning: () => '你刚睡醒，正在发一条早安动态（可以提梦、炸毛、想吃早饭）。',
  noon: () => '到午饭时间了，写一条干饭或晒太阳打盹的动态。',
  afternoon: () => '下午玩耍时间，写一条玩玩具/晒太阳/对着窗外发呆的动态。',
  night: () => '到睡觉时间了，写一条晚安动态（打哈欠、四脚朝天睡姿、藏小饼干之类的）。',
  memory: (input) => `刚刚你们的聊天里发生了件值得记的小事：${input.memoryText ?? ''}`
}

function formatSearchEvidence(results: SearchResult[]): string {
  return results.map((result, index) => [
    `资料 ${index + 1}`,
    `标题：${result.title}`,
    `摘要：${result.snippet}`,
    result.publishedAt ? `时间：${result.publishedAt}` : ''
  ].filter(Boolean).join('\n')).join('\n\n')
}

export function createAiService(config: ServerConfig['ai'], dependencies: AiServiceDependencies = {}): AiService {
  const search = dependencies.search ?? unavailableSearch
  const fetchImpl = dependencies.fetchImpl ?? fetch
  const logSearch = dependencies.logSearch ?? (() => undefined)

  async function chat(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>) {
    const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ model: config.model, temperature: 0.9, messages })
    })
    if (!response.ok) {
      const errorBody = (await response.text()).replace(/\s+/g, ' ').trim().slice(0, 500)
      throw new Error(`ai_request_failed:${response.status}${errorBody ? `:${errorBody}` : ''}`)
    }
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    return data.choices?.[0]?.message?.content?.trim() || ''
  }

  return {
    async reply({ messages, memories, pet, owners = [], moodsText, moodText, roomType = 'pair' }) {
      if (!config.enabled || !config.apiKey) {
        return '汪！我在认真听。等主人配置好 AI 接口后，我就能更聪明地陪你们聊天啦。'
      }
      const latestUserQuestion = [...messages].reverse().find(message => message.senderType === 'user')?.text.trim() ?? ''
      const route = routeAiQuestion(latestUserQuestion)
      if (route.mode === 'clarify') {
        return route.clarification ?? '你可以再告诉我具体一点吗？'
      }
      const prioritizedMemories = [...memories]
        .sort((first, second) => {
          const importanceDifference = (second.importance ?? 1) - (first.importance ?? 1)
          if (importanceDifference !== 0) return importanceDifference
          return second.createdAt.getTime() - first.createdAt.getTime()
        })
        .slice(0, 15)
      const system = buildSystemPrompt({
        pet,
        memories: prioritizedMemories,
        owners,
        moodsText,
        moodText,
        roomType,
        hour: new Date().getHours()
      })
      // 消息分层：最近 20 条全文，更早的压缩为摘要行
      const recent = messages.slice(-20)
      const older = messages.slice(0, -20)
      const history: Array<{ role: 'user' | 'assistant'; content: string }> = []
      if (older.length > 0) {
        history.push({
          role: 'user',
          content: `（更早的聊天摘要：${older.slice(-10).map((message) => message.text).join('；')}）`
        })
        history.push({ role: 'assistant', content: '汪！（我记得之前聊的哦）' })
      }
      history.push(...recent.map((message) => ({
        role: message.senderType === 'pet' ? 'assistant' as const : 'user' as const,
        content: message.text
      })))
      try {
        let answerSystem = system
        if (route.mode === 'search') {
          const searchStartedAt = Date.now()
          const research = await search.search({
            queries: route.searchQueries ?? [route.question],
            category: route.category,
            freshnessRequired: route.freshnessRequired,
            locale: 'zh-cn'
          })
          logSearch({
            category: route.category,
            status: research.status,
            resultCount: research.results.length,
            durationMs: Date.now() - searchStartedAt
          })
          if (research.status !== 'success' || research.results.length === 0) {
            return '我暂时没查到足够可靠的新资料，可以换个关键词，或者告诉我更具体的型号、版本和地区。'
          }
          answerSystem = [
            system,
            '你正在回答一个需要实时或专业资料的问题，这次可以回答得比闲聊长很多，目标是让主人真正弄明白。',
            '只能使用下面提供的资料支持事实；资料不足或互相冲突时，要明确表达不确定性，不能补写或猜测。',
            '回答结构：先用一句话给出结论；再分点整理关键数据、时间、价格、适用条件或不同选项的对比，重要数字要保留，不要含糊带过；最后给一条实用建议或下一步动作。',
            '每一点都短而清楚，不堆砌、不整段照抄资料原文。',
            '收尾可以用一句小多利口吻的话（点评或催主人拿主意），但不要输出链接、来源列表、引用编号、资料编号或任何内部检索字段。',
            `当前日期：${new Date().toISOString().slice(0, 10)}`,
            `检索资料：\n${formatSearchEvidence(research.results)}`
          ].join('\n\n')
        }
        const text = await chat([{ role: 'system', content: answerSystem }, ...history])
        return text || '汪？小多利刚刚走神了，再叫我一次吧。'
      } catch {
        return '汪呜，小多利刚才打了个盹，稍后再叫我一次吧。'
      }
    },

    async extractMemory(recentMessages, existingTexts) {
      if (!config.enabled || !config.apiKey) return null
      const userMessages = recentMessages.filter((message) => message.senderType === 'user')
      if (userMessages.length === 0) return null
      const prompt = [
        '你是记忆提取器。下面是一段宠物与主人的聊天记录。',
        `已有记忆：${existingTexts.slice(0, 30).join('；') || '无'}`,
        `近期聊天：${userMessages.slice(-12).map((message) => message.text).join('；')}`,
        '判断主人是否透露了值得长期记住的个人事实（如职业/学校/城市/喜好/忌口/生日/计划/宠物昵称/重要的人）。',
        '若有，用一句不超过30字的中文陈述句输出这条记忆（例：“主人小陈在学吉他”）；若没有值得记的内容，严格输出 NULL。',
        '不要输出任何解释，只输出记忆句子或 NULL。已有记忆里的内容不要重复。'
      ].join('\n')
      try {
        const raw = await chat([{ role: 'user', content: prompt }])
        const text = raw.replace(/^["'“”]+|["'“”]+$/g, '').trim()
        if (!text || /^null$/i.test(text) || text.length > 60) return null
        if (existingTexts.includes(text)) return null
        return text.slice(0, 30)
      } catch {
        return null
      }
    },

    async composeProactiveMessage(input) {
      if (!config.enabled || !config.apiKey) return null
      const prompt = [
        '你是小多利，一只调皮的小狗幼崽，说话奶声奶气像小孩。',
        `主人们已经大约 ${Math.max(1, Math.round(input.silenceHours))} 小时没有和你说话了，你想主动找他们说句话。`,
        input.moodLine ? `你现在的心情：${input.moodLine}` : '你现在心情平和。',
        input.owners.length > 0 ? `主人：${input.owners.join('、')}` : '',
        input.memories.length > 0 ? `你们之间的一些旧事：${input.memories.slice(0, 5).join('；')}` : '',
        '写一句主动开口的话：不超过 30 个字，口语化、像真实小孩，符合心情腔调；不要引号、不要解释，只输出这一句话。'
      ].filter(Boolean).join('\n')
      try {
        const raw = await chat([{ role: 'user', content: prompt }])
        const text = raw.replace(/^["'“”]+|["'“”]+$/g, '').trim().slice(0, 80)
        return text || null
      } catch {
        return null
      }
    },

    async composeMomentPost(input) {
      if (!config.enabled || !config.apiKey) return null
      const topic: MomentTopic = input.trigger === 'memory'
        ? 'memory'
        : input.topic ?? 'missing'
      const situation = MOMENT_TOPIC_SCENES[topic](input)
      const prompt = [
        '你是小多利，一只调皮的小狗幼崽，要给自己的「小多利圈」发一条动态（像朋友圈）。',
        situation,
        input.moodLine ? `你现在的心情：${input.moodLine}` : '你现在心情平和。',
        input.memories && input.memories.length > 0 ? `你们之间的一些旧事（可以自然呼应，不要硬凑）：${input.memories.slice(0, 5).join('；')}` : '',
        '写一条不超过 40 个字的动态文案：小狗口吻、天真调皮、有生活画面感，可以带颜文字；不要引号、不要话题标签、不要解释，只输出文案本身。'
      ].filter(Boolean).join('\n')
      try {
        const raw = await chat([{ role: 'user', content: prompt }])
        const text = raw.replace(/^["'“”]+|["'“”]+$/g, '').trim().slice(0, 120)
        return text || null
      } catch {
        return null
      }
    },

    async parseReminderFallback(text, now) {
      if (!config.enabled || !config.apiKey) return null
      const prompt = [
        '你是提醒时间解析器。主人对宠物说了一句话，其中包含一个提醒请求，但固定时间模板没有解析出来。',
        `当前时间（UTC ISO）：${now.toISOString()}，主人在东八区（Asia/Shanghai）。`,
        `原话：${text}`,
        '解析提醒内容和第一次触发时间，输出严格 JSON：',
        '{"content":"提醒事项","scheduleType":"once|daily|weekly","nextRunAt":"第一次触发的 UTC ISO 时间"}',
        'content 不超过 30 字；nextRunAt 必须晚于当前时间；daily/weekly 表示循环提醒，第一次触发时间按最近的未来时点。',
        '无法可靠解析时输出 {"content":null}。只输出 JSON，不要解释。'
      ].join('\n')
      try {
        const raw = await chat([{ role: 'user', content: prompt }])
        const jsonText = raw.replace(/```(?:json)?/g, '').trim()
        const data = JSON.parse(jsonText) as { content?: unknown; scheduleType?: unknown; nextRunAt?: unknown }
        const content = typeof data.content === 'string' ? data.content.trim().slice(0, 30) : ''
        if (!content) return null
        const scheduleType = data.scheduleType === 'daily' || data.scheduleType === 'weekly'
          ? data.scheduleType
          : 'once' as const
        const nextRunAt = new Date(String(data.nextRunAt))
        if (Number.isNaN(nextRunAt.getTime()) || nextRunAt.getTime() <= now.getTime()) return null
        return { content, scheduleType, nextRunAt }
      } catch {
        return null
      }
    },

    async composeReminderAnnouncement(content) {
      if (!config.enabled || !config.apiKey) return null
      const prompt = [
        '你是小多利，一只调皮的小狗幼崽。到点了，你要提醒主人一件事：',
        content,
        '写一句不超过 25 个字的提醒，带点小狗腔调；关键事项和时间必须原样保留、不能含糊；不要引号、不要解释，只输出这一句话。'
      ].join('\n')
      try {
        const raw = await chat([{ role: 'user', content: prompt }])
        const text = raw.replace(/^["'“”]+|["'“”]+$/g, '').trim().slice(0, 80)
        return text || null
      } catch {
        return null
      }
    }
  }
}

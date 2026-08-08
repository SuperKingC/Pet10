import type { FortuneContent } from '../domain/models.js'

export const FORTUNE_COLOR_PALETTE = [
  { name: '雾霾蓝', hex: '#7892A8' },
  { name: '珊瑚粉', hex: '#D98282' },
  { name: '鼠尾草绿', hex: '#829A83' },
  { name: '琥珀黄', hex: '#C99A45' },
  { name: '鸢尾紫', hex: '#8D82A8' },
  { name: '云朵白', hex: '#E8E6E1' },
  { name: '石榴红', hex: '#A95757' },
  { name: '湖水青', hex: '#5F9695' }
] as const

const ZODIAC_BOUNDARIES: Array<{ name: string; start: number; end: number }> = [
  { name: '摩羯座', start: 1222, end: 119 },
  { name: '水瓶座', start: 120, end: 218 },
  { name: '双鱼座', start: 219, end: 320 },
  { name: '白羊座', start: 321, end: 419 },
  { name: '金牛座', start: 420, end: 520 },
  { name: '双子座', start: 521, end: 621 },
  { name: '巨蟹座', start: 622, end: 722 },
  { name: '狮子座', start: 723, end: 822 },
  { name: '处女座', start: 823, end: 922 },
  { name: '天秤座', start: 923, end: 1023 },
  { name: '天蝎座', start: 1024, end: 1122 },
  { name: '射手座', start: 1123, end: 1221 }
]

const THEMES = [
  '先整理自己的节奏，再回应外界的变化',
  '把注意力留给真正重要的人和事',
  '用清晰的边界，为新的可能腾出空间',
  '不急着证明什么，稳定前进就是答案',
  '从一个小决定开始，重新掌握主动权',
  '让行动跟上判断，也给结果一点时间'
]

const OVERALL_SUMMARIES = [
  '适合稳步推进手上的安排，清晰的节奏会带来好结果。',
  '今天的重点不在做得更多，而在把真正重要的事情做好。',
  '一个原本模糊的想法逐渐清晰，适合先写下来再行动。',
  '外界信息有些繁杂，保持自己的判断会让事情更顺畅。',
  '小范围的调整比彻底改变更有效，给计划留一点余地。',
  '容易遇到值得认真回应的人或事，真诚表达会得到反馈。'
]

const OVERALL_TEXT = [
  '今天适合先梳理手边事项，再决定精力应该投向哪里。外界可能同时出现几种声音，看似都很紧迫，实际只有少数事情值得立即回应。把目标拆成清楚的小步骤，会比临时加快速度更有效。下午之后判断力逐渐稳定，一项之前悬而未决的安排也有机会出现新的切入点。不要因为进展暂时不明显就否定自己，今天真正重要的是建立可持续的节奏，并把答应自己的事情认真完成。',
  '今天的整体状态偏向内收与整理，适合处理积压的信息、确认计划细节，也适合重新判断某段关系或某个目标是否仍符合你的需要。你可能比平时更敏锐地察觉到环境变化，但不必立刻为所有变化做出反应。先保留观察，再选择行动，反而能够避开无效消耗。傍晚前后容易收到一条有用的信息，保持开放，同时也要守住自己的时间边界。',
  '今天会在熟悉的日常里发现新的线索，原本觉得难以推进的事情，可能因为一次坦率沟通或一个小调整而重新流动起来。行动之前先确认真正的问题，不要把别人的焦虑当成自己的任务。适合完成需要耐心的工作，也适合为下一阶段做现实规划。与其追求立刻被看见，不如把细节做扎实；你今天累积的可靠感，会在之后转化为更明确的机会。',
  '今天的重点是取舍。新的想法不少，但时间和精力有限，若同时开启太多任务，容易在傍晚感到疲惫。建议先完成一个能够形成闭环的目标，再考虑额外安排。人际互动中保持真诚即可，不必为了照顾气氛而隐藏真实感受。某个看似普通的决定会影响接下来几天的节奏，做选择时多参考长期舒适度，而不是一时的新鲜感。'
]

const LOVE_SINGLE = [
  '今天更容易被谈吐自然、做事有分寸的人吸引。新的联系可能从工作、学习或朋友之间的普通交流开始，不必急着判断对方是否符合全部期待。先观察彼此回应是否稳定，也让对方有机会了解真实的你。若心里已有在意的人，可以从分享一件具体的小事开始靠近；比起含蓄试探，清楚而轻松的表达更容易得到有效反馈。',
  '今天可能重新思考自己真正想要怎样的关系。过去容易被气氛或想象打动，今天则更在意对方是否可靠、是否尊重边界。这样的谨慎并不是错过机会，而是在筛选更适合自己的连接。社交场合里无需刻意表现，专注听对方说话，反而能留下自然印象。若暂时没有心动对象，也适合整理旧情绪，为新的相遇腾出位置。',
  '今天在人群中有不错的存在感，但真正值得关注的并不是热闹程度，而是谁愿意认真回应你的想法。可能有人通过共同兴趣、日常问候或一次临时合作靠近，不妨给轻松对话多一点延续空间。对于态度反复的人，则不必替对方寻找理由。关系的开始需要好奇心，也需要基本的确定感，保持开放，同时把选择权留在自己手里。'
]

const LOVE_PARTNERED = [
  '今天需要在及时回应和保留个人空间之间找到平衡。对方可能更关心你对某件事的明确态度，而不是一个模糊的安慰。适合把近期安排、情绪来源和实际需要说清楚，避免让猜测代替沟通。若之前有小摩擦，可以从讨论具体事件开始，不翻旧账也不急着分胜负。一起完成一件简单的日常事务，会比刻意制造浪漫更能恢复亲近感。',
  '容易注意到关系中一些被忽略的细节，例如回复速度、计划是否兑现，或彼此最近有没有真正听见对方。不要把这些感受积累成无声的不满，选择平静的时机说明，会比临时爆发更有建设性。今天也适合共同确认接下来的安排，把各自的时间需求说在前面。关系不需要时时同步，但稳定的反馈能够减少不必要的猜测。',
  '今天适合把相处方式调得更松弛一些。双方可能都忙于自己的事务，联系不必频繁，却需要让对方知道重要信息和真实状态。若对方回应不如预期，先确认现实原因，再判断是否需要深入讨论。晚上可以安排一段没有其他干扰的相处时间，哪怕只是散步或分享当天见闻，也能让关系重新回到具体而温暖的日常。'
]

const STUDY = [
  '学习方面，今天适合处理需要理解和归纳的内容，而不是单纯追求完成数量。先用自己的话写出知识框架，再回头补充细节，记忆会更牢。遇到卡住的部分，不妨先记录具体疑问，短暂切换任务后再回来解决。与同学或伙伴讨论时，主动解释自己的思路能够暴露盲点。晚上复盘一次当天的重点，比临时延长学习时间更有价值。',
  '学习方面，注意力容易在开始阶段被零散信息分走，建议把手机通知和无关页面暂时关闭，为自己保留一段完整时间。今天更适合攻克一个核心难点，再完成少量巩固练习。若正在准备考试或作品，不必反复修改已经成熟的部分，把精力放在最薄弱的环节。向他人请教时带上你的尝试过程，会更容易得到准确帮助。',
  '学习方面，今天可能产生新的兴趣点，但要避免因为不断搜集资料而推迟真正练习。先选一个可以在当天完成的小成果，例如写出提纲、做完一组题或整理一页笔记。对暂时无法理解的概念保持耐心，换一种材料或表达方式会比硬撑更有效。适合在傍晚做一次查漏补缺，并为明天留下一项清晰、容易启动的任务。'
]

const WORK = [
  '工作方面，今天的优势在于看清流程里的遗漏，并用更简单的方法推进协作。开始之前先确认目标、期限和负责人，能够减少后续反复。面对临时需求，不必马上全部接下，可以先判断它是否真的优先。沟通中把结论放在前面，再补充背景，会让表达更有力量。下午适合处理需要集中判断的事项，也可能得到来自同事或客户的具体反馈。',
  '工作方面，容易遇到多个任务同时靠近的情况，越是忙乱越需要明确顺序。先完成会影响他人的关键节点，再处理可以独立收尾的小事。今天适合主动汇报进度，不必等到所有细节完美才开口。若有人提出不同意见，先确认双方依据，可能会发现问题来自信息不一致，而不是立场冲突。稳健交付比额外承担更能建立专业信任。',
  '工作方面，今天适合把一个模糊想法转化成可讨论的方案。无需一开始就追求完整，可以先列出目标、限制和两种可选路径，让沟通围绕具体内容展开。对重复出现的问题，建议记录原因而不是继续临时补救。与合作伙伴相处时保持边界，答应之前先查看自己的时间。一次简洁、及时的确认，会为后续推进节省很多精力。'
]

const WEALTH = [
  '财运方面，今天更适合整理和控制，而不是追逐短期变化。可以检查近期账单、自动续费和计划中的大额支出，容易发现一项原本忽略的成本。面对临时优惠或朋友推荐，先问自己是否真的需要，不必因为限时信息立刻决定。用于学习、健康或提升效率的合理投入可以保留，但仍要明确预算上限，避免把期待感当成实际价值。',
  '财运方面，收支整体平稳，但情绪性消费的诱因会比平时明显。可能因为疲惫、社交气氛或对新鲜事物的兴趣而想立即下单，建议先加入清单，隔一段时间再确认。今天适合处理报销、账目核对或旧物整理，也适合为接下来一周预留必要开支。涉及借贷、订阅或长期协议时，务必看清规则，不替模糊承诺买单。',
  '财运方面，今天适合把注意力放在长期可持续性上。若正在比较不同方案，不要只看眼前价格，也要考虑使用频率、维护成本和退出条件。可能出现一笔计划外的小支出，但只要提前留有余量，不会打乱整体节奏。与他人讨论金钱问题时保持直接和具体，明确金额、时间与责任，能够避免之后因为理解不同而产生尴尬。'
]

const HEALTH = [
  '健康方面，今天需要留意长时间专注带来的肩颈紧张和眼睛疲劳。每完成一段工作就起身活动几分钟，比晚上集中补偿更有效。饮食尽量保持规律，不要因为忙碌拖延正餐。若精神状态起伏明显，先检查睡眠和水分是否充足，不必用更多咖啡勉强支撑。晚间适合降低信息刺激，让身体有明确的收尾信号。',
  '健康方面，身体对节奏变化比较敏感，临时熬夜或进食过快都可能让疲惫感提前出现。今天适合选择温和、能够持续的活动，例如散步、拉伸或轻量训练，而不是突然提高强度。情绪紧绷时先放慢呼吸，再处理让你焦虑的信息。睡前减少反复查看消息，给大脑留出安静过渡，会比单纯延长躺床时间更有帮助。',
  '健康方面，今天的重点是及时恢复，不要等到明显疲惫才休息。连续坐着时可以设置短暂提醒，活动腰背并眺望远处。饮食上注意补充水分和清淡食物，减少过晚进食。若计划运动，以完成后的舒适感作为强度标准。心理上也需要留一点空白，不把每段空闲都填满；短暂放空能够帮助你重新集中注意力。'
]

const LUCKY_PHRASES = [
  '把注意力放回能由自己决定的事情上。',
  '重要的回应不必仓促，想清楚再表达。',
  '完成一件小事，也是在为下一步腾出空间。',
  '今天适合减少比较，按照自己的节奏前进。',
  '给计划留一点弹性，意外也可能带来新方向。',
  '先照顾好当下的感受，再处理远处的担忧。'
]

function hash(text: string): number {
  let value = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

function parseBirthday(birthday: string): { month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthday)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null
  return { month, day }
}

export function zodiacFromBirthday(birthday?: string | null): string | null {
  if (!birthday) return null
  const parsed = parseBirthday(birthday)
  if (!parsed) return null
  const value = parsed.month * 100 + parsed.day
  return ZODIAC_BOUNDARIES.find(({ start, end }) => start <= end
    ? value >= start && value <= end
    : value >= start || value <= end)?.name ?? null
}

function rating(seed: number, shift: number): number {
  return 1 + ((seed >>> shift) % 5)
}

function select<T>(items: readonly T[], seed: number, shift: number): T {
  return items[(seed >>> shift) % items.length]
}

export function createDailyFortune(input: { userId: string; birthday?: string | null; day: string }): FortuneContent {
  const zodiac = zodiacFromBirthday(input.birthday)
  if (!zodiac) throw new Error('birthday_required')
  const seed = hash(`${input.userId}|${input.day}|${zodiac}`)

  return {
    schemaVersion: 2,
    zodiac,
    theme: select(THEMES, seed, 1),
    overall: { rating: rating(seed, 0), summary: select(OVERALL_SUMMARIES, seed, 2), text: select(OVERALL_TEXT, seed, 4) },
    love: { rating: rating(seed, 5), single: select(LOVE_SINGLE, seed, 7), partnered: select(LOVE_PARTNERED, seed, 9) },
    study: { rating: rating(seed, 10), text: select(STUDY, seed, 12) },
    work: { rating: rating(seed, 13), text: select(WORK, seed, 14) },
    wealth: { rating: rating(seed, 15), text: select(WEALTH, seed, 17) },
    health: { rating: rating(seed, 20), text: select(HEALTH, seed, 22) },
    luckyColor: select(FORTUNE_COLOR_PALETTE, seed, 24),
    luckyNumber: 1 + (seed % 99),
    luckyPhrase: select(LUCKY_PHRASES, seed, 27)
  }
}

export function isValidDailyFortuneContent(value: unknown): value is FortuneContent {
  if (!value || typeof value !== 'object') return false
  const content = value as Partial<FortuneContent>
  if (content.schemaVersion !== 2 || !ZODIAC_BOUNDARIES.some((item) => item.name === content.zodiac) || typeof content.theme !== 'string' || content.theme.trim().length === 0) return false
  const validRating = (value: unknown) => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5
  if (!content.overall || !validRating(content.overall.rating) || typeof content.overall.summary !== 'string' || content.overall.summary.trim().length === 0 || typeof content.overall.text !== 'string' || content.overall.text.length < 70) return false
  if (!content.love || !validRating(content.love.rating) || typeof content.love.single !== 'string' || content.love.single.length < 70 || typeof content.love.partnered !== 'string' || content.love.partnered.length < 70) return false
  for (const section of [content.study, content.work, content.wealth, content.health]) {
    if (!section || !validRating(section.rating) || typeof section.text !== 'string' || section.text.length < 70) return false
  }
  if (!content.luckyColor || typeof content.luckyColor !== 'object') return false
  const color = content.luckyColor as { name?: unknown; hex?: unknown }
  if (!FORTUNE_COLOR_PALETTE.some((item) => item.name === color.name && item.hex === color.hex)) return false
  return Number.isInteger(content.luckyNumber) && Number(content.luckyNumber) >= 1 && Number(content.luckyNumber) <= 99 && typeof content.luckyPhrase === 'string' && content.luckyPhrase.length > 0
}

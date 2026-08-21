export type MbtiDimension = 'EI' | 'SN' | 'TF' | 'JP'

export interface MbtiQuestion {
  dimension: MbtiDimension
  text: string
  options: [string, string]
}

export const MBTI_QUESTIONS: MbtiQuestion[] = [
  { dimension: 'EI', text: '周末的理想状态是？', options: ['约人出门走走', '在家宅着做自己的事'] },
  { dimension: 'EI', text: '和小多利聊天时，你更常？', options: ['连发好几条消息', '想好了再发一条'] },
  { dimension: 'EI', text: '在陌生环境里，你会？', options: ['很快和周围人熟起来', '先观察一段时间'] },
  { dimension: 'EI', text: '参加聚会之后，你通常？', options: ['越聊越有精神', '需要独处恢复能量'] },
  { dimension: 'EI', text: '遇到有趣的事，你会？', options: ['马上分享给别人', '先自己慢慢消化'] },
  { dimension: 'EI', text: '表达想法时，你更喜欢？', options: ['边说边理清思路', '想清楚后再开口'] },
  { dimension: 'EI', text: '认识新朋友时，你通常？', options: ['主动找话题', '等对方先靠近'] },
  { dimension: 'SN', text: '看一幅画，你先注意到？', options: ['它让你联想到什么', '它的颜色和线条本身'] },
  { dimension: 'SN', text: '朋友讲计划时，你更关心？', options: ['背后的可能性与愿景', '具体怎么一步步落地'] },
  { dimension: 'SN', text: '你更相信？', options: ['直觉和第六感', '亲眼所见的事实'] },
  { dimension: 'SN', text: '回忆一次旅行，你记得更多的是？', options: ['当时的感觉和氛围', '去了哪些地方吃了什么'] },
  { dimension: 'SN', text: '你更喜欢哪类故事？', options: ['充满想象力的奇幻', '真实细腻的日常'] },
  { dimension: 'SN', text: '做事时你更倾向？', options: ['先想个新玩法', '沿用验证过的方法'] },
  { dimension: 'SN', text: '聊星座运势时，你觉得？', options: ['冥冥之中有点准', '当个乐子看看就好'] },
  { dimension: 'TF', text: '好友心情不好，你先？', options: ['分析问题帮 TA 解决', '陪着 TA 先共情'] },
  { dimension: 'TF', text: '被夸“你很理性”，你觉得？', options: ['是夸奖', '稍微有点复杂'] },
  { dimension: 'TF', text: '做决定时你更看重？', options: ['利弊分析', '自己和别人的感受'] },
  { dimension: 'TF', text: '吵架之后，你更在意？', options: ['谁对谁错要讲清楚', '关系有没有被伤到'] },
  { dimension: 'TF', text: '你更喜欢的评价方式？', options: ['直接指出问题', '先肯定再建议'] },
  { dimension: 'TF', text: '看电影哭的时候，你会？', options: ['分析剧情为什么动人', '就放任自己哭一会儿'] },
  { dimension: 'TF', text: '给小多利起名这类事，你？', options: ['讲逻辑投票决定', '凭喜欢一票定音'] },
  { dimension: 'JP', text: '出门旅行，你更倾向？', options: ['提前做好攻略', '走到哪算哪'] },
  { dimension: 'JP', text: '你的待办清单通常？', options: ['写得清清楚楚', '都在脑子里'] },
  { dimension: 'JP', text: '约好了时间，你通常？', options: ['提前到', '踩着点或晚一点'] },
  { dimension: 'JP', text: '桌面或房间的整洁度？', options: ['乱会让我烦躁', '乱中有序挺好'] },
  { dimension: 'JP', text: '任务截止前，你的状态？', options: ['早就完成大部分', '最后冲刺效率最高'] },
  { dimension: 'JP', text: '突然被打乱计划，你会？', options: ['有点烦躁', '无所谓，随遇而安'] },
  { dimension: 'JP', text: '养小多利这件事，你更偏向？', options: ['定时定点照顾', '想起来就宠一下'] }
]

export const MBTI_DIMENSION_LABELS: Record<MbtiDimension, [string, string]> = {
  EI: ['E 外向', 'I 内向'],
  SN: ['N 直觉', 'S 实感'],
  TF: ['T 思考', 'F 情感'],
  JP: ['J 计划', 'P 随性']
}

export function calculateMbti(answers: boolean[]) {
  if (answers.length !== MBTI_QUESTIONS.length) throw new Error('invalid_mbti_answers')
  const score: Record<MbtiDimension, number> = { EI: 0, SN: 0, TF: 0, JP: 0 }
  MBTI_QUESTIONS.forEach((question, index) => {
    if (answers[index]) score[question.dimension] += 1
  })
  return `${score.EI >= 4 ? 'E' : 'I'}${score.SN >= 4 ? 'N' : 'S'}${score.TF >= 4 ? 'T' : 'F'}${score.JP >= 4 ? 'J' : 'P'}`
}

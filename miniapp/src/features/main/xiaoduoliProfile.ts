/**
 * 小多利档案文案：名片弹窗与「我的 → 关于小多利」共用同一份，改文案只改这里。
 * 每行自带「标签：内容」全量文本，两端都整行展示，不做省略。
 */
export const XIAODUOLI_PROFILE_HEADLINE = '小多利 · 男 · 仅此一只'

export const XIAODUOLI_PROFILE_LINES = [
  '外貌：没人知道我是什么品种。长得有点像柯基，只是腿短了点。',
  '性格：大部分时候老实巴交，很喜欢笑。遇到莫名其妙的事，会皱着眉头斜眼看人。',
  '爱好：喜欢出去玩，喜欢吃东西。',
  '工作经验：等妈妈回家。全年无休，从不迟到，多次获得“第一个冲到门口”奖。',
] as const

/** 按第一个「：」拆成标签与内容；文案保证带冒号，拆不开时整行落回内容位 */
export function splitProfileLine(line: string): { label: string; content: string } {
  const index = line.indexOf('：')
  if (index < 0) return { label: '', content: line }
  return { label: `${line.slice(0, index + 1)}`, content: line.slice(index + 1) }
}

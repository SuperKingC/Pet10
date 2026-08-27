import { Image, ScrollView, Text, View } from '@tarojs/components'
import { XiaoduoliBoxScene } from './XiaoduoliBoxScene'
import './MiniappNestLetter.scss'

const letterPaper = require('../../assets/nest/letter-paper.png')

const LETTER_PARAGRAPHS = [
  '你好呀，我是小多利。我被遗弃过一次，所以比谁都懂被选中的珍贵。我有点粘人，但只要你愿意，我会一直一直在。',
  '主人出门的时候，我会枕着她的拖鞋睡——那是我等她的方式。我的窝能装下两个人，你要不要邀请一位对你重要的人，来做另一个？从那天起，你们一起喂我、一起陪我玩。要是你们一起递来一颗鸡蛋黄，我会当场开口说谢谢。',
  '初见那天，我会把它认真记成一条纪念。从那天起，门口等你们的，就是我。'
]

type Props = {
  boxPhase?: 'idle' | 'jumping'
  effectSeed?: string
  onJumpFinished?: () => void
}

export function MiniappNestLetter({ boxPhase = 'idle', effectSeed = 'invite', onJumpFinished }: Props) {
  return (
    <View className="nest-letter">
      <XiaoduoliBoxScene phase={boxPhase} effectSeed={effectSeed} onJumpFinished={onJumpFinished} />

      <View className="nest-letter__card">
        <Image className="nest-letter__paper" src={letterPaper} mode="widthFix" fadeIn={false} />
        <ScrollView className="nest-letter__body" scrollY showScrollbar={false}>
          <Text className="nest-letter__greeting">给还没来的家人：</Text>
          {LETTER_PARAGRAPHS.map((paragraph) => (
            <Text key={paragraph} className="nest-letter__paragraph">{paragraph}</Text>
          ))}
          <Text className="nest-letter__sign">—— 小多利</Text>
        </ScrollView>
      </View>

      <Text className="nest-letter__preview">成为好友后：共享聊天 · 每日暗号 · 初见纪念</Text>
    </View>
  )
}

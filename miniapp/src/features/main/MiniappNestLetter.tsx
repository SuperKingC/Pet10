import { Image, Text, View } from '@tarojs/components'
import './MiniappNestLetter.scss'

const petAvatar = require('../../assets/xiaoduoli.png')

const LETTER_PARAGRAPHS = [
  '你好呀，我是小多利。有点粘人，老实巴交，喜欢出去玩和吃东西，最擅长等重要的人回家——全年无休，从不迟到。',
  '窝已经收拾好了，阳光正好，只是还差一个空位。如果你邀请一位对你重要的人来，从那天起，你们可以一起喂我、一起玩五子棋、一起回答每日暗号。',
  '初见那天，我会把它认真记成一条纪念。'
]

export function MiniappNestLetter() {
  return (
    <View className="nest-letter">
      <Image className="nest-letter__avatar" src={petAvatar} mode="aspectFit" fadeIn={false} />
      <View className="nest-letter__card">
        <Text className="nest-letter__greeting">给还没来的家人：</Text>
        {LETTER_PARAGRAPHS.map((paragraph) => (
          <Text key={paragraph} className="nest-letter__paragraph">{paragraph}</Text>
        ))}
        <Text className="nest-letter__sign">—— 小多利</Text>
      </View>
      <Text className="nest-letter__preview">成为好友后：共享聊天 · 每日暗号 · 初见纪念</Text>
    </View>
  )
}

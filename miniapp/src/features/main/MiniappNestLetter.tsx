import { Image, Text, View } from '@tarojs/components'
import { XiaoduoliBoxScene } from './XiaoduoliBoxScene'
import './MiniappNestLetter.scss'

// 信纸九宫格切片：四角固定不变形，四边单轴拉伸，中心净区随卡片伸缩。
// 切片由 miniapp/tools/make-letter-paper-slices.mjs 生成，切线见该脚本 SLICE 常量。
// 文件名带版本号（-v2/-v3）：同路径图片会被开发者工具缓存供旧图，换图必须升文件名。
const paperTiles = {
  tl: require('../../assets/nest/letter-paper-tl-v4.png'),
  tc: require('../../assets/nest/letter-paper-tc-v4.png'),
  tr: require('../../assets/nest/letter-paper-tr-v4.png'),
  ml: require('../../assets/nest/letter-paper-ml-v4.png'),
  mc: require('../../assets/nest/letter-paper-mc-v4.png'),
  mr: require('../../assets/nest/letter-paper-mr-v4.png'),
  bl: require('../../assets/nest/letter-paper-bl-v4.png'),
  bc: require('../../assets/nest/letter-paper-bc-v4.png'),
  br: require('../../assets/nest/letter-paper-br-v4.png'),
}

const PAPER_TILE_NAMES = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'] as Array<keyof typeof paperTiles>

// 正文不分段：四句连成整段文字
const LETTER_BODY = [
  '你好呀，我是小多利。我曾被遗弃过一次，所以更懂被选中的珍贵。',
  '我有点粘人，但只要你愿意，我会一直一直在。你出门时，我就枕着你的拖鞋等你。',
  '我的窝装得下两个人。要不要邀请一位重要的人，一起喂我、陪我玩？',
  '如果你们愿意，初见那天就是我新的开始。这一次，不会再有人把我送走了。'
].join('')

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
        <View className="nest-letter__paper">
          {PAPER_TILE_NAMES.map((name) => (
            <Image key={name} className={`nest-letter__tile nest-letter__tile--${name}`} src={paperTiles[name]} fadeIn={false} />
          ))}
        </View>
        <View className="nest-letter__body">
          <Text className="nest-letter__greeting">给还没来的家人：</Text>
          <Text className="nest-letter__paragraph">{LETTER_BODY}</Text>
          <Text className="nest-letter__sign">—— 小多利</Text>
        </View>
      </View>

      <Text className="nest-letter__preview">小多利是独一无二的，只能养一只，请认真选择一起养的对象</Text>
    </View>
  )
}

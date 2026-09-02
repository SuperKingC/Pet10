// 主体服装「穿着视角」独立件批量生图（规则见 .agents/rules/ai-image-generation.md）
// 以整套立绘 public/wardrobe/{suit}-v1.png 为参考图，生成去掉小狗、只保留服装本身的
// 正面穿着视角图（帽兜翻在颈后/不带睡帽——叠加到原装立绘时绝不挡头）。
// 源图落 design-assets/wardrobe/gen-{suit}-wear-v1.png（source-only，不入库，须登记 manifest）。
// 用法：node miniapp/tools/gen-worn-garments.mjs hoodie,overalls   （逗号分隔本次要生成的 key）
import { spawnSync } from 'node:child_process'

const COMMON_TAIL = '纯白色背景，没有阴影，没有文字。柔和的手绘水彩儿童绘本风格，奶油色与暖棕色调，细深棕色描边，笔触柔软，与参考图里同一件衣服、同样的颜色与细节。衣服占画面主体，竖构图。'

const GARMENTS = {
  hoodie: `参考图是一只手绘水彩风格的小狗穿着奶油绿色连帽卫衣的正面立绘。请把这件卫衣从小狗身上脱下来单独画：彻底去掉小狗——没有毛发、没有爪子、没有脸、没有耳朵、没有尾巴；只画这件卫衣本身，保持它穿在身上的正面视角与宽松版型（像套在一个看不见的身体上），帽子翻到颈后垂在背后、绝不盖住头顶，抽绳自然垂在胸前，袖子自然垂在身体两侧，下摆圆顺。${COMMON_TAIL}`,
  overalls: `参考图是一只手绘水彩风格的小狗穿着蓝色牛仔背带裤的正面立绘。请把这条背带裤从小狗身上脱下来单独画：彻底去掉小狗——没有毛发、没有爪子、没有脸、没有耳朵、没有尾巴；只画这条背带裤本身，保持它穿在身上的正面视角（像穿在一个看不见的胖乎乎身体上），整体版型宽松宽扁、轮廓接近宽方形（宽度略大于高度），两条肩带向左右分开得很开、胸前口袋带白色小骨头图案、棕色圆纽扣，两条裤腿宽松向两侧自然张开，裤脚收口。纯白色背景，没有阴影，没有文字。柔和的手绘水彩儿童绘本风格，奶油色与暖棕色调，细深棕色描边，笔触柔软，与参考图里同一件衣服、同样的颜色与细节。衣服占画面主体。`,
  dress: `参考图是一只手绘水彩风格的小狗穿着粉色小裙子的正面立绘。请把这条小裙子从小狗身上脱下来单独画：彻底去掉小狗——没有毛发、没有爪子、没有脸、没有耳朵、没有尾巴；只画这条裙子本身，保持它穿在身上的正面视角（像穿在一个看不见的身体上），白色娃娃领、胸前粉色蝴蝶结、褶皱裙摆花边都保留，裙摆自然展开。${COMMON_TAIL}`,
  raincoat: `参考图是一只手绘水彩风格的小狗穿着黄色雨衣的正面立绘。请把这件雨衣从小狗身上脱下来单独画：彻底去掉小狗——没有毛发、没有爪子、没有脸、没有耳朵、没有尾巴；只画这件雨衣本身，保持它穿在身上的正面视角（像穿在一个看不见的身体上），帽子翻到颈后垂在背后、绝不盖住头顶，前排一排黄色纽扣、胸前绿色小青蛙贴饰都保留，袖子自然垂在身体两侧，下摆圆顺。${COMMON_TAIL}`,
  pajamas: `参考图是一只手绘水彩风格的小狗穿着浅紫色睡衣上衣的正面立绘。请把这件睡衣从小狗身上脱下来单独画：彻底去掉小狗——没有毛发、没有爪子、没有脸、没有耳朵、没有尾巴，也不要睡帽；只画这件睡衣上衣本身，保持它穿在身上的正面视角（像穿在一个看不见的身体上），白色翻领、布料上的白色小星星图案都保留，袖子自然垂在身体两侧，下摆圆顺。${COMMON_TAIL}`
}

const keys = (process.argv[2] ?? '').split(',').filter((k) => k in GARMENTS)
if (keys.length === 0) {
  console.error('用法: node miniapp/tools/gen-worn-garments.mjs ' + Object.keys(GARMENTS).join('|'))
  process.exit(1)
}
for (const key of keys) {
  console.log(`=== 生成 ${key} …`)
  const r = spawnSync('node', [
    'scripts/gen-ai-image.mjs',
    GARMENTS[key],
    '-o', `design-assets/wardrobe/gen-${key}-wear-v1.png`,
    '--ratio', '2:3',
    '--ref', `public/wardrobe/${key}-v1.png`
  ], { stdio: 'inherit', cwd: 'D:/Pet10' })
  if (r.status !== 0) { console.error(`${key} 失败`); process.exit(1) }
}
console.log('全部完成:', keys.join(', '))

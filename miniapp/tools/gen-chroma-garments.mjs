// 黑狗 chroma key 服装批量生图：以原装立绘为参考图，保持姿势/构图/大小/位置完全一致，
// 把小狗全身毛发改成纯黑剪影并穿上对应服装（衣服样式不变）——后续 cut-chroma-garments.mjs
// 抠掉黑狗即得到「天然贴合这只狗身体」的全画布服装叠层。
// 源图落 design-assets/wardrobe/gen-{suit}-chroma-v1.png（source-only）。
// 用法：node miniapp/tools/gen-chroma-garments.mjs hoodie,overalls,...
import { spawnSync } from 'node:child_process'

const COMMON_HEAD = '参考图是一只手绘水彩风格的坐姿小狗正面立绘。请保持与参考图完全相同的构图、姿势、狗的大小与在画面中的位置、线条圆润度，只做两处改动：①把小狗全身毛发（脸、耳朵、额头、身体、四肢、尾巴）全部改成纯黑色剪影（纯 #000000，不带任何毛发纹理、渐变与高光，眼睛也一并填黑），轮廓形状与参考图的狗完全重合；②让这只黑色剪影小狗穿上'
const COMMON_TAIL = '。衣服保持手绘水彩上色、细深棕色描边。纯白色背景，没有阴影，没有文字。柔和的手绘水彩儿童绘本风格，笔触柔软。'

const GARMENTS = {
  hoodie: `${COMMON_HEAD}一件奶油绿色的连帽卫衣（帽兜翻在颈后垂在背后、绝不盖住头顶，白色抽绳垂在胸前，宽松版型，袖子顺身体两侧垂下，衣长盖过肚子），衣服颜色样式不变。${COMMON_TAIL}`,
  overalls: `${COMMON_HEAD}一条蓝色牛仔背带裤（两条肩带背在肩上、胸前口袋带白色小骨头图案、棕色圆纽扣，裤腿宽松盖过大腿），衣服颜色样式不变。${COMMON_TAIL}`,
  dress: `${COMMON_HEAD}一条粉色小裙子（白色泡泡袖、白色娃娃领、胸前粉色蝴蝶结、褶皱裙摆花边盖过肚子），衣服颜色样式不变。${COMMON_TAIL}`,
  raincoat: `${COMMON_HEAD}一件黄色雨衣外套（帽兜翻在颈后垂在背后、绝不盖住头顶，前排一排黄色纽扣，胸前绿色小青蛙贴饰，衣长盖过肚子），衣服颜色样式不变。${COMMON_TAIL}`,
  pajamas: `${COMMON_HEAD}一件浅紫色睡衣上衣（白色翻领、布料上白色小星星图案，不要睡帽，长袖，衣长盖过肚子），衣服颜色样式不变。${COMMON_TAIL}`
}

const keys = (process.argv[2] ?? '').split(',').filter((k) => k in GARMENTS)
if (keys.length === 0) {
  console.error('用法: node miniapp/tools/gen-chroma-garments.mjs ' + Object.keys(GARMENTS).join('|'))
  process.exit(1)
}
for (const key of keys) {
  console.log(`=== 生成 ${key} …`)
  const r = spawnSync('node', [
    'scripts/gen-ai-image.mjs',
    GARMENTS[key],
    '-o', `design-assets/wardrobe/gen-${key}-chroma-v1.png`,
    '--ratio', '2:3',
    '--ref', 'miniapp/src/assets/xiaoduoli.png'
  ], { stdio: 'inherit', cwd: 'D:/Pet10' })
  if (r.status !== 0) { console.error(`${key} 失败`); process.exit(1) }
}
console.log('全部完成:', keys.join(', '))
